# Return Review — service docs

*The `/review/` pages: a free, browser-only return preview and the three pages that explain it. This documents the preview at `review/1040/index.html` — also the "1040 preview" tab on `/tools/` — and the section around it.*

Adapted from the ClearLedger Tax Review prototype
(`clearledger-tax-review.barrettlian12345.chatgpt.site`, a React/Next single page),
rebuilt as one hand-authored file on the site's own tokens, chrome and conventions.

## The subsite

`/review/` is not in `assets/js/tools-data.js` and does not appear in the
`/tools/` catalog grid. The preview is reachable as a **tab on `/tools/`**,
embedded from its own URL, and as that URL directly.

| Page | State |
|---|---|
| `review/index.html` | Real. Overview of the preview and the three pages below it. |
| `review/1040/index.html` | Real. The preview — the rest of this document. Also the "1040 preview" tab on `/tools/`, embedded via `?embed=1`. |
| `review/flow-map/index.html` | Real. The reviewer view, on a fictional sample return. See "The flow map" below. |
| `review/how-it-works/index.html` | Real. The nine lines, the three questions, the limits. |
| `review/privacy/index.html` | Real. Exact data handling, and how to verify it. |

Review has no primary nav item of its own. Since 27 September 2026 it sits under
the **Tools** tab, because the preview is a tab on that page and the other three
pages explain it; it sat under Dashboard until the Dashboard became the IRS data
report. The URLs under `/review/` were kept rather than moved, so a page here
takes `aria-current="true"` on Tools even though its path does not say so — see
"Two tabs whose folder is named something else" in
`docs/site-architecture.md`. The chrome is hand-duplicated into every page;
`assets/partials/topbar.html` and `footer.html` are the source of truth for that
markup.

### Embedded as a Tools tab

`/tools/` frames this page with `?embed=1`, which the page reads for itself and
turns into `body.embed` — hiding `.topbar`, `.site-footer` and `.skip-link` so
the host page's chrome is not drawn twice. The markup stays in the DOM:
`verify-links.mjs` asserts every page carries the primary nav, and hiding is not
removing. Visited without the query the page is exactly as it was. The framing
itself — lazy mount, auto-height, the `file://` fallback — belongs to the host
and is documented under "Embedded artifacts" in `docs/site-architecture.md`.

### What is deliberately not claimed

There is no paid tier, and the site does not mention one. The offering card, the
"what a reviewed engagement is" placeholder, the register-interest CTA and
`review/request/` were all removed on 27 September 2026 rather than left
standing as a promise — no pricing, turnaround, credential, scope or deliverable
appears anywhere. **If a paid review is ever offered, it starts from nothing on
the site**, which is the right order: a review that touches planning carries
professional-licensing obligations that come first.

## The preview

A flow map of fourteen boxes. The idea:

> The individual income tax formula has a shape: income narrows to taxable
> income, tax is worked out, credits and payments come off. Draw that shape
> once, and every figure on a return has somewhere to sit.

This is the first tool in the suite that is **not** a statute simulation. It does
not model a rule, compute a liability from rate schedules, or determine
eligibility for anything.

### The map is the reviewer view's; the boxes are the workbook's

The layout, the node/edge model and the trace panel are the same as the reviewer
view at `/review/flow-map/`, documented in the second half of this file. What
sits in the boxes is the skeleton of the **Income Tax Summary** sheet of
`Individual taxation excel simulation master - organized.xlsx` (ACCTG 410
Individual Taxation Toolbox) — its **major subtotals only**, with the sheet's own
reference letters and row numbers.

| Sheet row | Ref | Box | Column |
|---|---|---|---|
| 8 | — | Gross income | Income |
| 18 | — | For AGI deductions *(less)* | Income |
| 22 | `a` | Adjusted gross income | AGI |
| 23 | `b` | From AGI deductions *(less)* | AGI |
| 30 | `a-b` | Taxable income | Taxable income |
| 32 | `c` | Income tax liability (tentative 1) | Tax before credits |
| 35 | `d` | Other taxes *(plus)* | Tax before credits |
| 39 | `e` | Nonrefundable credits *(less)* | Tax before credits |
| 44 | `c+d-e` | Income tax liability (tentative 2) | Tentative liability |
| 45 | `f` | Other taxes *(plus)* | Tentative liability |
| 49 | `c+d-e+f` | Total tax | Total tax |
| 50 | — | Refundable credits *(less)* | Total tax |
| 54 | — | Prepayments *(less)* | Total tax |
| 59 | — | Tax due or (refund) | Settlement |

