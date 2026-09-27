# Project status

*Where TaxVisual stands, what is unfinished, and what to pick up next. Current as of 27 September 2026.*

## Read first: nothing is committed

The whole working tree is uncommitted on `main` against `a89a787`. Decide how it
lands before touching anything: CONTRIBUTING's branch-and-PR rule applies now
that a remote exists, and the work splits into the groups under "This session's
work" and the two sessions below it.

~~**One file must not be committed as it stands.**~~ **Resolved 27 September.**
The design-tool export and an unreferenced 2.7 MB source PDF now live in
`_source/`, which is gitignored. As of the dashboard-tabs work below, `data analytics/` and
`sample tax return for testing/` are gitignored too — a 252 MB virtualenv, a
32 MB deck, licensed case PDFs and a practice return that would all have gone
live on a `git add -A`. What remains untracked is site content that should be
committed.

Worth knowing before you move anything else: **every committed file is a public
URL.** GitHub Pages serves the whole branch and `.nojekyll` disables the
filtering that would otherwise skip underscore-prefixed paths, so "move it under
`docs/`" does not hide a file — `docs/`, `tests/` and `CONTRIBUTING.md` are all
live and fetchable today. Keeping something off the site means not committing it.

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

### The return review pages

`/review/` is deliberately absent from `assets/js/tools-data.js` and from the
`/tools/` catalog grid. Documented in full in `docs/review-service.md`, revised
alongside this change.

Since 27 September the preview is the **"1040 preview" tab on `/tools/`**,
embedded from its own URL via `?embed=1`, and the whole `/review/*` folder takes
`aria-current="true"` on **Tools**. It sat under Dashboard until the Dashboard
became the IRS data report. The URLs were kept throughout.

| Page | State |
|---|---|
| `review/index.html` | overview of the preview and the three pages below it |
| `review/1040/` | the preview: nine lines in, three questions out. Also the Tools tab |
| `review/flow-map/` | reviewer view of a sample return |
| `review/how-it-works/`, `review/privacy/` | real |

The premium tier has been removed from the site rather than described as
forthcoming: `review/request/` is deleted, and the offering card, placeholder
and supporting paragraphs are gone from `/review/`, `/review/how-it-works/`,
`/review/privacy/` and `/review/flow-map/`. **If a reviewed engagement is ever
offered, it starts from nothing on the site** — which is the honest position,
since a premium review that touches planning carries professional-licensing
obligations that are not settled.

### The Dashboard

One page: `/dashboard/`, carrying the TY2023 IRS Statistics of Income explorer
from `/dashboard/irs-soi/`. It owns no pages below it.

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

## This session's work (27 September 2026)

### The Dashboard became the IRS data report, and the 1040 preview moved to Tools

Two pages changed shape, in opposite directions.

**`/dashboard/` is now one thing.** It was a hub — an intro, two offering
cards, four nav cards, a CTA band. It now carries the TY2023 IRS Statistics of
Income explorer and nothing else, under the heading *What 160 million returns
look like*. The explorer was built by `build_dashboard.py` from 15 IRS
workbooks in the `data analytics/` working folder and copied into the site as
`/dashboard/irs-soi/`: a single 243 KB self-contained file, CSS, JS and data
inlined, no external requests. Its `?embed=1` switch — which it already had —
hides its own hero banner; its seven internal topic tabs, AGI filters, CSV
export and "Copy view link" all work inside the frame.

**`/tools/` gained a tablist.** *All tools* is the existing registry-rendered
catalog, unchanged. *1040 preview* embeds `/review/1040/`, which gained the
same `?embed=1` switch: twelve lines hiding its topbar, footer and skip link so
the chrome is not drawn twice. Visited directly the page is unchanged, and the
nav markup stays in the DOM because `verify-links.mjs` asserts every page
carries it.

