# Comprehensive Tax Calculation — Tool Docs

*Port of the **Comprehensive Tax Calculation** tab of the ACCTG 410 Individual
Taxation Toolbox. Live at [`/tools/comprehensive-tax-calculation/`](../../tools/comprehensive-tax-calculation/).
Harness: `tests/verify-comprehensive-tax-calculation.mjs`.*

> Taxable income is not one pool taxed by one schedule. Ordinary income fills the
> brackets from the bottom; each class of capital gain stacks on top of it, so the
> bracket a gain lands in depends on how much ordinary income is underneath. Each
> slice then pays the lower of two rates — the ordinary rate where it landed, or its
> own preferential ceiling. Where the ceiling is lower, the staircase drops, and that
> gap is the entire benefit of a preferential rate.

## What it is

The tab is one of the workbook's three "Framework" sheets, and it is the only one
that computes anything: the *Income Tax Summary* sheet carries hand-entered figures
on its two tax lines (D33, D34) annotated "See Comprehensive Tax Calculation tab".
This is that tab.

Four inputs, matching the tab's four yellow cells:

| Input | Cell | What it is |
|---|---|---|
| Taxable income excluding capital gain and QDI | `C6` | the ordinary base of the stack |
| 25% LT capital gain | `C8` | unrecaptured §1250 gain |
| 28% LT capital gain | `C9` | collectibles |
| 0/15/20% gain and qualified dividends | `C11` | entered as one total, split internally |

Plus the filing status at `B3`, which selects one of four rate schedules.

**Scope.** Only this tab. The surrounding Form 1040 flow — gross income, AGI,
deductions, credits, prepayments — is the *Income Tax Summary* sheet and is not
modelled here.

## The model

Ported formula for formula; the cell map is in a comment above the model in the
page. The four schedules are the sheet-scoped named ranges `Single_2025` (L6:P15),
`MFJ_2025` (L20:P29), `HH_2025` (L34:P43) and `MFS_2025` (L48:P57) — ten rows of
`[from, to, ordinary rate, LT capital gain rate, base tax]`.

They are **not** the seven published brackets. The tab splits the ordinary brackets
further wherever the capital-gain rate changes, which is why there are ten rows: the
0%→15% capital-gain boundary falls inside the 12% ordinary bracket, and the 15%→20%
boundary inside the 35% one.

### Column P is derived, not stored

The page stores columns L through O and derives the base tax with the tab's own
cumulative formula:

```
P7 = 0
P(n) = P(n-1) + (M(n-1) - L(n-1)) * N(n-1)
```

Storing the 40 numbers and storing the formula that makes them are not the same
claim. Deriving them means the harness can check the derivation against all 40
values the tab holds, which it does; typing them in would only have checked that
they were typed in correctly.

### The accumulation loses a dollar at every bracket edge

That formula adds `(to − from)` of width while the next row starts at `to + 1`. One
dollar of width is dropped at each crossing, at that bracket's rate, so the running
base tax falls progressively behind the published tables:

| After crossing | 10% | 12% | 12%\* | 22% | 24% | 32% | 35% | 35%\* |
|---|---|---|---|---|---|---|---|---|
| Shortfall | $0 | 12¢ | 24¢ | 46¢ | 70¢ | $1.02 | $1.37 | $1.72 |

and $2.09 once the 37% bracket is reached. (\* the two rows that exist only to
change the capital-gain rate.)

**This is reproduced, not corrected.** `docs/interactive-tool-pattern.md` §3 makes
the workbook the authority, and a tool that quietly disagreed with the tab it is
taught beside would be worse than one that is 2 dollars light and says so. The
harness pins both the direction (never *above* the published tax) and the bound. The
page footnotes it with the full staircase of figures.

Everything else matches Rev. Proc. 2024-40 exactly — every bracket boundary, every
rate, and both capital-gain ceilings for all four statuses. The harness asserts that
too, so a mistyped threshold cannot hide behind the documented drift.

### The stacking

```
D6  = C6                       ordinary income, alone
D8  = C6 + C8                  25% gain stacked on it
D9  = D8 + C9                  28% gain on that
D11 = D9                       the 0/15/20 gain starts here
```

Rows 6, 8 and 9 take their ordinary tax as a **difference of cumulative values** —
`H8 = ordTaxAt(D8) − H6` — so a slice spanning two brackets is charged correctly
across both. Then:

