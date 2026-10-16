# Verification harnesses

Twelve of them. Nine are **one per tool**: each extracts the model functions out of
the shipped `index.html` by brace-matching and runs them against the check
figures in the ACCTG 410 workbook tab the tool was ported from.

The twelfth, `verify-real-marginal-rate.mjs`, checks the sample memo at
`samples/real-marginal-rate/` against hand-worked cases built from the 2026
figures (Rev. Proc. 2025-32, IRC §86 and §151(d)(5)(C), the 2026 IRMAA tables);
see `docs/tools/real-marginal-rate.md`.

Extracting from the built file rather than a copy is the whole point: a
transcription can pass while the page itself is broken.

Three of those pages have no workbook tab behind them. `verify-return-review.mjs`
re-derives its sample from the published rate schedule instead,
`verify-return-flow-map.mjs` re-derives its sample return from the governing
rules, and `verify-section-121-exclusion.mjs` checks the model against the
statute and the regulation's own worked example — same principle, a source of
truth outside the page.

`verify-workpaper-kit.mjs` tests the shared `assets/js/workpaper.js` and
`assets/css/workpaper.css` (see `docs/workpaper-kit.md`): the helpers, the URL
state round trip, the stylesheet's classes and tokens, and that every tool linking
the kit carries the markup its script expects. It never touches a model, so it
takes no page argument.

The tenth, `verify-links.mjs`, is different in kind: it takes no page argument
and checks the whole site at once, for the things that hold *between* pages and
that no single page can check about itself.

## Running them

No install, no build, no npm. Node only:

```bash
node tests/verify-social-security-inclusion.mjs tools/social-security-inclusion/index.html
node tests/verify-tax-benefit-rule.mjs          tools/tax-benefit-rule/index.html
node tests/verify-annuity-exclusion-ratio.mjs   tools/annuity-exclusion-ratio/index.html
node tests/verify-charitable-deduction-limits.mjs tools/charitable-deduction-limits/index.html
node tests/verify-qbi-deduction.mjs             tools/qbi-deduction/index.html
node tests/verify-comprehensive-tax-calculation.mjs tools/comprehensive-tax-calculation/index.html
node tests/verify-section-121-exclusion.mjs     tools/section-121-exclusion/index.html
node tests/verify-return-review.mjs             review/1040/index.html
node tests/verify-return-flow-map.mjs           review/flow-map/index.html
node tests/verify-real-marginal-rate.mjs        samples/real-marginal-rate/index.html
node tests/verify-workpaper-kit.mjs            # the shared kit, run from repo root
node tests/verify-links.mjs                     # whole site, run from repo root
```

Each prints a table and exits non-zero on any failure.

**Run the tool harnesses after every edit to a tool page, including edits that
are purely visual.** It is cheap, and the failure mode they catch — a model that
silently stops matching the workbook — is invisible in a screenshot.

**Run `verify-links.mjs` after any edit to the nav, the footer, `sitemap.xml`,
`/sitemap/`, or any change that adds, moves or stubs a page.** That is the
failure CONTRIBUTING names as the most likely source of silent breakage: the
chrome is hand-duplicated into all 31 pages, so a nav change applied to 29 of
them leaves two pointing at a tab that no longer exists, and nothing complains.

## What each one asserts

Beyond reproducing the workbook's numbers, each harness checks the things that
are easy to break without noticing:

