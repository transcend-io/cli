import { describe, it, expect, vi } from 'vitest';
import { pathToFileURL } from 'node:url';
import { osc8Link } from '../osc8Link';

/**
 * Build the exact OSC 8 wrapper string for an href + label.
 *
 * @param href - fully-qualified file URL
 * @param text - label text to display
 * @returns The full OSC8-wrapped hyperlink string
 */
function wrap(href: string, text: string): string {
  const OSC = '\u001B]8;;';
  const BEL = '\u0007';
  return `${OSC}${href}${BEL}${text}${OSC}${BEL}`;
}

describe('osc8Link', () => {
  it('produces a valid OSC 8 link for an absolute POSIX path (uses absPath as label by default)', () => {
    const abs = '/tmp/some file.txt';
    const { href } = pathToFileURL(abs);
    const out = osc8Link(abs);

    // Exact match expected
    expect(out).toBe(wrap(href, abs));

    // Sanity: should start and end with correct escape sequences
    expect(out.startsWith('\u001B]8;;file://')).toBe(true);
    expect(out.endsWith('\u001B]8;;\u0007')).toBe(true); // trailing OSC+BEL
  });

  it('uses provided label (including SGR color codes) without altering it', () => {
    const abs = '/var/log/app.log';
    const label = '\u001B[31mERROR\u001B[0m app.log'; // red "ERROR" prefix
    const { href } = pathToFileURL(abs);

    const out = osc8Link(abs, label);
    expect(out).toBe(wrap(href, label));

    // Ensure label appears verbatim
    expect(out).toContain(label);
  });

  it('returns the label as-is when absPath is empty or a placeholder starting with "("', () => {
    const label = 'N/A';
    expect(osc8Link('', label)).toBe(label);
    expect(osc8Link('(unavailable)', label)).toBe(label);
  });

  it('returns the raw absPath when placeholder-like and label is not provided', () => {
    const ph = '(internal)';
    expect(osc8Link(ph)).toBe(ph);
  });

  it('falls back to label/absPath when pathToFileURL throws (isolated via runtime mock)', async () => {
    // Ensure fresh module graph for this test
    vi.resetModules();

    // Runtime-mock node:url so pathToFileURL throws only for this import
    vi.doMock('node:url', () => ({
      pathToFileURL: () => {
        throw new Error('forced throw for test');
      },
    }));

    // Import a fresh copy of the SUT that sees the mocked node:url
    const { osc8Link: mockedOsc8Link } = await import('../osc8Link');

    const rel = 'relative/path.txt';
    // No label → returns the raw argument when pathToFileURL fails
    expect(mockedOsc8Link(rel)).toBe(rel);

    // With label → returns the label unchanged when pathToFileURL fails
    const label = 'click me';
    expect(mockedOsc8Link(rel, label)).toBe(label);

    // Cleanup to avoid affecting other files (not strictly necessary here, but good practice)
    vi.resetModules();
    vi.unmock('node:url');
  });
});
