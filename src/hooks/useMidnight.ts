import { useCallback, useEffect, useRef, useState } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ProofProvider, UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Binding, CostModel, Proof, SignatureEnabled, Transaction, type FinalizedTransaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';
import { firstValueFrom, interval, map, filter, take, timeout, concatMap, catchError, throwError } from 'rxjs';
import { pipe } from 'fp-ts/function';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { inMemoryPrivateStateProvider } from '../lib/in-memory-private-state-provider';
import {
  compiledCounterContract,
  COUNTER_PRIVATE_STATE_ID,
  CounterModule,
  type CounterPrivateState,
} from '../lib/counter-contract';

const INDEXER_GRAPHQL_URL =
  (import.meta.env.VITE_INDEXER_URL as string | undefined) ||
  'https://indexer.preprod.midnight.network/api/v4/graphql';

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

const deepestErrorMessage = (e: unknown): string => {
  let current: any = e;
  const seen = new Set<unknown>();
  let last = '';
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    for (const key of ['message', 'failure', 'error', 'reason']) {
      const value = current[key];
      if (typeof value === 'string' && value.length > 0 && !last.includes(value)) {
        last = value;
      }
    }
    current = current?.cause ?? current?.failure;
  }
  return last || (typeof e === 'string' ? e : String(e ?? 'Unexpected error'));
};

const fetchCountFromIndexer = async (contractAddress: string): Promise<bigint | null> => {
  try {
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CONTRACT_STATE_QUERY,
        variables: { address: contractAddress },
      }),
    });
    const gql = await res.json();
    if (gql.errors) throw new Error(gql.errors[0]?.message ?? 'Indexer query failed');
    const stateHex = gql?.data?.contractAction?.state;
    if (!stateHex) return null;
    const contractState = CompactContractState.deserialize(hexToBytes(stateHex));
    const ledgerState = CounterModule.ledger(contractState.data);
    return BigInt(ledgerState.count);
  } catch {
    return null;
  }
};

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';
const WALLET_DETECT_INTERVAL_MS = 100;
const WALLET_DETECT_TIMEOUT_MS = 5_000;
const WALLET_CONNECT_TIMEOUT_MS = 60_000;

type WalletState = 'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

type Providers = {
  privateStateProvider: ReturnType<typeof inMemoryPrivateStateProvider>;
  zkConfigProvider: FetchZkConfigProvider<string>;
  proofProvider: ProofProvider;
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  walletProvider: {
    getCoinPublicKey: () => string;
    getEncryptionPublicKey: () => string;
    balanceTx: (tx: UnboundTransaction) => Promise<FinalizedTransaction>;
  };
  midnightProvider: {
    submitTx: (tx: FinalizedTransaction) => Promise<TransactionId>;
  };
};

const getNetworkId = (): string => {
  const v = import.meta.env.VITE_NETWORK_ID as string | undefined;
  return (v && v.trim()) || 'preview';
};

const getDefaultContractAddress = (): string | null => {
  const v = import.meta.env.VITE_DEFAULT_CONTRACT as string | undefined;
  if (!v || !v.trim() || /^PLACEHOLDER/i.test(v)) return null;
  return v.trim();
};

type CompatibleWallet = { id: string; api: InitialAPI };

const WALLET_PREFERENCE_ORDER: readonly string[] = ['1am'];

