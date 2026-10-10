import fs from 'fs';
import vm from 'vm';

/* The shared workpaper kit: assets/js/workpaper.js (behaviour) and
   assets/css/workpaper.css (look). The kit moves text and state around and
   never computes tax, so what is worth asserting is that the helpers behave,
   that the URL state round-trips, and that every tool which links the kit
   carries the markup its script expects.

     node tests/verify-workpaper-kit.mjs            (run from the repo root)  */

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('  **FAIL**', msg); } return ok; };

const js = fs.readFileSync('assets/js/workpaper.js', 'utf8');
const css = fs.readFileSync('assets/css/workpaper.css', 'utf8');

/* ---- run the kit against a stub browser ---- */
let hash = '';
const calls = [];
const win = {
  Intl,
  URLSearchParams,
  history: { replaceState: (a, b, h) => { hash = h; calls.push(h); } },
  location: { get hash() { return hash; }, href: 'https://taxvisual.com/tools/x/' },
  document: { getElementById: () => null, createElement: () => ({ style:{}, appendChild(){}, setAttribute(){} }) },
  navigator: {}
};
win.window = win;
vm.createContext(win);
vm.runInContext(js, win);
const WP = win.Workpaper;

console.log('helpers:');
check(WP.money(1234.5) === '$1,235', 'money rounds and groups: ' + WP.money(1234.5));
check(WP.money(-250000) === '−$250,000', 'money uses a true minus sign: ' + WP.money(-250000));
check(WP.parseMoney('$1,234,567.89') === 1234567.89, 'parseMoney strips symbols and commas');
check(WP.parseMoney('') === null && WP.parseMoney('abc') === null && WP.parseMoney(null) === null, 'parseMoney returns null for no number');
check(WP.parseMoney('-5') === 5, 'a typed minus is dropped: no negative inputs reach a model');
check(WP.delta(1500, 1000) === '+$500 vs baseline', 'delta up: ' + WP.delta(1500, 1000));
check(WP.delta(900, 1000) === '−$100 vs baseline', 'delta down: ' + WP.delta(900, 1000));
check(WP.delta(1000, 1000) === 'same as baseline', 'delta equal');
check(WP.delta(null, 1000) === '' && WP.delta(5, null) === '', 'delta is empty without both figures');
console.log('  PASS');

console.log('\nURL state:');
{
  WP.hash.save({ ti: 245000, k: 1, empty: '', gone: null, rate: 0 });
  check(hash === '#ti=245000&k=1&rate=0', 'save skips empty and null, keeps zero: ' + hash);
  const back = WP.hash.load();
  check(back && back.ti === '245000' && back.k === '1' && back.rate === '0' && !('empty' in back), 'load reads it back as strings');
  hash = '';
  check(WP.hash.load() === null, 'no hash loads as null');
  win.history.replaceState = () => { throw new Error('sandboxed'); };
  let threw = false; try { WP.hash.save({ a: 1 }); } catch (e) { threw = true; }
  check(!threw, 'save swallows a sandboxed history API');
  console.log('  PASS');
}

console.log('\npin:');
{
  check(WP.pin.get() === null, 'no baseline at the start');
  WP.pin.set({ ded: 5 }); check(WP.pin.get().ded === 5, 'set');
  WP.pin.clear(); check(WP.pin.get() === null, 'clear');
  console.log('  PASS');
}

console.log('\nstylesheet:');
{
  const classes = ['wp-result', 'wp-chip', 'wp-why', 'wp-figs', 'wp-fig', 'wp-pin', 'wp-actions', 'wp-btn', 'wp-insights',
                   'wp-table', 'wp-memo', 'wp-msgs', 'wp-num', 'wp-status', 'wp-head'];
  classes.forEach(c => check(css.includes('.' + c), 'defines .' + c));
  check(/@media print/.test(css), 'has a print stylesheet');
  check(/:root\[data-theme="dark"\]/.test(css) && /prefers-color-scheme: dark/.test(css), 'status colours defined for both dark-mode hooks');
  // print is the one place that must be black on white whatever the screen theme is
  const screenCss = css.slice(0, css.indexOf('@media print')).replace(/--wp-[a-z-]+:#[0-9a-f]{6};?/gi, '');
  check(!/#[0-9a-f]{3,6}\b/i.test(screenCss), 'no stray hard-coded colours on screen outside the --wp- tokens');
  console.log('  PASS');
}

console.log('\ntools that use the kit:');
{
  const REQUIRED_IDS = ['wp-copy', 'wp-print', 'wp-link', 'wp-status', 'wpChip', 'wpWhy', 'wpPin', 'wpUnpin', 'wpMsgs', 'wpInsights', 'wpRows', 'wpMemo', 'example', 'wpReset'];
  let n = 0;
  for (const dir of fs.readdirSync('tools')) {
    const p = `tools/${dir}/index.html`;
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    if (!html.includes('assets/js/workpaper.js') && !html.includes('assets/css/workpaper.css')) continue;
    n++;
    check(html.includes('../../assets/css/workpaper.css') && html.includes('../../assets/js/workpaper.js'), p + ' links both kit files');
    REQUIRED_IDS.forEach(id => check(html.includes('id="' + id + '"'), p + ' has #' + id));
    check(html.indexOf('assets/js/workpaper.js') < html.indexOf('window.Workpaper'), p + ' loads the kit before using it');
    check(/id="wpMemo"[^>]*>/.test(html) && /@media print/.test(css), p + ' has a printable workpaper');
    check(!/robots[^>]*noindex/.test(html), p + ' is indexable');
  }
  check(n >= 2, 'at least two tools use the kit (found ' + n + ')');
  console.log('  ' + n + ' tools   ' + (fail === 0 ? 'PASS' : ''));
}

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
