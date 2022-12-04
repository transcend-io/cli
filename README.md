<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [transcend.yml](#transcendyml)
- [Usage](#usage)
  - [tr-pull](#tr-pull)
    - [Authentication](#authentication)
    - [Usage](#usage-1)
  - [tr-push](#tr-push)
    - [Authentication](#authentication-1)
    - [Usage](#usage-2)
    - [CI Integration](#ci-integration)
    - [Dynamic Variables](#dynamic-variables)
  - [tr-discover-silos](#tr-discover-silos)
    - [Authentication](#authentication-2)
    - [Usage](#usage-3)
  - [tr-request-upload](#tr-request-upload)
    - [Authentication](#authentication-3)
  - [Usage](#usage-4)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

A command line interface that allows you to define your Data Map in code and sync that configuration back to https://app.transcend.io.

## Installation

This package is distributed through npm and github package registries and assumes an installation of [npm and node](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

If your codebase is typescript or javascript based, you can add this package as a dev dependency:

```sh
# install locally with yarn
yarn add -D @transcend-io/cli

# cli commands available within package
yarn tr-pull --auth=xxx
yarn tr-push --auth=xxx
yarn tr-discover-silos --auth=xxx
yarn tr-request-upload --auth=xxx
```

or

```sh
# install locally with npm
npm i -D @transcend-io/cli

# cli commands available within package
tr-pull --auth=xxx
tr-push --auth=xxx
tr-discover-silos --auth=xxx
tr-request-upload --auth=xxx
```

alternatively, you can install the cli globally on your machine:

```sh
# install locally with npm
npm i -g @transcend-io/cli

# cli commands available everywhere on machine
tr-pull --auth=xxx
tr-push --auth=xxx
tr-discover-silos --auth=xxx
tr-request-upload --auth=xxx
```

## transcend.yml

Within your git repositories, you can define a file `transcend.yml`. This file allows you define part of your Data Map in code. Using the cli, you can sync that configuration back to the Transcend Admin Dashboard (https://app.transcend.io/privacy-requests/connected-services).

You can find various examples for your `transcend.yml` file in the [examples/](./examples/) folder. If you are looking for a starting point to copy and paste, [simple.yml](./examples/simple.yml) is a good place to start. This file is annotated with links and documentations that new members of your team can use if they come across the file.

The API for this YAML file can be found in [./src/codecs.ts](./src/codecs.ts) under the variable named "TranscendInput". The shape of the yaml file will be type-checked every time a command is run.

The structure of the file looks something like the following:

```yaml
# Manage at: https://app.transcend.io/infrastructure/api-keys
# See https://docs.transcend.io/docs/authentication
# Define API keys that may be shared across data silos
# in the data map. When creating new data silos through the yaml
# cli, it is possible to specify which API key should be associated
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

### tr-pull

Generate's a transcend.yml by pulling the configuration from your connected services view (https://app.transcend.io/privacy-requests/connected-services).

This command can be helpful if you are looking to:

- Copy parts of your Data Map from one Transcend instance into another instance
- Generate a transcend.yml file as a starting point to maintain parts of your Data Map in code

#### Authentication

In order to use this cli, you will first need to generate an API key on the Transcend Admin Dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- View Data Map
- View Identity Verification Settings
- View Data Subject Request Settings
- View API Keys
- View Email Templates

_Note: The scopes for tr-push are comprehensive of the scopes for tr-pull_

#### Usage

```sh
# Writes out file to ./transcend.yml
tr-pull --auth=<api-key>
```

An alternative file destination can be specified:

```sh
# Writes out file to ./custom/location.yml
tr-pull --auth=<api-key> --file=./custom/location.yml
```

Or a specific data silo(s) can be pulled in:

```sh
tr-pull --auth=<api-key> --dataSiloIds=710fec3c-7bcc-4c9e-baff-bf39f9bec43e
```

Or a specific types of data silo(s) can be pulled in:

```sh
tr-pull --auth=<api-key> --integrationNames=salesforce,snowflake
```

Or with a specific page size (max 100)

```sh
tr-pull --auth=<api-key> --integrationNames=salesforce,snowflake --pageSize=30
```

Or with debug logs

```sh
tr-pull --auth=<api-key> --integrationNames=salesforce,snowflake --debug=true
```

Note: This command will overwrite the existing transcend.yml file that you have locally.

### tr-push

Given a transcend.yml file, sync the contents up to your connected services view (https://app.transcend.io/privacy-requests/connected-services).

#### Authentication

In order to use this cli, you will first need to generate an API key on the Transcend Admin Dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- Manage Data Map
- Manage Request Identity Verification
- Connect Data Silos
- Manage Data Subject Request Settings
- View API Keys
- Manage Email Templates

#### Usage

```sh
# Looks for file at ./transcend.yml
tr-push --auth=<api-key>
```

An alternative file destination can be specified:

```sh
# Looks for file at custom location ./custom/location.yml
tr-push --auth=<api-key> --file=./custom/location.yml
```

Some things to note about this sync process:

1. Any field that is defined in your .yml file will be synced up to app.transcend.io. If any change was made on the admin dashboard, it will be overwritten.
2. If you omit a field from the yaml file, this field will not be synced. This gives you the ability to define as much or as little configuration in your transcend.yml file as you would like, and let the remainder of fields be labeled through the Admin Dashboard
3. If you define new data subjects, identifiers, data silos or datapoints that were not previously defined on the Admin Dashboard, the cli will create these new resources automatically.
4. Currently, this cli does not handle deleting or renaming of resources. If you need to delete or rename a data silo, identifier, enricher or API key, you should make the change on the Admin Dashboard.
5. The only resources that this cli will not auto generate are:

- a) Data silo owners: If you assign an email address to a data silo, you must first make sure that user is invited into your Transcend instance (https://app.transcend.io/admin/users).
- b) API keys: This cli will not create new API keys. You will need to first create the new API keys on the Admin Dashboard (https://app.transcend.io/infrastructure/api-keys). You can then list out the titles of the API keys that you generated in your transcend.yml file, after which the cli is capable of updating that API key to be able to respond to different data silos in your Data Map

#### CI Integration

Once you have a workflow for creating your transcend.yml file, you will want to integrate your `tr-push` command on your CI.

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
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install Transcend cli
        run: npm i -D @transcend-io/cli

      # If you have a script that generates your transcend.yml file from
      # an ORM or infrastructure configuration, add that step here
      # Leave this step commented out if you want to manage your transcend.yml manually
      # - name: Generate transcend.yml
      #   run: ./scripts/generate_transcend_yml.py

      - name: Push Transcend config
        run: npx tr-push --auth=${{ secrets.TRANSCEND_API_KEY }}
```

#### Dynamic Variables

If you are using this cli to sync your Data Map between multiple Transcend instances, you may find the need to make minor modifications to your configurations between environments. The most notable difference would be the domain where your webhook URLs are hosted on.

The `tr-push` command takes in a parameter `variables`. This is a CSV of `key:value` pairs.

```sh
tr-push --auth=<api-key> --variables=domain:acme.com,stage:staging
```

This command could fill out multiple parameters in a yaml file like [./examples/multi-instance.yml](./examples/multi-instance.yml), copied below:

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

### tr-discover-silos

Transcend can help scan dependency management files to help detect new data silos where you may be storing user personal data. Currently we support scanning for new data silos in Javascript, Python, Gradle, and CocoaPods projects.

To get started, you'll need to add a data silo for the corresponding project type with "silo discovery" plugin enabled. For example, if you want to scan a JavaScript project, add a JavaScript package.json data silo. You can do this in the Transcend admin-dashboard (or via this CLI tooling).

#### Authentication

In order to use this cli, you will first need to generate an API key on the Transcend Admin Dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- Manage Assigned Data Inventory
- [Data Silo for Scanner]

#### Usage

Then, you'll need to grab that `dataSiloId` and a Transcend API key and pass it to the CLI. Using JavaScript package.json as an example:

```sh
# Scan a javascript project (package.json files) to look for new data silos
yarn tr-discover-silos --scanPath=./myJavascriptProject --auth={{api_key}} --dataSiloId=abcdefg
```

This call will look for all the package.json files that in the scan path `./myJavascriptProject`, parse each of the dependencies into their individual package names, and send it to our Transcend backend for classification. These classifications can then be viewed [here](https://app.transcend.io/data-map/data-inventory/silo-discovery/triage). The process is the same for scanning requirements.txt, podfiles and build.gradle files.

You can include additional arguments as well:

| Argument   | Description                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scanPath   | File path in the project to scan.                                                                                                                                    |
| dataSiloID | The UUID of the corresponding data silo.                                                                                                                             |
| auth       | Transcend API key.                                                                                                                                                   |
| fileGlobs  | You can pass a [glob syntax pattern(s)](https://github.com/mrmlnc/fast-glob) to specify additional file paths to scan in addition to the default (ex: package.json). |

### tr-request-upload

If you need to upload a set of requests from a CSV, you can run this command.
This command uses [inquirer](https://github.com/SBoudrias/Inquirer.js/) to prompt the user to
map the shape of the CSV to the shape of the Transcend API. There is no requirement for the
shape of the incoming CSV, as the script will handle the mapping process.

The script will also produce a JSON cache file, that allows for the mappings to be preserved between runs.
This can be useful if you have the same CSV shape that needs to be imported multiple times.
Once the mapping process is done once, it does not need to be done again.

Additionally, the JSON cache file will store the result of any privacy requests that fail to be uploaded.
This allows for the script to continue uploading requests even if some requests error out. The script
user can then inspect the errors, and decide whether it is necessary to re-run those requests.

https://user-images.githubusercontent.com/10264973/205477183-d4762087-668c-43f1-a84c-0fce0ec3e132.mov

#### Authentication

In order to use this cli, you will first need to generate an API key on the Transcend Admin Dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- Submit New Data Subject Request
- View Identity Verification Settings
- View Global Attributes

### Usage

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv
```

For self-hosted sombras that use an internal key:

```sh
yarn tr-request-upload --auth=<api-key> --sombraAuth=<sombra-internal-key> --file=/Users/michaelfarrell/Desktop/test.csv
```

Run without being prompted to filter requests

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --skipFilterStep=true
```

Perform a dry run to see what will be uploaded, without calling the Transcend API to upload the request

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --dryRun=true
```

Mark the uploaded requests as test requests

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --isTest=true
```

Send email communications to the users throughout the request lifecycle.

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --isSilent=false
```

Send email verification to user before request continues.

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv \
   --isSilent=false --emailIsVerified=false
```

Increase the concurrency (defaults to 20)

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --concurrency=20
```

Tag all uploaded requests with an attribute

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv \
  --attributes=Tags:transcend-cli;my-customer-tag,Customer:acme-corp
```

Clear out the cache of failed and successful requests

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv \
 --clearFailingRequests=true --clearSuccessfulRequests=true --clearDuplicateRequests=true
```

Specify default country code for phone numbers

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --defaultPhoneCountryCode=44
```

Include debug logs - warning, this logs out personal data.

```sh
yarn tr-request-upload --auth=<api-key> --file=/Users/michaelfarrell/Desktop/test.csv --debug=true
```
