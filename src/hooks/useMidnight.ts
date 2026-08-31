import { useCallback, useEffect, useRef, useState } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ProofProvider, UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Binding, CostModel, Proof, SignatureEnabled, Transaction, createShieldedCoinInfo, encodeQualifiedShieldedCoinInfo, encodeShieldedCoinInfo, nativeToken, type FinalizedTransaction, type QualifiedShieldedCoinInfo, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';
import { firstValueFrom, interval, map, filter, take, timeout, concatMap, catchError, throwError } from 'rxjs';
import { pipe } from 'fp-ts/function';
import { ContractState as CompactContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { inMemoryPrivateStateProvider } from '../lib/in-memory-private-state-provider';
import {
  compiledAnonityContract,
  ANONITY_PRIVATE_STATE_ID,
  AnonityModule,
  type AnonityPrivateState,
} from '../lib/anonity-contract';
import {
  compiledAnonityDemoContract,
  ANONITY_DEMO_PRIVATE_STATE_ID,
  AnonityModule as AnonityDemoModule,
} from '../lib/anonity-demo-contract';
import { getBoardContractAddress, isTransparentDemoMode } from '../lib/deployment-mode';
import { getOrCreateHunterSecretKey, getOrCreateOrgSecretKey } from '../lib/hunter-identity';

export type BountyRow = {
  id: bigint;
  amount: bigint;
  deadline: bigint;
  org: Uint8Array;
  status: number;
};

export type SubmissionRow = {
  id: bigint;
  bountyId: bigint;
  hunter: Uint8Array;
  outcome: number;
  payoutAmount: bigint;
};

export type BoardStats = {
  feeEscrowed: bigint;
  feesBurned: bigint;
  feesRefunded: bigint;
  totalPaid: bigint;
};

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

export type BoardView = {
  round: bigint;
  bounties: BountyRow[];
  submissions: SubmissionRow[];
  stats: BoardStats;
};

type CircuitRunResult = { ok: boolean; result: unknown; txId: string | null };

const fetchBoardState = async (contractAddress: string): Promise<BoardView | null> => {
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
    const l = boardModule.ledger(contractState.data);

    const bounties: BountyRow[] = [];
    for (const [id, b] of l.bounties) {
      bounties.push({ id, amount: b.amount, deadline: b.deadline, org: b.org, status: b.status });
    }
    bounties.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const submissions: SubmissionRow[] = [];
    for (const [id, s] of l.submissions) {
      submissions.push({ id, bountyId: s.bountyId, hunter: s.hunter, outcome: s.outcome, payoutAmount: s.payoutAmount });
    }
    submissions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    return {
      round: BigInt(l.round),
      bounties,
      submissions,
      stats: {
        feeEscrowed: BigInt(l.feeEscrowed),
        feesBurned: BigInt(l.feesBurned),
        feesRefunded: BigInt(l.feesRefunded),
        totalPaid: BigInt(l.totalPaid),
      },
    };
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

const boardModule = isTransparentDemoMode ? AnonityDemoModule : AnonityModule;
const boardCompiledContract = isTransparentDemoMode ? compiledAnonityDemoContract : compiledAnonityContract;
const boardPrivateStateId = isTransparentDemoMode ? ANONITY_DEMO_PRIVATE_STATE_ID : ANONITY_PRIVATE_STATE_ID;

type CompatibleWallet = { id: string; api: InitialAPI };

const WALLET_PREFERENCE_ORDER: readonly string[] = ['1am'];
const WALLET_ID_KEY = 'anonityWalletId';
const WALLET_AUTO_CONNECT_KEY = 'anonityWalletAutoConnect';

const loadWalletId = (): string | null => {
  try {
    return localStorage.getItem(WALLET_ID_KEY);
  } catch {
    return null;
  }
};

const shouldAutoConnect = (): boolean => {
  try {
    return localStorage.getItem(WALLET_AUTO_CONNECT_KEY) === 'true';
  } catch {
    return false;
  }
};

const persistWalletConnection = (walletId: string | null): void => {
  try {
    if (walletId) localStorage.setItem(WALLET_ID_KEY, walletId);
    localStorage.setItem(WALLET_AUTO_CONNECT_KEY, 'true');
  } catch { /* ignore */ }
};

const clearWalletConnection = (): void => {
  try {
    localStorage.removeItem(WALLET_ID_KEY);
    localStorage.removeItem(WALLET_AUTO_CONNECT_KEY);
  } catch { /* ignore */ }
};

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
    isTransparentDemoMode ? `${window.location.origin}/demo` : window.location.origin,
    fetch.bind(window),
  );

  const privateStateProvider = inMemoryPrivateStateProvider<string, AnonityPrivateState>();

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

export type Persona = 'org' | 'hunter';
const PERSONA_KEY = 'anonityPersona';

const loadPersona = (): Persona | null => {
  try {
    const v = localStorage.getItem(PERSONA_KEY);
    return v === 'org' || v === 'hunter' ? v : null;
  } catch {
    return null;
  }
};

export interface UseMidnightReturn {
  walletState: WalletState;
  address: string | null;
  availableWallets: string[];
  selectedWalletId: string | null;
  selectWallet: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  loading: boolean;
  result: string | null;
  lastCircuit: string | null;
  lastTxId: string | null;
  lastBlock: string | null;
  error: string | null;
  clearError: () => void;
  bounties: BountyRow[];
  submissions: SubmissionRow[];
  round: bigint | null;
  boardStats: BoardStats | null;
  boardReady: boolean;
  persona: Persona | null;
  setPersona: (p: Persona | null) => void;
  postBounty: (amount: bigint, deadline: bigint) => Promise<bigint | null>;
  submitReport: (bountyId: bigint) => Promise<{ submissionId: bigint; txId: string } | null>;
  resolveSubmission: (submissionId: bigint, outcome: number, payoutAmount?: bigint) => Promise<boolean>;
  claimPayout: (submissionId: bigint, payoutCoin: QualifiedShieldedCoinInfo) => Promise<boolean>;
  updateBounty: (id: bigint, amount: bigint, deadline: bigint) => Promise<boolean>;
  refreshBoard: () => Promise<BoardView | null>;
}

export function useMidnight(): UseMidnightReturn {
  const [walletState, setWalletState] = useState<WalletState>('detecting');
  const [address, setAddress] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(loadWalletId);
  const [bounties, setBounties] = useState<BountyRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [round, setRound] = useState<bigint | null>(null);
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null);
  const [boardReady, setBoardReady] = useState(false);
  const [persona, setPersonaState] = useState<Persona | null>(loadPersona);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastCircuit, setLastCircuit] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedAPIRef = useRef<ConnectedAPI | null>(null);
  const providersRef = useRef<Providers | null>(null);
  const boardContractRef = useRef<any>(null);
  const walletStateRef = useRef<WalletState>('detecting');
  const autoConnectAttemptedRef = useRef(false);

  const fetchboardSecrets = (): { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array } => {
    return {
      orgSecretKey: getOrCreateOrgSecretKey(),
      hunterSecretKey: getOrCreateHunterSecretKey(),
    };
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

  // Public board reads: guests and post-login routing need bounties
  // without a wallet connection. Poll the indexer on a timer.
  useEffect(() => {
    const addr = getBoardContractAddress();
    if (!addr) return;
    let cancelled = false;
    const load = async () => {
      const s = await fetchBoardState(addr);
      if (cancelled || !s) return;
      setBounties(s.bounties);
      setSubmissions(s.submissions);
      setRound(s.round);
      setBoardStats(s.stats);
    };
    void load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
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
      persistWalletConnection(selectedWalletId);
      const providers = await initializeProviders(connected, config);
      providersRef.current = providers;

      const boardAddress = getBoardContractAddress();
      if (!boardAddress) {
        setError(`No contract address configured. Set ${isTransparentDemoMode ? 'VITE_ANONITY_DEMO_CONTRACT' : 'VITE_ANONITY_CONTRACT'}.`);
        return;
      }

      try {
        const boardSecrets = fetchboardSecrets();
        const boardFound = await findDeployedContract(providers as any, {
          compiledContract: boardCompiledContract as any,
          privateStateId: boardPrivateStateId,
          contractAddress: boardAddress,
          initialPrivateState: boardSecrets as any,
        });
        boardContractRef.current = boardFound;
        setBoardReady(true);
        const boardState = await fetchBoardState(boardAddress);
        if (boardState) {
          setBounties(boardState.bounties);
          setSubmissions(boardState.submissions);
          setRound(boardState.round);
          setBoardStats(boardState.stats);
        }
      } catch (e: any) {
        const message = deepestErrorMessage(e);
        const verifierMismatch = /undefined or have mismatched verifier keys/i.test(message);
        setError(
          verifierMismatch
            ? `The ${isTransparentDemoMode ? 'transparent demo' : 'privacy'} contract address does not match the bundled verifier keys. ${isTransparentDemoMode ? 'Set VITE_ANONITY_DEMO_CONTRACT to the current demo address and redeploy.' : 'Redeploy the updated contract and set VITE_ANONITY_CONTRACT to the new address.'}`
            : `Contract binding failed: ${message}`,
        );
        boardContractRef.current = null;
        setBoardReady(false);
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
      boardContractRef.current = null;
      setBoardReady(false);
      clearWalletConnection();
    }
  }, [walletState, selectedWalletId]);

  useEffect(() => {
    if (walletState !== 'ready' || !selectedWalletId || !shouldAutoConnect() || autoConnectAttemptedRef.current) return;
    autoConnectAttemptedRef.current = true;
    void connect();
  }, [connect, selectedWalletId, walletState]);

  const selectWallet = useCallback((id: string) => {
    setSelectedWalletId(id);
  }, []);

  const disconnect = useCallback(() => {
    clearWalletConnection();
    connectedAPIRef.current = null;
    providersRef.current = null;
    boardContractRef.current = null;
    setAddress(null);
    setResult(null);
    setError(null);
    setBoardReady(false);
    setBounties([]);
    setSubmissions([]);
    setRound(null);
    setBoardStats(null);
    setWalletState('ready');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const setPersona = useCallback((p: Persona | null) => {
    setPersonaState(p);
    try {
      if (p) localStorage.setItem(PERSONA_KEY, p);
      else localStorage.removeItem(PERSONA_KEY);
    } catch { /* ignore */ }
  }, []);

  const refreshBoard = useCallback(async (): Promise<BoardView | null> => {
    const boardAddress = getBoardContractAddress();
    if (!boardAddress) return null;
    const boardState = await fetchBoardState(boardAddress);
    if (boardState) {
      setBounties(boardState.bounties);
      setSubmissions(boardState.submissions);
      setRound(boardState.round);
      setBoardStats(boardState.stats);
    }
    return boardState;
  }, []);

  const runBoardCircuit = useCallback(
    async (
      name: 'postBounty' | 'submitReport' | 'resolveSubmission' | 'updateBounty' | 'claimPayout',
      ...args: readonly unknown[]
    ): Promise<CircuitRunResult> => {
      const contract = boardContractRef.current;
      if (!contract) {
        setError('Anonity contract not loaded. Connect wallet first.');
        return { ok: false, result: null, txId: null };
      }
      setLoading(true);
      setError(null);
      setResult(null);
      setLastCircuit(name);
      try {
        const finalized = await (contract.callTx as any)[name](...args);
        const identifiers = typeof finalized?.identifiers === 'function' ? finalized.identifiers() : [];
        const txId = String(finalized?.public?.txId ?? identifiers[0] ?? '');
        const block = finalized?.public?.blockHeight;
        setResult(`txId=${txId ?? ''}${block != null ? ` block=${block}` : ''}`);
        setLastTxId(txId ?? null);
        setLastBlock(block != null ? String(block) : null);
        await refreshBoard();
        return { ok: true, result: (finalized as any)?.private?.result ?? null, txId: txId || null };
      } catch (e: any) {
        const msg = deepestErrorMessage(e);
        setError(`Circuit "${name}" failed: ${msg}`);
        setLastTxId(null);
        setLastBlock(null);
        return { ok: false, result: null, txId: null };
      } finally {
        setLoading(false);
      }
    },
    [refreshBoard],
  );

  const postBounty = useCallback(
    async (amount: bigint, deadline: bigint): Promise<bigint | null> => {
      const run = await runBoardCircuit('postBounty', amount, deadline);
      if (!run.ok || typeof run.result !== 'bigint') return null;
      return run.result;
    },
    [runBoardCircuit],
  );
  const submitReport = useCallback(
    async (bountyId: bigint): Promise<{ submissionId: bigint; txId: string } | null> => {
      if (isTransparentDemoMode) {
        const run = await runBoardCircuit('submitReport', bountyId);
        if (!run.ok || typeof run.result !== 'bigint' || !run.txId) return null;
        return { submissionId: run.result, txId: run.txId };
      }
      const feeCoin = encodeShieldedCoinInfo(createShieldedCoinInfo(nativeToken().raw, 5_000_000n));
      const run = await runBoardCircuit('submitReport', bountyId, feeCoin);
      if (!run.ok || typeof run.result !== 'bigint' || !run.txId) return null;
      return { submissionId: run.result, txId: run.txId };
    },
    [runBoardCircuit],
  );
  const resolveSubmission = useCallback(
    (submissionId: bigint, outcome: number, payoutAmount = 0n): Promise<boolean> => {
      if (isTransparentDemoMode) {
        return runBoardCircuit('resolveSubmission', submissionId, BigInt(outcome), payoutAmount).then(({ ok }) => ok);
      }
      const payoutCoin = encodeShieldedCoinInfo(createShieldedCoinInfo(nativeToken().raw, payoutAmount));
      return runBoardCircuit('resolveSubmission', submissionId, BigInt(outcome), payoutCoin).then(({ ok }) => ok);
    },
    [runBoardCircuit],
  );
  const claimPayout = useCallback(
    async (submissionId: bigint, payoutCoin: QualifiedShieldedCoinInfo): Promise<boolean> =>
      runBoardCircuit('claimPayout', submissionId, encodeQualifiedShieldedCoinInfo(payoutCoin)).then(({ ok }) => ok),
    [runBoardCircuit],
  );
  const updateBounty = useCallback(
    (id: bigint, amount: bigint, deadline: bigint) =>
      runBoardCircuit('updateBounty', id, amount, deadline).then(({ ok }) => ok),
    [runBoardCircuit],
  );
  return {
    walletState,
    address,
    availableWallets,
    selectedWalletId,
    selectWallet,
    connect,
    disconnect,
    loading,
    result,
    lastCircuit,
    lastTxId,
    lastBlock,
    error,
    clearError,
    bounties,
    submissions,
    round,
    boardStats,
    boardReady,
    persona,
    setPersona,
    postBounty,
    submitReport,
    resolveSubmission,
    claimPayout,
    updateBounty,
    refreshBoard,
  };
}

export default useMidnight;
