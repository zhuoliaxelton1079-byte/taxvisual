# Site architecture

TaxVisual is a hand-authored static site: no build step, no framework, no npm. Every page is a plain HTML file with `<link>`/`<script src>` references to shared assets. This document is the reference for the folder layout and the tool registry; see the root `README.md` for the day-to-day "add a tool" recipe.

## Folder layout

```
/
  index.html              homepage — hero + featured tools + pressbook blurb
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
    /_starter              copy this folder to start a new tool
    /<tool-slug>            one folder per live/in-progress tool

  /directory                full tool catalog (index.html), grouped by category
  /methodology              sourcing/assumptions/update-cadence policy
  /about
  /sitemap                  human-readable index of every page

  /docs
    site-architecture.md   this file
    /tools
      <tool-slug>.md       tool-specific docs (data, design notes, history)
```

## Site map

Every page is a `<dir>/index.html`. That gives clean public URLs (`taxvisual.com/about/`) with no server configuration, while links stay written as `about/index.html` so double-click `file://` preview keeps working.

```
Live today
  /                          Home — hero, featured tools, Pressbook blurb, contact
  /directory/                Full tool catalog, grouped by category
  /tools/<slug>/             One folder per tool
  /methodology/              Sourcing, assumptions, update cadence
  /about/                    About the project
  /sitemap/                  Human-readable index of every page

Not indexed
  /tools/_starter/           Template. Disallow-ed in robots.txt and carries
                             <meta name="robots" content="noindex">

Growth slots — agreed structure, not built yet
  /book/                     Promote the Pressbook (today just #book on the homepage)
  /teaching/                 Classroom guides: how to use a given tool in class
  /updates/                  Changelog — what changed in which tool, and when
```

Claim a growth slot by building it at that exact path rather than inventing a new one, so the URL scheme stays predictable.

### What a new page has to touch

| Adding… | Files to edit |
|---|---|
| Any page | its own `index.html`, plus one `<url>` line in `sitemap.xml` |
| A tool | the above, plus one entry in `assets/js/tools-data.js` |
| A top-nav entry | the above, plus the `<nav>` block in **every** page and `assets/partials/topbar.html` |

`/sitemap/` needs no edit when a tool is added — it renders from the registry via `TaxVisual.renderToolLinks()`.

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
- One level deep (`directory/`, `methodology/`, `about/`): `../assets/...`
- Two levels deep (`tools/<slug>/`): `../../assets/...`

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

- **`TaxVisual.renderToolGrid(mountEl, options)`** — builds the `.tool-card` grid. `options.onlyFeatured` filters to homepage cards; `options.groupByCategory` renders the full grouped catalog used by `/directory`.
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
