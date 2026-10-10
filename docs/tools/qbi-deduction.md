# The QBI Deduction — Tool Docs

*`tools/qbi-deduction/`. Ported from two ACCTG 410 Individual Taxation Toolbox
tabs: "QBI deduction" (in `1.4 adjustments and deduction calculation example -
QBI.xlsx`) and "20% deduc not SSTB" (in `Qualified business income calculation
and simulation.xlsx`).*

## What it is

> Below a taxable-income threshold the deduction is simply 20% of qualified
> business income. Cross it and one of two different limits phases in over the
> next band of income — a ceiling built from W-2 wages and property for an
> ordinary business, or, for a specified service business, the income itself
> draining away to nothing. Same threshold, same band, very different damage.

Five sliders, a business-type toggle, one chart carrying both business types,
and a bar splitting 20% of QBI into the four fates the statute can send it to.

**The single mechanism:** one ratio — how far taxable income has travelled
across the band — drives *both* limits. §199A(b)(3)(B)(ii) multiplies the excess
over the wage ceiling by it; §199A(d)(3)(B) subtracts it from 100% to get the
applicable percentage. Everything else in the section is arithmetic around that
one number.

## The model

```
p         = MEDIAN((TI - threshold) / range, 0, 1)      the phase-in %
applic    = 1 - p                                       §199A(d)(3)(B)

qbiA      = sstb ? QBI  * applic : QBI                  §199A(d)(3)(A)(ii)
w2A       = sstb ? W2   * applic : W2                   "
ubiaA     = sstb ? UBIA * applic : UBIA                 "

tentative = 0.20 * qbiA                                 §199A(b)(2)(A)
wageOnly  = 0.50 * w2A                                  §199A(b)(2)(B)(i)
wageProp  = 0.25 * w2A + 0.025 * ubiaA                  §199A(b)(2)(B)(ii)
ceiling   = MAX(wageOnly, wageProp)                     §199A(b)(2)(B)
excess    = MAX(tentative - ceiling, 0)                 §199A(b)(3)(B)(iii)
reduce    = excess * p                                  §199A(b)(3)(B)(ii)
component = tentative - reduce                          §199A(b)(2)
cap       = 0.20 * TI                                   §199A(a)(2)
deduction = MIN(component, cap)                         §199A(a)
```

`MEDIAN(x, 0, 1)` is the workbook's own clamp — cell C22 on the first tab, I18 on
the second.

### Three corrections to the workbook

All three are cases where a tab disagrees with the statute reproduced on the tool
page, not design simplifications.

1. **The SSTB reduction scales W-2 wages and UBIA too, not only the deduction.**
   Row 24 of "QBI deduction" reduces the *deduction* by the phase-in percentage,
   which gets the 20%-of-QBI part right, and then rows 28–30 build the wage
   ceiling out of the **full** wages. §199A(d)(3)(A)(ii) says only the applicable
   percentage "of qualified items of income … and the W-2 wages and the
   unadjusted basis immediately after acquisition of qualified property … shall
   be taken into account". All three are scaled or none are.
2. **Cell G31 multiplies the wage ceiling by the phase-in percentage where it
   needs one minus it.** With correction 1 in place that cell disappears
   entirely, but the slip is what moves the tab's scenario 5.
3. **The 20%-of-taxable-income cap is applied last, not first.** Row 14 starts
   from `20% × MIN(QBI, TI)`, folding §199A(a)(2) in *before* the wage
   limitation. The second tab already has this right — cell I32 is
   `MIN(max, tentative-after-phase-out)` — and that is the structure used here.

Corrections 1 and 2 only move **scenario 5** (an SSTB inside the band). The tab's
own cells reach $26,118.79 there; the statute gives **$29,393.53**:

| | tab | corrected |
|---|---|---|
| tentative, 20% × QBI × 83.9% | 30,204 | 30,204 |
| W-2 wages taken into account | 60,000 | 50,340 |
| ceiling, greater of the two tests | 30,000 | 25,170 |
| excess over the ceiling | — | 5,034 |
| reduction, excess × 16.1% | 4,085.21 | 810.47 |
| **deduction** | **26,118.79** | **29,393.53** |

