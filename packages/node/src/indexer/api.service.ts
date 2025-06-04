// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { JsonRpcProvider } from '@near-js/providers';
import {
  AccessKeyWithPublicKey,
  BlockChangeResult,
  BlockReference,
  BlockResult,
  ChangeResult,
  EpochValidatorInfo,
  GasPrice,
} from '@near-js/types';
import { Injectable } from '@nestjs/common';
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

import { SubqueryProject } from '../configure/SubqueryProject';
import * as NearUtil from '../utils/near';
import { NearApiConnection } from './nearApi.connection';
import { BlockContent } from './types';

const logger = getLogger('api');

export type ConnectionInfo = ConstructorParameters<typeof JsonRpcProvider>[0];
// Force this here as Near can skip blocks and node-core doesn't support null for blocks
// TODO improve types and follow to where the check to filter out null blocks is
type ForceFetchBatchFunc = (
  api: JsonRpcProvider,
  batch: number[],
) => Promise<IBlock<BlockContent>[]>;

@Injectable()
export class ApiService extends BaseApiService<
  JsonRpcProvider,
  SafeJsonRpcProvider,
  IBlock<BlockContent>[]
> {
  private fetchBlocksBatches =
    NearUtil.fetchBlocksBatches as ForceFetchBatchFunc;

  private constructor(
    connectionPoolService: ConnectionPoolService<NearApiConnection>,
    eventEmitter: EventEmitter2,
  ) {
    super(connectionPoolService, eventEmitter);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connectionPoolService.onApplicationShutdown();
  }

  static async create(
    project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<NearApiConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ): Promise<ApiService> {
    let network;
    try {
      network = project.network;
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    const apiService = new ApiService(connectionPoolService, eventEmitter);

    if (nodeConfig?.profiler) {
      apiService.fetchBlocksBatches = profilerWrap(
        NearUtil.fetchBlocksBatches,
        'NearUtil',
        'fetchBlocksBatches',
      ) as ForceFetchBatchFunc;
    }

    await apiService.createConnections(network, (endpoint, config) =>
      NearApiConnection.create(endpoint, apiService.fetchBlocksBatches, config),
    );

    return apiService;
  }

  get api(): JsonRpcProvider {
    return this.unsafeApi;
  }

  safeApi(height: number): SafeJsonRpcProvider {
    return new SafeJsonRpcProvider(height, this.api.connection);
  }

  genesisHash(): string {
    return this.networkMeta.genesisHash;
  }
}

export class SafeJsonRpcProvider extends JsonRpcProvider {
  constructor(private height: number, connectionInfo: ConnectionInfo) {
    super(connectionInfo);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async block(): Promise<BlockResult> {
    return super.block({ blockId: this.height });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async blockChanges(): Promise<BlockChangeResult> {
    return super.blockChanges({ blockId: this.height });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validators(): Promise<EpochValidatorInfo> {
    return super.validators(this.height);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async accessKeyChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.accessKeyChanges(accountIdArray, { blockId: this.height });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async singleAccessKeyChanges(
    accessKeyArray: AccessKeyWithPublicKey[],
  ): Promise<ChangeResult> {
    return super.singleAccessKeyChanges(accessKeyArray, {
      blockId: this.height,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async accountChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.accountChanges(accountIdArray, { blockId: this.height });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async contractCodeChanges(accountIdArray: string[]): Promise<ChangeResult> {
    return super.contractCodeChanges(accountIdArray, { blockId: this.height });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async gasPrice(): Promise<GasPrice> {
    return super.gasPrice(this.height);
  }
}
