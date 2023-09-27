// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import BN from 'bn.js';
import {Chunk, BlockHeader} from 'near-api-js/lib/providers/provider';

// eslint-disable-next-line @typescript-eslint/ban-types
export interface IArgs extends String {
  toJson<T = any>(): T;
}

export interface NearBlock {
  author: string;
  header: BlockHeader;
  chunks: Chunk[];
  transactions: NearTransaction[];
  actions: NearAction[];
  receipts: NearTransactionReceipt[];
}

export interface NearTransaction {
  nonce: BN;
  signer_id: string;
  public_key: string;
  receiver_id: string;
  actions: NearAction[];
  block_hash: string;
  block_height: number;
  gas_price: string;
  gas_used: string;
  timestamp: number;
  result: TransactionResult;
}

export interface TransactionResult {
  id: string;
  logs: string[];
  receipt_ids: string[];
}

export interface NearTransactionReceipt {
  id: number;
  block_height: number;
  receipt_id: string;
  predecessor_id: string;
  Action?: {
    actions: NearAction[];
    gas_price: BN;
    input_data_ids: string[];
    output_data_receivers: {
      data_id: string;
      receiver_id: string;
    }[];
    signer_id: string;
    signer_public_key: string;
  };
  Data?: {
    data: string;
    data_id: string;
  };
  receiver_id: string;
}

//eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateAccount {}

export interface DeployContract {
  code: Uint8Array;
}

export interface FunctionCall {
  method_name: string;
  args: IArgs;
  gas: BN;
  deposit: BN;
}

export interface Transfer {
  deposit: BN;
}

export interface Stake {
  stake: BN;
  public_key: string;
}

export interface AddKey {
  public_key: string;
  access_key: {nonce: BN; permission: string};
}

export interface DeleteKey {
  public_key: string;
}

export interface DeleteAccount {
  beneficiary_id: string;
}

export interface SignedDelegate {
  delegate_action: DelegateAction;
  signature: {signature: Uint8Array; public_key: string};
}

export interface DelegateAction {
  /// Signer of the delegated actions
  sender_id: string;
  /// Receiver of the delegated actions.
  receiver_id: string;
  /// List of actions to be executed.
  actions: NearAction[];
  /// Nonce to ensure that the same delegate action is not sent twice by a relayer and should match for given account's `public_key`.
  /// After this action is processed it will increment.
  nonce: BN;
  /// The maximal height of the block in the blockchain below which the given DelegateAction is valid.
  max_block_height: number;
  /// Public key that is used to sign this delegated action.
  public_key: string;
}

export type Action =
  | CreateAccount
  | DeployContract
  | FunctionCall
  | Transfer
  | Stake
  | AddKey
  | DeleteKey
  | DeleteAccount
  | SignedDelegate;

export const ActionType = {
  CreateAccount: 'CreateAccount' as const,
  DeployContract: 'DeployContract' as const,
  FunctionCall: 'FunctionCall' as const,
  Transfer: 'Transfer' as const,
  Stake: 'Stake' as const,
  AddKey: 'AddKey' as const,
  DeleteKey: 'DeleteKey' as const,
  DeleteAccount: 'DeleteAccount' as const,
  SignedDelegate: 'Delegate' as const,
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface NearAction<T = Action | any> {
  id: number;
  type: ActionType;
  action: T;
  transaction: NearTransaction;
  receipt?: NearTransactionReceipt;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
