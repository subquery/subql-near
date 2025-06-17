// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreModule, DbModule, MetaModule } from '@subql/node-core';
import { ConfigureModule } from './configure/configure.module';
import { FetchModule } from './indexer/fetch.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dependencies, version: packageVersion } = require('../package.json');

// This is an ESM module that doesn't let us require the package.json directly.
const nearSdkVersion = dependencies['@near-js/providers'];

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    CoreModule,
    FetchModule,
    MetaModule.forRoot({
      version: packageVersion,
      sdkVersion: { name: '@near-js/providers', version: nearSdkVersion },
    }),
  ],
  controllers: [],
})
export class AppModule {}
