'use strict';

// Homevolt's EMS aggregate counters are on the inverter/AC side. On observed
// Homevolt firmware, exported_kwh rises while charging and imported_kwh while
// discharging. This maps to Homey's battery imported/exported capabilities.
const STORE_KEY = 'batteryEnergyCountersV1';
const VERSION = 1;

function readEnergyCounters(data) {
  const entries = data?.ems;
  if (!Array.isArray(entries) || entries.length === 0) return null;

  let charged = 0;
  let discharged = 0;
  for (const ems of entries) {
    const charge = ems?.ems_aggregate?.exported_kwh;
    const discharge = ems?.ems_aggregate?.imported_kwh;
    if (!Number.isFinite(charge) || !Number.isFinite(discharge)
      || charge < 0 || discharge < 0) return null;
    charged += charge;
    discharged += discharge;
  }
  return { charged, discharged, emsCount: entries.length };
}

function validState(state) {
  return state && state.version === VERSION
    && Number.isFinite(state.charged) && Number.isFinite(state.discharged)
    && Number.isFinite(state.imported) && Number.isFinite(state.exported)
    && Number.isFinite(state.at) && Number.isInteger(state.emsCount)
    && state.charged >= 0 && state.discharged >= 0
    && state.imported >= 0 && state.exported >= 0;
}

/**
 * Cumulative counters, not instantaneous power. State persists per Homey device,
 * while `imported`/`exported` are the values presented to Homey Energy.
 * On first sample, a reset or changed EMS count, establish a new raw baseline
 * without injecting historic energy. Current Homey capability values are kept.
 */
function advanceEnergyCounters(state, reading, at, ratedPowerW, existing) {
  if (!reading || !Number.isFinite(at)) return { reason: 'invalid', state, publish: false };
  const oldImported = Number.isFinite(existing?.imported) && existing.imported >= 0
    ? existing.imported : 0;
  const oldExported = Number.isFinite(existing?.exported) && existing.exported >= 0
    ? existing.exported : 0;
  const good = validState(state);
  const next = good ? {
    version: state.version,
    charged: state.charged,
    discharged: state.discharged,
    emsCount: state.emsCount,
    at: state.at,
    imported: state.imported,
    exported: state.exported,
  } : {
    version: VERSION, imported: oldImported, exported: oldExported,
  };
  const baselined = !good || reading.emsCount !== state.emsCount
    || reading.charged < state.charged - 0.005
    || reading.discharged < state.discharged - 0.005;
  if (baselined) {
    Object.assign(next, {
      charged: reading.charged,
      discharged: reading.discharged,
      emsCount: reading.emsCount,
      at,
    });
    return { reason: good ? 'rebaseline' : 'initial', state: next, publish: false };
  }
  if (at <= state.at) return { reason: 'time', state, publish: false };

  const deltaCharged = Math.max(0, reading.charged - state.charged);
  const deltaDischarged = Math.max(0, reading.discharged - state.discharged);
  const hours = (at - state.at) / 3600000;
  // 2x margin for firmware sampling/rounding. For unknown nameplate rating,
  // assume 12kW per EMS. This is an anomaly guard, not a calibrated meter.
  const maxW = Number.isFinite(ratedPowerW) && ratedPowerW > 0
    ? ratedPowerW : 12000 * reading.emsCount;
  const bound = (maxW * hours * 2) / 1000 + 0.15;
  if (deltaCharged + deltaDischarged > bound) {
    Object.assign(next, {
      charged: reading.charged,
      discharged: reading.discharged,
      emsCount: reading.emsCount,
      at,
    });
    return { reason: 'spike', state: next, publish: false };
  }

  Object.assign(next, {
    charged: reading.charged,
    discharged: reading.discharged,
    emsCount: reading.emsCount,
    at,
    imported: state.imported + deltaCharged,
    exported: state.exported + deltaDischarged,
  });
  return { reason: 'ok', state: next, publish: deltaCharged > 0 || deltaDischarged > 0 };
}

module.exports = { STORE_KEY, readEnergyCounters, advanceEnergyCounters };
