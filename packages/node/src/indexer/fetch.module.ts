// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  NodeConfig,
  ConnectionPoolStateManager,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  ConnectionPoolService,
  blockDispatcherFactory,
  DynamicDsService,
  DsProcessorService,
  FetchService,
  DictionaryService,
  UnfinalizedBlocksService,
  ProjectService,
  MultiChainRewindService,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { ApiService } from './api.service';
import { NearDictionaryService } from './dictionary';
import { IndexerManager } from './indexer.manager';

@Module({
  imports: [CoreModule],
  providers: [
    {
      provide: 'APIService',
      useFactory: ApiService.create.bind(ApiService),
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    DsProcessorService,
    DynamicDsService,
    IndexerManager,
    MultiChainRewindService,
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    {
      provide: 'IBlockDispatcher',
      useFactory: blockDispatcherFactory(
        path.resolve(__dirname, '../../dist/indexer/worker/worker.js'),
        [],
      ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        InMemoryCacheService,
        StoreService,
        'IStoreModelProvider',
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        'IUnfinalizedBlocksService',
        ConnectionPoolStateManager,
        'IBlockchainService',
        IndexerManager,
        MultiChainRewindService,
        MonitorService,
      ],
    },
    FetchService,
    {
      provide: DictionaryService,
      useClass: NearDictionaryService,
    },
  ],
})
export class FetchModule {}
