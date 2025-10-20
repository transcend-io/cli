/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join as pathJoin, dirname as pathDirname } from 'node:path';

// Now import the SUT
import { parquetToCsvOneFile } from '../parquetToCsvOneFile';

// Hoisted spies & fakes so the mock factories can close over them safely
const H = vi.hoisted(() => {
  // Logger spies
  const loggerSpies = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };

  // FS spies (we’ll bind implementations in beforeEach)
  const fsSpies = {
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    existsSync: vi.fn(),
  };

  // DuckDB fakes
  const resultDispose = vi.fn(async () => {
    // No-op
  });
  const mkResult = (): any => ({ dispose: resultDispose });

  // We’ll replace run behavior per-test; default: succeed for all SQL
  const connRun = vi.fn((): Promise<any> => mkResult());
  const connDispose = vi.fn(async () => {
    // No-op
  });
  const dbConnect = vi.fn((): any => ({
    run: connRun,
    dispose: connDispose,
  }));
  const dbDispose = vi.fn(async () => {
    // No-op
  });
  const duckCreate = vi.fn((): any => ({
    connect: dbConnect,
    dispose: dbDispose,
  }));

  // Helpers exposed to tests
  return {
    loggerSpies,
    fsSpies,
    duck: {
      create: duckCreate,
      dbConnect,
      dbDispose,
      connRun,
      connDispose,
      resultDispose,
      mkResult,
    },
  };
});

/** Mock fs BEFORE importing the SUT */
vi.mock('node:fs', () => ({
  mkdirSync: H.fsSpies.mkdirSync,
  rmSync: H.fsSpies.rmSync,
  existsSync: H.fsSpies.existsSync,
}));

/** Mock the SAME module id the SUT imports for logging */
vi.mock('../../../logger', () => ({
  logger: H.loggerSpies,
}));

/** Mock DuckDB API */
vi.mock('@duckdb/node-api', () => ({
  DuckDBInstance: {
    create: H.duck.create,
  },
}));

