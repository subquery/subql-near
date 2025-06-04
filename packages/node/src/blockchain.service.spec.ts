// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { JsonRpcProvider } from '@near-js/providers';
import { BlockchainService } from './blockchain.service';
import { ApiService } from './indexer/api.service';

const mockApiService = (): ApiService => {
  const api = new JsonRpcProvider({
    url: 'https://archival-rpc.mainnet.near.org',
  });

  return {
    api,
    unsafeApi: api,
  } as any;
};

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    const apiService = mockApiService();

    blockchainService = new BlockchainService(apiService);
  });

  it('can get a block timestamps', async () => {
    const timestamp = await blockchainService.getBlockTimestamp(100_000_000);

    expect(timestamp).toEqual(new Date('2023-08-30T11:24:52.463Z'));
  });
});
