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
const NAMES = ['model','bindingFor','knots','curvePoints','slopeAt','domain'];
const code = NAMES.map(extract).join('\n');
const { model, bindingFor, knots, curvePoints, slopeAt, domain } =
  new Function(code + '; return {' + NAMES.join(',') + '};')();

const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
let fail = 0;

/* Workbook "QBI deduction" tab: single filer, threshold 191,950, band
   50,000. Columns C..G are its five scenarios. */
const T = 191950, R = 50000;
const W = (ti, qbi, w2, ubia, sstb) =>
  ({ ti, qbi, w2, ubia, threshold:T, range:R, sstb });

/* ------------------------------------------------------------------ 1
   The workbook's own scenarios.                                        */
console.log('workbook "QBI deduction" tab, the five scenarios (row 35):');
{
  const S = [
    ['1 below threshold',   W(180000, 140000, 20000, 125000, false), 28000,  true ],
    ['2 above, SSTB',       W(245000, 180000, 60000, 100000, true ), 0,      true ],
    ['3 above, ordinary',   W(245000, 180000, 60000, 100000, false), 30000,  true ],
    ['4 in band, ordinary', W(200000, 180000, 60000, 100000, false), 35034,  true ],
    /* Scenario 5 is the one the corrections move. The tab reaches
       26,118.79 (cell G35) because G31 multiplies the wage ceiling by RP%
       instead of using the reduced wages; the statute gives 29,393.526. */
    ['5 in band, SSTB',     W(200000, 180000, 60000, 100000, true ), 29393.526, false ]
  ];
  for (const [name, inp, want, agrees] of S){
    const r = model(inp);
    const ok = near(r.ded, want, 1e-3);
    if (!ok) fail++;
    console.log(`  ${name.padEnd(20)} ded ${r.ded.toFixed(2).padStart(11)}  want ${
      String(want).padStart(10)}  ${ok?'PASS':'**FAIL**'}${agrees?'':'   (tab says 26,118.79 — see doc)'}`);
  }
}

/* ------------------------------------------------------------------ 2
   The second tab, "20% deduc not SSTB", threshold 170,050.             */
console.log('\nworkbook "20% deduc not SSTB" tab (cells C45 and I32):');
{
  const inp = { ti:150000, qbi:75000, w2:20000, ubia:0,
                threshold:170050, range:50000, sstb:false };
  const r = model(inp);
  const ok = near(r.ded, 15000);
  if (!ok) fail++;
  console.log(`  option 1 and 2       ded ${r.ded.toFixed(2).padStart(11)}  want      15000  ${ok?'PASS':'**FAIL**'}`);
}

/* ------------------------------------------------------------------ 3
   An independent reference, written the branchy way Form 8995-A works —
   Schedule A first, then Part II by cases — rather than the page's closed
   form re-typed. If the two agree everywhere, the closed form is right.  */
function form8995A(i){
  const { ti, qbi, w2, ubia, threshold:t, range:Rg, sstb } = i;
  const over = ti - t;
  let Q = qbi, W2 = w2, U = ubia;

  if (sstb){
    if (over >= Rg) return { ded: 0 };            // not a qualified business at all
    if (over > 0){                                 // Schedule A: applicable %
      const ap = 1 - over / Rg;
      Q *= ap; W2 *= ap; U *= ap;
    }
  }
  const line2 = 0.20 * Q;                          // Part II line 2
  const line6 = Math.max(0.50 * W2, 0.25 * W2 + 0.025 * U);

  let component;
  if (over <= 0){
    component = line2;                             // 199A(b)(3)(A), no limit
  } else if (over >= Rg){
    component = Math.min(line2, line6);            // limit in full
  } else if (line6 >= line2){
    component = line2;                             // 199A(b)(3)(B)(i)(II) not met
  } else {
    const excess = line2 - line6;
    component = line2 - excess * (over / Rg);
  }
  return { ded: Math.min(component, 0.20 * ti) };
}

console.log('\nmodel === Form 8995-A worked by cases, over a sweep:');
{
  let swept = 0, bad = 0, worst = 0, worstAt = null;
  const TIS  = [0, 50000, 150000, 191950, 191951, 200000, 216950, 241949, 241950, 300000, 900000];
  const QS   = [0, 40000, 180000, 400000];
  const WS   = [0, 20000, 60000, 250000];
  const US   = [0, 100000, 800000];
  const THS  = [191950, 250000];
  const RGS  = [50000, 75000, 150000];
  for (const ti of TIS) for (const q of QS) for (const w of WS) for (const u of US)
   for (const th of THS) for (const rg of RGS) for (const s of [false, true]){
     const inp = { ti, qbi:q, w2:w, ubia:u, threshold:th, range:rg, sstb:s };
     const a = model(inp).ded, b = form8995A(inp).ded;
     swept++;
     const d = Math.abs(a - b);
     if (d > worst){ worst = d; worstAt = inp; }
     if (d > 1e-6) bad++;
   }
  if (bad) fail++;
  console.log(`  ${swept} combinations, ${bad} mismatches, worst ${worst.toExponential(2)}  ${bad?'**FAIL**':'PASS'}`);
  if (bad) console.log('   worst at', JSON.stringify(worstAt));
}

