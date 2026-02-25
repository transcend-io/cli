import { describe, it, expect } from 'vitest';

import { getPreferenceMetadataFromRow } from '../getPreferenceMetadataFromRow';
import type { ColumnMetadataMap } from '../codecs';

describe('getPreferenceMetadataFromRow', () => {
  const columnToMetadata: ColumnMetadataMap = {
    source_system: { key: 'Source' },
    campaign_id: { key: 'CampaignId' },
    notes: { key: 'Notes' },
  };

  it('extracts metadata for all mapped columns with values', () => {
    const result = getPreferenceMetadataFromRow({
      row: {
        source_system: 'salesforce',
        campaign_id: 'camp-123',
        notes: 'important',
      },
      columnToMetadata,
    });

    expect(result).toEqual([
      { key: 'Source', value: 'salesforce' },
      { key: 'CampaignId', value: 'camp-123' },
      { key: 'Notes', value: 'important' },
    ]);
  });

  it('skips columns with empty string values', () => {
    const result = getPreferenceMetadataFromRow({
      row: {
        source_system: 'salesforce',
        campaign_id: '',
        notes: 'ok',
      },
      columnToMetadata,
    });

    expect(result).toEqual([
      { key: 'Source', value: 'salesforce' },
      { key: 'Notes', value: 'ok' },
    ]);
  });

  it('skips columns missing from the row', () => {
    const result = getPreferenceMetadataFromRow({
      row: {
        source_system: 'web',
      },
      columnToMetadata,
    });

    expect(result).toEqual([{ key: 'Source', value: 'web' }]);
  });

  it('returns empty array when no columns match', () => {
    const result = getPreferenceMetadataFromRow({
      row: { unrelated_col: 'value' },
      columnToMetadata,
    });

    expect(result).toEqual([]);
  });

  it('returns empty array for empty columnToMetadata', () => {
    const result = getPreferenceMetadataFromRow({
      row: { source_system: 'salesforce' },
      columnToMetadata: {},
    });

    expect(result).toEqual([]);
  });
});
