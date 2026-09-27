import fs from 'fs';

/* ===========================================================================
   review/flow-map/index.html

   The flow map has no worksheet behind it, so there are no workbook check
   figures to reproduce. What it has instead is a claim: that the sample
   return is internally exact — every box equals what the boxes feeding it
   contribute, and the two limitations are the amounts the governing rules
   actually produce.

   So this harness re-derives the whole return from the rules, independently
   of the page, and then asserts four classes of invariant the design rests
   on:

     1. arithmetic  — every node equals what flows into it
     2. graph       — one sink, acyclic, left-to-right, nothing dangling
     3. geometry    — swept over all five disclosure levels: no two boxes
                      overlap, nothing leaves the canvas, every drawn edge
                      joins two placed boxes
     4. agreement   — the detail panel's "comes from" / "lands on" lists are
                      the edge list read both ways, for every node

   Class 3 is the one worth having. "Two boxes overlap at level 2" is exactly
   the bug the tool pattern doc says only shows up when you look at the page,
   and here it is mechanical instead.
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
const names = ['flowNodes','flowEdges','flowFlags','flowIdeas','flowKindLabels',
               'flowColumns','flowLevels','parseAmt','fmtAmt','flowGraph',
               'lineageOf','flowLayout','edgePath','headerStats','detailFor',
               'mapDescription'];
const code = names.map(extract).join('\n');
const { flowNodes, flowEdges, flowFlags, flowIdeas, flowKindLabels,
        flowColumns, flowLevels, parseAmt, fmtAmt, flowGraph,
        lineageOf, flowLayout, edgePath, headerStats, detailFor,
        mapDescription } =
  new Function(code + '; return {' + names.join(',') + '};')();

let fail = 0;
const ok = (cond, label, got, want) => {
  if (!cond) fail++;
  console.log('  ' + (cond ? 'PASS' : '**FAIL**').padEnd(10) + label.padEnd(52) +
    (want === undefined ? '' : String(got) + '  expected ' + String(want)));
};

const G = flowGraph();
const N = id => G.byId[id];
const amt = id => parseAmt(N(id).amt);
const py  = id => parseAmt(N(id).py);
/* a named row out of a node's own calculation table */
const row = (id, k) => {
  const r = N(id).calc.find(x => x[0] === k);
  if (!r) throw new Error('no calc row "' + k + '" on ' + id);
  return parseAmt(r[1]);
};

/* ---------------------------------------------------------------------------
   The rules, written here rather than read off the page. If the page's sample
   ever drifts from what these produce, that is the failure this file exists
   to catch.

   NOTE — the SALT cap. §164(b)(6) capped the deduction at $10,000 through
   2025 as originally enacted; it was amended in 2025 to $40,000 for joint
   filers, phasing down by 30% of modified AGI above $500,000 but not below
   $10,000. This sample's 20,800 is under the cap on the amended figure and
   over it on the original one, so the assertion below is the one number in
   this harness that is a statement about current law rather than arithmetic.
   Re-verify it against the current Form 1040 Schedule A instructions before
   relying on it.
   --------------------------------------------------------------------------- */
const CAPITAL_LOSS_LIMIT_MFJ = 3000;      /* §1211(b) */
const PASSIVE_ALLOWANCE_MAX  = 25000;     /* §469(i)(2) */
const PASSIVE_PHASEOUT_START = 100000;    /* §469(i)(3)(A) */
const QBI_RATE               = 0.20;      /* §199A(a) */
const NIIT_THRESHOLD_MFJ     = 250000;    /* §1411(b)(1) */
const SALT_CAP_MFJ_2025      = 40000;     /* §164(b)(6) as amended — see note */
const STD_DEDUCTION_MFJ_2025 = 31500;     /* printed on Form 1040 (2025) p.2 */

const passiveAllowance = magi =>
  Math.max(0, Math.min(PASSIVE_ALLOWANCE_MAX,
    PASSIVE_ALLOWANCE_MAX - 0.5 * Math.max(0, magi - PASSIVE_PHASEOUT_START)));

const saltCap = magi =>
  Math.max(10000, SALT_CAP_MFJ_2025 - 0.30 * Math.max(0, magi - 500000));

