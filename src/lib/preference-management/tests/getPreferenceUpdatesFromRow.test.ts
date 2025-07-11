/* eslint-disable max-lines */
import { expect, describe, it } from 'vitest';

import { getPreferenceUpdatesFromRow } from '../index';
import { PreferenceTopicType } from '@transcend-io/privacy-types';

describe('getPreferenceUpdatesFromRow', () => {
  it('should parse boolean updates', () => {
    expect(
      getPreferenceUpdatesFromRow({
        row: {
          my_purpose: 'true',
          has_topic_1: 'true',
          has_topic_2: 'false',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference1',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            title: {
              defaultMessage: 'Marketing Preferences',
              id: '12345678-1234-1234-1234-123456789012',
            },
            displayDescription: {
              defaultMessage: 'Enable marketing tracking',
              id: '12345678-1234-1234-1234-123456789013',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            purpose: {
              trackingType: 'Marketing',
            },
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            title: {
              defaultMessage: 'Advertising Preferences',
              id: '12345678-1234-1234-1234-123456789014',
            },
            displayDescription: {
              defaultMessage: 'Enable advertising tracking',
              id: '12345678-1234-1234-1234-123456789015',
            },
          },
        ],
        columnToPurposeName: {
          my_purpose: {
            purpose: 'Marketing',
            preference: null,
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_1: {
            purpose: 'Marketing',
            preference: 'BooleanPreference1',
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_2: {
            purpose: 'Marketing',
            preference: 'BooleanPreference2',
            valueMapping: {
              true: true,
              false: false,
            },
          },
        },
      }),
    ).to.deep.equal({
      Marketing: {
        enabled: true,
        preferences: [
          {
            topic: 'BooleanPreference1',
            choice: {
              booleanValue: true,
            },
          },
          {
            topic: 'BooleanPreference2',
            choice: {
              booleanValue: false,
            },
          },
        ],
      },
    });
  });

  it('should parse a single select', () => {
    expect(
      getPreferenceUpdatesFromRow({
        row: {
          my_purpose: 'true',
          has_topic_3: 'Option 1',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'SingleSelectPreference',
            defaultConfiguration: '',
            title: {
              defaultMessage: 'Single Select Preference',
              id: '12345678-1234-1234-1234-123456789010',
            },
            displayDescription: {
              defaultMessage: 'Choose one option',
              id: '12345678-1234-1234-1234-123456789011',
            },
            showInPrivacyCenter: true,
            type: PreferenceTopicType.Select,
            preferenceOptionValues: [
              {
                slug: 'Value1',
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789016',
                },
              },
              {
                slug: 'Value2',
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789017',
                },
              },
            ],
            purpose: {
              trackingType: 'Marketing',
            },
          },
        ],
        columnToPurposeName: {
          my_purpose: {
            purpose: 'Marketing',
            preference: null,
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_3: {
            purpose: 'Marketing',
            preference: 'SingleSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
        },
      }),
    ).to.deep.equal({
      Marketing: {
        enabled: true,
        preferences: [
          {
            topic: 'SingleSelectPreference',
            choice: {
              selectValue: 'Value1',
            },
          },
        ],
      },
    });
  });

  it('should parse a multi select example', () => {
    expect(
      getPreferenceUpdatesFromRow({
        row: {
          my_purpose: 'true',
          has_topic_4: 'Option 2,Option 1',
          has_topic_5: 'Option 1',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'MultiSelectPreference',
            type: PreferenceTopicType.MultiSelect,
            defaultConfiguration: '',
            title: {
              defaultMessage: 'Multi Select Preference',
              id: '12345678-1234-1234-1234-123456789020',
            },
            displayDescription: {
              defaultMessage: 'Choose multiple options',
              id: '12345678-1234-1234-1234-123456789021',
            },
            showInPrivacyCenter: true,
            preferenceOptionValues: [
              {
                slug: 'Value1',
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789018',
                },
              },
              {
                slug: 'Value2',
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789019',
                },
              },
            ],
            purpose: {
              trackingType: 'Marketing',
            },
          },
        ],
        columnToPurposeName: {
          my_purpose: {
            purpose: 'Marketing',
            preference: null,
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_4: {
            purpose: 'Marketing',
            preference: 'MultiSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
          has_topic_5: {
            purpose: 'Marketing',
            preference: 'MultiSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
        },
      }),
    ).to.deep.equal({
      Marketing: {
        enabled: true,
        preferences: [
          {
            topic: 'MultiSelectPreference',
            choice: {
              selectValues: ['Value1', 'Value2'],
            },
          },
          {
            topic: 'MultiSelectPreference',
            choice: {
              selectValues: ['Value1'],
            },
          },
        ],
      },
    });
  });

  it('should parse boolean, single select, multi select example', () => {
    expect(
      getPreferenceUpdatesFromRow({
        row: {
          my_purpose: 'true',
          has_topic_1: 'true',
          has_topic_2: 'false',
          has_topic_3: 'Option 1',
          has_topic_4: 'Option 2,Option 1',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference1',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            title: {
              defaultMessage: 'Boolean Preference 1',
              id: '12345678-1234-1234-1234-123456789022',
            },
            displayDescription: {
              defaultMessage: 'Enable this preference',
              id: '12345678-1234-1234-1234-123456789023',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            purpose: {
              trackingType: 'Marketing',
            },
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            title: {
              defaultMessage: 'Boolean Preference 2',
              id: '12345678-1234-1234-1234-123456789024',
            },
            displayDescription: {
              defaultMessage: 'Disable this preference',
              id: '12345678-1234-1234-1234-123456789025',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            purpose: {
              trackingType: 'Marketing',
            },
          },
          {
            id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'MultiSelectPreference',
            type: PreferenceTopicType.MultiSelect,
            defaultConfiguration: '',
            title: {
              defaultMessage: 'Multi Select Preference',
              id: '12345678-1234-1234-1234-123456789028',
            },
            displayDescription: {
              defaultMessage: 'Choose multiple options',
              id: '12345678-1234-1234-1234-123456789029',
            },
            showInPrivacyCenter: true,
            preferenceOptionValues: [
              {
                slug: 'Value1',
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789026',
                },
              },
              {
                slug: 'Value2',
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789027',
                },
              },
            ],
            purpose: {
              trackingType: 'Marketing',
            },
          },
          {
            id: '44b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'SingleSelectPreference',
            type: PreferenceTopicType.Select,
            defaultConfiguration: '',
            title: {
              defaultMessage: 'Single Select Preference',
              id: '12345678-1234-1234-1234-123456789030',
            },
            displayDescription: {
              defaultMessage: 'Choose one option',
              id: '12345678-1234-1234-1234-123456789031',
            },
            showInPrivacyCenter: true,
            preferenceOptionValues: [
              {
                slug: 'Value1',
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789030',
                },
              },
              {
                slug: 'Value2',
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789031',
                },
              },
            ],
            purpose: {
              trackingType: 'Marketing',
            },
          },
        ],
        columnToPurposeName: {
          my_purpose: {
            purpose: 'Marketing',
            preference: null,
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_1: {
            purpose: 'Marketing',
            preference: 'BooleanPreference1',
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_2: {
            purpose: 'Marketing',
            preference: 'BooleanPreference2',
            valueMapping: {
              true: true,
              false: false,
            },
          },
          has_topic_3: {
            purpose: 'Marketing',
            preference: 'SingleSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
          has_topic_4: {
            purpose: 'Marketing',
            preference: 'MultiSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
        },
      }),
    ).to.deep.equal({
      Marketing: {
        enabled: true,
        preferences: [
          {
            topic: 'BooleanPreference1',
            choice: {
              booleanValue: true,
            },
          },
          {
            topic: 'BooleanPreference2',
            choice: {
              booleanValue: false,
            },
          },
          {
            topic: 'SingleSelectPreference',
            choice: {
              selectValue: 'Value1',
            },
          },
          {
            topic: 'MultiSelectPreference',
            choice: {
              selectValues: ['Value1', 'Value2'],
            },
          },
        ],
      },
    });
  });

  it('should error if missing purpose', () => {
    try {
      getPreferenceUpdatesFromRow({
        row: {
          has_topic_1: 'true',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference1',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
            displayDescription: {
              defaultMessage: 'Enable this preference',
              id: '12345678-1234-1234-1234-123456789032',
            },
            title: {
              defaultMessage: 'Boolean Preference 1',
              id: '12345678-1234-1234-1234-123456789033',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
            displayDescription: {
              defaultMessage: 'Disable this preference',
              id: '12345678-1234-1234-1234-123456789034',
            },
            title: {
              defaultMessage: 'Boolean Preference 2',
              id: '12345678-1234-1234-1234-123456789035',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
          },
        ],
        columnToPurposeName: {
          has_topic_1: {
            purpose: 'Marketing',
            preference: 'BooleanPreference1',
            valueMapping: {
              true: true,
              false: false,
            },
          },
        },
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).to.include('No mapping provided');
    }
  });

  it('should error if purpose name is not valid', () => {
    try {
      getPreferenceUpdatesFromRow({
        row: {
          has_topic_1: 'true',
        },
        purposeSlugs: ['Marketing', 'Advertising'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference1',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
            displayDescription: {
              defaultMessage: 'Enable this preference',
              id: '12345678-1234-1234-1234-123456789036',
            },
            title: {
              defaultMessage: 'Boolean Preference 1',
              id: '12345678-1234-1234-1234-123456789037',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
            displayDescription: {
              defaultMessage: 'Disable this preference',
              id: '12345678-1234-1234-1234-123456789038',
            },
            title: {
              defaultMessage: 'Boolean Preference 2',
              id: '12345678-1234-1234-1234-123456789039',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
          },
        ],
        columnToPurposeName: {
          has_topic_1: {
            purpose: 'InvalidPurpose',
            preference: 'BooleanPreference1',
            valueMapping: {
              true: true,
              false: false,
            },
          },
        },
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).to.equal(
        'Invalid purpose slug: InvalidPurpose, expected: Marketing, Advertising',
      );
    }
  });

  it('should error if single select option is invalid', () => {
    try {
      getPreferenceUpdatesFromRow({
        row: {
          has_topic_1: 'true',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'SingleSelectPreference',
            type: PreferenceTopicType.Select,
            preferenceOptionValues: [
              {
                slug: 'Value1',
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789040',
                },
              },
              {
                slug: 'Value2',
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789041',
                },
              },
            ],
            title: {
              defaultMessage: 'Single Select Preference',
              id: '12345678-1234-1234-1234-123456789042',
            },
            displayDescription: {
              defaultMessage: 'Choose one option',
              id: '12345678-1234-1234-1234-123456789043',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            purpose: {
              trackingType: 'Marketing',
            },
          },
        ],
        columnToPurposeName: {
          has_topic_1: {
            purpose: 'Marketing',
            preference: 'SingleSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
        },
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).to.equal(
        'Invalid value for select preference: SingleSelectPreference, expected string or null, got: true',
      );
    }
  });

  it('should error if multi select value is invalid', () => {
    try {
      getPreferenceUpdatesFromRow({
        row: {
          has_topic_1: 'true',
        },
        purposeSlugs: ['Marketing'],
        preferenceTopics: [
          {
            id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'MultiSelectPreference',
            type: PreferenceTopicType.MultiSelect,
            preferenceOptionValues: [
              {
                title: {
                  defaultMessage: 'Option 1',
                  id: '12345678-1234-1234-1234-123456789044',
                },
                slug: 'Value1',
              },
              {
                title: {
                  defaultMessage: 'Option 2',
                  id: '12345678-1234-1234-1234-123456789045',
                },
                slug: 'Value2',
              },
            ],
            title: {
              defaultMessage: 'Multi Select Preference',
              id: '12345678-1234-1234-1234-123456789046',
            },
            displayDescription: {
              defaultMessage: 'Choose multiple options',
              id: '12345678-1234-1234-1234-123456789047',
            },
            showInPrivacyCenter: true,
            defaultConfiguration: '',
            purpose: {
              trackingType: 'Marketing',
            },
          },
        ],
        columnToPurposeName: {
          has_topic_1: {
            purpose: 'Marketing',
            preference: 'MultiSelectPreference',
            valueMapping: {
              'Option 1': 'Value1',
              'Option 2': 'Value2',
            },
          },
        },
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).to.equal(
        'Invalid value for multi select preference: MultiSelectPreference, expected one of: Value1, Value2, got: true',
      );
    }
  });
});
/* eslint-enable max-lines */
