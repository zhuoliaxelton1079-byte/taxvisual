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
const code = ['model','cumRecovered','excludedAt','segments'].map(extract).join('\n');
const { model, excludedAt, segments } =
  new Function(code + '; return {model, cumRecovered, excludedAt, segments};')();

let fail = 0;
const ok = (cond, label, got, want) => {
  if (!cond) fail++;
  console.log('  ' + (cond ? 'PASS' : '**FAIL**').padEnd(10) + label.padEnd(34) +
    (want === undefined ? '' : String(got) + '  expected ' + String(want)));
};

// ---- the workbook's single scenario, every derived cell -------------------
const inp = { payment: 12000, investment: 1576800, multiple: 14.6, received: 100 };
const r = model(inp);
console.log('Workbook "Annuity" tab — all derived cells:');
ok(r.annual      === 144000,  'C11 annual payments',      r.annual, 144000);
ok(r.expected    === 2102400, 'C13 expected total return', r.expected, 2102400);
ok(Math.abs(r.ratio - 0.75) < 1e-12, 'C16 exclusion ratio', r.ratio, 0.75);
ok(r.excluded    === 9000,    'C17 excluded per payment',  r.excluded, 9000);
ok(r.taxable     === 3000,    'C18 taxable per payment',   r.taxable, 3000);
ok(Math.abs(r.taxablePct - 0.25) < 1e-12, 'C19 taxable percentage', r.taxablePct, 0.25);
ok(r.recovered   === 900000,  'G11 investment recovered',  r.recovered, 900000);
ok(r.unrecovered === 676800,  'G12 unrecovered investment', r.unrecovered, 676800);
ok(r.fullAt      === 176,     'G14 payments to recovery',  r.fullAt, 176);

// ---- properties that must hold for any inputs ----------------------------
console.log('\nProperties across a sweep:');
let swept = 0, badSplit = 0, badTotal = 0, badIdentity = 0, badSeg = 0;
for (const payment of [0, 500, 12000, 30000])
 for (const investment of [0, 1000, 1576800, 3000000])
  for (const multiple of [1, 5.5, 14.6, 30]){
    const m = model({ payment, investment, multiple, received: 0 });
    swept++;

    // the split always exhausts the payment exactly
    if (Math.abs((m.excluded + m.taxable) - payment) > 1e-9) badSplit++;

    // total tax-free recovery over the life of the contract equals the
    // investment exactly -- never more (that would be untaxed income) and
    // never less (that would tax return of capital twice)
    if (m.fullAt > 0){
      let tot = 0;
      for (let n = 1; n <= m.fullAt; n++) tot += excludedAt(n, investment, m.excluded);
      if (Math.abs(tot - Math.min(investment, m.excluded * m.fullAt)) > 1e-6) badTotal++;
      if (Math.abs(tot - investment) > 1e-6) badTotal++;
    }

    // when the ratio is below 1, full recovery lands at ceil(12 x multiple),
    // independent of payment and investment -- the design of the exclusion ratio
    if (m.ratio < 1 && m.excluded > 0){
      if (m.fullAt !== Math.ceil(12 * multiple)) badIdentity++;
    }

    // segments must tile [1, xMax] with no gap and match excludedAt
    const xMax = Math.max(Math.ceil((m.fullAt > 0 ? m.fullAt : 12) * 1.5), 24);
    const segs = segments(payment, investment, m.excluded, xMax);
    let cursor = 1;
    for (const s of segs){
      if (s.from !== cursor) badSeg++;
      if (Math.abs(s.excluded - excludedAt(s.from, investment, m.excluded)) > 1e-9) badSeg++;
      cursor = s.to + 1;
    }
    if (segs.length && cursor !== xMax + 1) badSeg++;
  }
ok(badSplit === 0,    'excluded + taxable === payment', badSplit + ' bad', '0');
ok(badTotal === 0,    'lifetime exclusion === investment', badTotal + ' bad', '0');
ok(badIdentity === 0, 'full recovery at ceil(12 x multiple)', badIdentity + ' bad', '0');
ok(badSeg === 0,      'segments tile the axis exactly', badSeg + ' bad', '0');
console.log('  (' + swept + ' input combinations)');

// ---- the partial final payment -------------------------------------------
console.log('\nThe final, partial payment:');
const m2 = model(inp);
const last = excludedAt(m2.fullAt, inp.investment, m2.excluded);
const prevN = m2.fullAt - 1;
ok(Math.abs(last - (inp.investment - m2.excluded * prevN)) < 1e-9,
   'payment ' + m2.fullAt + ' excludes the remainder', last.toFixed(2), '1800.00');
ok(last < m2.excluded, 'it excludes less than a full share', last.toFixed(2), '< 9000');
ok(Math.abs(excludedAt(m2.fullAt + 1, inp.investment, m2.excluded)) < 1e-12,
   'the next payment excludes nothing', '0', '0');

console.log(fail === 0 ? '\nALL CHECKS PASS' : '\n' + fail + ' FAILURE(S)');
process.exit(fail ? 1 : 0);
