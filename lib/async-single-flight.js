'use strict';

/**
 * Run at most one in-flight asynchronous task per owner and key.
 *
 * A skipped timer tick does not queue a stale API response. Homevolt's
 * cumulative energy counters are sampled again on the next scheduled tick,
 * so the intervening delta can still be measured without racing device-store
 * and Homey capability writes. This does not alter battery control commands.
 */
async function runSingleFlight(owner, key, task) {
  if (owner[key]) return false;
  owner[key] = true;
  try {
    await task();
    return true;
  } finally {
    owner[key] = false;
  }
}

module.exports = { runSingleFlight };
