/* eslint-disable @typescript-eslint/no-explicit-any */
/** Result message from child → parent */
export interface WorkerResultMessage {
  /** Result type from child → parent */
  type: 'result';
  /** Payload */
  payload: {
    /** Whether the task was successful */
    ok: boolean;
    /** Filepath processed */
    filePath: string;
    /** Error message */
    error?: string;
    /** Optional receipts path, if child provided it */
    receiptFilepath?: string;
  };
}

/** Ready sentinel from child → parent */
export interface WorkerReadyMessage {
  /** Ready message */
  type: 'ready';
}

/** Live progress from child → parent (for per-worker bars & throughput) */
export interface WorkerProgressMessage {
  /** Progress message */
  type: 'progress';
  /** Payload */
  payload: {
    /** File processed */
    filePath: string;
    /** how many just succeeded in this tick */
    successDelta: number;
    /** cumulative successes for the current file */
    successTotal: number;
    /** total planned records for the current file */
    fileTotal: number;
  };
}

/** Union of all worker IPC messages */
export type WorkerMessage =
  | WorkerResultMessage
  | WorkerReadyMessage
  | WorkerProgressMessage;

/**
 * Check if the message is a WorkerReadyMessage.
 *
 * @param msg - Message to check
 * @returns True if the message is a WorkerReadyMessage
 */
export function isWorkerReadyMessage(msg: unknown): msg is WorkerReadyMessage {
  return !!msg && typeof msg === 'object' && (msg as any).type === 'ready';
}

/**
 * Check if the message is a WorkerProgressMessage.
 *
 * @param msg - Message to check
 * @returns True if the message is a WorkerProgressMessage
 */
export function isWorkerProgressMessage(
  msg: unknown,
): msg is WorkerProgressMessage {
  return (
    !!msg &&
    typeof msg === 'object' &&
    (msg as any).type === 'progress' &&
    typeof (msg as any).payload?.filePath === 'string'
  );
}

/**
 * Check if the message is a WorkerResultMessage.
 *
 * @param msg - Message to check
 * @returns True if the message is a WorkerResultMessage
 */
export function isWorkerResultMessage(
  msg: unknown,
): msg is WorkerResultMessage {
  return (
    !!msg &&
    typeof msg === 'object' &&
    (msg as any).type === 'result' &&
    typeof (msg as any).payload?.filePath === 'string' &&
    typeof (msg as any).payload?.ok === 'boolean'
  );
}

/** Shape of the optional throughput callback */
export type ProgressInfo = {
  /** ID of the worker */
  workerId: number;
  /** File path */
  filePath: string;
  /** Number of success updates */
  successDelta: number;
  /** Total number of success */
  successTotal: number;
  /** Total number of items being processed */
  fileTotal: number;
};
/* eslint-enable @typescript-eslint/no-explicit-any */