/* ---- 1. the sample return, re-derived --------------------------------- */
console.log('The sample return, re-derived from the governing rules:');

/* income, document to form */
ok(amt('schb') === amt('int') + row('div', '1a Ordinary dividends'),
   'Schedule B = interest + ordinary dividends', amt('schb'), amt('int') + 6300);
ok(amt('f8949') === row('b', 'Short-term, basis reported') + row('b', 'Long-term, basis reported'),
   'Form 8949 = short-term + long-term', amt('f8949'), -14300);
ok(amt('f8949') === amt('b'), 'Form 8949 ties to the 1099-B net', amt('f8949'), amt('b'));

/* the capital loss limitation */
const netCapital = amt('f8949');
const allowedLoss = Math.max(netCapital, -CAPITAL_LOSS_LIMIT_MFJ);
ok(amt('schd') === allowedLoss,
   'Schedule D allowed = max(net, -3,000)', amt('schd'), allowedLoss);
ok(row('schd', 'Carryover → 2026 (long-term)') === netCapital - allowedLoss,
   'carryover = net - allowed', row('schd', 'Carryover → 2026 (long-term)'), netCapital - allowedLoss);
ok(row('schd', 'Net capital loss') === netCapital,
   'Schedule D net ties to Form 8949', row('schd', 'Net capital loss'), netCapital);

/* the passive loss limitation */
const magi = row('f8582', 'Modified AGI');
ok(magi === amt('l11'), 'Form 8582 modified AGI = line 11', magi, amt('l11'));
ok(passiveAllowance(magi) === 0,
   '$25,000 allowance fully phased out at this MAGI', passiveAllowance(magi), 0);
ok(row('f8582', 'Allowed this year') === 0,
   'Form 8582 allows nothing', row('f8582', 'Allowed this year'), 0);
ok(row('f8582', 'Suspended → 2026') === amt('k1r'),
   'the whole K-1 loss is suspended', row('f8582', 'Suspended → 2026'), amt('k1r'));
ok(row('f8582', 'Rental real estate loss') === amt('k1r'),
   'Form 8582 loss ties to the K-1', row('f8582', 'Rental real estate loss'), amt('k1r'));

/* the QBI deduction — §199A(a) and the (b)(3) income limitation */
const qbi = row('f8995', 'QBI — Harbor Consulting');
const tentative = QBI_RATE * qbi;
const netCapGain = row('l3b', 'Line 3a qualified dividends') + Math.max(0, amt('l7'));
const tiBeforeQbi = amt('l11') - amt('l12');
const incomeLimit = QBI_RATE * (tiBeforeQbi - netCapGain);
ok(qbi === amt('k1h'), 'QBI ties to the K-1 ordinary income', qbi, amt('k1h'));
ok(row('f8995', '× 20%') === tentative, '20% of QBI', row('f8995', '× 20%'), tentative);
ok(row('f8995', 'Income limit (20% of TI less net cap. gain)') === incomeLimit,
   'income limit = 20% x (TI before QBI - net cap gain)',
   row('f8995', 'Income limit (20% of TI less net cap. gain)'), incomeLimit);
ok(amt('f8995') === Math.min(tentative, incomeLimit),
   'deduction = the lesser of the two', amt('f8995'), Math.min(tentative, incomeLimit));

/* deductions */
const saltTotal = row('w2', 'Box 17 state income tax') + amt('ptax');
ok(amt('salt') === saltTotal, 'SALT = state withheld + real estate tax', amt('salt'), saltTotal);
ok(amt('salt') <= saltCap(magi),
   'SALT is under the cap (see the note in this file)', amt('salt'), '<= ' + saltCap(magi));
ok(amt('scha') === amt('salt') + amt('m1098') + amt('char'),
   'Schedule A = SALT + mortgage + gifts', amt('scha'), amt('salt') + amt('m1098') + amt('char'));
/* the page says itemizing wins — the 2025 joint standard deduction is printed
   in the margin of Form 1040 page 2 */
ok(amt('scha') > STD_DEDUCTION_MFJ_2025,
   'itemizing really does beat the 2025 standard deduction', amt('scha'), '> ' + STD_DEDUCTION_MFJ_2025);

