# Site architecture

TaxVisual is a hand-authored static site: no build step, no framework, no npm. Every page is a plain HTML file with `<link>`/`<script src>` references to shared assets. This document is the reference for the folder layout and the tool registry; see the root `README.md` for the day-to-day "add a tool" recipe.

## Folder layout

**Every committed file is a public URL.** GitHub Pages serves the whole branch,
and `.nojekyll` switches off the filtering that would otherwise skip
underscore-prefixed paths. So `docs/`, `tests/`, `CONTRIBUTING.md` and
`assets/partials/` are all live and fetchable today — that is accepted, they are
plain text about an open-access project. What must *not* be committed is source
material: see `_source/` below.

```
/
  index.html              homepage — hero, featured tool, explore, offerings
  CNAME                   custom domain for GitHub Pages ("taxvisual.com")
  .nojekyll                disables GitHub Pages' default Jekyll processing
  robots.txt
  sitemap.xml
  README.md

  /_source                NOT COMMITTED — gitignored, never published.
                          Source material the site is built from but never
                          serves: design-tool exports, reference PDFs, scans.
                          The gitignore is the only thing keeping it off the
                          live site; `.nojekyll` means the underscore does not
                          protect it, so never `git add -f` this folder.

  /data analytics           NOT COMMITTED — gitignored, never published. A
  /sample tax return …/     Python teaching workspace and a practice-return
                            PDF that happen to live beside the site. Same
                            reasoning as /_source: every committed file is a
                            public URL. The one file the site needs out of
                            them is the built dashboard, copied to
                            /dashboard/irs-soi/ and committed from there.

  /assets
    /css                  tokens.css    design tokens (color, type, space)
                           base.css      reset, elements, container, print
                           components.css  topbar, footer, buttons, cards
                           home.css      homepage composition only
    /js                    tools-data.js (the registry), render.js, reveal.js
    /img                   logo.svg       the lockup: mark + wordmark
                           logo-mark.svg  the symbol on its own
                           favicon.svg    the symbol on a filled tile
    /partials              reference copies of the topbar/footer markup —
                           not fetched at runtime, just a copy/paste source
                           of truth for when the nav changes

  /tools
    index.html              two tabs: "All tools" (the catalog, rendered from
                            the registry) and "1040 preview" (/review/1040/
                            embedded via ?embed=1, lazily mounted on first
                            open). The preview is deliberately NOT in
                            tools-data.js — it is a tab, not a catalog card.
    /_starter               copy this folder to start a new tool
    /<tool-slug>            one folder per live/in-progress tool

  /dashboard                the IRS data report — the Dashboard tab
    index.html              one page: the IRS SOI explorer, hosted in a
                            same-origin iframe, sized to its content by script
                            and falling back to a CSS height under file://,
                            where the measurement is blocked.
    /irs-soi
      index.html            GENERATED — do not hand-edit. The IRS Statistics
                            of Income explorer for TY2023: one self-contained
                            243 KB file with its CSS, JS and data inlined, no
                            external requests. Built by build_dashboard.py in
                            the gitignored "data analytics/" working folder,
                            from 15 IRS workbooks, then copied here:

                              py "data analytics/sessions/irs-2023-dashboard/build_dashboard.py"
                              cp "data analytics/sessions/irs-2023-dashboard/index.html" \
                                 dashboard/irs-soi/index.html

                            So the artifact is committed but its generator is
                            not — the generator is teaching material that must
                            stay off the live site. It carries no site chrome
                            by design, which is why verify-links.mjs exempts it
                            via EMBEDS, and robots.txt disallows it so it is
                            not indexed as an orphan beside /dashboard/.

  /review                   the return review pages — sit UNDER Tools
    index.html              overview of the preview and the pages below
    /1040                   the preview itself. Also embedded as the "1040
                            preview" tab on /tools/, via ?embed=1, which hides
                            its topbar and footer so the host page's chrome is
                            not drawn twice. Visited directly it is unchanged.
    /flow-map               reviewer view of a sample return, as a flow map
    /how-it-works           what it reads and what it cannot
    /privacy                data handling for the preview

  /learn                    free-resource hub
    /textbook               the visualized tax guide — to be built
    /guides                 concept guides — to be built
    /glossary               to be built

  /consulting               commercial hub — the Consulting tab
    index.html              hub over planning + all three training formats
    /planning               one-on-one tax planning — to be built

  /training                 training sub-hub — sits UNDER Consulting
    /team                   to be built
    /workshops              to be built
    /on-demand              to be built

  /about
    /team                   to be built
  /methodology              sourcing/assumptions/update-cadence policy
  /contact                  general enquiry — footer only, no nav tab
  /updates                  changelog — to be built
  /community                to be built
  /sitemap                  human-readable index of every page

  /docs
    site-architecture.md         this file
    project-status.md            where the project stands; read this first
    interactive-tool-pattern.md  the recipe for building another tool
    review-service.md            the Return Review section, in full
    /tools
      <tool-slug>.md             tool-specific docs (data, design notes, history)
      extract-statute.py         pulls verbatim statute text for source panels

  /tests                  one harness per tool, plus one for the whole site
    README.md             what each asserts, and how to add one
    verify-<tool>.mjs     runs the shipped page against its workbook tab
    verify-links.mjs      site-wide: links, nav, markers, sitemap, backlog

  /.github                issue templates and the pull request template
```

