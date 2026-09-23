# TaxVisual

Interactive tax policy tools and classroom simulations, published at [taxvisual.com](https://taxvisual.com).

A hand-authored static site — no build step, no framework, no npm. Every page is a plain HTML file; shared CSS/JS live under `/assets` and are pulled in with plain `<link>`/`<script src>` tags. See `docs/site-architecture.md` for the full folder layout and the tool-registry schema.

## Adding a new tool

This is the whole workflow — no other page needs hand-editing.

1. Copy `tools/_starter/` to `tools/<your-slug>/`, and build your tool inside the marked sections of `tools/<your-slug>/index.html`.
2. Add one entry to `window.TOOLS` in `assets/js/tools-data.js` (and a new `CATEGORIES` entry only if none of the existing ones fit).
3. Add one `<url>` line to `sitemap.xml`. (The human-readable `/sitemap/` page needs no edit — it renders from the registry.)
4. Preview locally — double-click `index.html` at every page you touched (homepage, `directory/index.html`, `sitemap/index.html`, your new tool page) and confirm it renders and every link resolves.
5. Open a pull request — see [CONTRIBUTING.md](CONTRIBUTING.md). Nobody pushes directly to `main`:
   ```
   git switch main && git pull
   git switch -c tool/<your-slug>
   git add -A
   git commit -m "Add <tool name>"
   git push -u origin HEAD
   ```
6. Once the PR is reviewed and merged, GitHub Pages rebuilds automatically from `main` (usually live within about a minute). Reload `https://taxvisual.com/directory/` to confirm the tool appears, then open its live URL.

## Contributing

`main` is the live site — every merge deploys. Nothing lands on `main` except through a reviewed pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch → PR → review → merge loop and the three files that cause merge conflicts.

## Local preview

No server needed — every page uses relative paths, so double-clicking any `.html` file opens it correctly straight from the filesystem. (A local server such as VS Code's Live Server also works, if you prefer.)

## Deployment

Hosted on GitHub Pages (branch `main`, root), with the custom domain `taxvisual.com` pointed at it via GoDaddy DNS. Full setup steps are in `docs/site-architecture.md`.

## Not tax advice

Every tool here is an educational simulation. See `methodology/index.html` (or the live [Methodology](https://taxvisual.com/methodology/) page) for sourcing and update-cadence standards.
