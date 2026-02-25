import { ConsentWorkflowTriggerInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER } from './gqls';
import { logger } from '../../logger';
import { keyBy } from 'lodash-es';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import { fetchAllConsentWorkflowTriggers } from './fetchAllConsentWorkflowTriggers';
import { fetchAllActions, type Action } from './fetchAllActions';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes';
import colors from 'colors';
import { mapSeries } from '../bluebird';

/**
 * Sync consent workflow triggers to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Consent workflow trigger inputs from YAML
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncConsentWorkflowTriggers(
  client: GraphQLClient,
  inputs: ConsentWorkflowTriggerInput[],
): Promise<boolean> {
  logger.info(
    colors.magenta(`Syncing "${inputs.length}" consent workflow triggers...`),
  );

  let encounteredError = false;

  const [existingTriggers, actions, dataSubjects, purposes] = await Promise.all(
    [
      fetchAllConsentWorkflowTriggers(client),
      fetchAllActions(client),
      fetchAllDataSubjects(client),
      fetchAllPurposes(client),
    ],
  );

  const triggerByName = keyBy(existingTriggers, 'name');
  const actionByType = keyBy(actions, 'type') as Record<string, Action>;
  const dataSubjectByType = keyBy(dataSubjects, 'type') as Record<
    string,
    DataSubject
  >;
  const purposeByTrackingType = keyBy(purposes, 'trackingType') as Record<
    string,
    Purpose
  >;

  await mapSeries(inputs, async (trigger) => {
    try {
      const existingTrigger = triggerByName[trigger.name];

      // Resolve action type to ID
      let actionId: string | undefined;
      if (trigger['action-type']) {
        const action = actionByType[trigger['action-type']];
        if (!action) {
          throw new Error(
            `Failed to find action with type: ${trigger['action-type']}`,
          );
        }
        actionId = action.id;
      }

      // Resolve data subject type to ID
      let dataSubjectId: string | undefined;
      if (trigger['data-subject-type']) {
        const subject = dataSubjectByType[trigger['data-subject-type']];
        if (!subject) {
          throw new Error(
            `Failed to find data subject with type: ${trigger['data-subject-type']}`,
          );
        }
        dataSubjectId = subject.id;
      }

      // Resolve purpose tracking types to purpose IDs with matching states
      const consentWorkflowTriggerPurposes = trigger.purposes?.map(
        (purposeInput) => {
          const purpose = purposeByTrackingType[purposeInput['tracking-type']];
          if (!purpose) {
            throw new Error(
              `Failed to find purpose with trackingType: ${purposeInput['tracking-type']}`,
            );
          }
          return {
            purposeId: purpose.id,
            matchingState: purposeInput['matching-state'],
          };
        },
      );

      const input: Record<string, unknown> = {
        name: trigger.name,
        ...(existingTrigger ? { id: existingTrigger.id } : {}),
        ...(trigger['trigger-condition'] !== undefined
          ? { triggerCondition: trigger['trigger-condition'] }
          : {}),
        ...(actionId ? { actionId } : {}),
        ...(dataSubjectId ? { dataSubjectId } : {}),
        ...(trigger['is-silent'] !== undefined
          ? { isSilent: trigger['is-silent'] }
          : {}),
        ...(trigger['allow-unauthenticated'] !== undefined
          ? { allowUnauthenticated: trigger['allow-unauthenticated'] }
          : {}),
        ...(trigger['is-active'] !== undefined
          ? { isActive: trigger['is-active'] }
          : {}),
        ...(consentWorkflowTriggerPurposes
          ? { consentWorkflowTriggerPurposes }
          : {}),
      };

      await makeGraphQLRequest(
        client,
        CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER,
        { input },
      );

      logger.info(
        colors.green(
          `Successfully synced consent workflow trigger "${trigger.name}"!`,
        ),
      );
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(
          `Failed to sync consent workflow trigger "${trigger.name}"! - ${err.message}`,
        ),
      );
    }
  });

  logger.info(
    colors.green(`Synced "${inputs.length}" consent workflow triggers!`),
  );

  return !encounteredError;
}
