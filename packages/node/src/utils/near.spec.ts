// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IBlock } from '@subql/node-core';
import {
  NearAction,
  NearActionFilter,
  NearReceiptFilter,
  NearTransactionReceipt,
} from '@subql/types-near';
import * as Near from 'near-api-js';
import { BlockContent } from '../indexer/types';
import { fetchBlocksBatches, filterAction, filterReceipt } from './near';

jest.setTimeout(30000);

// These are needed because the order doesn't seem to be deterministic
function filterReceipts(
  receipts: NearTransactionReceipt[],
  filter: NearReceiptFilter,
): NearTransactionReceipt[] {
  return receipts.filter((r) => filterReceipt(r, filter));
}

function filterActions(
  actions: NearAction[],
  filter: NearActionFilter,
): NearAction[] {
  return actions.filter((a) => filterAction(a, filter));
}

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
      const [b] = await fetchBlocksBatches(nearApi, [85686945]);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      block = b!;
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
      const [b1, b2, b3] = await fetchBlocksBatches(
        nearApi,
        [50838341, 83788766, 85686945],
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      block50838341 = b1!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      block83788766 = b2!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      block85686945 = b3!;
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

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const actions = filterActions(block!.block.actions, {
        type: 'DeleteAccount',
        beneficiaryId: '',
      });

      expect(actions.length).toBe(1);
    });

    it('Can filter SignedDelegate actions', async () => {
      const [delegateBlock] = await fetchBlocksBatches(nearApi, [100051916]);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const actions = filterActions(delegateBlock!.block.actions, {
        type: 'Delegate',
      });
      expect(actions.length).toBe(1);
    });
  });
});
