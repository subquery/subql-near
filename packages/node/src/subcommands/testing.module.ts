// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ConnectionPoolService,
  DbModule,
  NodeConfig,
  TestRunner,
  DsProcessorService,
  DynamicDsService,
  UnfinalizedBlocksService,
  ProjectService,
  TestingCoreModule,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { ConfigureModule } from '../configure/configure.module';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';

@Module({
  imports: [TestingCoreModule],
  providers: [
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
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
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    TestRunner,
    {
      provide: 'IIndexerManager',
      useClass: IndexerManager,
    },
    DsProcessorService,
    DynamicDsService,
  ],
  controllers: [],
  exports: [TestRunner],
})
export class TestingFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TestingFeatureModule,
  ],
  controllers: [],
})
export class TestingModule {}
