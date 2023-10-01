// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseDeploymentV1_0_0,
  CommonProjectNetworkV1_0_0,
  FileType,
  ParentProjectModel,
  ProjectManifestBaseImpl,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
  validateObject,
} from '@subql/common';
import {BaseMapping, NodeSpec, ParentProject, QuerySpec, RunnerSpecs} from '@subql/types-core';
import {
  CustomDatasourceTemplate,
  NearCustomDatasource,
  NearProjectManifestV1_0_0,
  NearRuntimeDatasource,
  RuntimeDatasourceTemplate,
} from '@subql/types-near';
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
import {Equals, IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {CustomDataSourceBase, RuntimeDataSourceBase} from '../../models';

const NEAR_NODE_NAME = `@subql/node-near`;

export class NearRunnerNodeImpl extends RunnerNodeImpl {
  @Equals(NEAR_NODE_NAME, {message: `Runner Near node name incorrect, suppose be '${NEAR_NODE_NAME}'`})
  name: string;
}

export class NearRuntimeDataSourceImpl extends RuntimeDataSourceBase implements NearRuntimeDatasource {
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class NearCustomDataSourceImpl<
    K extends string = string,
    M extends BaseMapping<any, any> = BaseMapping<Record<string, unknown>, any>
  >
  extends CustomDataSourceBase<K, M>
  implements NearCustomDatasource<K, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends NearRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends NearCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class NearRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => NearRunnerNodeImpl)
  node: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}

export class ProjectNetworkDeploymentV1_0_0 {
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId: string;
  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | string)[];
}

export class ProjectNetworkV1_0_0 extends CommonProjectNetworkV1_0_0<FileType> {
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
}

export class DeploymentV1_0_0 extends BaseDeploymentV1_0_0 {
  @Transform((params) => {
    if (params.value.genesisHash && !params.value.chainId) {
      params.value.chainId = params.value.genesisHash;
    }
    return plainToClass(ProjectNetworkDeploymentV1_0_0, params.value);
  })
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV1_0_0)
  network: ProjectNetworkDeploymentV1_0_0;

  @IsObject()
  @ValidateNested()
  @Type(() => NearRunnerSpecsImpl)
  runner: RunnerSpecs;

  @IsArray()
  @ValidateNested()
  @Type(() => NearCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: NearRuntimeDataSourceImpl, name: 'near/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (NearRuntimeDatasource | NearCustomDatasource)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'near/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl
  extends ProjectManifestBaseImpl<DeploymentV1_0_0>
  implements NearProjectManifestV1_0_0
{
  constructor() {
    super(DeploymentV1_0_0);
  }

  @Equals('1.0.0')
  specVersion: string;
  @Type(() => NearCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: NearRuntimeDataSourceImpl, name: 'near/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (NearRuntimeDatasource | NearCustomDatasource)[];
  @Type(() => ProjectNetworkV1_0_0)
  network: ProjectNetworkV1_0_0;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'near/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => NearRunnerSpecsImpl)
  runner: RunnerSpecs;

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
}
