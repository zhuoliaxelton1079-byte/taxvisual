# Annuity Payments and the Exclusion Ratio — Tool Docs

*How each annuity payment divides between tax-free return of capital and taxable income, and what happens when the capital runs out. Self-contained page (`tools/annuity-exclusion-ratio/index.html`). Built to `docs/interactive-tool-pattern.md`.*

## What it is

Four sliders and one chart. The idea:

> An annuity payment is part your own capital coming back and part income. A fixed
> exclusion ratio splits every payment the same way — until you have recovered
> everything you put in. From the next payment on, the whole thing is taxable.

## The model

Ported line for line from the workbook's `Annuity` tab:

```
annual      = monthly payment × 12                  (C11)
expected    = annual × expected-return multiple     (C13)
ratio       = MIN(1, investment / expected)         (C16)
excluded    = payment × ratio                       (C17)
taxable     = payment − excluded                    (C18)
taxablePct  = taxable / payment                     (C19)
recovered   = MIN(investment, excluded × received)  (G11)
unrecovered = MAX(0, investment − recovered)        (G12)
fullAt      = ROUNDUP(investment / excluded, 0)     (G14)
```

One deliberate deviation: the workbook leaves `expected = 0` as a divide error.
Here the ratio falls to zero, which is the answer the rule gives when there is
nothing to recover against.

### The identity the chart is built around

`fullAt` reduces. Since `excluded = payment × investment / (12 × payment ×
multiple)`, the payment and the investment both cancel:

```
fullAt = ceil(investment / excluded) = ceil(12 × multiple)
```

**Full recovery always lands at the end of the expected-return period**, whatever
the payment and investment amounts are — that is the whole design of the exclusion
ratio, and it only holds while the ratio is below 1. This is why the chart carries
a second axis in years: the cliff sits exactly at the multiple, visibly.

(When investment ≥ expected return the ratio pins at 1, every payment is fully
excluded, and `fullAt` becomes `ceil(investment / payment)` instead.)

### The final payment is partial

The workbook gives cumulative recovery (`G11`) and a steady-state split (`C18`),
but not the per-payment series. Reusing `C18` for every payment would overstate the
exclusion on the last one: recovery runs out part-way through payment 176, which
excludes only the $1,800 remaining, not a full $9,000 share.

So the per-payment series is obtained by **differencing the workbook's own
cumulative formula**:

```js
excludedAt = n => cumRecovered(n) − cumRecovered(n − 1);
```

which inherits `G11`'s cap and therefore cannot disagree with the workbook.

### Verification

`model`, `cumRecovered`, `excludedAt` and `segments` are extracted from the shipped
HTML. All nine derived cells of the workbook's scenario reproduce exactly:

| Cell | Line | Value |
|---|---|---|
| C11 | annual payments | 144,000 |
| C13 | expected total return | 2,102,400 |
| C16 | exclusion ratio | 0.75 |
| C17 | excluded per payment | 9,000 |
| C18 | taxable per payment | 3,000 |
| C19 | taxable percentage | 0.25 |
| G11 | investment recovered | 900,000 |
| G12 | unrecovered investment | 676,800 |
| G14 | payments to full recovery | 176 |

The tab ships only one scenario, so the harness leans on **properties across a
64-combination sweep** instead:

- `excluded + taxable === payment` — the split always exhausts the payment;
- **lifetime exclusion === investment, exactly** — never more (untaxed income
  escaping) and never less (capital taxed twice). This is the single most
  important invariant in the tool;
- `fullAt === ceil(12 × multiple)` wherever the ratio is below 1, confirming the
  identity above;
- the drawn segments tile the axis with no gap and match `excludedAt`.

Plus three assertions on the partial final payment: it excludes exactly the
remainder, that remainder is less than a full share, and the next payment excludes
nothing.

## Layout

- **The source rules** (collapsed, above the chart): 26 U.S.C. §72(b), full text.
  See below.
- **Left rail:** monthly payment, investment in the contract, expected-return
  multiple, payments received. Then three readouts — taxable in this payment, the
  exclusion ratio, and investment recovered against what is left.
- **The chart:** a stacked area over payment number. The lower band is taxable,
  the upper band tax-free; at full recovery the tax-free band vanishes and the
  payment becomes taxable in full. A rule marks the cliff, and the current payment
  is a labelled marker.
- **This payment, split:** the current payment as one bar. Because the series is
  differenced, selecting the final payment shows the partial split correctly.

### Two weights of the same colours

`--fill-*` are for **small marks** (the split bar, legend swatches, the marker);
`--area-*` are the **large bands** in the chart, where a saturated block reads loud
and crowds everything drawn on top of it. Same hues, lighter steps. Separation was
measured, not eyeballed: OKLab ΔE 16.3 light (`#86b6ef` vs `#dcdcdc`) and 18.0 dark
(`#1c5cab` vs `#3f3f3f`), both clear of the 15 floor. Each band is also directly
labelled in place, so identity never depends on colour alone — and the legend
belongs to the split bar, a different chart.

## The source-rules panel

**26 U.S.C. §72(b) — Exclusion ratio**, in full, retrieved 24 September 2026 and
extracted mechanically with `docs/tools/extract-statute.py`.

§72 as a whole runs to about **500 provisions and 156 KB** — early-distribution
penalties, plan loans, modified endowment contracts, and much else unrelated to
this calculation. Embedding all of it would have tripled the page and made the
scroll box useless. So the panel carries subsection (b) whole, and says plainly
what it left out and why, with links to the full section and to §§1.72-1, 1.72-2
and 1.72-4 (all of which exist — checked, not assumed).

This is the first tool where scoping was necessary, so `extract-statute.py` gained
an optional third argument naming the top-level provisions to keep. It **selects** a
provision; it never paraphrases one.

## Known limitations

- Assumes a fixed monthly payment for life, with no refund or period-certain
  feature. §72(c)(2) adjusts the investment where there is a refund feature; the
  tool does not.
- Ignores the deduction allowed by §72(b)(3) for investment left unrecovered at
  death, which is in the embedded text but not modelled.
- The expected-return multiple is an editable assumption, not a table lookup, which
  is what makes the model date-neutral.
- Statute text is a static copy with a retrieval date.
