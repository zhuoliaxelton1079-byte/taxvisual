# Retirement Contribution Limits (every plan at once)

`tools/retirement-contribution-limits/index.html` · harness `tests/verify-retirement-contribution-limits.mjs`

> There is no single cap across all plans. The total is the sum of what each
> plan allows after the limits that cut across plans: **one elective-deferral
> pool per person** (shared by every 401(k), 403(b) and solo 401(k)) and **one
> §415(c) limit per employer** (shared by a SEP and a solo 401(k) of the same
> business). A governmental 457(b) and the IRA each have their own limit, and
> the plan contributions lower the MAGI that decides the IRA.

Ported from the **"Retirement Contribution Limits"** tab of the ACCTG 410
workbook (2025). The workbook's exercise is the default scenario, and its
values are the harness check figures.

## Layout (shared explorable design)

- **Facts panel** (blue): year, filing status, age, spouse covered (married only),
  other income; *Employer 1* group (401(k)/403(b) label, wages, match rate,
  match limit, governmental 457(b) offered); *Side business* group (net profit).
  Focusing a fact highlights the limits it feeds.
- **Answer band** (purple): the maximum across all plans, the binding limits
  named in a sentence, and the split by plan.
- **Spouse and spousal IRA (married filing jointly only).** The Spouse fact
  group has age, compensation, and pre-tax deferrals to the spouse's own
  workplace plan.
  - The spouse's pay is added to joint MAGI and their deferrals come out of
    it. Deferrals > 0 make the spouse covered (§219(g)(5)), in addition to
    the coverage checkbox.
  - Each spouse has their own IRA limit and age catch-up. Under §219(c), the
    two IRAs together are capped at combined compensation. Each spouse covers
    their own IRA from their own pay first; spare pay tops up the taxpayer,
    then the spouse. This works both ways: a non-working taxpayer can be
    funded by the spouse.
  - The spouse's deduction range follows the spouse's own coverage. A spouse
    who is not covered, with a taxpayer who is, uses the spouse-covered range
    (§219(g)(7)). Roth uses the same joint MAGI.
  - Adds a fifth bucket (Spousal IRA, step 7 of the order), a `sira`
    pop-up, MAGI ledger rows, a spouse sentence in the phase-out answer, and
    calculation-table rows.
  - The spouse's own 401(k)/403(b) limits are still not modelled; only their
    deferrals' effect on MAGI and coverage is.
- **Target lever and the best order.** A "Your target contribution"
  planning lever (an input plus a slider, and a "Use the maximum" link) sits
  at the top of the facts. The target is the taxpayer's own money, including
  what their business contributes as employer; the Employer 1 match comes on
  top. Its default is the maximum (`target:null`), which reproduces the
  workbook. `allocateTarget(r, target)` fills a waterfall, each step up to
  what it allows at the maximum:
  1. Employer 1 deferral up to the full match
  2. The rest of the Employer 1 deferral
  3. Governmental 457(b)
  4. Business employer share
  5. Solo 401(k) deferral
  6. IRA: deductible, then Roth, then nondeductible, using the MAGI that
     steps 1–5 leave

  Because every step is capped at its maximum-scenario value, any target
  stays inside every cross-plan limit. The buckets keep the limit as the
  bucket and fill with the allocation. Room the target leaves is "open"
  (light, outlined); hatched is still room another limit blocks. The step
  list shows each step's amount, greyed when the step is zero or not
  available. The MAGI ledger and phase-out chart follow the allocation. The
  calculation table stays the workbook maximum. A note flags unclaimed match.
