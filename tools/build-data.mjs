// Build data/markers.js from the two source exports:
//   data/source/image-map-pro-export.json  (spot positions, WordPress Image Map Pro)
//   data/source/posts-export.csv           (WordPress post content)
//
// Join order per spot: marker number in the tooltip heading -> WP post id in
// the spot link (?p=NNN / post=NNN) -> URL slug. Run: node tools/build-data.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- CSV parsing (RFC 4180, handles quoted multiline fields) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csvRows = parseCsv(readFileSync(join(root, 'data/source/posts-export.csv'), 'utf8').replace(/^﻿/, ''));
const header = csvRows[0];
const idCol = header.indexOf('id');
const titleCol = header.indexOf('Title');
const contentCol = header.indexOf('Content');

// number extracted from a post title like "(109)  The Nedom L. Angier house"
const numFromTitle = (t) => {
  const m = t.match(/^\s*\(?\s*(\d+)\s*\)?/);
  return m ? Number(m[1]) : null;
};

const posts = csvRows.slice(1).map((r) => ({
  id: Number(r[idCol]),
  title: (r[titleCol] || '').trim(),
  content: r[contentCol] || '',
})).filter((p) => p.id && p.title);

const postsByNum = new Map();
const postsById = new Map();
for (const p of posts) {
  postsById.set(p.id, p);
  const n = numFromTitle(p.title);
  if (n !== null && !postsByNum.has(n)) postsByNum.set(n, p);
}

// ---------- Image Map Pro spots ----------
const imp = JSON.parse(readFileSync(join(root, 'data/source/image-map-pro-export.json'), 'utf8'));

const headingOf = (spot) => {
  try {
    for (const c of spot.tooltip_content.squares_settings.containers)
      for (const el of c.settings.elements)
        if (el.options?.heading?.text) return el.options.heading.text.replace(/\s+/g, ' ').trim();
  } catch { /* fall through */ }
  return null;
};

const markers = [];
for (const spot of imp.spots) {
  const heading = headingOf(spot) || spot.title;
  // marker number from the heading: "(97) ...", "97 ...", "(101)\t..."
  let num = null;
  const hm = heading.match(/^\(?\s*(\d+)\s*\)?[\s.]/) || heading.match(/^\(?\s*(\d+)\s*\)?$/);
  if (hm) num = Number(hm[1]);

  // WP post id embedded in the link (?p=195, wp-admin/post=149)
  const link = spot.actions?.link || '';
  const pidMatch = link.match(/(?:\?p=|post=)(\d+)/);
  const pid = pidMatch ? Number(pidMatch[1]) : null;

  let post = (num !== null && postsByNum.get(num)) || (pid !== null && postsById.get(pid)) || null;

  // last resort: slug words against post titles
  if (!post && /marker-campaign\//.test(link)) {
    const slug = link.replace(/\(opens in a new tab\)$/, '').replace(/^#/, '')
      .split('marker-campaign/')[1]?.replace(/\/$/, '') || '';
    const slugWords = slug.replace(/%[0-9a-f]{2}/gi, '').split('-').filter((w) => w.length > 3);
    if (slugWords.length >= 2) {
      post = posts.find((p) => {
        const t = p.title.toLowerCase();
        return slugWords.filter((w) => t.includes(w)).length >= Math.ceil(slugWords.length * 0.6);
      }) || null;
    }
  }

  if (post && num === null) num = numFromTitle(post.title);

  // strip Gutenberg block comments; content is otherwise plain HTML.
  // Language stays verbatim — only whitespace is normalized: runs of
  // &nbsp;/tabs/multiple spaces collapse to a single space.
  // stray invisible characters WordPress leaves behind (object-replacement, zero-width)
  const deJunk = (s) => s.replace(/[￼​﻿]/g, '');

  const html = post
    ? deJunk(post.content)
        .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
        .replace(/(?:(?:&nbsp;| |[ \t])*(?:&nbsp;| )(?:&nbsp;| |[ \t])*)/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/<(p|h[1-6]|li|strong|em|span)([^>]*)>[ \t]+/g, '<$1$2>')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : '';

  markers.push({
    spotId: spot.id,
    num,
    label: num !== null ? String(num) : '?',
    title: deJunk(post ? post.title : heading).replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim(),
    x: spot.x,
    y: spot.y,
    html,
  });
}

markers.sort((a, b) => (a.num ?? 999) - (b.num ?? 999));

const matched = markers.filter((m) => m.html).length;
console.log(`Spots: ${markers.length}, matched to post content: ${matched}`);
for (const m of markers.filter((m) => !m.html)) console.log(`  UNMATCHED: ${m.spotId} "${m.title}"`);

const out = `// Generated by tools/build-data.mjs — do not edit by hand.
window.LOSTCAUSE = {
  image: { width: ${imp.general.naturalWidth}, height: ${imp.general.naturalHeight}, url: 'assets/atlanta-1945-land-use-map.jpg' },
  markers: ${JSON.stringify(markers, null, 2)}
};
`;
writeFileSync(join(root, 'data/markers.js'), out);
console.log('Wrote data/markers.js');
