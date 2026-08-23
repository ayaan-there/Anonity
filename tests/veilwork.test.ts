/**
 * Level 4 — VeilWork (Anonity bounty core) contract tests.
 *
 * Runs against the compiled artifacts in `contracts/managed/veilwork/`
 * using @midnight-ntwrk/compact-runtime — no network, no proof server,
 * no wallet. Same simulator pattern as counter.test.ts (BBoard style).
 *
 * Run with: `npx tsx --test tests/veilwork.test.ts`
 *
 * Coverage:
 *   1. Circuit logic — postBounty / submitReport / resolveSubmission /
 *      getters behave correctly across all outcomes.
 *   2. State transitions — id allocation, fee accounting, bounty
 *      closing, aggregate stats.
 *   3. Privacy / authorisation — only the org that posted a bounty can
 *      resolve it; commitments hide secrets and differ per identity;
 *      raw secret keys never appear on-chain.
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
const managedDir = path.resolve(__dirname, '..', 'contracts', 'managed', 'veilwork');
const contractModule = await import(pathToFileURL(path.join(managedDir, 'contract', 'index.js')).href);

const { Contract, ledger } = contractModule;

// Outcome encodings used on the wire
const VALID = 1n;
const DUPLICATE = 2n;
const SLOP = 3n;
const FEE = 5n;

type VeilworkPrivateState = {
    orgSecretKey: Uint8Array;
    hunterSecretKey: Uint8Array;
};

// Witness getters — read the caller's secrets from private state.
// The values never touch the ledger or any proof output.
const makeWitnesses = () => ({
    orgSecretKey: ({ privateState }: any): [VeilworkPrivateState, Uint8Array] => {
        return [privateState, privateState.orgSecretKey];
    },
    hunterSecretKey: ({ privateState }: any): [VeilworkPrivateState, Uint8Array] => {
        return [privateState, privateState.hunterSecretKey];
    },
});

/**
 * In-process simulator holding one org + one hunter identity. Use
 * switchOrg / switchHunter to simulate other parties sharing the same
 * deployed contract state.
 */
class VeilworkSimulator {
    readonly contract: Contract<VeilworkPrivateState>;
    circuitContext: CircuitContext<VeilworkPrivateState>;

