/**
 * Formats a date to the ISO string for an example command
 * Ensures the dates in our documentation are relatively recent, while guaranteeing a date is not in the future
 *
 * NOTE: for date spans where the start/end dates are in different years, pass `{ overrideToThisYear: false }`
 *
 * @param dateString - The date to format
 * @param options - The options for the date
 * @returns The formatted date
 */
export function getExampleDate(
  dateString: string,
  {
    /** Whether to override the date to be within the current year. Good for keeping docs up to date. */
    overrideToLastYear = true,
    /** Whether to override the time to be midnight UTC. Generally recommended. */
    overrideToUtcMidnight = true,
  } = {},
): Date {
  const date = new Date(dateString);

  // Pin time to midnight UTC
  if (overrideToUtcMidnight) {
    date.setUTCHours(0, 0, 0, 0); // Set time to midnight UTC
  }

  // This keeps example commands relatively up to date, while guaranteeing a date is not in the future
  if (overrideToLastYear) {
    date.setUTCFullYear(new Date().getUTCFullYear() - 1);
  }

  return date;
}
