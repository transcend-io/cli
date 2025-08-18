import { IdentifierInput } from '../../codecs';
import { GraphQLClient } from 'graphql-request';
import { UPDATE_IDENTIFIER } from './gqls';
import { makeGraphQLRequest } from './makeGraphQLRequest';
import type { DataSubject } from './fetchDataSubjects';

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncIdentifier(
  client: GraphQLClient,
  {
    identifier,
    dataSubjectsByName,
    identifierId,
    skipPublish = false,
  }: {
    /** Identifier update input */
    identifier: IdentifierInput;
    /** Data subject lookup by name */
    dataSubjectsByName: { [k in string]: DataSubject };
    /** Existing identifier Id */
    identifierId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_IDENTIFIER, {
    input: {
      id: identifierId,
      selectOptions: identifier.selectOptions,
      isRequiredInForm: identifier.isRequiredInForm,
      regex: identifier.regex,
      placeholder: identifier.placeholder,
      displayTitle: identifier.displayTitle,
      displayDescription: identifier.displayDescription,
      displayOrder: identifier.displayOrder,
      isUniqueOnPreferenceStore: identifier.isUniqueOnPreferenceStore,
      privacyCenterVisibility: identifier.privacyCenterVisibility,
      dataSubjectIds: identifier.dataSubjects
        ? identifier.dataSubjects.map((type) => dataSubjectsByName[type].id)
        : undefined,
      skipPublish,
    },
  });
}
