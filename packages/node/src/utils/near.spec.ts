// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as Near from 'near-api-js';
import {
  filterActions,
  fetchBlocksBatches,
  filterReceipt,
  filterReceipts,
} from './near';

jest.setTimeout(20000);

describe('Near api', () => {
  let nearApi: Near.providers.JsonRpcProvider;

  beforeAll(() => {
    nearApi = new Near.providers.JsonRpcProvider({
      url: 'https://archival-rpc.mainnet.near.org',
    });
  });

  describe('Receipt Filters', () => {
    it('Can filter receipts with sender, receiver and signer', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [85686945]);

      const actions = filterReceipts(block.receipts, {
        sender: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
        receiver: 'dclv2.ref-labs.near',
        signer:
          '2b5cad386ecfbf082ff74fdc2563ed35a230f57f2749a00e18bad12cda48c892',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter receipts with sender, receiver and signer - filter does not match', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [85686945]);

      const actions = filterReceipts(block.receipts, {
        sender: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
        receiver: '1234',
        signer:
          '2b5cad386ecfbf082ff74fdc2563ed35a230f57f2749a00e18bad12cda48c892',
      });

      expect(actions.length).toBe(0);
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

    it('Can filter actions with receipt filters', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [85686945]);

      const actions = filterActions(block.actions, {
        type: 'FunctionCall',
        methodName: 'ft_on_transfer',
        receiver: 'dclv2.ref-labs.near',
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
