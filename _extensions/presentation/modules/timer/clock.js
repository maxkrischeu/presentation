/* Elapsed time uses a monotonic clock, including delayed background ticks. */
Presentation.factories.activityClock = function (duration, now = () => performance.now()) {
  let elapsed = 0, since = null;
  const read = () => Math.min(duration, elapsed + (since === null ? 0 : Math.max(0, now() - since)));
  return {
    read,
    running: () => since !== null,
    start() { if (since === null && elapsed < duration) since = now(); },
    pause() { elapsed = read(); since = null; },
    reset() { elapsed = 0; since = null; },
    restore(value) { elapsed = Number.isFinite(value) ? Math.max(0, Math.min(duration, value)) : 0; since = null; },
  };
};
