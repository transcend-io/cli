import handlebars from 'handlebars';

/**
 * Parse AST for variables
 *
 * @param statement - Statement to parse
 * @returns Variables
 */
function parseHandlebarsAst(statement: hbs.AST.Statement): {
  [k in string]: unknown;
} {
  // No variables
  if (statement.type === 'ContentStatement') {
    return {};
  }

  // Parse variables from {{ var }}
  if (statement.type === 'MustacheStatement') {
    const moustacheStatement = statement as hbs.AST.MustacheStatement;
    const paramsExpressionList =
      moustacheStatement.params as hbs.AST.PathExpression[];
    const pathExpression = moustacheStatement.path as hbs.AST.PathExpression;
    const vars = [
      ...paramsExpressionList.map(({ original }) => original),
      pathExpression.original,
    ].filter((x) => !!x);
    return vars.reduce((acc, x) => Object.assign(acc, { [x]: null }), {});
  }

  // Parse from {{#each}} or {{#with}}
  if (statement.type === 'BlockStatement' && statement) {
    const moustacheStatement = statement as hbs.AST.MustacheStatement;
    const paramsExpressionList =
      moustacheStatement.params as hbs.AST.PathExpression[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = (moustacheStatement as any).program as hbs.AST.Program;
    const param = paramsExpressionList[0];
    return {
      [param.original]: [
        program.body
          .map(parseHandlebarsAst)
          .reduce((acc, obj) => Object.assign(acc, obj), {}),
      ],
    };
  }
  throw new Error(`Unknown statement: ${statement.type}`);
}

/**
 * Get variables from handlebars template
 *
 * @param template - Template
 * @returns Variables
 */
export function getVariablesFromHandlebarsTemplate(template: string): {
  [k in string]: unknown;
} {
  const ast = handlebars.parseWithoutProcessing(template);

  const results = ast.body.map(parseHandlebarsAst);
  return results.reduce((acc, data) => {
    Object.entries(data).forEach(([k, v]) => {
      const existing = acc[k];
      if (!existing) {
        return Object.assign(acc, { [k]: v });
      }
      if (Array.isArray(existing) && Array.isArray(v)) {
        return Object.assign(acc, {
          [k]: [
            {
              ...existing[0],
              ...v[0],
            },
          ],
        });
      }
      if (typeof existing === 'object' && typeof v === 'object') {
        return Object.assign(acc, {
          [k]: {
            ...existing,
            ...v,
          },
        });
      }
      return Object.assign(acc, {
        [k]: v,
      });
    });
    return acc;
  }, {});
}