| Tool | Also asserts |
|---|---|
| Social Security | all six workbook scenarios; the plotted marker lands exactly on the drawn polyline |
| Tax Benefit Rule | `included === min(excess, relatedTax, refund)` across a 2,576-combination sweep; the limit named in the rail is the one that actually binds |
| Return Review | the sample return re-derived from the 2024 rate schedule; all nine lines recovered from a Form 1040 text dump, including the traps that made the naive patterns read the wrong box; a 13,122-combination sweep over tax against payments asserting finding 01 always names the right direction; the source panel agreeing with `fieldSpec()`. Then the subtotal flow map: fourteen boxes each citing the workbook sheet row it came from, nothing on the map that is not one of the fourteen, every edge joining *neighbouring* columns, a 2,304-map sweep that drives both `MAX(0, …)` floors, the layout placing all fourteen boxes across seven columns without an overlap, and the six rearrangements that let a filed return pin a box — each asserted by value, with all eight comparisons agreeing on the sample return all nine read lines staying correctable, and the five planning rules each firing only on a case built to trigger it — including the two that coincide with the sheet’s `MAX(0, …)` floors actually biting |
| Return Flow Map | the whole sample return re-derived from the rules rather than read off the page — the $3,000 capital loss limit, the §469(i) allowance phased out to nothing, and the §199A income limitation; then the graph invariants (one sink, acyclic, no edge running right to left); then geometry swept over all five disclosure levels **and** all fourteen open/closed states the page can reach — no two boxes overlap, nothing leaves the canvas or lands on the legend, opening a box never pulls another one upward, and with every box closed the map is the same fixed grid it always was; and finally the line-item split: every box with no box feeding it states line items of its own, every box that states none is fed by boxes that do, no line item merely repeats an amount arriving on an edge, and the twelve boxes that open are pinned by id |
| Charitable Deduction Limits | the tab's figures, then the model against BOTH the tab's formulas re-typed and IRS Publication 526 Worksheet 2 transcribed independently — asserted as exact equality on all five steps over 9,000 structured combinations plus 250,000 seeded off-grid draws, which is what establishes that the tab's contribution-based netting and the IRS worksheet's deduction-based netting agree rather than merely not having been seen to differ; `total + carryover === gifts`; the deduction never exceeding what was given nor 60% of AGI and never *falling* as AGI rises; the drawn polyline reproducing the model to 1e-6 under dense off-knot sampling, which is what proves the computed knot set is complete; the saturation AGI being a real transition; the limit named in the rail swept over 5,808 combinations **plus an explicit tie case**, because on a tie both candidates equal the deduction and a value check cannot tell the two names apart; and both corrections to the tab still biting |
| QBI Deduction | all five scenarios of the "QBI deduction" tab and both options of "20% deduc not SSTB"; then the model against **Form 8995-A worked by cases** — Schedule A, then Part II branch by branch — transcribed independently rather than the page's closed form retyped, which is what establishes that the closed form is the same rule; the four parts of the bar summing to 20% of QBI exactly with none negative over 200,000 seeded draws; the statutory bounds either side of the band over 120,000 more; **no jump at either band edge**, which is the failure a piecewise rule hides until someone drags across it; the drawn polyline exact at every knot and, where an SSTB band makes the curve a genuine parabola, within the `E0/16384` chord bound the code claims rather than a round number; the marker and the marginal-rate readout both agreeing with that same polyline, including two taxpayers outside the default view so the page's own `domain()` is what gets tested; the named limit swept **plus a built tie** where two losses are exactly equal; and all three corrections to the workbook pinned by the input that separates them from the tab |
| Comprehensive Tax Calculation | all **37** computed cells of the tab's scenario rather than its four totals, and all 40 of its stored base-tax values against the cumulative formula that derives them; then the model against **an independent transcription of the Excel formulas**, with its own `VLOOKUP`/`INDEX` over the raw table, swept across 3,300 scenarios × 4 filing statuses — the literal route and the page's cleaned-up one have to agree everywhere; the collapse of the four 0/15/20 rows to `J = C × MIN(a,b)` by exhaustion over 9,696 rows, which is what licenses drawing them as flat segments instead of staircases; the split summing back to the entered total with `D15 == C17` and no portion overshooting its ceiling, and the zero-rate ceiling opening the next portion at *exactly* the dollar past it; then the geometry — every polyline spanning exactly its slice, the rate drawn mid-slice equal to the rate charged there, merged bands never overlapping, and **the area under the applied curve equal to the tax**, which is the claim the chart's fill makes; and finally Rev. Proc. 2024-40, where every bracket and both capital-gain ceilings must match **exactly** while the base-tax column must not — the tab drops a dollar of width at each bracket edge, so the harness pins the direction (never above the published tax) and the $2.09 bound rather than letting a mistyped threshold hide behind a documented deviation |
| Home-Sale Exclusion (§121) | date arithmetic (29 Feb, the 730/731-day 24 months, overlapping use periods counted once); Reg. §1.121-3(g)(2)'s own 365/730 example; the path through the decision tree for every branch; the 730-day and 2-year boundaries to the day; §121(b)(5) nonqualified use (nothing before 2009, nothing after the last day used as a home, allocation on gain after depreciation); a **233,280-combination sweep over dates** asserting days owned and used, `excluded = min(gain − depreciation − nonqualified use, limit × min(shortest, 730) ÷ 730)`, that every dollar of gain is excluded or taxable, and that steps 3 and 4 are reached only after the earlier test passes; the chart marker lying on the drawn polyline across 384 states and the curve bending exactly where the cap meets the gain; then the page itself — every one of the 12 tree steps present, every quotation found word for word in the embedded statute panel, and the panel carrying the two passages the extractor used to drop |
| Annuity | lifetime exclusion equals the investment **exactly** (never more — income escaping tax; never less — capital taxed twice); full recovery lands at `ceil(12 × multiple)`; the final partial payment excludes only the remainder |