/* ------------------------------------------------------------------ 4
   The four parts of the bar sum to 20% of QBI EXACTLY, and every one of
   them is non-negative. The whole decomposition rests on that identity.  */
console.log('\n20% of QBI splits exactly four ways, all non-negative:');
{
  let swept = 0, badSum = 0, badSign = 0, worst = 0;
  let seed = 20260929;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 200000; k++){
    const inp = { ti: Math.round(rnd() * 600000), qbi: Math.round(rnd() * 400000),
                  w2: Math.round(rnd() * 300000), ubia: Math.round(rnd() * 900000),
                  threshold: 100000 + Math.round(rnd() * 200000),
                  range: 25000 + Math.round(rnd() * 150000), sstb: rnd() < 0.5 };
    const r = model(inp);
    const sum = r.ded + r.lostSstb + r.lostWage + r.lostCap;
    const d = Math.abs(sum - r.most);
    if (d > worst) worst = d;
    if (d > 1e-6) badSum++;
    if (r.ded < -1e-9 || r.lostSstb < -1e-9 || r.lostWage < -1e-9 || r.lostCap < -1e-9) badSign++;
    swept++;
  }
  if (badSum || badSign) fail++;
  console.log(`  ${swept} seeded draws, ${badSum} sum errors (worst ${worst.toExponential(2)}), ${
    badSign} negative parts  ${badSum||badSign?'**FAIL**':'PASS'}`);
}

/* ------------------------------------------------------------------ 5
   Statutory bounds and the two boundary behaviours.                     */
console.log('\nbounds and the behaviour either side of the band:');
{
  let bad = 0, n = 0;
  let seed = 7771;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 120000; k++){
    const th = 100000 + Math.round(rnd() * 200000), rg = 25000 + Math.round(rnd() * 150000);
    const inp = { ti: Math.round(rnd() * 600000), qbi: Math.round(rnd() * 400000),
                  w2: Math.round(rnd() * 300000), ubia: Math.round(rnd() * 900000),
                  threshold: th, range: rg, sstb: rnd() < 0.5 };
    const r = model(inp);
    n++;
    // never more than 20% of QBI, never more than 20% of taxable income
    if (r.ded > 0.20 * inp.qbi + 1e-6 || r.ded > 0.20 * inp.ti + 1e-6 || r.ded < -1e-9) bad++;
    // below the threshold the wage ceiling is ignored entirely, 199A(b)(3)(A)
    if (inp.ti <= th && !near(r.ded, Math.min(0.20 * inp.qbi, 0.20 * inp.ti))) bad++;
    // at or above the far edge an SSTB gets nothing at all, 199A(d)(3)(A)
    if (inp.sstb && inp.ti >= th + rg && !near(r.ded, 0)) bad++;
  }
  if (bad) fail++;
  console.log(`  ${n} seeded draws, ${bad} violations  ${bad?'**FAIL**':'PASS'}`);
}

/* ------------------------------------------------------------------ 6
   No jump at either edge of the band. A piecewise rule assembled wrongly
   shows up here first, and nowhere on screen until someone drags across
   the boundary and sees the line snap.                                  */
console.log('\nthe curve is continuous across both band edges:');
{
  let bad = 0, worst = 0, worstAt = null;
  const cases = [
    W(0, 180000, 60000, 100000, false), W(0, 180000, 60000, 100000, true),
    W(0, 400000, 0, 0, false),          W(0, 400000, 0, 0, true),
    W(0, 180000, 250000, 0, false),     W(0, 60000, 10000, 900000, true)
  ];
  for (const base of cases){
    for (const edge of [T, T + R]){
      for (const h of [1e-4, 1e-5]){
        const lo = model({ ...base, ti: edge - h }).ded;
        const hi = model({ ...base, ti: edge + h }).ded;
        const at = model({ ...base, ti: edge }).ded;
        const d = Math.max(Math.abs(lo - at), Math.abs(hi - at));
        if (d > worst){ worst = d; worstAt = [base.sstb ? 'sstb' : 'ordinary', edge]; }
        if (d > 1e-3) bad++;
      }
    }
  }
  if (bad) fail++;
  console.log(`  worst jump ${worst.toExponential(2)}${worstAt?' ('+worstAt[0]+' at '+worstAt[1]+')':''}, ${
    bad} discontinuities  ${bad?'**FAIL**':'PASS'}`);
}

