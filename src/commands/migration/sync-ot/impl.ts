import type { LocalContext } from '../../../context';
import { logger } from '../../../logger';
import colors from 'colors';
import { createOneTrustGotInstance } from '../../../lib/oneTrust';
import {
  OneTrustFileFormat,
  OneTrustPullResource,
  OneTrustPullSource,
} from '../../../enums';
import { buildTranscendGraphQLClient } from '../../../lib/graphql';
import {
  syncOneTrustAssessmentsFromFile,
  syncOneTrustAssessmentsFromOneTrust,
} from '../../../lib/oneTrust/helpers';

// Command flag interface
interface SyncOtCommandFlags {
  hostname?: string;
  oneTrustAuth?: string;
  source: OneTrustPullSource;
  transcendAuth?: string;
  transcendUrl: string;
  file?: string;
  resource: OneTrustPullResource;
  dryRun: boolean;
  debug: boolean;
}

// Command implementation
export async function syncOt(
  this: LocalContext,
  {
    hostname,
    oneTrustAuth,
    source,
    transcendAuth,
    transcendUrl,
    resource,
    file,
    dryRun,
    debug,
  }: SyncOtCommandFlags,
): Promise<void> {
  // Must be able to authenticate to transcend to sync resources to it
  if (!dryRun && !transcendAuth) {
    throw new Error(
      // eslint-disable-next-line no-template-curly-in-string
      'Must specify a "transcendAuth" parameter to sync resources to Transcend. e.g. --transcendAuth=${TRANSCEND_API_KEY}',
    );
  }

  // If trying to sync to disk, must specify a file path
  if (dryRun && !file) {
    throw new Error(
      'Must set a "file" parameter when "dryRun" is "true". e.g. --file=./oneTrustAssessments.json',
    );
  }

  if (file) {
    const splitFile = file.split('.');
    if (splitFile.length < 2) {
      throw new Error(
        'The "file" parameter has an invalid format. Expected a path with extensions. e.g. --file=./pathToFile.json.',
      );
    }
    if (splitFile.at(-1) !== OneTrustFileFormat.Json) {
      throw new Error(
        `Expected the format of the "file" parameters '${file}' to be '${
          OneTrustFileFormat.Json
        }', but got '${splitFile.at(-1)}'.`,
      );
    }
  }

  // if reading assessments from a OneTrust
  if (source === OneTrustPullSource.OneTrust) {
    // must specify the OneTrust hostname
    if (!hostname) {
      throw new Error(
        'Missing required parameter "hostname". e.g. --hostname=customer.my.onetrust.com',
      );
    }
    // must specify the OneTrust auth
    if (!oneTrustAuth) {
      throw new Error(
        'Missing required parameter "oneTrustAuth". e.g. --oneTrustAuth=$ONE_TRUST_AUTH_TOKEN',
      );
    }
  } else {
    // if reading the assessments from a file, must specify a file to read from
    if (!file) {
      throw new Error(
        'Must specify a "file" parameter to read the OneTrust assessments from. e.g. --source=./oneTrustAssessments.json',
      );
    }

    // Cannot try reading from file and save assessments to a file simultaneously
    if (dryRun) {
      throw new Error(
        'Cannot read and write to a file simultaneously.' +
          ` Emit the "source" parameter or set it to ${OneTrustPullSource.OneTrust} if "dryRun" is enabled.`,
      );
    }
  }

  // instantiate a client to talk to OneTrust
  const oneTrust =
    hostname && oneTrustAuth
      ? createOneTrustGotInstance({
          hostname,
          auth: oneTrustAuth,
        })
      : undefined;

  // instantiate a client to talk to Transcend
  const transcend =
    transcendUrl && transcendAuth
      ? buildTranscendGraphQLClient(transcendUrl, transcendAuth)
      : undefined;

  try {
    if (resource === OneTrustPullResource.Assessments) {
      if (source === OneTrustPullSource.OneTrust && oneTrust) {
        await syncOneTrustAssessmentsFromOneTrust({
          oneTrust,
          file,
          dryRun,
          ...(transcend && { transcend }),
        });
      } else if (source === OneTrustPullSource.File && file && transcend) {
        await syncOneTrustAssessmentsFromFile({ file, transcend });
      }
    }
  } catch (err) {
    throw new Error(
      `An error occurred syncing the resource ${resource} from OneTrust: ${
        debug ? err.stack : err.message
      }`,
    );
  }

  // Indicate success
  logger.info(
    colors.green(
      `Successfully synced OneTrust ${resource} to ${
        dryRun ? `disk at "${file}"` : 'Transcend'
      }!`,
    ),
  );
}
