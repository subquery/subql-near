// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  getLogger,
} from '@subql/node-core';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { ConnectionInfo } from 'near-api-js/lib/utils/web';
import { SubqueryProject } from '../configure/SubqueryProject';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const RETRY_DELAY = 2_500;

const logger = getLogger('api');

@Injectable()
export class ApiService {
  private api: JsonRpcProvider;
  private _chainId: string;
  private _genesisHash: string;
  private currentBlockHash: string;
  private currentBlockNumber: number;
  networkMeta: NetworkMetadataPayload;

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    private eventEmitter: EventEmitter2,
  ) {}

  async init(): Promise<ApiService> {
    let network;
    try {
      network = this.project.network;
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }

    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    const connectionInfo: ConnectionInfo = {
      url: network.endpoint,
      headers: headers,
    };

    this.api = new JsonRpcProvider(connectionInfo);

    this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });

    logger.info((await this.api.block({ blockId: 9820210 })).header.hash);

    this._chainId = (await this.api.status()).chain_id;
    this._genesisHash = (
      await this.api.block({ blockId: 9820210 })
    ).header.hash;

    this.networkMeta = {
      chain: this._chainId,
      specName: this._chainId,
      //mainnet genesis at block 9820210
      genesisHash: this._genesisHash,
    };

    if (network.chainId && network.chainId !== this.networkMeta.chain) {
      const err = new Error(
        `Network chainId doesn't match expected genesisHash. expected="${
          network.chainId ?? network.genesisHash
        }" actual="${this.networkMeta.chain}`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): JsonRpcProvider {
    return this.api;
  }

  genesisHash(): string {
    return this._genesisHash;
  }
}
