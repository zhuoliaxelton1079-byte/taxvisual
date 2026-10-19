import fs from 'fs';

/* Retirement contribution limits: extracts the model from the shipped page
   and checks it against the workbook tab "Retirement Contribution Limits"
   (2025 check figures) and hand-computed edge cases.

       node tests/verify-retirement-contribution-limits.mjs tools/retirement-contribution-limits/index.html
*/
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
const consts = ['YEAR_RULES', 'SE', 'STATUS_GROUP'].map(n => src.match(new RegExp('const ' + n + ' = [\\s\\S]*?;\\n'))[0]).join('\n');
const names = ['taxYearChoices','rulesFor','catchupFor','phaseOut','iraRanges','employerPlan','maxContributions','allocateTarget','phaseLine'];
const M = new Function(consts + names.map(extract).join('\n') + '; return {' + names.join(',') + '};')();
const { taxYearChoices, rulesFor, phaseOut, iraRanges, maxContributions, allocateTarget, phaseLine } = M;

let fail = 0;
function check(name, ok){ if (!ok) fail++; console.log('  ' + name + '  ' + (ok ? 'PASS' : '**FAIL**')); }
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* The workbook's exercise (B7–B17). */
const WB = { year:2025, status:'single', age:61, spouseCovered:false, other:2100,
  wages:150000, matchRate:1, matchLimit:0.06, has457:false, profit:40000 };
const run = over => maxContributions({ ...WB, ...over });

console.log('published limits:');
check('2025 figures (Notice 2024-80, SSA)', (() => { const L = rulesFor(2025);
  return L.deferral === 23500 && L.catch50 === 7500 && L.catch6063 === 11250 && L.c415 === 70000 && L.compLimit === 350000 &&
    L.ssWageBase === 176100 && L.ira === 7000 && L.iraCatch === 1000 && L.dedCovered.single[0] === 79000 && L.roth.single[0] === 150000; })());
check('2026 figures (Notice 2025-67, SSA)', (() => { const L = rulesFor(2026);
  return L.deferral === 24500 && L.catch50 === 8000 && L.catch6063 === 11250 && L.c415 === 72000 && L.compLimit === 360000 &&
    L.ssWageBase === 184500 && L.ira === 7500 && L.iraCatch === 1100 &&
    L.roth.single[0] === 153000 && L.roth.joint[0] === 242000 && L.dedCovered.single[0] === 81000 && L.dedCovered.joint[0] === 129000 && L.dedSpouseCovered[0] === 242000; })());
check('2027 is review pending and rejected', (() => { try { rulesFor(2027); return false; } catch (e) { return e instanceof RangeError; } })() &&
  !taxYearChoices(2027)[1].reviewed && taxYearChoices(2026).every(y => y.reviewed));

console.log('\nworkbook scenario (2025, age 61, single, $150,000 wages, $40,000 profit):');
const d = run({});
check('Step 2: pool 23,500 + 11,250 = 34,750 (B32)', d.pool.total === 34750);
check('Step 3: deferral 34,750, match 9,000, catch-up 11,250 (B41, B43, B44)', d.e.deferral === 34750 && d.e.match === 9000 && d.e.catchup === 11250);
check('Step 3: additions 32,500, total 43,750, room 37,500 (B45–B47)', d.e.additions === 32500 && d.e.total === 43750 && d.e.room415 === 37500);
check('Step 4: SS 3,236.40, Medicare 1,071.26, half SE 2,153.83 (B57–B59)', near(d.b.ss, 3236.4) && near(d.b.med, 1071.26) && near(d.b.halfSE, 2153.83));
check('Step 4: net earnings 37,846.17, employer limit 7,569.234 (B60, B64)', near(d.b.comp, 37846.17) && near(d.b.erLimit, 7569.234));
check('Step 4: pool left 0, solo = SEP = 7,569.234, either plan (B65–B73)', d.b.poolLeft === 0 && near(d.b.solo, 7569.234) && near(d.b.sep, 7569.234) && !d.b.soloWins && d.b.employee === 0);
check('Step 5: no 457(b) (B82)', d.g.deferral === 0);
check('Step 6: MAGI 147,626.936 (B96)', near(d.magi, 147626.936));
check('Step 6: IRA 8,000, active, deductible 0, Roth 8,000 (B101–B119)', d.a.max === 8000 && d.a.active && d.a.ded === 0 && d.a.roth === 8000 && d.a.nondeductible === 0);
check('Step 7: total 59,319.234 (B133)', near(d.total, 59319.234));
check('binding: pool, 20% employer limit, IRA; not binding: both §415(c); 457 n/a (E138–E143)',
  d.limits.pool.status === 'binding' && d.limits.bER.status === 'binding' && d.limits.ira.status === 'binding' &&
  d.limits.e415.status === 'open' && d.limits.b415.status === 'open' && d.limits.g457.status === 'off' &&
  near(d.limits.b415.left, 30276.936));

