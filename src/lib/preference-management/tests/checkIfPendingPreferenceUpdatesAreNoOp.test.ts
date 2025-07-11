/* eslint-disable max-lines */
import { expect, describe, it } from 'vitest';

import { checkIfPendingPreferenceUpdatesAreNoOp } from '../index';
import { PreferenceTopicType } from '@transcend-io/privacy-types';
import { PreferenceTopic } from '../../graphql';

const DEFAULT_VALUES = {
  userId: 'test@transcend.io',
  timestamp: '2024-11-30T00:00:15.327Z',
  partition: 'd9c0b9ca-2253-4418-89d2-88776d654223',
  system: {
    decryptionStatus: 'DECRYPTED' as const,
    updatedAt: '2024-11-30T00:00:16.506Z',
  },
  consentManagement: {
    usp: null,
    gpp: null,
    tcf: null,
    airgapVersion: null,
  },
  metadata: [],
};

const PREFERENCE_TOPICS: PreferenceTopic[] = [
  {
    id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
    slug: 'BooleanPreference1',
    type: PreferenceTopicType.Boolean,
    preferenceOptionValues: [],
    purpose: {
      trackingType: 'Marketing',
    },
    title: {
      defaultMessage: 'Boolean Preference 1',
      id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3',
    },
    displayDescription: {
      defaultMessage: 'This is a boolean preference for testing.',
      id: '14b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b4',
    },
    defaultConfiguration: '',
    showInPrivacyCenter: true,
  },
  {
    id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
    slug: 'BooleanPreference2',
    type: PreferenceTopicType.Boolean,
    preferenceOptionValues: [],
    purpose: {
      trackingType: 'Marketing',
    },
    title: {
      defaultMessage: 'Boolean Preference 2',
      id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b4',
    },
    displayDescription: {
      defaultMessage: 'This is another boolean preference for testing.',
      id: '24b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b5',
    },
    defaultConfiguration: '',
    showInPrivacyCenter: true,
  },
  {
    id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b3b',
    slug: 'MultiSelectPreference',
    type: PreferenceTopicType.MultiSelect,
    title: {
      defaultMessage: 'Multi Select Preference',
      id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b0',
    },
    displayDescription: {
      defaultMessage: 'This is a multi-select preference for testing.',
      id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b1',
    },
    defaultConfiguration: '',
    showInPrivacyCenter: true,
    preferenceOptionValues: [
      {
        slug: 'Value1',
        title: {
          defaultMessage: 'Value 1',
          id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b1',
        },
      },
      {
        slug: 'Value2',
        title: {
          defaultMessage: 'Value 2',
          id: '34b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b2',
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
    preferenceOptionValues: [
      {
        slug: 'Value1',
        title: {
          defaultMessage: 'Value 1',
          id: '44b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b1',
        },
      },
      {
        slug: 'Value2',
        title: {
          defaultMessage: 'Value 2',
          id: '44b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b2',
        },
      },
    ],
    title: {
      defaultMessage: 'Single Select Preference',
      id: '44b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b0',
    },
    displayDescription: {
      defaultMessage: 'This is a single-select preference for testing.',
      id: '44b3b3b3-4b3b-4b3b-4b3b-4b3b3b3b3b1',
    },
    defaultConfiguration: '',
    showInPrivacyCenter: true,
    purpose: {
      trackingType: 'Marketing',
    },
  },
];

describe('checkIfPendingPreferenceUpdatesAreNoOp', () => {
  it('should return true for simple purpose comparison', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'SalesOutreach',
              enabled: false,
              preferences: [],
            },
          ],
        },
        pendingUpdates: {
          SalesOutreach: {
            enabled: false,
          },
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(true);
  });

  it('should return false for simple purpose comparison', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'SalesOutreach',
              enabled: true,
              preferences: [],
            },
          ],
        },
        pendingUpdates: {
          SalesOutreach: {
            enabled: false,
          },
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(false);
  });

  it('should return true for simple purpose comparison with extra preference', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'SalesOutreach',
              enabled: false,
              preferences: [
                {
                  topic: 'BooleanPreference1',
                  choice: {
                    booleanValue: true,
                  },
                },
              ],
            },
          ],
        },
        pendingUpdates: {
          SalesOutreach: {
            enabled: false,
          },
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(true);
  });

  it('should return false for simple purpose comparison with extra preference in update', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'SalesOutreach',
              enabled: false,
            },
          ],
        },
        pendingUpdates: {
          SalesOutreach: {
            enabled: false,
            preferences: [
              {
                topic: 'BooleanPreference1',
                choice: {
                  booleanValue: true,
                },
              },
            ],
          },
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(false);
  });

  it('should return true for preferences being same', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'Marketing',
              enabled: false,
              preferences: [
                {
                  topic: 'BooleanPreference1',
                  choice: {
                    booleanValue: true,
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
          ],
        },
        pendingUpdates: {
          Marketing: {
            enabled: false,
            preferences: [
              {
                topic: 'BooleanPreference1',
                choice: {
                  booleanValue: true,
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
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(true);
  });

  it('should return false for boolean preference changing', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'Marketing',
              enabled: false,
              preferences: [
                {
                  topic: 'BooleanPreference1',
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
          ],
        },
        pendingUpdates: {
          Marketing: {
            enabled: false,
            preferences: [
              {
                topic: 'BooleanPreference1',
                choice: {
                  booleanValue: true,
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
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(false);
  });

  it('should return false for single select preference changing', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'Marketing',
              enabled: false,
              preferences: [
                {
                  topic: 'BooleanPreference1',
                  choice: {
                    booleanValue: true,
                  },
                },
                {
                  topic: 'SingleSelectPreference',
                  choice: {
                    selectValue: 'Value2',
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
          ],
        },
        pendingUpdates: {
          Marketing: {
            enabled: false,
            preferences: [
              {
                topic: 'BooleanPreference1',
                choice: {
                  booleanValue: true,
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
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(false);
  });

  it('should return false for multi select preference changing', () => {
    expect(
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord: {
          ...DEFAULT_VALUES,
          purposes: [
            {
              purpose: 'Marketing',
              enabled: false,
              preferences: [
                {
                  topic: 'BooleanPreference1',
                  choice: {
                    booleanValue: true,
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
                    selectValues: ['Value2'],
                  },
                },
              ],
            },
          ],
        },
        pendingUpdates: {
          Marketing: {
            enabled: false,
            preferences: [
              {
                topic: 'BooleanPreference1',
                choice: {
                  booleanValue: true,
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
        },
        preferenceTopics: PREFERENCE_TOPICS,
      }),
    ).to.equal(false);
  });
});
/* eslint-enable max-lines */
