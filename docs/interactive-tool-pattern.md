# The interactive tool pattern

*How TaxVisual tools are built. Written after the Income Tax Ledger, the Social
Security Benefit Inclusion tool, the Tax Benefit Rule and the Annuity tool, so the
next one does not have to rediscover any of it.*

Every tool here turns one worksheet from the ACCTG 410 Individual Taxation
Toolbox into a page a student can understand in about thirty seconds. This
document is the recipe.

---

## 1. One idea per tool

**The tool is not a port of the worksheet.** The workbook already exists and
does the complete job; anyone who needs every input has it. A tool that
reproduces all twenty rows of a tab is a worse spreadsheet, not a better
explanation.

Pick the single mechanism the tab exists to teach, and cut everything that does
not serve it. For the Social Security tool that meant deleting, on purpose: the
line-by-line calculation table, the six scenario preset buttons, the marginal
rate sub-chart, and the inputs for tax-exempt interest, the foreign earned income
exclusion, editable thresholds and the ceiling percentage. What is left is two
sliders, a filing-status toggle and one chart.

Write the one idea as a sentence first. If it will not fit in a blockquote at the
top of the doc, the tool is trying to do too much.

> Social Security is not taxed like ordinary income. Below a threshold none of it
> counts. Above it, each extra dollar of *other* income drags 50¢ and then 85¢ of
> benefit into taxable income — until a hard ceiling stops it at 85%.

**Do not present the mechanism as numbered steps.** Steps are what the worksheet
is for. A tool shows the shape of the rule and lets the reader move through it.

## 2. Page structure

Top to bottom, in this order:

| Block | Contains |
|---|---|
| Masthead | kicker (`Topic · Simulation`), `<h1>`, one standfirst paragraph stating the idea |
| Source rules | collapsed `<details>` holding the verbatim statute — above the chart, see §6 |
| Left rail | the controls, then the key readouts |
| Main panel | one chart, then the part-to-whole bar, then the footnote |

The rail is `position: sticky` at ≥860px and static below. Controls come first,
readouts under a rule beneath them: the thing you change, then the thing that
changes.

**Readouts earn their place by being the answer**, not by being available. Three
is the working maximum: the headline number, the marginal effect in plain words
("next $1 of other income → $0.50"), and the one derived quantity the rule turns
on.

### The part-to-whole bar

Most of these rules are "some of X is taxable." One flex bar with a 2px gap
between segments answers that instantly. Values live in the **legend**, never
inside the segments — an in-segment label clips the moment a segment is small.

## 3. Modelling

**Port the worksheet formulas line for line**, and put the cell references in a
comment above the function. The workbook is the authority; a "cleaner"
reformulation is a silent behaviour change.

```js
/*  modAGI  = AGI + FEIE + tax-exempt            (C19)
    half    = 50% of benefits                    (C20)
    ...                                          */
```

Keep a deliberate deviation only if you can prove it is equivalent, and say so in
the docs. (The Social Security tab caps the upper-tier excess at the benefit
amount, which the standard worksheet does not; it is provably equivalent because
whenever that cap binds the 85% ceiling binds too.)

### Draw curves exactly, never by sampling

These rules are piecewise linear. Compute the knots where the slope changes,
evaluate there, and solve any cap crossing by interpolation. Sampling produces
rounded corners at exactly the points that carry the meaning.

```js
const knots = [0, lo, Math.min(lo + b, up), up, up + b, xMax];
// + the exact x where the uncapped line crosses the ceiling
```

### Derive a per-period series from the workbook's cumulative formula

Where a tab gives a *cumulative* total (`=MIN(investment, excluded * payments)`)
and a separate *steady-state* per-period split, do not compute the per-period
series independently. Difference the cumulative one:

```js
excludedAt = n => cum(n) - cum(n - 1);
```

That is the only way the **partial final period** comes out right — the payment
where recovery runs out mid-way excludes less than a full share, and a
steady-state formula silently overstates it. Differencing inherits the workbook's
own cap, so the tool cannot disagree with it.

### Derive labels from the geometry you drew

