// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import { HexString } from '@polkadot/util/types';
import {
  NearBlock,
  NearTransaction,
  NearAction,
  NearLog,
} from '@subql/types-near';

export interface BlockContent {
  block: NearBlock;
  transactions: NearTransaction[];
  actions: NearAction[];
  logs: NearLog[];
}

export type BestBlocks = Record<number, HexString>;

export type ApiAt = ApiDecoration<'promise'> & { rpc: ApiPromise['rpc'] };
