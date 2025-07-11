import type { LocalContext } from '@/context';
import type { UnstructuredSubDataPointRecommendationStatus } from '@transcend-io/privacy-types';
import colors from 'colors';
import { uniq } from 'lodash-es';
import { writeCsv } from '@/lib/cron';
import { pullUnstructuredSubDataPointRecommendations } from '@/lib/data-inventory';
import { buildTranscendGraphQLClient } from '@/lib/graphql';
import { logger } from '@/logger';

interface PullUnstructuredDiscoveryFilesCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  dataSiloIds?: string[];
  subCategories?: string[];
  status?: UnstructuredSubDataPointRecommendationStatus[];
  includeEncryptedSnippets: boolean;
}

export async function pullUnstructuredDiscoveryFiles(
  this: LocalContext,
  {
    auth,
    file,
    transcendUrl,
    dataSiloIds,
    subCategories,
    status,
    includeEncryptedSnippets,
  }: PullUnstructuredDiscoveryFilesCommandFlags,
): Promise<void> {
  try {
    // Create a GraphQL client
    const client = buildTranscendGraphQLClient(transcendUrl, auth);

    const entries = await pullUnstructuredSubDataPointRecommendations(client, {
      dataSiloIds,
      subCategories, // TODO: https://transcend.height.app/T-40482 - do by name not ID
      status,
      includeEncryptedSnippets,
    });

    logger.info(
      colors.magenta(
        `Writing unstructured discovery files to file "${file}"...`,
      ),
    );
    let headers: string[] = [];
    const inputs = entries.map((entry) => {
      const result = {
        'Entry ID': entry.id,
        'Data Silo ID': entry.dataSiloId,
        'Object Path ID': entry.scannedObjectPathId,
        'Object ID': entry.scannedObjectId,
        ...(includeEncryptedSnippets
          ? { Entry: entry.name, 'Context Snippet': entry.contextSnippet }
          : {}),
        'Data Category': `${entry.dataSubCategory.category}:${entry.dataSubCategory.name}`,
        'Classification Status': entry.status,
        'Confidence Score': entry.confidence,
        'Classification Method': entry.classificationMethod,
        'Classifier Version': entry.classifierVersion,
      };
      headers = uniq([...headers, ...Object.keys(result)]);
      return result;
    });
    writeCsv(file, inputs, headers);
  } catch (err) {
    logger.error(
      colors.red(
        `An error occurred syncing the unstructured discovery files: ${err.message}`,
      ),
    );
    process.exit(1);
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced unstructured discovery files to disk at ${file}!`,
    ),
  );
}
