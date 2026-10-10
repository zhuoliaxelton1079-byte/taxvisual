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
const NAMES = ['model','bindingFor','overallBinding','knots','curvePoints','saturationAgi'];
const code = NAMES.map(extract).join('\n');
const { model, bindingFor, overallBinding, knots, curvePoints, saturationAgi } =
  new Function(code + '; return {' + NAMES.join(',') + '};')();

const G = i => ({ agi:i[0], g1:i[1], g2:i[2], g3:i[3], g4:i[4], g5:i[5] });
let fail = 0;
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* ------------------------------------------------------------------ 1
   The workbook's own figures. "Charitable donation limitation" tab,
   B1 = 100,000 with C5/C6/C7/C10/C11 = 15,000 / 10,000 / 30,000 / 0 / 0.
   Expected column G by step, then G13 and the H column.               */
console.log('workbook scenario, column G by step:');
{
  const r = model(G([100000, 15000, 10000, 0, 30000, 0]));
  const want = { 1:15000, 2:10000, 3:0, 4:25000, 5:0 };   // G5 G6 G10 G7 G11
  for (const row of r.rows){
    const ok = near(row.ded, want[row.step]);
    if (!ok) fail++;
    console.log(`  step ${row.step}  gift ${String(row.gift).padStart(6)}  ded ${
      row.ded.toFixed(0).padStart(6)}  want ${String(want[row.step]).padStart(6)}  ${ok?'PASS':'**FAIL**'}`);
  }
  const t = near(r.total, 50000), c = near(r.rows[3].carry, 5000), g = near(r.gifts, 55000);
  if (!t || !c || !g) fail++;
  console.log(`  G13 total ${r.total.toFixed(0)} want 50000  ${t?'PASS':'**FAIL**'}`);
  console.log(`  H7 carryover on step 4 ${r.rows[3].carry.toFixed(0)} want 5000  ${c?'PASS':'**FAIL**'}`);
  console.log(`  gifts ${r.gifts.toFixed(0)} want 55000  ${g?'PASS':'**FAIL**'}`);
}

/* ------------------------------------------------------------------ 2
   The tab's formulas re-typed independently, with the three documented
   deviations applied. Catches a transcription slip in the page.        */
function tab(i){
  const z = v => v > 0 ? v : 0;
  const { agi } = i, c5 = i.g1, c6 = i.g2, c10 = i.g3, c7 = i.g4, c11 = i.g5;
  const d1 = Math.min(c5, 0.60 * agi);                                    // G5 + dev 2
  const d2 = Math.min(c6, Math.min(0.50 * agi, z(0.5 * agi - c5)));       // G6 + dev 1
  const d3 = Math.min(c10, Math.min(0.30 * agi, z(0.5 * agi - (c5 + c6 + c7))));  // G10
  const d4 = Math.min(c7, Math.min(0.30 * agi, z(0.5 * agi - (c5 + c6))));        // G7 + dev 1
  const d5 = Math.min(c11, Math.min(0.20 * agi,
    Math.min(z(0.5 * agi - (c5 + c6 + c7 + c10)),
             Math.min(z(0.3 * agi - c7), z(0.3 * agi - c10)))));          // G11
  return { per:[d1, d2, d3, d4, d5], total:d1 + d2 + d3 + d4 + d5 };
}

/* ------------------------------------------------------------------ 3
   IRS Publication 526 Worksheet 2, which the workbook carries verbatim
   on its neighbouring "IRS worksheet charitable donati" tab. A genuinely
   separate source, not the same formulas re-typed. Lines 4 and 5 ("for
   the use of") are zero: the tab does not model them.                  */
function irsWorksheet2(i){
  const z = v => v > 0 ? v : 0;
  const L11 = i.agi;
  const L4 = 0, L5 = 0, L6 = i.g5, L7 = i.g3, L8 = i.g4, L9 = i.g2, L10 = i.g1;
  const L13 = Math.min(L10, 0.6 * L11);                       // 12, 13
  const L17 = Math.min(L9, z(0.5 * L11 - L13));               // 15, 16, 17
  const L24 = Math.min(z(0.5 * L11 - (L8 + L9 + L10)),        // 19, 20, 21
                       0.3 * L11, L5 + L7);                   // 22, 23, 24
  const L30 = Math.min(L8, z(0.5 * L11 - (L9 + L10)), 0.3 * L11);   // 26-30
  const L40 = Math.min(z(0.5 * L11 - (L13 + L17 + L24 + L30)),      // 32, 33, 34
                       z(0.3 * L11 - L24), z(0.3 * L11 - L30),      // 35, 36, 37
                       0.2 * L11, L4 + L6);                         // 38, 39, 40
  return { per:[L13, L17, L24, L30, L40], total:L13 + L17 + L24 + L30 + L40 };
}

