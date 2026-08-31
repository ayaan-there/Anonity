import {
  CompactTypeBytes,
  CompactTypeVector,
  convertFieldToBytes,
  persistentHash,
} from '@midnight-ntwrk/compact-runtime';

const HUNTER_SECRET_KEY = 'anonity.hunter.secret.v1';
const ORG_SECRET_KEY = 'anonity.org.secret.v1';

// Keep this descriptor byte-for-byte aligned with anonity.compact's
// persistentHash<Vector<3, Bytes<32>>> call. This lets the browser filter
// public submission commitments without asking a server which reports belong
// to the local hunter.
const COMMITMENT_TYPE = new CompactTypeVector(3, new CompactTypeBytes(32));
const HUNTER_DOMAIN = Uint8Array.from([
  118, 101, 105, 108, 119, 111, 114, 107, 58, 104, 117, 110, 116, 101, 114, 58,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (value: string): Uint8Array | null => {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  return bytes;
};

const loadSecret = (key: string): Uint8Array | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? hexToBytes(value) : null;
  } catch {
    return null;
  }
};

const createSecret = (key: string): Uint8Array => {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  try { localStorage.setItem(key, bytesToHex(secret)); } catch { /* storage is optional, backup is mandatory */ }
  return secret;
};

export const getHunterSecretKey = (): Uint8Array | null => loadSecret(HUNTER_SECRET_KEY);

export const getOrCreateHunterSecretKey = (): Uint8Array =>
  getHunterSecretKey() ?? createSecret(HUNTER_SECRET_KEY);

export const getOrCreateOrgSecretKey = (): Uint8Array =>
  loadSecret(ORG_SECRET_KEY) ?? createSecret(ORG_SECRET_KEY);

/** Derive the same round-scoped hunter commitment used by the Compact circuit. */
export const hunterCommitment = (secretKey: Uint8Array, round: bigint): Uint8Array =>
  persistentHash(COMMITMENT_TYPE, [
    HUNTER_DOMAIN,
    convertFieldToBytes(32, round, 'hunter commitment round'),
    secretKey,
  ]);

export const exportHunterSecretKey = (): string => bytesToHex(getOrCreateHunterSecretKey());

export const importHunterSecretKey = (encoded: string): boolean => {
  const secret = hexToBytes(encoded);
  if (!secret) return false;
  try {
    localStorage.setItem(HUNTER_SECRET_KEY, bytesToHex(secret));
    return true;
  } catch {
    return false;
  }
};

export const downloadHunterSecretBackup = (): void => {
  const blob = new Blob([`${exportHunterSecretKey()}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'anonity-hunter-identity.txt';
  anchor.click();
  URL.revokeObjectURL(url);
};
