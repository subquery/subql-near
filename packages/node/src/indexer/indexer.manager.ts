// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isActionHandlerProcessor,
  isTransactionHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  NearCustomDataSource,
  NearCustomHandler,
  NearHandlerKind,
  NearNetworkFilter,
  NearRuntimeHandlerInputMap,
  isReceiptHandlerProcessor,
} from '@subql/common-near';
import {
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
  IIndexerManager,
  ProcessBlockResponse,
} from '@subql/node-core';
import {
  NearBlock,
  NearAction,
  NearTransaction,
  NearTransactionReceipt,
} from '@subql/types-near';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import * as NearUtil from '../utils/near';
import { yargsOptions } from '../yargs';
import { ApiService, SafeJsonRpcProvider } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager
  implements IIndexerManager<BlockContent, SubqlProjectDs>
{
  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    @Inject('IProjectService') private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(
    blockContent: BlockContent,
    dataSources: SubqlProjectDs[],
  ): Promise<ProcessBlockResponse> {
    const { block } = blockContent;
    let dynamicDsCreated = false;
    let reindexBlockHeight: number | null = null;
    const blockHeight = block.header.height;

    const filteredDataSources = this.filterDataSources(
      block.header.height,
      dataSources,
    );

    this.assertDataSources(filteredDataSources, blockHeight);

    reindexBlockHeight = await this.processUnfinalizedBlocks(block);

    // Only index block if we're not going to reindex
    if (!reindexBlockHeight) {
      await this.indexBlockData(
        blockContent,
        filteredDataSources,
        //eslint-disable-next-line @typescript-eslint/require-await
        async (ds: SubqlProjectDs) => {
          // Injected runtimeVersion from fetch service might be outdated
          const safeApi = new SafeJsonRpcProvider(
            blockContent.block.header.height,
            this.apiService.api.connection,
          );
          const vm = this.sandboxService.getDsProcessor(ds, safeApi);

          // Inject function to create ds into vm
          vm.freeze(
            async (templateName: string, args?: Record<string, unknown>) => {
              const newDs = await this.dynamicDsService.createDynamicDatasource(
                {
                  templateName,
                  args,
                  startBlock: blockHeight,
                },
              );
              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              filteredDataSources.push(newDs);
              dynamicDsCreated = true;
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );
    }

    return {
      dynamicDsCreated,
      blockHash: block.header.hash,
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private async processUnfinalizedBlocks(
    block: NearBlock,
  ): Promise<number | null> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block);
    }
    return null;
  }

  private filterDataSources(
    nextProcessingHeight: number,
    dataSources: SubqlProjectDs[],
  ): SubqlProjectDs[] {
    let filteredDs: SubqlProjectDs[];

    filteredDs = dataSources.filter(
      (ds) => ds.startBlock <= nextProcessingHeight,
    );

    if (filteredDs.length === 0) {
      logger.error(`Did not find any matching datasouces`);
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.apiService.api);
      } else {
        return true;
      }
    });

    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private assertDataSources(ds: SubqlProjectDs[], blockHeight: number) {
    if (!ds.length) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${blockHeight}
         or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
  }

  private async indexBlockData(
    { block, transactions }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
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
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    transaction: NearTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Transaction, transaction, ds, getVM);
    }
  }

  private async indexAction(
    action: NearAction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Action, action, ds, getVM);
    }
  }

  private async indexReceipt(
    receipt: NearTransactionReceipt,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(NearHandlerKind.Receipt, receipt, ds, getVM);
    }
  }

  private async indexData<K extends NearHandlerKind>(
    kind: K,
    data: NearRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    getVM: (ds: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    let vm: IndexerSandbox;
    if (isRuntimeDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) =>
          h.kind === kind && FilterTypeMap[kind](data as any, h.filter as any),
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        this.nodeConfig.profiler
          ? await profilerWrap(
              vm.securedExec.bind(vm),
              'handlerPerformance',
              handler.handler,
            )(handler.handler, [data])
          : await vm.securedExec(handler.handler, [data]);
      }
    } else if (isCustomDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
        ProcessorTypeMap[kind],
        (data, baseFilter) => {
          switch (kind) {
            case NearHandlerKind.Block:
              return !!NearUtil.filterBlock(data as NearBlock, baseFilter);
            case NearHandlerKind.Action:
              return !!NearUtil.filterActions([data as NearAction], baseFilter)
                .length;
            case NearHandlerKind.Transaction:
              return !!NearUtil.filterTransactions(
                [data as NearTransaction],
                baseFilter,
              ).length;
            case NearHandlerKind.Receipt:
              return !!NearUtil.filterReceipts(
                [data as NearTransactionReceipt],
                baseFilter,
              ).length;
            default:
              throw new Error('Unsupported handler kind');
          }
        },
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends NearHandlerKind>(
    ds: NearCustomDataSource<string, NearNetworkFilter>,
    data: NearRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: NearRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): NearCustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers
      .filter((handler) => {
        const processor = plugin.handlerProcessors[handler.kind];
        if (baseHandlerCheck(processor)) {
          processor.baseFilter;
          return baseFilter(data, processor.baseFilter);
        }
        return false;
      })
      .filter((handler) => {
        const processor = asSecondLayerHandlerProcessor_1_0_0(
          plugin.handlerProcessors[handler.kind],
        );

        try {
          return processor.filterProcessor({
            filter: handler.filter,
            input: data,
            ds,
          });
        } catch (e) {
          logger.error(e, 'Failed to run ds processer filter.');
          throw e;
        }
      });
  }

  private async transformAndExecuteCustomDs<K extends NearHandlerKind>(
    ds: NearCustomDataSource<string, NearNetworkFilter>,
    vm: IndexerSandbox,
    handler: NearCustomHandler,
    data: NearRuntimeHandlerInputMap[K],
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processor = asSecondLayerHandlerProcessor_1_0_0(
      plugin.handlerProcessors[handler.kind],
    );

    const transformedData = await processor
      .transformer({
        input: data,
        ds,
        filter: handler.filter,
        api: this.apiService.api,
        assets,
      })
      .catch((e) => {
        logger.error(e, 'Failed to transform data with ds processor.');
        throw e;
      });

    // We can not run this in parallel. the transformed data items may be dependent on one another.
    // An example of this is with Acala EVM packing multiple EVM logs into a single Near event
    for (const _data of transformedData) {
      await vm.securedExec(handler.handler, [_data]);
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
  [NearHandlerKind.Block]: NearUtil.filterBlock,
  [NearHandlerKind.Transaction]: NearUtil.filterTransaction,
  [NearHandlerKind.Action]: NearUtil.filterAction,
  [NearHandlerKind.Receipt]: NearUtil.filterReceipt,
};
