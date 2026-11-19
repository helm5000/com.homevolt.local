# Battery energy reliability review — 19 November 2026

> **Development status:** the code changes described here are committed to
> `fix/homevolt-energy-counters`. They have not been installed on the user's
> Homey Pro or validated against real battery operation. A green CI run is not
> equivalent to hardware acceptance.

## Primary risk discovered: overlapping asynchronous polls

The pre-existing battery driver ran `setInterval(async () => fetchData(), ...)`.
A slow Homevolt response could remain in progress when the next tick began.
Because the proposed energy fix reads a per-device baseline from the Homey
store, calculates an absolute energy total, then writes two Homey capabilities
and persists the new baseline, two overlapping polls could read the same
older state and persist out of order.

**Change:** `fetchData()` now uses
[`runSingleFlight`](../lib/async-single-flight.js). A second invocation is
skipped if the previous invocation has not completed; the subsequent timer
will read the current cumulative EMS counters and calculate their delta.
The lock is cleared in `finally`, even if a request rejects.

This guard covers both the initial `onInit` read and periodic polling without
changing Greenely/partner control, target power or schedule commands.
Existing `onDeleted` cleanup still clears the polling interval.

## Other failure modes and current mitigation

| Failure case | Current behavior | Validation status |
| --- | --- | --- |
| One API request overlaps the next | Second fetch is skipped by a per-device lock | Synthetic async test, not hardware test |
| Request or parser temporarily fails | Does not advance the raw baseline; next valid cumulative reading can include the gap | Unit test |
| Initial device migration | Uses raw EMS counters as baseline; retains current Homey cumulative totals; no historical life-to-date jump | Unit test |
| Homey capability update partly fails, store not yet committed | A retry calculates **absolute target totals** from the previous stored baseline, avoiding addition of the same delta twice in the pure state calculation | Unit test of state calculation; integration transaction untested |
| Device app restarts after state persisted | New polls read device-local store and advance from last recorded raw counters | Unit test of state calculation; actual persistence untested |
| EMS resets counters or number of EMS changes | Rebaseline, not a large fake energy update | Unit test |
| Unrealistically large counter jump | Rebaseline and skip that interval's accumulated energy | Unit test |
| Battery removed during in-flight fetch | Timer is cleared in `onDeleted`, but an existing async call might finish afterward | **Open risk — test before rollout** |
| Homey write succeeds but persistence fails/crashes | A later retry should recompute absolute values; cannot guarantee capability/store atomicity | **Open risk — test before rollout** |
| Homey capability values are externally reset while store state remains | Possible discontinuity when next absolute value is published | **Open risk — define recovery policy** |
| Long offline interval, large physical energy throughput | Heuristic plausibility threshold may discard legitimate energy | **Open risk — test realistic VPP bursts** |

The present algorithm favors avoiding **false historical spikes** over
recovering every watt-hour after a suspected reset or implausible counter jump.
This is a deliberate but imperfect trade-off; quantify any lost intervals.

## Test coverage

The energy unit test suite now includes **13 test cases**, including four
additional reliability cases for network gaps, a failed-write/retry scenario,
single-flight concurrency, and lock release on failure.

Run:

```sh
npm ci
npm run test:energy
npm run lint:energy
node --check drivers/homevolt-battery/device.js
```

The full inherited project-wide ESLint command is not clean because of
unrelated upstream style findings. A separate inventory and triage exists
in this fork's `chore/eslint-audit` branch.

## Mandatory checks before production Homey testing

1. Confirm CI is green for the final branch commit.
2. Review the code diff against latest upstream `main`, including app auth
   and the existing `setInterval` lifecycle.
3. Test a real restart while the battery is **idle**, then across charge and
   discharge cycles.
4. Simulate failed `setCapabilityValue` and `setStoreValue` calls with a
   Homey SDK device mock. Verify both directions do not double-count,
   diverge or decrease.
5. Simulate a slow local API response that crosses multiple timer periods,
   and device deletion while a request remains active.
6. Confirm the EMS `imported_kwh` and `exported_kwh` semantics and physical
   meter boundary for the target installation.
7. Run at least 24–48 h on a controlled development instance, compare
   start/end deltas with `/ems.json`, and verify Homey Energy sources do not
   double-count grid/solar/battery.
8. Verify that Greenely's partner-control mode, setpoints and actual battery
   schedules remain unchanged before and after testing.

No upstream PR, Homey installation or Greenely setting change should occur
until these checks are reviewed.

Related documents:
[energy mapping](battery-energy-counters.md),
[field observations](battery-energy-validation.md),
[test and rollback runbook](battery-energy-testing.md).
