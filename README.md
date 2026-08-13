# Anonity

A privacy-preserving bug bounty platform on [Midnight Network](https://midnight.network) where hacker anonymity and safe payments come first. Built with [Compact](https://docs.midnight.network/developing/compact/) and React.

Level 2 (Waxing Crescent) submission for the Midnight Builder Challenge.

---

## The Idea

Bug bounty platforms have a trust problem. Hackers risk exposing their identity every time they report a vulnerability. Organizations can never be fully certain that their bounties, source code, and endpoints are in the right hands. Anonity fixes both sides.

**Anonity** is a bug bounty platform where the anonymity of good-faith hackers matters the most. We provide safe payments without exposing any real identity, and organizations can be peaceful knowing their bounties and code are handled by the right people.

### A new bug bounty system

We introduce a stake-based submission model. Hackers spend Midnight tokens to submit a report — this eliminates spam and keeps triage healthy. The outcome determines what happens to the stake:

| Report outcome | Stake | Reward |
|---------------|-------|--------|
| **Genuine** (valid vulnerability) | Payback | Reward + full stake returned |
| **Duplicate** (already reported) | Payback | Full stake returned |
| **Informative** (useful but not exploitable) | Payback | Org decides reward, stake returned |
| **Spam / senseless / AI slop** (flagged by triage) | Burned | No reward, tokens burned |

Good-faith hackers never lose their stake. Only bad-faith submissions pay the price. This makes it economically irrational to spam while keeping the barrier low for genuine researchers.

### Why Midnight

- **Zero-knowledge proofs**: Hackers prove they hold the right credentials without revealing their identity
- **Shielded payments**: Bounty payouts happen on-chain without linking to a real-world identity
- **Private state**: Submission metadata stays off-chain until the hacker chooses to reveal
- **Token staking**: Native token mechanics for the anti-spam deposit system

### Current stage (L2)

This repo contains the first building block: an owner-gated counter contract that demonstrates the core privacy pattern — proving authority without revealing identity. The counter is the seed of the staking mechanism: a user proves they hold the right secret key, the chain verifies the proof, and the secret never touches the ledger.

---

## Live Demo

**URL:** https://mn-demo.vercel.app

Connect your Lace wallet, call the `increment` circuit, and watch the counter tick up — all without revealing your private key on-chain.

---

## Contract Address

| Network | Address | Status |
|---------|---------|--------|
| Preview | `8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8` | Deployed, tested |
| Preprod | `aa061ea362bd953e42e95a05d10c44cfe6206b6e7c44fb7bf1cb7dd8095c77b8` | Deployed, live |

---

## What This Does

The current deployment is a privacy-preserving counter that only the owner can increment. The owner proves they hold the right secret key without ever revealing it. Think of it as a private gate — the chain sees a valid proof of authority, but never the authority itself.

This is the foundation of Anonity's staking system: a user stakes tokens, the contract verifies their right to act, and the private key never leaves their wallet.

**Circuits:**

| Circuit | Auth | Effect |
|---------|------|--------|
| `increment()` | owner-only | count + 1 |
| `decrement()` | owner-only | count - 1 |
| `reset()` | owner-only | count = 0, rotates round |
| `get()` | public | returns current count |
| `publicKey(sk)` | pure | derives owner commitment |

The frontend lets you connect a Lace wallet and trigger `increment` against the deployed Preprod contract. The private key stays in your wallet — the circuit gets a witness, not the raw secret.

---

## Privacy Model

**Public (on-chain):**
- `count` — current counter value
- `owner` — commitment derived from `persistentHash("counter:owner:" || round || secretKey)`
- `round` — rotation counter, incremented on each `reset()`
- Contract address and circuit entry points

**Private (never on-chain):**
- `secretKey` — 32-byte secret supplied as a circuit witness, read from off-chain private state
- Not disclosed in any proof, transaction, or ledger entry

**What the user proves without revealing:**
That they hold the same secret key that produced the on-chain `owner` commitment. The circuit runs `assert(owner == publicKey(sk))` inside a zero-knowledge proof — the chain learns the proof is valid, but never learns `sk` itself.

In Anonity's full vision, this same pattern lets a hacker prove they submitted a valid report and are entitled to a reward — without ever linking their wallet to their real identity.

---

## Privacy Claim

I can prove I am the owner of this counter without revealing my identity, my public key, or my secret key. The chain sees a valid ZK proof of possession — nothing more.

This is the same privacy guarantee Anonity will extend to every hacker on the platform: prove you earned the bounty, collect the payment, stay anonymous.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart contract | Compact language, compiled to Midnight VM bytecode |
| ZK proofs | Midnight's built-in zero-knowledge proof system |
| Frontend | React 19, Vite 7, TypeScript |
| Wallet | Lace wallet via DApp Connector API |
| Proof server | Midnight proof-server (Docker) |
| Indexer | Midnight indexer (Preprod) |
| Hosting | Vercel |

---

## Prerequisites

- **Node.js 22+**
- **Docker** (for local proof-server, optional for frontend-only dev)
- **[Compact compiler](https://docs.midnight.network/developing/compact/) v0.5.1** (only if you need to recompile contracts)
- **[Lace wallet](https://lacwallet.com)** browser extension (for the live demo)
- On Windows: WSL2 for contract compilation and deploy scripts

---

## Run Locally

```bash
# Clone
git clone https://github.com/ayaan-there/mn-demo.git
cd mn-demo

# Install
npm install

# Compile contracts (keys + zkir are already committed, so this is optional)
npm run compile

# Start the proof-server (required for circuit calls)
npm run proof-server:start

# Start the dev server
npm run dev
```

Open http://localhost:3000, connect Lace, and click **Increment**.

To run the emulator test suite (no network required):

```bash
npm test
```

13 tests across 3 suites — circuit logic, state transitions, and privacy/authorisation.

---

## Demo Video

**Link:** TODO — screen recording showing wallet connect, circuit call, and counter update.

---

## Project Structure

```
mn-demo/
├── contracts/
│   ├── counter.compact              # Counter contract source
│   └── managed/counter/             # Compiled output (keys, zkir, contract JS)
├── src/
│   ├── components/
│   │   ├── WalletConnect.tsx        # Lace wallet connect/disconnect UI
│   │   └── CircuitCall.tsx          # Increment circuit call + proof display
│   ├── hooks/
│   │   └── useMidnight.ts           # Midnight SDK wallet + contract hook
│   ├── lib/
│   │   ├── counter-contract.ts      # Contract binding + witness wiring
│   │   └── in-memory-private-state-provider.ts
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # React entry
│   └── index.css                    # Styles
├── tests/
│   └── counter.test.ts              # 13-test emulator suite
├── public/keys/                     # ZK proving keys (copied during build)
├── public/zkir/                     # ZK IR (copied during build)
├── scripts/
│   └── copy-assets.mjs             # Cross-platform key/zkir copy
├── .github/workflows/build.yml     # CI build check
├── docker-compose.yml               # Proof-server
├── vercel.json                      # Deploy config
└── package.json
```

---

## How the counter contract works

```compact
export ledger owner: Bytes<32>;
export ledger count: Uint<64>;
export ledger round: Counter;

constructor(ownerSecret: Bytes<32>, initialCount: Uint<64>) {
    round.increment(1);
    owner = disclose(publicKey(ownerSecret));
    count = disclose(initialCount);
}

witness secretKey(): Bytes<32>;

circuit increment(): [] {
    const sk = secretKey();
    assert(owner == publicKey(sk), "increment: caller is not the owner");
    count = disclose(count + 1 as Uint<64>);
}
```

The `secretKey()` witness is the only private input. It is read from off-chain private state and supplied to the circuit at call time. The circuit derives the matching public commitment via `persistentHash` and checks it against the on-chain `owner` ledger. The secret never appears in a proof or on the ledger.

---

## Roadmap

| Level | Goal | Status |
|-------|------|--------|
| L1 — New Moon | Counter contract deployed, 13 tests | Done |
| L2 — Waxing Crescent | React frontend, Lace wallet, circuit call UI | In progress |
| L3 — First Quarter | CI/CD, additional tests, proposal | Pending |
| L4 — Waxing Gibbous | Anonity bug bounty contract + full frontend | Pending |
| L5 — Full Moon | 50 Preprod users, feedback collection | Pending |
| L6 — Supermoon | Mainnet launch, brand assets | Pending |

---

## License

MIT
