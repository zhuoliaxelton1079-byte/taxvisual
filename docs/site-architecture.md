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
    /css                  tokens.css, base.css, topbar.css, footer.css,
                           reveal.css, tool-card.css, home.css
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

  /docs
    site-architecture.md   this file
    /tools
      <tool-slug>.md       tool-specific docs (data, design notes, history)
```

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

`assets/js/render.js` exposes `TaxVisual.renderToolGrid(mountEl, options)`. Every consuming page passes its own `basePath` (`''` at root, `'../'` one level deep, `'../../'` two levels deep) so the same registry entries resolve correctly regardless of which page is rendering them. `options.onlyFeatured` filters to homepage cards; `options.groupByCategory` renders the full grouped catalog used by `/directory`.

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
