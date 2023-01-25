// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as Near from 'near-api-js';
import { filterActions, fetchBlocksBatches } from './near';

describe('Near api', () => {
  let nearApi: Near.providers.JsonRpcProvider;

  beforeAll(() => {
    nearApi = new Near.providers.JsonRpcProvider({
      url: 'https://archival-rpc.mainnet.near.org',
    });
  });

  describe('Action Filters', () => {
    it('Can filter FunctionCall actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [50838341]);

      const actions = filterActions(block.actions, {
        type: 'FunctionCall',
        methodName: 'add_oracle',
        receiver: 'priceoracle.near',
      });

      expect(actions.length).toBe(1);
    });

    // TODO find transaction of this type
    it.skip('Can filter Stake actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [50838341]);

      const actions = filterActions(block.actions, {
        type: 'Stake',
        publicKey: '',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter AddKey actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [83788766]);

      const actions = filterActions(block.actions, {
        type: 'AddKey',
        publicKey: 'ed25519:7uCZ9oSNZgLWApTgnYyAMTbqtnsmBYQ2Zn2p5XHnibJ2',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter DeleteKey actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [83788766]);

      const actions = filterActions(block.actions, {
        type: 'DeleteKey',
        publicKey: 'ed25519:9KNsmHHBPfoHZZHKjmBzRQsRDEe9EyNeptamK21hGK9a',
      });

      expect(actions.length).toBe(1);
    });

    // TODO find transaction of this type
    it.skip('Can filter DeleteAccount actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [50838341]);

      const actions = filterActions(block.actions, {
        type: 'DeleteAccount',
        beneficiaryId: '',
      });

      expect(actions.length).toBe(1);
    });
  });
});
