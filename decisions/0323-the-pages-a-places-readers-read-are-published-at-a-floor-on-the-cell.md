# 0323 — The pages a place's readers read are published at a floor on the cell, and a place with no page above it is unattributable rather than unread

**Status:** Accepted

**Date:** 29 October 2026

**Section:** §4c (reader signals)

## Context

The region counter has been read in one direction since it existed. A row is a
place, a page, a revision, an audience and a count of the page views that
*began*
([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)),
and the two readings over it both group by place and sum the pages away:
`regionReadingOf` answers *where were the readers of these rows* and
`regionReadingFor` answers it of one revision
([0297](0297-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md),
[0315](0315-a-window-answers-where-its-readers-were-at-a-floor-it-is-handed-and-the-readership-is-published-beside-the-forms.md)).

**The other direction was never asked and needs nothing new to answer it.**
*Germany is a third of your readers — what are they reading* is the question an
operator asks second, it is the same rows grouped the other way, and it was
unaskable. No payload field, no header, no column, no browser change and no
addition to the vocabulary: the eleventh thing taken out of the rows a
deployment already has (§6).

The counter is also the right one to transpose. A region view is counted once,
at the moment a page view began, and is never recounted — unlike the per-node
`views`, which is a distinct count inside a rollup window and is added to the
next window's
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
So a cell summed across revisions and across months does not drift.

**What makes it a decision rather than a grouping is the floor.** A region map
withholds a bucket too small to be a readership, at a floor the runtime owns and
a deployment may only raise. A breakdown of a *named* bucket by page is finer
than the bucket: a country with four hundred views is a readership, and one view
of the careers page inside it is a person. Published at the bucket's own floor,
the transpose would hand back one level down exactly what the floor exists to
refuse — and it would do it on the reading whose whole purpose is to be read
alongside a page name.

## Decision

`regionPagesOf(rows, { floor })` in
[`src/signals/region-pages.ts`](../src/signals/region-pages.ts) publishes the
map and, for each place the map **named**, which pages the readers there read.

**The floor applies to the cell.** A page is named inside a place only where its
own count in that place clears the floor. What did not clear it is reported as
`withheld: { pages, views }`, naming no page — the same bargain the map strikes
one level up, so the numbers still add to the views there were.

**A cell is a place and a page, and never a revision or a form.** It sums every
row of one page in one place:

- **Across revisions**, because the question is about the page. Thirty readers
  from one country over two revisions are a readership; flooring the revisions
  apart would withhold both halves and report a page nobody reads.
- **Across forms**, because arrivals are people and a reader who arrived arrived
  once, whichever form they were served (0297). A page served in two forms is
  **one** page in one place and is named once. Naming it twice would publish a
  deployment reading more pages than it serves.

**A place the map withheld has no breakdown at all.** The breakdowns are one per
named bucket, in the map's own order, because naming a page inside an unnamed
place would name the place.

**The unplaced bucket is broken down in full.** `unknown` is never withheld by
the map, however small, because it names no place and there is nobody in it to
re-identify. The same argument reaches its cells, so they are never withheld
either — *two views of the pricing page from somewhere we cannot name* is
strictly less than the door already publishes exactly, per revision.

**`RegionPageStanding` is three members, not two.** `attributed` is every view
in the place on a named page; `partly-attributed` is some named and the rest
withheld; `unattributable` is **no page in the place above the floor**. The
third is the state a small deployment is mostly in, and the sentence is *this
place's readers cannot be attributed to a page* and never *nobody read
anything* — the readership is in the map above it, and it is the attribution
that is withheld rather than the readership that is absent. Two members would
have made a screen say the second.

**A page's share is of the whole bucket, including the views the breakdown
withheld.** The denominator is published rather than left to be derived because
the two candidates differ and the obvious one is wrong: dividing by the named
pages alone makes the shares sum to one and hides the withheld part, so a place
whose attribution is mostly withheld would read as fully attributed. The share
is absent only where the bucket's own total is nought, which is reachable on the
unplaced bucket alone.

