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
const code = ['model','binding','curvePoints'].map(extract).join('\n');
const { model, binding, curvePoints } =
  new Function(code + '; return {model, binding, curvePoints};')();

// Workbook "Tax Benefit Rule" tab, scenarios 1-3 (C/D/E columns)
const S = [
  ['Scenario 1', {itemized:3521,  standard:12950, relatedTax:1750, refund:900}, 0,   0,     0],
  ['Scenario 2', {itemized:25000, standard:12950, relatedTax:1750, refund:900}, 12050, 1750, 900],
  ['Scenario 3', {itemized:13000, standard:12950, relatedTax:1750, refund:900}, 50,  50,    50],
];

let fail = 0;
console.log('scenario      excess   benefit  included   expected(e/b/i)      status');
for (const [name, inp, eE, eB, eI] of S){
  const r = model(inp);
  const ok = Math.abs(r.excess-eE)<1e-9 && Math.abs(r.benefit-eB)<1e-9 && Math.abs(r.included-eI)<1e-9;
  if (!ok) fail++;
  console.log(
    name.padEnd(12),
    r.excess.toFixed(0).padStart(7), r.benefit.toFixed(0).padStart(9), r.included.toFixed(0).padStart(9),
    `   ${eE}/${eB}/${eI}`.padEnd(20), ok ? '  PASS' : ' **FAIL**');
}

// The marker must land on the drawn polyline at the taxpayer's own x.
console.log('\nmarker sits on the drawn curve:');
for (const [name, inp] of S){
  const r = model(inp);
  const capAt = Math.min(inp.relatedTax, inp.refund);
  const xMin = 0, xMax = 60000;
  const pts = curvePoints(inp.standard, inp.relatedTax, inp.refund, xMin, xMax);
  let y = null;
  for (let k=0;k<pts.length-1;k++){
    const a=pts[k], z=pts[k+1];
    if (inp.itemized>=a.x && inp.itemized<=z.x && z.x>a.x){
      y = a.y + (z.y-a.y)*(inp.itemized-a.x)/(z.x-a.x); break;
    }
  }
  const d = Math.abs(y - r.included);
  if (d > 1e-9) fail++;
  console.log(`  ${name.padEnd(12)} polyline ${y.toFixed(2).padStart(9)}  model ${r.included.toFixed(2).padStart(9)}  ${d<1e-9?'PASS':'**FAIL**'}`);
}

// included must always equal the smallest of the three limits
console.log('\nincluded === min(excess, relatedTax, refund) across a sweep:');
let swept = 0, bad = 0;
for (let it=0; it<=40000; it+=250)
 for (const T of [0,500,1750,6000])
  for (const R of [0,150,900,3000]){
    const inp = {itemized:it, standard:12950, relatedTax:T, refund:R};
    const r = model(inp);
    const want = Math.min(Math.max(0, it-12950), T, R);
    swept++;
    if (Math.abs(r.included-want) > 1e-9) bad++;
  }
if (bad) fail++;
console.log(`  ${swept} combinations, ${bad} mismatches  ${bad?'**FAIL**':'PASS'}`);

// the named binding limit must actually be the one equal to the result
console.log('\nbinding limit is named correctly:');
let bbad = 0;
for (const [name, inp] of S){
  const r = model(inp);
  const b = binding(inp, r);
  const val = { excess: r.excess, tax: inp.relatedTax, refund: inp.refund, norefund: 0 }[b.key];
  const ok = Math.abs(val - r.included) < 1e-9;
  if (!ok) bbad++;
  console.log(`  ${name.padEnd(12)} ${b.key.padEnd(9)} = ${val} vs included ${r.included}  ${ok?'PASS':'**FAIL**'}`);
}
if (bbad) fail++;

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
