<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Developers](#developers)
  - [Getting started](#getting-started)
  - [Repo Structure](#repo-structure)
  - [Generated files](#generated-files)
    - [README.md](#readmemd)
    - [transcend.yml and pathfinder.yml JSON schemas](#transcendyml-and-pathfinderyml-json-schemas)
  - [Testing](#testing)
  - [Publishing](#publishing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Developers

## Getting started

1. Make sure you are on Node 22 or above

```bash
node --version
nvm install 22 && nvm use 22 && nvm alias default 22
```

2. Use the `pnpm` package manager.

```bash
npm i -g corepack@latest
corepack enable
corepack install
```

3. Install dependencies

```bash
pnpm install
```

4. Build the project in watch mode in a separate terminal

```bash
pnpm build:watch
```

5. To run a CLI command in dev mode:

```bash
# This is the dev environment equivalent to `transcend --help`
pnpm start --help

# This is the dev environment equivalent to `transcend inventory pull --auth=my-api-key`
pnpm start inventory pull --auth=my-api-key
```

If you have the appropriate permissions, you can generate your own API key at https://app.transcend.io/infrastructure/api-keys (or the equivalent page in whichever backend you're testing against) with the necessary scopes.

## Repo Structure

The `src/commands/` directory contains the CLI commands and has a strict structure which is [tested](https://github.com/transcend-io/cli/blob/77652c1959807610ec97fe0be73d69e78b8e5480/src/lib/tests/codebase.test.ts).

The folders are the namespace of the CLI, so `src/commands/request/cron/pull-identifiers/command.ts` is the command for `transcend request cron pull-identifiers`. The _route_ portion of the file path is `/request/cron` and the _command_ portion of the file path is `/pull-identifiers`.

- `src/commands/[...route]/[command]/command.ts` contains the [command](https://bloomberg.github.io/stricli/docs/features/command-routing/commands) arguments and CLI documentation.
- `src/commands/[...route]/[command]/impl.ts` contains the actual function that gets executed when the command runs.
- `src/commands/[...route]/[command]/readme.ts` is an optional file that can be used to add additional documentation to this repo's README.md for the command. This gets injected into the README.md below the CLI documentation for that command. NOTE: This should be used sparingly, since it is difficult to keep up to date. Prefer to use the `docs` field in the `command.ts` file instead.
- `src/commands/[...route]/routes.ts` contains the command [route maps](https://bloomberg.github.io/stricli/docs/features/command-routing/route-maps). This must export any new commands.

For more information on the commands and routings, see [the Stricli documentation](https://bloomberg.github.io/stricli/).

## Generated files

To just regenerate them all:

```bash
pnpm genfiles
```

### README.md

```bash
pnpm docgen
```

This will generate the README.md file from the command documentation and the `src/commands/**/readme.ts` files. To add examples, use the `buildExamples` command to generate type-safe examples. For complex or multi-line bash scripts, use `buildExampleCommand` directly (search for examples in the codebase).

### transcend.yml and pathfinder.yml JSON schemas

```bash
pnpm script:build-transcend-json-schema
```

This will generate the transcend-yml-schema.json file from the command documentation. These are published to [schemastore](https://github.com/SchemaStore/schemastore) which powers linting / JSON schema support in VSCode and other IDEs.

## Testing

Uses vitest (same test syntax as Jest/Mocha/Chai).

```bash
pnpm test
```

## Publishing

CI will automatically publish a new version to npm.

To manually publish an alpha version:

```bash
npm publish --tag alpha
```
