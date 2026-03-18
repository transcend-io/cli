import { describe, it, expect } from 'vitest';
import { buildExportStatus } from '../logRotation';

describe('buildExportStatus', () => {
  it('returns expected paths for all export artifacts', () => {
    const out = buildExportStatus('/logs');

    expect(out.error?.path).toBe('/logs/combined-errors.log');
    expect(out.warn?.path).toBe('/logs/combined-warns.log');
    expect(out.info?.path).toBe('/logs/combined-info.log');
    expect(out.all?.path).toBe('/logs/combined-all.log');
    expect(out.failuresCsv?.path).toBe('/logs/failing-updates.csv');
  });
});