const getCompatibleWallets = (): CompatibleWallet[] => {
  const g = globalThis as any;
  const midnight = g.window?.midnight ?? g.midnight;
  if (!midnight) return [];
  const wallets = Object.entries(midnight as Record<string, unknown>)
    .filter(
      (entry): entry is [string, InitialAPI] =>
        !!entry[1] &&
        typeof entry[1] === 'object' &&
        'apiVersion' in entry[1] &&
        semver.satisfies((entry[1] as InitialAPI).apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
    )
    .map(([id, api]) => ({ id, api }));
  const rank = (id: string): number => {
    const idx = WALLET_PREFERENCE_ORDER.indexOf(id.toLowerCase());
    return idx === -1 ? WALLET_PREFERENCE_ORDER.length : idx;
  };
  return wallets.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
};

const connectToWallet = (netId: string, walletId?: string | null): Promise<ConnectedAPI> =>
  firstValueFrom(
    pipe(
      interval(WALLET_DETECT_INTERVAL_MS),
      map(() => {
        const wallets = getCompatibleWallets();
        if (wallets.length === 0) return undefined;
        const picked = walletId ? wallets.find((w) => w.id === walletId) : undefined;
        return (picked ?? wallets[0]).api;
      }),
      filter((api): api is InitialAPI => !!api),
      take(1),
      timeout({
        first: WALLET_DETECT_TIMEOUT_MS,
        with: () =>
          throwError(() =>
            new Error('No compatible Midnight wallet detected. Install Lace or 1AM.'),
          ),
      }),
      concatMap(async (initialAPI) => {
        const connected = await initialAPI!.connect(netId);
        return connected as ConnectedAPI;
      }),
      timeout({
        first: WALLET_CONNECT_TIMEOUT_MS,
        with: () => throwError(() => new Error('Wallet did not respond to the connect request.')),
      }),
      catchError((error) =>
        throwError(() =>
          error instanceof Error ? error : new Error(String(error ?? 'Wallet not authorized')),
        ),
      ),
    ),
  );

const initializeProviders = async (
  connectedAPI: ConnectedAPI,
  config: Awaited<ReturnType<ConnectedAPI['getConfiguration']>>,
): Promise<Providers> => {
  const networkId = getNetworkId();
  setNetworkId(networkId);

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  const zkConfigProvider = new FetchZkConfigProvider<string>(
    window.location.origin,
    fetch.bind(window),
  );

  const privateStateProvider = inMemoryPrivateStateProvider<string, CounterPrivateState>();

  let proofProvider: ProofProvider;
  if (typeof connectedAPI.getProvingProvider === 'function') {
    proofProvider = await dappConnectorProofProvider(
      connectedAPI,
      zkConfigProvider,
      CostModel.initialCostModel(),
    );
  } else {
    let proofServerUri = config.proverServerUri;
    const LOCAL_PROVER = 'http://127.0.0.1:6300';
    if (proofServerUri && proofServerUri.includes('proof-server.preprod.midnight.network')) {
      proofServerUri = LOCAL_PROVER;
    }
    if (!proofServerUri) {
      proofServerUri = LOCAL_PROVER;
    }
    proofProvider = httpClientProofProvider(proofServerUri, zkConfigProvider);
  }

  const walletProvider = {
    getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
    balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
      const serializedTx = toHex(tx.serialize());
      const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
      return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
        'signature',
        'proof',
        'binding',
        fromHex(received.tx),
      );
    },
  };

  const midnightProvider = {
    submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
      await connectedAPI.submitTransaction(toHex(tx.serialize()));
      const ids = tx.identifiers();
      return ids[0];
    },
  };

  return {
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider,
    midnightProvider,
  };
};

export interface UseMidnightReturn {
  walletState: WalletState;
  address: string | null;
  availableWallets: string[];
  selectedWalletId: string | null;
  selectWallet: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  count: bigint | null;
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  reset: () => Promise<void>;
  refreshCount: () => Promise<void>;
  loading: boolean;
  result: string | null;
  lastCircuit: string | null;
  lastTxId: string | null;
  lastBlock: string | null;
  error: string | null;
  clearError: () => void;
}

