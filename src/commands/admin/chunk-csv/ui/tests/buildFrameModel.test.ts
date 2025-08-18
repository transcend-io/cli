// buildFrameModel.test.ts
import { describe, it, expect } from 'vitest';

// Adjust the import path to match your repo layout:
// If this test lives in `src/commands/chunk-csv/ui/tests/`, then:
import { buildFrameModel, type RenderDashboardInput } from '../buildFrameModel';

function makeInput(
  overrides: Partial<RenderDashboardInput> = {},
): RenderDashboardInput {
  const workerState = new Map<
    number,
    {
      file: string | null;
      busy: boolean;
      lastLevel: 'ok' | 'warn' | 'error';
      progress?: { processed: number; total?: number };
    }
  >();

  return {
    poolSize: 3,
    cpuCount: 8,
    filesTotal: 10,
    filesCompleted: 4,
    filesFailed: 1,
    workerState,
    final: false,
    throughput: { successSoFar: 1234, r10s: 12.3, r60s: 8.9 },
    exportsDir: '/tmp/exports',
    exportStatus: { info: true },
    ...overrides,
  };
}

describe('buildFrameModel', () => {
  it('converts workerState map into a workers array with expected fields', () => {
    const input = makeInput();
    input.workerState.set(0, {
      file: '/data/a.csv',
      busy: true,
      lastLevel: 'ok',
      progress: { processed: 100, total: 200 },
    });
    input.workerState.set(1, {
      file: null,
      busy: false,
      lastLevel: 'warn',
      // no progress
    });

    const model = buildFrameModel(input);

    // workers array length matches map size
    expect(model.workers).toHaveLength(2);

    // preserves insertion order (Map is ordered)
    expect(model.workers[0]).toMatchObject({
      id: 0,
      file: '/data/a.csv',
      busy: true,
      level: 'ok',
      processed: 100,
      total: 200,
    });

    // defaults processed to 0 when no progress is present
    expect(model.workers[1]).toMatchObject({
      id: 1,
      file: null,
      busy: false,
      level: 'warn',
      processed: 0,
      total: undefined,
    });
  });

  it('passes through top-level fields unchanged', () => {
    const input = makeInput({
      poolSize: 5,
      cpuCount: 16,
      filesTotal: 42,
      filesCompleted: 21,
      filesFailed: 2,
      final: true,
      throughput: { successSoFar: 999, r10s: 1.23, r60s: 0.45 },
      exportsDir: '/var/logs',
      exportStatus: { done: true },
    });

    const model = buildFrameModel(input);

    expect(model.poolSize).toBe(5);
    expect(model.cpuCount).toBe(16);
    expect(model.filesTotal).toBe(42);
    expect(model.filesCompleted).toBe(21);
    expect(model.filesFailed).toBe(2);
    expect(model.final).toBe(true);
    expect(model.throughput).toEqual({
      successSoFar: 999,
      r10s: 1.23,
      r60s: 0.45,
    });
    expect(model.exportsDir).toBe('/var/logs');
    expect(model.exportStatus).toEqual({ done: true });
  });

  it('does not mutate the input workerState', () => {
    const input = makeInput();
    input.workerState.set(3, {
      file: '/x.csv',
      busy: true,
      lastLevel: 'error',
      progress: { processed: 7 },
    });

    const before = JSON.stringify(
      [...input.workerState.entries()].map(([id, st]) => [id, { ...st }]),
    );

    const model = buildFrameModel(input);
    expect(model.workers[0]).toMatchObject({
      id: 3,
      file: '/x.csv',
      busy: true,
      level: 'error',
      processed: 7,
      total: undefined,
    });

    const after = JSON.stringify(
      [...input.workerState.entries()].map(([id, st]) => [id, { ...st }]),
    );
    expect(after).toBe(before); // unchanged
  });

  it('handles empty workerState', () => {
    const input = makeInput(); // workerState empty by default
    const model = buildFrameModel(input);
    expect(model.workers).toEqual([]);
  });
});