/* ------------------------------------------------------------------ 7
   The drawn polyline reproduces the model.

   Outside the band, and everywhere for an ordinary business, the curve is
   piecewise linear and the knots are exact, so the polyline must match to
   1e-6. Inside the band an SSTB curve is a PARABOLA — 199A(d)(3) scales the
   tentative amount by (1-p) while 199A(b)(3)(B) multiplies the excess by p
   — so there the polyline is a chord approximation, and the test is that
   the error stays under the bound the code claims: with 64 chords and
   |d2f/dTI2| = 2*E0/R^2, the chord error is at most E0/16384.            */
console.log('\nthe drawn polyline reproduces the model:');
{
  const cases = [
    ['ordinary, wages bite',  W(0, 180000, 60000, 100000, false)],
    ['ordinary, no wages',    W(0, 400000, 0, 0, false)],
    ['ordinary, cap bites',   W(0, 400000, 250000, 0, false)],
    ['sstb, wages bite',      W(0, 180000, 60000, 100000, true)],
    ['sstb, no wages',        W(0, 400000, 0, 0, true)],
    ['sstb, ceiling above',   W(0, 100000, 250000, 0, true)]
  ];
  for (const [name, inp] of cases){
    const xMin = 100000, xMax = 300000;
    const pts = curvePoints(inp, xMin, xMax);
    const C0 = Math.max(0.5 * inp.w2, 0.25 * inp.w2 + 0.025 * inp.ubia);
    const E0 = Math.max(0.20 * inp.qbi - C0, 0);
    const bound = inp.sstb && E0 > 0 ? E0 / 16384 : 1e-6;

    // exact at every knot, whatever the shape
    let knotErr = 0;
    for (const p of pts) knotErr = Math.max(knotErr, Math.abs(p.y - model({ ...inp, ti:p.x }).ded));

    // and between the knots, within the stated bound
    let chordErr = 0, at = null;
    for (let ti = xMin; ti <= xMax; ti += 97){          // off-knot sampling
      let y = null;
      for (let k = 0; k < pts.length - 1; k++){
        const a = pts[k], b = pts[k+1];
        if (ti >= a.x && ti <= b.x && b.x > a.x){ y = a.y + (b.y-a.y)*(ti-a.x)/(b.x-a.x); break; }
      }
      if (y === null) continue;
      const d = Math.abs(y - model({ ...inp, ti }).ded);
      if (d > chordErr){ chordErr = d; at = ti; }
    }
    const ok = knotErr < 1e-6 && chordErr <= bound + 1e-9;
    if (!ok) fail++;
    console.log(`  ${name.padEnd(22)} knots ${knotErr.toExponential(1)}  between ${
      chordErr.toExponential(1)} (bound ${bound.toExponential(1)})${at?' at '+at:''}  ${ok?'PASS':'**FAIL**'}`);
  }
}

/* ------------------------------------------------------------------ 8
   The plotted marker lands on the drawn polyline, and the marginal figure
   in the rail is the slope of that same polyline.                        */
console.log('\nmarker and marginal rate agree with the drawn curve:');
{
  const cases = [W(200000, 180000, 60000, 100000, false), W(200000, 180000, 60000, 100000, true),
                 W(150000, 180000, 60000, 100000, false), W(280000, 180000, 60000, 100000, true),
                 W(40000,  180000, 60000, 100000, false), W(460000, 180000, 60000, 100000, true)];
  for (const inp of cases){
    // the page's own window, extracted, not a copy of it — a taxpayer
    // outside the default band view must still land on the drawn line
    const { xMin, xMax } = domain(inp);
    const pts = curvePoints(inp, xMin, xMax);
    const r = model(inp);
    let y = null;
    for (let k = 0; k < pts.length - 1; k++){
      const a = pts[k], b = pts[k+1];
      if (inp.ti >= a.x && inp.ti <= b.x && b.x > a.x){ y = a.y + (b.y-a.y)*(inp.ti-a.x)/(b.x-a.x); break; }
    }
    const s = slopeAt(pts, inp.ti);
    // the slope must be the slope of the segment the marker sits on
    let want = null;
    for (let k = 0; k < pts.length - 1; k++){
      if (pts[k+1].x > pts[k].x && inp.ti >= pts[k].x && inp.ti < pts[k+1].x){
        want = (pts[k+1].y - pts[k].y) / (pts[k+1].x - pts[k].x); break;
      }
    }
    const ok = y !== null && Math.abs(y - r.ded) < 1e-6 && (want === null || near(s, want, 1e-12));
    if (!ok) fail++;
    console.log(`  TI ${String(inp.ti).padStart(6)} ${(inp.sstb?'sstb':'ord ')}  polyline ${
      (y===null?'off':y.toFixed(2)).padStart(10)}  model ${r.ded.toFixed(2).padStart(10)}  slope ${
      s.toFixed(4).padStart(8)}  ${ok?'PASS':'**FAIL**'}`);
  }
}

