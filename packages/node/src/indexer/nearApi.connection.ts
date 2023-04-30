// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiConnection } from '@subql/node-core';
import * as Near from 'near-api-js';
import { ConnectionInfo } from 'near-api-js/lib/utils/web';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

export class NearApiConnection implements ApiConnection {
  constructor(private _api: Near.providers.JsonRpcProvider) {}

  //eslint-disable-next-line @typescript-eslint/require-await
  static async create(endpoint: string): Promise<NearApiConnection> {
    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    const connectionInfo: ConnectionInfo = {
      url: endpoint,
      headers: headers,
    };

    const api = new Near.providers.JsonRpcProvider(connectionInfo);
    return new NearApiConnection(api);
  }

  get api(): Near.providers.JsonRpcProvider {
    return this._api;
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async apiConnect(): Promise<void> {
    throw new Error(`Not Implemented`);
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  async apiDisconnect(): Promise<void> {
    throw new Error(`Not Implemented`);
  }
}
