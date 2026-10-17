# Explorable design for all interactive tools

Last updated: October 17, 2026.

This is the shared experience and visual design reference for **all TaxVisual
interactive tools**, including calculators, ledgers, timelines, return
walkthroughs, and interactive samples. Apply it to new tools and as existing
tools are revised. The [Social Security case study](social-security-explorable-design.md)
records the first implementation; its dollar limits, steps, chart geometry,
and comparison rules are specific to that pilot.

The [implementation pattern](interactive-tool-pattern.md) covers model ports,
verification, and shipping. This guide governs the experience when older tool
layouts differ. It documents a shared direction; it does not claim that every
existing page has already adopted it.

## The experience

**Change a fact, see the answer in the same visual workspace, and explore why
it changes.** Each tool should help a reader explain one mechanism after using
it. Write its central question before choosing its controls or chart.

Treat the visual as the explanation: a curve for a threshold, a ledger for
stacking, a timeline for timing, or a flow diagram for eligibility. Keep editable
facts, the marks they affect, and the calculated answer together. Avoid a
separate facts card, results card, and chart repeating the same information.

| Workspace element | Shared purpose |
| --- | --- |
| Question and context | A short question plus filing status, tax year, or other context needed to interpret the visual. |
| Editable facts | Short, readable sentences with native controls next to the relevant axis, segment, date, or branch. |
| Visual mechanism | Show how the rule transforms the facts; keep context visible while highlighting the current scenario. |
| Answer annotation | An explicit **Answer** label, the result, one sentence explaining the active rule, and a clear connection to its mark. |
| Optional experiment | One useful action such as moving across a threshold, comparing a year, or pinning a scenario. |
| Scope and evidence | A compact visible scope summary and source link; calculation details, full limitations, and update history in disclosures. |

Facts and answers can occupy reserved bands within the workspace. They do not
need to sit inside an SVG or obscure the data. A connector, shared alignment,
and linked focus can preserve their relationship on a narrow screen.

## Shared visual language

| Role | Treatment |
| --- | --- |
| Editable fact | Blue label, value, control, and corresponding guide; use the literal **Fact** label where helpful. |
| Calculated answer | Purple result, active mark, and connector; use a restrained tinted background and an explicit **Answer** label. |
| Context or comparison | Neutral curve, inactive branches, baseline, grid, and secondary labels. Give comparisons a distinct shape or line style and a name. |
| Warning or unsupported state | Specific text and an icon or other noncolor cue, with a separate warning treatment. |

Color describes the role of information. Reinforce it with labels, position,
and shape. Purple identifies the current answer; it should not fill every
series or replace a palette needed to distinguish categories. Use an ordered
ramp for ordered values and a categorical palette for genuinely different
classes, with a separate cue for the current result.

Use the existing families, spacing scale, surfaces, and theme behavior in
[tokens.css](../assets/css/tokens.css). The pilot's exact fact/answer colors are
recorded in its case study. Centralize these roles when implementing shared
styles instead of copying new hex values into every page. Verify contrast on
each actual surface in both themes; the pilot's measurements do not certify
another tool.

## Visual appeal: recommended improvements

These are the priorities for the next visual pass, rather than a record of
completed changes across the site.

| Priority | Improvement | Concrete direction |
| --- | --- | --- |
| 1 | Make the answer the strongest focal point. | Use a 28-36px result as a starting target, a small Answer label, a light purple wash, and a short connector to the active mark. Keep surrounding prose quieter. |
| 1 | Remove competing boxes. | Use one workspace surface on the site's warm paper background. Separate related facts with spacing and fine rules; reserve a tinted inset for the answer instead of nesting bordered cards. |
| 1 | Improve type hierarchy and readability. | Keep IBM Plex Serif for the title and explanatory prose, Sans for controls and labels, and Mono or tabular figures for aligned amounts. Start with 16px body text and 12-14px chart labels at the rendered size; avoid shrinking a desktop SVG to fit a phone. |
| 2 | Give every control a visible destination. | Put an income editor by its axis, a date editor by its timeline event, or a deduction editor beside its stack. Highlight the affected mark on focus as well as hover. |
| 2 | Reduce chart noise. | Keep gridlines faint, directly label important thresholds, and use short annotations beside the active rule. Show one current explanation; disclose other rules on demand. |
| 2 | Make spacing and controls consistent. | Build gaps from the existing 8/16/24/32px spacing tokens. Align labels and values, standardize control heights, and give steppers and sliders generous hit areas and clear focus states. |
| 3 | Make comparisons easy to read. | Label Original and Current, show the actual difference next to the relevant mark, and retain a common scale. Explain any necessary scale change. |
| 3 | Use restrained, meaningful motion. | Use the existing short transition token for a settled scenario change when it clarifies movement. Keep dragging immediate, avoid decorative entrance animations, and honor reduced motion. |

Prototype these targets against real content before making them shared CSS.
A large amount, long filing-status label, or small chart region must still fit.
Use currency precision appropriate to the question; preserve exact model state
even when the displayed value is rounded.

## Choose the visual for the mechanism

Reuse the design language, while letting each tool use the representation that
best explains its rule. These are proposed directions for adoption.

