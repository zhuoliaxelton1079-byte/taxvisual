import fs from 'fs';
import path from 'path';

/* ===========================================================================
   The whole site, not one page.

   The other five harnesses each prove one tool still computes what its
   workbook tab says. This one proves the things that hold *between* pages —
   the ones no single page can check about itself, and that a screenshot of
   any one page will never show you.

   It exists because of the failure CONTRIBUTING names as the most likely
   source of silent breakage: the nav and footer are hand-duplicated into
   every page, so a nav change applied to 29 of 31 pages leaves two pages
   pointing at a tab that no longer exists, and nothing complains. The same
   goes for the "to be built" convention, whose three rules live in three
   different files and drift apart quietly.

   Six classes of invariant:

     1. links      — every internal href/src resolves to a file on disk
     2. nav        — every page carries the same five tabs, in order
     3. marker     — at most one aria-current in the primary nav, and it is
                     on a tab the page actually belongs under
     4. chrome     — every page loads the three shared stylesheets
     5. sitemap    — every URL in sitemap.xml exists, and no noindex page
                     is listed there (rule 2 of the convention)
     6. backlog    — every noindex stub is listed on /sitemap/ (rule 3)

   Run from the repo root, no argument:

       node tests/verify-links.mjs
   =========================================================================== */

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

/* The nav, as the partial defines it. Changing the nav means changing this
   line too — which is the point: the diff makes the change reviewable. */
const TABS = ['Learn', 'Tools', 'Dashboard', 'Consulting', 'About'];

/* Two tabs own a folder that is not named after them: the 1040 preview is a
   tab on /tools/, so /review/* sits under Tools, and /training/* under
   Consulting. See "Two tabs whose folder is named something else" in
   docs/site-architecture.md. */
const SECTION_OF = {
  learn: 'Learn', tools: 'Tools', review: 'Tools',
  dashboard: 'Dashboard',
  consulting: 'Consulting', training: 'Consulting',
  about: 'About',
};

/* The template is deliberately outside the convention: noindex and
   robots-disallowed, but not part of the backlog on /sitemap/. */
const NOT_BACKLOG = new Set(['tools/_starter/index.html']);

/* On disk but not the website: git internals, dependencies, the design-source
   material, and the two working folders (also gitignored) that hold teaching
   material and sample returns. The gitignore alone is not enough — this walker
   reads the filesystem, not the index. */
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '_source',
  'data analytics', 'sample tax return for testing',
]);

/* Generated, self-contained, and served only inside an iframe: it carries no
   site chrome by design, and its own build script validates it. */
const EMBEDS = new Set(['dashboard/irs-soi/index.html']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = walk(ROOT)
  .map(p => path.relative(ROOT, p).split(path.sep).join('/'))
  .filter(p => !p.startsWith('assets/partials/'))   // reference copies, not pages
  .filter(p => !EMBEDS.has(p))                      // iframed artifacts, not pages
  .sort();

let fail = 0;
const ok = (cond, label, got, want) => {
  if (!cond) fail++;
  console.log('  ' + (cond ? 'PASS' : '**FAIL**').padEnd(10) + label.padEnd(56) +
    (want === undefined ? '' : String(got) + '  expected ' + String(want)));
};
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const navOf = html => {
  const m = html.match(/<nav aria-label="Primary">([\s\S]*?)<\/nav>/);
  return m ? m[1] : null;
};

console.log('Pages found: ' + pages.length + '\n');

/* ---- 1. every internal link resolves ----------------------------------- */
console.log('Internal links:');
let checked = 0;
const broken = [];
for (const page of pages) {
  const html = read(page);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|data:|#|\/\/)/.test(raw)) continue;
    checked++;
    const target = path.resolve(path.dirname(path.join(ROOT, page)), raw.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) broken.push(page + '  ->  ' + raw);
  }
}
for (const b of broken) console.log('             ' + b);
ok(broken.length === 0, checked + ' internal links resolve', broken.length + ' broken', 0);

/* ---- 2. every page carries the same five tabs, in order ---------------- */
console.log('\nPrimary nav:');
const missingNav = [], wrongTabs = [];
for (const page of pages) {
  const nav = navOf(read(page));
  if (nav === null) { missingNav.push(page); continue; }
  const labels = [...nav.matchAll(/<li><a [^>]*>([^<]+)<\/a><\/li>/g)].map(m => m[1]);
  if (labels.join('|') !== TABS.join('|')) wrongTabs.push(page + '  [' + labels.join(', ') + ']');
}
for (const p of missingNav) console.log('             no primary nav: ' + p);
for (const p of wrongTabs) console.log('             ' + p);
ok(missingNav.length === 0, 'every page has a primary nav', missingNav.length, 0);
ok(wrongTabs.length === 0, 'all carry ' + TABS.join(' / '), wrongTabs.length + ' differ', 0);

