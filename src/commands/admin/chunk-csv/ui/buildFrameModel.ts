/**
 * Input shape for rendering the dashboard and building the frame model.
 *
 * This represents a snapshot of the current state of the worker pool,
 * file progress, and throughput statistics.
 */
export type RenderDashboardInput = {
  /** Number of worker processes available in the pool. */
  poolSize: number;
  /** Number of CPU cores detected on the host machine. */
  cpuCount: number;
  /** Total number of files scheduled for processing. */
  filesTotal: number;
  /** Number of files successfully completed so far. */
  filesCompleted: number;
  /** Number of files that have failed processing. */
  filesFailed: number;
  /**
   * Current state of each worker in the pool.
   * - Key: worker ID
   * - Value: status for that worker
   */
  workerState: Map<
    number,
    {
      /** The file currently assigned to this worker, or null if idle. */
      file: string | null;
      /** Whether the worker is actively processing a file. */
      busy: boolean;
      /** The last log level seen for this worker (used for status coloring). */
      lastLevel: 'ok' | 'warn' | 'error';
      /**
       * Progress details if the worker is processing a file.
       * - `processed`: rows processed so far
       * - `total`: optional total rows if known
       */
      progress?: { processed: number; total?: number };
    }
  >;
  /** True if this is the final render after all processing is complete. */
  final: boolean;
  /**
   * Throughput metrics:
   * - `successSoFar`: total rows successfully processed across all workers
   * - `r10s`: rolling rows/sec average over the last 10s
   * - `r60s`: rolling rows/sec average over the last 60s
   */
  throughput: { successSoFar: number; r10s: number; r60s: number };
  /** Optional directory where export artifacts are being written. */
  exportsDir?: string;
  /** Optional object containing export status details for the dashboard. */
  exportStatus?: unknown;
};

/**
 * Normalized structure returned by `buildFrameModel`.
 * This includes all original input fields plus a `workers` array
 * derived from the `workerState` map.
 */
export type FrameModel = RenderDashboardInput & {
  workers: Array<{
    /** Worker ID (key from workerState map). */
    id: number;
    /** File currently being processed, or null if idle. */
    file: string | null;
    /** Whether the worker is actively processing a file. */
    busy: boolean;
    /** Last reported log level for this worker. */
    level: 'ok' | 'warn' | 'error';
    /** Number of rows processed so far. */
    processed: number;
    /** Total rows expected, if known. */
    total?: number;
  }>;
};

/**
 * Build a normalized "frame model" for dashboard rendering.
 *
 * This transforms the raw `RenderDashboardInput` into a structure that includes
 * a derived `workers` array for easy iteration in UI components.
 *
 * @param input - The current snapshot of dashboard state.
 * @returns A `FrameModel` containing the normalized dashboard data.
 */
export function buildFrameModel(input: RenderDashboardInput): FrameModel {
  // Flatten workerState map into an array of worker summaries.
  const workers = [...input.workerState.entries()].map(([id, st]) => ({
    id,
    file: st.file,
    busy: st.busy,
    level: st.lastLevel,
    processed: st.progress?.processed ?? 0,
    total: st.progress?.total,
  }));

  return { ...input, workers };
}
