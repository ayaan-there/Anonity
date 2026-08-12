# mn-demo

A [Midnight Network](https://midnight.network) smart-contract project built with the [Compact language](https://docs.midnight.network/developing/compact/) and scaffolded via `create-mn-app`.

Level 1 (New Moon) submission for the **Midnight Builder Challenge** bootcamp.

---

## Initial Idea

A privacy-preserving **Counter-as-a-Service**: a smart contract that maintains a public count on the Midnight ledger but lets only a single authorised party (the *owner*) increment, decrement, or reset it. The owner is identified by a commitment derived from an off-chain secret key — their actual identity never touches the ledger.

The contract is fine-grained enough to serve as a building block for higher-level privacy DApps: on-chain polls where only the organiser may bump a tally, scarce / limited-drop counters with a hidden admin key, DApp-side rate-limit windows keyed to an opaque owner commitment, or the seed of a shielded fund-disbursement contract that releases capital in bounded instalments (one tick per call).

The contract ships with the following circuits:

| Circuit | Auth | Effect |
|---|---|---|
| `publicKey(sk)` | pure | Derives the owner's on-chain commitment `persistentHash("counter:owner:" \|\| round \|\| sk)` |
| `increment()` | owner-only | `count + 1` |
| `decrement()` | owner-only | `count - 1` |
| `reset()` | owner-only | `count = 0` **and** rotates the `round` ledger (so the owner's commitment changes, but the same secret key holder retains control via a re-derived commitment under the new round) |
| `get()` | public | Returns the current count |

---

## Prerequisites

- **Node.js 22+**
- **Docker** with Compose v2 (only needed for the local devnet / proof-server)
- **[Compact compiler](https://docs.midnight.network/developing/compact/)** v0.5.1 (`compact` on your `PATH`)
- On Windows: WSL2 Ubuntu 22.04 is required — the Compact compiler does not support Windows natively.

Install the compiler:

```bash
curl -o- https://raw.githubusercontent.com/midnight-ntwrk/compact/main/install.sh | bash
compact update 0.5.1
compact use 0.5.1
```

Install JS dependencies:

```bash
npm install
```

---

## Compile

```bash
npm run compile
```

Artifacts land under `contracts/managed/counter/` (compiler output, ZK keys, ZKIR).

## Test

The counter contract has a TypeScript test suite that runs against the Midnight emulator (no network, no Docker, ~1 s):

```bash
npm test
```

13 tests across 3 suites, all green:

1. **Circuit logic (3 tests)** — `publicKey` determinism + `get` returns current count.
2. **State transitions (6 tests)** — increment / decrement / reset cycles, single-step and multi-call.
3. **Privacy & authorisation (4 tests)** — wrong secret rejected by `assert`, empty-state behaviour, witness invoked exactly once per call.

## Deploy

**Preview testnet** (requires a funded wallet):

```bash
# 1. Make sure the proof-server is up
npm run proof-server:start

# 2. Create + fund a preview wallet (tNIGHT faucet: https://faucet.preview.midnight.network/)
npm run deploy -- --network preview
```

`npm run deploy` generates a random 32-byte owner secret, stores it in `.midnight-state.json` under `counterDeployment.ownerSecret`, and deploys the contract with witnesses wired up so future `increment` / `decrement` / `reset` calls can re-derive the same secret.

### Deployed addresses (Preview)

| Contract | Address on Preview |
|---|---|
| `counter` | `8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8` |

Wallet: `mn_addr_preview10nymjc75mwkts7ua8lzyj7wux5dpgjwrucr4nw3vcwwx4w5f25yq0ww8en`

Deployed state is persisted in `.midnight-state.json` (gitignored):

```jsonc
{
  "counterDeployment": {
    "ownerSecret": "<32-byte hex>",            // witness material — keep secret
    "address": "8aab…b8",
    "initialCount": "0"
  }
}
```

---

## Available scripts reference

| Script | Purpose |
|---|---|
| `npm run compile` | Compile `counter` |
| `npm test` | Run the `counter` test suite (emulator) |
| `npm run deploy` | Deploy `counter` (requires `npm run compile` + funded wallet) |
| `npm run check-balance` | Print current wallet's tNIGHT / tDUST balances |
| `npm run network [preview\|preprod\|undeployed]` | Switch / query active network |
| `npm run proof-server:start` / `:stop` | Compose lifecycle for just the proof-server |
| `npm run clean` | Remove `contracts/managed/`, `.midnight-state.json`, wallet cache |

---

## Project structure

```
mn-demo/
├── contracts/
│   ├── counter.compact           # Owner-gated counter (witness + Counter ledger)
│   └── managed/counter/          # Compiler output (ZK keys, ZKIR, contract JS)
├── tests/
│   └── counter.test.ts           # 13-test emulator suite for `counter`
├── src/
│   ├── network.ts                # Network selection + state file management
│   ├── wallet.ts                 # Wallet construction + sync-state cache
│   ├── wallet-state.ts           # Wallet sync-state persistence helpers
│   ├── deploy-counter.ts         # Deploy `counter` (witness wiring + owner secret)
│   └── check-balance.ts          # NIGHT / DUST balance
├── docker-compose.yml            # proof-server (and local devnet node + indexer)
├── .midnight-state.json          # Wallet seed + deployment records (gitignored)
├── package.json
└── tsconfig.json
```

---

## How the counter contract works

```compact
export ledger owner: Bytes<32>;        // commitment to the owner's secret key
export ledger count: Uint<64>;          // public count
export ledger round: Counter;           // rotated on each reset (replay protection)

constructor(ownerSecret: Bytes<32>, initialCount: Uint<64>) {
    round.increment(1);
    owner  = disclose(publicKey(ownerSecret));
    count  = disclose(initialCount);
}

witness secretKey(): Bytes<32>;         // off-chain, never published

circuit increment(): [] {
    const sk = secretKey();
    assert(owner == publicKey(sk), "increment: caller is not the owner");
    count = disclose(count + 1 as Uint<64>);
}
// decrement(), reset(), get(), publicKey() — see contracts/counter.compact
```

The `secretKey()` witness is the only private input. It is read from the contract's private state (off-chain) and supplied to the circuit at call time. The circuit then derives the matching public commitment via `persistentHash` and checks it against the on-chain `owner` ledger — nothing about the secret ever appears in a proof or on the ledger.

`reset()` rotates the `round` ledger, which changes the owner commitment under the new round. The same secret key holder re-derives a fresh commitment for the new round, so they keep control. This prevents an outside observer from linking the pre- and post-reset owner commitments (each is `persistentHash("counter:owner:" || round || sk)`).

---

## Privacy Model

- **What is PUBLIC (on-chain, visible to anyone):**
  - `count` — the current counter value (`Uint<64>`)
  - `owner` — a public commitment derived from the owner's secret key (`persistentHash("counter:owner:" || round || sk)`)
  - `round` — the rotation counter (incremented on each `reset()`)
  - Contract address and circuit entry points (`increment`, `decrement`, `reset`, `get`)

- **What is PRIVATE (private witness, never on-chain):**
  - `secretKey()` — the 32-byte owner secret supplied as a circuit witness
  - Read from off-chain private state (`privateState.secretKey`) at call time
  - Never disclosed in any proof, transaction, or ledger entry

- **What the user PROVES without revealing:**
  - That the caller holds the same secret key that produced the on-chain `owner` commitment (`assert(owner == publicKey(sk))`)
  - That `count` transitions (increment / decrement / reset) are authorised by that owner — no identity, no public key, just the ZK proof of possession
  - On `reset()`: the new `owner` commitment is derived from the same secret under a new `round`, preventing linkage between pre- and post-reset owner commitments

---

## Screenshots

### Screenshot 1 — Compilation

```bash
npm run compile
```

![Compilation output](./screenshots/01-compile.png)

### Screenshot 2 — Tests

```bash
npm test
```

![Test output](./screenshots/02-tests.png)

### Screenshot 3 — Deployment

```bash
npm run deploy -- --network preview
```

![Deployment output](./screenshots/03-deploy.png)

### Screenshot 4 — Repository structure

```bash
find contracts/counter.compact contracts/managed/counter tests/counter.test.ts README.md package.json -maxdepth 3 | sort
```

![Repository structure](./screenshots/04-repo.png)

---

## License

MIT — see `package.json`.
