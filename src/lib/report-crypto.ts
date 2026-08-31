import sodium from 'libsodium-wrappers-sumo';

export type EncryptionKeyPair = { publicKey: string; privateKey: string };
export type ReportEnvelope = { version: 1; ciphertext: string };

const ORG_ENCRYPTION_KEY = 'anonity.org.encryption.v1';

const toBase64 = (value: Uint8Array): string => sodium.to_base64(value);
const fromBase64 = (value: string): Uint8Array => sodium.from_base64(value);

const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));
const decode = <T>(value: Uint8Array): T => JSON.parse(new TextDecoder().decode(value)) as T;

const readStoredOrgKeys = (): EncryptionKeyPair | null => {
  try {
    const raw = localStorage.getItem(ORG_ENCRYPTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EncryptionKeyPair>;
    return parsed.publicKey && parsed.privateKey ? { publicKey: parsed.publicKey, privateKey: parsed.privateKey } : null;
  } catch {
    return null;
  }
};

export const ensureOrgEncryptionKeyPair = async (): Promise<EncryptionKeyPair> => {
  await sodium.ready;
  const existing = readStoredOrgKeys();
  if (existing) return existing;
  const pair = sodium.crypto_box_keypair();
  const keys = { publicKey: toBase64(pair.publicKey), privateKey: toBase64(pair.privateKey) };
  try { localStorage.setItem(ORG_ENCRYPTION_KEY, JSON.stringify(keys)); } catch { /* the public key can still be published, backup is local */ }
  return keys;
};

export const hunterEncryptionKeyPair = async (hunterSecretKey: Uint8Array, submissionId: bigint): Promise<EncryptionKeyPair> => {
  await sodium.ready;
  const domain = new TextEncoder().encode('anonity:hunter-report-key:v1');
  const input = new Uint8Array(hunterSecretKey.length + domain.length + 8);
  input.set(hunterSecretKey, 0);
  input.set(domain, hunterSecretKey.length);
  new DataView(input.buffer).setBigUint64(hunterSecretKey.length + domain.length, submissionId, false);
  const perSubmissionSeed = sodium.crypto_generichash(32, input);
  const pair = sodium.crypto_box_seed_keypair(perSubmissionSeed);
  return { publicKey: toBase64(pair.publicKey), privateKey: toBase64(pair.privateKey) };
};

export const sealJson = async <T>(value: T, recipientPublicKey: string): Promise<ReportEnvelope> => {
  await sodium.ready;
  return { version: 1, ciphertext: toBase64(sodium.crypto_box_seal(encode(value), fromBase64(recipientPublicKey))) };
};

export const openJson = async <T>(envelope: ReportEnvelope, keys: EncryptionKeyPair): Promise<T> => {
  await sodium.ready;
  const plaintext = sodium.crypto_box_seal_open(fromBase64(envelope.ciphertext), fromBase64(keys.publicKey), fromBase64(keys.privateKey));
  return decode<T>(plaintext);
};

export const isReportEnvelope = (value: unknown): value is ReportEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReportEnvelope>;
  return candidate.version === 1 && typeof candidate.ciphertext === 'string' && candidate.ciphertext.length > 0;
};
