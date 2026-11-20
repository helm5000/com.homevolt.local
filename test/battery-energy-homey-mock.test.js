'use strict';

// Integration-style tests of the actual device method, using a Homey Device mock.
// No Homey hardware, network requests, or battery commands are involved.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { STORE_KEY, readEnergyCounters, advanceEnergyCounters } = require('../lib/battery-energy-counters');

const source = fs.readFileSync(path.join(__dirname, '../drivers/homevolt-battery/device.js'), 'utf8');
const start = source.indexOf('async updateBatteryEnergyCounters(data) {');
const end = source.indexOf('async updateCapabilities(data) {', start);
assert.ok(start >= 0 && end > start, 'Expected energy method in actual driver');
const method = source.slice(start, end).trim();
let simulatedNow = Date.parse('2026-11-20T05:00:00Z');
const FakeDate = { now: () => simulatedNow };
const update = vm.runInNewContext(
  `({${method}}).updateBatteryEnergyCounters`,
  {
    readEnergyCounters, advanceEnergyCounters, STORE_KEY, Date: FakeDate,
  },
);

function sample(charged, discharged) {
  return {
    ems: [{ ems_aggregate: { exported_kwh: charged, imported_kwh: discharged } }],
  };
}

function fakeDevice(options = {}) {
  const store = new Map();
  const values = new Map([
    ['meter_power.imported', options.imported ?? 0],
    ['meter_power.exported', options.exported ?? 0],
  ]);
  const writes = [];
  const device = {
    ratedPowerWatts: 12000,
    getStoreValue: (key) => store.get(key),
    setStoreValue: async (key, value) => {
      if (options.failStore && options.failStore()) {
        throw new Error('store write failed');
      }
      store.set(key, structuredClone(value));
    },
    getCapabilityValue: (key) => values.get(key),
    setCapabilityValue: async (key, value) => {
      writes.push({ key, value });
      if (options.failCapability && options.failCapability(key)) {
        throw new Error('capability write failed');
      }
      values.set(key, value);
    },
    log: () => {},
    // A command function must never be called by this energy-only routine.
    sendBatteryCommand: () => {
      throw new Error('Unexpected battery command');
    },
  };
  return {
    device, store, values, writes,
  };
}

async function tick(mock, charge, discharge) {
  // Each mock poll represents a distinct five-minute Homey polling interval.
  simulatedNow += 5 * 60 * 1000;
  await update.call(mock.device, sample(charge, discharge));
}

test('first reading establishes baseline, no historical lifetime jump', async () => {
  const m = fakeDevice({ imported: 3, exported: 2 });
  await tick(m, 1756.40, 1544.71);
  assert.equal(m.values.get('meter_power.imported'), 3);
  assert.equal(m.values.get('meter_power.exported'), 2);
  assert.equal(m.writes.length, 0);
  assert.equal(m.store.get(STORE_KEY).charged, 1756.40);
});

test('charging and discharging update correct Homey capabilities', async () => {
  const m = fakeDevice();
  await tick(m, 100, 200);
  await tick(m, 100.2, 200.1);
  assert.ok(Math.abs(m.values.get('meter_power.imported') - 0.2) < 1e-8);
  assert.ok(Math.abs(m.values.get('meter_power.exported') - 0.1) < 1e-8);
});

test('failure on second capability write does not persist a new baseline; retry converges', async () => {
  let fail = true;
  const m = fakeDevice({
    failCapability: (key) => {
      if (key === 'meter_power.exported' && fail) {
        fail = false;
        return true;
      }
      return false;
    },
  });
  await tick(m, 100, 200);
  const before = m.store.get(STORE_KEY);
  await assert.rejects(tick(m, 100.2, 200.1), /capability write failed/);
  assert.deepEqual(m.store.get(STORE_KEY), before);
  await tick(m, 100.2, 200.1);
  assert.ok(Math.abs(m.values.get('meter_power.imported') - 0.2) < 1e-8);
  assert.ok(Math.abs(m.values.get('meter_power.exported') - 0.1) < 1e-8);
});

test('store failure after capability writes retries absolute values without double-counting', async () => {
  let fail = false;
  const m = fakeDevice({
    failStore: () => {
      if (fail) {
        fail = false;
        return true;
      }
      return false;
    },
  });
  await tick(m, 100, 200);
  fail = true;
  await assert.rejects(tick(m, 100.1, 200.1), /store write failed/);
  await tick(m, 100.1, 200.1);
  assert.ok(Math.abs(m.values.get('meter_power.imported') - 0.1) < 1e-8);
  assert.ok(Math.abs(m.values.get('meter_power.exported') - 0.1) < 1e-8);
});

test('restart with same persisted store does not replay energy', async () => {
  const m = fakeDevice();
  await tick(m, 100, 200);
  await tick(m, 100.1, 200.2);
  const restarted = fakeDevice({
    imported: m.values.get('meter_power.imported'),
    exported: m.values.get('meter_power.exported'),
  });
  restarted.store.set(STORE_KEY, structuredClone(m.store.get(STORE_KEY)));
  await tick(restarted, 100.1, 200.2);
  assert.equal(restarted.writes.length, 0);
  await tick(restarted, 100.2, 200.2);
  assert.ok(Math.abs(restarted.values.get('meter_power.imported') - 0.2) < 1e-8);
});

test('invalid data leaves existing values and baseline unchanged', async () => {
  const m = fakeDevice();
  await tick(m, 100, 200);
  const before = structuredClone(m.store.get(STORE_KEY));
  await update.call(m.device, { ems: [{}] });
  assert.deepEqual(m.store.get(STORE_KEY), before);
  assert.equal(m.writes.length, 0);
});
