<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Changelog](#changelog)
- [Overview](#overview)
- [Installation](#installation)
- [transcend.yml](#transcendyml)
- [Usage](#usage)
  - [`transcend request approve`](#transcend-request-approve)
  - [`transcend request upload`](#transcend-request-upload)
  - [`transcend request download-files`](#transcend-request-download-files)
  - [`transcend request cancel`](#transcend-request-cancel)
  - [`transcend request restart`](#transcend-request-restart)
  - [`transcend request notify-additional-time`](#transcend-request-notify-additional-time)
  - [`transcend request mark-silent`](#transcend-request-mark-silent)
  - [`transcend request enricher-restart`](#transcend-request-enricher-restart)
  - [`transcend request reject-unverified-identifiers`](#transcend-request-reject-unverified-identifiers)
  - [`transcend request export`](#transcend-request-export)
  - [`transcend request skip-preflight-jobs`](#transcend-request-skip-preflight-jobs)
  - [`transcend request system mark-request-data-silos-completed`](#transcend-request-system-mark-request-data-silos-completed)
  - [`transcend request system retry-request-data-silos`](#transcend-request-system-retry-request-data-silos)
  - [`transcend request system skip-request-data-silos`](#transcend-request-system-skip-request-data-silos)
  - [`transcend request preflight pull-identifiers`](#transcend-request-preflight-pull-identifiers)
  - [`transcend request preflight push-identifiers`](#transcend-request-preflight-push-identifiers)
  - [`transcend request cron pull-identifiers`](#transcend-request-cron-pull-identifiers)
  - [`transcend request cron mark-identifiers-completed`](#transcend-request-cron-mark-identifiers-completed)
  - [`transcend consent build-xdi-sync-endpoint`](#transcend-consent-build-xdi-sync-endpoint)
  - [`transcend consent pull-consent-metrics`](#transcend-consent-pull-consent-metrics)
  - [`transcend consent pull-consent-preferences`](#transcend-consent-pull-consent-preferences)
  - [`transcend consent update-consent-manager`](#transcend-consent-update-consent-manager)
  - [`transcend consent upload-consent-preferences`](#transcend-consent-upload-consent-preferences)
  - [`transcend consent upload-cookies-from-csv`](#transcend-consent-upload-cookies-from-csv)
  - [`transcend consent upload-data-flows-from-csv`](#transcend-consent-upload-data-flows-from-csv)
  - [`transcend consent upload-preferences`](#transcend-consent-upload-preferences)
  - [`transcend inventory pull`](#transcend-inventory-pull)
    - [Scopes](#scopes)
    - [Usage](#usage-1)
  - [`transcend inventory push`](#transcend-inventory-push)
    - [Scopes](#scopes-1)
    - [Usage](#usage-2)
    - [CI Integration](#ci-integration)
    - [Dynamic Variables](#dynamic-variables)
  - [`transcend inventory scan-packages`](#transcend-inventory-scan-packages)
  - [`transcend inventory discover-silos`](#transcend-inventory-discover-silos)
    - [Usage](#usage-3)
  - [`transcend inventory pull-datapoints`](#transcend-inventory-pull-datapoints)
  - [`transcend inventory pull-unstructured-discovery-files`](#transcend-inventory-pull-unstructured-discovery-files)
  - [`transcend inventory derive-data-silos-from-data-flows`](#transcend-inventory-derive-data-silos-from-data-flows)
  - [`transcend inventory derive-data-silos-from-data-flows-cross-instance`](#transcend-inventory-derive-data-silos-from-data-flows-cross-instance)
  - [`transcend inventory consent-manager-service-json-to-yml`](#transcend-inventory-consent-manager-service-json-to-yml)
  - [`transcend inventory consent-managers-to-business-entities`](#transcend-inventory-consent-managers-to-business-entities)
  - [`transcend admin generate-api-keys`](#transcend-admin-generate-api-keys)
    - [Usage](#usage-4)
  - [`transcend migration sync-ot`](#transcend-migration-sync-ot)
- [Prompt Manager](#prompt-manager)
- [Proxy usage](#proxy-usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Changelog

To stay up to date on breaking changes to the CLI between major version updates, please refer to [CHANGELOG.md](CHANGELOG.md).

## Overview

A command line interface that allows you to programatically interact with the Transcend.

## Installation

This package is distributed through npm, and assumes an installation of [npm and Node](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

```sh
npm install --global @transcend-io/cli
transcend --help
```

You can also run the CLI using npx:

```sh
npx @transcend-io/cli -- transcend --help
```

Note

_The CLI commands which interact with Transcend's API will default to using Transcend's EU backend. To use these commands with the US backend, you will need to add the flag --transcendUrl=https://api.us.transcend.io. You can also set the environment variable `TRANSCEND_API_URL=https://api.us.transcend.io`_

## transcend.yml

Within your git repositories, you can define a file `transcend.yml`. This file allows you define part of your Data Map in code. Using the CLI, you can sync that configuration back to the Transcend Admin Dashboard (https://app.transcend.io/privacy-requests/connected-services).

You can find various examples for your `transcend.yml` file in the [examples/](./examples/) folder. If you are looking for a starting point to copy and paste, [simple.yml](./examples/simple.yml) is a good place to start. This file is annotated with links and documentations that new members of your team can use if they come across the file.

The API for this YAML file can be found in [./src/codecs.ts](./src/codecs.ts) under the variable named "TranscendInput". The shape of the YAML file will be type-checked every time a command is run.

By default, your editor or IDE should recognize `transcend.yml` and validate it against our latest published [JSON schema](./transcend-yml-schema-latest.json). This is dependent on whether your editor uses [yaml-language-server](https://github.com/redhat-developer/yaml-language-server), such as through the [VS Code YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml).

Your editor will use the latest version's schema. To pin the `transcend.yml` schema to a previous major version, include this at the top of your file (and change `v4` to your target major version):

```yml
# yaml-language-server: $schema=https://raw.githubusercontent.com/transcend-io/cli/main/transcend-yml-schema-v4.json
```

The structure of `transcend.yml` looks something like the following:

```yaml
# Manage at: https://app.transcend.io/infrastructure/api-keys
# See https://docs.transcend.io/docs/authentication
# Define API keys that may be shared across data silos
# in the data map. When creating new data silos through the YAML
# CLI, it is possible to specify which API key should be associated
# with the newly created data silo.
api-keys:
  - title: Webhook Key
  - title: Analytics Key

# Manage at: https://app.transcend.io/privacy-requests/identifiers
# See https://docs.transcend.io/docs/identity-enrichment
# Define enricher or pre-flight check webhooks that will be executed
# prior to privacy request workflows. Some examples may include:
#   - identity enrichment: look up additional identifiers for that user.
#                          i.e. map an email address to a user ID
#   - fraud check: auto-cancel requests if the user is flagged for fraudulent behavior
#   - customer check: auto-cancel request for some custom business criteria
enrichers:
  - title: Basic Identity Enrichment
    description: Enrich an email address to the userId and phone number
    url: https://example.acme.com/transcend-enrichment-webhook
    input-identifier: email
    output-identifiers:
      - userId
      - phone
      - myUniqueIdentifier
  - title: Fraud Check
    description: Ensure the email address is not marked as fraudulent
    url: https://example.acme.com/transcend-fraud-check
    input-identifier: email
    output-identifiers:
      - email
    privacy-actions:
      - ERASURE

# Manage at: https://app.transcend.io/privacy-requests/connected-services
# See https://docs.transcend.io/docs/the-data-map#data-silos
# Define the data silos in your data map. A data silo can be a database,
# or a web service that may use a collection of different data stores under the hood.
data-silos:
  # Note: title is the only required top-level field for a data silo
  - title: Redshift Data Warehouse
    description: The mega-warehouse that contains a copy over all SQL backed databases
    integrationName: server
    url: https://example.acme.com/transcend-webhook
    api-key-title: Webhook Key
    data-subjects:
      - customer
      - employee
      - newsletter-subscriber
      - b2b-contact
    identity-keys:
      - email
      - userId
    deletion-dependencies:
      - Identity Service
    owners:
      - alice@transcend.io
    datapoints:
      - title: Webhook Notification
        key: _global
        privacy-actions:
          - ACCESS
          - ERASURE
          - SALE_OPT_OUT
      - title: User Model
        description: The centralized user model user
        key: users
        privacy-actions:
          - ACCESS
        fields:
          - key: firstName
            title: First Name
            description: The first name of the user, inputted during onboarding
          - key: email
            title: Email
            description: The email address of the user
```

## Usage

<!-- COMMANDS_START -->

### `transcend request approve`

```txt
USAGE
  transcend request approve (--auth value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) [--origins PRIVACY_CENTER|ADMIN_DASHBOARD|API|SHOPIFY] [--silentModeBefore value] [--createdAtBefore value] [--createdAtAfter value] [--transcendUrl value] [--concurrency value]
  transcend request approve --help

Bulk approve a set of privacy requests from the DSR Automation -> Incoming Requests tab.

FLAGS
      --auth               The Transcend API key. Requires scopes: "Request Approval and Communication", "View Incoming Requests", "Manage Request Compilation"
      --actions            The request actions to approve                                                                                                       [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--origins]           The request origins to approve                                                                                                       [PRIVACY_CENTER|ADMIN_DASHBOARD|API|SHOPIFY, separator = ,]
     [--silentModeBefore]  Any requests made before this date should be marked as silent mode
     [--createdAtBefore]   Approve requests that were submitted before this time
     [--createdAtAfter]    Approve requests that were submitted after this time
     [--transcendUrl]      URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                         [default = https://api.transcend.io]
     [--concurrency]       The concurrency to use when uploading requests in parallel                                                                           [default = 50]
  -h  --help               Print help information and exit
```

### `transcend request upload`

```txt
USAGE
  transcend request upload (--auth value) [--file value] [--transcendUrl value] [--cacheFilepath value] [--requestReceiptFolder value] [--sombraAuth value] [--concurrency value] [--attributes value] [--isTest] [--isSilent] [--skipSendingReceipt] [--emailIsVerified] [--skipFilterStep] [--dryRun] [--debug] [--defaultPhoneCountryCode value]
  transcend request upload --help

Upload a set of requests from a CSV.

This command prompts you to map the shape of the CSV to the shape of the Transcend API. There is no requirement for the shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file that allows for the mappings to be preserved between runs.

FLAGS
      --auth                                  The Transcend API key. Requires scopes: "Submit New Data Subject Request", "View Identity Verification Settings", "View Global Attributes"
     [--file]                                 Path to the CSV file of requests to upload                                                                                                 [default = ./requests.csv]
     [--transcendUrl]                         URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                               [default = https://api.transcend.io]
     [--cacheFilepath]                        The path to the JSON file encoding the metadata used to map the CSV shape to Transcend API                                                 [default = ./transcend-privacy-requests-cache.json]
     [--requestReceiptFolder]                 The path to the folder where receipts of each upload are stored                                                                            [default = ./privacy-request-upload-receipts]
     [--sombraAuth]                           The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--concurrency]                          The concurrency to use when uploading requests in parallel                                                                                 [default = 50]
     [--attributes]                           Tag all of the requests with the following attributes. Format: key1:value1;value2,key2:value3;value4                                       [default = Tags:transcend-cli]
     [--isTest]                               Flag whether the requests being uploaded are test requests or regular requests                                                             [default = false]
     [--isSilent/--noIsSilent]                Flag whether the requests being uploaded should be submitted in silent mode                                                                [default = true]
     [--skipSendingReceipt]                   Flag whether to skip sending of the receipt email                                                                                          [default = false]
     [--emailIsVerified/--noEmailIsVerified]  Indicate whether the email address being uploaded is pre-verified. Set to false to send a verification email                               [default = true]
     [--skipFilterStep]                       When true, skip the interactive step to filter down the CSV                                                                                [default = false]
     [--dryRun]                               When true, perform a dry run of the upload instead of calling the API to submit the requests                                               [default = false]
     [--debug]                                Debug logging                                                                                                                              [default = false]
     [--defaultPhoneCountryCode]              When uploading phone numbers, if the phone number is missing a country code, assume this country code                                      [default = 1]
  -h  --help                                  Print help information and exit
```

### `transcend request download-files`

```txt
USAGE
  transcend request download-files (--auth value) [--sombraAuth value] [--concurrency value] [--requestIds value]... [--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED] [--folderPath value] [--createdAtBefore value] [--createdAtAfter value] [--approveAfterDownload] [--transcendUrl value]
  transcend request download-files --help

Download the files associated with a Data Subject Access Request (DSAR) from DSR Automation -> Incoming Requests tab.

FLAGS
      --auth                   The Transcend API key. Requires scopes: "View the Request Compilation", "View Incoming Requests", "Request Approval and Communication"
     [--sombraAuth]            The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--concurrency]           The concurrency to use when downloading requests in parallel                                                                           [default = 10]
     [--requestIds]...         Specify the specific request IDs to download                                                                                           [separator = ,]
     [--statuses]              The request statuses to download. Comma-separated list. Defaults to APPROVING,DOWNLOADABLE.                                            [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--folderPath]            The folder to download files to                                                                                                        [default = ./dsr-files]
     [--createdAtBefore]       Download requests that were submitted before this time
     [--createdAtAfter]        Download requests that were submitted after this time
     [--approveAfterDownload]  If the request is in status=APPROVING, approve the request after its downloaded                                                        [default = false]
     [--transcendUrl]          URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                           [default = https://api.transcend.io]
  -h  --help                   Print help information and exit
```

### `transcend request cancel`

```txt
USAGE
  transcend request cancel (--auth value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) [--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED] [--requestIds value]... [--silentModeBefore value] [--createdAtBefore value] [--createdAtAfter value] [--cancellationTitle value] [--transcendUrl value] [--concurrency value]
  transcend request cancel --help

Bulk cancel a set of privacy requests from the DSR Automation -> Incoming Requests tab.

FLAGS
      --auth                The Transcend API key. Requires scopes: "View Incoming Requests", "Request Approval and Communication"
      --actions             The request actions to cancel                                                                          [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--statuses]           The request statuses to cancel. Comma-separated list.                                                  [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--requestIds]...      Specify the specific request IDs to cancel                                                             [separator = ,]
     [--silentModeBefore]   Any requests made before this date should be marked as silent mode for canceling to skip email sending
     [--createdAtBefore]    Cancel requests that were submitted before this time
     [--createdAtAfter]     Cancel requests that were submitted after this time
     [--cancellationTitle]  The title of the email template that should be sent to the requests upon cancelation                   [default = Request Canceled]
     [--transcendUrl]       URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                           [default = https://api.transcend.io]
     [--concurrency]        The concurrency to use when uploading requests in parallel                                             [default = 50]
  -h  --help                Print help information and exit
```

### `transcend request restart`

```txt
USAGE
  transcend request restart (--auth value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) (--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED) [--transcendUrl value] [--requestReceiptFolder value] [--sombraAuth value] [--concurrency value] [--requestIds value]... [--emailIsVerified] [--createdAt value] [--silentModeBefore value] [--createdAtBefore value] [--createdAtAfter value] [--sendEmailReceipt] [--copyIdentifiers] [--skipWaitingPeriod]
  transcend request restart --help

Bulk update a set of privacy requests based on a set of request filters.

FLAGS
      --auth                                  The Transcend API key. Requires scopes: "Submit New Data Subject Request", "View the Request Compilation"
      --actions                               The request actions to restart                                                                            [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
      --statuses                              The request statuses to restart                                                                           [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--transcendUrl]                         URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                              [default = https://api.transcend.io]
     [--requestReceiptFolder]                 The path to the folder where receipts of each upload are stored                                           [default = ./privacy-request-upload-receipts]
     [--sombraAuth]                           The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--concurrency]                          The concurrency to use when uploading requests in parallel                                                [default = 15]
     [--requestIds]...                        Specify the specific request IDs to restart                                                               [separator = ,]
     [--emailIsVerified/--noEmailIsVerified]  Indicate whether the primary email address is verified. Set to false to send a verification email         [default = true]
     [--createdAt]                            Restart requests that were submitted before a specific date
     [--silentModeBefore]                     Requests older than this date should be marked as silent mode
     [--createdAtBefore]                      Restart requests that were submitted before this time
     [--createdAtAfter]                       Restart requests that were submitted after this time
     [--sendEmailReceipt]                     Send email receipts to the restarted requests                                                             [default = false]
     [--copyIdentifiers]                      Copy over all enriched identifiers from the initial request                                               [default = false]
     [--skipWaitingPeriod]                    Skip queued state of request and go straight to compiling                                                 [default = false]
  -h  --help                                  Print help information and exit
```

### `transcend request notify-additional-time`

```txt
USAGE
  transcend request notify-additional-time (--auth value) (--createdAtBefore value) [--createdAtAfter value] [--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD] [--daysLeft value] [--days value] [--requestIds value]... [--emailTemplate value] [--transcendUrl value] [--concurrency value]
  transcend request notify-additional-time --help

Bulk notify a set of privacy requests from the DSR Automation -> Incoming Requests tab that more time is needed to complete the request. Note any request in silent mode will not be emailed.

FLAGS
      --auth             The Transcend API key. Requires scopes: "View Incoming Requests", "Request Approval and Communication"
      --createdAtBefore  Notify requests that are open but submitted before this time
     [--createdAtAfter]  Notify requests that are open but submitted after this time
     [--actions]         The request actions to notify                                                                          [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--daysLeft]        Only notify requests that have less than this number of days until they are considered expired         [default = 10]
     [--days]            The number of days to adjust the expiration of the request to                                          [default = 45]
     [--requestIds]...   Specify the specific request IDs to notify                                                             [separator = ,]
     [--emailTemplate]   The title of the email template that should be sent to the requests                                    [default = Additional Time Needed]
     [--transcendUrl]    URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                           [default = https://api.transcend.io]
     [--concurrency]     The concurrency to use when uploading requests in parallel                                             [default = 50]
  -h  --help             Print help information and exit
```

### `transcend request mark-silent`

```txt
USAGE
  transcend request mark-silent (--auth value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) [--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED] [--requestIds value]... [--createdAtBefore value] [--createdAtAfter value] [--transcendUrl value] [--concurrency value]
  transcend request mark-silent --help

Bulk update a set of privacy requests from the DSR Automation -> Incoming Requests tab to be in silent mode.

FLAGS
      --auth              The Transcend API key. Requires scopes: "Manage Request Compilation"
      --actions           The request actions to mark silent                                                                                                                               [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--statuses]         The request statuses to mark silent. Comma-separated list. Defaults to REQUEST_MADE,WAITING,ENRICHING,COMPILING,DELAYED,APPROVING,SECONDARY,SECONDARY_APPROVING. [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--requestIds]...    Specify the specific request IDs to mark silent                                                                                                                  [separator = ,]
     [--createdAtBefore]  Mark silent requests that were submitted before this time
     [--createdAtAfter]   Mark silent requests that were submitted after this time
     [--transcendUrl]     URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                                                     [default = https://api.transcend.io]
     [--concurrency]      The concurrency to use when uploading requests in parallel                                                                                                       [default = 50]
  -h  --help              Print help information and exit
```

### `transcend request enricher-restart`

```txt
USAGE
  transcend request enricher-restart (--auth value) (--enricherId value) [--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD] [--requestEnricherStatuses QUEUED|WAITING|SKIPPED|ERROR|RESOLVED|ACTION_REQUIRED|REMOTE_PROCESSING|WAITING_ON_DEPENDENCIES|POLLING] [--transcendUrl value] [--concurrency value] [--requestIds value]... [--createdAtBefore value] [--createdAtAfter value]
  transcend request enricher-restart --help

Bulk restart a particular enricher across a series of DSRs.

The API key needs the following scopes:
- Manage Request Compilation

FLAGS
      --auth                      The Transcend API key. Requires scopes: "Manage Request Compilation"
      --enricherId                The ID of the enricher to restart
     [--actions]                  The request action to restart                                                [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--requestEnricherStatuses]  The request enricher statuses to restart                                     [QUEUED|WAITING|SKIPPED|ERROR|RESOLVED|ACTION_REQUIRED|REMOTE_PROCESSING|WAITING_ON_DEPENDENCIES|POLLING, separator = ,]
     [--transcendUrl]             URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
     [--concurrency]              The concurrency to use when uploading requests in parallel                   [default = 15]
     [--requestIds]...            Specify the specific request IDs to restart                                  [separator = ,]
     [--createdAtBefore]          Restart requests that were submitted before this time
     [--createdAtAfter]           Restart requests that were submitted after this time
  -h  --help                      Print help information and exit
```

### `transcend request reject-unverified-identifiers`

```txt
USAGE
  transcend request reject-unverified-identifiers (--auth value) (--identifierNames value)... [--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD] [--transcendUrl value]
  transcend request reject-unverified-identifiers --help

Bulk clear out any request identifiers that are unverified.

FLAGS
      --auth                The Transcend API key. Requires scopes: "Manage Request Compilation"
      --identifierNames...  The names of identifiers to clear out                                        [separator = ,]
     [--actions]            The request action to restart                                                [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--transcendUrl]       URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help                Print help information and exit
```

### `transcend request export`

```txt
USAGE
  transcend request export (--auth value) [--sombraAuth value] [--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD] [--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED] [--transcendUrl value] [--file value] [--concurrency value] [--createdAtBefore value] [--createdAtAfter value] [--showTests] [--pageLimit value]
  transcend request export --help

Export privacy requests and request identifiers to a CSV file.

FLAGS
      --auth                      The Transcend API key. Requires scopes: "View Incoming Requests", "View the Request Compilation"
     [--sombraAuth]               The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--actions]                  The request actions to export                                                                    [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--statuses]                 The request statuses to export                                                                   [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--transcendUrl]             URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                     [default = https://api.transcend.io]
     [--file]                     Path to the CSV file where identifiers will be written to                                        [default = ./transcend-request-export.csv]
     [--concurrency]              The concurrency to use when uploading requests in parallel                                       [default = 100]
     [--createdAtBefore]          Pull requests that were submitted before this time
     [--createdAtAfter]           Pull requests that were submitted after this time
     [--showTests/--noShowTests]  Filter for test requests or production requests - when not provided, pulls both
     [--pageLimit]                The page limit to use when pulling in pages of requests                                          [default = 100]
  -h  --help                      Print help information and exit
```

### `transcend request skip-preflight-jobs`

```txt
USAGE
  transcend request skip-preflight-jobs (--auth value) (--enricherIds value)... [--transcendUrl value]
  transcend request skip-preflight-jobs --help

This command allows for bulk skipping preflight checks.

FLAGS
      --auth            The Transcend API key. Requires scopes: "Manage Request Compilation"
      --enricherIds...  The ID of the enrichers to skip privacy request jobs for                     [separator = ,]
     [--transcendUrl]   URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help            Print help information and exit
```

### `transcend request system mark-request-data-silos-completed`

```txt
USAGE
  transcend request system mark-request-data-silos-completed (--auth value) (--dataSiloId value) [--file value] [--transcendUrl value]
  transcend request system mark-request-data-silos-completed --help

This command takes in a CSV of Request IDs as well as a Data Silo ID and marks all associated privacy request jobs as completed.
This command is useful with the "Bulk Response" UI. The CSV is expected to have 1 column named "Request Id".

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Request Compilation"
      --dataSiloId     The ID of the data silo to pull in
     [--file]          Path to the CSV file where identifiers will be written to. The CSV is expected to have 1 column named "Request Id". [default = ./request-identifiers.csv]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                        [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

### `transcend request system retry-request-data-silos`

```txt
USAGE
  transcend request system retry-request-data-silos (--auth value) (--dataSiloId value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) [--transcendUrl value]
  transcend request system retry-request-data-silos --help

This command allows for bulk restarting a set of data silos jobs for open privacy requests. This is equivalent to clicking the "Wipe and Retry" button for a particular data silo across a set of privacy requests.

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Request Compilation"
      --dataSiloId     The ID of the data silo to pull in
      --actions        The request actions to restart                                               [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

### `transcend request system skip-request-data-silos`

```txt
USAGE
  transcend request system skip-request-data-silos (--auth value) (--dataSiloId value) [--transcendUrl value] (--statuses REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED) [--status SKIPPED|RESOLVED]
  transcend request system skip-request-data-silos --help

This command allows for bulk skipping all open privacy request jobs for a particular data silo. This command is useful if you want to disable a data silo and then clear out any active privacy requests that are still queued up for that data silo.

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Request Compilation"
      --dataSiloId     The ID of the data silo to skip privacy request jobs for
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
      --statuses       The request statuses to skip                                                 [REQUEST_MADE|FAILED_VERIFICATION|ENRICHING|ON_HOLD|WAITING|COMPILING|APPROVING|DELAYED|COMPLETED|DOWNLOADABLE|VIEW_CATEGORIES|CANCELED|SECONDARY|SECONDARY_COMPLETED|SECONDARY_APPROVING|REVOKED, separator = ,]
     [--status]        The status to set the request data silo job to                               [SKIPPED|RESOLVED, default = SKIPPED]
  -h  --help           Print help information and exit
```

### `transcend request preflight pull-identifiers`

```txt
USAGE
  transcend request preflight pull-identifiers (--auth value) [--sombraAuth value] [--transcendUrl value] [--file value] [--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD] [--concurrency value]
  transcend request preflight pull-identifiers --help

This command pulls down the set of privacy requests that are currently pending manual enrichment.

This is useful for the following workflow:

1. Pull identifiers to CSV:
   transcend request preflight pull-identifiers --file=./enrichment-requests.csv
2. Fill out the CSV with additional identifiers
3. Push updated back to Transcend
   transcend request preflight push-identifiers --file=./enrichment-requests.csv

FLAGS
      --auth           The Transcend API key. Requires scopes: "View Incoming Requests", "View the Request Compilation"
     [--sombraAuth]    The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                     [default = https://api.transcend.io]
     [--file]          Path to the CSV file where requests will be written to                                           [default = ./manual-enrichment-identifiers.csv]
     [--actions]       The request actions to pull for                                                                  [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--concurrency]   The concurrency to use when uploading requests in parallel                                       [default = 100]
  -h  --help           Print help information and exit
```

### `transcend request preflight push-identifiers`

```txt
USAGE
  transcend request preflight push-identifiers (--auth value) (--enricherId value) [--sombraAuth value] [--transcendUrl value] [--file value] [--markSilent] [--concurrency value]
  transcend request preflight push-identifiers --help

This command push up a set of identifiers for a set of requests pending manual enrichment.

This is useful for the following workflow:

1. Pull identifiers to CSV:
   transcend request preflight pull-identifiers --file=./enrichment-requests.csv
2. Fill out the CSV with additional identifiers
3. Push updated back to Transcend
   transcend request preflight push-identifiers --file=./enrichment-requests.csv

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Request Identity Verification", "Manage Request Compilation"
      --enricherId     The ID of the Request Enricher to upload to
     [--sombraAuth]    The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                 [default = https://api.transcend.io]
     [--file]          Path to the CSV file where requests will be written to                                                       [default = ./manual-enrichment-identifiers.csv]
     [--markSilent]    When true, set requests into silent mode before enriching                                                    [default = false]
     [--concurrency]   The concurrency to use when uploading requests in parallel                                                   [default = 100]
  -h  --help           Print help information and exit
```

### `transcend request cron pull-identifiers`

```txt
USAGE
  transcend request cron pull-identifiers (--auth value) (--dataSiloId value) (--actions AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD) [--file value] [--transcendUrl value] [--sombraAuth value] [--pageLimit value] [--skipRequestCount] [--chunkSize value]
  transcend request cron pull-identifiers --help

If you are using the cron job integration, you can run this command to pull the outstanding identifiers for the data silo to a CSV.

For large datasets, the output will be automatically split into multiple CSV files to avoid file system size limits. Use the --chunkSize parameter to control the maximum number of rows per file.

Read more at https://docs.transcend.io/docs/integrations/cron-job-integration.

FLAGS
      --auth               The Transcend API key. This key must be associated with the data silo(s) being operated on. No scopes are required for this command.
      --dataSiloId         The ID of the data silo to pull in
      --actions            The request actions to restart                                                                                                                                                                                                                                                                                          [AUTOMATED_DECISION_MAKING_OPT_OUT|USE_OF_SENSITIVE_INFORMATION_OPT_OUT|CONTACT_OPT_OUT|SALE_OPT_OUT|TRACKING_OPT_OUT|CUSTOM_OPT_OUT|AUTOMATED_DECISION_MAKING_OPT_IN|USE_OF_SENSITIVE_INFORMATION_OPT_IN|SALE_OPT_IN|TRACKING_OPT_IN|CONTACT_OPT_IN|CUSTOM_OPT_IN|ACCESS|ERASURE|RECTIFICATION|RESTRICTION|BUSINESS_PURPOSE|PLACE_ON_LEGAL_HOLD|REMOVE_FROM_LEGAL_HOLD, separator = ,]
     [--file]              Path to the CSV file where identifiers will be written to                                                                                                                                                                                                                                                               [default = ./cron-identifiers.csv]
     [--transcendUrl]      URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                                                                                                                                                                                                            [default = https://api.transcend.io]
     [--sombraAuth]        The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--pageLimit]         The page limit to use when pulling in pages of identifiers                                                                                                                                                                                                                                                              [default = 100]
     [--skipRequestCount]  Whether to skip the count of all outstanding requests. This is required to render the progress bar, but can take a long time to run if you have a large number of outstanding requests to process. In that case, we recommend setting skipRequestCount=true so that you can still proceed with fetching the identifiers [default = false]
     [--chunkSize]         Maximum number of rows per CSV file. For large datasets, the output will be automatically split into multiple files to avoid file system size limits. Each file will contain at most this many rows                                                                                                                     [default = 10000]
  -h  --help               Print help information and exit
```

### `transcend request cron mark-identifiers-completed`

```txt
USAGE
  transcend request cron mark-identifiers-completed (--auth value) (--dataSiloId value) [--file value] [--transcendUrl value] [--sombraAuth value]
  transcend request cron mark-identifiers-completed --help

This command takes the output of "transcend request cron pull-identifiers" and notifies Transcend that all of the requests in the CSV have been processed.
This is used in the workflow like:

1. Pull identifiers to CSV:
   transcend request cron pull-identifiers --auth=$TRANSCEND_API_KEY --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f --actions=ERASURE --file=./outstanding-requests.csv
2. Run your process to operate on that CSV of requests.
3. Notify Transcend of completion
   transcend request cron mark-identifiers-completed --auth=$TRANSCEND_API_KEY --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f --file=./outstanding-requests.csv

Read more at https://docs.transcend.io/docs/integrations/cron-job-integration.

FLAGS
      --auth           The Transcend API key. This key must be associated with the data silo(s) being operated on. No scopes are required for this command.
      --dataSiloId     The ID of the data silo to pull in
     [--file]          Path to the CSV file where identifiers will be written to                                                                            [default = ./cron-identifiers.csv]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                         [default = https://api.transcend.io]
     [--sombraAuth]    The Sombra internal key, use for additional authentication when self-hosting Sombra
  -h  --help           Print help information and exit
```

### `transcend consent build-xdi-sync-endpoint`

```txt
USAGE
  transcend consent build-xdi-sync-endpoint (--auth value) (--xdiLocation value) [--file value] [--removeIpAddresses] [--domainBlockList value] [--xdiAllowedCommands value] [--transcendUrl value]
  transcend consent build-xdi-sync-endpoint --help

This command allows for building of the XDI Sync Endpoint across a set of Transcend accounts.

FLAGS
      --auth                                      The Transcend API key. Requires scopes: "View Consent Manager"
      --xdiLocation                               The location of the XDI that will be loaded by the generated sync endpoint
     [--file]                                     The HTML file path where the sync endpoint should be written                             [default = ./sync-endpoint.html]
     [--removeIpAddresses/--noRemoveIpAddresses]  When true, remove IP addresses from the domain list                                      [default = true]
     [--domainBlockList]                          The set of domains that should be excluded from the sync endpoint. Comma-separated list. [default = localhost]
     [--xdiAllowedCommands]                       The allowed set of XDI commands                                                          [default = ConsentManager:Sync]
     [--transcendUrl]                             URL of the Transcend backend. Use https://api.us.transcend.io for US hosting             [default = https://api.transcend.io]
  -h  --help                                      Print help information and exit
```

### `transcend consent pull-consent-metrics`

```txt
USAGE
  transcend consent pull-consent-metrics (--auth value) (--start value) [--end value] [--folder value] [--bin value] [--transcendUrl value]
  transcend consent pull-consent-metrics --help

This command allows for pulling consent manager metrics for a Transcend account, or a set of Transcend accounts.

By default, the consent metrics will be written to a folder named `consent-metrics` within the directory where you run the command. You can override the location that these CSVs are written to using the flag `--folder=./my-folder/`. This folder will contain a set of CSV files:

- `CONSENT_CHANGES_TIMESERIES_optIn.csv` -> this is a feed containing the number of explicit opt in events that happen - these are calls to `airgap.setConsent(event, { SaleOfInfo: true });`
- `CONSENT_CHANGES_TIMESERIES_optOut.csv` -> this is a feed containing the number of explicit opt out events that happen - these are calls to `airgap.setConsent(event, { SaleOfInfo: false });`
- `CONSENT_SESSIONS_BY_REGIME_Default.csv` -> this contains the number of sessions detected for the bin period
- `PRIVACY_SIGNAL_TIMESERIES_DNT.csv` -> the number of DNT signals detected.
- `PRIVACY_SIGNAL_TIMESERIES_GPC.csv` -> the number of GPC signals detected.

FLAGS
      --auth           The Transcend API key. Requires scopes: "View Consent Manager"
      --start          The start date to pull metrics from
     [--end]           The end date to pull metrics until
     [--folder]        The folder to save metrics to                                                [default = ./consent-metrics/]
     [--bin]           The bin metric when pulling data (1h or 1d)                                  [default = 1d]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

### `transcend consent pull-consent-preferences`

```txt
USAGE
  transcend consent pull-consent-preferences (--auth value) (--partition value) [--sombraAuth value] [--file value] [--transcendUrl value] [--timestampBefore value] [--timestampAfter value] [--identifiers value]... [--concurrency value]
  transcend consent pull-consent-preferences --help

This command allows for pull of consent preferences from the Managed Consent Database.

FLAGS
      --auth              The Transcend API key. Requires scopes: "View Managed Consent Database Admin API"
      --partition         The partition key to download consent preferences to
     [--sombraAuth]       The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--file]             Path to the CSV file to save preferences to                                         [default = ./preferences.csv]
     [--transcendUrl]     URL of the Transcend backend. Use https://api.us.transcend.io for US hosting        [default = https://api.transcend.io]
     [--timestampBefore]  Filter for consents updated this time
     [--timestampAfter]   Filter for consents updated after this time
     [--identifiers]...   Filter for specific identifiers                                                     [separator = ,]
     [--concurrency]      The concurrency to use when downloading consents in parallel                        [default = 100]
  -h  --help              Print help information and exit
```

Each row in the CSV will include:

| Argument       | Description                                                                                               | Type                      | Default | Required |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | -------- |
| userId         | Unique ID identifying the user that the preferences ar efor                                               | string                    | N/A     | true     |
| timestamp      | Timestamp for when consent was collected for that user                                                    | string - timestamp        | N/A     | true     |
| purposes       | JSON map from consent purpose name -> boolean indicating whether user has opted in or out of that purpose | {[k in string]: boolean } | {}      | true     |
| airgapVersion  | Version of airgap where consent was collected                                                             | string                    | N/A     | false    |
| [purpose name] | Each consent purpose from `purposes` is also included in a column                                         | boolean                   | N/A     | false    |
| tcf            | IAB TCF string                                                                                            | string - TCF              | N/A     | false    |
| gpp            | IAB GPP string                                                                                            | string - GPP              | N/A     | false    |

### `transcend consent update-consent-manager`

```txt
USAGE
  transcend consent update-consent-manager (--auth value) (--bundleTypes PRODUCTION|TEST) [--deploy] [--transcendUrl value]
  transcend consent update-consent-manager --help

This command allows for updating Consent Manager to latest version. The Consent Manager bundle can also be deployed using this command.

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Consent Manager Developer Settings"
      --bundleTypes    The bundle types to deploy. Defaults to PRODUCTION,TEST.                            [PRODUCTION|TEST, separator = ,]
     [--deploy]        When true, deploy the Consent Manager after updating the version                    [default = false]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting        [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

### `transcend consent upload-consent-preferences`

```txt
USAGE
  transcend consent upload-consent-preferences (--base64EncryptionKey value) (--base64SigningKey value) (--partition value) [--file value] [--consentUrl value] [--concurrency value]
  transcend consent upload-consent-preferences --help

This command allows for updating of consent preferences to the Managed Consent Database.

FLAGS
      --base64EncryptionKey  The encryption key used to encrypt the userId
      --base64SigningKey     The signing key used to prove authentication of consent request
      --partition            The partition key to download consent preferences to
     [--file]                The file to pull consent preferences from                                                [default = ./preferences.csv]
     [--consentUrl]          URL of the Transcend consent backend. Use https://consent.us.transcend.io for US hosting [default = https://consent.transcend.io]
     [--concurrency]         The concurrency to use when uploading requests in parallel                               [default = 100]
  -h  --help                 Print help information and exit
```

Each row in the CSV must include:

| Argument  | Description                                                                                               | Type                      | Default | Required |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | ------- | -------- |
| userId    | Unique ID identifying the user that the preferences ar efor                                               | string                    | N/A     | true     |
| timestamp | Timestamp for when consent was collected for that user                                                    | string - timestamp        | N/A     | true     |
| purposes  | JSON map from consent purpose name -> boolean indicating whether user has opted in or out of that purpose | {[k in string]: boolean } | {}      | false    |
| confirmed | Whether consent preferences have been explicitly confirmed or inferred                                    | boolean                   | true    | false    |
| updated   | Has the consent been updated (including no-change confirmation) since default resolution                  | boolean                   | N/A     | false    |
| prompted  | Whether or not the UI has been shown to the end-user (undefined in older versions of airgap.js)           | boolean                   | N/A     | false    |
| gpp       | IAB GPP string                                                                                            | string - GPP              | N/A     | false    |

An sample CSV can be found [here](./examples/preference-upload.csv).

### `transcend consent upload-cookies-from-csv`

```txt
USAGE
  transcend consent upload-cookies-from-csv (--auth value) (--trackerStatus LIVE|NEEDS_REVIEW) [--file value] [--transcendUrl value]
  transcend consent upload-cookies-from-csv --help

Upload cookies from CSV. This command allows for uploading of cookies from CSV.

Step 1) Download the CSV of cookies that you want to edit from the Admin Dashboard under [Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies). You can download cookies from both the "Triage" and "Approved" tabs.

Step 2) You can edit the contents of the CSV file as needed. You may adjust the "Purpose" column, adjust the "Notes" column, add "Owners" and "Teams" or even add custom columns with additional metadata.

Step 3) Upload the modified CSV file back into the dashboard with this command.

FLAGS
      --auth           The Transcend API key. Requires scopes: "Manage Data Flows"
      --trackerStatus  The status of the cookies you will upload.                                   [LIVE|NEEDS_REVIEW]
     [--file]          Path to the CSV file to upload                                               [default = ./cookies.csv]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

### `transcend consent upload-data-flows-from-csv`

```txt
USAGE
  transcend consent upload-data-flows-from-csv (--auth value) (--trackerStatus LIVE|NEEDS_REVIEW) [--file value] [--classifyService] [--transcendUrl value]
  transcend consent upload-data-flows-from-csv --help

Upload data flows from CSV. This command allows for uploading of data flows from CSV.

Step 1) Download the CSV of data flows that you want to edit from the Admin Dashboard under [Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows). You can download data flows from both the "Triage" and "Approved" tabs.

Step 2) You can edit the contents of the CSV file as needed. You may adjust the "Purpose" column, adjust the "Notes" column, add "Owners" and "Teams" or even add custom columns with additional metadata.

Step 3) Upload the modified CSV file back into the dashboard with this command.

FLAGS
      --auth              The Transcend API key. Requires scopes: "Manage Data Flows"
      --trackerStatus     The status of the data flows you will upload.                                                     [LIVE|NEEDS_REVIEW]
     [--file]             Path to the CSV file to upload                                                                    [default = ./data-flows.csv]
     [--classifyService]  When true, automatically assign the service for a data flow based on the domain that is specified [default = false]
     [--transcendUrl]     URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                      [default = https://api.transcend.io]
  -h  --help              Print help information and exit
```

### `transcend consent upload-preferences`

```txt
USAGE
  transcend consent upload-preferences (--auth value) (--partition value) [--sombraAuth value] [--consentUrl value] [--file value] [--directory value] [--dryRun] [--skipExistingRecordCheck] [--receiptFileDir value] [--skipWorkflowTriggers] [--forceTriggerWorkflows] [--skipConflictUpdates] [--isSilent] [--attributes value] [--receiptFilepath value] [--concurrency value]
  transcend consent upload-preferences --help

Upload preference management data to your Preference Store.

This command prompts you to map the shape of the CSV to the shape of the Transcend API. There is no requirement for the shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file that allows for the mappings to be preserved between runs.

FLAGS
      --auth                      The Transcend API key. Requires scopes: "Modify User Stored Preferences", "View Managed Consent Database Admin API", "View Preference Store Settings"
      --partition                 The partition key to download consent preferences to
     [--sombraAuth]               The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--consentUrl]               URL of the Transcend consent backend. Use https://consent.us.transcend.io for US hosting                                                              [default = https://consent.transcend.io]
     [--file]                     Path to the CSV file to load preferences from
     [--directory]                Path to the directory of CSV files to load preferences from
     [--dryRun]                   Whether to do a dry run only - will write results to receiptFilepath without updating Transcend                                                       [default = false]
     [--skipExistingRecordCheck]  Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD                                                                [default = false]
     [--receiptFileDir]           Directory path where the response receipts should be saved                                                                                            [default = ./receipts]
     [--skipWorkflowTriggers]     Whether to skip workflow triggers when uploading to preference store                                                                                  [default = false]
     [--forceTriggerWorkflows]    Whether to force trigger workflows for existing consent records                                                                                       [default = false]
     [--skipConflictUpdates]      Whether to skip uploading of any records where the preference store and file have a hard conflict                                                     [default = false]
     [--isSilent/--noIsSilent]    Whether to skip sending emails in workflows                                                                                                           [default = true]
     [--attributes]               Attributes to add to any DSR request if created. Comma-separated list of key:value pairs.                                                             [default = Tags:transcend-cli,Source:transcend-cli]
     [--receiptFilepath]          Store resulting, continuing where left off                                                                                                            [default = ./preference-management-upload-receipts.json]
     [--concurrency]              The concurrency to use when uploading in parallel                                                                                                     [default = 10]
  -h  --help                      Print help information and exit
```

A sample CSV can be found [here](./examples/cli-upload-preferences-example.csv). In this example, `Sales` and `Marketing` are two custom Purposes, and `SalesCommunications` and `MarketingCommunications` are Preference Topics. During the interactive CLI prompt, you can map these columns to the slugs stored in Transcend!

Upload consent preferences to partition key `4d1c5daa-90b7-4d18-aa40-f86a43d2c726`:

```sh
transcend consent upload-preferences --auth=$TRANSCEND_API_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
```

Upload consent preferences with additional options:

```sh
transcend consent upload-preferences --auth=$TRANSCEND_API_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 --file=./preferences.csv --dryRun=true --skipWorkflowTriggers=true --skipConflictUpdates=true --isSilent=false --attributes="Tags:transcend-cli,Source:transcend-cli" --receiptFilepath=./preference-management-upload-receipts.json
```

Specifying the backend URL, needed for US hosted backend infrastructure:

```sh
transcend consent upload-preferences --auth=$TRANSCEND_API_KEY --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 --consentUrl=https://consent.us.transcend.io
```

### `transcend inventory pull`

```txt
USAGE
  transcend inventory pull (--auth value) [--resources all|apiKeys|customFields|templates|dataSilos|enrichers|dataFlows|businessEntities|actions|dataSubjects|identifiers|cookies|consentManager|partitions|prompts|promptPartials|promptGroups|agents|agentFunctions|agentFiles|vendors|dataCategories|processingPurposes|actionItems|actionItemCollections|teams|privacyCenters|policies|messages|assessments|assessmentTemplates|purposes] [--file value] [--transcendUrl value] [--dataSiloIds value]... [--integrationNames value]... [--trackerStatuses LIVE|NEEDS_REVIEW] [--pageSize value] [--skipDatapoints] [--skipSubDatapoints] [--includeGuessedCategories] [--debug]
  transcend inventory pull --help

Generates a transcend.yml by pulling the configuration from your Transcend instance.

The API key needs various scopes depending on the resources being pulled (see the CLI's README for more details).

This command can be helpful if you are looking to:

- Copy your data into another instance
- Generate a transcend.yml file as a starting point to maintain parts of your data inventory in code.

FLAGS
      --auth                       The Transcend API key. The scopes required will vary depending on the operation performed. If in doubt, the Full Admin scope will always work.
     [--resources]                 The different resource types to pull in. Defaults to dataSilos,enrichers,templates,apiKeys.                                                    [all|apiKeys|customFields|templates|dataSilos|enrichers|dataFlows|businessEntities|actions|dataSubjects|identifiers|cookies|consentManager|partitions|prompts|promptPartials|promptGroups|agents|agentFunctions|agentFiles|vendors|dataCategories|processingPurposes|actionItems|actionItemCollections|teams|privacyCenters|policies|messages|assessments|assessmentTemplates|purposes, separator = ,]
     [--file]                      Path to the YAML file to pull into                                                                                                             [default = ./transcend.yml]
     [--transcendUrl]              URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                                   [default = https://api.transcend.io]
     [--dataSiloIds]...            The UUIDs of the data silos that should be pulled into the YAML file                                                                           [separator = ,]
     [--integrationNames]...       The types of integrations to pull down                                                                                                         [separator = ,]
     [--trackerStatuses]           The statuses of consent manager trackers to pull down. Defaults to all statuses.                                                               [LIVE|NEEDS_REVIEW, separator = ,]
     [--pageSize]                  The page size to use when paginating over the API                                                                                              [default = 50]
     [--skipDatapoints]            When true, skip pulling in datapoints alongside data silo resource                                                                             [default = false]
     [--skipSubDatapoints]         When true, skip pulling in subDatapoints alongside data silo resource                                                                          [default = false]
     [--includeGuessedCategories]  When true, included guessed data categories that came from the content classifier                                                              [default = false]
     [--debug]                     Set to true to include debug logs while pulling the configuration                                                                              [default = false]
  -h  --help                       Print help information and exit
```

#### Scopes

The API key permissions for this command vary based on the `resources` argument:

| Resource              | Description                                                                                                                          | Scopes                                               | Link                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apiKeys               | API Key definitions assigned to Data Silos. API keys cannot be created through the CLI, but you can map API key usage to Data Silos. | View API Keys                                        | [Developer Tools -> API keys](https://app.transcend.io/infrastructure/api-keys)                                                                                                                                               |
| customFields          | Custom field definitions that define extra metadata for each table in the Admin Dashboard.                                           | View Global Attributes                               | [Custom Fields](https://app.transcend.io/infrastructure/attributes)                                                                                                                                                           |
| templates             | Email templates. Only template titles can be created and mapped to other resources.                                                  | View Email Templates                                 | [DSR Automation -> Email Templates](https://app.transcend.io/privacy-requests/email-templates)                                                                                                                                |
| dataSilos             | The Data Silo/Integration definitions.                                                                                               | View Data Map, View Data Subject Request Settings    | [Data Inventory -> Data Silos](https://app.transcend.io/data-map/data-inventory/) and [Infrastucture -> Integrations](https://app.transcend.io/infrastructure/integrationsdata-silos)                                         |
| enrichers             | The Privacy Request enricher configurations.                                                                                         | View Identity Verification Settings                  | [DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)                                                                                                                                        |
| dataFlows             | Consent Manager Data Flow definitions.                                                                                               | View Data Flows                                      | [Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows/approved)                                                                                                                              |
| businessEntities      | The business entities in the data inventory.                                                                                         | View Data Inventory                                  | [Data Inventory -> Business Entities](https://app.transcend.io/data-map/data-inventory/business-entities)                                                                                                                     |
| actions               | The Privacy Request action settings.                                                                                                 | View Data Subject Request Settings                   | [DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)                                                                                                                                      |
| dataSubjects          | The Privacy Request data subject settings.                                                                                           | View Data Subject Request Settings                   | [DSR Automation -> Request Settings](https://app.transcend.io/privacy-requests/settings)                                                                                                                                      |
| identifiers           | The Privacy Request identifier configurations.                                                                                       | View Identity Verification Settings                  | [DSR Automation -> Identifiers](https://app.transcend.io/privacy-requests/identifiers)                                                                                                                                        |
| cookies               | Consent Manager Cookie definitions.                                                                                                  | View Data Flows                                      | [Consent Management -> Cookies](https://app.transcend.io/consent-manager/cookies/approved)                                                                                                                                    |
| consentManager        | Consent Manager general settings, including domain list.                                                                             | View Consent Manager                                 | [Consent Management -> Developer Settings](https://app.transcend.io/consent-manager/developer-settings)                                                                                                                       |
| partitions            | The partitions in the account (often representative of separate data controllers).                                                   | View Consent Manager                                 | [Consent Management -> Developer Settings -> Advanced Settings](https://app.transcend.io/consent-manager/developer-settings/advanced-settings)                                                                                |
| prompts               | The Transcend AI prompts                                                                                                             | View Prompts                                         | [Prompt Manager -> Browse](https://app.transcend.io/prompts/browse)                                                                                                                                                           |
| promptPartials        | The Transcend AI prompt partials                                                                                                     | View Prompts                                         | [Prompt Manager -> Partials](https://app.transcend.io/prompts/partialss)                                                                                                                                                      |
| promptGroups          | The Transcend AI prompt groups                                                                                                       | View Prompts                                         | [Prompt Manager -> Groups](https://app.transcend.io/prompts/groups)                                                                                                                                                           |
| agents                | The agents in the prompt manager.                                                                                                    | View Prompts                                         | [Prompt Manager -> Agents](https://app.transcend.io/prompts/agents)                                                                                                                                                           |
| agentFunctions        | The agent functions in the prompt manager.                                                                                           | View Prompts                                         | [Prompt Manager -> Agent Functions](https://app.transcend.io/prompts/agent-functions)                                                                                                                                         |
| agentFiles            | The agent files in the prompt manager.                                                                                               | View Prompts                                         | [Prompt Manager -> Agent Files](https://app.transcend.io/prompts/agent-files)                                                                                                                                                 |
| vendors               | The vendors in the data inventory.                                                                                                   | View Data Inventory                                  | [Data Inventory -> Vendors](https://app.transcend.io/data-map/data-inventory/vendors)                                                                                                                                         |
| dataCategories        | The data categories in the data inventory.                                                                                           | View Data Inventory                                  | [Data Inventory -> Data Categories](https://app.transcend.io/data-map/data-inventory/data-categories)                                                                                                                         |
| processingPurposes    | The processing purposes in the data inventory.                                                                                       | View Data Inventory                                  | [Data Inventory -> Processing Purposes](https://app.transcend.io/data-map/data-inventory/purposes)                                                                                                                            |
| actionItems           | Onboarding related action items                                                                                                      | View All Action Items                                | [Action Items](https://app.transcend.io/action-items/all)                                                                                                                                                                     |
| actionItemCollections | Onboarding related action item group names                                                                                           | View All Action Items                                | [Action Items](https://app.transcend.io/action-items/all)                                                                                                                                                                     |
| teams                 | Team definitions of users and scope groupings                                                                                        | View Scopes                                          | [Administration -> Teams](https://app.transcend.io/admin/teams)                                                                                                                                                               |
| privacyCenters        | The privacy center configurations.                                                                                                   | View Privacy Center Layout                           | [Privacy Center](https://app.transcend.io/privacy-center/general-settings)                                                                                                                                                    |
| policies              | The privacy center policies.                                                                                                         | View Policies                                        | [Privacy Center -> Policies](https://app.transcend.io/privacy-center/policies)                                                                                                                                                |
| messages              | Message definitions used across consent, privacy center, email templates and more.                                                   | View Internationalization Messages                   | [Privacy Center -> Messages](https://app.transcend.io/privacy-center/messages-internationalization), [Consent Management -> Display Settings -> Messages](https://app.transcend.io/consent-manager/display-settings/messages) |
| assessments           | Assessment responses.                                                                                                                | View Assessments                                     | [Assessments -> Assessments](https://app.transcend.io/assessments/groups)                                                                                                                                                     |
| assessmentTemplates   | Assessment template configurations.                                                                                                  | View Assessments                                     | [Assessment -> Templates](https://app.transcend.io/assessments/form-templates)                                                                                                                                                |
| purposes              | Consent purposes and related preference management topics.                                                                           | View Consent Manager, View Preference Store Settings | [Consent Management -> Regional Experiences -> Purposes](https://app.transcend.io/consent-manager/regional-experiences/purposes)                                                                                              |

#### Usage

```sh
# Writes out file to ./transcend.yml
transcend inventory pull --auth=$TRANSCEND_API_KEY
```

An alternative file destination can be specified:

```sh
# Writes out file to ./custom/location.yml
transcend inventory pull --auth=$TRANSCEND_API_KEY --file=./custom/location.yml
```

Or a specific data silo(s) can be pulled in:

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY ---dataSiloIds=710fec3c-7bcc-4c9e-baff-bf39f9bec43e
```

Or a specific types of data silo(s) can be pulled in:

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --integrationNames=salesforce,snowflake
```

Specifying the resource types to pull in (the following resources are the default resources):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=apiKeys,templates,dataSilos,enrichers
```

Pull in data flow and cookie resources, filtering for specific tracker statuses (see [this example](./examples/data-flows-cookies.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataFlows,cookies --trackerStatuses=NEEDS_REVIEW,LIVE
```

Pull in data silos without any datapoint/table information

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataSilos --skipDatapoints=true
```

Pull in data silos and datapoints without any subdatapoint/column information

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataSilos --skipSubDatapoints=true
```

Pull in data silos and datapoints with guessed data categories instead of just approved data categories

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataSilos --includeGuessedCategories=true
```

Pull in attribute definitions only (see [this example](./examples/attributes.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=attributes
```

Pull in business entities only (see [this example](./examples/business-entities.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=businessEntities
```

Pull in enrichers and identifiers (see [this example](./examples/enrichers.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=enrichers,identifiers
```

Pull in onboarding action items (see [this example](./examples/action-items.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=actionItems,actionItemCollections
```

Pull in consent manager domain list (see [this example](./examples/consent-manager-domains.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=consentManager
```

Pull in identifier configurations (see [this example](./examples/identifiers.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=identifiers
```

Pull in request actions configurations (see [this example](./examples/actions.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=actions
```

Pull in consent manager purposes and preference management topics (see [this example](./examples/purposes.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=purposes
```

Pull in data subject configurations (see [this example](./examples/data-subjects.yml)):

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataSubjects
```

Pull in assessments and assessment templates.

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=assessments,assessmentTemplates
```

Pull everything:

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=all
```

Pull in configuration files across multiple instances

```sh
transcend admin generate-api-keys --email=test@transcend.io --password=$TRANSCEND_PASSWORD    --scopes="View Consent Manager" --apiKeyTitle="CLI Usage Cross Instance Sync" --file=./transcend-api-keys.json
transcend inventory pull --auth=./transcend-api-keys.json --resources=consentManager --file=./transcend/
```

Note: This command will overwrite the existing transcend.yml file that you have locally.

### `transcend inventory push`

```txt
USAGE
  transcend inventory push (--auth value) [--file value] [--transcendUrl value] [--pageSize value] [--variables value] [--publishToPrivacyCenter] [--classifyService] [--deleteExtraAttributeValues]
  transcend inventory push --help

Given a transcend.yml file, sync the contents up to your Transcend instance.

FLAGS
      --auth                         The Transcend API key. The scopes required will vary depending on the operation performed. If in doubt, the Full Admin scope will always work.
     [--file]                        Path to the YAML file to push from                                                                                                             [default = ./transcend.yml]
     [--transcendUrl]                URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                                   [default = https://api.transcend.io]
     [--pageSize]                    The page size to use when paginating over the API                                                                                              [default = 50]
     [--variables]                   The variables to template into the YAML file when pushing configuration. Comma-separated list of key:value pairs.                              [default = ""]
     [--publishToPrivacyCenter]      When true, publish the configuration to the Privacy Center                                                                                     [default = false]
     [--classifyService]             When true, automatically assign the service for a data flow based on the domain that is specified                                              [default = false]
     [--deleteExtraAttributeValues]  When true and syncing attributes, delete any extra attributes instead of just upserting                                                        [default = false]
  -h  --help                         Print help information and exit
```

#### Scopes

The scopes for `transcend inventory push` are the same as the scopes for [`transcend inventory pull`](#transcend-inventory-pull).

#### Usage

```sh
# Looks for file at ./transcend.yml
transcend inventory push --auth=$TRANSCEND_API_KEY
```

An alternative file destination can be specified:

```sh
# Looks for file at custom location ./custom/location.yml
transcend inventory push --auth=$TRANSCEND_API_KEY --file=./custom/location.yml
```

Push a single .yml file configuration into multiple Transcend instances. This uses the output of [`transcend admin generate-api-keys`](#transcend-admin-generate-api-keys).

```sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" --file=./transcend-api-keys.json
transcend inventory pull --auth=$TRANSCEND_API_KEY
transcend inventory push --auth=./transcend-api-keys.json
```

Push multiple .yml file configurations into multiple Transcend instances. This uses the output of [`transcend admin generate-api-keys`](#transcend-admin-generate-api-keys).

```sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" --file=./transcend-api-keys.json
transcend inventory pull --auth=./transcend-api-keys.json --file=./transcend/
# <edit .yml files in folder in between these steps>
transcend inventory push --auth=./transcend-api-keys.json --file=./transcend/
```

Apply service classifier to all data flows.

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=dataFlows
transcend inventory push --auth=$TRANSCEND_API_KEY --resources=dataFlows --classifyService=true
```

Push up attributes, deleting any attributes that are not specified in the transcend.yml file

```sh
transcend inventory pull --auth=$TRANSCEND_API_KEY --resources=attributes
transcend inventory push --auth=$TRANSCEND_API_KEY --resources=attributes --deleteExtraAttributeValues=true
```

Some things to note about this sync process:

1. Any field that is defined in your .yml file will be synced up to app.transcend.io. If any change was made on the Admin Dashboard, it will be overwritten.
2. If you omit a field from the .yml file, this field will not be synced. This gives you the ability to define as much or as little configuration in your transcend.yml file as you would like, and let the remainder of fields be labeled through the Admin Dashboard
3. If you define new data subjects, identifiers, data silos or datapoints that were not previously defined on the Admin Dashboard, the CLI will create these new resources automatically.
4. Currently, this CLI does not handle deleting or renaming of resources. If you need to delete or rename a data silo, identifier, enricher or API key, you should make the change on the Admin Dashboard.
5. The only resources that this CLI will not auto-generate are:

- a) Data silo owners: If you assign an email address to a data silo, you must first make sure that user is invited into your Transcend instance (https://app.transcend.io/admin/users).
- b) API keys: This CLI will not create new API keys. You will need to first create the new API keys on the Admin Dashboard (https://app.transcend.io/infrastructure/api-keys). You can then list out the titles of the API keys that you generated in your transcend.yml file, after which the CLI is capable of updating that API key to be able to respond to different data silos in your Data Map

#### CI Integration

Once you have a workflow for creating your transcend.yml file, you will want to integrate your `transcend inventory push` command on your CI.

Below is an example of how to set this up using a Github action:

```yaml
name: Transcend Data Map Syncing
# See https://app.transcend.io/privacy-requests/connected-services

on:
  push:
    branches:
      - 'main'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install Transcend CLI
        run: npm install --global @transcend-io/cli

      # If you have a script that generates your transcend.yml file from
      # an ORM or infrastructure configuration, add that step here
      # Leave this step commented out if you want to manage your transcend.yml manually
      # - name: Generate transcend.yml
      #   run: ./scripts/generate_transcend_yml.py

      - name: Push Transcend config
        run: transcend inventory push --auth=${{ secrets.TRANSCEND_API_KEY }}
```

#### Dynamic Variables

If you are using this CLI to sync your Data Map between multiple Transcend instances, you may find the need to make minor modifications to your configurations between environments. The most notable difference would be the domain where your webhook URLs are hosted on.

The `transcend inventory push` command takes in a parameter `variables`. This is a CSV of `key:value` pairs.

```sh
transcend inventory push --auth=$TRANSCEND_API_KEY --variables=domain:acme.com,stage:staging
```

This command could fill out multiple parameters in a YAML file like [./examples/multi-instance.yml](./examples/multi-instance.yml), copied below:

```yml
api-keys:
  - title: Webhook Key
enrichers:
  - title: Basic Identity Enrichment
    description: Enrich an email address to the userId and phone number
    # The data silo webhook URL is the same in each environment,
    # except for the base domain in the webhook URL.
    url: https://example.<<parameters.domain>>/transcend-enrichment-webhook
    input-identifier: email
    output-identifiers:
      - userId
      - phone
      - myUniqueIdentifier
  - title: Fraud Check
    description: Ensure the email address is not marked as fraudulent
    url: https://example.<<parameters.domain>>/transcend-fraud-check
    input-identifier: email
    output-identifiers:
      - email
    privacy-actions:
      - ERASURE
data-silos:
  - title: Redshift Data Warehouse
    integrationName: server
    description: The mega-warehouse that contains a copy over all SQL backed databases - <<parameters.stage>>
    url: https://example.<<parameters.domain>>/transcend-webhook
    api-key-title: Webhook Key
```

### `transcend inventory scan-packages`

```txt
USAGE
  transcend inventory scan-packages (--auth value) [--scanPath value] [--ignoreDirs value]... [--repositoryName value] [--transcendUrl value]
  transcend inventory scan-packages --help

Transcend scans packages and dependencies for the following frameworks:

- package.json
- requirements.txt & setup.py
- Podfile
- Package.resolved
- build.gradle
- pubspec.yaml
- Gemfile & .gemspec
- composer.json

This command will scan the folder you point at to look for any of these files. Once found, the build file will be parsed in search of dependencies. Those code packages and dependencies will be uploaded to Transcend. The information uploaded to Transcend is:

- repository name
- package names
- dependency names and versions
- package descriptions

FLAGS
      --auth             The Transcend API key. Requires scopes: "Manage Code Scanning"
     [--scanPath]        File path in the project to scan                                             [default = ./]
     [--ignoreDirs]...   List of directories to ignore in scan                                        [separator = ,]
     [--repositoryName]  Name of the git repository that the package should be tied to
     [--transcendUrl]    URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help             Print help information and exit
```

### `transcend inventory discover-silos`

```txt
USAGE
  transcend inventory discover-silos (--scanPath value) (--dataSiloId value) (--auth value) [--fileGlobs value] [--ignoreDirs value] [--transcendUrl value]
  transcend inventory discover-silos --help

We support scanning for new data silos in JavaScript, Python, Gradle, and CocoaPods projects.

To get started, add a data silo for the corresponding project type with the "silo discovery" plugin enabled. For example, if you want to scan a JavaScript project, add a package.json data silo. Then, specify the data silo ID in the "--dataSiloId" parameter.

FLAGS
      --scanPath       File path in the project to scan
      --dataSiloId     The UUID of the corresponding data silo
      --auth           The Transcend API key. This key must be associated with the data silo(s) being operated on. Requires scopes: "Manage Assigned Data Inventory"
     [--fileGlobs]     You can pass a glob syntax pattern(s) to specify additional file paths to scan. Comma-separated list of globs.                                [default = ""]
     [--ignoreDirs]    Comma-separated list of directories to ignore.                                                                                                [default = ""]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                                  [default = https://api.transcend.io]
  -h  --help           Print help information and exit
```

#### Usage

Scan a JavaScript package.json:

```sh
transcend inventory discover-silos --scanPath=./myJavascriptProject --auth=$TRANSCEND_API_KEY ---dataSiloId=445ee241-5f2a-477b-9948-2a3682a43d0e
```

Here are some examples of a [Podfile](./examples/code-scanning/test-cocoa-pods/Podfile) and [Gradle file](./examples/code-scanning/test-gradle/build.gradle). These are scanned like:

```sh
transcend inventory discover-silos --scanPath=./examples/ --auth=$TRANSCEND_API_KEY ---dataSiloId=b6776589-0b7d-466f-8aad-4378ffd3a321
```

This call will look for all the package.json files that in the scan path `./myJavascriptProject`, parse each of the dependencies into their individual package names, and send it to our Transcend backend for classification. These classifications can then be viewed [here](https://app.transcend.io/data-map/data-inventory/silo-discovery/triage). The process is the same for scanning requirements.txt, podfiles and build.gradle files.

### `transcend inventory pull-datapoints`

```txt
USAGE
  transcend inventory pull-datapoints (--auth value) [--file value] [--transcendUrl value] [--dataSiloIds value]... [--includeAttributes] [--includeGuessedCategories] [--parentCategories FINANCIAL|HEALTH|CONTACT|LOCATION|DEMOGRAPHIC|ID|ONLINE_ACTIVITY|USER_PROFILE|SOCIAL_MEDIA|CONNECTION|TRACKING|DEVICE|SURVEY|OTHER|UNSPECIFIED|NOT_PERSONAL_DATA|INTEGRATION_IDENTIFIER] [--subCategories value]...
  transcend inventory pull-datapoints --help

Export the datapoints from your Data Inventory into a CSV.

FLAGS
      --auth                       The Transcend API key. Requires scopes: "View Data Inventory"
     [--file]                      The file to save datapoints to                                               [default = ./datapoints.csv]
     [--transcendUrl]              URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
     [--dataSiloIds]...            List of data silo IDs to filter by                                           [separator = ,]
     [--includeAttributes]         Whether to include attributes in the output                                  [default = false]
     [--includeGuessedCategories]  Whether to include guessed categories in the output                          [default = false]
     [--parentCategories]          List of parent categories to filter by                                       [FINANCIAL|HEALTH|CONTACT|LOCATION|DEMOGRAPHIC|ID|ONLINE_ACTIVITY|USER_PROFILE|SOCIAL_MEDIA|CONNECTION|TRACKING|DEVICE|SURVEY|OTHER|UNSPECIFIED|NOT_PERSONAL_DATA|INTEGRATION_IDENTIFIER, separator = ,]
     [--subCategories]...          List of subcategories to filter by                                           [separator = ,]
  -h  --help                       Print help information and exit
```

### `transcend inventory pull-unstructured-discovery-files`

```txt
USAGE
  transcend inventory pull-unstructured-discovery-files (--auth value) [--file value] [--transcendUrl value] [--dataSiloIds value]... [--subCategories value]... [--status MANUALLY_ADDED|CORRECTED|VALIDATED|CLASSIFIED|REJECTED] [--includeEncryptedSnippets]
  transcend inventory pull-unstructured-discovery-files --help

This command allows for pulling Unstructured Discovery into a CSV.

FLAGS
      --auth                       The Transcend API key. Requires scopes: "View Data Inventory"
     [--file]                      The file to save datapoints to                                               [default = ./unstructured-discovery-files.csv]
     [--transcendUrl]              URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
     [--dataSiloIds]...            List of data silo IDs to filter by                                           [separator = ,]
     [--subCategories]...          List of data categories to filter by                                         [separator = ,]
     [--status]                    List of classification statuses to filter by                                 [MANUALLY_ADDED|CORRECTED|VALIDATED|CLASSIFIED|REJECTED, separator = ,]
     [--includeEncryptedSnippets]  Whether to include encrypted snippets of the entries classified              [default = false]
  -h  --help                       Print help information and exit
```

### `transcend inventory derive-data-silos-from-data-flows`

```txt
USAGE
  transcend inventory derive-data-silos-from-data-flows (--auth value) (--dataFlowsYmlFolder value) (--dataSilosYmlFolder value) [--ignoreYmls value]... [--transcendUrl value]
  transcend inventory derive-data-silos-from-data-flows --help

Given a folder of data flow transcend.yml configurations, convert those configurations to set of data silo transcend.yml configurations.

FLAGS
      --auth                The Transcend API key. No scopes are required for this command.
      --dataFlowsYmlFolder  The folder that contains data flow yml files
      --dataSilosYmlFolder  The folder that contains data silo yml files
     [--ignoreYmls]...      The set of yml files that should be skipped when uploading                   [separator = ,]
     [--transcendUrl]       URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help                Print help information and exit
```

### `transcend inventory derive-data-silos-from-data-flows-cross-instance`

```txt
USAGE
  transcend inventory derive-data-silos-from-data-flows-cross-instance (--auth value) (--dataFlowsYmlFolder value) [--output value] [--ignoreYmls value]... [--transcendUrl value]
  transcend inventory derive-data-silos-from-data-flows-cross-instance --help

Given a folder of data flow transcend.yml configurations, convert those configurations to a single transcend.yml configurations of all related data silos.

FLAGS
      --auth                The Transcend API key. No scopes are required for this command.
      --dataFlowsYmlFolder  The folder that contains data flow yml files
     [--output]             The output transcend.yml file containing the data silo configurations        [default = ./transcend.yml]
     [--ignoreYmls]...      The set of yml files that should be skipped when uploading                   [separator = ,]
     [--transcendUrl]       URL of the Transcend backend. Use https://api.us.transcend.io for US hosting [default = https://api.transcend.io]
  -h  --help                Print help information and exit
```

### `transcend inventory consent-manager-service-json-to-yml`

```txt
USAGE
  transcend inventory consent-manager-service-json-to-yml [--file value] [--output value]
  transcend inventory consent-manager-service-json-to-yml --help

Import the services from an airgap.js file into a Transcend instance.

Step 1) Run `await airgap.getMetadata()` on a site with airgap
Step 2) Right click on the printed object, and click `Copy object`
Step 3) Place output of file in a file named `services.json`
Step 4) Run `transcend consent consent-manager-service-json-to-yml --file=./services.json --output=./transcend.yml`
Step 5) Run `transcend inventory push --auth=$TRANSCEND_API_KEY --file=./transcend.yml --classifyService=true`

FLAGS
     [--file]    Path to the services.json file, output of await airgap.getMetadata() [default = ./services.json]
     [--output]  Path to the output transcend.yml to write to                         [default = ./transcend.yml]
  -h  --help     Print help information and exit
```

### `transcend inventory consent-managers-to-business-entities`

```txt
USAGE
  transcend inventory consent-managers-to-business-entities (--consentManagerYmlFolder value) [--output value]
  transcend inventory consent-managers-to-business-entities --help

This command allows for converting a folder or Consent Manager transcend.yml files into a single transcend.yml file where each consent manager configuration is a Business Entity in the data inventory.

FLAGS
      --consentManagerYmlFolder  Path to the folder of Consent Manager transcend.yml files to combine
     [--output]                  Path to the output transcend.yml with business entity configuration  [default = ./combined-business-entities.yml]
  -h  --help                     Print help information and exit
```

### `transcend admin generate-api-keys`

```txt
USAGE
  transcend admin generate-api-keys (--email value) (--password value) (--apiKeyTitle value) (--file value) (--scopes value)... [--deleteExistingApiKey] [--createNewApiKey] [--parentOrganizationId value] [--transcendUrl value]
  transcend admin generate-api-keys --help

This command allows for creating API keys across multiple Transcend instances. This is useful for customers that are managing many Transcend instances and need to regularly create, cycle or delete API keys across all of their instances.

Unlike the other commands that rely on API key authentication, this command relies upon username/password authentication. This command will spit out the API keys into a JSON file, and that JSON file can be used in subsequent CLI commands.

Authentication requires your email and password for the Transcend account. This command will only generate API keys for Transcend instances where you have the permission to "Manage API Keys".

FLAGS
      --email                                           The email address that you use to log into Transcend
      --password                                        The password for your account login
      --apiKeyTitle                                     The title of the API key being generated or destroyed
      --file                                            The file where API keys should be written to
      --scopes...                                       The list of scopes that should be given to the API key                                                        [separator = ,]
     [--deleteExistingApiKey/--noDeleteExistingApiKey]  When true, if an API key exists with the specified apiKeyTitle, the existing API key is deleted               [default = true]
     [--createNewApiKey/--noCreateNewApiKey]            When true, new API keys will be created. Set to false if you simply want to delete all API keys with a title  [default = true]
     [--parentOrganizationId]                           Filter for only a specific organization by ID, returning all child accounts associated with that organization
     [--transcendUrl]                                   URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                  [default = https://api.transcend.io]
  -h  --help                                            Print help information and exit
```

#### Usage

```sh
transcend admin generate-api-keys --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json
```

Specifying the backend URL, needed for US hosted backend infrastructure.

```sh
transcend admin generate-api-keys --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \
   --transcendUrl=https://api.us.transcend.io
```

Filter for only a specific organization by ID, returning all child accounts associated with that organization. Can use the following GQL query on the [EU GraphQL Playground](https://api.us.transcend.io/graphql) or [US GraphQL Playground](https://api.us.transcend.io/graphql).

```gql
query {
  user {
    organization {
      id
      parentOrganizationId
    }
  }
}
```

```sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \
   --parentOrganizationId=7098bb38-070d-4f26-8fa4-1b61b9cdef77
```

Delete all API keys with a certain title.

```sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \
   --createNewApiKey=false
```

Throw error if an API key already exists with that title, default behavior is to delete the existing API key and create a new one with that same title.

```sh
transcend admin generate-api-keys  --email=test@transcend.io --password=$TRANSCEND_PASSWORD \
   --scopes="View Email Templates,View Data Map" --apiKeyTitle="CLI Usage Cross Instance Sync" -file=./working/auth.json \
   --deleteExistingApiKey=false
```

### `transcend migration sync-ot`

```txt
USAGE
  transcend migration sync-ot [--hostname value] [--oneTrustAuth value] [--source oneTrust|file] [--transcendAuth value] [--transcendUrl value] [--file value] [--resource assessments] [--dryRun] [--debug]
  transcend migration sync-ot --help

Pulls resources from a OneTrust and syncs them to a Transcend instance. For now, it only supports retrieving OneTrust Assessments.

This command can be helpful if you are looking to:
- Pull resources from your OneTrust account.
- Migrate your resources from your OneTrust account to Transcend.

OneTrust authentication requires an OAuth Token with scope for accessing the assessment endpoints.
If syncing the resources to Transcend, you will also need to generate an API key on the Transcend Admin Dashboard.

FLAGS
     [--hostname]       The domain of the OneTrust environment from which to pull the resource
     [--oneTrustAuth]   The OAuth access token with the scopes necessary to access the OneTrust Public APIs
     [--source]         Whether to read the assessments from OneTrust or from a file                        [oneTrust|file, default = oneTrust]
     [--transcendAuth]  The Transcend API key. Requires scopes: "Manage Assessments"
     [--transcendUrl]   URL of the Transcend backend. Use https://api.us.transcend.io for US hosting        [default = https://api.transcend.io]
     [--file]           Path to the file to pull the resource into. Must be a json file!
     [--resource]       The resource to pull from OneTrust. For now, only assessments is supported          [assessments, default = assessments]
     [--dryRun]         Whether to export the resource to a file rather than sync to Transcend              [default = false]
     [--debug]          Whether to print detailed logs in case of error                                     [default = false]
  -h  --help            Print help information and exit
```

<!-- COMMANDS_END -->

## Prompt Manager

If you are integrating Transcend's Prompt Manager into your code, it may look like:

```ts
import * as t from 'io-ts';
import { TranscendPromptManager } from '@transcend-io/cli';
import {
  ChatCompletionMessage,
  PromptRunProductArea,
} from '@transcend-io/privacy-types';

/**
 * Example prompt integration
 */
export async function main(): Promise<void> {
  // Instantiate the Transcend Prompt Manager instance
  const promptManager = new TranscendPromptManager({
    // API key
    transcendApiKey: process.env.TRANSCEND_API_KEY,
    // Define the prompts that are stored in Transcend
    prompts: {
      test: {
        // identify by ID
        id: '30bcaa79-889a-4af3-842d-2e8ba443d36d',
        // no runtime variables
        paramCodec: t.type({}),
        // response is list of strings
        outputCodec: t.array(t.string),
      },
      json: {
        // identify by title
        title: 'test',
        // one runtime variable "test"
        paramCodec: t.type({ test: t.string }),
        // runtime is json object
        outputCodec: t.record(t.string, t.string),
        // response is stored in <json></json> atg
        extractFromTag: 'json',
      },
      predictProductLine: {
        // identify by title
        title: 'Predict Product Line',
        // runtime parameter for slack channel name
        paramCodec: t.type({
          slackChannelName: t.string,
        }),
        // response is specific JSON shape
        outputCodec: t.type({
          product: t.union([t.string, t.null]),
          clarification: t.union([t.string, t.null]),
        }),
        // response is stored in <json></json> atg
        extractFromTag: 'json',
      },
    },
    // Optional arguments
    //  transcendUrl: 'https://api.us.transcend.io', // defaults to 'https://api.transcend.io'
    //  requireApproval: false, // defaults to true
    //  cacheDuration: 1000 * 60 * 60, // defaults to undefined, no cache
    //  defaultVariables: { myVariable: 'this is custom', other: [{ name: 'custom' }] }, // defaults to {}
    //  handlebarsOptions: { helpers, templates }, // defaults to {}
  });

  // Fetch the prompt from Transcend and template any variables
  // in this case, we template the slack channel name in the LLM prompt
  const systemPrompt = await promptManager.compilePrompt('predictProductLine', {
    slackChannelName: channelName,
  });

  // Parameters to pass to the LLM
  const input: ChatCompletionMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: input,
    },
  ];
  const largeLanguageModel = {
    name: 'gpt-4',
    client: 'openai' as const,
  };
  const temperature = 1;
  const topP = 1;
  const maxTokensToSample = 1000;

  // Run prompt against LLM
  let response: string;
  const t0 = new Date().getTime();
  try {
    response = await openai.createCompletion(input, {
      temperature,
      top_p: topP,
      max_tokens: maxTokensToSample,
    });
  } catch (err) {
    // report error upon failure
    await promptManager.reportPromptRunError('predictProductLine', {
      promptRunMessages: input,
      duration: new Date().getTime() - t0,
      temperature,
      topP,
      error: err.message,
      maxTokensToSample,
      largeLanguageModel,
    });
  }
  const t1 = new Date().getTime();

  // Parsed response as JSON and do not report to Transcend
  //   const parsedResponse = promptManager.parseAiResponse(
  //     'predictProductLine',
  //     response,
  //   );

  // Parsed response as JSON and report output to Transcend
  const parsedResponse = await promptManager.reportAndParsePromptRun(
    'predictProductLine',
    {
      promptRunMessages: [
        ...input,
        {
          role: 'assistant',
          content: response,
        },
      ],
      duration: t1 - t0,
      temperature,
      topP,
      maxTokensToSample,
      largeLanguageModel,
      // Optional parameters
      // name, // unique identifier for this run
      // productArea, // Transcend product area that the prompt relates to
      // runByEmployeeEmail, // Employee email that is executing the request
      // promptGroupId, // The prompt group being reported
    },
  );
}
```

## Proxy usage

If you are trying to use the CLI inside a corporate firewall and need to send traffic through a proxy, you can do so via the `http_proxy` environment variable,with a command like `http_proxy=http://localhost:5051 transcend inventory pull --auth=$TRANSCEND_API_KEY`.
