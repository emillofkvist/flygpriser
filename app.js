// ============================================================
// DATE UTILITIES
// ============================================================

/**
 * Returns the date of the next Thursday on or after today.
 * If today is Thursday, returns today.
 */
function getNextThursday(from) {
  const d = new Date(from || new Date());
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = (4 - day + 7) % 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d;
}

/**
 * Adds n days to a date, returns new Date.
 */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Formats a Date to YYYY-MM-DD string.
 */
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a Date to Swedish short form: "28 mar"
 */
function toSwedishDate(date) {
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

/**
 * Returns array of 2 weekend objects:
 * { label: "28 mar - 31 mar", thursday: Date, tag, title }
 */
function getUpcomingWeekends() {
  const thisThursday = getNextThursday();
  const nextThursday = addDays(thisThursday, 7);

  return [thisThursday, nextThursday].map(function(thursday, i) {
    const monday = addDays(thursday, 4);
    return {
      label:    toSwedishDate(thursday) + ' \u2013 ' + toSwedishDate(monday),
      tag:      i === 0 ? 'current' : 'next',
      title:    i === 0 ? 'Denna helg' : 'Nasta helg',
      thursday: thursday,
    };
  });
}

/**
 * Returns all 6 search queries: { weekendLabel, periodLabel, departureDate, returnDate, nights, ... }
 */
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
        weekendLabel: weekend.label,
        weekendTag:   weekend.tag,
        weekendTitle: weekend.title,
        periodLabel:  period.label,
        departureDate: toISODate(dep),
        returnDate:    toISODate(ret),
        nights:        period.nights,
      });
    }
  }
  return queries;
}

// ============================================================
// AMADEUS AUTH
// ============================================================

function getStoredCredentials() {
  return {
    key:    localStorage.getItem(CONFIG.LS_API_KEY),
    secret: localStorage.getItem(CONFIG.LS_API_SECRET),
  };
}

function hasCredentials() {
  const creds = getStoredCredentials();
  return !!(creds.key && creds.secret);
}

