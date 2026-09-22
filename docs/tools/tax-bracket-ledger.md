# Income Tax Ledger — Tool Docs

*Interactive 2025 US federal income-tax bracket simulator, built for classroom use. Self-contained page (`tools/tax-bracket-ledger/index.html`) sharing only the site's topbar/footer chrome — no build step, no dependencies beyond Google Fonts.*

## What it is

A single-page tool that lets a student set a taxable income (slider, text field, or preset buttons) and immediately see how the 2025 US federal progressive tax formula applies to it, for a single filer:

**total tax = Σ (dollars taxed within each bracket × that bracket's rate)**

The page updates everything live as the income changes: the dollar amount of tax owed in each bracket, the running total, the effective vs. marginal rate, and after-tax income.

## Data

2025 IRS federal income tax brackets, single filer (rates apply to *taxable* income, after deductions):

| Rate | Bracket |
|---|---|
| 10% | $0 – $11,925 |
| 12% | $11,925 – $48,475 |
| 22% | $48,475 – $103,350 |
| 24% | $103,350 – $197,300 |
| 32% | $197,300 – $250,525 |
| 35% | $250,525 – $626,350 |
| 37% | $626,350 and up |

Source: Tax Foundation, "2025 Tax Brackets and Federal Income Tax Rates." Educational simulation only — not tax advice.

## Layout

- **Left rail:** taxable-income input (text field + slider, synced), six preset amounts ($25k–$750k), and a stat block (total tax owed, effective rate, marginal rate, after-tax income).
- **Bracket breakdown panel:**
  - A bar chart — one bar per *reached* bracket, x-axis grouped by that bracket's income range, bar height = dollars of tax owed from that bracket, value labeled above each bar.
  - A stepped line with dots overlaid on the same chart, on a fixed 0–40% secondary axis at right, tracing the **marginal rate** climbing bracket to bracket (10% → 12% → 22% → 24% → 32% → 35% → 37%) — this is a separate encoding from the bar heights, since a bracket's dollar contribution and its rate don't move together (bracket widths differ).
  - A legend identifying each bracket's color.
  - A collapsible bracket-by-bracket table spelling out the arithmetic for every bracket: range, dollars taxed in that bracket, the calculation ("$X × rate% = $Y"), and tax owed — including brackets not yet reached (shown dimmed, $0).
- **Second panel — "Tax owed vs. taxable income":** a line chart of total tax owed as income runs from $0 to $800,000. The curve is piecewise-linear and drawn exactly (not sampled), since the slope is constant within a bracket and only changes at bracket boundaries. Faint dashed guides mark each bracket boundary (so $48,475 etc. are visible, not just round $100k ticks), a persistent marker chip tracks the income set on the left, and hovering anywhere on the curve shows the tax owed at that income.

## Design notes

- Built against Anthropic's `dataviz` skill: an 8-hue CVD-safe categorical palette (one hue per bracket, validated for colorblind-safe adjacent contrast), fixed mark specs (rounded bar ends, 2px gaps, hairline gridlines), and direct labels so values don't rely on color alone.
- Full light/dark theme support via its own CSS custom properties (`--surface`, `--page`, `--ink`, `--accent`, `--b1`…`--b7`, deliberately namespaced apart from the site-wide `--tv-*` tokens), switching with `prefers-color-scheme` and honoring an explicit `data-theme="dark"` override if the host page sets one.
- Responsive down to mobile width (390px): the layout collapses to a single column, the bracket table scrolls horizontally in its own container, and nothing else overflows the viewport.
- No build tooling — its chart/interaction logic is one inline `<script>` block; charts are hand-built SVG (vanilla JS, `document.createElementNS`), not a charting library. Only the topbar/footer chrome and their stylesheets are shared with the rest of the site — the tool's own `<style>`/`<script>` are never touched by shared-asset changes.

## History

Built iteratively:
1. Slider input + stacked-column bracket breakdown.
2. Added explicit per-bracket calculation text and a bracket table.
3. Added a dotted-texture "tax owed" sub-slice inside each bracket segment (later removed — see below).
4. Added a hover tooltip showing tax-from-bracket as a % of total income.
5. Hid unreached brackets entirely rather than just fading them.
6. Added the "tax owed vs. taxable income" line chart, with bracket-boundary guides.
7. Replaced the single stacked "tax owed" column with a categorical bar chart (one bar per bracket, x-axis = income range).
8. Added the marginal-rate step-line/dots overlay on the bar chart, on its own right-hand axis.
9. Removed the original left-hand "ladder" column chart (which showed where the income fell across the full $0–$800k range) to simplify the panel down to the bar chart alone.
10. Moved from a standalone root-level file into `tools/tax-bracket-ledger/index.html` with shared site chrome, as part of the site-wide restructure (see `docs/site-architecture.md`).
