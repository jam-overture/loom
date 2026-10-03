# 2026-10-03 — "A pane you can size"

**Build order section:** §5 — Loom Portal. **Not from the plan**: the maintainer,
in this session — *"I want the renderer to be a pane to the right, emulating a
desktop / iphone / or ipad."*

**Branch:** `portal-46-a-pane-you-can-size` (→ `main`), cut from `main` at
`1589c51`. Not stacked.

---

## What shipped

`/portal/pages/[treeId]` now shows the page in a pane on the right, at **Desktop
(1280×800)**, **Tablet (834×1112)** or **Phone (390×844)**, scaled to fit and
saying so. The controls — ask for a change, the parts list, what is waiting —
are a column on the left.

| | |
| --- | --- |
| `_lib/viewports.ts` | new — the three sizes, their plain names, their addresses |
| `_lib/viewports.test.ts` | new — 17 |
| `…/_components/device-pane.tsx` | new — the chooser, the frame, the fit, the selection bridge |
| `…/_components/device-pane.test.tsx` | new — 13 |
| `app/(preview)/layout.tsx` | new — a second root, with nothing in it |
| `app/(preview)/portal/pages/[treeId]/surface/page.tsx` | new — one page, drawn alone |
| `(portal)/preview-marks.css` | new — the hover and selection outlines, read by both documents |
| `…/_components/preview-frame.tsx` | the page's identity, no longer wrapping the page |
| `…/[treeId]/page.tsx` | the layout |
| `(docs)/_lib/surfaces.test.ts` | **cross-lane** — a group with no address is not a surface |

---

## The decision this whole unit turns on

**A screen size is a viewport, and only a document has one.**

The cheap version of this feature is a `<div>` with `width: 390px`. It would be
right about almost everything: the primitive library responds with `@container`
nearly everywhere, and a container query is satisfied by a narrow box.

**Three rules are still viewport `@media`**, and one of them folds `loom.nav`'s
destinations behind a button below 48rem. A box 390 pixels wide changes no
viewport — so the cheap pane would draw a phone-width page **wearing a desktop
navigation bar**, which is the most visible responsive behaviour the library
has, drawn wrong, on the screen somebody opened to check exactly that.

So the pane is an iframe over a route that serves the page alone. Everything
else in this diff follows from that sentence.

### What it cost, item by item

- **A second root layout**, because in the App Router a layout cannot be opted
  out of, only replaced. `(preview)` is a sixth route group and **not a fifth
  surface**: one address, behind the portal's session, nothing links to it.
  This repository already has five root layouts and no root `app/layout.tsx`, so
  the pattern is established rather than invented.
- **A cross-lane edit**, named here because that is the rule: the documentation
  lane's `surfaces.test.ts` asserts *the surfaces are every route group except
  this one*, and a sixth group broke it. The fix is in that lane's file and is a
  rule rather than an exception — **a group with no front door is not a
  surface** — which `frontDoorOf` already answers for by returning `""`.
- **One shared stylesheet**, `preview-marks.css`. The three rules that draw the
  hover and selection outlines were in the portal's `globals.css`, which the
  preview root deliberately does not load. They are imported by both documents
  rather than copied, so a change to the selection ring cannot apply in one of
  the two places a page is drawn.

### What it did not cost: selection

Clicking a part of the page still picks it, and the outline still lights up —
across a document boundary, with no message protocol.

That is not luck. 0010 made edit mode **decorate rather than restructure**, so a
pick is one attribute on one element and a click is read by delegation. Both
cross a same-origin boundary unchanged: `contentDocument.querySelector` for the
mark, one listener on `contentDocument` for the click. The work was done by
whoever decided, in August, not to pass a selected flag down into the tree.

What did change is **when**: the document loads asynchronously and reloads when
the size changes, so marking waits for `load`. A mark applied to the document
that is being replaced is a mark on nothing.

---

## Visuals

Signed in, through a production build served by `pnpm shoot --serve`. The page
is the portal's own seed tree, read through the store — nothing staged.

| | |
| --- | --- |
| [**Desktop**](2026-10-03-portal-pane-desktop-wide.png) | 1280×800, *shown at 64%* |
| [**Tablet**](2026-10-03-portal-pane-tablet-wide.png) | 834×1112 |
| [**Phone**](2026-10-03-portal-pane-phone-wide.png) | 390×844, at full size |

---

## The defect the first screenshot found

**The page came back set in Times.**

The old preview was drawn inside the portal's own document and inherited its
font. A bare root inherits nothing, and the pane's first picture was a
phone-width page in a serif nothing in this system had chosen.

The immediate cause was mine and is fixed — the preview root now carries the
same font stack the portal gave it, so the pane is a faithful move rather than a
restyle. **What the screenshot actually exposed is that there was never a
theme**: `renderRequest` takes a `themes` registry and resolves the theme the
tree carries, and no surface passes one except the marketing site. Every page the
portal has ever previewed has been drawn with `--loom-*` undefined.

That has looked plausible for two months because the portal's own font and
sizing were reasonable. At 390 pixels it stops looking plausible, and it is the
first finding below — **filed rather than fixed, because it is a decision**: one
line changes how every preview in the portal looks, and picking the registry is
a question about which themes the deployment actually serves with.

---

## Plain language

| named | rather than |
| --- | --- |
| **Desktop · Tablet · Phone** | 1280 / 834 / 390, or a device model |
| *An iPhone held upright. Most people read most pages here.* | `max-width: 47.99rem` |
| *shown at 64%* | a silent transform |
| *Your page at Phone size* (the frame's own name) | an untitled iframe |

The sizes are deliberately not model numbers: *iPad Air (4th generation)* is a
fact about a shop, and nobody asking *does this hold up on a tablet* wants it
read back to them. A test pins that no label carries a digit.

---

## Tests

`pnpm verify` — **green, exit 0**, status written to a file as the last thing on
its own line.

| | `main` at `1589c51` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 177 / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` | 369 / 6,591 | **371 / 6,621** |
| findings | 969 | **972**, 0 malformed |

**+30 app tests.** Nothing was weakened, skipped or deleted. Two existing
assertions changed and both are recorded above: the frame no longer renders the
page, and a group with no front door is not a surface.

- `_lib/viewports.test.ts` — **17.** The widths are the CSS widths and not
  hardware pixels; the default is dropped from an address so a link only names
  what differs; every size's own link reads back as that size; an id is escaped
  rather than pasted into a URL; an unknown value falls back rather than
  refusing.
- `device-pane.test.tsx` — **13.** The size you are on is text with
  `aria-current` rather than a link; the frame is laid out at the **real** width
  with the scale applied afterwards; a reduction is said out loud.

The one thing the tests cannot reach is the thing the pane is for: jsdom lays
nothing out and has no `ResizeObserver`, so no case asserts a scale *value*.
What is pinned is the width the document is laid out at, which is real, and the
pictures are the rest.

---

## What I did not do

**No decision record.** 0019 fixes the three panes' **priority** and says nothing
about their positions, and a size chooser is viewing rather than editing — it
proposes nothing, writes nothing and offers no canvas. Nothing here contradicts
an `Accepted` record.

**I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty. The
two framework observations are findings.

**I did not resolve the tree's theme**, which is the largest thing still wrong
with this pane. Finding 1.

**I did not reverse a row.** The pane is second in the source so it lands on the
right without one — reversing costs a keyboard user the same mismatch at every
width. The consequence is that a narrow screen meets the controls before the
page, and the answer is that the page's **name, id and history sit above both
columns**, so a reader still meets *which page is this* first.
