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
const code = 'const MAX_PCT = 0.85;\n' +
  ['model','uncapped','curvePoints','marginalAt'].map(extract).join('\n');
const { model, uncapped, curvePoints } =
  new Function(code + '; return {model, uncapped, curvePoints, marginalAt};')();

const S = [
  ['Joint A',  {benefits:12400, agi:36000, lo:32000, up:44000}, 5100,    0.4112903225806452],
  ['Joint B',  {benefits:16000, agi:12000, lo:32000, up:44000}, 0,       0],
  ['Joint C',  {benefits:24496, agi:59618, lo:32000, up:44000}, 20821.6, 0.85],
  ['Single A', {benefits:7200,  agi:16000, lo:25000, up:34000}, 0,       0],
  ['Single B', {benefits:7200,  agi:22000, lo:25000, up:34000}, 300,     0.041666666666666664],
  ['Single C', {benefits:7200,  agi:34000, lo:25000, up:34000}, 6120,    0.85],
];
let fail = 0;
console.log('scenario    taxable    expected    pct      expected   status');
for (const [name, base, expT, expP] of S){
  const r = model(base);
  const ok = Math.abs(r.taxable - expT) < 1e-6 && Math.abs(r.pct - expP) < 1e-12;
  if (!ok) fail++;
  console.log(name.padEnd(10), r.taxable.toFixed(2).padStart(10), expT.toFixed(2).padStart(11),
              r.pct.toFixed(5).padStart(9), expP.toFixed(5).padStart(10), ok ? '  PASS' : ' **FAIL**');
}

// The marker must sit exactly on the drawn line.
console.log('\nmarker sits on the drawn curve:');
for (const [name, base] of S){
  const r = model(base);
  const half = base.benefits/2, xMax = 200000;
  const pts = curvePoints(base.benefits, base.lo, base.up, xMax);
  let y = null;
  for (let k=0;k<pts.length-1;k++){
    const a=pts[k], z=pts[k+1];
    if (r.pi>=a.x && r.pi<=z.x && z.x>a.x){ y = a.y + (z.y-a.y)*(r.pi-a.x)/(z.x-a.x); break; }
  }
  const d = Math.abs(y - r.taxable);
  if (d > 1e-6) fail++;
  console.log('  ' + name.padEnd(10) + 'Δ ' + d.toExponential(1) + (d<1e-6 ? '  PASS' : ' **FAIL**'));
}

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
