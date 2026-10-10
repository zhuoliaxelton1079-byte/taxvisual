import fs from 'fs';
const src = fs.readFileSync(process.argv[2], 'utf8');
function extract(name){
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++){
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) { j++; break; }
  }
  return src.slice(start, j);
}
const NAMES = ['parseD','fmtD','addYears','dayDiff','span','overlapDays','unionDays','model','niceCeil','geom'];
const code = NAMES.map(extract).join('\n');
const { parseD, fmtD, addYears, dayDiff, span, unionDays, model, geom } =
  new Function(code + '; return {' + NAMES.join(',') + '};')();

const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('  **FAIL**', msg); } return ok; };

const D = parseD;                       // 'YYYY-MM-DD' -> UTC ms
const SALE = D('2026-06-30');
const DAY = 86400000;
const WINDOW_DAYS = dayDiff(addYears(SALE, -5), SALE);          // 1826: the five years include 29 Feb 2024

/* A sale on 30 Jun 2026, owned and used for `days` days ending on the sale. */
const owned = (days, o = {}) => Object.assign({
  status:'single', gain:100000, dep:0, sale:SALE, acquired:SALE - days * DAY,
  use:[[SALE - days * DAY, SALE], null], nq:null, lastSale:null,
  principal:true, reason:true, both:true }, o);

/* ------------------------------------------------------------------ 1
   Date arithmetic: the counting convention every test below rests on.  */
console.log('dates:');
{
  check(fmtD(addYears(D('2024-02-29'), 1)) === '2025-02-28', '29 Feb + 1 year -> 28 Feb');
  check(fmtD(addYears(D('2026-06-30'), -5)) === '2021-06-30', '5 years before the sale');
  check(dayDiff(D('2024-01-15'), D('2026-01-15')) === 731 && dayDiff(D('2025-01-15'), D('2027-01-15')) === 730, '24 months is 730 or 731 days, never fewer');
  check(span(D('2026-01-01'), D('2025-01-01')) === 0, 'a reversed period is 0 days');
  check(unionDays([[100 * DAY, 300 * DAY], [200 * DAY, 400 * DAY], [500 * DAY, 600 * DAY]], 0, 1e12) === 300 + 100, 'overlapping periods are not double counted');
  check(unionDays([[0, 500 * DAY]], 100 * DAY, 300 * DAY) === 200, 'periods are clipped to the window');
  console.log('  PASS');
}

/* ------------------------------------------------------------------ 2
   Reg. 1.121-3(g)(2): 365/730 x $250,000 = $125,000. Then the same
   fraction at every length, and the three presets from the standalone
   tree (months become days: 12 months = 365 days).                     */
console.log('\nreduced cap:');
{
  let r = model(owned(365, { gain:400000 }));
  check(near(r.cap, 125000) && near(r.excluded, 125000) && near(r.taxCap, 275000), 'reg example: 365/730 x 250,000 = 125,000');
  r = model(owned(365, { status:'mfj', gain:90000 }));
  check(near(r.cap, 250000) && near(r.excluded, 90000) && r.taxable === 0, 'job move, joint: cap 250,000, all 90,000 excluded');
  for (const d of [1, 100, 456, 547, 729]){
    r = model(owned(d, { gain:1e7 }));
    check(near(r.cap, 250000 * d / 730), `cap at ${d} days = limit x days / 730`);
  }
  r = model(owned(1000, { gain:180000, dep:5000, lastSale:SALE - 547 * DAY }));
  check(near(r.cap, 250000 * 547 / 730) && near(r.excluded, 175000) && near(r.taxable, 5000), 'second sale 547 days earlier: shortest is the gap');
  r = model(owned(1000, { gain:400000 }));
  check(near(r.cap, 250000) && r.outcome === 'full' && near(r.taxable, 150000), 'qualifies in full');
  console.log('  PASS');
}

/* ------------------------------------------------------------------ 3
   Each branch of the tree.                                              */