The preview is deliberately **not** in `tools-data.js`. It is a tab, not a
catalog card; adding it to the registry would also have put it in the homepage
spotlight rotation and the generated `/sitemap/` tool list, which is a
different decision.

**`/review/*` moved under Tools.** The preview is a tool and the three
supporting pages — the flow map, "How it works", "Your data" — explain that
tool, so the whole folder now marks **Tools** rather than Dashboard.
`SECTION_OF` in the harness changed with it, and the footer's Dashboard column
moved its review links into Tools across all 30 pages plus
`assets/partials/footer.html`. Per CONTRIBUTING a footer change is normally its
own PR; this one is folded in because leaving it would have left the footer
contradicting the nav. **Split it out if you want that rule kept.**

**The premium tier is gone from the site.** `/review/request/` is deleted —
the whole page was about a tier that does not exist. `/review/` keeps its
supporting-page signposting with the premium offering card, the "what a
premium engagement actually is" placeholder and the Register-interest CTA
removed. Three more paragraphs went with them: the "Where the premium tier
would come in" section on `/review/how-it-works/`, "The premium tier is a
different question" on `/review/privacy/`, and the clause on `/review/flow-map/`
about the engagement that view belonged to. The homepage's *Premium · to be
built / Work with us* card is untouched — that one is Consulting, a different
product line.

**On tabs, against the precedent below.** "And settled: the flow map" records
tabs being deliberately *removed* from that page, because disclosure was hiding
a map that reads at a glance. That reasoning does not transfer: the Tools
tablist separates a catalog from a whole embedded application, not two views of
one picture. The pattern itself — roving `tabindex`, Arrow/Home/End,
`aria-selected` driving `hidden` — is ported from the flow map's own tablist,
re-expressed in site tokens.

Three things the iframes needed on top of that:

- **Lazy mount.** The Tools preview waits in `data-src` until its tab is first
  opened. An iframe inside a `hidden` panel still loads if `src` is set up
  front, so without this every visitor to /tools/ downloads a second whole page.
- **Auto-height.** Both frames are same-origin, so a script measures the nested
  document and grows the frame to fit — no scrollbar inside a scrollbar — with a
  `ResizeObserver` tracking the embedded page as it changes. Under `file://`
  the browser refuses `contentDocument`, so every access is guarded and a CSS
  fallback height stands. Double-click preview is a supported path, and it was
  verified.
- **A load-order guard.** The dashboard frame carries its `src` in the markup,
  so it can finish loading before the page script attaches its `load` listener —
  the event fires before anyone is listening and the frame stays at its fallback
  height. Caught in browser testing, not by reading: it now checks
  `readyState === "complete"` after attaching. The tab-mounted frame cannot hit
  this, because its `src` is set after the listener.

Both embedded pages declare `color-scheme: light` and stay light inside a
dark-themed host. An iframe cannot inherit the host theme; this is accepted
rather than worked around, and the frame border keeps it legible.

### `verify-links.mjs` went from five failing checks to green

It was failing on this tree before any of the above — `Pages found: 43`, five
red. The walker reads the filesystem, so it was treating twelve stray HTML files
under `data analytics/` (six teaching artifacts, six bundled inside a Playwright
install) as website pages and failing them for having no nav and none of the
shared stylesheets. Gitignoring them does not fix that. Three changes:

- `SKIP_DIRS` replaces the inline `.git`/`node_modules`/`_source` test and
  adds the two working folders.
- `EMBEDS` filters `dashboard/irs-soi/index.html` out of `pages`: it is a
  generated artifact with no site chrome by design, not a page. `/review/1040/`
  is **not** in this list — it is a real page that happens to also be framed.
- The links check now strips the **query** as well as the hash before resolving
  a path. It previously did `raw.split('#')[0]`, so any `?embed=1` source would
  have been reported broken. This was mutation-tested: pointing a frame at a
  missing file does turn the check red, so the query paths are being checked,
  not skipped.

