# 2026-09-19 — "The part nobody uses"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-31-the-part-nobody-uses` (→ `main`), cut from `main` at
`1abfbd7`. Not stacked. **There were no open pull requests in the repository
when this run started**, so there were no maintainer comments to address and
nothing to push onto.

Visuals — a production build of this commit, in a signed-in browser at
`/portal/readers`, against a deployment of two pages: one whose readers'
browsers report *where* they pressed, and one whose do not.

| | |
| --- | --- |
| [Two pages, two kinds of silence](2026-09-19-portal-the-part-nobody-uses-wide.png) | 1280px — **the change**: the second and fourth lines of the Pricing card, and the whole of the note on Field notes |
| [The same screen, every disclosure open](2026-09-19-portal-the-part-nobody-uses-open.png) | 1280px — the new column, and nothing removed to make the first one readable |
| [a phone](2026-09-19-portal-the-part-nobody-uses-phone.png) | 390px |

**How the populated pictures were taken.** The recipe this lane filed on 15, 16,
17 and 18 September, with its third carrier: two trees are built with the
published builders into a `memoryTreeStore()` on
`globalThis[Symbol.for("loom.portal.store")]`, and **54 reader-signal batches
are run through the runtime's own `rollUp`** and applied to a
`memoryReaderTallyStore()` on `globalThis[Symbol.for("loom.portal.readerTallies")]`.
No counter in either picture was typed: every number is the runtime's fold of
batches shaped the way a browser sends them, and the shipped page code did its
own reads, its own naming fan-out and the real Next render.

---

## What was asked

`FINDINGS.md` held an open entry owned by this lane, filed by `Loom daily build`
on 17 September, and it is the one this run took:

> **The `Loom portal` half is still open**: `StoredTally.engaged` is on the
> reading view's rows and nothing on that screen reads it, so a band's line
> there still shows time on screen beside numbers that are structurally zero.

An open finding owned by this lane outranks the plan, and the plan's own
recommendation — `/portal/checkup` — is deferred again for the reason in
**What I did not do**.

## What shipped

**The one counter that is about a section is read, on the one screen that is
about what readers did.**

| | |
| --- | --- |
| `_lib/reading-view.ts` | `PartReading.engaged`; the page-view floor takes in a view that only ever used something; `pageUse`, `unplacedUse`, `UseReading`, `outOfReaders` |
| `_components/what-was-used.tsx` | new — the two sentences and the note, with what a non-walking sender is missing under one disclosure |
| `_components/page-reading.tsx` | the readings called rather than computed inline; the card's argument rewritten |
| `_components/part-counters.tsx` | the `used inside` column, what it is, and why it can exceed `seen` |

### The defect, and why it was invisible

A press lands on a button. `activations` is filed against the node the reader
aimed at, and every control in the starter library is an addressed node of its
own — so **a band's clicks, opens and closes are zero however busy the band
was**, permanently, by construction. A section's row on this screen was time on
screen beside three zeroes, and the two sentences this card draws about usage
(*was clicked most*, *was opened most*) could only ever name a control.

That is the whole vocabulary this screen had for "is anybody using this page".
It had no sentence about a region, and it had no sentence about the page. The
open finding is one line long — *nothing on the reading view reads it* — and the
reason it is worth a unit rather than a field is that `engaged` is not a fourth
count of the same kind. It is a count of **page views**, which is the only kind
of number a share may honestly be taken of.

### Two sentences, and why the second one is the interesting one

```
21 of the 40 visits did something on this page — pressed something, followed a
link, or opened something out.

The part that saw the most of that was the section “Pick a plan” n_pricing7 —
17 of the 36 visits that got that far used something in it.
```

The first is **exact, not a floor.** A delegated signal names every addressed
region it happened inside, *up to and including the root* — so the largest
`engaged` on a revision is the root's, and it is precisely the views in which a
reader used something anywhere. Nothing on this screen could say that before:
*fourteen presses* may be one enthusiastic reader, and *twenty-one of forty
visits* is a different claim.

The second is the half no other tool can produce, and it is where the design
work went. Because the root always wins, ranking by use would name the page
every time — so `region` is the most-used part the measurement can tell **apart**
from the page as a whole, the best-used part strictly below the maximum. A part
whose use is indistinguishable from the whole page's is not news about a part,
and the sentence is absent rather than tautological.

It is ranked on the count and **not** on the share, deliberately. A share would
put a band reached once and used once above everything else on the page, which
is the small-sample confidence this module refuses everywhere else.

### The arithmetic error a screen cannot explain away

