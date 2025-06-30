import got, { Got } from 'got';

/**
 * Instantiate an instance of got that is capable of making requests to OneTrust
 *
 * @param param - information about the OneTrust URL
 * @returns The instance of got that is capable of making requests to the customer ingress
 */
export const createOneTrustGotInstance = async ({
  hostname,
  auth,
  clientId,
  clientSecret,
}: {
  /** Hostname of the OneTrust API */
  hostname: string;
  /** The OAuth access token */
  auth?: string;
  /** The client ID */
  clientId?: string;
  /** The client secret */
  clientSecret?: string;
}): Promise<Got> => {
  let newToken: string | undefined;

  if (!auth && (!clientId || !clientSecret)) {
    throw new Error(
      'Either auth or clientId and clientSecret must be provided',
    );
  }

  if (clientId && clientSecret) {
    // Generate OAuth access token using client credentials
    const tokenResponse = await got.post(
      `https://${hostname}/api/access/v1/oauth/token`,
      {
        headers: {
          accept: 'application/json',
        },
        form: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        },
        responseType: 'json',
      },
    );

    console.log('tokenResponse.body: ', tokenResponse.body);
    const tokenData = tokenResponse.body as { access_token: string };
    newToken = tokenData.access_token;
  }

  return got.extend({
    prefixUrl: `https://${hostname}`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(auth || newToken
        ? { authorization: `Bearer ${auth || newToken}` }
        : {}),
    },
  });
};
