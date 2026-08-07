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

## Contracts

| Contract | Source | What it demonstrates |
|---|---|---|
| `hello-world` | [`contracts/hello-world.compact`](contracts/hello-world.compact) | Minimal ledger + single circuit. Stores a public message string on chain. |
| `counter` | [`contracts/counter.compact`](contracts/counter.compact) | Owner-authorised counter with a witness, `assert` guards, a `Counter` ledger, and round-rotating `reset()`. |

Both contracts compile with the [Compact](https://docs.midnight.network/developing/compact/) compiler (`compact` CLI) and run on the Midnight emulator (in `tests/`) *and* on the public Preview testnet.

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
# Hello-world
npm run compile

# Counter
npm run compile:counter
```

Artifacts land under `contracts/managed/<contract>/` (compiler output, ZK keys, ZKIR).

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

**Local devnet** (one-shot — starts devnet, compiles, deploys hello-world):

```bash
npm run setup
```

**Preview testnet** (counter — requires a funded wallet):

```bash
# 1. Make sure the proof-server is up
npm run proof-server:start

# 2. Create + fund a preview wallet (tNIGHT faucet: https://midnight-tmnight-preview.nethermind.dev/)
npm run setup -- --network preview

# 3. Compile + deploy the counter
npm run compile:counter
npm run deploy:counter -- --network preview
```

`npm run deploy:counter` generates a random 32-byte owner secret, stores it in `.midnight-state.json` under `counterDeployment.ownerSecret`, and deploys the contract with witnesses wired up so future `increment` / `decrement` / `reset` calls can re-derive the same secret.

### Deployed addresses (Preview)

| Contract | Address on Preview |
|---|---|
| `hello-world` | `bbf8be4681b631a0d80a7bc054a8b5ae9b73f98b85056ffbf355e6758e0c4cb4` |
| `counter` | `8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8` |

Wallet: `mn_addr_preview10nymjc75mwkts7ua8lzyj7wux5dpgjwrucr4nw3vcwwx4w5f25yq0ww8en`

Deployed state is persisted in `.midnight-state.json` (gitignored):

```jsonc
{
  "deployments":   { "preview": { "address": "bbf8…" } },
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
| `npm run compile` | Compile `hello-world` |
| `npm run compile:counter` | Compile `counter` |
| `npm test` | Run the `counter` test suite (emulator) |
| `npm run setup` | Local devnet one-shot (devnet up + compile + deploy hello-world) |
| `npm run setup -- --network preview` | Create / recover preview wallet, register DUST UTXOs |
| `npm run deploy` | Deploy `hello-world` (requires `npm run compile` + funded wallet on preview) |
| `npm run deploy:counter` | Deploy `counter` (requires `npm run compile:counter` + funded wallet) |
| `npm run check-balance` | Print current wallet's tNIGHT / tDUST balances |
| `npm run network [preview\|preprod\|undeployed]` | Switch / query active network |
| `npm run cli` | Interactive CLI to call circuits on the deployed `hello-world` contract |
| `npm run proof-server:start` / `:stop` | Compose lifecycle for just the proof-server |
| `npm run clean` | Remove `contracts/managed/`, `.midnight-state.json`, wallet cache |

See the original `create-mn-app` README below for the rest of the available scripts and environment overrides.

---

## Project structure

```
mn-demo/
├── contracts/
│   ├── hello-world.compact       # Minimal public ledger contract
│   ├── counter.compact           # Owner-gated counter (witness + Counter ledger)
│   └── managed/                  # Compiler output (ZK keys, ZKIR, contract JS) — gitignored
├── tests/
│   └── counter.test.ts           # 13-test emulator suite for `counter`
├── scripts/
│   └── e2e-check.ts              # hello-world end-to-end smoke test
├── src/
│   ├── network.ts                # Network selection + state file management
│   ├── wallet.ts                 # Wallet construction + sync-state cache
│   ├── setup.ts                  # Orchestrator for `npm run setup`
│   ├── deploy.ts                 # Deploy `hello-world`
│   ├── deploy-counter.ts         # Deploy `counter` (witness wiring + owner secret)
│   ├── cli.ts                    # Interactive CLI for the deployed `hello-world`
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

## License

MIT — see `package.json`.
