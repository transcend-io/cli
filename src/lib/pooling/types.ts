import type { ObjByString } from '@transcend-io/type-utils';

/** Minimal per-slot state the runner keeps */
export type PoolLevel = 'ok' | 'warn' | 'error';

export interface SlotState<TProg extends ObjByString> {
  /** True if the worker is currently processing a task  */
  busy: boolean;
  /** The file being processed by the worker */
  file: string | null;
  /** Timestamp when the worker started processing the task */
  startedAt: number | null;
  /** Current log level of the worker */
  lastLevel: PoolLevel;
  /** Progress */
  progress?: TProg;
}

/** Message sent by a worker indicating it is ready to receive tasks. */
export type WorkerReady = {
  /** Type ready */
  type: 'ready';
};

/** Message sent by a worker with a progress payload. */
export type WorkerProgress<TProg> = {
  /** Discriminant. */
  type: 'progress';
  /** Implementation-defined progress payload. */
  payload: TProg;
};

/** Message sent by a worker with a final result payload for a single unit. */
export type WorkerResult<TRes> = {
  /** Discriminant. */
  type: 'result';
  /** Implementation-defined result payload. */
  payload: TRes;
};

/** Union of all Worker → Parent messages. */
export type FromWorker<TProg, TRes> =
  | WorkerReady
  | WorkerProgress<TProg>
  | WorkerResult<TRes>;

/**
 * Message sent by the parent to a worker to signal shutdown.
 */
export type ShutdownEvent = {
  /** Shutdown */
  type: 'shutdown';
};

/**
 * Message sent by the parent to a worker to assign a task.
 */
export type TaskEvent<TTask> = {
  /** Task */
  type: 'task';
  /** Payload */
  payload: TTask;
};

/** Messages the parent can send to a worker. */
export type ToWorker<TTask> = ShutdownEvent | TaskEvent<TTask>;
