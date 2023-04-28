// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import {
  isCustomDs,
  NearCustomDataSource,
  NearDataSource,
  NearDatasourceProcessor,
  NearNetworkFilter,
} from '@subql/common-near';
import { getLogger, NodeConfig, Sandbox } from '@subql/node-core';
import {
  SecondLayerHandlerProcessor_0_0_0,
  SecondLayerHandlerProcessor_1_0_0,
  NearCustomDatasource,
  NearHandlerKind,
} from '@subql/types-near';

import { VMScript } from 'vm2';
import { SubqueryProject } from '../configure/SubqueryProject';

export interface DsPluginSandboxOption {
  root: string;
  entry: string;
  script: string;
}

const logger = getLogger('ds-sandbox');

export function isSecondLayerHandlerProcessor_0_0_0<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): processor is SecondLayerHandlerProcessor_0_0_0<K, F, E, DS> {
  // Exisiting datasource processors had no concept of specVersion, therefore undefined is equivalent to 0.0.0
  return processor.specVersion === undefined;
}

export function isSecondLayerHandlerProcessor_1_0_0<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): processor is SecondLayerHandlerProcessor_1_0_0<K, F, E, DS> {
  return processor.specVersion === '1.0.0';
}

export function asSecondLayerHandlerProcessor_1_0_0<
  K extends NearHandlerKind,
  F,
  E,
  DS extends NearCustomDatasource = NearCustomDatasource,
>(
  processor:
    | SecondLayerHandlerProcessor_0_0_0<K, F, E, DS>
    | SecondLayerHandlerProcessor_1_0_0<K, F, E, DS>,
): SecondLayerHandlerProcessor_1_0_0<K, F, E, DS> {
  if (isSecondLayerHandlerProcessor_1_0_0(processor)) {
    return processor;
  }

  if (!isSecondLayerHandlerProcessor_0_0_0(processor)) {
    throw new Error('Unsupported ds processor version');
  }

  return {
    ...processor,
    specVersion: '1.0.0',
    filterProcessor: (params) =>
      processor.filterProcessor(params.filter, params.input, params.ds),
    transformer: (params) =>
      processor
        .transformer(params.input, params.ds, params.api, params.assets)
        .then((res) => [res]),
  };
}

export class DsPluginSandbox extends Sandbox {
  constructor(option: DsPluginSandboxOption, nodeConfig: NodeConfig) {
    super(
      option,
      new VMScript(
        `module.exports = require('${option.entry}').default;`,
        path.join(option.root, 'ds_sandbox'),
      ),
      nodeConfig,
    );
    this.freeze(logger, 'logger');
  }

  getDsPlugin<
    D extends string,
    T extends NearNetworkFilter,
  >(): NearDatasourceProcessor<D, T> {
    return this.run(this.script);
  }
}

@Injectable()
export class DsProcessorService {
  private processorCache: {
    [entry: string]: NearDatasourceProcessor<string, NearNetworkFilter>;
  } = {};
  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    private readonly nodeConfig: NodeConfig,
  ) {}

  async validateCustomDs(datasources: NearCustomDataSource[]): Promise<void> {
    for (const ds of datasources) {
      const processor = this.getDsProcessor(ds);
      /* Standard validation applicable to all custom ds and processors */
      if (ds.kind !== processor.kind) {
        throw new Error(
          `ds kind (${ds.kind}) doesnt match processor (${processor.kind})`,
        );
      }

      for (const handler of ds.mapping.handlers) {
        if (!(handler.kind in processor.handlerProcessors)) {
          throw new Error(
            `ds kind ${handler.kind} not one of ${Object.keys(
              processor.handlerProcessors,
            ).join(', ')}`,
          );
        }
      }

      ds.mapping.handlers.map((handler) =>
        processor.handlerProcessors[handler.kind].filterValidator(
          handler.filter,
        ),
      );

      /* Additional processor specific validation */
      processor.validate(ds, await this.getAssets(ds));
    }
  }

  async validateProjectCustomDatasources(): Promise<void> {
    await this.validateCustomDs(
      (this.project.dataSources as NearDataSource[]).filter(isCustomDs),
    );
  }

  getDsProcessor<D extends string, T extends NearNetworkFilter>(
    ds: NearCustomDataSource<string, T>,
  ): NearDatasourceProcessor<D, T> {
    if (!isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }
    if (!this.processorCache[ds.processor.file]) {
      const sandbox = new DsPluginSandbox(
        {
          root: this.project.root,
          entry: ds.processor.file,
          script:
            null /* TODO get working with Readers, same as with sandbox */,
        },
        this.nodeConfig,
      );
      try {
        this.processorCache[ds.processor.file] = sandbox.getDsPlugin<D, T>();
      } catch (e) {
        logger.error(e, `not supported ds @${ds.kind}`);
        throw e;
      }
    }
    return this.processorCache[
      ds.processor.file
    ] as unknown as NearDatasourceProcessor<D, T>;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAssets(ds: NearCustomDataSource): Promise<Record<string, string>> {
    if (!isCustomDs(ds)) {
      throw new Error(`data source is not a custom data source`);
    }

    if (!ds.assets) {
      return {};
    }

    const res: Record<string, string> = {};

    for (const [name, { file }] of ds.assets) {
      // TODO update with https://github.com/subquery/subql/pull/511
      try {
        res[name] = fs.readFileSync(file, {
          encoding: 'utf8',
        });
      } catch (e) {
        logger.error(`Failed to load datasource asset ${file}`);
        throw e;
      }
    }

    return res;
  }
}
