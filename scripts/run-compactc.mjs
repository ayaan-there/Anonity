import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
// The current Compact installer exposes the compiler as `compact` on Linux.
// Windows already ships an unrelated `compact.exe`, so never invoke that
// command accidentally; use an explicit COMPACTC path or compactc there.
const candidates = [
  process.env.COMPACTC,
  ...(process.platform === 'win32' ? [] : ['compact']),
  'compactc',
  '/root/.compact/versions/0.31.1/x86_64-unknown-linux-musl/compactc',
].filter(Boolean);

let lastError;
for (const command of candidates) {
  try {
    const compilerArgs = command === 'compact' ? ['compile', ...args] : args;
    execFileSync(command, compilerArgs, { stdio: 'inherit' });
    process.exit(0);
  } catch (error) {
    if (error?.code !== 'ENOENT') process.exit(error?.status ?? 1);
    lastError = error;
  }
}

console.error('Midnight Compact compiler not found. Set COMPACTC or install compactc 0.31.1.');
process.exit(lastError?.status ?? 1);
