// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isActionHandlerProcessor,
  isTransactionHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  NearHandlerKind,
  NearRuntimeHandlerInputMap,
  isReceiptHandlerProcessor,
} from '@subql/common-near';
import {
  NodeConfig,
  getLogger,
  profiler,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
} from '@subql/node-core';
import {
  NearBlock,
  NearAction,
  NearTransaction,
  NearTransactionReceipt,
  NearDatasource,
  NearCustomDatasource,
  NearBlockFilter,
} from '@subql/types-near';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { NearProjectDs } from '../configure/SubqueryProject';
import * as NearUtil from '../utils/near';
import { ApiService, SafeJsonRpcProvider } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { SandboxService } from './sandbox.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  SafeJsonRpcProvider,
  JsonRpcProvider,
  BlockContent,
  ApiService,
  NearDatasource,
  NearCustomDatasource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  NearRuntimeHandlerInputMap
> {
  protected isRuntimeDs = isRuntimeDs;
  protected isCustomDs = isCustomDs;
  protected updateCustomProcessor = asSecondLayerHandlerProcessor_1_0_0;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<SafeJsonRpcProvider>,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
  ) {
    super(
      apiService,
      nodeConfig,
      sandboxService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      FilterTypeMap,
      ProcessorTypeMap,
    );
  }

  @profiler()
  async indexBlock(
    block: BlockContent,
    dataSources: NearDatasource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block),
    );
  }

  getBlockHeight(block: BlockContent): number {
    return block.block.header.height;
  }

  getBlockHash(block: BlockContent): string {
    return block.block.header.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(block: BlockContent): Promise<SafeJsonRpcProvider> {
    return this.apiService.safeApi(block.block.header.height);
  }

  protected async indexBlockData(
    { actions, block, receipts, transactions }: BlockContent,
    dataSources: NearProjectDs[],
    getVM: (d: NearProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const transaction of transactions) {
      await this.indexTransaction(transaction, dataSources, getVM);
      const actions = block.actions.filter(
        (action) =>
          //check if action is not produced by receipts
          action.receipt === undefined &&
          action.transaction.result.id === transaction.result.id,
      );
      for (const action of actions) {
        await this.indexAction(action, dataSources, getVM);
      }
      for (const receipt of block.receipts) {
        await this.indexReceipt(receipt, dataSources, getVM);
        const actions = block.actions.filter(
          (action) =>
            action.receipt && action.receipt.receipt_id === receipt.receipt_id,
        );
        for (const action of actions) {
          await this.indexAction(action, dataSources, getVM);
        }
      }
    }
  }

  private async indexBlockContent(
    block: NearBlock,
    dataSources: NearProjectDs[],
    getVM: (d: NearProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    transaction: NearTransaction,
    dataSources: NearProjectDs[],
    getVM: (d: NearProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Transaction, transaction, ds, getVM);
    }
  }

  private async indexAction(
    action: NearAction,
    dataSources: NearProjectDs[],
    getVM: (d: NearProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Action, action, ds, getVM);
    }
  }

  private async indexReceipt(
    receipt: NearTransactionReceipt,
    dataSources: NearProjectDs[],
    getVM: (d: NearProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Receipt, receipt, ds, getVM);
    }
  }

  protected async prepareFilteredData<T = any>(
    kind: NearHandlerKind,
    data: T,
  ): Promise<T> {
    return Promise.resolve(data);
  }

  protected baseCustomHandlerFilter(
    kind: NearHandlerKind,
    data: any,
    baseFilter: any,
  ): boolean {
    switch (kind) {
      case NearHandlerKind.Block:
        return !!NearUtil.filterBlock(data as NearBlock, baseFilter);
      case NearHandlerKind.Transaction:
        return NearUtil.filterTransaction(data as NearTransaction, baseFilter);
      case NearHandlerKind.Action:
        return NearUtil.filterAction(data as NearAction, baseFilter);
      case NearHandlerKind.Receipt:
        return NearUtil.filterReceipt(
          data as NearTransactionReceipt,
          baseFilter,
        );
      default:
        throw new Error('Unsuported handler kind');
    }
  }
}

type ProcessorTypeMap = {
  [NearHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [NearHandlerKind.Transaction]: typeof isTransactionHandlerProcessor;
  [NearHandlerKind.Action]: typeof isActionHandlerProcessor;
  [NearHandlerKind.Receipt]: typeof isReceiptHandlerProcessor;
};

const ProcessorTypeMap = {
  [NearHandlerKind.Block]: isBlockHandlerProcessor,
  [NearHandlerKind.Transaction]: isTransactionHandlerProcessor,
  [NearHandlerKind.Action]: isActionHandlerProcessor,
  [NearHandlerKind.Receipt]: isReceiptHandlerProcessor,
};

const FilterTypeMap = {
  [NearHandlerKind.Block]: (block: NearBlock, filter?: NearBlockFilter) =>
    !!NearUtil.filterBlock(block, filter),
  [NearHandlerKind.Transaction]: NearUtil.filterTransaction,
  [NearHandlerKind.Action]: NearUtil.filterAction,
  [NearHandlerKind.Receipt]: NearUtil.filterReceipt,
};