`engaged` can exceed `reached`, and it is not a fault: a region is credited by
what happened *under* it and nothing credits it with having been on screen, so a
band nobody reported seeing, whose button somebody pressed, has a use and a
measured reach of zero. The runtime's own rollup test asserts exactly that shape.

A card that divided one by the other would print a share above a hundred. So the
denominator is **optional in the type** — `UseReading.outOf` is present only when
`reached` is one — and the branch without it says so in words:

> something in it was used on 4 visits. Nothing reported whether it was ever on
> screen, so there is no number here to measure that against.

The same applies one level up: `RevisionReading.views` is the floor every share
on this card is taken against, and two readers who each pressed a different
button, whose senders reported nothing else, were two page views that the old
floor read as one. It takes engagement in now. **A denominator below its own
numerator is the one arithmetic error a screen cannot talk its way out of**, and
there are now two guards and a property test standing between this card and one.

### The silence that is not a nobody

The second card in the screenshot is the finding the framework lane warned about
when it built the counter — *"absent is not empty"* — drawn as a screen:

> 7 clicks and openings were reported on this page, and not one of them said
> which part of the page it happened in — so nothing here can tell you where
> people are using it. **That is the pages reporting back, not your readers.**

A batch whose delegated signals carry no ancestry adds nothing to any region's
count. The symptom is a column of zeroes that reads as *nobody uses my sections*
and means *nothing told us where anything happened*, and those two send an
author to opposite places.

They are told apart by a signature this module can see without asking anybody:
**something on this page was used, and not one part of it heard about any of
it.** Because every region up to the root is credited, one placed press anywhere
makes that impossible — so a zero here is the sender rather than the readers, and
the test suite asserts the two states are mutually exclusive on every reading.

The remedy names `within`, `broadcastReaderSignals` and the three reasons a
batch arrives without the walk, one click down, where the person who can fix it
will look for it.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which *section* of their page readers actually use — and, when they don't, whether
that is the readers or the reporting.**

- **`git log` holds the primitives and not the page**, and holds nothing about
  anybody who read it.
- **An analytics product measures a URL.** It has no idea a page is made of
  parts, so it cannot say *the pricing band*; it can only say *the page*. A
  session recorder can show a click on a button, and still cannot add up
  *seventeen of the thirty-six people who got to this band did something in it*,
  because it has no addressed tree to add them up over.
- **The store holds the page as it is now** and no record of what it did to
  anybody.
- And the second card is sharper still: *your pages are reporting presses and
  not saying where they landed* is a statement about the **instrumentation of a
  tree**, which nothing without a tree can make.

The claim worth defending is the middle one. Reach per part was already this
screen's answer to "what no other tool has". Use per part is the other half of
it, and it was the half that was structurally zero — a section could be seen and
never, on this screen, be *used*.

## The high-schooler test

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

- **Pricing, line 3:** *"21 of the 40 visits did something on this page —
  pressed something, followed a link, or opened something out."* Passes. No
  runtime word, no rate, the denominator in the sentence.
- **Pricing, line 4:** *"The part that saw the most of that was the section
  “Pick a plan” — 17 of the 36 visits that got that far used something in it."*
  Passes on what happened. **What to do next is implicit rather than stated**,
  and that is deliberate: the honest next move depends on whether 17 of 36 is
  good, which is a question about their business and not about their page. The
  card does not invent a recommendation it cannot support.
- **Field notes, the note:** *"That is the pages reporting back, not your
  readers."* Passes, and this is the sentence the unit exists for — it is the
  one place a reader would otherwise draw exactly the wrong conclusion.

## What I renamed, and what moved behind a disclosure

Nothing was renamed — no route, no heading, no label. **Nothing was removed.**

| What the screen said | What it says now |
| --- | --- |
| (nothing — no sentence about the page as a whole) | *21 of the 40 visits did something on this page* |
| (nothing — no sentence about a region) | *The part that saw the most of that was the section “Pick a plan” — 17 of the 36 visits that got that far used something in it* |
| (nothing — a zero, indistinguishable from an unused page) | *7 clicks and openings were reported… That is the pages reporting back, not your readers* |

**What moved behind a disclosure:** the `used inside` column, per part, beside
the counters it belongs with; the runtime's own names for it
(`ReaderTally.engaged`, `within`, `broadcastReaderSignals`); and the two
paragraphs explaining why a control's column is always zero and why a region's
can exceed its reach.

**What went on the surface that could have hidden:** the part's id, beside its
name, by the 22 August rule — which in this run's picture is the only thing
telling two rows reading *the action* apart. See the finding below.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **154 files, 2,807 tests, all passed** |
| Application suite | **280 files, 4,934 tests, all passed** |
| Findings | 703 findings, 0 malformed |
| Prerender check | 107 pages, 858 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on both wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

