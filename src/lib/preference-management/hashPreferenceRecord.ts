/* eslint-disable no-continue */
import { createHash } from 'crypto';

/**
 * Create a hash of a preference record object.
 * Used for de-duplication.
 *
 * @param obj - The preference record object
 * @returns A hex string hash
 */
export function hashPreferenceRecord(obj: unknown): string {
  const h = createHash('sha1'); // or 'sha256' if you want extra safety
  const stack: unknown[] = [obj];

  while (stack.length) {
    const v = stack.pop();
    if (v === null) {
      h.update('n');
      continue;
    }
    const t = typeof v;
    if (t === 'string') {
      h.update('s');
      h.update(v as string);
      continue;
    }
    if (t === 'number') {
      h.update('d');
      const buf = Buffer.allocUnsafe(8);
      buf.writeDoubleBE(v as number, 0);
      h.update(buf);
      continue;
    }
    if (t === 'boolean') {
      h.update(v ? 'b1' : 'b0');
      continue;
    }
    if (t !== 'object') {
      h.update('x');
      h.update(String(v));
      continue;
    }

    if (Array.isArray(v)) {
      h.update('[');
      for (const item of v) stack.push(item);
      h.update(']');
      continue;
    }

    // object – stable key order
    h.update('{');
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    for (const k of keys) {
      h.update('k');
      h.update(k);
      stack.push(o[k]);
    }
    h.update('}');
  }

  return h.digest('hex');
}
/* eslint-enable no-continue */
