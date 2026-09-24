# Verification harnesses

One per tool. Each **extracts the model functions out of the shipped
`index.html`** by brace-matching and runs them against the check figures in the
ACCTG 410 workbook tab the tool was ported from.

Extracting from the built file rather than a copy is the whole point: a
transcription can pass while the page itself is broken.

## Running them

No install, no build, no npm. Node only:

```bash
node tests/verify-social-security-inclusion.mjs tools/social-security-inclusion/index.html
node tests/verify-tax-benefit-rule.mjs          tools/tax-benefit-rule/index.html
node tests/verify-annuity-exclusion-ratio.mjs   tools/annuity-exclusion-ratio/index.html
```

Each prints a table and exits non-zero on any failure.

**Run them after every edit to a tool page, including edits that are purely
visual.** It is cheap, and the failure mode they catch — a model that silently
stops matching the workbook — is invisible in a screenshot.

## What each one asserts

Beyond reproducing the workbook's numbers, each harness checks the things that
are easy to break without noticing:

| Tool | Also asserts |
|---|---|
| Social Security | all six workbook scenarios; the plotted marker lands exactly on the drawn polyline |
| Tax Benefit Rule | `included === min(excess, relatedTax, refund)` across a 2,576-combination sweep; the limit named in the rail is the one that actually binds |
| Annuity | lifetime exclusion equals the investment **exactly** (never more — income escaping tax; never less — capital taxed twice); full recovery lands at `ceil(12 × multiple)`; the final partial payment excludes only the remainder |

The sweeps matter where a tab ships few scenarios. The Annuity tab has only one,
so the properties carry the weight instead.

## Adding one for a new tool

Copy the closest existing harness. Keep the `extract()` helper as is — it is what
ties the test to the shipped file. Then assert, in order:

1. every figure the workbook tab computes;
2. that the chart geometry agrees with the model at the plotted point;
3. any invariant the design depends on, swept rather than spot-checked.

See `docs/interactive-tool-pattern.md` §4.