console.log('\npath per branch:');
{
  const P = r => r.path.map(s => s.node + ':' + s.ans).join(' ');
  const T = [
    ['not a principal residence', owned(1000, {principal:false}),               '1:no', 'none'],
    ['fails ownership',           owned(400, {use:[[SALE - 400 * DAY, SALE], null]}), '1:yes 2:no A:yes B:then C:then D:le', 'reduced'],
    ['fails use',                 owned(1000, {use:[[SALE - 400 * DAY, SALE], null]}), '1:yes 2:yes 3:no A:yes B:then C:then D:le', 'reduced'],
    ['sold within 2 years',       owned(1000, {lastSale:SALE - 300 * DAY}),     '1:yes 2:yes 3:yes 4:yes A:yes B:then C:then D:le', 'reduced'],
    ['fails, no qualifying reason', owned(400, {reason:false}),                 '1:yes 2:no A:no', 'none'],
    ['single, qualifies',         owned(1000),                                  '1:yes 2:yes 3:yes 4:no 5:no', 'full'],
    ['surviving spouse',          owned(1000, {status:'surv'}),                 '1:yes 2:yes 3:yes 4:no 5:no', 'full'],
    ['joint, all tests met',      owned(1000, {status:'mfj'}),                  '1:yes 2:yes 3:yes 4:no 5:yes 6:yes', 'full'],
    ['joint, spouse fails 6',     owned(1000, {status:'mfj', both:false}),      '1:yes 2:yes 3:yes 4:no 5:yes 6:no', 'sum']
  ];
  for (const [name, inp, want, outcome] of T){
    const r = model(inp);
    check(P(r).replace(/D:gt/, 'D:le') === want && r.outcome === outcome, name + ' -> ' + P(r) + ' / ' + r.outcome);
    console.log(`  ${name.padEnd(28)} ${P(r)}`);
  }
  check(model(owned(1000, {status:'surv'})).limit === 500000 && model(owned(1000)).limit === 250000, 'limits: surviving spouse 500,000, single 250,000');
  check(model(owned(456, {gain:240000})).path.slice(-1)[0].ans === 'gt', 'gain above cap ends at D:gt');
  check(model(owned(365, {gain:90000})).path.slice(-1)[0].ans === 'le', 'gain under cap ends at D:le');
}

/* ------------------------------------------------------------------ 4
   The 730-day boundary and the 2-year look-back are exact.             */
console.log('\nboundaries:');
{
  check(model(owned(730)).outcome === 'full' && model(owned(729)).outcome === 'reduced', '730 days owned and used qualifies; 729 does not');
  check(model(owned(1000, {use:[[SALE - 730 * DAY, SALE], null]})).used === 730, 'use of exactly 730 days');
  check(model(owned(1000, {use:[[SALE - 400 * DAY, SALE - 100 * DAY], [SALE - 450 * DAY, SALE - 60 * DAY]]})).used === 390, 'two overlapping periods count the union');
  // a sale exactly two years before is outside the 2-year period; one day later is inside
  const twoYr = addYears(SALE, -2);
  check(model(owned(1500, {lastSale: twoYr})).prior === false, 'last sale exactly 2 years earlier: allowed');
  check(model(owned(1500, {lastSale: twoYr + DAY})).prior === true, 'last sale 2 years less a day earlier: not allowed');
  check(model(owned(3000)).owned === WINDOW_DAYS, 'ownership is capped at the 5-year window');
  console.log('  PASS');
}

/* ------------------------------------------------------------------ 5
   Nonqualified use, §121(b)(5): (gain - depreciation) x nonqualified
   days / days owned, after the depreciation carve-out; nothing before
   2009; nothing after the last day used as a home.                      */
console.log('\nnonqualified use:');
{
  const acq = D('2019-01-01');
  let r = model({ status:'single', gain:300000, dep:12000, sale:SALE, acquired:acq, use:[[D('2022-01-01'), SALE], null],
                  nq:[acq, D('2021-12-31')], lastSale:null, principal:true, reason:true, both:true });
  const ownTotal = dayDiff(acq, SALE), nq = dayDiff(acq, D('2021-12-31'));
  check(r.nqDays === nq && r.ownTotal === ownTotal, 'rented before moving in: days and ratio');
  check(near(r.nqAlloc, (300000 - 12000) * nq / ownTotal), 'allocation uses gain less depreciation');
  check(near(r.dep + r.nqAlloc + r.excluded + r.taxCap, 300000), 'every dollar of gain is excluded or taxable');
  check(r.outcome === 'full' && near(r.excluded, Math.min(r.excludable, 250000)), 'the cap applies to the gain left after nonqualified use');
  // before 2009 does not count
  r = model({ status:'single', gain:100000, dep:0, sale:SALE, acquired:D('2005-01-01'), use:[[D('2012-01-01'), SALE], null],
              nq:[D('2005-01-01'), D('2011-12-31')], lastSale:null, principal:true, reason:true, both:true });
  check(r.nqDays === dayDiff(D('2009-01-01'), D('2011-12-31')), 'nonqualified use before 1 Jan 2009 is ignored');
  // after the last day used as a home, inside the five years, is excepted
  r = model({ status:'single', gain:100000, dep:0, sale:SALE, acquired:D('2018-01-01'), use:[[D('2018-01-01'), D('2024-12-31')], null],
              nq:[D('2025-01-01'), SALE], lastSale:null, principal:true, reason:true, both:true });
  check(r.nqDays === 0 && r.nqAlloc === 0, 'rented after moving out, within the window: excepted by 121(b)(5)(C)(ii)(I)');
  console.log('  PASS');
}