Now `Pages found: 30` — the real site, after `/review/request/` was deleted —
and all checks pass. `robots.txt` disallows `/dashboard/irs-soi/` so the embed
is not indexed as an orphan; it is in neither sitemap, because it is not a
destination.

### The navigation was restructured around five tabs

The nav is now **Learn · Tools · Dashboard · Consulting · About**, in that order,
with **no CTA button** — "Contact us for more info" is gone. Consulting is the
commercial call to action now, and it sits in the tab order like everything else.
`/contact/` is still live, reachable from the footer's Connect column and from
the calls to action on the pages that lead there; it lost only its nav slot, and
its copy was narrowed to tool ideas, corrections and classroom use, pointing
consulting enquiries at `/consulting/`.

Two new sections, both real content and both in `sitemap.xml`:

| New page | What it is |
|---|---|
| `dashboard/index.html` | the "your own figures" hub. Return review is its first function; the placeholder states plainly that nothing else is promised until it exists |
| `consulting/index.html` | hub over one-on-one tax planning plus all three training formats |
| `consulting/planning/index.html` | one-on-one tax planning — stub, `noindex`, absent from `sitemap.xml` |

**No folder was moved and no URL broke.** `/review/*` and `/training/*` keep
their published paths and sit under Dashboard and Consulting respectively. The
cost is that a page's first path segment no longer names its section, so the nav
marker cannot be derived from the URL — the mapping is written down in
`docs/site-architecture.md` under "Two tabs whose folder is named something
else". `/training/index.html` stays as the training sub-hub, reframed with a
`Consulting` eyebrow and a link up to the new hub.

Nav and footer blocks were rewritten on all 31 pages in one pass, so their
indentation is uniform for the first time and `assets/partials/` matches what the
pages contain — differing only in `{{ROOT}}`, the current-page marker, and two
spaces of indent, since a partial's outer element sits at column 0 in its own
file. The footer's six columns mirror the nav order (Learn, Tools,
Dashboard, Consulting, About, Connect), and every footer link that points at its
own page carries `aria-current="page"`, which the documented rule always required
but only two pages actually did.

`.topbar-cta` and its three rules were deleted from `components.css`; nothing
references the class any more.

Verified: 1,195 internal links resolve, all five harnesses pass, every page has
exactly five nav items with exactly one correct marker.

### The tree was tidied and a sixth harness added

Three stale things went: an empty, undocumented `directory/` at the repo root;
the 216 KB design-tool zip; and an unreferenced 2.7 MB source PDF that had been
sitting at the `assets/` root. Neither binary was ever committed and neither is
referenced by any page. Both moved to `_source/`, gitignored, with the reasoning
written into `.gitignore` itself so nobody later "fixes" the ignore.

### And settled: the flow map, carrying the workbook's major subtotals

The version that shipped. The review tab went through three shapes in one day
and landed on the first one's **structure** with the third one's **content**: the
reviewer view's flow map — boxes in columns, traced lineage, disclosure levels,
trace panel — with the Income Tax Summary's **fourteen major subtotals** in the
boxes, each citing the sheet row it came from.

Seven columns, thirteen edges, every edge joining neighbouring columns. Nine
boxes have no arithmetic feeding them and are what you type; four compute and one
is the answer. The sheet's detail rows are deliberately absent — the harness
asserts nothing appears on the map that is not one of the fourteen, so they
cannot creep back.

Two boxes carry the sheet's `MAX(0, …)` floor and say so with a `FLOOR 0` pill.
One edge, `taxable → tentative1`, carries `op: 0` — total tax is not a function
of taxable income alone, so the edge draws the dependency without claiming to
compute it, and the sums check skips it. `tentative1` stays a box you type even
though an edge reaches it, which is the one place an assertion written the
obvious way would have been wrong.

