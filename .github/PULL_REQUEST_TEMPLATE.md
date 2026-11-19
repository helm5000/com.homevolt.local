## Summary

Describe the problem being solved, the scope of the change and why it is needed.
Link related issues or documentation. Keep unrelated changes in separate PRs.

## Evidence and reproduction

- Original behavior / minimal reproduction:
- Expected behavior:
- Actual behavior:
- Hardware / firmware / Homey app versions (if relevant):
- Supporting logs or measurements (**sanitized**):

For battery energy counter changes, see
[the anonymized field observations](../docs/battery-energy-validation.md)
and [mapping/design notes](../docs/battery-energy-counters.md).
Separate observed behavior from assumptions about other firmware or topology.

## Verification

- [ ] `npm ci`
- [ ] `npm run test:energy` (if battery energy logic is affected)
- [ ] `npm run lint`
- [ ] Any relevant additional tests have been added
- [ ] I have documented the results accurately (including failures/not run)

Tests actually executed and results:

## Risk / compatibility / rollback

- Does this affect existing devices, stored energy counters, flows or Homey history?
- Does this affect cloud/partner control, battery schedules or authentication?
- How will this be tested safely and rolled back if needed?
- Is there an initial migration or historical data discontinuity?
- What limitations or unverified assumptions remain?

Use [the battery rollout checklist](../docs/battery-energy-testing.md) when applicable.

## Privacy and provenance

- [ ] No API tokens, passwords, IP addresses, serials, QR codes, unredacted
      local JSON payloads or private Homey details are included
- [ ] Changes respect the upstream project's GPL-3.0 license and attribution
- [ ] I have not implied maintainer endorsement or hardware validation
      where neither exists

## Release readiness

- [ ] Changes are narrowly scoped and ready for review
- [ ] Documentation is current
- [ ] Real-hardware acceptance completed **or** explicitly marked pending

**Draft PRs are encouraged** while validation is incomplete.
