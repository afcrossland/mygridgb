/* nav.js — injects header + footer into every page */

// ── Google Analytics ──────────────────────────────────────────────────────────
(function() {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XL1J7KET34';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-XL1J7KET34');
})();

const NAV_HTML = `
<header id="site-header">
  <div class="header-inner">
    <a class="logo" href="/">MyGrid<span class="logo-accent">GB</span> 🇬🇧</a>
    <button id="nav-toggle" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <nav id="main-nav">
      <ul>
        <li>
          <a href="/last-28-days/">Electricity Data ▾</a>
          <ul>
            <li><a href="/last-28-days/">Last 28 Days</a></li>
            <li><a href="/last-12-months/">Last 12 Months</a></li>
            <li><a href="/historicaldata/">Generation History</a></li>
            <li><a href="/carbon-tracker/">Carbon Tracker</a></li>
          </ul>
        </li>
        <li>
          <a href="/gas-tracker/">Energy System Data ▾</a>
          <ul>
            <li><a href="/gas-tracker/">Gas Tracker</a></li>
            <li><a href="/fuel-tracker/">Fuel Tracker</a></li>
          </ul>
        </li>
        <li>
          <a href="/2030grid/">Future Energy ▾</a>
          <ul>
            <li><a href="/2030grid/">My 2030 Blueprint</a></li>
            <li><a href="/whole-energy-system/">Whole Energy System</a></li>
          </ul>
        </li>
        <li>
          <a href="/map/">Resources ▾</a>
          <ul>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/map/">UK Renewable Energy Map</a></li>
            <li><a href="https://renewables-map.robinhawkes.com/#5/55/-3.2" target="_blank">GB Renewables Map (External)</a></li>
            <li><a href="/educational-resources/">Educational Resources</a></li>
            <li><a href="https://substack.com/@afcrossland" target="_blank">Substack</a></li>
            <li><a href="/podcast/">In the Media</a></li>
          </ul>
        </li>
        <li>
          <a href="/about/">About ▾</a>
          <ul>
            <li><a href="/about/">About</a></li>
            <li><a href="/press/">Press</a></li>
          </ul>
        </li>
        <li><a href="/solar-calculator/" class="nav-solar">☀️ Solar Calculator</a></li>
      </ul>
    </nav>
  </div>
</header>`;

const FOOTER_HTML = `
<footer id="site-footer">
  <p>MyGridGB is kindly supported by the <a href="https://www.dur.ac.uk/dei/" target="_blank">Durham Energy Institute</a>.</p>
  <p style="margin-top:8px">© MyGridGB · <a href="https://twitter.com/mygridgb" target="_blank">@mygridgb on X</a> · <a href="https://bsky.app/profile/mygridgb.bsky.social" target="_blank">Bluesky</a></p>
</footer>`;

