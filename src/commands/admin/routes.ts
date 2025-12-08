import { buildRouteMap } from '@stricli/core';
import { generateApiKeysCommand } from './generate-api-keys/command';
import { chunkCsvCommand } from './chunk-csv/command';
import { parquetToCsvCommand } from './parquet-to-csv/command';
import { birthdateMigrationCommand } from './birthdate-migration/command';

export const adminRoutes = buildRouteMap({
  routes: {
    'generate-api-keys': generateApiKeysCommand,
    'chunk-csv': chunkCsvCommand,
    'parquet-to-csv': parquetToCsvCommand,
    'birthdate-migration': birthdateMigrationCommand,
  },
  docs: {
    brief: 'Admin commands',
  },
});

// pnpm start admin birthdate-migration \
// --auth="6cfaeb0dbb2a967de75078bca0541089496876db75bcc7a4f0db742c996dfe0d" \
// --sombraAuth="TWW/WOXkvIuqGLG1bVoBFJ7bpIyC75TQ4eHc1ku7oxs=" \
// --partition="ea94a7f1-3c66-434d-a463-934a4ea66b3a" \
// --transcendUrl="https://api.us.transcend.io" \
// --chunksDir="./working/chunks" \
// --maxRecords=50000 \
// --batchSize=100
