/**
 * If the environment variable `DEVELOPMENT_MODE_VALIDATE_ONLY` is set,
 * this function will exit the process with a status code of 0.
 *
 * This is useful for development mode, where we want to validate the
 * command flags without actually running the command.
 *
 * This should be called after input validation, and must be agnostic to the environment (e.g., the existence of a file on the file system)
 *
 * @param exit - The function to exit the process.
 */
export function doneInputValidation(exit: (code?: number) => void): void {
  if (process.env.DEVELOPMENT_MODE_VALIDATE_ONLY === 'true') {
    exit(0);
  }
}
