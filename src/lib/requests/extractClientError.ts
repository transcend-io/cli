const CLIENT_ERROR = /{\\"message\\":\\"(.+?)\\",/;

/**
 * Extract a client error from the request
 *
 * @param err - Error message
 * @returns Client error or null
 */
export function extractClientError(error: string): string | null {
  return CLIENT_ERROR.test(error) ? CLIENT_ERROR.exec(error)![1] : null;
}