```
J8 = IF(E8 < 0.25, H8, C8 * 0.25)
J9 = IF(E9 < 0.28, H9, C9 * 0.28)
```

where `E` is the ordinary rate at the **top** of the slice. So the comparison is made
once per slice, not per dollar.

### The 0/15/20 split, and the identity it collapses to

`C11` is divided across four portions, each capped by a ceiling read out of the
schedule with `INDEX(range, n, 2)`:

| Portion | Cell | Ceiling | Row of the range |
|---|---|---|---|
| 0% | `C12` | maximum zero rate amount | 3 |
| "12%" | `C13` | top of the 12% ordinary bracket | 4 |
| 15% | `C14` | maximum 15-percent rate amount | 8 |
| 20% | `C15` | the remainder | — |

Each is `H = C × E`, `I = C × MIN(E,F)`, `J = IF(E < F, H, I)`. Both branches are
`C × MIN(E, F)`, so **the whole block collapses to one multiplication**:

```
J = C × MIN(ordinary rate at the top of the portion, its capital-gain rate)
```

The chart leans on that collapse — it is why the four portions can be drawn as flat
segments rather than staircases. Following §4.4 of the pattern doc, it is tested by
exhaustion (9,696 rows) rather than by the single scenario the tab ships.

### The 12% row is a deviation from the statute

The zero-rate ceiling and the top of the 12% ordinary bracket are not the same
number. For 2025 they are $125 apart for Single and MFS, $250 for MFJ, $100 for HH.
Across that band the ordinary rate is still 12% while the capital-gain rate has
already become 15%, and the tab's `MIN` takes 12%.

§1(h)(1)(C) charges 15% there. The band is narrow enough that the difference cannot
exceed **$3.75** (Single/MFS), $7.50 (MFJ) or $3.00 (HH) — but it is a deviation, not
a rounding, and the tool says so in a footnote that names the figures and lights up
when the row is actually carrying an amount.

This is the one place the port knowingly differs from the law it is teaching. It is
kept because the pattern doc's rule is that the workbook is the authority and a
deviation is documented rather than silently fixed; a student comparing the tool to
the tab must find them identical.

### Verification

`node tests/verify-comprehensive-tax-calculation.mjs tools/comprehensive-tax-calculation/index.html`

Seven groups:

1. **The tab's own scenario, cell by cell** — all 37 computed cells of the shipped
   scenario (Single, $220,000 / $35,000 / — / $0), not just the four totals.
   `J17 = 56,211.98`, `H17 = 58,795.88`.
2. **Column P** — all 40 stored base-tax values, against the derivation.
3. **An independent transcription** of the Excel formulas, with its own
   `VLOOKUP`/`INDEX` over the raw table, swept across 3,300 scenarios × 4 statuses.
   Two routes to the same number; the page's cleaned-up model has to agree with the
   literal one everywhere, not just where someone thought to look.
4. **The collapse** `J = C × MIN(a,b)`, by exhaustion.
5. **The split is exhaustive and the stack closes** — the four portions sum back to
   `C11`, `D15 == C17`, no portion overshoots its ceiling, and the zero-rate ceiling
   is a *real* transition (the next portion opens at exactly the dollar past it).
6. **The drawn geometry** — every polyline contiguous and spanning exactly its slice,
   the rate drawn mid-slice equal to the rate the model charges there, the merged
   bands non-overlapping, and **the area under the applied curve equal to the tax**
   (worst observed gap $1.82, the same accumulation artifact as above).
7. **Rev. Proc. 2024-40** — brackets and both ceilings exact; the drift never
   negative and never past $2.09.

## Layout

The standard shape from `docs/interactive-tool-pattern.md` §2: masthead, collapsed
source-rules panel, sticky left rail of controls then readouts, then one chart, the
part-to-whole bar, and the worksheet table.

Four sliders is one more than the tools either side of it, and that is deliberate —
the tab has exactly four inputs and dropping one would make the stacking
unobservable. The filing-status control is a four-way segmented group using the
workbook's own keys (Single / MFJ / HH / MFS) with the full name written out
underneath, because four spelled-out statuses do not fit a 300px rail.

### The chart

A step chart. x is cumulative taxable income from $0 to the total, stacked in
statutory order; y is the rate that dollar pays, 0% to 40%.

Two curves:

- **the applied rate**, drawn per slice in that slice's class colour, with a tinted
  fill beneath it;