/* The two worksheets net DIFFERENT quantities into the 20% class's room:
   the tab subtracts what was given (C5:C7, C10), IRS Worksheet 2 lines 34,
   36 and 37 subtract what was actually deducted (lines 13, 17, 24, 30).
   Since a deduction is never more than the gift, the IRS room is never the
   smaller of the two, so the tab could in principle be the stingier. It
   never is, and the sweep below is the evidence: wherever an earlier class
   is cut it is cut because the pool or its own ceiling is already spent,
   and then the 20% class has zero room under both formulations. So this is
   an equivalence, not a deviation — asserted here as exact equality on all
   five steps rather than as an inequality. */
console.log('\nmodel === the tab re-typed === IRS Worksheet 2, on every step,');
console.log('across a sweep that drives every floor and every ceiling:');
{
  let swept = 0, badTab = 0, badIrs = 0, badCarry = 0;
  const AGIS   = [0, 1000, 20000, 27000, 50000, 100000, 140000, 300000];
  const AMOUNT = [0, 5000, 15000, 30000, 80000];
  for (const agi of AGIS)
   for (const a of AMOUNT) for (const b of AMOUNT) for (const c of AMOUNT)
    for (const d of [0, 30000, 80000]) for (const e of [0, 15000, 80000]){
      const inp = G([agi, a, b, c, d, e]);
      const m = model(inp), t = tab(inp), w = irsWorksheet2(inp);
      swept++;
      if (!near(m.total, t.total) || m.rows.some((r, k) => !near(r.ded, t.per[k]))) badTab++;
      if (m.rows.some((r, k) => !near(r.ded, w.per[k]))) badIrs++;
      if (!near(m.total + m.carry, m.gifts)) badCarry++;
    }

  /* The structured sweep lands on round numbers, which is exactly where a
     cap and a gift coincide. A seeded LCG adds off-grid draws — same
     sequence every run, so a failure is reproducible. */
  let seed = 20260929, fine = 0, badFine = 0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 250000; k++){
    const inp = G([Math.round(rnd() * 200000), Math.round(rnd() * 120000), Math.round(rnd() * 120000),
                   Math.round(rnd() * 120000), Math.round(rnd() * 120000), Math.round(rnd() * 120000)]);
    const m = model(inp), w = irsWorksheet2(inp);
    fine++;
    if (m.rows.some((r, j) => !near(r.ded, w.per[j]))) badFine++;
  }

  if (badTab || badIrs || badCarry || badFine) fail++;
  console.log(`  ${swept} structured combinations + ${fine} seeded off-grid draws`);
  console.log(`    vs the tab re-typed            ${badTab} mismatches  ${badTab?'**FAIL**':'PASS'}`);
  console.log(`    vs IRS Worksheet 2, structured ${badIrs} mismatches  ${badIrs?'**FAIL**':'PASS'}`);
  console.log(`    vs IRS Worksheet 2, off-grid   ${badFine} mismatches  ${badFine?'**FAIL**':'PASS'}`);
  console.log(`    total + carryover === gifts    ${badCarry} mismatches  ${badCarry?'**FAIL**':'PASS'}`);
}

/* ------------------------------------------------------------------ 4
   The deduction can never exceed what was given, nor 60% of AGI, and it
   never falls as AGI rises — the flat top of the chart depends on that. */
console.log('\nbounds and monotonicity in AGI:');
{
  let bad = 0, nonmono = 0;
  const cases = [[15000,10000,0,30000,0], [80000,0,0,0,0], [0,0,30000,0,15000],
                 [30000,30000,30000,30000,30000], [0,0,0,0,80000]];
  for (const g of cases){
    let prev = -1;
    for (let agi = 0; agi <= 400000; agi += 500){
      const r = model(G([agi, ...g]));
      if (r.total > r.gifts + 1e-6 || r.total > 0.6 * agi + 1e-6 || r.carry < -1e-6) bad++;
      if (r.total < prev - 1e-6) nonmono++;
      prev = r.total;
    }
  }
  if (bad || nonmono) fail++;
  console.log(`  ${bad} bound violations, ${nonmono} decreases  ${bad||nonmono?'**FAIL**':'PASS'}`);
}

/* ------------------------------------------------------------------ 5
   The drawn polyline IS the model. Knots are computed from pairwise
   intersections of the affine pieces rather than sampled, so dense
   sampling must land exactly on the polyline — a missing knot shows up
   here as a rounded corner.                                            */
