/* Verification harness for tools/comprehensive-tax-calculation/.
 *
 *   node tests/verify-comprehensive-tax-calculation.mjs tools/comprehensive-tax-calculation/index.html
 *
 * The functions are pulled straight out of the shipped HTML by brace
 * matching, so a page that renders differently from this transcription
 * cannot pass. Checks, in order:
 *
 *   1. The tab's own scenario, cell by cell — all 35 computed cells.
 *   2. Column P (the base tax) derived by the workbook's cumulative formula,
 *      against the 40 values the tab holds.
 *   3. An independent cell-by-cell transcription of the Excel formulas,
 *      swept over 4 statuses x a grid of inputs.
 *   4. The collapse J = C * MIN(E,F) for rows 12-15, by exhaustion.
 *   5. The 0/15/20 split is exhaustive and the stack closes.
 *   6. The drawn polylines agree with the model everywhere, and the area
 *      under the applied curve is the tax.
 *   7. Rev. Proc. 2024-40: every bracket and threshold matches exactly, and
 *      the base-tax drift stays inside the bound the page states.
 */
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
const NAMES = ['schedules','buildSchedule','rowFor','ordTaxAt','model',
               'slicesOf','bandsOf','stepPoints','ordinaryPoints','appliedPoints'];
const code = NAMES.map(extract).join('\n');
const F = new Function(code + '; return {' + NAMES.join(',') + '};')();
const { schedules, buildSchedule, rowFor, ordTaxAt, model,
        slicesOf, bandsOf, stepPoints, ordinaryPoints, appliedPoints } = F;

const near  = (a, b, e = 1e-6)  => Math.abs(a - b) < e;
const exact = (a, b)            => Math.abs(a - b) < 1e-12;
const STATUSES = ['Single','MFJ','HH','MFS'];
let fail = 0;
function check(ok, label, got, want){
  if (!ok) { fail++; console.log(`  **FAIL** ${label}: got ${got}, want ${want}`); }
  return ok;
}

/* ================================================================== 1
   The workbook tab's own scenario, cell by cell.
   "Comprehensive Tax Calculation", B3 = Single, C6 = 220,000,
   C8 = 35,000, C9 blank, C11 = 0.                                     */
console.log('1. workbook "Comprehensive Tax Calculation" tab, every computed cell:');
{
  const r = model({ status:'Single', ordinary:220000, g25:35000, g28:0, pref:0 });
  const want = [
    ['D6',  r.r6.D,  220000], ['E6',  r.r6.E,  0.32],
    ['H6',  r.r6.H,  47461.98], ['J6', r.r6.J, 47461.98],
    ['D8',  r.r8.D,  255000], ['E8',  r.r8.E,  0.35],
    ['F8',  r.r8.F,  0.25],   ['G8',  r.r8.G,  0.25],
    ['H8',  r.r8.H,  11333.900000000001],
    ['I8',  r.r8.I,  8750],   ['J8',  r.r8.J,  8750],
    ['D9',  r.r9.D,  255000], ['E9',  r.r9.E,  0.35],
    ['F9',  r.r9.F,  0.28],   ['G9',  r.r9.G,  0.28],
    ['H9',  r.r9.H,  0], ['I9', r.r9.I, 0], ['J9', r.r9.J, 0],
    ['D11', r.D11,   255000],
    ['C12', r.r12.C, 0], ['D12', r.r12.D, 255000],
    ['E12', r.r12.E, 0.35], ['F12', r.r12.F, 0.15], ['G12', r.r12.G, 0.15],
    ['H12', r.r12.H, 0], ['I12', r.r12.I, 0], ['J12', r.r12.J, 0],
    ['C13', r.r13.C, 0], ['D13', r.r13.D, 255000],
    ['C14', r.r14.C, 0], ['D14', r.r14.D, 255000],
    ['C15', r.r15.C, 0], ['D15', r.r15.D, 255000],
    ['C17', r.C17, 255000],
    ['H17', r.H17, 58795.880000000005],
    ['I17', r.I17, 8750],
    ['J17', r.J17, 56211.98]
  ];
  let bad = 0;
  for (const [cell, got, exp] of want){
    if (!near(got, exp)) { bad++; fail++; console.log(`  **FAIL** ${cell}: got ${got}, want ${exp}`); }
  }
  console.log(`  ${want.length - bad}/${want.length} cells reproduce exactly` +
              `${bad ? '  **' + bad + ' FAILED**' : '  PASS'}`);
  console.log(`  final tax J17 = ${r.J17.toFixed(2)}   all-ordinary H17 = ${r.H17.toFixed(2)}` +
              `   saved ${(r.H17 - r.J17).toFixed(2)}`);
}

