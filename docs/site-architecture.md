# Site architecture

TaxVisual is a hand-authored static site: no build step, no framework, no npm. Every page is a plain HTML file with `<link>`/`<script src>` references to shared assets. This document is the reference for the folder layout and the tool registry; see the root `README.md` for the day-to-day "add a tool" recipe.

## Folder layout

```
/
  index.html              homepage — hero, featured tool, explore, offerings
  CNAME                   custom domain for GitHub Pages ("taxvisual.com")
  .nojekyll                disables GitHub Pages' default Jekyll processing
  robots.txt
  sitemap.xml
  README.md

  /assets
    /css                  tokens.css    design tokens (color, type, space)
                           base.css      reset, elements, container, print
                           components.css  topbar, footer, buttons, cards
                           home.css      homepage composition only
    /js                    tools-data.js (the registry), render.js, reveal.js
    /img                   favicon.svg, etc.
    /partials              reference copies of the topbar/footer markup —
                           not fetched at runtime, just a copy/paste source
                           of truth for when the nav changes

  /tools
    index.html              the tool catalog, grouped by category
    /_starter               copy this folder to start a new tool
    /<tool-slug>            one folder per live/in-progress tool

  /learn                    free-resource hub
    /textbook               the open access Pressbook
    /guides                 concept guides — to be built
    /glossary               to be built

  /training                 commercial hub
    /team                   to be built
    /workshops              to be built
    /on-demand              to be built

  /about
    /team                   to be built
  /methodology              sourcing/assumptions/update-cadence policy
  /contact                  contact + training enquiry
  /updates                  changelog — to be built
  /community                to be built
  /sitemap                  human-readable index of every page

  /docs
    site-architecture.md   this file
    /tools
      <tool-slug>.md       tool-specific docs (data, design notes, history)
```

## Site map

Every page is a `<dir>/index.html`. That gives clean public URLs (`taxvisual.com/about/`) with no server configuration, while links stay written as `about/index.html` so double-click `file://` preview keeps working.

The structure follows the hub-and-spoke shape used by Storytelling with Data: a small nav, one hub page per section, and a footer that doubles as a site map. The split that matters is **free vs paid** — Tools and Learn are the free surface area that earns an audience, Training is the commercial layer.

```
NAV:  Tools   Learn   Training   About        [ Request training ]

/                          Home
/tools/                    Catalog, grouped by category
/tools/<slug>/             One folder per tool
/learn/                    Free-resource hub
/learn/textbook/           The open access Pressbook
/learn/guides/             Concept guides            — to be built
/learn/glossary/           Glossary                  — to be built
/training/                 Commercial hub
/training/team/            Team training             — to be built
/training/workshops/       Public workshops          — to be built
/training/on-demand/       Self-paced course         — to be built
/about/                    About the project
/about/team/               Who builds it             — to be built
/methodology/              Sourcing and update policy
/contact/                  Contact + training enquiry
/updates/                  Changelog                 — to be built
/community/                                          — to be built
/sitemap/                  Human-readable page index

Not indexed
/tools/_starter/           Template. Disallow-ed in robots.txt and noindex.
```

### The "to be built" convention

Eight pages are scaffolding. Three rules keep a scaffolded page from quietly becoming a half-real one:

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

`/tools/` and the homepage spotlight need no edit when a tool is added — both render from the registry.

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
- One level deep (`tools/`, `learn/`, `training/`, `about/`, …): `../assets/...`
- Two levels deep (`tools/<slug>/`, `learn/textbook/`, `training/team/`, …): `../../assets/...`

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