**Fourteen boxes, not fifty-two rows.** The sheet's detail lines — the nine
income components under row 8, the three adjustments under row 18, the
standard-versus-itemised pair under row 24 — are deliberately absent. They are
the spreadsheet's job, and a map that carried them would stop being a map. The
harness asserts that nothing appears on the map that is not one of the fourteen,
so the detail cannot creep back in.

Seven columns, thirteen edges, and **every edge joins neighbouring columns** —
asserted, because an edge that skips a column is the first sign the shape has
drifted.

## The model

Nine boxes have no arithmetic feeding them; those are what you type. Five
compute:

```
agi         = grossIncome − forAgi                          (row 22)
taxable     = MAX(0, agi − fromAgi)                         (row 30)
tentative2  = MAX(0, tentative1 + otherTaxD − nonrefundable) (row 44)
totalTax    = tentative2 + otherTaxF                        (row 49)
dueOrRefund = totalTax − refundable − prepayments           (row 59)
```

The sheet's own scenario, reduced to its subtotals — gross income 106,000, from
AGI deductions 25,000, tentative 1 of 13,127, one 500 credit, 10,000 withheld —
is the page's sample and lands on **2,627 due**, as the sheet does.

**The two `MAX(0, …)` floors are the thing most easily lost in a port**, so the
sweep drives both: of its 2,304 maps, 972 push deductions past AGI and 960 push
credits past the tax they offset.

One edge is deliberately **not** arithmetic:

```
tentative1  ←  taxable      (op 0: "is the base this was computed from")
```

Total tax is not a function of taxable income alone — filing status, the kind of
income, and every credit sit in between. The sheet takes ordinary and
preferential-rate tax as typed inputs pointing at its Comprehensive Tax
Calculation tab, and so does this page: no rate schedule is embedded here and
none needs verifying. `op: 0` draws the dependency without claiming to compute
it, the harness skips it rather than asserting a sum that would be false, and
`tentative1` stays a box you type even though an edge reaches it.

### A filed return is compared, never merged in

Nine read lines do not line up with fourteen subtotals. Six of the nine pin a box
exactly, by rearranging the sheet's own arithmetic:

```
grossIncome   = line 11              (with forAgi assumed zero)
fromAgi       = line 11 − line 15    (because taxable = agi − fromAgi)
nonrefundable = line 21
tentative1    = line 24 + line 21    (with d and f assumed zero)
prepayments   = line 24 + line 35a   (with refundable assumed zero)
agi           = line 11
```

Eight figures are then carried **beside** the boxes that work them out, and any
difference is named. On the sample return all eight agree — which is the check
that the rearrangement above is self-consistent, and the harness asserts it.

**Four boxes have nothing on the face of a 1040 to fill them**, so they are
assumed zero and the assumption is stated on the page rather than hidden:
`forAgi` (the return does not separate line 9 from line 10), `otherTaxD`,
`otherTaxF`, and `refundable` (line 25d is withholding only; refundable credits
sit on line 32, which is not read). The harness asserts there are exactly four,
that each names a real box, that each is in fact zero after adopting, and that
each says why.

### The year switch

Two years, and it drives one thing: whether the PDF reader runs. 2024 works;
2025 is switched off, because the IRS renumbered Form 1040 and the extractor is
written against the 2024 line numbers, so it would mis-read rather than fail. The
page says so instead of trying.

There is no standard-deduction table and no filing-status control, because the
map has no row for either — row 24's standard-versus-itemised comparison is
detail, and the map takes row 23's total. That removes the whole question of
sourcing 2025 deduction figures the workbook does not contain.

### The nine lines

Verified against Form 1040 (2024) as published by the IRS, retrieved 25 September
2026. The page reproduces this table in its source panel.

