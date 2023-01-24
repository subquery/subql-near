// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { hexToU8a, u8aEq } from '@polkadot/util';
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
} from '@subql/common-near';
import {
  PoiBlock,
  StoreService,
  PoiService,
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
} from '@subql/node-core';
import { NearBlock, NearAction, NearTransaction } from '@subql/types-near';
import { Sequelize, Transaction } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
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

const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager {
  private filteredDataSources: SubqlProjectDs[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private poiService: PoiService,
    private sequelize: Sequelize,
    @Inject('ISubqueryProject') private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(blockContent: BlockContent): Promise<{
    dynamicDsCreated: boolean;
    operationHash: Uint8Array;
    reindexBlockHeight: number;
  }> {
    const { block } = blockContent;
    let dynamicDsCreated = false;
    let reindexBlockHeight = null;
    const blockHeight = block.header.height;
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let operationHash = NULL_MERKEL_ROOT;
    let poiBlockHash: Uint8Array;
    try {
      this.filteredDataSources = this.filterDataSources(block.header.height);

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      reindexBlockHeight = await this.processUnfinalizedBlocks(block, tx);

      await this.indexBlockData(
        blockContent,
        datasources,
        //eslint-disable-next-line @typescript-eslint/require-await
        async (ds: SubqlProjectDs) => {
          // Injected runtimeVersion from fetch service might be outdated
          const safeApi = new SafeJsonRpcProvider(
            blockContent.block.header.height,
            this.apiService.getApi().connection,
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
                tx,
              );
              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              datasources.push(newDs);
              dynamicDsCreated = true;
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );

      await this.storeService.setMetadataBatch(
        [
          { key: 'lastProcessedHeight', value: blockHeight },
          { key: 'lastProcessedTimestamp', value: Date.now() },
        ],
        { transaction: tx },
      );
      // Db Metadata increase BlockCount, in memory ref to block-dispatcher _processedBlockCount
      await this.storeService.incrementJsonbCount('processedBlockCount', tx);

      // Need calculate operationHash to ensure correct offset insert all time
      operationHash = this.storeService.getOperationMerkleRoot();
      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            block.header.hash,
            operationHash,
            await this.poiService.getLatestPoiBlockHash(),
            this.project.id,
          );
          poiBlockHash = poiBlock.hash;
          await this.storeService.setPoi(poiBlock, { transaction: tx });
          this.poiService.setLatestPoiBlockHash(poiBlockHash);
          await this.storeService.setMetadataBatch(
            [{ key: 'lastPoiHeight', value: blockHeight }],
            { transaction: tx },
          );
        }
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    await tx.commit();

    return {
      dynamicDsCreated,
      operationHash,
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private async processUnfinalizedBlocks(
    block: NearBlock,
    tx: Transaction,
  ): Promise<number | null> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block, tx);
    }
    return null;
  }

  private filterDataSources(nextProcessingHeight: number): SubqlProjectDs[] {
    let filteredDs: SubqlProjectDs[];

    filteredDs = this.projectService.dataSources.filter(
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
          .dsFilterProcessor(ds, this.apiService.getApi());
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

  private async indexBlockData(
    { actions, block, transactions }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const transaction of transactions) {
      await this.indexTransaction(transaction, dataSources, getVM);
      for (const action of transaction.actions) {
        await this.indexAction(action, dataSources, getVM);
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
        api: this.apiService.getApi(),
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
};

const ProcessorTypeMap = {
  [NearHandlerKind.Block]: isBlockHandlerProcessor,
  [NearHandlerKind.Transaction]: isTransactionHandlerProcessor,
  [NearHandlerKind.Action]: isActionHandlerProcessor,
};

const FilterTypeMap = {
  [NearHandlerKind.Block]: NearUtil.filterBlock,
  [NearHandlerKind.Transaction]: NearUtil.filterTransaction,
  [NearHandlerKind.Action]: NearUtil.filterAction,
};
