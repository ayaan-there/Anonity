/**
 * Level 1 — Counter contract unit tests.
 *
 * Tests run entirely against the compiled contract artifacts in
 * `contracts/managed/counter/` using @midnight-ntwrk/compact-runtime — no
 * network, no proof server, no wallet. They exercise the circuit logic and
 * ledger state transitions directly, modelling the BBoardSimulator pattern
 * from the Midnight tutorials.
 *
 * Run with: `npx tsx --test tests/counter.test.ts`
 *
 * Tests cover the three Level 1 requirements:
 *   1. Circuit logic — increment / decrement / reset / get / publicKey
 *      behave correctly.
 *   2. State transitions — ledger state evolves: round advances on reset,
 *      owner commitment is set on construction.
 *   3. Privacy — only the holder of the authorised secret key may mutate
 *      the counter. An attacker with the wrong key is rejected.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
    type CircuitContext,
    QueryContext,
    sampleContractAddress,
    createConstructorContext,
    CostModel,
} from '@midnight-ntwrk/compact-runtime';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const managedDir = path.resolve(__dirname, '..', 'contracts', 'managed', 'counter');
const contractModule = await import(pathToFileURL(path.join(managedDir, 'contract', 'index.js')).href);

const { Contract, ledger } = contractModule;

// Private state shape: the host stores the caller's secret key in private state.
type CounterPrivateState = { secretKey: Uint8Array };

// Witness factory — mirrors the Compact `witness secretKey(): Bytes<32>` declaration.
// A Compact witness takes a WitnessContext<Ledger, PS> and returns `[newPrivateState, witnessValue]`.
// The WitnessContext has `privateState` (not `currentPrivateState`) — this is the
// current private state flowing through the circuit call chain. Returning the
// same state unchanged is the standard "getter" pattern (see BBoard witnesses.ts).
const makeWitnesses = () => ({
    secretKey: ({ privateState }: any): [CounterPrivateState, Uint8Array] => {
        return [privateState, privateState.secretKey];
    },
});

/**
 * In-process simulator for the counter contract. Models the BBoardSimulator
 * pattern: holds a CircuitContext, advances it through each circuit call, and
 * exposes the on-chain ledger view via the exported `ledger()` function.
 */
class CounterSimulator {
    readonly contract: Contract<CounterPrivateState>;
    circuitContext: CircuitContext<CounterPrivateState>;

    constructor(ownerSecret: Uint8Array, initialCount: bigint) {
        // The deployer effectively "is" the owner — their secret is embedded in
        // private state, and the constructor uses it to compute the owner
        // commitment via the `publicKey` circuit.
        this.contract = new Contract<CounterPrivateState>(makeWitnesses());
        const { currentPrivateState, currentContractState, currentZswapLocalState } =
            this.contract.initialState(
                // createConstructorContext bundles { initialPrivateState, initialZswapLocalState }
                createConstructorContext({ secretKey: ownerSecret }, '0'.repeat(64)),
                // Constructor compact args after the context: ownerSecret, initialCount
                ownerSecret,
                initialCount,
            );
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            costModel: CostModel.initialCostModel(),
            currentQueryContext: new QueryContext(
                currentContractState.data,
                sampleContractAddress(),
            ),
        };
    }

    /** Swap the secret key in the active private state — simulates a different caller. */
    switchUser(secretKey: Uint8Array) {
        this.circuitContext.currentPrivateState = { secretKey };
    }

    getLedger() {
        return ledger(this.circuitContext.currentQueryContext.state);
    }

    increment() {
        this.circuitContext = this.contract.impureCircuits.increment(this.circuitContext).context;
        return this.getLedger();
    }

    decrement() {
        this.circuitContext = this.contract.impureCircuits.decrement(this.circuitContext).context;
        return this.getLedger();
    }

    reset() {
        this.circuitContext = this.contract.impureCircuits.reset(this.circuitContext).context;
        return this.getLedger();
    }

    get() {
        return this.contract.impureCircuits.get(this.circuitContext).result;
    }

    publicKey(sk: Uint8Array) {
        return this.contract.impureCircuits.publicKey(this.circuitContext, sk).result;
    }
}

