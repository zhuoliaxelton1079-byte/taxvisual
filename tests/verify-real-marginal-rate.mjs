import fs from 'fs';

/* ===========================================================================
   Sample memo: "Your real marginal rate in retirement".

   Extracts the model functions from the shipped page and checks them against
   hand-worked cases built from the 2026 figures in Rev. Proc. 2025-32,
   IRC §86, IRC §151(d)(5)(C) and the 2026 CMS/SSA IRMAA tables.

       node tests/verify-real-marginal-rate.mjs samples/real-marginal-rate/index.html
   =========================================================================== */

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
const names = ['law2026', 'ssTaxable', 'taxOn', 'rateAt', 'irmaaTier', 'compute', 'decompose', 'segments', 'cliffs', 'best'];
const M = new Function(names.map(extract).join('\n') + '; return {' + names.join(',') + '};')();

let fail = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
function check(label, got, want, tol){
  const ok = near(got, want, tol);
  if (!ok) fail++;
  console.log('  ' + (ok ? 'PASS' : '**FAIL**').padEnd(9) + label.padEnd(58) + String(+got.toFixed(6)).padStart(12) + '  expected ' + want);
}

const L = M.law2026();
const J = L.brackets.joint, S = L.brackets.single;

console.log('Brackets (Rev. Proc. 2025-32):');
check('joint: tax on $100,800', M.taxOn(100800, J), 11600);
check('joint: tax on $24,800', M.taxOn(24800, J), 2480);
check('single: tax on $50,400', M.taxOn(50400, S), 5800);
check('single: tax on $0', M.taxOn(0, S), 0);
check('joint: rate on next dollar at $100,800', M.rateAt(100800, J), 0.22);
check('joint: rate on next dollar at $100,799', M.rateAt(100799, J), 0.12);

console.log('\nSocial Security inclusion (IRC §86) — same cases as the SS tool:');
for (const [n, b, other, lo, up, want] of [
  ['Joint A', 12400, 36000, 32000, 44000, 5100],
  ['Joint B', 16000, 12000, 32000, 44000, 0],
  ['Joint C', 24496, 59618, 32000, 44000, 20821.6],
  ['Single B', 7200, 22000, 25000, 34000, 300],
  ['Single C', 7200, 34000, 25000, 34000, 6120],
]) check(n, M.ssTaxable(b, other, lo, up), want);

console.log('\nIRMAA tiers (cliffs; top tier starts AT its threshold):');
check('joint MAGI $218,000 → tier 0', M.irmaaTier(218000, L.irmaa.joint), 0);
check('joint MAGI $218,001 → tier 1', M.irmaaTier(218001, L.irmaa.joint), 1);
check('single MAGI $499,999 → tier 4', M.irmaaTier(499999, L.irmaa.single), 4);
check('single MAGI $500,000 → tier 5', M.irmaaTier(500000, L.irmaa.single), 5);

console.log('\nCase A: joint, SS $52,000, other $40,000, no conversion');
const fA = { status: 'joint', ss: 52000, other: 40000, exempt: 0 };
let r = M.compute(fA, 0);
check('taxable Social Security', r.ssTax, 24700);
check('AGI', r.agi, 64700);
check('senior deduction (2 × $6,000)', r.senior, 12000);
check('standard deduction + 2 × $1,650', r.std, 35500);
check('taxable income', r.ti, 17200);
check('tax', r.tax, 1720);
check('real marginal rate = 10% × 1.85', M.decompose(fA, 0).total, 0.185);

console.log('\nCase B: same, $30,000 conversion (benefits now 85% taxable, capped)');
r = M.compute(fA, 30000);
check('taxable Social Security (85% cap)', r.ssTax, 44200);
check('taxable income', r.ti, 66700);
check('tax', r.tax, 7508);
check('real marginal rate = bracket 12%', M.decompose(fA, 30000).total, 0.12);
check('average rate on the conversion', (r.tax - M.compute(fA, 0).tax) / 30000, 5788 / 30000);

