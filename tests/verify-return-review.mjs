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
const names = ['fieldSpec','sampleFigures','blankFigures','parseAmount','formatMoney',
               'extractFigures','summarize','deriveFindings',
               /* the subtotal flow map */
               'flowYears','flowInputs','flowBlank','flowSample','flowCompute','flowHasFigures',
               'flowAdopt','flowChecks','flowAssumptions','flowPlanning',
               'returnColumns','returnKindLabels','returnNodes','returnEdges',
               'returnGraph','returnLayout','returnEdgePath','returnLineage','returnDetail',
               'returnMapDescription','findingNode'];
const code = names.map(extract).join('\n');
const { fieldSpec, sampleFigures, blankFigures, parseAmount, formatMoney,
        extractFigures, summarize, deriveFindings,
        flowYears, flowInputs, flowBlank, flowSample, flowCompute, flowHasFigures,
        flowAdopt, flowChecks, flowAssumptions, flowPlanning,
        returnColumns, returnKindLabels, returnNodes, returnEdges,
        returnGraph, returnLayout, returnEdgePath, returnLineage, returnDetail,
        returnMapDescription, findingNode } =
  new Function(code + '; return {' + names.join(',') + '};')();

let fail = 0;
const ok = (cond, label, got, want) => {
  if (!cond) fail++;
  console.log('  ' + (cond ? 'PASS' : '**FAIL**').padEnd(10) + label.padEnd(44) +
    (want === undefined ? '' : String(got) + '  expected ' + String(want)));
};

/* ---------------------------------------------------------------------------
   The authority for the sample is re-derived here, independently of the page.
   2024 single-filer rate schedule, Rev. Proc. 2023-34.
   --------------------------------------------------------------------------- */
const BRACKETS_2024_SINGLE = [
  [0,       0.10],
  [11600,   0.12],
  [47150,   0.22],
  [100525,  0.24],
  [191950,  0.32],
  [243725,  0.35],
  [609350,  0.37]
];
const STD_DEDUCTION_2024_SINGLE = 14600;

function scheduleTax(taxable){
  let tax = 0;
  for (let i = 0; i < BRACKETS_2024_SINGLE.length; i++){
    const [floor, rate] = BRACKETS_2024_SINGLE[i];
    if (taxable <= floor) break;
    const ceil = i + 1 < BRACKETS_2024_SINGLE.length ? BRACKETS_2024_SINGLE[i + 1][0] : Infinity;
    tax += (Math.min(taxable, ceil) - floor) * rate;
  }
  return tax;
}

/* ---- 1. the sample is a real, internally consistent 2024 return ---------- */
console.log('The sample return, re-derived from the 2024 rate schedule:');
const sample = sampleFigures();
const n = k => parseAmount(sample[k]);

ok(n('wages') + n('interest') === n('agi'),
   'wages + interest = AGI (line 11)', n('wages') + n('interest'), n('agi'));
ok(n('agi') - n('deduction') === n('taxable'),
   'AGI - deduction = taxable (line 15)', n('agi') - n('deduction'), n('taxable'));
ok(n('withholding') + n('credits') - n('tax') === n('refund'),
   'payments - tax = refund (line 35a)', n('withholding') + n('credits') - n('tax'), n('refund'));
ok(n('deduction') === STD_DEDUCTION_2024_SINGLE,
   'deduction = 2024 single standard', n('deduction'), STD_DEDUCTION_2024_SINGLE);
ok(n('tax') === Math.round(scheduleTax(n('taxable'))),
   'tax = schedule on taxable income', n('tax'), Math.round(scheduleTax(n('taxable'))));
ok(n('refund') > 0, 'the sample refunds (drives finding 01)', n('refund'), '> 0');

/* ---- 2. the summary agrees with the figures it was built from ------------ */
console.log('\nsummarize() against the sample:');
const s = summarize(sample);
ok(s.payments === n('withholding') + n('credits'), 'payments = withholding + credits', s.payments, 13040);
ok(s.settlement === n('refund'), 'settlement = the refund on the return', s.settlement, n('refund'));
ok(s.owed === 0, 'nothing owed', s.owed, 0);
ok(Math.abs(s.effectiveRate - n('tax') / n('agi')) < 1e-12,
   'effective rate = tax / AGI', s.effectiveRate.toFixed(6), (n('tax') / n('agi')).toFixed(6));
