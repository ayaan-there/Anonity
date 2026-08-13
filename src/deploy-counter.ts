/**
 * Deploy the counter contract to a Midnight network.
 *
 * The counter contract has a constructor `constructor(ownerSecret: Bytes<32>, initialCount: Uint<64>)`
 * and a witness `secretKey(): Bytes<32>`. We generate a random 32-byte owner secret,
 * store it in private state, pass it to the constructor, and wire up the witness
 * so future calls can re-derive the same secret key.
 *
 * Usage: npx tsx src/deploy-counter.ts --network preview
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { resolveNetwork, getOrCreateSeed, type NetworkState } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'counterPrivateState';
const __dirname_file = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname_file, '..', '.midnight-state.json');

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

// ─── Compiled counter contract loading ─────────────────────────────────

const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname2, '..', 'contracts', 'managed', 'counter');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Counter contract not compiled! Run: npx compact compile contracts/counter.compact contracts/managed/counter\n');
  process.exit(1);
}

const CounterModule = await import(pathToFileURL(contractPath).href);

// Counter private state shape — matches the Compact `witness secretKey(): Bytes<32>` declaration.
type CounterPrivateState = { secretKey: Uint8Array };

// Witness implementation — the `secretKey` witness reads the secret from private state
// and returns it to the circuit. This is the BBoard pattern.
const witnesses = {
  secretKey: ({ privateState }: any): [CounterPrivateState, Uint8Array] => {
    return [privateState, privateState.secretKey];
  },
};

const compiledContract = CompiledContract.make('counter', CounterModule.Contract).pipe(
  CompiledContract.withWitnesses(witnesses as never),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Owner secret key generation & persistence ────────────────────────

function loadStateFile(): NetworkState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('.midnight-state.json not found. Run `npm run setup` first to create a wallet.');
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveStateFile(state: NetworkState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function getOrCreateOwnerSecret(): Uint8Array {
  const fixed = process.env.COUNTER_OWNER_SECRET?.trim();
  if (fixed) {
    if (!/^[0-9a-fA-F]{64}$/.test(fixed)) {
      throw new Error('COUNTER_OWNER_SECRET must be a 32-byte hex string (64 hex chars).');
    }
    const sk = Uint8Array.from(Buffer.from(fixed, 'hex'));
    const state = loadStateFile();
    (state as any).counterDeployment = {
      ...(state as any).counterDeployment,
      ownerSecret: fixed,
    };
    saveStateFile(state);
    console.log('  Using fixed owner secret key from COUNTER_OWNER_SECRET');
    return sk;
  }
  const state = loadStateFile();
  const counterState = (state as any).counterDeployment;
  if (counterState?.ownerSecret) {
    const sk = Uint8Array.from(Buffer.from(counterState.ownerSecret, 'hex'));
    console.log('  Reusing existing owner secret key from .midnight-state.json');
    return sk;
  }
  const sk = new Uint8Array(32);
  crypto.getRandomValues(sk);
  (state as any).counterDeployment = {
    ...(state as any).counterDeployment,
    ownerSecret: Buffer.from(sk).toString('hex'),
  };
  saveStateFile(state);
  console.log('  Generated new owner secret key (saved to .midnight-state.json)');
  return sk;
}

// ─── Providers ────────────────────────────────────────────────────────

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'counter-state',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Deploy Counter Contract to ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const ownerSecret = getOrCreateOwnerSecret();
  const initialCount = 0n;

  console.log('─── Wallet setup ───────────────────────────────────────────────\n');
  const walletCtx = await createWallet({ network, networkConfig, seed: SEED });
  console.log('  Syncing with network...');
  const syncStart = Date.now();
  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);
    process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
  }, 5000);
  const state = await walletCtx.wallet.waitForSyncedState();
  clearInterval(syncInterval);
  process.stdout.write('\r  ✓ Synced with network.                                      \n');
  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`\n  Wallet Address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  if (balance === 0n && network !== 'undeployed') {
    console.error('❌ Wallet has zero tNIGHT. Fund from faucet first.\n');
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  // DUST registration (same logic as deploy.ts — the wallet needs DUST for contract deployment)
  console.log('─── DUST Token Setup ───────────────────────────────────────────\n');
  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const unregisteredUtxos = dustState.unshielded.availableCoins.filter(
    (c: any) => !c.meta?.registeredForDustGeneration,
  );
  if (unregisteredUtxos.length > 0) {
    console.log(`  Registering ${unregisteredUtxos.length} NIGHT UTXOs for DUST generation...`);
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregisteredUtxos,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
  }
  if (dustState.dust.balance(new Date()) === 0n) {
    console.log('  Waiting for DUST tokens...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    );
  }
  console.log('  DUST tokens ready!\n');

  // Deploy
  console.log('─── Deploy Counter Contract ────────────────────────────────────\n');

  console.log('  Setting up providers...');
  const providers = await createProviders(walletCtx);

  process.stdout.write('  Generating DUST...');
  await new Promise((r) => setTimeout(r, 6000));
  process.stdout.write(' done.\n');

  console.log('  Deploying counter contract...\n');

  const MAX_RETRIES = 20;
  const RETRY_DELAY_MS = 5000;
  let deployed: Awaited<ReturnType<typeof deployContract>> | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      deployed = await deployContract(providers, {
        compiledContract: compiledContract as any,
        // Constructor args: ownerSecret (Bytes<32>), initialCount (Uint<64>)
        args: [ownerSecret, initialCount] as any,
        privateStateId: PRIVATE_STATE_ID,
        // Initial private state contains the owner's secret key — the witness
        // `secretKey()` will read from this to re-derive the owner commitment.
        initialPrivateState: { secretKey: ownerSecret } as any,
      });
      break;
    } catch (err: any) {
      const errMsg = err?.message || err?.toString() || '';
      const errCause = err?.cause?.message || err?.cause?.toString() || '';
      const fullError = `${errMsg} ${errCause}`;

      const isDustShortage =
        fullError.includes('Not enough Dust') ||
        fullError.includes('Insufficient Funds') ||
        fullError.includes('could not balance dust');

      if (!(isDustShortage && attempt === 1)) {
        console.error(`\n  Attempt ${attempt} error: ${errMsg}`);
        if (errCause && errCause !== errMsg) console.error(`  Cause: ${errCause}`);
      }

      if (isDustShortage) {
        if (attempt < MAX_RETRIES) {
          console.log(`  Still generating DUST, retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        } else {
          console.log(`  ❌ Not enough DUST after ${MAX_RETRIES} retries`);
          await walletCtx.wallet.stop();
          process.exit(1);
        }
      } else {
        throw err;
      }
    }
  }

  if (!deployed) throw new Error('Deployment failed after all retries');

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('  ✅ Counter contract deployed successfully!\n');
  console.log(`  Contract Address: ${contractAddress}\n`);

  // Record the counter deployment separately from hello-world
  const state2 = loadStateFile();
  (state2 as any).counterDeployment = {
    ...(state2 as any).counterDeployment,
    address: contractAddress,
    deployer: address.toString(),
    deployedAt: new Date().toISOString(),
    initialCount: initialCount.toString(),
  };
  saveStateFile(state2);
  console.log('  Saved to .midnight-state.json under [counterDeployment]\n');

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
  console.log('─── Counter deployment complete ─────────────────────────────────\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
