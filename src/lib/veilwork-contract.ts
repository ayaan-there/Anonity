import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
} from '../../contracts/managed/veilwork/contract/index.js';

export type VeilworkPrivateState = { orgSecretKey: Uint8Array; hunterSecretKey: Uint8Array };

const witnesses = {
  orgSecretKey: ({ privateState }: any): [VeilworkPrivateState, Uint8Array] => {
    return [privateState, privateState.orgSecretKey];
  },
  hunterSecretKey: ({ privateState }: any): [VeilworkPrivateState, Uint8Array] => {
    return [privateState, privateState.hunterSecretKey];
  },
};

export const VeilworkModule = {
  Contract,
  ledger,
  pureCircuits,
  contractReferenceLocations,
};

export const compiledVeilworkContract = CompiledContract.make('veilwork', Contract).pipe(
  CompiledContract.withWitnesses(witnesses as any),
);

export const VEILWORK_PRIVATE_STATE_ID = 'veilworkPrivateState';