ok(s.effectiveRate < 0.22, 'effective rate below the top bracket reached',
   (s.effectiveRate * 100).toFixed(1) + '%', '< 22%');
ok(s.hasFigures === true, 'hasFigures true when amounts are present', s.hasFigures, true);

/* ---- 3. the bars are shares of AGI and never overflow -------------------- */
console.log('\nBar geometry:');
ok(s.bars.length === 3, 'three bars', s.bars.length, 3);
ok(Math.abs(s.bars[0].pct - 100) < 1e-9, 'AGI bar is the full width', s.bars[0].pct, 100);
ok(Math.abs(s.bars[1].pct - n('taxable') / n('agi') * 100) < 1e-9,
   'taxable bar = taxable / AGI', s.bars[1].pct.toFixed(4), (n('taxable') / n('agi') * 100).toFixed(4));
ok(Math.abs(s.bars[2].pct - s.effectiveRate * 100) < 1e-9,
   'tax bar = the effective rate', s.bars[2].pct.toFixed(4), (s.effectiveRate * 100).toFixed(4));
ok(s.bars[0].pct >= s.bars[1].pct && s.bars[1].pct >= s.bars[2].pct,
   'bars narrow monotonically', '100 >= ' + s.bars[1].pct.toFixed(1) + ' >= ' + s.bars[2].pct.toFixed(1), 'true');

/* ---- 4. blank figures produce no NaN and no false claims ----------------- */
console.log('\nThe empty state:');
const blank = summarize(blankFigures());
ok(blank.hasFigures === false, 'hasFigures false when nothing is entered', blank.hasFigures, false);
ok(blank.effectiveRate === null, 'no effective rate without an AGI', blank.effectiveRate, null);
ok(blank.bars.every(b => b.pct === 0), 'every bar collapses to zero width', 'all 0', 'all 0');
ok(Object.values(blank).every(v => typeof v !== 'number' || isFinite(v)),
   'no NaN or Infinity anywhere in the summary', 'finite', 'finite');
ok(parseAmount('') === 0 && parseAmount(null) === 0 && parseAmount('abc') === 0,
   'parseAmount copes with empty and junk', '0/0/0', '0/0/0');
ok(parseAmount('86,760') === 86760 && parseAmount('$86,760.00') === 86760,
   'parseAmount strips separators and signs', parseAmount('$86,760.00'), 86760);
ok(formatMoney(86760) === '$86,760' && formatMoney(0) === '$0' && formatMoney(-1) === '-$1',
   'formatMoney rounds and signs', formatMoney(-1), '-$1');

/* ---- 5. extraction, against text laid out like the real form ------------- */
/*  Built from the 2024 Form 1040's own line labels. Lines 2a/2b and the
    distractor rows are there on purpose: 1b and 1g both say "wages", and
    "Add lines 19 and 20" holds two bare numbers that must not read as money. */
const RETURN_TEXT = [
  'Form 1040 (2024) U.S. Individual Income Tax Return',
  'For the year Jan. 1-Dec. 31, 2024',
  '1a Total amount from Form(s) W-2, box 1 1a 86,420',
  '1b Household employee wages not reported on Form(s) W-2 1b',
  '1g Wages from Form 8919, line 6 1g',
  '1z Add lines 1a through 1h 1z 86,420',
  '2a Tax-exempt interest 2a 1,200 b Taxable interest 2b $340',
  '9 Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7, and 8. This is your total income 9 86,760',
  '10 Adjustments to income from Schedule 1, line 26 10 0',
  '11 Subtract line 10 from line 9. This is your adjusted gross income 11 86,760',
  '12 Standard deduction or itemized deductions (from Schedule A) 12 14,600',
  '13 Qualified business income deduction from Form 8995 or Form 8995-A 13 0',
  '14 Add lines 12 and 13 14 14,600',
  '15 Subtract line 14 from line 11. If zero or less, enter -0-. This is your taxable income 15 72,160',
  '19 Child tax credit or credit for other dependents from Schedule 8812 19 0',
  '20 Amount from Schedule 3, line 8 20 0',
  '21 Add lines 19 and 20 21 0',
  '24 Add lines 22 and 23. This is your total tax 24 10,928',
  '25a Form(s) W-2 25a 13,040',
  '25d Add lines 25a through 25c 25d 13,040',
  '33 Add lines 25d, 26, and 32. These are your total payments 33 13,040',
  '34 If line 33 is more than line 24, subtract line 24 from line 33. This is the amount you overpaid 34 2,112',
  '35a Amount of line 34 you want refunded to you 35a 2,112'
].join('\n');

