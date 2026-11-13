# 0393. A silent component is a census over the placements the defect could be seen on, and the share is bracketed

**Status:** Accepted
**Date:** 2026-11-13
**Section:** §5 (reader signals), the readings

> **Renumbered on 2026-11-13**, from 0391, when the branch that carried it
> (#885) was merged. `main` had meanwhile accepted a different 0391 — *a
> whole-repository sweep names its budget on the block that holds it* (#883,
> merged earlier the same morning) — and two records sharing a number is fatal
> (0097). 0392 is claimed by #886, so this record takes the next free number.
> Nothing in it changed but its number; the references on this branch were
> updated with it.

## Context

[0382](0382-a-part-that-reported-nothing-with-a-reader-below-it-is-an-eighth-collection-fault-and-it-reaches-both-ranking-keys.md)
named the defect and gave it a fault: a part that reported nothing while a part
**inside** it reported reach. A reader was demonstrably below it, so it was on a
screen and did not say so — a primitive that does not spread the identity
attributes a broadcaster reads, or a sender switched on halfway through a
release.

It is raised **per page**, and the entry filed the evening it landed said what
was still wrong with that:

> The entry's sentence is *a primitive to fix **in the library**, not a page to
> rewrite*, and this fault is raised per page. A deployment with forty pages
> built out of one silent `loom.accordion` gets forty faulted pages and has to
> open each to notice they are all the same component.

A fix-list that says *rewrite these forty pages* when the errand is *fix this one
primitive, once* is handing over the wrong unit of work. Every other question
about a kind of part is gathered by `KindKey` —
[0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)
for standing, [0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)
for readers, [0325](0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)
for pace — and this one was not.

**The hard part is not the gathering.** It is the denominator, and the reason is
written on the fault itself: *only a part with something reported inside it is
detectable*. A silent leaf — a heading, a price, a control with nothing under it
— produces exactly the rows a part nobody reached produces, and no reading can
tell them apart at any payload. So a share over a kind's placements would be a
figure that moves when a library gains leaves and when a window gains readers,
and not when a sender is fixed.

## Decision

**A twenty-fourth reading, `librarySendersOf`, derived from the server-side join
of 0212** — no payload field, no counter, no column, no table, no byte on any
wire and nothing in a reader's browser.

1. **Every placement is in exactly one of three states, and they add to
   `placements`.** `leaves` holds nothing, so the defect can never be seen
   there. `unwitnessed` holds parts and nothing below it reported reach, so the
   defect cannot be seen there in this window. `witnessed` has at least one part
   below it reporting reach, and is the population this reading is about.
2. **`share` is `silent ÷ witnessed` and never `silent ÷ placements`.** Dividing
   by the placements makes a library of mostly leaves look healthy and a quiet
   window look healthier still — a share that answers *how many leaves do you
   have* and *did anybody visit* rather than *do your senders work*. The one
   direction a census of a quiet deployment must not be wrong in is calling a
   silence a verdict (0212), and that is the direction this one would fail in.
3. **`silent` is 0382's rule and not a second spelling of it.** A placement is
   silent where its standing is `skipped` and a part below it reported reach —
   the condition `pageFrontierOf` raises `notReporting` on — computed from the
   same projections, which are extracted into `subtrees.ts` and shared by both.
   The census total equals the sum of `PageFrontier.notReporting` over the same
   readings, and that is asserted rather than described.
4. **A witnessed placement whose own standing is `unknown` is bracketed, not
   claimed.** It reported *something other than coming into view* with a reader
   below it — a press delegated to a band no `viewed` ever named — which is
   plausibly the same defect. 0382 does not claim it, because `unknown` is the
   absence of a claim ([0282](0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)).
   So `indeterminate` counts them, `share` excludes them and `atMost` includes
   them. Where `indeterminate` is nought the two are equal and the bracket is a
   point, which is what a deployment with working senders publishes.
5. **The share is a floor on the defect and the row says so.** A silent leaf is
   invisible to it, and so is a silent part nobody has been under yet. A surface
   that printed *these are all the parts that went missing* would be printing
   something the reading did not say — the same limit the fault carries, one
   level up.
6. **`silentTrees` is the figure the per-page fault cannot give.** Trees and not
   revisions, because a page is what an operator opens and two revisions of it
   are one errand. *`loom.accordion` is silent in thirty-one of the thirty-four
   places it stands, across nineteen of your pages* is the sentence this exists
   for.
7. **`worstSender` ranks on the count of silent places and never on the share,**
   which is 0221's rule and 0257's: a kind silent in its one and only place is a
   perfect share and a smaller errand than one silent in thirty-one of
   thirty-four. A type and never a role, because a type is the thing an author
   can replace.
8. **`examples` is capped at five node ids and is examples.** The errand is the
   primitive; the ids are there so an operator can go and look at one. A library
   of forty pages must not put tens of thousands of ids in a row nobody reads to
   the end.
9. **A third silence vocabulary member, not a reuse.** `SenderSilence` is
   `unplaced`, `unwitnessable` and `unwitnessed`, tried in that order: nothing of
   the kind before the structural answer before the measurement one. It is not
   `KindSilence`, because `unread` means *no placement has a verdict* and none of
   these three does; a second name for one state would need a second `meaningOf`
   kept in step with the first, which §86 declined for exactly the opposite
   reason — there the states were identical.
10. **Readings are deduplicated on `readingKeyOf` and the drops are reported**
    ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)). A
    page twice in a census is the one way a census can lie about how much of a
    library there is.