Zone labels, slopes and turning points must be read off the same point array the
curve is drawn from, never computed a second way. Two code paths for one fact
will disagree eventually.

Merge consecutive segments that mean the same thing before labelling them — the
ceiling splits the flat top into two segments, and the Social Security chart
labelled it twice until that was fixed.

Give each label a `full` and a `short` form and pick by available width
(`> 76px` full, `> 26px` short, otherwise nothing). Never let a label collide.

### When the rule is a cascade, name the limit that binds

Several of these tabs are nested `MIN`s — a sequence of caps where the answer is
simply the smallest. Collapse them and say so:

```
included = min(excess over the standard deduction, related tax paid, refund)
```

Then make *which one binds* the visible output: draw each candidate limit as a
reference line, ink the binding one more strongly and label it "— the limit", and
name it in words in the rail. That is the actual question a student has, and it is
more useful than any restatement of the arithmetic.

Resolve ties in the order the statute applies the limits, so the **earliest**
binding limit is named. Without that rule, two equal limits produce an arbitrary
answer that changes between renders.

## 4. Verification — non-negotiable

Every tool ships with a harness that **extracts the functions from the built HTML
file** and runs them against the workbook's own check figures. Extracting from
the shipped file rather than a copy is the whole point: a transcription can pass
while the page is broken.

```js
// pull `model`, `curvePoints`, ... straight out of index.html by brace matching
const code = ['model','uncapped','curvePoints'].map(extract).join('\n');
```

Assert three things:

1. Every workbook scenario reproduces (1e-6 on amounts, 1e-12 on ratios).
2. The plotted marker lands exactly on the drawn polyline — otherwise the dot
   floats off the line at some input.
3. Any named transition is a real transition — the value is zero just before it
   and positive just after.

4. Where the model collapses to a simple identity, test it **by exhaustion**
   rather than by the handful of worksheet scenarios. The Tax Benefit Rule tool
   sweeps 2,576 combinations asserting `included === min(excess, relatedTax,
   refund)`; the whole design rests on that collapse, so three scenarios were not
   enough evidence for it.

Re-run it after **every** edit, including pure styling ones.

### Then render it and look at it

The harness checks arithmetic; it cannot see a label collision. Screenshot the
page — headless Edge works, and needs its own `--user-data-dir` or it hangs
against a running browser — at desktop width, at 390px in a sized `<iframe>`
(headless clamps its own viewport to ~492px), and in dark mode via a temporary
sibling file carrying `data-theme="dark"`. Delete the temporary file in the same
command that creates it.

Bugs caught only by looking, so far: an axis running 40% past the last event, a
y-axis topping at $20k for a $10.5k ceiling, a zone labelled twice, and the
y-axis title sitting on top of the first zone label.

## 5. Charts

Load the `dataviz` skill before writing chart code. The rules that keep biting:

- **Never a dual-axis chart.** Two measures of different scale are two stacked
  plots sharing one x-axis.
- **One axis in two units is fine and often the best move.** Where a threshold is
  set on a *derived* quantity, label the axis twice. The Social Security chart
  carries ordinary income on the upper row and provisional income on the lower;
  a threshold rule then reads `$25,800` above and `$32,000` below at the same
  horizontal position, and the offset between the rows *is* half the benefit,
  drawn to scale. This replaced a whole explanatory panel.
- **The x window does not have to start at zero.** Where the whole story happens
  in a narrow band — a $900 refund against a $12,950 standard deduction squeezes
  every transition into 5% of a 0-based plot — centre the window on the threshold
  and widen it if the current input falls outside. The **y axis still starts at
  zero**: it is the one carrying magnitude. Say so in the axis label.
- Solid hairline gridlines and rules. Never dashed.
- No decorative band shading. The rules and labels already divide the plot.
- Direct-label the one point that matters — the taxpayer's own — and let the
  axis and the tooltip carry the rest.

### Colour

These rules are ordered (tiers, stages, states of one quantity), so the palette
is a **single-hue ordinal ramp**, not a categorical set. Validate it:

```
node scripts/validate_palette.js "#2a78d6,#86b6ef" --mode light --ordinal
```

