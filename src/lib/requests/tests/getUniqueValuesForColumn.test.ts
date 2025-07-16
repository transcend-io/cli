import { expect, describe, it } from 'vitest';

import { getUniqueValuesForColumn } from '../index';

describe('getUniqueValuesForColumn', () => {
  const example = [
    {
      CASL_STATUS: 'Undefined',
      CONTACT_ID: '949858',
      'Data Subject': 'Customer',
      FIRST_NAME: 'Mike',
      GDPR_STATUS: 'LBI Notice Not Sent',
      LAST_NAME: 'Farrell',
      LINKEDIN_HANDLE: 'michaelfarrell',
      MOBILE_PHONE: '(860) 906-6012',
      OTHER_URL: '',
      PERSONAL_EMAIL: 'mike@transcend.io',
      PHONE: '',
      PREFERRED_EMAIL: 'mike@transcend.io',
      'Primary Company': 'Transcend',
      'Request Type': 'Opt In',
      SEARCH_ID: '10749',
      SEARCH_NAME: 'Transcend - Chief Technology Officer',
      SKYPE_HANDLE: '',
      STAGE_START_DATE: '2022-11-22',
      TITLE: 'Chief Technology Officer',
      WORK_EMAIL: '',
      WORK_PHONE: '',
    },
    {
      CASL_STATUS: 'Undefined',
      CONTACT_ID: '949858',
      'Data Subject': 'Customer',
      FIRST_NAME: 'Mike',
      GDPR_STATUS: 'LBI Notice Not Sent',
      LAST_NAME: 'Farrell',
      LINKEDIN_HANDLE: 'michaelfarrell',
      MOBILE_PHONE: '(860) 906-6012',
      OTHER_URL: '',
      PERSONAL_EMAIL: 'mike@transcend.io',
      PHONE: '',
      PREFERRED_EMAIL: 'joe@transcend.io',
      'Primary Company': 'Transcend',
      'Request Type': 'Opt In',
      SEARCH_ID: '10749',
      SEARCH_NAME: 'Transcend - Chief Technology Officer',
      SKYPE_HANDLE: '',
      STAGE_START_DATE: '2022-11-22',
      TITLE: 'Chief Technology Officer',
      WORK_EMAIL: '',
      WORK_PHONE: '',
    },
  ];

  it('should successfully pull 2 unique values from 2 rows', () => {
    expect(getUniqueValuesForColumn(example, 'PREFERRED_EMAIL')).to.deep.equal([
      'mike@transcend.io',
      'joe@transcend.io',
    ]);
  });

  it('should successfully pull 1 unique value from 2 rows', () => {
    expect(getUniqueValuesForColumn(example, 'LAST_NAME')).to.deep.equal([
      'Farrell',
    ]);
  });
});
