/* Mapping the Lost Cause — Leaflet front end.
 * Recreates the WordPress Image Map Pro viewer as a standalone page:
 * the 1938 land-use map as an L.imageOverlay in CRS.Simple, with the
 * Image Map Pro spots (percent coordinates) as numbered pins.
 */
(function () {
  'use strict';

  var IMG = window.LOSTCAUSE.image;
  var MARKERS = window.LOSTCAUSE.markers;

  // ---------- map ----------
  var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    attributionControl: false,
  });

  var bounds = L.latLngBounds([[0, 0], [IMG.height, IMG.width]]);
  L.imageOverlay(IMG.url, bounds).addTo(map);
  map.fitBounds(bounds);
  map.setMaxBounds(bounds.pad(0.25));

  L.control.attribution({ prefix: false })
    .addAttribution('1938 Housing Authority Land Use Map of Atlanta')
    .addTo(map);

  // percent coords -> CRS.Simple latlng (y measured from the top of the image)
  function toLatLng(m) {
    return L.latLng(IMG.height - (m.y / 100) * IMG.height, (m.x / 100) * IMG.width);
  }

  // ---------- pins ----------
  var activePin = null;
  var leafletMarkers = {};

  MARKERS.forEach(function (m) {
    var icon = L.divIcon({
      className: '',
      html: '<div class="lc-pin' + (m.html ? '' : ' lc-pin-nocontent') + '">' + m.label + '</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    var mk = L.marker(toLatLng(m), { icon: icon, title: m.title }).addTo(map);
    mk.bindTooltip(m.title, { className: 'lc-tooltip', direction: 'top', offset: [0, -14] });
    mk.on('click', function () { openDetail(m, mk); });
    leafletMarkers[m.spotId] = mk;
  });

  // ---------- panels ----------
  function el(id) { return document.getElementById(id); }

  function closePanel(id) {
    el(id).hidden = true;
    if (id === 'index-panel') el('btn-index').setAttribute('aria-expanded', 'false');
    if (id === 'detail-panel' && activePin) {
      activePin.classList.remove('lc-pin-active');
      activePin = null;
    }
  }

  document.querySelectorAll('.panel-close').forEach(function (btn) {
    btn.addEventListener('click', function () { closePanel(btn.dataset.close); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') ['index-panel', 'detail-panel', 'about-panel'].forEach(closePanel);
  });

  function openDetail(m, mk) {
    if (activePin) activePin.classList.remove('lc-pin-active');
    activePin = mk.getElement() && mk.getElement().querySelector('.lc-pin');
    if (activePin) activePin.classList.add('lc-pin-active');

    el('detail-title').textContent = m.title;
    el('detail-body').innerHTML = m.html ||
      '<p class="panel-empty">No archival description has been transcribed for this marker yet.</p>';
    el('detail-body').scrollTop = 0;
    el('detail-panel').hidden = false;
    closePanel('about-panel');
  }

  // ---------- marker index ----------
  var list = el('index-list');
  MARKERS.forEach(function (m) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    var num = document.createElement('span');
    num.className = 'idx-num';
    num.textContent = m.label;
    var txt = document.createElement('span');
    // strip the leading "(NN)" from the title for the list — the number column has it
    txt.textContent = m.title.replace(/^\s*\(?\s*\d+\s*\)?[\s.]*/, '') || m.title;
    btn.appendChild(num);
    btn.appendChild(txt);
    btn.addEventListener('click', function () {
      var mk = leafletMarkers[m.spotId];
      map.flyTo(toLatLng(m), Math.max(map.getZoom(), 0), { duration: 0.6 });
      openDetail(m, mk);
      if (window.matchMedia('(max-width: 900px)').matches) closePanel('index-panel');
    });
    li.appendChild(btn);
    li.dataset.text = (m.label + ' ' + m.title).toLowerCase();
    list.appendChild(li);
  });

  el('index-filter').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    list.querySelectorAll('li').forEach(function (li) {
      li.hidden = q !== '' && li.dataset.text.indexOf(q) === -1;
    });
  });

  el('btn-index').addEventListener('click', function () {
    var panel = el('index-panel');
    panel.hidden = !panel.hidden;
    this.setAttribute('aria-expanded', String(!panel.hidden));
  });
  el('btn-about').addEventListener('click', function () {
    el('about-panel').hidden = false;
    closePanel('detail-panel');
  });
})();
