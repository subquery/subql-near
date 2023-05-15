// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';

import {
  isCustomDs,
  isRuntimeDs,
  NearBlockFilter,
  NearTransactionFilter,
  NearDataSource,
  NearActionFilter,
  NearHandler,
  NearHandlerKind,
  NearRuntimeHandlerFilter,
} from '@subql/common-near';
import { NodeConfig, BaseFetchService } from '@subql/node-core';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry,
  NearCustomHandler,
  NearDatasource,
  NearReceiptFilter,
} from '@subql/types-near';
import { MetaData } from '@subql/utils';
import { range, sortBy, uniqBy, without } from 'lodash';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { calcInterval } from '../utils/near';
import { isBaseHandler, isCustomHandler } from '../utils/project';
import { ApiService } from './api.service';
import { INearBlockDispatcher } from './blockDispatcher/near-block-dispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import {
  UnfinalizedBlocksService,
  nearHeaderToHeader,
} from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000; //ms
const DICTIONARY_MAX_QUERY_SIZE = 10000;
const CHECK_MEMORY_INTERVAL = 60000;
const INTERVAL_PERCENT = 0.9;

function txFilterToQueryEntry(
  filter: NearTransactionFilter,
): DictionaryQueryEntry {
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
): DictionaryQueryEntry {
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
): DictionaryQueryEntry {
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

@Injectable()
export class FetchService extends BaseFetchService<
  NearDatasource,
  INearBlockDispatcher,
  DictionaryService
> {
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: INearBlockDispatcher,
    dictionaryService: DictionaryService,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
  ) {
    super(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      eventEmitter,
      schedulerRegistry,
    );
  }

  get api(): JsonRpcProvider {
    return this.apiService.api;
  }

  buildDictionaryQueryEntries(startBlock: number): DictionaryQueryEntry[] {
    const queryEntries: DictionaryQueryEntry[] = [];

    // Only run the ds that is equal or less than startBlock
    // sort array from lowest ds.startBlock to highest
    const filteredDs = this.project.dataSources
      .concat(this.templateDynamicDatasouces)
      .filter((ds) => ds.startBlock <= startBlock)
      .sort((a, b) => a.startBlock - b.startBlock);

    for (const ds of filteredDs) {
      const plugin = isCustomDs(ds)
        ? this.dsProcessorService.getDsProcessor(ds)
        : undefined;
      for (const handler of ds.mapping.handlers) {
        const baseHandlerKind = this.getBaseHandlerKind(ds, handler);
        let filterList: NearRuntimeHandlerFilter[];
        if (isCustomDs(ds)) {
          const processor = plugin.handlerProcessors[handler.kind];
          if (processor.dictionaryQuery) {
            const queryEntry = processor.dictionaryQuery(
              (handler as NearCustomHandler).filter,
              ds,
            );
            if (queryEntry) {
              queryEntries.push(queryEntry);
              continue;
            }
          }
          filterList = this.getBaseHandlerFilters<NearRuntimeHandlerFilter>(
            ds,
            handler.kind,
          );
        } else {
          filterList = [handler.filter];
        }
        // Filter out any undefined
        filterList = filterList.filter(Boolean);
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
                (filter) =>
                  !(filter.sender || filter.receiver || filter.signer),
              )
            ) {
              return [];
            }
            queryEntries.push(
              ...(filterList as NearReceiptFilter[]).map(
                receiptFilterToQueryEntry,
              ),
            );
            logger.info(JSON.stringify(queryEntries));
            break;
          }
          case NearHandlerKind.Action: {
            if (
              (filterList as NearActionFilter[]).some((filter) => !filter.type)
            ) {
              return [];
            }
            queryEntries.push(
              ...(filterList as NearActionFilter[]).map(
                actionFilterToQueryEntry,
              ),
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

  protected async getFinalizedHeight(): Promise<number> {
    const finalizedHeader = (await this.api.block({ finality: 'final' }))
      .header;
    this.unfinalizedBlocksService.registerFinalizedBlock(
      nearHeaderToHeader(finalizedHeader),
    );
    return finalizedHeader.height;
  }

  protected async getBestHeight(): Promise<number> {
    const bestHeader = (await this.api.block({ finality: 'optimistic' }))
      .header;
    return bestHeader.height;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const chainInterval = calcInterval(this.api)
      .muln(INTERVAL_PERCENT)
      .toNumber();

    return Math.min(BLOCK_TIME_VARIANCE, chainInterval);
  }

  protected async getChainId(): Promise<string> {
    return Promise.resolve((await this.api.status()).chain_id);
  }

  protected getModulos(): number[] {
    const modulos: number[] = [];
    for (const ds of this.project.dataSources) {
      if (isCustomDs(ds)) {
        continue;
      }
      for (const handler of ds.mapping.handlers) {
        if (
          handler.kind === NearHandlerKind.Block &&
          handler.filter &&
          handler.filter.modulo
        ) {
          modulos.push(handler.filter.modulo);
        }
      }
    }
    return modulos;
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook({ startHeight, valid }): Promise<void> {
    return Promise.resolve();
  }

  private getBaseHandlerKind(
    ds: NearDataSource,
    handler: NearHandler,
  ): NearHandlerKind {
    if (isRuntimeDs(ds) && isBaseHandler(handler)) {
      return handler.kind;
    } else if (isCustomDs(ds) && isCustomHandler(handler)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const baseHandler =
        plugin.handlerProcessors[handler.kind]?.baseHandlerKind;
      if (!baseHandler) {
        throw new Error(
          `handler type ${handler.kind} not found in processor for ${ds.kind}`,
        );
      }
      return baseHandler;
    }
  }

  private getBaseHandlerFilters<T extends NearRuntimeHandlerFilter>(
    ds: NearDataSource,
    handlerKind: string,
  ): T[] {
    if (isCustomDs(ds)) {
      const plugin = this.dsProcessorService.getDsProcessor(ds);
      const processor = plugin.handlerProcessors[handlerKind];
      return processor.baseFilter instanceof Array
        ? (processor.baseFilter as T[])
        : ([processor.baseFilter] as T[]);
    } else {
      throw new Error(`Expected a custom datasource here`);
    }
  }
}
