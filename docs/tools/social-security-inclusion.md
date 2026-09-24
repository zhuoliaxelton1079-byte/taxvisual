# Social Security Benefit Inclusion — Tool Docs

*A deliberately simple interactive showing how much of a Social Security benefit becomes taxable as other income rises. Self-contained page (`tools/social-security-inclusion/index.html`) sharing only the site's topbar/footer chrome — no build step, no dependencies beyond Google Fonts.*

## What it is

Three controls — filing status, benefit amount, and income excluding Social
Security — and one chart. The point of the page is a single idea:

> Social Security is not taxed like ordinary income. Below a threshold none of it
> counts. Above it, each extra dollar of *other* income drags 50¢ and then 85¢ of
> benefit into taxable income — until a hard ceiling stops it at 85% of the benefit.

The x-axis is **income excluding Social Security**, not provisional income,
because that is the number a person recognises about their own situation.
Provisional income is still shown as a stat (`other income + half the benefit`)
with its threshold, so the underlying mechanic stays visible.

This is intentionally **not** a full port of the workbook tab. Tax-exempt interest,
the foreign earned income exclusion, editable thresholds, and the line-by-line
worksheet were all cut. Anyone who needs those has the workbook.

## The model

```
provisional income = other income + 50% of benefits
lower tier         = MAX(MIN(half, (PI − lower) × 50%), 0)
upper tier         = MAX(0, MIN(PI − upper, benefits)) × 85%
carryforward       = MIN(lower tier, (upper − lower) × 50%)
taxable benefits   = MIN(upper tier + carryforward, benefits × 85%)
```

Thresholds are the statutory provisional-income figures, selected by the filing
status toggle: **32,000 / 44,000** married filing jointly, **25,000 / 34,000**
single. They are not indexed for inflation, so they need no tax-year label.

### Verification

The model is checked against all six scenarios on the workbook's Social Security
tab. The test extracts the functions from the shipped HTML rather than a copy of
them, so it cannot pass against stale code:

| Scenario | Benefits | Other income | Taxable benefits |
|---|---|---|---|
| Joint A | 12,400 | 36,000 | 5,100 |
| Joint B | 16,000 | 12,000 | 0 |
| Joint C | 24,496 | 59,618 | 20,821.60 |
| Single A | 7,200 | 16,000 | 0 |
| Single B | 7,200 | 22,000 | 300 |
| Single C | 7,200 | 34,000 | 6,120 |

All six reproduce exactly (1e-6 on the amount, 1e-12 on the percentage). The test
also asserts that the plotted marker lands exactly on the drawn curve, and that
each named turning point is a real transition — taxable benefits are zero just
before "benefits start being taxed" and positive just after; the amount equals the
ceiling everywhere past "maximum reached."

## Layout

- **The source rules** (collapsed `<details>`, directly above the chart): the
  complete, unedited text of 26 U.S.C. §86. See below.
- **Left rail:** filing-status toggle, two sliders (benefit, other income), and
  three readouts — taxable benefits, the marginal rate stated in plain terms
  ("next $1 of other income → $0.50"), and provisional income with its threshold.
- **The chart:** taxable benefits against income excluding Social Security, with
  the benefit held fixed. Drawn *exactly*, not sampled — the slope only changes at
  four knots (`lower`, `min(lower+benefits, upper)`, `upper`, `upper+benefits`), so
  the polyline runs through those plus the exact ceiling crossing. Each zone is
  labelled with what it does (`None taxable`, `50¢ per $1`, `85¢ per $1`,
  `Maximum reached`), the ceiling is a labelled reference line, and the taxpayer's
  own point is a ringed, directly-labelled marker. Hovering gives a crosshair with
  ordinary income, provisional income and taxable benefits. See **the two scales**
  below.
- **The benefit, split:** one bar dividing the benefit into taxable now / could
  still become taxable / never taxable (the 15% the ceiling protects). Values live
  in the legend so nothing gets clipped at narrow widths.

## The two scales

The thing most people get wrong about §86 is *which income the thresholds are
measured against*. The statutory figures — $25,000 / $32,000 and $34,000 / $44,000
— are **provisional income**, not ordinary income, and provisional income already
includes half the benefit before the taxpayer earns a dollar of anything else.

The chart answers that structurally rather than in a footnote. The horizontal axis
carries **two rows of ticks**:

```
   $0      $10k     $20k   $25,800  $30k        $37,800        $50k
                    Income excluding Social Security benefits
   ---------------------------------------------------------------
            $20k          $32,000   $40k  $44,000              $60k
        Provisional income - the same income plus half the benefit ($6,200)
```

This is **one axis in two units**, like °C and °F on a thermometer — not a
dual-axis chart, which the `dataviz` skill rightly forbids. Three things fall out
of it for free:

1. The threshold rule is a single vertical line that reads **$25,800** on the top
   row and **$32,000** on the bottom, at the same horizontal position. The
   correspondence is spatial, so it needs no explaining.
2. The offset between the two rows *is* half the benefit, drawn to scale. Drag the
   benefit slider and the lower scale visibly slides.
3. Because the statutory thresholds are fixed on the lower scale, a larger benefit
   pushes the lift-off point **left** on the upper scale — the counterintuitive
   result that a bigger benefit starts being taxed at *less* other income.

Threshold values are emphasised on both rows (ink colour, medium weight) and
generic ticks yield to them: a round tick within 42px of a threshold label is
dropped rather than allowed to collide.

The lede restates the same point in the taxpayer's own numbers, and the chart's
screen-reader description names both scales.

