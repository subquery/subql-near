// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  IProjectService,
  ProcessBlockResponse,
  BaseWorkerService,
  IProjectUpgradeService,
  BlockUnavailableError,
} from '@subql/node-core';

import { NearDatasource } from '@subql/types-near';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse = { parentHash: string } | undefined;

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent,
  FetchBlockResponse,
  NearDatasource,
  {}
> {
  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
    @Inject('IProjectService')
    projectService: IProjectService<NearDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }

  protected async fetchChainBlock(
    heights: number,
    extra: {},
  ): Promise<BlockContent> {
    const [block] = await this.apiService.fetchBlocks([heights]);
    return block;
  }
  protected toBlockResponse(block: BlockContent): {
    parentHash: string | undefined;
  } {
    return {
      parentHash: block?.block.header.prev_hash,
    };
  }
  protected async processFetchedBlock(
    block: BlockContent,
    dataSources: NearDatasource[],
  ): Promise<ProcessBlockResponse> {
    if (block === null) {
      throw new BlockUnavailableError();
    }
    return this.indexerManager.indexBlock(block, dataSources);
  }
}
