/**
 * Deploy the Anonity bounty contract to a Midnight network.
 *
 * The contract has an empty constructor and two witnesses
 * (`orgSecretKey`, `hunterSecretKey`). We generate both secrets,
 * store them in private state, and wire up the witnesses so future
 * circuit calls re-derive the same identity commitments.
 *
 * Usage: npx tsx src/deploy-anonity.ts --network preprod
 * Demo-only transparent variant: npx tsx src/deploy-anonity.ts --network preprod --demo-unshielded
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

const DEMO_UNSHIELDED = process.argv.includes('--demo-unshielded');
const CONTRACT_SLUG = DEMO_UNSHIELDED ? 'anonity-demo-unshielded' : 'anonity';
const PRIVATE_STATE_ID = DEMO_UNSHIELDED ? 'AnonityDemoUnshieldedPrivateState' : 'AnonityPrivateState';
const DEPLOYMENT_STATE_KEY = DEMO_UNSHIELDED ? 'anonityDemoUnshieldedDeployment' : 'anonityDeployment';
const __dirname_file = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname_file, '..', '.midnight-state.json');

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

// ─── Compiled anonity contract loading ────────────────────────────────

const zkConfigPath = path.resolve(__dirname_file, '..', 'contracts', 'managed', CONTRACT_SLUG);
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error(`\n❌ ${CONTRACT_SLUG} contract not compiled! Run: ${DEMO_UNSHIELDED ? 'npm run compile:anonity-demo' : 'npm run compile:anonity'}\n`);
  process.exit(1);
}

const AnonityModule = await import(pathToFileURL(contractPath).href);

type AnonityPrivateState = { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array };

const witnesses = {
  orgSecretKey: ({ privateState }: any): [AnonityPrivateState, Uint8Array] => {
    return [privateState, privateState.orgSecretKey];
  },
  hunterSecretKey: ({ privateState }: any): [AnonityPrivateState, Uint8Array] => {
    return [privateState, privateState.hunterSecretKey];
  },
};

const compiledContract = CompiledContract.make(CONTRACT_SLUG, AnonityModule.Contract).pipe(
  CompiledContract.withWitnesses(witnesses as never),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Secrets ───────────────────────────────────────────────────────────

function loadStateFile(): NetworkState {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('.midnight-state.json not found.');
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function saveStateFile(state: NetworkState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

const randomSecret = (): Uint8Array => {
  const sk = new Uint8Array(32);
  crypto.getRandomValues(sk);
  return sk;
};

function getOrCreateSecrets(): { orgSecret: Uint8Array; hunterSecret: Uint8Array } {
  const state = loadStateFile();
  const vw = (state as any)[DEPLOYMENT_STATE_KEY];
  if (vw?.orgSecret && vw?.hunterSecret) {
    console.log('  Reusing existing org/hunter secrets from .midnight-state.json');
    return {
      orgSecret: Uint8Array.from(Buffer.from(vw.orgSecret, 'hex')),
      hunterSecret: Uint8Array.from(Buffer.from(vw.hunterSecret, 'hex')),
    };
  }
  const orgSecret = randomSecret();
  const hunterSecret = randomSecret();
  (state as any)[DEPLOYMENT_STATE_KEY] = {
    ...(state as any)[DEPLOYMENT_STATE_KEY],
    orgSecret: Buffer.from(orgSecret).toString('hex'),
    hunterSecret: Buffer.from(hunterSecret).toString('hex'),
  };
  saveStateFile(state);
  console.log('  Generated new org + hunter secret keys (saved to .midnight-state.json)');
  return { orgSecret, hunterSecret };
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
      privateStateStoreName: DEMO_UNSHIELDED ? 'anonity-demo-unshielded-state' : 'anonity-state',
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
  console.log(`║  Deploy Anonity Contract to ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const { orgSecret, hunterSecret } = getOrCreateSecrets();

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

  console.log('─── Deploy Anonity Contract  ───────────────────────────────────\n');

  console.log('  Setting up providers...');
  const providers = await createProviders(walletCtx);

  process.stdout.write('  Generating DUST...');
  await new Promise((r) => setTimeout(r, 6000));
  process.stdout.write(' done.\n');

  console.log(`  Deploying ${CONTRACT_SLUG} contract...\n`);

  const MAX_RETRIES = 20;
  const RETRY_DELAY_MS = 5000;
  let deployed: Awaited<ReturnType<typeof deployContract>> | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      deployed = await deployContract(providers, {
        compiledContract: compiledContract as any,
        // Empty constructor — no args
        args: [] as any,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: { orgSecretKey: orgSecret, hunterSecretKey: hunterSecret } as any,
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
  console.log(`  ✅ ${CONTRACT_SLUG} contract deployed successfully!\n`);
  console.log(`  Contract Address: ${contractAddress}\n`);

  const state2 = loadStateFile();
  (state2 as any)[DEPLOYMENT_STATE_KEY] = {
    ...(state2 as any)[DEPLOYMENT_STATE_KEY],
    address: contractAddress,
    deployer: address.toString(),
    deployedAt: new Date().toISOString(),
  };
  saveStateFile(state2);
  console.log(`  Saved to .midnight-state.json under [${DEPLOYMENT_STATE_KEY}]\n`);

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
  console.log(`─── ${CONTRACT_SLUG} deployment complete ────────────────────────────────\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
