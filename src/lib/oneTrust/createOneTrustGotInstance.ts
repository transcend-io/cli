import got, { Got } from 'got';

/**
 * Instantiate an instance of got that is capable of making requests to OneTrust
 *
 * @param param - information about the OneTrust URL
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export const createOneTrustGotInstance = ({
  hostname,
  auth,
}: {
  /** Hostname of the OneTrust API */
  hostname: string;
  /** The OAuth access token */
  auth: string;
}): Got =>
  got.extend({
    prefixUrl: `https://${hostname}`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${auth}`,
    },
  });
