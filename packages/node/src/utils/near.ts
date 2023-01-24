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
} from '@subql/types-near';
import { get, range } from 'lodash';
import { providers } from 'near-api-js';
import { BlockResult, Transaction } from 'near-api-js/lib/providers/provider';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { BlockContent } from '../indexer/types';

const logger = getLogger('fetch');
const DEFAULT_TIME = new BN(6_000);

export const mappingFilterAction = {
  [ActionType.FunctionCall]: {
    methodName: 'action.methodName',
    args: 'action.args',
  },
  [ActionType.Stake]: {
    publicKey: 'action.publicKey',
  },
  [ActionType.AddKey]: {
    publicKey: 'action.publicKey',
    accessKey: 'action.accessKey',
  },
  [ActionType.DeleteKey]: {
    publicKey: 'action.publicKey',
  },
  [ActionType.DeleteAccount]: {
    beneficiaryId: 'action.beneficiaryId',
  },
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
        const wrappedTx = await wrapTransaction(api, blockResult, transaction);

        const nearActions: NearAction[] = transaction.actions.map(
          (action, id) => wrapAction(action, id, wrappedTx),
        );

        //wrappedTx.actions = nearActions;

        //break circular structure
        //wrappedTx.actions.forEach((action) => {
        //  action.transaction = null;
        //})

        nearBlock.transactions.push(wrappedTx);
        nearBlock.actions = nearBlock.actions.concat(nearActions);
      },
    );
    await Promise.all(transactionPromises);
    nearBlock.receipts = nearBlock.receipts.concat(chunkResult.receipts);
  });

  await Promise.all(chunkPromises);

  return nearBlock;
}

export async function wrapTransaction(
  api: providers.JsonRpcProvider,
  block: BlockResult,
  txn: Transaction,
): Promise<NearTransaction> {
  const exectuionOutcome = await api.txStatusReceipts(txn.hash, txn.signer_id);
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

function parseNearAction(type: ActionType, action: any): Action {
  switch (type) {
    case ActionType.CreateAccount:
      return action as CreateAccount;
    case ActionType.DeployContract:
      return action as DeployContract;
    case ActionType.FunctionCall:
      return action as FunctionCall;
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

export function filterAction(
  action: NearAction,
  filter?: NearActionFilter,
): boolean {
  if (!filter) return true;
  if (!filterTransaction(action.transaction, filter)) {
    return false;
  }

  const { receiver, sender, type, ...filterByKey } = filter;

  if (type && action.type !== type) return false;

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
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
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
    };
  });

  return Promise.all(blockContentPromises);
}

export function calcInterval(api: providers.JsonRpcProvider): BN {
  return DEFAULT_TIME;
}
