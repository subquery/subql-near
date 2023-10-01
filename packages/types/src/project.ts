// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  DictionaryQueryEntry,
  FileReference,
  Processor,
  ProjectManifestV1_0_0,
  BlockFilter,
  BaseHandler,
  BaseDataSource,
  BaseCustomDataSource,
} from '@subql/types-core';
import {providers} from 'near-api-js';
import {NearBlock, NearTransaction, NearAction, NearTransactionReceipt, ActionType} from './interfaces';

export type RuntimeDatasourceTemplate = BaseTemplateDataSource<NearRuntimeDatasource>;
export type CustomDatasourceTemplate = BaseTemplateDataSource<NearCustomDatasource>;

export type NearProjectManifestV1_0_0 = ProjectManifestV1_0_0<NearRuntimeDatasource | NearCustomDatasource>;

/**
 * Kind of Near datasource.
 * @enum {string}
 */
export enum NearDatasourceKind {
  /**
   * The runtime kind of Near datasource.
   */
  Runtime = 'near/Runtime',
}

/**
 * Enum representing the kind of Near handler.
 * @enum {string}
 */
export enum NearHandlerKind {
  /**
   * Handler for Near blocks.
   */
  Block = 'near/BlockHandler',
  /**
   * Handler for Near transactions.
   */
  Transaction = 'near/TransactionHandler',
  /**
   * Handler for Near actions.
   */
  Action = 'near/ActionHandler',
  /**
   * Handler for Near transactions receipts.
   */
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

/**
 * Represents a filter for Near blocks.
 */
export type NearBlockFilter = BlockFilter;

export interface NearTransactionFilter {
  /**
   * The address of the transaction sender
   * @example
   * sender: 'sweat_welcome.near',
   * */
  sender?: string;
  /**
   * The address of the transaction receiver
   * @example
   * receiver: 'token.sweat',
   * */
  receiver?: string;
}

/**
 * Represents a filter for Near receipts, extending NearTransactionFilter.
 * @interface
 * @extends {NearTransactionFilter}
 */
export interface NearReceiptFilter extends NearTransactionFilter {
  /**
   * The signer of the transaction
   * */
  signer?: string;
}

export interface NearActionFilter extends NearReceiptFilter {
  /**
   * The type of the action
   * @example
   * type: 'FunctionCall',
   * */
  type: ActionType;

  //FunctionCall
  /**
   * The method name. Only applicable with type: 'FunctionCall'
   * @example
   * methodName: 'storage_deposit',
   * */
  methodName?: string;
  /**
   *  The arguments for the method. Only applicable with type: 'FunctionCall'
   */
  args?: string;

  // Stake, AddKey, DeleteKey
  /**
   * The public key of the action. Only applicable with types 'Stake', 'AddKey' and 'DeleteKey'
   * */
  publicKey?: string;

  // AddKey
  /**
   * The access key. Only applicable with type: 'AddKey'
   * */
  accessKey?: string;

