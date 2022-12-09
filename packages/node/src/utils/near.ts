// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BN, BN_THOUSAND, BN_TWO, bnMin } from '@polkadot/util';
import { getLogger } from '@subql/node-core';
import {
  NearBlockFilter,
  NearTransactionFilter,
  NearActionFilter,
  NearBlock,
  NearTransaction,
  NearAction,
} from '@subql/types-near';
import { last, merge, range } from 'lodash';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { BlockResult, Transaction } from 'near-api-js/lib/providers/provider';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { BlockContent } from '../indexer/types';
const logger = getLogger('fetch');
const INTERVAL_THRESHOLD = BN_THOUSAND.div(BN_TWO);
const DEFAULT_TIME = new BN(6_000);
const A_DAY = new BN(24 * 60 * 60 * 1000);

export async function wrapBlock(
  api: JsonRpcProvider,
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

  for (const chunk of blockResult.chunks) {
    const chunkResult = await api.chunk(chunk.chunk_hash);
    for (const transaction of chunkResult.transactions) {
      nearBlock.transactions.push(
        await wrapTransaction(api, blockResult, transaction),
      );

      const nearActions: NearAction[] = transaction.actions.map((action) =>
        wrapAction(action),
      );

      nearBlock.actions = nearBlock.actions.concat(nearActions);
    }
    nearBlock.receipts = nearBlock.receipts.concat(chunkResult.receipts);
  }
  return nearBlock;
}

export async function wrapTransaction(
  api: JsonRpcProvider,
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

export function wrapAction(action: Record<string, any>): NearAction {
  const type = Object.keys(action)[0];
  const actionValue = action[type];
  return { type, action: actionValue };
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
  return filter.type ? action.type === filter.type : true;
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
  api: JsonRpcProvider,
  height: number,
): Promise<BlockResult> {
  return api.block(height).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchBlocksRange(
  api: JsonRpcProvider,
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
  api: JsonRpcProvider,
  blockArray: number[],
): Promise<BlockResult[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function fetchBlocksBatches(
  api: JsonRpcProvider,
  blockArray: number[],
  overallSpecVer?: number,
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksArray(api, blockArray);

  const blockContentPromises = blocks.map(async (blockResult) => {
    const block = await wrapBlock(api, blockResult);
    return {
      block,
      transactions: block.transactions,
      actions: block.transactions
        .map((tx) => tx.actions)
        .reduce((acc, val) => acc.concat(val), []),
      logs: null,
    };
  });

  return Promise.all(blockContentPromises);
}

export function calcInterval(api: JsonRpcProvider): BN {
  return;
}
