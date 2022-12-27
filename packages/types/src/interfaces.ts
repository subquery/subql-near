// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BN from 'bn.js';
import {Chunk} from 'near-api-js/lib/providers/provider';

export interface Entity {
  id: string;
}

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export interface Store {
  get(entity: string, id: string): Promise<Entity | null>;
  getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;
  getOneByField(entity: string, field: string, value: any): Promise<Entity | null>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  //if fields in provided, only specify fields will be updated
  bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
}

export interface NearBlock {
  author: string;
  header: BlockHeader;
  chunks: Chunk[];
  transactions: NearTransaction[];
  actions: NearAction[];
  receipts: any[];
}

export interface BlockHeader {
  height: number;
  epoch_id: string;
  next_epoch_id: string;
  hash: string;
  prev_hash: string;
  prev_state_root: string;
  chunk_receipts_root: string;
  chunk_headers_root: string;
  chunk_tx_root: string;
  outcome_root: string;
  chunks_included: number;
  challenges_root: string;
  timestamp: number;
  timestamp_nanosec: string;
  random_value: string;
  validator_proposals: any[];
  chunk_mask: boolean[];
  gas_price: string;
  rent_paid: string;
  validator_reward: string;
  total_supply: string;
  challenges_result: any[];
  last_final_block: string;
  last_ds_final_block: string;
  next_bp_hash: string;
  block_merkle_root: string;
  approvals: string[];
  signature: string;
  latest_protocol_version: number;
}

export interface BlockBody {
  txns: NearTransaction[];
}

export interface BlockReceipt {
  txn_results: TransactionResult[];
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
}

//eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateAccount {}

export interface DeployContract {
  code: Uint8Array;
}

export interface FunctionCall {
  methodName: string;
  args: Uint8Array;
  gas: BN;
  deposit: BN;
}

export interface Transfer {
  deposit: BN;
}

export interface Stake {
  stake: BN;
  publicKey: string;
}

export interface AddKey {
  publicKey: string;
  accessKey: {nonce: BN; permission: string};
}

export interface DeleteKey {
  publicKey: string;
}

export interface DeleteAccount {
  beneficiaryId: string;
}

export type Action =
  | CreateAccount
  | DeployContract
  | FunctionCall
  | Transfer
  | Stake
  | AddKey
  | DeleteKey
  | DeleteAccount;

export const ActionType = {
  CreateAccount: 'CreateAccount' as const,
  DeployContract: 'DeployContract' as const,
  FunctionCall: 'FunctionCall' as const,
  Transfer: 'Transfer' as const,
  Stake: 'Stake' as const,
  AddKey: 'AddKey' as const,
  DeleteKey: 'DeleteKey' as const,
  DeleteAccount: 'DeleteAccount' as const,
} as const;

export type ActionType = typeof ActionType[keyof typeof ActionType];

export interface NearAction<T = Action | any> {
  id: number;
  type: string;
  action: T;
  transaction: NearTransaction;
}

export type DynamicDatasourceCreator = (name: string, args: Record<string, unknown>) => Promise<void>;
