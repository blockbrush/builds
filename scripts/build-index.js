#!/usr/bin/env node
// Reads builds/*/info.json and writes index.json. With --check it only reports problems (for pull requests).
// Each build's block count and size come from its check.json, written by scripts/check-builds.js (Blockbrush itself)
// once the build is merged. No dependencies: runs on the Node that GitHub's runners already have.
// Problems are written so the person who sent the build knows what to change; on GitHub they also go into the
// check's summary page.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'builds');
const check = process.argv.includes('--check');
const FILE = /\.(litematic|schem|nbt|mcstructure)$/i, SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/, TAG = SLUG;
const PIC = /\.(png|jpe?g|webp)$/i, VERSION = /^\d+\.\d+(\.\d+)?$/;
const MAX_BYTES = 5 * 1024 * 1024, MAX_PIC = 2 * 1024 * 1024;
const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB';

const problems = [], builds = [];
for (const slug of fs.readdirSync(dir).sort()) {
  if (slug.startsWith('_') || !fs.statSync(path.join(dir, slug)).isDirectory()) continue;
  const bad = msg => problems.push({ slug, msg });
  if (!SLUG.test(slug)) bad(`The folder's name has to be lower case words joined with dashes, like \`${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-build'}\`.`);
  let info;
  try { info = JSON.parse(fs.readFileSync(path.join(dir, slug, 'info.json'), 'utf8')); }
  catch (e) {
    bad(fs.existsSync(path.join(dir, slug, 'info.json'))
      ? `\`info.json\` isn't valid JSON (${e.message}). A missing comma or quote is the usual cause; Share to the library in Blockbrush writes one that's right.`
      : 'The folder has no `info.json`. Copy the one from `builds/_template` and fill it in.');
    continue;
  }
  const words = { name: "the build's name", author: 'your name as you want to be credited', minecraft: 'the Minecraft version it was built in, like `1.21.4`', file: 'the build file\'s name, like `build.litematic`' };
  for (const k of Object.keys(words)) if (typeof info[k] !== 'string' || !info[k].trim()) bad(`\`"${k}"\` is missing in info.json: put ${words[k]} there.`);
  if (typeof info.minecraft === 'string' && info.minecraft.trim() && !VERSION.test(info.minecraft.trim())) bad(`\`"minecraft"\` should be just the version number, like \`1.21.4\` (it says \`${info.minecraft}\`).`);
  if (!Array.isArray(info.tags) || !info.tags.length) bad('`"tags"` needs at least one tag, like `["farm", "redstone"]`.');
  else for (const t of info.tags) if (typeof t !== 'string' || !TAG.test(t)) bad(`The tag \`${t}\` has to be lower case words joined with dashes, like \`${String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mob-farm'}\`.`);
  const file = path.join(dir, slug, info.file || '');
  if (info.file && (!FILE.test(info.file) || info.file.includes('/'))) bad('`"file"` has to be a .litematic, .schem, .nbt or .mcstructure file in the same folder.');
  else if (info.file && !fs.existsSync(file)) bad(`info.json names \`${info.file}\`, but there's no file by that name in the folder. Check the spelling, or upload it.`);
  else if (info.file && fs.statSync(file).size > MAX_BYTES) bad(`\`${info.file}\` is ${mb(fs.statSync(file).size)}; the library takes files up to ${mb(MAX_BYTES)}.`);
  if (info.preview !== undefined && info.preview !== null) {
    const pic = path.join(dir, slug, String(info.preview));
    if (typeof info.preview !== 'string' || !PIC.test(info.preview) || info.preview.includes('/')) bad('`"preview"` has to be a .png, .jpg or .webp picture in the same folder.');
    else if (!fs.existsSync(pic)) bad(`info.json names the picture \`${info.preview}\`, but it isn't in the folder.`);
    else if (fs.statSync(pic).size > MAX_PIC) bad(`The picture \`${info.preview}\` is ${mb(fs.statSync(pic).size)}; keep it under ${mb(MAX_PIC)} (Share to the library makes an 800 × 600 one).`);
  }
  // the editable Blockbrush file, when its maker included it
  if (info.project !== undefined) {
    const proj = path.join(dir, slug, String(info.project));
    if (typeof info.project !== 'string' || !/\.blockbrush$/i.test(info.project) || info.project.includes('/')) bad('`"project"` has to be a .blockbrush file in the same folder (or leave it out).');
    else if (!fs.existsSync(proj)) bad(`info.json names \`${info.project}\`, but it isn't in the folder.`);
    else if (fs.statSync(proj).size > MAX_BYTES) bad(`\`${info.project}\` is ${mb(fs.statSync(proj).size)}; the library takes files up to ${mb(MAX_BYTES)}. Leave the editable file out to share the build alone.`);
  }
  // what Blockbrush counted (scripts/check-builds.js --write); left out until it has run
  let counted = {};
  try { counted = JSON.parse(fs.readFileSync(path.join(dir, slug, 'check.json'), 'utf8')); } catch (e) {}
  const blocks = Number.isInteger(counted.blocks) && counted.blocks > 0 ? counted.blocks : undefined;
  const size = Array.isArray(counted.size) && counted.size.length === 3 && counted.size.every(n => Number.isInteger(n) && n > 0) ? counted.size : undefined;
  builds.push({
    id: slug, name: info.name, author: info.author, description: info.description || '',
    tags: info.tags || [], minecraft: info.minecraft, added: info.added || '',
    file: `builds/${slug}/${info.file}`, preview: info.preview ? `builds/${slug}/${info.preview}` : null,
    project: info.project ? `builds/${slug}/${info.project}` : null,
    ...(blocks ? { blocks } : {}), ...(size ? { size } : {}),
  });
}

function summary(md) { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); }
if (problems.length) {
  const bySlug = new Map();
  for (const p of problems) bySlug.set(p.slug, (bySlug.get(p.slug) || []).concat(p.msg));
  const text = [...bySlug].map(([slug, msgs]) => `builds/${slug}:\n` + msgs.map(m => '  - ' + m).join('\n')).join('\n');
  console.error('Some info.json files need a change:\n' + text.replace(/`/g, ''));
  summary('## info.json needs a change\n\n' + [...bySlug].map(([slug, msgs]) => `**builds/${slug}**\n\n` + msgs.map(m => '- ' + m).join('\n')).join('\n\n')
    + '\n\nChange the files in your pull request (the pencil on each file in the "Files changed" tab), and this check runs again.');
  process.exit(1);
}
if (check) { console.log(`${builds.length} builds OK`); summary(`info.json: all ${builds.length} builds look right.`); process.exit(0); }
builds.sort((a, b) => (b.added || '').localeCompare(a.added || '') || a.id.localeCompare(b.id));
fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ version: 1, builds }, null, 2) + '\n');
console.log(`index.json: ${builds.length} builds`);
