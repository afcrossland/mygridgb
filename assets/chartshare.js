/* chartshare.js — download / share any Chart.js chart as a branded PNG card.
 *
 *   ChartShare.attach('my-canvas-id', {
 *     title:    'Chart headline',
 *     subtitle: 'optional one-liner',       // optional
 *     source:   'Source: NESO, National Gas' // optional
 *   });
 *
 * Uses the chart's own rendered pixels (chart.toBase64Image) so the export
 * matches the site exactly, then frames it with MyGridGB branding.
 */
(function () {
  const BRAND = '#1a4d7a';
  const INK   = '#1f2937';
  const MUTED = '#6b7280';
  const BG    = '#ffffff';
  const SERIF = "'DM Serif Display', Georgia, serif";
  const SANS  = "'DM Sans', system-ui, -apple-system, Arial, sans-serif";
  const SITE  = 'mygridgb.co.uk';

  const fmtDate = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Draw the branded card and return a canvas.
  async function buildCard(chart, opts) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

    const src = chart.canvas;
    const rect = src.getBoundingClientRect();
    const cw = Math.round(rect.width) || src.width;
    const ch = Math.round(rect.height) || src.height;

    const PAD = 32;
    const rowWord = 34, rowTitle = opts.title ? 30 : 0, rowSub = opts.subtitle ? 22 : 0, gap = 18;
    const HEAD = PAD + rowWord + rowTitle + rowSub + gap;    // matches the draw cursor below
    const FOOT = 44;
    const W = cw + PAD * 2;
    const H = HEAD + ch + FOOT + PAD;
    const S = 2;                                             // retina scale

    const out = document.createElement('canvas');
    out.width = W * S;
    out.height = H * S;
    const g = out.getContext('2d');
    g.scale(S, S);

    // background
    g.fillStyle = BG;
    g.fillRect(0, 0, W, H);

    // ── header ──
    let y = PAD;
    g.textBaseline = 'alphabetic';
    g.font = `400 22px ${SERIF}`;
    g.fillStyle = BRAND;
    g.fillText('MyGridGB', PAD, y + 18);
    g.font = `500 13px ${SANS}`;
    g.fillStyle = MUTED;
    g.textAlign = 'right';
    g.fillText(SITE, W - PAD, y + 16);
    g.textAlign = 'left';
    y += rowWord;

    if (opts.title) {
      g.font = `600 19px ${SANS}`;
      g.fillStyle = INK;
      g.fillText(opts.title, PAD, y + 18, W - PAD * 2);
      y += rowTitle;
    }
    if (opts.subtitle) {
      g.font = `400 13px ${SANS}`;
      g.fillStyle = MUTED;
      g.fillText(opts.subtitle, PAD, y + 13, W - PAD * 2);
      y += rowSub;
    }
    y += gap;

    // ── chart ──
    g.drawImage(src, PAD, y, cw, ch);

    // ── footer ──
    const fy = y + ch + PAD - 8;
    g.font = `400 12px ${SANS}`;
    g.fillStyle = MUTED;
    if (opts.source) g.fillText(opts.source, PAD, fy + 14, W - PAD * 2 - 130);
    g.textAlign = 'right';
    g.fillText('As of ' + fmtDate(new Date()), W - PAD, fy + 14);
    g.textAlign = 'left';

    return out;
  }

  function canvasToBlob(canvas) {
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  async function makeImage(canvasId, opts) {
    const chart = window.Chart && Chart.getChart(canvasId);
    if (!chart) throw new Error('No chart found for #' + canvasId);
    const card = await buildCard(chart, opts);
    const blob = await canvasToBlob(card);
    return { blob, dataUrl: card.toDataURL('image/png') };
  }

  function download(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copyToClipboard(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); return true; }
    catch (e) { return false; }
  }

  // Share the image directly (no download step): native share sheet where
  // available, otherwise copy the PNG to the clipboard to paste into a post.
  async function share(blob, opts) {
    const file = new File([blob], (opts.filename || 'mygridgb') + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: opts.title || 'MyGridGB', text: opts.title || '', url: location.href });
        return 'shared';
      } catch (e) { if (e.name === 'AbortError') return 'shared'; }
    }
    if (await copyToClipboard(blob)) return 'copied';
    return 'failed';
  }

  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'chartshare-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function injectStyles() {
    if (document.getElementById('chartshare-css')) return;
    const s = document.createElement('style');
    s.id = 'chartshare-css';
    s.textContent = `
      .chartshare { display:flex; gap:8px; justify-content:flex-end; margin:10px 0 0; }
      .chartshare button { font-family:${SANS}; font-size:12.5px; font-weight:600; cursor:pointer;
        border-radius:999px; padding:7px 15px; display:inline-flex; align-items:center; gap:6px;
        transition:background .15s,border-color .15s,opacity .15s; }
      .chartshare .cs-primary { color:#fff; background:${BRAND}; border:1px solid ${BRAND}; }
      .chartshare .cs-primary:hover { background:#15406a; }
      .chartshare .cs-secondary { color:${BRAND}; background:#fff; border:1px solid #cbd8e6; }
      .chartshare .cs-secondary:hover { background:#eef4fa; border-color:#a8cce4; }
      .chartshare button[disabled] { opacity:.6; cursor:default; }
      .chartshare svg { width:14px; height:14px; }
      .chartshare-toast { position:fixed; left:50%; bottom:26px; transform:translate(-50%,12px);
        background:${INK}; color:#fff; font-family:${SANS}; font-size:13.5px; font-weight:500;
        padding:11px 18px; border-radius:10px; box-shadow:0 6px 24px rgba(0,0,0,.25); z-index:9999;
        opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; }
      .chartshare-toast.show { opacity:1; transform:translate(-50%,0); }
    `;
    document.head.appendChild(s);
  }

  const ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>';
  const ICON_SH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  const ChartShare = {
    export: makeImage,
    attach(canvasId, opts) {
      opts = opts || {};
      opts.filename = opts.filename || canvasId;
      injectStyles();
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const wrap = canvas.parentElement || canvas;
      // dedupe: skip if a toolbar was already placed just after this chart
      const sib = wrap.nextElementSibling;
      if (!opts.container && sib && sib.classList && sib.classList.contains('chartshare')) return;
      const bar = document.createElement('div');
      bar.className = 'chartshare';
      const shBtn = document.createElement('button');
      shBtn.className = 'cs-primary';
      shBtn.innerHTML = ICON_SH + '<span>Share image</span>';
      const dlBtn = document.createElement('button');
      dlBtn.className = 'cs-secondary';
      dlBtn.innerHTML = ICON_DL + '<span>Download</span>';
      bar.appendChild(shBtn);
      bar.appendChild(dlBtn);
      if (opts.container) document.querySelector(opts.container).appendChild(bar);
      else wrap.insertAdjacentElement('afterend', bar);

      shBtn.addEventListener('click', async () => {
        shBtn.disabled = true;
        try {
          const { blob, dataUrl } = await makeImage(canvasId, opts);
          const r = await share(blob, opts);
          if (r === 'copied') toast('Image copied – paste it straight into your post');
          else if (r === 'failed') { download(dataUrl, opts.filename + '.png'); toast('Image downloaded'); }
        } catch (e) { console.error(e); }
        shBtn.disabled = false;
      });
      dlBtn.addEventListener('click', async () => {
        dlBtn.disabled = true;
        try { const { dataUrl } = await makeImage(canvasId, opts); download(dataUrl, opts.filename + '.png'); }
        catch (e) { console.error(e); }
        dlBtn.disabled = false;
      });
    },
  };

  window.ChartShare = ChartShare;

  // ── declarative auto-init ──
  // Any <canvas data-share data-share-title="..." data-share-subtitle="..."
  // data-share-source="..." data-share-filename="..."> gets a toolbar once its
  // Chart.js chart exists (charts are usually created after an async fetch).
  function waitAndAttach(cv) {
    let n = 0;
    const t = setInterval(() => {
      if (window.Chart && Chart.getChart(cv)) {
        clearInterval(t);
        ChartShare.attach(cv.id, {
          title: cv.dataset.shareTitle || '',
          subtitle: cv.dataset.shareSubtitle || '',
          source: cv.dataset.shareSource || '',
          filename: cv.dataset.shareFilename || cv.id,
        });
      } else if (++n > 150) { clearInterval(t); }   // give up after ~30s
    }, 200);
  }
  function autoInit() { document.querySelectorAll('canvas[data-share]').forEach(waitAndAttach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
})();
