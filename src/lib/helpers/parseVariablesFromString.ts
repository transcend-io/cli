/**
 * Parse variables from string
 *
 * @param variables - Variables as string
 * @returns Variables as object
 */
export function parseVariablesFromString(
  variables: string,
): Record<string, string> {
  // Parse out the variables
  const splitVariables = variables.split(',').filter((x) => !!x);
  const variables_: Record<string, string> = {};
  for (const variable of splitVariables) {
    const [k, v] = variable.split(':');
    if (!k || !v) {
      throw new Error(
        `Invalid variable: ${variable}. Expected format: key:value`,
      );
    }
    variables_[k] = v;
  }
  return variables_;
}