    constructor(orgSecret: Uint8Array, hunterSecret: Uint8Array) {
        this.contract = new Contract<VeilworkPrivateState>(makeWitnesses());
        const { currentPrivateState, currentContractState, currentZswapLocalState } =
            this.contract.initialState(
                createConstructorContext(
                    { orgSecretKey: orgSecret, hunterSecretKey: hunterSecret },
                    '0'.repeat(64),
                ),
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

    switchOrg(secretKey: Uint8Array) {
        this.circuitContext.currentPrivateState = {
            ...this.circuitContext.currentPrivateState,
            orgSecretKey: secretKey,
        };
    }

    switchHunter(secretKey: Uint8Array) {
        this.circuitContext.currentPrivateState = {
            ...this.circuitContext.currentPrivateState,
            hunterSecretKey: secretKey,
        };
    }

    getLedger() {
        return ledger(this.circuitContext.currentQueryContext.state);
    }

    postBounty(amount: bigint, deadline: bigint) {
        this.circuitContext = this.contract.impureCircuits.postBounty(this.circuitContext, amount, deadline).context;
        return this.getLedger();
    }

    submitReport(bountyId: bigint) {
        this.circuitContext = this.contract.impureCircuits.submitReport(this.circuitContext, bountyId).context;
        return this.getLedger();
    }

    resolve(submissionId: bigint, outcome: bigint) {
        this.circuitContext = this.contract.impureCircuits.resolveSubmission(this.circuitContext, submissionId, outcome).context;
        return this.getLedger();
    }

    getBounty(id: bigint): [bigint, bigint, Uint8Array, bigint] {
        return this.contract.impureCircuits.getBounty(this.circuitContext, id).result;
    }

    getSubmission(id: bigint): [bigint, Uint8Array, bigint] {
        return this.contract.impureCircuits.getSubmission(this.circuitContext, id).result;
    }

    getStats(): [bigint, bigint, bigint, bigint] {
        return this.contract.impureCircuits.getStats(this.circuitContext).result;
    }

    orgKey(sk: Uint8Array) {
        return this.contract.impureCircuits.orgKey(this.circuitContext, sk).result;
    }

    hunterKey(sk: Uint8Array) {
        return this.contract.impureCircuits.hunterKey(this.circuitContext, sk).result;
    }
}

// Helper: deterministic 32-byte secret from a single byte.
const sk = (b: number): Uint8Array => {
    const out = new Uint8Array(32);
    out[0] = b;
    return out;
};

/** Standard fixture: org posts a 100-credit bounty, hunter submits once. */
const withOpenSubmission = () => {
    const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
    sim.postBounty(100n, 9999n);   // bounty #1
    sim.submitReport(1n);          // submission #1
    return sim;
};

// ─── Tests: circuit logic ─────────────────────────────────────────────

describe('VeilWork — circuit logic', () => {
    test('postBounty creates an open bounty with the supplied amount and deadline', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        sim.postBounty(100n, 7777n);
        const [amount, deadline, org, status] = sim.getBounty(1n);
        assert.equal(amount, 100n);
        assert.equal(deadline, 7777n);
        assert.equal(status, 0n, 'new bounty must be open');
        assert.ok(org.some((b) => b !== 0), 'org commitment must be non-zero');
    });

    test('submitReport records a pending submission against the right bounty', () => {
        const sim = withOpenSubmission();
        const [bountyId, hunter, outcome] = sim.getSubmission(1n);
        assert.equal(bountyId, 1n);
        assert.equal(outcome, 0n, 'submission must start pending');
        assert.ok(hunter.some((b) => b !== 0), 'hunter commitment must be non-zero');
    });

    test('valid resolution pays the bounty, refunds the fee, closes the bounty', () => {
        const sim = withOpenSubmission();
        sim.resolve(1n, VALID);
        const [, , , status] = sim.getBounty(1n);
        const [escrow, burned, refunded, paid] = sim.getStats();
        assert.equal(status, 1n, 'bounty must be closed after valid resolution');
        assert.equal(paid, 100n, 'bounty amount must be marked paid');
        assert.equal(refunded, FEE, 'fee must be refunded');
        assert.equal(burned, 0n, 'no fee may burn on valid');
        assert.equal(escrow, 0n, 'escrow must empty out');
    });

    test('duplicate resolution refunds the fee and leaves the bounty open', () => {
        const sim = withOpenSubmission();
        sim.resolve(1n, DUPLICATE);
        const [escrow, burned, refunded, paid] = sim.getStats();
        assert.equal(refunded, FEE);
        assert.equal(burned, 0n);
        assert.equal(paid, 0n);
        assert.equal(escrow, 0n);
        const [, , , status] = sim.getBounty(1n);
        assert.equal(status, 0n, 'duplicate must not close the bounty');
    });

    test('slop resolution burns the fee', () => {
        const sim = withOpenSubmission();
        sim.resolve(1n, SLOP);
        const [escrow, burned, refunded, paid] = sim.getStats();
        assert.equal(burned, FEE, 'fee must burn on slop');
        assert.equal(refunded, 0n);
        assert.equal(paid, 0n);
        assert.equal(escrow, 0n);
    });
});

// ─── Tests: state transitions ─────────────────────────────────────────

describe('VeilWork — state transitions', () => {
    test('bounty and submission ids allocate monotonically from 1', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        sim.postBounty(10n, 1n);
        sim.postBounty(20n, 2n);
        sim.submitReport(1n);
        sim.submitReport(2n);
        assert.equal(sim.getBounty(1n)[0], 10n);
        assert.equal(sim.getBounty(2n)[0], 20n);
        assert.equal(sim.getSubmission(1n)[0], 1n, 'submission 1 links to bounty 1');
        assert.equal(sim.getSubmission(2n)[0], 2n, 'submission 2 links to bounty 2');
        const l = sim.getLedger();
        assert.equal(l.nextBountyId, 3n);
        assert.equal(l.nextSubmissionId, 3n);
    });

    test('a resolved submission cannot be resolved again', () => {
        const sim = withOpenSubmission();
        sim.resolve(1n, VALID);
        assert.throws(
            () => sim.resolve(1n, SLOP),
            (err: any) => err instanceof Error && /already resolved/.test(err.message),
        );
    });

    test('submitting to a nonexistent bounty is rejected', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        assert.throws(
            () => sim.submitReport(42n),
            (err: any) => err instanceof Error && /no such bounty/.test(err.message),
        );
    });