  // DeleteAccount
  /**
   * The beneficiary of a DeleteAccount type action.
   * */
  beneficiaryId?: string;
}

/**
 * Represents a handler for Near blocks.
 * @type {NearCustomHandler<NearHandlerKind.Block, NearBlockFilter>}
 */
export type NearBlockHandler = NearCustomHandler<NearHandlerKind.Block, NearBlockFilter>;
/**
 * Represents a handler for Near transactions.
 * @type {NearCustomHandler<NearHandlerKind.Transaction, NearTransactionFilter>}
 */
export type NearTransactionHandler = NearCustomHandler<NearHandlerKind.Transaction, NearTransactionFilter>;
/**
 * Represents a handler for Near actions.
 * @type {NearCustomHandler<NearHandlerKind.Action, NearActionFilter>}
 */
export type NearActionHandler = NearCustomHandler<NearHandlerKind.Action, NearActionFilter>;
/**
 * Represents a handler for Near transaction receipts.
 * @type {NearCustomHandler<NearHandlerKind.Receipt, NearTransactionFilter>}
 */
export type NearReceiptHandler = NearCustomHandler<NearHandlerKind.Receipt, NearTransactionFilter>;

/**
 * Represents a generic custom handler for Near.
 * @interface
 * @template K - The kind of the handler (default: string).
 * @template F - The filter type for the handler (default: Record<string, unknown>).
 */
export interface NearCustomHandler<
  K extends string = string,
  F = Record<string, unknown>
> /* extends BaseHandler<F, K>*/ {
  /**
   * The kind of handler. For `near/Runtime` datasources this is either `Block`, `Transaction`, `Action` or `Receipt` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {NearHandlerKind.Block | NearHandlerKind.Transaction | NearHandlerKind.Action | NearHandlerKind.Receipt | string }
   * @example
   * kind: NearHandlerKind.Block // Defined with an enum, this is used for runtime datasources
   */
  kind: K;
  handler: string;
  filter?: F;
}

/**
 * Represents a runtime handler for Near, which can be a block handler, transaction handler, action handler, or receipt handler.
 * @type {NearBlockHandler | NearTransactionHandler | NearActionHandler | NearReceiptHandler}
 */
export type NearRuntimeHandler = NearBlockHandler | NearTransactionHandler | NearActionHandler | NearReceiptHandler;
/**
 * Represents a handler for Near, which can be a runtime handler or a custom handler with unknown filter type.
 * @type {NearRuntimeHandler | NearCustomHandler<string, unknown>}
 */
export type NearHandler = NearRuntimeHandler | NearCustomHandler<string, unknown>;
/**
 * Represents a filter for Near runtime handlers, which can be a block filter, transaction filter, action filter, or event filter.
 * @type {NearBlockFilter | NearTransactionFilter | NearActionFilter | NearReceiptFilter}
 */
export type NearRuntimeHandlerFilter = NearBlockFilter | NearTransactionFilter | NearActionFilter | NearReceiptFilter;

/**
 * Represents a mapping for Near handlers, extending FileReference.
 * @interface
 * @extends {FileReference}
 */
export interface NearMapping<T extends NearHandler = NearHandler> extends FileReference {
  handlers: T[];
}

/**
 * Represents a Near datasource interface with generic parameters.
 * @interface
 * @template M - The mapping type for the datasource.
 */
// type INearDatasource<M extends NearMapping> = BaseDataSource<NearHandler, M>;
// TODO replace with Base type
interface INearDatasource<M extends NearMapping, F extends NearNetworkFilter = NearNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

/**
 * Represents a runtime datasource for Near.
 * @interface
 * @template M - The mapping type for the datasource (default: NearMapping<NearRuntimeHandler>).
 */
export interface NearRuntimeDatasource<M extends NearMapping<NearRuntimeHandler> = NearMapping<NearRuntimeHandler>>
  extends INearDatasource<M> {
  /**
   * The kind of the datasource, which is `near/Runtime`.
   * @type {NearDatasourceKind.Runtime}
   */
  kind: NearDatasourceKind.Runtime;
}

// TODO remove
export interface NearNetworkFilter {
  specName?: string;
}

/**
 * Represents a Near datasource, which can be either runtime or custom.
 * @type {NearDatasource}
 */
export type NearDatasource = NearRuntimeDatasource | NearCustomDatasource; // | NearBuiltinDataSource;

export type CustomDataSourceAsset = FileReference;

/**
 * Represents a custom datasource for Near.
 * @interface
 * @template K - The kind of the datasource (default: string).
 * @template M - The mapping type for the datasource (default: NearMapping<NearCustomHandler>).
 * @template O - The processor options (default: any).
 */
export interface NearCustomDatasource<
  K extends string = string,
  M extends NearMapping = NearMapping<NearCustomHandler>,
  O = any
> extends BaseCustomDataSource<any, NearHandler, M> {
  /**
   * The kind of the custom datasource. This should follow the pattern `near/*`.
   * @type {K}
   */
  kind: K;
  // TODO remove below properties once updated types core
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

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
  F extends Record<string, unknown>,
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
  F extends Record<string, unknown>,
  T,
  DS extends NearCustomDatasource<K> = NearCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<NearHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Action, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Receipt, F, T, DS>;

export interface NearDatasourceProcessor<
  K extends string,
  F extends Record<string, unknown>,
  DS extends NearCustomDatasource<K> = NearCustomDatasource<K>,
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

interface SecondLayerHandlerProcessorBase<
  K extends NearHandlerKind,
  F extends Record<string, unknown>,
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
  F extends Record<string, unknown>,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends NearHandlerKind,
  F extends Record<string, unknown>,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends NearHandlerKind,
  F extends Record<string, unknown>,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>;

export type NearProject<DS extends NearDatasource = NearRuntimeDatasource> = CommonSubqueryProject<
  IProjectNetworkConfig,
  NearRuntimeDatasource | DS,
  BaseTemplateDataSource<NearRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
