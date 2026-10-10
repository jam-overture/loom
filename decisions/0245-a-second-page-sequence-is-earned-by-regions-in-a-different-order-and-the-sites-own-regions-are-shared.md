# 0245. A second page sequence is earned by regions in a different order, and the site's own regions are shared

**Status:** Proposed — **ARCHITECTURAL, needs review**
**Date:** 2026-10-08
**Section:** §4b

> **Why this number, renumbered 9 October 2026 by `Loom primitives`.** This
> record was written as `0241` on 8 October, when `0239` was the highest on
> `main`. Everything the branch was waiting behind then landed: #546 took
> `0240`, **#547 took `0241`**, #549 took `0242` and #551 took `0243`, so `main`
> now holds records to `0243` and this record's original number names a
> different decision there. `0244` is claimed by two open branches (#555, #556),
> which is a collision between those two and not this record's to resolve, so
> this is `0245` — the next number free on `main` and on every open branch.
>
> **What the renumber did not do.** Nothing this record decides changed, and it
> is still `Proposed`. The number is the half that was cheap to change and the
> question underneath it is still the maintainer's; a clash with a landed record
> is fatal under [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md),
> so leaving it would have meant the branch could not be merged whatever the
> answer turned out to be.
>
> **Why `Proposed` and not `Accepted`.** It does not contradict an `Accepted`
> record and it supersedes nothing, but it widens the model two of them state:
> [0162](0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
> says *the page is one path through it*, and
> [0171](0171-a-page-part-is-earned-by-the-region-it-occupies.md) reasons about
> *a page* throughout. This record makes that **two** paths, and the question of
> whether the phrasebook is one list or one per page kind is the maintainer's
> rather than a routine's. The branch is built so that answering it either way
> costs a rename and not a rewrite — see *What is built and what waits*.

## Context

[0183](0183-a-page-for-another-kind-of-business-is-the-same-sequence-with-different-nodes-in-it.md)
closed the *not a landing page* row of the gap inventory by showing that a shop,
a studio, a podcast and an assistant all have the **same** sequence of regions
and differ only in the nodes filling four or five of them. Twelve primitives
came back into reach on that argument and the record was right.

It also, in `Alternatives considered`, declined to open a second sequence — and
declined it **with its trigger named**:

> **Open a second `PAGE_SEQUENCE` for a non-developer page.** […] It buys
> nothing here — all four candidates place cleanly in the existing order […]
> **Not refused, deferred with its trigger named:** a second sequence is earned
> by a page whose *regions come in a different order*, which is a documentation
> page or a reference, not a shop.

**That trigger is now met, and it is met by the one reach gap left in this
lane.** The reach measurement stands at 97 of 107, and the ten unreached are not
ten pieces of missing work. Nine have principled reasons:

| | count | why it is not a band nobody wrote |
| --- | --- | --- |
| `media`, `embed`, `lightbox`, `carousel`, `before-after`, `overlay`, `pin` | 7 | **the framework's asset seam.** `mediaUrlSchema` excludes `data:` and a `/path` is a broken image on a deployment that does not host it. Re-filed 5 and 6 October; six of the seven also fail [0233](0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)'s first clause, so a bound twin is not the way round it |
| `waiting-state` | 1 | **a state this runtime is never in.** `loom.feed`'s own header: resolution happens before the walk (0058), so every binding is `ready` or `unavailable` by the time a component runs. *"A skeleton drawn here would be a picture of a state this runtime is never in. Filed rather than faked."* |
| `page` | 1 | **it is the render root.** No band may build one, because a band is inserted *into* a page |
| **`link-trail`** | **1** | **a breadcrumb belongs above an interior document, and there is no interior document.** The only one of the ten waiting on work in this lane |

So the last in-lane reach gap and 0183's named trigger are the same thing seen
from two ends, which is the strongest argument available for building it now
rather than choosing another third design of a part that already has two.

## Decision

**A page kind is an ordered tuple of regions. A second tuple is earned when the
regions come in a different order or include a region the first does not, and
the regions that belong to the *site* rather than to the *page* are shared
between tuples rather than redrawn.**

Two clauses, and the second is the half that is not obvious.

### 1. The document sequence earns its place under 0171's own test

0171's bar is *the region*, and the test is that two candidates cannot stand in
for each other. Asked of a reference page against the twenty-two:

| region | what occupies it | what the twenty-two offer, and why it cannot stand in |
| --- | --- | --- |
| **`trail`** | `loom.link-trail` — where the reader is and every step back out | `banner` is the only strip-shaped part and it sits **above** the navigation carrying one sentence and one action. A trail sits **below** it and is a position rather than a message. Neither can stand in for the other |
| **`document`** | one continuous text — title, lede, prose, a code sample, a callout, a parameter table, and the contents beside it | `features` is the body region and it is a **grid of claims that is scanned**. A reference page whose body is a three-column feature grid contains no reference; a landing page whose body is nine hundred words of prose has no features. `articles` is a **selection of what the site publishes**, which is a list of teasers and not one document |
| **`onward`** | the position of this document in an ordered set — previous, next, and the way up | `articles` again answers *where is everything*, and `articles-index` already carries a `loom.link-pager` for exactly that. *Previous and next page of this guide* is not a selection of the site's output; it is this page's place in a sequence a reader is walking |

And the order differs, which is the trigger 0183 actually named: a reference page
has **no hero**. It opens with the reader's position and goes straight into the
text. That is not the landing sequence with bands removed — `banner`, `hero`,
`proof`, `metrics`, `pricing`, `testimonials` and `cta` are all absent, and
three regions appear that the landing page has nowhere to put.

### 2. The header and the footer belong to the site, so both sequences name the same bands

`nav` and `footer` are in both tuples and are **not** redrawn. The document
sequence resolves them through `compositionById`, so a deployment that changes
its header changes it once.

This is the clause that keeps the record honest about what it is adding. If a
second sequence meant a second header, the catalogue would hold two designs of
one region that must never diverge, and the first deployment to edit one of them
would ship a site whose pages have different navigation. The shared-region rule
is derived rather than listed: a part present in both tuples resolves from the
landing catalogue, and a part present in only the document tuple resolves from
the document catalogue.

### 3. Zero new primitives, and that is the measurement worth keeping

A whole new kind of page needed **no primitive that did not already exist.**
Every node in all three bands is a type registered before this run. The brief
this library is written against is a breadth mandate, and the honest report on
it at 107 entries is that breadth is no longer the binding constraint — the gap
inventory's own arithmetic puts the ceiling at 110–120 and recommends spending
the week on compositions, and a second page kind arriving for the cost of three
compositions is that recommendation coming out ahead.

## What is built and what waits

Because this is `Proposed`, the branch is deliberately shaped so that **nothing
existing changes meaning**:

- `COMPOSITION_PARTS` is twenty-two, unmoved.
- `PAGE_SEQUENCE` is the twenty-two-band landing page, unmoved.
- `STARTER_COMPOSITIONS` holds the fifty-nine landing bands, unmoved — so
  `compositions.test.ts`' *every band declares a part the page sequence knows*
  stays green **unweakened**, which it would not if the document bands had been
  appended to it.
- `CATALOGUE_TYPES` is unmoved, so the out-of-lane consumer that counts it
  (`apps/loom/app/(docs)/_lib/compositions.ts`) reports exactly what it reports
  today.

The second sequence arrives beside the first as `DOCUMENT_PARTS`,
`DOCUMENT_COMPOSITIONS`, `DOCUMENT_SEQUENCE` and `DOCUMENT_TYPES`.

**What review has to settle is one question: is the phrasebook one list or one
per page kind?** Both answers are cheap from here:

1. **One list.** `STARTER_COMPOSITIONS` becomes the union and
   `CATALOGUE_TYPES` with it; the *declares a part the page sequence knows*
   assertion widens to *knows in some sequence*; `partCount` on the docs site
   becomes two numbers. This is the reading 0162 most naturally extends to — the
   phrasebook is every design of every region, and a page kind is a path.
2. **One per page kind.** What is on this branch, named as the permanent shape,
   and a surface offering bands asks which sequence first.

A routine should not pick between those, because the first changes a published
export two other lanes read and the second decides that a catalogue is plural
for as long as the project lasts.

## Alternatives considered

**Widen `COMPOSITION_PARTS` to twenty-five.** The cheapest-looking option and
the one that breaks the thing the tuple is for. `PAGE_SEQUENCE` is *derived* from
it, so admitting `trail`, `document` and `onward` puts a breadcrumb, nine hundred
words of reference prose and a previous/next pager **on the canonical landing
page**, between the bands that are already there. 0171's third consequence prices
exactly this: *the canonical page gets one band longer*. Three bands longer and
three of them wrong is the same mistake three times.

**Make the document page one fat composition.** One band whose `build` returns
the whole page. It renders the right pixels and loses the property every other
band has: the parts would not be separately choosable, a deployment could not
swap the trail's separator without the document coming with it, and the sequence
would be a fact about one function rather than a list anything can read. It is
`docs/primitive-granularity.md`'s argument at the band scale.

**Put the document bands in `STARTER_COMPOSITIONS` now and widen the test.** The
shape option (1) above would take, and a routine must not take it on its own:
the assertion that every band's part is a known page part is the guard that
caught the duplicate-anchor defect's whole class, and widening it is a change to
what the published phrasebook *means* for two consuming lanes. Deferred to the
record rather than done quietly, per `docs/routines.md`.

**Reach `loom.link-trail` by putting a trail on the landing page.** What a run
optimising the reach number would do. A breadcrumb on a landing page is a
breadcrumb pointing at nothing — the page is the root of the site — so it would
move the measurement by one and put a false piece of chrome in the catalogue.
Reach is an instrument for finding surface nobody has reviewed, and gaming it is
worse than leaving it at 97.

**Admit `contents` as a fourth new part.** An *On this page* rail is a region of
a reference page, and it is **not** a band: `loom.page` stacks its children in
one column, so a region beside the text cannot be a sibling of it. It is a
`loom.split` inside the `document` band, which is where it is.

## Consequences

**Reach moves to 98 of 107 over both sequences, and the remaining nine each have
a reason that is not *nobody wrote a band*.** That is the more useful statement
than the number: this lane's reach work is finished until the framework answers
the asset question, and the table at the top of this record is what a future run
should read before planning against the measurement.

**`DOCUMENT_SEQUENCE` is five bands and three of them are new.** `nav` and
`footer` are the landing canonicals by reference. A part with no canonical design
is a red test in `documents.test.ts`, the same way `PAGE_SEQUENCE` is held.

**The document sequence has one design per new part**, which by 0162's reading
is a part where a deployment has no choice. That is the correct state for a
sequence on its first day and it is recorded as a known debt rather than
discovered later: the designs-per-part instrument went 9 → 5 → 1 → 0 over the
landing page and the same work is now owed on this one.

**`planComposition` and `compositionInterpreter` accept a `Band`**, a structural
supertype of `Composition` whose `part` is a `string`. Neither function ever read
`part` — planning is `build` and an insertion point — so this is a widening that
no existing caller notices, and it is what lets a document band go through the
same Gate, the same policy and the same log as every other. **No second channel
into the tree was opened**, which the brief forbids by name.
