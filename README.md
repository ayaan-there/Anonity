# Anonity

![CI](https://github.com/ayaan-there/Anonity/actions/workflows/ci.yml/badge.svg)

> A privacy-preserving bug bounty platform on [Midnight Network](https://midnight.network). This repo starts with the foundation: an owner-gated counter contract where the owner proves authority with a zero-knowledge proof — never revealing their secret key on-chain.

Level 3 (First Quarter) submission for the Midnight Builder Challenge.

---

## Live Demo

**URL:** https://an0n1ty.vercel.app/

Connect your wallet, call the `increment` circuit, and watch the counter tick up — all without revealing your private key on-chain.

---

## Contract Address

| Network  | Address                                                          |
|----------|------------------------------------------------------------------|
| Preview  | `8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8` |
| Preprod  | `63bfa0aec1cd8f8a768487dfd72fa5fc5e90bc311c9873006af30b694ab8cd7b` |

---

## What This Does

The current deployment is a privacy-preserving counter that only the owner can increment. The owner proves they hold the right secret key without ever revealing it. Think of it as a private gate — the chain sees a valid proof of authority, but never the authority itself.

The frontend lets you connect a Midnight wallet and trigger `increment` against the deployed Preprod contract. The private key stays in your wallet — the circuit gets a witness, not the raw secret.

**Circuits:**

| Circuit | Auth | Effect |
|---------|------|--------|
| `increment()` | owner-only | count + 1 |
| `decrement()` | owner-only | count - 1 |
| `reset()` | owner-only | count = 0, rotates round |
| `get()` | public | returns current count |
| `publicKey(sk)` | pure | derives owner commitment |

This is the foundation of Anonity's staking system: a user stakes tokens, the contract verifies their right to act, and the private key never leaves their wallet.

---

## Privacy Model

- **PUBLIC (on-chain, visible to anyone):** `count` (current counter value), `owner` (commitment derived from `persistentHash("counter:owner:" || round || secretKey)`), `round` (rotation counter), contract address and circuit entry points.
- **PRIVATE (private witness, never on-chain):** `secretKey` — a 32-byte secret supplied as a circuit witness, read from off-chain private state. Never disclosed in any proof, transaction, or ledger entry.
- **What the user PROVES without revealing:** That they hold the same secret key that produced the on-chain `owner` commitment. The circuit runs `assert(owner == publicKey(sk))` inside a zero-knowledge proof — the chain learns the proof is valid, but never learns `sk` itself.

---

## Privacy Claim

An on-chain observer can see a valid ZK proof of ownership and a changing counter — but **cannot** see the owner's secret key, public key, or identity. I can prove I am the owner of this counter without revealing any of them.

This is the same privacy guarantee Anonity will extend to every hacker on the platform: prove you earned the bounty, collect the payment, stay anonymous.

---

## Tech Stack

- **Midnight network** (Preprod)
- **Compact language** — smart contract
- **Midnight.js SDK** — DApp Connector API, proof provider, indexer
- **React 19 + Vite 7 + TypeScript** — frontend
- **Lace / 1AM wallet** — browser wallet
- **Node.js v22**
- **Docker** — local proof-server
- **Vercel** — hosting

---

## Prerequisites

- **Node.js v22+**
- **Lace wallet** (or 1AM) browser extension
- **Docker** — only for the local proof-server (required for Lace; 1AM proves in-browser)
- **Compact compiler** — only if you need to recompile contracts
- **WSL2** on Windows — for contract compilation and deploy scripts

---

## Run Locally

```bash
# Clone
git clone https://github.com/ayaan-there/Anonity.git
cd mn-demo

# Install
npm install

# Compile contracts (optional — keys + zkir are already committed)
npm run compile

# Start the proof-server (only required for Lace wallet)
npm run proof-server:start

# Start the dev server
npm run dev
```

Open http://localhost:3000, connect your wallet, and click **Increment**.

## Run Tests

npm test 13 emulator tests across 3 suites: circuit logic, state transitions, privacy/authorisation.

---

## CI/CD

GitHub Actions workflow `.github/workflows/ci.yml` runs on every push and pull request to `main`: checkout, Node.js 22 setup, `npm install`, `npm run build` (copy-assets + tsc -b + vite build --mode preprod), then `npm test`. The CI badge at the top of this README reflects the latest run.

---

## Product Proposal

See [PROPOSAL.md](./PROPOSAL.md) — Anonity product vision, privacy data model, and mainnet feasibility.

---

## Initial Idea

[LEAVE PLACEHOLDER — I will fill this in manually]

---

## Screenshots

### Contract compilation

![Compile output](screenshots/01-compile.png)

### Test suite

![Test suite](screenshots/02-tests.png)

### Contract deployment

![Deploy output](screenshots/03-deploy.png)

### Repository

![Repository](screenshots/04-repo.png)

---

## Demo Video

**Link:** https://youtu.be/kGULkA1vfZ0 — screen recording showing wallet connect, circuit call, and counter update.

---

## License

MIT