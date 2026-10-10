# The workpaper kit

*The shared layer that turns a calculator into something a tax professional can use
in a file: an answer that stays in view, the evidence behind it, a way to compare, a
record to keep. First built for the §121 tool, extracted for QBI and the charitable
limits.*

Files: `assets/css/workpaper.css` (look), `assets/js/workpaper.js` (behaviour),
`tests/verify-workpaper-kit.mjs` (checks). A tool links both and supplies the rest.

## What a tool gets

| Piece | Markup | Behaviour |
|---|---|---|
| Sticky result bar | `.wp-result` with `.wp-verdict` (`#wpChip`, `#wpWhy`), `.wp-figs`, `.wp-pin` | The verdict, one sentence of why, and the two or three figures that are the answer, kept in view while the reader scrolls. Static below 980px |
| Pin as baseline | `#wpPin`, `#wpUnpin` | `Workpaper.pin` holds one baseline; figures show `+$1,200 vs baseline` via `Workpaper.delta` |
| What would change this | `ul.wp-insights#wpInsights` | `Workpaper.fillInsights(ul, [[kind, text], …])`, kind `ok`, `bad`, `warn` or `info`; each carries a glyph, so status never rests on colour |
| The computation | `table.wp-table` with `tbody#wpRows` | Every line with its authority; the line that binds gets `tr.bind`, the answer `tr.key` |
| Workpaper | `pre.wp-memo#wpMemo` | A plain-text record the tool builds from its model; copied or printed |
| Actions | `#wp-copy`, `#wp-print`, `#wp-link`, `#wp-status` | `Workpaper.init({ memo })`. Print hides everything except the workpaper |
| Shareable state | none | `Workpaper.hash.save({…})` after every render; `Workpaper.hash.load()` before the first |
| Typed numbers | `.wp-num` beside each slider | Professionals type figures. The slider stays, its range widens when a typed value exceeds it |
| Examples and reset | `select#example`, `#wpReset` | A tool's own named scenarios, including the workbook's |
| Messages | `ul.wp-msgs#wpMsgs` | `Workpaper.fillMsgs(ul, { block, warn })`: what is ignored and why, never a silent recompute |

## The rules

1. **The kit never computes tax.** It moves text and state. Every figure on the page
   comes from the tool's own `model()`; the insights, the table and the workpaper only
   *read* it, so the harness that proves the model still covers what the page says.
2. **The model is not edited to add the layer.** QBI and charitable gained this layer
   with their `model()`, `knots()` and `bindingFor()` untouched, and their harnesses
   unchanged and passing. The page's original `render()` became `renderCore()`; a new
   `render()` calls it and then the workpaper layer, so every existing handler still works.
3. **One source for each fact.** The result bar, the table, the insights and the
   workpaper read the same result object. Where the page already had readouts (the
   QBI and charitable rail stats) they were *moved* into the bar with their ids intact,
   so the screen-reader announcement keeps working.
4. **Levers are measured, not guessed.** "Each extra $10,000 of W-2 wages adds $805" is
   `model(state + 10,000).ded − model(state).ded`, computed on the spot.
5. **State a limitation where the reader will see it** (`wp-msgs`), not only in the
   documentation.

## Adding the kit to a tool

1. Link `../../assets/css/workpaper.css` after `components.css` and
   `../../assets/js/workpaper.js` before the tool's own script.
2. Add the markup above. The result bar goes between the masthead and the layout.
3. Rename the page's `render()` to `renderCore()`; write `extras()` (chip, why, insights,
   table, memo, hash) and a new `render(){ renderCore(); extras(); }`.
4. Wire `Workpaper.init({ memo })`, the example select, reset and pin.
5. The kit reads the page's own tokens (`--tool-surface`, `--page`, `--tool-ink`,
   `--ink-soft`, `--ink-muted`, `--gridline`, `--border`, `--tool-accent`) and defines its
   own `--wp-*` status colours for both dark-mode hooks.
6. Run `node tests/verify-workpaper-kit.mjs`: it checks every tool that links the kit
   for the ids the script expects.

## Not yet shared

The §121 tool predates the kit and carries its own copy of these pieces under other
class names. Moving it onto the kit is a mechanical follow-up. The decision-tree
specifics (the tree, evidence chips, the timeline) stay in that tool until a second
tree tool shows what is general.