/* the K-1 chain */
ok(amt('sche') === amt('k1h') + row('f8582', 'Allowed this year'),
   'Schedule E = nonpassive + allowed passive', amt('sche'), amt('k1h'));
ok(row('sche', 'Riverbend Partners (passive, allowed)') === 0,
   'the suspended loss shows as 0 on Schedule E', row('sche', 'Riverbend Partners (passive, allowed)'), 0);
ok(amt('sch1') === amt('sche'), 'Schedule 1 = Schedule E Part II', amt('sch1'), amt('sche'));

/* the face of the 1040 */
ok(amt('l1a') === row('w2', 'Box 1 wages'), 'line 1a = W-2 box 1', amt('l1a'), row('w2', 'Box 1 wages'));
ok(amt('l2b') === amt('int'), 'line 2b = Schedule B Part I', amt('l2b'), amt('int'));
ok(amt('l3b') === row('div', '1a Ordinary dividends'), 'line 3b = Schedule B Part II', amt('l3b'), 6300);
ok(amt('l7')  === amt('schd'), 'line 7 = the allowed capital loss', amt('l7'), amt('schd'));
ok(amt('l8')  === amt('sch1'), 'line 8 = Schedule 1 line 10', amt('l8'), amt('sch1'));
ok(amt('l12') === amt('scha'), 'line 12 = Schedule A line 17', amt('l12'), amt('scha'));
ok(amt('l13') === amt('f8995'), 'line 13 = Form 8995', amt('l13'), amt('f8995'));

const agiParts = ['l1a','l2b','l3b','l7','l8'];
const agi = agiParts.reduce((t, id) => t + amt(id), 0);
ok(amt('l11') === agi, 'line 11 = the five income lines', amt('l11'), agi);
ok(amt('l15') === amt('l11') - amt('l12') - amt('l13'),
   'line 15 = AGI - itemized - QBI', amt('l15'), amt('l11') - amt('l12') - amt('l13'));

/* every node whose calc table states its own total must agree with it */
console.log('\nEach node against the total stated in its own calculation table:');
[['schb', null], ['scha', 'Line 17 total'], ['salt', 'Total, below cap'],
 ['sche', 'Line 32 total'], ['sch1', 'Line 10 additional income'],
 ['f8995', 'Deduction'], ['l11', 'AGI'], ['l15', 'Taxable income'],
 ['b', 'Net']].forEach(([id, key]) => {
  if (!key) return;
  ok(row(id, key) === amt(id), id + ': "' + key + '" = the node amount', row(id, key), amt(id));
});

/* ---- 2. the prior year holds together the same way --------------------- */
console.log('\nThe 2024 comparison column:');
const pyAgi = agiParts.reduce((t, id) => t + py(id), 0);
ok(py('l11') === pyAgi, '2024 AGI = the five 2024 income lines', py('l11'), pyAgi);
ok(py('l15') === py('l11') - py('l12') - py('l13'),
   '2024 taxable income closes too', py('l15'), py('l11') - py('l12') - py('l13'));
flowNodes().filter(n => n.py !== undefined).forEach(n => {
  const d = detailFor(n.id);
  const dv = parseAmt(n.amt) - parseAmt(n.py);
  const sign = d.delta.charAt(0);
  ok(dv >= 0 ? sign === '+' : sign === '−',
     n.id + ': the delta names the right direction', d.delta, dv >= 0 ? '+' : '−');
  ok(parseAmt(n.py) !== 0 || /· new$/.test(d.delta),
     n.id + ': a 2024 zero is marked new', d.delta, parseAmt(n.py) === 0 ? 'ends "· new"' : 'n/a');
});

/* ---- 3. the flags and ideas cite figures that are really there ---------- */
console.log('\nFlags and ideas against the figures they quote:');
const flagText = id => flowFlags().find(f => f.node === id);
ok(/11,300/.test(flagText('schd').title),
   'the carryover flag quotes the computed carryover', flagText('schd').title, 'contains 11,300');
ok(Math.abs(netCapital - allowedLoss) === 11300,
   'and that figure is the computed one', Math.abs(netCapital - allowedLoss), 11300);
ok(/22,000/.test(flagText('f8582').title),
   'the suspension flag quotes the suspended loss', flagText('f8582').title, 'contains 22,000');
