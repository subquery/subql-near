// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getManifestPath, loadFromJsonOrYaml} from '@subql/common';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
// import {NodeVM, VMScript} from 'vm2';
import {ChainTypes} from './models';
import {NearProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseNearProjectManifest(raw: unknown): NearProjectManifestVersioned {
  const projectManifest = new NearProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function loadNearProjectManifest(file: string): NearProjectManifestVersioned {
  const doc = loadFromJsonOrYaml(getManifestPath(file));
  const projectManifest = new NearProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
export function parseChainTypes(raw: unknown): ChainTypes {
  const chainTypes = plainToClass(ChainTypes, raw);
  if (
    !!chainTypes.types ||
    !!chainTypes.typesChain ||
    !!chainTypes.typesBundle ||
    !!chainTypes.typesAlias ||
    !!chainTypes.typesSpec
  ) {
    const errors = validateSync(chainTypes, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse chain types.\n${errorMsgs}`);
    }
    return chainTypes;
  } else {
    throw new Error(`chainTypes is not valid`);
  }
}
