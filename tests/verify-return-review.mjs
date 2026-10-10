// verify-return-review.mjs <path to review/1040/index.html>
//
// The 1040 preview is a tree from Form 1040 down through its schedules to the documents that feed them. It has
//   - a built-in sample, Learner 2025 (ACCTG 410 Tax Project #2), built from replica source documents; and
//   - an option to analyze a redacted PDF of the user's own return, read in the browser by the "reader"
//     (rdAnalyze / rdBuildReturn / rdCrossChecks) and drawn with the same tree.
// This checks both, from the shipped HTML:
//   the sample's amounts, tie-outs, tree shape and pop-up items;
//   the reader, on synthetic pages laid out like an IRS form: lines recognised by label (2024 and 2025 numbering),
//     blanks, wrapped labels, inner-column values, negatives, identifiers, cross-checks and an injected mismatch;
//   the privacy design: pinned digests, no other network call, no storage, nothing posted.
// The reader was also run against a real 2024 return with the real pdf.js and read every line it covers; that
// return is a course solution and is not committed, so it is not part of this harness.
import fs from 'fs';
import path from 'path';

const file = process.argv[2];
if (!file) { console.error('usage: node tests/verify-return-review.mjs review/1040/index.html'); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('function returnDocsTp2');
const b = src.indexOf('function formatMoney');
if (a < 0 || b < 0) { console.error('model functions not found in ' + file); process.exit(2); }
const code = src.slice(a, b);
const api = new Function(code + `; return { model: returnModel, pages: returnPages, children: returnChildren, popup: returnPopupItems,
  caseList: returnCaseList, rdNum, rdRows, rdAnalyze, rdBuildReturn, rdCrossChecks, rdIdentifiers, RD_LINES, RD_GRAPH, RD_EQUAL };`)();
const model = api.model, T = api;

let fail = 0, n = 0;
function ok(cond, name, got, want) {
  n++;
  if (!cond) fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}      ${name.padEnd(70)} ${cond ? '' : `got ${JSON.stringify(got)}  expected ${JSON.stringify(want)}`}`);
}
const dir = path.dirname(file);

/* ======================================================================== 1. the sample */
console.log('\n=== The sample: Learner, 2025 (Tax Project #2) ===');
const want = { s1_3: 62000, s1_5: 0, s1_10: 62000, s1_15: 4380, s1_26: 4380, s2_4: 8760, s2_21: 8760,
  l1z: 102000, l8: 62000, l9: 164000, l10: 4380, l11a: 159620, l12e: 31500, l13a: 11524, l15: 116596,
  l16: 15479, l19: 2200, l22: 13279, l23: 8760, l24: 22039, l25d: 22600, l33: 22600, l34: 561, l35a: 561, f8812_14: 2200 };
const S = model('tp2');
const amt = k => S.byId[k].amt;
console.log('amounts against the return:');
for (const [k, v] of Object.entries(want)) ok(S.byId[k] && amt(k) === v, `line ${k}`, S.byId[k] && amt(k), v);
ok(S.rows.length === Object.keys(want).length, 'no line is unchecked', S.rows.length, Object.keys(want).length);
console.log('the chain closes:');
for (const [name, pass] of [
  ['AGI = wages + Schedule 1 income - adjustments', amt('l11a') === amt('l1z') + amt('s1_10') - amt('s1_26')],
  ['taxable income = AGI - standard deduction - QBI', amt('l15') === amt('l11a') - amt('l12e') - amt('l13a')],
  ['total tax = tax - credit + other taxes', amt('l24') === amt('l16') - amt('l19') + amt('s2_21')],
  ['refund = withholding - total tax', amt('l35a') === amt('l25d') - amt('l24')],
  ['deductible half is half of the SE tax', amt('s1_26') === amt('s1_15') && amt('s1_15') * 2 === amt('s2_4')]]) ok(pass, name, 0, 0);
console.log('sources and documents:');
for (const r of S.rows) {
  if (!r.parts) { ok(typeof r.why === 'string' && r.why.length > 20, `line ${r.id} (no parts) says why`, r.why, 'a reason'); continue; }
  const sum = r.parts.reduce((t, p) => t + p.sign * (p.row ? amt(p.row) : p.amt), 0);
  ok(sum === r.amt, `line ${r.id} sources tie`, sum, r.amt);
}
for (const d of S.docs) {
  ok(S.rows.some(r => r.allDocs.includes(d.id)), `document ${d.id} reaches a line`, 0, '>=1');
  ok(fs.existsSync(path.join(dir, d.img)), `image ${d.img} exists`, 'missing', 'present');
}
for (const r of S.rows.filter(r => r.img)) ok(fs.existsSync(path.join(dir, r.img)), `form image ${r.img} exists`, 'missing', 'present');
ok(S.byId.l1z.allDocs.includes('wl') && S.byId.l1z.allDocs.includes('wm'), 'wages are fed by both W-2s', 0, 0);
console.log('the tree (1040 page -> 1040 line -> schedule -> source document):');
const pages = T.pages('tp2');
const placed = pages.flatMap(p => p.rows);
const f1040 = S.rows.filter(r => r.form === '1040').map(r => r.id);
ok(placed.length === new Set(placed).size && f1040.every(k => placed.includes(k)) && placed.every(k => f1040.includes(k)),
  'pages 1 and 2 hold every Form 1040 line exactly once', placed.length, f1040.length);
let nested1040 = 0; const docsSeen = new Set(), schedUnder = new Set();
const walk = rid => { for (const k of T.children(S, rid)) {
  if (k.kind === 'doc') docsSeen.add(k.id);
  else { if (S.byId[k.id].form === '1040') nested1040++; else schedUnder.add(k.id); walk(k.id); } } };
placed.forEach(walk);
ok(nested1040 === 0, 'no Form 1040 line nests under another', nested1040, 0);
ok(S.rows.filter(r => r.form !== '1040').every(r => schedUnder.has(r.id)), 'every schedule line sits under a Form 1040 line', 0, 0);
ok(S.docs.every(d => docsSeen.has(d.id)), 'every source document appears as a leaf in the tree', [...docsSeen].length, S.docs.length);
console.log('the pop-up (what a click shows):');
{
  const w2 = T.popup(S, 'row', 'l1z');
  ok(w2.filter(i => i.role === 'Source document').length === 2 && w2.filter(i => i.role === 'Supporting document').length === 2,
    'wages: two W-2s as sources, the stock award and 83(b) election as supporting', w2.map(i => i.role), '2 + 2');
  ok(w2.find(i => i.title.includes('Mark')).amt === 65000, 'the pop-up carries the amount read from the document', 0, 65000);
  ok(w2.map(i => i.short).every((x, i, all) => all.indexOf(x) === i), 'tabs are labelled distinctly', w2.map(i => i.short), 'unique');
  const lf = T.popup(S, 'doc', 'wl', { ref: 'Box 1', amt: 37000 });
  ok(lf.length === 1 && lf[0].amt === 37000 && lf[0].role === 'Source document', 'a document leaf opens its own document', 0, 0);
  ok(T.popup(S, 'page', 'p1').length === 0, 'a page node opens nothing', 0, 0);
  const f8812 = T.popup(S, 'row', 'f8812_14');
  ok(f8812.length === 1 && f8812[0].role === 'Schedule form', 'Schedule 8812 line 14 opens the form replica', f8812.length, 1);
  const bad = [];
  for (const r of S.rows) for (const it of T.popup(S, 'row', r.id))
    if (!it.title || !it.role || !it.ref || !fs.existsSync(path.join(dir, it.img))) bad.push(r.id);
  ok(bad.length === 0, 'every pop-up item has a title, a role, a reference and an image that exists', bad, 'none');
}
console.log('filing status and dependents (the header):');
{
  const CL = T.caseList();
  const f = CL.tp2.filing;
  ok(/married filing jointly/i.test(f.status), 'filing status is shown', f.status, 'Married filing jointly');
  ok(f.filers.length === 2 && f.filers.every(p => p.name && /\d/.test(p.name)), 'both spouses are named with their ages', f.filers.length, 2);
  ok(f.dependents.length === 1 && f.dependents[0].name && f.dependents[0].note, 'the dependent is described', f.dependents.length, 1);
  ok(amt('l19') === f.dependents.length * 2200, 'the child tax credit equals one qualifying child', amt('l19'), 2200);
}
{
  const tall = [];
  for (const d of S.docs) { const h = fs.readFileSync(path.join(dir, d.img)).readUInt32BE(20); if (h > 1500 || h < 300) tall.push(d.id + ' ' + h); }
  ok(tall.length === 0, 'every sample image is between 300 and 1500 px tall (the W-2s are about 1470)', tall, 'none');
}

/* ======================================================================== 2. the reader, on synthetic pages */
console.log('\n=== The reader ===');
const clone = o => JSON.parse(JSON.stringify(o));
/* a page laid out like an IRS form: a left line number, a label, dot leaders, the printed box, and the amount to its right */
function pageOf(nPage, rows, extra = [], y0 = 450) {
  const items = clone(extra);
  let y = y0;
  for (const r of rows) {
    y += 14;
    const yy = r.y !== undefined ? r.y : y;
    if (r.left) items.push({ s: r.left, x: 42, y: yy, w: 8 });
    items.push({ s: r.label, x: 65, y: yy, w: 200 });
    for (let x = 300; x <= 460; x += 12) items.push({ s: '.', x, y: yy, w: 3 });
    const by = r.boxDy ? yy + r.boxDy : yy;
    if (r.box) items.push({ s: r.box, x: r.boxX || 489, y: by, w: 10 });
    if (r.val !== undefined && r.val !== null) items.push({ s: String(r.val), x: r.valX || 541, y: by, w: 40 });
  }
  return { n: nPage, width: 612, height: 792, items };
}
const t = (s, x, y) => ({ s, x, y, w: 50 });
function fixture(over = {}) {
  const v = Object.assign({ wages: 102000, sch1income: 62000, totalincome: 164000, adjustments: 4380, agi: 159620, deduction: 31500, qbi: 11524,
    totaldeductions: 43024, taxable: 116596, tax: 15479, ctc: 2200, credits: 2200, taxafter: 13279, othertaxes: 8760, totaltax: 22039,
    withholding: 22600, payments: 22600, overpaid: 561, refund: 561, s1add: 62000, s1adj: 4380, s2total: 8760, s2se: 8760, schcnet: 62000,
    sehalf: 4380, setax: 8760, f8995: 11524, f8812: 2200 }, over);
  const p1 = pageOf(1, [
    { left: 'z', label: 'Add lines 1a through 1h', box: '1z', val: v.wages },
    { left: '7', label: 'Capital gain or (loss). Attach Schedule D if required. If not required, check here', box: '7' },
    { left: '8', label: 'Additional income from Schedule 1, line 10', box: '8', val: v.sch1income },
    { left: '9', label: 'Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7, and 8. This is your total income', box: '9', val: v.totalincome },
    { left: '10', label: 'Adjustments to income from Schedule 1, line 26', box: '10', val: v.adjustments },
    { left: '11a', label: 'Subtract line 10 from line 9. This is your adjusted gross income', box: '11a', val: v.agi },
    { left: '12e', label: 'Standard deduction or itemized deductions (from Schedule A)', box: '12e', val: v.deduction },
    { left: '13a', label: 'Qualified business income deduction from Form 8995 or Form 8995-A', box: '13a', val: v.qbi },
    { left: '14', label: 'Add lines 12e, 13a, and 13b', box: '14', val: v.totaldeductions },
    { left: '15', label: 'Subtract line 14 from line 11. If zero or less, enter -0-. This is your taxable income', box: '15', val: v.taxable }
  ], [t('Form 1040 U.S. Individual Income Tax Return 2025', 98, 54), t('Filing Status', 36, 208), t('x', 103, 219), t('Married filing jointly (even if only one had income)', 115, 219),
      t('Single', 115, 208), t('Income', 36, 436), t('Child tax credit', 433, 374), t('Credit for other dependents', 499, 374), t('X', 454, 387)]);
  const p2 = pageOf(2, [
    { left: '16', label: 'Tax (see instructions). Check if any from Form(s): 1 8814 2 4972 3', box: '16', val: v.tax },
    { left: '19', label: 'Child tax credit or credit for other dependents from Schedule 8812', box: '19', val: v.ctc },
    { left: '21', label: 'Add lines 19 and 20', box: '21', val: v.credits },
    { left: '22', label: 'Subtract line 21 from line 18. If zero or less, enter -0-', box: '22', val: v.taxafter },
    { left: '23', label: 'Other taxes, including self-employment tax, from Schedule 2, line 21', box: '23', val: v.othertaxes },
    { left: '24', label: 'Add lines 22 and 23. This is your total tax', box: '24', val: v.totaltax },
    { left: '25d', label: 'Add lines 25a through 25c', box: '25d', val: v.withholding },
    { left: '33', label: 'Add lines 25d, 26, and 32. These are your total payments', box: '33', val: v.payments },
    { left: '34', label: 'If line 33 is more than line 24, subtract line 24 from line 33. This is the amount you overpaid', box: '34', val: v.overpaid },
    { left: '35a', label: 'Amount of line 34 you want refunded to you.', box: '35a', val: v.refund },
    { left: '37', label: 'Subtract line 33 from line 24. This is the amount you owe.', box: '37' }
  ], [t('Form 1040 (2025)', 36, 30), t('Page', 552, 30), t('2', 570, 30), t('Refund', 36, 300), t('Sign Here', 36, 600)], 100);
  const s1 = pageOf(3, [
    { left: '3', label: 'Business income or (loss). Attach Schedule C', box: '3', val: v.schcnet },
    { left: '10', label: 'Combine lines 1 through 7 and 9. This is your additional income. Enter here and on Form 1040, 1040-SR, or 1040-NR, line 8', box: '10', val: v.s1add, boxDy: 11 }
  ], [t('SCHEDULE 1 (Form 1040) Additional Income and Adjustments to Income', 36, 44)], 100);
  const s1b = pageOf(4, [
    { left: '15', label: 'Deductible part of self-employment tax. Attach Schedule SE', box: '15', val: v.sehalf },
    { left: '26', label: 'Add lines 11 through 23 and 25. These are your adjustments to income. Enter here and on Form 1040, 1040-SR, or 1040-NR, line 10', box: '26', val: v.s1adj, boxDy: 11 }
  ], [t('Schedule 1 (Form 1040) 2025', 36, 44), t('Page', 552, 44), t('2', 570, 44), t('Part II Adjustments to Income', 36, 70)], 100);
  const s2 = pageOf(5, [
    { left: '4', label: 'Self-employment tax. Attach Schedule SE', box: '4', val: v.s2se },
    { left: '21', label: 'Add lines 4, 7 through 16, 18, and 19. These are your total other taxes. Enter here and on Form 1040, line 23', box: '21', val: v.s2total, boxDy: 11 }
  ], [t('SCHEDULE 2 (Form 1040) Additional Taxes', 36, 44)], 100);
  const sc = pageOf(6, [
    { left: '31', label: 'Net profit or (loss). Subtract line 30 from line 29.', box: '31', val: v.schcnet, boxDy: 22 }
  ], [t('SCHEDULE C (Form 1040) Profit or Loss From Business (Sole Proprietorship)', 36, 44)], 100);
  const se = pageOf(7, [
    { left: '2', label: 'Net profit or (loss) from Schedule C, line 31, and Schedule K-1', box: '2', val: v.schcnet },
    { left: '12', label: 'Self-employment tax. Add lines 10 and 11. Enter here and on Schedule 2 (Form 1040), line 4', box: '12', val: v.setax },
    { left: '13', label: 'Deduction for one-half of self-employment tax.', box: '13', boxX: 395, boxDy: 24, val: v.sehalf, valX: 458 }
  ], [t('SCHEDULE SE (Form 1040) Self-Employment Tax', 36, 44)], 100);
  const f95 = pageOf(8, [
    { left: '15', label: 'Qualified business income deduction. Enter the smaller of line 10 or line 14. Also enter this amount on the applicable line of your return', box: '15', val: v.f8995 }
  ], [t('Form 8995 Qualified Business Income Deduction Simplified Computation', 36, 44)], 100);
  const f88 = pageOf(9, [
    { left: '14', label: 'Enter the smaller of line 12 or line 13. This is your child tax credit and credit for other dependents', box: '14', val: v.f8812 }
  ], [t('SCHEDULE 8812 (Form 1040) Credits for Qualifying Children and Other Dependents', 36, 44)], 100);
  const odd = { n: 10, width: 612, height: 792, items: [t('Wisconsin Department of Revenue', 36, 44), t('Schedule WD Capital Gains and Losses', 36, 60)] };
  return [p1, p2, s1, s1b, s2, sc, se, f95, f88, odd];
}

{
  const info = T.rdAnalyze(clone(fixture()));
  const cls = Object.fromEntries(info.pages.map(p => [p.n, p.form]));
  ok(JSON.stringify(Object.values(cls)) === JSON.stringify(['f1040p1', 'f1040p2', 'sch1', 'sch1', 'sch2', 'schC', 'schSE', 'f8995', 'f8812', null]),
    'every page is classified, and a state form is never taken for a federal one', Object.values(cls), 'f1040p1, f1040p2, sch1, sch1, sch2, schC, schSE, f8995, f8812, null');
  const L = (fk, k) => info.forms[fk].lines[k];
  ok(info.year === 2025, 'the tax year is read from the running head', info.year, 2025);
  ok(L('f1040p1', 'agi').amt === 159620 && L('f1040p1', 'agi').ln === '11a', '2025 numbering: AGI is line 11a', L('f1040p1', 'agi'), { ln: '11a', amt: 159620 });
  ok(L('f1040p1', 'deduction').ln === '12e' && L('f1040p1', 'qbi').ln === '13a', '2025 numbering: the deduction is 12e and the QBI deduction 13a', 0, 0);
  ok(L('f1040p1', 'capgain').amt === null, 'a blank line is read as blank, not as zero', L('f1040p1', 'capgain'), null);
  ok(L('f1040p1', 'wages').amt === 102000 && L('f1040p1', 'wages').ln === '1z', 'a sub-line (1z) is read by its label and its box', L('f1040p1', 'wages'), 102000);
  ok(L('sch1', 'additional').amt === 62000, 'a wrapped label: the amount is on the box row one line down', L('sch1', 'additional'), 62000);
  ok(L('sch1', 'adjtotal').amt === 4380 && L('sch1', 'setax').amt === 4380, 'schedule 1 part II is read from its second page', 0, 0);
  ok(L('schC', 'net').amt === 62000, 'a label far above its box (Schedule C line 31)', L('schC', 'net'), 62000);
  ok(L('schSE', 'half').amt === 4380 && L('schSE', 'half').ln === '13', 'a value in the inner column, two rows below its label (SE line 13)', L('schSE', 'half'), 4380);
  ok(L('f1040p2', 'owed').amt === null && L('f1040p2', 'refund').amt === 561, 'refund read, amount owed blank', 0, 0);
  ok(info.filing === 'married filing jointly', 'filing status is read from the marked box', info.filing, 'married filing jointly');
  ok(info.deps && info.deps.ctc === 1 && info.deps.other === 0, 'dependents are counted from the marked boxes', info.deps, { ctc: 1, other: 0 });
  ok(info.ids.total === 0, 'a redacted return carries no identifier-like values', info.ids, 0);
}

console.log('sub-lines and missing boxes:');
{
  /* Form 4797 line 18b: a lone letter at the margin, the box "18b" one row down; and a label whose own box is missing */
  const p = pageOf(1, [
    { left: '18', label: 'For all except individual returns, enter the amount from line 17 on the appropriate line of your return and skip lines' },
    { left: 'b', label: 'Redetermine the gain or (loss) on line 17 excluding the loss, if any, on line 18a. Enter here and on Schedule 1', box: '18b', boxDy: 9, val: 16000 },
    { left: '9', label: 'Subtract line 8 from line 7. If zero or less, enter -0-. If line 9 is zero, enter the gain', val: 179000, boxDy: 12 },
    { left: '10', label: 'Combine lines 10 through 16', box: '10', val: 555 }
  ], [t('Form 4797 Sales of Business Property', 36, 44)], 100);
  const info = T.rdAnalyze(clone([p]));
  const f = info.forms.f4797 && info.forms.f4797.lines;
  ok(f && f.toSch1 && f.toSch1.amt === 16000 && f.toSch1.ln === '18b', 'a lone-letter sub-line (the "b" of 18b) finds its box', f && f.toSch1, { ln: '18b', amt: 16000 });
  ok(f && f.ltcg && f.ltcg.amt === null, 'a label with no box of its own is blank, never a neighbouring line\'s amount', f && f.ltcg, null);
}

console.log('numbers and identifiers:');
{
  const R = T.rdNum;
  ok(R('229000') === 229000 && R('1,234') === 1234 && R('$1,234.50') === 1234.5, 'plain, comma and dollar amounts', 0, 0);
  ok(R('(5,000)') === -5000 && R('-5000') === -5000 && R('5000)') === -5000, 'negatives in parentheses or with a minus', 0, 0);
  ok(R('-0-') === 0 && R('abc') === null && R('11a') === null && R('') === null, '"-0-" is zero; words and line numbers are not amounts', 0, 0);
  const I = T.rdIdentifiers;
  ok(I('SSN 123-45-6789').ssn === 1 && I('EIN 12-3456789').ein === 1 && I('acct 987654321').nineDigit === 1, 'SSN, EIN and nine-digit numbers are found', 0, 0);
  ok(I('XXX-XX-6789 and 307545 and 1,234,567 and 229000.00').total === 0, 'masked identifiers and ordinary amounts are not flagged', I('XXX-XX-6789 and 307545 and 1,234,567'), 0);
  ok(I('routing 123456789012').account === 1, 'a long account-style number is found', 0, 0);
}

console.log('building the return and cross-checking it:');
{
  const info = T.rdAnalyze(clone(fixture()));
  const def = T.rdBuildReturn(info);
  const checks = def.checks;
  ok(checks.length >= 12 && checks.every(c => c.status !== 'diff'), 'a consistent return: every check ties', checks.filter(c => c.status === 'diff').map(c => c.name), 'none');
  ok(checks.some(c => /Form 1040 line 8 equals Sch\. 1 line 10/.test(c.name)) && checks.some(c => /line 11a is total income less adjustments/.test(c.name)),
    'the checks are named by the lines the form printed', checks.map(c => c.name).slice(0, 3), '...');
  const M = model('upload', def);
  const ids = def.rows.map(r => r.id);
  ok(def.pages.map(p => p.id).join() === 'p1,p2,other', 'two Form 1040 pages and the pages that were not read', def.pages.map(p => p.id), 'p1,p2,other');
  const p1rows = def.pages[0].rows;
  ok(p1rows.includes('r_f1040p1_sch1income') && !p1rows.includes('r_f1040p1_capgain'), 'a blank line with nothing under it is left out of the tree', p1rows, '...');
  const kids = T.children(M, 'r_f1040p1_sch1income').map(k => k.id);
  ok(kids.includes('r_sch1_additional'), 'Schedule 1 line 10 sits under Form 1040 line 8', kids, 'r_sch1_additional');
  const deep = T.children(M, 'r_sch1_additional').map(k => k.id);
  ok(deep.includes('r_sch1_business') && T.children(M, 'r_sch1_business').map(k => k.id).includes('r_schC_net'), 'Schedule C line 31 sits under Schedule 1 line 3', deep, '...');
  const nested = []; (function walk(id, depth) { for (const k of T.children(M, id)) { if (M.byId[k.id].form === '1040') nested.push(k.id); if (depth < 8) walk(k.id, depth + 1); } })('r_f1040p1_sch1income', 0);
  ok(nested.length === 0, 'no Form 1040 line nests under another', nested, 'none');
  const it = T.popup(M, 'row', 'r_f1040p1_agi');
  ok(it.length === 1 && it[0].role === 'Your return' && it[0].img === 'pdf:1' && it[0].amt === 159620, 'a line opens its own page of the uploaded PDF', it, 'pdf:1');
  const other = def.pages.find(p => p.id === 'other').docs;
  ok(other.includes('pg10') && def.docs.find(d => d.id === 'pg10').note === 'Page of your PDF', 'an unrecognised page is listed so it can still be looked at', other, 'pg10');
  ok(T.popup(M, 'doc', 'pg10', { read: true })[0].role === 'Your return', 'an unread page opens as a page of the return', 0, 0);
  ok(M.rows.every(r => !r.parts && !r.given), 'uploaded rows hold what was read, not computed parts', 0, 0);
  ok(M.byId.r_f1040p1_agi.amt === 159620 && M.byId.r_f1040p1_capgain === undefined, 'amounts come straight from the page', 0, 0);
}
{
  const bad = T.rdAnalyze(clone(fixture({ s1add: 63000 })));
  const def = T.rdBuildReturn(bad);
  const diffs = def.checks.filter(c => c.status === 'diff');
  ok(diffs.length === 1 && /line 8 equals Sch\. 1 line 10/.test(diffs[0].name) && diffs[0].a === 62000 && diffs[0].b === 63000,
    'an injected mismatch (Schedule 1 says 63,000) is the only difference found', diffs.map(d => d.name + ' ' + d.a + '/' + d.b), 'one');
  const flagged = def.rows.filter(r => r.flags).map(r => r.id).sort();
  ok(flagged.join() === 'r_f1040p1_sch1income,r_sch1_additional', 'both lines of the mismatch are flagged in the tree', flagged, 'two rows');
  const bad2 = T.rdBuildReturn(T.rdAnalyze(clone(fixture({ agi: 160000 }))));
  ok(bad2.checks.some(c => c.status === 'diff' && /total income less adjustments/.test(c.name)), 'wrong arithmetic on Form 1040 is found', 0, 0);
  const tol = T.rdBuildReturn(T.rdAnalyze(clone(fixture({ agi: 159621 }))));
  ok(!tol.checks.some(c => c.status === 'diff' && /total income less adjustments/.test(c.name)), 'a $1 rounding difference is tolerated', 0, 0);
}
{
  const missing = T.rdBuildReturn(T.rdAnalyze(clone(fixture().filter(p => p.n !== 3 && p.n !== 4))));
  ok(!missing.checks.some(c => /Sch\. 1/.test(c.name)), 'a missing schedule is not compared (and not called a difference)', 0, 0);
  const twice = fixture(); twice.push(Object.assign(clone(twice[5]), { n: 11 }));
  const dup = T.rdBuildReturn(T.rdAnalyze(clone(twice)));
  ok(dup.checks.some(c => c.status === 'skip' && /more than one/.test(c.note)), 'two Schedule Cs: the single-line comparison is skipped, with a reason', 0, 0);
  const none = T.rdBuildReturn(T.rdAnalyze([{ n: 1, width: 612, height: 792, items: [t('Nothing to see here', 50, 50)] }]));
  ok(none.rows.length === 0, 'a PDF with no Form 1040 yields no rows (the page says so)', none.rows.length, 0);
}

/* ======================================================================== 3. the page and its privacy design */
console.log('\n=== The page ===');
const sha = { sri: 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e', worker: 'sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2' };
ok(src.includes(sha.sri) && src.includes(sha.worker), 'pdf.js and its worker are pinned to their digests', 0, 0);
ok(src.includes('cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js') && src.includes('3.11.174/pdf.worker.min.js'), 'both come from the one pinned version', 0, 0);
ok(/sc\.integrity = PDFJS\.sri/.test(src) && /crypto\.subtle\.digest\('SHA-384'/.test(src) && /workerDigest/.test(src), 'the script is loaded with integrity and the worker is hashed before use', 0, 0);
ok((src.match(/\bfetch\(/g) || []).length === 1, 'the only fetch() is the pinned worker', (src.match(/\bfetch\(/g) || []).length, 1);
ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no other way to send data off the page', 0, 0);
ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|caches\./.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'nothing is stored: no local or session storage, IndexedDB, cookies or cache', 0, 0);
ok(!/<form[\s>]/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')) && !/action\s*=/.test(src), 'no form can post anything', 0, 0);
ok(/MAX_BYTES = 25 \* 1024 \* 1024/.test(src) && /'%PDF-'/.test(src), 'a file size limit and a PDF signature check', 0, 0);
ok(/info\.ids\.total > 0/.test(src) && /id="upFictional"/.test(src) && /id="upContinue"/.test(src), 'a return with identifier-like values is stopped until it is confirmed fictional', 0, 0);
ok(/URL\.revokeObjectURL/.test(src) && /pdf\.destroy\(\)/.test(src) && /id="clearUpload"/.test(src), 'a user can remove their return, which frees the pages', 0, 0);
ok(/id="fileIn"[^>]*accept="application\/pdf/.test(src), 'the file input accepts PDFs', 0, 0);
ok(!/LearnerThree|Project #3|tp3/.test(src), 'the course solution return is not on the page', 'found', 'absent');
ok(!/excel|workbook|toolbox|\.xlsx/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no reference to a spreadsheet', 'found', 'none');
ok(/<a class="skip-link"/.test(src) && /aria-label="Primary"/.test(src), 'keeps the skip link and the primary nav', 0, 0);
ok(/id="case-tp2"/.test(src) && /id="case-upload"[^>]*hidden/.test(src), 'the sample is offered, and the uploaded return only once there is one', 0, 0);
ok(/popupMode:false/.test(src) && /function viewer\(spec, items\)/.test(src) && !/id="popToggle" checked/.test(src),
  'documents unfold in place by default; the pop-up is the opt-in alternative', 0, 0);
ok(/<dialog class="docdlg" id="docDlg"/.test(src) && /id="popToggle"/.test(src), 'the dialog and the pop-up switch are on the page', 0, 0);
ok(/id="filing"/.test(src) && !/id="trace"|id="stats"|renderTrace|renderStats/.test(src), 'the filing block is there; the trace panel and summary figures are gone', 0, 0);

console.log(`\n${fail ? fail + ' of ' + n + ' checks FAILED' : 'All checks passed (' + n + ').'}`);
process.exit(fail ? 1 : 0);
