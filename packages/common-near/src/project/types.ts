// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/types-core';
import {NearDatasource} from '@subql/types-near';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  NearRuntimeHandler,
  NearCustomHandler,
  NearHandler,
  NearHandlerKind,
  NearDatasource as NearDataSource,
  NearCustomDatasource as NearCustomDataSource,
  NearBlockFilter,
  NearTransactionFilter,
  NearActionFilter,
  NearDatasourceProcessor,
  NearRuntimeHandlerFilter,
  NearDatasourceKind,
  RuntimeHandlerInputMap as NearRuntimeHandlerInputMap,
} from '@subql/types-near';

//make exception for runtime datasource 0.0.1
export type INearProjectManifest = IProjectManifest<NearDatasource>;

export interface NearProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
}
