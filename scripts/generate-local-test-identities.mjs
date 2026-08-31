import { mkdirSync, writeFileSync } from 'node:fs';
import { generateRandomSeed, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

const count = Number(process.argv[2] ?? 70);
if (!Number.isInteger(count) || count < 1 || count > 500) {
  throw new Error('Usage: node scripts/generate-local-test-identities.mjs [1-500]');
}

const outputDir = 'local-test-identities';
mkdirSync(outputDir, { recursive: true });

const identities = [];
for (let i = 0; i < count; i += 1) {
  const seed = generateRandomSeed();
  const walletResult = HDWallet.fromSeed(seed);
  if (walletResult.type !== 'seedOk') throw new Error(`Could not derive identity ${i + 1}`);

  const derived = walletResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.NightExternal])
    .deriveKeysAt(0);
  if (derived.type !== 'keysDerived') throw new Error(`Could not derive address ${i + 1}`);

  const keystore = createKeystore(derived.keys[Roles.NightExternal], 'preprod');
  identities.push({
    id: `synthetic-${String(i + 1).padStart(3, '0')}`,
    seedHex: Buffer.from(seed).toString('hex'),
    unshieldedAddress: keystore.getBech32Address().toString(),
  });
  walletResult.hdWallet.clear();
}

writeFileSync(`${outputDir}/identities.json`, `${JSON.stringify({
  purpose: 'LOCAL SYNTHETIC TEST IDENTITIES — NOT HUMAN USERS',
  network: 'preprod',
  generatedAt: new Date().toISOString(),
  identities,
}, null, 2)}\n`, { flag: 'wx' });

console.log(`Generated ${count} local synthetic test identities in ${outputDir}/identities.json.`);
console.log('These identities are unfunded, not submitted to Preprod, and must not be counted as human users.');
