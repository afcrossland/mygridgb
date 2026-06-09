# MyGridGB — Static Site

This is the static HTML rebuild of [mygridgb.co.uk](https://www.mygridgb.co.uk), designed to be hosted for free on GitHub Pages, Netlify, or Cloudflare Pages.

## Structure

```
index.html              — Homepage
assets/
  style.css             — All shared styles
  nav.js                — Injects header, footer, sidebar into every page
dashboard/index.html    — Live dashboard (Infogram embed)
last-28-days/           — 28-day chart page
last-12-months/         — 12-month chart page
historicaldata/         — Historical data
gas-tracker/            — Gas tracker
carbon-tracker/         — Carbon tracker
coal-tracker/           — Coal tracker
2030grid/               — The 2030 Grid
map/                    — UK Renewable Energy Map
waste-heat-map/         — Waste Heat Map
podcast/                — Podcasts
blog/                   — Blog index + posts
about/                  — About MyGridGB
about-me/               — About Dr Andrew Crossland
sponsorship/            — Sponsorship opportunities
educational-resources/  — Educational resources
```

## Wiring up chart embeds

Each data page has a `<div class="embed-area">` placeholder. To add an Infogram chart:
1. Open the relevant `index.html`
2. Replace the placeholder `<p>` with your `<iframe>` embed code from Infogram

## Hosting on GitHub Pages

1. Push this folder to a GitHub repo
2. Go to Settings → Pages → set source to `main` branch, `/ (root)`
3. Your site will be live at `https://yourusername.github.io/reponame/`
4. Point your custom domain in Settings → Pages → Custom domain

## Hosting on Netlify / Cloudflare Pages

Drag and drop this folder onto netlify.com/drop — done.
