/* room.js — renders quote cards from data/quotes.json */

const CONTROLLABILITY_LABEL = {
  local_modbus: { cls: 'flag-good', prefix: '✓' },
  cloud_only:   { cls: 'flag-warn', prefix: '△' },
  none:         { cls: 'flag-warn', prefix: '△' },
};

function fmtDeviation(actual, design, unit) {
  if (actual === null || actual === undefined) return '';
  const diff = actual - design;
  if (Math.abs(diff) < 0.01) return '<span class="dev mono">(as designed)</span>';
  const sign = diff > 0 ? '+' : '−';
  const abs  = Math.abs(diff);
  const val  = Number.isInteger(abs) ? abs : abs.toFixed(1);
  return `<span class="dev mono">(${sign}${val} ${unit} vs design)</span>`;
}

function priceIncludes(price) {
  if (price.includes_scaffolding && price.includes_dno) return 'inc. VAT, scaffolding &amp; DNO';
  if (price.includes_scaffolding)                        return 'inc. VAT &amp; scaffolding';
  return 'inc. VAT';
}

function renderSubmitted(q, isBest) {
  const { installer: ins, hardware: hw, price, computed: c } = q;
  const ctrl = CONTROLLABILITY_LABEL[hw.inverter.controllability] || CONTROLLABILITY_LABEL.none;

  const panelDev   = fmtDeviation(hw.panels.watts,   null, 'W');    // filled below
  const battDev    = fmtDeviation(hw.battery.kwh,    null, 'kWh');  // filled below

  // deviation is computed against round.design (passed in via renderAll)
  const panelLabel = `${hw.panels.count} × ${hw.panels.make} ${hw.panels.model} ${hw.panels.watts} W`;
  const battLabel  = `${hw.battery.make} ${hw.battery.model} ${hw.battery.kwh} kWh`;

  return `
  <article class="quote${isBest ? ' best' : ''}" aria-label="Quote from ${ins.name}">
    <div class="q-top">
      <div>
        <div class="who">${ins.name}</div>
        <div class="meta">MCS <span class="mono">${ins.mcs_number}</span> · ${ins.consumer_code} · ★ ${ins.google_rating} (${ins.review_count})</div>
      </div>
      ${isBest ? '<span class="bestflag">Best return</span>' : ''}
    </div>
    <div class="q-price">
      <span class="num">£${price.total_inc_vat.toLocaleString('en-GB')}</span>
      <span class="vat">${priceIncludes(price)}</span>
    </div>
    <div class="q-table">
      <div class="row"><span class="k">Panels</span><span class="v" data-panel-dev="${q.id}"></span></div>
      <div class="row"><span class="k">Inverter</span><span class="v">
        ${hw.inverter.make} ${hw.inverter.model}<br>
        <span class="${ctrl.cls}">${ctrl.prefix} ${hw.inverter.controllability_note}</span>
      </span></div>
      <div class="row"><span class="k">Battery</span><span class="v" data-batt-dev="${q.id}"></span></div>
      <div class="row"><span class="k">Workmanship warranty</span><span class="v">${q.warranty_years} years${q.warranty_years >= 10 ? ', HIES-insured' : ''}</span></div>
      <div class="row"><span class="k">Lead time</span><span class="v">${q.lead_time_weeks.min}–${q.lead_time_weeks.max} weeks</span></div>
    </div>
    <div class="scored">
      <div class="headline">Payback ${c.payback_years} yrs · £${c.lifetime_return_gbp.toLocaleString('en-GB')} lifetime return</div>
      <div class="why">${scoringWhy(q)}</div>
    </div>
    <div class="q-actions">
      <button type="button" class="btn${isBest ? '' : ' ghost'}" data-choose="${q.id}">Choose for survey</button>
      <span class="note">${isBest ? 'Releases your name, email and address to this firm only.' : 'Releases your details to this firm only.'}</span>
    </div>
  </article>`;
}

