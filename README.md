# Transcend CLI

A command line interface that allows you to programatically interact with the Transcend.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Changelog](#changelog)
- [Installation](#installation)
- [transcend.yml](#transcendyml)
- [Usage](#usage)
  - [`transcend request approve`](#transcend-request-approve)
  - [`transcend request upload`](#transcend-request-upload)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Changelog

To stay up to date on breaking changes to the CLI between major version updates, please refer to [CHANGELOG.md](CHANGELOG.md).

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
     [--transcendUrl]      URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                         [default = https://yo.com:4001]
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
     [--transcendUrl]                         URL of the Transcend backend. Use https://api.us.transcend.io for US hosting                                                               [default = https://yo.com:4001]
     [--cacheFilepath]                        The path to the JSON file encoding the metadata used to map the CSV shape to Transcend API                                                 [default = ./transcend-privacy-requests-cache.json]
     [--requestReceiptFolder]                 The path to the folder where receipts of each upload are stored                                                                            [default = ./privacy-request-upload-receipts]
     [--sombraAuth]                           The Sombra internal key, use for additional authentication when self-hosting Sombra
     [--concurrency]                          The concurrency to use when uploading requests in parallel                                                                                 [default = 50]
     [--attributes]                           Tag all of the requests with the following attributes. Format: key1:value1;value2,key2:value3;value4                                       [default = Tags:transcend-cli]
     [--isTest]                               Flag whether the requests being uploaded are test requests or regular requests                                                             [default = false]
     [--isSilent/--noIsSilent]                Flag whether the requests being uploaded should be submitted in silent mode                                                                [default = true]
     [--skipSendingReceipt]                   Flag whether to skip sending of the receipt email                                                                                          [default = false]
     [--emailIsVerified/--noEmailIsVerified]  Indicate whether the email address being uploaded is pre-verified. Set to false to send a verification email                               [default = true]
     [--skipFilte
```