| Field | Line | Label on the 2024 form |
|---|---|---|
| `wages` | 1z | Add lines 1a through 1h |
| `interest` | 2b | Taxable interest |
| `agi` | 11 | Subtract line 10 from line 9. This is your *adjusted gross income* |
| `deduction` | 12 | Standard deduction or itemized deductions (from Schedule A) |
| `taxable` | 15 | Subtract line 14 from line 11 … This is your *taxable income* |
| `credits` | 21 | Add lines 19 and 20 |
| `tax` | 24 | Add lines 22 and 23. This is your *total tax* |
| `withholding` | 25d | Add lines 25a through 25c |
| `refund` | 35a | Amount of line 34 you want *refunded to you* |

**The prototype's deduction field was wrong and is corrected here.** It labelled the
field "line 14" while its extraction pattern matched the line-12 wording
("standard deduction or itemized"), and the amount it shipped ($14,600) is the 2024
single standard deduction, which is line 12. Line 14 is line 12 plus the QBI
deduction on line 13. This tool uses **line 12** throughout — label, pattern and
finding citation all agree.

### The sample

A complete, internally consistent 2024 single-filer return. Every relationship
closes, and the tax is the 2024 single rate schedule applied exactly:

```
wages 86,420 + interest 340            = AGI 86,760
AGI 86,760 − deduction 14,600          = taxable 72,160
schedule tax on 72,160                 = 10,928   (1,160 + 4,266 + 5,502.20)
withholding 13,040 + credits 0 − 10,928 = refund 2,112
```

The prototype's sample carried $11,170 of tax against $72,160 of taxable income,
which does not correspond to any 2024 rate schedule or table figure. On a site that
verifies its arithmetic, an internally inconsistent sample is a liability, so the
tax and refund were re-derived. `tests/verify-return-review.mjs` recomputes the
whole chain from its own copy of the rate schedule rather than trusting the page.

**One deliberate simplification:** a real return with taxable income under $100,000
uses the IRS Tax Table, which works in $50 bands and can differ from the exact
schedule by a few dollars. The sample quotes the exact schedule figure because that
is the one that can be verified from a published rate table alone. The page does not
claim the sample was filed.

### Extraction

`extractFigures()` scans pasted or PDF-extracted text line by line. Two rules do all
the work, and both were arrived at by watching the naive version fail:

1. **The line-number anchor comes first**, prose second. `/wages/i` alone matches
   lines 1b ("Household employee wages…") and 1g ("Wages from Form 8919") before it
   reaches 1z. The prototype had this bug and would read the wrong box on any real
   return.
2. **An amount must carry a dollar sign, a comma group, four digits, or be exactly
   zero.** Without the guard, "Add lines 19 and 20" yields two amounts. The bare-zero
   exception exists because most lines of a real return are zero and no line on Form
   1040 is numbered 0; it is suppressed next to a hyphen so the instruction "enter
   -0-" printed on line 15 stays out.

Where two boxes share a printed row — 2a tax-exempt interest sits beside 2b taxable
interest — the row collapses to one line of text holding both amounts. Taking the
**last** amount on the line picks the right-hand box, which is the one the pattern is
named for. That behaviour is inherited from the prototype and is correct.

### Verification

Twenty-nine functions are extracted from the shipped HTML — the eight that read
and summarise a filed return, plus the twenty-one that build, lay out, trace,
reconcile and read the map — and asserted against:

- the sample return's identities, re-derived from an independent copy of the 2024
  single rate schedule and standard deduction;
- bar geometry — shares of AGI, narrowing monotonically, never over 100%. The
  bars are no longer drawn, but `summarize` still computes them and the identity
  is still worth pinning;
- the empty state producing no `NaN`, no `Infinity` and no effective rate;
- all nine lines recovered from a text dump built out of the 2024 form's own
  labels, including the three extraction traps above;
- a **13,122-combination sweep** over tax against payments, asserting that finding 01
  names the right direction (overpaid / underpaid / level) at every point, that
  there are always exactly three findings, and that none of them ever renders an
  empty string or a citation without a line number;
- the source panel's line table agreeing with `fieldSpec()` — the doc cannot drift
  from the code.

And, for the map — which is a port, so most of it is about whether it is still a
faithful one:

