/**
 * Replace bluebird's mapSeries with a simple for loop
 *
 * @param array - The array to iterate over
 * @param iterator - The iterator function that receives (item, index)
 * @returns The results of the iterator function
 */
export async function mapSeries<R, U>(
  array: R[],
  iterator: (item: R, index: number, arrayLength: number) => Promise<U>
): Promise<U[]> {
  const results = [];
  for (let index = 0; index < array.length; index += 1) {
    results.push(await iterator(array[index], index, array.length));
  }
  return results;
}

/**
 * Replace bluebird's map with Promise.all
 *
 * @param array - The array to iterate over
 * @param iterator - The iterator function that receives (item, index, arrayLength)
 * @param options - Options
 * @returns The results of the iterator function
 */
export async function map<R, U>(
  array: R[],
  iterator: (item: R, index: number, arrayLength: number) => Promise<U>,
  options: {
    /** Concurrency level for the Promise.all call */
    concurrency?: number;
  } = {}
): Promise<U[]> {
  const { concurrency = Infinity } = options;
  const results: U[] = Array.from({ length: array.length });
  const executing: Promise<void>[] = [];
  let nextIndex = 0;

  const executeNext = async (): Promise<void> => {
    if (nextIndex >= array.length) return;

    const currentIndex = nextIndex;
    nextIndex += 1;

    const promise = iterator(
      array[currentIndex],
      currentIndex,
      array.length
    ).then((result) => {
      results[currentIndex] = result;
    });

    executing.push(promise);
    await promise;

    // Remove the completed promise from executing array
    const index = executing.indexOf(promise);
    if (index !== -1) {
      executing.splice(index, 1);
    }
  };

  // Start initial batch of promises up to concurrency limit
  const initialBatch = Math.min(concurrency, array.length);
  const initialPromises = [];
  for (let index = 0; index < initialBatch; index += 1) {
    initialPromises.push(executeNext());
  }

  // Wait for initial batch to start
  await Promise.all(initialPromises);

  // Continue executing remaining items as slots become available
  while (nextIndex < array.length) {
    if (executing.length < concurrency) {
      await executeNext();
    } else {
      // Wait for any promise to complete before continuing
      await Promise.race(executing);
    }
  }

  // Wait for all remaining promises to complete
  await Promise.all(executing);

  return results;
}
