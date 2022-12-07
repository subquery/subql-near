// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CustomDatasourceTemplate, RuntimeDatasourceTemplate} from '@subql/common-near/project/versioned';
import {
  SecondLayerHandlerProcessor,
  NearCustomDatasource,
  NearDatasource,
  NearDatasourceKind,
  NearHandlerKind,
  NearNetworkFilter,
  NearRuntimeDatasource,
} from '@subql/types';

export function isBlockHandlerProcessor<T extends NearNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Block;
}

export function isEventHandlerProcessor<T extends NearNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Event, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Event;
}

export function isCallHandlerProcessor<T extends NearNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<NearHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<NearHandlerKind.Call, T, E> {
  return hp.baseHandlerKind === NearHandlerKind.Call;
}

export function isCustomDs<F extends NearNetworkFilter>(ds: NearDatasource): ds is NearCustomDatasource<string, F> {
  return ds.kind !== NearDatasourceKind.Runtime && !!(ds as NearCustomDatasource<string, F>).processor;
}

export function isRuntimeDs(ds: NearDatasource): ds is NearRuntimeDatasource {
  return ds.kind === NearDatasourceKind.Runtime;
}
