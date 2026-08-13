import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@counter': fileURLToPath(new URL('./contracts/managed/counter/contract/index.js', import.meta.url)),
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js-protocol',
    ],
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/midnight-js-*', '@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/onchain-runtime-v3', '@midnight-ntwrk/ledger-v8'],
  },
});