async function getAccessToken() {
  // Return cached token if still valid (with 1-min buffer)
  const cached = localStorage.getItem(CONFIG.LS_TOKEN);
  const exp    = parseInt(localStorage.getItem(CONFIG.LS_TOKEN_EXP) || '0', 10);
  if (cached && Date.now() < exp - 60000) return cached;

  const creds = getStoredCredentials();
  const resp = await fetch(CONFIG.AMADEUS_BASE + '/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&client_id=' + encodeURIComponent(creds.key) +
          '&client_secret=' + encodeURIComponent(creds.secret),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(function() { return {}; });
    throw new Error('Auth misslyckades: ' + (err.error_description || resp.status));
  }

  const data = await resp.json();
  localStorage.setItem(CONFIG.LS_TOKEN, data.access_token);
  localStorage.setItem(CONFIG.LS_TOKEN_EXP, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

// ============================================================
// API KEY MODAL
// ============================================================

function openApiKeyModal() {
  document.getElementById('api-modal').classList.add('open');
}

function clearApiKey() {
  localStorage.removeItem(CONFIG.LS_API_KEY);
  localStorage.removeItem(CONFIG.LS_API_SECRET);
  localStorage.removeItem(CONFIG.LS_TOKEN);
  localStorage.removeItem(CONFIG.LS_TOKEN_EXP);
  alert('API-nyckel borttagen.');
}

function saveApiKey() {
  const key    = document.getElementById('input-api-key').value.trim();
  const secret = document.getElementById('input-api-secret').value.trim();
  if (!key || !secret) {
    alert('Fyll i bade API Key och API Secret.');
    return;
  }
  localStorage.setItem(CONFIG.LS_API_KEY, key);
  localStorage.setItem(CONFIG.LS_API_SECRET, secret);
  // Clear cached token so it's re-fetched with new credentials
  localStorage.removeItem(CONFIG.LS_TOKEN);
  localStorage.removeItem(CONFIG.LS_TOKEN_EXP);
  document.getElementById('api-modal').classList.remove('open');
  document.getElementById('api-key-notice').style.display = 'none';
  init();
}

// ============================================================
// FLIGHT DESTINATIONS (step 1 of 2)
// ============================================================

/**
 * Fetch cheapest destinations from one origin for a given departure/nights.
 * Returns array of { destination, price, flightOffersUrl, departureDate, returnDate, ... }
 */
async function fetchCheapestDestinations(token, origin, departureDate, nights) {
  const params = new URLSearchParams({
    origin:        origin,
    departureDate: departureDate,
    duration:      String(nights),
    currency:      CONFIG.CURRENCY,
    max:           String(CONFIG.FETCH_PER_AIRPORT),
    oneWay:        'false',
  });

  const resp = await fetch(
    CONFIG.AMADEUS_BASE + '/v1/shopping/flight-destinations?' + params.toString(),
    { headers: { Authorization: 'Bearer ' + token } }
  );

  if (!resp.ok) {
    const body = await resp.json().catch(function() { return {}; });
    console.warn('flight-destinations ' + origin + ' ' + departureDate + ': ' + resp.status, body);
    return [];
  }

  const json = await resp.json();
  const locs = (json.dictionaries && json.dictionaries.locations) || {};

  return (json.data || []).map(function(d) {
    return {
      origin:          origin,
      destination:     d.destination,
      cityName:        (locs[d.destination] && locs[d.destination].detailedName) || d.destination,
      departureDate:   d.departureDate,
      returnDate:      d.returnDate,
      price:           parseFloat(d.price.total),
      flightOffersUrl: (d.links && d.links.flightOffers) || null,
    };
  });
}

/**
 * Fetch destinations from all airports in parallel, merge and return top N by price.
 */
async function fetchSection(token, query) {
  const results = await Promise.allSettled(
    CONFIG.AIRPORTS.map(function(airport) {
      return fetchCheapestDestinations(token, airport, query.departureDate, query.nights);
    })
  );

  const all = results
    .filter(function(r) { return r.status === 'fulfilled'; })
    .reduce(function(acc, r) { return acc.concat(r.value); }, []);

  // Sort by price, deduplicate by destination (keep cheapest per dest)
  all.sort(function(a, b) { return a.price - b.price; });
  const seen = new Map();
  for (var i = 0; i < all.length; i++) {
    const flight = all[i];
    if (!seen.has(flight.destination)) seen.set(flight.destination, flight);
  }

  return Array.from(seen.values()).slice(0, CONFIG.RESULTS_PER_SECTION * 2); // get extra for step 2 fallback
}

// ============================================================
// FLIGHT OFFERS (step 2 of 2) — get exact times
// ============================================================

/**
 * Country ISO code -> flag emoji (e.g. "ES" -> flag)
 */
function countryFlag(isoCode) {
  if (!isoCode || isoCode.length !== 2) return '';
  try {
    return String.fromCodePoint(
      0x1F1E6 - 65 + isoCode.toUpperCase().charCodeAt(0),
      0x1F1E6 - 65 + isoCode.toUpperCase().charCodeAt(1)
    );
  } catch(e) {
    return '';
  }
}

/**
 * Format "2026-04-04T06:15:00" -> "06:15"
 */
function fmtTime(isoStr) {
  return isoStr.slice(11, 16);
}

/**
 * Format "2026-04-04" -> "lor 4/4" (Swedish short weekday)
 */
function fmtDate(isoStr) {
  const d = new Date(isoStr.slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

/**
 * Fetch cheapest flight offer for a specific origin->destination trip.
 * Returns enriched flight object or null on failure.
 */
async function fetchFlightDetails(token, flight, passengerKey) {
  if (!flight.flightOffersUrl) return null;

  const pax = CONFIG.PASSENGERS[passengerKey];
  // Build URL from the one returned by flight-destinations, ensure production endpoint
  const baseUrl = flight.flightOffersUrl.replace('test.api.amadeus.com', 'api.amadeus.com');
  const url = new URL(baseUrl);
  url.searchParams.set('adults', String(pax.adults));
  url.searchParams.set('max', '1');
  url.searchParams.set('currencyCode', CONFIG.CURRENCY);
  if (pax.children.length > 0) {
    url.searchParams.set('children', String(pax.children.length));
  } else {
    url.searchParams.delete('children');
  }

  const resp = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer ' + token },
  });

  if (!resp.ok) {
    console.warn('flight-offers ' + flight.origin + '->' + flight.destination + ': ' + resp.status);
    return null;
  }

  const json = await resp.json();
  const offer = json.data && json.data[0];
  if (!offer) return null;

  const carriers  = (json.dictionaries && json.dictionaries.carriers)  || {};
  const locations = (json.dictionaries && json.dictionaries.locations) || {};
  const countryCode = (locations[flight.destination] && locations[flight.destination].countryCode) || '';

  const outLeg = offer.itineraries && offer.itineraries[0] && offer.itineraries[0].segments && offer.itineraries[0].segments[0];
  const inLeg  = offer.itineraries && offer.itineraries[1] && offer.itineraries[1].segments && offer.itineraries[1].segments[0];

  // Build a Google Flights search URL as a fallback booking link
  const gfParams = new URLSearchParams({
    curr: 'SEK',
    hl:   'sv',
  });
  const googleFlightsUrl = 'https://www.google.com/travel/flights?' + gfParams.toString();

  return {
    origin:      flight.origin,
    destination: flight.destination,
    cityName:    flight.cityName,
    flag:        countryFlag(countryCode),
    price:       parseFloat(offer.price.total),
    currency:    offer.price.currency,
    bookingUrl:  (offer.links && offer.links.flightOffers) || googleFlightsUrl,
    outbound: outLeg ? {
      departs: fmtTime(outLeg.departure.at),
      arrives: fmtTime(outLeg.arrival.at),
      date:    fmtDate(outLeg.departure.at),
      carrier: carriers[outLeg.carrierCode] || outLeg.carrierCode,
      stops:   outLeg.numberOfStops > 0 ? (outLeg.numberOfStops + ' stopp') : 'Direkt',
    } : null,
    inbound: inLeg ? {
      departs: fmtTime(inLeg.departure.at),
      arrives: fmtTime(inLeg.arrival.at),
      date:    fmtDate(inLeg.departure.at),
      carrier: carriers[inLeg.carrierCode] || inLeg.carrierCode,
      stops:   inLeg.numberOfStops > 0 ? (inLeg.numberOfStops + ' stopp') : 'Direkt',
    } : null,
  };
}

/**
 * Take top N destinations from section, enrich with flight details in parallel.
 * Returns up to RESULTS_PER_SECTION enriched flights (filters out nulls).
 */
async function enrichSection(token, destinations, passengerKey) {
  const top = destinations.slice(0, CONFIG.RESULTS_PER_SECTION + 3); // fetch extra for fallback
  const results = await Promise.allSettled(
    top.map(function(d) { return fetchFlightDetails(token, d, passengerKey); })
  );
  return results
    .filter(function(r) { return r.status === 'fulfilled' && r.value !== null; })
    .map(function(r) { return r.value; })
    .sort(function(a, b) { return a.price - b.price; })
    .slice(0, CONFIG.RESULTS_PER_SECTION);
}

// ============================================================
// RENDERING
// ============================================================

function renderFlightRow(flight, isFirst) {
  const cheapClass = isFirst ? 'cheapest' : '';
  const priceClass = isFirst ? 'cheapest-price' : '';

  const out = flight.outbound;
  const inn = flight.inbound;

  const outStr = out
    ? '&#x2708; <b>' + out.departs + '</b> &rarr; <b>' + out.arrives + '</b> <span class="meta">' + out.date + ' &middot; ' + out.carrier + ' &middot; ' + out.stops + '</span>'
    : '&mdash;';
  const inStr = inn
    ? '&#x1F3E0; <b>' + inn.departs + '</b> &rarr; <b>' + inn.arrives + '</b> <span class="meta">' + inn.date + ' &middot; ' + inn.carrier + ' &middot; ' + inn.stops + '</span>'
    : '&mdash;';

  const dest = escapeHtml(flight.cityName) + ' ' + flight.flag;
  const origin = escapeHtml(flight.origin);

  const passengerKey = document.getElementById('passengers').value;
  const pax = CONFIG.PASSENGERS[passengerKey];
  const paxLabel = pax.adults + (pax.children.length > 0 ? '+' + pax.children.length : '') + ' pers';

  const href = escapeHtml(flight.bookingUrl || '#');

  return '<a class="flight-row ' + cheapClass + '" href="' + href + '" target="_blank" rel="noopener">' +
    '<div class="flight-info">' +
      '<div class="flight-destination">' + origin + ' &rarr; ' + dest + '</div>' +
      '<div class="flight-times">' +
        '<span class="flight-leg">' + outStr + '</span>' +
        '<span class="flight-leg">' + inStr + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="flight-price">' +
      '<div class="amount ' + priceClass + '">' + Math.round(flight.price).toLocaleString('sv-SE') + ' kr</div>' +
      '<div class="label">t/r &middot; ' + paxLabel + '</div>' +
    '</div>' +
  '</a>';
}

function renderSection(query, flights, errorMsg) {
  const rows = flights.length > 0
    ? flights.map(function(f, i) { return renderFlightRow(f, i === 0); }).join('')
    : '<div class="no-results">Inga resor hittades</div>';

  return '<div class="period-block">' +
    '<div class="period-label">' + escapeHtml(query.periodLabel) + '</div>' +
    rows +
    (errorMsg || '') +
  '</div>';
}

function renderWeekendBlock(weekendTag, weekendTitle, weekendLabel, sectionsHtml) {
  return '<div class="weekend-block">' +
    '<div class="weekend-heading ' + weekendTag + '">&#128197; ' + escapeHtml(weekendTitle) + ' &mdash; ' + escapeHtml(weekendLabel) + '</div>' +
    sectionsHtml +
  '</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// MAIN INIT
// ============================================================

async function init() {
  if (!hasCredentials()) {
    document.getElementById('api-key-notice').style.display = 'block';
    openApiKeyModal();
    return;
  }

  document.getElementById('api-key-notice').style.display = 'none';

  // Build skeleton with spinners per section
  const weekends = getUpcomingWeekends();
  let skeletonHtml = '';
  for (var wi = 0; wi < weekends.length; wi++) {
    const weekend = weekends[wi];
    let sectionsHtml = '';
    for (var pi = 0; pi < CONFIG.PERIODS.length; pi++) {
      const period = CONFIG.PERIODS[pi];
      sectionsHtml +=
        '<div class="period-block">' +
          '<div class="period-label">' + escapeHtml(period.label) + '</div>' +
          '<div class="loading"><div class="spinner"></div> Soker...</div>' +
        '</div>';
    }
    skeletonHtml += renderWeekendBlock(weekend.tag, weekend.title, weekend.label, sectionsHtml);
  }
  document.getElementById('results').innerHTML = skeletonHtml;

  try {
    const token = await getAccessToken();
    const queries = buildSearchQueries();
    const passengerKey = document.getElementById('passengers').value;

    // Fetch all 6 sections in parallel (step 1: destinations)
    const allDestinations = await Promise.allSettled(
      queries.map(function(q) { return fetchSection(token, q); })
    );

    // Enrich all sections in parallel (step 2: offers)
    const allFlights = await Promise.allSettled(
      allDestinations.map(function(res, i) {
        const dests = res.status === 'fulfilled' ? res.value : [];
        return enrichSection(token, dests, passengerKey);
      })
    );

    // Group by weekend and render
    let html = '';
    let qi = 0;
    for (var w = 0; w < weekends.length; w++) {
      const weekend = weekends[w];
      let sectionsHtml = '';
      for (var p = 0; p < CONFIG.PERIODS.length; p++) {
        const flights = allFlights[qi].status === 'fulfilled' ? allFlights[qi].value : [];
        const errorMsg = allFlights[qi].status === 'rejected'
          ? '<div class="error-msg">Kunde inte hamta resor</div>'
          : '';
        sectionsHtml += renderSection(queries[qi], flights, errorMsg);
        qi++;
      }
      html += renderWeekendBlock(weekend.tag, weekend.title, weekend.label, sectionsHtml);
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
});