**The map is held rather than restated.** `RegionPagesReading.map` is
`regionReadingOf` over the same rows, unchanged, so the totals a screen shows
beside a breakdown are the same numbers by construction rather than by
agreement. Two spellings of one rule that agree today is the fault this
subsystem has been bitten by twice (0218, 0235).

**The floor is required rather than defaulted**, which is 0322 applied at birth
rather than retrofitted. `regionFloorOf` underneath is raise-only, so a reading
called with nothing suppresses at the smallest bucket this runtime will ever
name; a deployment that raised its floor, read by a surface that forgot to say
so, would publish cells about real people with nothing in the diff to show it. A
caller with nothing of its own to say passes `DEFAULT_REGION_FLOOR` and has said
so in a line a reviewer can read.

**It is not a member of the window assembly.** `windowAssemblyOf` (0322) holds
the readings, the pairs and the two libraries, and each of those is an input to
a published comparison. A transpose is an answer a surface asks for directly,
it is deployment-whole and has no page reading to pair with, and adding a fourth
figure would make every window read pay for it. The composition is one line —
`regionPagesOf(window.regions, { floor: context.floor })` — and the context
already carries the one field only the deployment can answer, so no app-side
plumbing is added.

## Consequences

- A deployment can ask *what do readers here read* for the first time, off
  counters it already holds, with nothing added to what it collects.
- **Most of a small deployment's breakdown is withheld, and that is the design
  working.** A thousand views over ten pages and twenty countries has almost no
  cell above twenty-five. `unattributable` will be the commonest standing on a
  real deployment for some time, and a surface that reads it as emptiness will
  be wrong about a readership it can see in the map.
- A deployment that serves one page has a transpose that repeats its map. That
  is the same number read the other way and not a leak.
- The reading introduces no second way to double-count. It sums the rows it is
  handed exactly as `regionReadingOf` does, so a caller that concatenated two
  reads of the store doubles a bucket and its cells together, and the shares are
  unchanged. The bucket's own total is the map's number, not a recount of it.
- `RegionPageStanding` is **not** registered in
  [`silences.ts`](../src/signals/silences.ts). It is a standing, not a silence
  vocabulary, and the region readings have none — a region reading withholds
  rather than falling silent, and the withholding is published as counts.
- No payload field, no column, no migration, no store method, no new kind, and
  nothing reaches a reader's browser.

## Alternatives considered

**Floor the cells at the bucket's floor only — that is, break a named bucket
down in full.** Rejected: this is the whole hazard. A named place is large
enough to be a readership and its cells are not, and the breakdown is read
beside a page name, which is the pair that identifies.

**Publish the breakdown for every bucket, withheld ones included.** Rejected:
naming a page inside a place the map refused to name names the place. The map's
refusal has to travel.

**Key the cell by place, page and revision.** Rejected: it withholds nearly
everything for no gain. A reader of revision 4 and a reader of revision 5 are
both readers of the page, the question is about the page, and a caller who wants
one revision filters at the store where the filter belongs — which is the
argument `regionReadingOf` already makes about grouping before suppressing.

**Key the cell by place, page and form.** Rejected by 0297: arrivals are people
and a person who arrived arrived once. Two forms of a page in one country are
one readership of one page, and splitting them would withhold both where their
sum is nameable. `RegionReading.audiences` publishes what the breakdown summed.

**Divide a page's share by the named pages rather than the bucket.** Rejected:
the shares then sum to one and the withheld part disappears, which makes a
mostly-withheld place read as a fully attributed one.

**Two standings instead of three.** Rejected: a place with no nameable page and
a place with no readers are the two sentences a screen must never print over
each other, and with two members it would have had to.

**Make the floor optional, as the map's is.** Rejected for 0322's reason, which
bites harder here: the cell floor is the one that stands between a published
figure and a person, and an omitted argument is indistinguishable in a diff from
a caller that meant the default.

**Put the transpose on `WindowReadings.regions` beside the per-form maps and the
whole map.** Rejected: the maps there are keyed so that `readingKeyOf` pairs
each with its page reading, and the transpose has no page reading to pair with.
It would also be a fourth figure on a value one day old, charged to every window
read for a question a surface asks directly.