## Site map

Every page is a `<dir>/index.html`. That gives clean public URLs (`taxvisual.com/about/`) with no server configuration, while links stay written as `about/index.html` so double-click `file://` preview keeps working.

The structure follows the hub-and-spoke shape used by Storytelling with Data: a small nav, one hub page per section, and a footer that doubles as a site map. The split that matters is **free vs premium** — Learn, Tools and the Dashboard's return review preview are the free surface area that earns an audience, Consulting is the commercial layer.

There is no CTA button in the nav. Consulting *is* the commercial call to action, sitting in the tab order like everything else; `/contact/` is reachable from the footer's Connect column and from the calls to action on the pages that need it.

```
NAV:  Learn   Tools   Dashboard   Consulting   About

/                          Home
/learn/                    Free-resource hub
/learn/textbook/           Visualized tax guide       — to be built
/learn/guides/             Concept guides            — to be built
/learn/glossary/           Glossary                  — to be built
/tools/                    Catalog + the "1040 preview" tab
/tools/<slug>/             One folder per tool
/dashboard/                The IRS SOI data report    — one page
/review/                   Return review overview     — under Tools
/review/1040/              The preview — also the Tools tab
/review/flow-map/          Reviewer view of a sample return
/review/how-it-works/      What it reads, what it cannot
/review/privacy/           Data handling for the preview
/consulting/               Commercial hub
/consulting/planning/      One-on-one tax planning    — to be built
/training/                 Training sub-hub           — under Consulting
/training/team/            Team training             — to be built
/training/workshops/       Public workshops          — to be built
/training/on-demand/       Self-paced course         — to be built
/about/                    About the project
/about/team/               Who builds it             — to be built
/methodology/              Sourcing and update policy
/contact/                  General enquiry            — footer only
/updates/                  Changelog                 — to be built
/community/                                          — to be built
/sitemap/                  Human-readable page index

Not indexed
/tools/_starter/           Template. Disallow-ed in robots.txt and noindex.
/dashboard/irs-soi/        Generated embed. Disallow-ed in robots.txt, in
                           neither sitemap, and exempt from verify-links.mjs
                           via EMBEDS — see "Embedded artifacts" below.
```

### Two tabs whose folder is named something else

`Tools` and `Consulting` each own a folder that is not named after them, and in both cases the live URLs were kept rather than broken:

| Tab | Its own folder | Also lives under it |
|---|---|---|
| Tools | `/tools/` | `/review/*` — the 1040 preview and its supporting pages |
| Consulting | `/consulting/` | `/training/*` — the three training formats |

