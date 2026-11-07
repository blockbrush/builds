#!/usr/bin/env node
// Opens builds in Blockbrush itself (the live site, in a headless Chrome) with the same readers a person opening
// the file uses, so a build that's broken, empty, too big or built in a newer Minecraft than it says is caught
// before it's merged. With --write (after merging, on main) each build's file and editable file are replaced by
// Blockbrush's own re-export of them (same format, details and corner kept), so the library never stores the bytes
// that were sent, and its block count and size go into check.json for the index.
//   node scripts/check-builds.js builds/my-farm builds/other   just those folders (the workflow passes the changed ones)
//   node scripts/check-builds.js --all                          every build
//   node scripts/check-builds.js --write builds/my-farm         and replace the files, write check.json
// BLOCKBRUSH_URL picks the page (default https://blockbrush.app/index.html); CHROME a Chrome to use.
const fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const root = path.join(__dirname, '..'), dir = path.join(root, 'builds');
const args = process.argv.slice(2);
const write = args.includes('--write'), all = args.includes('--all');
const PAGE = (process.env.BLOCKBRUSH_URL || 'https://blockbrush.app/index.html').replace(/[?#].*$/, '') + '?debug';
const OLDEST = '1.17'; // Blockbrush writes files for 1.17 and newer

let slugs = all ? fs.readdirSync(dir) : args.filter(a => !a.startsWith('--')).map(a => path.basename(a.replace(/\/+$/, '')));
slugs = [...new Set(slugs)].filter(s => !s.startsWith('_') && fs.existsSync(path.join(dir, s, 'info.json'))).sort();

const vNum = v => String(v).split('.').map(Number);
const before = (a, b) => { const x = vNum(a), y = vNum(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); return false; };
const summary = md => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); };

(async () => {
  if (!slugs.length) { console.log('No build folders to check.'); return; }
  const browser = await puppeteer.launch({
    headless: 'new', executablePath: process.env.CHROME || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const rows = [], problems = new Map();
  const bad = (slug, msg) => problems.set(slug, (problems.get(slug) || []).concat(msg));
  try {
    for (const slug of slugs) {
      const folder = path.join(dir, slug);
      let info;
      try { info = JSON.parse(fs.readFileSync(path.join(folder, 'info.json'), 'utf8')); } catch (e) { continue; } // build-index.js says why
      const version = String(info.minecraft || '').trim();
      if (/^\d+\.\d+(\.\d+)?$/.test(version) && before(version, OLDEST))
        bad(slug, `It says Minecraft ${version}, and Blockbrush writes files for ${OLDEST} and newer. The library takes builds from ${OLDEST} on for now.`);
      // a fresh page for each build, so one can't leave anything behind for the next
      const page = await browser.newPage();
      const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.goto(PAGE, { waitUntil: 'load', timeout: 90000 });
      const ready = await page.waitForFunction(() => window.__bb && !document.documentElement.classList.contains('bb-loading'), { timeout: 60000 }).then(() => true, () => false);
      if (!ready || !(await page.evaluate(() => typeof window.__bb.libCheck === 'function'))) {
        throw new Error(`${PAGE} has no library check (window.__bb.libCheck). Deploy the newest Blockbrush, then run this again.`);
      }
      const run = async (name, title) => {
        const b64 = fs.readFileSync(path.join(folder, name)).toString('base64');
        return page.evaluate((n, b, v, t) => window.__bb.libCheck(n, b, v, t), name, b64, version, title);
      };
      const r = typeof info.file === 'string' && fs.existsSync(path.join(folder, info.file)) ? await run(info.file, info.name) : null;
      if (!r) { await page.close(); continue; } // a missing file is build-index.js's to report
      if (r.error) bad(slug, `\`${info.file}\` didn't open in Blockbrush: ${r.error}`);
      if (r.gaps && r.gaps.length) bad(slug, `\`${info.file}\` has blocks that Minecraft ${version} doesn't have: ${r.gaps.slice(0, 12).join(', ')}${r.gaps.length > 12 ? '…' : ''}. Set \`"minecraft"\` to the version it was built in.`);
      let pr = null;
      if (typeof info.project === 'string' && fs.existsSync(path.join(folder, info.project))) {
        pr = await run(info.project, info.name);
        if (pr.error) bad(slug, `The editable file \`${info.project}\` didn't open in Blockbrush: ${pr.error}`);
        else if (pr.kind !== 'project') bad(slug, `\`${info.project}\` isn't a Blockbrush project file.`);
      }
      if (errs.length) console.log(`(${slug}: the page reported ${errs.length} error(s): ${errs.slice(0, 2).join(' | ')})`);
      rows.push({ slug, blocks: r.blocks, size: r.size, ok: !problems.has(slug) });
      if (write && !problems.has(slug)) {
        fs.writeFileSync(path.join(folder, info.file), Buffer.from(r.out, 'base64'));
        if (pr && pr.out) fs.writeFileSync(path.join(folder, info.project), Buffer.from(pr.out, 'base64'));
        fs.writeFileSync(path.join(folder, 'check.json'), JSON.stringify({ blocks: r.blocks, size: r.size, checked: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
      }
      await page.close();
    }
  } finally { await browser.close(); }

  const sizeOf = r => r.blocks ? `${r.blocks.toLocaleString('en-US')} blocks, ${r.size.join(' × ')}` : '–';
  for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FIX '} builds/${r.slug}: ${sizeOf(r)}`);
  summary('## Opened in Blockbrush\n\n| Build | Blocks | Size (wide × tall × long) | |\n|---|---|---|---|\n'
    + rows.map(r => `| ${r.slug} | ${r.blocks ? r.blocks.toLocaleString('en-US') : '–'} | ${r.size ? r.size.join(' × ') : '–'} | ${r.ok ? '✓' : 'needs a change'} |`).join('\n'));
  if (problems.size) {
    const list = [...problems].map(([slug, msgs]) => `**builds/${slug}**\n\n` + msgs.map(m => '- ' + m).join('\n')).join('\n\n');
    console.error('\n' + list.replace(/[`*]/g, ''));
    summary('\n### Needs a change\n\n' + list + '\n\nChange the files in your pull request and this check runs again.');
    process.exit(1);
  }
})().catch(e => { console.error(e.message || e); summary(`Couldn't run the check: ${e.message || e}`); process.exit(1); });
