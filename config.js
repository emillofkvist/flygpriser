const CONFIG = {
  AMADEUS_BASE: 'https://api.amadeus.com',
  AIRPORTS: ['MMX', 'AGH', 'CPH'],
  CURRENCY: 'SEK',
  RESULTS_PER_SECTION: 5,
  FETCH_PER_AIRPORT: 20,

  // localStorage keys
  LS_API_KEY:    'amadeus_api_key',
  LS_API_SECRET: 'amadeus_api_secret',
  LS_TOKEN:      'amadeus_token',
  LS_TOKEN_EXP:  'amadeus_token_exp',

  // Passenger presets [adults, children_birth_years]
  PASSENGERS: {
    '1a':   { adults: 1, children: [] },
    '2a':   { adults: 2, children: [] },
    '2a1c': { adults: 2, children: [2019] },
    '2a2c': { adults: 2, children: [2019, 2012] },
  },

  // Weekend periods: [label, departure day offset from Thursday, nights]
  // Each weekend starts on Thursday (offset 0)
  PERIODS: [
    { label: 'Fredag \u2192 Sondag',  daysFromThursday: 1, nights: 2 },
    { label: 'Torsdag \u2192 Sondag', daysFromThursday: 0, nights: 3 },
    { label: 'Fredag \u2192 Mandag',  daysFromThursday: 1, nights: 3 },
  ],
};
