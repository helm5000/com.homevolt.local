'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readEnergyCounters, advanceEnergyCounters } = require('../lib/battery-energy-counters');

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
  assert.equal(readEnergyCounters({ ems: [{
    ems_aggregate: { exported_kwh: NaN, imported_kwh: 7 },
  }] }), null);
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
