// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {
  isCustomDs,
  NearHandlerKind,
  NearRuntimeHandlerFilter,
  NearHandler,
  NearActionFilter,
  isRuntimeDs,
  NearDataSource,
  NearCustomHandler,
  NearTransactionFilter,
} from '@subql/common-near';
import { NodeConfig, DictionaryV1, DsProcessorService } from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
} from '@subql/types-core';
import {
  NearBlockFilter,
  NearDatasource,
  NearReceiptFilter,
} from '@subql/types-near';
import { sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { isBaseHandler, isCustomHandler } from '../../../utils/project';

type GetDsProcessor = DsProcessorService['getDsProcessor'];

function txFilterToQueryEntry(
  filter: NearTransactionFilter,
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = Object.entries(filter).map(
    ([field, value]) => ({
      field,
      value,
      matcher: 'equalTo',
    }),
  );

  return {
    entity: 'transactions',
    conditions: conditions,
  };
}

function receiptFilterToQueryEntry(
  filter: NearReceiptFilter,
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = Object.entries(filter).map(
    ([field, value]) => ({
      field,
      value,
      matcher: 'equalTo',
    }),
  );

  return {
    entity: 'receipts',
    conditions: conditions,
  };
}

function actionFilterToQueryEntry(
  filter: NearActionFilter,
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = Object.entries(filter).map(
    ([field, value]) => ({
      field,
      value,
      matcher: 'equalTo',
    }),
  );

  return {
    entity: 'actions',
    conditions: conditions,
  };
}

function getBaseHandlerKind(
  ds: NearDataSource,
  handler: NearHandler,
  getDsProcessor: GetDsProcessor,
): NearHandlerKind | undefined {
  if (isRuntimeDs(ds) && isBaseHandler(handler)) {
    return handler.kind;
  } else if (isCustomDs(ds) && isCustomHandler(handler)) {
    const plugin = getDsProcessor(ds);
    const baseHandler = plugin.handlerProcessors[handler.kind]?.baseHandlerKind;
    if (!baseHandler) {
      throw new Error(
        `handler type ${handler.kind} not found in processor for ${ds.kind}`,
      );
    }
    return baseHandler;
  }
}

function getBaseHandlerFilters<T extends NearRuntimeHandlerFilter>(
  ds: NearDataSource,
  handlerKind: string,
  getDsProcessor: GetDsProcessor,
): T[] {
  if (isCustomDs(ds)) {
    const plugin = getDsProcessor(ds);
    const processor = plugin.handlerProcessors[handlerKind];
    return processor.baseFilter instanceof Array
      ? (processor.baseFilter as T[])
      : ([processor.baseFilter] as T[]);
  } else {
    throw new Error(`Expected a custom datasource here`);
  }
}

// eslint-disable-next-line complexity
function buildDictionaryV1QueryEntries(
  dataSources: NearDatasource[],
  getDsProcessor: GetDsProcessor,
): DictionaryV1QueryEntry[] {
  const queryEntries: DictionaryV1QueryEntry[] = [];

  for (const ds of dataSources) {
    const plugin = isCustomDs(ds) ? getDsProcessor(ds) : undefined;
    for (const handler of ds.mapping.handlers) {
      const baseHandlerKind = getBaseHandlerKind(ds, handler, getDsProcessor);
      let filterList: NearRuntimeHandlerFilter[] = [];
      if (isCustomDs(ds)) {
        assert(plugin, 'plugin should be defined');
        const processor = plugin.handlerProcessors[handler.kind];
        const filter = (handler as NearCustomHandler).filter;
        if (processor.dictionaryQuery && filter) {
          const queryEntry = processor.dictionaryQuery(filter, ds);
          if (queryEntry) {
            queryEntries.push(queryEntry);
            continue;
          }
        }
        filterList = getBaseHandlerFilters<NearRuntimeHandlerFilter>(
          ds,
          handler.kind,
          getDsProcessor,
        );
      } else if (handler.filter) {
        filterList = [handler.filter];
      }
      // Filter out any undefined
      filterList = filterList.filter((f) => f);
      if (!filterList.length) return [];
      switch (baseHandlerKind) {
        case NearHandlerKind.Block:
          if (
            (filterList as NearBlockFilter[]).some((filter) => !filter.modulo)
          ) {
            return [];
          }
          break;
        case NearHandlerKind.Transaction: {
          if (
            (filterList as NearTransactionFilter[]).some(
              (filter) => !(filter.sender || filter.receiver),
            )
          ) {
            return [];
          }
          queryEntries.push(
            ...(filterList as NearTransactionFilter[]).map(
              txFilterToQueryEntry,
            ),
          );
          break;
        }
        case NearHandlerKind.Receipt: {
          if (
            (filterList as NearReceiptFilter[]).some(
              (filter) => !(filter.sender || filter.receiver || filter.signer),
            )
          ) {
            return [];
          }
          queryEntries.push(
            ...(filterList as NearReceiptFilter[]).map(
              receiptFilterToQueryEntry,
            ),
          );
          break;
        }
        case NearHandlerKind.Action: {
          if (
            (filterList as NearActionFilter[]).some((filter) => !filter.type)
          ) {
            return [];
          }
          queryEntries.push(
            ...(filterList as NearActionFilter[]).map(actionFilterToQueryEntry),
          );
          break;
        }
        default:
      }
    }
  }

  return uniqBy(
    queryEntries,
    (item) =>
      `${item.entity}|${JSON.stringify(
        sortBy(item.conditions, (c) => c.field),
      )}`,
  );
}

export class NearDictionaryV1 extends DictionaryV1<NearDatasource> {
  constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    protected getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ) {
    super(dictionaryUrl, chainId ?? project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ): Promise<NearDictionaryV1> {
    const dictionary = new NearDictionaryV1(
      project,
      nodeConfig,
      getDsProcessor,
      dictionaryUrl,
      chainId,
    );
    await dictionary.init();
    return dictionary;
  }

  buildDictionaryQueryEntries(
    dataSources: NearDatasource[],
  ): DictionaryV1QueryEntry[] {
    return buildDictionaryV1QueryEntries(dataSources, this.getDsProcessor);
  }
}
