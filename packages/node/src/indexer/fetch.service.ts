// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import {
  isCustomDs,
  NearDataSource,
  NearHandlerKind,
} from '@subql/common-near';
import { NodeConfig, BaseFetchService, getModulos } from '@subql/node-core';
import { NearBlock, NearDatasource } from '@subql/types-near';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { SubqueryProject } from '../configure/SubqueryProject';
import { calcInterval, nearHeaderToHeader } from '../utils/near';
import { ApiService } from './api.service';
import { INearBlockDispatcher } from './blockDispatcher';
import { NearDictionaryService } from './dictionary';
import { ProjectService } from './project.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000; //ms
const INTERVAL_PERCENT = 0.9;

@Injectable()
export class FetchService extends BaseFetchService<
  NearDatasource,
  INearBlockDispatcher,
  NearBlock
> {
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IProjectService') projectService: ProjectService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: INearBlockDispatcher,
    dictionaryService: NearDictionaryService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
  ) {
    super(
      nodeConfig,
      projectService,
      project.network,
      blockDispatcher,
      dictionaryService,
      eventEmitter,
      schedulerRegistry,
    );
  }

  get api(): JsonRpcProvider {
    return this.apiService.unsafeApi;
  }

  protected async getFinalizedHeight(): Promise<number> {
    const finalizedHeader = (await this.api.block({ finality: 'final' }))
      .header;
    this.unfinalizedBlocksService.registerFinalizedBlock(
      nearHeaderToHeader(finalizedHeader),
    );
    return finalizedHeader.height;
  }

  protected async getBestHeight(): Promise<number> {
    const bestHeader = (await this.api.block({ finality: 'optimistic' }))
      .header;
    return bestHeader.height;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const chainInterval = calcInterval(this.api)
      .muln(INTERVAL_PERCENT)
      .toNumber();

    return Math.min(BLOCK_TIME_VARIANCE, chainInterval);
  }

  protected async getChainId(): Promise<string> {
    return (await this.api.status()).chain_id;
  }

  protected getModulos(dataSources: NearDataSource[]): number[] {
    return getModulos(dataSources, isCustomDs, NearHandlerKind.Block);
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook({ startHeight, valid }): Promise<void> {
    return Promise.resolve();
  }
}
