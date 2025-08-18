import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import {
  artifactAbsPath,
  type ExportKindWithCsv,
  type ExportArtifactStatus,
} from '../artifactAbsPath';

/**
 * Return the expected fallback filename for a given export kind.
 *
 * @param kind - The export kind including CSV
 * @returns The filename used when no status.path is provided
 */
function fallbackName(kind: ExportKindWithCsv): string {
  switch (kind) {
    case 'error':
      return 'combined-errors.log';
    case 'warn':
      return 'combined-warns.log';
    case 'info':
      return 'combined-info.log';
    case 'all':
      return 'combined-all.log';
    case 'failures-csv':
      return 'failing-updates.csv';
    default:
      throw new Error(`Unknown export kind: ${kind}`);
  }
}

describe('artifactAbsPath', () => {
  it('returns status.path resolved when provided (absolute path stays absolute)', () => {
    const abs: ExportArtifactStatus = { path: '/var/log/combined-errors.log' };
    const out = artifactAbsPath('error', '/ignored', abs);
    expect(out).toBe(resolve(abs.path)); // resolve(abs) === abs
  });

  it('returns status.path resolved when provided (relative path becomes absolute)', () => {
    const rel: ExportArtifactStatus = { path: 'out/combined-warns.log' };
    const out = artifactAbsPath('warn', '/ignored', rel);
    expect(out).toBe(resolve(rel.path));
  });

  it('uses exportsDir + fallback filename when status is absent', () => {
    const dir = '/tmp/exports';
    (
      ['error', 'warn', 'info', 'all', 'failures-csv'] as ExportKindWithCsv[]
    ).forEach((k) => {
      const expected = resolve(join(dir, fallbackName(k)));
      const out = artifactAbsPath(k, dir);
      expect(out).toBe(expected);
    });
  });

  it('returns a placeholder string when neither status.path nor exportsDir is provided', () => {
    const out = artifactAbsPath('info');
    expect(out).toBe('(set exportsDir)'); // placeholders are not resolved
  });

  it('passes through placeholder-looking status.path without resolving', () => {
    const status: ExportArtifactStatus = { path: '(unavailable)' };
    const out = artifactAbsPath('all', '/ignored', status);
    expect(out).toBe('(unavailable)');
  });
});
