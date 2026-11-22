# Controlled Homey Pro test — Homevolt 1.7.4 with energy meters only

**Purpose:** Test the battery energy meter correction on the existing Homey Pro without changing Greenely/partner control. This branch is based on upstream Homevolt **1.7.4** (commit `ad921ea70f8098ce50c35435e2a857b0713186e9`), rather than upstream 1.8.0.

## Before proceeding

- Verify the saved 1.59 GB USB backup has a completed file and a second copy. A backup is not proof of successful restore.
- Verify Homey is online and the installed Homevolt app is still 1.7.4.
- Record Homevolt readings: `target_power_mode=partner`, `battery_control_mode=remote`, state-of-charge, current power, `meter_power.imported` and `meter_power.exported`.
- Check flows for any Homevolt actions that set control mode, target power, charge, discharge or schedules. Do not run those during the experiment.
- Check that Homevolt 1.7.4 is still available for reinstall in the Homey App Store, and understand that full USB recovery requires a more invasive reset/restore procedure.
- Confirm the branch's GitHub Actions checks pass and local `homey app validate` succeeds.
- Check Homey is in a suitable operating window; a brief Homevolt monitoring outage may occur when the app restarts.

## What the patch changes

- The app ID, Homevolt 1.7.4 metadata and all existing control-mode, target-power and schedule command implementations are unchanged.
- Reads existing `/ems.json` through the original app polling path and publishes **incremental** battery charged/discharged kWh into the existing device's `meter_power.imported`/`meter_power.exported`.
- First read establishes a baseline, **without** copying old lifetime counters into Homey Energy.
- Device-local state protects against duplicate and implausible updates.
- A single-flight guard prevents overlapping polls from racing.

**Important:** The existing Homevolt app contains battery control functions, and installing a development package replaces the running app with the same app ID. No software change can promise absolute zero operational risk. No changes to Greenely or the battery firmware are part of this procedure.

## Installation choice and precautions

Use `homey app install` for a persistent test installation **only after** checks pass and Homey backup / rollback are understood. Unlike `homey app run`, which automatically uninstalls its development app when terminated, `homey app install` persists. Both replace a running app with the same ID. Never uninstall the app or remove/re-pair the battery just to switch test versions. Do not change `settings_local`, `target_power_mode`, power targets or schedules during the test.

## Acceptance

1. Immediately after installation, verify the original battery device still exists and the partner mode is `partner` / `remote`.
2. Initial cumulative energy values must not jump to the inverter's historic kWh readings.
3. On actual charging, `meter_power.imported` rises. On actual discharging, `meter_power.exported` rises; compare with **same-window** raw EMS deltas.
4. Monitor real charging/discharging, at least 24–48 h if stable; check Homey Energy does not double count other energy sources.
5. No schedule/power control was issued and Greenely continued normally.

## Rollback

- If partner mode changes unexpectedly, the battery disappears or energy values jump, **stop the test** and capture the exact symptom without issuing control commands.
- Restore the published Homevolt 1.7.4 through Homey's supported app update/reinstall mechanism *without deleting the existing battery device*. Verify that procedure before install; a lower version may not always be directly installable.
- The local USB backup is a last-resort full-home restore. Restore does not necessarily erase energy history recorded after the snapshot.
- After rollback verify device ID, flows, capabilities, `partner`/`remote`, battery activity and Greenely cloud control.
