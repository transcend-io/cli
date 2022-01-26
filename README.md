<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Authentication](#authentication)
- [Usage](#usage)
  - [transcend:pull](#transcendpull)
  - [transcend:push](#transcendpush)
- [Local Development](#local-development)
  - [Typescript Build](#typescript-build)
  - [Lint](#lint)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

A command line interface for programmatically creating data silos on app.transcend.io

## Installation

This package is distributed through npm and github package registries. The simplest way to install would be:

```sh
yarn add -D @transcend-io/schema-sync
```

or

```sh
npm i -D @transcend-io/schema-sync
```

## Authentication

In order to use this cli, you will first need to generate an API key on the Transcend admin dashboard (https://app.transcend.io/infrastructure/api-keys).

The API key needs the following scopes:

- Manage Data Map
- Manage Request Identity Verification
- Connect Data Silos
- Manage Data Subject Request Settings
- View API Keys

## Usage

### transcend:pull

```sh
yarn transcend:pull --auth=<api-key>
```

### transcend:push

```sh
yarn transcend:push --auth=<api-key>
```

## Local Development

### Typescript Build

Build this package only:

```sh
yarn run tsc
yarn run tsc --watch # Watch mode
```

Create a fresh build:

```sh
yarn clean && yarn run tsc
```

### Lint

Lint the typescript files in this package:

```sh
yarn lint
```
