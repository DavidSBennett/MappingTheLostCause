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
- [data/source/](data/source/) — the two source-of-truth exports:
  - `image-map-pro-export.json` — the Image Map Pro export (spot positions, tooltips, links)
  - `posts-export.csv` — the WordPress posts export (marker titles + archival content)
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