**A filed return is compared, never merged in.** Six of the nine read lines pin a
box exactly by rearranging the sheet's own arithmetic (`fromAgi = line 11 −
line 15`, `tentative1 = line 24 + line 21`, `prepayments = line 24 + line 35a`,
and so on). Eight figures are then carried beside the boxes that work them out,
and on the sample return all eight agree — which is the proof the rearrangement
is self-consistent. Four boxes have nothing on a 1040's face to fill them, so
they are assumed zero and the page lists all four assumptions rather than hiding
them.

Dropping the ledger also dropped the standard-deduction problem below: the map
has no row for the standard deduction (that is row 25, detail under row 24), so
there are no 2025 figures to source. The year control now drives one thing —
whether the PDF reader runs.

**Then trimmed.** Two things came out after the map settled:

- **The disclosure levels.** Carried over from the reviewer view, where they
  earn their place over 27 nodes in five columns. Over fourteen boxes they were
  hiding two thirds of a map that reads at a glance. The map now always shows
  all seven columns and the canvas scrolls sideways on a narrow screen, which it
  did anyway.
- **The Figures tab.** Its subtotal grid was already redundant — every typed box
  is editable from the Detail panel the moment you select it. Its *read-line*
  grid was not, and deleting it outright would have broken the promise the
  source panel makes: "correct every line against your return before you trust
  anything." So the amount boxes for the read lines moved into the comparison
  rows of the review notes, where you are already looking when you doubt one.
  `flowChecks` gained a `fields` array naming the lines behind each comparison,
  and the harness asserts all nine stay reachable.

**Then the side panel went too.** The notes were a 400px `<aside>` beside the
canvas, inherited from the reviewer view, where 27 nodes over five columns earn
one. Here it cost the map a third of its width to show a panel that was mostly
empty, and the 1,320px canvas scrolled sideways even on a desktop because of it.
So:

- **Tax review notes** moved below the map at full width, and **Tax planning**
  below that. Neither is a tab; the tablist and `selectTab()` are gone.
- **The Detail panel went with them.** That was the only place the nine
  subtotals were entered, so the typed boxes became editable **on the map**: a
  computed box is still a `<button>`, a typed one is now a `<div>` holding a
  real `<input>`. Focusing the field selects its box, so the trace still follows
  the keyboard. Each box carries its own prose as a `title`, which is where the
  panel's notes went. What did not survive is the per-box calculation table —
  the edges still say what feeds what, but no longer with the numbers written
  out.
- **Tax planning is new.** Five rules over the nine subtotals, so it works with
  no return loaded at all. Two of them come straight off the sheet's
  `MAX(0, …)` floors — credits that ran out of liability, deductions that
  exceeded AGI — which is the payoff for having drawn the `FLOOR 0` pills. The
  three standing questions from `deriveFindings()` join them once a return is
  loaded, and the section closes by pointing at `/consulting/planning/`.

`tests/verify-return-review.mjs` extracts 29 functions and runs 146 assertions,
including that no planning observation ever asserts eligibility for anything.

### The vertical ledger — superseded, kept for the reasoning

*A full port of the Income Tax Summary sheet: 36 typed rows, 15 computed, Excel's
six outline groups collapsing. It was replaced by the map above, which keeps the
sheet's subtotals and drops its detail. The reasoning below is still the record
of how the sheet was read, and the standard-deduction sourcing note still applies
to anyone who adds a deduction row later.*

The ledger was a **vertical port of the Income Tax Summary sheet** of
`Individual taxation excel simulation master - organized.xlsx` (ACCTG 410
toolbox, `Teaching/Fall 2026/ACCTG 410 toolbox/`), rows 8–59 — the framework tab
the whole workbook hangs off.

Thirty-six typed rows, fifteen computed ones, the sheet's own row order, wording
and reference letters, and its row numbers in a Ref column so the two cannot
drift silently. The six collapsible blocks are **exactly** the rows Excel marks
`outlineLevel="1"` (9–17, 19–21, 36–38, 46–48, 51–53, 55–58); the detail rows the
sheet leaves ungrouped stay open. The harness asserts both halves, so re-grouping
it to taste later fails a test rather than passing quietly. The five-role legend
— input, formula, key result, check figure, note — is the workbook's own, from
its Overview tab.

**A filed return reconciles rather than overwrites.** Only three of the nine read
lines map to typed rows (1z→salary, 2b→interest, 25d→withholding). The other six
name rows the ledger computes, so they become **check figures** — the workbook's
own fifth role — carried beside the computed answer with any difference named. A
return loaded into an empty ledger deliberately does not tie out; fill in the tax
rows and all six close.

The year switch drives three things: whether row 28 exists (Schedule 1-A is
OBBBA, so 2024 does not have it), whether the PDF reader runs (off for 2025,
because the form was renumbered and the extractor is written against 2024), and
which standard deduction is suggested.

**The thin spot, stated plainly:** the workbook types its standard deduction in
rather than keeping a table, so there was nothing to port. 2024 has all five
statuses from figures already published on this site; 2025 has only **single,
15,750**, the workbook's own row 25. The other four 2025 statuses are left blank
with a note to fill them from the form, and the harness asserts no other 2025
figure ever appears — a later edit cannot quietly guess one.

`tests/verify-return-review.mjs` now extracts 20 functions and runs 131
assertions, including a 2,880-ledger sweep that deliberately drives both `MAX()`
floors (900 ledgers push taxable income below zero, 960 push credits past the tax
they offset).

### The 1040 preview was first rebuilt as a flow map — superseded the same day

> **Superseded — kept for the reasoning, not as a description of the page.**
> This map's *structure* is what shipped; its *content* is not. It drew columns
> invented from the nine read lines, with two residual boxes. The shipped
> version keeps the structure and puts the workbook's fourteen subtotals in the
> boxes instead. The residual idea below did not survive, but the `op: 0` edge
> and the signed-settlement bug both did — those two are the part worth keeping.

`review/1040/index.html` drew the return instead of listing it, in the
reviewer view's visual language: boxes in columns, left to right, each traceable
back to what produced it and forward to where it lands. Selecting a box inked its
lineage; six disclosure levels collapsed the map from the left. The stat tiles,
the three nested share-of-AGI bars and the payments split bar went at this point
and have not come back.

**The columns are deliberately not the flow map's columns.** That page starts at
source documents because it runs on a sample whose workpapers are known. A filed
1040 does not say which W-2 fed line 1z, so reproducing those columns here would
have meant inventing them or rendering most of the canvas as "not in this file".
The columns are the ones nine lines can carry: Income → AGI → Deductions →
Taxable income → Tax, credits & payments → Settlement.

Two boxes are **residuals** rather than readings — `other` (what reached AGI that
wages and interest do not explain) and `otherDed` (what came off between line 11
and line 15, which on a 2024 return is the QBI deduction). Both are labelled
`Derived`, both show the subtraction that produced them, and the harness asserts
no derived box is ever dressed as a line read off the return. `otherDed` is not
drawn at all when the arithmetic does not demand it.

The rebuild also added the reconciliation the old layout had no room for: three
checks that say whether the nine lines agree with each other, the most useful
being that `withholding + credits − tax` does not always equal line 35a — which
is not an error, just evidence the return has more on it than these nine lines
cover.

Preserved byte-for-byte through the rebuild: the eight pinned model functions,
the pdf.js subresource-integrity machinery, the intake, the source panel, and the
chrome. The rebuild was scripted rather than hand-edited so those blocks could be
spliced rather than retyped.

**One real bug, caught by the new sweep and not by the sample.** The settlement
box first stored `Math.abs(settlement)` so it could be titled "Balance due"
without a minus sign, while its three inbound edges still summed to the signed
value. Every return that owed displayed arithmetic that did not add up. The
sample refunds, so nothing on screen ever showed it. The 768-return sweep failed
on 456 of them immediately.

`tests/verify-return-review.mjs` grew from 8 extracted functions to 21 and now
also asserts provenance, the identity sweep, geometry across all six levels,
tracing, and reconciliation.

### A whole-site link harness

`tests/verify-links.mjs` is new and checks the whole site rather than one page:
links, nav consistency, current-page markers, the three shared stylesheets,
`sitemap.xml` against disk, and the "to be built" backlog. **It was
mutation-tested** — eleven deliberate breakages, all eleven caught. One of them
earned its keep immediately: the backlog check originally searched the whole of
`sitemap/index.html`, and since the footer there links to nearly every stub, a
delisted stub was still "found" and the check could never fail. It now reads only
the listing inside `<main>` and requires the `to be built` annotation.

## Previous session's work (26 September 2026)

Five groups, in the order they were done. Each is a sensible commit.

### 1. The return flow map — `review/flow-map/`

Decoded from a design-canvas export (`Main.dc.html` plus a React runtime) that
was already sitting in `review/` as a zip; the artifact URL it came from could
not be read. Rebuilt as one hand-authored file on the site's tokens and chrome:
27 nodes in five columns, 29 edges, five progressive-disclosure levels, lineage
tracing in both directions, three tabs.

`tests/verify-return-flow-map.mjs` extracts the model from the shipped file and
**re-derives the whole sample return from the rules** rather than reading its
numbers back — §1211(b), §469(i), §199A(a) and (b)(3) — then checks graph
invariants (one sink, acyclic, no edge running right to left) and, swept over
all five levels, that no two boxes overlap, nothing leaves the canvas, and every
drawn edge joins two placed boxes. That last class is the bug the tool-pattern
doc says only shows up when you look at the page, made mechanical.

Five corrections to the mockup, all recorded in `docs/review-service.md`. The
substantive one: the sample is a **2025** return but carried the 2024 form's line
numbers. Verified against the IRS PDF (Cat. No. 11320B, rev. 9/5/2025) — AGI is
**11a**, the deduction **12e**, QBI **13a**, capital gain **7a**. Pinned in the
harness so it cannot silently regress. The other four were two contrast failures,
a dead "open the PDF" button, and a level control that clipped on a phone.

Files: `review/flow-map/index.html`, `tests/verify-return-flow-map.mjs`,
`docs/review-service.md`, plus registry entries in `sitemap.xml`,
`sitemap/index.html`, `docs/site-architecture.md`, `tests/README.md` and a card
on `review/index.html`.

### 2. "Paid" became "premium", and the CTA changed

> **Superseded on 27 September.** The topbar CTA was removed entirely and
> replaced by the Consulting tab; `.topbar-cta` no longer exists. The "premium"
> vocabulary below still stands.

The topbar CTA was relabelled **"Contact us for more info"** everywhere — 28
pages plus `assets/partials/topbar.html`. Link target unchanged.
`contact/index.html` was widened to match what the CTA then promised: premium
services, what they cost, training. Its mail subject went from `Training
enquiry` to `Enquiry`.

The service tier is "premium", not "paid", across `index.html`, the four real
`/review/` pages, and the docs. **Tax-context uses of "paid" were deliberately
left alone** — "what you already paid", "Real estate tax paid in 2025", "The
related tax paid", and the verbatim statute text in two tool pages. A blanket
replace corrupts those.

The longer label would have worsened a documented 390px overflow, so that was
fixed at the same time: `.topbar nav ul` wraps and `.topbar-cta` was
`white-space: nowrap`, so the button dropped to its own line intact. Verified at
390px and 320px. The wrap on `.topbar nav ul` survives; the `.topbar-cta` rules
do not.

### 3. The textbook became the visualized tax guide

*Fundamentals of Federal Taxation*, the open-access Pressbook, is gone from the
site: the page content, the outbound `wisconsin.pressbooks.pub` link, and the
descriptions on `about/`, `index.html`, `learn/` and `training/`.
`learn/textbook/index.html` is now "The visualized tax guide", a to-be-built
page carrying the full convention for those — `noindex`, removed from
`sitemap.xml`, marked "to be built" on `/sitemap/`. The nav label is
"Visualized tax guide" in all 28 footers plus the partial.

### 4. A logo

`assets/img/logo.svg` is the lockup: the symbol, the wordmark, and **one shared
ledger rule** they both stand on. `logo-mark.svg` is the symbol alone;
`favicon.svg` is the symbol on a filled tile. The symbol is three ascending
columns on that rule — the bracket staircase the tools draw — with the tallest
split by a gap and a lighter tip, which is the part-to-whole bar.

It replaced a favicon that was "TV" in **Arial** on a navy-to-teal gradient, none
of which is in the palette. The topbar now inlines the symbol so it takes
`currentColor` and follows dark mode; the wordmark there stays live HTML text.

Two things in those files are load-bearing and are commented as such: the
wordmark is pinned with `textLength="124.47"` (measured — Georgia is 132.7, so
without it the word runs past the rule), and the root carries both
`fill="currentColor"` and `color="#0f5e52"` so the file is themed when inlined
and still accent-coloured when loaded standalone.

### 5. Documentation

`docs/review-service.md` gained a full flow-map section; `docs/site-architecture.md`
gained "The brand mark" and the new `/img` tree; `tests/README.md` gained the
flow-map row and a note that two harnesses re-derive from rules rather than a
workbook tab.

### Verification at the end of the session

All five harnesses pass. 980 local links resolve, none broken. Topbar and footer
are byte-identical across pages apart from the per-page `aria-current` marker.

## Known debts

- **`verify-return-review.mjs` no longer matches `review/1040/` and dies on
  startup.** It extracts 29 functions by name; only `parseAmount` and
  `formatMoney` still exist, and the page says why in its own comment — they
  "are the only two functions that survived" the rewrite that replaced the
  return reader with the formula map. The harness was left pointing at the old
  page. This predates the dashboard-tabs work and was not caused by it, but it
  means the 1040 preview currently ships with **no** model verification, while
  `verify-return-flow-map.mjs` still passes on its own page. Either rewrite it
  against `flowCompute`/`returnNodes` as they now exist, or delete it and say
  so — a harness that cannot run is worse than none, because the checklist in
  `tests/README.md` still lists it as if it does.
- **The SALT assertion in `verify-return-flow-map.mjs` is a statement about
  current law, not arithmetic.** The sample's 20,800 is under the amended $40,000
  joint cap and over the original $10,000 one, and the whole Schedule A chain
  depends on it. Re-verify against the current Schedule A instructions.
- **`learn/textbook/` now holds a page called "Visualized tax guide".** The URL
  was kept so the published link does not 404 — GitHub Pages cannot redirect, and
  `learn/guides/` already exists so a "guide" path would read confusingly beside
  it. Renaming is a one-pass change across ~30 hrefs if you want it.
- **The topbar wordmark is live HTML text, not the lockup.** Deliberate: live text
  matches the headings and stays selectable, translatable and responsive. If the
  ruled lockup is wanted in the header instead, that is one pass over the 29
  chrome copies and trades live text for a fixed-ratio SVG.
- **`tokens.css` points at `docs/design-system.md`, which does not exist.** The
  contrast table it tells you to check before changing a colour has never been
  written. Pre-existing.
- **The footer does not list the three new tools.** It is hand-duplicated into
  every page, and still lists only the Income Tax Ledger under Tools. It does not
  list `review/flow-map/` either. Per CONTRIBUTING that change is its own PR
  touching all of them. Worth doing before the page count grows further.
- ~~**The topbar CTA wraps and overflows its border at 390px.**~~ Moot since
  27 September: there is no CTA button. `.topbar nav ul` still wraps.
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
