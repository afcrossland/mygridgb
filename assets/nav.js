/* nav.js — injects header + footer into every page */

const NAV_HTML = `
<header id="site-header">
  <div class="header-inner">
    <a class="logo" href="/index.html">MyGrid<span class="logo-accent">GB</span> 🇬🇧</a>
    <button id="nav-toggle" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <nav id="main-nav">
      <ul>
        <li>
          <a href="/last-28-days/index.html">Electricity Data ▾</a>
          <ul>
            <li><a href="/last-28-days/index.html">Last 28 Days</a></li>
            <li><a href="/last-12-months/index.html">Last 12 Months</a></li>
            <li><a href="/historicaldata/index.html">Generation History</a></li>
            <li><a href="/carbon-tracker/index.html">Carbon Tracker</a></li>
          </ul>
        </li>
        <li><a href="/2030grid/index.html">The 2030 Blueprint</a></li>
        <li><a href="/blog/index.html">Blog</a></li>
        <li>
          <a href="/map/index.html">Resources ▾</a>
          <ul>
            <li><a href="/map/index.html">UK Renewable Energy Map</a></li>
            <li><a href="https://renewables-map.robinhawkes.com/#5/55/-3.2" target="_blank">GB Renewables Map (External)</a></li>
            <li><a href="/educational-resources/index.html">Educational Resources</a></li>
            <li><a href="https://substack.com/@afcrossland" target="_blank">Substack</a></li>
          </ul>
        </li>

        <li><a href="/podcast/index.html">In the Media</a></li>
        <li>
          <a href="/about/index.html">About ▾</a>
          <ul>
            <li><a href="/about/index.html">About MyGridGB</a></li>
            <li><a href="/about-me/index.html">About Me</a></li>
          </ul>
        </li>
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
    <a href="https://www.dur.ac.uk/dei/" target="_blank" style="display:block; text-align:center;">
      <img src="/images/dei.webp" alt="Durham Energy Institute">
    </a>
    <p>MyGridGB is kindly supported by the Durham Energy Institute.</p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Book</div>
    <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank">
      <img src="/images/9780367203320.jpg" alt="Decarbonising Electricity Made Simple" style="max-height:160px;width:auto">
    </a>
    <p>Decarbonising Electricity Made Simple — <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank">buy on Amazon</a></p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Connect</div>
    <p style="margin-bottom:14px">Follow for the latest GB electricity data and analysis.</p>
    <a href="https://twitter.com/intent/follow?screen_name=mygridgb" target="_blank" class="social-btn social-btn--x">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.856L1.254 2.25H8.08l4.259 5.626zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      <span class="social-btn-text"><span class="social-btn-name">Follow on X</span><span class="social-btn-handle">@mygridgb</span></span>
    </a>
    <a href="https://bsky.app/profile/mygridgb.bsky.social" target="_blank" class="social-btn social-btn--bluesky">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>
      <span class="social-btn-text"><span class="social-btn-name">Follow on Bluesky</span><span class="social-btn-handle">@mygridgb.bsky.social</span></span>
    </a>
    <a href="https://www.linkedin.com/in/afcrossland" target="_blank" class="social-btn social-btn--linkedin">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      <span class="social-btn-text"><span class="social-btn-name">Connect on LinkedIn</span><span class="social-btn-handle">afcrossland</span></span>
    </a>
    <a href="https://substack.com/@afcrossland" target="_blank" class="social-btn social-btn--substack">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
      <span class="social-btn-text"><span class="social-btn-name">Subscribe on Substack</span><span class="social-btn-handle">@afcrossland</span></span>
    </a>
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
