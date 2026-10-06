const RETRY_MS = 2_000;
const MAX_FAST_RETRIES = 4;

/** Retry a failed read quickly. The slow interval is only the steady refresh. */
export function startChainPoll(read: () => Promise<void>, everyMs: number): () => void {
  let stopped = false;
  let generation = 0;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const run = () => {
    if (stopped) return;
    const request = ++generation;
    clearTimeout(retryTimer);
    void read()
      .then(() => {
        if (stopped || request !== generation) return;
        retries = 0;
      })
      .catch(() => {
        if (stopped || request !== generation || retries >= MAX_FAST_RETRIES) return;
        retries += 1;
        retryTimer = setTimeout(run, RETRY_MS);
      });
  };

  run();
  const interval = setInterval(() => {
    retries = 0;
    run();
  }, everyMs);

  return () => {
    stopped = true;
    clearInterval(interval);
    clearTimeout(retryTimer);
  };
}
