// ============================================================
// GB DAILY GAS DATA — Google Apps Script
// Writes one row per gas day to the "data" sheet in:
// https://docs.google.com/spreadsheets/d/1sECfXJOZx1MGoRDIllBhPoyijTe0UGri2wBYF-VM5HI
//
// DATA SOURCE: National Gas Transmission "Gas Operational Data API"
//   https://api.nationalgas.com/operationaldata/v1
//   PUBLIC — no authentication, no API key, no cookies required.
//
// SETUP:
// 1. Apps Script → paste this file, save.
// 2. Make sure the sheet has a header for column X: "storage_injection".
// 3. (Optional) Script Properties → NG_DISCOVERY_MODE → true to log values
//    on the first run without writing to the sheet.
// 4. Run testFetch() once to authorise + eyeball one day's numbers.
// 5. Run fillBlanks() to backfill history from 1 Jan 2022 (re-run until it
//    reports "History is up to date" — see note on that function).
// 6. Add a time-based trigger: dailyGasData() → daily, 13:00–14:00 UK.
//    (Demand publishes ~11:30 and finalises ~12:00 on D+1.)
//
// COLUMN LAYOUT (sheet rows 1-2 are headers; data starts at row 3):
// A:date  B:ldz_total
// C:NW  D:NE  E:NO  F:EM  G:WM  H:EA  I:NT  J:SE  K:SO  L:SW  M:WA  N:SC   (per-LDZ)
// O:power  P:industrial  Q:exports
// R:supply_ukcs  S:supply_lng  T:supply_interconnectors  U:supply_storage
// V:gwh_total  W:carbon_ktco2  X:storage_injection  Y:supply_norway
// Z:flow_belgium  AA:flow_netherlands  AB:flow_ireland  (net cross-border, + = import)
// AC:supply_stfergus (mcm, UK + Norwegian Vesterled, split out of UKCS)
//
// All flow columns (B–U, X–AC) are stored in mcm (million cubic metres) so the
// page charts them on one scale. gwh_total (V) is GB gas *consumption* energy
// (LDZ + power + industrial) — the basis for the carbon figure. Exports and
// storage injection are shown on the demand chart but excluded from the
// consumption/carbon headline (that gas is burned abroad or not burned at all).
//
// PER-LDZ (C–N): the API has no per-zone total, so we sum every LDZ offtake
// point (122 of them) by zone. Validated: the 12 zone sums equal the national
// LDZ total exactly. GB has 13 LDZ codes + 1 stray point; these fold into the
// sheet's 12 columns as: WN+WS → WA (Wales), SM → EA (Eastern).
// ============================================================

const SHEET_ID   = '1sECfXJOZx1MGoRDIllBhPoyijTe0UGri2wBYF-VM5HI';
const SHEET_NAME = 'data';
const API_BASE   = 'https://api.nationalgas.com/operationaldata/v1';

// Demand publication objects (energy, kWh). LDZ is derived from the per-zone
// aggregation below, so it is not listed here.
const PUB_DEMAND = {
  power:            'PUBOBJ1025', // NTS Energy Offtaken, Powerstations Total
  industrial:       'PUBOBJ1026', // NTS Energy Offtaken, Industrial Offtake Total
  exports:          'PUBOBJ1028', // NTS Energy Offtaken, Interconnector Exports Total
  storageInjection: 'PUBOBJ1024', // NTS Energy Offtaken, Storage Injection Total
};

// Supply summary publication objects (volume, mscm = mcm)
const PUB_SUPPLY = {
  beachInclNorway: 'PUBOBJ1620', // Beach Including Norway - Daily Flow
  norway:          'PUBOB452',   // Easington - Langeled (Norwegian pipeline import)
  stFergusMobil:   'PUBOB428',   // St Fergus - Mobil  (UK + Norwegian Vesterled, commingled)
  stFergusNSMP:    'PUBOB434',   // St Fergus - NSMP
  stFergusShell:   'PUBOB431',   // St Fergus - Shell
  lng:             'PUBOBJ1621', // Aggregate LNG Importations - Daily Flow
  interconnectors: 'PUBOB262',   // Interconnector - Daily Flow (imports from continent)
  storage:         'PUBOB264',   // Storage - Daily Flow (withdrawal)
};
// UK-only beach production = "Beach Including Norway" minus the Langeled flow.
// Note: Norwegian gas via Vesterled into St Fergus is commingled with UK gas at
// the terminal and cannot be cleanly separated, so it remains inside UKCS. The
// Langeled flow at Easington is the dominant, unambiguously-Norwegian import.

