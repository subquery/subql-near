// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BN } from '@polkadot/util';
import { getLogger } from '@subql/node-core';
import {
  NearBlockFilter,
  NearTransactionFilter,
  NearActionFilter,
  NearBlock,
  NearTransaction,
  NearAction,
  CreateAccount,
  DeployContract,
  FunctionCall,
  Transfer,
  Stake,
  AddKey,
  DeleteKey,
  DeleteAccount,
  Action,
  ActionType,
  IArgs,
  NearTransactionReceipt,
  NearReceiptFilter,
} from '@subql/types-near';
import { get, range } from 'lodash';
import { providers } from 'near-api-js';
import { BlockResult, Transaction } from 'near-api-js/lib/providers/provider';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { BlockContent } from '../indexer/types';

const logger = getLogger('fetch');
const DEFAULT_TIME = new BN(6_000);

export class Args extends String implements IArgs {
  toJson<T = any>(): T {
    return JSON.parse(Buffer.from(this, 'base64').toString('utf8'));
  }
}

export const mappingFilterAction: Record<
  ActionType,
  Record<string, `action.${string}`>
> = {
  [ActionType.FunctionCall]: {
    methodName: 'action.method_name',
    args: 'action.args',
  },
  [ActionType.Stake]: {
    publicKey: 'action.publicKey',
  },
  [ActionType.AddKey]: {
    publicKey: 'action.public_key',
    accessKey: 'action.access_key',
  },
  [ActionType.DeleteKey]: {
    publicKey: 'action.public_key',
  },
  [ActionType.DeleteAccount]: {
    beneficiaryId: 'action.beneficiary_id',
  },
  [ActionType.CreateAccount]: {},
  [ActionType.DeployContract]: {},
  [ActionType.Transfer]: {},
};

export async function wrapBlock(
  api: providers.JsonRpcProvider,
  blockResult: BlockResult,
): Promise<NearBlock> {
  const nearBlock: NearBlock = {
    author: blockResult.author,
    header: blockResult.header,
    chunks: blockResult.chunks,
    transactions: [],
    actions: [],
    receipts: [],
  };

  const chunkPromises = blockResult.chunks.map(async (chunk) => {
    const chunkResult = await api.chunk(chunk.chunk_hash);
    const transactionPromises = chunkResult.transactions.map(
      async (transaction) => {
        const exectuionOutcome = await api.txStatusReceipts(
          transaction.hash,
          transaction.signer_id,
        );
        const wrappedTx = wrapTransaction(
          blockResult,
          transaction,
          exectuionOutcome,
        );
        const txReceipts = wrapTransactionReceipt(
          (exectuionOutcome as any).receipts,
          wrappedTx,
        );

        const nearActions: NearAction[] = transaction.actions.map(
          (action, id) => wrapAction(action, id, wrappedTx),
        );

        for (const receipt of txReceipts) {
          for (const action of receipt.actions) {
            action.receipt = receipt;
            action.receipt.actions = null;
            nearBlock.actions.push(action);
          }
        }

        nearBlock.transactions.push(wrappedTx);
        nearBlock.actions.push(...nearActions);
        nearBlock.receipts.push(...txReceipts);
      },
    );
    await Promise.all(transactionPromises);
  });

  await Promise.all(chunkPromises);

  return nearBlock;
}

export function wrapTransaction(
  block: BlockResult,
  txn: Transaction,
  exectuionOutcome: any,
): NearTransaction {
  return {
    ...txn,
    gas_price: block.header.gas_price,
    gas_used: exectuionOutcome.transaction_outcome.outcome.gas_burnt.toString(),
    block_hash: block.header.hash,
    block_height: block.header.height,
    timestamp: block.header.timestamp,
    result: {
      id: exectuionOutcome.transaction_outcome.id,
      logs: exectuionOutcome.transaction_outcome.outcome.logs,
    },
  };
}

