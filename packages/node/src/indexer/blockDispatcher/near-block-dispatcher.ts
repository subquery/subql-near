// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlockDispatcher } from '@subql/node-core';
import { NearBlock } from '@subql/types-near';

export interface INearBlockDispatcher extends IBlockDispatcher<NearBlock> {
  init(
    onDynamicDsCreated: (height: number) => void | Promise<void>,
  ): Promise<void>;
}