const niitIdea = flowIdeas().find(p => p.title.indexOf('Net investment income tax') === 0);
ok(niitIdea !== undefined, 'the NIIT idea is present', !!niitIdea, true);
const headroom = NIIT_THRESHOLD_MFJ - amt('l11');
ok(niitIdea.title.indexOf(headroom.toLocaleString('en-US')) >= 0,
   'NIIT headroom = threshold - AGI', niitIdea.title, headroom.toLocaleString('en-US'));

/* ---- 3b. the 1040 line numbers are the 2025 form's --------------------- */
/* The 2025 Form 1040 (Cat. No. 11320B, rev. 9/5/2025, retrieved 26 Sep 2026)
   renumbered the second half of page 1 and the top of page 2: AGI moved from
   11 to 11a, the deduction from 12 to 12e, QBI from 13 to 13a and the capital
   gain line from 7 to 7a. The sample is a 2025 return, so it has to use those.
   Pinning them here stops a later edit quietly restoring the 2024 labels. */
console.log('\nLine numbers against the 2025 Form 1040:');
const LINES_2025 = {
  l1a: 'Line 1a · Wages',
  l2b: 'Line 2b · Taxable interest',
  l3b: 'Line 3b · Ordinary dividends',
  l7:  'Line 7a · Capital gain or (loss)',
  l8:  'Line 8 · Additional income',
  l11: 'Line 11a · Adjusted gross income',
  l12: 'Line 12e · Itemized deductions',
  l13: 'Line 13a · QBI deduction',
  l15: 'Line 15 · Taxable income'
};
Object.keys(LINES_2025).forEach(id => {
  ok(N(id).title === LINES_2025[id], id + ' carries its 2025 line number', N(id).title, LINES_2025[id]);
});
const faceIds = flowNodes().filter(n => n.col === 4).map(n => n.id);
ok(faceIds.length === Object.keys(LINES_2025).length,
   'every node on the face of the 1040 is pinned above',
   faceIds.length, Object.keys(LINES_2025).length);
/* AGI and the capital gain line print on page 1, the deduction block on page 2 */
ok(['l1a','l2b','l3b','l7','l8','l11'].every(id => N(id).ref === '1040 p.1'),
   'lines 1a through 11a cite page 1', true, true);
ok(['l12','l13','l15'].every(id => N(id).ref === '1040 p.2'),
   'lines 12e, 13a and 15 cite page 2', true, true);

/* ---- 4. graph integrity ------------------------------------------------ */
console.log('\nGraph integrity:');
const ids = flowNodes().map(n => n.id);
ok(new Set(ids).size === ids.length, 'node ids are unique', new Set(ids).size, ids.length);
ok(flowEdges().every(e => G.byId[e[0]] && G.byId[e[1]]),
   'every edge joins two real nodes', flowEdges().length + ' edges', 'all resolved');
ok(flowEdges().every(e => N(e[0]).col <= N(e[1]).col),
   'no edge runs right to left', true, true);
ok(flowEdges().filter(e => N(e[0]).col === N(e[1]).col).every(e => N(e[0]).col === 4),
   'same-column edges occur only on the face of the 1040', true, true);
ok(ids.every(id => (G.up[id] || []).length + (G.dn[id] || []).length > 0),
   'no node is stranded off the map', true, true);
ok(ids.every(id => flowKindLabels()[N(id).kind] !== undefined),
   'every node kind has a label', true, true);

/* one sink, and it is taxable income */
const sinks = ids.filter(id => !(G.dn[id] || []).length);
ok(sinks.length === 1 && sinks[0] === 'l15',
   'the map has exactly one sink, line 15', sinks.join(','), 'l15');
ok(ids.filter(id => id !== 'l15').every(id => lineageOf(id).down.indexOf('l15') >= 0),
   'every other node reaches taxable income', true, true);

/* acyclic — Kahn's algorithm has to consume every node */
const indeg = {}; ids.forEach(id => { indeg[id] = (G.up[id] || []).length; });
const queue = ids.filter(id => indeg[id] === 0);
let consumed = 0;
for (let q = 0; q < queue.length; q++){
  consumed++;
  (G.dn[queue[q]] || []).forEach(x => { if (--indeg[x] === 0) queue.push(x); });
}
ok(consumed === ids.length, 'the graph is acyclic', consumed, ids.length);
ok(ids.every(id => lineageOf(id).up.indexOf(id) < 0),
   'no node is its own ancestor', true, true);

