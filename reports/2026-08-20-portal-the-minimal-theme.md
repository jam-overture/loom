# 2026-08-20 — the portal wears the minimal theme

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-06-the-minimal-theme` (→ `main`).

Visuals, both signed-in against a local production build:
[the pages list](2026-08-20-portal-the-minimal-theme-pages.png) ·
[a held change, with its verdict and buttons](2026-08-20-portal-the-minimal-theme-record.png).

---

## What was asked

The maintainer asked for the portal to be converted to the `minimal` theme that
landed in #103 — white paper, black ink, a subtle green, and a named font family.

## The seam this had to respect

A Loom theme and the portal's chrome are two different mechanisms, and the whole
shape of this change follows from that.

A theme is three registered ids resolved into `--loom-*` custom properties and
mounted **on a tree's root** (0049, 0050). It themes *rendered trees*: the
preview pane, the demo, the docs examples. The portal's chrome — rail, topbar,
cards, buttons — is ordinary React and Tailwind with its own token set, because
0018 forbids the chrome from being a Loom tree: the tool that repairs a broken
tree must not share a failure domain with it.

So registering the theme themes the *preview*, and nothing else. Converting the
portal is a separate change, and the interesting question was how the chrome
should get the theme's values.

**Not through `var(--loom-*)`, which was my first instinct and is wrong.** A
custom property resolves at its *use site*. The preview pane mounts the previewed
tree's theme on the tree root, so a chrome token defined as
`var(--loom-bg-canvas)` would resolve against whatever theme that tree carries
anywhere inside the preview subtree. Opening a tree themed `bold` would repaint
the chrome around it, and a bad theme proposal could make the review UI
unreadable — precisely the failure 0018 exists to prevent.

So the chrome takes the theme as a **host choice fixed at the root**: the values
are copied into `(portal)/globals.css` as literals. The screenshot of `/portal/demo`
is that decision working — the chrome is minimal while the tree beside it still
renders `editorial`, serif headline and all.

## What shipped

**Every colour and radius in the chrome now comes from the registered theme.**
No component changed: the chrome already routed everything through `:root`
tokens into Tailwind utilities, so the conversion is a token rewrite and the
forty-one components inherit it.

- **Surfaces** — `bg-canvas` and `bg-surface` are the same white in this palette,
  which is what turns every card and panel into an outlined shape rather than a
  filled one. Hover is the palette's one functional fill; **selection is the green
  tint**, which is the theme's own instruction that green appears as a tinted mark.
- **The green is a highlight and never a fill.** `accent` is black in this
  palette — deliberately, per the theme's own notes — so the affirmative action
  is the single black shape on the page and the green lives in the active rail
  cell, its rule, and the "applied" verdict.
- **Buttons** — one filled black button, everything else outlined, separated by
  ink weight rather than colour. Visible in the record screenshot: **Apply this
  change** is black, **No thanks** is outlined.
- **Radii** — the `precise` preset's 4 / 8 / 12.
- **Geist is loaded**, which is the half a theme cannot do for itself.

### The two places the theme is deliberately not followed

Both are documented in the stylesheet and asserted in tests, so neither reads as
an oversight later.

**The focus ring is black, not green.** The palette suggests `border-accent` for
rings, but `#72e3ad` on white is 1.6:1 — well under the 3:1 a non-text indicator
needs. `accent` is black, so black is both accessible and on-theme.

**Held and refused keep an amber and a red.** This is the one group not drawn
from the brand palette. A verdict colour is functional: "applied", "waiting on
you" and "refused" have to be tellable apart at a glance, and a single-accent
palette cannot say three things. `applied` is the theme's green exactly; the
amber and red are the ones the documentation site already uses, so a verdict now
reads the same on both surfaces.

### The font, which is where a theme stops

A font pack names a **family**, never a file — Loom does not fetch fonts, and
`minimal-sans`'s own comment says so. The family only becomes real where a
surface loads it, so the portal loads Geist and binds it to the variable the
stylesheet reads.

Via the `geist` package rather than `next/font/google`: that one fetches from a
font CDN during `next build`, and a network dependency in the build turns a
deploy red for reasons unrelated to the change being deployed.

## How the copy is kept honest

Copying values out of the registry is the right call here and it has the obvious
cost: two places holding one value, free to drift the moment somebody retunes the
palette. **`globals.test.ts` is the link the cascade is deliberately not
providing.** Thirty-seven assertions map a chrome token to the palette slot it
came from and compare them directly against `minimalPalette` and
`preciseStylePreset` imported from `@loom/runtime`. Retune the theme and the
suite names exactly which chrome tokens no longer agree.

The deviations are pinned too — a test asserts the three verdict inks are
distinct *and* that two of them are deliberately not palette colours, so
"minimalise the verdicts" cannot happen by accident.

## Tests

**40 new tests. The app was at 758 and is at 798** across 74 files.
Framework: **1407 passing** across 97 files, untouched by this diff.
`pnpm install && pnpm verify` green — typecheck, both suites, `next build`.
Nothing weakened or skipped.

One test failed while writing and the failure was real: `minimalPalette` came
back `undefined` because `dist/` was stale, not because it was unexported.
Rebuilding the runtime fixed it — worth knowing, because the symptom looks
exactly like a missing export and would send the next run hunting a framework gap
that is not there.

## What this tells a developer that they could not get elsewhere

The bar does not really apply to a restyle — this unit adds no information a
developer could not previously get. It is craft, and I am not claiming otherwise.
What it does protect is the thing the surrounding units *do* claim: a review
queue is read by eye under time pressure, and the verdict colours are the fastest
signal on the page. The one substantive decision here — keeping three
distinguishable verdict hues instead of minimalising them into greys — is the
one that keeps that true.

## What I did not do

- **The demo's tree still renders `editorial`.** Converting the chrome does not
  change which theme the demo's seed selects, and that is a visible product
  decision rather than a styling one — the demo currently exists partly to show
  re-theming. Raised for the maintainer rather than taken.
- **The docs and marketing surfaces** keep their own token sets. Out of lane and
  each is its own unit.
- **`src/` is untouched.** 0018 holds — `minimalPalette` and `preciseStylePreset`
  come from the root entry point; the theme itself was not edited.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record.

## Recommendations

1. **Should the demo's tree adopt `minimal` too?** My recommendation is **no, not
   as the default** — the demo's argument is that a tree can be re-themed, and a
   demo whose tree matches its chrome makes that harder to see, not easier. But
   it is your call and it is one line.
2. **The lane boundary on the demo is genuinely ambiguous** and worth settling.
   `docs/routines.md` gives "the demo" to `Loom daily build`, while the demo's
   code sits in the portal's directory and a finding I filed on 17 August assumed
   it was mine. Filed.
3. **Nothing blocking.**
