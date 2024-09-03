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
