// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  DbModule,
  ForceCleanService,
  PoiService,
  ReindexService,
  StoreService,
  storeModelFactory,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { ApiService } from '../indexer/api.service';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Module({
  providers: [
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, SchedulerRegistry, Sequelize],
    },
    StoreService,
    ReindexService,
    ForceCleanService,
    PoiService,
    UnfinalizedBlocksService,
    DynamicDsService,
    DsProcessorService,
    ConnectionPoolService,
    ConnectionPoolStateManager,
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
    SchedulerRegistry,
  ],
  controllers: [],
})
export class ReindexFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ReindexFeatureModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
})
export class ReindexModule {}
