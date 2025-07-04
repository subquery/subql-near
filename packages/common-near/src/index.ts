// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export * from './project';

import {INetworkCommonModule} from '@subql/types-core';
import {NearDatasource, NearRuntimeDatasource, NearCustomDatasource} from '@subql/types-near';
import * as p from './project';

// This provides a compiled time check to ensure that the correct exports are provided
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = {
  ...p,
} satisfies INetworkCommonModule<NearDatasource, NearRuntimeDatasource, NearCustomDatasource>;