| Tool or mechanism | Visual and useful experiment |
| --- | --- |
| Social Security inclusion | Curve with linked fact editors and an attached answer. Move other income across a real boundary. This is the implemented reference. |
| Income Tax Ledger | Aligned bracket rows or a stack with the current slice emphasized. Add income and show which dollars enter the next bracket. |
| Comprehensive tax calculation | An aligned stack of income types and tax layers. Change one income type and reveal the affected layer and total. |
| QBI deduction | Linked limit lines or aligned comparisons. Cross a phase-in boundary and identify the limit that controls the deduction. |
| Charitable deduction limits | Allocation bars sharing one income base. Change a gift class and show the allowed amount, binding limit, and carryforward together. |
| Annuity exclusion | A payment timeline with taxable and excluded portions. Move through the final recovery payment and show the partial-period change. |
| Home-sale exclusion | A timeline linked to eligibility conditions and the exclusion amount. Move a date and show the condition that changes. |
| Tax benefit rule | Candidate limits with the binding one emphasized. Change a refund or earlier deduction and explain which cap determines inclusion. |
| Return walkthroughs and flow maps | Connected source, line item, and total. Select an amount to trace its contribution while retaining surrounding context. |

Keep one primary question per scene. If a tool needs multiple scenes, preserve
the facts between them and make the change of question explicit.

## Interaction and model contracts

- Use one reviewed model as the source for answers, marks, explanations,
  comparison values, and detail tables. Keep view-specific arithmetic out of
  separate presentation copies.
- Offer exact input alongside a slider when a continuous range is meaningful.
  Use selectors, date fields, or other native controls when they fit the fact.
  Set units, bounds, and step sizes for that tool, and explain material limits.
- Align a slider's thumb travel with the plotted scale when they represent the
  same quantity. Keep scales stable during comparison where possible; a fixed
  domain is a tool-specific choice, not a universal requirement.
- Compute a finite change by evaluating both scenarios. A local marginal rate
  can misstate an experiment that crosses a boundary.
- Derive boundaries and annotations from the model. Use exact knots for
  piecewise-linear rules; choose appropriate geometry for discrete or nonlinear
  rules rather than assuming every tool is a curve.
- Define what a pinned comparison contains, what may vary, and what resets it.
  Show those choices to the reader. Do not copy the Social Security baseline
  reset policy into tools whose purpose is to compare filing statuses or years.
- Keep zero, an ineligible scenario, a capped result, and an unavailable year
  understandable. Each needs a useful explanation, without relying on a
  missing mark or an empty chart.
- Make guided experiments optional. Preserve manual exploration and provide
  an obvious way to restore a useful starting scenario.

## Responsive layout and accessibility

Reserve space for controls and annotations; measure their rendered height where
content varies. On small screens, move an answer into an adjacent band with a
connector rather than allowing it to cover the mark or detach into a distant
results card.

Aim for a workspace that fits a 320px viewport and remains usable with text
zoom. Reflow charts and annotations before shrinking labels. A dense ledger or
timeline may need a clearly labeled horizontal scroller; the page itself should
not overflow, and views sharing an axis must remain aligned.

Keep controls in semantic HTML, with visible labels, keyboard operation, and
focus indicators. Provide a current textual answer and a diagram description.
Hover adds detail; the essential result and interactions must work without it.
Keep decorative overlays from intercepting pointer events, and announce
committed result changes without flooding assistive technology during a drag.

## Tax years, scope, and update history

For tools governed by annual rules, display the most recent and upcoming tax
years using the site's requested previous/current calendar-year convention.
As of this reference date, these labels are **2025 (most recent)** and
**2026 (upcoming)**. Make the underlying year explicit.

Store reviewed rule data by year. A newly displayed year with no reviewed data
must say **review pending** and remain unavailable for calculation. Retain an
explicitly labeled reviewed fallback; never relabel old constants as current.
Upcoming-year support does not imply that final IRS publications are available.
Year switching should preserve entered facts where they remain valid and
explain adjustments or invalidated comparisons.

For date-based or user-parameterized tools, describe the relevant effective
dates or supplied assumptions. Identify historical defaults. Do not add a
meaningless annual selector or claim that a model is automatically current.

Every tool must expose its supported situations, important exclusions, source
dates, and last scope review. Keep a short version within the workspace and
put full details in a disclosure. Keep the catalog label consistent with the
shipped model.

Maintain a dated public update log for visible changes and rule reviews, plus
developer notes for implementation details. Distinguish visual changes, scope
reviews, and verified rule updates. At annual rollover, review rules and
sources, model data, year selection, catalog labels, limitations, and checks
before enabling a new year.

## Adoption and review

Social Security is the reference implementation. Apply the shared guide to
each remaining tool in a separate, reviewable change with its model behavior
and existing limitations preserved unless a rules update is explicitly part
of that change. Shared design does not require a common JavaScript framework.

Before shipping a revised tool:

1. Check the central question, linked facts, active mark, and answer as one scene.
2. Run the tool's model checks when model or visual mapping changes, including
   independent expected results and relevant boundary cases.
3. Inspect minimum, typical, maximum, and invalid inputs on mobile and desktop,
   with long labels, keyboard use, text zoom, and both themes.
4. Check annotation collisions, slider alignment where applicable, comparison
   scales, readable labels, and color contrast.
5. Check supported and pending years, scope/source disclosures, catalog labels,
   update logs, and internal links.

The shared guide is a standard for future work. Only record a tool as adopted
after its actual page and checks have been reviewed.

## Inspiration and related references

- [Awesome Explorables](https://github.com/blob42/awesome-explorables).
- [Bret Victor: Explorable Explanations](https://worrydream.com/ExplorableExplanations/).
- [Tangle](https://worrydream.com/Tangle/).
- [Nicky Case: Explorable explanation patterns](https://blog.ncase.me/explorable-explanations/).
- [Red Blob Games: A* introduction](https://www.redblobgames.com/pathfinding/a-star/introduction.html).
- [Social Security case study](social-security-explorable-design.md).
- [Implementation and verification pattern](interactive-tool-pattern.md).

## Guide update log

- **2026-10-17:** Generalized the Social Security design into a shared standard
  for all interactive tools. Added visual polish priorities, mechanism-specific
  adoption ideas, and responsive, comparison, year, and maintenance contracts.
