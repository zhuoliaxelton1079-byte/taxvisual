# The Tax Benefit Rule — Tool Docs

*When a state or local tax refund becomes taxable, and how much of it you include. Self-contained page (`tools/tax-benefit-rule/index.html`) sharing only the site's topbar/footer chrome. Built to `docs/interactive-tool-pattern.md`.*

## What it is

Four sliders and one chart. The idea:

> Getting a refund does not automatically mean reporting it as income. You include
> it only to the extent the deduction that produced it actually cut your tax in the
> earlier year. If itemizing barely beat the standard deduction, most of the refund
> never becomes taxable at all.

## The model

Ported line for line from the workbook's `Tax Benefit Rule` tab:

```
excess   = MAX(0, itemized − standard)     (C16)   potential tax benefit
benefit  = MIN(excess, relatedTax)         (C17)   limited by the related tax paid
included = MIN(benefit, refund)            (C18)   lesser of refund or benefit
```

Three limits applied in sequence, which collapse to a single statement:

```
included = min( excess over the standard deduction, related tax paid, refund )
```

The tool is built around that collapse — the whole question is **which limit binds**,
and the rail names it.

Date-neutral: the standard deduction is an input, not a fixed tax year, so the
mechanics hold whatever the figures are.

### Verification

`model`, `binding` and `curvePoints` are extracted from the shipped HTML and run
against the workbook's three scenarios:

| Scenario | Itemized | Standard | Related tax | Refund | Excess | Benefit | Included |
|---|---|---|---|---|---|---|---|
| 1 | 3,521 | 12,950 | 1,750 | 900 | 0 | 0 | **0** |
| 2 | 25,000 | 12,950 | 1,750 | 900 | 12,050 | 1,750 | **900** |
| 3 | 13,000 | 12,950 | 1,750 | 900 | 50 | 50 | **50** |

All three reproduce exactly. The harness also asserts:

- the plotted marker lands exactly on the drawn polyline;
- `included === min(excess, relatedTax, refund)` across a **2,576-combination
  sweep** of itemized deductions × related tax × refund — this is the claim the
  whole design rests on, so it is tested by exhaustion rather than by the three
  scenarios alone;
- the limit named in the rail is genuinely the one equal to the result.

## Layout

- **The source rules** (collapsed `<details>`, above the chart): the full text of
  26 U.S.C. §111 *and* 26 CFR §1.111-1. See below.
- **Left rail:** four sliders for the earlier year — itemized deductions, standard
  deduction, the state/local tax inside those deductions, and the refund received
  later. Then two readouts: the amount included, and **what limits it**, with a
  one-line reason.
- **The chart:** amount included against itemized deductions, everything else
  held fixed. Piecewise linear with two interior knots, drawn exactly. Zones are
  labelled `None taxable` / `$1 per $1` / `Capped`. Both caps appear as horizontal
  reference lines; the binding one is drawn in stronger ink and labelled
  "— the limit", so which constraint governs is visible rather than stated.
- **The refund, split:** included vs not included, the untaxed part in neutral
  grey.

### The window does not start at zero

The whole story happens in a narrow band around the standard deduction — with a
$900 refund, the sloped region is only $900 wide against a $12,950 threshold. A
0-based x-axis would squeeze every transition into 5% of the plot. So the x window
is centred on the standard deduction (`standard − 1.2 × span` to
`standard + 2.2 × span`, where `span` is the binding cap) and widened if the
current input falls outside it. The **y axis still starts at zero** — it is the one
carrying magnitude.

### The two scales

Same device as the Social Security tool, for the same reason: the limits are not
measured on the quantity the slider moves. The axis carries itemized deductions on
the upper row and **excess over the standard deduction** on the lower, so the
standard-deduction rule reads `$12,950` above and `$0` below at the same position.

It buys an extra property here: in the sloped zone the lower axis row and the y
value are *the same number*. Reading straight up from the excess gives the amount
included. That is the rule, in one glance.

## Design notes

- Palette, theming, responsiveness, the `min-width: 600px` chart scroller, and the
  accessibility approach are all as set out in `docs/interactive-tool-pattern.md`.
- The non-binding cap is drawn only when it is within 2.5× of the binding one.
  Beyond that it would push the y axis so high the curve flattens into the floor,
  so it is dropped rather than allowed to wreck the scale.
- `binding()` resolves ties in the order the statute applies the limits, so the
  *earliest* binding limit is the one named. Without that rule, a scenario where
  two limits are equal would name an arbitrary one.

## The source-rules panel

Full text of **26 U.S.C. §111 (Recovery of tax benefit items)** and **26 CFR
§1.111-1 (Recovery of certain items previously deducted or credited)**, verbatim,
retrieved 24 September 2026 and extracted mechanically with
`docs/tools/extract-statute.py`.

§111(a) is the rule the tool implements, in one sentence:

> Gross income does not include income attributable to the recovery during the
> taxable year of any amount deducted in any prior taxable year to the extent such
> amount did not reduce the amount of tax imposed by this chapter.

Unlike §86, §111 **does** have a Treasury regulation, so both are embedded. That
was checked, not assumed — the §86 panel shipped an earlier draft citing two
regulations that do not exist, and the habit that caught it is the same one that
confirmed `1.111-1` here (and that `1.111-2` does not exist).

Note the regulation's vintage: much of §1.111-1 concerns recovery exclusions,
war losses and the 1939 Code. It is the operative regulation and is reproduced
whole, without editorial trimming.

## Known limitations

- Assumes the refund relates to tax deducted in a **single** earlier year. The
  workbook does the same; a refund spanning several years needs the full worksheet.
- Ignores any cap on the state and local tax deduction itself, which in practice
  can stop the deduction producing a benefit before any of this arithmetic runs.
- Covers §111(a) deductions only, not the §111(b) credit-recovery rules, which are
  in the embedded text but not modelled.
- The statute and regulation text are static copies with a retrieval date.
