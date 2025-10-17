import ms, { type StringValue as MsStringValue } from 'ms';

/**
 * Validates and returns a UUID string.
 *
 * @param input - The input string to validate as UUID
 * @returns The validated UUID string
 * @throws Error if input is not a valid UUID
 */
export function uuidParser(input: string): string {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input)) {
    throw new Error(`Invalid UUID format: ${input}`);
  }
  return input;
}

/**
 * Validates and returns a URL string.
 *
 * @param input - The input string to validate as URL
 * @returns The validated URL string
 * @throws Error if input is not a valid URL
 */
export function urlParser(input: string): string {
  try {
    const url = new URL(input);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid URL format: ${input}`);
  }
}

/**
 * Parse a comma-separated string to array.
 * NOTE: Prefer using `variadic` for list arguments instead of this function. This should only be used for arguments which have a default value.
 *
 * @param input - The comma-separated string to parse
 * @returns Array of trimmed, non-empty strings
 */
export function arrayParser(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse a date string to a Date object.
 *
 * @param input - The date string to parse
 * @returns The parsed Date object
 * @throws TypeError if input is not a valid date
 */
export function dateParser(input: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      `Invalid date: ${input}. Try using the ISO 8601 format (YYYY-MM-DDTHH:MM:SS.SSSZ)`,
    );
  }
  return date;
}

/**
 * Parse a duration string to milliseconds.
 * Accepts concise/natural-ish strings (powered by `ms`) and returns milliseconds.
 * Examples: "3600", "2d", "1h", "90 minutes", "10s".
 *
 * @param input - The duration to parse
 * @returns The parsed duration in milliseconds
 * @throws Error if input is not a valid duration
 */
export function parseDurationToMs(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    // backward-compat: numbers => seconds
    return Math.round(input * 1000);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // empty string → our standardized error (avoid ms throwing its own)
    if (trimmed === '') {
      throw new Error(
        'Invalid duration. Examples: "45", "2d", "1h", "90 minutes", "10s".',
      );
    }

    // bare numeric string => seconds (backward-compat)
    const asNumber = Number(trimmed);
    if (trimmed !== '' && Number.isFinite(asNumber)) {
      return Math.round(asNumber * 1000);
    }

    // let ms parse human strings
    let parsed: number | undefined;
    try {
      parsed = ms(trimmed as MsStringValue);
    } catch {
      // normalize ms' error to ours
      throw new Error(
        'Invalid duration. Examples: "45", "2d", "1h", "90 minutes", "10s".',
      );
    }
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(
    'Invalid duration. Examples: "45", "2d", "1h", "90 minutes", "10s".',
  );
}