/* the sidebars point at real nodes */
ok(flowFlags().every(f => G.byId[f.node]), 'every flag cites a real node', true, true);
ok(flowIdeas().every(p => G.byId[p.node]), 'every idea cites a real node', true, true);

/* the header counts are derived, not typed */
const stats = headerStats();
const find = label => stats.find(s => s.label === label).value;
ok(find('AGI') === N('l11').amt, 'header AGI = line 11', find('AGI'), N('l11').amt);
ok(find('Taxable income') === N('l15').amt, 'header taxable = line 15', find('Taxable income'), N('l15').amt);
ok(Number(find('Limitations applied')) === flowNodes().filter(n => n.kind === 'limit').length,
   'header limitation count = the limit nodes', find('Limitations applied'), 2);
ok(Number(find('Review flags')) === flowFlags().length, 'header flag count', find('Review flags'), 5);
ok(Number(find('Planning ideas')) === flowIdeas().length, 'header idea count', find('Planning ideas'), 5);

/* ---- 5. geometry, swept over every disclosure level -------------------- */
console.log('\nLayout geometry, all ' + flowLevels().length + ' disclosure levels:');
const LEGEND_TOP = 792;
let overlaps = 0, outside = 0, drawnWrong = 0, badCols = 0, badEnds = 0, placedTotal = 0;

for (let level = 0; level < flowLevels().length; level++){
  const lay = flowLayout(level);
  const pos = {}; lay.nodes.forEach(p => { pos[p.id] = p; });
  placedTotal += lay.nodes.length;

  const expect = flowNodes().filter(n => n.col >= lay.minCol).map(n => n.id).sort().join(',');
  ok(lay.nodes.map(p => p.id).sort().join(',') === expect,
     'level ' + level + ': shows exactly the columns at or past ' + lay.minCol,
     lay.nodes.length + ' nodes', expect.split(',').length + ' nodes');

  /* no two boxes may share a pixel */
  for (let i = 0; i < lay.nodes.length; i++){
    for (let j = i + 1; j < lay.nodes.length; j++){
      const a = lay.nodes[i], b = lay.nodes[j];
      if (a.x < b.x + lay.nodeW && b.x < a.x + lay.nodeW &&
          a.y < b.y + lay.nodeH && b.y < a.y + lay.nodeH) overlaps++;
    }
  }
  /* nothing leaves the canvas or lands on the legend */
  lay.nodes.forEach(p => {
    if (p.x < 0 || p.x + lay.nodeW > lay.width || p.y < 0 || p.y + lay.nodeH > LEGEND_TOP) outside++;
  });
  /* columns stay in order and never collide */
  for (let c = 1; c < lay.cols.length; c++){
    if (lay.cols[c].x - lay.cols[c - 1].x < lay.nodeW) badCols++;
  }
  /* Reducing the level hides whole columns, so edges crossing the boundary
     have one end left off the canvas — line 2b keeps its amount while the
     Schedule B that produced it is hidden. The page must draw exactly the
     edges with both ends placed, and no others. */
  const bothPlaced = flowEdges().filter(e => pos[e[0]] && pos[e[1]]).length;
  const bothInRange = flowEdges().filter(e =>
    N(e[0]).col >= lay.minCol && N(e[1]).col >= lay.minCol).length;
  if (bothPlaced !== bothInRange) drawnWrong++;

  /* and each one it does draw has to land on the two boxes it joins */
  flowEdges().forEach(e => {
    const a = pos[e[0]], b = pos[e[1]];
    if (!a || !b) return;
    const d = edgePath(a, b, lay.nodeW);
    const m = d.match(/^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) C.* (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)$/);
    if (!m){ badEnds++; return; }
    const startsRight = Number(m[1]) === a.x + lay.nodeW && Number(m[2]) === a.y + lay.nodeH / 2;
    const endsOn = a.col === b.col
      ? Number(m[3]) === b.x + lay.nodeW && Number(m[4]) === b.y + lay.nodeH / 2
      : Number(m[3]) === b.x            && Number(m[4]) === b.y + lay.nodeH / 2;
    if (!startsRight || !endsOn) badEnds++;
  });
}
ok(overlaps === 0, 'no two boxes overlap at any level', overlaps, 0);
ok(outside === 0, 'no box leaves the canvas or hits the legend', outside, 0);
ok(badCols === 0, 'columns stay ordered and clear of each other', badCols, 0);
ok(drawnWrong === 0, 'each level draws exactly its in-range edges', drawnWrong, 0);
ok(badEnds === 0, 'every edge starts and ends on a box edge', badEnds, 0);
ok(placedTotal === 9 + 10 + 13 + 18 + 27,
   'the levels reveal 9, 10, 13, 18 then 27 items', placedTotal, 9 + 10 + 13 + 18 + 27);
