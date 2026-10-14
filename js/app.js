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
    zoomSnap: 0,              // fractional zoom levels — no snapping between steps
    zoomDelta: 0.25,          // finer steps for the +/- buttons and keyboard
    wheelPxPerZoomLevel: 150, // more scroll per level = slower, smoother wheel zoom
    wheelDebounceTime: 20,
    attributionControl: false,
  });

  var bounds = L.latLngBounds([[0, 0], [IMG.height, IMG.width]]);
  L.imageOverlay(IMG.url, bounds).addTo(map);
  map.fitBounds(bounds);
  map.setMaxBounds(bounds.pad(0.25));

  L.control.attribution({ prefix: false })
    .addAttribution('Atlanta Housing Authority, Land Use Map, 1945 — Kenan Research Center, Atlanta History Center')
    .addTo(map);

  // percent coords -> CRS.Simple latlng (y measured from the top of the image)
  function toLatLng(m) {
    return L.latLng(IMG.height - (m.y / 100) * IMG.height, (m.x / 100) * IMG.width);
  }

  // ---------- pins ----------
  var activePin = null;
  var leafletMarkers = {};

  // pin color encodes the source of the marker text:
  // archive = red, journal (1939 Atlanta Journal) = blue, both = split
  function srcClass(m) {
    if (m.src === 'journal') return ' lc-pin-journal';
    if (m.src === 'both') return ' lc-pin-both';
    if (m.src === 'none' || !m.html) return ' lc-pin-nocontent';
    return '';
  }

  MARKERS.forEach(function (m) {
    var icon = L.divIcon({
      className: '',
      html: '<div class="lc-pin' + srcClass(m) + '">' + m.label + '</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    var mk = L.marker(toLatLng(m), { icon: icon, title: m.title }).addTo(map);
    mk.bindTooltip(m.title, { className: 'lc-tooltip', direction: 'top', offset: [0, -14] });
    mk.on('click', function () { openDetail(m, mk); });
    leafletMarkers[m.spotId] = mk;
  });

  // ---------- historical map overlays ----------
  // Overlay rects are in base-image pixels (y from the top); convert to
  // CRS.Simple latlngs (lat measured from the bottom of the base image).
  function rectToBounds(r) {
    return L.latLngBounds(
      [IMG.height - (r.y + r.height), r.x],   // south-west
      [IMG.height - r.y, r.x + r.width]       // north-east
    );
  }

  var overlayLayers = {};
  (window.LOSTCAUSE_OVERLAYS || []).forEach(function (o) {
    var layer = L.imageOverlay(o.url, rectToBounds(o.rect), { opacity: o.opacity });
    if (o.on) layer.addTo(map);
    overlayLayers[o.id] = layer;
  });

  // always-visible legend for the pin colors
  var legend = L.control({ position: 'bottomleft' });
  legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'lc-legend');
    div.innerHTML =
      '<span class="lc-swatch"></span> Archival record' +
      '<span class="lc-swatch lc-pin-journal"></span> Atlanta Journal, 1939' +
      '<span class="lc-swatch lc-pin-both"></span> Both';
    return div;
  };
  legend.addTo(map);

  // dev handle for tuning overlay alignment from the browser console:
  //   LC_DEV.setRect('gwtw-metro', {x:..., y:..., width:..., height:...})
  window.LC_DEV = {
    map: map,
    overlays: overlayLayers,
    setRect: function (id, r) { overlayLayers[id].setBounds(rectToBounds(r)); return r; },
  };

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
    if (e.key === 'Escape') ['index-panel', 'detail-panel', 'about-panel', 'overlays-panel'].forEach(closePanel);

    // global zoom keys — work anywhere on the page, not just with the map focused
    if (e.target.matches('input, textarea')) return;
    if (e.key === '+' || e.key === '=') map.zoomIn(0.5);
    else if (e.key === '-' || e.key === '_') map.zoomOut(0.5);
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
    var dot = document.createElement('span');
    dot.className = 'lc-swatch' + srcClass(m);
    var num = document.createElement('span');
    num.className = 'idx-num';
    num.textContent = m.label;
    var txt = document.createElement('span');
    // strip the leading "(NN)" from the title for the list — the number column has it
    txt.textContent = m.title.replace(/^\s*\(?\s*\d+\s*\)?[\s.]*/, '') || m.title;
    btn.appendChild(dot);
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

  // ---------- overlays panel ----------
  var overlayList = el('overlay-list');
  (window.LOSTCAUSE_OVERLAYS || []).forEach(function (o) {
    var layer = overlayLayers[o.id];

    var row = document.createElement('div');
    row.className = 'overlay-row';

    var label = document.createElement('label');
    label.className = 'overlay-toggle';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!o.on;
    var name = document.createElement('span');
    name.textContent = o.name;
    label.appendChild(cb);
    label.appendChild(name);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 100;
    slider.value = Math.round(o.opacity * 100);
    slider.className = 'overlay-opacity';
    slider.setAttribute('aria-label', 'Transparency of ' + o.name);
    slider.disabled = !o.on;

    var src = document.createElement('p');
    src.className = 'overlay-source';
    src.textContent = o.source;

    cb.addEventListener('change', function () {
      if (cb.checked) { layer.addTo(map); slider.disabled = false; }
      else { map.removeLayer(layer); slider.disabled = true; }
    });
    slider.addEventListener('input', function () {
      layer.setOpacity(slider.value / 100);
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(src);
    overlayList.appendChild(row);
  });

  el('btn-overlays').addEventListener('click', function () {
    var panel = el('overlays-panel');
    panel.hidden = !panel.hidden;
    this.setAttribute('aria-expanded', String(!panel.hidden));
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