    test('posting a zero-amount bounty is rejected', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        assert.throws(
            () => sim.postBounty(0n, 100n),
            (err: any) => err instanceof Error && /amount must be positive/.test(err.message),
        );
    });

    test('fee accounting accumulates correctly across mixed outcomes', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        sim.postBounty(50n, 100n);       // bounty 1
        sim.submitReport(1n);            // sub 1 → valid
        sim.submitReport(1n);            // sub 2 → duplicate
        sim.submitReport(1n);            // sub 3 → slop
        sim.resolve(1n, VALID);
        sim.resolve(2n, DUPLICATE);
        sim.resolve(3n, SLOP);
        const [escrow, burned, refunded, paid] = sim.getStats();
        assert.equal(escrow, 0n, 'all three fees must have left escrow');
        assert.equal(burned, FEE);
        assert.equal(refunded, 2n * FEE);
        assert.equal(paid, 50n);
    });
});

// ─── Tests: privacy & authorisation ───────────────────────────────────

describe('VeilWork — privacy & authorisation', () => {
    test('only the org that posted the bounty can resolve its submissions', () => {
        const sim = withOpenSubmission();
        sim.switchOrg(sk(0x99)); // attacker org
        assert.throws(
            () => sim.resolve(1n, VALID),
            (err: any) => err instanceof Error && /not the bounty org/.test(err.message),
        );
    });

    test('org commitments differ per secret key', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        assert.notDeepEqual(sim.orgKey(sk(0x11)), sim.orgKey(sk(0x12)));
    });

    test('hunter commitments differ per secret key', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        assert.notDeepEqual(sim.hunterKey(sk(0x22)), sim.hunterKey(sk(0x23)));
    });

    test('commitments are deterministic for the same secret', () => {
        const sim = new VeilworkSimulator(sk(0x11), sk(0x22));
        assert.deepEqual(sim.hunterKey(sk(0x22)), sim.hunterKey(sk(0x22)));
    });

    test('raw secret keys never appear in stored commitments or ledger scalars', () => {
        const sim = withOpenSubmission();
        const org = sk(0x11);
        const hunter = sk(0x22);
        const [, hunterC, ] = sim.getSubmission(1n);
        const [, , orgC, ] = sim.getBounty(1n);
        assert.notDeepEqual(hunterC, hunter, 'hunter commitment must not be the raw key');
        assert.notDeepEqual(orgC, org, 'org commitment must not be the raw key');
        const l = sim.getLedger() as Record<string, unknown>;
        for (const value of Object.values(l)) {
            if (typeof value === 'bigint') {
                assert.notEqual(value, BigInt(hunter[0]), 'secret byte must never surface as a ledger scalar');
            }
        }
    });

    test('any hunter can submit — anonymity is permissionless, not gated by allowlist', () => {
        const sim = withOpenSubmission();
        sim.switchHunter(sk(0x33)); // second, unrelated researcher
        sim.submitReport(1n);       // must succeed without registration
        assert.equal(sim.getSubmission(2n)[0], 1n);
    });
});
