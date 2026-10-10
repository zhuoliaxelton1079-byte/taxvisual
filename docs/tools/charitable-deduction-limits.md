# Charitable Deduction Limits — Tool Docs

*`tools/charitable-deduction-limits/`. Ported from the ACCTG 410 Individual
Taxation Toolbox, "Charitable donation limitation" tab, with the neighbouring
"IRS worksheet charitable donati" tab as the cross-check.*

## What it is

> A charitable deduction is not capped by one percentage. Each kind of gift
> carries its own ceiling — 60%, 50%, 30% or 20% of AGI — but they all draw on a
> single 50%-of-AGI pool, claimed in a fixed order. A gift early in that order can
> leave a later one with no room even when its own ceiling is nowhere near
> binding. What does not fit carries forward five years.

Six sliders (AGI and the five classes of gift), one chart of the deduction
against AGI, and a part-to-whole bar splitting everything given into what
deducts now and what waits.

This is the fifth tool and the second cascade, after the Tax Benefit Rule. The
difference is that a cascade of three limits collapses to one `MIN` and the
whole answer is "which is smallest"; this one is five parallel cascades sharing a
resource, so the answer is *who got to the pool first*.

## The model

Five classes. Each is allowed the smallest of what you gave, its own percentage
of AGI, and the room left in the shared 50% pool. Step numbers are the order the
statute claims the pool in, and are the tab's own.

| Step | Gift | To | Own ceiling | Pool room | Tab row |
|---|---|---|---|---|---|
| 1 | cash | 50% limit org | 60% AGI | — | 5 |
| 2 | ordinary income property | 50% limit org | 50% AGI | `0.5·AGI − C5` | 6 |
| 3 | cash or ordinary income property | private non-operating foundation | 30% AGI | `0.5·AGI − (C5+C6+C7)` | 10 |
| 4 | capital gain property at FMV | 50% limit org | 30% AGI | `0.5·AGI − (C5+C6)` | 7 |
| 5 | capital gain property | private non-operating foundation | 20% AGI | `min(0.5·AGI − (C5+C6+C7+C10), 0.3·AGI − C7, 0.3·AGI − C10)` | 11 |

```
ded_i   = MIN(gift_i, MIN(ceiling_i, room_i))     (column G)
carry_i = gift_i - ded_i                          (column H)
total   = SUM(G5:G11)                             (G13)
```

**The rooms subtract what was *given*, never what an earlier class was actually
allowed.** So the five rows do not have to be evaluated in step order — the
answer is the same whatever order they are computed in. The step numbers matter
because they decide *whose* gift is netted out of *whose* room, not because of
any sequencing in the arithmetic. This is worth knowing before refactoring:
there is no state to thread through the rows.

### Three corrections to the tab

The tab is the source model, and all three of these are cases where it disagrees
with the IRS instructions pasted into its own cells A18:A39.

1. **Every room is floored at zero.** `F6` and `F7` carry no `MAX(0, …)` guard,
   though `F10` and `F11` do. A cash gift above 50% of AGI drives both negative
   and the tab then returns a *negative* deduction for steps 2 and 4. IRS
   Worksheet 2 step 3 and the tab's own pasted text both say "if any result is
   zero or less, enter -0-".
2. **The 60% ceiling is applied to step 1.** The tab has `G5 = C5` with no `MIN`
   against `E5`, so it would deduct a cash gift of any size — 100% of AGI or
   more. `E5` is computed on the tab and then never referenced. IRS Worksheet 2
   line 13 is "the smaller of line 10 or line 12 (0.6 × AGI)".
3. **`H7` and `H11` are computed.** On the tab they are typed constants (`5000`
   and `0`) rather than `=C−G`. They are right at the shipped inputs and stay put
   when anything changes. `H5`, `H6` and `H10` already use the formula.

Correction 2 is the one that matters most: without it the tool would tell a
student that a large cash gift is fully deductible against a small AGI.

### One thing that looks like a deviation and is not

