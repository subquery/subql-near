// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {JsonRpcProvider} from '@near-js/providers';
import '@subql/types-core/dist/global';

declare global {
  const api: JsonRpcProvider;
}
