// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  WorkerDynamicDsService,
  NodeConfig,
  SandboxService,
  WorkerUnfinalizedBlocksService,
  WorkerCoreModule,
} from '@subql/node-core';
import { ApiService } from '../api.service';
import { DsProcessorService } from '../ds-processor.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { ProjectService } from '../project.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { WorkerService } from '../worker/worker.service';

@Module({
  imports: [WorkerCoreModule],
  providers: [
    IndexerManager,
    ConnectionPoolService,
    {
      provide: ApiService,
      useFactory: ApiService.create.bind(ApiService),
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    SandboxService,
    DsProcessorService,
    {
      provide: DynamicDsService,
      useFactory: () => new WorkerDynamicDsService((global as any).host),
    },
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    WorkerService,
    {
      provide: UnfinalizedBlocksService,
      useFactory: () =>
        new WorkerUnfinalizedBlocksService((global as any).host),
    },
  ],
})
export class WorkerFetchModule {}
