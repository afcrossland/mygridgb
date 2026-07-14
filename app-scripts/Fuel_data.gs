// ============================================================
// UK FUEL DEMAND + IMPORTS — Google Apps Script (dedicated)
// Writes to two tabs of:
// https://docs.google.com/spreadsheets/d/1sECfXJOZx1MGoRDIllBhPoyijTe0UGri2wBYF-VM5HI
//
//   fuel_data    — monthly demand by product         (from DESNZ ET 3.13)
//   fuel_imports — monthly imports by origin country (from DESNZ ET 3.14)
//
// SOURCE: DESNZ "Energy Trends", section 3 (oil & oil products). Monthly,
//   ~2 months in arrears, published the last Thursday of each month.
//   https://www.gov.uk/government/statistics/oil-and-oil-products-section-3-energy-trends
//   ET 3.13 = Deliveries of petroleum products for inland consumption (kt).
//   ET 3.14 = Imports of primary oil and petroleum products by country (kt).
//   ET 3.10 = Indigenous production — added to fuel_imports as origin "United
//             Kingdom" so the chart shows domestic supply alongside imports.
//
// Each release is an .xlsx whose download URL changes every month. The script
// scrapes the current link, downloads and unzips the file (an .xlsx is a zip of
// XML — no add-on services needed) and reads its "Month" worksheet, then FULLY
// REWRITES the target tab. Full rewrite is deliberate: DESNZ revises recent
// ("[provisional]") months, and re-reading the whole series keeps those.
//
// SETUP:
// 1. Apps Script → paste this file, save.
// 2. Run updateAllFuel() once to authorise and create/fill both tabs.
// 3. Add a weekly time-based trigger on updateAllFuel().
//
// fuel_data columns (row 1 header, kt):
//   date · petrol · diesel_road · jet_fuel · kerosene_heating · red_diesel ·
//   fuel_oil · other · total · provisional
// fuel_imports columns (row 1 header, kt; one row per month × origin country):
//   date · origin · crude · petrol · jet_fuel · diesel_road · red_diesel · total
// ============================================================

const FUEL_SHEET_ID   = '1sECfXJOZx1MGoRDIllBhPoyijTe0UGri2wBYF-VM5HI';
const ET_SECTION3_URL = 'https://www.gov.uk/government/statistics/oil-and-oil-products-section-3-energy-trends';

const FUEL_SHEET_NAME    = 'fuel_data';
const FUEL_HEADER        = ['date', 'petrol', 'diesel_road', 'jet_fuel', 'kerosene_heating',
                            'red_diesel', 'fuel_oil', 'other', 'total', 'provisional'];

const IMPORTS_SHEET_NAME = 'fuel_imports';
const IMPORTS_HEADER     = ['date', 'origin', 'crude', 'petrol', 'jet_fuel',
                            'diesel_road', 'red_diesel', 'total'];

const MONTH_NUM = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Header-label → column-key patterns (matched against each table's header row,
// so a future column insertion can't silently misalign the data).
const DEMAND_COLPATS = [
  ['total',       /\btotal\b/],
  ['petrol',      /\bpetrol\b/],          // not "petroleum"
  ['diesel_road', /white\s+diesel|derv/],
  ['jet_fuel',    /jet\s+fuel|aviation\s+turbine/],
  ['kerosene',    /burning\s+oil|kerosene/],
  ['red_diesel',  /red\s+diesel|gas\s*oil/],
  ['fuel_oil',    /fuel\s+oil/],
];
const IMPORT_COLPATS = [
  ['crude',       /crude/],
  ['petrol',      /\bpetrol\b/],
  ['jet_fuel',    /aviation\s+turbine/],
  ['diesel_road', /white\s+diesel/],
  ['red_diesel',  /red\s+diesel|gas\s*oil/],
  ['total',       /^total$/],             // grand total (after notes are stripped)
];


// ─────────────────────────────────────────────────────────────
// MAIN — set the weekly trigger on updateAllFuel()
// ─────────────────────────────────────────────────────────────
function updateAllFuel() {
  updateFuelData();
  updateFuelImports();
}

function updateFuelData() {
  const rows = parseEt('3.13', parseDemandRows);
  if (!rows.length) throw new Error('Parsed 0 rows from ET 3.13 — aborting (fuel_data unchanged).');
  writeSheet(FUEL_SHEET_NAME, FUEL_HEADER, rows);
}

function updateFuelImports() {
  const rows = parseEt('3.14', parseImportRows);
  if (!rows.length) throw new Error('Parsed 0 rows from ET 3.14 — aborting (fuel_imports unchanged).');

  // Add UK indigenous production (ET 3.10) as a "United Kingdom" origin, so the
  // chart shows domestic supply alongside imports. This is crude + NGLs only —
  // the UK produces no primary petrol/diesel/jet — so those product columns are
  // left at 0. Only add months within the imports date range.
  const uk = parseEt('3.10', parseUkProduction);
  const minDate = rows.reduce((m, r) => (r[0] < m ? r[0] : m), '9999');
  uk.forEach(u => {
    if (u.date >= minDate) rows.push([u.date, 'United Kingdom', u.crude, 0, 0, 0, 0, u.total]);
  });

  writeSheet(IMPORTS_SHEET_NAME, IMPORTS_HEADER, rows);
}


// ─────────────────────────────────────────────────────────────
// Download + unzip an ET table's .xlsx and hand its "Month" sheet to `parseFn`
// ─────────────────────────────────────────────────────────────
function parseEt(code, parseFn) {
  const url = findEtUrl(code);
  Logger.log('ET ' + code + ' file: ' + url);
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('ET ' + code + ' download failed (HTTP ' + resp.getResponseCode() + ').');
  }
  const blob = resp.getBlob().setContentType('application/zip'); // .xlsx is a zip
  const map = {};
  Utilities.unzip(blob).forEach(f => { map[f.getName()] = f; });

  const sst = parseSharedStrings(map['xl/sharedStrings.xml']);
  const xml = map[findSheetPath(map, 'Month')].getDataAsString();
  return parseFn(readSheetRows(xml, sst));
}

