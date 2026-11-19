# Field observations supporting the battery energy counter proposal

**Scope:** One Homevolt + Homey Pro installation, November 2026. This is
anonymized, user-observed evidence, **not** a formal Homevolt API specification,
independent metrology assessment, or real-device test of the patched app.

The source readings were acquired read-only from the user's local `/ems.json`
via HomeyScript. They were saved as Homey Logic variables during the diagnostic
period. No local IP address, device identifier, API credential, serial number,
network details or raw full JSON payload is published here.

## 1. Discharge: 6 November 2026

Selected values, local times (Europe/Stockholm):

| Time | State of charge | EMS power | `ems_aggregate.imported_kwh` | `ems_aggregate.exported_kwh` |
| --- | ---: | ---: | ---: | ---: |
| 16:50 | 82.60% | +1,078 W | 1,517.93 | 1,726.81 |
| 17:15 | 79.16% | +1,206 W | 1,518.40 | 1,726.81 |
| 17:45 | 73.96% | +3,061 W | 1,519.11 | 1,726.81 |
| 18:05 | 66.30% | +3,310 W | 1,520.14 | 1,726.81 |

**Observation:** as state of charge fell by 16.30 percentage points,
`imported_kwh` increased by **2.21 kWh**; `exported_kwh` did not change.
For a nominal 13.824 kWh unit, the SoC change would correspond to approximately
2.25 kWh using a naive nominal-capacity calculation. This is a plausibility
check only, not a measurement of usable battery energy.

The older `ems_data.energy_consumed` and `energy_produced` fields
continued to report **0 Wh** at all four scheduled samples.

## 2. Charge: 10 November 2026

Selected values, local times (Europe/Stockholm):

| Time | State of charge | EMS power | `ems_aggregate.imported_kwh` | `ems_aggregate.exported_kwh` |
| --- | ---: | ---: | ---: | ---: |
| 16:00 | 73.67% | -5,550 W | 1,544.71 | 1,756.40 |
| 16:20 | 85.99% | -5,420 W | 1,544.71 | 1,758.20 |
| 16:40 | 94.63% | -2 W | 1,544.81 | 1,759.59 |

**Observation:** as SoC rose by 20.96 percentage points,
`exported_kwh` increased by **3.19 kWh**. `imported_kwh` also increased
by 0.10 kWh over the interval, so the two counters are not strictly exclusive
within a wide sampling window (e.g., other activity or transitions can occur).
The older `ems_data` energy counters remained at zero.

The nominal-capacity estimate of increased storage is ~2.90 kWh. The
difference from the EMS counter is **compatible with** AC conversion losses;
it does not prove where the counter is physically located.

## 3. Read-only observation period: 11–17 November 2026

A separate HomeyScript recorded the deltas in the EMS aggregate registers
every five minutes without changing the battery or Homey Energy:

| Local date | Charged from EMS `exported` | Discharged from EMS `imported` |
| --- | ---: | ---: |
| 11 Nov (partial day) | 0.19 kWh | 0.11 kWh |
| 12 Nov | 2.88 kWh | 2.23 kWh |
| 13 Nov | 8.60 kWh | 7.15 kWh |
| 14 Nov | 1.05 kWh | 5.35 kWh |
| 15 Nov | 12.95 kWh | 6.21 kWh |
| 16 Nov | 30.62 kWh | 29.42 kWh |
| 17 Nov | 11.96 kWh | 8.51 kWh |
| **Total** | **68.25 kWh** | **58.98 kWh** |

The log recorded **1,787 successful API samples, zero recorded API errors**,
and **12 stored power-sign mismatch warnings**. Those warnings compare the
instantaneous EMS API power against the original Homey capability at nearby
times. They were **not proven to be energy-counter defects**: asynchronously
updated values, sign convention, and control-mode transitions remain plausible
causes. The log did not preserve enough detailed context to attribute each
warning. A Homey energy capability check during this work still reported
`meter_power.imported = 0` and `meter_power.exported = 0` for the battery.

The monitoring flow was disabled after the period. The numbers above are
**diagnostic observations**, not a validation of the new driver implementation.

## 4. Meter boundary and topology

The inspected `/ems.json` included:

- `data.ems`: one EMS entry, with a separate `ems_aggregate`.
- `data.aggregated`: an EMS aggregate structure (not counted again).
- `data.sensors`: three sensor records, identified as `grid`, `solar`
  and `load`.

Example cumulative readings at the separate sensor boundaries were
2,643.64/5,284.19 kWh (grid), 7,199.98/1.55 kWh (solar), and
796.58/5,132.28 kWh (load), for each record's
`energy_imported`/`energy_exported` fields. The simultaneous EMS aggregate
read **1,547.21 kWh imported / 1,761.93 kWh exported**. These are
**different counters**, so do not infer a 1:1 mapping between grid, solar,
load and battery.

The observations support the proposed battery mapping on this system; they
**do not conclusively establish** whether a different wiring topology can
include PV pass-through or whether the AC counter matches battery-cell energy.

## 5. Verification still required before release

- Repeat discharge and charge verification on at least one different Homevolt
  firmware/hardware configuration, ideally including a multi-EMS system.
- Establish whether inverter PV pass-through can affect `ems_aggregate`.
- Test first-run migration, app restart, device store persistence, network
  interruptions, and counter rollover/reset on actual Homey hardware.
- Check capability changes against Homey Energy's battery accounting, without
  double-counting grid/solar devices.
- Diagnose power-sign warnings separately: correlate raw EMS power and Homey
  `measure_power` at the **same instant**, before changing the sign convention.
- Confirm the approach with the upstream maintainer before an upstream PR or
  release. No endorsement or review is implied.

See [the implementation notes](battery-energy-counters.md) and
[testing / rollout checklist](battery-energy-testing.md).
