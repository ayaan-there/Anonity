import { mkdirSync, cpSync, existsSync } from 'node:fs';

const assets = [
  ['contracts/managed/counter/keys', 'public/keys'],
  ['contracts/managed/counter/zkir', 'public/zkir'],
];

for (const [src, dest] of assets) {
  if (existsSync(src)) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}
