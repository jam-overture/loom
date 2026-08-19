# 19 August — §4d: the site, in Loom

**Routine:** `Loom daily build` (marketing) · **Branch:** `marketing-01-the-site-in-loom` ·
**Lane:** `apps/marketing`

First run of this routine. The gate it was disabled behind — §4b's vocabulary,
"roughly fifteen good primitives and a working demo" — is well clear: the
starter library is 37 primitives across five bands, and `/demo` has been live in
the portal deployment since 15 August. So this run builds the thing rather than
reporting that it cannot.

## What shipped

`apps/marketing`: a Next app in the workspace, two routes, and **no markup on
either of them**.

| | |
| --- | --- |
| `/` | hero, the four nouns, four capabilities, the repository's own numbers, the pricing band, four questions, a closing call |
| `/how-it-works` | the five steps a change takes, what the Gate weighs, what the record leaves you holding, three questions |

Both pages are a `LoomTree` built by a pure function, rendered through
`renderLoomTree` with the starter registry as resolver *and* validator and the
theme registry resolving what the root wears. Zero diagnostics on both, under
both palettes.

**The chrome is in the tree too.** The header's wordmark is a `loom.logo`, its
nav items are `loom.action`s, the footer is a `loom.section` of stacks — none of
it is a layout wrapped around the render. `app/layout.tsx` is `<html><body>` and
nothing else, and `globals.css` sets a margin and a minimum height and names no
colour. That was the one thing worth being strict about: a site whose middle is
data and whose top and bottom are JSX is not evidence of anything.

**The palette is a link.** The footer offers the other palette as an ordinary
navigation — same route, `?theme=bold` — so a visitor can do the re-theme rather
than read a claim about it. Both starter triples are registered ids on the root
node, which is all a re-theme is (0049).

**The numbers are checked.** "37 primitives" is counted through
`catalogueOf(siteRegistry)` and "66 decision records" off `decisions/` in a test.
When either moves, the test fails and the page is corrected — which is the only
way a number on a marketing page stays true.

## What is placeholder, and where

Positioning, audience, pricing and licensing are yours. Where the page needed a
shape before it could have an answer, the shape is built and the words are marked
— visibly on the page, and in one list in `lib/copy.ts` that a test holds
against the rendered markup in both directions. Eight strings: the pricing
notice, three tier names, three prices, and the footer's licence line. Nothing
else on either page is invented; every other claim describes code in this
repository.

## Tests

52, all new, in three files:

- **Per route × per palette** — renders with no diagnostics, resolves its theme,
  mounts every palette slot on the root, and names no colour of its own anywhere
  below it (hex, `rgb()`, `hsl()`).
- **Re-theme** — the root's variables change and the markup below them does not.
  The two places the palette's *name* legitimately reaches the markup (links
  carry it forward; the footer offers the other one) are normalised, and nothing
  else is.
- **Navigation** — every route is linked from every page, no page links to a path
  with no builder, every link survives the scheme allowlist, and every route has
  a `page.tsx` on disk.
- **Determinism** — the same tree twice, byte for byte.
- **Facts and placeholders** — as above.

`pnpm verify` at the root: runtime 1361, portal 546, marketing 52. Green.

## Visual

Full-page renders of both routes in both starter palettes are beside this report:

- [`…-home-editorial.png`](2026-08-19-marketing-the-site-in-loom-home-editorial.png) ·
  [`…-home-bold.png`](2026-08-19-marketing-the-site-in-loom-home-bold.png)
- [`…-how-it-works-editorial.png`](2026-08-19-marketing-the-site-in-loom-how-it-works-editorial.png) ·
  [`…-how-it-works-bold.png`](2026-08-19-marketing-the-site-in-loom-how-it-works-bold.png)

Because the 16 August finding says an embedded image in a private repository
never renders for anyone, the visual is also published as a **live page** rather
than a picture — the real DOM of all four, pasted whole, at the link in the PR
comment. That is that finding's second option, and it is better than a
screenshot: the primitives are real elements there, not an image of them.

**A note for anyone else screenshotting a Loom page.** The library's entrance
animation (`.loom-rise`) leaves content at `opacity: 0` under headless Chrome's
virtual time, so the first four screenshots this run took showed an empty hero
with a heading that was demonstrably in the markup. Force reduced motion when
capturing (`reducedMotion: "reduce"`, or `--force-prefers-reduced-motion`); the
stylesheet ends a `.loom-rise` element at `opacity: 1` there, on purpose.

## Found while building

Two, both filed, neither worked around in `src/`:

1. **A Loom site cannot link to its own next page.** Every `href` in a tree must
   be an absolute URL, because the scheme allowlist parses with `new URL()`.
   The site resolves an origin per request to get around it, which makes the
   tree a function of the deployment — the first time 0050's "a page is a
   function of the tree" has had to bend. One accepted prefix (`/`, and not
   `//`) would close it.
2. **`loom.divider`'s `diamond` and `dots` ornaments collapse to the left.** One
   missing width on two spans. The page uses `rule` meanwhile, with a comment.

## What I left out

- **The adaptive site** — the visitor saying what they came for and the page
  composing around it, with the telemetry beside it. It is the strongest version
  of this surface and it is a second unit: it needs a session, a store and a
  policy on a public route, and it should land on top of a site that already
  stands up rather than as the first thing built.
- **A third and fourth page.** Everything I could write without inventing
  positioning fits on two.
- **A deployed preview.** This routine cannot create the Vercel project; what is
  needed is in the PR comment.
