// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import {
  NodeConfig,
  DictionaryService,
  getLogger,
  DsProcessorService,
} from '@subql/node-core';
import { NearBlock, NearDatasource } from '@subql/types-near';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { NearDictionaryV1 } from './v1';

const logger = getLogger('NearDictionary');

@Injectable()
export class NearDictionaryService extends DictionaryService<
  NearDatasource,
  NearBlock
> {
  async initDictionaries(): Promise<void> {
    const dictionariesV1: NearDictionaryV1[] = [];

    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    const registryDictionaries = await this.resolveDictionary(
      NETWORK_FAMILY.near,
      this.project.network.chainId,
      this.nodeConfig.dictionaryRegistry,
    );

    logger.debug(`Dictionary registry endpoints: ${registryDictionaries}`);

    const dictionaryEndpoints: string[] = (
      !Array.isArray(this.project.network.dictionary)
        ? !this.project.network.dictionary
          ? []
          : [this.project.network.dictionary]
        : this.project.network.dictionary
    ).concat(registryDictionaries);

    for (const endpoint of dictionaryEndpoints) {
      try {
        const dictionaryV1 = await NearDictionaryV1.create(
          this.project,
          this.nodeConfig,
          this.dsProcessorService.getDsProcessor.bind(this),
          endpoint,
        );
        dictionariesV1.push(dictionaryV1);
      } catch (e) {
        logger.warn(
          `Dictionary endpoint "${endpoint}" is not a valid dictionary`,
        );
      }
    }
    this.init(dictionariesV1);
  }

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    protected dsProcessorService: DsProcessorService,
  ) {
    super(project.network.chainId, nodeConfig, eventEmitter);
  }
}