console.log('\nworkbook variations:');
const s457 = run({ has457:true });
check('governmental 457(b): own 34,750 on top; MAGI falls to 112,876.936', s457.g.deferral === 34750 && near(s457.magi, 112876.936) && near(s457.total, 94069.234) && s457.limits.g457.status === 'binding');
const se = run({ wages:0, age:45, other:0 });
check('no W-2 job: SE tax on all net earnings (half 2,825.91)', near(se.b.halfSE, 2825.91) && near(se.b.comp, 37174.09));
check('…solo 401(k) wins: 7,434.818 + 23,500 deferral = 30,934.818', se.b.soloWins && near(se.b.solo, 30934.818) && se.b.employee === 23500 && near(se.b.employer, 7434.818));
check('…pool binding through the solo 401(k)', se.limits.pool.status === 'binding' && se.limits.pool.used === 23500);
const g = run({ wages:40000, age:40, matchRate:0, has457:true, profit:0 });
check('457(b) cut by pay left after the 401(k): 40,000 − 23,500 = 16,500', g.g.deferral === 16500 && g.limits.g457.status === 'open');
const hi = run({ wages:200000, matchRate:0 });
check('wages above the wage base: no SS portion, half SE = 535.63', hi.b.ss === 0 && near(hi.b.halfSE, 535.63));
const w26 = maxContributions({ ...WB, year:2026, wages:180000, profit:10000, matchRate:0 });
check('2026 wage base 184,500: SS on 4,500 only (558), half SE 412.9075', near(w26.b.ss, 558) && near(w26.b.halfSE, 412.9075));

console.log('\n§415(c) and the match:');
const m1 = run({ wages:40000, age:40, matchLimit:0.5, profit:0 });
check('full match fits: 20,000 + 20,000 fills §415(c) (same as the workbook)', m1.e.deferral === 20000 && m1.e.match === 20000 && m1.limits.e415.status === 'binding');
const m2 = run({ wages:40000, age:40, matchLimit:0.8, profit:0 });
check('match too rich for §415(c): 20,000 + 20,000, not the workbook’s 8,000 + 8,000', m2.e.deferral === 20000 && m2.e.match === 20000 && m2.e.additions === 40000);
const m3 = run({ wages:20000, age:55, matchLimit:1, profit:0 });
check('catch-up rides over §415(c): 13,750 deferred, 7,500 of it catch-up, additions 20,000', m3.e.deferral === 13750 && m3.e.catchup === 7500 && m3.e.additions === 20000);
const m4 = run({ wages:20000, age:40, matchRate:0, profit:0 });
check('deferral capped by wages under 23,500', m4.e.deferral === 20000 && m4.limits.pool.status === 'open');
check('note when §415(c) stops the full match; none when it is captured', m2.notes.includes('matchShort') && !m1.notes.includes('matchShort') && !d.notes.includes('matchShort'));