- **Plan buckets (current main visual).** There is one bucket per *plan*,
  four in all, on one dollar scale: Employer 1's 401(k)/403(b), the
  governmental 457(b), the business's SEP or solo 401(k), and the IRA.
  - An employer plan is **one** bucket because §415(c) caps employee
    deferrals and employer money together. Its capacity is the §415(c) limit
    (a solid line) plus a dashed catch-up zone above the line, because
    catch-up is not an annual addition.
  - The fill runs bottom-up: deferrals, then the match or employer share,
    then hatched room an inner limit blocks ("after-tax only" for
    Employer 1), then catch-up above the line.
  - The separate limits are dashed marks inside the bucket (§402(g) for the
    401(k), the 20% cap for the business), with labels at the side. Labels
    within 14px of one already drawn are dropped.
  - Chips under each bucket break out each part against its own limit (you
    defer $X / limit, employer match $X / limit; employer share / 20% limit;
    you defer / pool left). Each chip opens its own pop-up.
  - **The per-person deferral pool** is a strip spanning the two buckets that
    share it, so those buckets sit side by side: Employer 1 and the business.
    The bar splits the one §402(g) + §414(v) pool into the 401(k)'s
    deferrals, the solo 401(k)'s deferrals and the room left. Its catch-up
    split matches the buckets' §415(c) split. Arrows point into each bucket,
    and a "Used up / $X left" pill and a pool pop-up sit on the strip. An
    aside says the 457(b), the IRA and all employer money are outside the
    pool. The bucket chips read "You defer (pool)".
  - The pop-ups are keyed `pool`, `match`, `e415`, `g457`, `solo`, `bER`,
    `b415`, `ira` and `intro`.
  - The bullets below describe the first bucket version (one bucket per
    contribution). The pop-up and plan-list behaviour carries over.
  - Each bucket's capacity is its own limit. The fill is the contribution
    that maxes everything out: purple for the taxpayer, light purple for
    catch-up, mid purple for Roth, teal for employer money. Unfilled room is
    grey when another plan used it (for example, the solo 401(k) bucket shows
    the pool already used in the 401(k)), or hatched when another limit
    blocks it.
  - Under each bucket: "Defer / Employer adds / Business adds $X" and a state
    line (Full: … binds, or $X short: stopped by …).
  - Every limit is an inline explorable button ("Limit $34,750 ?"). It opens
    a native `popover` dialog showing that limit's calculation line by line,
    with citations, the binding line marked "← binds", and a why-note. There
    is a hidden-attribute fallback for browsers without popover support, and
    focus returns to the trigger on close.
  - A numbered contribution plan under the buckets says the same thing in
    sentences, with the same inline limit pop-ups.
  - Superseded the column chart described next.
- **One column chart for every contribution and limit (superseded).** There is one column
  per row of the workbook's "Which cross-plan limits bind?" table (B138–E143),
  grouped by header: across plans / Employer 1 / side business / IRAs. All
  columns share one honest-zero dollar axis.
  - Each column stacks the contributions at the maximum from the bottom up:
    employee money (purple), catch-up (light purple), employer money (teal),
    Roth (mid purple, IRA only), and blocked room (hatched) up to the black
    limit line. Catch-up outside §415(c) sits *above* the line, in a narrower
    bar.
  - Inline labels go inside a segment when it is tall enough (28px, or 40px
    for long names). Otherwise they move into a stack above the column, which
    always ends with "limit $X".
  - Under each column, aligned to it, is an inline technical note: title and
    authority, a Binding / Not binding / Not available pill, the amount used of
    the limit, a mini-ledger of the numbers, and a paragraph on the mechanism.
    The ledger for the business employer share includes the SEP vs. solo
    401(k) comparison.
  - The chart has a minimum width of 780px. Narrower screens get a labelled,
    keyboard-focusable horizontal scroller.
- **MAGI scene**: a ledger of workbook lines 6a–6g, then the phase-out chart.
  The chart shows the Roth line (solid) and the deductible line (dashed), MAGI
  before the plan contributions (dotted), and an arrow to MAGI after them. A
  sentence says what the shift restored. There is no MAGI slider, because MAGI
  is now derived.
- **Warnings**: the full match is not earned (with its cause), and the 2026
  Roth catch-up.
- **Disclosures**: the calculation table, which follows the workbook's step
  and line letters with the "why" text, and the scope, sources and limitations.

## Model (workbook cells)

```
Step 2  pool       = 402(g) + catch-up(age)                       B30–B32
Step 3  a = min(415(c), wages); c = rate × limit% × wages          B38–B40
        d = largest deferral with d ≤ pool, d ≤ wages,
            d + min(rate·d, c) ≤ a + catch-up                      B41 *
        e = min(rate·d, c);  f = d − min(402(g), a − e)            B43, B44 *
        g = d − f + e;  i = a − g                                  B45–B47
Step 4  b = profit × 92.35%; SS = 12.4% × min(b, wage base − wages)
        e = ½ SE tax; f = min(401(a)(17), profit − e)              B56–B60
        h = min(20% f, 415(c)); i = pool − d; j = min(415(c), f)
        k = min(i, f − h); l = min(k, catch-up − Step 3 f)
        SEP = h; solo = min(h + k, j + l); max = greater           B64–B75
Step 5  457 = min(402(g) + catch-up, wages − d) if offered         B81–B82
Step 6  MAGI = wages − pre-tax deferrals + profit − ½SE − business + other   B96
        IRA = min(limit + 50+ catch-up, wages + profit − ½SE)      B99–B101
        active = 401(k) total > 0 or business > 0                  B104
        deductible, Roth = phase(IRA, MAGI, range)  ($10 up, $200 floor)
        fill: deductible, then Roth, then nondeductible            B116–B119
```

\* **Deliberate differences from the workbook.** B41 is
`MIN(pool, wages, a − c + catch-up)`, which assumes the full match is earned.
When the full match alone nearly fills §415(c) (a rich match formula), the
workbook defers too little. At a 100% match on 80% of $40,000, it gives
$8,000 + $8,000 instead of $20,000 + $20,000; at a 200% match on 50% it gives
$0. The tool takes the largest deferral that fits. The sweep proves the
result equals B41 whenever B41 earns the full match within §415(c). B44 treats
catch-up as deferrals above §402(g) only. The tool uses the lower of §402(g) or
the §415(c) room, because catch-up can be deferrals over either limit
(§414(v)(3)). This is identical unless §415(c) binds on regular deferrals.

