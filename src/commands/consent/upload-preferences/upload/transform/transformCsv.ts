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
    keys.includes('member_id') &&
    keys.includes('birth_dt');
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
      const birthDate = new Date(pref.birth_dt);
      if (!!pref.birth_dt || Number.isNaN(birthDate.getTime())) {
        logger.warn(
          colors.yellow(`No birth date for record: ${pref.email_address}`),
        );
      }
      return {
        ...pref,
        Minor:
          !pref.birth_dt || Number.isNaN(birthDate.getTime())
            ? ''
            : Date.now() - birthDate.getTime() < 1000 * 60 * 60 * 24 * 365 * 18
            ? 'True'
            : 'False',
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

  const isAdobe =
    keys.includes('hashedCostcoID') &&
    keys.includes('address') &&
    keys.includes('lastUpdatedDate');
  if (isAdobe) {
    logger.info(colors.green('Pre-processing as adobe '));
    return preferences.map((pref) => {
      if (!pref.lastUpdatedDate) {
        logger.warn(
          colors.yellow(
            `Record missing lastUpdatedDate - setting to now() - ${JSON.stringify(
              pref,
            )}`,
          ),
        );
      }
      return {
        ...pref,
        lastUpdatedDate: pref.lastUpdatedDate
          ? pref.lastUpdatedDate
          : new Date('08/24/2025').toISOString(),
      };
    });
  }

  logger.info(colors.green('No special transformations applied.'));

  // FIXME skip the emails
  return preferences;
}