/* ------------------------------------------------------------------ 6
   Exhaustive sweep over dates: the statute's rules as invariants.      */
console.log('\nsweep:');
{
  let n = 0, bad = 0;
  const fl = (c, m) => { if (!c) { bad++; if (bad < 6) console.log('  **FAIL**', m); } };
  const winStart = addYears(SALE, -5);
  const days = (a, b) => Math.max(0, Math.round((Math.min(b, SALE) - Math.max(a, winStart)) / DAY));
  for (const status of ['single','mfj','surv'])
  for (const own of [30, 365, 700, 729, 730, 731, 1100, 1826, 2500])
  for (const usedDays of [0, 200, 729, 730, 900, 3000])
  for (const since of [null, 100, 729, 730, 731, 1500])
  for (const nq of [null, 'before', 'after'])
  for (const gain of [0, 90000, 240000, 900000, 3000000])
  for (const dep of [0, 20000])
  for (const principal of [true, false])
  for (const reason of [true, false])
  for (const both of [true, false]){
    const acq = SALE - own * DAY, uStart = SALE - Math.min(usedDays, own) * DAY;
    const i = { status, gain, dep, sale:SALE, acquired:acq,
      use: usedDays ? [[uStart, SALE], null] : [null, null],
      nq: nq === 'before' ? [acq, uStart] : nq === 'after' ? [SALE - 50 * DAY, SALE] : null,
      lastSale: since === null ? null : SALE - since * DAY, principal, reason, both };
    const r = model(i);
    const limit = status === 'single' ? 250000 : 500000;
    const d = Math.min(dep, gain), elig = gain - d;
    const ownExp = days(acq, SALE), usedExp = usedDays ? days(uStart, SALE) : 0;
    const prior = since !== null && since < 730;
    const qualifies = principal && ownExp >= 730 && usedExp >= 730 && !prior;
    const sh = Math.min(ownExp, usedExp, since === null ? Infinity : since);
    n++;
    fl(r.owned === ownExp && r.used === usedExp, 'days owned/used ' + JSON.stringify(i));
    fl(r.limit === limit && r.path[0].node === '1', 'limit/start');
    fl(r.nqAlloc >= 0 && r.nqAlloc <= elig + 1e-9 && near(r.excludable, elig - r.nqAlloc), 'nonqualified allocation within the gain ' + JSON.stringify(i));
    if (!principal){ fl(r.outcome === 'none' && r.excluded === 0, 'not principal'); continue; }
    const nodesHit = r.path.map(s => s.node).join('');
    fl(nodesHit.startsWith('12') && (nodesHit.includes('3') === (ownExp >= 730)) && (nodesHit.includes('4') === (ownExp >= 730 && usedExp >= 730)), 'steps 3 and 4 are reached only after the earlier test passes ' + nodesHit + ' ' + JSON.stringify(i));
    if (qualifies){
      if (status === 'mfj' && !both){ fl(r.outcome === 'sum' && r.excluded === null, 'sum of separate limits'); continue; }
      fl(r.outcome === 'full' && near(r.cap, limit) && near(r.excluded, Math.min(r.excludable, limit)), 'full ' + JSON.stringify(i));
    } else if (!reason){
      fl(r.outcome === 'none' && r.excluded === 0 && r.path.slice(-1)[0].node === 'A', 'no reason ' + JSON.stringify(i));
    } else {
      fl(r.outcome === 'reduced' && near(r.cap, limit * Math.min(sh, 730) / 730), 'reduced cap ' + JSON.stringify(i));
      fl(near(r.excluded, Math.min(r.excludable, r.cap)), 'reduced excluded');
    }
    if (r.excluded !== null){
      fl(r.excluded >= -1e-9 && r.excluded <= limit + 1e-9, 'excluded within 0..limit');
      fl(near(r.dep + r.nqAlloc + r.excluded + r.taxCap, gain, 1e-6), 'every dollar of gain is excluded or taxable ' + JSON.stringify(i));
      fl(near(r.taxable, r.dep + r.nqAlloc + r.taxCap), 'taxable = depreciation + nonqualified + above cap');
    }
    if (r.cap !== null && r.outcome !== 'none') fl(r.binding === (r.cap <= r.excludable ? 'cap' : 'gain'), 'binding names the cap on a tie');
    const order = ['1','2','3','4','5','6','A','B','C','D'];
    fl(r.path.every((s, k) => k === 0 || order.indexOf(s.node) > order.indexOf(r.path[k - 1].node)), 'path order');
  }
  check(bad === 0, bad + ' sweep failures');
  console.log(`  ${n} combinations   ${bad === 0 ? 'PASS' : '**FAIL**'}`);
}