`/review/*` sits under Tools because the 1040 preview is a tab on the Tools page: the preview is a tool, and the flow map, "How it works" and "Your data" explain that tool. It sat under Dashboard while the Dashboard was the return-review hub; the Dashboard is now a single page carrying the IRS SOI explorer and owns nothing below it.

This costs one thing and buys one thing. It costs the rule that a page's first path segment names its section, so the nav marker cannot be derived from the URL alone: pages under `/review/` take `aria-current="true"` on **Tools**, and pages under `/training/` take it on **Consulting**. It buys never 404-ing a URL that is already published and linked — GitHub Pages serves static files with no redirect layer, so a moved folder is a dead link forever.

If either folder is ever renamed to match its tab, the same commit has to add the redirect mechanism first (a stub `index.html` at the old path with a `<meta http-equiv="refresh">` and a `<link rel="canonical">` is the only option without a server).

### The "to be built" convention

Eleven pages are scaffolding. Three rules keep a scaffolded page from quietly becoming a half-real one:

1. It carries `<meta name="robots" content="noindex">`
2. It is **absent** from `sitemap.xml`
3. It is listed on `/sitemap/` annotated `to be built`

When a page gets real content, reverse all three in the same commit. Each stub uses the `.placeholder` component, which states what will go there and offers a live next step — an unfinished page should still be useful. Grep for `placeholder` to see the whole backlog.

### What a new page has to touch

| Adding… | Files to edit |
|---|---|
| Any real page | its own `index.html`, plus one `<url>` in `sitemap.xml` and one line on `/sitemap/` |
| A stub | its own `index.html` (with `noindex`) and one annotated line on `/sitemap/` — **not** `sitemap.xml` |
| A tool | the above, plus one entry in `assets/js/tools-data.js` |
| A nav entry | the above, plus the `<nav>` block in **every** page and `assets/partials/topbar.html` |
| An embedded artifact | its own file, plus its path in `EMBEDS` in `tests/verify-links.mjs` and a `Disallow` in `robots.txt` — and **nothing** in either sitemap |

`/tools/` and the homepage spotlight need no edit when a tool is added — both render from the registry.

Then run `node tests/verify-links.mjs`. It checks every row of that table mechanically: the links resolve, the nav is identical on all 31 pages with the right current-page marker, a real page is in `sitemap.xml`, and a stub is out of it but annotated on `/sitemap/`. A nav entry also means updating `SECTION_OF` in that harness.

### Embedded artifacts

An *embedded artifact* is a generated, self-contained page that the site serves
only inside an iframe — today that is just `/dashboard/irs-soi/`. It is not a
page in the site's sense: it carries no topbar, no footer and none of the three
shared stylesheets, because the page hosting it already supplies all of that.

Three consequences, all of them deliberate:

- `verify-links.mjs` would otherwise fail it on the nav and stylesheet checks,
  so its path is listed in `EMBEDS` and filtered out of `pages`.
- It is absent from `sitemap.xml` **and** from `/sitemap/`. It is not a stub,
  so it takes no "to be built" annotation; it is simply not a destination.
- `robots.txt` disallows it, so it is not indexed as an orphan competing with
  the page that embeds it.

The host page owns the framing: a visible "Open full screen" link (the escape
hatch out of a nested scroll region), a same-origin script that measures the
frame and grows it to its content, and a CSS fallback height for `file://`,
where that measurement is blocked. Embedded pages that declare
`color-scheme: light` stay light inside a dark-themed host — an iframe cannot
inherit the theme, and that is accepted rather than worked around.

### Embedding a real page is a different thing

`/tools/` embeds `/review/1040/` the same way, but that page **is** a site page:
it keeps its URL, its chrome, its sitemap entry and its nav marker. It is not in
`EMBEDS`, it is not robots-disallowed, and it is verified like any other page.
Only the framing is shared. The switch is a `?embed=1` query the page reads for
itself:

```js
if (new URLSearchParams(location.search).get('embed') === '1') {
  document.body.classList.add('embed');
}
```

