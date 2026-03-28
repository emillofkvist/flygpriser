const CONFIG = {
  TP_TOKEN: '234980474af2c7acb6a0b8d5b95e0b0d',
  TP_AFFILIATE_BASE: 'https://www.aviasales.com',

  AIRPORTS: ['MMX', 'AGH', 'CPH'],
  CURRENCY: 'sek',
  RESULTS_PER_SECTION: 5,

  // Passenger presets [adults, children_birth_years]
  PASSENGERS: {
    '1a':   { adults: 1, children: [] },
    '2a':   { adults: 2, children: [] },
    '2a1c': { adults: 2, children: [2019] },
    '2a2c': { adults: 2, children: [2019, 2012] },
  },

  // Weekend periods: departure day offset from Thursday, and number of nights
  PERIODS: [
    { label: 'Fredag \u2192 S\u00f6ndag',  daysFromThursday: 1, nights: 2 },
    { label: 'Torsdag \u2192 S\u00f6ndag', daysFromThursday: 0, nights: 3 },
    { label: 'Fredag \u2192 M\u00e5ndag',  daysFromThursday: 1, nights: 3 },
  ],
};