ok(flowLayout(4).nodes.length === flowNodes().length,
   'the deepest level shows everything', flowLayout(4).nodes.length, flowNodes().length);
ok(flowLayout(0).nodes.every(p => p.col === 4),
   'the shallowest level is the face of the 1040 alone', true, true);
ok(flowLayout(0).cols.length === 1 &&
   flowLayout(0).nodes[0].x === Math.round((flowLayout(0).width - flowLayout(0).nodeW) / 2),
   'a single column is centred', flowLayout(0).nodes[0].x, Math.round((1040 - 168) / 2));

/* ---- 6. the panel agrees with the edge list, both directions ----------- */
console.log('\nThe detail panel against the graph, every node:');
let fromBad = 0, toBad = 0, calcBad = 0, descBad = 0;
ids.forEach(id => {
  const d = detailFor(id);
  if (d.from.map(c => c.id).join(',') !== (G.up[id] || []).join(',')) fromBad++;
  if (d.to.map(c => c.id).join(',')   !== (G.dn[id] || []).join(',')) toBad++;
  if (!d.calc.length || d.calc.some(r => r.k === undefined || r.v === undefined)) calcBad++;
  for (let level = 0; level < flowLevels().length; level++){
    const desc = mapDescription(id, level);
    if (desc.indexOf(d.title) < 0 || desc.indexOf(d.amt) < 0) descBad++;
  }
});
ok(fromBad === 0, '"comes from" is the edge list read upward', fromBad, 0);
ok(toBad === 0, '"lands on" is the edge list read downward', toBad, 0);
ok(calcBad === 0, 'every node carries a complete calculation table', calcBad, 0);
ok(descBad === 0,
   'the spoken description names the selection at all ' + (ids.length * 5) + ' node/level pairs', descBad, 0);
ok(detailFor('schd').isLimit && detailFor('schd').limitText.length > 0,
   'a limit node carries its limitation sentence', true, true);
ok(!detailFor('l11').isLimit, 'a total does not', false, false);

/* ---- 7. the amount strings parse and format back ----------------------- */
console.log('\nAmount handling:');
ok(parseAmt('(14,300)') === -14300, 'parentheses mean negative', parseAmt('(14,300)'), -14300);
ok(parseAmt('237,540') === 237540, 'thousands separators are stripped', parseAmt('237,540'), 237540);
ok(parseAmt('0 allowed') === 0, 'a qualified zero is zero', parseAmt('0 allowed'), 0);
ok(parseAmt('Phased out') === 0, 'a word is zero', parseAmt('Phased out'), 0);
ok(fmtAmt(-11300) === '(11,300)', 'negatives format in parentheses', fmtAmt(-11300), '(11,300)');
ok(fmtAmt(237540) === '237,540', 'positives format plain', fmtAmt(237540), '237,540');
const roundTrip = flowNodes().filter(n => /^\(?[\d,]+\)?$/.test(n.amt));
ok(roundTrip.every(n => fmtAmt(parseAmt(n.amt)) === n.amt),
   'every numeric amount round-trips', roundTrip.length + ' amounts', 'all');
ok(flowColumns().length === 5 && flowLevels().length === 5,
   'five columns, five levels', flowColumns().length, 5);

console.log('\n' + (fail === 0
  ? 'All checks passed.'
  : fail + ' check(s) failed.'));
process.exit(fail === 0 ? 0 : 1);
