// renderDashboard.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import SUT AFTER mocks
import { renderDashboard } from '../renderDashboard';
import type { RenderDashboardInput } from '../buildFrameModel';

// Mock readline helpers used by renderDashboard
const H = vi.hoisted(() => ({
  cursorTo: vi.fn(),
  clearScreenDown: vi.fn(),
}));

vi.mock('node:readline', () => ({
  cursorTo: H.cursorTo,
  clearScreenDown: H.clearScreenDown,
}));

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

  // Two workers: one busy, one idle
  workerState.set(0, {
    file: '/data/a.csv',
    busy: true,
    lastLevel: 'ok',
    progress: { processed: 123 },
  });
  workerState.set(1, {
    file: null,
    busy: false,
    lastLevel: 'warn',
  });

  return {
    poolSize: 2,
    cpuCount: 8,
    filesTotal: 5,
    filesCompleted: 1,
    filesFailed: 0,
    workerState,
    final: false,
    throughput: { successSoFar: 123, r10s: 1.23, r60s: 4.56 },
    exportsDir: '/tmp/out',
    exportStatus: undefined,
    ...overrides,
  };
}

let writeSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  writeSpy = vi
    .spyOn(process.stdout, 'write')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation(() => true) as any;
  vi.clearAllMocks();
});

afterEach(() => {
  writeSpy.mockRestore();
  vi.restoreAllMocks();
});

describe('renderDashboard', () => {
  it('renders an initial frame (hides cursor, clears screen, prints content)', () => {
    const input = makeInput();

    renderDashboard(input);

    // Should hide cursor and clear screen for live updates
    expect(writeSpy).toHaveBeenCalledWith('\x1b[?25l');
    expect(H.cursorTo).toHaveBeenCalledWith(process.stdout, 0, 0);
    expect(H.clearScreenDown).toHaveBeenCalledWith(process.stdout);

    // Should print a frame containing header and both workers
    const calls = writeSpy.mock.calls.map((c) => String(c[0]));
    const bigOut = calls.join('');

    expect(bigOut).toContain('Chunk CSV — 1/5 done, failed 0');
    // r10s/r60s formatted to 1 decimal
    expect(bigOut).toContain('r10s 1.2');
    expect(bigOut).toContain('r60s 4.6');

    // Worker rows
    // w00 BUSY on /data/a.csv with rows=123
    expect(bigOut).toMatch(
      /w00: BUSY(?: \[WARN\])?\srows=123 — \/data\/a\.csv/,
    );
    // w01 IDLE with warn flag and rows=0
    expect(bigOut).toContain('w01: IDLE [WARN] rows=0');
  });

  it('skips redraw when frame is unchanged and final=false', () => {
    const input = makeInput();

    // First render — draws
    renderDashboard(input);

    // Reset spies to measure only the second render
    writeSpy.mockClear();
    H.cursorTo.mockClear();
    H.clearScreenDown.mockClear();

    // Second render with the same input — should NO-OP
    renderDashboard(input);

    expect(writeSpy).not.toHaveBeenCalled();
    expect(H.cursorTo).not.toHaveBeenCalled();
    expect(H.clearScreenDown).not.toHaveBeenCalled();
  });

  it('final render shows cursor and still prints the frame (no clear)', () => {
    const input = makeInput({ final: true });

    renderDashboard(input);

    // Should show cursor on final frame
    expect(writeSpy).toHaveBeenCalledWith('\x1b[?25h');

    // Should NOT clear screen on final frame
    expect(H.cursorTo).not.toHaveBeenCalled();
    expect(H.clearScreenDown).not.toHaveBeenCalled();

    // Should print a frame
    const calls = writeSpy.mock.calls.map((c) => String(c[0]));
    const bigOut = calls.join('');
    expect(bigOut).toContain('Chunk CSV — 1/5 done, failed 0');
  });
});
