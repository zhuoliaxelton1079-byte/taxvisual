# The interactive tool pattern

*How TaxVisual tools are built. Written after the Income Tax Ledger, the Social
Security Benefit Inclusion tool, the Tax Benefit Rule and the Annuity tool, so the
next one does not have to rediscover any of it.*

Every tool here turns one worksheet from the ACCTG 410 Individual Taxation
Toolbox into a page a student can understand in about thirty seconds. This
document is the recipe.

The [shared explorable design guide](explorable-design.md) governs the
experience and visual language for all interactive tools. This document covers
implementation, model verification, and shipping. Use the shared guide for
new and revised layouts; older tool-specific layouts are implementation history.

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

Use one integrated workspace, following the [shared design guide](explorable-design.md).

| Block | Contains |
| --- | --- |
| Masthead | Topic, title, and one short question or standfirst. |
| Context and facts | Tax year, filing status, and native fact editors placed next to the visual elements they control. |
| Visual workspace | The chart, ledger, timeline, or flow; a clearly labeled answer attached to its active mark; optional guided exploration. |
| Scope and evidence | Compact scope/source information within the workspace, with calculation, full limitations, sources, and update history in disclosures. |

The facts and answer belong to the visual scene. Reserve clear layout bands for
HTML controls and annotations instead of placing text over the data. A sticky
rail may suit a dense workpaper, but it is not the default tool layout.

Readouts earn their place by answering the central question. Avoid repeating
the same result in a separate card, chart label, and summary panel.

### The part-to-whole bar

Where the rule is "some of X is taxable," an aligned bar can clarify the split.
Keep it in the same workspace and use external labels when a segment is too
small to hold text. Do not require this bar for mechanisms better explained by
a timeline, ledger, or eligibility flow.

## 3. Modelling

For a workbook-based model, port the formulas faithfully and put the cell
references in a comment above the function. Preserve workbook scenarios as
verification fixtures. Review the model's tax scope against primary authority;
a workbook match alone does not establish current-law accuracy. Document
differences or limitations rather than silently changing the calculation.

```js
/*  modAGI  = AGI + FEIE + tax-exempt            (C19)
    half    = 50% of benefits                    (C20)
    ...                                          */
```

Keep a deliberate deviation only if you can prove it is equivalent, and say so in
the docs. (The Social Security tab caps the upper-tier excess at the benefit
amount, which the standard worksheet does not; it is provably equivalent because
whenever that cap binds the 85% ceiling binds too.)

### Draw piecewise-linear curves exactly

For piecewise-linear rules, compute the knots where the slope changes,
evaluate there, and solve cap crossings by interpolation. Sampling rounds the
corners that carry the explanation. Discrete and nonlinear models need geometry
appropriate to their own mechanism.

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
name it beside the active result. That is the actual question a student has, and it is
more useful than any restatement of the arithmetic.

Resolve ties in the order the statute applies the limits, so the **earliest**
binding limit is named. Without that rule, two equal limits produce an arbitrary
answer that changes between renders.

## 4. Verification — non-negotiable

Every tool ships with a harness in `tests/`, run with node and nothing else:

```bash
node tests/verify-<slug>.mjs tools/<slug>/index.html
```

Each **extracts the functions from the built HTML file** and runs them against the
workbook's own check figures. Extracting from
the shipped file rather than a copy is the whole point: a transcription can pass
while the page is broken.

```js
// pull `model`, `curvePoints`, ... straight out of index.html by brace matching
const code = ['model','uncapped','curvePoints'].map(extract).join('\n');
```

Check the applicable contracts:

1. Every workbook scenario reproduces (1e-6 on amounts, 1e-12 on ratios).
2. The plotted marker lands exactly on the drawn polyline — otherwise the dot
   floats off the line at some input.
3. Each named transition has the expected value, slope, or binding state on
   either side. Test zero-to-positive behavior for an onset, and the appropriate
   change for a plateau, cap, phase-in, or eligibility boundary.

4. Where the model collapses to a simple identity, test it **by exhaustion**
   rather than by the handful of worksheet scenarios. The Tax Benefit Rule tool
   sweeps 2,576 combinations asserting `included === min(excess, relatedTax,
   refund)`; the whole design rests on that collapse, so three scenarios were not
   enough evidence for it.

Run the harness when the model, inputs, domains, or visual mapping changes.
For layout and styling changes, inspect the rendered states affected; rerun
model checks when the change could alter calculation or chart behavior.

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

## 5. Charts and other visual mechanisms

