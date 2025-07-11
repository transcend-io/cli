/**
 * Convert a domain to host
 *
 * @param domain - e.g. test.acme.com
 * @returns Host acme.com
 */
export const domainToHost = (domain: string): string =>
  new URL(`https://${domain}`).hostname.split('.').slice(-2).join('.');
