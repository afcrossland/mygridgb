/* room.js — installer groups with multiple designs, progressive quote reveal */

const CTRL_CLS = { local_modbus: 'flag-good', cloud_only: 'flag-warn', none: 'flag-warn' };
const CTRL_PFX = { local_modbus: '✓', cloud_only: '△', none: '△' };

// Demo: quotes "arrive" after these delays (ms)
const ARRIVAL_DELAYS = [2800, 5500];

// ── Helpers ───────────────────────────────────────────────────────────────────

function inclStr(price) {
  if (price.includes_scaffolding && price.includes_dno) return 'inc. VAT, scaffolding & DNO';
  if (price.includes_scaffolding)                        return 'inc. VAT & scaffolding';
  return 'inc. VAT';
}

function designChipHtml(d, ref) {
  return `${(d.panel_count * d.panel_watts / 1000).toFixed(2)} kWp · ${d.panel_count} × ${d.panel_watts} W<br>
    ${d.battery_kwh} kWh battery · ${d.azimuth_label} ${d.tilt_deg}°<br>
    <span class="dim">est. ${d.est_generation_kwh_yr.toLocaleString('en-GB')} kWh/yr · ref ${ref}</span>`;
}

function certBadge(has, label) {
  return `<span class="cert ${has ? 'cert-yes' : 'cert-no'}">${has ? '✓' : '○'} ${label}</span>`;
}

// ── Design card ───────────────────────────────────────────────────────────────

function renderDesign(design, ins, d) {
  const hw = design.hardware;
  const c  = design.computed;
  const w  = design.warranty;
  const inv = hw.inverters[0];
  const ctrlCls = CTRL_CLS[inv.controllability] || CTRL_CLS.none;
  const ctrlPfx = CTRL_PFX[inv.controllability] || CTRL_PFX.none;

  const invLabel = inv.count > 1 ? `${inv.count} × ${inv.type} inverters` : `1 × ${inv.type} inverter`;
  const pct = c.pct_consumption_met;

  return `
  <div class="q-design" aria-label="${design.label}">
    <div class="q-design-label">${design.label}</div>

    <div class="q-price">
      <span class="num">£${design.price.total_inc_vat.toLocaleString('en-GB')}</span>
      <span class="vat">${inclStr(design.price)}</span>
    </div>

    <div class="q-specs">
      <div class="spec-block">
        <div class="spec-primary">${hw.panels.kwp} kWp</div>
        <div class="spec-secondary">${hw.panels.count} × ${hw.panels.watts} W panels</div>
        <div class="spec-brand">${hw.panels.make} ${hw.panels.model}</div>
      </div>
      <div class="spec-block">
        <div class="spec-primary">${hw.battery.kwh} kWh</div>
        <div class="spec-secondary">battery storage</div>
        <div class="spec-brand">${hw.battery.make} ${hw.battery.model}</div>
      </div>
      <div class="spec-block spec-block-full">
        <div class="spec-secondary">${invLabel}</div>
        <div class="spec-brand">${inv.make} ${inv.model}</div>
        <div class="${ctrlCls}" style="margin-top:3px;font-size:12px">${ctrlPfx} ${inv.controllability_note}</div>
      </div>
    </div>

    ${design.notes ? `<div class="q-note">${design.notes}</div>` : ''}

    <div class="q-table">
      <div class="row"><span class="k">PV panels</span><span class="v">${w.panel_product_years} yr product · ${w.panel_performance_years} yr performance</span></div>
      <div class="row"><span class="k">Battery</span><span class="v">${w.battery_years} yr warranty</span></div>
      <div class="row"><span class="k">Installation</span><span class="v">${w.installation_years} yr warranty</span></div>
      <div class="row"><span class="k">Est. lead time</span><span class="v">${design.lead_time_weeks.min}–${design.lead_time_weeks.max} weeks</span></div>
    </div>

    <div class="scored">
      <div class="consumption-bar-wrap">
        <div class="consumption-bar"><div class="consumption-fill" style="width:${pct}%"></div></div>
        <div class="consumption-pct">${pct}%</div>
      </div>
      <div class="headline">Est. ${pct}% of annual electricity consumption met</div>
      <div class="why">${c.est_generation_kwh_yr.toLocaleString('en-GB')} kWh/yr estimated generation · based on MCS irradiance data for your area</div>
    </div>

  </div>`;
}

