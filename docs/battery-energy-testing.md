# Testing, rollout and rollback: experimental battery energy counters

**This is a development-branch runbook, not a release announcement.**
The modified Homevolt app has **not** yet been validated on real Homey hardware.
Use a separate development/test setup first; do not replace a working
production installation merely because the unit tests pass.

## Prerequisites

- A compatible Node.js runtime, Homey CLI and Homey development environment.
- Permission to read a Homevolt's local API.
- A backup of Homey settings and a record of battery/energy device inclusion.
- Leave third-party/partner control (for example, Greenely) **unchanged**.
- Never commit passwords, tokens, IP addresses, QR codes, serials, or raw
  identifiable \`/ems.json\` logs.

This patch consumes the existing app's authenticated \`getStatus()\` data.
It does not open an additional HTTP connection or bypass the app's auth logic.

## Static and unit tests

At the repository root:

\`\`\`sh
npm ci
npm run test:energy
npm run lint
\`\`\`

The energy tests cover direction mapping, initial baseline, restarts, multiple
EMS entries, bad/missing values, counter rollback and unrealistic jumps.

**Important:** these tests use synthetic fixtures (some based on actual
observations). They are not proof that the patched app works on a production
Homey. Run and record CI/lint results rather than claiming them in advance.

## Code review checklist

- [ ] No changes to \`settings_local\`, \`target_power_mode\`, schedules,
      \`/console.json\` commands or partner/Greenely cloud control
- [ ] No new grid, solar or battery devices and no doubled Energy inclusion
- [ ] \`ems[].ems_aggregate.exported_kwh\` is mapped to **battery charged**
      (\`meter_power.imported\`)
- [ ] \`ems[].ems_aggregate.imported_kwh\` is mapped to **battery discharged**
      (\`meter_power.exported\`)
- [ ] \`ems_aggregate\` values are already **kWh**; no extra division by 1000
- [ ] Existing authenticated \`getStatus()\` path is reused
- [ ] Migration starts from existing Homey capability totals, not inverter
      lifetime meter readings
- [ ] \`data.aggregated\` is not added on top of \`data.ems\`
- [ ] Handling of missing values, rollback, spikes and multiple EMS is reviewed
- [ ] Code is reviewed against the latest upstream branch before proposing
      a pull request

## Isolated device acceptance

Use a spare Homey or isolated development instance first. A development app
may have the same app ID as the store installation: do not assume it is
safe to run in parallel on a production Homey. Removing/re-pairing a battery
may affect history and flows.

After checking the target Homey and CLI session, run:

\`\`\`sh
homey app run
\`\`\`

For each test, record before/after values with timezone and firmware/app
version. Compare *deltas* between matching timestamps, not raw lifetime totals.

| Scenario | Expected outcome |
| --- | --- |
| First valid read | New raw baseline; no historical kWh jump |
| Battery idle | No artificial charge/discharge increment |
| Real charging | Battery \`meter_power.imported\` increases |
| Real discharging | Battery \`meter_power.exported\` increases |
| Restart | Persisted totals resume without re-counting |
| Network unavailable | Existing energy totals do not decrease |
| API field missing | Invalid reading rejected |
| EMS counter reset / pack added | No large fake event; new baseline |
| Spike / fast power transition | Threshold behavior is inspected |
| Partner cloud controls battery | Control mode and schedules unchanged |

### Integration risks still open

- The Homey capability writes and device-store persistence are not a
  transaction. A crash between those steps may need reconciliation.
- The spike threshold is provisional. A skipped sample can lose valid energy.
- Multiple EMS entries are supported in code but not validated on a real
  multi-EMS installation.
- The physical metering boundary (including possible photovoltaic
  pass-through) needs independent confirmation.
- Power-sign mismatch warnings observed in historical monitoring have not
  been conclusively explained.

Resolve or explicitly accept these risks before publishing a stable release.

## Homey Energy acceptance

Run for at least **24–48 hours with both charging and discharging**, then:

1. Record the battery's Homey energy capability totals at the start/end.
2. Independently record \`ems_aggregate\` start/end counters.
3. Compare increments per direction; account for missing and reset intervals.
4. Check that other included grid/solar devices do not double-count.
5. Compare Homey grid exchange with the site's authoritative grid meter
   (if available); grid measurements are not a substitute for battery
   metering.
6. Confirm battery controls and Greenely remain unchanged.
7. Record any anomalies and whether the fix is accepted.

Avoid claiming that this patch backfills missing historical values.

## Rollback

1. Record Energy capability totals and logs before doing anything.
2. Stop the development app and restore the previously installed, stable
   Homevolt app through the supported Homey process.
3. Recheck battery availability, partner-control mode, schedules and flows.
4. Check meter history for discontinuities. Rolling back source code does
   **not** automatically revert historical Homey Energy data or clear
   device-store keys.
5. Do not delete/re-pair the battery solely to clear test state without
   assessing the consequences for Homey flows and historical data.

## Upstream contribution

Create a **draft PR within the fork** for review if desired. Before opening a
PR against \`lovethyresson/com.homevolt.local\`, check current upstream changes,
run tests, document observed firmware/version context, and disclose all
remaining limitations. Follow upstream \`CONTRIBUTING.md\` (small scope,
minimal unrelated changes, reproducible results). Do not claim upstream
approval or device acceptance that has not occurred.

Related: [design](battery-energy-counters.md) ·
[field evidence](battery-energy-validation.md).
