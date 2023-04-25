import { GraphQLClient } from 'graphql-request';
import { DETERMINE_LOGIN_METHOD, ASSUME_ROLE, LOGIN } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';

export interface OrganizationPreview {
  /** Name of organization */
  name: string;
  /** Id of organization */
  id: string;
  /** uri of organization */
  uri: string;
  /** ID of parent organization */
  parentOrganizationId?: string;
}

export interface UserRole {
  /** ID of role */
  id: string;
  /** Related organization */
  organization: OrganizationPreview;
}

/**
 * Log in as a user
 *
 * @param client - GraphQL client
 * @param options - Email/password
 * @returns Cookie and roles
 */
export async function loginUser(
  client: GraphQLClient,
  {
    email,
    password,
  }: {
    /** Email of user */
    email: string;
    /** Password of user */
    password: string;
  },
): Promise<{
  /** Cookie to be used to make subsequent requests */
  loginCookie: string;
  /** Roles of the user  */
  roles: UserRole[];
}> {
  const {
    determineLoginMethod: { loginMethod },
  } = await makeGraphQLRequest<{
    /** Determine login method */
    determineLoginMethod: {
      /** Login method info */
      loginMethod: {
        /** Email being logged in */
        email: string;
        /** Sombra public key */
        sombraPublicKey: string;
      };
    };
  }>(client, DETERMINE_LOGIN_METHOD, {
    email,
  });

  const res = await client.rawRequest<{
    /** Login */
    login: {
      /** User */
      user: {
        /** Roles of user */
        roles: UserRole[];
      };
    };
  }>(LOGIN, {
    email,
    password,
    publicKey: loginMethod.sombraPublicKey,
  });
  const {
    login: { user },
  } = res.data;

  // Get login cookie from response
  const loginCookie = res.headers.get('set-cookie');
  if (!loginCookie || !loginCookie.includes('laravel')) {
    throw new Error('Failed to get login cookie in response');
  }

  return {
    roles: user.roles,
    loginCookie,
  };
}

/**
 * Sleep in a promise
 *
 * @param sleepTime - The time to sleep in milliseconds.
 * @returns Resolves promise
 */
function sleepPromise(sleepTime: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(sleepTime), sleepTime);
  });
}

/**
 * Assume role for user into another organization
 *
 * @param client - GraphQL client
 * @param options - Email/password
 */
export async function assumeRole(
  client: GraphQLClient,
  {
    email,
    roleId,
  }: {
    /** Email of user */
    email: string;
    /** Role of user assuming into */
    roleId: string;
  },
): Promise<void> {
  // these routes have a low rate limit
  await sleepPromise(1000 * 12);

  const {
    determineLoginMethod: { loginMethod },
  } = await makeGraphQLRequest<{
    /** Determine login method */
    determineLoginMethod: {
      /** Login method info */
      loginMethod: {
        /** Email being logged in */
        email: string;
        /** Sombra public key */
        sombraPublicKey: string;
      };
    };
  }>(client, DETERMINE_LOGIN_METHOD, {
    email,
    userId: roleId,
  });

  await client.rawRequest<{
    /** Assume role */
    assumeRole: {
      /** Mutation ID */
      clientMutationId: string;
    };
  }>(ASSUME_ROLE, {
    id: roleId,
    publicKey: loginMethod.sombraPublicKey,
  });
}