function scoringWhy(q) {
  const c = q.computed;
  if (q.hardware.battery.kwh > 5.0) {
    return `Bigger battery raises the price but lifts self-use to ${c.self_use_pct}%. Scored by the MyGridGB model on the same MCS solar data as your estimate.`;
  }
  return `Cheapest and fastest. ${q.hardware.panels.watts < 475 ? 'Slightly lower generation from smaller panels; ' : ''}shorter warranty is the main trade-off.`;
}

function renderPending(q) {
  return `
  <article class="quote q-pending" aria-label="Awaiting quote from ${q.installer.name}">
    <div>
      <strong>${q.installer.name}</strong><br>
      invited — quote not yet in.<br>
      Firms that miss the window lose their place on future rounds.
    </div>
  </article>`;
}

function renderAll(data) {
  const round  = data.round;
  const quotes = data.quotes;

  // Compute best: highest lifetime_return_gbp among submitted
  const submitted = quotes.filter(q => q.status === 'submitted');
  const bestId = submitted.reduce((best, q) =>
    q.computed.lifetime_return_gbp > (best?.computed.lifetime_return_gbp ?? -Infinity) ? q : best
  , null)?.id;

  // Render room header
  const closeDate = new Date(round.window_closes_at);
  const closeFmt  = closeDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const submitted_count = submitted.length;

  document.getElementById('room-ref').textContent   = round.reference;
  document.getElementById('room-area').textContent  = round.postcode_area;
  document.getElementById('room-close').textContent = closeFmt;
  document.getElementById('room-ratio').textContent = `${submitted_count} of ${round.invited_count} quotes in`;

  const chip = document.getElementById('design-chip');
  const d = round.design;
  chip.innerHTML = `
    ${(d.panel_count * d.panel_watts / 1000).toFixed(2)} kWp · ${d.panel_count} × ${d.panel_watts} W<br>
    ${d.battery_kwh} kWh battery · ${d.azimuth_label} ${d.tilt_deg}°<br>
    <span class="dim">est. ${d.est_generation_kwh_yr.toLocaleString('en-GB')} kWh/yr · ref ${round.reference}</span>`;

  // Render cards
  const grid = document.getElementById('quote-grid');
  grid.innerHTML = quotes.map(q =>
    q.status === 'pending' ? renderPending(q) : renderSubmitted(q, q.id === bestId)
  ).join('');

  // Fill deviations now that DOM exists
  quotes.filter(q => q.status === 'submitted').forEach(q => {
    const hw = q.hardware;
    const panelDev = fmtDeviation(hw.panels.watts,  d.panel_watts, 'W');
    const battDev  = fmtDeviation(hw.battery.kwh,   d.battery_kwh, 'kWh');
    const panelLabel = `${hw.panels.count} × ${hw.panels.make} ${hw.panels.model} ${hw.panels.watts} W`;
    const battLabel  = `${hw.battery.make} ${hw.battery.model} ${hw.battery.kwh} kWh`;

    const panelEl = document.querySelector(`[data-panel-dev="${q.id}"]`);
    const battEl  = document.querySelector(`[data-batt-dev="${q.id}"]`);
    if (panelEl) panelEl.innerHTML = `${panelLabel} ${panelDev}`;
    if (battEl)  battEl.innerHTML  = `${battLabel} ${battDev}`;
  });

  // Wire up Choose buttons
  document.querySelectorAll('[data-choose]').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = quotes.find(q => q.id === btn.dataset.choose);
      showConfirmation(q);
    });
  });
}

function showConfirmation(q) {
  const box = document.getElementById('confirm-box');
  document.getElementById('confirm-name').textContent = q.installer.name;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // disable all choose buttons after a choice
  document.querySelectorAll('[data-choose]').forEach(b => b.disabled = true);
}

fetch('data/quotes.json')
  .then(r => r.json())
  .then(renderAll)
  .catch(err => {
    document.getElementById('quote-grid').innerHTML =
      `<p style="color:red;padding:20px">Failed to load quotes.json: ${err.message}</p>`;
  });
