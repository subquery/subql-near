// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { DictionaryService, NodeConfig } from '@subql/node-core';
import { MetaData } from '@subql/utils';
import { NearDictionaryV1 } from './nearDictionaryV1';

const nodeConfig = {
  dictionaryTimeout: 10000,
  dictionaryRegistry:
    'https://github.com/subquery/templates/raw/main/dist/dictionary.json',
} as NodeConfig;
const project = {
  network: {
    chainId: 'mainnet',
  },
} as any;

class TestDictionaryService extends DictionaryService<any, any> {
  async initDictionaries(): Promise<void> {
    return Promise.resolve(undefined);
  }
  async getRegistryDictionaries(chainId: string): Promise<string[]> {
    return this.resolveDictionary(
      NETWORK_FAMILY.near,
      chainId,
      this.nodeConfig.dictionaryRegistry,
    );
  }
}
describe('dictionary v1', () => {
  let dictionary: NearDictionaryV1;
  beforeEach(async () => {
    const testDictionaryService = new TestDictionaryService(
      project.network.chainId,
      nodeConfig,
      new EventEmitter2(),
    );
    const dictionaryEndpoints =
      await testDictionaryService.getRegistryDictionaries(
        project.network.chainId,
      );
    dictionary = await NearDictionaryV1.create(
      {
        network: {
          chainId: 'mainnet',
          dictionary: dictionaryEndpoints[1],
        },
      } as any,
      { dictionaryTimeout: 10000 } as NodeConfig,
      jest.fn(),
      dictionaryEndpoints[1], // use endpoint from network
    );
  });

  it('successfully validates metatada', () => {
    // start height from metadata
    expect(dictionary.startHeight).toBe(1);
    // further validation
    expect(
      (dictionary as any).dictionaryValidation(
        {
          lastProcessedHeight: 10000,
          targetHeight: 10000,
          chain: 'mainnet',
          genesisHash: 'EPnLgE7iEq9s7yTkos96M3cWymH5avBAPm3qx3NXqR8H=',
          startHeight: 1,
        } as MetaData,
        1,
      ),
    ).toBeTruthy();
  });
});
