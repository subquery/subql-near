// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { HexString } from '@polkadot/util/types';
import {
  NearBlock,
  NearTransaction,
  NearAction,
  NearTransactionReceipt,
} from '@subql/types-near';

export interface BlockContent {
  block: NearBlock;
  transactions: NearTransaction[];
  actions: NearAction[];
  receipts: NearTransactionReceipt[];
}

export type BestBlocks = Record<number, HexString>;
