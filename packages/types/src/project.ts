// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {JsonRpcProvider} from '@near-js/providers';
import {
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  CommonSubqueryProject,
  FileReference,
  ProjectManifestV1_0_0,
  BlockFilter,
  BaseDataSource,
  BaseCustomDataSource,
  BaseHandler,
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  DsProcessor,
} from '@subql/types-core';
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

export type RuntimeHandlerFilterMap = {
  [NearHandlerKind.Block]: NearBlockFilter;
  [NearHandlerKind.Transaction]: NearTransactionFilter;
  [NearHandlerKind.Action]: NearActionFilter;
  [NearHandlerKind.Receipt]: NearReceiptFilter;
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
export interface NearCustomHandler<K extends string = string, F = Record<string, unknown>> extends BaseHandler<F, K> {
  /**
   * The kind of handler. For `near/Runtime` datasources this is either `Block`, `Transaction`, `Action` or `Receipt` kinds.
   * The value of this will determine the filter options as well as the data provided to your handler function
   * @type {NearHandlerKind.Block | NearHandlerKind.Transaction | NearHandlerKind.Action | NearHandlerKind.Receipt | string }
   * @example
   * kind: NearHandlerKind.Block // Defined with an enum, this is used for runtime datasources
   */
  kind: K;
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
type INearDatasource<M extends NearMapping> = BaseDataSource<NearHandler, M>;

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
 */
export interface NearCustomDatasource<K extends string = string, M extends NearMapping = NearMapping<NearCustomHandler>>
  extends BaseCustomDataSource<NearHandler, M> {
  /**
   * The kind of the custom datasource. This should follow the pattern `near/*`.
   * @type {K}
   */
  kind: K;
}

export type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends Record<string, unknown>,
  T,
  DS extends NearCustomDatasource<K> = NearCustomDatasource<K>
> =
  | SecondLayerHandlerProcessor<NearHandlerKind.Block, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Transaction, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Action, F, T, DS>
  | SecondLayerHandlerProcessor<NearHandlerKind.Receipt, F, T, DS>;

export type NearDatasourceProcessor<
  K extends string,
  F extends Record<string, unknown>,
  DS extends NearCustomDatasource<K> = NearCustomDatasource<K>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, DS>
  >
> = DsProcessor<DS, P, JsonRpcProvider>;

export type SecondLayerHandlerProcessor<
  K extends NearHandlerKind,
  F extends Record<string, unknown>,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource
> =
  | SecondLayerHandlerProcessor_0_0_0<K, RuntimeHandlerInputMap, RuntimeHandlerFilterMap, F, E, DS, JsonRpcProvider>
  | SecondLayerHandlerProcessor_1_0_0<K, RuntimeHandlerInputMap, RuntimeHandlerFilterMap, F, E, DS, JsonRpcProvider>;

export type NearProject<DS extends NearDatasource = NearRuntimeDatasource> = CommonSubqueryProject<
  IProjectNetworkConfig,
  NearRuntimeDatasource | DS,
  BaseTemplateDataSource<NearRuntimeDatasource> | BaseTemplateDataSource<DS>
>;
