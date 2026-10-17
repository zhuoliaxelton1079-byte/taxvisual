# Social Security explorable: design case study

Last updated: October 17, 2026.

The [shared explorable design guide](explorable-design.md) applies to all
TaxVisual interactive tools. This case study records the Social Security
pilot's implementation decisions, specific limits, and verification evidence.
Use the shared guide for the common experience and visual language.

The [Social Security Benefit Inclusion tool](../tools/social-security-inclusion/index.html)
is the first implementation. Its [tool documentation](tools/social-security-inclusion.md)
contains the model, source material, verification figures, and earlier history.

## Core concept

**The chart is the explanation and the workspace.** A visitor changes a fact,
sees the calculated consequence at the same location, and can investigate why
it changed. The experience should help someone explain the mechanism after
using it, rather than merely obtain a number.

The pilot answers one question: **How much of a Social Security benefit becomes
included in income as other income changes?** The answer is an amount included
in income, not income tax owed. Keep that distinction visible beside the result.

Use one shared chart workspace. Editable facts, their labels, the plotted point,
and the answer annotation belong together. Additional calculations, sources,
comparisons, and scope details are available through optional disclosures.

## Decisions and reasons

| Decision | Reason |
| --- | --- |
| Place fact controls on the chart dimensions they affect. | Reduces the need to translate between a form, explanatory prose, and a separate graphic. |
| Identify editable facts in blue and the calculated answer in purple. | Makes inputs and outputs distinguishable at a glance. Explicit labels and marker shapes reinforce the colors. |
| Attach the answer annotation to the current point with a connector and horizontal guide. | Connects the number to its position on the curve and its value on the vertical axis. |
| Put other income along the horizontal axis, with its slider aligned to that axis. | Makes the input-to-position relationship direct. |
| Keep a fixed $0-$120,000 other-income domain. | The native slider and the plot share one scale, and comparisons retain stable positions. |
| Place the benefit editor in a reserved upper chart band and link it to the ceiling through highlighting. | Associates the fact with the curve it controls while keeping controls clear of the plotted answer. |
| Keep the main explanation short and responsive to the current region. | Explains the current result without requiring the reader to process every rule at once. |
| Put detailed material in optional disclosures. | Supports both a quick explanation and a professional checking the calculation or authority. |

## Visual meaning

Color describes the role of information, rather than a filing status or a tax
bracket. Use these meanings consistently:

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Fact labels and small control text | `--fact-ink` | `#1c579e` | `#8bbcf3` |
| Editable controls and fact guides | `--tool-accent` | `#2a78d6` | `#3987e5` |
| Answer amount, current point, guides, and included-income bar segment | `--answer` | `#6d28d9` | `#c4b5fd` |
| Background behind the answer annotation | `--answer-wash` | `#f4f0ff` | `#252033` |

The full curve and pinned comparison remain neutral. The current answer uses a
circle; the pinned comparison uses a diamond. Keep the literal **Fact** and
**Answer** labels, so meaning does not depend on color alone.

Measured text contrast in the current implementation is approximately 7.04:1
and 8.78:1 for fact labels, and 6.35:1 and 8.53:1 for the answer, in light and
dark themes respectively. Small blue text uses `--fact-ink`; the brighter control
accent is reserved for controls and graphic marks.

## Interaction and model contracts

- Filing status and tax year sit in the chart's context row. Benefits and other
  income each have an exact number input, a slider, and $1,000 decrease/increase
  buttons. Keep the native HTML controls outside the SVG for reliable keyboard
  and assistive-technology behavior.
- Focus or hover highlights the associated chart marks. Slider focus must have
  the same connection as number-input focus.
- Clicking the exposed plot selects another other-income value. Left/right
  arrow keys on the chart change income by $1,000. Exact inputs remain available
  for fractional-dollar positions.
- Income is limited to $0-$120,000 and benefits to $0-$60,000 in this pilot.
  Clamp actions to these limits. The guided increase action reports the actual
  increment when less than $1,000 remains; the plus/minus buttons use a $1,000 step
  clamped to the available range.
- Preserve precise state at model boundaries; format displayed currency to
  cents where needed. A rounded label must not change the underlying scenario.
- The native income thumb travels exactly between the plotted endpoints. The
  current 16px thumb requires an 8px extension at each end of its track. Recheck
  that geometry if the thumb or slider styling changes.
- The model is the common source for the curve, marker, answer, explanation,
  comparison, and calculation details. Keep calculations out of separate
  presentation-only copies.
