// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NearDataSource } from '@subql/common-near';
import {
  MmrService,
  NodeConfig,
  StoreService,
  ForceCleanService,
  BaseReindexService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { BlockContent } from '../indexer/types';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Injectable()
export class ReindexService extends BaseReindexService<
  SubqueryProject,
  NearDataSource,
  BlockContent
> {
  constructor(
    sequelize: Sequelize,
    nodeConfig: NodeConfig,
    storeService: StoreService,
    mmrService: MmrService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    forceCleanService: ForceCleanService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
    dynamicDsService: DynamicDsService,
  ) {
    super(
      sequelize,
      nodeConfig,
      storeService,
      mmrService,
      project,
      forceCleanService,
      unfinalizedBlocksService,
      dynamicDsService,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getStartBlockDatasources(): Promise<NearDataSource[]> {
    return this.project.dataSources;
  }
}
