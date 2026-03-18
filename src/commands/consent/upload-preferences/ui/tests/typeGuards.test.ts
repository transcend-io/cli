import { describe, it, expect } from 'vitest';
import {
  isUploadModeTotals,
  isCheckModeTotals,
  type UploadModeTotals,
  type CheckModeTotals,
} from '../typeGuards';

describe('typeGuards', () => {
  describe('isUploadModeTotals', () => {
    it('returns true for a valid UploadModeTotals object', () => {
      const obj: UploadModeTotals = {
        mode: 'upload',
        success: 10,
        skipped: 2,
        error: 1,
        errors: { someId: 3 },
      };
      expect(isUploadModeTotals(obj)).toBe(true);
    });

    it('returns false for a CheckModeTotals object', () => {
      const obj: CheckModeTotals = {
        mode: 'check',
        pendingConflicts: 1,
        pendingSafe: 2,
        totalPending: 3,
        skipped: 0,
      };
      expect(isUploadModeTotals(obj)).toBe(false);
    });

    it('returns false for null, undefined, or non-object', () => {
      expect(isUploadModeTotals(null)).toBe(false);
      expect(isUploadModeTotals(undefined)).toBe(false);
      expect(isUploadModeTotals('upload')).toBe(false);
      expect(isUploadModeTotals(123)).toBe(false);
    });

    it('returns false for object missing mode property', () => {
      const obj = { success: 1, skipped: 1, error: 0, errors: {} };
      expect(isUploadModeTotals(obj)).toBe(false);
    });
  });

  describe('isCheckModeTotals', () => {
    it('returns true for a valid CheckModeTotals object', () => {
      const obj: CheckModeTotals = {
        mode: 'check',
        pendingConflicts: 1,
        pendingSafe: 2,
        totalPending: 3,
        skipped: 4,
      };
      expect(isCheckModeTotals(obj)).toBe(true);
    });

    it('returns false for an UploadModeTotals object', () => {
      const obj: UploadModeTotals = {
        mode: 'upload',
        success: 5,
        skipped: 0,
        error: 0,
        errors: {},
      };
      expect(isCheckModeTotals(obj)).toBe(false);
    });

    it('returns false for null, undefined, or non-object', () => {
      expect(isCheckModeTotals(null)).toBe(false);
      expect(isCheckModeTotals(undefined)).toBe(false);
      expect(isCheckModeTotals('check')).toBe(false);
      expect(isCheckModeTotals(123)).toBe(false);
    });

    it('returns false for object missing mode property', () => {
      const obj = {
        pendingConflicts: 0,
        pendingSafe: 0,
        totalPending: 0,
        skipped: 0,
      };
      expect(isCheckModeTotals(obj)).toBe(false);
    });
  });
});