function wrapTransactionReceipt(
  data: any[],
  tx: NearTransaction,
): NearTransactionReceipt[] {
  return data.map((item, id) => {
    const actions: NearAction[] = item.receipt.Action.actions.map(
      (action, id) => wrapAction(action, id, tx),
    );
    const gasPrice: BN = new BN(item.receipt.Action.gas_price);
    const inputDataIds: string[] = item.receipt.Action.input_data_ids;
    const outputDataReceivers: string[] =
      item.receipt.Action.output_data_receivers;
    const signerId: string = item.receipt.Action.signer_id;
    const signerPublicKey: string = item.receipt.Action.signer_public_key;
    const predecessorId: string = item.predecessor_id;

    const receipt: NearTransactionReceipt = {
      id,
      receipt_id: item.receipt_id,
      transaction: tx,
      predecessor_id: predecessorId,
      actions,
      gas_price: gasPrice,
      input_data_ids: inputDataIds,
      output_data_receivers: outputDataReceivers,
      signer_id: signerId,
      signer_public_key: signerPublicKey,
      receiver_id: item.receiver_id,
    };

    return receipt;
  });
}

function parseNearAction(type: ActionType, action: any): Action {
  switch (type) {
    case ActionType.CreateAccount:
      return action as CreateAccount;
    case ActionType.DeployContract:
      return action as DeployContract;
    case ActionType.FunctionCall: {
      const parsedAction = action as FunctionCall;
      parsedAction.args = new Args(action.args);
      return parsedAction;
    }
    case ActionType.Transfer:
      return action as Transfer;
    case ActionType.Stake:
      return action as Stake;
    case ActionType.AddKey:
      return action as AddKey;
    case ActionType.DeleteKey:
      return action as DeleteKey;
    case ActionType.DeleteAccount:
      return action as DeleteAccount;
    default:
      throw new Error('Invalid type string for NearAction');
  }
}

export function wrapAction(
  action: Record<string, any> | string,
  id: number,
  transaction: NearTransaction,
): NearAction {
  let type, actionValue;
  if (action === 'CreateAccount') {
    type = 'CreateAccount';
    actionValue = parseNearAction(type, {});
  } else {
    type = Object.keys(action)[0];
    actionValue = parseNearAction(type, action[type]);
  }

  return {
    id,
    type: type,
    action: actionValue,
    transaction: transaction,
  } as NearAction<typeof actionValue>;
}

export function filterBlock(
  block: NearBlock,
  filter?: NearBlockFilter,
): NearBlock | undefined {
  if (!filter) return block;
  if (!filterBlockModulo(block, filter)) return;
  if (filter.timestamp) {
    if (!filterBlockTimestamp(block, filter as SubqlProjectBlockFilter)) {
      return;
    }
  }

  return block;
}

export function filterBlockModulo(
  block: NearBlock,
  filter: NearBlockFilter,
): boolean {
  const { modulo } = filter;
  if (!modulo) return true;
  return block.header.height % modulo === 0;
}

export function filterBlockTimestamp(
  block: NearBlock,
  filter: SubqlProjectBlockFilter,
): boolean {
  const unixTimestamp = block.header.timestamp;
  if (unixTimestamp > filter.cronSchedule.next) {
    logger.info(
      `Block with timestamp ${new Date(
        unixTimestamp,
      ).toString()} is about to be indexed`,
    );
    logger.info(
      `Next block will be indexed at ${new Date(
        filter.cronSchedule.next,
      ).toString()}`,
    );
    filter.cronSchedule.schedule.prev();
    return true;
  } else {
    filter.cronSchedule.schedule.prev();
    return false;
  }
}

export function filterTransaction(
  transaction: NearTransaction,
  filter?: NearTransactionFilter,
): boolean {
  if (!filter) return true;
  if (filter.sender && filter.sender !== transaction.signer_id) return false;
  if (filter.receiver && filter.receiver !== transaction.receiver_id) {
    return false;
  }
  return true;
}

export function filterTransactions(
  transactions: NearTransaction[],
  filterOrFilters: NearTransactionFilter | NearTransactionFilter[] | undefined,
): NearTransaction[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return transactions;
  }
  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  return transactions.filter((transaction) =>
    filters.find((filter) => filterTransaction(transaction, filter)),
  );
}