// ── Installer group ───────────────────────────────────────────────────────────

function installerInfoFor(id, localInstallers) {
  return localInstallers.find(i => i.id === id) || {};
}

function renderGroupHeader(quote, local) {
  const info = local || {};
  return `
  <div class="q-group-header">
    <div class="q-group-meta">
      <div class="q-group-name">${quote.installer.name}${info.website ? ` <a class="ins-web" href="${info.website}" target="_blank" rel="noopener">website ↗</a>` : ''}</div>
      <div class="q-group-creds">
        MCS <span class="mono">${quote.installer.mcs_number}</span> ·
        ${quote.installer.consumer_code} ·
        ★ ${quote.installer.google_rating} (${quote.installer.review_count} reviews)
        ${info.mcs !== undefined ? '<span class="cert-row">' + certBadge(info.mcs,'MCS') + certBadge(info.recc,'RECC') + certBadge(info.hies,'HIES') + '</span>' : ''}
      </div>
    </div>
    <button class="btn ghost choose-btn" data-ins-id="${quote.installer_id}" data-ins-name="${quote.installer.name}">
      Request survey
    </button>
  </div>`;
}

function renderWaitingGroup(quote) {
  return `
  <div class="q-group q-group-waiting group-arriving" id="group-${quote.installer_id}">
    <div class="q-group-header">
      <div class="q-group-meta">
        <div class="q-group-name">${quote.installer.name}</div>
        <div class="q-group-creds">MCS ${quote.installer.mcs_number} · ${quote.installer.consumer_code} · ★ ${quote.installer.google_rating}</div>
      </div>
    </div>
    <div class="q-waiting-row">
      <div class="waiting-spinner"></div>
      <span>Waiting for proposal…</span>
    </div>
  </div>`;
}

function renderPendingGroup(quote) {
  return `
  <div class="q-group q-group-pending group-arriving" id="group-${quote.installer_id}">
    <div class="q-group-header">
      <div class="q-group-meta">
        <div class="q-group-name">${quote.installer.name}</div>
        <div class="q-group-creds">MCS ${quote.installer.mcs_number} · ${quote.installer.consumer_code} · ★ ${quote.installer.google_rating}</div>
      </div>
    </div>
    <div class="q-waiting-row" style="opacity:.55">
      Invited — proposal not yet submitted. Firms that miss the window lose their place on future rounds.
    </div>
  </div>`;
}

function renderSubmittedGroup(quote, localInfo, d) {
  const designs = quote.designs.map(design =>
    renderDesign(design, quote.installer, d)
  ).join('');
  return `
  <div class="q-group group-arriving" id="group-${quote.installer_id}">
    ${renderGroupHeader(quote, localInfo)}
    <div class="q-designs">${designs}</div>
  </div>`;
}

// ── "More installers" section ─────────────────────────────────────────────────

function renderMoreInstallers(localInstallers, invitedIds, onInvite) {
  const uninvited = localInstallers.filter(i => !invitedIds.has(i.id));
  const section   = document.getElementById('more-section');
  const list      = document.getElementById('more-list');
  if (uninvited.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = uninvited.map(ins => `
    <div class="more-ins-row" id="more-${ins.id}">
      <div class="ins-card-main">
        <div class="ins-name">${ins.name}${ins.website ? ` <a class="ins-web" href="${ins.website}" target="_blank" rel="noopener">website ↗</a>` : ''}</div>
        <div class="ins-addr">${ins.address}</div>
        <div class="ins-certs">${certBadge(ins.mcs,'MCS')}${certBadge(ins.recc,'RECC')}${certBadge(ins.hies,'HIES')}</div>
      </div>
      <div class="ins-card-rating">
        <div class="ins-stars">★ ${ins.google_rating}</div>
        <div class="ins-review-count">${ins.review_count} reviews</div>
      </div>
      <button class="btn ghost more-invite-btn" data-ins-id="${ins.id}">Invite</button>
    </div>
  `).join('');

  list.querySelectorAll('.more-invite-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.insId;
      document.getElementById(`more-${id}`)?.remove();
      onInvite(id);
      if (list.children.length === 0) section.style.display = 'none';
    });
  });
}

