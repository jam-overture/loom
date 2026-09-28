# 2026-09-27 — "The front door"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` phase 1.**

**Branch:** `portal-39-the-front-door` (→ `main`), cut from `main` at `c265328`.
Not stacked — phase 1 is code in the route group and depends on nothing in #424,
which carries the plan and the two `Proposed` records.

**This is the maintainer's 27 September direction, built.** His words:

> *"I like the individual components of the portal, but I think the portal fails
> overall in one major regard; what am I supposed to do here? … There is no
> landing page/dashboard for them (and it shouldn't be a hokey one…rather a
> professional looking one like in Vercel or Supabase)."*

**Visuals** — a production build, photographed by a server started after it, in a
signed-in browser against a staged deployment of four pages.

- [`/portal` — after](2026-09-27-portal-front-door-after-wide.png) — 1280px, full
  page. The pages lead, drawn, ordered needs-you-first; the queue is below them.
- [`/portal` on a phone — after](2026-09-27-portal-front-door-after-phone.png) —
  390px, `scrollWidth 390 / innerWidth 390`.

**No before picture, and the reason is the defect.** `/portal` on `main` has no
pages on it at all — it opens on *Waiting on you*. A picture of it is the
`Waiting on you` section that is still on this screen, one position lower.

---

## What shipped

| | |
| --- | --- |
| `_components/page-thumbnail.tsx` | new — a page, drawn small, by rendering it |
| `_components/page-card.tsx` | new — one page as the front door shows it |
| `portal/page.tsx` | the pages section, first; the strip at the foot removed |
| `portal/reading-order.test.ts` | three new guards, and one restated wider |
| `every-page-list.test.ts` | the pin: an eighth list of pages exists |

### The thumbnail is the page, not a picture of it

The obvious build is a screenshot pipeline: a browser, a bucket, a cache keyed on
the page and its version, an invalidation story. **This is none of those.** It is
`renderLoomTree` over a tree already in memory, scaled with a transform.

I told the maintainer this would be "the one expensive choice in phase 1" and
that it needed caching. **I was wrong, and checking the code before building is
what found it:**

1. **The tree is already read.** `/portal`'s existing fan-out reads the head of
   every listed page — to name it, and to say what a waiting change would do.
   `headsOf` has kept the tree rather than dropping it since 17 September. A
   thumbnail adds **no read at all**.
2. **The render is pure and synchronous**, and 0008 made it degrade rather than
   throw.

So there is no cache, and therefore no staleness: a cached image can be wrong,
and a dashboard drawing a page that is not the page being served is a dashboard
lying about the one thing it is for.

**The options are the page screen's own**, deliberately. `/portal/pages/[treeId]`
renders with `resolver` and `validator` and nothing else, so a band that reads a
data source draws empty there too. Passing more here would make the small picture
show something the large one does not.

### Three defects found by looking, two of them by a guard

**1. I duplicated an empty state that already existed.** The pages section
shipped its own `tone="empty"` notice — *"You don't have any pages yet."* — with
its own link to the demo. `reading-order.test.ts` failed twice and was right both
times: this screen **already has** that state, better written (*"You don't have
any pages yet, so nothing can be waiting."*, with a disclosure on how a page
arrives), and two dashed boxes with two links to one destination is the exact
stutter the caught-up state was fixed for on 17 September. The section is now
**absent** rather than empty when there are no pages — a heading over nothing is
the same defect one size smaller.

**2. The strip at the foot became a second "Your pages".** Its own comment said
the question it answered was *"which pages there are"* — which this section now
answers on the screen. Leaving it would have put `Your pages` on the screen twice,
six sections apart, which is precisely the defect a screenshot found on
17 September. It is removed and the link to the paged index moved into the
section, where `page-views.ts` says a way out belongs.

**3. A fixed-width thumbnail overflowed the phone.** The first draft passed a
pixel width in; the phone shot came back **`scrollWidth 402 / innerWidth 390`**.
A 288px picture inside a 288px grid track needs a card wider than the track once
the card pads its own text. The component is fluid now —
`scale(calc(100cqw / 1280px))`, a container query rather than a layout effect,
which is 0106's answer to *how wide am I* — and `MIN_CARD_WIDTH` is a floor the
grid drops columns at rather than a width anything is drawn to. Re-measured:
**390 / 390.**

Only the third of those would have been caught by a person looking at a picture.
The first two were caught by guards this lane wrote for earlier versions of the
same mistake, which is the strongest argument for them yet.

### The guard I restated, and why it is not a weakening

`never sends a reader to the same place twice on one screen` compared the foot
strip's links against each mutually-exclusive empty branch's. **The strip is
gone**, so the comparison had no left-hand side. It is now read off the whole
file: every literal `href` outside the two branches must be unique, and neither
branch may repeat one.