describe('parquetToCsvOneFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default fs behavior
    H.fsSpies.mkdirSync.mockImplementation(() => {
      // No-op
    });
    H.fsSpies.rmSync.mockImplementation(() => {
      // No-op
    });
    H.fsSpies.existsSync.mockImplementation(() => false);

    // Default DuckDB behavior set in hoisted fakes
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('creates output dir, runs PRAGMA + COPY, calls onProgress, and logs success', async () => {
    const filePath = '/data/some/path/input-file.parquet';
    const outputDir = '/tmp/out';
    const expectedOut = pathJoin(outputDir, 'input-file.csv');

    const onProgress = vi.fn();

    await parquetToCsvOneFile({
      filePath,
      outputDir,
      clearOutputDir: true,
      onProgress,
    });

    // Ensures output dir exists
    expect(H.fsSpies.mkdirSync).toHaveBeenCalledWith(outputDir, {
      recursive: true,
    });

    // No existing output by default
    expect(H.fsSpies.existsSync).toHaveBeenCalledWith(expectedOut);
    expect(H.fsSpies.rmSync).not.toHaveBeenCalled();

    // DuckDB create/connect called
    expect(H.duck.create).toHaveBeenCalledWith(':memory:');
    expect(H.duck.dbConnect).toHaveBeenCalled();

    // We expect first call to be PRAGMA (ignore errors) and then the COPY
    const calls = H.duck.connRun.mock.calls.map((c: any) => String(c[0]));
    expect(
      calls.some((sql) => /PRAGMA\s+temp_directory\s*=\s*''/i.test(sql)),
    ).toBe(true);

    const copyCall = calls.find((sql) => /COPY\s*\(/i.test(sql));
    expect(copyCall).toBeTruthy();
    // Paths are quoted with single-quotes and single-quotes in paths are escaped
    expect(copyCall).toContain(
      `read_parquet('${filePath.replace(/'/g, "''")}')`,
    );
    expect(copyCall).toContain(`TO '${expectedOut.replace(/'/g, "''")}'`);
    // CSV options enforced
    expect(copyCall).toMatch(/HEADER/i);
    expect(copyCall).toMatch(/DELIMITER\s+','/i);
    expect(copyCall).toMatch(/QUOTE\s+'"'/i);
    expect(copyCall).toMatch(/ESCAPE\s+'"'/i);
    expect(copyCall).toMatch(/NULL\s+''/i);

    // onProgress best-effort final callback
    expect(onProgress).toHaveBeenCalledWith(0, undefined);

    // Success log
    expect(H.loggerSpies.info).toHaveBeenCalled();
    const infoMsg = String(H.loggerSpies.info.mock.calls[0][0]);
    expect(infoMsg).toContain(expectedOut);

    // Resource disposal: result (for PRAGMA+COPY), connection, db
    // We expect at least one result disposal (COPY). PRAGMA may or may not produce a result across versions.
    expect(H.duck.resultDispose).toHaveBeenCalled();
    expect(H.duck.connDispose).toHaveBeenCalled();
    expect(H.duck.dbDispose).toHaveBeenCalled();
  });

  it('removes existing output when clearOutputDir is true', async () => {
    const filePath = '/data/input.parquet';
    const outDir = '/data/out';
    const outCsv = pathJoin(outDir, 'input.csv');

    H.fsSpies.existsSync.mockImplementation((p: string) => p === outCsv);

    await parquetToCsvOneFile({
      filePath,
      outputDir: outDir,
      clearOutputDir: true,
    });

    expect(H.fsSpies.existsSync).toHaveBeenCalledWith(outCsv);
    expect(H.fsSpies.rmSync).toHaveBeenCalledWith(outCsv, { force: true });
  });

  it('logs a warning if removing the existing output fails', async () => {
    const filePath = '/data/input.parquet';
    const outDir = '/data/out';
    const outCsv = pathJoin(outDir, 'input.csv');

    H.fsSpies.existsSync.mockReturnValue(true);
    H.fsSpies.rmSync.mockImplementation(() => {
      throw new Error('perm denied');
    });

    await parquetToCsvOneFile({
      filePath,
      outputDir: outDir,
      clearOutputDir: true,
    });

    expect(H.loggerSpies.warn).toHaveBeenCalled();
    const warnMsg = String(H.loggerSpies.warn.mock.calls[0][0]);
    expect(warnMsg).toContain(outCsv);
    expect(warnMsg).toContain('perm denied');
  });

  it('uses dirname(filePath) when outputDir is omitted', async () => {
    const filePath = '/var/data/in.parquet';
    const inferredDir = pathDirname(filePath);
    const expectedOut = pathJoin(inferredDir, 'in.csv');

    await parquetToCsvOneFile({
      filePath,
      clearOutputDir: false,
    });

    // mkdirSync called on inferred dir
    expect(H.fsSpies.mkdirSync).toHaveBeenCalledWith(inferredDir, {
      recursive: true,
    });

    // COPY targets inferred path
    const copyCall = H.duck.connRun.mock.calls
      .map((c: any) => String(c[0]))
      .find((sql) => /COPY\s*\(/i.test(sql));
    expect(copyCall).toContain(`TO '${expectedOut.replace(/'/g, "''")}'`);
  });

  it('continues when PRAGMA temp_directory fails (runIgnoreError path)', async () => {
    // Make conn.run throw whenever the SQL includes PRAGMA; succeed otherwise
    H.duck.connRun.mockImplementationOnce(((sql: string) => {
      if (/PRAGMA/i.test(sql)) throw new Error('unsupported pragma');
      return H.duck.mkResult();
    }) as any);

    const filePath = '/data/abc.parquet';
    const outDir = '/out';

    await parquetToCsvOneFile({
      filePath,
      outputDir: outDir,
      clearOutputDir: false,
    });

    // Should still run COPY successfully
    const calls = H.duck.connRun.mock.calls.map((c: any) => String(c[0]));
    expect(calls.some((sql) => /COPY\s*\(/i.test(sql))).toBe(true);
    expect(H.loggerSpies.info).toHaveBeenCalled(); // Success path reached
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
