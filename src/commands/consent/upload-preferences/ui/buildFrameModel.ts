// ui/frameModel.ts
import type { ExportStatusMap, WorkerState } from '../../../../lib/pooling';

export type UploadModeTotals = {
  /** The mode of the export, always 'upload' */
  mode: 'upload';
  /** Number of records successfully uploaded */
  success: number;
  /** Number of records skipped */
  skipped: number;
  /** Number of records failed */
  error: number;
  /** Number of records that were not processed */
  errors: Record<string, number>;
};

export type CheckModeTotals = {
  /** The mode of the export, always 'check' */
  mode: 'check';
  /** Number of records pending */
  pendingConflicts: number;
  /** Number of records pending safe */
  pendingSafe: number;
  /** Number of records pending */
  totalPending: number;
  /** Number of records skipped */
  skipped: number;
};

/**
 * Type guard for UploadModeTotals
 *
 * @param totals - The totals object to check
 * @returns True if the totals object is of type UploadModeTotals, false otherwise
 */
export function isUploadModeTotals(
  totals: unknown,
): totals is UploadModeTotals {
  return (
    typeof totals === 'object' &&
    totals !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (totals as any).mode === 'upload'
  );
}

/**
 * Type guard for CheckModeTotals
 *
 * @param totals - The totals object to check
 * @returns True if the totals object is of type CheckModeTotals, false otherwise
 */
export function isCheckModeTotals(totals: unknown): totals is CheckModeTotals {
  return (
    typeof totals === 'object' &&
    totals !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (totals as any).mode === 'check'
  );
}

/**
 * Represents the totals for either upload or check mode.
 */
export type AnyTotals = UploadModeTotals | CheckModeTotals;

export interface RenderDashboardInput {
  /** The size of the worker pool */
  poolSize: number;
  /** The number of CPU cores available */
  cpuCount: number;
  /** Total number of files to process */
  filesTotal: number;
  /** Number of files that have been completed */
  filesCompleted: number;
  /** Number of files that have failed */
  filesFailed: number;
  /** Map of worker ID to WorkerState */
  workerState: Map<number, WorkerState>;
  /** Totals for the current operation */
  totals?: AnyTotals;
  /** Throughput statistics */
  throughput?: { successSoFar: number; r10s: number; r60s: number };
  /** Whether this is the final render (e.g., for a summary) */
  final?: boolean;
  /** Directory where export artifacts are stored */
  exportsDir?: string;
  /** Status of the export artifacts */
  exportStatus?: ExportStatusMap;
}

export type FrameModel = {
  /** The input parameters for the dashboard */
  input: RenderDashboardInput;
  /** Number of workers currently processing files */
  inProgress: number;
  /** Total number of files that have been completed */
  completedFiles: number;
  /** Percentage of completion */
  pct: number;
  /** Estimated total jobs to be processed */
  estTotalJobs?: number;
  /** Estimated time of arrival text */
  etaText: string;
};

/**
 * Builds the frame model for the dashboard.
 * This function calculates various statistics based on the input parameters
 * and returns a FrameModel object that can be used to render the dashboard.
 *
 *
 * @param input - The input parameters for the dashboard.
 * @returns The frame model for the dashboard.
 */
export function buildFrameModel(input: RenderDashboardInput): FrameModel {
  const {
    filesTotal,
    filesCompleted,
    filesFailed,
    workerState,
    totals,
    throughput,
  } = input;

  const inProgress = [...workerState.values()].filter((s) => s.busy).length;
  const completedFiles = filesCompleted + filesFailed;
  const pct =
    filesTotal === 0
      ? 100
      : Math.floor((completedFiles / Math.max(1, filesTotal)) * 100);

  // receipts-based estimation
  const jobsFromReceipts =
    totals && totals.mode === 'upload'
      ? (totals as UploadModeTotals).success +
        (totals as UploadModeTotals).skipped +
        (totals as UploadModeTotals).error
      : undefined;

  const inflightJobsKnown = [...workerState.values()].reduce((sum, s) => {
    const t = s.progress?.total ?? 0;
    return sum + (t > 0 && s.busy ? t : 0);
  }, 0);

  const avgJobsPerCompletedFile =
    jobsFromReceipts !== undefined && completedFiles > 0
      ? jobsFromReceipts / completedFiles
      : undefined;

  const remainingFiles = Math.max(filesTotal - completedFiles - inProgress, 0);

  let estTotalJobs: number | undefined;
  if (avgJobsPerCompletedFile !== undefined) {
    estTotalJobs =
      (jobsFromReceipts ?? 0) +
      inflightJobsKnown +
      remainingFiles * avgJobsPerCompletedFile;
  } else if (inProgress > 0) {
    const avgInFlight =
      inflightJobsKnown > 0 ? inflightJobsKnown / inProgress : 0;
    if (avgInFlight > 0) {
      estTotalJobs = inflightJobsKnown + remainingFiles * avgInFlight;
    }
  }

  // ETA
  let etaText = '';
  if (throughput && estTotalJobs !== undefined) {
    // Prefer receipts totals; fall back to throughput.successSoFar if not available
    const processedSoFar =
      jobsFromReceipts !== undefined
        ? jobsFromReceipts
        : throughput.successSoFar;

    const remainingJobs = Math.max(estTotalJobs - processedSoFar, 0);

    // Pick stable per-second rate
    const ratePerSec = throughput.r60s > 0 ? throughput.r60s : throughput.r10s;
    const ratePerHour = ratePerSec * 3600;

    if (ratePerHour > 0 && remainingJobs > 0) {
      // Formula: (estTotalJobs - (success + skipped + error)) / throughput per hour
      const hoursLeft = remainingJobs / ratePerHour;
      const secondsLeft = Math.max(1, Math.round(hoursLeft * 3600));
      const eta = new Date(Date.now() + secondsLeft * 1000);

      const days = Math.floor(secondsLeft / 86400); // 24 * 3600
      const hours = Math.floor((secondsLeft % 86400) / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;

      let timeLeft = '';
      if (days > 0) {
        timeLeft = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        timeLeft = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeLeft = `${minutes}m ${seconds}s`;
      } else {
        timeLeft = `${seconds}s`;
      }

      etaText = `Expected completion: ${eta.toLocaleString()} (${timeLeft} left)`;
    }
  }

  return {
    input,
    inProgress,
    completedFiles,
    pct,
    estTotalJobs,
    etaText,
  };
}
