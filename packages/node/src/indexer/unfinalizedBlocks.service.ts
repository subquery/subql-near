// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
  mainThreadOnly,
} from '@subql/node-core';
import { BlockHeader } from 'near-api-js/lib/providers/provider';
import { ApiService } from './api.service';
import { BlockContent } from './types';

export function nearHeaderToHeader(header: BlockHeader): Header {
  return {
    blockHeight: header.height,
    blockHash: header.hash,
    parentHash: header.prev_hash,
  };
}

@Injectable()
export class UnfinalizedBlocksService extends BaseUnfinalizedBlocksService<BlockContent> {
  constructor(
    private readonly apiService: ApiService,
    nodeConfig: NodeConfig,
    storeCache: StoreCacheService,
  ) {
    super(nodeConfig, storeCache);
  }

  @mainThreadOnly()
  protected blockToHeader(block: BlockContent): Header {
    return nearHeaderToHeader(block.block.header);
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
  protected async getHeaderForHeight(height: number): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ blockId: height })).header,
    );
  }
}