The sweeps matter where a tab ships few scenarios. The Annuity tab has only one,
so the properties carry the weight instead.

They also matter where the shipped sample is not representative. The Return
Review sample refunds, so every code path that handles a balance due was
exercised only by the sweep — which is how it caught the settlement box storing
an absolute value while its inbound edges summed to a signed one. On screen,
with the sample loaded, nothing ever looked wrong.

`verify-links.mjs` asserts six classes of site-wide invariant:

| Class | What it catches |
|---|---|
| links | any internal `href`/`src` that resolves to nothing on disk |
| nav | a page whose primary nav is missing, or does not carry the same five tabs in the same order |
| marker | a page marking two tabs at once, marking none when it sits in a section, marking the wrong tab, or using `aria-current="page"` where it needs `"true"` |
| chrome | a page that stopped loading `tokens.css`, `base.css` or `components.css` |
| sitemap | a `sitemap.xml` URL with no file behind it, or a `noindex` stub listed there in violation of rule 2 of the "to be built" convention |
| backlog | a `noindex` stub missing from `/sitemap/`, or listed there without its `to be built` annotation — rule 3 |

The marker class is the one that needs the mapping written down: two tabs own a
folder that is not named after them (`/review/` under Dashboard, `/training/`
under Consulting), so `SECTION_OF` at the top of the file is the source of truth
and has to change whenever the nav does.

Two more lists at the top of the file decide what counts as a page at all, and
both exist because the harness walks the **filesystem**, not the git index — so
gitignoring something does not hide it here:

- `SKIP_DIRS` — directories that are on disk but are not the website. Besides
  `.git`, `node_modules` and `_source`, this covers the two working folders
  that sit beside the site, `data analytics/` and
  `sample tax return for testing/`. Without them the walker picked up twelve
  stray HTML files — six teaching artifacts and six bundled inside a Playwright
  install — and failed all of them for having no nav and none of the shared
  stylesheets.
- `EMBEDS` — generated, self-contained files the site serves only inside an
  iframe, currently just `dashboard/irs-soi/index.html`. They carry no site
  chrome by design, so they are filtered out of `pages` rather than exempted
  check by check. See "Embedded artifacts" in `docs/site-architecture.md`.

The links class strips both the query and the hash before resolving a path, so
an `?embed=1` on an iframe source is still checked against the file on disk
rather than skipped.

Three harnesses have been mutation-tested: `verify-links.mjs` below, and the two
deduction harnesses. `verify-charitable-deduction-limits.mjs` had two real holes on
its first run — a knot-set deletion no test case exercised, and a tie-break flip
that no value check could see, both invisible to a check that only compares
numbers; both are closed and all ten mutations are caught.
`verify-qbi-deduction.mjs` caught twelve of twelve, and recorded one attempt
that was *not* caught and should not have been: the "mutation" was algebraically a
no-op, so an uncaught mutation is not automatically a hole in the test. Details in
`docs/tools/charitable-deduction-limits.md` and `docs/tools/qbi-deduction.md`.

**This harness was mutation-tested.** Eleven deliberate breakages were
introduced one at a time and it caught all eleven. That matters because the
backlog check originally passed no matter what: it searched the whole of
`sitemap/index.html`, and the footer on that page already links to nearly every
stub, so a delisted stub was still "found". Only the mutation test surfaced it.
If you add a class here, break it on purpose first and confirm it fails.

## Adding one for a new tool

Copy the closest existing harness. Keep the `extract()` helper as is — it is what
ties the test to the shipped file. Then assert, in order:

1. every figure the workbook tab computes;
2. that the chart geometry agrees with the model at the plotted point;
3. any invariant the design depends on, swept rather than spot-checked.

See `docs/interactive-tool-pattern.md` §4.
