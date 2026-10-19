# Social Security Benefit Inclusion — Tool Docs

*A deliberately simple interactive showing how much of a Social Security benefit becomes taxable as other income rises. Self-contained page (`tools/social-security-inclusion/index.html`) sharing only the site's topbar/footer chrome — no build step, no dependencies beyond Google Fonts.*

For the common experience and visual language used across all interactive
tools, see the [shared explorable design guide](../explorable-design.md).
The [Social Security case study](../social-security-explorable-design.md)
records this pilot's layout, interaction, and maintenance decisions. Earlier
visual rationale below is retained as implementation history.

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
status selector: **32,000 / 44,000** married filing jointly, **25,000 / 34,000**
single. They are not indexed for inflation. The page explicitly supports 2025 (most recent) and 2026 (upcoming), using reviewed section 86 thresholds for each year.

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

- **The source rules** (collapsed `<details>`, below the exploration): the
  complete, unedited text of 26 U.S.C. §86. See below.
- **Inline explanation:** filing status and tax year selectors; benefit and other-income amounts each contain an exact number input, up/down buttons and a slider. Matching chart marks highlight on focus or hover. Secondary readouts — taxable benefits, the marginal rate stated in plain terms
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
- **The benefit, split:** a two-slice pie at the top of the answer box: taxable
  (purple, the answer) and nontaxable. Dollar values and shares live in the
  legend beside it so nothing gets clipped at narrow widths. The 85% ceiling is
  explained in its chart pop-up rather than as a third slice.

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
- Responsive to 390px: the layout collapses to one column and the chart adapts
  its SVG width to the container instead of requiring horizontal scrolling. Axis labels retain their
  configured font size rather than shrinking with a fixed-width viewBox.
- Accessibility: the SVG carries a generated prose description of what it
  currently shows; the boundary controls and the explanatory readouts reach every value
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


## Update log

### 2026-10-17 - Framed around the central question

The page is framed around one question: a taxpayer receives a total amount of
Social Security benefits; how much is taxable and how much is excluded? The
panels are now **Taxpayer facts** and **Simulation**. "Total Social Security
benefits received" is the first fact (the starting point), ahead of tax year
and filing status. "Nontaxable" became "excluded" (from income) in the pie
legend, the chart area label, the after-plan line and the screen-reader
description; the pie heading reads "$12,400 of Social Security benefits
received: how much is taxable, how much is excluded"; the benefit line reads
"Total Social Security benefits received = $12,400".

### 2026-10-17 - Built for planning: income is the lever

Social Security benefits are usually fixed for the year; other income is what
a planner can change. The page now says so:

1. **Facts panel hierarchy.** Other annual income comes first, highlighted and
   tagged "Planning lever", with the $1 −/+ buttons plus quick steps (−$5k,
   −$1k, +$1k, +$5k) and a note on what counts (IRA/401(k) withdrawals, Roth
   conversions, gains…; qualified Roth withdrawals don't). Social Security
   benefits became a quieter fixed fact without steppers, labelled with its
   source (SSA-1099 box 5).
2. **Planning headroom** (`#headroom`, under the equation): the next one or two
   changes ahead, in other-income dollars, from `breaksNow()`, e.g. "$1,800
   more other income before the 85¢ zone (adjusted base $44,000) · $7,142
   more … before the 85% ceiling". At the ceiling it says extra income adds
   no more taxable Social Security.
3. **Planned extra income** (what-if field, `state.plan`, `planNow()`): draws a
   hollow point at today's income + the plan with a dashed arrow from today's
   point, its provisional income on the axis, a third row in the label box
   ("+$10,000 planned income → +$5,440 taxable (54.4¢ per $1)") and an
   after-plan line under the pie legend. The zoom domain widens to include
   the planned point.

### 2026-10-17 - Full provisional-income equation under the x-axis

The one-line axis title is replaced by the full §86(b) equation in normal
flow under the plot (`#piAxisEq`): "Provisional income $42,200 = other income
$36,000 + tax-exempt interest $0 + excluded income added back $0 + ½ × $12,400
Social Security benefits $6,200", every component shown even at $0, wrapping
between terms on narrow screens. When a lump sum is entered it adds
"(includes $X for a prior year)", since by default the whole lump sum counts
in this year's provisional income. The equation is a button that opens the
`pi` derivation pop-up. The facts panel no longer shows provisional income or
the next-dollar figure; both stay as screen-reader text for announcements.

### 2026-10-17 - "Social Security benefits" spelled out

All visible text, pop-ups and screen-reader descriptions now say "Social
Security benefits" rather than "benefit(s)" or "½ benefits": the standfirst,
lump-sum fields, pie heading, chart labels ("Your Social Security benefits =
$12,400", "% of Social Security benefits"), the x-axis title and every
pop-up table row. Internal break labels and code identifiers are unchanged.

### 2026-10-17 - Zoomed view only

The "Show full range / Zoom to the change" toggle is removed. The chart always
frames the curve's changes (`chartDomain()`), widening in $10,000 steps when
the income leaves the frame; with zero benefits it shows $0–$120,000. The
full-range-only greyed "½ of benefits" region and `state.zoom` are gone.

### 2026-10-17 - Page trimmed to the two panels

Removed at the user's request: the guided experiment ("Try an experiment and
compare scenarios"), the turning-point explorer, the model-scope panel with
the embedded §86 text, and the on-page update log. With the experiment gone,
the pinned-comparison diamond and `baseline` state went too, and the zoomed
domain frames only the curve's changes. Pop-ups no longer link to the statute
text. This page therefore no longer follows the `tool-scope` panel pattern in
`docs/interactive-tool-pattern.md`; its history lives in this file only.
`explorationBreaks()` and `inclusionStory()` stay: the chart's zoom frame and
next-dollar figures use them, and the verification harness tests them.

### 2026-10-17 - Live updates from typed amounts

All seven dollar fields were `type="number"`, which silently rejects "$" and
commas ("50,000" reads as empty) and marks values over `max` invalid, so the
chart did not react. They are now `type="text" inputmode="decimal"` with a
`data-max`; `parseDollars()` strips "$", commas and spaces, clamps to
[0, max], and updates on every `input` event. `showDollars()` reformats with
thousands separators when the field is not focused.

The zoomed domain (`chartDomain()`) no longer includes the current income in
its framing, which made the axis re-scale on every keystroke and the point
look frozen. It frames the curve's changes and the pinned point, and widens
in $10,000 steps only when the income leaves the frame.

### 2026-10-17 - Chart ends at the provisional-income axis

The x-axis title ("Provisional income = other income + $6.2k (½ of
benefits)") is now a button that opens the §86(b) derivation pop-up (`pi`).
Everything that sat below it is removed: the "next $1" rate strip, the hint
line, the zone key and the chart legend. Zone pop-ups open from the in-band
zone labels; the next-dollar figure remains on the point label and in the
facts panel. `setLink()` now only drives the linked highlights.

### 2026-10-17 - Provisional-income section removed

The whole section between the pie and the chart (definition, equation,
numbered steps and `renderRuler()`) is removed at the user's request. The
answer panel is now pie → chart. The §86(b) derivation remains in the `pi`
pop-up, opened from "Provisional income" in the key under the chart; the
50% / 85% arithmetic remains in the calculation pop-up ("Why? Show the
calculation").

### 2026-10-17 - Ruler bar removed; provisional-income derivation pop-up

The stacked provisional-income bar above the chart is gone (the chart's own
x-axis now does that job). Kept: the one-sentence definition, the equation
and the numbered 50% / 85% steps (`renderRuler()` now only fills those).

A "How is provisional income worked out under the tax rules?" link under the
equation opens the `pi` pop-up, rewritten as a §86(b) derivation with the
user's numbers: step 1, AGI figured without Social Security (§86(b)(2)); step
2, the §86(b)(2)(A) add-backs (§§911, 931, 933, 135, 137, 221, 85(c)) and
tax-exempt interest (§86(b)(2)(B)) to reach modified AGI; step 3, half of net
benefits (SSA-1099 box 5, tier 1 railroad benefits, lump sums unless the
§86(e) election). It ends with the comparison to the §86(c) thresholds and
how each input moves the result. Pop-ups now anchor to the button that
opened them (`popAnchor`) rather than the first button with that topic.

### 2026-10-17 - Chart drawn against provisional income

User testing: the ruler alone did not resolve the confusion between other
income, provisional income and the thresholds, because the chart still used
other income and showed shifted threshold values ($25.8k for a $32k base).
The chart's x-axis is now **provisional income**:

- thresholds sit at their statutory amounts and are labelled "Base amount
  $32,000" / "Adjusted base $44,000"; the user's provisional income is marked
  in purple on the axis under the point;
- data stay in other-income space; `X()` adds the fixed shift (½ benefits +
  add-ons), and `incomeAt()` subtracts it, so $1 steppers, clicks and arrow
  keys still move other income;
- in full range the axis starts at $0 and the stretch below the shift is
  greyed out ("½ of benefits"), since half of benefits is always counted;
- the ruler opens with a one-sentence definition of the two incomes, and the
  single result sentence became numbered steps of the 50% / 85% arithmetic.

### 2026-10-17 - Provisional-income ruler

Readers could not see how other income, provisional income and the base
amounts relate, because the thresholds test provisional income while the
chart is drawn against other income. `renderRuler()` adds a one-scale ruler
between the pie and the chart:

- an equation line ("$36,000 other income + $6,200 (½ of $12,400 benefits) =
  $42,200 provisional income"), each term underlined in its bar colour;
- a stacked bar of the same blocks, with dashed markers at the base and
  adjusted base amounts and the 0 / 50% / 85% zones shaded behind it;
- purple brackets under the bar marking exactly what the statute takes a
  share of: "$10,200 over base × 50% = $5,100", or above the adjusted base the
  tier 1 amount plus "85% × $3,200 = $2,720"; below the base, the shortfall;
  with both thresholds at zero (MFS, lived together), 85% of all of it;
- a result sentence, including the §86(e) election when it applies.

### 2026-10-17 - The whole benefit on the chart

The y-axis now runs to the full benefit (`yMax = niceCeil(1.12 × benefit)`),
with a solid "Your benefit = $X" line. The area under the curve is filled
purple (taxable) and the area between the curve and the benefit line light
blue (nontaxable) — the pie's two colours, so every vertical slice is the pie
at that income, and the band above the 85% ceiling shows the share that can
never be taxed. The right axis reads 0 / 50 / 85 / 100% of the benefit. Zone
shading moved off the plot (it muddied the areas) into the strip above the
benefit line, where the zone labels sit, and the rate strip. The y-axis title
is now "Social Security benefits"; the hover tooltip shows both parts.

### 2026-10-17 - Chart readability pass

- **Zone bands.** Each span of the curve gets a background band in an ordinal
  ramp of the ink colour (`KINDS[kind].shade`): none 0, flat/ceiling 2.5%,
  50¢ 7%, 85¢ 15%. Labels sit inside the bands where they fit; the zone key
  under the chart names every zone, so narrow ones are never unlabelled.
- **Rate strip.** A second panel under the curve, sharing its x-axis, draws
  the next-dollar inclusion rate as a step line (0¢ / 50¢ / 85¢) with the
  purple point at the user's income.
- **One x-axis.** The provisional-income scale is gone. Threshold lines are
  labelled directly ("Base amount · $32k provisional"); the hover tooltip and
  the provisional-income pop-up carry the conversion.
- **Point label** "$5,100 · next $1 → +$0.50", flipped left near the edge.
- **Current segment** drawn solid purple over the grey curve.
- **Right axis** in percent of the benefit (0 / 50 / 85%).
- **Zoom.** By default the x-domain frames the first to last change in the
  curve (plus the current and pinned points, padded and rounded to $1,000);
  "Show full range" restores $0–$120,000. `chartDomain()` in the page.
- **Pinned comparison** diamond and its legend entry appear only once the
  point has moved away from the baseline.
- Clickable labels carry an ⓘ marker; zone shorthand is "50¢ / 85¢".

### 2026-10-17 - Answer box removed; $1 steppers

The purple answer box on the chart is gone: the two-slice pie (taxable /
nontaxable) states the answer, and the chart marks it only with the purple
point and its guides. The next-dollar sentence, "Why? Show the calculation"
and the "not tax owed" caveat sit under the pie legend. Pop-ups are now
positioned within the whole answer panel (`#answerPanel`) so the calculation
pop-up can open from there. The benefit and income sliders are removed; the
−/+ buttons step by $1.

### 2026-10-17 - Fuller §86 model; analysis moved onto the chart

Model additions (all verified in `tests/verify-social-security-inclusion.mjs`):

- **§86(b)(2) adjustments.** Tax-exempt interest and excluded income added
  back (e.g. §911) enter provisional income dollar for dollar as `adj`, which
  shifts the whole curve and every boundary left by that amount.
- **Separate returns (§86(c)).** "MFS, lived apart" uses $25,000 / $34,000;
  "MFS, lived together" uses zero for both, so 85% of provisional income is
  included up to the 85% ceiling. Single, head of household and qualifying
  surviving spouse share the $25,000 / $34,000 row.
- **§86(e) lump-sum election, one prior year.** `lumpSumElection` computes
  this year without the prior-year portion plus the rise in that prior year's
  taxable benefits, using the same thresholds, and applies it only when it is
  lower. `curveAgi` draws the resulting curve exactly: knots from the plain
  and reduced-benefit curves plus the points where the two computations cross.
  Not modelled: lump sums spread over several prior years, a prior year with a
  different filing status, repayments.

The chart is now plotted directly against other income (`curveAgi`) instead
of shifting provisional-income knots at draw time.

The facts panel is condensed: year and status share a row, the slider end
labels are gone, the add-ons and lump-sum inputs sit in two collapsed rows
that show their effect in the summary ("+$1,500", "Saves $1,050"), and the
results are a two-figure strip.

The separate technical-analysis dialog is gone. Its content now lives on the
chart: zone labels, threshold ticks, the ceiling label and the
provisional-income label are HTML buttons laid over the SVG, and the answer
card's "Why? Show the calculation" opens the line-by-line §86 computation
(including the election lines). Each opens one pop-up anchored beside it,
rebuilt on every render; it closes on ×, Esc or an outside click.

### 2026-10-17 - Side-by-side panels and technical analysis

On wide screens the facts and answer panels sit side by side at one height
(`.reading-layout` grid). The answer panel sets the row height; the facts
panel uses `contain: size` so it stretches to match and scrolls internally if
its content (now including the calculation notes) runs longer. Below 860px
they stack and the facts panel returns to normal flow.

A "Technical analysis" button opens a modal `<dialog>` for professionals,
rebuilt from the live model on every render while open: the §86 calculation
line by line with subsection citations, a segment map of the curve in both
other-income and provisional-income terms (current segment highlighted), the
effective marginal rate on the next dollar at sample brackets, and what the
model leaves out (tax-exempt interest, §86(b)(2)(A) add-backs, MFS living
together, §86(e) lump-sum election, unindexed thresholds).

### 2026-10-17 - Separate facts and answer boxes

The facts (tax year, filing status, benefits, other income) moved out of the
chart into their own "Your facts" panel. A second "See the answer" panel opens
with the benefit-split pie, then the curve with the purple answer annotation.
The other-income slider keeps the chart's fixed 0-to-120,000 scale, and the
chart now labels its own horizontal axis. This supersedes the chart-integrated
layout below.

### 2026-10-17 - Chart-integrated facts and answer

Blue fact controls now sit in reserved chart bands: annual benefits next to the
ceiling, and other income along its horizontal axis. The calculated answer is a
purple annotation connected to the current point, with matching purple guides
and benefit split. Explicit Fact/Answer labels supplement the colors. The income
slider and plot share a fixed 0-to-120,000 domain. HTML inputs stay outside SVG
for native keyboard/screen-reader behavior. Narrow screens reserve a top gutter
for the answer annotation rather than covering the curve.

### 2026-10-17 - One combined panel

The editable facts now sit above the chart inside one shared panel. The two
separate bordered cards and sticky side-by-side layout were removed.

### 2026-10-17 - Inline explanation and tax years

- Replaced the separate input rail with controls embedded in the explanatory text;
  linked keyboard focus and hover to chart marks without adding a color legend.
- Added 2025 and 2026 year rules and a selector. The previous/current calendar-year
  pair is always shown as most recent/upcoming. A new year remains review pending
  and unavailable for calculation until its rules are added to `YEAR_RULES`.
- Reviewed IRS Publication 915 (2025), https://www.irs.gov/publications/p915,
  and current IRC section 86, https://www.law.cornell.edu/uscode/text/26/86.
  The inclusion thresholds match for 2025 and enacted 2026 rules. This does not
  add tax-exempt interest, other excluded adjustments, or a total-tax calculation.
- Made the chart adapt to its container and collapsed comparisons, boundaries,
  scope, source text and the public update log to reduce the initial reading load.

For each later change, add a dated entry here and in the tool's visible update
log. Before enabling another year, check the official rules, add that year's
explicit data, and run the model/year checks and browser interactions.
