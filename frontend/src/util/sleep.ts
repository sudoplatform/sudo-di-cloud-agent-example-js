/**
 * Wait for a given length of time before continuing the current thread.
 *
 * @param ms Milliseconds to wait (1000 milliseconds = 1 second)
 */
export async function sleep(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}