The tab nets **contributions** into the 20% class's room (`0.5·AGI − SUM(C5:C7,
C10)`, and the two 30% cross-limits against `C7` and `C10`). IRS Worksheet 2
lines 34, 36 and 37 net **deductions** instead (lines 13, 17, 24, 30). Since a
deduction is never more than the gift, the IRS room is never the smaller of the
two, so the tab could in principle be the stingier of them.

It never is. Wherever an earlier class is cut, it is cut precisely because the
pool or its own ceiling is already exhausted — and in every such case the 20%
class has zero room under both formulations, so the two agree. The harness
asserts this as **exact equality on all five steps**, over 9,000 structured
combinations and 250,000 seeded off-grid draws. A separate 4-million-draw search
during development also found no difference.

The practical consequence: the tab's simpler contribution-based formulation is
safe, and there is no need to thread deducted amounts between the rows.

### Verification

```bash
node tests/verify-charitable-deduction-limits.mjs tools/charitable-deduction-limits/index.html
```

Nine blocks, in order:

1. The tab's own figures — AGI 100,000 with 15,000 / 10,000 / 0 / 30,000 / 0
   gives 15,000 / 10,000 / 0 / 25,000 / 0, `G13` = 50,000 and `H7` = 5,000.
2. The model against the tab's formulas re-typed, and against IRS Worksheet 2
   independently transcribed, across the sweep described above. Plus
   `total + carryover === gifts` exactly.
3. Bounds and monotonicity: the deduction never exceeds what was given nor 60% of
   AGI, the carryover never goes negative, and the total never *falls* as AGI
   rises. The flat top of the chart depends on that last one.
4. **The drawn polyline reproduces the model exactly.** Dense sampling at a
   prime-ish step, so the samples miss the knots, must land on the polyline to
   within 1e-6. A missing knot shows up here as a rounded corner.
5. The plotted marker lands on the polyline at the taxpayer's own AGI.
6. The saturation point is a real transition — something still carries just
   below it, nothing at it.
7. The limit named in the rail is the one that actually produced the answer,
   swept over 5,808 combinations. A value sweep cannot do this alone, so two
   things are pinned by hand on top of it:
   - **The tie.** At AGI 100,000 with 20,000 cash and 50,000 of capital gain
     property, step 4's ceiling and its pool room are both exactly 30,000, so
     either name satisfies a value check. The statute's order ("the smaller of:
     N% of AGI, or 50% of AGI minus …") makes the ceiling the one to name.
   - **Which of step 5's caps.** Its room is three caps at once and they are not
     the same limit in words — the 50% pool, 30% of AGI less the capital gain
     gifts, and 30% of AGI less the *other* 30%-class gifts. All three are just
     `row.room` to a value check, so each has a case built to make it the strict
     minimum.
8. Both corrections to the tab are live, so a regression that dropped them fails
   rather than passing unobserved.

**This harness was mutation-tested.** Ten deliberate breakages, and the first
run caught only six of the first eight. The two misses were worth the exercise:

- Deleting the two 30% cross-limit lines from the knot set passed, because no
  test case made a cross-limit the *only* thing bending the curve. Two cases were
  added where nothing else is given, so `room5` is `0.3·AGI − C7` alone and its
  corner at `AGI = C/0.3` is a knot no other limit contributes.
- Flipping the binding tie-break passed, because on a tie both candidate limits
  equal the deduction, so either name satisfies a value check. The explicit tie
  case in block 7 exists only to pin it.

All ten are caught now, including "never name `cross-other`" and two room
formulas quietly dropping a term. If you add a check here, break it on purpose
first.

## Layout

The standard shape from `docs/interactive-tool-pattern.md` §2: masthead, the
collapsed source-rules panel, then rail and main panel side by side.

The rail carries six sliders where the other tools carry four, so the five gift
fields use a compact variant — smaller amount type, the organization on its own
muted line — and only AGI keeps the full-size treatment. The whole rail still
fits beside the chart at desktop height.

### The chart

**x is AGI**, not a gift amount. Raising AGI lifts every ceiling and every pool
room at once, so the curve climbs until the last dollar given becomes deductible
and then goes flat — the whole cascade unfolds out of the origin in one sweep.
Putting a single gift on x would show one class crowding out another, which is
the same story told once instead of five times.

The window runs from zero to a little past the saturation AGI, so the final
corner is always on screen. **y starts at zero** and is scaled to what was given;
the reference rays are annotations and are clipped where they leave the plot
rather than being allowed to set the scale.

Three reference lines, with the binding one inked more strongly and labelled
"— the limit":

- **50% of AGI**, the shared pool. Where the curve runs along it, the pool is
  what is holding the deduction back.
- **60% of AGI**, the cash ceiling, drawn only when there is a cash gift. This
  is why the curve can sit *above* the 50% line at low AGI — cash gets its own
  higher ceiling, so a taxpayer with cash alone deducts more than half of AGI.
- **everything you gave**, horizontal. Where the curve meets it, nothing carries.

### Knots are computed, never sampled

Every quantity the model takes a `MIN` or `MAX` over is affine in AGI, and a
min/max of affine functions bends only where two of them cross. So the exact knot
set is the pairwise intersections of that list — sixteen lines, 120 pairs, filtered
to the window. Block 4 of the harness is what proves the list is complete.

### Zone labels

Read off the drawn segments and nothing else, then consecutive segments meaning
the same thing are merged before labelling. Three kinds:

- a rising segment is labelled with its slope in cents of deduction per dollar of
  AGI — the marginal effect, in the units a reader can act on;
- a flat segment at the top is "All of it deductible";
- a flat segment *below* the top is **"Pool used up"**, which is the one that
  surprises people: between AGI 25,000 and 30,000 on the default inputs, a bigger
  AGI buys no extra deduction at all, because the cash gift is still consuming
  the entire pool.

### Label collisions

Two were found by rendering and looking, neither visible to the harness:

- `0.6x` and `0.5x` converge in the top-right corner, so labelling either ray at
  its exit point overprints it on the other. Each is labelled part-way *along*
  its own run instead, at a different fraction, which separates them in x and y
  whatever window the inputs produce. Each label then slides back down its own
  ray if it would overflow the right edge — it has to stay on the line it labels,
  so x and y move together.
- Where the pool is exactly binding the 50% ray runs *through* the taxpayer's
  marker, and no amount of sliding along x fixes that. The label drops below its
  line when it would land in the marker's band. Both ray labels carry a
  surface-coloured halo for where they cross the curve anyway.

## Design notes

### Colour

Five classes claiming one pool in a fixed order are **ordered**, so the palette is
a single-hue ordinal ramp with step 1 darkest, not a categorical set. The
carryover neutral sits deliberately outside the ramp: it is not another step of
the same measure but the part that did not fit.

Validated with the dataviz validator in `--ordinal` mode, both themes:

```
light  #10365f,#1a5496,#2a78d6,#5296e0,#86b6ef   on #fcfcfb
dark   #1d4f88,#2a6bb5,#3987e5,#6ba6ec,#a0c6f3   on #1a1a19
```

Both pass monotone lightness, adjacent ΔL ≥ 0.06, one hue (2–3° spread) and a
light end clearing the surface (2.06:1 and 2.10:1). The dark ramp is *selected*
for the dark surface, not flipped.

**The neutral is checked against every ramp step, not just the one it touches** —
segments become adjacent whenever the step between them goes to zero, which here
happens constantly. `#707070` (light) clears the worst step at normal ΔE 15.8 /
protan 13.5 / tritan 11.2; `#808080` (dark) at 15.4 / 13.0 / 11.1. The mid-greys
either side fail exactly as §5 of the pattern doc predicts: `#8a8a8a` dips to
13.4 against `#5296e0` and `#999999` to 12.4 against `#6ba6ec`, because their
lightness *crosses* the ramp's rather than clearing it.

