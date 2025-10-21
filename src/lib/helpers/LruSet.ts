/**
 * A simple LRU set implementation
 */
export class LruSet {
  private map = new Map<string, void>();

  /**
   * Creates an LRU set with the given capacity.
   *
   * @param capacity - Maximum number of items to hold
   */
  constructor(private capacity: number) {}

  /**
   * Checks if the set contains the given key.
   *
   * @param k - Key to check
   * @returns True if the key exists, false otherwise
   */
  has(k: string): boolean {
    return this.map.has(k);
  }

  /**
   * Adds a key to the set, updating its recency.
   *
   * @param k - Key to add
   */
  add(k: string): void {
    if (this.map.has(k)) {
      this.map.delete(k);
      this.map.set(k, undefined);
      return;
    }
    this.map.set(k, undefined);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
  }
}