The tab also carries a hand-typed check figure of 26,139 in cell G36, which
matches neither. Scenario 4's check figure (35,040 against a computed 35,034) is
out by the same kind of rounding, so both look like figures worked separately by
hand and left behind.

Correction 3 is invisible in all five scenarios — it only bites when QBI exceeds
taxable income *and* the taxpayer is inside the band. At TI 200,000, QBI 300,000,
wages 40,000 and no property the tab's order gives **36,780** where §199A gives
**40,000**; the harness pins exactly that case.

### Where the curve is not a straight line

Every other tool in this set draws a piecewise-linear rule. This one does not,
and it is worth knowing why before anyone "simplifies" the knot code.

For an **ordinary** business the ceiling is a constant, so the reduction is
`E0 · p` and the curve is linear in taxable income. For an **SSTB** inside the
band the tentative amount is scaled by `(1 − p)` *and* the excess is multiplied by
`p`, and the product is quadratic:

```
component(p) = (1 - p) * (0.20*QBI - E0*p)        where E0 = MAX(0.20*QBI - C0, 0)
```

`C0` is the ceiling on unreduced wages and property. The applicable percentage
scales both branches of the `MAX` equally, so the branch never changes with `p`
and `E0` is a genuine constant — which is what makes the closed form possible at
all.

So the tool:

- solves the band-crossing of `component` against the `20% of TI` cap as a
  **quadratic** root, not a linear one;
- subdivides the band into **64 chords** where, and only where, the curve is
  actually curved (`sstb && E0 > 0`);
- adds the taxpayer's own taxable income as a knot, so the marker sits exactly on
  the drawn line rather than a hair off it.

With 64 chords and `|d²f/dTI²| = 2·E0/R²` the chord error is at most `E0/16384` —
a few dollars on a $40,000 axis, well under a pixel. The harness asserts that
bound rather than a round number, so the claim in the comment is the claim that
is tested.

### Verification

```bash
node tests/verify-qbi-deduction.mjs tools/qbi-deduction/index.html
```

Ten blocks:

1. All five scenarios of the "QBI deduction" tab — four by its own figures, the
   fifth by the corrected one, with the tab's value named in the output so the
   difference is visible rather than buried.
2. The "20% deduc not SSTB" tab, both options.
3. **An independent reference.** `form8995A()` works the calculation the branchy
   way the form does — Schedule A first, then Part II by cases (below threshold /
   above / ceiling not binding / phase-in) — rather than the page's closed form
   retyped. 6,336 combinations, exact agreement. This is what establishes that
   the closed form is the same rule.
4. The four parts of the bar sum to 20% of QBI **exactly** and none is negative,
   over 200,000 seeded draws. The whole decomposition rests on that identity.
5. Statutory bounds, over 120,000 seeded draws: never more than 20% of QBI nor
   20% of taxable income; below the threshold the ceiling is ignored entirely
   (§199A(b)(3)(A)); at or above the far edge an SSTB gets nothing at all
   (§199A(d)(3)(A)).
6. **No jump at either edge of the band.** A piecewise rule assembled wrongly
   shows up here first and nowhere on screen until someone drags across the
   boundary and watches the line snap.
7. The drawn polyline reproduces the model: exact at every knot in every case,
   and between the knots within `E0/16384` for a curved SSTB band, `1e-6`
   otherwise.
8. The marker lands on the polyline and the marginal figure in the rail is the
   slope of that same polyline — including two cases where the taxpayer sits
   outside the default band view, which is what makes the test exercise the
   page's own `domain()` rather than a copy of it.
9. The limit named in the rail is the one that took the most, swept, **plus an
   explicit tie**: a value check cannot separate two equal losses, so one case is
   built where the wage phase-in and the 20%-of-TI cap each take exactly 15,000,
   and the statute's order — (b)(3)(B) before (a)(2) — decides the name.
10. All three corrections are live, each pinned by the input that separates the
    corrected model from the tab's own formulas.

**This harness was mutation-tested.** Twelve deliberate breakages, all caught,
and re-run after the chart rendering was rewritten.

