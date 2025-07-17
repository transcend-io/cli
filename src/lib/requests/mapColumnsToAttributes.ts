import type { PersistedState } from '@transcend-io/persisted-state';
import type { GraphQLClient } from 'graphql-request';
import inquirer from 'inquirer';
import { AttributeKey } from '../graphql';
import { CachedFileState } from './constants';
import { fuzzyMatchColumns } from './fuzzyMatchColumns';

/**
 * Mapping from attribute name to request input parameter
 */
export type AttributeNameMap = {
  [k in string]: string;
};

/**
 * Create a mapping from the attributes names that can be included
 * at request submission, to the names of the columns that map to those
 * attributes.
 *
 * @param client - GraphQL client
 * @param columnNames - The set of all column names
 * @param state - Cached state of this mapping
 * @param requestAttributeKeys - Attribute keys to map
 * @returns Mapping from attributes name to column name
 */
export async function mapColumnsToAttributes(
  client: GraphQLClient,
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
  requestAttributeKeys: AttributeKey[],
): Promise<AttributeNameMap> {
  // Determine the columns that should be mapped
  const columnQuestions = requestAttributeKeys.filter(
    ({ name }) => !state.getValue('attributeNames', name),
  );

  // Skip mapping when everything is mapped
  const attributeNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await inquirer.prompt<{
          [k in string]: string;
        }>(
          columnQuestions.map(({ name }) => {
            const matches = fuzzyMatchColumns(columnNames, name, false);
            return {
              name,
              message: `Choose the column that will be used to map in the attribute: ${name}`,
              type: 'list',
              default: matches[0],
              choices: matches,
            };
          }),
        );
  await Promise.all(
    Object.entries(attributeNameMap).map(([k, v]) =>
      state.setValue(v, 'attributeNames', k),
    ),
  );

  return {
    ...state.getValue('attributeNames'),
    ...attributeNameMap,
  };
}