29 tests are new — 16 on the readings, 13 on the card — and one existing fixture
was replaced rather than extended. What each group would catch:

- **The floor.** A view that only ever used something is counted as a page view;
  and the floor is never below the number it is the denominator of, asserted as
  a property rather than on an example.
- **`pageUse`.** The whole page's use is the largest one; the region named is
  the best below it; no region is named when every used part ties the maximum;
  ranking is on the count and not the share, proved with a band reached once;
  the tie-break is stable under reversal, so the same counters name the same
  part twice; and the denominator is withheld both when reach is zero and when
  it is smaller than the use.
- **`unplacedUse`.** Clicks and openings added up; silent when a single press
  was placed; silent on a page nobody used, which is a different sentence; and
  **never both this and a use of the page**, over three readings.
- **The card.** Both sentences and both branches of the second; the note and its
  singular; the note's absence in each of the two ways it can be absent; the
  remedy inside a disclosure and nowhere else; the new column in the table; and
  the existing guards — no registered type on the surface, every type one click
  down — re-run against a fixture that now has six parts rather than four.

## Findings

**Closed one. Filed two.**

1. **Closed:** the `Loom portal` half of the 17 September entry, which is this
   unit.
2. **Filed, `Loom daily build`'s:** the screenshot harness still cannot sign in,
   re-filed as a count rather than as news — and **a correction to this lane's
   own 11 September `pkill` entry**, which cost this run a picture it believed.
   `next start` execs a worker whose command line is `next-server (v16.2.12)`,
   so a kill by pid over `next start` reports success and leaves the worker
   holding the port. The restart fails with `EADDRINUSE` into a log nobody
   reads, and the shot script that follows connects happily to the **old**
   server. This run photographed a fixture it had already fixed, and noticed
   only because the number it had changed had not changed.
3. **Filed, `Loom primitives`':** a photograph of what *0 of 96 primitives
   declare `copy`* costs a reader. The card names the section by what it says
   and the button as *the action*, because a `loom.action`'s words are in its
   `label` prop and nothing has declared that prop to be words. Two buttons on
   one page produce *the action* twice. Evidence for their standing finding
   rather than a second one.

## What I did not do

- **Not `/portal/checkup`**, recommended by the last two reports. An open
  finding owned by this lane outranks the plan, and this one had been open for
  two days on the screen `docs/signals.md` calls the commercial reason the
  portal is opened daily. It is recommended again below, unchanged.
- **No funnel.** The 17 September finding is explicit that the second figure
  needs `reached` and `engaged` on one row and **no `FunnelPair`**, and that a
  funnel is still the right shape for a question whose two ends are different
  nodes. `portalReaderTallies.funnels` is still unread by this screen, and that
  is correct rather than pending.
- **No guess at a region's depth.** Ranking the most-used part wanted the tree,
  and the counters outlive the revision they describe. The "strictly below the
  maximum" rule is what a reading can establish from the counters alone.
- **Nothing in `src/`**, and no file outside `(portal)`.

## The run itself

- **The unit was committed before the screenshots were taken**, per the
  procedure `Loom daily build` filed on 16 September.
- **The screenshot caught a defect in the fixture that no test could have**, for
  the fourth run running. The first picture read *"Fewest people got as far as
  the action `n_pricing6` — 0 of the 40 visits"* about a button fourteen people
  had pressed: the fixture never sent a `viewed` for its controls, and the
  default broadcaster observes every addressed node. Fixture's fault; the screen
  was right, and it was right in a way that was legible enough to argue with.
- `/tmp/shot/` is outside the repository; the preload was copied to
  `apps/loom/node_modules/.shot/` only so that `@loom/runtime` resolves, and both
  it and the source script were **deleted before the report was written**.
  Nothing from either is in the diff.
- **Nothing is scheduled and no pull request is subscribed to.**

## Recommendations

1. **`/portal/checkup`, and the 13 September standing finding.** Now the only
   one of the three screens nobody has photographed, for the third report
   running. Its red verdict is unreachable by any sequence of clicks, and it is
   a screen whose entire value is in the bad news.
2. **`copy` on `loom.action`, `loom.button` and `loom.link`, in
   `Loom primitives`.** Three declarations, and they are the difference between
   *the action* and *the button “Start free”* in every sentence this portal
   writes about a part. Their standing finding of 10 September, with a
   photograph of the cost attached above.
3. **A `signIn` step, or any pre-`goto` hook, in the shot harness**, for
   `Loom daily build`. Two lanes asked for input steps in a shot list within a
   day of each other this week.
