import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Adjust this relative import path as needed
import {
  getFilePrefix,
  computeReceiptsFolder,
  computeSchemaFile,
} from '../computeFiles';

// Mock fs BEFORE importing SUT
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
}));

describe('computeFiles helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFilePrefix', () => {
    it('strips ".csv" from a bare filename', () => {
      expect(getFilePrefix('users.csv')).toBe('users');
    });

    it('strips ".csv" from a path and uses basename', () => {
      expect(getFilePrefix('/tmp/uploads/batch-01.csv')).toBe('batch-01');
    });

    it('is case-sensitive (does not strip ".CSV") by design', () => {
      // Current implementation only replaces ".csv" (lowercase)
      expect(getFilePrefix('/tmp/Foo.CSV')).toBe('Foo.CSV');
    });
  });

  describe('computeReceiptsFolder', () => {
    it('returns the provided receiptFileDir and creates it', () => {
      const dir = '/var/tmp/receipts';
      const out = computeReceiptsFolder(dir, '/ignored');
      expect(out).toBe(dir);
      expect(mkdirSync).toHaveBeenCalledWith(dir, { recursive: true });
    });

    it('derives sibling "../receipts" when directory is provided and receiptFileDir is undefined', () => {
      const directory = '/data/csvs';
      const expected = join(directory, '../receipts'); // => '/data/receipts'
      const out = computeReceiptsFolder(undefined, directory);
      expect(out).toBe(expected);
      expect(mkdirSync).toHaveBeenCalledWith(expected, { recursive: true });
    });

    it('defaults to "./receipts" when both params are undefined', () => {
      const out = computeReceiptsFolder(undefined, undefined);
      expect(out).toBe('./receipts');
      expect(mkdirSync).toHaveBeenCalledWith('./receipts', { recursive: true });
    });
  });

  describe('computeSchemaFile', () => {
    it('returns schemaFilePath if provided', () => {
      const schema = '/etc/schema.json';
      const out = computeSchemaFile(schema, '/ignored', 'foo.csv');
      expect(out).toBe(schema);
    });

    it('when no schemaFilePath, uses sibling "../preference-upload-schema.json" if directory is provided', () => {
      const directory = '/data/csvs';
      const expected = join(directory, '../preference-upload-schema.json'); // => '/data/preference-upload-schema.json'
      const out = computeSchemaFile(undefined, directory, 'foo.csv');
      expect(out).toBe(expected);
    });

    it('when no schemaFilePath and no directory, derives from firstFile prefix', () => {
      const out = computeSchemaFile(undefined, undefined, '/tmp/batch-01.csv');
      expect(out).toBe('batch-01-preference-upload-schema.json');
    });
  });
});