/* ================================================================== 2
   Column P, the base tax, as the tab holds it in L6:P15 and its three
   siblings. The page stores only columns L..O and derives P with the
   workbook's own cumulative formula, so this proves the derivation.    */
console.log('\n2. column P (base tax) derived vs the tab\'s 40 stored values:');
{
  const P = {
    Single: [null, 0, 1192.5, 5563.38, 5578.26, 17650.54, 40198.30, 57229.98, 156235.88, 188768.03],
    MFJ:    [null, 0, 2385,  11126.88, 11156.76, 35301.54, 80397.30, 114460.98, 149110.63, 202152.78],
    HH:     [null, 0, 1700,   7429.88,  7441.76, 15911.54, 38459.30,  55482.98, 166152.63, 187029.78],
    MFS:    [null, 0, 1192.5, 5563.38, 5578.26, 17650.54, 40198.30, 57229.98,  74545.88, 101075.53]
  };
  let n = 0, bad = 0;
  for (const s of STATUSES){
    const sch = buildSchedule(s);
    check(sch.length === 10, `${s} row count`, sch.length, 10);
    for (let k = 0; k < 10; k++){
      const want = P[s][k];
      if (want === null){
        if (sch[k].base !== null){ bad++; fail++; console.log(`  **FAIL** ${s} P row1: expected blank`); }
        continue;
      }
      n++;
      if (!near(sch[k].base, want)){
        bad++; fail++;
        console.log(`  **FAIL** ${s} P row ${k+1}: got ${sch[k].base}, want ${want}`);
      }
    }
  }
  console.log(`  ${n - bad}/${n} base-tax values derive exactly${bad ? '  **FAIL**' : '  PASS'}`);
}

/* ================================================================== 3
   An independent oracle: the Excel formulas transcribed literally, with
   their own VLOOKUP/INDEX, against the page's cleaned-up model. Two
   routes to the same number; if they agree everywhere the port is right. */
function oracle(status, C6, C8, C9, C11){
  const RAW = schedules()[status];
  /* P7 = 0; P(n) = P(n-1) + (M(n-1) - L(n-1)) * N(n-1) */
  const P = [null];
  for (let k = 1; k < RAW.length; k++){
    P[k] = k === 1 ? 0 : P[k-1] + (RAW[k-1][1] - RAW[k-1][0]) * RAW[k-1][2];
  }
  /* VLOOKUP(x, range, col, TRUE) — col is 1-based over L,M,N,O,P */
  const VL = (x, col) => {
    let hit = 0;
    for (let k = 0; k < RAW.length; k++) if (RAW[k][0] <= x) hit = k; else break;
    return col === 5 ? P[hit] : RAW[hit][col - 1];
  };
  /* INDEX(range, row, 2) — 1-based row over the ten rows, column M */
  const IX = (row) => RAW[row - 1][1];

  const D6 = C6;
  const E6 = VL(D6, 3);
  const H6 = VL(D6, 5) + (D6 - VL(D6, 1)) * VL(D6, 3);
  const J6 = H6;

  const D8 = C6 + C8, E8 = VL(D8, 3), F8 = 0.25, G8 = Math.min(E8, F8);
  const H8 = VL(D8, 5) + (D8 - VL(D8, 1)) * VL(D8, 3) - H6;
  const I8 = C8 * F8, J8 = E8 < F8 ? H8 : I8;

  const D9 = D8 + C9, E9 = VL(D9, 3), F9 = 0.28, G9 = Math.min(E9, F9);
  const H9 = VL(D9, 5) + (D9 - VL(D9, 1)) * VL(D9, 3) - (H6 + H8);
  const I9 = C9 * F9, J9 = E9 < F9 ? H9 : I9;

  const D11 = D9;
  const C12 = Math.min(C11, Math.max(IX(3) - D11, 0));
  const D12 = D9 + C12;
  const C13 = Math.min(Math.max(C11 - C12, 0), Math.max(IX(4) - D12, 0));
  const D13 = D12 + C13;
  const C14 = Math.min(Math.max(C11 - C13 - C12, 0), Math.max(IX(8) - D13, 0));
  const D14 = D13 + C14;
  const C15 = Math.max(C11 - C13 - C12 - C14, 0);
  const D15 = D14 + C15;

  const cell = (C, D) => {
    const E = VL(D, 3), Fr = VL(D, 4), G = Math.min(E, Fr);
    const H = C * E, I = C * G;
    return { C, D, E, F: Fr, G, H, I, J: E < Fr ? H : I };
  };
  const p12 = cell(C12, D12), p13 = cell(C13, D13);
  const p14 = cell(C14, D14), p15 = cell(C15, D15);

  return {
    C17: C6 + C8 + C9 + C11,
    H17: H6 + H8 + H9 + p12.H + p13.H + p14.H + p15.H,
    I17: I8 + I9 + p12.I + p13.I + p14.I + p15.I,
    J17: J6 + J8 + J9 + p12.J + p13.J + p14.J + p15.J,
    parts: [
      { C: C6, D: D6, E: E6, H: H6, J: J6 },
      { C: C8, D: D8, E: E8, F: F8, G: G8, H: H8, I: I8, J: J8 },
      { C: C9, D: D9, E: E9, F: F9, G: G9, H: H9, I: I9, J: J9 },
      p12, p13, p14, p15
    ]
  };
}

