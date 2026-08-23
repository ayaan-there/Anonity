import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
} from '../../contracts/managed/anonity/contract/index.js';

export type AnonityPrivateState = { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array };

const witnesses = {
  orgSecretKey: ({ privateState }: any): [AnonityPrivateState, Uint8Array] => {
    return [privateState, privateState.orgSecretKey];
  },
  hunterSecretKey: ({ privateState }: any): [AnonityPrivateState, Uint8Array] => {
    return [privateState, privateState.hunterSecretKey];
  },
};

export const AnonityModule = {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
};

export const compiledAnonityContract = CompiledContract.make('anonity', Contract).pipe(
  CompiledContract.withWitnesses(witnesses as any),
);

export const ANONITY_PRIVATE_STATE_ID = 'anonityPrivateState';
