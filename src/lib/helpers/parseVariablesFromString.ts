/**
 * Parse variables from string
 *
 * @param variables - Variables as string
 * @returns Variables as object
 */
export function parseVariablesFromString(variables: string): {
  [k in string]: string;
} {
  // Parse out the variables
  const splitVars = variables.split(',').filter((x) => !!x);
  const vars: { [k in string]: string } = {};
  splitVars.forEach((variable) => {
    const [k, v] = variable.split(':');
    vars[k] = v;
  });
  return vars;
}
