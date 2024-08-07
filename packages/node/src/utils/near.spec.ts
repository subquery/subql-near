// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlock } from '@subql/node-core';
import * as Near from 'near-api-js';
import { BlockContent } from '../indexer/types';
import { filterActions, fetchBlocksBatches, filterReceipts } from './near';

jest.setTimeout(30000);

describe('Near api', () => {
  let nearApi: Near.providers.JsonRpcProvider;

  beforeAll(() => {
    nearApi = new Near.providers.JsonRpcProvider({
      url: 'https://archival-rpc.mainnet.near.org',
    });
  });

  describe('Receipt Filters', () => {
    let block: IBlock<BlockContent>;

    beforeAll(async () => {
      [block] = await fetchBlocksBatches(nearApi, [85686945]);
    });

    it('Can filter receipts with sender, receiver and signer', () => {
      const actions = filterReceipts(block.block.receipts, {
        sender: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
        receiver: 'dclv2.ref-labs.near',
        signer:
          '2b5cad386ecfbf082ff74fdc2563ed35a230f57f2749a00e18bad12cda48c892',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter receipts with sender, receiver and signer - filter does not match', () => {
      const actions = filterReceipts(block.block.receipts, {
        sender: 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
        receiver: '1234',
        signer:
          '2b5cad386ecfbf082ff74fdc2563ed35a230f57f2749a00e18bad12cda48c892',
      });

      expect(actions.length).toBe(0);
    });
  });

  describe('Action Filters', () => {
    let block50838341: IBlock<BlockContent>,
      block83788766: IBlock<BlockContent>,
      block85686945: IBlock<BlockContent>;
    beforeAll(async () => {
      [block50838341, block83788766, block85686945] = await fetchBlocksBatches(
        nearApi,
        [50838341, 83788766, 85686945],
      );
    });

    it('Can filter FunctionCall actions', () => {
      const actions = filterActions(block50838341.block.actions, {
        type: 'FunctionCall',
        methodName: 'add_oracle',
        receiver: 'priceoracle.near',
      });

      expect(actions.length).toBe(1);
    });

    // TODO find transaction of this type
    it.skip('Can filter Stake actions', () => {
      const actions = filterActions(block50838341.block.actions, {
        type: 'Stake',
        publicKey: '',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter AddKey actions', () => {
      const actions = filterActions(block83788766.block.actions, {
        type: 'AddKey',
        publicKey: 'ed25519:7uCZ9oSNZgLWApTgnYyAMTbqtnsmBYQ2Zn2p5XHnibJ2',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter DeleteKey actions', () => {
      const actions = filterActions(block83788766.block.actions, {
        type: 'DeleteKey',
        publicKey: 'ed25519:9KNsmHHBPfoHZZHKjmBzRQsRDEe9EyNeptamK21hGK9a',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter actions with receipt filters', () => {
      const actions = filterActions(block85686945.block.actions, {
        type: 'FunctionCall',
        methodName: 'ft_on_transfer',
        receiver: 'dclv2.ref-labs.near',
      });

      expect(actions.length).toBe(1);
    });

    // TODO find transaction of this type
    it.skip('Can filter DeleteAccount actions', async () => {
      const [block] = await fetchBlocksBatches(nearApi, [50838341]);

      const actions = filterActions(block.block.actions, {
        type: 'DeleteAccount',
        beneficiaryId: '',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter SignedDelegate actions', async () => {
      const [delegateBlock] = await fetchBlocksBatches(nearApi, [100051916]);
      const actions = filterActions(delegateBlock.block.actions, {
        type: 'Delegate',
      });
      expect(actions.length).toBe(1);
    });
  });
});
