#!/usr/bin/env node
// Makes the library's website from index.json and the build folders, into _site/ (GitHub Pages serves it):
// a gallery of every build, and a page per build with its picture, details, "Open in Blockbrush" and downloads.
// Run after build-index.js. No dependencies. Every field came from someone's pull request: all text is escaped,
// and ids and paths are checked again here.
//   SITE_URL   where the site lives (link previews need whole addresses)  default https://builds.blockbrush.app
//   RAW_BASE   where the repo's files are read from                        default raw.githubusercontent.com/blockbrush/builds/main/
//   OPEN_BASE  the Blockbrush address "Open in Blockbrush" goes to        default https://blockbrush.app/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, '_site');
const SITE = (process.env.SITE_URL || 'https://builds.blockbrush.app').replace(/\/+$/, '');
const RAW = (process.env.RAW_BASE || 'https://raw.githubusercontent.com/blockbrush/builds/main/').replace(/\/*$/, '/');
const OPEN = process.env.OPEN_BASE || 'https://blockbrush.app/';
const REPO = 'https://github.com/blockbrush/builds';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/, IN_FOLDER = /^builds\/[a-z0-9-]+\/[\w.-]+$/;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, n) : '');
const extOf = f => (f.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();

const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
const builds = [];
for (const b of index.builds || []) {
  if (!b || !SLUG.test(b.id) || typeof b.file !== 'string' || !IN_FOLDER.test(b.file) || !b.file.startsWith(`builds/${b.id}/`)) continue;
  const okPath = p => typeof p === 'string' && IN_FOLDER.test(p) && p.startsWith(`builds/${b.id}/`) && fs.existsSync(path.join(root, p)) ? p : null;
  if (!okPath(b.file)) continue;
  builds.push({
    id: b.id, name: text(b.name, 80) || b.id, author: text(b.author, 60), description: text(b.description, 400),
    tags: (Array.isArray(b.tags) ? b.tags : []).filter(t => typeof t === 'string' && SLUG.test(t)).slice(0, 10),
    minecraft: text(b.minecraft, 20), added: /^\d{4}-\d\d-\d\d$/.test(b.added || '') ? b.added : '',
    file: b.file, preview: okPath(b.preview), project: okPath(b.project),
    // counted and measured by scripts/check-builds.js (Blockbrush itself), when it has run
    blocks: Number.isInteger(b.blocks) && b.blocks > 0 ? b.blocks : 0,
    size: Array.isArray(b.size) && b.size.length === 3 && b.size.every(n => Number.isInteger(n) && n > 0) ? b.size : null
  });
}

// ---- the look: Blockbrush's own tokens, light and dark ----
const CSS = `@font-face { font-family: "Geist"; font-weight: 400 700; font-display: swap; src: url(geist-latin.woff2) format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "Geist"; font-weight: 400 700; font-display: swap; src: url(geist-latin-ext.woff2) format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
@font-face { font-family: "Pixelify Sans"; font-weight: 500 700; font-display: swap; src: url(pixelify-sans-latin.woff2) format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "Pixelify Sans"; font-weight: 500 700; font-display: swap; src: url(pixelify-sans-latin-ext.woff2) format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
:root { --bg: #E4DDCF; --panel: #F3EEE4; --ink: #29241E; --muted: #6B6255; --line: #D6CCBA; --accent: #4C8A2A; --accent-ink: #FFFFFF;
  --accent-text: #3E7420; --viewport: #B9C1C7; --chrome: #E9E2D4; --btn: #ECE5D8; --btn-hover: #F9F6EF; --edge: #B9AD98;
  --bevel: inset 1px 1px 0 rgba(255,255,255,.8), inset -1px -1px 0 rgba(80,60,30,.14); --bevel-on: inset 1px 1px 0 rgba(255,255,255,.3), inset -1px -1px 0 rgba(0,0,0,.25);
  --shadow: 0 8px 24px rgba(60,45,20,.16); --r: 3px; color-scheme: light;
  --font: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif; --font-head: "Pixelify Sans", "Courier New", monospace; }
@media (prefers-color-scheme: dark) { :root { --bg: #1F1D1A; --panel: #2B2925; --ink: #ECE6DA; --muted: #A39B8D; --line: #3D3934; --accent: #86C25A; --accent-ink: #13200A;
  --accent-text: #8FCB63; --viewport: #57626C; --chrome: #23211E; --btn: #3A3732; --btn-hover: #47433D; --edge: #0F0E0C;
  --bevel: inset 1px 1px 0 rgba(255,255,255,.09), inset -1px -1px 0 rgba(0,0,0,.35); --shadow: 0 10px 30px rgba(0,0,0,.45); color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 var(--font); }
a { color: var(--accent-text); }
header.top { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--chrome); border-bottom: 1px solid var(--edge); }
header.top a.home { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
header.top img { image-rendering: pixelated; }
header.top .brand { font: 700 20px/1 var(--font-head); margin: 0; }
header.top .brand span { color: var(--accent-text); }
header.top .right { margin-left: auto; display: flex; gap: 8px; }
main { max-width: 1100px; margin: 0 auto; padding: 20px 16px 48px; }
h1, h2 { font-family: var(--font-head); font-weight: 700; color: var(--accent-text); margin: 0 0 6px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 5px 14px; border: 1px solid var(--edge); border-radius: var(--r);
  background: var(--btn); box-shadow: var(--bevel); color: var(--ink); font: inherit; font-size: 14px; text-decoration: none; cursor: pointer; }
.btn:hover { background: var(--btn-hover); }
.btn.primary { background: var(--accent); color: var(--accent-ink); box-shadow: var(--bevel-on); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.08); }
.lead { color: var(--muted); margin: 0 0 16px; max-width: 640px; }
.bar { display: flex; gap: 8px; margin-bottom: 8px; }
.bar input, .bar select { font: inherit; font-size: 14px; padding: 7px 10px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); color: var(--ink); }
.bar input { flex: 1; min-width: 0; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 16px; padding: 0; list-style: none; }
.tag { font-size: 12px; padding: 1px 8px; border: 1px solid var(--line); border-radius: var(--r); color: var(--muted); background: transparent; font-family: inherit; text-decoration: none; }
button.tag, a.tag { cursor: pointer; min-height: 26px; display: inline-flex; align-items: center; }
button.tag[aria-pressed="true"] { background: var(--accent); border-color: var(--edge); color: var(--accent-ink); }
.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 14px; }
.card { display: grid; gap: 4px; padding: 8px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); color: var(--ink); text-decoration: none; height: 100%; }
.card:hover, .card:focus-visible { border-color: var(--accent); box-shadow: var(--shadow); }
.pic { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r); background: var(--viewport); display: block; }
.card .name { font-weight: 600; }
.by { color: var(--muted); font-size: 13px; }
.empty { color: var(--muted); }
.build { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 24px; align-items: start; }
.build .pic { aspect-ratio: auto; border: 1px solid var(--line); }
.build .acts { display: grid; gap: 8px; margin: 16px 0; }
.build .desc { white-space: pre-line; margin: 10px 0; }
.small { font-size: 13px; color: var(--muted); }
.back { display: inline-block; margin-bottom: 14px; font-size: 14px; }
footer { max-width: 1100px; margin: 0 auto; padding: 0 16px 32px; font-size: 13px; color: var(--muted); }
@media (max-width: 720px) { .build { grid-template-columns: minmax(0, 1fr); } header.top .right .btn:not(.primary) { display: none; } }`;

const LOGO = (up) => `<a class="home" href="${up}"><img src="${up}assets/logo.png" width="31" height="23" alt=""><p class="brand">Blockbrush <span>builds</span></p></a>`;
function page({ title, desc, up, canonical, image, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="${up}assets/favicon.ico">
<link rel="stylesheet" href="${up}assets/site.css">
<meta property="og:site_name" content="Blockbrush builds">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
</head>
<body>
<header class="top">${LOGO(up)}<div class="right"><a class="btn" href="${esc(REPO)}#adding-a-build">Add your build</a><a class="btn primary" href="${esc(OPEN)}">Open Blockbrush</a></div></header>
${body}
<footer>Builds shared by players under <a href="${esc(REPO)}/blob/main/LICENSE.md">CC BY 4.0</a>: free to use, crediting their maker. Made from <a href="${esc(REPO)}">blockbrush/builds</a> on GitHub. Not affiliated with Mojang or Microsoft.</footer>
</body>
</html>
`;
}
const openLink = b => OPEN + '#open=' + RAW + (b.project || b.file);
const byLine = b => [b.author && `by ${esc(b.author)}`, b.minecraft && `Minecraft ${esc(b.minecraft)}`].filter(Boolean).join(' · ');
const sizeLine = b => b.blocks ? `${b.blocks.toLocaleString('en-US')} blocks${b.size ? ' · ' + b.size.join(' × ') : ''}` : '';

// ---- write it ----
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'site', 'assets'))) fs.copyFileSync(path.join(root, 'site', 'assets', f), path.join(out, 'assets', f));
fs.writeFileSync(path.join(out, 'assets', 'site.css'), CSS);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const host = new URL(SITE).hostname;
if (host !== 'localhost' && !host.endsWith('.github.io')) fs.writeFileSync(path.join(out, 'CNAME'), host + '\n');

for (const b of builds) {
  const dir = path.join(out, b.id);
  fs.mkdirSync(dir);
  const file = b.id + extOf(b.file);
  fs.copyFileSync(path.join(root, b.file), path.join(dir, file));
  if (b.preview) fs.copyFileSync(path.join(root, b.preview), path.join(dir, 'preview' + extOf(b.preview)));
  if (b.project) fs.copyFileSync(path.join(root, b.project), path.join(dir, b.id + '.blockbrush'));
  b.pic = b.preview ? 'preview' + extOf(b.preview) : null;
  const desc = b.description || `A Minecraft build${b.author ? ' by ' + b.author : ''}. Open it in Blockbrush or download it.`;
  fs.writeFileSync(path.join(dir, 'index.html'), page({
    title: `${b.name}${b.author ? ' by ' + b.author : ''} · Blockbrush builds`, desc, up: '../',
    canonical: `${SITE}/${b.id}/`, image: b.pic && `${SITE}/${b.id}/${b.pic}`,
    body: `<main>
<a class="back" href="../">← All builds</a>
<div class="build">
  <div>${b.pic ? `<img class="pic" src="${b.pic}" alt="${esc(b.name)}">` : `<div class="pic"></div>`}</div>
  <div>
    <h1>${esc(b.name)}</h1>
    <div class="by">${byLine(b)}</div>
    ${b.blocks ? `<div class="by">${sizeLine(b)}${b.size ? ' (wide × tall × long)' : ''}</div>` : ''}
    ${b.tags.length ? `<ul class="tags" style="margin:8px 0 0">${b.tags.map(t => `<li><a class="tag" href="../?tag=${esc(t)}">${esc(t)}</a></li>`).join('')}</ul>` : ''}
    ${b.description ? `<p class="desc">${esc(b.description)}</p>` : ''}
    <div class="acts">
      <a class="btn primary" href="${esc(openLink(b))}">Open in Blockbrush</a>
      <a class="btn" href="${esc(file)}" download>Download ${esc(file)}</a>
      ${b.project ? `<a class="btn" href="${esc(b.id)}.blockbrush" download>Download the editable Blockbrush file</a>` : ''}
    </div>
    <p class="small">Open it to look round, walk inside, change it and download it for your version. The .litematic pastes with Litematica; Blockbrush also turns it into a .schem, a structure block file or Bedrock's .mcstructure.</p>
    <p class="small">Shared under CC BY 4.0: if you share it on, credit ${esc(b.author || 'its maker')}.${b.added ? ` Added ${esc(b.added)}.` : ''}</p>
  </div>
</div>
</main>`
  }));
}

// the gallery: every build in the page, so it works and is found without scripts; the script only filters
const allTags = new Map();
for (const b of builds) for (const t of b.tags) allTags.set(t, (allTags.get(t) || 0) + 1);
const tagList = [...allTags].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(t => t[0]);
const sorted = builds.slice().sort((x, y) => y.added.localeCompare(x.added) || x.name.localeCompare(y.name));
fs.writeFileSync(path.join(out, 'index.html'), page({
  title: 'Blockbrush builds: Minecraft builds to open, change and download', up: '',
  desc: 'Minecraft builds shared by players. Open one in Blockbrush to look round, change it, and download it as a .litematic, .schem or structure file.',
  canonical: SITE + '/', image: sorted.find(b => b.pic) ? `${SITE}/${sorted.find(b => b.pic).id}/${sorted.find(b => b.pic).pic}` : null,
  body: `<main>
<h1>Builds</h1>
<p class="lead">Minecraft builds shared by players. Open one in Blockbrush to look round, walk inside and change it, then download it to paste in your world.</p>
<div class="bar"><input type="search" id="q" placeholder="Search by name or maker" aria-label="Search builds"><select id="sort" aria-label="Sort"><option value="new">Newest first</option><option value="name">By name</option><option value="big">Biggest first</option><option value="small">Smallest first</option></select></div>
${tagList.length ? `<ul class="tags" aria-label="Show only builds with this tag">${tagList.map(t => `<li><button type="button" class="tag" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button></li>`).join('')}</ul>` : ''}
<ul class="grid" id="grid">
${sorted.map(b => `<li data-name="${esc((b.name + ' ' + b.author).toLowerCase())}" data-tags=" ${esc(b.tags.join(' '))} " data-added="${esc(b.added)}" data-title="${esc(b.name.toLowerCase())}" data-blocks="${b.blocks}"><a class="card" href="${esc(b.id)}/">${b.pic ? `<img class="pic" src="${esc(b.id)}/${b.pic}" alt="" loading="lazy">` : `<div class="pic"></div>`}<span class="name">${esc(b.name)}</span><span class="by">${byLine(b)}</span>${b.blocks ? `<span class="by">${sizeLine(b)}</span>` : ''}${b.tags.length ? `<span class="tags" style="margin:2px 0 0">${b.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}</a></li>`).join('\n')}
</ul>
<p class="empty" id="none"${builds.length ? ' hidden' : ''}>${builds.length ? 'No builds match.' : 'No builds yet. Be the first: <a href="' + esc(REPO) + '#adding-a-build">add yours</a>.'}</p>
</main>
<script>
(function () {
  var q = document.getElementById("q"), sort = document.getElementById("sort"), grid = document.getElementById("grid"), none = document.getElementById("none");
  var items = [].slice.call(grid.children), tag = new URLSearchParams(location.search).get("tag") || "";
  function show() {
    var s = q.value.trim().toLowerCase(), n = 0;
    items.sort(function (a, b) {
      var x = +a.dataset.blocks || 0, y = +b.dataset.blocks || 0;
      if (sort.value === "name") return a.dataset.title.localeCompare(b.dataset.title);
      // by size: builds the check hasn't counted yet go last
      if (sort.value === "big" || sort.value === "small") return (!x - !y) || (sort.value === "big" ? y - x : x - y) || a.dataset.title.localeCompare(b.dataset.title);
      return b.dataset.added.localeCompare(a.dataset.added) || a.dataset.title.localeCompare(b.dataset.title);
    });
    items.forEach(function (li) { var on = (!s || li.dataset.name.indexOf(s) >= 0) && (!tag || li.dataset.tags.indexOf(" " + tag + " ") >= 0); li.hidden = !on; if (on) n++; grid.appendChild(li); });
    [].forEach.call(document.querySelectorAll("button.tag"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.tag === tag)); });
    if (items.length) none.hidden = n > 0;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button.tag"); if (!b) return;
    tag = tag === b.dataset.tag ? "" : b.dataset.tag;
    history.replaceState(null, "", tag ? "?tag=" + encodeURIComponent(tag) : location.pathname);
    show();
  });
  q.addEventListener("input", show); sort.addEventListener("change", show);
  show();
})();
</script>`
}));
fs.writeFileSync(path.join(out, '404.html'), page({ title: 'Not found · Blockbrush builds', desc: 'That build isn\'t here.', up: '/', canonical: SITE + '/',
  body: `<main><h1>Not here</h1><p class="lead">That build isn't in the library, or it was taken down. <a href="/">See all builds</a>.</p></main>` }));
console.log(`_site: ${builds.length} builds`);
