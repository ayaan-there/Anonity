import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  orgSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  hunterSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  orgKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  hunterKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  postBounty(context: __compactRuntime.CircuitContext<PS>,
             amount_0: bigint,
             deadline_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  updateBounty(context: __compactRuntime.CircuitContext<PS>,
               rawId_0: bigint,
               rawAmount_0: bigint,
               rawDeadline_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               rawBountyId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  resolveSubmission(context: __compactRuntime.CircuitContext<PS>,
                    rawSubmissionId_0: bigint,
                    rawOutcome_0: bigint,
                    rawPayoutAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              rawSubmissionId_0: bigint,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  getBounty(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                 bigint,
                                                                                                                 Uint8Array,
                                                                                                                 bigint]>;
  getSubmission(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                     Uint8Array,
                                                                                                                     bigint]>;
  getStats(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                               bigint,
                                                                                               bigint,
                                                                                               bigint]>;
}

export type ProvableCircuits<PS> = {
  orgKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  hunterKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  postBounty(context: __compactRuntime.CircuitContext<PS>,
             amount_0: bigint,
             deadline_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  updateBounty(context: __compactRuntime.CircuitContext<PS>,
               rawId_0: bigint,
               rawAmount_0: bigint,
               rawDeadline_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               rawBountyId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  resolveSubmission(context: __compactRuntime.CircuitContext<PS>,
                    rawSubmissionId_0: bigint,
                    rawOutcome_0: bigint,
                    rawPayoutAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              rawSubmissionId_0: bigint,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  getBounty(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                 bigint,
                                                                                                                 Uint8Array,
                                                                                                                 bigint]>;
  getSubmission(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                     Uint8Array,
                                                                                                                     bigint]>;
  getStats(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                               bigint,
                                                                                               bigint,
                                                                                               bigint]>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  orgKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  hunterKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  postBounty(context: __compactRuntime.CircuitContext<PS>,
             amount_0: bigint,
             deadline_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  updateBounty(context: __compactRuntime.CircuitContext<PS>,
               rawId_0: bigint,
               rawAmount_0: bigint,
               rawDeadline_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  submitReport(context: __compactRuntime.CircuitContext<PS>,
               rawBountyId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  resolveSubmission(context: __compactRuntime.CircuitContext<PS>,
                    rawSubmissionId_0: bigint,
                    rawOutcome_0: bigint,
                    rawPayoutAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimPayout(context: __compactRuntime.CircuitContext<PS>,
              rawSubmissionId_0: bigint,
              recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  getBounty(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                 bigint,
                                                                                                                 Uint8Array,
                                                                                                                 bigint]>;
  getSubmission(context: __compactRuntime.CircuitContext<PS>, rawId_0: bigint): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                     Uint8Array,
                                                                                                                     bigint]>;
  getStats(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                               bigint,
                                                                                               bigint,
                                                                                               bigint]>;
}

export type Ledger = {
  bounties: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { amount: bigint,
                             deadline: bigint,
                             org: Uint8Array,
                             status: number
                           };
    [Symbol.iterator](): Iterator<[bigint, { amount: bigint, deadline: bigint, org: Uint8Array, status: number }]>
  };
  submissions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { bountyId: bigint,
                             hunter: Uint8Array,
                             outcome: number,
                             payoutAmount: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { bountyId: bigint, hunter: Uint8Array, outcome: number, payoutAmount: bigint }]>
  };
  readonly nextBountyId: bigint;
  readonly nextSubmissionId: bigint;
  readonly round: bigint;
  readonly feeEscrowed: bigint;
  readonly feesBurned: bigint;
  readonly feesRefunded: bigint;
  readonly totalPaid: bigint;
  claimed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