console.log('\nIRA phase-outs:');
const p = run({ wages:100000, age:40, matchRate:0, profit:0, other:5000 });
check('MAGI 81,500: deductible 7,000 × 7.5/10 = 5,250; Roth takes the other 1,750', p.magi === 81500 && p.a.ded === 5250 && p.a.roth === 1750 && p.a.nondeductible === 0);
const n = run({ wages:250000, age:40, matchRate:0, profit:0, other:0 });
check('MAGI 226,500: no deduction, no Roth, 7,000 nondeductible', n.a.ded === 0 && n.a.roth === 0 && n.a.nondeductible === 7000);
check('Roth single 2025 at 155,000: 7,000 × 10/15 → 4,670', phaseOut(7000, 155000, [150000, 165000]) === 4670);
check('Roth $200 floor near the top of the range', phaseOut(7000, 164900, [150000, 165000]) === 200);
check('floor never exceeds a compensation-limited base', phaseOut(150, 164900, [150000, 165000]) === 150);
check('joint, spouse covered only: 236,000–246,000 deduction range', (() => { const r = iraRanges(rulesFor(2025), 'joint', false, true); return r.ded[0] === 236000 && r.dedWhy === 'spouse'; })());
check('MFS lived together: 0–10,000; lived apart: single ranges', iraRanges(rulesFor(2025), 'mfsTogether', true, false).ded[1] === 10000 &&
  iraRanges(rulesFor(2025), 'mfsApart', true, false).roth[0] === 150000);
check('IRA limited to compensation', run({ wages:0, profit:3000, age:40 }).a.max < 3000 && near(run({ wages:0, profit:3000, age:40 }).a.max, run({ wages:0, profit:3000, age:40 }).a.comp));

console.log('\n2026 Roth catch-up:');
const rc = maxContributions({ ...WB, year:2026, wages:160000, matchRate:0, profit:0, other:0 });
check('wages over 150,000: 11,250 catch-up is Roth, MAGI 135,500', rc.e.deferral === 35750 && rc.rothCatchAmt === 11250 && rc.magi === 135500 && rc.notes.includes('rothCatch'));
check('IRA 7,500 + 1,100 = 8,600 Roth at 135,500', rc.a.max === 8600 && rc.a.roth === 8600);
check('no Roth catch-up rule in 2025', !run({ wages:160000 }).notes.includes('rothCatch'));

console.log('\ntarget in the best order (workbook facts; the match comes on top):');
const at = t => allocateTarget(d, t);
check('target 5,000: all to the 401(k), earning 5,000 of match', (() => { const x = at(5000); return x.d === 5000 && x.match === 5000 && x.total === 10000 && x.er === 0 && x.ira === 0; })());
check('target 20,000: 9,000 to earn the full match, then 11,000 more', (() => { const x = at(20000); return x.steps.toMatch === 9000 && x.steps.e1Rest === 11000 && x.match === 9000 && x.total === 29000; })());
check('target 40,000: 401(k) maxed at 34,750, then 5,250 SEP; MAGI 149,946.17', (() => { const x = at(40000); return x.d === 34750 && near(x.er, 5250) && x.ira === 0 && near(x.magi, 149946.17); })());
check('target 45,000: 401(k) + full 7,569.234 SEP, then 2,680.766 Roth (MAGI under 150,000)',
  (() => { const x = at(45000); return near(x.er, 7569.234) && near(x.roth, 2680.766) && x.ded === 0 && near(x.magi, 147626.936); })());
check('target 60,000: the maximum, 9,680.766 has no room', (() => { const x = at(60000); return near(x.total, d.total) && near(x.excess, 9680.766) && x.atMax; })());
check('no target (null) is the maximum, step for step', (() => { const x = at(null);
  return x.d === d.e.deferral && x.match === d.e.match && near(x.er + x.solo, d.b.max) && x.ded === d.a.ded && x.roth === d.a.roth && near(x.magi, d.magi) && near(x.total, d.total) && x.excess === 0; })());