- **fidelity** — fourteen boxes, each citing the sheet row it came from, the nine
  reference letters matching the sheet's column A, and **nothing on the map that
  is not one of the fourteen**. The workbook lives outside the repository, so the
  harness cannot diff against it; the rows and letters are transcribed, which is
  what makes a drift show up in the diff rather than in someone's memory;
- **shape** — thirteen edges, seven columns, one sink, and every edge joining
  *neighbouring* columns. An edge that skips a column is the first sign the shape
  has drifted, so it fails rather than merely looking odd;
- **roles** — nine boxes typed, four computed, one answer; the nine typed ones are
  exactly the boxes with no arithmetic feeding them. `tentative1` is asserted
  separately, because it is typed *and* has an edge into it, and an assertion
  written the obvious way would have got that wrong;
- **the one honest edge** — `taxable → tentative1` carries `op: 0`, and the sums
  check skips it rather than asserting a relationship that does not hold;
- **arithmetic** — a **2,304-map sweep** that deliberately drives both `MAX(0, …)`
  floors: 972 maps push deductions past AGI, 960 push credits past the tax they
  offset;
- **geometry** — all fourteen boxes placed across all seven columns, no two
  overlapping, none leaving the canvas, every edge joining two placed boxes, and
  the per-column counts adding up to the box count. One layout, not a sweep,
  since the disclosure levels are gone;
- **reconciliation** — the six rearrangements that pin a box from a filed return
  are each asserted by value, all eight comparisons agree on the sample return,
  and a refund on line 35a reads as a negative balance;
- **the four assumptions** — exactly four, each naming a real box, each in fact
  zero after adopting a return, and each carrying a sentence saying why;
- **planning** — each of the five rules fires on a case built to trigger it and
  stays quiet otherwise, both floor rules coincide with the floor actually
  biting, a return never reads as overpaid and underpaid at once, every
  observation names a box that exists and carries a known severity, and none of
  them asserts eligibility for anything.

```bash
node tests/verify-return-review.mjs review/1040/index.html
```

## Layout

| Block | Contains |
|---|---|
| Masthead | kicker, `<h1>`, standfirst |
| Intake | upload / sample / clear, the doc state, the privacy note — one full-width strip |
| Board head | eyebrow, title, five readouts, the year control, the year caveat |
| Canvas | the map, full width: column headings, wires, boxes, legend |
| Tax review notes | below the map, full width — the eight comparisons, their amount boxes, the four assumptions |
| Tax planning | below the notes — what the map suggests is worth asking about |
| Paste strip | below the board, because the reader is an input to the comparison, not part of the map |
| Source panel | collapsed `<details>` — the nine lines, below the board |

### The boxes are the controls

A computed box is a `<button>`; a typed box is a `<div>` holding a real
`<input>`. Both sit over an SVG that carries only the wires, which is the whole
reason the map is not drawn inside the SVG: the boxes have to be focusable,
reachable by Tab and announced for what they are.

The split is forced — an `<input>` cannot live inside a `<button>` — but it is
also right. Since the Detail panel went, **the map is the only place the nine
subtotals are entered**, so the box itself has to be the control. Focusing the
field selects its box, which is what clicking used to do, so the trace still
follows the keyboard. Clicking anywhere on a typed box lands you in its field.

Selecting a box walks the edge list both ways and inks its whole lineage;
everything else recedes by surface, never by opacity. Each box carries its own
prose as a `title`, which is where the Detail panel's notes went.

Typing never re-renders the map. `repaint()` updates the computed amounts and
the flag dots in place and deliberately leaves the typed fields alone — they are
the source of truth, and rewriting one under the caret loses the caret.

### Why the notes moved below the map

They were a 400px `<aside>` beside the canvas, which is how the reviewer view is
built. On that page it works: 27 nodes over five columns need a panel to explain
them. Here it cost the map a third of its width on every screen to show a panel
that was mostly empty, and the canvas — 1,320px for seven columns — scrolled
sideways even on a desktop because of it.

So the notes are stacked underneath at full width, and **Tax planning** with
them. Neither is a tab any more; the tablist and `selectTab()` are gone. The
cards inside them lay out in as many columns as fit (`minmax(310px, 1fr)`), which
is the width the aside never had.