A **neutral remainder** (the "never taxable" slice) sits deliberately outside the
ramp: it is not another step of the same measure. Make it a true neutral —
channel spread 0 — or it reads beige against this site's warm surface.

Two traps, both found the hard way:

1. Running the *categorical* validator over ramp-plus-neutral reports
   lightness-band and chroma-floor failures **by construction**. That check's
   scope is categorical palettes. The ΔE floor is the part that still binds.
2. **ΔE is not monotone in lightness.** A mid-grey next to a light blue dips to
   ≈9.7 because their lightnesses cross. The neutral has to be clearly darker or
   clearly lighter than its neighbour, not merely less saturated. Check it
   against *both* neighbours — segments become adjacent when the one between
   them goes to zero.

### Theming and width

Tool-scoped custom properties (`--tool-surface`, `--fill-strong`, …), namespaced
apart from the site-wide `--tv-*` tokens so shared-asset changes never reflow
chart geometry. Declare dark values under both `@media (prefers-color-scheme:
dark)` and `:root[data-theme="dark"]`. The dark ramp is *selected* for the dark
surface, not flipped.

Below ~600px a `viewBox` shrinks 10.5px axis text to about 5px. Put the chart in
a `min-width: 600px` box inside an `overflow-x: auto` scroller — the same way the
bracket-ledger table already behaves. Charts that share an axis go in **one**
scroller so they cannot scroll out of alignment.

## 6. The source-rules panel

A collapsed `<details>` **above the chart**, carrying the governing statute
**verbatim** — no summary, no paraphrase, no mapping of statute to tool steps.
Give the reader the primary source.

Collapsed by default, because it sits above the tool. Expanded, the text goes in
its own `max-height` scroll box so a long section cannot bury the chart.

**Get the text mechanically.** Fetch with `curl`, then walk the source's
structural markup with a small parser (`docs/tools/extract-statute.py`, which
handles both the U.S. Code and the CFR layouts), dropping the host site's own
link wrappers and keeping every word. Do not retype it, and do not route it through anything that summarises.

**Verify citations against the primary source, always.** Writing them from memory
produced, in one draft: two Treasury regulations that do not exist, a wrong
subsection heading, and a term ("provisional income") that appears in neither the
Code nor Pub. 915. Check whether regulations exist before promising them — a 404
on a URL pattern that demonstrably resolves for other sections is your answer.

**Check for regulations section by section; the answer is not the same twice.**
There are no final Treasury regulations under §86, but §111 has §1.111-1 (and no
§1.111-2). Test the URL pattern against a section you know resolves, then test the
one you want. `docs/tools/extract-statute.py` handles both the U.S. Code layout
(nested structural divs) and the CFR layout (flat `<p>` under a `div8`), and picks
between them automatically.

Every panel carries a retrieval date and a visible "verify before relying on
this" note. The text is a static copy; it goes stale silently.

## 7. Accessibility

- Each SVG gets a generated prose description naming what it currently shows,
  including both axis scales where there are two.
- Every plotted value is reachable without hover — the legend, the readouts, or a
  table. Hover enhances, never gates.
- Scroll boxes holding content are focusable and labelled.
- Respect `prefers-reduced-motion`.

## 8. Shipping checklist

1. `tools/<slug>/index.html` — copy `tools/_starter/`, keep the shared chrome
   byte-identical.
2. Append one entry to `window.TOOLS` in `assets/js/tools-data.js` — **at the end
   of the array**, per CONTRIBUTING.
3. Append one `<url>` to `sitemap.xml`, before `</urlset>`.
4. `docs/tools/<slug>.md` — model, check figures, layout, design notes, known
   limitations.
5. Do **not** add the tool to the footer here. The footer is hand-duplicated into
   every page; that change is its own PR.
6. Branch `tool/<slug>` from current `main`.

## 9. Known limitations to state, not hide

Every tool doc ends with what it does not do. So far the recurring ones: inputs
that were cut still affect the real calculation (a taxpayer with tax-exempt
interest sits further along the curve than the tool shows), and the embedded
statute is a static copy with a retrieval date.