// Helper: deterministic 32-byte secret from a single byte.
const sk = (b: number): Uint8Array => {
    const out = new Uint8Array(32);
    out[0] = b;
    return out;
};

// ─── Tests: circuit logic ─────────────────────────────────────────────

describe('Counter contract — circuit logic', () => {
    test('increment raises the count by exactly 1', () => {
        const sim = new CounterSimulator(sk(0xA1), 10n);
        const before = sim.getLedger().count;
        sim.increment();
        assert.equal(sim.getLedger().count, before + 1n);
    });

    test('decrement lowers the count by exactly 1', () => {
        const sim = new CounterSimulator(sk(0xB2), 10n);
        const before = sim.getLedger().count;
        sim.decrement();
        assert.equal(sim.getLedger().count, before - 1n);
    });

    test('get() returns the current count from the ledger', () => {
        const sim = new CounterSimulator(sk(0x00), 42n);
        assert.equal(sim.get(), 42n);
    });

    test('publicKey is deterministic for the same round and secret', () => {
        const sim = new CounterSimulator(sk(0x42), 0n);
        const a = sim.publicKey(sk(0x42));
        const b = sim.publicKey(sk(0x42));
        assert.deepEqual(a, b);
    });
});

// ─── Tests: state transitions ─────────────────────────────────────────

describe('Counter contract — state transitions', () => {
    test('reset sets count to 0 and bumps round by 1', () => {
        const sim = new CounterSimulator(sk(0xC3), 99n);
        const roundBefore = sim.getLedger().round;
        sim.reset();
        const after = sim.getLedger();
        assert.equal(after.count, 0n, 'count should be 0 after reset');
        assert.equal(after.round, roundBefore + 1n, 'round should advance on reset');
    });

    test('constructor sets the supplied initial count on the ledger', () => {
        const sim = new CounterSimulator(sk(0x00), 7n);
        assert.equal(sim.getLedger().count, 7n);
    });

    test('constructor writes a non-zero owner commitment', () => {
        const sim = new CounterSimulator(sk(0x77), 0n);
        const owner = sim.getLedger().owner;
        assert.equal(owner.length, 32, 'owner must be Bytes<32>');
        assert.ok(owner.some((b: number) => b !== 0), 'owner must not be all zeros');
    });

    test('repeated increments accumulate the count monotonically', () => {
        const sim = new CounterSimulator(sk(0xD4), 0n);
        for (let i = 0; i < 5; i++) sim.increment();
        assert.equal(sim.getLedger().count, 5n);
    });

    test('round stays unchanged when only increment/decrement are called', () => {
        const sim = new CounterSimulator(sk(0x55), 5n);
        const roundBefore = sim.getLedger().round;
        sim.increment();
        sim.decrement();
        sim.decrement();
        assert.equal(sim.getLedger().round, roundBefore);
    });
});

// ─── Tests: privacy / authorisation ──────────────────────────────────

describe('Counter contract — privacy & authorisation', () => {
    test('owner commitment differs for different secret keys', () => {
        const alice = new CounterSimulator(sk(1), 0n);
        const bob   = new CounterSimulator(sk(2), 0n);
        assert.notDeepEqual(alice.getLedger().owner, bob.getLedger().owner);
    });

    test('owner with wrong secret key cannot increment (assert throws)', () => {
        const sim = new CounterSimulator(sk(0x99), 0n);
        sim.switchUser(sk(0x00)); // attacker uses a different key
        assert.throws(
            () => sim.increment(),
            (err: any) => err instanceof Error && /not the owner/.test(err.message),
        );
    });

    test('owner with wrong secret key cannot reset (assert throws)', () => {
        const sim = new CounterSimulator(sk(0x99), 5n);
        sim.switchUser(sk(0x00)); // attacker
        assert.throws(
            () => sim.reset(),
            (err: any) => err instanceof Error && /not the owner/.test(err.message),
        );
    });

    test('legitimate owner can still operate after reset rotates the round', () => {
        const sim = new CounterSimulator(sk(0xEE), 3n);
        sim.reset();                               // round 1 → 2, owner commitment rotates
        sim.increment();                           // still the same secret, should succeed
        assert.equal(sim.getLedger().count, 1n);
    });
});