// Locate the current ET x.y .xlsx download link on the gov.uk page
function findEtUrl(code) {
  const resp = UrlFetchApp.fetch(ET_SECTION3_URL, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Energy Trends page fetch failed (HTTP ' + resp.getResponseCode() + ').');
  }
  const re = new RegExp(
    'https://assets\\.publishing\\.service\\.gov\\.uk/media/[A-Za-z0-9]+/ET_' +
    code.replace('.', '\\.') + '_[A-Z]{3}_\\d{2}\\.xlsx');
  const m = resp.getContentText().match(re);
  if (!m) throw new Error('Could not find the ET ' + code + ' download link on the Energy Trends page.');
  return m[0];
}


// ─────────────────────────────────────────────────────────────
// XLSX helpers (regex-based; no add-on services)
// ─────────────────────────────────────────────────────────────

// Resolve a worksheet name → its xl/worksheets/sheetN.xml path
function findSheetPath(map, name) {
  const wb  = map['xl/workbook.xml'].getDataAsString();
  const rid = (wb.match(new RegExp('<sheet[^>]*name="' + name + '"[^>]*r:id="(rId\\d+)"')) || [])[1];
  if (!rid) throw new Error('Worksheet "' + name + '" not found in workbook.');
  const rels = map['xl/_rels/workbook.xml.rels'].getDataAsString();
  let target = (rels.match(new RegExp('Id="' + rid + '"[^>]*Target="([^"]+)"')) || [])[1];
  if (!target) throw new Error('Relationship for ' + rid + ' not found.');
  target = target.replace(/^\/+/, '');
  if (target.indexOf('xl/') !== 0) target = 'xl/' + target;
  return target;
}

function parseSharedStrings(blob) {
  if (!blob) return [];
  const xml = blob.getDataAsString();
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const parts = m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
    out.push(parts.map(t => t.replace(/<[^>]+>/g, '')).join(''));
  }
  return out;
}

function colNum(ref) {
  const L = ref.match(/^([A-Z]+)/)[1];
  let n = 0;
  for (let i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64);
  return n;
}

// Read a worksheet's XML into an ordered array of { colNum: value } maps
function readSheetRows(xml, sst) {
  const out = [];
  const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  const cellRe = /<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = {};
    let cm;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rm[2]))) {
      const vm = cm[3].match(/<v>([\s\S]*?)<\/v>/);
      if (!vm) continue;
      let v = vm[1];
      if (/t="s"/.test(cm[2])) v = sst[parseInt(v, 10)];
      cells[colNum(cm[1])] = v;
    }
    if (Object.keys(cells).length) out.push(cells);
  }
  return out;
}

// Map a header row's cells to column keys using label patterns
function detectCols(headerCells, patterns) {
  const cols = {};
  Object.keys(headerCells).forEach(k => {
    const label = stripNotes(headerCells[k]);
    patterns.forEach(([key, re]) => { if (!cols[key] && re.test(label)) cols[key] = +k; });
  });
  return cols;
}

function stripNotes(s) {
  return String(s == null ? '' : s).replace(/\[note[^\]]*\]/g, '').trim().toLowerCase();
}

function num(cells, c) {
  const v = parseFloat(cells[c]);
  return isNaN(v) ? 0 : v;
}

function round1(v) { return Math.round((v || 0) * 10) / 10; }


