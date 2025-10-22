import { describe, it, expect } from 'vitest';
import type { PreferenceQueryResponseItem } from '@transcend-io/privacy-types';

import { transformPreferenceRecordToCsv } from '../transformPreferenceRecordToCsv';

describe('transformPreferenceRecordToCsv', () => {
  it(
    'flattens a full record: identifiers grouped, metadata grouped, ' +
      'purposes & preferences expanded, top-level/system/consentManagement preserved',
    () => {
      const input: PreferenceQueryResponseItem = {
        // ---- top-level passthroughs
        partition: 'ee1a0845-694e-4820-9d51-50c7d0a23467',
        timestamp: '2023-04-11T15:09:28.403Z',
        metadataTimestamp: '2023-06-13T08:02:21.793Z',

        // ---- identifiers: duplicates per name should dedupe and join
        identifiers: [
          { name: 'email', value: 'no-track@example.com' },
          { name: 'email', value: 'no-track@example.com' }, // dup
          { name: 'email', value: 'foo@example.com' },
          { name: 'phone', value: '+11234567890' },
          { name: 'phone', value: '' }, // empty -> ignored
        ],

        // ---- consentManagement/system merge to top-level
        consentManagement: {
          airgapVersion: null,
          usp: '1YYN',
          gpp: null,
          tcf: null,
        },
        system: {
          updatedAt: '2023-06-13T08:02:21.793Z',
          decryptionStatus: 'DECRYPTED',
        },

        // ---- metadata: same key appears twice; values dedup and joined
        metadata: [
          { key: 'version', value: '1.0.0' },
          { key: 'version', value: '1.0.0' }, // dup
          { key: 'confirmationTimestamp', value: '2023-06-13T07:03:12.621Z' },
        ],

        // ---- purposes & preferences
        purposes: [
          { purpose: 'Advertising', enabled: true }, // no nested prefs
          {
            purpose: 'ProductUpdates',
            enabled: true,
            preferences: [
              {
                topic: 'Frequency',
                choice: { selectValue: 'Weekly' },
              },
              {
                topic: 'Channel',
                choice: { selectValues: ['Email', 'Sms', ''] }, // empty entry filtered
              },
              {
                topic: 'GoDigital',
                choice: { booleanValue: true },
              },
            ],
          },
          { purpose: 'SaleOfInfo', enabled: false },
        ],
      } as unknown as PreferenceQueryResponseItem;

      const out = transformPreferenceRecordToCsv(input);

      // — top-level passthrough
      expect(out.partition).toBe('ee1a0845-694e-4820-9d51-50c7d0a23467');
      expect(out.timestamp).toBe('2023-04-11T15:09:28.403Z');
      expect(out.metadataTimestamp).toBe('2023-06-13T08:02:21.793Z');

      // — consentManagement/system flattened
      expect(out.airgapVersion).toBeNull();
      expect(out.usp).toBe('1YYN');
      expect(out.gpp).toBeNull();
      expect(out.tcf).toBeNull();
      expect(out.updatedAt).toBe('2023-06-13T08:02:21.793Z');
      expect(out.decryptionStatus).toBe('DECRYPTED');

      // — identifiers: name -> CSV (deduped)
      expect(out.email).toBe('no-track@example.com,foo@example.com');
      expect(out.phone).toBe('+11234567890');

      // — metadata
      expect(out.metadata).toBe(
        '{"version":"1.0.0","confirmationTimestamp":"2023-06-13T07:03:12.621Z"}',
      );

      // — purposes: one column per purpose = boolean
      expect(out.Advertising).toBe(true);
      expect(out.ProductUpdates).toBe(true);
      expect(out.SaleOfInfo).toBe(false);

      // — nested preferences: purpose_topic columns
      expect(out.ProductUpdates_Frequency).toBe('Weekly');
      expect(out.ProductUpdates_Channel).toBe('Email,Sms');
      expect(out.ProductUpdates_GoDigital).toBe(true);
    },
  );

  it('uses default system.decryptionStatus when system is omitted; identifiers/metadata/purposes omitted gracefully', () => {
    const input: PreferenceQueryResponseItem = {
      partition: 'p',
      timestamp: '2024-01-01T00:00:00.000Z',
      metadataTimestamp: '2024-01-02T00:00:00.000Z',
      // no system, no consentManagement, no identifiers/metadata/purposes
    } as unknown as PreferenceQueryResponseItem;

    const out = transformPreferenceRecordToCsv(input);

    // top-level preserved
    expect(out.partition).toBe('p');
    expect(out.timestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(out.metadataTimestamp).toBe('2024-01-02T00:00:00.000Z');

    // default system.decryptionStatus injected (per function param default)
    expect(out.decryptionStatus).toBe('DECRYPTED');

    // nothing else added
    expect(Object.prototype.hasOwnProperty.call(out, 'updatedAt')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(out, 'usp')).toBe(false);
  });

  it('sets null for a preference with no usable value (empty choice object)', () => {
    const input: PreferenceQueryResponseItem = {
      partition: 'p',
      timestamp: '2024-01-01T00:00:00.000Z',
      purposes: [
        {
          purpose: 'Newsletters',
          enabled: true,
          preferences: [
            { topic: 'UnspecifiedChoice', choice: {} }, // -> null
          ],
        },
      ],
    } as unknown as PreferenceQueryResponseItem;

    const out = transformPreferenceRecordToCsv(input);
    expect(out.Newsletters).toBe(true);
    expect(out.Newsletters_UnspecifiedChoice).toBeNull();
  });

  it('handles empty selectValues by producing empty string, and ignores falsy identifier values', () => {
    const input: PreferenceQueryResponseItem = {
      partition: 'p',
      timestamp: '2024-01-01T00:00:00.000Z',
      identifiers: [
        { name: 'email', value: '' }, // ignored
        { name: 'email', value: 'a@x.com' },
        { name: 'email', value: 'a@x.com' }, // dup
      ],
      purposes: [
        {
          purpose: 'Prefs',
          enabled: true,
          preferences: [{ topic: 'Multi', choice: { selectValues: [] } }],
        },
      ],
    } as unknown as PreferenceQueryResponseItem;

    const out = transformPreferenceRecordToCsv(input);
    expect(out.email).toBe('a@x.com');
    // empty selectValues => filtered tokens => join('') => '' (empty string)
    expect(out.Prefs_Multi).toBe('');
  });
});
