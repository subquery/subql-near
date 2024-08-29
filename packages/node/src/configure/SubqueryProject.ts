// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  NearProjectNetworkConfig,
  parseNearProjectManifest,
  NearBlockFilter,
  isRuntimeDs,
  NearHandlerKind,
  isCustomDs,
} from '@subql/common-near';
import { BaseSubqueryProject, CronFilter } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import {
  NearDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
} from '@subql/types-near';

const { version: packageVersion } = require('../../package.json');

export type SubqlProjectBlockFilter = NearBlockFilter & CronFilter;

export type NearProjectDsTemplate =
  | RuntimeDatasourceTemplate
  | CustomDatasourceTemplate;

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = NearProjectNetworkConfig & { chainId: string };

export type SubqueryProject = BaseSubqueryProject<
  NearDatasource,
  NearProjectDsTemplate,
  NetworkConfig
>;

export async function createSubQueryProject(
  path: string,
  rawManifest: unknown,
  reader: Reader,
  root: string, // If project local then directory otherwise temp directory
  networkOverrides?: Partial<NetworkConfig>,
): Promise<SubqueryProject> {
  const project = await BaseSubqueryProject.create<SubqueryProject>({
    parseManifest: (raw) => parseNearProjectManifest(raw).asV1_0_0,
    path,
    rawManifest,
    reader,
    root,
    nodeSemver: packageVersion,
    blockHandlerKind: NearHandlerKind.Block,
    networkOverrides,
    isRuntimeDs,
    isCustomDs,
  });

  return project;
}