**What went with the Detail panel:** the per-box calculation table and the
"comes from / lands on" jump buttons. The lineage those described is still drawn
on the map — that is what selecting a box inks — and each box's note survives as
its tooltip. The calculation table is the real loss; the map's edges say what
feeds what, but no longer with the numbers written out.

### Where the read lines live

There was a third panel, **Figures**, holding two grids of amount boxes: the nine
subtotals and the nine read lines. It went first, and the two halves were not
equal losses.

The subtotal grid was redundant the moment a typed box became editable in place.
The read-line half was not, and dropping it would have broken a promise the page
makes in its own source panel:

> Reading figures out of a PDF is imperfect — it misses amounts and picks up the
> wrong ones. Correct every line against your return before you trust anything.

A figure you cannot correct is a figure you cannot check. So each comparison row
in the review notes carries the amount boxes for the lines behind it, which is
where you are already looking when you doubt one. `flowChecks` gained a `fields`
array naming those lines; the harness asserts all nine stay reachable and that
each names a real `fieldSpec()` key. Gross income is the one comparison standing
on two lines (1z and 2b), so it gets two boxes.

Typing there calls `repaintNotes()` rather than `renderNotes()`, for the same
reason the map does not re-render on a keystroke.

### Tax planning

Five rules over the nine subtotals, so the section works with **no return
loaded**:

| Rule | Fires when |
|---|---|
| `credits-lost` | row 44's floor bit — nonrefundable credits exceeded the liability, and the excess stops |
| `deductions-lost` | row 30's floor bit — deductions exceeded AGI |
| `outside-floor` | row 45 carries tax that the row 39 credits cannot reach, because it is added after the floor |
| `overpaid` / `underpaid` | the settlement on row 59, either way |
| `no-credits` | rows 39 and 50 are both zero against a real liability |

The first two come straight off the sheet's `MAX(0, …)` floors — the two places
an amount stops being worth anything, which is exactly what the `FLOOR 0` pills
mark on the canvas. That is the payoff for having drawn the floors at all.

The three standing questions from `deriveFindings()` appear underneath when a
return is loaded, because they are grounded in lines the map does not carry.

The harness asserts each rule fires on a case built to trigger it and stays quiet
otherwise, that every observation names a box that exists, and — the one that
matters — that **none of them asserts eligibility for anything**.

### Colour

