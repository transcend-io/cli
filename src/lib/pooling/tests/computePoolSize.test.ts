import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';

import { computePoolSize } from '../computePoolSize';
import { availableParallelism } from 'node:os';

/**
 * Mock collaborators BEFORE importing the SUT.
 * Path is relative to THIS test file.
 */
vi.mock('node:os', () => ({
  availableParallelism: vi.fn(),
}));

const mockedAvail = availableParallelism as unknown as Mock;

describe('computePoolSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses explicit concurrency when > 0 (capped by filesCount)', () => {
    mockedAvail.mockReturnValue(12);

    // concurrency=3, files=10 ⇒ use 3
    expect(computePoolSize(3, 10)).toEqual({ poolSize: 3, cpuCount: 12 });

    // concurrency=20, files=5 ⇒ capped to 5
    expect(computePoolSize(20, 5)).toEqual({ poolSize: 5, cpuCount: 12 });
  });

  it('falls back to availableParallelism when concurrency is undefined', () => {
    mockedAvail.mockReturnValue(8);

    // files=20 ⇒ min(cpuCount=8, files=20) => 8
    expect(computePoolSize(undefined, 20)).toEqual({
      poolSize: 8,
      cpuCount: 8,
    });

    // files=3 ⇒ min(8, 3) => 3
    expect(computePoolSize(undefined, 3)).toEqual({ poolSize: 3, cpuCount: 8 });
  });

  it('treats concurrency <= 0 as "not set" and uses availableParallelism', () => {
    mockedAvail.mockReturnValue(4);

    // concurrency=0 ⇒ use cpuCount (4), files=7 ⇒ 4
    expect(computePoolSize(0, 7)).toEqual({ poolSize: 4, cpuCount: 4 });

    // concurrency=-2 ⇒ use cpuCount (4), files=2 ⇒ min(4,2)=2
    expect(computePoolSize(-2, 2)).toEqual({ poolSize: 2, cpuCount: 4 });
  });

  it('returns poolSize 0 when filesCount is 0 (regardless of CPU count)', () => {
    mockedAvail.mockReturnValue(16);

    expect(computePoolSize(undefined, 0)).toEqual({
      poolSize: 0,
      cpuCount: 16,
    });
    expect(computePoolSize(10, 0)).toEqual({ poolSize: 0, cpuCount: 16 });
  });

  it('guards cpuCount to be at least 1 (availableParallelism returns 0)', () => {
    mockedAvail.mockReturnValue(0);

    // cpuCount=1 (guarded), files=10 ⇒ poolSize=1
    expect(computePoolSize(undefined, 10)).toEqual({
      poolSize: 1,
      cpuCount: 1,
    });
  });

  it('guards cpuCount to be at least 1 (availableParallelism returns undefined)', () => {
    mockedAvail.mockReturnValue(undefined as unknown as number);

    // cpuCount=1 (fallback), files=3 ⇒ poolSize=1
    expect(computePoolSize(undefined, 3)).toEqual({ poolSize: 1, cpuCount: 1 });
  });
});
