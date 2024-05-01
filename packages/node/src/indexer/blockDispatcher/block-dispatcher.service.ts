// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreCacheService,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  IProjectUpgradeService,
  PoiSyncService,
  IBlock,
} from '@subql/node-core';
import { NearDatasource } from '@subql/types-near';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, NearDatasource>
  implements OnApplicationShutdown
{
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<NearDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeCacheService,
      poiSyncService,
      project,
      async (blockNums: number[]): Promise<IBlock<BlockContent>[]> => {
        //filter out null values, they represent blocks that were not available in chain
        return (await this.apiService.fetchBlocks(blockNums)).filter(
          (block) => block !== null,
        );
      },
    );
  }

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
  }

  protected getBlockHeight(block: BlockContent): number {
    return block.block.header.height;
  }

  protected async indexBlock(
    block: IBlock<BlockContent>,
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(block.getHeader().blockHeight),
    );
  }
}
