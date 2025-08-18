# Transcend CLI

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Changelog](#changelog)
- [Overview](#overview)
- [Installation](#installation)
- [transcend.yml](#transcendyml)
- [Usage](#usage)
  - [`transcend request approve`](#transcend-request-approve)
    - [Examples](#examples)
  - [`transcend request upload`](#transcend-request-upload)
    - [Examples](#examples-1)
  - [`transcend request download-files`](#transcend-request-download-files)
    - [Examples](#examples-2)
  - [`transcend request cancel`](#transcend-request-cancel)
    - [Examples](#examples-3)
  - [`transcend request restart`](#transcend-request-restart)
    - [Examples](#examples-4)
  - [`transcend request notify-additional-time`](#transcend-request-notify-additional-time)
    - [Examples](#examples-5)
  - [`transcend request mark-silent`](#transcend-request-mark-silent)
    - [Examples](#examples-6)
  - [`transcend request enricher-restart`](#transcend-request-enricher-restart)
    - [Examples](#examples-7)
  - [`transcend request reject-unverified-identifiers`](#transcend-request-reject-unverified-identifiers)
    - [Examples](#examples-8)
  - [`transcend request export`](#transcend-request-export)
    - [Examples](#examples-9)
  - [`transcend request skip-preflight-jobs`](#transcend-request-skip-preflight-jobs)
    - [Examples](#examples-10)
  - [`transcend request system mark-request-data-silos-completed`](#transcend-request-system-mark-request-data-silos-completed)
    - [Examples](#examples-11)
  - [`transcend request system retry-request-data-silos`](#transcend-request-system-retry-request-data-silos)
    - [Examples](#examples-12)
  - [`transcend request system skip-request-data-silos`](#transcend-request-system-skip-request-data-silos)
    - [Examples](#examples-13)
  - [`transcend request preflight pull-identifiers`](#transcend-request-preflight-pull-identifiers)
    - [Examples](#examples-14)
  - [`transcend request preflight push-identifiers`](#transcend-request-preflight-push-identifiers)
    - [Examples](#examples-15)
  - [`transcend request cron pull-identifiers`](#transcend-request-cron-pull-identifiers)
    - [Examples](#examples-16)
  - [`transcend request cron mark-identifiers-completed`](#transcend-request-cron-mark-identifiers-completed)
    - [Examples](#examples-17)
  - [`transcend consent build-xdi-sync-endpoint`](#transcend-consent-build-xdi-sync-endpoint)
    - [Examples](#examples-18)
  - [`transcend consent pull-consent-metrics`](#transcend-consent-pull-consent-metrics)
    - [Examples](#examples-19)
  - [`transcend consent pull-consent-preferences`](#transcend-consent-pull-consent-preferences)
    - [Examples](#examples-20)
  - [`transcend consent update-consent-manager`](#transcend-consent-update-consent-manager)
    - [Examples](#examples-21)
  - [`transcend consent upload-consent-preferences`](#transcend-consent-upload-consent-preferences)
    - [Examples](#examples-22)
  - [`transcend consent upload-cookies-from-csv`](#transcend-consent-upload-cookies-from-csv)
    - [Examples](#examples-23)
  - [`transcend consent upload-data-flows-from-csv`](#transcend-consent-upload-data-flows-from-csv)
    - [Examples](#examples-24)
  - [`transcend consent upload-preferences`](#transcend-consent-upload-preferences)

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
npx -p @transcend-io/cli -- transcend --help
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

#### Examples

**Bulk approve all SALE_OPT_OUT and ERASURE requests**

```sh
transcend request approve --auth="$TRANSCEND_API_KEY" --actions=SALE_OPT_OUT,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request approve --auth="$TRANSCEND_API_KEY" --actions=ERASURE --transcendUrl=https://api.us.transcend.io
```

**Approve all Erasure requests that came through the API**

```sh
transcend request approve --auth="$TRANSCEND_API_KEY" --actions=ERASURE --origins=API
```

**Approve all requests, but mark any request made before 05/03/2023 as silent mode to prevent emailing those requests**

```sh
transcend request approve \
  --auth="$TRANSCEND_API_KEY" \
  --actions=SALE_OPT_OUT \
  --silentModeBefore=2024-05-03T00:00:00.000Z
```

**Increase the concurrency (defaults to 50)**

```sh
transcend request approve --auth="$TRANSCEND_API_KEY" --actions=ERASURE --concurrency=100
```

**Approve ERASURE requests created within a specific time frame**

```sh
transcend request approve \
  --auth="$TRANSCEND_API_KEY" \
  --actions=SALE_OPT_OUT \
  --createdAtBefore=2024-05-03T00:00:00.000Z \
  --createdAtAfter=2024-04-03T00:00:00.000Z
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

See a demo of the interactive mapping processbelow (_note: the command is slightly different from the one shown in the video, but the arguments are the same._)

https://user-images.githubusercontent.com/10264973/205477183-d4762087-668c-43f1-a84c-0fce0ec3e132.mov

#### Examples

**Upload requests from a CSV file**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv
```

**For self-hosted sombras that use an internal key**

```sh
transcend request upload \
  --auth="$TRANSCEND_API_KEY" \
  --sombraAuth="$SOMBRA_INTERNAL_KEY" \
  --file=/Users/transcend/Desktop/test.csv
```

**Run without being prompted to filter requests**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --skipFilterStep
```

**Perform a dry run to see what will be uploaded, without calling the Transcend API**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --dryRun
```

**Mark the uploaded requests as test requests**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --isTest
```

**Send email communications to the users throughout the request lifecycle**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --isSilent=false
```

**Upload requests without sending initial email receipt, but still send later emails**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --skipSendingReceipt
```

**Increase the concurrency (defaults to 50)**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --concurrency=100
```

**Specify default country code for phone numbers**

```sh
transcend request upload \
  --auth="$TRANSCEND_API_KEY" \
  --file=/Users/transcend/Desktop/test.csv \
  --defaultPhoneCountryCode=44
```

**Include debug logs - warning, this logs out personal data**

```sh
transcend request upload --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv --debug
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request upload \
  --auth="$TRANSCEND_API_KEY" \
  --sombraAuth="$SOMBRA_INTERNAL_KEY" \
  --file=/Users/transcend/Desktop/test.csv \
  --transcendUrl=https://api.us.transcend.io
```

**Send email verification to user before request continues**

```sh
transcend request upload \
  --auth="$TRANSCEND_API_KEY" \
  --file=/Users/transcend/Desktop/test.csv \
  --isSilent=false \
  --emailIsVerified=false
```

**Tag all uploaded requests with custom fields (formerly known as "attributes")**

```sh
transcend request upload \
  --auth="$TRANSCEND_API_KEY" \
  --file=/Users/transcend/Desktop/test.csv \
  --attributes=Tags:transcend-cli;my-customer-tag,Customer:acme-corp
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

Download the files associated with a Data Subject Access Request (DSAR) from [DSR Automation -> Incoming Requests](https://app.transcend.io/privacy-requests/incoming-requests) tab.

<img width="213" alt="Screenshot 2025-06-03 at 3 32 00 PM" src="https://github.com/user-attachments/assets/9e5c3047-5092-454e-9d05-c68509ea3f77" />

#### Examples

**Download all requests in status=APPROVING or status=DOWNLOADABLE**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY"
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY" --transcendUrl=https://api.us.transcend.io
```

**Write files to a specific folder on disk**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY" --folderPath=./my-folder
```

**Auto approve after download**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY" --approveAfterDownload
```

**Download requests in APPROVING state only**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY" --statuses=APPROVING
```

**Increase the concurrency (defaults to 10)**

```sh
transcend request download-files --auth="$TRANSCEND_API_KEY" --concurrency=100
```

**Download requests in a timeframe**

```sh
transcend request download-files \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-05-03T00:00:00.000Z \
  --createdAtAfter=2024-04-03T00:00:00.000Z
```

**Download specific requests**

```sh
transcend request download-files \
  --auth="$TRANSCEND_API_KEY" \
  --requestIds=b8c2ce13-9e40-4104-af79-23c68f2a87ba,d5eedc52-0f85-4034-bc01-14951acad5aa
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

#### Examples

**Bulk cancel all open SALE_OPT_OUT and ERASURE requests**

```sh
transcend request cancel --auth="$TRANSCEND_API_KEY" --actions=SALE_OPT_OUT,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request cancel --auth="$TRANSCEND_API_KEY" --actions=ERASURE --transcendUrl=https://api.us.transcend.io
```

**Bulk cancel all Erasure (request.type=ERASURE) requests that are in an enriching state (request.status=ENRICHING)**

```sh
transcend request cancel --auth="$TRANSCEND_API_KEY" --actions=ERASURE --statuses=ENRICHING
```

**Send a specific email template to the request that are being canceled**

```sh
transcend request cancel --auth="$TRANSCEND_API_KEY" --actions=ERASURE --cancellationTitle="Custom Email Template"
```

**Cancel all open SALE_OPT_OUT, but mark any request made before 05/03/2023 as silent mode to prevent emailing those requests**

```sh
transcend request cancel \
  --auth="$TRANSCEND_API_KEY" \
  --actions=SALE_OPT_OUT \
  --silentModeBefore=2024-05-03T00:00:00.000Z
```

**Cancel all open SALE_OPT_OUT, within a specific time frame**

```sh
transcend request cancel \
  --auth="$TRANSCEND_API_KEY" \
  --actions=SALE_OPT_OUT \
  --createdAtBefore=2024-05-03T00:00:00.000Z \
  --createdAtAfter=2024-04-03T00:00:00.000Z
```

**Increase the concurrency (defaults to 50)**

```sh
transcend request cancel --auth="$TRANSCEND_API_KEY" --actions=ERASURE --concurrency=500
```

**Bulk cancel requests by ID**

```sh
transcend request cancel \
  --auth="$TRANSCEND_API_KEY" \
  --actions=ACCESS,ERASURE,SALE_OPT_OUT,CONTACT_OPT_OUT \
  --statuses=ENRICHING,COMPILING,APPROVING,WAITING,REQUEST_MADE,ON_HOLD,DELAYED,SECONDARY \
  --requestIds=c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4
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

#### Examples

**Restart requests with specific statuses and actions**

```sh
transcend request restart --auth="$TRANSCEND_API_KEY" --statuses=COMPILING,ENRICHING --actions=ACCESS,ERASURE
```

**For self-hosted sombras that use an internal key**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --sombraAuth="$SOMBRA_INTERNAL_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --sombraAuth="$SOMBRA_INTERNAL_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --transcendUrl=https://api.us.transcend.io
```

**Increase the concurrency (defaults to 15)**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --concurrency=100
```

**Re-verify emails**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --emailIsVerified=false
```

**Restart specific requests by ID**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --requestIds=c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4
```

**Restart requests that were submitted before a specific date**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --createdAt=2024-05-11T00:00:00.000Z
```

**Restart requests and place everything in silent mode submitted before a certain date**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --silentModeBefore=2024-12-05T00:00:00.000Z
```

**Restart requests within a specific timeframe**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --createdAtBefore=2024-04-05T00:00:00.000Z \
  --createdAtAfter=2024-02-21T00:00:00.000Z
```

**Send email receipts to the restarted requests**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --sendEmailReceipt
```

**Copy over all enriched identifiers from the initial request**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --copyIdentifiers
```

**Skip queued state of request and go straight to compiling**

```sh
transcend request restart \
  --auth="$TRANSCEND_API_KEY" \
  --statuses=COMPILING,ENRICHING \
  --actions=ACCESS,ERASURE \
  --skipWaitingPeriod
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

#### Examples

**Notify all request types that were made before 01/01/2024**

```sh
transcend request notify-additional-time --auth="$TRANSCEND_API_KEY" --createdAtBefore=2024-01-01T00:00:00.000Z
```

**Notify all request types that were made during a date range**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --createdAtAfter=2024-12-15T00:00:00.000Z
```

**Notify certain request types**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --actions=SALE_OPT_OUT,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --transcendUrl=https://api.us.transcend.io
```

**Bulk notify requests by ID**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --requestIds=c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4
```

**Only notify requests that are expiring in the next 3 days or less**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --daysLeft=3
```

**Change number of days to extend request by**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --days=30
```

**Send a specific email template to the request that instead of the default**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --emailTemplate="Custom Email Template"
```

**Increase the concurrency (defaults to 50)**

```sh
transcend request notify-additional-time \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-01-01T00:00:00.000Z \
  --concurrency=500
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

#### Examples

**Bulk mark silent all open SALE_OPT_OUT and ERASURE requests**

```sh
transcend request mark-silent --auth="$TRANSCEND_API_KEY" --actions=SALE_OPT_OUT,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request mark-silent \
  --auth="$TRANSCEND_API_KEY" \
  --actions=ERASURE \
  --transcendUrl=https://api.us.transcend.io
```

**Bulk mark as silent all Erasure (request.type=ERASURE) requests that are in an enriching state (request.status=ENRICHING)**

```sh
transcend request mark-silent --auth="$TRANSCEND_API_KEY" --actions=ERASURE --statuses=ENRICHING
```

**Bulk mark as silent requests by ID**

```sh
transcend request mark-silent \
  --auth="$TRANSCEND_API_KEY" \
  --actions=ACCESS,ERASURE,SALE_OPT_OUT,CONTACT_OPT_OUT \
  --statuses=ENRICHING,COMPILING,APPROVING,WAITING,REQUEST_MADE,ON_HOLD,DELAYED,SECONDARY \
  --requestIds=c3ae78c9-2768-4666-991a-d2f729503337,342e4bd1-64ea-4af0-a4ad-704b5a07cfe4
```

**Mark sale opt out requests as silent within a certain date range**

```sh
transcend request mark-silent \
  --auth="$TRANSCEND_API_KEY" \
  --actions=SALE_OPT_OUT \
  --createdAtBefore=2024-05-03T00:00:00.000Z \
  --createdAtAfter=2024-04-03T00:00:00.000Z
```

**Increase the concurrency (defaults to 50)**

```sh
transcend request mark-silent --auth="$TRANSCEND_API_KEY" --actions=ERASURE --concurrency=500
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

#### Examples

**Restart a particular enricher across a series of DSRs**

```sh
transcend request enricher-restart --auth="$TRANSCEND_API_KEY" --enricherId=3be5e898-fea9-4614-84de-88cd5265c557
```

**Restart specific request types**

```sh
transcend request enricher-restart \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=3be5e898-fea9-4614-84de-88cd5265c557 \
  --actions=ACCESS,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request enricher-restart \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=3be5e898-fea9-4614-84de-88cd5265c557 \
  --transcendUrl=https://api.us.transcend.io
```

**Increase the concurrency (defaults to 15)**

```sh
transcend request enricher-restart \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=3be5e898-fea9-4614-84de-88cd5265c557 \
  --concurrency=100
```

**Restart requests within a specific timeframe**

```sh
transcend request enricher-restart \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=3be5e898-fea9-4614-84de-88cd5265c557 \
  --createdAtBefore=2024-04-05T00:00:00.000Z \
  --createdAtAfter=2024-02-21T00:00:00.000Z
```

**Restart requests that are in an error state**

```sh
transcend request enricher-restart \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=3be5e898-fea9-4614-84de-88cd5265c557 \
  --requestEnricherStatuses=ERROR
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

#### Examples

**Bulk clear out any request identifiers that are unverified**

```sh
transcend request reject-unverified-identifiers --auth="$TRANSCEND_API_KEY" --identifierNames=phone
```

**Restart specific request types**

```sh
transcend request reject-unverified-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --identifierNames=phone \
  --actions=ACCESS,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request reject-unverified-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --identifierNames=phone \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Pull all requests**

```sh
transcend request export --auth="$TRANSCEND_API_KEY"
```

**Filter for specific actions and statuses**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --statuses=COMPILING,ENRICHING --actions=ACCESS,ERASURE
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --transcendUrl=https://api.us.transcend.io
```

**With Sombra authentication**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --sombraAuth="$SOMBRA_INTERNAL_KEY"
```

**Increase the concurrency (defaults to 100)**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --concurrency=500
```

**Filter for production requests only**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --showTests=false
```

**Filter for requests within a date range**

```sh
transcend request export \
  --auth="$TRANSCEND_API_KEY" \
  --createdAtBefore=2024-04-05T00:00:00.000Z \
  --createdAtAfter=2024-02-21T00:00:00.000Z
```

**Write to a specific file location**

```sh
transcend request export --auth="$TRANSCEND_API_KEY" --file=./path/to/file.csv
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

#### Examples

**Bulk skipping preflight checks**

```sh
transcend request skip-preflight-jobs --auth="$TRANSCEND_API_KEY" --enricherIds=70810f2e-cf90-43f6-9776-901a5950599f
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request skip-preflight-jobs \
  --auth="$TRANSCEND_API_KEY" \
  --enricherIds=70810f2e-cf90-43f6-9776-901a5950599f,db1e64ba-cea6-43ff-ad27-5dc8122e5224 \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Mark all associated privacy request jobs as completed**

```sh
transcend request system mark-request-data-silos-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f
```

**Pull to a specific file location**

```sh
transcend request system mark-request-data-silos-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --file=/Users/transcend/Desktop/test.csv
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request system mark-request-data-silos-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Bulk restarting a set of data silos jobs for open privacy requests**

```sh
transcend request system retry-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ACCESS
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request system retry-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ACCESS \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Bulk skipping all open privacy request jobs for a particular data silo**

```sh
transcend request system skip-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request system skip-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --transcendUrl=https://api.us.transcend.io
```

**Only mark as completed requests in "removing data" phase**

```sh
transcend request system skip-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --statuses=SECONDARY
```

**Set to status "RESOLVED" instead of status "SKIPPED"**

```sh
transcend request system skip-request-data-silos \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --status=RESOLVED
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

3. Push updated back to Transcend:

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

#### Examples

**Pull down the set of privacy requests that are currently pending manual enrichment**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY"
```

**Pull to a specific file location**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY" --file=/Users/transcend/Desktop/test.csv
```

**For specific types of requests**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY" --actions=ACCESS,ERASURE
```

**For US hosted infrastructure**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY" --transcendUrl=https://api.us.transcend.io
```

**With Sombra authentication**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY" --sombraAuth="$SOMBRA_INTERNAL_KEY"
```

**With specific concurrency**

```sh
transcend request preflight pull-identifiers --auth="$TRANSCEND_API_KEY" --concurrency=200
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

3. Push updated back to Transcend:

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

#### Examples

**Push up a set of identifiers for a set of requests pending manual enrichment**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf
```

**Pull to a specific file location**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf \
  --file=/Users/transcend/Desktop/test.csv
```

**For US hosted infrastructure**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf \
  --transcendUrl=https://api.us.transcend.io
```

**With Sombra authentication**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf \
  --sombraAuth="$SOMBRA_INTERNAL_KEY"
```

**With specific concurrency**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf \
  --concurrency=200
```

**When enriching requests, mark all requests as silent mode before processing**

```sh
transcend request preflight push-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --enricherId=27d45a0d-7d03-47fa-9b30-6d697005cfcf \
  --markSilent
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

#### Examples

**Pull outstanding identifiers for a data silo**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE
```

**Pull to a specific file location**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE \
  --file=/Users/transcend/Desktop/test.csv
```

**For self-hosted sombras that use an internal key**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE \
  --sombraAuth="$SOMBRA_INTERNAL_KEY"
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE \
  --transcendUrl=https://api.us.transcend.io
```

**Specifying the page limit, defaults to 100**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE \
  --pageLimit=300 \
  --chunkSize=6000
```

**Specifying the chunk size for large datasets to avoid file size limits (defaults to 100,000 rows per file)**

```sh
transcend request cron pull-identifiers \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --actions=ERASURE \
  --chunkSize=50000
```

### `transcend request cron mark-identifiers-completed`

```txt
USAGE
  transcend request cron mark-identifiers-completed (--auth value) (--dataSiloId value) [--file value] [--transcendUrl value] [--sombraAuth value]
  transcend request cron mark-identifiers-completed --help

This command takes the output of "transcend request cron pull-identifiers" and notifies Transcend that all of the requests in the CSV have been processed.
This is used in the workflow like:

1. Pull identifiers to CSV:

   transcend request cron pull-identifiers \
     --auth="$TRANSCEND_API_KEY" \
     --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
     --actions=ERASURE \
     --file=./outstanding-requests.csv

2. Run your process to operate on that CSV of requests.

3. Notify Transcend of completion

   transcend request cron mark-identifiers-completed \
     --auth="$TRANSCEND_API_KEY" \
     --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
     --file=./outstanding-requests.csv

Read more at https://docs.transcend.io/docs/integrations/cron-job-integration.

FLAGS
      --auth           The Transcend API key. This key must be associated with the data silo(s) being operated on. No scopes are required for this command.
      --dataSiloId     The ID of the data silo to pull in
     [--file]          Path to the CSV file where identifiers will be written to                                                                            [default = ./cron-identifiers.csv]
     [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                         [default = https://api.transcend.io]
     [--sombraAuth]    The Sombra internal key, use for additional authentication when self-hosting Sombra
  -h  --help           Print help information and exit
```

#### Examples

**Mark identifiers as completed**

```sh
transcend request cron mark-identifiers-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f
```

**Pull to a specific file location**

```sh
transcend request cron mark-identifiers-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --file=/Users/transcend/Desktop/test.csv
```

**For self-hosted sombras that use an internal key**

```sh
transcend request cron mark-identifiers-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --sombraAuth="$SOMBRA_INTERNAL_KEY"
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend request cron mark-identifiers-completed \
  --auth="$TRANSCEND_API_KEY" \
  --dataSiloId=70810f2e-cf90-43f6-9776-901a5950599f \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Build XDI sync endpoint**

```sh
transcend consent build-xdi-sync-endpoint --auth="$TRANSCEND_API_KEY" --xdiLocation=https://cdn.your-site.com/xdi.js
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent build-xdi-sync-endpoint \
  --auth="$TRANSCEND_API_KEY" \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --transcendUrl=https://api.us.transcend.io
```

**Pull to specific file location**

```sh
transcend consent build-xdi-sync-endpoint \
  --auth="$TRANSCEND_API_KEY" \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --file=./my-folder/sync-endpoint.html
```

**Don't filter out regular expressions**

```sh
transcend consent build-xdi-sync-endpoint \
  --auth="$TRANSCEND_API_KEY" \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --removeIpAddresses=false
```

**Filter out certain domains that should not be included in the sync endpoint definition**

```sh
transcend consent build-xdi-sync-endpoint \
  --auth="$TRANSCEND_API_KEY" \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --domainBlockList=ignored.com,localhost
```

**Override XDI allowed commands**

```sh
transcend consent build-xdi-sync-endpoint \
  --auth="$TRANSCEND_API_KEY" \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --xdiAllowedCommands=ExtractIdentifiers:Simple
```

**Configuring across multiple Transcend Instances**

```sh
# Pull down API keys across all Transcend instances
transcend admin generate-api-keys \
  --email="$TRANSCEND_EMAIL" \
  --password="$TRANSCEND_PASSWORD" \
  --transcendUrl=https://api.us.transcend.io \
  --scopes="View Consent Manager" \
  --apiKeyTitle="[cli][$TRANSCEND_EMAIL] XDI Endpoint Construction" \
  --file=./api-keys.json \
  --parentOrganizationId=1821d872-6114-406e-90c3-73b4d5e246cf

# Path list of API keys as authentication
transcend consent build-xdi-sync-endpoint \
  --auth=./api-keys.json \
  --xdiLocation=https://cdn.your-site.com/xdi.js \
  --transcendUrl=https://api.us.transcend.io
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

#### Examples

**Pull consent manager metrics for a Transcend account**

```sh
transcend consent pull-consent-metrics --auth="$TRANSCEND_API_KEY" --start=2024-01-01T00:00:00.000Z
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent pull-consent-metrics \
  --auth="$TRANSCEND_API_KEY" \
  --start=2024-01-01T00:00:00.000Z \
  --transcendUrl=https://api.us.transcend.io
```

**Pull start and end date explicitly**

```sh
transcend consent pull-consent-metrics \
  --auth="$TRANSCEND_API_KEY" \
  --start=2024-01-01T00:00:00.000Z \
  --end=2024-03-01T00:00:00.000Z
```

**Save to an explicit folder**

```sh
transcend consent pull-consent-metrics \
  --auth="$TRANSCEND_API_KEY" \
  --start=2024-01-01T00:00:00.000Z \
  --end=2024-03-01T00:00:00.000Z \
  --folder=./my-folder/
```

**Bin data hourly vs daily**

```sh
transcend consent pull-consent-metrics --auth="$TRANSCEND_API_KEY" --start=2024-01-01T00:00:00.000Z --bin=1h
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

#### Examples

**Fetch all consent preferences from partition key**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
```

**Fetch all consent preferences from partition key and save to ./consent.csv**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --file=./consent.csv
```

**Filter on consent updates before a date**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --timestampBefore=2024-04-03T00:00:00.000Z
```

**Filter on consent updates after a date**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --timestampAfter=2024-04-03T00:00:00.000Z
```

**For self-hosted sombras that use an internal key**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --sombraAuth="$SOMBRA_INTERNAL_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent pull-consent-preferences \
  --auth="$TRANSCEND_API_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --transcendUrl=https://api.us.transcend.io
```

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

#### Examples

**Update Consent Manager to latest version**

```sh
transcend consent update-consent-manager --auth="$TRANSCEND_API_KEY"
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent update-consent-manager --auth="$TRANSCEND_API_KEY" --transcendUrl=https://api.us.transcend.io
```

**Update version and deploy bundles**

```sh
transcend consent update-consent-manager --auth="$TRANSCEND_API_KEY" --deploy
```

**Update just the TEST bundle**

```sh
transcend consent update-consent-manager --auth="$TRANSCEND_API_KEY" --bundleTypes=TEST
```

**Update just the PRODUCTION bundle**

```sh
transcend consent update-consent-manager --auth="$TRANSCEND_API_KEY" --bundleTypes=PRODUCTION
```

**Update multiple organizations at once**

```sh
transcend admin generate-api-keys \
  --email=test@transcend.io \
  --password="$TRANSCEND_PASSWORD" \
  --scopes="Manage Consent Manager" \
  --apiKeyTitle="CLI Usage Cross Instance Sync" \
  --file=./transcend-api-keys.json
transcend consent update-consent-manager --auth=./transcend-api-keys.json --deploy
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

#### Examples

**Upload consent preferences to partition key**

```sh
transcend consent upload-consent-preferences \
  --base64EncryptionKey="$TRANSCEND_CONSENT_ENCRYPTION_KEY" \
  --base64SigningKey="$TRANSCEND_CONSENT_SIGNING_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726
```

**Upload consent preferences to partition key from file**

```sh
transcend consent upload-consent-preferences \
  --base64EncryptionKey="$TRANSCEND_CONSENT_ENCRYPTION_KEY" \
  --base64SigningKey="$TRANSCEND_CONSENT_SIGNING_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --file=./consent.csv
```

**Upload consent preferences to partition key and set concurrency**

```sh
transcend consent upload-consent-preferences \
  --base64EncryptionKey="$TRANSCEND_CONSENT_ENCRYPTION_KEY" \
  --base64SigningKey="$TRANSCEND_CONSENT_SIGNING_KEY" \
  --partition=4d1c5daa-90b7-4d18-aa40-f86a43d2c726 \
  --concurrency=200
```

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

#### Examples

**Upload the file of cookies in ./cookies.csv into the "Approved" tab**

```sh
transcend consent upload-cookies-from-csv --auth="$TRANSCEND_API_KEY" --trackerStatus=LIVE
```

**Upload the file of cookies in ./cookies.csv into the "Triage" tab**

```sh
transcend consent upload-cookies-from-csv --auth="$TRANSCEND_API_KEY" --trackerStatus=NEEDS_REVIEW
```

**Specifying the CSV file to read from**

```sh
transcend consent upload-cookies-from-csv \
  --auth="$TRANSCEND_API_KEY" \
  --trackerStatus=LIVE \
  --file=./custom/my-cookies.csv
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent upload-cookies-from-csv \
  --auth="$TRANSCEND_API_KEY" \
  --trackerStatus=LIVE \
  --transcendUrl=https://api.us.transcend.io
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

To get a CSV of data flows, you can download the data flows from the Admin Dashboard under [Consent Management -> Data Flows](https://app.transcend.io/consent-manager/data-flows). You can download data flows from both the "Triage" and "Approved" tabs.

<img width="4320" height="3071" alt="export-data-flows" src="https://github.com/user-attachments/assets/cfd9ea75-dd4a-42a6-98b7-2a54f565d783" />

#### Examples

**Upload the file of data flows in ./data-flows.csv into the "Approved" tab**

```sh
transcend consent upload-data-flows-from-csv --auth="$TRANSCEND_API_KEY" --trackerStatus=LIVE
```

**Upload the file of data flows in ./data-flows.csv into the "Triage" tab**

```sh
transcend consent upload-data-flows-from-csv --auth="$TRANSCEND_API_KEY" --trackerStatus=NEEDS_REVIEW
```

**Specifying the CSV file to read from**

```sh
transcend consent upload-data-flows-from-csv \
  --auth="$TRANSCEND_API_KEY" \
  --trackerStatus=LIVE \
  --file=./custom/my-data-flows.csv
```

**Have Transcend automatically fill in the service names by looking up the data flow host in Transcend's database**

```sh
transcend consent upload-data-flows-from-csv --auth="$TRANSCEND_API_KEY" --trackerStatus=LIVE --classifyService
```

**Specifying the backend URL, needed for US hosted backend infrastructure**

```sh
transcend consent upload-data-flows-from-csv \
  --auth="$TRANSCEND_API_KEY" \
  --trackerStatus=LIVE \
  --transcendUrl=https://api.us.transcend.io
```

### `transcend consent upload-preferences`

```txt
USAGE
  transcend consent upload-preferences (--auth value) (--partition value) [--sombraAuth value] [--transcendUrl value] (--directory value) [--dryRun] [--skipExistingRecordCheck] [--receiptFileDir value] [--schemaFilePath value] [--skipWorkflowTriggers] [--forceTriggerWorkflows] [--skipConflictUpdates] [--isSilent] [--attributes value] [--receiptFilepath value] [--concurrency value] [--uploadConcurrency value] [--maxChunkSize value] [--rateLimitRetryDelay value] [--uploadLogInterval value] [--downloadIdentifierConcurrency value] [--maxRecordsToReceipt value] (--allowedIdentifierNames value) (--identifierColumns value) [--columnsToIgnore value] [--
```