console.log('\nthe drawn polyline reproduces the model exactly (knot set complete):');
{
  let worst = 0, worstAt = null;
  const cases = [[15000,10000,0,30000,0], [40000,20000,10000,30000,10000],
                 [80000,0,0,0,0], [0,5000,5000,5000,5000], [5000,0,30000,0,15000],
                 // The last two exist to make the 30% cross-limits on step 5
                 // the ONLY thing bending the curve over a stretch of AGI:
                 // with nothing else given, room5 is 0.3*AGI - c7 (and
                 // - c10) alone, so its corner at AGI = c/0.3 is a knot no
                 // other limit contributes. Without them the knot set could
                 // drop those two lines and nothing here would notice.
                 [0,0,0,20000,50000], [0,0,20000,0,50000]];
  for (const g of cases){
    const inp = G([100000, ...g]);
    const xMax = 400000;
    const pts = curvePoints(inp, 0, xMax);
    for (let agi = 0; agi <= xMax; agi += 173){       // a prime-ish step, so
      let y = null;                                    // samples miss the knots
      for (let k = 0; k < pts.length - 1; k++){
        const a = pts[k], b = pts[k+1];
        if (agi >= a.x && agi <= b.x && b.x > a.x){
          y = a.y + (b.y - a.y) * (agi - a.x) / (b.x - a.x); break;
        }
      }
      const want = model(G([agi, ...g])).total;
      const d = Math.abs(y - want);
      if (d > worst){ worst = d; worstAt = [g.join('/'), agi]; }
    }
  }
  const ok = worst < 1e-6;
  if (!ok) fail++;
  console.log(`  worst deviation ${worst.toExponential(2)}${worstAt?' at gifts '+worstAt[0]+', AGI '+worstAt[1]:''}  ${ok?'PASS':'**FAIL**'}`);
}

/* ------------------------------------------------------------------ 6
   The plotted marker lands on the drawn polyline at the taxpayer's own
   AGI, for every scenario the page can open on.                        */
console.log('\nmarker sits on the drawn curve:');
{
  const cases = [[100000,15000,10000,0,30000,0], [20000,15000,10000,0,30000,0],
                 [250000,15000,10000,0,30000,0], [60000,40000,0,20000,0,20000]];
  for (const cs of cases){
    const inp = G(cs);
    const r = model(inp);
    const xMax = Math.max(saturationAgi(inp) * 1.35, inp.agi * 1.15, 10000);
    const pts = curvePoints(inp, 0, xMax);
    let y = null;
    for (let k = 0; k < pts.length - 1; k++){
      const a = pts[k], b = pts[k+1];
      if (inp.agi >= a.x && inp.agi <= b.x && b.x > a.x){
        y = a.y + (b.y - a.y) * (inp.agi - a.x) / (b.x - a.x); break;
      }
    }
    const ok = y !== null && near(y, r.total);
    if (!ok) fail++;
    console.log(`  AGI ${String(cs[0]).padStart(6)}  polyline ${String(y===null?'off-window':y.toFixed(2)).padStart(10)}  model ${
      r.total.toFixed(2).padStart(10)}  ${ok?'PASS':'**FAIL**'}`);
  }
}

/* ------------------------------------------------------------------ 7
   The AGI the chart names as "everything deductible from here" is a real
   transition: something still carries just below it, nothing at it.     */
console.log('\nthe saturation point is a real transition:');
{
  let bad = 0, n = 0;
  const cases = [[15000,10000,0,30000,0], [40000,20000,10000,30000,10000],
                 [80000,0,0,0,0], [0,0,0,0,25000], [12000,0,0,0,0]];
  for (const g of cases){
    const inp = G([100000, ...g]);
    const sat = saturationAgi(inp);
    const at   = model(G([sat, ...g]));
    const just = model(G([Math.max(0, sat - 1), ...g]));
    const ok = at.carry <= 1e-6 && (sat === 0 || just.carry > 1e-9);
    n++; if (!ok) bad++;
    console.log(`  gifts ${g.join('/').padEnd(26)} saturates at AGI ${sat.toFixed(0).padStart(7)}  carry ${
      at.carry.toFixed(2).padStart(8)} at it, ${just.carry.toFixed(2).padStart(8)} just below  ${ok?'PASS':'**FAIL**'}`);
  }
  if (bad) fail++;
}

/* ------------------------------------------------------------------ 8
   The limit named in the rail is the one that actually produced the
   answer, swept rather than spot-checked — this is a cascade, so which
   cap binds is the whole output.                                       */
