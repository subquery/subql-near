// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {NearCustomDatasource, NearRuntimeDatasource} from '@subql/types-near';

export interface RuntimeDatasourceTemplate extends Omit<NearRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<NearCustomDatasource, 'name'>, TemplateBase {}

export type NearProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  NearRuntimeDatasource | NearCustomDatasource
>;