/* ---- 3. the current-page marker is present, singular, and correct ------ */
console.log('\nCurrent-page marker:');
const multi = [], misplaced = [], unmarked = [];
for (const page of pages) {
  const nav = navOf(read(page));
  if (nav === null) continue;
  const marks = [...nav.matchAll(/aria-current="(page|true)">([^<]+)</g)];
  if (marks.length > 1) { multi.push(page); continue; }

  const seg = page.split('/')[0];
  const expected = page.split('/').length === 1 ? null : SECTION_OF[seg] || null;
  if (expected === null) continue;              // methodology/, contact/, sitemap/, …

  if (marks.length === 0) { unmarked.push(page + '  (expected ' + expected + ')'); continue; }

  const [, kind, label] = marks[0];
  /* A page is its section's index only when it sits at <tab>/index.html.
     review/index.html is not: it lives under Dashboard, so it takes "true"
     like every other page in that folder. */
  const isSectionIndex = page === seg + '/index.html' && seg === expected.toLowerCase();
  if (label !== expected) misplaced.push(page + '  marked ' + label + ', expected ' + expected);
  else if (isSectionIndex && kind !== 'page') misplaced.push(page + '  is its section index, so needs aria-current="page"');
  else if (!isSectionIndex && kind !== 'true') misplaced.push(page + '  is inside a section, so needs aria-current="true"');
}
for (const p of multi) console.log('             more than one marker: ' + p);
for (const p of unmarked) console.log('             ' + p);
for (const p of misplaced) console.log('             ' + p);
ok(multi.length === 0, 'no page marks two tabs at once', multi.length, 0);
ok(unmarked.length === 0, 'every sectioned page marks its tab', unmarked.length, 0);
ok(misplaced.length === 0, 'every marker names the right tab and kind', misplaced.length, 0);

/* ---- 4. the three shared stylesheets ----------------------------------- */
console.log('\nShared chrome:');
for (const sheet of ['tokens', 'base', 'components']) {
  const missing = pages.filter(p => !read(p).includes('css/' + sheet + '.css'));
  for (const p of missing) console.log('             ' + sheet + '.css missing: ' + p);
  ok(missing.length === 0, 'every page loads ' + sheet + '.css', pages.length - missing.length, pages.length);
}

/* ---- 5. sitemap.xml agrees with what is on disk and what is noindex ---- */
console.log('\nsitemap.xml:');
const xml = read('sitemap.xml');
const locs = [...xml.matchAll(/<loc>https:\/\/taxvisual\.com\/([^<]*)<\/loc>/g)].map(m => m[1]);
const pageFor = loc => (loc === '' ? 'index.html' : loc.replace(/\/$/, '') + '/index.html');
const noindex = new Set(pages.filter(p => /name="robots" content="noindex"/.test(read(p))));

const ghost = locs.map(pageFor).filter(p => !pages.includes(p));
const listedStub = locs.map(pageFor).filter(p => noindex.has(p));
for (const p of ghost) console.log('             listed but not on disk: ' + p);
for (const p of listedStub) console.log('             noindex but listed: ' + p);
ok(ghost.length === 0, locs.length + ' listed URLs exist on disk', ghost.length + ' missing', 0);
ok(listedStub.length === 0, 'no noindex page is listed', listedStub.length, 0);

/* ---- 6. every stub is on the human site map, annotated ----------------- */
/* Only the listing inside <main> counts. The footer on that same page links
   to most of these stubs too, so searching the whole file would make this
   check pass no matter what — which is exactly what it did until a mutation
   test caught it. */
console.log('\nThe "to be built" backlog:');
const humanMain = (read('sitemap/index.html').match(/<main id="main">([\s\S]*?)<\/main>/) || [, ''])[1];
const listed = new Map();
for (const li of humanMain.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
  const href = (li[1].match(/href="([^"#]+)"/) || [])[1];
  if (href) listed.set(href.replace(/^(\.\.\/)+/, ''), /to be built/.test(li[1]));
}
const backlog = [...noindex].filter(p => !NOT_BACKLOG.has(p));
const unlisted = backlog.filter(p => !listed.has(p));
const unannotated = backlog.filter(p => listed.get(p) === false);
for (const p of unlisted) console.log('             not listed on /sitemap/: ' + p);
for (const p of unannotated) console.log('             listed but not marked "to be built": ' + p);
ok(unlisted.length === 0, backlog.length + ' stubs are listed on /sitemap/', unlisted.length + ' missing', 0);
ok(unannotated.length === 0, 'each is annotated "to be built"', unannotated.length + ' unmarked', 0);

console.log('\n' + (fail === 0
  ? 'All checks passed.'
  : fail + ' check(s) failed.'));
process.exit(fail === 0 ? 0 : 1);
