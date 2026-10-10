# Home-Sale Exclusion (IRC §121)

`tools/section-121-exclusion/index.html` · harness `tests/verify-section-121-exclusion.mjs`

> You exclude up to $250,000 ($500,000 joint) of gain on the sale of your home if
> you owned and lived in it for 2 of the last 5 years and have not used the
> exclusion in the last 2. Fail one of those tests because of a job change, health
> or an unforeseen event and the cap is prorated: limit × shortest period ÷ 24
> months.

This is the first tool built from a **decision tree plus charts** instead of a
chart alone, and the first with no ACCTG 410 workbook tab behind it. The
standalone page it was ported from lives in `_source/121-decision-tree/`
(gitignored, kept for reference).

## Designed for tax professionals

The page is a workpaper, not a quiz:

- **Dates, not months.** Enter the acquisition, sale, occupancy and rental dates; the
  tool computes the five-year window, the days owned and used, and the exact days
  since any earlier §121 sale. Up to two main-home periods; overlapping periods are
  counted once.
- **The answer first.** A sticky result bar keeps the verdict (full, reduced, none),
  the excluded and taxable amounts and the cap in view while you work through the tests.
- **Evidence on every test.** Each step in the tree shows what the facts say ("456 days
  used as a home (730 needed)") with a pass/fail mark that does not rely on colour.
- **"What would change this."** Plain statements of what drives the result and, for a
  reduced exclusion, the sale date that would meet the 730-day tests.
- **The five-year window** drawn as a timeline: owned, lived there, not a main home, the
  two-year look-back and any earlier §121 sale.
- **Pin as baseline** to compare a changed fact (a later sale date, another period)
  against the first answer.
- **Workpaper.** A plain-text record of facts, tests with authority, computation and
  result: copy it into the file or print it (the print stylesheet prints only the
  workpaper). **Copy link** carries every input in the URL hash.
- **Nonqualified use is modelled** (it was a limitation in the first version), with the
  statute's own exceptions applied automatically.
- Validation messages say what is ignored and why, instead of silently recomputing.

## Why a tree and a chart in one page

§121 is gates followed by a number. The tree answers *why you land where you do*
(which test you failed, and whether a safe harbor rescues it); the chart answers
*how much that is worth*. Changing one input moves both, which a separate tree
page and calculator cannot show.

The rule that keeps the combination honest: **one `model()` function produces both
the path and the dollars.** The tree highlight, the chart and the readouts all read
its result, so they cannot disagree. See `docs/decision-tree-tool-pattern.md` (to
be written) for when the combination is, and is not, a good idea.

This departs from `interactive-tool-pattern.md` §1 ("do not present the mechanism
as numbered steps"). The statute here *is* a sequence of tests, so the steps are
kept, but they are the page's control surface, not a restated calculation.

## Model

```
window   = the 5 years ending on the sale date
owned, used = days inside the window (a period A to B is B − A days)
shortest = min(owned, used, days since last §121 sale if any)
reduced  = fails ownership (<730), use (<730) or the 2-year look-back
cap      = limit                              if it qualifies
         = limit × min(shortest, 730) ÷ 730   if reduced and the sale is by
                                              reason of job, health or an
                                              unforeseen event  (Reg. 1.121-3(g)(1))
         = 0                                  otherwise
nonqual  = (gain − depreciation) × nonqualified days ÷ days owned   §121(b)(5), after (d)(6)
           (days from 1/1/2009 only; not the part after the last day used as a home)
excluded = min(gain − depreciation − nonqual, cap)                  §121(c)(1), (d)(6)
taxable  = depreciation + nonqual + (gain − depreciation − nonqual − excluded)
limit    = 250,000 single/MFS; 500,000 joint (all of §121(b)(2)(A) met) or
           surviving spouse within 2 years (§121(b)(4))
```

Steps 1–6 and A–D in the tree are the statute's order; the path is
`1 → 2 → 3 → 4 → 5 → 6` for a qualifying sale and `… → A → B → C → D` for a reduced
one. A tie between the cap and the gain after depreciation is named as the cap.

The chart is exact, not sampled: the cap is piecewise linear with knots at 0, 24
and the axis end, and the exclusion curve adds a knot where the cap meets the
excludable gain (`24 × gain ÷ limit` months; the axis is months, 24 months = 730 days).

**Judgement calls to confirm:** a prior §121 sale exactly two years before the sale is
treated as outside the 2-year period (one day later is inside); days are counted as
end − start; the window is the five years ending on the sale date, same month and day
(29 February falls back to 28 February).

## Verification

`tests/verify-section-121-exclusion.mjs` extracts `model`, `niceCeil` and `geom`
from the shipped page and asserts:

1. date arithmetic and the counting convention;
2. the regulation's own worked example (Reg. §1.121-3(g)(2): 365/730 × $250,000 =
   $125,000) and the cap at every length;
3. the path for every branch of the tree, and the 730-day and 2-year boundaries to the day;
4. nonqualified use: the allocation, nothing before 2009, nothing after the last day used
   as a home;
5. a 233,280-combination sweep over dates of the identities above, including that every
   dollar of gain is either excluded or taxable;
6. the chart marker lying on the drawn polyline across 384 states;
7. the page: all 12 tree steps present, every quotation found word for word in the
   embedded source panel, the panel containing the two passages the extractor used to
   drop (see below), and the workpaper, timeline and share controls present.

The harness was checked by mutation: changing the ownership test, the nonqualified
allocation base or the after-last-use exception each makes it fail.

## Source text

All quotations in the tree and the full-text panel were fetched from Cornell LII on
8 October 2026 and extracted with `docs/tools/extract-statute.py`; the tree's
quotations are copied from the extracted fragments by a script, never retyped.

The standalone page's quotations had been written from memory. A word-sequence
comparison against the fetched text flagged nine of its 20 quotations. Some flags
were formatting (headings, paragraph labels) and some came from the extractor bug
below, so the memory versions were not wholesale wrong, but they were unverified.
One citation was substantively off: "Treas. Reg. §1.121-3(c)(2)(i)" for the 50-mile
employment safe harbor is §1.121-3(c)(2)(i)–(ii), and the quote used (A)/(B)
labels where the regulation uses (i)/(ii). The §121(c)(1) lettering was correct.
All 20 quotations are now generated from the fetched text.

### Extractor fix

Building this panel exposed two bugs in `extract-statute.py` that silently dropped
text from the U.S. Code layout:

- an inline element (for example `<span class="date">May 6, 1997</span>`) closed the
  capture, so everything after it in the sentence was lost — §121(d)(6) ended at
  "May 6, 1997" and lost ", in respect of such property";
- `div.continuation` text that follows a list of sub-provisions was never captured —
  §121(d)(7) lost "then the taxpayer shall be treated as using …".

Both are fixed (capture now ends only at the element that opened it, and
continuations are rendered after the sub-provisions). **Panels generated before
this fix may be missing text.** Re-run the extractor against a fresh fetch for
§86, §111, §72, §170, §199A and §1 before the next term.

## Known limitations

- **Spouses whose ownership or use periods differ** are not modelled: the tool
  assumes both spouses share the same periods. When they differ, each spouse's
  separate limit is computed and added (§121(b)(2)(B)); the tool stops at Step 6
  and says so instead of showing a number.
- **Nonqualified use exceptions** for military/Foreign Service duty and temporary
  absences (§121(b)(5)(C)(ii)(II)–(III)) are not applied; enter only the periods that
  count. One not-a-main-home period is accepted.
- **Elections and special rules** in §121(d)–(g) (military/Foreign Service
  suspension, remainder interests, §1034 rollovers, expatriates) are in the source
  panel but not modelled.
- **Dollar limits** are the figures in the text retrieved on 8 October 2026.
  Congress has considered changes; re-check §121(b) before each term.
- The embedded source text is a static copy with a retrieval date and a visible
  "verify before relying" note.
- The tree is narrower than the full regulation: vacant land, home-office
  allocation (Reg. §1.121-1(e)) and temporary absences are in the source panel only.