- Calculate a finite income change by evaluating the model at both endpoints.
  A local slope multiplied by the change can give a wrong answer when the
  change crosses a threshold or the benefit ceiling.
- Derive boundary actions from actual slope changes. Include the small-benefit
  flat region and the fractional-dollar ceiling; omit irrelevant chart knots.
- A pinned comparison holds benefits, filing status, and tax year fixed.
  Changing any of those starts a new baseline. Changing other income preserves
  the baseline. Switching years preserves the entered facts.

The provisional-income scale is the same horizontal position expressed as
other income plus half the benefit. Keep this relationship visible; it is not
an independent second variable.

## Responsive layout and accessibility

Reserve measured space for HTML controls and annotation text. On wider screens,
place the answer beside its point and clamp it within the chart. On narrow
screens, use a reserved annotation band inside the chart scene, connected to the
point below. Keep the benefit editor, answer, axis labels, and income editor
clear of each other.

The SVG adapts its viewBox to the available width so labels retain readable
sizes. The page and chart should fit a 320px viewport without horizontal
scrolling. Keep visible focus states, explicit input labels, a generated chart
description, reduced-motion support, and a polite result announcement on
committed changes rather than every frame of a slider drag.

Hover guides are decorative and must use `pointer-events: none`; otherwise they
can intercept the click intended for the plot. Hover information supplements
the exact inputs and readable answer.

## Tax years and maintenance

As of this reference date, the tool supports **2025 (most recent)** and
**2026 (upcoming)**. These are the product's year labels: the previous and
current calendar years. The selected year's reviewed data comes from
`YEAR_RULES` in the tool page.

The displayed pair rolls forward with the calendar. A year without reviewed
rules appears as **review pending**, is unavailable for calculation, and does
not silently reuse another year's data. The tool retains a reviewed year for
calculation when necessary. Displaying an upcoming year does not claim that its
final IRS publication is already available.

For each annual update:

1. Check the official rules, formula, supported situations, and exclusions.
2. Add explicit reviewed year data and update the model if the law requires it.
3. Update the catalog label in [tools-data.js](../assets/js/tools-data.js),
   scope information, source/review dates, and year notes.
4. Check that year switching preserves facts and uses the selected rules.
5. Add dated entries to the tool's public update log and developer documentation.
6. Run the checks below before publication.

The public log records user-visible changes and rule reviews. The developer
log records implementation details. Preserve the difference between a layout
change, a scope review, and a verified rules update.

## Verification

Run the existing checks from the repository root:

```powershell
node tests/verify-social-security-inclusion.mjs tools/social-security-inclusion/index.html
node tests/verify-links.mjs
```

The model harness checks the original workbook cases, curve agreement, boundary
behavior, finite changes near the ceiling, reviewed years, and unreviewed-year
rejection. Preserve these independent expected results during visual changes.

Browser validation on October 17, 2026 covered 60 geometry cases: widths of
320, 390, 768, 1024, and 1440px; benefits of $0, $1, $7,200, and $60,000; and
other income of $0, $36,000, and $120,000. It also checked keyboard controls,
direct plot interaction, slider alignment, annotation collisions, light/dark
contrast, and browser errors. These were browser checks performed during the
pilot, not a claim of a committed automated browser suite.

For later changes, also check small-benefit plateaus, fractional cap positions,
invalid/empty inputs, year rollover, baseline resets, and source disclosures.

## References and related files

- [Model and tool history](tools/social-security-inclusion.md).
- [Shared interactive-tool pattern](interactive-tool-pattern.md).
- [Verification harness](../tests/verify-social-security-inclusion.mjs).
- [Awesome Explorables](https://github.com/blob42/awesome-explorables): the
  starting collection used for inspiration.
- [Bret Victor: Explorable Explanations](https://worrydream.com/ExplorableExplanations/):
  connect editable assumptions, models, explanations, and evidence.
- [Nicky Case: Explorable explanation patterns](https://blog.ncase.me/explorable-explanations/):
  introduce a small experiment and build understanding through interaction.
- [Tangle](https://worrydream.com/Tangle/): reactive text and editable values.
- [Red Blob Games: A* introduction](https://www.redblobgames.com/pathfinding/a-star/introduction.html):
  connect interaction directly to the represented mechanism.

The implementation remains plain HTML, CSS, JavaScript, and SVG. These references
inform the interaction design; the current tool uses no explorable framework.

## Reference update log

- **2026-10-17:** Created this reference for the chart-integrated facts/answer
  design, including year maintenance, accessibility, and verification contracts.

- **2026-10-17:** Made the shared guide the reference for all interactive tools;
  retained this file as the pilot-specific case study.
