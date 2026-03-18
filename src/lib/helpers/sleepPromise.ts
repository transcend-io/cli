/**
 * Sleep in a promise
 *
 * @param sleepTime - The time to sleep in milliseconds.
 * @returns Resolves promise
 */
export function sleepPromise(sleepTime: number): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(sleepTime), sleepTime);
  });
}
