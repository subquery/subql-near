// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {providers} from 'near-api-js';

declare global {
  const api: providers.JsonRpcProvider;
}
