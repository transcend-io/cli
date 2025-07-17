import {
  PreferenceQueryResponseItem,
  PreferenceStorePurposeResponse,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { PreferenceTopic } from '../graphql';

/**
 * Check if the pending set of updates are exactly the same as the current consent record.
 *
 * @param options - Options
 * @returns Whether the pending updates already exist in the preference store
 */
export function checkIfPendingPreferenceUpdatesAreNoOp({
  currentConsentRecord,
  pendingUpdates,
  preferenceTopics,
}: {
  /** The current consent record */
  currentConsentRecord: PreferenceQueryResponseItem;
  /** The pending updates */
  pendingUpdates: Record<
    string,
    Omit<PreferenceStorePurposeResponse, 'purpose'>
  >;
  /** The preference topic configurations */
  preferenceTopics: PreferenceTopic[];
}): boolean {
  // Check each update
  return Object.entries(pendingUpdates).every(
    ([purposeName, { preferences = [], enabled }]) => {
      // Ensure the purpose exists
      const currentPurpose = currentConsentRecord.purposes.find(
        (existingPurpose) => existingPurpose.purpose === purposeName,
      );

      // Ensure purpose.enabled is in sync
      // Also false if the purpose does not exist
      const enabledIsInSync =
        !!currentPurpose && currentPurpose.enabled === enabled;
      if (!enabledIsInSync) {
        return false;
      }

      // Compare the preferences are in sync
      return preferences.every(({ topic, choice }) =>
        // ensure preferences exist on record
        currentPurpose.preferences?.find((existingPreference) => {
          // find matching topic
          if (existingPreference.topic !== topic) {
            return false;
          }

          // Determine type of preference topic
          const preferenceTopic = preferenceTopics.find(
            (x) => x.slug === topic && x.purpose.trackingType === purposeName,
          );
          if (!preferenceTopic) {
            throw new Error(`Could not find preference topic for ${topic}`);
          }

          // Handle comparison based on type
          switch (preferenceTopic.type) {
            case PreferenceTopicType.Boolean: {
              return (
                existingPreference.choice.booleanValue === choice.booleanValue
              );
            }
            case PreferenceTopicType.Select: {
              return (
                existingPreference.choice.selectValue === choice.selectValue
              );
            }
            case PreferenceTopicType.MultiSelect: {
              const sortedCurrentValues = (
                existingPreference.choice.selectValues || []
              ).sort();

              const sortedNewValues = (choice.selectValues || []).sort();
              return (
                sortedCurrentValues.length === sortedNewValues.length &&
                sortedCurrentValues.every(
                  (x, index) => x === sortedNewValues[index],
                )
              );
            }
            default: {
              throw new Error(
                `Unknown preference topic type: ${preferenceTopic.type}`,
              );
            }
          }
        }),
      );
    },
  );
}
