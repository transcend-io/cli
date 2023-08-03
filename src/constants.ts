export const ADMIN_DASH = 'https://app.transcend.io';

export const ADMIN_DASH_INTEGRATIONS = `${ADMIN_DASH}/infrastructure/integrations`;

/**
 * Override default transcend API url using
 * TRANSCEND_API_URL=https://api.us.transcend.io tr-pull ...
 */
export const DEFAULT_TRANSCEND_API =
  process.env.TRANSCEND_API_URL || 'https://api.transcend.io';
