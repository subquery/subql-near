// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SecondLayerHandlerProcessorArray,
  NearCustomDatasource,
  NearDatasource,
  NearDatasourceKind,
  NearHandlerKind,
  NearRuntimeDatasource,
  NearMapping,
  NearCustomHandler,
} from '@subql/types-near';

export function isBlockHandlerProcessor<T extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Block;
}

export function isTransactionHandlerProcessor<T extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Transaction, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Transaction;
}

export function isActionHandlerProcessor<T extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Action, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Action;
}

export function isReceiptHandlerProcessor<T extends Record<string, unknown>, E>(
  hp: SecondLayerHandlerProcessorArray<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Receipt, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Receipt;
}

export function isCustomDs<F extends NearMapping<NearCustomHandler>>(
  ds: NearDatasource
): ds is NearCustomDatasource<string, F> {
  return ds.kind !== NearDatasourceKind.Runtime && !!(ds as NearCustomDatasource<string, F>).processor;
}

export function isRuntimeDs(ds: NearDatasource): ds is NearRuntimeDatasource {
  return ds.kind === NearDatasourceKind.Runtime;
}
