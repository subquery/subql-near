// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';

import {BaseMapping, FileReference} from '@subql/common';
import {
  CustomDataSourceAsset as NearCustomDataSourceAsset,
  NearBlockFilter,
  NearBlockHandler,
  NearCallFilter,
  NearCallHandler,
  NearCustomHandler,
  NearDatasourceKind,
  NearEventFilter,
  NearEventHandler,
  NearHandlerKind,
  NearNetworkFilter,
  NearRuntimeDatasource,
  NearRuntimeHandler,
  NearRuntimeHandlerFilter,
  NearCustomDatasource,
} from '@subql/types';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class BlockFilter implements NearBlockFilter {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  specVersion?: [number, number];
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class EventFilter extends BlockFilter implements NearEventFilter {
  @IsOptional()
  @IsString()
  module?: string;
  @IsOptional()
  @IsString()
  method?: string;
}

export class ChainTypes implements RegisteredTypes {
  @IsObject()
  @IsOptional()
  types?: RegistryTypes;
  @IsObject()
  @IsOptional()
  typesAlias?: Record<string, OverrideModuleType>;
  @IsObject()
  @IsOptional()
  typesBundle?: OverrideBundleType;
  @IsObject()
  @IsOptional()
  typesChain?: Record<string, RegistryTypes>;
  @IsObject()
  @IsOptional()
  typesSpec?: Record<string, RegistryTypes>;
}

export class CallFilter extends EventFilter implements NearCallFilter {
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}

export class BlockHandler implements NearBlockHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockFilter)
  filter?: NearBlockFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Block]})
  kind: NearHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CallHandler implements NearCallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: NearCallFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Call]})
  kind: NearHandlerKind.Call;
  @IsString()
  handler: string;
}

export class EventHandler implements NearEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: NearEventFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Event]})
  kind: NearHandlerKind.Event;
  @IsString()
  handler: string;
}

export class CustomHandler implements NearCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class RuntimeMapping implements BaseMapping<NearRuntimeHandlerFilter, NearRuntimeHandler> {
  @Transform((params) => {
    const handlers: NearRuntimeHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case NearHandlerKind.Event:
          return plainToClass(EventHandler, handler);
        case NearHandlerKind.Call:
          return plainToClass(CallHandler, handler);
        case NearHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: NearRuntimeHandler[];
  @IsString()
  file: string;
}

export class CustomMapping implements BaseMapping<Record<string, unknown>, NearCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers: CustomHandler[];
  @IsString()
  file: string;
}

export class SubqlNetworkFilterImpl implements NearNetworkFilter {
  @IsString()
  @IsOptional()
  specName?: string;
}

export class RuntimeDataSourceBase implements NearRuntimeDatasource {
  @IsEnum(NearDatasourceKind, {groups: [NearDatasourceKind.Runtime]})
  kind: NearDatasourceKind.Runtime;
  @Type(() => RuntimeMapping)
  @ValidateNested()
  mapping: RuntimeMapping;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => SubqlNetworkFilterImpl)
  filter?: NearNetworkFilter;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, T extends NearNetworkFilter, M extends CustomMapping, O = any>
  implements NearCustomDatasource<K, T, M, O>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, NearCustomDataSourceAsset>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor: FileReference;
  @IsOptional()
  @IsObject()
  filter?: T;
}