/* ------------------------------------------------------------------ 7
   Chart: the marker lies on the drawn polyline, the curve bends where
   the cap meets the excludable gain, the cap reaches the limit at 24
   months.                                                               */
console.log('\nchart geometry:');
{
  let n = 0;
  const onLine = (pts, x, y) => {
    for (let k = 1; k < pts.length; k++){
      const [x0, y0] = pts[k-1], [x1, y1] = pts[k];
      if (x >= x0 - 1e-9 && x <= x1 + 1e-9){ const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0); return near(y0 + t * (y1 - y0), y, 1e-6); }
    }
    return false;
  };
  for (const status of ['single','mfj'])
  for (const gain of [30000, 90000, 240000, 400000, 900000, 3000000])
  for (const dep of [0, 20000])
  for (const d of [1, 100, 365, 456, 700, 730, 900, 1826])
  for (const nq of [null, 400]){
    const i = owned(d, { status, gain, dep });
    if (nq) i.nq = [i.acquired, i.acquired + nq * DAY];
    const m = model(i), g = geom(m);
    n++;
    if (m.excluded !== null){
      check(onLine(g.excPts, g.mx, g.my) || m.outcome === 'none', `marker on polyline ${status} ${gain} ${dep} ${d} ${nq}`);
      check(g.excPts.every((p, k) => k === 0 || p[0] > g.excPts[k-1][0] - 1e-12 && p[1] >= g.excPts[k-1][1] - 1e-9), 'excluded curve non-decreasing');
    }
    check(near(g.capPts[1][1], m.limit) && g.capPts.every(p => p[1] <= m.limit + 1e-9), 'cap reaches the limit at 24 months');
    check(g.yMax >= m.limit && g.xMax >= Math.min(g.months, 60), 'axes contain the limit and the marker');
  }
  const m = model(owned(456, { gain:240000 })), g = geom(m);
  check(near(g.excPts[1][0], 24 * 240000 / 250000), 'knot where the cap meets the gain: 23.04 months');
  check(near(g.months, 456 * 24 / 730), 'x axis is months: 730 days = 24');
  console.log(`  ${n} chart states   PASS`);
}

/* ------------------------------------------------------------------ 8
   The page itself: every tree step is present, every quotation is word
   for word in the embedded source panel, the panel carries the text the
   extractor used to drop, and the professional-use features exist.      */
console.log('\npage content:');
{
  const badges = [...src.matchAll(/<span class="badge"[^>]*>([^<]+)<\/span>/g)].map(m => m[1]);
  check(['1','2','3','4','5','6','A','B','C','D','!','!'].every((k, i) => badges[i] === k) && badges.length === 12, 'tree steps present in order: ' + badges.join(' '));
  const panel = src.slice(src.indexOf('<div class="statute"'), src.indexOf('<section class="result"'));
  const norm = s => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const P = norm(panel);
  [
    'in respect of such property',                                   // text after an inline <span> (extractor bug)
    'then the taxpayer shall be treated as using such property',     // continuation after sub-items (extractor bug)
    '$250,000', '$500,000', '(g) Computation of reduced maximum exclusion',
    'at least 50 miles farther', '24 full months or for 730 days'
  ].forEach(s => check(P.includes(s), 'source panel contains: ' + s));
  const quotes = [...src.matchAll(/<blockquote class="law">[\s\S]*?<\/blockquote>/g)].map(m => norm(m[0]));
  let missing = 0;
  for (const q of quotes){
    const body = q.replace(/^\s*[^()]*?§[^ ]+ ?(?:·[^(]*?)?(?=\()/, '');
    const words = body.split(' ').filter(Boolean);
    for (let k = 0; k + 6 <= words.length; k += 3) if (!P.includes(words.slice(k, k + 6).join(' '))) { missing++; if (missing < 4) console.log('  not in panel:', words.slice(k, k + 6).join(' ')); }
  }
  check(missing === 0, missing + ' quotation fragments not found in the source panel');
  ['id="result"', 'id="timeline"', 'id="insights"', 'id="memo"', 'id="act-memo"', 'id="act-print"', 'id="act-link"', 'id="pin"', 'id="example"', '@media print']
    .forEach(s => check(src.includes(s), 'page has ' + s));
  console.log(`  ${quotes.length} quotations, ${badges.length} steps   ${fail === 0 ? 'PASS' : ''}`);
}

console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILURES');
process.exit(fail === 0 ? 0 : 1);
