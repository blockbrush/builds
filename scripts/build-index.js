#!/usr/bin/env node
// Reads builds/*/info.json and writes index.json. With --check it only reports problems (for pull requests).
// No dependencies: runs on the Node that GitHub's runners already have.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'builds');
const check = process.argv.includes('--check');
const FILE = /\.(litematic|schem|nbt|mcstructure)$/i, SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/, TAG = SLUG;
const MAX_BYTES = 5 * 1024 * 1024;

const problems = [], builds = [];
for (const slug of fs.readdirSync(dir).sort()) {
  if (slug.startsWith('_') || !fs.statSync(path.join(dir, slug)).isDirectory()) continue;
  const bad = msg => problems.push(`builds/${slug}: ${msg}`);
  if (!SLUG.test(slug)) bad('folder name must be lower case words joined with dashes');
  let info;
  try { info = JSON.parse(fs.readFileSync(path.join(dir, slug, 'info.json'), 'utf8')); }
  catch (e) { bad(`info.json missing or not valid JSON (${e.message})`); continue; }
  for (const k of ['name', 'author', 'minecraft', 'file']) if (typeof info[k] !== 'string' || !info[k].trim()) bad(`"${k}" is required`);
  if (!Array.isArray(info.tags) || !info.tags.length) bad('"tags" needs at least one tag');
  else for (const t of info.tags) if (typeof t !== 'string' || !TAG.test(t)) bad(`tag "${t}" must be lower case words joined with dashes`);
  const file = path.join(dir, slug, info.file || '');
  if (info.file && (!FILE.test(info.file) || info.file.includes('/'))) bad('"file" must be a .litematic, .schem, .nbt or .mcstructure in the folder');
  else if (info.file && !fs.existsSync(file)) bad(`${info.file} not found`);
  else if (info.file && fs.statSync(file).size > MAX_BYTES) bad(`${info.file} is over ${MAX_BYTES / 1024 / 1024} MB`);
  if (info.preview && !fs.existsSync(path.join(dir, slug, info.preview))) bad(`${info.preview} not found`);
  builds.push({
    id: slug, name: info.name, author: info.author, description: info.description || '',
    tags: info.tags || [], minecraft: info.minecraft, added: info.added || '',
    file: `builds/${slug}/${info.file}`, preview: info.preview ? `builds/${slug}/${info.preview}` : null,
  });
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
if (check) { console.log(`${builds.length} builds OK`); process.exit(0); }
builds.sort((a, b) => (b.added || '').localeCompare(a.added || '') || a.id.localeCompare(b.id));
fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ version: 1, builds }, null, 2) + '\n');
console.log(`index.json: ${builds.length} builds`);
