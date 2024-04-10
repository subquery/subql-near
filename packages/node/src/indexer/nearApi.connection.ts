// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ConnectionInfo } from '@near-js/providers/lib/fetch_json';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  IBlock,
  NetworkMetadataPayload,
} from '@subql/node-core';
import * as Near from 'near-api-js';
import { SafeJsonRpcProvider } from './api.service';
import { BlockContent } from './types';

const GENESIS_BLOCK = 9_820_210;

type FetchFunc = (
  api: Near.providers.JsonRpcProvider,
  batch: number[],
) => Promise<IBlock<BlockContent>[]>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

export class NearApiConnection
  implements
    IApiConnectionSpecific<
      Near.providers.JsonRpcProvider,
      SafeJsonRpcProvider,
      IBlock<BlockContent>[]
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: Near.providers.JsonRpcProvider,
    private fetchBlocksBatches: FetchFunc,
    chainId: string,
    genesisHash: string,
  ) {
    this.networkMeta = {
      chain: chainId,
      specName: chainId,
      //mainnet genesis at block 9820210
      genesisHash: genesisHash,
    };
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  static async create(
    endpoint: string,
    fetchBlockBatches: FetchFunc,
  ): Promise<NearApiConnection> {
    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    const connectionInfo: ConnectionInfo = {
      url: endpoint,
      headers: headers,
    };

    const api = new Near.providers.JsonRpcProvider(connectionInfo);
    return new NearApiConnection(
      api,
      fetchBlockBatches,
      (await api.status()).chain_id,
      (await api.block({ blockId: GENESIS_BLOCK })).header.hash,
    );
  }

  safeApi(height: number): SafeJsonRpcProvider {
    throw new Error(`Not Implemented`);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async apiConnect(): Promise<void> {
    throw new Error(`Not Implemented`);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async apiDisconnect(): Promise<void> {
    //throw new Error(`Not Implemented`);
    return;
  }

  async fetchBlocks(heights: number[]): Promise<IBlock<BlockContent>[]> {
    const blocks = await this.fetchBlocksBatches(this.unsafeApi, heights);
    return blocks;
  }

  handleError = NearApiConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.includes(`timed out`)) {
      formatted_error = NearApiConnection.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = NearApiConnection.handleDisconnectionError(e);
    } else if (e.message.startsWith(`Rate Limited at endpoint`)) {
      formatted_error = NearApiConnection.handleRateLimitError(e);
    } else {
      formatted_error = new ApiConnectionError(
        e.name,
        e.message,
        ApiErrorType.Default,
      );
    }
    return formatted_error;
  }

  static handleRateLimitError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'RateLimit',
      e.message,
      ApiErrorType.RateLimit,
    );
  }

  static handleTimeoutError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'TimeoutError',
      e.message,
      ApiErrorType.Timeout,
    );
  }

  static handleDisconnectionError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'ConnectionError',
      e.message,
      ApiErrorType.Connection,
    );
  }
}