console.log('\nextractFigures() over a 2024 Form 1040 text dump:');
const got = extractFigures(RETURN_TEXT);
for (const field of fieldSpec()){
  const want = parseAmount(sample[field.key]);
  const mine = parseAmount(got[field.key]);
  ok(field.key in got && mine === want,
     'line ' + field.line + ' → ' + field.key, field.key in got ? mine : 'not found', want);
}
ok(Object.keys(got).length === 9, 'all nine lines found', Object.keys(got).length, 9);

console.log('\nExtraction traps:');
ok(parseAmount(got.wages) !== 1200 && parseAmount(got.interest) === 340,
   '2b beats 2a on their shared printed row', parseAmount(got.interest), 340);
ok(parseAmount(got.credits) === 0,
   '"Add lines 19 and 20" does not read 19 or 20 as money', parseAmount(got.credits), 0);
ok(parseAmount(got.wages) === 86420,
   'line 1z beats the "wages" wording on 1b and 1g', parseAmount(got.wages), 86420);
ok(Object.keys(extractFigures('')).length === 0, 'empty text finds nothing', 0, 0);
ok(Object.keys(extractFigures('nothing here at all')).length === 0, 'junk text finds nothing', 0, 0);
ok(Object.keys(extractFigures(null)).length === 0, 'null does not throw', 0, 0);

/* ---- 6. the findings say the right thing across the whole space ---------- */
console.log('\nderiveFindings() across a sweep of tax against payments:');
let swept = 0, badCount = 0, badVerdict = 0, badSource = 0, emptyText = 0;
for (let tax = 0; tax <= 20000; tax += 250)
  for (let withholding = 0; withholding <= 20000; withholding += 250)
    for (const credits of [0, 500]){
      const sum = summarize({ agi:'80000', taxable:'65000', deduction:'14600',
                              tax:String(tax), withholding:String(withholding),
                              credits:String(credits), wages:'80000', interest:'0',
                              refund:String(Math.max(0, withholding + credits - tax)) });
      const f = deriveFindings(sum);
      swept++;

      if (f.length !== 3) badCount++;

      // finding 01 must name the direction the money actually goes
      const settlement = withholding + credits - tax;
      const title = f[0].title;
      const right = settlement > 0 ? 'You overpaid during the year'
                  : settlement < 0 ? 'You underpaid during the year'
                  : 'Your payments matched your tax';
      if (title !== right) badVerdict++;

      // every finding always cites a line, and never renders an empty string
      for (const one of f){
        if (!/\d/.test(one.source)) badSource++;
        if (!one.title.trim() || !one.description.trim() || !one.context.trim()) emptyText++;
      }
    }
ok(badCount === 0, 'always exactly three findings', badCount + ' bad', '0 bad');
ok(badVerdict === 0, 'finding 01 names the right direction', badVerdict + ' wrong', '0 wrong');
ok(badSource === 0, 'every finding cites a line number', badSource + ' missing', '0 missing');
ok(emptyText === 0, 'no finding renders empty text', emptyText + ' empty', '0 empty');
console.log('  swept ' + swept.toLocaleString('en-US') + ' combinations');