export function useMidnight(): UseMidnightReturn {
  const [walletState, setWalletState] = useState<WalletState>('detecting');
  const [address, setAddress] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [count, setCount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastCircuit, setLastCircuit] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedAPIRef = useRef<ConnectedAPI | null>(null);
  const providersRef = useRef<Providers | null>(null);
  const foundContractRef = useRef<any>(null);
  const walletStateRef = useRef<WalletState>('detecting');

  const fetchOwnerSecret = (): Uint8Array => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('anonityDemoCounterSecret');
      if (stored) {
        try {
          const hex = stored.trim();
          if (/^[0-9a-fA-F]{64}$/.test(hex)) {
            return Uint8Array.from(Buffer.from(hex, 'hex'));
          }
        } catch { /* ignore */ }
      }
    }
    // Public demo key for the owner-gated demo counter — NOT the real
    // .midnight-state.json ownerSecret. Anyone may mutate the demo counter.
    const demoSecret = Uint8Array.from(
      Buffer.from('0d0b07181203642d951263a16865bfdfc13ad437371645e9f8b2b8ad97ff276f', 'hex'),
    );
    try {
      localStorage.setItem('anonityDemoCounterSecret', Buffer.from(demoSecret).toString('hex'));
    } catch { /* ignore */ }
    return demoSecret;
  };

  useEffect(() => {
    walletStateRef.current = walletState;
  }, [walletState]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const detect = () => {
      if (cancelled) return;
      if (walletStateRef.current === 'connecting' || walletStateRef.current === 'connected') return;
      const wallets = getCompatibleWallets();
      setAvailableWallets((prev) => {
        const ids = wallets.map((w) => w.id);
        return prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids;
      });
      if (wallets.length > 0) {
        setSelectedWalletId((prev) => (prev && wallets.some((w) => w.id === prev) ? prev : wallets[0].id));
        if (!cancelled) setWalletState('ready');
        return;
      }
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          const w = getCompatibleWallets();
          setWalletState(w.length > 0 ? 'ready' : 'no-wallet');
        }, WALLET_DETECT_TIMEOUT_MS);
      }
    };

    detect();
    const intervalId = setInterval(detect, 333);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const connect = useCallback(async () => {
    if (walletState === 'connecting' || walletState === 'connected') return;
    setError(null);
    setWalletState('connecting');
    try {
      const netId = getNetworkId();
      const connected = await connectToWallet(netId, selectedWalletId);
      connectedAPIRef.current = connected;

      const config = await connected.getConfiguration();
      if (config.networkId && config.networkId !== netId) {
        throw new Error(
          `Network mismatch: wallet is connected to "${config.networkId}" but this app targets "${netId}". Switch networks in the wallet and try again.`,
        );
      }

      const unshielded = await connected.getUnshieldedAddress();
      const addr = (unshielded as any)?.unshieldedAddress ?? '(unknown address)';
      setAddress(addr);
      setWalletState('connected');
      const providers = await initializeProviders(connected, config);
      providersRef.current = providers;

      const contractAddress = getDefaultContractAddress();
      if (!contractAddress) {
        setError('No contract address configured. Set VITE_DEFAULT_CONTRACT after deploying to Preprod.');
        return;
      }
      const secret = fetchOwnerSecret();
      const initialPrivateState: CounterPrivateState = { secretKey: secret };

      const found = await findDeployedContract(providers as any, {
        compiledContract: compiledCounterContract as any,
        privateStateId: COUNTER_PRIVATE_STATE_ID,
        contractAddress,
        initialPrivateState: initialPrivateState as any,
      });
      foundContractRef.current = found;

      try {
        const initialCount = await fetchCountFromIndexer(contractAddress);
        setCount(initialCount);
      } catch {
        setCount(null);
      }
    } catch (e: any) {
      const isUserRejected =
        e?.type === 'DAppConnectorAPIError' &&
        (e?.code === 'Rejected' || e?.code === 'PermissionRejected');
      if (isUserRejected) {
        setError('Connection rejected in the wallet. Approve the wallet connection request and try again.');
      } else {
        setError(e?.message ?? String(e));
      }
      setWalletState('ready');
      setAddress(null);
      connectedAPIRef.current = null;
      providersRef.current = null;
      foundContractRef.current = null;
    }
  }, [walletState, selectedWalletId]);

  const selectWallet = useCallback((id: string) => {
    setSelectedWalletId(id);
  }, []);

  const disconnect = useCallback(() => {
    connectedAPIRef.current = null;
    providersRef.current = null;
    foundContractRef.current = null;
    setAddress(null);
    setCount(null);
    setResult(null);
    setError(null);
    setWalletState('ready');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const runCircuit = useCallback(async (name: 'increment' | 'decrement' | 'reset') => {
    const contract = foundContractRef.current;
    if (!contract) {
      setError('Contract not loaded. Connect wallet first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLastCircuit(name);
    try {
      const finalized = await contract.callTx[name]();
      const txId = finalized?.public?.txId;
      const block = finalized?.public?.blockHeight;
      setResult(`txId=${txId ?? ''}${block != null ? ` block=${block}` : ''}`);
      setLastTxId(txId ?? null);
      setLastBlock(block != null ? String(block) : null);
      try {
        const addr = getDefaultContractAddress();
        if (addr) {
          const newCount = await fetchCountFromIndexer(addr);
          if (newCount != null) setCount(newCount);
        }
      } catch { /* ignore */ }
    } catch (e: any) {
      const msg = deepestErrorMessage(e);
      setError(`Circuit "${name}" failed: ${msg}`);
      setLastTxId(null);
      setLastBlock(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const increment = useCallback(() => runCircuit('increment'), [runCircuit]);
  const decrement = useCallback(() => runCircuit('decrement'), [runCircuit]);
  const reset = useCallback(() => runCircuit('reset'), [runCircuit]);

  const refreshCount = useCallback(async () => {
    const contractAddress = getDefaultContractAddress();
    if (!contractAddress) {
      setError('No contract address configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newCount = await fetchCountFromIndexer(contractAddress);
      if (newCount != null) {
        setCount(newCount);
      } else {
        setError('Could not read count from indexer.');
      }
    } catch (e: any) {
      setError(`refresh failed: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    walletState,
    address,
    availableWallets,
    selectedWalletId,
    selectWallet,
    connect,
    disconnect,
    count,
    increment,
    decrement,
    reset,
    refreshCount,
    loading,
    result,
    lastCircuit,
    lastTxId,
    lastBlock,
    error,
    clearError,
  };
}

export default useMidnight;
