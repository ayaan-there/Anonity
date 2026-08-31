import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hunterEncryptionKeyPair, isReportEnvelope, openJson, sealJson } from '../src/lib/report-crypto.ts';

describe('Anonity encrypted off-chain data', () => {
  test('report ciphertext does not contain the plaintext payload', async () => {
    const secret = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const keys = await hunterEncryptionKeyPair(secret, 1n);
    const payload = { description: 'private vulnerability details', impact: 'private business impact' };
    const envelope = await sealJson(payload, keys.publicKey);

    assert.equal(isReportEnvelope(envelope), true);
    assert.equal(envelope.ciphertext.includes('private'), false);
    assert.deepEqual(await openJson(envelope, keys), payload);
  });

  test('different local hunter secrets produce different encryption keys', async () => {
    const first = await hunterEncryptionKeyPair(new Uint8Array(32).fill(1), 1n);
    const second = await hunterEncryptionKeyPair(new Uint8Array(32).fill(2), 1n);
    assert.notEqual(first.publicKey, second.publicKey);
    assert.notEqual(first.privateKey, second.privateKey);
  });

  test('hunter report keys are deterministic per submission but unlinkable across submissions', async () => {
    const secret = new Uint8Array(32).fill(7);
    const first = await hunterEncryptionKeyPair(secret, 1n);
    const firstAgain = await hunterEncryptionKeyPair(secret, 1n);
    const second = await hunterEncryptionKeyPair(secret, 2n);
    assert.deepEqual(first, firstAgain);
    assert.notEqual(first.publicKey, second.publicKey);
    assert.notEqual(first.privateKey, second.privateKey);
  });
});
