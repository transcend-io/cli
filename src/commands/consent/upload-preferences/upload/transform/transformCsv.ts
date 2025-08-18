// FIXME
import colors from 'colors';

import { logger } from '../../../../../logger';

/**
 * Add Transcend ID to preferences if email_id is present
 *
 * @param preferences - List of preferences
 * @returns The updated preferences with Transcend ID added
 */
export function transformCsv(
  preferences: Record<string, string>[],
): Record<string, string>[] {
  // Add a transcendent ID to each preference if it doesn't already exist
  const disallowedEmails = (process.env.EMAIL_LIST || '')
    .split(',')
    .map((email) => email.trim().toLowerCase());

  const keys = Object.keys(preferences[0]);
  const isUdp =
    keys.includes('email_address') &&
    keys.includes('person_id') &&
    keys.includes('member_id');
  if (isUdp) {
    logger.info(
      colors.yellow(
        'Detected UDP format. Transforming preferences to include Transcend ID.',
      ),
    );

    return preferences.map((pref) => {
      const email = (pref.email_address || '').toLowerCase().trim();
      const emailAddress =
        !email || disallowedEmails.includes(email) ? '' : pref.email_address;
      return {
        ...pref,
        person_id: pref.person_id !== '-2' ? pref.person_id : '',
        email_address: emailAddress,
        // preference email address over transcendID
        transcendID: emailAddress
          ? ''
          : pref.person_id && pref.person_id !== '-2'
          ? pref.person_id
          : pref.member_id,
      };
    });
  }

  // FIXME skip the emails
  return preferences;
}
