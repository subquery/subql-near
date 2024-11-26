// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  IStoreModelProvider,
  IProjectService,
  WorkerBlockDispatcher,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  createIndexerWorker,
  MonitorServiceInterface,
} from '@subql/node-core';
import { NearBlock, NearDatasource } from '@subql/types-near';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { DynamicDsService } from '../dynamic-ds.service';
import { NearApiConnection } from '../nearApi.connection';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { IIndexerWorker } from '../worker/worker';
import { FetchBlockResponse } from '../worker/worker.service';

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

@Injectable()
export class WorkerBlockDispatcherService
  extends WorkerBlockDispatcher<NearDatasource, IndexerWorker, NearBlock>
  implements OnApplicationShutdown
{
  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<NearDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    cacheService: InMemoryCacheService,
    storeService: StoreService,
    storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksSevice: UnfinalizedBlocksService,
    connectionPoolState: ConnectionPoolStateManager<NearApiConnection>,
    monitorService?: MonitorServiceInterface,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeModelProvider,
      poiSyncService,
      project,
      () =>
        createIndexerWorker<
          IIndexerWorker,
          NearApiConnection,
          BlockContent,
          NearDatasource
        >(
          path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
          [],
          storeService.getStore(),
          cacheService.getCache(),
          dynamicDsService,
          unfinalizedBlocksSevice,
          connectionPoolState,
          project.root,
          projectService.startHeight,
          monitorService,
        ),
      monitorService,
    );
  }

  async fetchBlock(
    worker: IndexerWorker,
    height: number,
  ): Promise<FetchBlockResponse> {
    return worker.fetchBlock(height, 0 /* Not used*/);
  }
}
