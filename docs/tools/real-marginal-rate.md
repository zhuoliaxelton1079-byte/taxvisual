# Sample memo: Your real marginal rate in retirement

`samples/real-marginal-rate/index.html` — the first explorable memo, and the
template for planning-package deliverables.

## The one idea

A retiree's tax bracket understates what the next dollar of income costs,
because four rules key off the same income: the brackets, the taxation of
Social Security benefits (§86), the senior deduction phase-out (§151(d)(5)(C),
2025–2028) and the Medicare premium surcharges (IRMAA). The memo splits the
real marginal rate into the part each rule causes, and finds the Roth
conversion that saves the most against an expected later rate.

## Model

All in the page's script, as pure functions the test extracts by name:
`law2026`, `ssTaxable`, `taxOn`, `rateAt`, `irmaaTier`, `compute`,
`decompose`, `segments`, `cliffs`, `best`.

- Real marginal rate = b·(1+s)·(1+p): bracket rate b, extra taxable Social
  Security per dollar s (0, 0.5 or 0.85), senior-deduction loss per dollar p
  (0.06 per qualifying person in the phase-out).
- `segments` finds every kink to the dollar by bisection; each range's rate is
  taken inside the range, never at a boundary dollar that straddles a kink.
- IRMAA is a cliff, so it is not folded into the rate: it is shown as the
  premium jump at each threshold, and counted as a cost in `best`.
- `best` maximises hurdle·x − extra tax − extra surcharge over a $100 grid plus
  every kink and the dollar below every cliff. A naive "stop at the first
  dollar above the hurdle" rule is wrong: it stops inside the tax torpedo even
  when the cheap dollars past it make converting worthwhile.

## 2026 figures and sources

| Item | Value | Source |
|---|---|---|
| Brackets (MFJ / single) | 24,800 · 100,800 · 211,400 · 403,550 · 512,450 · 768,700 / 12,400 · 50,400 · 105,700 · 201,775 · 256,225 · 640,600 | Rev. Proc. 2025-32 |
| Standard deduction | 32,200 / 16,100 | Rev. Proc. 2025-32 |
| Additional, age 65+ | 1,650 per spouse / 2,050 single | Rev. Proc. 2025-32 |
| Senior deduction | 6,000 each, −6% of MAGI over 150,000 / 75,000 | IRC §151(d)(5)(C); Pub. L. 119-21 §70103 |
| Social Security thresholds | 32,000 / 44,000 joint; 25,000 / 34,000 single | IRC §86 (not indexed) |
| IRMAA thresholds | 218k · 274k · 342k · 410k · 750k joint; half for single | CMS 2026; SSA POMS HI 01101.020 |
| IRMAA amounts (monthly, per person) | Part B +81.20 · 202.90 · 324.60 · 446.30 · 487.00; Part D +14.50 · 37.50 · 60.40 · 83.30 · 91.00 | CMS 2026; SSA POMS |

Update `law2026()` and the expected values in
`tests/verify-real-marginal-rate.mjs` together each year.

## Known simplifications

Federal only; ordinary income only (no qualified dividends or capital gains);
standard deduction; both spouses 65+ and on Medicare; IRMAA uses 2026 tiers
for income that sets 2028 premiums. All stated on the page.
