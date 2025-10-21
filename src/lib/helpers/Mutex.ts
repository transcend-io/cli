/** Micro mutex to serialize flushes (prevents interleaved progress updates) */
export class Mutex {
  private locked = false;

  /**
   * Run function within mutex
   *
   * @param fn - Function
   * @returns Result
   */
  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    while (this.locked) {
      // yield to microtask queue
      await Promise.resolve();
    }
    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
    }
  }
}
