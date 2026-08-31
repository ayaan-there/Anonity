import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
} from '../../contracts/managed/anonity-demo-unshielded/contract/index.js';

export type AnonityDemoPrivateState = { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array };

const witnesses = {
  orgSecretKey: ({ privateState }: any): [AnonityDemoPrivateState, Uint8Array] => [privateState, privateState.orgSecretKey],
  hunterSecretKey: ({ privateState }: any): [AnonityDemoPrivateState, Uint8Array] => [privateState, privateState.hunterSecretKey],
};

export const AnonityModule = { Contract, ledger, pureCircuits, contractReferenceLocations };

export const compiledAnonityDemoContract = CompiledContract.make('anonity-demo-unshielded', Contract).pipe(
  CompiledContract.withWitnesses(witnesses as any),
);

export const ANONITY_DEMO_PRIVATE_STATE_ID = 'anonityDemoUnshieldedPrivateState';
