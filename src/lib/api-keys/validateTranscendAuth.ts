import { existsSync, readFileSync } from "node:fs";
import { decodeCodec } from "@transcend-io/type-utils";
import colors from "colors";
import * as t from "io-ts";
import { StoredApiKey } from "../../codecs";
import { logger } from "../../logger";

/**
 * Determine if the `--auth` parameter is an API key or a path to a JSON
 * file containing a list of API keys.
 *
 * @param auth - Raw auth parameter
 * @returns The API key or the list API keys
 */
export function validateTranscendAuth(auth: string): string | StoredApiKey[] {
  // Ensure auth is passed
  if (!auth) {
    logger.error(
      colors.red(
        "A Transcend API key must be provided. You can specify using --auth=$TRANSCEND_API_KEY"
      )
    );
    process.exit(1);
  }

  // Read from disk
  if (existsSync(auth)) {
    // validate that file is a list of API keys
    return decodeCodec(t.array(StoredApiKey), readFileSync(auth, "utf-8"));
  }

  // Return as single API key
  return auth;
}
