import got, { Got, RequestError, type Response } from 'got';

interface TranscendConsentError extends Omit<RequestError, 'response'> {
  response: Response<string>;
}

export function isTranscendConsentError(
  error: unknown,
): error is TranscendConsentError {
  return (
    error instanceof RequestError && typeof error.response?.body === 'string'
  );
}

/**
 * Instantiate an instance of got that is capable of making requests
 * to a sombra gateway.
 *
 * @param transcendUrl - URL of Transcend API
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export function createTranscendConsentGotInstance(transcendUrl: string): Got {
  // Create got instance with default values
  return got.extend({
    prefixUrl: transcendUrl,
  });
}
