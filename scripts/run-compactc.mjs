import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const candidates = [
  process.env.COMPACTC,
  'compactc',
  '/root/.compact/versions/0.31.1/x86_64-unknown-linux-musl/compactc',
].filter(Boolean);

let lastError;
for (const command of candidates) {
  try {
    execFileSync(command, args, { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    if (error?.code !== 'ENOENT') process.exit(error?.status ?? 1);
    lastError = error;
  }
}

console.error('Midnight Compact compiler not found. Set COMPACTC or install compactc 0.31.1.');
process.exit(lastError?.status ?? 1);
