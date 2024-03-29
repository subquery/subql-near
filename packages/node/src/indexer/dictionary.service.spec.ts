// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '@subql/node-core';
import { DictionaryService } from './dictionary.service';

describe('dictionary service', () => {
  let dictionaryService: DictionaryService;

  beforeEach(async () => {
    dictionaryService = await DictionaryService.create(
      {
        network: {
          chainId: 'mainnet',
          dictionary:
            'https://api.subquery.network/sq/subquery/near-dictionary',
        },
      } as any,
      { dictionaryTimeout: 10000 } as NodeConfig,
      new EventEmitter2(),
    );
  });

  it('successfully validates metatada', async () => {
    /* Genesis hash is unused with cosmos, chainId is used from project instead */
    await expect(
      dictionaryService.initValidation('mainnet'),
    ).resolves.toBeTruthy();
  });
});
