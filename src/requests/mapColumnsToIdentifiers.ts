import type { GraphQLClient } from 'graphql-request';
import inquirer from 'inquirer';
import { INITIALIZER, makeGraphQLRequest, Initializer } from '../graphql';
import { CachedFileState } from './constants';
import { fuzzyMatchColumns } from './fuzzyMatchColumns';

/**
 * Mapping from identifier name to request input parameter
 */
export type IdentifierNameMap = {
  [k in string]: string;
};

/** These are uploaded at the top level of the request */
const IDENTIFIER_BLOCK_LIST = ['email', 'coreIdentifier'];

/**
 * Create a mapping from the identifier names that can be included
 * at request submission, to the names of the columns that map to those
 * identifiers.
 *
 * @param client - GraphQL client
 * @param columnNames - The set of all column names
 * @param cached - Cached state of this mapping
 * @returns Mapping from identifier name to column name
 */
export async function mapColumnsToIdentifiers(
  client: GraphQLClient,
  columnNames: string[],
  cached: CachedFileState,
): Promise<IdentifierNameMap> {
  // Grab the initializer
  const { initializer } = await makeGraphQLRequest<{
    /** Query response */
    initializer: Initializer;
  }>(client, INITIALIZER);

  // Determine the columns that should be mapped
  const columnQuestions = initializer.identifiers.filter(
    ({ name }) =>
      !cached.identifierNames[name] && IDENTIFIER_BLOCK_LIST.includes(name),
  );

  // Skip mapping when everything is mapped
  const identifierNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await inquirer.prompt<
          {
            [k in string]: string;
          }
        >(
          columnQuestions.map(({ name }) => {
            const matches = fuzzyMatchColumns(columnNames, name, false);
            return {
              name,
              message: `Choose the column that will be used to map in the identifier: ${name}`,
              type: 'list',
              default: matches[0],
              choices: matches,
            };
          }),
        );
  Object.entries(identifierNameMap).forEach(([k, v]) => {
    // eslint-disable-next-line no-param-reassign
    cached.identifierNames[k] = v;
  });

  return identifierNameMap;
}