/* ---- 7. a balance-due return flips every readout that should flip -------- */
console.log('\nA return that owes rather than refunds:');
const due = summarize({ agi:'86760', taxable:'72160', deduction:'14600', tax:'14000',
                        withholding:'11000', credits:'0', wages:'86420', interest:'340', refund:'0' });
ok(due.owed === 3000, 'balance due = tax - payments', due.owed, 3000);
ok(due.settlement === -3000, 'settlement goes negative', due.settlement, -3000);
ok(deriveFindings(due)[0].title === 'You underpaid during the year',
   'finding 01 switches to underpaid', deriveFindings(due)[0].title, 'You underpaid during the year');
ok(due.bars[2].pct > s.bars[2].pct, 'the tax bar grows with the tax',
   due.bars[2].pct.toFixed(1), '> ' + s.bars[2].pct.toFixed(1));

/* ---- 8. the line map on the page matches the extractor ------------------- */
console.log('\nThe page agrees with itself:');
const spec = fieldSpec();
ok(spec.length === 9, 'nine fields', spec.length, 9);
const lines = spec.map(f => f.line);
ok(new Set(lines).size === 9, 'no duplicated line reference', new Set(lines).size, 9);
for (const f of spec){
  const shown = src.includes('<td>' + f.line + '</td>');
  ok(shown, 'line ' + f.line + ' documented in the source panel', shown, true);
}

/* ---- 9. the subtotal flow map ---------------------------------------------
   The map is the reviewer view's; what sits in the boxes is the skeleton of
   the "Income Tax Summary" sheet of the ACCTG 410 workbook — its fourteen
   major subtotals, and none of its detail rows. That file lives outside the
   repository, so this harness cannot diff against it: the row numbers and the
   reference letters below are transcribed, which is what makes a drift show up
   in a diff rather than in someone's memory.
   ------------------------------------------------------------------------- */

