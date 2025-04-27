// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// import {NodeVM, VMScript} from 'vm2';
import {NearProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseNearProjectManifest(raw: unknown): NearProjectManifestVersioned {
  const projectManifest = new NearProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