// Cross-border interconnector flows (volume, mscm). Net per country = entry
// (import into GB) minus physical exit flow (export from GB). + = net import.
//   Belgium    = Bacton IUK        (bidirectional)
//   Netherlands= Bacton BBL        (bidirectional)
//   Ireland    = Moffat            (export only, GB -> Ireland)
//   Norway     = Langeled          (import only; already captured as supply_norway)
// Britain has no direct gas pipeline to France (that link is electricity only).
const PUB_XBORDER = {
  beIn:  'PUBOB386',   // Bacton IUK entry  (import from Belgium)
  beOut: 'PUBOB2038',  // Bacton IUK physical flow (export to Belgium)
  nlIn:  'PUBOB449',   // BBL entry (import from Netherlands)
  nlOut: 'PUBOBJ1307', // BBL physical flow (export to Netherlands)
  ieOut: 'PUBOB2039',  // Moffat physical flow (export to Ireland)
};

// Per-LDZ offtake points grouped into the 12 sheet columns (C–N), in column order.
// Every "NTS Energy Offtaken, <site>, <zone>, LDZ Offtake" point (energy, kWh).
const LDZ_COLUMNS = [
  { zone: 'NW', ids: ['PUBOBJ854', 'PUBOBJ863', 'PUBOBJ884', 'PUBOBJ896', 'PUBOBJ913', 'PUBOBJ916', 'PUBOBJ920', 'PUBOBJ925', 'PUBOBJ941', 'PUBOBJ957', 'PUBOBJ959'] },
  { zone: 'NE', ids: ['PUBOBJ851', 'PUBOBJ859', 'PUBOBJ869', 'PUBOBJ889', 'PUBOBJ912', 'PUBOBJ924', 'PUBOBJ926', 'PUBOBJ930', 'PUBOBJ933', 'PUBOBJ954'] },
  { zone: 'NO', ids: ['PUBOBJ852', 'PUBOBJ853', 'PUBOBJ876', 'PUBOBJ877', 'PUBOBJ878', 'PUBOBJ885', 'PUBOBJ894', 'PUBOBJ898', 'PUBOBJ903', 'PUBOBJ919', 'PUBOBJ939', 'PUBOBJ940', 'PUBOBJ952', 'PUBOBJ953', 'PUBOBJ960'] },
  { zone: 'EM', ids: ['PUBOBJ847', 'PUBOBJ862', 'PUBOBJ864', 'PUBOBJ870', 'PUBOBJ880', 'PUBOBJ892', 'PUBOBJ906', 'PUBOBJ922', 'PUBOBJ945', 'PUBOBJ949', 'PUBOBJ951', 'PUBOBJ955', 'PUBOBJ956'] },
  { zone: 'WM', ids: ['PUBOBJ848', 'PUBOBJ850', 'PUBOBJ855', 'PUBOBJ856', 'PUBOBJ873', 'PUBOBJ908', 'PUBOBJ911', 'PUBOBJ921', 'PUBOBJ935', 'PUBOBJ938', 'PUBOBJ944', 'PUBOBJ948'] },
  { zone: 'EA', ids: ['PUBOBJ858', 'PUBOBJ867', 'PUBOBJ893', 'PUBOBJ918', 'PUBOBJ927', 'PUBOBJ929', 'PUBOBJ936', 'PUBOBJ937', 'PUBOBJ958', 'PUBOBJ961', 'PUBOBJ965'] },
  { zone: 'NT', ids: ['PUBOBJ897', 'PUBOBJ914', 'PUBOBJ928', 'PUBOBJ962'] },
  { zone: 'SE', ids: ['PUBOBJ887', 'PUBOBJ943', 'PUBOBJ950', 'PUBOBJ963', 'PUBOBJ2028'] },
  { zone: 'SO', ids: ['PUBOBJ865', 'PUBOBJ866', 'PUBOBJ895', 'PUBOBJ901', 'PUBOBJ902', 'PUBOBJ917', 'PUBOBJ964'] },
  { zone: 'SW', ids: ['PUBOBJ857', 'PUBOBJ872', 'PUBOBJ874', 'PUBOBJ875', 'PUBOBJ883', 'PUBOBJ886', 'PUBOBJ888', 'PUBOBJ900', 'PUBOBJ904', 'PUBOBJ909', 'PUBOBJ932', 'PUBOBJ934', 'PUBOBJ942'] },
  { zone: 'WA', ids: ['PUBOBJ879', 'PUBOBJ882', 'PUBOBJ890', 'PUBOBJ915'] },
  { zone: 'SC', ids: ['PUBOBJ846', 'PUBOBJ849', 'PUBOBJ860', 'PUBOBJ861', 'PUBOBJ868', 'PUBOBJ871', 'PUBOBJ881', 'PUBOBJ891', 'PUBOBJ899', 'PUBOBJ905', 'PUBOBJ907', 'PUBOBJ910', 'PUBOBJ923', 'PUBOBJ931', 'PUBOBJ946', 'PUBOBJ947', 'PUBOBJ2031'] },
];

