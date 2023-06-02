// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  NearRuntimeHandler,
  NearCustomHandler,
  NearHandler,
  NearHandlerKind,
} from '@subql/common-near';

export function isBaseHandler(
  handler: NearHandler,
): handler is NearRuntimeHandler {
  return Object.values<string>(NearHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: NearHandler,
): handler is NearCustomHandler {
  return !isBaseHandler(handler);
}
