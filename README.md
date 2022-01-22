<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Overview](#overview)
- [Typescript Build](#typescript-build)
- [Lint](#lint)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

A command line interface for programmatically creating data silos on app.transcend.io

## Typescript Build

Build this package only:

```sh
yarn run tsc
yarn run tsc --watch # Watch mode
```

Create a fresh build:

```sh
yarn clean && yarn run tsc
```

## Lint

Lint the typescript files in this package:

```sh
yarn lint
```