check('target 0: nothing in, no match, not an active participant', (() => { const x = at(0); return x.total === 0 && !x.active && x.ranges.ded === null; })());
check('2026 Roth catch-up: a 30,000 deferral lowers MAGI by only 24,500', (() => { const x = allocateTarget(rc, 30000); return x.d === 30000 && x.rothCatchAmt === 5500 && x.magi === 135500; })());
let aMono = true, cap = true, eqMax = true;
for (const over of [{}, { has457:true }, { wages:20000 }, { wages:0, age:45 }, { year:2026, wages:160000 }, { status:'joint', spouseCovered:true, profit:0 }]){
  const r = run(over); let prev = null;
  for (let t = 0; t <= 120000; t += 250){
    const x = allocateTarget(r, t);
    if (prev && (x.own < prev.own - 1e-6 || x.d < prev.d - 1e-6 || x.match < prev.match - 1e-6 || x.g457 < prev.g457 - 1e-6 || x.er + x.solo < prev.er + prev.solo - 1e-6)) aMono = false;
    if (x.own > Math.min(t, x.maxOwn) + 1e-6 || x.d > r.e.deferral + 1e-6 || x.g457 > r.g.deferral + 1e-6 || x.solo > r.b.employee + 1e-6 || x.ira > r.a.max + 1e-6) cap = false;
    if (x.d + x.solo > r.pool.total + 1e-6 || x.d - x.dCatch + x.match > r.e.limit415 + 1e-6) cap = false;
    prev = x;
  }
  const xm = allocateTarget(r, null);
  if (!near(xm.total, r.total) || !near(xm.magi, r.magi) || xm.roth !== r.a.roth || xm.ded !== r.a.ded) eqMax = false;
}
check("allocation sweep: workplace steps never shrink as the target grows", aMono);
check('allocation sweep: never above the target, any step’s maximum, the pool or §415(c)', cap);
check('allocation sweep: no target reproduces the maximum in every scenario', eqMax);

console.log('\njoint return: spouse and spousal IRA (§219(c)):');
const SP = (sp, over = {}) => run({ status:'joint', spouse:{ age:58, comp:0, deferrals:0, ...sp }, ...over });
const j1 = SP({});
check('non-working spouse, 58: spousal IRA 8,000 funded by the taxpayer’s pay', j1.s.max === 8000 && j1.s.fromOther === 8000 && j1.s.comp === 0);
check('…spouse not covered, taxpayer covered: 236,000–246,000 range, fully deductible at 147,627', j1.s.ranges.dedWhy === 'spouse' && j1.s.ranges.ded[0] === 236000 && j1.s.ded === 8000);
check('…taxpayer covered on 126,000–146,000: no deduction, 8,000 Roth; total 67,319.234', j1.a.ded === 0 && j1.a.roth === 8000 && near(j1.total, 67319.234) && near(j1.magi, 147626.936));
const j2 = SP({ age:40 }, { wages:10000, matchRate:0, profit:0, age:40, other:0 });
check('combined pay 10,000 caps both IRAs: taxpayer 7,000, spouse 3,000', j2.a.max === 7000 && j2.s.max === 3000 && j2.s.fromOther === 3000);
const j3 = SP({ comp:100000, deferrals:20000 });
check('working spouse with 20,000 of deferrals: MAGI 227,626.936, spouse covered, no deduction, 8,000 Roth',
  near(j3.magi, 227626.936) && j3.s.covered && j3.s.ranges.dedWhy === 'covered' && j3.s.ded === 0 && j3.s.roth === 8000);
const j6 = SP({ age:40, comp:50000 }, { wages:0, profit:0, other:0 });
check('reverse spousal IRA: no-pay taxpayer 8,000 from the spouse’s pay; nobody covered, fully deductible',
  j6.a.max === 8000 && j6.a.fromOther === 8000 && j6.a.ranges.ded === null && j6.a.ded === 8000 && j6.s.max === 7000 && j6.s.ded === 7000);
check('the spouse is ignored unless filing jointly', run({ spouse:{ age:58, comp:0, deferrals:0 } }).s === null && near(run({ spouse:{ age:58, comp:0, deferrals:0 } }).total, 59319.234));
check('target: the spousal IRA is step 7 (5,000 of a 55,319.234 target)', (() => { const x = allocateTarget(j1, 55319.234); return near(x.sira, 5000) && near(x.ira, 8000) && x.sded === x.sira; })());
check('no target reproduces the joint maximum', (() => { const x = allocateTarget(j1, null); return near(x.total, j1.total) && x.sira === j1.s.max && x.sded === j1.s.ded; })());
let comb = true;
for (const tw of [0, 3000, 10000, 60000]) for (const sc of [0, 2000, 9000, 80000]) for (const ages of [[40, 40], [55, 61]]){
  const r = SP({ age:ages[1], comp:sc }, { wages:tw, profit:0, matchRate:0, age:ages[0], other:0 });
  if (r.a.max + r.s.max > r.a.comp + r.s.comp + 1e-6 || r.a.max > r.a.limit || r.s.max > r.s.limit) comb = false;
  if (Math.min(r.a.limit + r.s.limit, r.a.comp + r.s.comp) - (r.a.max + r.s.max) > 1e-6) comb = false;
}
check('sweep: both IRAs together = lesser of both limits or combined pay', comb);

