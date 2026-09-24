# Project status

*Where TaxVisual stands, what is unfinished, and what to pick up next. Current as of 24 September 2026.*

## Launch: one step remains

The repository is live at
[github.com/zhuoliaxelton1079-byte/taxvisual](https://github.com/zhuoliaxelton1079-byte/taxvisual)
and GitHub Pages is switched on. The custom domain in Pages settings is
**`www.taxvisual.com`** (GitHub rewrote `CNAME` to match, which is the `Update
CNAME` commit on `main`).

`https://zhuoliaxelton1079-byte.github.io/taxvisual/` returns **301**, redirecting
to the custom domain. That is Pages working correctly. The site is not reachable
yet because the DNS record does not exist.

**The one outstanding action** — in GoDaddy, DNS Records for `taxvisual.com`:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `zhuoliaxelton1079-byte.github.io` |

Delete GoDaddy's default `www` CNAME first; it conflicts. The target has no
`/taxvisual` path — it points at the account's Pages host and GitHub routes from
there.

Optional, so the bare `taxvisual.com` redirects to `www`: four `A` records on `@`
pointing at `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153` (verified against GitHub's documentation). Delete GoDaddy's
parked `@` record and make sure Domain Forwarding is off.

Then tick **Enforce HTTPS** in Pages settings once it becomes available — GitHub
says up to 24 hours while the certificate is issued.

> **Testing from campus will mislead you.** A DNS lookup for `taxvisual.com` from
> the UWGB network returns `sinkhole.paloaltonetworks.com` — the firewall
> intercepts newly registered domains. The site can be perfectly healthy and still
> look broken on university wifi. Check from a phone on cellular, or dnschecker.org.

## What exists

Four tools, all live, all ported from the ACCTG 410 Individual Taxation Toolbox:

| Tool | Workbook tab | Idea |
|---|---|---|
| [Income Tax Ledger](../tools/tax-bracket-ledger/) | — | progressive bracket mechanics |
| [Social Security Benefit Inclusion](../tools/social-security-inclusion/) | Social Security | how much of a benefit becomes taxable as other income rises |
| [The Tax Benefit Rule](../tools/tax-benefit-rule/) | Tax Benefit Rule | which of three limits decides how much of a refund is income |
| [Annuity and the Exclusion Ratio](../tools/annuity-exclusion-ratio/) | Annuity | tax-free return of capital, until the capital runs out |

Each carries its governing statute verbatim in a collapsed panel, reproduces its
tab's check figures exactly, and has a doc in `docs/tools/`.

## How the work is done

- **`docs/interactive-tool-pattern.md`** is the recipe — read it before building
  another tool. One idea per tool, exact piecewise-linear curves, labels derived
  from the geometry actually drawn, and the chart and colour conventions.
- **`tests/`** holds one verification harness per tool. Run after every edit,
  including purely visual ones.
- **`docs/tools/extract-statute.py`** pulls verbatim statute text for the source
  panels. Handles the U.S. Code and CFR layouts; can scope a very long section.

## What to build next

Seventeen workbook tabs remain. The ones that suit this treatment best — a single
mechanism with a shape worth seeing — are, roughly in order:

1. **Self-Employment Tax** — two wage bases with different ceilings; a clean
   two-threshold chart.
2. **Earned Income Tax Credit** — plateau-and-phaseout, the classic trapezoid, and
   the marginal-rate story is strong.
3. **QBI Deduction** — the SSTB phase-in is genuinely hard to picture, so the
   payoff is high; also the most complex, so budget for it.
4. **Rental Loss** — the $25,000 allowance and its AGI phaseout; structurally very
   close to the Social Security tool, so it should go quickly.
5. **Like-Kind Exchange** and **Installment Sale** — both are "recognise the lesser
   of" rules, which the Tax Benefit Rule tool already has a pattern for.

**Capital Loss Carryforward** and **Loss Limitation Order** are multi-year and
sequential; they need a different visual idiom than anything built so far, so treat
them as a separate design problem rather than another port.

## Known debts

- **The footer does not list the three new tools.** It is hand-duplicated into
  every page, so per CONTRIBUTING that change is its own PR touching all of them.
  Worth doing before the page count grows further.
- **The topbar "Request training" button wraps and overflows its border at 390px.**
  Pre-existing shared chrome — it does the same on the original bracket-ledger
  tool, so it is a site-wide fix, not a tool fix.
- **CONTRIBUTING's reviewed-PR rule was bypassed for the first publish**, because
  there was no remote to open a PR against. From here the branch-and-PR loop
  applies normally.
- **Embedded statute text is static**, each with a retrieval date in its panel.
  Re-run `extract-statute.py` before each term; the §86(b)(2) add-back list in
  particular changes as other provisions expire.

## Working notes

- The source workbook lives outside the repo, at
  `C:\Users\axeltonz\OneDrive - UWGB\Teaching\Fall 2026\ACCTG 410 toolbox\Individual taxation excel simulation master - organized.xlsx`.
  Nothing in the codebase points to it.
- Dump a tab with **both** `data_only=False` and `data_only=True` — you need the
  formulas and the computed values, and the values are the check figures.
- No student data is in that workbook (scanned September 2026: no SSNs, emails or
  roster identifiers). It is teaching material with hypothetical scenarios.