## Consequences

- A deployment can ask *which of my components are silent* and get one row per
  primitive type, ranked by the places to fix. The forty faulted pages become
  one errand.
- **The figure is a floor and will read as better than the truth.** Three
  populations are outside it: every leaf, every holder nobody has been under,
  and — at the `share` end of the bracket — every indeterminate placement. A
  deployment whose senders are entirely broken reports `witnessed: 0` and a
  silence, never a healthy share, which is the one failure that would matter.
- `frontier.ts` no longer spells the pre-order walk or the prefix counts; both
  move to `subtrees.ts`, which is internal to `src/signals/` and not re-exported
  from `index.ts`. Its behaviour is unchanged and its twenty-seven tests pass
  untouched.
- **Seven names reach `@jam-overture/loom/signals`** — `librarySendersOf`,
  `LibrarySenders`, `KindSenders`, `SenderSilence`, `SENDER_SILENCES`,
  `describeSenderSilence` and `SILENT_EXAMPLES`, measured at **79 bytes** of the
  published names index's 12,711 of headroom (27,289 over 2,116 names on `main`,
  27,368 over 2,123 with these).
- Nothing reaches a reader's browser: `broadcast.ts` and its import graph are
  untouched and the bundle measures what it measures on `main`.
- The portal view is `Loom portal`'s to draw, and what it may say is bounded by
  consequence two above.

## Alternatives considered

- **`silent ÷ placements`.** Rejected in clause 2. It is the figure a reader of
  the row would assume, which is the argument for it, and it is wrong in the
  direction that matters: it falls as a library gains leaves and as a window
  loses readers. The bracket exists so that the honest denominator does not have
  to be guessed at.
- **Counting an `unknown` witnessed placement as silent.** Rejected in clause 4.
  It would make this census disagree with the fault and with the *By page*
  drawer about one defect, and it would raise a claim on an absence of one. The
  bracket keeps it visible without claiming it.
- **Taking `PageFrontier[]` rather than `PageReading[]`.** Rejected: a frontier
  names the silent nodes and nothing says what kind each one is, and the three
  states a placement can be in are a fact about the tree rather than about the
  stops. Every other library census takes the readings for the same reason.
- **Raising a ninth `CollectionFault` for the library.** Rejected. The fault
  vocabulary is about one deployment's collection and is consumed per page by
  the fix-list; a library census is a different artefact with a different unit,
  and the fault that already exists is the right one for a page. Nothing here
  changes `CollectionFault`.
- **Reusing `KindSilence`.** Rejected in clause 9: `unread` is not any of these
  three states and a vocabulary that stretched to cover both would stop meaning
  either.
- **Publishing the whole list of silent node ids.** Rejected in clause 8. It is
  the wrong unit of work and it is unbounded; five is enough to go and look.
