// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ConnectionInfo } from '@near-js/providers/lib/fetch_json';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  getLogger,
  NodeConfig,
  profilerWrap,
  ConnectionPoolService,
  ApiService as BaseApiService,
  IBlock,
  exitWithError,
} from '@subql/node-core';
import * as Near from 'near-api-js';
import {
  AccessKeyWithPublicKey,
  BlockChangeResult,
  BlockReference,
  BlockResult,
  ChangeResult,
  EpochValidatorInfo,
  GasPrice,
} from 'near-api-js/lib/providers/provider';

import { SubqueryProject } from '../configure/SubqueryProject';
import * as NearUtil from '../utils/near';
import { NearApiConnection } from './nearApi.connection';
import { BlockContent } from './types';

const logger = getLogger('api');

@Injectable()
export class ApiService extends BaseApiService<
  Near.providers.JsonRpcProvider,
  SafeJsonRpcProvider,
  IBlock<BlockContent>[]
> {
  private fetchBlocksBatches = NearUtil.fetchBlocksBatches;

  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<NearApiConnection>,
    eventEmitter: EventEmitter2,
    private nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService, eventEmitter);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connectionPoolService.onApplicationShutdown();
  }

  async init(): Promise<ApiService> {
    let network;
    try {
      network = this.project.network;
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    if (this.nodeConfig?.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        NearUtil.fetchBlocksBatches,
        'NearUtil',
        'fetchBlocksBatches',
      );
    }

    await this.createConnections(network, (endpoint) =>
      NearApiConnection.create(endpoint, this.fetchBlocksBatches),
    );

    return this;
  }

  get api(): Near.providers.JsonRpcProvider {
    return this.unsafeApi;
  }

  safeApi(height: number): SafeJsonRpcProvider {
    return new SafeJsonRpcProvider(height, this.api.connection);
  }

  genesisHash(): string {
    return this.networkMeta.genesisHash;
  }
}

export class SafeJsonRpcProvider extends Near.providers.JsonRpcProvider {
  constructor(private height: number, private connectionInfo: ConnectionInfo) {
    super(connectionInfo);
  }

  async block(): Promise<BlockResult> {
    return super.block({ blockId: this.height });
  }

  async blockChanges(): Promise<BlockChangeResult> {
    return super.blockChanges({ blockId: this.height });
  }

  async validators(): Promise<EpochValidatorInfo> {
    return super.validators(this.height);
  }

  async accessKeyChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.accessKeyChanges(accountIdArray, { blockId: this.height });
  }

  async singleAccessKeyChanges(
    accessKeyArray: AccessKeyWithPublicKey[],
  ): Promise<ChangeResult> {
    return super.singleAccessKeyChanges(accessKeyArray, {
      blockId: this.height,
    });
  }

  async accountChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.accountChanges(accountIdArray, { blockId: this.height });
  }

  async contractStateChanges(
    accountIdArray: string[],
    blockQuery: BlockReference = { blockId: this.height },
    keyPrefix?: string,
  ): Promise<ChangeResult> {
    return super.contractStateChanges(
      accountIdArray,
      { blockId: this.height },
      keyPrefix,
    );
  }

  async contractCodeChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.contractCodeChanges(accountIdArray, { blockId: this.height });
  }

  async gasPrice(): Promise<GasPrice> {
    return super.gasPrice(this.height);
  }
}
