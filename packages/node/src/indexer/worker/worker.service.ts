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
  IBlock,
  Header,
} from '@subql/node-core';

import { NearDatasource } from '@subql/types-near';
import { nearHeaderToHeader } from '../../utils/near';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse = Header;

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
  ): Promise<IBlock<BlockContent>> {
    const [block] = await this.apiService.fetchBlocks([heights]);
    return block;
  }

  protected toBlockResponse(block: BlockContent): FetchBlockResponse {
    return nearHeaderToHeader(block.block.header);
  }

  protected async processFetchedBlock(
    block: IBlock<BlockContent>,
    dataSources: NearDatasource[],
  ): Promise<ProcessBlockResponse> {
    if (block === null) {
      throw new BlockUnavailableError();
    }
    return this.indexerManager.indexBlock(block, dataSources);
  }
}
