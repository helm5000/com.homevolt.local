# Battery energy counters: experimental correction

> **Status: proposed change in a personal fork, not an upstream Homevolt release.**
> The change has **not** been validated in a modified Homey app on real hardware.
> It does not alter battery scheduling, cloud/partner control, or the Homevolt firmware.

## Why this exists

On a Homevolt unit observed in November 2026, the original Homey battery driver
[`drivers/homevolt-battery/device.js`](../drivers/homevolt-battery/device.js)
used `ems[0].ems_data.energy_consumed` and `energy_produced` (Wh) for
`meter_power.imported` and `meter_power.exported`. Both remained at zero
across independently observed charge and discharge cycles. The Homey device
therefore displayed 0 kWh in both cumulative battery energy capabilities even
though its instantaneous power and state of charge were updating.

The same local `/ems.json` response exposed moving counters under
`ems[0].ems_aggregate`, expressed in **kWh**. See
[battery-energy-validation.md](battery-energy-validation.md) for the
observations and their limitations.

## Direction and units

**These names are counterintuitive. Confirm on every hardware/firmware family.**

| Physical operation | Observed `/ems.json` counter | Homey *battery* capability |
| --- | --- | --- |
| Charging the battery (AC/inverter side) | `ems[].ems_aggregate.exported_kwh` | `meter_power.imported` |
| Discharging the battery (AC/inverter side) | `ems[].ems_aggregate.imported_kwh` | `meter_power.exported` |
| Instantaneous power | `ems[].ems_data.power` (W) | `measure_power` (W, with opposite sign in the current driver) |

The direction mapping above is **empirical**, not a guarantee for other firmware
or installations. The term “import/export” can refer to different boundaries:
battery, inverter, site or grid. Do **not** substitute the separate
`sensors`/grid/solar/load counters for the battery counters.

`ems_aggregate` appears to measure energy at the EMS/inverter AC boundary,
rather than energy stored in battery cells. Conversion losses can make this
different from the change in battery-state-of-charge energy. Inverter topology
(including possible PV pass-through) should be independently assessed before
treating the values as a certified battery-only energy meter.

## Implementation

- **Parser and state machine:** [`lib/battery-energy-counters.js`](../lib/battery-energy-counters.js).
- **Homey integration:** `updateBatteryEnergyCounters()` in
  [`drivers/homevolt-battery/device.js`](../drivers/homevolt-battery/device.js).
- **Tests:** [`test/battery-energy-counters.test.js`](../test/battery-energy-counters.test.js).
- **Runbook:** [battery-energy-testing.md](battery-energy-testing.md).

The parser reads all elements of `data.ems`. For each it requires finite,
non-negative `exported_kwh` and `imported_kwh`; incomplete readings are
discarded without updating energy capabilities. The code sums EMS entries and
**does not also add** `data.aggregated.ems_aggregate` (which could double
count the same data).

The state machine keeps per-device persistence in the Homey device store under
`batteryEnergyCountersV1`. It records the raw counter baseline and the two
absolute totals shown to Homey. Each subsequent accepted read advances Homey
by the **non-negative differences** between consecutive raw counters.

### Initial migration and continuity

The observed original app reported zero cumulative battery energy. Copying
1,000+ kWh of lifetime counters directly into Homey would misrepresent the
migration moment as newly charged or discharged energy. Thus:

1. First valid read: record a raw EMS **baseline** and retain the current Homey
   capability totals (typically zero). Do **not** publish lifetime values.
2. Later valid reads: add the incremental differences to those retained totals.
3. Restart: use persisted state, avoiding the initial lifetime jump.
4. Counter reset or EMS-count change: establish another raw baseline, without
   subtracting from cumulative Homey totals.

**Important:** the published totals are *since the existing Homey capability
baseline*, not lifetime values copied from the inverter. Historical battery
energy is intentionally **not backfilled**. Do not present the new totals as
a correction of past Homey Energy history.

### Anomaly handling and known trade-offs

- Non-numeric, negative or missing values: ignore that poll.
- Non-increasing poll timestamps: ignore that poll.
- Counter rollback (more than 0.005 kWh) or change in EMS count: rebaseline.
- Energy increment exceeding `(rated W × elapsed hours × 2 / 1000) + 0.15 kWh`:
  classify as a spike and rebaseline. If rated power is unavailable, the
  fallback is 12,000 W per EMS.
- A spike/rebaseline protects against a large false addition but may **lose
  valid energy** in that interval. The threshold and policy are provisional and
  require hardware validation, especially with multi-EMS and high-throughput
  operation.
- Current driver publishing is intentionally separate from partner/Greenely
  power commands. The energy routine only reads status and writes Homey energy
  capabilities/device state.
- Writes to Homey capabilities and the device store are not atomic. An
  interrupted update or an unexpected Homey capability reset needs dedicated
  integration testing. Do not assume transaction guarantees.

A change of firmware, pack count, EMS topology, reset behavior or meter
semantics requires fresh verification.

## What this change does *not* do

- Does **not** change `settings_local`, `target_power_mode`, schedules, or
  `/console.json` requests.
- Does **not** add a second battery to Homey Energy, nor rewrite the grid,
  solar or load sensor integrations.
- Does **not** recover historical charges/discharges missing before this fix.
- Does **not** imply that Greenely, Tibber, Polarium or the original app
  maintainer has reviewed or endorsed the mapping.
- Does **not** claim real-device acceptance testing of this modified app.

## References and attribution

- Upstream source: [lovethyresson/com.homevolt.local](https://github.com/lovethyresson/com.homevolt.local).
- Homey developer docs: [Device Energy](https://apps.developer.homey.app/the-basics/devices/energy)
  and [Device API](https://apps-sdk-v3.developer.homey.app/Device.html).
- Existing reverse-engineered device/console notes: [`CLAUDE.md`](../CLAUDE.md)
  and [`docs/console-help.md`](console-help.md).
- License: [GPL-3.0](../LICENSE). This is a modification of the upstream
  project and does not replace its copyright or license notices.

This fork's energy counter change and documentation were prepared in
**November 2026**. The empirical observations come from a single
user-controlled installation and should not be generalized without testing.
