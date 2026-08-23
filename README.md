# Anonity

![CI](https://github.com/ayaan-there/Anonity/actions/workflows/ci.yml/badge.svg)

> Anonymous bug bounties on Midnight: hunters prove they're owed a payout without ever revealing who they are.

---

## Live Demo

**URL:** https://an0n1ty.vercel.app/

Connect your wallet and use the VeilWork bounty board live on Preprod.

---

## Contract Address

| Network  | Address                                                                 |
|----------|-------------------------------------------------------------------------|
| Preprod (VeilWork bounty core) | `d274ef296c940131983d0379df4b4bffc323c0b52d031596969a56998ae073b5` |
| Preprod (counter, L2 demo)     | `63bfa0aec1cd8f8a768487dfd72fa5fc5e90bc311c9873006af30b694ab8cd7b` |
| Preview (counter, L1)          | `8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8` |

---

## What This Product Does

Bug bounty platforms have an identity problem. Security researchers must disclose who they are to get paid, which exposes them to retaliation, doxxing, and legal risk. Organizations can't verify that reports come from distinct, serious researchers rather than one spammer with ten email addresses. And everyone pays middleman fees for trust that cryptography could provide directly.

**Anonity** fixes both sides. Organizations post bounties; researchers submit vulnerability reports anonymously; every submission carries a small shielded anti-spam fee that is refunded when the report is valid or a duplicate and **burned** when it is slop. Payment rights travel with zero-knowledge proofs, not identities. Good-faith hackers stay anonymous and whole; bad-faith submissions pay a real price.

This repo ships the MVP privacy core: the **VeilWork contract** (bounty posting, anonymous submission with fee escrow, org-only resolution across three outcomes, and aggregate fee accounting) plus a React frontend wired to Preprod. It's built on Midnight because only its data-protection model makes this design possible — transparent chains expose sender, recipient, and amount of every transaction, destroying hunter anonymity at the protocol level.

---

## Privacy Model

- **PUBLIC (on-chain, anyone can see):** bounty amounts and deadlines; that a submission exists against a bounty; resolution outcomes (valid / duplicate / slop); aggregate fee accounting (escrowed, burned, refunded, paid); identity *commitments* (one-way hashes).
- **PRIVATE (private witness, never on-chain):** each participant's 32-byte secret key (`orgSecretKey`, `hunterSecretKey`); the link between any commitment and any wallet address; report contents (stored off-chain entirely).
- **What the user PROVES without revealing:** that the org resolving a submission is the exact party that posted that bounty; that each hunter identity is a stable commitment derived from a secret only they hold — so payouts go to the right anonymous person while the chain learns nothing about who they are or what else they've done.

---

## Tech Stack

- **Midnight network** (Preprod)
- **Compact language** — ZK smart contracts (`veilwork.compact`, `counter.compact`)
- **Midnight.js SDK** — DApp Connector API, proof providers, indexer
- **React 19 + Vite 7 + TypeScript** — frontend
- **Lace / 1AM wallets** — browser wallets with wallet-delegated proving
- **Node.js v22**, **Docker** (local proof server), **Vercel** (hosting), **GitHub Actions** (CI)

---

## Prerequisites

1. **Node.js v22+**
2. **Lace** (or 1AM) browser wallet extension
3. **Docker** — only for the local proof server (Lace users; 1AM proves in-browser)
4. **Compact compiler** — only if you need to recompile contracts
5. **WSL2** on Windows

---

## Setup & Run Locally

```bash
# 1. Clone
git clone https://github.com/ayaan-there/Anonity.git
cd mn-demo

# 2. Install
npm install

# 3. Recompile contracts (optional — artifacts are committed)
npm run compile
npm run compile:veilwork

# 4. Start the local proof server (only needed for Lace wallet)
npm run proof-server:start

# 5. Run the dev server
npm run dev
```

Open http://localhost:3000, connect your wallet, and use the bounty board.

Deploy the contract yourself with:

```bash
COUNTER_OWNER_SECRET=<hex> npm run deploy:veilwork -- --network preprod
```

---

## Run Tests

```bash
npm test
```

29 tests across 6 suites — circuit logic, state transitions, and privacy/authorisation for both contracts, all on the local emulator (no network needed).

---

## CI/CD

Every push and pull request to `main` runs [.github/workflows/ci.yml](.github/workflows/ci.yml): install → Compact compile of both contracts → 29-test emulator suite → typecheck → production build. The badge at the top of this README shows the current status.

---

## Usage Guide

See [docs/USAGE.md](docs/USAGE.md) for a plain-English walkthrough: posting bounties, submitting anonymous reports, resolving outcomes, and what stays private at every step.

---

## Product X Profile

[PLACEHOLDER — I will add after creating the account]
