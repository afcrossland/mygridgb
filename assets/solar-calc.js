/* solar-calc.js — shared solar generation/saving engine.
   Used by /solar-calculator/ (the full tool) and the homepage's quick-estimate
   tab, so both always produce the same numbers from the same inputs. */
window.SolarCalc = (function () {
  let irradianceData = null, lookupData = null;

  // ── Zone centres for nearest-zone lookup ─────────────────────────────────
  const ZONE_CENTRES = [
    { key: 'Z1 - London',          lat: 51.50, lon: -0.12,  label: 'London'          },
    { key: 'Z2 - Brighton',        lat: 50.83, lon: -0.14,  label: 'Brighton'        },
    { key: 'Z3 - Southampton',     lat: 50.90, lon: -1.40,  label: 'Southampton'     },
    { key: 'Z4 - Plymouth',        lat: 50.38, lon: -4.14,  label: 'Plymouth'        },
    { key: 'Z5E - Bristol',        lat: 51.45, lon: -2.58,  label: 'Bristol'         },
    { key: 'Z5W - Cardiff',        lat: 51.48, lon: -3.18,  label: 'Cardiff'         },
    { key: 'Z6 - Birmingham',      lat: 52.49, lon: -1.90,  label: 'Birmingham'      },
    { key: 'Z7E - Manchester',     lat: 53.48, lon: -2.24,  label: 'Manchester'      },
    { key: 'Z7W - Chester',        lat: 53.19, lon: -2.89,  label: 'Chester'         },
    { key: 'Z8S - Dumfries',       lat: 55.07, lon: -3.61,  label: 'Dumfries'        },
    { key: 'Z8E - Carlisle',       lat: 54.89, lon: -2.94,  label: 'Carlisle'        },
    { key: 'Z9E - Newcastle',      lat: 54.97, lon: -1.61,  label: 'Newcastle'       },
    { key: 'Z9S - Edinburgh',      lat: 55.95, lon: -3.19,  label: 'Edinburgh'       },
    { key: 'Z10 - Middlesborough', lat: 54.57, lon: -1.23,  label: 'Middlesbrough'   },
    { key: 'Z11 - Sheffield',      lat: 53.38, lon: -1.47,  label: 'Sheffield'       },
    { key: 'Z12 - Norwich',        lat: 52.63, lon:  1.30,  label: 'Norwich'         },
    { key: 'Z13 - Aberystwith',    lat: 52.42, lon: -4.09,  label: 'Aberystwyth'     },
    { key: 'Z14 - Glasgow',        lat: 55.86, lon: -4.25,  label: 'Glasgow'         },
    { key: 'Z15 - Dundee',         lat: 56.46, lon: -2.97,  label: 'Dundee'          },
    { key: 'Z16 - Aberdeen',       lat: 57.15, lon: -2.11,  label: 'Aberdeen'        },
    { key: 'Z17 - Inverness',      lat: 57.48, lon: -4.22,  label: 'Inverness'       },
    { key: 'Z18 - Stornoway',      lat: 58.21, lon: -6.39,  label: 'Stornoway'       },
    { key: 'Z19 - Kirkwall',       lat: 58.98, lon: -2.96,  label: 'Kirkwall'        },
    { key: 'Z20 - Lerwick',        lat: 60.15, lon: -1.15,  label: 'Lerwick'         },
    { key: 'Z21 - Belfast',        lat: 54.60, lon: -5.93,  label: 'Belfast'         },
  ];

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  function nearestZone(lat, lon) {
    let best = null, bestD = Infinity;
    for (const z of ZONE_CENTRES) {
      const d = haversine(lat, lon, z.lat, z.lon);
      if (d < bestD) { bestD = d; best = z; }
    }
    return best;
  }

  // ── Demand / battery lookup bands ────────────────────────────────────────
  const DEMAND_BANDS = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500];
  function demandBand(kWh) {
    const c = Math.max(1500, Math.min(5999, kWh));
    let band = 1500;
    for (const b of DEMAND_BANDS) { if (c >= b) band = b; }
    return band;
  }
  function batteryCol(kwh) {
    if (kwh < 1.1) return 0;
    return Math.min(14, Math.floor(kwh - 0.1));
  }

  // ── Pure calculation (no DOM) ─────────────────────────────────────────────
  function runCalc({ arrays, battery, archtype, demand, zoneKey, importP, exportP, cheapP, inflRate, houseVal, plugIn = false }) {
    if (!irradianceData || !lookupData || !zoneKey) return null;
    const zoneData = irradianceData.zones[zoneKey];
    const panelKWp = plugIn ? 0.4 : 0.475;

    let generation = 0, totalKWp = 0;
    const perArrayGen = arrays.map(arr => {
      const azIdx  = Math.round(Math.min(175, arr.azimuth) / 5);
      const tiltKey = String(Math.max(0, Math.min(90, arr.tilt)));
      const row    = zoneData[tiltKey] || zoneData['30'];
      const irr    = row[azIdx] || 0;
      const kWp    = arr.panels * panelKWp;
      const arrGen = Math.round(irr * kWp);
      generation  += arrGen;
      totalKWp    += kWp;
      return arrGen;
    });

    const dBand      = demandBand(demand);
    const genBandIdx = Math.min(19, Math.floor(generation / 300));
    const bCol       = batteryCol(battery);
    const table      = lookupData[archtype];
    const bandKey    = String(dBand);
    const tableRow   = (table[bandKey] && table[bandKey][genBandIdx]) ? table[bandKey][genBandIdx] : null;
    const fraction       = tableRow ? (tableRow[bCol] || 0) : 0;
    const fractionPVOnly = tableRow ? (tableRow[0]    || 0) : 0;

    const selfConsumed = Math.min(Math.round(generation * fraction), Math.floor(demand * 0.90));
    const exported     = generation - selfConsumed;
    const pctMet       = Math.round(selfConsumed / demand * 100);

    const BATT_EFFICIENCY = 0.90;
    let arbitrageSaving = 0;
    if (battery >= 1.1) {
      const energyThroughBattery = Math.max(0, generation * (fraction - fractionPVOnly));
      const scCycles        = energyThroughBattery / (battery * BATT_EFFICIENCY);
      const arbitrageCycles = Math.max(0, 365 - scCycles);
      arbitrageSaving = Math.max(0, Math.round(
        arbitrageCycles * battery * (BATT_EFFICIENCY * importP - cheapP)
      ));
    }

    const importSaved  = Math.round(selfConsumed * importP);
    const exportEarned = Math.round(exported     * exportP);
    const totalSaving  = importSaved + exportEarned + arbitrageSaving;

    const totalPanels    = arrays.reduce((s, a) => s + a.panels, 0);
    const rawCost = plugIn
      ? 275 * totalPanels + (battery >= 1.1 ? Math.round(battery / 2.5) * 700 : 0) + 100
      : 170 * totalPanels + (battery >= 1.1 ? 1000 + 200 * battery : 0) + 4000;
    const estimatedCost = plugIn ? Math.round(rawCost / 100) * 100 : Math.round(rawCost / 1000) * 1000;
    const costSpread    = plugIn ? 200 : 2000;
    const costs = plugIn
      ? [estimatedCost - costSpread, estimatedCost, estimatedCost + costSpread].map(c => Math.max(0, c))
      : [estimatedCost - costSpread, estimatedCost, estimatedCost + costSpread].map(c => Math.max(0, c - houseVal));

    const growingAnnual = importSaved + arbitrageSaving;
    const fixedAnnual   = exportEarned;
    const yr1 = fixedAnnual + growingAnnual;
    const yr5 = fixedAnnual + Math.round(growingAnnual * Math.pow(inflRate, 4));

    function simplePayback(cost) {
      let cum = 0;
      for (let y = 1; y <= 50; y++) {
        cum += fixedAnnual + Math.round(growingAnnual * Math.pow(inflRate, y - 1));
        if (cum >= cost) return y;
      }
      return '>50';
    }

    return {
      generation, totalKWp, perArrayGen, selfConsumed, exported, pctMet,
      importSaved, exportEarned, arbitrageSaving, totalSaving,
      estimatedCost, costs, yr1, yr5,
      paybacks: costs.map(simplePayback),
      growingAnnual, fixedAnnual,
    };
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadData(baseUrl) {
    baseUrl = baseUrl || '/solar-calculator';
    const [irr, lk] = await Promise.all([
      fetch(`${baseUrl}/data/irradiance.json`).then(r => r.json()),
      fetch(`${baseUrl}/data/lookup.json`).then(r => r.json()),
    ]);
    irradianceData = irr;
    lookupData = lk;
    return { irradianceData, lookupData };
  }

  function isReady() { return !!(irradianceData && lookupData); }

  // ── Postcode / address → { lat, lon, displayCode, zoneKey } ────────────────
  async function resolveLocation(raw) {
    raw = String(raw || '').trim();
    if (!raw) throw new Error('empty query');

    const stripped = raw.toUpperCase().replace(/\s+/g, '');
    const looksLikePostcode = /^[A-Z]{1,2}[0-9]/.test(stripped);

    let latitude, longitude, displayCode, zoom = 16, resolved = false;

    if (looksLikePostcode) {
      const isFullPostcode = stripped.length >= 5;
      const normalised = isFullPostcode ? stripped.slice(0, -3) + ' ' + stripped.slice(-3) : stripped;
      try {
        if (isFullPostcode) {
          const d = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`).then(r => r.json());
          if (d.status === 200) { latitude = d.result.latitude; longitude = d.result.longitude; displayCode = d.result.postcode; zoom = 16; resolved = true; }
        } else {
          const d = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(stripped)}`).then(r => r.json());
          if (d.status === 200) { latitude = d.result.latitude; longitude = d.result.longitude; displayCode = d.result.outcode + ' (approximate)'; zoom = 12; resolved = true; }
        }
      } catch (_) {}
    }

    if (!resolved) {
      const geoData = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(raw)}&countrycodes=gb&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      ).then(r => r.json());
      if (!geoData.length) throw new Error('not found');
      latitude    = parseFloat(geoData[0].lat);
      longitude   = parseFloat(geoData[0].lon);
      displayCode = geoData[0].address?.postcode || geoData[0].display_name.split(',').slice(0, 2).join(', ');
      zoom = 19;
    }

    const zone = nearestZone(latitude, longitude);
    return { lat: latitude, lon: longitude, displayCode, zoom, zoneKey: zone.key };
  }

  return {
    ZONE_CENTRES, haversine, nearestZone,
    DEMAND_BANDS, demandBand, batteryCol,
    runCalc, loadData, isReady, resolveLocation,
  };
})();
