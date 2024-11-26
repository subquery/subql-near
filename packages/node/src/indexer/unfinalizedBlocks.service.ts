// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  IStoreModelProvider,
  mainThreadOnly,
} from '@subql/node-core';
import { nearHeaderToHeader } from '../utils/near';
import { ApiService } from './api.service';
import { BlockContent } from './types';

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
  ) {
    super(nodeConfig, storeModelProvider);
  }

  @mainThreadOnly()
  protected async getFinalizedHead(): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ finality: 'final' })).header,
    );
  }

  @mainThreadOnly()
  protected async getHeaderForHash(hash: string): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ blockId: hash })).header,
    );
  }

  @mainThreadOnly()
  async getHeaderForHeight(height: number): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ blockId: height })).header,
    );
  }
}
