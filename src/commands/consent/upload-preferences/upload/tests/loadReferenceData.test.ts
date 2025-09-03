import { describe, it, expect, vi, beforeEach } from 'vitest';

// Type-only imports
import type { GraphQLClient } from 'graphql-request';
import type {
  Identifier,
  PreferenceTopic,
  Purpose,
} from '../../../../../lib/graphql';

// Shared mocks (we’ll register them per-test after resetModules)
const mFetchAllPurposes = vi.fn();
const mFetchAllPreferenceTopics = vi.fn();
const mFetchAllIdentifiers = vi.fn();
const mBuildTranscendGraphQLClient = vi.fn();

// Helper: after resetting modules, install the mocks, then import SUT fresh
async function importSut(): Promise<{
  loadReferenceData: typeof import('../loadReferenceData')['loadReferenceData'];
}> {
  // IMPORTANT: mock BEFORE importing the SUT; specifier must match exactly
  vi.mock('../../../../../lib/graphql', () => ({
    buildTranscendGraphQLClient: mBuildTranscendGraphQLClient,
    fetchAllPurposes: mFetchAllPurposes,
    fetchAllPreferenceTopics: mFetchAllPreferenceTopics,
    fetchAllIdentifiers: mFetchAllIdentifiers,
  }));

  // Dynamic import AFTER mocks are registered
  const mod = await import('../loadReferenceData');
  return {
    loadReferenceData:
      mod.loadReferenceData as typeof import('../loadReferenceData')['loadReferenceData'],
  };
}

describe('loadReferenceData', () => {
  let client: GraphQLClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // ensure a clean module graph so our mocks stick

    // Minimal safe stub so any unintended calls don't crash
    client = {
      request: vi.fn().mockResolvedValue({}),
    } as unknown as GraphQLClient;
  });

  it('loads purposes, topics, and identifiers when forceTriggerWorkflows=false', async () => {
    const { loadReferenceData } = await importSut();

    const purposes = [{ id: 'p1' }, { id: 'p2' }] as Purpose[];
    const preferenceTopics = [{ id: 't1' }] as PreferenceTopic[];
    const identifiers = [{ id: 'i1' }, { id: 'i2' }] as Identifier[];

    mFetchAllPurposes.mockResolvedValueOnce(purposes);
    mFetchAllPreferenceTopics.mockResolvedValueOnce(preferenceTopics);
    mFetchAllIdentifiers.mockResolvedValueOnce(identifiers);

    const result = await loadReferenceData(client, false);

    expect(result.client).toBe(client);
    expect(result.purposes).toEqual(purposes);
    expect(result.preferenceTopics).toEqual(preferenceTopics);
    expect(result.identifiers).toEqual(identifiers);

    expect(mFetchAllPurposes).toHaveBeenCalledTimes(1);
    expect(mFetchAllPurposes).toHaveBeenCalledWith(client);

    expect(mFetchAllPreferenceTopics).toHaveBeenCalledTimes(1);
    expect(mFetchAllPreferenceTopics).toHaveBeenCalledWith(client);

    expect(mFetchAllIdentifiers).toHaveBeenCalledTimes(1);
    expect(mFetchAllIdentifiers).toHaveBeenCalledWith(client);
  });

  it('skips purposes/topics and still loads identifiers when forceTriggerWorkflows=true', async () => {
    const { loadReferenceData } = await importSut();

    const identifiers = [{ id: 'i-only' }] as Identifier[];

    // Should not be called at all when forcing triggers
    mFetchAllPurposes.mockImplementation(() => {
      throw new Error('should not be called');
    });
    mFetchAllPreferenceTopics.mockImplementation(() => {
      throw new Error('should not be called');
    });
    mFetchAllIdentifiers.mockResolvedValueOnce(identifiers);

    const result = await loadReferenceData(client, true);

    expect(result.client).toBe(client);
    expect(result.purposes).toEqual([]);
    expect(result.preferenceTopics).toEqual([]);
    expect(result.identifiers).toEqual(identifiers);

    expect(mFetchAllPurposes).not.toHaveBeenCalled();
    expect(mFetchAllPreferenceTopics).not.toHaveBeenCalled();
    expect(mFetchAllIdentifiers).toHaveBeenCalledTimes(1);
    expect(mFetchAllIdentifiers).toHaveBeenCalledWith(client);
  });

  it('propagates errors (e.g., identifiers fetch fails)', async () => {
    const { loadReferenceData } = await importSut();

    const err = new Error('boom');

    mFetchAllPurposes.mockResolvedValueOnce([{ id: 'p' }] as Purpose[]);
    mFetchAllPreferenceTopics.mockResolvedValueOnce([
      { id: 't' },
    ] as PreferenceTopic[]);
    mFetchAllIdentifiers.mockRejectedValueOnce(err);

    await expect(loadReferenceData(client, false)).rejects.toBe(err);

    expect(mFetchAllPurposes).toHaveBeenCalledTimes(1);
    expect(mFetchAllPreferenceTopics).toHaveBeenCalledTimes(1);
    expect(mFetchAllIdentifiers).toHaveBeenCalledTimes(1);
  });
});
