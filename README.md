<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Authentication](#authentication)
- [transcend.yml](#transcendyml)
- [Usage](#usage)
  - [tr-pull](#tr-pull)
  - [tr-push](#tr-push)
    - [Dynamic Variables](#dynamic-variables)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

A command line interface that allows you to define your Data Map in code and sync that configuration back to https://app.transcend.io.

## Installation

This package is distributed through npm and github package registries and assumes an installation of [npm and node](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

If your codebase is typescript or javascript based, you can add this package as a dev dependency:

```sh
# install locally with yarn
yarn add -D @transcend-io/schema-sync

# cli commands available within package
yarn tr-pull --auth=xxx
yarn tr-push --auth=xxx
```

or

```sh
# install locally with npm
npm i -D @transcend-io/schema-sync

# cli commands available within package
tr-pull --auth=xxx
tr-push --auth=xxx
```

alternatively, you can install the cli globally on your machine:

```sh
# install locally with npm
npm i -g @transcend-io/schema-sync

# cli commands available everywhere on machine
tr-pull --auth=xxx
tr-push --auth=xxx
```

## Authentication

In order to use this cli, you will first need to generate an API key on the Transcend Admin Dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- Manage Data Map
- Manage Request Identity Verification
- Connect data silos
- Manage Data Subject Request Settings
- View API Keys

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
    url: https://example.acme.com/transcend-webhook
    api-key-title: Webhook Key
    privacy-actions:
      - ACCESS
      - ERASURE
      - SALE_OPT_OUT
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
    objects:
      - title: User Model
        description: The centralized user model user
        key: users
        purpose: ESSENTIAL
        category: USER_PROFILE
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

```sh
# Writes out file to ./transcend.yml
tr-pull --auth=<api-key>
```

An alternative file destination can be specified:

```sh
# Writes out file to ./custom/location.yml
tr-pull --auth=<api-key> --file=./custom/location.yml
```

Note: This command will overwrite the existing transcend.yml file that you have locally.

### tr-push

Given a transcend.yml file, sync the contents up to your connected services view (https://app.transcend.io/privacy-requests/connected-services).

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
3. If you define new data subjects, identifiers, data silos or objects that were not previously defined on the Admin Dashboard, the cli will create these new resources automatically.
4. Currently, this cli does not handle deleting or renaming of resources. If you need to delete or rename a data silo, identifier, enricher or API key, you should make the change on the Admin Dashboard.
5. The only resources that this cli will not auto generate are:

- a) Data silo owners: If you assign an email address to a data silo, you must first make sure that user is invited into your Transcend instance (https://app.transcend.io/admin/users).
- b) API keys: This cli will not create new API keys. You will need to first create the new API keys on the Admin Dashboard (https://app.transcend.io/infrastructure/api-keys). You can then list out the titles of the API keys that you generated in your transcend.yml file, after which the cli is capable of updating that API key to be able to respond to different data silos in your Data Map

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
    description: The mega-warehouse that contains a copy over all SQL backed databases - <<parameters.stage>>
    url: https://example.<<parameters.domain>>/transcend-webhook
    api-key-title: Webhook Key
```