Choose the representation from the central question, using the examples in
the [shared design guide](explorable-design.md).

- Keep different measures with unrelated scales in aligned views rather than
  overlaying independent vertical axes.
- One axis expressed in two linked units is useful when the relationship is
  explicit. Social Security's other-income and provisional-income labels are
  an example, not a required pattern for other tools.
- Choose domains that reveal the mechanism and include the supported inputs.
  Keep comparison scales stable where possible and label cropped windows.
  Magnitude bars must retain an honest zero baseline.
- Use quiet gridlines, direct labels, and reserved annotation space. A threshold
  band or dashed comparison guide is appropriate when it conveys a named rule
  or comparison; avoid decoration with no informational meaning.
- Label the current answer directly and keep its relationship to the facts
  visible. Hover can add detail but must not gate the result.

### Color

Use blue for editable facts and purple for the calculated answer, reinforced
by labels and shapes. Context and baselines remain neutral. These role colors
do not replace the data palette: use an ordered ramp for ordered quantities and
distinct categories where the model has genuinely different classes.

Validate the applicable palette and text/graphic contrast on actual adjacent
surfaces in light and dark themes. Do not apply categorical palette requirements
to an ordinal ramp. Check states where a zero-width segment makes previously
separated colors adjacent.

### Theming and width

Use shared tokens for type, spacing, and theme surfaces, with semantic
tool-scoped variables for chart roles. Support both system preference and the
explicit site theme. Verify each theme rather than inverting a light palette.

Reflow the visual and reserve measured space for HTML controls and annotations.
Keep labels readable at their rendered size. The page should fit a 320px
viewport; a dense ledger or timeline can use a labeled, keyboard-accessible
horizontal scroller where its structure requires it. Views sharing an axis
must scroll together. Do not apply a fixed 600px chart width to every tool.

## 6. Sources and rule disclosures

Keep a short source link and scope summary within the workspace. Put extended
authority, calculations, and limitations in labeled disclosures so a long
document does not bury the visual. The current answer may link directly to
the applicable source paragraph.

Verify citations against the primary source. Record the source retrieval date
separately from scope and model-review dates. Distinguish a plain-language
explanation from a source quotation; preserve wording and identify omissions
when reproducing an excerpt.

For embedded source material, use a mechanical extraction rather than manual
retyping. The existing `docs/tools/extract-statute.py` supports U.S. Code and
CFR layouts. Verify that the cited section exists and that an extracted copy
matches it. Static copies require an explicit date and a visible reminder to
check the current source before relying on them.

## 7. Accessibility

- Use semantic HTML controls with labels, keyboard access, and visible focus.
- Give each diagram a current prose description and expose the textual answer.
- Make essential values and actions available without hover.
- Reflow controls and annotations at narrow widths and check text zoom.
- Label content scrollers and make them keyboard accessible.
- Respect `prefers-reduced-motion`; announce committed changes without flooding
  assistive technology during a slider drag.
- Keep decorative guides from intercepting pointer events.

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


## Model scope labels

Every public calculator and interactive sample must identify its tax year or
effective-date context, supported situations, important exclusions, and last
scope review. Keep the catalog's `taxYear` field in
`assets/js/tools-data.js` consistent with the shipped model.

Existing pages use a static `tool-scope` section styled by
`assets/css/tool-scope.css` immediately after the masthead. As a page adopts the
shared design, incorporate the short scope summary into its workspace and
retain full details in a disclosure. Avoid adding another competing facts box.

For annual models, follow the shared guide's reviewed-year and pending-year
policy. For parameterized models, identify user-supplied amounts and historical
defaults. Never describe a model as automatically current or timeless.

The scope review date records a comparison with model code and documentation.
It is separate from a legal review, rule update, and source retrieval date.

### Social Security reference implementation

The [Social Security case study](social-security-explorable-design.md) records
the implemented chart-integrated facts and purple answer, optional experiment,
model-derived boundaries, comparison behavior, year handling, and visual
checks. The model remains the authority for the curve, comparison, and
explanation. The applicable-rule link opens the relevant source paragraph.

Run `verify-social-security-inclusion.mjs` for the pilot's boundaries, finite
changes, reviewed-year behavior, and original workbook scenarios. Its ranges,
step sizes, axis design, and baseline reset policy are specific to that tool.

## Pattern update log

- **2026-10-17:** Linked the shared explorable guide and reconciled layout,
  palettes, responsive behavior, source placement, and scope guidance with the
  integrated facts/answer design.