console.log('\n3. independent transcription of the Excel formulas, swept:');
{
  const ORD  = [0, 10000, 40000, 48350, 48475, 96700, 150000, 220000, 400000, 620000, 900000];
  const G25  = [0, 1, 20000, 35000, 200000];
  const G28  = [0, 5000, 60000];
  const PREF = [0, 1000, 48000, 120000, 500000];
  let n = 0, bad = 0, worst = 0;
  for (const s of STATUSES)
    for (const o of ORD) for (const a of G25) for (const b of G28) for (const p of PREF){
      const mine = model({ status:s, ordinary:o, g25:a, g28:b, pref:p });
      const ref  = oracle(s, o, a, b, p);
      n++;
      for (const key of ['C17','H17','I17','J17']){
        const d = Math.abs(mine[key] - ref[key]);
        if (d > worst) worst = d;
        if (!near(mine[key], ref[key])){
          bad++; fail++;
          if (bad < 6) console.log(`  **FAIL** ${s} ${o}/${a}/${b}/${p} ${key}: ${mine[key]} vs ${ref[key]}`);
        }
      }
      const rows = [mine.r6, mine.r8, mine.r9, mine.r12, mine.r13, mine.r14, mine.r15];
      rows.forEach((row, i) => {
        if (!near(row.J, ref.parts[i].J)){
          bad++; fail++;
          if (bad < 6) console.log(`  **FAIL** ${s} ${o}/${a}/${b}/${p} row${i} J: ${row.J} vs ${ref.parts[i].J}`);
        }
      });
    }
  console.log(`  ${n} scenarios across 4 filing statuses, worst disagreement ${worst.toExponential(2)}` +
              `${bad ? '  **' + bad + ' FAILED**' : '  PASS'}`);
}

/* ================================================================== 4
   Rows 12-15 are IF(E<F, C*E, C*MIN(E,F)). Both branches are C*MIN(E,F),
   so the whole 0/15/20 block collapses to one multiplication. The page
   leans on that; three scenarios are not evidence for it, so sweep.     */
