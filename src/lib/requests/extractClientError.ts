const CLIENT_ERROR = /{\\"message\\":\\"(.+?)\\",/;

/**
 * Extract a client error from the request
 *
 * @param err - Error message
 * @returns Client error or null
 */
export function extractClientError(err: string): string | null {
  return CLIENT_ERROR.test(err) ? CLIENT_ERROR.exec(err)![1] : null;
}
