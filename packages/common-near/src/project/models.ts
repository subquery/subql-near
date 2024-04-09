// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, BlockFilterImpl, ProcessorImpl} from '@subql/common';
import {BaseMapping, FileReference, Processor} from '@subql/types-core';
import {
  CustomDataSourceAsset as NearCustomDataSourceAsset,
  NearBlockFilter,
  NearBlockHandler,
  NearTransactionHandler,
  NearActionFilter,
  NearCustomHandler,
  NearDatasourceKind,
  NearTransactionFilter,
  NearActionHandler,
  NearHandlerKind,
  NearRuntimeDatasource,
  NearRuntimeHandler,
  NearRuntimeHandlerFilter,
  NearCustomDatasource,
  ActionType,
  NearReceiptHandler,
  NearReceiptFilter,
} from '@subql/types-near';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  Min,
  ValidateIf,
} from 'class-validator';

export class BlockFilter extends BlockFilterImpl implements NearBlockFilter {}

export class TransactionFilter extends BlockFilter implements NearTransactionFilter {
  @IsOptional()
  @IsString()
  sender?: string;
  @IsOptional()
  @IsString()
  receiver?: string;
}

export function IsActionType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isActionType',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Object.values(ActionType).includes(value);
        },
      },
    });
  };
}

export class ReceiptFilter extends TransactionFilter implements NearReceiptFilter {
  @IsOptional()
  @IsString()
  signer?: string;
}

export class ActionFilter extends ReceiptFilter implements NearActionFilter {
  @IsString()
  @IsActionType()
  type: ActionType;

  @IsString()
  @IsOptional()
  @ValidateIf((o: ActionFilter) => {
    return o.type === ActionType.FunctionCall;
  })
  methodName?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o: ActionFilter) => {
    return o.type === ActionType.FunctionCall;
  })
  args?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o: ActionFilter) => {
    return o.type === ActionType.Stake || o.type === ActionType.AddKey || o.type === ActionType.DeleteKey;
  })
  publicKey?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o: ActionFilter) => {
    return o.type === ActionType.AddKey;
  })
  accessKey?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o: ActionFilter) => {
    return o.type === ActionType.DeleteAccount;
  })
  beneficiaryId?: string;
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

export class TransactionHandler implements NearTransactionHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionFilter)
  filter?: NearTransactionFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Transaction]})
  kind: NearHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class ActionHandler implements NearActionHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionFilter)
  filter?: NearActionFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Action]})
  kind: NearHandlerKind.Action;
  @IsString()
  handler: string;
}

export class ReceiptHandler implements NearReceiptHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptFilter)
  filter?: NearReceiptFilter;
  @IsEnum(NearHandlerKind, {groups: [NearHandlerKind.Receipt]})
  kind: NearHandlerKind.Receipt;
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

export class RuntimeMapping implements BaseMapping<NearRuntimeHandler> {
  @Transform((params) => {
    const handlers: NearRuntimeHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case NearHandlerKind.Receipt:
          return plainToClass(ReceiptHandler, handler);
        case NearHandlerKind.Action:
          return plainToClass(ActionHandler, handler);
        case NearHandlerKind.Transaction:
          return plainToClass(TransactionHandler, handler);
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

export class CustomMapping implements BaseMapping<NearCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers: CustomHandler[];
  @IsString()
  file: string;
}

export class RuntimeDataSourceBase extends BaseDataSource implements NearRuntimeDatasource {
  @IsEnum(NearDatasourceKind, {groups: [NearDatasourceKind.Runtime]})
  kind: NearDatasourceKind.Runtime;
  @Type(() => RuntimeMapping)
  @ValidateNested()
  mapping: RuntimeMapping;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, M extends CustomMapping, O = any>
  extends BaseDataSource
  implements NearCustomDatasource<K, M>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, NearCustomDataSourceAsset>;
  @Type(() => ProcessorImpl)
  @IsObject()
  processor: Processor;
}