That is the property the original comment describes and it is **strictly more**
than the strip version could see — a repeat between two ordinary sections was
invisible to it, and a repeat between two ordinary sections is exactly what this
run would otherwise have shipped. It is guarded at both ends: the extractor is
asserted against a known href and a literal.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**What their site looks like right now** — and there is nowhere else to see it.

A Loom page is a tree in a store. It was never written as markup, so there is no
file to open, no build output to inspect, and `git log` has never seen it. The
thumbnail is the page **rendered from what is stored at this instant**, beside
the name it currently gives itself (derived from its own leading heading), the
number of changes that have been accepted into it, and whether any are waiting.

The sharper claim: **four of those facts come from four different places and no
other tool joins them.** The picture is the store's tree through the renderer;
the name is derived from the tree's own content; the waiting count is the hold
store, which no commit has ever seen; the change count is the log's length. A
person's answer to *what is my site and what state is it in* did not exist before
this screen.

## The high-schooler test

- **"Your pages"**, then four pictures of their pages. Passes, and it is the
  first thing on the screen that needs no explanation at all.
- **"4 pages, each drawn from what Loom has stored for it."** Passes, and it says
  what a picture here *is*, which is the one thing about it that is not obvious.
- **"2 changes waiting for you" / "Nothing waiting" / "We couldn't check what's
  waiting."** Three states, three sentences — the distinction 24 September put on
  `/portal/pages` and which does not transfer by itself.
- **"7 changes so far."** Passes, and it is the portal's word rather than the
  runtime's (`_lib/version.ts`).
- **What do I do now?** Answered by the shape rather than by a sentence: the
  pages with something waiting are first, and pressing one goes to it.

## Tests

`pnpm verify` green, exit 0, read from a file written by the last command on its
own line, on a `.next` deleted first.

| | `main` at `c265328` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 165 files / 3,216 | **165 / 3,216** — `src/` was not opened |
| `@loom/app` | 315 / 5,490 | **317 / 5,524** |
| findings | 854, 0 malformed | **855**, 0 malformed |
| prerender | 114 pages, 1,302 junctions | **114 / 1,302**, 0 unserved |
| overflow, measured | — | 1280 / 1280 wide, **390 / 390** phone |

**+34 tests, +2 files. Nothing failed, nothing skipped, no test weakened.**

- `page-thumbnail.test.tsx` — **8.** That it draws the page rather than a
  stand-in; that the scale is asked of the browser rather than passed in; that it
  measures its own box and not an ancestor; that it draws at a desktop width
  however narrow the card is (0106 — a narrow container would draw the *phone*
  layout and label it the page); that the crop is from the top left, where the
  heading is; that it is `aria-hidden` and takes no press; and that every word in
  it is the reader's own page.
- `page-card.test.tsx` — **12.** The three waiting states as three different
  things; the unreadable count beside the answerable one and never folded into it;
  a page that could not be read **said** rather than drawn as an empty frame,
  because those look identical and are opposite facts; the whole card as the
  press; singular and plural on both counts; and the name twice on screen, once
  to a screen reader.
- `reading-order.test.ts` — **+3, one restated.** That the pages come before
  anything that happened to them; that a card stays a summary and never becomes
  the queue with pictures; that the section is absent rather than empty with no
  pages.
- The remainder is the lane-wide sweeps finding two new components on their own.

## Findings

**Filed one.** *A shot leaves the pointer where it last clicked, so a `before`
that signs in can photograph a hover state.* The wide picture in this report has
its second card tinted and the phone picture does not — `hover:bg-surface-hover`,
drawn because the sign-in button and that card occupy overlapping points and
nothing moved the pointer. It is correct CSS responding to a real pointer; what
is wrong is that the pointer's position is an input to every signed-in picture
that no shot list declares and no report records. One line in the harness
(`mouse.move(0, 0)` after a `before`), for `Loom daily build`. Six lanes take
screenshots through this path.

## What I did not do

**I did not widen the screen.** `/portal` is `max-w-2xl`, so the grid is two
columns at 1280 — which is the least Vercel-like thing about the result and the
first thing I would change next. It is left alone because every other section on
this screen is prose, and prose at 1280 is worse to read, so the fix is a mixed
width and that is a layout decision worth its own diff rather than a rider on
this one.

**I did not add reader counts to a card.** Phase 4's, and a card that carried
them before the analytics screen is reachable would be the number without the
screen that explains it.

**I did not cache anything**, for the reason above: there is nothing to cache.

**Nothing is scheduled.**

## Recommendations

1. **The width.** One layout decision, and it is what stands between this and
   what he asked for.
2. **The pointer finding**, for `Loom daily build`. One line, six lanes.
3. **Phase 2, the inspector**, which needs nothing from anybody —
   `renderLoomExcerpt` is published and this run's thumbnail is the same call one
   level up.