/* Block-scoped: the eight sections above already own `sample`, `blank` and `n`
   at module scope. */
{

console.log('\nThe map carries the sheet’s subtotals:');

/* Transcribed from the sheet: the row each box came from, and its letter. */
const SHEET = [
  ['grossIncome',    8,  null],
  ['forAgi',        18,  null],
  ['agi',           22,  'a'],
  ['fromAgi',       23,  'b'],
  ['taxable',       30,  'a-b'],
  ['tentative1',    32,  'c'],
  ['otherTaxD',     35,  'd'],
  ['nonrefundable', 39,  'e'],
  ['tentative2',    44,  'c+d-e'],
  ['otherTaxF',     45,  'f'],
  ['totalTax',      49,  'c+d-e+f'],
  ['refundable',    50,  null],
  ['prepayments',   54,  null],
  ['dueOrRefund',   59,  null]
];

const G = returnGraph(flowSample());
ok(G.nodes.length === 14, 'fourteen boxes, not fifty-two rows', G.nodes.length, 14);

let badRow = 0, badRef = 0;
for (const [id, xl, letter] of SHEET){
  const nd = G.byId[id];
  if (!nd || nd.xl !== xl) badRow++;
  else if (letter && nd.ref.indexOf(letter) < 0) badRef++;
  else if (!letter && nd.ref !== 'Row ' + xl) badRef++;
}
ok(badRow === 0, 'every box cites the sheet row it came from', badRow, 0);
ok(badRef === 0, 'and the nine reference letters match column A', badRef, 0);

const extra = G.nodes.filter(nd => !SHEET.some(r => r[0] === nd.id));
ok(extra.length === 0, 'and nothing was added that is not on the sheet',
   extra.map(x => x.id).join(',') || 0, 0);

/* The sheet's own scenario, reduced to its subtotals. */
const S = flowCompute(flowSample());
const WANT = { agi:106000, taxable:81000, tentative2:12627, totalTax:12627, dueOrRefund:2627 };
for (const k of Object.keys(WANT)) ok(S[k] === WANT[k], 'row ' + G.byId[k].xl + ' — ' + k, S[k], WANT[k]);

console.log('\nStructure:');
ok(G.edges.length === 13, 'thirteen edges', G.edges.length, 13);
ok(returnColumns().length === 7, 'seven columns', returnColumns().length, 7);
ok(flowInputs().length === 9, 'nine boxes with nothing upstream', flowInputs().length, 9);

/* "Nothing upstream" means no ARITHMETIC upstream. `tentative1` has the op-0
   basis edge into it from taxable income and is still a figure you type — the
   edge draws the dependency without claiming to compute it. */
const typed = G.nodes
  .filter(nd => !(G.into[nd.id] || []).some(e => e.op !== 0))
  .map(nd => nd.id).sort();
ok(typed.join(',') === flowInputs().slice().sort().join(','),
   'and those nine are exactly the ones you type', typed.length, 9);
ok((G.into.tentative1 || []).length === 1,
   'tentative 1 is typed even though an edge reaches it', 1, 1);
ok(G.nodes.filter(nd => nd.kind === 'input').length === 9, 'nine boxes styled as input',
   G.nodes.filter(nd => nd.kind === 'input').length, 9);
ok(G.nodes.filter(nd => nd.kind === 'calc').length === 4, 'four computed',
   G.nodes.filter(nd => nd.kind === 'calc').length, 4);
ok(G.nodes.filter(nd => nd.kind === 'result').length === 1, 'one answer',
   G.nodes.filter(nd => nd.kind === 'result').length, 1);

const sinks = G.nodes.filter(nd => !(G.outOf[nd.id] || []).length);
ok(sinks.length === 1 && sinks[0].id === 'dueOrRefund', 'one sink, and it is row 59',
   sinks.map(x => x.id).join(','), 'dueOrRefund');

let notAdjacent = 0, backwards = 0;
for (const e of G.edges){
  const d = G.byId[e.to].col - G.byId[e.from].col;
  if (d !== 1) notAdjacent++;
  if (d < 0) backwards++;
}
ok(notAdjacent === 0, 'every edge joins neighbouring columns', notAdjacent, 0);
ok(backwards === 0, 'so none can run right to left', backwards, 0);

const noNote = G.nodes.filter(nd => !nd.note || nd.note.length < 60);
ok(noNote.length === 0, 'every box explains itself in prose', noNote.length, 0);
ok(Object.keys(returnKindLabels()).length === 3, 'three roles, all labelled',
   Object.keys(returnKindLabels()).length, 3);

/* One edge is deliberately not arithmetic. */
const basis = G.edges.filter(e => e.op === 0);
ok(basis.length === 1 && basis[0].from === 'taxable' && basis[0].to === 'tentative1',
   'taxable income is the base for tax, not a term in it',
   basis.map(e => e.from + '->' + e.to).join(','), 'taxable->tentative1');
ok(G.sums.length === 5, 'so all five computed boxes are asserted as sums', G.sums.length, 5);
ok(G.sums.filter(x => x.floored).length === 2, 'two of them carry the sheet’s MAX(0, …)',
   G.sums.filter(x => x.floored).length, 2);

console.log('\nThe arithmetic, swept:');
/* 4 x 4 x 4 x 4 x 3 x 3 = 2,304 maps. The ranges are chosen to drive both
   floors: deductions past AGI, and credits past the tax they offset. */
let bad = 0, count = 0, hitTaxableFloor = 0, hitTentativeFloor = 0, sawRefund = 0, sawDue = 0;
for (const gross of [0, 86760, 106000, 512000])
for (const fa of [0, 7000, 23000, 60000])
for (const fromA of [0, 14600, 25000, 600000])
for (const t1 of [0, 13127, 48000, 150000])
for (const nonref of [0, 500, 200000])
for (const prepay of [0, 10000, 250000]){
  const v = { grossIncome:String(gross), forAgi:String(fa), fromAgi:String(fromA),
              tentative1:String(t1), otherTaxD:'0', nonrefundable:String(nonref),
              otherTaxF:'0', refundable:'0', prepayments:String(prepay) };
  const c = flowCompute(v);
  const g = returnGraph(v);
  count++;
  if (c.agi !== c.grossIncome - c.forAgi) bad++;
  if (c.taxable !== Math.max(0, c.agi - c.fromAgi)) bad++;
  if (c.taxable < 0) bad++;
  if (c.tentative2 !== Math.max(0, c.tentative1 + c.otherTaxD - c.nonrefundable)) bad++;
  if (c.tentative2 < 0) bad++;
  if (c.totalTax !== c.tentative2 + c.otherTaxF) bad++;
  if (c.dueOrRefund !== c.totalTax - c.refundable - c.prepayments) bad++;
  for (const s of g.sums) if (s.expected !== s.actual) bad++;
  if (c.agi - c.fromAgi < 0) hitTaxableFloor++;
  if (c.tentative1 + c.otherTaxD - c.nonrefundable < 0) hitTentativeFloor++;
  if (c.dueOrRefund < 0) sawRefund++;
  if (c.dueOrRefund > 0) sawDue++;
}
ok(bad === 0, count.toLocaleString('en-US') + ' maps: every box equals what flows in', bad + ' broke', 0);
ok(hitTaxableFloor > 0, 'the sweep pushes deductions past AGI', hitTaxableFloor, '> 0');
ok(hitTentativeFloor > 0, 'and credits past the tax they offset', hitTentativeFloor, '> 0');
ok(sawRefund > 0 && sawDue > 0, 'and produces both refunds and balances due',
   sawRefund + ' / ' + sawDue, 'both > 0');

const empty = flowCompute(flowBlank());
ok(Object.values(empty).every(x => typeof x === 'number' && isFinite(x)),
   'an empty map is all finite zeroes', 'finite', 'finite');
ok(flowHasFigures(flowBlank()) === false, 'and reports itself empty', false, false);
ok(flowHasFigures(flowSample()) === true, 'the sample does not', true, true);

console.log('\nGeometry:');
/* The disclosure levels are gone — the map always shows all seven columns —
   so this is one layout, not a sweep over seven. */
{
  const L = returnLayout(flowSample());
  const pos = Object.fromEntries(L.nodes.map(p => [p.id, p]));
  let overlap = 0, escaped = 0, dangling = 0;
  for (let i = 0; i < L.nodes.length; i++){
    const a = L.nodes[i];
    if (a.x < 0 || a.y < 0 || a.x + L.nodeW > L.width || a.y + L.nodeH > L.height) escaped++;
    for (let j = i + 1; j < L.nodes.length; j++){
      const b = L.nodes[j];
      if (a.x < b.x + L.nodeW && b.x < a.x + L.nodeW &&
          a.y < b.y + L.nodeH && b.y < a.y + L.nodeH) overlap++;
    }
  }
  for (const e of G.edges){
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) dangling++;
    else if (!returnEdgePath(a, b, L.nodeW)) dangling++;
  }
  ok(L.nodes.length === 14, 'all fourteen boxes are placed', L.nodes.length, 14);
  ok(L.cols.length === 7, 'and all seven columns', L.cols.length, 7);
  ok(overlap === 0, 'no two boxes overlap', overlap, 0);
  ok(escaped === 0, 'no box leaves the canvas', escaped, 0);
  ok(dangling === 0, 'every edge joins two placed boxes', dangling, 0);
  ok(returnLayout(flowSample()).cols.map(c => c.count).reduce((a, b) => a + b, 0) === 14,
     'the column counts add up to the box count', 14, 14);
}

