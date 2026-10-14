# Mapping the Lost Cause

An interactive map of the **1939 Atlanta historical marker campaign**, plotted on the
1945 Atlanta Housing Authority *Land Use Map* (Kenan Research Center, Atlanta History
Center, VIS 290.001.015.002). This is a standalone, static
JavaScript rebuild of the WordPress Image Map Pro system previously at
[davidsbennett.com/mapping-the-lost-cause-1939-atlanta](https://davidsbennett.com/mapping-the-lost-cause-1939-atlanta/).

**Live site:** https://lostcause.thehistorians.org

## How it works

- [index.html](index.html) + [js/app.js](js/app.js) — a [Leaflet](https://leafletjs.com/)
  map in `CRS.Simple` mode. The scanned 1945 map (`assets/atlanta-1945-land-use-map.jpg`,
  2560×2008) is an `L.imageOverlay`; each historical marker is a numbered pin with a
  hover tooltip and a click-to-open reading panel containing the full archival text.
- [data/markers.js](data/markers.js) — **generated file**: one record per marker with
  its position (the original Image Map Pro percent coordinates) and the post HTML.
- [data/overlays.js](data/overlays.js) — historical map overlays, each a toggleable
  Leaflet layer with its own transparency slider (the Overlays panel). An overlay's
  `rect` positions it in base-image pixels; tune alignment live in the browser console
  with `LC_DEV.setRect(id, rect)`, then bake the values into this file. Current
  overlays: the 1934 Chamber of Commerce map (metro + downtown inset) printed in The
  Atlanta Journal, Dec. 12, 1939, for the *Gone With the Wind* festival. In the metro
  image the newspaper's printed inset box is cut to transparency so the base map shows
  through.
- [data/source/](data/source/) — the source-of-truth material:
  - `image-map-pro-export.json` — the Image Map Pro export (spot positions, tooltips, links)
  - `posts-export.csv` — the WordPress posts export (marker titles + archival content)
  - `atlanta-journal-1939-12-12.md` — transcription of the Journal's marker legend
    (map page + continuation page); the two page scans sit alongside it
- [tools/build-data.mjs](tools/build-data.mjs) — joins the two exports into
  `data/markers.js`. Markers are matched by marker number in the tooltip heading,
  falling back to the WP post id in the spot link, then to URL-slug matching.

## Updating the content

1. Edit the source exports in `data/source/` (or drop in fresh exports from WordPress).
2. Regenerate:
   ```bash
   node tools/build-data.mjs
   ```
3. Commit and push to `main` — the GitHub Action deploys automatically.

## Deployment

Push to `main` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml) rsyncs
the deploy set (`index.html`, `css/`, `js/`, `assets/`, `data/markers.js`) over SSH to
`public_html/lostcause.thehistorians.org/` on GreenGeeks — the same system as the
other thehistorians.org projects.

One-time setup:

1. **cPanel → Domains** — create subdomain `lostcause.thehistorians.org` with docroot
   `public_html/lostcause.thehistorians.org`.
2. **GitHub repo → Settings → Secrets and variables → Actions** — add the same four
   secrets the other projects use: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USERNAME`,
   `SSH_PORT`.
