import { logger } from '../../logger';
import colors from 'colors';
import yargs from 'yargs-parser';
import {
  OneTrustFileFormat,
  OneTrustPullResource,
  OneTrustPullSource,
} from '../../enums';

const VALID_RESOURCES = Object.values(OneTrustPullResource);
const VALID_FILE_FORMATS = Object.values(OneTrustFileFormat);

interface OneTrustCliArguments {
  /** The name of the file to write the resources to */
  file: string;
  /** The OneTrust hostname to send the requests to */
  hostname?: string;
  /** The OAuth Bearer token used to authenticate the requests to OneTrust */
  oneTrustAuth?: string;
  /** The Transcend API key to authenticate the requests to Transcend */
  transcendAuth: string;
  /** The Transcend URL where to forward requests */
  transcendUrl: string;
  /** The resource to pull from OneTrust */
  resource: OneTrustPullResource;
  /** Whether to enable debugging while reporting errors */
  debug: boolean;
  /** The export format of the file where to save the resources */
  fileFormat: OneTrustFileFormat;
  /** Whether to export the resource into a file rather than push to transcend */
  dryRun: boolean;
  /** Where to read the OneTrust resource from */
  source: OneTrustPullSource;
}

/**
 * Parse the command line arguments
 *
 * @returns the parsed arguments
 */
export const parseCliSyncOtArguments = (): OneTrustCliArguments => {
  const {
    file,
    hostname,
    oneTrustAuth,
    resource,
    debug,
    fileFormat,
    dryRun,
    transcendAuth,
    transcendUrl,
    source,
  } = yargs(process.argv.slice(2), {
    string: [
      'file',
      'hostname',
      'oneTrustAuth',
      'resource',
      'fileFormat',
      'dryRun',
      'transcendAuth',
      'transcendUrl',
      'source',
    ],
    boolean: ['debug', 'dryRun'],
    default: {
      resource: OneTrustPullResource.Assessments,
      fileFormat: OneTrustFileFormat.Json,
      debug: false,
      dryRun: false,
      transcendUrl: 'https://api.transcend.io',
      source: OneTrustPullSource.OneTrust,
    },
  });

  // Must be able to authenticate to transcend to sync resources to it
  if (!dryRun && !transcendAuth) {
    logger.error(
      colors.red(
        // eslint-disable-next-line no-template-curly-in-string
        'Must specify a "transcendAuth" parameter to sync resources to Transcend. e.g. --transcendAuth=${TRANSCEND_API_KEY}',
      ),
    );
    return process.exit(1);
  }
  if (!dryRun && !transcendUrl) {
    logger.error(
      colors.red(
        // eslint-disable-next-line max-len
        'Must specify a "transcendUrl" parameter to sync resources to Transcend. e.g. --transcendUrl=https://api.transcend.io',
      ),
    );
    return process.exit(1);
  }

  // Can only sync to Transcend via a Json file format!
  if (!dryRun && fileFormat !== OneTrustFileFormat.Json) {
    logger.error(
      colors.red(
        `The "fileFormat" parameter must equal ${OneTrustFileFormat.Json} to sync resources to Transcend.`,
      ),
    );
    return process.exit(1);
  }

  // If trying to sync to disk, must specify a file path
  if (dryRun && !file) {
    logger.error(
      colors.red(
        'Must set a "file" parameter when "dryRun" is "true". e.g. --file=./oneTrustAssessments.json',
      ),
    );
    return process.exit(1);
  }

  // If trying to sync to disk, must specify a file format
  if (dryRun && !fileFormat) {
    logger.error(
      colors.red(
        `Must set a "fileFormat" parameter when "dryRun" is "true". e.g. --fileFormat=${
          OneTrustFileFormat.Json
        }. Supported formats: ${VALID_FILE_FORMATS.join(',')}`,
      ),
    );
    return process.exit(1);
  }

  if (file) {
    const splitFile = file.split('.');
    if (splitFile.length < 2) {
      logger.error(
        colors.red(
          'The "file" parameter has an invalid format. Expected a path with extensions. e.g. --file=./pathToFile.json.',
        ),
      );
      return process.exit(1);
    }
    if (splitFile.at(-1) !== fileFormat) {
      logger.error(
        colors.red(
          // eslint-disable-next-line max-len
          `The "file" and "fileFormat" parameters must specify the same format! Got file=${file} and fileFormat=${fileFormat}`,
        ),
      );
      return process.exit(1);
    }
  }

  // if reading assessments from a OneTrust
  if (source === OneTrustPullSource.OneTrust) {
    // must specify the OneTrust hostname
    if (!hostname) {
      logger.error(
        colors.red(
          'Missing required parameter "hostname". e.g. --hostname=customer.my.onetrust.com',
        ),
      );
      return process.exit(1);
    }
    // must specify the OneTrust auth
    if (!oneTrustAuth) {
      logger.error(
        colors.red(
          'Missing required parameter "oneTrustAuth". e.g. --oneTrustAuth=$ONE_TRUST_AUTH_TOKEN',
        ),
      );
      return process.exit(1);
    }
  } else {
    // if reading the assessments from a file, must specify a file to read from
    if (!file) {
      logger.error(
        colors.red(
          'Must specify a "file" parameter to read the OneTrust assessments from. e.g. --source=./oneTrustAssessments.json',
        ),
      );
      return process.exit(1);
    }

    // Cannot try reading from file and save assessments to a file simultaneously
    if (dryRun) {
      logger.error(
        colors.red(
          'Cannot read and write to a file simultaneously.' +
            ` Emit the "source" parameter or set it to ${OneTrustPullSource.OneTrust} if "dryRun" is enabled.`,
        ),
      );
      return process.exit(1);
    }
  }

  if (!VALID_RESOURCES.includes(resource)) {
    logger.error(
      colors.red(
        `Received invalid resource value: "${resource}". Allowed: ${VALID_RESOURCES.join(
          ',',
        )}`,
      ),
    );
    return process.exit(1);
  }
  if (!VALID_FILE_FORMATS.includes(fileFormat)) {
    logger.error(
      colors.red(
        `Received invalid fileFormat value: "${fileFormat}". Allowed: ${VALID_FILE_FORMATS.join(
          ',',
        )}`,
      ),
    );
    return process.exit(1);
  }

  return {
    file,
    ...(hostname && { hostname }),
    ...(oneTrustAuth && { oneTrustAuth }),
    resource,
    debug,
    fileFormat,
    dryRun,
    transcendAuth,
    transcendUrl,
    source,
  };
};