console.log('\nTracing:');
const lin = returnLineage(G, 'dueOrRefund');
ok(Object.keys(lin.up).length === 13, 'everything upstream of row 59 is reachable',
   Object.keys(lin.up).length, 13);
ok(Object.keys(returnLineage(G, 'dueOrRefund').down).length === 0, 'and nothing is downstream', 0, 0);
ok(Object.keys(returnLineage(G, 'grossIncome').down).length === 6,
   'gross income reaches the answer through six boxes',
   Object.keys(returnLineage(G, 'grossIncome').down).length, 6);
const det = returnDetail(flowSample(), G, 'tentative2');
ok(det && det.from.length === 3 && det.to.length === 1,
   'tentative 2 shows its three inputs and where it goes',
   det.from.length + ' in / ' + det.to.length + ' out', '3 in / 1 out');
ok(returnDetail(flowSample(), G, 'grossIncome').editable === true,
   'an input box is editable from the panel', true, true);
ok(returnDetail(flowSample(), G, 'agi').editable === false, 'a computed one is not', false, false);
ok(returnDetail(flowSample(), G, 'nope') === null, 'an unknown id yields no detail', null, null);
const desc = returnMapDescription(flowSample(), G, 'agi');
ok(desc.includes('Comes from') && desc.includes('Lands on'),
   'the spoken description traces both ways', true, true);

