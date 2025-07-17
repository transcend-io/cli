import { ObjByString } from "@transcend-io/type-utils";
import inquirer from "inquirer";
import autoCompletePrompt from "inquirer-autocomplete-prompt";
import { fuzzySearch } from "../requests";

/**
 * Inquirer confirm text
 *
 * @param options - Options
 * @returns The response
 */
export async function inquirerConfirmBoolean({
  message,
}: {
  /** Message */
  message: string;
}): Promise<boolean> {
  const { response } = await inquirer.prompt<{
    /** confirmation */
    response: boolean;
  }>([
    {
      name: "response",
      message,
      type: "confirm",
    },
  ]);
  return response;
}

/**
 * Inquirer confirm text
 *
 * @param options - Options
 * @returns The response
 */
export async function inquirerConfirmText({
  message,
}: {
  /** Message */
  message: string;
}): Promise<string> {
  const { response } = await inquirer.prompt<{
    /** confirmation */
    response: string;
  }>([
    {
      name: "response",
      message,
      type: "text",
      validate: (x) => x.trim().length > 0,
    },
  ]);
  return response;
}

/**
 * Inquirer auto complete
 *
 * @param options - Options
 * @returns The response
 */
export async function inquirerAutoComplete({
  defaultValue,
  values,
  message,
}: {
  /** Default value */
  defaultValue?: string;
  /** Message */
  message: string;
  /** Values to select */
  values: string[];
}): Promise<string> {
  inquirer.registerPrompt("autocomplete", autoCompletePrompt);
  const { response } = await inquirer.prompt<{
    /** confirmation */
    response: string;
  }>([
    {
      name: "response",
      message,
      type: "autocomplete",
      default: defaultValue,
      source: (answersSoFar: ObjByString, input: string) =>
        input
          ? values.filter((x) => typeof x === "string" && fuzzySearch(input, x))
          : values,
    },
  ]);
  return response;
}
