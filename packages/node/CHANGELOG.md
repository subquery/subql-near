# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.2] - 2025-07-01
### Changed
- Update `@subql/common` and `@subql/node-core` (#149)

## [6.0.1] - 2025-06-18
### Changed
- Update `@subql/node-core` (#147)

### Fixed
- Import of near dependency version (#147)

## [6.0.0] - 2025-06-04
### Changed
- Update to latest near sdk and use modular imports (#144)

## [5.0.2] - 2025-05-01
### Changed
- Re release of previously failed release

## [5.0.1] - 2025-05-01
### Changed
- Update `@subql/node-core` with workers performance fix

## [5.0.0] - 2025-04-28
### Changed
- Implement blockchain service (#140)

### Added
- Support for rewinds and unfinalized blocks with multichain projects

## [4.3.0] - 2025-01-28
### Changed
- Update `@subql/node-core` with minor bug fixes and improvements

## [4.2.0] - 2024-12-17
### Changed
- Update `@subql/node-core` and `@subql/common` dependencies

## [4.1.1] - 2024-12-06
### Fixed
- Missing API dependency when using reindex

## [4.1.0] - 2024-11-27
### Added
- Support for historical indexing by timestamp as well as block height
- Add an `--enable-cache` flag, allowing you to choose between DB or cache for IO operations.

## [4.0.5] - 2024-10-23
### Changed
- Bump `@subql/common` dependency

## [4.0.4] - 2024-10-22
### Changed
- Bump `@subql/common` and `@subql/node-core` dependency (#123)

## [4.0.1] - 2024-09-04
### Fixed
- Workers dependencies causing crash (#122)

## [4.0.0] - 2024-08-30
### Added
- Support for network endpoint config providing the ability to set headers (#119)

### Changed
- Enable strict TS (#119)
- Breaking change: Update to latest `@subql/node-core`, require indexing environment timezone set to UTC (#119)
- Use more code from node core (#119)

### Fixed
- Actions filter issue (#119)
- Various issues causing poi inconsistency (#119)

## [3.12.0] - 2024-07-03
### Changed
- Bump version with `@subql/common-near`, sync with `@subql/node-core`, add admin module

## [3.11.1] - 2024-05-02
### Fixed
- Sandbox Uint8Array and missing pg dep issue

## [3.11.0] - 2024-05-02
### Changed
- Update dependencies and apply changes to match (#109)

### Removed
- Unused deps and deprecated type (#110)

## [3.10.0] - 2024-04-10
### Changed
- Updated with node-core. Now dictionary supports multiple endpoints, indexer will fetch and switch dictionaries based on available blocks

### Fixed
- Updated with node-core ,also fixed:
  - Fix modulo block didn't apply correctly with multiple dataSources
  - Now when `workers` set to 0, it will use block dispatcher instead of throw and exit

## [3.9.1] - 2024-03-14
### Changed
- Update `@subql/node-core` to 4.7.2 with graphql comments escaping fix

## [3.9.0] - 2024-03-06
### Changed
- Update `@subql/node-core` to 7.4.0

## [3.8.1] - 2024-03-01
### Fixed
- Update `@subql/node-core` to fix Poi generation issue with negative integer, also drop subscription triggers and notifiy_functions

## [3.8.0] - 2024-02-23
### Changed
- Updates to match changes in `@subql/node-core` to 7.3.0

## [3.5.1] - 2024-02-07
### Fixed
- Critical bug introduced in 3.5.0 which broke historical indexing

## [3.5.0] - 2024-01-25
### Changed
- Update @subql/node-core with
  - a performance fix when using modulo filters with other datasources
  - support for CSV exports
  - support for schema migrations

## [3.4.6] - 2023-12-12
### Changed
- Update `@subql/types-near` (#90)

## [3.4.5] - 2023-11-30
### Fixed
- Sync with `node-core` 7.0.2

## [3.4.4] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced node-core 7.0.0
- Update with node-core to fix network dictionary timeout but not fallback to config dictionary issue

## [3.4.3] - 2023-11-27
### Changed
- Update `@subql/node-core` with minor fixes

## [3.4.2] - 2023-11-16
### Fixed
- Sync with `node-core` 6.4.2, Fix incorrect enqueuedBlocks, dictionaries timing out by updating `@subql/apollo-links` (#86)

## [3.4.1] - 2023-11-15
### Fixed
- Re-release `3.4.0`

## [3.4.0] - 2023-11-14
### Changed
- Updates to match changes in
  - Dictionary service to use dictionary registry
  - Use yargs from node core

### Fixed
- Unable to skip unavailable blocks on workers (#82)

## [3.3.0] - 2023-11-06
### Added
- With `dictionary-query-size` now dictionary can config the query block range

### Fixed
- Sync with node-core 6.3.0 with various fixes

## [3.2.0] - 2023-11-01
### Changed
- Update `@subql/node-core` with fixes and support for endBlock feature (#74)

## [3.1.1] - 2023-10-27
### Fixed
- Not injecting cache into workers (#72)

## [3.1.0] - 2023-10-26
### Changed
- Update node-core and make according changes

## [3.0.0] - 2023-10-04
### Changed
- Update `@subql/node-core` and sync with main SDK.

### Fixed
- Fix dictionary metadata validation failed
- Improve get finalized block error logging
- Fix reindex also start index service (#155)
- Fix warning for filter address (#154)
- Fetching logs via block height resulting in invalid results. Block hash is now used to ensure
  correct results. (#156)
- Node runner options being overwritten by yargs defaults (#148)
- Fix yargs default override runner nodeOptions (#166)

## [2.10.2] - 2023-09-27
### Changed
- Update `subql/common` (#64)

## [2.10.1] - 2023-09-27
### Added
- Support for Delegate actions (#62)

## [2.10.0] - 2023-08-02
### Changed
- Sync with main sdk (#56)

## [2.8.0] - 2023-06-27
### Changed
- Sync with main sdk and update deps (#51)

### Fixed
- Dictionary validation failing with chainId (#51)

## [2.6.1] - 2023-06-16
### Fixed
- Fixed an issue where MetaService caught NodeConfig undefined

## [2.6.0] - 2023-06-16
### Added
- Multiple-endpoint improvements from latest node-core (#44)

### Fixed
- Fix module missing sequelize, use subql/x-sequelize (#44)

## [2.5.2] - 2023-06-15
### Fixed
- Fixed workers to handle unavailable blocks without throwing errors (#46)

## [2.5.1] - 2023-06-08
### Fixed
- Sync with node-core 2.4.4, fixed various issue for mmr

## [2.5.0] - 2023-06-02
### Fixed
- Updated dependencies with fixes and ported over relevant fixes from main sdk (#41)

## [2.3.1] - 2023-05-25
### Changed
- Updated node-core to fix issue with base58 block hashes and POI

## [2.3.0] - 2023-05-23
### Changed
- Update to Node 18
- Updated `@subql/node-core`

## 2.1.1 - 2023-05-17
### Fixed
- Previous release

## 2.1.0 - 2023-05-17
### Added
- Support for unfinalized blocks with workers

### Changed
- Sync with main SDK

## 2.0.0 - 2023-05-01
### Added
- Added Database cache feature, this significantly improve indexing performance
  - Data flush to database when number of records reaches `--store-cache-threshold` value (default is 1000), this reduces number of transactions to database in order to save time.
  - Direct get data from the cache rather than wait to retrieve it from database, with flag `--store-get-cache-size` user could decide how many records for **each** entity they want to keep in the cache (default is 500)
  - If enabled `--store-cache-async` writing data to the store is asynchronous with regard to block processing (default is enabled)
- Testing Framework, allow users to test their projects filters and handler functions without having to index the project
  - Create test files with the naming convention `*.test.ts` and place them in the `src/tests` or `src/test` folder. Each test file should contain test cases for specific mapping handlers.
  - Run the testing service using the command: `subql-node-near test`.

## 1.21.1 - 2023-03-30
### Fixed
- Pin @subql/node-core  version to 1.10.1-2

## 1.21.0 - 2023-03-28
### Changed
- Sync latest changes from main SDK

## 1.20.1 - 2023-03-15
### Added
- Index ids of receipt created by a transaction

## 1.20.0 - 2023-03-13
### Changed
- Sync latest changes from @subql/node (#22)

## 1.19.3 - 2023-03-06
### Added
- Sync latest changes from @subql/node

## 1.19.2 - 2023-03-06
### Added
- Sync latest changes from @subql/node

## 1.19.1 - 2023-03-03
### Added
- Sync latest changes from @subql/node

### Fixed
- Update sequelize version to match with other @subql modules

## 1.19.0 - 2023-03-02
### Added
- Add transaction receipt handlers and filters (#13)

## 1.18.1 - 2023-02-03
### Changed
- Add `toJson` method to function args (#9)

## 1.18.0 - 2023-01-26
[Unreleased]: https://github.com/subquery/subql-near/compare/node-near/6.0.2...HEAD
[6.0.2]: https://github.com/subquery/subql-near/compare/node-near/6.0.1...node-near/6.0.2
[6.0.1]: https://github.com/subquery/subql-near/compare/node-near/6.0.0...node-near/6.0.1
[6.0.0]: https://github.com/subquery/subql-near/compare/node-near/5.0.2...node-near/6.0.0
[5.0.2]: https://github.com/subquery/subql-near/compare/node-near/5.0.1...node-near/5.0.2
[5.0.1]: https://github.com/subquery/subql-near/compare/node-near/5.0.0...node-near/5.0.1
[5.0.0]: https://github.com/subquery/subql-near/compare/node-near/4.3.0...node-near/5.0.0
[4.3.0]: https://github.com/subquery/subql-near/compare/node-near/4.2.0...node-near/4.3.0
[4.2.0]: https://github.com/subquery/subql-near/compare/node-near/4.1.1...node-near/4.2.0
[4.1.1]: https://github.com/subquery/subql-near/compare/node-near/4.1.0...node-near/4.1.1
[4.1.0]: https://github.com/subquery/subql-near/compare/node-near/4.0.5...node-near/4.1.0
[4.0.5]: https://github.com/subquery/subql-near/compare/node-near/4.0.4...node-near/4.0.5
[4.0.4]: https://github.com/subquery/subql-near/compare/node-near/4.0.1...node-near/4.0.4
[4.0.1]: https://github.com/subquery/subql-near/compare/node-near/4.0.0...node-near/4.0.1
[4.0.0]: https://github.com/subquery/subql-near/compare/node-near/3.12.0...node-near/4.0.0
[3.12.0]: https://github.com/subquery/subql-near/compare/node-near/3.11.1...node-near/3.12.0
[3.11.1]: https://github.com/subquery/subql-near/compare/node-near/3.11.0...node-near/3.11.1
[3.11.0]: https://github.com/subquery/subql-near/compare/node-near/3.10.0...node-near/3.11.0
[3.10.0]: https://github.com/subquery/subql-near/compare/node-near/3.9.1...node-near/3.10.0
[3.9.1]: https://github.com/subquery/subql-near/compare/node-near/3.9.0...node-near/3.9.1
[3.9.0]: https://github.com/subquery/subql-near/compare/node-near/3.8.1...node-near/3.9.0
[3.8.1]: https://github.com/subquery/subql-near/compare/node-near/3.8.0...node-near/3.8.1
[3.8.0]: https://github.com/subquery/subql-near/compare/node-near/3.5.1...node-near/3.8.0
[3.5.1]: https://github.com/subquery/subql-near/compare/node-near/3.5.0...node-near/3.5.1
[3.5.0]: https://github.com/subquery/subql-near/compare/node-near/3.4.6...node-near/3.5.0
[3.4.6]: https://github.com/subquery/subql-near/compare/node-near/3.4.5...node-near/3.4.6
[3.4.5]: https://github.com/subquery/subql-near/compare/node-near/3.4.4...node-near/3.4.5
[3.4.4]: https://github.com/subquery/subql-near/compare/node-near/3.4.3...node-near/3.4.4
[3.4.3]: https://github.com/subquery/subql-near/compare/node-near/3.4.2...node-near/3.4.3
[3.4.2]: https://github.com/subquery/subql-near/compare/node-near/3.4.1...node-near/3.4.2
[3.4.1]: https://github.com/subquery/subql-near/compare/node-near/3.4.0...node-near/3.4.1
[3.4.0]: https://github.com/subquery/subql-near/compare/node-near/3.3.0...node-near/3.4.0
[3.3.0]: https://github.com/subquery/subql-near/compare/node-near/3.2.0...node-near/3.3.0
[3.2.0]: https://github.com/subquery/subql-near/compare/node-near/3.1.1...node-near/3.2.0
[3.1.1]: https://github.com/subquery/subql-near/compare/node-near/3.1.0...node-near/3.1.1
[3.1.0]: https://github.com/subquery/subql-near/compare/node-near/3.0.0...node-near/3.1.0
[3.0.0]: https://github.com/subquery/subql-near/compare/node-near/2.10.2...node-near/3.0.0
[2.10.2]: https://github.com/subquery/subql-near/compare/node-near/2.10.1...node-near/2.10.2
[2.10.1]: https://github.com/subquery/subql-near/compare/node-near/2.10.0...node-near/2.10.1
[2.10.0]: https://github.com/subquery/subql-near/compare/node-near/2.8.0...node-near/2.10.0
[2.8.0]: https://github.com/subquery/subql-near/compare/node-near/2.6.1...node-near/2.8.0
[2.6.1]: https://github.com/subquery/subql-near/compare/node-near/2.6.0...node-near/2.6.1
[2.6.0]: https://github.com/subquery/subql-near/compare/node-near/2.5.2...node-near/2.6.0
[2.5.2]: https://github.com/subquery/subql-near/compare/node-near/2.5.1...node-near/2.5.2
[2.5.1]: https://github.com/subquery/subql-near/compare/node-near/2.5.0...node-near/2.5.1
[2.5.0]: https://github.com/subquery/subql-near/compare/node-near/2.3.1...node-near/2.5.0
[2.3.1]: https://github.com/subquery/subql-near/compare/node-near/2.3.0...node-near/2.3.1
[2.3.0]: https://github.com/subquery/subql-near/compare/node-near/2.1.1...node-near/2.3.0