`body.embed` then hides `.topbar`, `.site-footer` and `.skip-link` in that page's
own stylesheet. The markup stays in the DOM on purpose: `verify-links.mjs`
asserts every page carries the primary nav, and hiding is not removing.

Two framing details differ by host, and both are load-order bugs waiting to
happen:

- A frame behind a **tab** carries its address in `data-src` and is mounted on
  first open, so a second page is not downloaded before anyone asks for it. An
  iframe inside a `hidden` panel still loads if `src` is set up front.
- A frame whose `src` is **in the markup** can finish loading before the page
  script runs, in which case its `load` event has already fired and the
  measurement never happens. `/dashboard/` checks `readyState === "complete"`
  after attaching the listener for exactly this reason.

## The design system

Every page loads the same three stylesheets in this order, then optionally its own:

```html
<link rel="stylesheet" href="{{ROOT}}assets/css/tokens.css">
<link rel="stylesheet" href="{{ROOT}}assets/css/base.css">
<link rel="stylesheet" href="{{ROOT}}assets/css/components.css">
```

**Two rules keep this coherent:**

1. **Never write a raw color, font-size, or spacing value at the use site.** If the value you need isn't in `tokens.css`, add it there first. The one sanctioned exception is the `@media print` block in `base.css`, which is deliberately black-on-white because paper is not a theme.
2. **Reference colors only through the semantic tokens** — `--paper`, `--surface`, `--ink`, `--muted`, `--rule`, `--accent`, `--on-accent`. Those names are redefined per theme, so dark mode costs nothing at the use site. Hard-coding a hex is what previously left the topbar stuck white on a black page.

`--on-accent` exists because the correct text color on an accent fill flips between themes: white on the dark-green light accent (7.7:1), near-black on the light-teal dark accent (7.3:1). White in both would fail at 2.5:1 in dark mode.

Typography is the IBM Plex superfamily: **Serif** for headings and prose, **Sans** for UI chrome, **Mono** for figures and tabular data.

Breakpoints are **900px** (multi-column layouts collapse) and **600px** (chrome stacks). Keep new media queries on these two values rather than inventing more.

### Themes

Dark mode follows the OS by default. A page can pin itself with `data-theme="light"` or `data-theme="dark"` on `<html>`, which is also the easiest way to eyeball both themes while developing.

## Path scheme

All asset and nav links are **relative**, not root-relative (`../assets/...`, not `/assets/...`), so any page can still be opened directly in a browser (double-click, no server) before it's deployed. Depth-by-depth:

- Root pages (`index.html`): `assets/...`
- One level deep (`tools/`, `learn/`, `dashboard/`, `consulting/`, `review/`, `training/`, `about/`, …): `../assets/...`
- Two levels deep (`tools/<slug>/`, `learn/textbook/`, `review/1040/`, `consulting/planning/`, `training/team/`, …): `../../assets/...`

`tools/_starter/index.html` already has the correct `../../` depth filled in — copy it rather than recomputing paths by hand.

## The tool registry (`assets/js/tools-data.js`)

Two plain JS globals, loaded via `<script src>` (not JSON/`fetch()`, so pages still work under `file://`):

- **`window.CATEGORIES`** — `{ key, label }` topic tags. Edit this list anytime a tool doesn't fit an existing category.
- **`window.TOOLS`** — one entry per tool:

  | Field | Meaning |
  |---|---|
  | `slug` | folder name under `/tools/` |
  | `title`, `description` | shown on the card |
  | `category` | a `CATEGORIES` key |
  | `status` | `live`, `in-progress`, or `planned` |
  | `url` | site-root-relative path (e.g. `tools/my-tool/index.html`), or `null` if not live |
  | `order` | sort weight, lower first |
  | `featured` | `true` to show on the homepage |
  | `facts` | optional `[{ label, value }]`, shown as the key-facts table in the homepage spotlight (e.g. tax year, jurisdiction, filing status) |

`assets/js/render.js` exposes two renderers over that registry. Every consuming page passes its own `basePath` (`''` at root, `'../'` one level deep, `'../../'` two levels deep) so the same registry entries resolve correctly regardless of which page is rendering them.