// Sweep: every limit holds, the total is the sum of its parts, the deferral
// equals the workbook's B41 whenever the workbook is self-consistent, the
// Roth/deduction amounts never rise with MAGI, and the plotted points lie
// on the drawn lines.
let sweep = true, equiv = true, cases = 0;
for (const year of [2025, 2026]) for (const status of ['single','joint','mfsTogether']) for (const age of [40, 55, 61])
for (const wages of [0, 15000, 40000, 90000, 150000, 400000]) for (const matchRate of [0, 0.5, 1, 2]) for (const matchLimit of [0.03, 0.06, 0.5])
for (const profit of [0, 5000, 40000, 300000]) for (const has457 of [false, true]) {
  cases++;
  const r = maxContributions({ year, status, age, spouseCovered:false, other:3000, wages, matchRate, matchLimit, has457, profit });
  const L = r.L, e = r.e, b = r.b, a = r.a;
  if (e.additions > e.limit415 + 1e-6 || e.deferral > Math.min(wages, r.pool.total) + 1e-6) sweep = false;
  if (e.deferral + b.employee > r.pool.total + 1e-6) sweep = false;
  if (b.additions > b.limit415 + 1e-6 || b.employer > b.erLimit + 1e-6) sweep = false;
  if (r.g.deferral > r.g.limit + 1e-6 || e.deferral + r.g.deferral > wages + 1e-6) sweep = false;
  if (a.ded + a.roth + a.nondeductible > a.max + 1e-6 || a.roth > a.rothLimit + 1e-6) sweep = false;
  if (!near(r.total, e.deferral + e.match + b.max + r.g.deferral + a.max)) sweep = false;
  const full = matchRate * matchLimit * wages, cu = r.cu.amount;
  const wb = Math.max(0, Math.min(r.pool.total, wages, Math.min(L.c415, wages) - full + cu));
  const wbAdd = wb - Math.min(cu, Math.max(0, wb - L.deferral)) + Math.min(matchRate * wb, full);
  const wbFullMatch = matchRate * wb >= full - 1e-6;
  if (wbFullMatch && wbAdd <= Math.min(L.c415, wages) + 1e-6 && !near(wb, e.deferral)) equiv = false;
  for (const [lim, rng] of [[a.rothLimit, a.ranges.roth], [a.dedLimit, a.ranges.ded]]){
    if (!rng || a.max <= 0) continue;
    const pts = phaseLine(a.max, rng, 0, 400000);
    let y = null;
    for (let k = 0; k < pts.length - 1; k++){ const P = pts[k], Q = pts[k+1]; if (r.magi >= P.x && r.magi < Q.x){ y = P.y + (Q.y - P.y) * (r.magi - P.x) / (Q.x - P.x); break; } }
    if (y !== null && Math.abs(y - lim) > 10 + 1e-6) sweep = false;
  }
}
check('sweep (' + cases + ' cases): every limit holds and the total adds up; points on the drawn lines', sweep);
check('sweep: deferral equals the workbook’s B41 whenever that earns the full match within §415(c)', equiv);
let mono = true;
for (const base of [150, 7000, 8600]) for (const rng of [[150000, 165000], [126000, 146000], [0, 10000]]){
  let prev = Infinity;
  for (let m = 0; m <= 200000; m += 50){ const v = phaseOut(base, m, rng); if (v > prev || (v !== base && v % 10 !== 0)) mono = false; prev = v; }
}
check('phase-out: non-increasing in MAGI, in $10 steps', mono);

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
