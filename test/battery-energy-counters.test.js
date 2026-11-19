'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readEnergyCounters, advanceEnergyCounters } = require('../lib/battery-energy-counters');
const { runSingleFlight } = require('../lib/async-single-flight');

const sample = (charge, discharge) => ({
  ems: [{
    ems_aggregate: {
      exported_kwh: charge,
      imported_kwh: discharge,
    },
  }],
});
const t0 = Date.parse('2026-11-10T15:00:00Z');
const step = (state, charge, discharge, mins = 5, rated = 12000) => advanceEnergyCounters(
  state, readEnergyCounters(sample(charge, discharge)),
  state.at + mins * 60000, rated, { imported: 0, exported: 0 },
);

test('charging maps EMS exported to Homey imported', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(1756.4, 1544.71)),
    t0, 12000, { imported: 0, exported: 0 });
  const y = step(x.state, 1758.20, 1544.71, 20);
  assert.equal(x.reason, 'initial');
  assert.equal(x.state.imported, 0);
  assert.ok(Math.abs(y.state.imported - 1.8) < 0.00001);
  assert.equal(y.state.exported, 0);
});

test('discharging maps EMS imported to Homey exported', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(1726.81, 1517.93)),
    t0, 12000, {});
  const y = step(x.state, 1726.81, 1518.4, 25);
  assert.ok(Math.abs(y.state.exported - 0.47) < 0.00001);
  assert.equal(y.state.imported, 0);
});

test('missing and non-finite API fields are rejected', () => {
  assert.equal(readEnergyCounters({ ems: [{ ems_aggregate: { exported_kwh: 5 } }] }), null);
  assert.equal(readEnergyCounters({
    ems: [
      { ems_aggregate: { exported_kwh: NaN, imported_kwh: 7 } },
    ],
  }), null);
  assert.equal(readEnergyCounters({ ems: [] }), null);
  assert.equal(readEnergyCounters(null), null);
});

test('multiple EMS are summed without double-counting aggregated', () => {
  const reading = readEnergyCounters({
    ems: [sample(2, 3).ems[0], sample(4, 5).ems[0]],
    aggregated: {
      ems_aggregate: { exported_kwh: 6, imported_kwh: 8 },
    },
  });
  assert.deepEqual(reading, { charged: 6, discharged: 8, emsCount: 2 });
});

test('initial baseline preserves existing meters without lifetime spike', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(1500, 1000)),
    t0, 12000, { imported: 3.5, exported: 2.25 });
  assert.equal(x.publish, false);
  assert.equal(x.state.imported, 3.5);
  assert.equal(x.state.exported, 2.25);
  const y = step(x.state, 1500.1, 1000.2);
  assert.ok(Math.abs(y.state.imported - 3.6) < 0.00001);
  assert.ok(Math.abs(y.state.exported - 2.45) < 0.00001);
});

test('restarting and repeated values do not duplicate energy', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(10, 20)), t0, 12000, {});
  const y = step(x.state, 10.1, 20.1);
  const repeat = advanceEnergyCounters(y.state, readEnergyCounters(sample(10.1, 20.1)),
    y.state.at + 5000, 12000, {});
  assert.equal(repeat.publish, false);
  assert.deepEqual([repeat.state.imported, repeat.state.exported],
    [y.state.imported, y.state.exported]);
});

test('counter resets and EMS count changes rebaseline safely', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(100, 200)), t0, 12000, {});
  const y = step(x.state, 100.1, 200.2);
  const reset = step(y.state, 0.01, 0.01);
  assert.equal(reset.reason, 'rebaseline');
  assert.equal(reset.state.imported, y.state.imported);
  assert.equal(reset.state.exported, y.state.exported);
  const extra = advanceEnergyCounters(reset.state, readEnergyCounters({
    ems: [sample(0.1, 0.2).ems[0], sample(1, 2).ems[0]],
  }), reset.state.at + 60000, 24000, {});
  assert.equal(extra.reason, 'rebaseline');
  assert.equal(extra.state.imported, y.state.imported);
});

test('implausible energy jump is skipped', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(10, 10)), t0, 6000, {});
  const y = step(x.state, 1000, 1000, 5, 6000);
  assert.equal(y.reason, 'spike');
  assert.equal(y.publish, false);
  assert.equal(y.state.imported, 0);
});

test('old timestamp is not counted twice', () => {
  const x = advanceEnergyCounters(null, readEnergyCounters(sample(10, 10)), t0, 12000, {});
  const y = advanceEnergyCounters(x.state, readEnergyCounters(sample(10.2, 10)),
    t0, 12000, {});
  assert.equal(y.reason, 'time');
  assert.equal(y.state, x.state);
});

test('missed poll can recover cumulative energy after a network outage', () => {
  const initial = advanceEnergyCounters(null, readEnergyCounters(sample(10, 20)),
    t0, 12000, {});
  const noApi = advanceEnergyCounters(initial.state, readEnergyCounters(null),
    t0 + 5 * 60000, 12000, {});
  assert.equal(noApi.reason, 'invalid');
  assert.equal(noApi.state, initial.state);
  const resumed = advanceEnergyCounters(initial.state, readEnergyCounters(sample(10.4, 20.3)),
    t0 + 20 * 60000, 12000, {});
  assert.equal(resumed.reason, 'ok');
  assert.ok(Math.abs(resumed.state.imported - 0.4) < 0.00001);
  assert.ok(Math.abs(resumed.state.exported - 0.3) < 0.00001);
});

test('retry from prior persisted baseline does not double-count a partial write', () => {
  const initial = advanceEnergyCounters(null, readEnergyCounters(sample(10, 20)),
    t0, 12000, {});
  const partiallyPublished = advanceEnergyCounters(initial.state,
    readEnergyCounters(sample(10.1, 20.1)), t0 + 5 * 60000, 12000, {});
  assert.ok(Math.abs(partiallyPublished.state.imported - 0.1) < 0.00001);

  // Simulate failure before the new store state is committed. A subsequent
  // fetch calculates absolute totals from the old baseline, not prior writes.
  const retry = advanceEnergyCounters(initial.state,
    readEnergyCounters(sample(10.2, 20.1)), t0 + 10 * 60000, 12000, {});
  assert.ok(Math.abs(retry.state.imported - 0.2) < 0.00001);
  assert.ok(Math.abs(retry.state.exported - 0.1) < 0.00001);
});

test('single-flight guard skips overlapping polls and accepts the next poll', async () => {
  const owner = {};
  let release;
  let starts = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const first = runSingleFlight(owner, 'polling', async () => {
    starts++;
    await gate;
  });
  const skipped = await runSingleFlight(owner, 'polling', async () => {
    starts++;
  });
  assert.equal(skipped, false);
  assert.equal(starts, 1);
  release();
  assert.equal(await first, true);
  const next = await runSingleFlight(owner, 'polling', async () => {
    starts++;
  });
  assert.equal(next, true);
  assert.equal(starts, 2);
});

test('single-flight guard releases lock after a rejected operation', async () => {
  const owner = {};
  await assert.rejects(
    runSingleFlight(owner, 'polling', async () => {
      throw new Error('network failure');
    }),
    /network failure/,
  );
  const next = await runSingleFlight(owner, 'polling', async () => {});
  assert.equal(next, true);
});