export function filterReceipt(
  receipt: NearTransactionReceipt,
  filter?: NearReceiptFilter,
): boolean {
  if (!filter) return true;
  if (!filterTransaction(receipt.transaction)) return false;
  if (filter.predecessor_id && receipt.predecessor_id !== filter.predecessor_id)
    return false;
  if (filter.signer_id && receipt.signer_id !== filter.signer_id) return false;
  if (
    filter.receipt_receiver &&
    receipt.receiver_id !== filter.receipt_receiver
  )
    return false;
  return true;
}

export function filterReceipts(
  receipts: NearTransactionReceipt[],
  filterOrFilters?: NearReceiptFilter | NearReceiptFilter[] | undefined,
): NearTransactionReceipt[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return receipts;
  }
  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  return receipts.filter((receipt) =>
    filters.find((filter) => filterReceipt(receipt, filter)),
  );
}

export function filterAction(
  action: NearAction,
  filter?: NearActionFilter,
): boolean {
  //if(action.receipt && action.receipt.receiver_id === "dclv2.ref-labs.near") logger.info(JSON.stringify(action.action))
  if (!filter) return true;

  //check if action is related to a receipt
  if (action.receipt && !filterReceipt(action.receipt, filter)) {
    return false;
  } else if (!filterTransaction(action.transaction, filter)) {
    return false;
  }

  const {
    predecessor_id,
    receipt_receiver,
    receiver,
    sender,
    signer_id,
    type,
    ...filterByKey
  } = filter;

  if (type && action.type !== type) {
    return false;
  }

  for (const key in filterByKey) {
    if (
      mappingFilterAction[action.type] &&
      filterByKey[key] !== get(action, mappingFilterAction[action.type][key])
    ) {
      return false;
    }
  }

  return true;
}

export function filterActions(
  actions: NearAction[],
  filterOrFilters?: NearActionFilter | NearActionFilter[] | undefined,
): NearAction[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return actions;
  }
  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  return actions.filter((action) =>
    filters.find((filter) => filterAction(action, filter)),
  );
}

/**
 *
 * @param api
 * @param startHeight
 * @param endHeight
 * @param overallSpecVer exists if all blocks in the range have same parant specVersion
 */

export async function getBlockByHeight(
  api: providers.JsonRpcProvider,
  height: number,
): Promise<BlockResult> {
  return api.block({ blockId: height }).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchBlocksRange(
  api: providers.JsonRpcProvider,
  startHeight: number,
  endHeight: number,
): Promise<BlockResult[]> {
  return Promise.all(
    range(startHeight, endHeight + 1).map(async (height) =>
      getBlockByHeight(api, height),
    ),
  );
}

export async function fetchBlocksArray(
  api: providers.JsonRpcProvider,
  blockArray: number[],
): Promise<BlockResult[]> {
  const results = await Promise.all(
    blockArray.map(async (height) => {
      try {
        return await getBlockByHeight(api, height);
      } catch (error) {
        if (
          error.message ===
          `[-32000] Server error: DB Not Found Error: BLOCK HEIGHT: ${height} \n Cause: Unknown`
        ) {
          logger.warn(
            `Block ${height} Unavailable in the chain, skipping thorugh it`,
          );
          return null;
        } else {
          throw error;
        }
      }
    }),
  );
  return results.filter((result) => result !== null);
}

export async function fetchBlocksBatches(
  api: providers.JsonRpcProvider,
  blockArray: number[],
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksArray(api, blockArray);

  const blockContentPromises = blocks.map(async (blockResult) => {
    const block = await wrapBlock(api, blockResult);
    return {
      block,
      transactions: block.transactions,
      actions: block.actions,
      receipts: block.receipts,
    };
  });

  return Promise.all(blockContentPromises);
}

export function calcInterval(api: providers.JsonRpcProvider): BN {
  return DEFAULT_TIME;
}
