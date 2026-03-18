import {
  PreferenceQueryResponseItem,
  PreferenceStorePurposeResponse,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { PreferenceTopic } from '../graphql';
import { logger } from '../../logger';

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
  log,
}: {
  /** The current consent record */
  currentConsentRecord: PreferenceQueryResponseItem;
  /** The pending updates */
  pendingUpdates: {
    [purposeName in string]: Omit<PreferenceStorePurposeResponse, 'purpose'>;
  };
  /** The preference topic configurations */
  preferenceTopics: PreferenceTopic[];
  /** Whether to log the conflict */
  log?: boolean;
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
        if (log) {
          logger.warn(
            `No existing purpose found for ${purposeName} in consent record for ${currentConsentRecord.userId}.`,
          );
        }
        return false;
      }

      // If purpose.enabled value is off, this is a conflict
      if (currentPurpose.enabled !== enabled) {
        if (log) {
          logger.warn(
            `Purpose ${purposeName} enabled value conflict for user ${currentConsentRecord.userId}. ` +
              `Pending Value: ${enabled}, Current Value: ${currentPurpose.enabled}`,
          );
        }
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
          if (log) {
            logger.warn(
              `No existing preference found for topic ${topic} in purpose ` +
                `${purposeName} for user ${currentConsentRecord.userId}.`,
            );
          }
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
        let boolMatch: boolean;
        let selectMatch: boolean;
        switch (preferenceTopic.type) {
          case PreferenceTopicType.Boolean:
            boolMatch =
              currentPreference.choice.booleanValue !== choice.booleanValue;
            if (log) {
              logger.warn(
                `Preference topic ${topic} boolean value conflict for user ` +
                  `${currentConsentRecord.userId}. Expected: ${choice.booleanValue}, ` +
                  `Found: ${currentPreference.choice.booleanValue}`,
              );
            }
            return boolMatch;
          case PreferenceTopicType.Select:
            selectMatch =
              currentPreference.choice.selectValue !== choice.selectValue;
            if (log) {
              logger.warn(
                `Preference topic ${topic} select value conflict for user ` +
                  `${currentConsentRecord.userId}. Expected: ${choice.selectValue}, ` +
                  `Found: ${currentPreference.choice.selectValue}`,
              );
            }
            return selectMatch;
          case PreferenceTopicType.MultiSelect:
            // eslint-disable-next-line no-case-declarations
            const sortedCurrentValues = (
              currentPreference.choice.selectValues || []
            ).sort();
            // eslint-disable-next-line no-case-declarations
            const sortedNewValues = (choice.selectValues || []).sort();
            selectMatch =
              sortedCurrentValues.length !== sortedNewValues.length ||
              !sortedCurrentValues.every((x, i) => x === sortedNewValues[i]);
            if (log) {
              logger.warn(
                `Preference topic ${topic} multi-select value conflict for user ` +
                  `${
                    currentConsentRecord.userId
                  }. Expected: ${sortedNewValues.join(
                    ', ',
                  )}, Found: ${sortedCurrentValues.join(', ')}`,
              );
            }
            return selectMatch;
          default:
            throw new Error(
              `Unknown preference topic type: ${preferenceTopic.type}`,
            );
        }
      });
    },
  );
}
