import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CostModel,
  QueryContext,
  createConstructorContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { encodeUserAddress, sampleUserAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';

const here = path.dirname(fileURLToPath(import.meta.url));
const managedDir = path.resolve(here, '..', 'contracts', 'managed', 'anonity-demo-unshielded');
const demo = await import(pathToFileURL(path.join(managedDir, 'contract', 'index.js')).href);

type PrivateState = { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array };

const witnesses = {
  orgSecretKey: ({ privateState }: any): [PrivateState, Uint8Array] => [privateState, privateState.orgSecretKey],
  hunterSecretKey: ({ privateState }: any): [PrivateState, Uint8Array] => [privateState, privateState.hunterSecretKey],
};

const secret = (value: number): Uint8Array => {
  const bytes = new Uint8Array(32);
  bytes[0] = value;
  return bytes;
};

class DemoSimulator {
  readonly contract: any;
  context: any;

  constructor() {
    this.contract = new demo.Contract(witnesses);
    const initial = this.contract.initialState(
      createConstructorContext(
        { orgSecretKey: secret(0x11), hunterSecretKey: secret(0x22) },
        '0'.repeat(64),
      ),
    );
    this.context = {
      currentPrivateState: initial.currentPrivateState,
      currentZswapLocalState: initial.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(initial.currentContractState.data, sampleContractAddress()),
    };
  }

  switchHunter(value: number): void {
    this.context.currentPrivateState = {
      ...this.context.currentPrivateState,
      hunterSecretKey: secret(value),
    };
  }

  post(): void {
    this.context = this.contract.impureCircuits.postBounty(this.context, 3000n, 9999n).context;
  }

  submit(): void {
    this.context = this.contract.impureCircuits.submitReport(this.context, 1n).context;
  }

  resolve(): void {
    this.context = this.contract.impureCircuits.resolveSubmission(this.context, 1n, 1n, 100000000n).context;
  }

  claim(): void {
    this.context = this.contract.impureCircuits.claimPayout(
      this.context,
      1n,
      { bytes: encodeUserAddress(sampleUserAddress()) },
    ).context;
  }

  ledger(): any {
    return demo.ledger(this.context.currentQueryContext.state);
  }
}

describe('Anonity transparent demo payout claim', () => {
  test('the matching hunter can claim once and the ledger prevents a second claim', () => {
    const sim = new DemoSimulator();
    sim.post();
    sim.submit();
    sim.resolve();
    sim.claim();
    assert.equal(sim.ledger().claimed.lookup(1n), true);
    assert.throws(() => sim.claim(), /payout already claimed/);
  });

  test('a different hunter secret cannot claim the payout', () => {
    const sim = new DemoSimulator();
    sim.post();
    sim.submit();
    sim.resolve();
    sim.switchHunter(0x99);
    assert.throws(() => sim.claim(), /caller did not submit this report/);
  });
});