One attempt along the way was *not* caught, and correctly so: replacing
`MIN(component, cap)` with `MIN(0.20 × MIN(QBI, TI), component)` looks like it
reorders the cap, but `component ≤ 0.20 × QBI` always holds, so the extra term
changes nothing and the "mutation" was algebraically a no-op. Writing the tab's
real structure instead — `tentative` from `0.20 × MIN(qbiA, TI)` with no separate
cap step — fails five blocks including block 10. Worth recording because **an
uncaught mutation is not automatically a hole in the test**; check that the
mutation actually changes the function before believing it.

## Layout

The standard shape from `docs/interactive-tool-pattern.md` §2. Two departures:

- The business-type control is a **segmented toggle at the top of the rail**,
  above the sliders, because it changes which of two rules you are looking at
  rather than a quantity within one. Same component as the filing-status toggle
  in the Social Security tool. A note under it says what counts as a specified
  service trade or business, in the statute's own terms.
- The threshold and the phase-in range sit in a **secondary group** at the
  bottom of the rail. They are inputs — the tool is date-neutral — but they are
  not what a reader comes to move.

### The chart

**x is taxable income**, and the window is centred on the band rather than
starting at zero: on a 0-based axis a $50,000 band beside a $191,950 threshold is
a sliver. The **y axis still starts at zero** — it is the one carrying magnitude.
The axis label says so.

**Two curves, one axis.** The taxpayer's own business type is inked strongly and
the same figures as the other kind are drawn beside it, because the contrast *is*
the lesson. Same measure, same units, so this is one axis and not the dual-axis
trap: the pattern doc's rule forbids two *scales*, not two series.

Three reference lines, the binding one inked more strongly and labelled
"— the limit": 20% of QBI, the wage-and-property ceiling (drawn only for an
ordinary business — for an SSTB it is itself scaled by the applicable percentage,
so a flat line would be a lie), and 20% of taxable income (drawn only over the
stretch where it can actually bite).

The zone labels come off the same two vertical rules the chart drew, clipped to
the window so a band running off-screen is not labelled where it is not.

### Label collisions, and why they are handled in one pass

Up to five labels compete for space inside the plot: two horizontal reference
lines, the 20%-of-taxable-income ray, and one for each curve. Their positions
come from the numbers rather than the layout, and several coincide **by
construction**:

- the cap ray meets the 20%-of-QBI line *exactly* where taxable income equals
  QBI — they are the same number there;
- above the band the two curves converge, because an ordinary business with a
  low enough ceiling lands on the same deduction as a service business;
- either curve can run along either reference line for a stretch.

The first three attempts fixed one colliding pair at a time — move this label
right, widen that gap — and each fix moved the collision to a different pair.
What works is to draw none of them directly: every label is collected with its
**x extent**, and one pass in increasing y pushes any label below an
already-placed one it overlaps, comparing x ranges so a label on the left and one
on the right can share a height.

Two numbers in that pass were measured off a render rather than reasoned about:

- **20px of clearance, not 13.** The viewBox is 760 wide inside a panel nearer
  600, so everything renders at about 0.68 on screen; a 13px gap became 9px
  between 7px glyphs, and 16px still left them touching.
- **6px per character** for the width estimate. It over-estimates Plex Sans,
  which is the safe direction — a label judged wider than it is only causes an
  unnecessary nudge, never an overlap.

Separately, each curve is labelled where the two are **furthest apart** rather
than at the right-hand edge, since at the edge they have often converged; if they
never separate at all, one label says so.

### The marginal-rate readout

Read off the drawn polyline, not recomputed, so the number in the rail and the
line on screen cannot disagree. It takes the segment to the *right* of the
taxpayer, because the readout asks what the next dollar does.

It is formatted in cents up to a dollar and in dollars past it, because **this
rule really does go past it**: with no W-2 wages the ceiling is zero, so the whole
of 20% of QBI phases out across the band and each extra dollar of taxable income
can cost more than a dollar of deduction. At QBI 300,000 with no wages and a
50,000 band the figure is **−$1.20**. That is the single most useful number the
tool produces and it is invisible in the workbook.

