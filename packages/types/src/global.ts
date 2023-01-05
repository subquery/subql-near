// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {ApiDecoration} from '@polkadot/api/types';
import {JsonRpcProvider} from 'near-api-js/lib/providers';
import Pino from 'pino';
import {Store, DynamicDatasourceCreator} from './interfaces';

declare global {
  const api: JsonRpcProvider;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
