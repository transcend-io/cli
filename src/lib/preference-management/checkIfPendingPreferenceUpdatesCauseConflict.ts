import {
  PreferenceQueryResponseItem,
  PreferenceStorePurposeResponse,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { PreferenceTopic } from '../graphql';

/**
 * Check if the pending set of updates will result in a change of
 * value to an existing purpose or preference in the preference store.
 *
 * @param options - Options
 * @returns True if conflict, false if no conflict and just adding new data for first time
 */
export function checkIfPendingPreferenceUpdatesCauseConflict({
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
  // Check if any update has conflict
  return !!Object.entries(pendingUpdates).find(
    ([purposeName, { preferences = [], enabled }]) => {
      // Ensure the purpose exists
      const currentPurpose = currentConsentRecord.purposes.find(
        (existingPurpose) => existingPurpose.purpose === purposeName,
      );

      // If no purpose exists, then it is not a conflict
      if (!currentPurpose) {
        return false;
      }

      // If purpose.enabled value is off, this is a conflict
      if (currentPurpose.enabled !== enabled) {
        return true;
      }

      // Check if any preferences are out of sync
      return !!preferences.find(({ topic, choice }) => {
        // find matching topic
        const currentPreference = (currentPurpose.preferences || []).find(
          (existingPreference) => existingPreference.topic === topic,
        );

        // if no topic exists, no conflict
        if (!currentPreference) {
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
              currentPreference.choice.booleanValue !== choice.booleanValue
            );
          }
          case PreferenceTopicType.Select: {
            return currentPreference.choice.selectValue !== choice.selectValue;
          }
          case PreferenceTopicType.MultiSelect: {
            const sortedCurrentValues = (
              currentPreference.choice.selectValues || []
            ).sort();

            const sortedNewValues = (choice.selectValues || []).sort();
            return (
              sortedCurrentValues.length !== sortedNewValues.length ||
              !sortedCurrentValues.every(
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
      });
    },
  );
}
