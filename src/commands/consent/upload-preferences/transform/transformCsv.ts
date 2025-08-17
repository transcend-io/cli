// FIXME

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

  return preferences.map((pref) => {
    const email = (pref.email_address || '').toLowerCase().trim();
    return {
      ...pref,
      person_id: pref.person_id !== '-2' ? pref.person_id : '',
      email_address:
        !email || disallowedEmails.includes(email) ? '' : pref.email_address, // FIXME
      transcendID:
        pref.person_id && pref.person_id !== '-2'
          ? pref.person_id
          : pref.member_id,
    };
  });
}