**Additions beyond the workbook:** 2026 limits (Notice 2025-67; §401(a)(17)
$360,000; SSA wage base $184,500). From 2026, the catch-up is treated as Roth
when wages exceed $150,000 (§414(v)(7)), so it does not lower MAGI. MFS lived
apart uses the single ranges.

## Checks

`node tests/verify-retirement-contribution-limits.mjs tools/retirement-contribution-limits/index.html`

The harness runs 41 checks:

- Published 2025 and 2026 figures.
- Every workbook step on the default scenario. Total 59,319.234; MAGI
  147,626.936; binding = pool, 20% employer limit and IRA.
- Variations: 457(b) on; no W-2 job (the solo 401(k) wins with 30,934.818);
  the 457(b) cut by pay; the wage base.
- §415(c) and the match edge cases.
- IRA phase-outs.
- The 2026 Roth catch-up.
- A sweep of 10,368 cases. It checks that every limit holds, the total adds
  up, the plotted points lie on the drawn lines, and the deferral equals the
  workbook's B41 where the workbook is self-consistent.

## Known limitations

- One person only. The spouse's plans and a spousal IRA are not modelled; on a
  joint return the spouse's income goes in "other income".
- Every plan is maxed, as in the workbook. A wage earner is therefore always an
  active participant, so the "spouse covered, taxpayer not" deduction range is
  reached only without wages or business income.
- The IRA compensation test uses wages before deferrals (workbook B100).
- Not modelled: SIMPLE plans, the 403(b) 15-year and 457(b) final-three-years
  catch-ups, tax-exempt 457(b) plans, after-tax and Roth deferral choices,
  controlled groups, the $400 SE-tax floor and the Additional Medicare Tax.
- The 2026 Roth catch-up uses current wages in place of prior-year FICA wages.

## Update log

- **2026-10-18:** First version: 403(b) / 457(b) / IRA, built from statute with
  no workbook tab. MAGI was entered directly.
- **2026-10-18:** Redesigned around the workbook's "Retirement Contribution
  Limits" tab. Added the W-2 401(k)/403(b) with the match, the side business
  (SEP vs. solo 401(k)), the governmental 457(b) and derived MAGI. The lanes
  are now the workbook's cross-plan limits. Removed: the two-person joint
  model, the 403(b) 15-year and 457(b) special catch-ups, tax-exempt 457(b),
  other-employer deferrals and the MAGI slider.
- **2026-10-18:** Replaced the six horizontal limit lanes with one column
  chart. Every plan's contributions and limit are in one view, with inline
  segment labels and a technical note under each column.
- **2026-10-18:** Replaced the column chart with buckets: one per
  contribution, the limit as the bucket and the contribution as the fill.
  Added limit pop-ups (inline explorable explanations) and a numbered
  contribution plan.
- **2026-10-18:** Combined each employer's deferrals and employer money into
  one plan bucket sized to §415(c), with catch-up on top. The separate limits
  (§402(g), the match, the 20% share, the pool left) are now marks and chips.
  This makes four buckets instead of six.
- **2026-10-18:** Added the per-person deferral-pool strip across the
  Employer 1 and business buckets, which now sit side by side, with an
  aside on what is outside the pool.
- **2026-10-18:** Added the target contribution lever and the six-step
  optimal order (`allocateTarget`). The buckets now show the limit as the
  bucket and the allocated contribution as the fill, plus open room. The
  harness has 11 new allocation checks: a hand-computed target ladder, the
  maximum reproduced, monotone steps, and caps.
- **2026-10-18:** Added spouse facts and the spousal IRA on joint returns:
  §219(c) combined compensation in both directions, §219(g)(7) ranges, and
  the spouse's pay and deferrals in MAGI. The spousal IRA is step 7. There
  are 10 new harness checks (62 in total).
- **2026-10-18:** Decluttered with inline text and pop-ups. Concept terms are
  `.tip` buttons (dotted underline) that open the same dialog as the limits.
  The new concept pop-ups (`INFO`) are `magi`, `phase`, `catchup`, `target`,
  `order`, `outsidePool`, `binding` and `rothCatch`.
  - The MAGI ledger table moved into the `magi` pop-up.
  - Bucket chip lists became one inline line ("you $X · match $Y").
  - State lines are short (Full / Maxed / $X more room).
  - The pool aside became a "what is outside it?" link.
  - Steps are one short line each, with "why this order?" by the heading.
  - Notes, the answer sentence, the facts notes and the phase answer were
    cut to one sentence plus a pop-up link.
  - Fixed the scope text that still listed the spousal IRA as not modelled.
