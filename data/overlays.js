// Historical map overlays — the test structure for alterations to the base map.
// Each entry becomes a toggleable layer with its own transparency slider.
//
// `rect` places the overlay in BASE-IMAGE PIXELS (the 2560x2008 land use map,
// x/y from the top-left corner). Overlays may extend past the base map edges
// when the historical map covers a larger area. Tune alignment by editing rect
// and reloading — or live in the browser console via LC_DEV.setRect(id, {...}).
window.LOSTCAUSE_OVERLAYS = [
  {
    id: 'gwtw-metro',
    name: '1939 GWTW Festival Map (metro)',
    source: 'The Atlanta Journal, Dec. 12, 1939 — 1934 Atlanta Chamber of Commerce map',
    url: 'assets/overlays/gwtw-1939-metro.png',
    rect: { x: -818, y: -1709, width: 4387, height: 5022 },
    opacity: 0.6,
    on: false,
  },
  {
    id: 'gwtw-downtown',
    name: '1939 GWTW Festival Map (downtown inset)',
    source: 'The Atlanta Journal, Dec. 12, 1939 — 1934 Atlanta Chamber of Commerce map',
    url: 'assets/overlays/gwtw-1939-downtown.jpg',
    rect: { x: 870, y: 902, width: 440, height: 373 },
    opacity: 0.6,
    on: false,
  },
];