**The ordinal validator governs, not the categorical one.** Run over
ramp-plus-neutral the categorical checks fail by construction — the lightness
band and chroma floor are scoped to categorical palettes — and no five-step
single-hue ramp can meet the categorical ΔE 15 floor between its own adjacent
steps: that would need ΔL ≈ 0.16 a step, so the light end would no longer clear
the surface. The ramp carries the secondary encoding the skill requires instead:
a 2px surface gap between segments, and every value and class name written out in
the legend rather than left to colour.

### The legend carries classes that got nothing

A class with a gift but no deduction has no segment — zero width — so it would
vanish from a legend driven by the bar. It is listed anyway, at `$0`, with the
limit that stopped it and the amount carried. *"Step 4 deducted $0 because the
pool was already gone"* is the answer a reader came for, and a segment of zero
width cannot say it.

## The source-rules panel

Collapsed `<details>` above the chart, three documents, verbatim, retrieved
29 September 2026 from the Legal Information Institute:

- **26 U.S.C. §170(b)** — the percentage limitations. Includes `(b)(2)`
  (corporations), which the tool does not model; the panel is the whole
  subsection rather than an edited one.
- **26 U.S.C. §170(d)** — the five-year carryover the tool's carryover readout
  points at.
- **26 CFR §1.170A-8** — *Limitations on charitable deductions by individuals*,
  the implementing regulation.