- **the all-ordinary counterfactual** — the ordinary schedule across the whole
  range — as a neutral grey line.

Where the coloured line runs below the grey one, a preferential ceiling is binding,
and the area between them is what that ceiling is worth. Because the height is a
rate and the width is dollars, **the area under the applied curve is the tax** — which
is why the fill is there and is not decoration.

Both curves are drawn exactly: the knots are the bracket edges and the slice
boundaries. `VLOOKUP(..., TRUE)` holds row *k*'s rate over `[from_k, from_k+1)` and
`from_k+1` is `to_k + 1`, so **the riser sits at `to + 1`, not at `to`**. Getting that
one off by a dollar puts every step in the wrong place.

The reference line is drawn **under** the applied lines. Over the ordinary slice the
two coincide exactly, so whichever is painted second is the one you see; when the
grey was on top the ordinary slice read as grey and stopped matching its own legend
swatch. Found by looking at it, not by the harness.

### Merged bands, and the labels that were dropped

The four 0/15/20 portions are four slices but one class, so `bandsOf()` merges them
before any label is written. Labelling the slices instead produced "at 0%", "at 15%",
"at 20%" strung across the top of the plot, each duplicating the rate already
direct-labelled on its own step — §3 of the pattern doc, the same trap the Social
Security chart hit.

Each band takes the longest form that fits the width actually available (`> 190px`
full, `> 86px` short, otherwise nothing). The 25% and 28% bands usually get nothing,
which is correct: they are narrow, and the table carries them.

### The rail's third readout

"Top of the stack" names the slice at the top and the rate it pays, and says whether
that rate is its ceiling binding or just the bracket it landed in. That is the
question the chart raises — the shape shows *that* something capped, the readout says
*what*.

## Design notes

### Colour

Total taxable income split into four classes in a fixed statutory order — ordinary,
then 25%, then 28%, then 0/15/20 — is an **ordered** sequence, so it is a single-hue
ordinal ramp with the bottom of the stack darkest, not a categorical set. Same ramp
as `tools/qbi-deduction/`, revalidated for this page:

```
node scripts/validate_palette.js "#0b2a4d,#325781,#5a84b5,#86b6ef" --mode light --ordinal
node scripts/validate_palette.js "#1d4f88,#557eac,#8dacd1,#cce1fa" --mode dark  --ordinal
```

Both report ALL CHECKS PASS — monotone lightness, every adjacent ΔL ≥ 0.06, a single
hue (1° light, 2° dark), light end clearing the surface at 2.06:1 and 2.10:1.

`--compare`, the all-ordinary reference, sits deliberately **outside** the ramp. It is
not another step of the same measure, it is the counterfactual — so it is a true
neutral (channel spread 0) and clearly darker than `--step-4`, which is what keeps it
legible where the applied line runs just underneath it.

### The table is the tab

The worksheet table carries the tab's own columns — C, D, E (a), F (b), G (c), H (A),
I (B) and J — with the chosen one of A and B inked more strongly. It is both the
"comprehensive" half of the brief and the accessibility table the chart needs, so
every plotted value is reachable without hover.

Its first column has an explicit 238px width. Without one the eight numeric columns
won the layout and the row labels wrapped to six lines; the table also needs
`min-width: 880px` inside its scroller, not the 620px that was enough for narrower
tables. The meta line sits **outside** the scroller — as a `<caption>` it inherited the
table's min-width and got clipped by the panel edge.

## Known limitations to state, not hide

- **Sub-dollar disagreement with the published tables, by construction.** Between $0
  and $2.09 low, as above. Deliberate; the tab is the authority.
- **The 12% row charges 12% where §1(h)(1)(C) charges 15%.** At most $3.75–$7.50
  depending on status. Deliberate, and footnoted on the page.
- **One year only.** 2025, from Rev. Proc. 2024-40. The schedules are hard-coded; no
  other year is reachable.
- **Taxable income is an input, not a result.** Everything above it — gross income,
  AGI, the standard or itemized deduction, QBI — is other tabs and other tools.
- **Nothing after the rate schedules.** No alternative minimum tax, no net investment
  income tax, no self-employment tax, no credits. The tab stops where it stops.
- **§1202 gain is absent.** The statute's fourth preferential class has no row on the
  tab, so it has none here.
- **The embedded statute is a static copy** with a retrieval date of 1 October 2026.
  It goes stale silently; the panel says so.