console.log('\n4. the 0/15/20 rows collapse to J = C x MIN(a,b), by exhaustion:');
{
  let n = 0, bad = 0;
  for (const s of STATUSES)
    for (let o = 0; o <= 700000; o += 7000)
      for (const p of [0, 500, 12000, 70000, 260000, 700000]){
        const r = model({ status:s, ordinary:o, g25:0, g28:0, pref:p });
        for (const row of [r.r12, r.r13, r.r14, r.r15]){
          n++;
          if (!near(row.J, row.C * Math.min(row.E, row.F))){
            bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** ${s} ord ${o} pref ${p}: J ${row.J} vs ${row.C * Math.min(row.E, row.F)}`);
          }
        }
      }
  console.log(`  ${n} rows tested${bad ? '  **' + bad + ' FAILED**' : '  PASS'}`);
}

/* ================================================================== 5
   The split is exhaustive and the stack closes: the four portions add
   back to the entered total, and the last accumulated figure is the
   total taxable income. Also that each portion really does stop at its
   own ceiling — a named transition that is a real transition.           */
console.log('\n5. the 0/15/20 split is exhaustive and the stack closes:');
{
  let n = 0, bad = 0;
  for (const s of STATUSES)
    for (let o = 0; o <= 700000; o += 11000)
      for (const p of [0, 1, 9000, 48000, 90000, 300000, 650000])
        for (const a of [0, 30000]){
          const r = model({ status:s, ordinary:o, g25:a, g28:0, pref:p });
          n++;
          const sum = r.r12.C + r.r13.C + r.r14.C + r.r15.C;
          if (!near(sum, r.C11)) { bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** split ${s} ${o}/${p}: ${sum} vs ${r.C11}`); }
          if (!near(r.r15.D, r.C17)) { bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** close ${s} ${o}/${p}: D15 ${r.r15.D} vs C17 ${r.C17}`); }
          /* no portion may overshoot its ceiling */
          if (r.r12.C > 0 && r.r12.D > r.zeroCeil + 1e-9) { bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** 0% portion overshoots ${s}: D12 ${r.r12.D} > ${r.zeroCeil}`); }
          if (r.r13.C > 0 && r.r13.D > r.twelveCeil + 1e-9) { bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** 12% portion overshoots ${s}: D13 ${r.r13.D} > ${r.twelveCeil}`); }
          if (r.r14.C > 0 && r.r14.D > r.fifteenCeil + 1e-9) { bad++; fail++;
            if (bad < 5) console.log(`  **FAIL** 15% portion overshoots ${s}: D14 ${r.r14.D} > ${r.fifteenCeil}`); }
        }
  console.log(`  ${n} stacks tested${bad ? '  **' + bad + ' FAILED**' : '  PASS'}`);
}

/* The transition is real: just under the zero-rate ceiling the gain is
   wholly in the 0% portion; a dollar past it, the next portion opens.   */
console.log('\n   and the zero-rate ceiling is a real transition:');
{
  let bad = 0;
  for (const s of STATUSES){
    const sch = buildSchedule(s);
    const ceil = sch[2].to;
    const below = model({ status:s, ordinary:ceil - 1000, g25:0, g28:0, pref:1000 });
    const over  = model({ status:s, ordinary:ceil - 1000, g25:0, g28:0, pref:1001 });
    if (!(near(below.r12.C, 1000) && near(below.r13.C, 0))){
      bad++; fail++; console.log(`  **FAIL** ${s}: at the ceiling the 0% portion should hold it all`);
    }
    if (!(near(over.r12.C, 1000) && over.r13.C > 0)){
      bad++; fail++; console.log(`  **FAIL** ${s}: one dollar past, the next portion should open`);
    }
    if (!exact(below.J17 + 0, below.J17)) { /* no-op guard */ }
  }
  console.log(`  4 statuses, zero-rate ceiling opens the next portion exactly at the dollar` +
              `${bad ? '  **FAIL**' : '  PASS'}`);
}

/* ================================================================== 6
   The drawn geometry. Every value the chart plots has to come off the
   same model the readouts do, or the line drifts away from the numbers
   at some input nobody tried.                                           */
console.log('\n6. the drawn polylines agree with the model:');
{
  /* the rate the applied polyline shows at a given dollar */
  function drawnRateAt(segs, x){
    for (const seg of segs){
      const s = seg.slice;
      if (!(s.to > s.from) || x < s.from || x > s.to) continue;
      const pts = seg.pts;
      for (let k = 0; k < pts.length - 1; k++){
        if (x >= pts[k].x && x <= pts[k+1].x && pts[k].y === pts[k+1].y) return pts[k].y;
      }
      return pts.length ? pts[pts.length - 1].y : null;
    }
    return null;
  }
  function areaUnder(segs){
    let a = 0;
    for (const seg of segs)
      for (let k = 0; k < seg.pts.length - 1; k++)
        if (seg.pts[k].y === seg.pts[k+1].y)
          a += (seg.pts[k+1].x - seg.pts[k].x) * seg.pts[k].y;
    return a;
  }

  let bad = 0, n = 0, worstArea = 0;
  const CASES = [];
  for (const s of STATUSES)
    for (const o of [0, 30000, 48000, 120000, 220000, 560000])
      for (const a of [0, 35000]) for (const p of [0, 40000, 200000])
        CASES.push({ status:s, ordinary:o, g25:a, g28:0, pref:p });

  for (const c of CASES){
    const r = model(c);
    const segs = appliedPoints(r);
    const slices = slicesOf(r);

    /* every polyline is contiguous and covers exactly its slice */
    for (const seg of segs){
      if (!seg.pts.length) continue;
      n++;
      if (!near(seg.pts[0].x, seg.slice.from) ||
          !near(seg.pts[seg.pts.length - 1].x, seg.slice.to)){
        bad++; fail++;
        if (bad < 5) console.log(`  **FAIL** ${c.status} slice ${seg.slice.key} spans ` +
          `${seg.pts[0].x}..${seg.pts[seg.pts.length-1].x}, want ${seg.slice.from}..${seg.slice.to}`);
      }
      for (let k = 0; k < seg.pts.length - 1; k++){
        if (seg.pts[k+1].x < seg.pts[k].x - 1e-9){
          bad++; fail++;
          if (bad < 5) console.log(`  **FAIL** ${c.status} slice ${seg.slice.key} runs backwards`);
        }
      }
    }

    /* the rate drawn mid-slice is the rate the model charges there */
    for (const s of slices){
      if (!(s.to > s.from)) continue;
      const mid = (s.from + s.to) / 2;
      const drawn = drawnRateAt(segs, mid);
      const want = s.mode === 'flat' ? s.rate : rowFor(r.sch, mid).ord;
      n++;
      if (drawn === null || !exact(drawn, want)){
        bad++; fail++;
        if (bad < 5) console.log(`  **FAIL** ${c.status} ${s.key} at ${mid}: drawn ${drawn}, model ${want}`);
      }
    }

    /* the area under the applied curve IS the tax, to within the
       base-tax accumulation gap the page footnotes */
    const d = Math.abs(areaUnder(segs) - r.J17);
    if (d > worstArea) worstArea = d;
    if (d > 2.5){
      bad++; fail++;
      if (bad < 5) console.log(`  **FAIL** ${c.status} area ${areaUnder(segs).toFixed(2)} vs J17 ${r.J17.toFixed(2)}`);
    }

    /* the counterfactual spans the whole stack */
    const op = ordinaryPoints(r);
    if (r.C17 > 0){
      n++;
      if (!near(op[0].x, 0) || !near(op[op.length - 1].x, r.C17)){
        bad++; fail++;
        if (bad < 5) console.log(`  **FAIL** ${c.status} ordinary reference spans ${op[0].x}..${op[op.length-1].x}`);
      }
    }

    /* merged bands: non-overlapping, in order, and the preferential band
       covers exactly the four portions */
    const bands = bandsOf(r);
    for (let k = 1; k < bands.length; k++){
      n++;
      if (bands[k].from < bands[k-1].to - 1e-9){
        bad++; fail++;
        if (bad < 5) console.log(`  **FAIL** ${c.status} bands overlap at ${bands[k].from}`);
      }
    }
    const pb = bands.filter(b => b.cls === 'pref');
    if (r.C11 > 0 && r.r15.D > r.D11){
      n++;
      if (pb.length !== 1 || !near(pb[0].from, r.D11) || !near(pb[0].to, r.r15.D)){
        bad++; fail++;
        if (bad < 5) console.log(`  **FAIL** ${c.status} preferential band not merged to one span`);
      }
    }
  }
  console.log(`  ${CASES.length} scenarios, ${n} geometry assertions, ` +
              `worst area-vs-tax gap $${worstArea.toFixed(2)}` +
              `${bad ? '  **' + bad + ' FAILED**' : '  PASS'}`);
}

/* ================================================================== 7
   Rev. Proc. 2024-40 (TY2025). Section 2.01 gives the ordinary rate
   tables, section 2.03 the maximum zero rate and maximum 15-percent rate
   amounts. The brackets and thresholds must match exactly; the running
   base tax must NOT, because the tab accumulates (to - from) across
   brackets that start at the previous to + 1. The page states that gap,
   so the harness pins it.                                              */
console.log('\n7. Rev. Proc. 2024-40, the published 2025 figures:');
{
  /* [floor, ceiling, rate, base tax at the floor] */
  const IRS = {
    Single: [[0,11925,0.10,0],[11925,48475,0.12,1192.50],[48475,103350,0.22,5578.50],
             [103350,197300,0.24,17651],[197300,250525,0.32,40199],
             [250525,626350,0.35,57231],[626350,Infinity,0.37,188769.75]],
    MFJ:    [[0,23850,0.10,0],[23850,96950,0.12,2385],[96950,206700,0.22,11157],
             [206700,394600,0.24,35302],[394600,501050,0.32,80398],
             [501050,751600,0.35,114462],[751600,Infinity,0.37,202154.50]],
    HH:     [[0,17000,0.10,0],[17000,64850,0.12,1700],[64850,103350,0.22,7442],
             [103350,197300,0.24,15912],[197300,250500,0.32,38460],
             [250500,626350,0.35,55484],[626350,Infinity,0.37,187031.50]],
    MFS:    [[0,11925,0.10,0],[11925,48475,0.12,1192.50],[48475,103350,0.22,5578.50],
             [103350,197300,0.24,17651],[197300,250525,0.32,40199],
             [250525,375800,0.35,57231],[375800,Infinity,0.37,101077.25]]
  };
  /* section 2.03 — maximum zero rate amount, maximum 15-percent rate amount */
  const CG = { Single:[48350,533400], MFJ:[96700,600050], HH:[64750,566700], MFS:[48350,300000] };

  const irsTax = (st, x) => {
    const t = IRS[st];
    for (let k = t.length - 1; k >= 0; k--) if (x > t[k][0] || k === 0) return t[k][3] + (x - t[k][0]) * t[k][2];
    return 0;
  };

  let bad = 0;
  for (const st of STATUSES){
    const sch = buildSchedule(st);
    /* every ordinary-rate change in the tab must sit on an IRS boundary,
       and the capital-gain ceilings must match section 2.03 exactly */
    const edges = IRS[st].map(b => b[0]).filter(v => v > 0);
    for (const e of edges){
      /* the tab starts the bracket above an edge at edge + 1 */
      const row = rowFor(sch, e + 1);
      if (!exact(row.ord, IRS[st].find(b => b[0] === e)[2])){
        bad++; fail++;
        console.log(`  **FAIL** ${st}: rate just above ${e} is ${row.ord}, Rev. Proc. says ${IRS[st].find(b => b[0] === e)[2]}`);
      }
    }
    if (!exact(sch[2].to, CG[st][0])){
      bad++; fail++; console.log(`  **FAIL** ${st} maximum zero rate amount: ${sch[2].to} vs ${CG[st][0]}`);
    }
    if (!exact(sch[7].to, CG[st][1])){
      bad++; fail++; console.log(`  **FAIL** ${st} maximum 15% rate amount: ${sch[7].to} vs ${CG[st][1]}`);
    }
  }
  console.log(`  brackets and both capital-gain ceilings match exactly for all 4 statuses` +
              `${bad ? '  **FAIL**' : '  PASS'}`);

  /* the documented drift */
  let worst = 0, worstAt = null, signBad = 0;
  for (const st of STATUSES)
    for (let x = 0; x <= 900000; x += 250){
      const d = irsTax(st, x) - ordTaxAt(buildSchedule(st), x);
      if (d < -1e-9) signBad++;
      if (d > worst) { worst = d; worstAt = `${st} at $${x}`; }
    }
  /* The gap is one dollar of width per bracket crossing, at that bracket's
     rate, so it is a staircase of its own: 0, 12c, 24c, 46c, 70c, $1.02,
     $1.37, $1.72, $2.09. The page states $2.09 as the ceiling; pin it. */
  if (signBad){ fail++; console.log(`  **FAIL** the tab exceeds the published tax at ${signBad} points`); }
  if (worst > 2.09 + 1e-6){ fail++; console.log(`  **FAIL** drift ${worst.toFixed(2)} exceeds the stated $2.09 bound`); }
  console.log(`  tab is never above the published tax; worst shortfall $${worst.toFixed(2)} (${worstAt})` +
              `${worst <= 2.09 + 1e-6 && !signBad ? '  PASS' : '  **FAIL**'}`);
}

console.log(fail ? `\n${fail} FAILED` : '\nall checks pass');
process.exit(fail ? 1 : 0);
