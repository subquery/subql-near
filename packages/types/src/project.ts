// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {providers} from 'near-api-js';
import {NearBlock, NearTransaction, NearAction, NearTransactionReceipt} from './interfaces';

export enum NearDatasourceKind {
  Runtime = 'near/Runtime',
}

export enum NearHandlerKind {
  Block = 'near/BlockHandler',
  Transaction = 'near/TransactionHandler',
  Action = 'near/ActionHandler',
  Receipt = 'near/ReceiptHandler',
}

export type RuntimeHandlerInputMap = {
  [NearHandlerKind.Block]: NearBlock;
  [NearHandlerKind.Transaction]: NearTransaction;
  [NearHandlerKind.Action]: NearAction;
  [NearHandlerKind.Receipt]: NearTransactionReceipt;
};

type RuntimeFilterMap = {
  [NearHandlerKind.Block]: NearBlockFilter;
  [NearHandlerKind.Transaction]: NearTransactionFilter;
  [NearHandlerKind.Action]: NearActionFilter;
  [NearHandlerKind.Receipt]: NearTransactionFilter;
};

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  network: {
    endpoint: string;
  };

  dataSources: NearDatasource[];
  bypassBlocks?: number[];
}

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

export interface NearBlockFilter {
  modulo?: number;
  timestamp?: string;
}

export interface NearTransactionFilter {
  sender?: string;
  receiver?: string;
}

export interface NearReceiptFilter extends NearTransactionFilter {
  //For Action Receipts:
  signer?: string;
}

export interface NearActionFilter extends NearReceiptFilter {
  type: string;

  //FunctionCall
  methodName?: string;
  args?: string;

  // Stake, AddKey, DeleteKey
  publicKey?: string;

  // AddKey
  accessKey?: string;

  // DeleteAccount
  beneficiaryId?: string;
}

export type NearBlockHandler = NearCustomHandler<NearHandlerKind.Block, NearBlockFilter>;
export type NearTransactionHandler = NearCustomHandler<NearHandlerKind.Transaction, NearTransactionFilter>;
export type NearActionHandler = NearCustomHandler<NearHandlerKind.Action, NearActionFilter>;
export type NearReceiptHandler = NearCustomHandler<NearHandlerKind.Receipt, NearTransactionFilter>;
export interface NearCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type NearRuntimeHandler = NearBlockHandler | NearTransactionHandler | NearActionHandler | NearReceiptHandler;
export type NearHandler = NearRuntimeHandler | NearCustomHandler<string, unknown>;
export type NearRuntimeHandlerFilter = NearBlockFilter | NearTransactionFilter | NearActionFilter;

export interface NearMapping<T extends NearHandler = NearHandler> extends FileReference {
  handlers: T[];
}

interface INearDatasource<M extends NearMapping, F extends NearNetworkFilter = NearNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

export interface NearRuntimeDatasource<M extends NearMapping<NearRuntimeHandler> = NearMapping<NearRuntimeHandler>>
  extends INearDatasource<M> {
  kind: NearDatasourceKind.Runtime;
}

export interface NearNetworkFilter {
  specName?: string;
}

export type NearDatasource = NearRuntimeDatasource | NearCustomDatasource; // | NearBuiltinDataSource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface NearCustomDatasource<
  K extends string = string,
  T extends NearNetworkFilter = NearNetworkFilter,
  M extends NearMapping = NearMapping<NearCustomHandler>,
  O = any
> extends INearDatasource<M, T> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

//export type NearBuiltinDataSource = INearDatasource;

export interface HandlerInputTransformer_0_0_0<
  T extends NearHandlerKind,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> {
  (
    input: RuntimeHandlerInputMap[T],
    ds: DS,
    api: providers.JsonRpcProvider,
    assets?: Record<string, string>
  ): Promise<E>; //  | NearBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> {
  (params: {
    input: RuntimeHandlerInputMap[T];
    ds: DS;
    filter?: F;
    api: providers.JsonRpcProvider;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | NearBuiltinDataSource
}

type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends NearNetworkFilter,
  T,
  DS extends NearCustomDatasource<K, F> = NearCustomDatasource<K, F>
> =
  | SecondLayerHandlerProcessor<NearHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Action, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Receipt, F, T, DS>;

export interface NearDatasourceProcessor<
  K extends string,
  F extends NearNetworkFilter,
  DS extends NearCustomDatasource<K, F> = NearCustomDatasource<K, F>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: providers.JsonRpcProvider): boolean;
  handlerProcessors: P;
}

export interface DictionaryQueryCondition {
  field: string;
  value: string | string[];
  matcher?: string; // defaults to "equalTo", use "contains" for JSON
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

interface SecondLayerHandlerProcessorBase<
  K extends NearHandlerKind,
  F,
  DS extends NearCustomDatasource = NearCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor_0_0_0<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;
