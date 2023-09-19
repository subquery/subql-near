// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
} from '@subql/node-core';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { NearProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService, SafeJsonRpcProvider } from '../indexer/api.service';
import { ProjectService } from '../indexer/project.service';
import { BlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  JsonRpcProvider,
  SafeJsonRpcProvider,
  BlockContent,
  NearProjectDs
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
        NearProjectDs
      >,
    ]
  > {
    const testContext = await NestFactory.createApplicationContext(
      TestingModule,
      {
        logger: new NestLogger(),
      },
    );

    await testContext.init();

    const projectService: ProjectService = testContext.get(ProjectService);
    const apiService = testContext.get(ApiService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await apiService.init();
    await projectService.init();

    return [testContext.close.bind(testContext), testContext.get(TestRunner)];
  }
}