Three roles, not five. A box is either one you type (the workbook's yellow), one
the map works out (its blue), or the answer:

| Fill | Role |
|---|---|
| amber | a figure you enter |
| accent tint | a figure the map works out |
| solid accent | row 59, the answer |

The subtraction a box performs on its way out is carried by the **edge** — dashed
and amber — and by a `LESS` pill, so the fill is free to mean one thing only.
That split is what makes the palette work: in the reviewer view amber means "a
limitation changed this number", and here it would otherwise be fighting the
input role for the same swatch. Two boxes carry a `FLOOR 0` pill where the sheet
wraps them in `MAX(0, …)`.

The op-0 edge gets its own dash pattern (`2 3` against the reduction edge's
`5 4`), so "is the base for" is visually distinct from "is subtracted from" —
both differ from a plain addition in shape, not only in colour.

The palette is inherited unchanged from the reviewer view, including its two
documented accessibility departures from the design mockup: the amber pill
darkened from `#c98221` to `#8a4a06`, and recession carried by surface rather
than the mockup's `opacity: 0.32`.

## Design notes

- **The privacy claim is load-bearing, so it is literally true.** The page makes no
  network request of any kind unless you choose a PDF, and none ever carries your
  figures. No analytics, no fonts beyond the site's own, no form action, no storage.
- **Findings are questions, not conclusions.** Each one names the line it came from
  and carries a "What to check" disclosure saying what it cannot establish. Finding
  03 in particular says plainly that an empty line 21 is evidence of nothing.
- **Zero is not the same as blank.** When extraction cannot find a line it leaves the
  field empty and the intake message says so, because a silent 0 would read as a
  verified figure.

## The PDF reader

The one piece of code on the page that is not hand-written. `pdf.js` 3.11.174 is
fetched from cdnjs **only when you actually choose a PDF**, and both files are pinned
and verified before any of their code runs:

- `pdf.min.js` — native subresource integrity, `sha384-/1qUCSGw…`;
- `pdf.worker.min.js` — fetched, hashed with `crypto.subtle.digest('SHA-384', …)`,
  compared against the pinned digest, and only then turned into a blob `workerSrc`.

If either check cannot be made — no `crypto.subtle`, blocked CDN, hash mismatch — the
PDF path **refuses** rather than running unverified code over a tax return, and the
message tells you to paste the text instead. Verified end to end in a real browser
from `file://`: SRI accepted, CORS allowed, worker digest matched.

This is a genuine departure from the site's no-third-party-dependency norm, taken
because PDF upload is the prototype's headline interaction. The `.txt`, paste and
manual-entry paths involve no third party and work offline.

## Where this departs from the pattern

`docs/interactive-tool-pattern.md` was written for statute simulations. Three of its
rules do not transfer, and the substitutes are:

1. **No verbatim statute panel.** No single Code section governs "reading your own
   return". The source panel instead carries the nine Form 1040 lines with their
   labels quoted from the form, a retrieval date, and links to the form and its
   instructions — the same function (give the reader the primary source), different
   primary source.
2. **No workbook to port.** The sample is re-derived from the published rate
   schedule and the harness recomputes it independently, which is the closest
   available analogue of "the workbook is the authority".
3. **Tabs, which no other tool uses.** Three genuinely separate jobs — read the
   summary, read the questions, correct the data — with one shared state. The
   alternative was three stacked panels and a very long page.

## Known limitations

- **The line numbers are specific to tax year 2024.** The IRS renumbered Form 1040
  for 2025: AGI moved to 11a and the deduction to 12e. A 2025 return will mis-extract,
  and the source panel says so. Updating this tool for 2025 means changing
  `fieldSpec()`, the source-panel table and the sample together.
- **Extraction misses bare amounts between $1 and $999** that carry no dollar sign,
  by the design of the amount guard. It also assumes the amount sits on the same text
  line as its label; PDFs that place the amount column in a separate text run will
  come back mostly empty.
- **Scanned PDFs have no selectable text** and produce nothing. The page detects this
  and says so rather than reporting zero figures.
- **The sample is illustrative, not a filed return.** Its tax uses the exact rate
  schedule where a real filer under $100,000 of taxable income would use the Tax
  Table.
- **The three findings are fixed.** They are the three questions the prototype asked,
  reworded; the tool does not discover findings, and the count badge is always 3 or 0.
- **Nothing here is tax advice**, and the tool determines eligibility for nothing.

---

# The flow map

*`review/flow-map/index.html`. Decoded from a design-canvas mockup ("Return flow
map — reviewer view", exported as `Main.dc.html` plus a React runtime) and
rebuilt as one hand-authored file on the site's own tokens and chrome. The
export's own README says to treat it as a reference mockup and replicate its
values in our own system rather than copy it — that is what this is.*

## What it is, and what it is not

The 1040 preview answers "where do I stand". The flow map answers a different
question, and one only a reviewer asks:

> A filed return is a stack of forms that each show a total and hide the path to
> it. Draw the path instead, and the two places a limitation silently changed a
> number stop being invisible.

It is a **demonstration on fictional sample data**. Jordan & Priya Ellis do not
exist, nothing is uploaded or read, and the page says so above the board. It is
the reviewer-side view of a return — a teaching artifact, not an offer. No
pricing, turnaround, credential or scope is stated or hinted at, and the page
points at the preview rather than at any paid service.

## The model

27 nodes in five columns, 29 edges, one sink. There is no worksheet behind it and
no user input: the whole page is a static graph plus a selection.

```
column 0  source documents      9 nodes   W-2, 1099s, K-1s, 1098, receipts
column 1  forms & worksheets    5 nodes   Sch. B, 8949, 8582, 8995, SALT
column 2  schedules             3 nodes   Sch. D, Sch. E, Sch. A
column 3  schedules 1–3         1 node    Schedule 1
column 4  Form 1040             9 nodes   lines 1a … 15
```

Selecting a node walks the edge list both ways and inks its whole lineage;
everything else recedes. Five disclosure levels hide columns from the left, so
the map can be read as the face of the 1040 alone and then opened up one layer at
a time.

### The two limitations are the point

Two nodes are `kind: 'limit'`, and they are the only ones whose amount differs
from what flowed into them:

```
Schedule D    (14,300) net capital loss  →  (3,000) allowed,  (11,300) carried
Form 8582     (22,000) passive loss      →  0 allowed,        (22,000) suspended
```

Edges touching a limit node are dashed, which is the legend's "amount changed by
a limit". Both carryovers are also review flags, because a carryover created this
year and absent from last year's return is exactly what a reviewer is looking for.

### The sample is exact

Every relationship closes, and the harness re-derives all of it from the rules
rather than reading the page's own numbers back:

```
1,240 + 6,300                        = 7,540    Schedule B
4,200 − 18,500                       = (14,300) Form 8949
max((14,300), 3,000 limit)           = (3,000)  Schedule D, §1211(b)
25,000 − 0.5 × (237,540 − 100,000)   < 0        §469(i) allowance, fully phased out
min(20% × 48,000, 20% × 193,340)     = 9,600    Form 8995, §199A(a) and (b)(3)
11,200 + 9,600                       = 20,800   SALT, under the amended cap
20,800 + 14,800 + 3,500              = 39,100   Schedule A (> 31,500 standard)
185,000 + 1,240 + 6,300 − 3,000 + 48,000 = 237,540  AGI
237,540 − 39,100 − 9,600             = 188,840  taxable income
```

The 2024 comparison column closes the same way (185,800 and 149,400), and the
planning idea that quotes 12,460 of NIIT headroom is `250,000 − AGI` rather than a
typed figure.

## Corrections made to the mockup

1. **The line numbers were the 2024 form's on a 2025 return.** The 2025 Form 1040
   renumbered: AGI is **11a**, the deduction **12e**, the QBI deduction **13a** and
   the capital gain line **7a**. Verified against the form itself (Cat. No. 11320B,
   rev. 9/5/2025, retrieved 26 September 2026) and pinned in the harness so a later
   edit cannot quietly restore the old labels. This is the same class of error, and
   the same fix, as the line-12/line-14 correction on the 1040 preview above.
2. **The LIMIT pill failed contrast.** White on `#c98221` is 2.6:1 at a 9.5px size.
   Darkened to `#8a4a06`, 6.9:1 on white.
3. **Dimming out-of-lineage nodes to 0.32 opacity failed contrast.** Composited,
   the 10.5px metadata row lands near 2.7:1. De-emphasis is carried by surface and
   border instead, so node text stays full strength in or out of the traced line.
   Edges still dim — they carry no text.
4. **The "open in the PDF" button was removed.** There is no return PDF; the slot
   states the workpaper reference and says no document is attached.
5. **The level control clipped on a phone.** At 390px the bordered group hid the
   two deepest levels, one of which is the default, making them unreachable. It
   scrolls now, and the active level is scrolled into view.

## Where this departs from the tool pattern

Same three departures as the 1040 preview (no single governing statute, no
workbook to port, tabs), plus one more:

- **It is a fixed 1040×848 coordinate space, not a fluid layout.** The edges are
  cubic Béziers between box edges, so the geometry has to be deterministic. It sits
  in an `overflow-x: auto` scroller, which is what §5 already prescribes for charts
  below 600px; here the threshold is just wider. The detail rail drops below the
  map under 1180px.

## Known limitations

- **The sample is fictional and the tax year is 2025.** Line references, the SALT
  cap and the standard deduction are all 2025-specific and go stale silently. The
  footnote carries the form revision and retrieval date.
- **The SALT assertion is the one statement about current law in the harness.**
  §164(b)(6) was amended in 2025 to a $40,000 joint cap phasing down above $500,000
  of MAGI; the sample's 20,800 is under the amended cap and over the original
  $10,000 one. Re-verify it before relying on it.
- **Nothing is discovered.** The five flags and five planning ideas are authored
  and attached to nodes by id. The page runs no rule engine, and the counts in the
  header are derived from those lists, not from analysis.
- **Reviewer notes are in-memory only.** They are not stored, sent or exported, and
  a reload clears them. That is deliberate: a notes feature that persisted would be
  a data-handling promise this section has not made.
- **Nothing here is tax advice**, and the page determines eligibility for nothing.
