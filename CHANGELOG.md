<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Changelog](#changelog)
  - [[6.0.0] - 2024-09-03](#600---2024-09-03)
    - [Changed](#changed)
  - [[5.0.0] - 2024-04-23](#500---2024-04-23)
    - [Changed](#changed-1)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Changelog

All notable changes to the Transcend CLI tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.0.0] - 2025-07-10

The CLI has been overhauled to be easier to use as a full-featured command line application.

### Improvements

- All commands have `--help` flag to print help information. For example:

  ```console
  $ transcend consent update-consent-manager --help

  USAGE
    transcend consent update-consent-manager (--auth value) (--bundleTypes PRODUCTION|TEST) [--deploy] [--transcendUrl value]
    transcend consent update-consent-manager --help

  This command allows for updating Consent Manager to latest version. The consent manager bundle can also be deployed using this command.

  FLAGS
       --auth           The Transcend API key. Requires scopes: "Manage Consent Manager Developer Settings"
       --bundleTypes    The bundle types to deploy. Defaults to PRODUCTION,TEST.                            [PRODUCTION|TEST, separator = ,]
      [--deploy]        When true, deploy the Consent Manager after updating the version                    [default = false]
      [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting        [default = https://api.transcend.io]
    -h  --help           Print help information and exit
  ```

- Boolean arguments no longer need to have `=true` or `=false` strings explicitly passed to them. For example, rather than pass `--deploy=true`, you can now pass `--deploy` alone. Passing `--deploy=true` or `--deploy=false` is still supported, as well as other boolean values described [here](https://github.com/bloomberg/stricli/blob/58a10349b427d9e5e7d75bf1767898d095e8544c/packages/core/src/parameter/parser/boolean.ts#L21-L26). For booleans which default to true, you can also prefix `no` to the argument name. For example, `--noDeploy` is equivalent to `--deploy=false`.
- List arguments can either be passed as a comma-separated string or as several arguments. For example, `--bundleTypes=PRODUCTION,TEST` is equivalent to `--bundleTypes PRODUCTION --bundleTypes TEST`.

### Breaking Changes

All commands have been re-mapped to new commands under the `transcend` namespace.

| Old Command                                           | New Command                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `tr-build-xdi-sync-endpoint`                          | `transcend consent build-xdi-sync-endpoint`                            |
| `tr-consent-manager-service-json-to-yml`              | `transcend consent consent-manager-service-json-to-yml`                |
| `tr-consent-managers-to-business-entities`            | `transcend consent consent-managers-to-business-entities`              |
| `tr-cron-mark-identifiers-completed`                  | `transcend request cron mark-identifiers-completed`                    |
| `tr-cron-pull-identifiers`                            | `transcend request cron pull-identifiers`                              |
| `tr-derive-data-silos-from-data-flows`                | `transcend inventory derive-data-silos-from-data-flows`                |
| `tr-derive-data-silos-from-data-flows-cross-instance` | `transcend inventory derive-data-silos-from-data-flows-cross-instance` |
| `tr-discover-silos`                                   | `transcend inventory discover-silos`                                   |
| `tr-generate-api-keys`                                | `transcend admin generate-api-keys`                                    |
| `tr-manual-enrichment-pull-identifiers`               | `transcend request preflight pull-identifiers`                         |
| `tr-manual-enrichment-push-identifiers`               | `transcend request preflight push-identifiers`                         |
| `tr-mark-request-data-silos-completed`                | `transcend request system mark-request-data-silos-completed`           |
| `tr-pull`                                             | `transcend inventory pull`                                             |
| `tr-pull-consent-metrics`                             | `transcend consent pull-consent-metrics`                               |
| `tr-pull-consent-preferences`                         | `transcend consent pull-consent-preferences`                           |
| `tr-pull-datapoints`                                  | `transcend inventory pull-datapoints`                                  |
| `tr-pull-pull-unstructured-discovery-files`           | `transcend inventory pull-unstructured-discovery-files`                |
| `tr-push`                                             | `transcend inventory push`                                             |
| `tr-request-approve`                                  | `transcend request approve`                                            |
| `tr-request-cancel`                                   | `transcend request cancel`                                             |
| `tr-request-download-files`                           | `transcend request download-files`                                     |
| `tr-request-enricher-restart`                         | `transcend request enricher-restart`                                   |
| `tr-request-export`                                   | `transcend request export`                                             |
| `tr-request-mark-silent`                              | `transcend request mark-silent`                                        |
| `tr-request-notify-additional-time`                   | `transcend request notify-additional-time`                             |
| `tr-request-reject-unverified-identifiers`            | `transcend request reject-unverified-identifiers`                      |
| `tr-request-restart`                                  | `transcend request restart`                                            |
| `tr-request-upload`                                   | `transcend request upload`                                             |
| `tr-retry-request-data-silos`                         | `transcend request system retry-request-data-silos`                    |
| `tr-scan-packages`                                    | `transcend inventory scan-packages`                                    |
| `tr-skip-preflight-jobs`                              | `transcend request skip-preflight-jobs`                                |
| `tr-skip-request-data-silos`                          | `transcend request system skip-request-data-silos`                     |
| `tr-sync-ot`                                          | `transcend migration sync-ot`                                          |
| `tr-update-consent-manager`                           | `transcend consent update-consent-manager`                             |
| `tr-upload-consent-preferences`                       | `transcend consent upload-consent-preferences`                         |
| `tr-upload-cookies-from-csv`                          | `transcend consent upload-cookies-from-csv`                            |
| `tr-upload-data-flows-from-csv`                       | `transcend consent upload-data-flows-from-csv`                         |
| `tr-upload-preferences`                               | `transcend consent upload-preferences`                                 |

The previous arguments are the same, with one exception: for the `tr-upload-consent-preferences` and `tr-upload-preferences` commands, the `transcendUrl` argument has been renamed to `consentUrl`. The default value is the same—`https://consent.transcend.io` (for EU hosting)—and you can use `https://consent.us.transcend.io` for US hosting.

## [6.0.0] - 2024-09-03

### Changed

- Updates the shape of `transcend.yml` for the `consent-manager.experiences[0].purposes[*]`

Before:

```yml
consent-manager:
  ...
  experiences:
    - name: Unknown
      ...
      purposes:
        - name: Functional
        - name: SaleOfInfo
      optedOutPurposes:
         - name: SaleOfInfo
```

After:

```yml
consent-manager:
  ...
  experiences:
    - name: Unknown
      ...
      purposes:
        - trackingType: Functional
        - trackingType: SaleOfInfo
      optedOutPurposes:
        - trackingType: SaleOfInfo
```

- Updates the shape of `transcend.yml` for the `consent-manager.partitions` to be at top level `partitions`

Before:

```yml
consent-manager:
  ...
  partitions:
    - ...
```

After:

```yml
partitions: ...
```

## [5.0.0] - 2024-04-23

### Changed

- Added support for encrypted identifiers to `tr-manual-enricher-pull-identifiers` command.

  - Now that this command is using Sombra to decrypt request identifiers, you may need to provide the `--sombraAuth` argument. It's required when using self-hosted Sombra, but not for multi-tenant.

  ```
  Before:
    yarn tr-manual-enricher-pull-identifiers --auth=$TRANSCEND_API_KEY  \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv

  Now:
    yarn tr-manual-enricher-pull-identifiers --auth=$TRANSCEND_API_KEY  \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv
  ```

- Added support for encrypted identifiers to `tr-request-export` command.

  - Now that this command is using Sombra to decrypt request identifiers, you may need to provide the `--sombraAuth` argument. It's required when using self-hosted Sombra, but not for multi-tenant.

  ```
  Before:
    yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv

  Now:
    yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv
  ```

- Added support for encrypted identifiers to `tr-request-restart` command, used only when `--copyIdentifiers` argument is specified.

  - Now that this command is using Sombra to decrypt request identifiers, you may need to provide the `--sombraAuth` argument. It's required only when using `--copyIdentifiers` AND self-hosted Sombra, but is otherwise not required.

  ```
  Before:
    yarn tr-request-restart --auth=$TRANSCEND_API_KEY \
      --statuses=COMPILING,APPROVING --actions=ERASURE --copyIdentifiers=true

  Now:
    yarn tr-request-restart --auth=$TRANSCEND_API_KEY \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --statuses=COMPILING,APPROVING --actions=ERASURE --copyIdentifiers=true
  ```