/* ------------------------------------------------------------------ 9
   The limit named in the rail is the one that took the most, swept. Then
   a tie pinned by hand, because on a tie the sweep cannot tell the names
   apart and the statute's order decides.                                 */
console.log('\nthe named limit is the one that took the most:');
{
  let swept = 0, bad = 0;
  for (let ti = 120000; ti <= 320000; ti += 2500)
   for (const q of [0, 80000, 180000, 400000]) for (const w of [0, 30000, 120000])
    for (const u of [0, 200000]) for (const s of [false, true]){
      const inp = W(ti, q, w, u, s);
      const r = model(inp);
      const k = bindingFor(r, q);
      swept++;
      const got = k === 'none' ? 0 : k === 'full' ? -1
                : k === 'sstb' ? r.lostSstb : k === 'wage' ? r.lostWage : r.lostCap;
      if (k === 'full'){ if (!near(r.ded, r.most)) bad++; continue; }
      if (k === 'none'){ if (q > 0) bad++; continue; }
      const max = Math.max(r.lostSstb, r.lostWage, r.lostCap);
      if (!near(got, max)) bad++;
    }
  if (bad) fail++;
  console.log(`  ${swept} combinations, ${bad} mis-named  ${bad?'**FAIL**':'PASS'}`);

  /* An ordinary business whose two losses are exactly equal. Threshold
     100,000, band 100,000, taxable income 150,000 so p = 0.5; QBI 300,000
     and wages 60,000 give a ceiling of 30,000, an excess of 30,000 and so
     a wage loss of 15,000 — and a component of 45,000 against a cap of
     30,000, a cap loss of 15,000 too. The statute applies (b)(3)(B) before
     (a)(2), so "wage" is the name to give. */
  const tie = { ti:150000, qbi:300000, w2:60000, ubia:0,
                threshold:100000, range:100000, sstb:false };
  const rt = model(tie);
  const tied = near(rt.lostWage, rt.lostCap) && rt.lostWage > 0;
  const named = bindingFor(rt, tie.qbi) === 'wage';
  if (!tied || !named) fail++;
  console.log(`  tie: wage loss ${rt.lostWage.toFixed(0)} === cap loss ${rt.lostCap.toFixed(0)}, named "${
    bindingFor(rt, tie.qbi)}", want "wage"  ${tied && named?'PASS':'**FAIL**'}`);
}

/* ----------------------------------------------------------------- 10
   The three corrections to the workbook are live. Each is pinned by the
   input that separates the corrected model from the tab's own formulas.  */
console.log('\nthe documented corrections to the workbook are live:');
{
  /* 1+2. SSTB in the band: wages and UBIA are scaled too. The tab computes
     the ceiling from full wages and (cell G31) multiplies it by RP%. */
  const a = model(W(200000, 180000, 60000, 100000, true));
  const ok1 = near(a.ded, 29393.526, 1e-3) && near(a.wageOnly, 25170, 1e-6);
  /* 3. The 20%-of-TI cap applies last. With QBI above taxable income and a
     ceiling low enough to bite, the tab's "20% x MIN(QBI, TI)" start gives
     36,780 where the statute gives 40,000. */
  const b = model({ ti:200000, qbi:300000, w2:40000, ubia:0,
                    threshold:T, range:R, sstb:false });
  const ok2 = near(b.ded, 40000);
  if (!ok1 || !ok2) fail++;
  console.log(`  SSTB scales wages too:   50% of reduced wages ${a.wageOnly.toFixed(0)} (not 30000), ded ${
    a.ded.toFixed(2)}  ${ok1?'PASS':'**FAIL**'}`);
  console.log(`  20%-of-TI cap goes last: ded ${b.ded.toFixed(0)} (tab's order gives 36780)  ${ok2?'PASS':'**FAIL**'}`);
}

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
