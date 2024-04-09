// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {providers} from 'near-api-js';
import '@subql/types-core/dist/global';

declare global {
  const api: providers.JsonRpcProvider;
}
