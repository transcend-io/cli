import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';
import type { RenderDashboardInput } from '../buildFrameModel';

const H = vi.hoisted(() => ({
  cursorTo: vi.fn(),
  clearScreenDown: vi.fn(),
  writeIndex: vi.fn(),
}));

/* ---- Mocks must be registered before importing the SUT ---- */
vi.mock('node:readline', () => ({
  cursorTo: H.cursorTo,
  clearScreenDown: H.clearScreenDown,
}));

vi.mock('../buildFrameModel', () => ({
  buildFrameModel: vi.fn((input) => ({
    input,
    inProgress: 0,
    pct: 0,
    etaText: '',
    estTotalJobs: undefined,
  })),
}));

vi.mock('../headerLines', () => ({
  headerLines: vi.fn(() => ['H1', 'H2']),
  workerLines: vi.fn(() => ['W1', 'W2']),
  hotkeysLine: vi.fn(() => 'HOT'),
  exportBlock: vi.fn(() => 'EXP'),
}));

vi.mock('../../artifacts/writeExportsIndex', () => ({
  writeExportsIndex: H.writeIndex,
}));

const expectedFrame = ['H1', 'H2', '', 'W1', 'W2', '', 'HOT', '', 'EXP'].join(
  '\n',
);

describe('renderDashboard', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let renderDashboard: (input: RenderDashboardInput) => void;

  beforeAll(async () => {
    // Ensure no previous module instance leaks
    await vi.resetModules();
    // Give the writeIndex stub a do-nothing return
    H.writeIndex.mockReturnValue(undefined as unknown as string);
    // Dynamically import SUT AFTER mocks are in place
    ({ renderDashboard } = await import('../renderDashboard'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    writeSpy = vi
      .spyOn(process.stdout, 'write')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => true) as any;
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('non-final render: writes exports index, hides cursor, clears screen, prints frame; skips redraw for identical frame', () => {
    const input: RenderDashboardInput = {
      poolSize: 2,
      final: false,
      exportsDir: '/exp',
      exportStatus: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    renderDashboard(input);

    expect(H.writeIndex).toHaveBeenCalledWith('/exp', {});

    expect(writeSpy).toHaveBeenCalledWith('\x1b[?25l');
    expect(H.cursorTo).toHaveBeenCalledWith(process.stdout, 0, 0);
    expect(H.clearScreenDown).toHaveBeenCalledWith(process.stdout);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writes = writeSpy.mock.calls.map((c: any) => String(c[0]));
    expect(writes).toContain(`${expectedFrame}\n`);

    const beforeCalls = writeSpy.mock.calls.length;
    renderDashboard(input);
    expect(H.writeIndex).toHaveBeenCalledTimes(2);
    expect(writeSpy.mock.calls.length).toBe(beforeCalls); // no additional writes
  });

  it('final render: writes exports index, shows cursor, prints frame, and does not move/clear the screen', () => {
    const input = {
      poolSize: 2,
      final: true,
      exportsDir: '/exp',
      exportStatus: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    renderDashboard(input);

    expect(H.writeIndex).toHaveBeenCalledWith('/exp', {});

    expect(writeSpy).toHaveBeenCalledWith('\x1b[?25h');
    expect(H.cursorTo).not.toHaveBeenCalled();
    expect(H.clearScreenDown).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writes = writeSpy.mock.calls.map((c: any) => String(c[0]));
    expect(writes).toContain(`${expectedFrame}\n`);
  });
});