// CV conversion for demand energy → volume: 1 mcm ≈ 11.0 GWh (standard GB gross CV)
const MCM_TO_GWH = 11.0;

// Carbon factor: BEIS gross combustion, 202 gCO2/kWh = 0.202 ktCO2/GWh
const CARBON_KTCO2_PER_GWH = 0.202;


// ─────────────────────────────────────────────────────────────
// MAIN ENTRY POINT — set the daily trigger on this function
// ─────────────────────────────────────────────────────────────
function dailyGasData() {
  const discoveryMode = PropertiesService.getScriptProperties()
    .getProperty('NG_DISCOVERY_MODE') === 'true';

  const gasDate = getPreviousGasDate();
  const dateStr = Utilities.formatDate(gasDate, 'Europe/London', 'yyyy-MM-dd');
  Logger.log('Fetching gas data for gas day: ' + dateStr);

  try {
    const values = fetchGasDay(dateStr);

    if (discoveryMode) {
      Logger.log('=== Values for ' + dateStr + ' ===\n' + JSON.stringify(values, null, 2));
      return;
    }

    if (values.gwhTotal <= 0) {
      Logger.log('No consumption data yet for ' + dateStr + ' — will retry next run.');
      return;
    }

    if (dateAlreadyExists(dateStr)) {
      Logger.log('Row for ' + dateStr + ' already exists — skipping.');
      return;
    }

    writeRow(dateStr, values);
    Logger.log('Done — wrote row for ' + dateStr);

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    // MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Gas script error', e.message);
  }
}


// ─────────────────────────────────────────────────────────────
// BACKFILL — fill every missing gas day from BACKFILL_START to yesterday.
//
// The API holds ~5 years of rolling daily history (currently back to ~Oct 2021),
// but we only keep whole calendar years, so history starts 1 Jan 2022.
//
// Days are fetched in batches (one API request per BATCH_DAYS-day window — the
// API rejects requests above a data-volume threshold, and 14 days of all our
// publication ids sits safely under it). Missing days are written, days already
// present are skipped, days with no data are ignored.
//
// NOTE: Apps Script caps a single execution at 6 minutes. Batching makes the
// full history only ~120 requests, but if a run approaches the limit it stops
// safely after the current batch — just run fillBlanks() again to resume from
// the first remaining gap. Repeat until it reports "History is up to date".
// ─────────────────────────────────────────────────────────────
const BACKFILL_START = '2022-01-01';
const BATCH_DAYS     = 14;

function fillBlanks() {
  const startMs = Date.now();
  const MAX_MS  = 5 * 60 * 1000; // stop before Apps Script's 6-min limit

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const existing = getExistingDates(sheet);

  const ids = allPublicationIds();
  const start = new Date(BACKFILL_START + 'T00:00:00Z');
  const end   = getPreviousGasDate();
  let written = 0, timedOut = false;

  // Walk forward in BATCH_DAYS-day windows, oldest first.
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + BATCH_DAYS)) {
    if (Date.now() - startMs > MAX_MS) { timedOut = true; break; }

    // Dates covered by this batch (bounded by `end`)
    const batch = [];
    const c = new Date(cursor);
    for (let n = 0; n < BATCH_DAYS && c <= end; n++, c.setDate(c.getDate() + 1)) {
      batch.push(Utilities.formatDate(c, 'Europe/London', 'yyyy-MM-dd'));
    }

    // Skip the whole request if every day in the batch is already present
    if (batch.every(day => existing.has(day))) continue;

    try {
      const raw   = postPublications(ids, batch[0], batch[batch.length - 1]);
      const byDay = indexByDay(raw);

      batch.forEach(day => {
        if (existing.has(day)) return;
        const values = buildValues(byDay[day] || {});
        if (values.gwhTotal > 0) {
          writeRow(day, values);
          existing.add(day);
          written++;
          Logger.log('Backfilled ' + day);
        } else {
          Logger.log('No data for ' + day + ' — skipped');
        }
      });
      Utilities.sleep(400); // be polite between batches
    } catch (e) {
      Logger.log('Batch ' + batch[0] + '..' + batch[batch.length - 1] + ' failed: ' + e.message);
    }
  }

  if (timedOut) {
    Logger.log('Approaching time limit — wrote ' + written + ' rows this run. Run fillBlanks() again to continue.');
  } else {
    Logger.log('Backfill complete — wrote ' + written + ' rows. History is up to date.');
  }
}


