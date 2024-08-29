// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
} from '@subql/node-core';
import { NearDatasource } from '@subql/types-near';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { SubqueryProject } from '../configure/SubqueryProject';
import { SafeJsonRpcProvider } from '../indexer/api.service';
import { ProjectService } from '../indexer/project.service';
import { BlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  JsonRpcProvider,
  SafeJsonRpcProvider,
  BlockContent,
  NearDatasource
> {
  constructor(
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(nodeConfig, project);
  }

  async getTestRunner(): Promise<
    [
      close: () => Promise<void>,
      runner: TestRunner<
        JsonRpcProvider,
        SafeJsonRpcProvider,
        BlockContent,
        NearDatasource
      >,
    ]
  > {
    const testContext = await NestFactory.createApplicationContext(
      TestingModule,
      {
        logger: new NestLogger(!!this.nodeConfig.debug),
      },
    );

    await testContext.init();

    const projectService: ProjectService = testContext.get(ProjectService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await projectService.init();

    return [testContext.close.bind(testContext), testContext.get(TestRunner)];
  }
}
