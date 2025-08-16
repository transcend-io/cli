import type { WorkerState } from './renderDashboard';
import type { ChildProcess } from 'node:child_process';

/**
 * Assign the next pending file to a worker.
 * Updates `workerState` for the dashboard and sends the IPC message.
 *
 * @param id - the worker ID
 * @param pending - the list of pending files
 * @param workers - the map of worker processes
 * @param workerState - the map of worker states
 * @param common - the common task options
 * @param repaint - the function to call to repaint the dashboard
 */
export function assignWorkToWorker<T>(
  id: number,
  pending: string[],
  workers: Map<number, ChildProcess>,
  workerState: Map<number, WorkerState>,
  common: T,
  repaint: () => void,
): void {
  const w = workers.get(id);
  if (!w) return;

  const filePath = pending.shift();
  if (!filePath) {
    // No work left; mark idle
    workerState.set(id, { busy: false, file: null, startedAt: null });
    repaint();
    return;
  }

  // Update dashboard state
  workerState.set(id, { busy: true, file: filePath, startedAt: Date.now() });
  repaint();

  // Send work item over IPC
  w.send?.({
    type: 'task',
    payload: {
      filePath,
      options: common,
    },
  });
}
