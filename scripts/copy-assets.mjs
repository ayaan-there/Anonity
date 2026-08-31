import { mkdirSync, cpSync, existsSync } from 'node:fs';

const assets = [
  ['contracts/managed/counter/keys', 'public/keys'],
  ['contracts/managed/counter/zkir', 'public/zkir'],
  ['contracts/managed/anonity/keys', 'public/keys'],
  ['contracts/managed/anonity/zkir', 'public/zkir'],
  ['contracts/managed/anonity-demo-unshielded/keys', 'public/demo/keys'],
  ['contracts/managed/anonity-demo-unshielded/zkir', 'public/demo/zkir'],
];

for (const [src, dest] of assets) {
  if (existsSync(src)) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}
