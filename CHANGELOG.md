# Changelog

All notable changes to the Transcend CLI tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2024-04-23

### Changed

- Added logic to decrypt encrypted request identifiers to `cli-manual-enrichment-pull-identifiers`,
  `cli-request-export` and `cli-request-restart`. These commands now require minimum Sombra version of 7.180, and you must provide `sombraAuth` argument if using single-tenant Sombra.