const SIDEBAR_HTML = `
<div class="bottom-cards">
  <div class="bottom-card">
    <div class="bottom-card-label">Supported by</div>
    <a href="https://www.dur.ac.uk/dei/" target="_blank" style="display:block;">
      <img src="/images/dei.jpg" alt="Durham Energy Institute" style="display:block; margin:0 auto; max-width:100%; height:auto;">
    </a>
    <p>MyGridGB is kindly supported by the Durham Energy Institute.</p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Book</div>
    <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank" style="display:block; text-align:center;">
      <img src="/images/9780367203320.jpg" alt="Decarbonising Electricity Made Simple" style="display:block; margin:0 auto 10px; max-width:120px; width:100%; height:auto; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,.18);">
    </a>
    <p style="text-align:center;">Decarbonising Electricity Made Simple — <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank">buy on Amazon</a></p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Connect</div>
    <div class="social-grid">
      <a href="https://twitter.com/intent/follow?screen_name=mygridgb" target="_blank" class="social-btn social-btn--x">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.856L1.254 2.25H8.08l4.259 5.626zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <span>X</span>
      </a>
      <a href="https://bsky.app/profile/mygridgb.bsky.social" target="_blank" class="social-btn social-btn--bluesky">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>
        <span>Bluesky</span>
      </a>
      <a href="https://www.linkedin.com/in/afcrossland" target="_blank" class="social-btn social-btn--linkedin">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        <span>LinkedIn</span>
      </a>
      <a href="https://substack.com/@afcrossland" target="_blank" class="social-btn social-btn--substack">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
        <span>Substack</span>
      </a>
      <a href="https://www.researchgate.net/profile/Andrew-Crossland" target="_blank" class="social-btn social-btn--researchgate">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M19.586 0H4.414A4.414 4.414 0 0 0 0 4.414v15.172A4.414 4.414 0 0 0 4.414 24h15.172A4.414 4.414 0 0 0 24 19.586V4.414A4.414 4.414 0 0 0 19.586 0zm-7.41 5.808h2.034c.57 0 1.036.077 1.397.232.361.154.638.37.83.647.192.277.288.6.288.97 0 .31-.067.592-.2.847a1.74 1.74 0 0 1-.57.637c-.248.17-.548.285-.9.345l1.862 2.99h-1.56l-1.713-2.857h-.468v2.857h-1.3V5.808zm1.3 1.056v1.77h.683c.38 0 .674-.086.882-.257.208-.171.312-.412.312-.722 0-.298-.1-.527-.3-.687-.199-.16-.49-.24-.872-.24h-.705zm4.163 2.27c0-.71.158-1.345.474-1.903a3.38 3.38 0 0 1 1.316-1.312c.561-.313 1.194-.47 1.898-.47.51 0 .978.084 1.403.252.426.168.793.41 1.102.725l-.838.872a2.37 2.37 0 0 0-.747-.497 2.19 2.19 0 0 0-.883-.175c-.43 0-.816.1-1.157.3a2.1 2.1 0 0 0-.8.836c-.19.357-.286.762-.286 1.214 0 .457.096.866.287 1.227.19.36.458.642.8.844.343.202.733.303 1.17.303.27 0 .527-.036.77-.108.244-.072.457-.176.64-.312v-.97h-1.56v-1.03h2.8v2.59a4.21 4.21 0 0 1-1.228.671 4.47 4.47 0 0 1-1.48.238c-.694 0-1.32-.155-1.876-.465a3.35 3.35 0 0 1-1.295-1.295c-.309-.553-.464-1.183-.464-1.89zM3.9 14.4h16.2v1.2H3.9zm0 3h16.2v1.2H3.9z"/></svg>
        <span>ResearchGate</span>
      </a>
      <a href="https://www.future-zero.com" target="_blank" class="social-btn social-btn--website">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        <span>future-zero.com</span>
      </a>
    </div>
  </div>
</div>`;

document.addEventListener('DOMContentLoaded', () => {
  // On GitHub Pages the site lives under /<repo>/ rather than /.
  // On a custom domain (or localhost) it lives at /, so BASE is empty.
  const BASE = window.location.hostname.endsWith('github.io')
    ? '/' + window.location.pathname.split('/')[1]
    : '';

  // Inject header
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);

  // Prefix every internal link in the header with the base path
  if (BASE) {
    document.querySelectorAll('#site-header a[href^="/"]').forEach(a => {
      a.setAttribute('href', BASE + a.getAttribute('href'));
    });
  }

  // Inject footer
  document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);

  // Inject sidebar where placeholder exists
  const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
  if (sidebarPlaceholder) sidebarPlaceholder.outerHTML = SIDEBAR_HTML;

  // Highlight active nav link
  const path = window.location.pathname;
  document.querySelectorAll('#main-nav a').forEach(a => {
    if (a.getAttribute('href') && path.includes(a.getAttribute('href').split('/')[1])) {
      a.classList.add('active');
    }
  });

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Mobile dropdown toggles — tap the parent link to expand/collapse
  document.querySelectorAll('#main-nav > ul > li > a').forEach(a => {
    if (a.nextElementSibling && a.nextElementSibling.tagName === 'UL') {
      a.addEventListener('click', e => {
        if (window.getComputedStyle(toggle).display !== 'none') {
          e.preventDefault();
          a.parentElement.classList.toggle('open');
        }
      });
    }
  });
});
