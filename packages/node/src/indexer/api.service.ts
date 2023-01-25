// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  getLogger,
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
import { ConnectionInfo } from 'near-api-js/lib/utils/web';

import { SubqueryProject } from '../configure/SubqueryProject';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`${name}() is not supported`);
};

// https://github.com/polkadot-js/api/blob/12750bc83d8d7f01957896a80a7ba948ba3690b7/packages/rpc-provider/src/ws/index.ts#L43
const RETRY_DELAY = 2_500;
const GENESIS_BLOCK = 9_820_210;
const logger = getLogger('api');

@Injectable()
export class ApiService {
  private api: Near.providers.JsonRpcProvider;
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

    this.api = new Near.providers.JsonRpcProvider(connectionInfo);

    this.eventEmitter.emit(IndexerEvent.ApiConnected, { value: 1 });

    const chainId = (await this.api.status()).chain_id;

    this.networkMeta = {
      chain: chainId,
      specName: chainId,
      //mainnet genesis at block 9820210
      genesisHash: (await this.api.block({ blockId: GENESIS_BLOCK })).header
        .hash,
    };

    if (network.chainId && network.chainId !== this.networkMeta.chain) {
      const err = new Error(
        `Network chainId doesn't match expected genesisHash. Your SubQuery project is expecting to index data from "${
          network.chainId ?? network.genesisHash
        }", however the endpoint that you are connecting to is different("${
          this.networkMeta.chain
        }). Please check that the RPC endpoint is actually for your desired network or update the chainId.`,
      );
      logger.error(err, err.message);
      throw err;
    }

    return this;
  }

  getApi(): Near.providers.JsonRpcProvider {
    return this.api;
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