console.log('\nthe named binding limit is the one that actually binds:');
{
  let swept = 0, bad = 0;
  for (let agi = 0; agi <= 300000; agi += 2500)
   for (const a of [0, 20000, 70000]) for (const b of [0, 25000])
    for (const c of [0, 40000]) for (const d of [0, 35000]) for (const e of [0, 30000]){
      const r = model(G([agi, a, b, c, d, e]));
      swept++;
      for (const row of r.rows){
        const k = bindingFor(row);
        const got = k === 'none'    ? 0
                  : k === 'full'    ? row.gift
                  : k === 'ceiling' ? row.ceiling
                                    : row.room;   // pool | cross-cg | cross-other
        if (!near(got, row.ded)) bad++;
      }
      // and the whole-return summary must name one of the rows that carried
      const o = overallBinding(r);
      if (o.key !== 'none' && o.key !== 'full'){
        const row = r.rows.find(x => x.step === o.step);
        if (!row || row.carry <= 1e-9 || bindingFor(row) !== o.key) bad++;
        // it must be the LARGEST carryover, earliest step on a tie
        const max = Math.max(...r.rows.map(x => x.carry));
        if (!near(row.carry, max)) bad++;
      } else if (o.key === 'full' && r.carry > 1e-9) bad++;
    }
  if (bad) fail++;
  console.log(`  ${swept} combinations, ${bad} mis-named  ${bad?'**FAIL**':'PASS'}`);

  /* On a TIE the sweep above cannot tell the two names apart — both
     candidates equal the deduction, so either answer passes. The statute
     states each class as "the smaller of: N% of AGI, or 50% of AGI minus
     ...", so the percentage ceiling is the earlier limit and the one to
     name. Pinned by value here, or the tie order is free to drift.
     AGI 100,000 with 20,000 cash and 50,000 of capital gain property puts
     step 4's ceiling (0.3 x 100,000) and its pool room (0.5 x 100,000 -
     20,000) both at exactly 30,000. */
  /* Step 5's room is four caps at once and they are NOT the same limit in
     words: Pub. 526 step 5 gives the 50% pool, 30% of AGI less the capital
     gain gifts, and 30% of AGI less the OTHER 30%-class gifts. A value
     check cannot separate them — all three are just `row.room` — so each
     is pinned by a case built to make it the strict minimum. */
  const CROSS = [
    ['pool',        [100000, 40000, 0, 0, 0, 50000]],   // pool room 10k, both cross 30k
    ['cross-cg',    [100000, 0, 0, 0, 20000, 50000]],   // cg cross 10k, pool/other 30k
    ['cross-other', [100000, 0, 0, 20000, 0, 50000]]    // other cross 10k, pool/cg 30k
  ];
  for (const [want, inp] of CROSS){
    const row = model(G(inp)).rows[4];
    const got = bindingFor(row);
    const ok = got === want && near(row.ded, 10000);
    if (!ok) fail++;
    console.log(`  step 5 room: named "${got}", want "${want}", ded ${row.ded.toFixed(0)} want 10000  ${ok?'PASS':'**FAIL**'}`);
  }

  const tie = model(G([100000, 20000, 0, 0, 50000, 0]));
  const row4 = tie.rows[3];
  const tied = near(row4.ceiling, row4.room) && near(row4.ded, 30000);
  const named = bindingFor(row4) === 'ceiling';
  if (!tied || !named) fail++;
  console.log(`  tie at step 4: ceiling ${row4.ceiling.toFixed(0)} === room ${row4.room.toFixed(0)}, named "${
    bindingFor(row4)}", want "ceiling"  ${tied && named?'PASS':'**FAIL**'}`);
}

/* ------------------------------------------------------------------ 9
   The two corrections to the tab actually bite, so a regression that
   dropped them would be caught rather than merely unobserved.          */
console.log('\nthe documented corrections to the tab are live:');
{
  // dev 2 — the 60% ceiling on step 1. The tab's G5 = C5 would allow it all.
  const a = model(G([50000, 45000, 0, 0, 0, 0]));
  const ok1 = near(a.rows[0].ded, 30000) && near(a.rows[0].carry, 15000);
  // dev 1 — the zero floor on F6 and F7. Unfloored, room2 = 25000-45000 and
  // the tab returns a NEGATIVE deduction for step 2.
  const b = model(G([50000, 45000, 10000, 0, 10000, 0]));
  const ok2 = b.rows[1].ded === 0 && b.rows[3].ded === 0 && b.total >= 0;
  if (!ok1 || !ok2) fail++;
  console.log(`  60% cash ceiling applied: step 1 ded ${a.rows[0].ded.toFixed(0)} of 45000 given  ${ok1?'PASS':'**FAIL**'}`);
  console.log(`  room floored at zero:     steps 2 and 4 ded ${b.rows[1].ded.toFixed(0)} and ${
    b.rows[3].ded.toFixed(0)}, never negative  ${ok2?'PASS':'**FAIL**'}`);
}

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