// All publication ids we request (demand totals + supply + cross-border + LDZ)
function allPublicationIds() {
  const ldzIds = LDZ_COLUMNS.reduce((acc, c) => acc.concat(c.ids), []);
  return [].concat(
    Object.values(PUB_DEMAND), Object.values(PUB_SUPPLY),
    Object.values(PUB_XBORDER), ldzIds
  );
}

// ─────────────────────────────────────────────────────────────
// FETCH — one gas day of demand + supply, returned in mcm/GWh
// ─────────────────────────────────────────────────────────────
function fetchGasDay(dateStr) {
  const raw   = postPublications(allPublicationIds(), dateStr, dateStr);
  const byDay = indexByDay(raw);
  return buildValues(byDay[dateStr] || {});
}

// Index a /publications/gasday response into { 'YYYY-MM-DD': { pubId: value } }
function indexByDay(raw) {
  const byDay = {};
  raw.forEach(item => {
    (item.publications || []).forEach(p => {
      const day = p.applicableFor;
      if (!byDay[day]) byDay[day] = {};
      byDay[day][item.publicationId] = parseFloat(p.value);
    });
  });
  return byDay;
}

// Turn one day's { pubId: value } map into the row values (mcm/GWh)
function buildValues(byId) {
  // Per-LDZ: sum each zone's points, kWh → GWh → mcm
  const ldzMcm = LDZ_COLUMNS.map(c => {
    const kwh = c.ids.reduce((s, id) => s + (byId[id] || 0), 0);
    return (kwh / 1e6) / MCM_TO_GWH;
  });
  const ldzTotalMcm = ldzMcm.reduce((s, v) => s + v, 0);
  const ldzTotalGwh = ldzTotalMcm * MCM_TO_GWH;

  // Other demand: kWh → GWh
  const kwh = key => byId[PUB_DEMAND[key]] || 0;
  const powerGwh = kwh('power')            / 1e6;
  const indGwh   = kwh('industrial')       / 1e6;
  const expGwh   = kwh('exports')          / 1e6;
  const injGwh   = kwh('storageInjection') / 1e6;

  // GB consumption = heating + power + industrial (exports/injection excluded)
  const gwhTotal    = ldzTotalGwh + powerGwh + indGwh;
  const carbonKtco2 = gwhTotal * CARBON_KTCO2_PER_GWH;

  // Supply: already mscm (= mcm)
  const sup = key => byId[PUB_SUPPLY[key]] || 0;
  const norway   = sup('norway');
  const stFergus = sup('stFergusMobil') + sup('stFergusNSMP') + sup('stFergusShell');
  // UKCS = other UK beach terminals (beach total minus Langeled and St Fergus)
  const ukcs = sup('beachInclNorway') - norway - stFergus;

  // Cross-border net flows (mscm, + = net import into GB)
  const xb = key => byId[PUB_XBORDER[key]] || 0;
  const flowBelgium     = xb('beIn') - xb('beOut');
  const flowNetherlands = xb('nlIn') - xb('nlOut');
  const flowIreland     = -xb('ieOut');

  return {
    ldzTotalMcm: ldzTotalMcm,
    ldzMcm:      ldzMcm,                   // array of 12, matching LDZ_COLUMNS order
    powerMcm:    powerGwh / MCM_TO_GWH,
    indMcm:      indGwh   / MCM_TO_GWH,
    expMcm:      expGwh   / MCM_TO_GWH,
    injMcm:      injGwh   / MCM_TO_GWH,
    supplyUkcs:            ukcs,
    supplyStFergus:        stFergus,
    supplyNorway:          norway,
    supplyLng:             sup('lng'),
    supplyInterconnectors: sup('interconnectors'),
    supplyStorage:         sup('storage'),
    gwhTotal:    gwhTotal,
    carbonKtco2: carbonKtco2,
    flowBelgium:     flowBelgium,
    flowNetherlands: flowNetherlands,
    flowIreland:     flowIreland,
  };
}

// POST to /publications/gasday and return the parsed array
function postPublications(ids, fromDate, toDate) {
  const resp = UrlFetchApp.fetch(API_BASE + '/publications/gasday', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ publicationIds: ids, fromDate: fromDate, toDate: toDate }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('API request failed (HTTP ' + code + '): ' + resp.getContentText().substring(0, 300));
  }
  return JSON.parse(resp.getContentText());
}


