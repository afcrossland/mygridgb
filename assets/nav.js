/* nav.js — injects header + footer into every page */

const NAV_HTML = `
<header id="site-header">
  <div class="header-inner">
    <a class="logo" href="/index.html">MyGrid<span class="logo-accent">GB</span></a>
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
            <li><a href="/historicaldata/index.html">Electricity since 2012</a></li>
            <li><a href="/carbon-tracker/index.html">Carbon Tracker</a></li>
            <li><a href="/gas-tracker/index.html">Gas Tracker</a></li>
            <li><a href="/coal-tracker/index.html">Coal Tracker</a></li>
          </ul>
        </li>
        <li><a href="/2030grid/index.html">The 2030 Grid</a></li>
        <li>
          <a href="/map/index.html">Maps ▾</a>
          <ul>
            <li><a href="/map/index.html">UK Renewable Energy Map</a></li>
            <li><a href="/waste-heat-map/index.html">Waste Heat Map</a></li>
            <li><a href="https://renewables-map.robinhawkes.com/#5/55/-3.2" target="_blank">GB Renewables Map (External)</a></li>
          </ul>
        </li>
        <li><a href="/blog/index.html">Blog</a></li>
        <li><a href="/podcast/index.html">In the Media</a></li>
        <li>
          <a href="/about/index.html">About ▾</a>
          <ul>
            <li><a href="/about/index.html">About MyGridGB</a></li>
            <li><a href="/about-me/index.html">About Me</a></li>
            <li><a href="/sponsorship/index.html">Sponsorship Opportunities</a></li>
            <li><a href="/educational-resources/index.html">Educational Resources</a></li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</header>`;

const FOOTER_HTML = `
<footer id="site-footer">
  <p>MyGridGB is kindly supported by the <a href="https://www.dur.ac.uk/dei/" target="_blank">Durham Energy Institute</a>.</p>
  <p style="margin-top:8px">© MyGridGB · <a href="https://twitter.com/mygridgb" target="_blank">@mygridgb</a></p>
</footer>`;

const SIDEBAR_HTML = `
<div class="bottom-cards">
  <div class="bottom-card">
    <div class="bottom-card-label">Supported by</div>
    <a href="https://www.dur.ac.uk/dei/" target="_blank">
      <img src="http://www.mygridgb.co.uk/wp-content/uploads/2016/12/unnamed-300x152.jpg" alt="Durham Energy Institute">
    </a>
    <p>MyGridGB is kindly supported by the Durham Energy Institute.</p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Book</div>
    <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank">
      <img src="https://www.mygridgb.co.uk/wp-content/uploads/2021/10/BookCover-194x300.jpg" alt="Decarbonising Electricity Made Simple" style="max-height:160px;width:auto">
    </a>
    <p>Decarbonising Electricity Made Simple — <a href="https://www.amazon.co.uk/Decarbonising-Electricity-Routledge-Explorations-Studies/dp/0367203324" target="_blank">buy on Amazon</a></p>
  </div>
  <div class="bottom-card">
    <div class="bottom-card-label">Follow</div>
    <p style="margin-bottom:12px">Keep up with the latest GB electricity data and analysis.</p>
    <a href="https://twitter.com/intent/follow?screen_name=mygridgb" target="_blank" class="follow-btn">Follow @mygridgb on X</a>
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
});