- **`TaxVisual.renderToolGrid(mountEl, options)`** — builds the `.tool-card` grid. `options.onlyFeatured` filters to homepage cards; `options.groupByCategory` renders the full grouped catalog used by `/tools/`.
- **`TaxVisual.renderToolLinks(mountEl, { basePath })`** — renders the same registry as a plain link list grouped by category, used by `/sitemap/`. Live tools become links; anything else is plain text annotated with its status.
- **`TaxVisual.renderSpotlight(mountEl, { basePath })`** — used by the homepage. Renders the highest-priority live tool as a full feature block (with its `facts` table, if it has one), followed by a one-line note naming everything still in development. A new tool promotes itself onto the homepage the moment its `status` becomes `live`.

## GitHub Pages + custom domain

1. Repo Settings → **Pages** → **Deploy from a branch** → `main` → `/ (root)`.
2. `.nojekyll` (already at repo root, empty file) — without it, GitHub Pages' default Jekyll build can treat underscore-prefixed paths (like `/tools/_starter/`) specially and may reprocess other files unexpectedly.
3. `CNAME` (already at repo root) contains exactly `taxvisual.com`.
4. In GoDaddy DNS for `taxvisual.com`:
   - Four apex `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - A `www` `CNAME` record → `<github-username>.github.io`.
5. In the repo's Pages settings, add the custom domain, wait for DNS to verify, then enable **Enforce HTTPS**.

## Note on this OneDrive-synced folder

The working copy lives under a syncing `OneDrive - UWGB` path. Git occasionally hits a transient `.git` lock error under active OneDrive sync — usually resolved by simply retrying the command. If it becomes a recurring problem, move the working copy outside the OneDrive tree and rely on GitHub itself as the backup/remote.

## The brand mark

Three files, one idea:

| File | What it is | Use it for |
|---|---|---|
| `logo.svg` | the lockup — symbol, wordmark and one shared ledger rule | anywhere the logo travels as a single asset: decks, docs, social, a partner's page |
| `logo-mark.svg` | the symbol alone | tight square spaces, and the copy inlined into the topbar |
| `favicon.svg` | the symbol on a filled tile | the browser tab; it carries its own colors |

The symbol is the site's own picture reduced until it survives 16px: three
ascending columns standing on a ledger rule — the progressive bracket staircase
every tool here ends up drawing — with the tallest column split by a small gap
and a lighter tip, which is the part-to-whole bar the tools draw second. It
claims nothing the site does not actually do.

The lockup adds the name, and sets it **on the same rule the columns stand on**.
That shared baseline is the point: it is what keeps the pairing from reading as
a stock bar-chart icon with a company name beside it, and it echoes the ruled
page the whole site is set on. The wordmark is pinned to its measured width with
`textLength`, so a machine without IBM Plex Serif condenses the fallback to fit
rather than running the word past the end of the rule.

In the topbar the symbol is inlined and the wordmark stays **live HTML text** in
the serif face, so it matches the headings and stays selectable, translatable
and responsive to text-size settings. The lockup file is for everywhere that
cannot rely on the page's fonts and CSS.

Three things to know before changing it:

1. **It is inline SVG in the topbar, not an `<img>`.** That is what lets it take
   `currentColor` and follow the theme; `.brand-mark` colors it `var(--accent)`
   in `components.css`. An `<img>` would need two files and still be wrong in
   one theme. The cost is that the markup is hand-duplicated into every page,
   like the rest of the chrome — `assets/partials/topbar.html` is the source of
   truth.
2. **`favicon.svg` carries its own colors**, because a favicon cannot inherit
   the page's. Both theme pairs are literal hex lifted from `tokens.css`, and
   both are already contrast-verified there. It switches on
   `prefers-color-scheme` inside the file; browsers that ignore that get the
   light pair.
3. **An XML comment may not contain a doubled hyphen.** Writing the custom
   property names out in full (`--accent`) inside a comment makes the SVG
   invalid and the icon disappears with no error anywhere. This bit once.
