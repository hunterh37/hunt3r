// Archival plate cards: real Apple patent drawings (USPTO, via Google Patents) in public/patents.
const BASE = import.meta.env?.BASE_URL || '/';

export const CARDS = [
  { year: '2005', fig: '', no: 'US D504,889', img: 'd504889', cap: 'ELECTRONIC DEVICE, TABLET ENCLOSURE' },
  { year: '2008', fig: '1', no: 'US D558,757', img: 'd558757', cap: 'ELECTRONIC DEVICE, FIRST IPHONE' },
  { year: '2009', fig: '3A', no: 'US 7,479,949', img: 'us7479949-3a', cap: 'TOUCH SCREEN DEVICE, SLIDE TO UNLOCK' },
  { year: '2009', fig: '6A', no: 'US 7,479,949', img: 'us7479949-6a', cap: 'HEURISTICS FOR TOUCH COMMANDS' },
  { year: '2009', fig: '1', no: 'US D593,087', img: 'd593087', cap: 'ELECTRONIC DEVICE, IPHONE 3G' },
  { year: '2010', fig: '5A-D', no: 'US 7,657,849', img: 'us7657849', cap: 'UNLOCKING BY GESTURE ON AN UNLOCK IMAGE' },
  { year: '2010', fig: '', no: 'US 7,663,607', img: 'us7663607', cap: 'MULTIPOINT TOUCHSCREEN' },
  { year: '2010', fig: '1', no: 'US D618,677', img: 'd618677', cap: 'ELECTRONIC DEVICE' },
  { year: '2010', fig: '', no: 'US 7,844,914', img: 'us7844914', cap: 'VIRTUAL KEYS OF A TOUCH KEYBOARD' },
  { year: '2012', fig: '1', no: 'US D670,286', img: 'd670286', cap: 'PORTABLE DISPLAY DEVICE' },
];

export function cardHTML(c, i) {
  return `<div class="card" data-i="${i}"><div class="card-top"><span class="card-year">${c.year}</span><span class="card-fig">${c.fig ? 'FIG. ' + c.fig : 'FRONT PAGE'}</span></div>` +
    `<div class="card-art"><img src="${BASE}patents/${c.img}.jpg" alt="" decoding="async" draggable="false"></div>` +
    `<div class="card-cap"><b>${c.no}</b> ${c.cap}</div></div>`;
}

// [x%, y%, rotation deg, scale]
export const LAYOUT = [
  [30, 50, -7, 1.0], [68, 46, 5, 0.94], [44, 54, -3, 1.06], [62, 52, 8, 1.0], [27, 46, 4, 0.92],
  [52, 48, -9, 1.08], [74, 54, 3, 0.96], [36, 50, 7, 1.02], [58, 46, -5, 1.0], [48, 52, 2, 1.1],
];
