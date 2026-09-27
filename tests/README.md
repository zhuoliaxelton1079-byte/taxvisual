# Verification harnesses

Six of them. Five are **one per tool**: each extracts the model functions out of
the shipped `index.html` by brace-matching and runs them against the check
figures in the ACCTG 410 workbook tab the tool was ported from.

Extracting from the built file rather than a copy is the whole point: a
transcription can pass while the page itself is broken.

Two of those pages have no workbook tab behind them. `verify-return-review.mjs`
re-derives its sample from the published rate schedule instead, and
`verify-return-flow-map.mjs` re-derives its sample return from the governing
rules — same principle, a source of truth outside the page.

The sixth, `verify-links.mjs`, is different in kind: it takes no page argument
and checks the whole site at once, for the things that hold *between* pages and
that no single page can check about itself.

## Running them

No install, no build, no npm. Node only:

```bash
node tests/verify-social-security-inclusion.mjs tools/social-security-inclusion/index.html
node tests/verify-tax-benefit-rule.mjs          tools/tax-benefit-rule/index.html
node tests/verify-annuity-exclusion-ratio.mjs   tools/annuity-exclusion-ratio/index.html
node tests/verify-return-review.mjs             review/1040/index.html
node tests/verify-return-flow-map.mjs           review/flow-map/index.html
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
| Return Flow Map | the whole sample return re-derived from the rules rather than read off the page — the $3,000 capital loss limit, the §469(i) allowance phased out to nothing, and the §199A income limitation; then the graph invariants (one sink, acyclic, no edge running right to left) and, swept over all five disclosure levels, that no two boxes overlap, nothing leaves the canvas, and every drawn edge joins two placed boxes |
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
