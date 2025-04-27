// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import {
  isCustomDs,
  NearCustomDataSource,
  NearDataSource,
  NearDatasourceProcessor,
} from '@subql/common-near';
import { BaseDsProcessorService } from '@subql/node-core';
import { NearMapping, NearCustomHandler } from '@subql/types-near';

@Injectable()
export class DsProcessorService extends BaseDsProcessorService<
  NearDataSource,
  NearCustomDataSource<string, NearMapping<NearCustomHandler>>,
  NearDatasourceProcessor<string, Record<string, unknown>>
> {
  protected isCustomDs = isCustomDs;
}