// ── Survey selection bar ──────────────────────────────────────────────────────

const surveySelected = new Set();

function updateSurveyBar() {
  const bar = document.getElementById('survey-bar');
  const n   = surveySelected.size;
  bar.hidden = n === 0;
  document.getElementById('survey-bar-count').textContent =
    `${n} installer${n > 1 ? 's' : ''} selected for survey`;
}

function toggleSurvey(btn) {
  const id   = btn.dataset.insId;
  const name = btn.dataset.insName;
  if (surveySelected.has(id)) {
    surveySelected.delete(id);
    btn.textContent = 'Request survey';
    btn.classList.add('ghost');
  } else {
    surveySelected.add(id);
    btn.textContent = '✓ Survey requested';
    btn.classList.remove('ghost');
  }
  updateSurveyBar();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

fetch('data/quotes.json')
  .then(r => r.json())
  .then(data => {
    const round  = data.round;
    const d      = round.design;
    const quotes = data.quotes;

    // Header
    document.getElementById('room-ref').textContent  = round.reference;
    document.getElementById('room-area').textContent = round.postcode_area + ' area';
    document.getElementById('design-chip').innerHTML = designChipHtml(d, round.reference);
    document.getElementById('room-close').textContent =
      new Date(round.window_closes_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });


    const invitedIds = new Set(round.invited_installer_ids);
    const localMap   = Object.fromEntries(data.local_installers.map(i => [i.id, i]));
    const groups     = document.getElementById('quote-groups');

    const submitted = quotes.filter(q => q.status === 'submitted');
    const pending   = quotes.filter(q => q.status === 'pending');
    let arrived = 0;

    function updateRatio() {
      document.getElementById('room-ratio').textContent =
        `${arrived} of ${invitedIds.size} proposals in`;
    }

    // Render all groups initially as waiting/pending
    quotes.forEach(q => {
      const el = document.createElement('div');
      el.innerHTML = q.status === 'pending'
        ? renderPendingGroup(q)
        : renderWaitingGroup(q);
      groups.appendChild(el.firstElementChild);
    });

    // Schedule submitted quote arrivals
    submitted.forEach((q, i) => {
      const delay = ARRIVAL_DELAYS[i] ?? (ARRIVAL_DELAYS[ARRIVAL_DELAYS.length - 1] + (i - ARRIVAL_DELAYS.length + 1) * 3000);
      setTimeout(() => {
        const existing = document.getElementById(`group-${q.installer_id}`);
        const html     = renderSubmittedGroup(q, localMap[q.installer_id], d);
        const tmp      = document.createElement('div');
        tmp.innerHTML  = html;
        existing.replaceWith(tmp.firstElementChild);

        // Bind survey toggle buttons (one per installer group header)
        document.querySelectorAll('.choose-btn').forEach(btn => {
          if (!btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => toggleSurvey(btn));
          }
        });

        arrived++;
        updateRatio();
        if (arrived === submitted.length) {
          document.getElementById('norm-note').style.display = '';
        }
      }, delay);
    });

    // "Add more installers" section
    renderMoreInstallers(data.local_installers, invitedIds, (newId) => {
      invitedIds.add(newId);
      const ins       = localMap[newId];
      const fakeQuote = {
        installer_id: newId,
        installer: { name: ins.name, mcs_number: '—', consumer_code: ins.recc ? 'RECC' : ins.hies ? 'HIES' : 'MCS', google_rating: ins.google_rating, review_count: ins.review_count },
        status: 'pending',
        designs: [],
      };
      const tmp = document.createElement('div');
      tmp.innerHTML = renderPendingGroup(fakeQuote);
      groups.appendChild(tmp.firstElementChild);
      updateRatio();
    });

    updateRatio();

    // Inject survey action bar
    document.body.insertAdjacentHTML('beforeend', `
      <div class="survey-bar" id="survey-bar" hidden>
        <span id="survey-bar-count"></span>
        <a href="survey.html" class="survey-bar-btn">Proceed to binding quotes →</a>
      </div>`);
  })
  .catch(err => {
    document.getElementById('quote-groups').innerHTML =
      `<p style="color:red;padding:16px">Failed to load quotes: ${err.message}</p>`;
  });
