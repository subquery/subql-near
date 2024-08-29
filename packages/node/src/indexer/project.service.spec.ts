// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as Near from 'near-api-js';
import { ApiService } from './api.service';
import { ProjectService } from './project.service';

const mockApiService = (): ApiService => {
  const api = new Near.providers.JsonRpcProvider({
    url: 'https://archival-rpc.mainnet.near.org',
  });

  // await ethApi.init();

  return {
    unsafeApi: api,
  } as any;
};

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    const apiService = mockApiService();

    projectService = new ProjectService(
      null as any, // DsProcessorService
      apiService,
      null as any, // PoiService
      null as any, // PoiSyncService
      null as any, // Sequelize
      null as any, // SubqueryProject
      null as any, // ProjectUpgradeService
      null as any, // StoreService
      {} as any, // NodeConfig
      null as any, // DynamicDsService
      null as any, // EventEmitter
      null as any, // UnfinalizedBlocks
    );
  });

  it('can get a block timestamps', async () => {
    const timestamp = await (projectService as any).getBlockTimestamp(
      100_000_000,
    );

    expect(timestamp).toEqual(new Date('2023-08-30T11:24:52.463Z'));
  });
});