console.log('\nCase C: single, SS $30,000, other $60,000 (in senior phase-out)');
const fC = { status: 'single', ss: 30000, other: 60000, exempt: 0 };
r = M.compute(fC, 0);
check('taxable Social Security', r.ssTax, 25500);
check('senior deduction = 6,000 − 6% × 10,500', r.senior, 5370);
check('taxable income', r.ti, 61980);
check('tax', r.tax, 8347.6);
check('real marginal rate = 22% × 1.06', M.decompose(fC, 0).total, 0.2332);

console.log('\nCase D: joint couple, senior deduction fully phased out at MAGI $250,000');
r = M.compute({ status: 'joint', ss: 0, other: 250000, exempt: 0 }, 0);
check('senior deduction', r.senior, 0);
r = M.compute({ status: 'joint', ss: 0, other: 200000, exempt: 0 }, 0);
check('senior deduction at $200,000 = 2 × (6,000 − 3,000)', r.senior, 6000);
check('real rate in phase-out = 22% × 1.12', M.decompose({ status: 'joint', ss: 0, other: 200000, exempt: 0 }, 0).total, 0.2464);

console.log('\nCase E: tax-exempt interest counts for IRMAA');
r = M.compute({ status: 'joint', ss: 0, other: 210000, exempt: 10000 }, 0);
check('IRMAA tier', r.tier, 1);
check('annual surcharge, 2 people = (81.20 + 14.50) × 24', r.irmaa, 2296.8);

console.log('\nDecomposition equals the finite-difference rate away from kinks:');
let worst = 0, n = 0;
const kinkTol = 2;
for (const st of ['joint', 'single']) for (const ss of [0, 24000, 52000, 90000]) for (const other of [0, 30000, 80000, 160000]){
  const f = { status: st, ss, other, exempt: 0 };
  const segs = M.segments(f, 300000);
  for (const s of segs){
    if (s.to - s.from < 4 * kinkTol) continue;
    for (const x of [s.from + kinkTol, (s.from + s.to) / 2, s.to - kinkTol]){
      const fd = M.compute(f, x + 1).tax - M.compute(f, x).tax;
      const d = Math.abs(fd - M.decompose(f, x).total);
      worst = Math.max(worst, d); n++;
    }
  }
}
check(n + ' points: worst |decomposed − finite difference|', worst, 0, 1e-6);

console.log('\nEach range in the table carries the rate found inside it:');
let segBad = 0, segN = 0;
for (const st of ['joint', 'single']) for (const ss of [0, 30000, 52000]) for (const other of [0, 40000, 120000]){
  const f = { status: st, ss, other, exempt: 0 };
  for (const s of M.segments(f, 300000)){
    if (s.to - s.from < 6) continue;
    for (const x of [s.from + 2, s.to - 3]){
      segN++;
      if (Math.abs(M.decompose(f, x).total - s.d.total) > 1e-9) segBad++;
    }
  }
}
check(segN + ' interior points disagreeing with their range', segBad, 0);
r = M.segments(fA, 300000).find(s => s.from <= 30000 && s.to > 30000);
check('Case A: range holding $30,000 is at the 12% bracket', r.d.total, 0.12);

console.log('\nBest conversion (maximises hurdle·x − extra tax − extra surcharge):');
let b = M.best(fA, 0.22, 300000);
check('Case A at 22%: converts through the torpedo to top of 12% bracket', b.x, 64100);
check('Case A at 22%: saving = 0.22 × 64,100 − (11,600 − 1,720)', b.saving, 0.22 * 64100 - (11600 - 1720));
b = M.best(fA, 0.10, 300000);
check('Case A at 10%: nothing pays', b.x, 0);

console.log('\nCliffs land where the tier actually changes:');
for (const f of [fA, fC, { status: 'single', ss: 40000, other: 90000, exempt: 5000 }]){
  for (const c of M.cliffs(f, 300000)){
    check(f.status + ' cliff at ' + c.x, M.compute(f, c.x).tier - M.compute(f, c.x - 1).tier, 1);
  }
}

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASS' : fail + ' FAILURE(S)'));
process.exit(fail ? 1 : 0);
