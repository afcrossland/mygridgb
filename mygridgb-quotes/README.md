# MyGridGB Solar Matcher — Quote Room Prototype

Static prototype of the sealed quote-round feature. Four states across three HTML files.

## Preview

Serve from the repo root with any static server, e.g.:

```bash
cd /path/to/mygridgb
python3 -m http.server 8080
```

Then open:

| URL | What you see |
|-----|-------------|
| `http://localhost:8080/mygridgb-quotes/` | State 1 — request quotes (email + postcode) |
| `http://localhost:8080/mygridgb-quotes/room.html` | States 2 & 3 — quote room + post-choice confirmation |
| `http://localhost:8080/mygridgb-quotes/installer.html` | State 4 — installer's prescribed quote form |

> `index.html` → "Open my quote room" navigates directly to `room.html` for prototype purposes.

---

## File structure

```
mygridgb-quotes/
├── index.html        State 1: request-quotes step
├── room.html         States 2 & 3: quote room + confirmation
├── installer.html    State 4: installer quote form (tokenised link)
├── css/
│   ├── tokens.css    CSS custom properties (:root design tokens)
│   └── quotes.css    All shared component styles
├── js/
│   └── room.js       Fetches quotes.json, renders cards + deviations
└── data/
    └── quotes.json   Mock data — see schema below
```

---

## quotes.json schema

This file is the future API contract. The Cloudflare Worker will return the same shape.

### Top-level

```jsonc
{
  "round": { ... },   // the quote round — one per file
  "quotes": [ ... ]   // array of quote objects
}
```

### round

| Field | Type | Description |
|-------|------|-------------|
| `reference` | string | Unique round ID, e.g. `"SC-2026-04182"` |
| `postcode_area` | string | Outcode shown to installers, e.g. `"NG22"` |
| `created_at` | ISO 8601 | When the round was opened |
| `window_closes_at` | ISO 8601 | Deadline for installer submissions |
| `invited_count` | integer | Number of installers invited |
| `design` | object | See below |

### round.design

| Field | Type | Description |
|-------|------|-------------|
| `panel_watts` | integer | Designed panel wattage, e.g. `475` |
| `panel_count` | integer | Number of panels |
| `battery_kwh` | number | Designed battery capacity |
| `azimuth_label` | string | Human label, e.g. `"SE–SW"` |
| `tilt_deg` | integer | Roof pitch in degrees |
| `est_generation_kwh_yr` | integer | MCS model annual yield estimate |

### quote

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable identifier, e.g. `"q-trent"` |
| `installer` | object | See below |
| `hardware` | object \| null | `null` when `status` is `"pending"` |
| `price` | object \| null | `null` when pending |
| `warranty_years` | integer \| null | |
| `lead_time_weeks` | `{min, max}` \| null | |
| `substitution_note` | string \| null | Free text if hardware deviates from design |
| `status` | `"submitted"` \| `"pending"` \| `"declined"` | |
| `computed` | object \| null | Model output; `null` when pending |

### quote.installer

| Field | Type |
|-------|------|
| `name` | string |
| `mcs_number` | string |
| `consumer_code` | `"RECC"` \| `"HIES"` \| string |
| `google_rating` | number |
| `review_count` | integer |

### quote.hardware

```jsonc
{
  "panels":  { "make": "", "model": "", "watts": 0, "count": 0 },
  "inverter": {
    "make": "", "model": "",
    "controllability": "local_modbus" | "cloud_only" | "none",
    "controllability_note": ""  // human-readable, shown in card
  },
  "battery": { "make": "", "model": "", "kwh": 0.0 }
}
```

### quote.price

| Field | Type |
|-------|------|
| `total_inc_vat` | integer (pence-free GBP) |
| `includes_scaffolding` | boolean |
| `includes_dno` | boolean |

### quote.computed

Produced by the MyGridGB model — **not submitted by the installer**.

| Field | Type |
|-------|------|
| `payback_years` | number |
| `lifetime_return_gbp` | integer |
| `self_use_pct` | integer |

---

## Computed fields (rendered by room.js, not stored in JSON)

- **Best return flag** — highest `lifetime_return_gbp` among `status: "submitted"` quotes.
- **Hardware deviations** — `(−150 W vs design)` / `(as designed)` annotations computed by comparing `quote.hardware.panels.watts` / `quote.hardware.battery.kwh` against `round.design.panel_watts` / `round.design.battery_kwh`.
- **Price includes string** — derived from `includes_scaffolding` + `includes_dno` booleans.

---

## Gaps before a real backend

1. **Auth / magic links** — `index.html` needs to POST email+postcode to a Worker that creates a round, stores it in Durable Objects or D1, and emails a signed magic link. Currently navigates directly.

2. **Installer tokens** — `installer.html` should only be reachable via a per-installer signed URL. No auth in the prototype.

3. **computed block is mock data** — in production the Worker runs the MCS payback model server-side when an installer submits a quote. The computed block must not be installer-supplied.

4. **Round status transitions** — no logic for closing the window, auto-declining late quotes, or sending the "round complete" email.

5. **Component approved list** — `installer.html` has a short hard-coded `<select>` list. The real system needs a maintained hardware table (with controllability data) that the Worker validates against.

6. **Installer identity verification** — MCS number is free text in the prototype. Production needs MCS API lookup on submission.

7. **GDPR / data retention** — email addresses and chosen-installer contact release need a privacy notice and a deletion path.