## Design notes

### Colour

The bar splits one quantity — 20% of QBI — into the four fates the statute can
send it to, in the order the limits apply. That is ordered, so it is a single-hue
ordinal ramp with the kept part darkest, not a categorical set.

```
light  #0b2a4d,#325781,#5a84b5,#86b6ef   on #fcfcfb
dark   #1d4f88,#557eac,#8dacd1,#cce1fa   on #1a1a19
```

Both pass the dataviz validator's `--ordinal` checks. **Four steps rather than
five leaves room to spread them**, so unlike the charitable tool's ramp these
also clear the *categorical* floors under `--pairs all`: worst normal ΔE 15.4 in
both modes, worst CVD 15.4 light and 14.9 dark, worst tritan 15.1 and 14.3. The
only outstanding note is the surface-contrast WARN on the end step, which the
skill discharges with visible labels — the legend writes out every value and
every name.

The comparison curve uses a true neutral outside the ramp (`#8a8a8a` light,
`#808080` dark), which clears the accent at ΔE 17.3 normal and 15.1 protan. It is
also direct-labelled, so identity never rests on colour.

### The legend lists parts that are zero

"The wage ceiling took nothing" is information, and a segment of zero width
cannot say it. Every one of the four parts is listed with its amount and its
subsection, whether or not it has a segment in the bar.

## Known limitations

State them; do not hide them.

- **One trade or business.** No aggregation under §1.199A-4, and no netting of a
  loss in one business against income in another. A taxpayer with two businesses
  cannot be modelled by running this twice.
- **No qualified REIT dividends or PTP income.** §199A(b)(1)(B) adds 20% of them
  to the combined amount with no wage limit and no SSTB restriction, so a
  taxpayer with either gets more than this tool shows. Both workbook tabs omit
  them too.
- **The phase-in range defaults to $50,000**, the pre-2026 single-filer figure
  the source worksheet uses, so that its check figures reproduce.
  §199A(b)(3)(B)(i)(I) and §199A(d)(3)(A) **now read $75,000 ($150,000 joint)**.
  The footnote says so and the slider reaches it, but a reader who changes
  nothing is looking at 2024.
- **The threshold is an input, not a year.** §199A(e)(2)(B) adjusts it for
  inflation annually; the tool will not do that for you.
- **Taxable income is an input and is taken as given.** §199A(e)(1) computes it
  without regard to §199A itself, which makes it circular in a real return; here
  you type the answer in. Net capital gain is assumed already removed.
- **No cooperative patrons** (§199A(b)(7)), **no qualified conservation-style
  special rules**, and none of the anti-abuse machinery in §1.199A-5 about
  separating a service business out of a larger one.
- **SSTB status is a toggle, not a test.** Whether a business is one is the hard
  part in practice and §1.199A-5 spends thousands of words on it. The tool
  assumes you know the answer.
- **The embedded statute is a static copy** with a retrieval date, and goes stale
  silently.

## The workpaper layer

Added on top of the model, which is unchanged (see `docs/workpaper-kit.md`):

- **A sticky result bar:** the verdict chip (below the threshold, in the phase-in band with
  the percentage through it, or above the band), the deduction, the marginal effect of the
  next dollar, and what limits it. The three readouts that used to sit in the rail moved
  here with their ids intact.
- **Typed figures** beside every slider (a professional types $187,300, not drags to it),
  with the slider range widening when a typed value exceeds it.
- **Examples:** the five scenarios of the workbook's "QBI deduction" tab and the second
  tab, loadable from a menu, so the reproduced figures can be seen on the page.
- **What would change this:** the zone, the wages that would remove the wage limit, and the
  measured effect of another $10,000 of wages, $100,000 of property, $10,000 of QBI and
  $10,000 of taxable income.
- **The computation, line by line,** thirteen lines each with its §199A authority, the limit
  that took the most marked.
- **A workpaper,** copy and print, and a link carrying every input.
- **A visible warning** while the range is the worksheet's $50,000: §199A(b)(3)(B) now reads
  $75,000 ($150,000 joint). This was in the footnote; it is now where the reader sets the
  range.
