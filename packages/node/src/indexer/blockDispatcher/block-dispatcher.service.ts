// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NearDataSource } from '@subql/common-near';
import {
  NodeConfig,
  SmartBatchService,
  StoreCacheService,
  StoreService,
  IProjectService,
  PoiService,
  BlockDispatcher,
  ProcessBlockResponse,
} from '@subql/node-core';
import {
  SubqlProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, NearDataSource>
  implements OnApplicationShutdown
{
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<NearDataSource>,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      project,
      dynamicDsService,
      async (blockNums: number[]): Promise<BlockContent[]> => {
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
    block: BlockContent,
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getAllDataSources(this.getBlockHeight(block)),
    );
  }
}