// ─────────────────────────────────────────────────────────────
// ET 3.13 — demand by product → fuel_data rows
// ─────────────────────────────────────────────────────────────
function parseDemandRows(rows) {
  let cols = null;
  for (let i = 0; i < rows.length && !cols; i++) {
    if (stripNotes(rows[i][1]) === 'date') cols = detectCols(rows[i], DEMAND_COLPATS);
  }
  if (!cols || !cols.total || !cols.petrol) throw new Error('ET 3.13 header/columns not found.');

  const out = [];
  rows.forEach(cells => {
    const d = String(cells[1] || '');
    const dm = d.match(/([A-Za-z]+)\s+(\d{4})/);
    if (!dm) return;
    const mn = MONTH_NUM[dm[1].toLowerCase()];
    if (!mn) return;

    const total   = num(cells, cols.total);
    const petrol  = num(cells, cols.petrol);
    const diesel  = num(cells, cols.diesel_road);
    const jet     = num(cells, cols.jet_fuel);
    const kero    = num(cells, cols.kerosene);
    const red     = num(cells, cols.red_diesel);
    const fueloil = num(cells, cols.fuel_oil);
    const other   = total - (petrol + diesel + jet + kero + red + fueloil); // reconciles to total

    out.push([
      dm[2] + '-' + ('0' + mn).slice(-2) + '-01',
      round1(petrol), round1(diesel), round1(jet), round1(kero),
      round1(red), round1(fueloil), round1(other), round1(total),
      /provisional/i.test(d) ? 'Y' : '',
    ]);
  });
  return out;
}


// ─────────────────────────────────────────────────────────────
// ET 3.14 — imports by origin country → fuel_imports rows
// ─────────────────────────────────────────────────────────────
function parseImportRows(rows) {
  let cols = null;
  for (let i = 0; i < rows.length && !cols; i++) {
    if (stripNotes(rows[i][1]) === 'year' && /origin/.test(stripNotes(rows[i][3]))) {
      cols = detectCols(rows[i], IMPORT_COLPATS);
      cols.year = 1; cols.month = 2; cols.origin = 3;
    }
  }
  if (!cols || !cols.total || !cols.origin) throw new Error('ET 3.14 header/columns not found.');

  const out = [];
  rows.forEach(cells => {
    const origin = String(cells[cols.origin] || '').trim();
    const mo = String(cells[cols.month] || '').trim().toLowerCase();
    const mn = MONTH_NUM[mo];
    const yr = parseInt(cells[cols.year], 10);
    if (!origin || /^total imports$/i.test(origin) || !mn || !yr) return;

    out.push([
      yr + '-' + ('0' + mn).slice(-2) + '-01',
      origin,
      round1(num(cells, cols.crude)),
      round1(num(cells, cols.petrol)),
      round1(num(cells, cols.jet_fuel)),
      round1(num(cells, cols.diesel_road)),
      round1(num(cells, cols.red_diesel)),
      round1(num(cells, cols.total)),
    ]);
  });
  return out;
}


// ─────────────────────────────────────────────────────────────
// ET 3.10 — UK indigenous production (crude + NGLs) → {date, crude, total}
// ─────────────────────────────────────────────────────────────
function parseUkProduction(rows) {
  // The header row is the one containing "crude oil".
  let cols = null;
  for (let i = 0; i < rows.length && !cols; i++) {
    if (Object.keys(rows[i]).some(k => /crude oil/.test(stripNotes(rows[i][k])))) {
      cols = {};
      Object.keys(rows[i]).forEach(k => {
        const label = stripNotes(rows[i][k]);
        if (!cols.crude && /crude oil/.test(label)) cols.crude = +k;
        if (!cols.total && /^total$/.test(label)) cols.total = +k; // first "Total" = indigenous production
      });
    }
  }
  if (!cols || !cols.total) throw new Error('ET 3.10 header/columns not found.');

  const out = [];
  rows.forEach(cells => {
    const d = String(cells[1] || '');
    const dm = d.match(/([A-Za-z]+)\s+(\d{4})/);
    if (!dm) return;
    const mn = MONTH_NUM[dm[1].toLowerCase()];
    if (!mn) return;
    const total = num(cells, cols.total);
    if (total <= 0) return;
    out.push({
      date: dm[2] + '-' + ('0' + mn).slice(-2) + '-01',
      crude: round1(num(cells, cols.crude)),
      total: round1(total),
    });
  });
  return out;
}


// ─────────────────────────────────────────────────────────────
// WRITE — full rewrite of a tab (handles revisions)
// ─────────────────────────────────────────────────────────────
function writeSheet(name, header, rows) {
  const ss = SpreadsheetApp.openById(FUEL_SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  SpreadsheetApp.flush();
  Logger.log('Wrote ' + rows.length + ' rows to "' + name + '" (latest: ' + rows[rows.length - 1][0] + ').');
}


// ─────────────────────────────────────────────────────────────
// QUICK TESTS — log a few rows without writing
// ─────────────────────────────────────────────────────────────
function testFuelFetch() {
  const rows = parseEt('3.13', parseDemandRows);
  Logger.log('ET 3.13 → ' + rows.length + ' months. ' + FUEL_HEADER.join(', '));
  rows.slice(-3).forEach(r => Logger.log(r.join('  ')));
}

function testImportsFetch() {
  const rows = parseEt('3.14', parseImportRows);
  Logger.log('ET 3.14 → ' + rows.length + ' rows. ' + IMPORTS_HEADER.join(', '));
  rows.slice(-6).forEach(r => Logger.log(r.join('  ')));
}
