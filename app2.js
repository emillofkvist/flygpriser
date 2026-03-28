// ============================================================
// DATE UTILITIES
// ============================================================

function getNextThursday(from) {
  const d = new Date(from || new Date());
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = (4 - day + 7) % 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function toSwedishDate(date) {
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function getUpcomingWeekends() {
  const thisThursday = getNextThursday();
  const nextThursday = addDays(thisThursday, 7);
  return [thisThursday, nextThursday].map(function(thursday, i) {
    const monday = addDays(thursday, 4);
    return {
      label:    toSwedishDate(thursday) + ' \u2013 ' + toSwedishDate(monday),
      tag:      i === 0 ? 'current' : 'next',
      title:    i === 0 ? 'Denna helg' : 'N\u00e4sta helg',
      thursday: thursday,
    };
  });
}

function buildSearchQueries() {
  const weekends = getUpcomingWeekends();
  const queries = [];
  for (var wi = 0; wi < weekends.length; wi++) {
    const weekend = weekends[wi];
    for (var pi = 0; pi < CONFIG.PERIODS.length; pi++) {
      const period = CONFIG.PERIODS[pi];
      const dep = addDays(weekend.thursday, period.daysFromThursday);
      const ret = addDays(dep, period.nights);
      queries.push({
        weekendLabel:  weekend.label,
        weekendTag:    weekend.tag,
        weekendTitle:  weekend.title,
        periodLabel:   period.label,
        departureDate: toISODate(dep),
        returnDate:    toISODate(ret),
        nights:        period.nights,
      });
    }
  }
  return queries;
}

// ============================================================
// CITY DATA (Travelpayouts CDN)
// ============================================================

var cityDb = {};
var cityDataLoaded = false;

async function loadCityData() {
  if (cityDataLoaded) return;
  try {
    const resp = await fetch('https://api.travelpayouts.com/data/en/cities.json');
    const cities = await resp.json();
    cities.forEach(function(c) {
      if (c.code) cityDb[c.code] = { name: c.name, countryCode: c.country_code };
    });
    cityDataLoaded = true;
  } catch (e) {
    console.warn('Kunde inte ladda stadsdata:', e.message);
  }
}

function getCityName(iata) {
  return (cityDb[iata] && cityDb[iata].name) || iata;
}

function getCityFlagHtml(iata) {
  const cc = cityDb[iata] && cityDb[iata].countryCode;
  if (!cc || cc.length !== 2) return '';
  return '<img class="flag" src="https://flagcdn.com/w20/' + cc.toLowerCase() + '.png" alt="' + cc + '">';
}

function getCityCountryCode(iata) {
  return (cityDb[iata] && cityDb[iata].countryCode) || null;
}

// ============================================================
// TRAVELPAYOUTS / AVIASALES DATA API
// ============================================================

async function fetchCheapFromOrigin(origin, departDate, returnDate) {
  const apiUrl = 'https://api.travelpayouts.com/v1/prices/cheap'
    + '?origin=' + origin
    + '&depart_date=' + departDate
    + '&return_date=' + returnDate
    + '&currency=' + CONFIG.CURRENCY
    + '&show_to_affiliates=true'
    + '&token=' + CONFIG.TP_TOKEN;

  const resp = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(apiUrl));
  if (!resp.ok) return [];

  const json = await resp.json();
  if (!json.success || !json.data) return [];

  const flights = [];
  const entries = Object.entries(json.data);
  for (var i = 0; i < entries.length; i++) {
    const dest     = entries[i][0];
    const stopMap  = entries[i][1];
    // Keys are number of transfers ("0" = direct). Take cheapest available.
    const stopKeys = Object.keys(stopMap).sort(function(a, b) {
      return parseInt(a) - parseInt(b);
    });
    const flight = stopMap[stopKeys[0]];
    if (!flight) continue;
    flights.push({
      origin:      origin,
      destination: dest,
      price:       flight.price,
      airline:     flight.airline || '',
      transfers:   parseInt(stopKeys[0], 10),
      departureAt: flight.departure_at || null,
      returnAt:    flight.return_at    || null,
      departDate:  departDate,
      returnDate:  returnDate,
    });
  }
  return flights;
}

async function fetchSection(query) {
  const includeInrikes = document.getElementById('includeInrikes').checked;

  const results = await Promise.allSettled(
    CONFIG.AIRPORTS.map(function(airport) {
      return fetchCheapFromOrigin(airport, query.departureDate, query.returnDate);
    })
  );

  var all = results
    .filter(function(r) { return r.status === 'fulfilled'; })
    .reduce(function(acc, r) { return acc.concat(r.value); }, []);

  // Filter out Swedish domestic flights unless checkbox is checked
  if (!includeInrikes) {
    all = all.filter(function(f) {
      return getCityCountryCode(f.destination) !== 'SE';
    });
  }

  // Deduplicate by destination: keep cheapest origin per destination
  all.sort(function(a, b) { return a.price - b.price; });
  const seen = new Map();
  for (var i = 0; i < all.length; i++) {
    if (!seen.has(all[i].destination)) seen.set(all[i].destination, all[i]);
  }

  return Array.from(seen.values()).slice(0, CONFIG.RESULTS_PER_SECTION);
}

// ============================================================
// RENDERING
// ============================================================

function fmtTime(isoStr) {
  if (!isoStr || isoStr.length < 16) return '?';
  return isoStr.slice(11, 16);
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr.slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toAviasalesDate(isoDate) {
  // "2026-04-04" -> "0404"
  return isoDate.slice(8, 10) + isoDate.slice(5, 7);
}

function buildBookingUrl(flight) {
  // Aviasales search URL: /search/CPH0404AMS0406
  const dep = toAviasalesDate(flight.departDate);
  const ret = toAviasalesDate(flight.returnDate);
  return CONFIG.TP_BOOKING_BASE + '/' + flight.origin + dep + flight.destination + ret;
}

function renderFlightRow(flight, isFirst, passengerKey) {
  const cheapClass  = isFirst ? 'cheapest' : '';
  const priceClass  = isFirst ? 'cheapest-price' : '';

  const pax       = CONFIG.PASSENGERS[passengerKey];
  const totalPax  = pax.adults + pax.children.length;
  const totalPrice = Math.round(flight.price * totalPax);
  const paxLabel  = totalPax > 1 ? (totalPax + '\u00a0pers') : '1\u00a0pers';

  const cityName  = getCityName(flight.destination);
  const flagHtml  = getCityFlagHtml(flight.destination);
  const dest      = escapeHtml(cityName) + (flagHtml ? '\u00a0' + flagHtml : '');
  const origin    = escapeHtml(flight.origin);

  const stopsLabel = flight.transfers === 0 ? 'Direkt' : (flight.transfers + '\u00a0stopp');
  const airline    = escapeHtml(flight.airline);

  const outTime = fmtTime(flight.departureAt);
  const retTime = fmtTime(flight.returnAt);
  const outDate = fmtDate(flight.departureAt);
  const retDate = fmtDate(flight.returnAt);

  const outStr = '&#x2708;\u00a0<b>' + outTime + '</b>'
    + (outDate ? '\u00a0<span class="meta">' + escapeHtml(outDate) + '\u00a0&middot;\u00a0' + airline + '\u00a0&middot;\u00a0' + stopsLabel + '</span>' : '');
  const retStr = '&#x1F3E0;\u00a0Avg\u00a0<b>' + retTime + '</b>'
    + (retDate ? '\u00a0<span class="meta">' + escapeHtml(retDate) + '</span>' : '');

  const href = escapeHtml(buildBookingUrl(flight));

  return '<a class="flight-row ' + cheapClass + '" href="' + href + '" target="_blank" rel="noopener">' +
    '<div class="flight-info">' +
      '<div class="flight-destination">' + origin + ' &rarr; ' + dest + '</div>' +
      '<div class="flight-times">' +
        '<span class="flight-leg">' + outStr + '</span>' +
        '<span class="flight-leg">' + retStr + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="flight-price">' +
      '<div class="amount ' + priceClass + '">' + totalPrice.toLocaleString('sv-SE') + '\u00a0kr</div>' +
      '<div class="label">t/r\u00a0&middot;\u00a0' + paxLabel + '</div>' +
    '</div>' +
  '</a>';
}

function renderSection(query, flights) {
  const passengerKey = document.getElementById('passengers').value;
  const rows = flights.length > 0
    ? flights.map(function(f, i) { return renderFlightRow(f, i === 0, passengerKey); }).join('')
    : '<div class="no-results">Inga fynd f\u00f6r dessa datum</div>';

  return '<div class="period-block">' +
    '<div class="period-label">' + escapeHtml(query.periodLabel) + '</div>' +
    rows +
  '</div>';
}

function renderWeekendBlock(weekendTag, weekendTitle, weekendLabel, sectionsHtml) {
  return '<div class="weekend-block">' +
    '<div class="weekend-heading ' + weekendTag + '">&#128197;\u00a0' + escapeHtml(weekendTitle) + '\u00a0&mdash;\u00a0' + escapeHtml(weekendLabel) + '</div>' +
    sectionsHtml +
  '</div>';
}

// ============================================================
// MAIN INIT
// ============================================================

async function init() {
  const weekends = getUpcomingWeekends();

  // Show skeleton with spinners
  var skeletonHtml = '';
  for (var wi = 0; wi < weekends.length; wi++) {
    var weekend = weekends[wi];
    var sectionsHtml = '';
    for (var pi = 0; pi < CONFIG.PERIODS.length; pi++) {
      sectionsHtml +=
        '<div class="period-block">' +
          '<div class="period-label">' + escapeHtml(CONFIG.PERIODS[pi].label) + '</div>' +
          '<div class="loading"><div class="spinner"></div> S\u00f6ker...</div>' +
        '</div>';
    }
    skeletonHtml += renderWeekendBlock(weekend.tag, weekend.title, weekend.label, sectionsHtml);
  }
  document.getElementById('results').innerHTML = skeletonHtml;

  try {
    const queries = buildSearchQueries();

    // Fetch city names and flight data in parallel
    const [, allResults] = await Promise.all([
      loadCityData(),
      Promise.allSettled(queries.map(function(q) { return fetchSection(q); })),
    ]);

    var html = '';
    var qi = 0;
    for (var w = 0; w < weekends.length; w++) {
      weekend = weekends[w];
      var sectHtml = '';
      for (var p = 0; p < CONFIG.PERIODS.length; p++) {
        const flights = allResults[qi].status === 'fulfilled' ? allResults[qi].value : [];
        sectHtml += renderSection(queries[qi], flights);
        qi++;
      }
      html += renderWeekendBlock(weekend.tag, weekend.title, weekend.label, sectHtml);
    }

    document.getElementById('results').innerHTML = html;
  } catch (err) {
    document.getElementById('results').innerHTML =
      '<p class="error-msg">Fel: ' + escapeHtml(err.message) + '</p>';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  init();
  document.getElementById('passengers').addEventListener('change', init);
  document.getElementById('includeInrikes').addEventListener('change', init);
});