// ─────────────────────────────────────────────────────────────
// WRITE ROW — append one row to the data sheet
// ─────────────────────────────────────────────────────────────
function writeRow(dateStr, v) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  const row = [
    dateStr,                     // A: date
    round(v.ldzTotalMcm),        // B: ldz_total (mcm)
  ]
  .concat(v.ldzMcm.map(x => round(x)))  // C–N: per-LDZ (12 zones, mcm)
  .concat([
    round(v.powerMcm),           // O: power (mcm)
    round(v.indMcm),             // P: industrial (mcm)
    round(v.expMcm),             // Q: exports (mcm)
    round(v.supplyUkcs),            // R: supply_ukcs (mcm, UK-only beach)
    round(v.supplyLng),             // S: supply_lng (mcm)
    round(v.supplyInterconnectors), // T: supply_interconnectors (mcm)
    round(v.supplyStorage),         // U: supply_storage (mcm)
    round(v.gwhTotal, 1),        // V: gwh_total
    round(v.carbonKtco2, 2),     // W: carbon_ktco2
    round(v.injMcm),             // X: storage_injection (mcm)
    round(v.supplyNorway),       // Y: supply_norway (mcm, Langeled import)
    round(v.flowBelgium),        // Z: flow_belgium (mcm, net import +)
    round(v.flowNetherlands),    // AA: flow_netherlands (mcm, net import +)
    round(v.flowIreland),        // AB: flow_ireland (mcm, net import +, usually export -)
    round(v.supplyStFergus),     // AC: supply_stfergus (mcm, UK + Norwegian Vesterled)
  ]);

  sheet.appendRow(row);
}


// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function getPreviousGasDate() {
  // Gas day D demand finalises around noon on D+1. Running early afternoon UK,
  // the previous complete gas day is "yesterday".
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now;
}

function dateAlreadyExists(dateStr) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  return getExistingDates(sheet).has(dateStr);
}

// Read column A (from row 3 down) into a Set of 'YYYY-MM-DD' strings.
// Google Sheets auto-converts a written "2022-01-01" into a Date object, so
// values come back as Dates, not strings — we must format them, not toString()
// them, or the dedup check silently fails and rows get written twice.
function getExistingDates(sheet) {
  const last = sheet.getLastRow();
  if (last < 3) return new Set();
  const tz     = sheet.getParent().getSpreadsheetTimeZone();
  const values = sheet.getRange(3, 1, last - 2, 1).getValues();
  const set = new Set();
  values.forEach(r => {
    const s = normalizeDate(r[0], tz);
    if (s) set.add(s);
  });
  return set;
}

// Turn a sheet cell (Date object or string) into a 'YYYY-MM-DD' string
function normalizeDate(v, tz) {
  if (v === '' || v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  return v.toString().substring(0, 10);
}

function round(v, dp = 3) {
  const factor = Math.pow(10, dp);
  return Math.round((v || 0) * factor) / factor;
}


// ─────────────────────────────────────────────────────────────
// CLEANUP — remove duplicate date rows, keeping the first of each.
// Run once to fix a sheet that was backfilled with the old (buggy) dedup.
// Reads everything, keeps one row per date in original order, rewrites in place.
// ─────────────────────────────────────────────────────────────
function removeDuplicates() {
  const sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const last    = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (last < 3) { Logger.log('Nothing to clean.'); return; }

  const tz    = sheet.getParent().getSpreadsheetTimeZone();
  const range = sheet.getRange(3, 1, last - 2, lastCol);
  const rows  = range.getValues();

  const seen = new Set();
  const keep = [];
  rows.forEach(r => {
    const s = normalizeDate(r[0], tz);
    if (!s || seen.has(s)) return;
    seen.add(s);
    keep.push(r);
  });

  range.clearContent();
  if (keep.length) sheet.getRange(3, 1, keep.length, lastCol).setValues(keep);
  Logger.log('Kept ' + keep.length + ' rows, removed ' + (rows.length - keep.length) + ' duplicates.');
}


// ─────────────────────────────────────────────────────────────
// QUICK TEST — print one day's values to the log without writing
// ─────────────────────────────────────────────────────────────
function testFetch() {
  const dateStr = Utilities.formatDate(getPreviousGasDate(), 'Europe/London', 'yyyy-MM-dd');
  Logger.log(JSON.stringify(fetchGasDay(dateStr), null, 2));
}
