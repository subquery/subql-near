// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject } from '@nestjs/common';
import { isCustomDs, isRuntimeDs } from '@subql/common-near';
import {
  DatasourceParams,
  Header,
  IBlock,
  IBlockchainService,
} from '@subql/node-core';
import {
  NearCustomDatasource,
  NearDatasource,
  NearHandlerKind,
} from '@subql/types-near';
import { SubqueryProject } from './configure/SubqueryProject';
import { ApiService, SafeJsonRpcProvider } from './indexer/api.service';
import { BlockContent, getBlockSize } from './indexer/types';
import { IIndexerWorker } from './indexer/worker/worker';
import { calcInterval, nearHeaderToHeader } from './utils/near';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

const BLOCK_TIME_VARIANCE = 5000; //ms
const INTERVAL_PERCENT = 0.9;

export class BlockchainService
  implements
    IBlockchainService<
      NearDatasource,
      NearCustomDatasource,
      SubqueryProject,
      SafeJsonRpcProvider,
      BlockContent, // Light block if ever implemented
      BlockContent,
      IIndexerWorker
    >
{
  blockHandlerKind = NearHandlerKind.Block;
  isCustomDs = isCustomDs;
  isRuntimeDs = isRuntimeDs;
  packageVersion = packageVersion;

  constructor(@Inject('APIService') private apiService: ApiService) {}

  async fetchBlocks(blockNums: number[]): Promise<IBlock<BlockContent>[]> {
    return this.apiService.fetchBlocks(blockNums);
  }

  async fetchBlockWorker(
    worker: IIndexerWorker,
    blockNum: number,
    context: { workers: IIndexerWorker[] },
  ): Promise<Header> {
    return worker.fetchBlock(blockNum, 0);
  }

  getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }

  async getFinalizedHeader(): Promise<Header> {
    const finalizedHeader = (
      await this.apiService.api.block({ finality: 'final' })
    ).header;
    return nearHeaderToHeader(finalizedHeader);
  }

  async getBestHeight(): Promise<number> {
    const bestHeader = (
      await this.apiService.api.block({ finality: 'optimistic' })
    ).header;
    return bestHeader.height;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.apiService.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  async getHeaderForHash(hash: string): Promise<Header> {
    const block = await this.apiService.api.block(hash);
    return nearHeaderToHeader(block.header);
  }

  async getHeaderForHeight(height: number): Promise<Header> {
    const block = await this.apiService.api.block(height);
    return nearHeaderToHeader(block.header);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateDynamicDs(
    params: DatasourceParams,
    dsObj: NearDatasource | NearCustomDatasource,
  ): Promise<void> {
    if (isCustomDs(dsObj)) {
      dsObj.processor.options = {
        ...dsObj.processor.options,
        ...params.args,
      };
      // await this.dsProcessorService.validateCustomDs([dsObj]);
    } else if (isRuntimeDs(dsObj)) {
      // XXX add any modifications to the ds here
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSafeApi(block: BlockContent): Promise<SafeJsonRpcProvider> {
    return this.apiService.safeApi(block.block.header.height);
  }

  onProjectChange(project: SubqueryProject): Promise<void> | void {
    // this.apiService.updateBlockFetching();
  }

  async getBlockTimestamp(height: number): Promise<Date> {
    const { timestamp } = await this.getHeaderForHeight(height);
    return timestamp;
  }
}
