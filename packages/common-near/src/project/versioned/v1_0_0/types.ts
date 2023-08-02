// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {NearCustomDatasource, NearRuntimeDatasource} from '@subql/types-near';

export interface RuntimeDatasourceTemplate extends Omit<NearRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<NearCustomDatasource, 'name'>, TemplateBase {}

export type NearProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  NearRuntimeDatasource | NearCustomDatasource
>;