## The source-rules panel

The panel carries **the full text of 26 U.S.C. §86, subsections (a) through (f),
verbatim** — no summary, no paraphrase, no mapping of statute to tool steps. The
reader gets the primary source and draws their own conclusions.

Mechanics:

- Collapsed by default. It sits above the chart, so an expanded panel would
  otherwise push the tool below the fold; collapsed it is a single quiet bar.
- When expanded, the statute sits in its own scroll box (`max-height: 430px`) so
  a long section never buries the chart underneath it. The box is focusable and
  labelled, so it is reachable by keyboard.
- Statutory hierarchy is preserved by nesting — subsection, paragraph,
  subparagraph, clause — with the designators in mono and the statutory headings
  in bold, matching how the Code is set.

### How the text was obtained

Not typed from memory, and not passed through any summarising step. The page
source was fetched with `curl`, and a purpose-written parser
(`docs/tools/extract-statute.py`) walked Cornell LII's structural markup — `subsection`,
`paragraph`, `subparagraph`, `clause`, with their `num`, `heading` and `chapeau`
spans — dropping only Cornell's own definition-popup and topical `<a>` wrappers
while keeping every word of their text. 53 provision nodes were extracted; all six
subsections and the final provision, §86(f) "Treatment as pension or annuity for
certain purposes," are present in the page.

### What an earlier draft got wrong

The first version of this panel summarised the rules in a step-to-authority table
written from memory. Checking it against the primary sources turned up three
errors — all now moot, since the panel reproduces the statute instead, but worth
recording:

1. **There are no final Treasury regulations under §86.** The draft cited
   `Treas. Reg. §1.86-1` and `§1.86-2`. Neither exists — both 404 on Cornell LII
   while the same URL pattern resolves for other regulations. The panel now says
   so explicitly, since a reader promised "Code and regulations" would otherwise
   wonder where the regulations went.
2. **§86(b) is headed "Taxpayers to whom subsection (a) applies,"** not
   "Taxpayer's combined income."
3. **Neither the Code nor IRS Pub. 915 uses the phrase "provisional income."**
   §86 says modified adjusted gross income plus one-half of the benefits; Pub. 915
   speaks of the "base amount." The tool still uses the common term in its own
   copy, because textbooks do.

The panel shows a retrieval date and a visible "verify before relying on this"
note. **Re-fetch the text before each term** — re-running `docs/tools/extract-statute.py` against a
fresh `curl` of the source is the whole job.

## Design notes

- Built against Anthropic's `dataviz` skill. Palette is a **single-hue ordinal
  ramp** — the benefit split is one quantity in three states and the zones are
  ordered, so categorical hues would have been wrong. Validated with
  `validate_palette.js --ordinal` in both modes: light `#2a78d6`/`#86b6ef`
  (light end 2.06:1), dark `#3987e5`/`#1c5cab` (2.63:1). All checks pass.
- The **never-taxable slice sits outside that ramp**, as a true neutral
  (`#8a8a8a` light, `#757575` dark, channel spread 0). It is not another step of
  the same measure — it is the remainder the 85% ceiling permanently protects —
  so it should not read as "more blue." An earlier warm gray (`#d9d7cf`) read as
  beige against the warm surface. The replacements were chosen by measurement,
  not eye: OKLab ΔE against whichever blue they touch is 16.3 / 17.3 light and
  16.4 / 17.2 dark (the second figure covers the case where the middle segment is
  empty and the gray abuts the strong blue), all clear of the skill's 15 floor,
  and both exceed 3:1 against their surface so identity never rests on the legend
  alone. Note that ΔE is *not* monotone in lightness here: mid-range grays dip to
  ≈9.7 because their lightness crosses the blue's, so a gray has to be clearly
  darker or clearly lighter than its neighbour, not merely different.
  Running the categorical validator over ramp-plus-neutral reports lightness-band
  and chroma-floor failures by construction; that check's scope is categorical
  palettes, and those two failures are the expected signature of an ordinal ramp,
  not defects. The ΔE floor is the part that still binds.
- Zone labels are derived from the slopes of the drawn segments, so they cannot
  drift from the curve. Consecutive segments with the same meaning are merged —
  the ceiling splits the flat top into two segments, which would otherwise be
  labelled twice.
- Gridlines and threshold rules are solid hairlines, never dashed. No alternating
  band shading: the rules and labels already divide the plot, and the stripes only
  added noise.
- Full light/dark via tool-scoped custom properties, namespaced apart from the
  site-wide `--tv-*` tokens. The dark ramp is selected for the dark surface, not
  flipped.
- Responsive to 390px: the layout collapses to one column, and below ~600px the
  chart keeps a legible floor and scrolls sideways rather than shrinking its
  10.5px axis text to about 5px.
- Accessibility: the SVG carries a generated prose description of what it
  currently shows; the turning-point table and the rail readouts reach every value
  without hover; hover is an enhancement, never the only route to a number.
- No build tooling — one inline `<script>`, chart hand-built with
  `document.createElementNS`, no charting library.

## Known limitations

- The chart holds the benefit fixed and varies other income. Changing the benefit
  moves the curve itself, which the tool redraws but does not animate.
- Assumes no tax-exempt interest and no foreign earned income exclusion. Both feed
  provisional income in the real worksheet; a taxpayer with either will sit further
  right on this curve than the tool shows.
- The statute text is a static copy with a retrieval date, not a live feed. It goes
  stale silently when Congress amends §86.
