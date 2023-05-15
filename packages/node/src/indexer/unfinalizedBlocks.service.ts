// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import {
  BaseUnfinalizedBlocksService,
  Header,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';
import { NearBlock } from '@subql/types-near';
import { last } from 'lodash';
import { providers } from 'near-api-js';
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

  protected blockToHeader(block: BlockContent): Header {
    return nearHeaderToHeader(block.block.header);
  }

  protected async getFinalizedHead(): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ finality: 'final' })).header,
    );
  }

  protected async getHeaderForHash(hash: string): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ blockId: hash })).header,
    );
  }

  protected async getHeaderForHeight(height: number): Promise<Header> {
    return nearHeaderToHeader(
      (await this.apiService.api.block({ blockId: height })).header,
    );
  }
}
