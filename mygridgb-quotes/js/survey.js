/* survey.js — post-survey final quotes */

function designChipHtml(d, ref) {
  return `${(d.panel_count * d.panel_watts / 1000).toFixed(2)} kWp · ${d.panel_count} × ${d.panel_watts} W<br>
    ${d.battery_kwh} kWh battery · ${d.azimuth_label} ${d.tilt_deg}°<br>
    <span class="dim">ref ${ref}</span>`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function paymentRow(terms) {
  const rows = [];
  if (terms.deposit_pct)       rows.push(`${terms.deposit_pct}% deposit on booking`);
  if (terms.on_delivery_pct)   rows.push(`${terms.on_delivery_pct}% on equipment delivery`);
  if (terms.on_completion_pct) rows.push(`${terms.on_completion_pct}% on completion`);
  return rows.join(' · ');
}

function renderSurveyQuote(sq) {
  const hw  = sq.hardware;
  const inv = hw.inverters[0];
  const total = sq.price.total_inc_vat;
  const w   = sq.warranty;

  const breakdownRows = sq.price.breakdown
    .filter(b => b.gbp > 0)
    .map(b => `<div class="sq-line"><span>${b.item}</span><span class="sq-line-price">£${b.gbp.toLocaleString('en-GB')}</span></div>`)
    .join('');

  const changes = sq.changes_from_quote.map(c => `<li>${c}</li>`).join('');

  return `
  <article class="sq-card">
    <div class="sq-header">
      <div class="sq-header-left">
        <div class="sq-badge">Survey quote</div>
        <div class="sq-ins-name">${sq.installer.name}</div>
        <div class="sq-ins-meta">MCS <span class="mono">${sq.installer.mcs_number}</span> · ${sq.installer.consumer_code} · ★ ${sq.installer.google_rating} (${sq.installer.review_count} reviews)</div>
        <div class="sq-ins-meta" style="margin-top:4px">Surveyed by ${sq.surveyor} · ${fmtDate(sq.survey_date)}</div>
      </div>
      <div class="sq-total-block">
        <div class="sq-total-label">Total price</div>
        <div class="sq-total">£${total.toLocaleString('en-GB')}</div>
        <div class="sq-total-sub">inc. VAT (0%)</div>
      </div>
    </div>

    <div class="sq-body">

      <!-- System spec -->
      <div class="sq-section">
        <div class="sq-section-title">System specification</div>
        <div class="sq-spec-row">
          <div class="sq-spec-item">
            <div class="sq-spec-val">${hw.panels.kwp} kWp</div>
            <div class="sq-spec-desc">${hw.panels.count} × ${hw.panels.watts} W · ${hw.panels.make} ${hw.panels.model}</div>
          </div>
          <div class="sq-spec-item">
            <div class="sq-spec-val">${hw.battery.kwh} kWh</div>
            <div class="sq-spec-desc">${hw.battery.make} ${hw.battery.model}</div>
          </div>
          <div class="sq-spec-item">
            <div class="sq-spec-val">${inv.count} × inverter</div>
            <div class="sq-spec-desc">${inv.make} ${inv.model}</div>
          </div>
        </div>
        <div class="sq-based-on">Based on your <em>${sq.based_on_design_label}</em> quote room option</div>
      </div>

      <!-- Changes from quote -->
      ${changes ? `
      <div class="sq-section sq-changes">
        <div class="sq-section-title">Changes from original quote</div>
        <ul class="sq-change-list">${changes}</ul>
      </div>` : ''}

      <!-- Price breakdown -->
      <div class="sq-section">
        <div class="sq-section-title">Price breakdown</div>
        <div class="sq-breakdown">${breakdownRows}</div>
        <div class="sq-line sq-total-line">
          <span>Total inc. VAT</span>
          <span class="sq-line-price">£${total.toLocaleString('en-GB')}</span>
        </div>
        <div class="sq-payment-terms">${paymentRow(sq.payment_terms)}</div>
      </div>

      <!-- Warranty & timeline -->
      <div class="sq-section sq-meta-grid">
        <div>
          <div class="sq-section-title">Warranties</div>
          <div class="sq-meta-row"><span>PV panels</span><span>${w.panel_product_years} yr product · ${w.panel_performance_years} yr performance</span></div>
          <div class="sq-meta-row"><span>Battery</span><span>${w.battery_years} years</span></div>
          <div class="sq-meta-row"><span>Installation</span><span>${w.installation_years} years</span></div>
        </div>
        <div>
          <div class="sq-section-title">Installation</div>
          <div class="sq-meta-row"><span>Window</span><span>${sq.installation_window}</span></div>
          <div class="sq-meta-row"><span>Duration</span><span>${sq.duration_days} day${sq.duration_days > 1 ? 's' : ''}</span></div>
          <div class="sq-meta-row"><span>MCS cert</span><span>${sq.mcs_certificate ? '✓ Included' : 'Not included'}</span></div>
        </div>
      </div>

      ${sq.installer_notes ? `<div class="sq-notes">${sq.installer_notes}</div>` : ''}

      <div class="sq-email-note">
        📧 The full quote with all details has been sent to your email — use that as your record when contacting the installer to proceed.
      </div>

      <div class="sq-actions">
        <a href="review.html" class="btn sq-complete-btn">Installation complete — leave a review →</a>
        <span class="note">Only click once your installation is finished.</span>
      </div>

    </div>
  </article>`;
}

const ARRIVAL_DELAYS = [4000, 7500];

function renderWaitingSlot(sq) {
  return `
  <div class="sq-waiting group-arriving" id="sq-wait-${sq.installer_id}">
    <div class="waiting-spinner"></div>
    <div>
      <div class="sq-wait-name">${sq.installer.name}</div>
      <div class="sq-wait-label">Survey scheduled — waiting for final quote…</div>
    </div>
  </div>`;
}

fetch('data/survey-quotes.json')
  .then(r => r.json())
  .then(data => {
    document.getElementById('room-ref').textContent  = data.round_reference;
    document.getElementById('room-area').textContent = data.postcode_area + ' area';
    document.getElementById('design-chip').innerHTML = designChipHtml(data.design, data.round_reference);

    const quotes = data.survey_quotes;
    const grid   = document.getElementById('survey-grid');

    // Start: all slots show as waiting
    grid.innerHTML = quotes.map(renderWaitingSlot).join('');

    // Arrive one by one
    quotes.forEach((sq, i) => {
      const delay = ARRIVAL_DELAYS[i] ?? (ARRIVAL_DELAYS[ARRIVAL_DELAYS.length - 1] + (i - ARRIVAL_DELAYS.length + 1) * 4000);
      setTimeout(() => {
        const slot = document.getElementById(`sq-wait-${sq.installer_id}`);
        if (!slot) return;
        const html = renderSurveyQuote(sq);
        const tmp  = document.createElement('div');
        tmp.innerHTML = html;
        const card = tmp.firstElementChild;
        card.classList.add('group-arriving');
        slot.replaceWith(card);
      }, delay);
    });
  })
  .catch(err => {
    document.getElementById('survey-grid').innerHTML =
      `<p style="color:red;padding:16px">Failed to load: ${err.message}</p>`;
  });
