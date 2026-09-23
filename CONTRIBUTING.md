# Contributing to TaxVisual

Two people work on this repo. `main` is the live site — every merge to it
deploys to [taxvisual.com](https://taxvisual.com) within about a minute. So
nothing lands on `main` except through a reviewed pull request.

There is no build step, no framework, and no npm. You edit HTML/CSS/JS and
open the file in a browser.

## One-time setup

```bash
git clone https://github.com/<owner>/taxvisual.git
cd taxvisual
git config user.name  "Your Name"
git config user.email "you@example.com"
```

Clone to an ordinary local path such as `C:\dev\taxvisual`. Avoid putting the
working copy inside OneDrive, Dropbox, or any other syncing folder — the
syncing client and git fight over `.git` and you get intermittent lock errors.

## The loop

```bash
git switch main && git pull          # always branch from current main

git switch -c tool/payroll-split     # see naming below
#   ... make your change ...
#   ... open every page you touched in a browser and check it ...
git add -A
git commit -m "Add payroll tax split viewer"
git push -u origin HEAD
```

Then open the pull request on github.com (it offers a "Compare & pull request"
button right after you push) and request a review.

After it is merged, the branch is deleted automatically. Resync before starting
anything else:

```bash
git switch main && git pull
```

**Never force-push to `main`.** Force-pushing your own unmerged branch is fine.

### Branch naming

| Prefix | For |
|---|---|
| `tool/` | a new tool, or changes to an existing one |
| `content/` | copy edits to About, Methodology, the homepage |
| `fix/` | broken links, layout bugs, typos |
| `docs/` | README, this file, `docs/` |

## Reviewing

There is no build, so reviewing is genuinely quick:

```bash
git fetch
git switch tool/payroll-split
```

Then double-click the changed pages and look at them. Read the diff for the
things a browser will not show you — a tool left at `status: 'planned'`, a
missing `sitemap.xml` line, a nav change applied to only some pages.

Use **Squash and merge**. `main` stays one commit per change, which matters
because each of those commits is a deployment.

## Local preview

No server needed. Every path in the site is relative, so double-clicking any
`.html` file opens it correctly straight from the filesystem. VS Code's Live
Server works too if you prefer it.

Check every page you touched, not just the one you were working in. Adding a
tool changes the homepage and `/tools/` as well as your own tool page.

## Avoiding conflicts

Three files cause essentially every merge conflict in this repo. None of them
are hard to deal with if you follow the rule.

| File | Why | Rule |
|---|---|---|
| `assets/js/tools-data.js` | One shared registry that both of us append to | **Append at the end of the array.** Agree `order` numbers in the issue before you branch. If it conflicts anyway, the resolution is always "keep both entries" |
| `sitemap.xml` | Same append pattern | Append before `</urlset>` |
| The nav and footer blocks | They are hand-duplicated into **all 19 pages**, so one change rewrites every file | **A nav or footer change gets its own PR with nothing else in it**, reviewed and merged the same day. Update `assets/partials/` in the same PR. See the warning below |

The general rule that makes all three a non-issue: **small pull requests,
merged promptly**. A branch left open for a week across a nav change is the
only way this gets painful.

Before you start building a tool, open an issue for it so the other person can
see it is claimed.

### A warning about the duplicated chrome

The site now has 19 pages, and the topbar and footer are hand-copied into
every one of them. That was manageable at 5 pages. At 19 it is the single
most likely source of silent breakage: change the nav, miss two pages, and
nobody notices for a month.

Two things to know:

1. `assets/partials/topbar.html` and `footer.html` are the source of truth.
   Change them **first**, then paste outward. They carry the `{{ROOT}}` depth
   convention and the `aria-current` rule in their comments.
2. If this starts to hurt — and it will, somewhere around 25 pages — the fix
   is a tiny generator script that stamps the chrome into every page, run by
   hand before committing. That is not the same as adopting a framework, and
   it keeps the published output plain static HTML. Worth doing before the
   next big structural change rather than after.

### Stub pages

A page with no content yet must satisfy all three of: `noindex` in its head,
**absent** from `sitemap.xml`, and listed on `/sitemap/` marked "to be built".
When you give it real content, reverse all three in the same commit. See
`docs/site-architecture.md` for why.

## Adding a tool

The full recipe is in [README.md](README.md). Short version: copy
`tools/_starter/` to `tools/<your-slug>/`, add one entry to `window.TOOLS` in
`assets/js/tools-data.js`, and add one `<url>` line to `sitemap.xml`.

The `/sitemap/` page updates itself from the registry — do not hand-edit it.

## Not tax advice

Every tool here is an educational simulation. Anything you add has to hold up
to the sourcing and update-cadence standards on the
[Methodology](https://taxvisual.com/methodology/) page.