All three fetched with `curl` and run through `docs/tools/extract-statute.py`,
which picked the U.S. Code layout for the first two and the CFR layout for the
third automatically. Nothing retyped.

Checked before promising them: §1.170A-8 exists and resolves; the tab's own
40-line quotation of Publication 526 is a *publication*, not law, so it is not
reproduced — §170(b) and the regulation are what govern.

Two things in the statute worth knowing, both found by reading the fetched text
rather than assumed:

- **§170(b)(1)(G)**, the 60% cash limit, reads "for taxable years beginning after
  December 31, 2017" with no sunset in the current text. The tool's 60% ceiling
  is not a temporary provision.
- **§170(b)(1)(I)** imposes a **0.5%-of-AGI floor** on the aggregate deduction,
  applied in a specified order across subparagraphs. It is in the current text
  and applies from 2026. Neither worksheet models it, and neither does the tool.
  See below.

## Known limitations

State them; do not hide them.

- **The 0.5%-of-AGI floor in §170(b)(1)(I) is not modelled.** It is in the
  statute reproduced on the page and it applies from 2026, so for a current year
  the tool overstates the deduction by up to 0.5% of AGI. The worksheet it is
  ported from predates the provision. This is the largest single gap.
- **No carryover in.** The tab's own IRS instructions say not to use the
  worksheet when you are carrying a contribution in from an earlier year, and the
  tool inherits that. It shows carryover *out* only.
- **Qualified conservation contributions are out.** Steps 6 and 7 of
  Publication 526 (the 50%-of-AGI and 100%-of-AGI QCC limits, §170(b)(1)(E)) are
  not modelled, and neither is the disaster-relief carryover at step 8.
- **"For the use of" gifts are out.** IRS Worksheet 2 lines 4 and 5 are a
  separate route into the 20% and 30% classes; the tab does not carry them and
  the harness sets them to zero when cross-checking.
- **The basis election is out.** §170(b)(1)(C)(iii) lets a taxpayer deduct
  capital gain property at basis instead of fair market value and take the higher
  50% ceiling. The tab notes this in cell A15 as a planning point but does not
  model it; the tool states it in the footnote rather than offering a toggle,
  because a toggle would need a basis input for every property class.
- **Valuation is assumed.** The tab's cell A16 rule — that non-cash property is
  valued at FMV less the ordinary income or short-term gain that a sale would
  recognise — is upstream of every input here. The tool takes the value as given.
- **Itemizing is assumed**, as is substantiation and that every donee is a
  qualified organization.
- **The embedded statute is a static copy** with a retrieval date, and goes stale
  silently.

## The workpaper layer

Added on top of the model, which is unchanged (see `docs/workpaper-kit.md`):

- **A sticky result bar:** deducted, carried forward, and what limits it, with a verdict chip
  (everything deducts, or partly deductible and the percentage).
- **Typed figures** beside every slider, and **examples** (the workbook tab, a cash gift over
  60%, the pool running out, gifts to a private foundation, everything fits).
- **What would change this:** what carries forward and why, step by step in the statute's own
  terms; the AGI at which everything would deduct (the true corner of the curve); and the
  measured effect of another $10,000 of AGI or of each kind of gift.
- **The five steps, line by line,** in the shape of IRS Publication 526 Worksheet 2: what was
  given, the step's own ceiling, the room left in the 50% pool, the deduction, the
  carryforward and the limit that held it back, each with the subsection that sets it
  (§170(b)(1)(G), (A), (B), (C), (D), all of which are in the source panel on the page).
- **A workpaper,** copy and print, and a link carrying every input.
- **Visible assumptions** where the inputs are: itemizing, substantiation, no carryover in,
  and the not-modelled floor in §170(b)(1)(I), the basis election and conservation gifts.
