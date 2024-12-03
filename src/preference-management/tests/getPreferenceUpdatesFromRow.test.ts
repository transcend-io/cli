/* eslint-disable max-lines */
import chai, { expect } from 'chai';
import deepEqualInAnyOrder from 'deep-equal-in-any-order';

import { getPreferenceUpdatesFromRow } from '../index';
import { PreferenceTopicType } from '@transcend-io/privacy-types';

chai.use(deepEqualInAnyOrder);

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
            type: PreferenceTopicType.Select,
            preferenceOptionValues: [
              {
                slug: 'Value1',
              },
              {
                slug: 'Value2',
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
            preferenceOptionValues: [
              {
                slug: 'Value1',
              },
              {
                slug: 'Value2',
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
          },
          {
            id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'MultiSelectPreference',
            type: PreferenceTopicType.MultiSelect,
            preferenceOptionValues: [
              {
                slug: 'Value1',
              },
              {
                slug: 'Value2',
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
            preferenceOptionValues: [
              {
                slug: 'Value1',
              },
              {
                slug: 'Value2',
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
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
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
          },
          {
            id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
            slug: 'BooleanPreference2',
            type: PreferenceTopicType.Boolean,
            preferenceOptionValues: [],
            purpose: {
              trackingType: 'Marketing',
            },
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
              },
              {
                slug: 'Value2',
              },
            ],
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
                slug: 'Value1',
              },
              {
                slug: 'Value2',
              },
            ],
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