console.log('\nA filed return is compared, never merged in:');
const figs = sampleFigures();
const adopted = flowAdopt(figs);
ok(flowInputs().every(k => adopted[k] !== undefined),
   'adopting a return fills all nine boxes', true, true);

/* The rearrangement of the sheet's own arithmetic that makes this possible. */
ok(adopted.grossIncome === '86760', 'gross income comes from line 11', adopted.grossIncome, '86760');
ok(adopted.fromAgi === '14600', 'from AGI deductions = line 11 - line 15', adopted.fromAgi, '14600');
ok(adopted.tentative1 === '10928', 'tentative 1 = line 24 + line 21', adopted.tentative1, '10928');
ok(adopted.prepayments === '13040', 'prepayments = line 24 + line 35a', adopted.prepayments, '13040');

const checks = flowChecks(adopted, figs);
ok(checks.length === 8, 'eight figures are compared', checks.length, 8);
const off = checks.filter(c => !c.agrees);
ok(off.length === 0, 'and on this return every one agrees',
   off.map(c => c.key + ' ' + c.delta).join(', ') || 0, 0);
ok(checks.filter(c => c.key === 'dueOrRefund')[0].stated === -2112,
   'a refund on line 35a reads as a negative balance',
   checks.filter(c => c.key === 'dueOrRefund')[0].stated, -2112);
ok(flowChecks(adopted, null).length === 0,
   'with no return loaded there is nothing to compare', 0, 0);

/* Every compared box must exist, or a click in the panel goes nowhere. */
ok(checks.every(c => G.byId[c.key]), 'every comparison names a box that exists', true, true);

/* The Figures tab is gone, so the review notes carry the amount boxes for the
   read lines. Every comparison has to name which lines those are. */
const specKeys = new Set(fieldSpec().map(f => f.key));
ok(checks.every(c => Array.isArray(c.fields) && c.fields.length),
   'every comparison names the read lines behind it', true, true);
ok(checks.every(c => c.fields.every(k => specKeys.has(k))),
   'and each is a real fieldSpec() key', true, true);
const covered = new Set(checks.flatMap(c => c.fields));
ok(covered.size === 9, 'all nine read lines stay correctable', covered.size, 9);
ok(checks.filter(c => c.fields.length === 2).length === 1,
   'gross income is the one comparison standing on two lines',
   checks.filter(c => c.fields.length === 2).length, 1);

/* The four boxes a 1040 cannot fill are assumed zero, and say so. */
const assumed = flowAssumptions();
ok(assumed.length === 4, 'four boxes are assumed zero', assumed.length, 4);
ok(assumed.every(a => G.byId[a.key]), 'each names a real box', true, true);
ok(assumed.every(a => parseAmount(adopted[a.key]) === 0), 'and each is in fact zero after adopting', true, true);
ok(assumed.every(a => a.text && a.text.length > 30), 'each states why', true, true);

const assumedKeys = assumed.map(a => a.key).sort().join(',');
ok(assumedKeys === 'forAgi,otherTaxD,otherTaxF,refundable',
   'and they are the four a 1040 face cannot reach', assumedKeys,
   'forAgi,otherTaxD,otherTaxF,refundable');

