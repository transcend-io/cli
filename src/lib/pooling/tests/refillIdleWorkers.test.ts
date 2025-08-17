import { describe, it, expect } from 'vitest';
import type { ChildProcess } from 'node:child_process';

import { refillIdleWorkers, type WorkerMaps } from '../workerAssignment';

/**
 * Build WorkerMaps for refill tests.
 *
 * @param workerIds - ids to include in `maps.workers` (iteration order matters)
 * @param busySet - set of ids that should be marked busy
 * @returns initialized worker maps with given busy/idle states
 */
function buildMaps(
  workerIds: number[],
  busySet = new Set<number>(),
): WorkerMaps {
  const workers = new Map<number, ChildProcess>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerState = new Map<number, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slotLogPaths = new Map<number, any>();

  for (const id of workerIds) {
    // minimal child
    workers.set(id, {} as unknown as ChildProcess);
    // if not present in map, treated as idle; here we set all explicitly
    workerState.set(id, {
      busy: busySet.has(id),
      file: busySet.has(id) ? `/f-${id}.csv` : null,
      startedAt: busySet.has(id) ? 123 : null,
      lastLevel: 'ok',
      progress: undefined,
    });
  }

  return {
    workers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workerState: workerState as unknown as Map<number, any>,
    slotLogPaths,
  } as unknown as WorkerMaps;
}

/**
 * Create an assign spy that also simulates dequeuing work:
 *
 * @param queue - the shared files queue to mutate
 * @returns assign(id) that shifts from queue and records call order
 */
function makeAssign(queue: string[]): {
  /**
   * Assign work to `id` and simulate dequeuing from the shared queue.
   *
   * @param id - worker id to assign
   */
  assign(id: number): void;
  /**
   * Retrieve the call order.
   *
   * @returns array of ids in the order `assign` was invoked
   */
  getCalls(): number[];
} {
  const calls: number[] = [];
  return {
    /**
     * Assign work to `id` and simulate dequeuing from the shared queue.
     *
     * @param id - worker id to assign
     */
    assign(id: number) {
      calls.push(id);
      queue.shift();
    },
    /**
     * Retrieve the call order.
     *
     * @returns array of ids in the order `assign` was invoked
     */
    getCalls(): number[] {
      return calls.slice();
    },
  };
}

describe('refillIdleWorkers', () => {
  it('assigns only idle workers until the queue is empty (respects iteration order)', () => {
    const filesQueue = ['a', 'b'];
    const maps = buildMaps([1, 2, 3, 4], new Set([2])); // 1 idle, 2 busy, 3 idle, 4 idle
    const { assign, getCalls } = makeAssign(filesQueue);

    refillIdleWorkers(filesQueue, maps, assign);

    // Two items → two assignments, to the first two idle workers in order: 1 then 3
    expect(getCalls()).toEqual([1, 3]);
    expect(filesQueue).toEqual([]); // both consumed by our assign stub
  });

  it('does nothing when all workers are busy', () => {
    const filesQueue = ['a', 'b', 'c'];
    const maps = buildMaps([1, 2], new Set([1, 2]));
    const { assign, getCalls } = makeAssign(filesQueue);

    refillIdleWorkers(filesQueue, maps, assign);

    expect(getCalls()).toEqual([]);
    expect(filesQueue).toEqual(['a', 'b', 'c']);
  });

  it('treats missing state as idle and assigns if there is work', () => {
    const filesQueue = ['x'];
    const maps = buildMaps([10], new Set());
    // Remove state to simulate "undefined" → treated as idle
    maps.workerState.delete(10);

    const { assign, getCalls } = makeAssign(filesQueue);
    refillIdleWorkers(filesQueue, maps, assign);

    expect(getCalls()).toEqual([10]);
    expect(filesQueue).toEqual([]); // consumed
  });

  it('breaks early when the queue becomes empty during iteration', () => {
    const filesQueue = ['only-one'];
    const maps = buildMaps([1, 2, 3], new Set()); // all idle
    const { assign, getCalls } = makeAssign(filesQueue);

    refillIdleWorkers(filesQueue, maps, assign);

    // Only one assignment should occur because our stub depletes the queue
    expect(getCalls()).toEqual([1]);
    expect(filesQueue).toEqual([]);
  });
});