console.log('\nPlanning observations:');
/* The planning block reads the map, not the return, so it works with nothing
   loaded. Two of its five come straight off the sheet's MAX(0, …) floors —
   the places an amount stops being worth anything — which is the same thing
   the FLOOR 0 pills mark on the canvas. */
{
  ok(flowPlanning(flowBlank()).length === 0, 'an empty map suggests nothing',
     flowPlanning(flowBlank()).length, 0);

  const base = flowSample();
  const onSample = flowPlanning(base);
  ok(onSample.length > 0, 'the sample raises at least one', onSample.length, '> 0');
  ok(onSample.every(o => o.id && o.title && o.text && o.context),
     'every observation is complete', true, true);
  ok(onSample.every(o => returnGraph(base).byId[o.node]),
     'and each points at a box that exists', true, true);
  ok(onSample.every(o => o.severity === 'hot' || o.severity === 'warm'),
     'each carries a known severity', true, true);

  /* deductions past AGI -> row 30's floor bites */
  const overDed = Object.assign({}, base, { fromAgi: '9999999' });
  const od = flowPlanning(overDed).filter(o => o.id === 'deductions-lost');
  ok(od.length === 1, 'deductions past AGI are named', od.length, 1);
  ok(flowCompute(overDed).taxable === 0, 'and taxable income floors at zero',
     flowCompute(overDed).taxable, 0);

  /* credits past the liability -> row 44's floor bites */
  const overCr = Object.assign({}, base, { nonrefundable: '9999999' });
  const oc = flowPlanning(overCr).filter(o => o.id === 'credits-lost');
  ok(oc.length === 1, 'credits past the liability are named', oc.length, 1);
  ok(flowCompute(overCr).tentative2 === 0, 'and tentative 2 floors at zero',
     flowCompute(overCr).tentative2, 0);
  ok(oc[0].node === 'nonrefundable', 'pointing at row 39', oc[0].node, 'nonrefundable');

  /* self-employment tax sits outside that floor */
  const seTax = Object.assign({}, base, { otherTaxF: '9000' });
  ok(flowPlanning(seTax).some(o => o.id === 'outside-floor'),
     'taxes outside the floor are named when credits exist', true, true);
  ok(!flowPlanning(Object.assign({}, seTax, { nonrefundable: '0' }))
        .some(o => o.id === 'outside-floor'),
     'and not when there are no credits to strand', true, true);

  /* the settlement, both ways */
  ok(flowPlanning(base).some(o => o.id === 'underpaid'),
     'a balance due is named', true, true);
  const refund = Object.assign({}, base, { prepayments: '90000' });
  ok(flowPlanning(refund).some(o => o.id === 'overpaid'), 'so is an overpayment', true, true);
  ok(!flowPlanning(refund).some(o => o.id === 'underpaid'),
     'and never both at once', true, true);

  const noCred = Object.assign({}, base, { nonrefundable: '0', refundable: '0' });
  ok(flowPlanning(noCred).some(o => o.id === 'no-credits'),
     'an empty credit row is named', true, true);
  ok(!flowPlanning(base).some(o => o.id === 'no-credits'),
     'but not when a credit is present', true, true);

  /* Nothing here may assert eligibility — the whole page turns on that. */
  const all = [].concat(onSample, flowPlanning(overDed), flowPlanning(overCr),
                        flowPlanning(seTax), flowPlanning(refund), flowPlanning(noCred));
  const claims = all.filter(o => /you qualify|you are eligible|you should claim/i.test(o.text + ' ' + o.context));
  ok(claims.length === 0, 'none of them asserts eligibility for anything', claims.length, 0);
  const ids = all.map(o => o.id);
  ok(new Set(ids).size <= 6, 'six rules at most', new Set(ids).size, '<= 6');
}

console.log('\nThe year switch:');
const years = flowYears();
ok(years.length === 2, 'two years', years.length, 2);
ok(years.filter(y => y.year === 2024)[0].extract === true, '2024 can read a return', true, true);
ok(years.filter(y => y.year === 2025)[0].extract === false,
   '2025 cannot — the form was renumbered', false, false);

}

console.log('\n' + (fail ? '**' + fail + ' FAILED**' : 'All checks passed.'));
process.exit(fail ? 1 : 0);
