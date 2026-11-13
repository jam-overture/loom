# 0390. A part's pages are a second order, ranked on the reading time its readers did not have

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §5 (reader signals), the counters

## Context

[0381](0381-a-parts-pace-across-pages-is-one-pooled-quotient-and-a-goals-part-is-a-reading-of-its-own.md)
answers *how long do readers stay on this part* with one pooled quotient over
every page the part stands on, and publishes `standings` beside it — so a goal's
screen can say **this part is paced across your pages and skimmed on two of
them**, and cannot say *which two*. 0381 recorded that absence as a second
question rather than an omission, and this is the answer to it.

**The rows were already computed and summed away.** `partPaceOf` loops the
readings, and for each one reads that page's own pace, its own words and its own
door; it adds the terms into the pooled sums and keeps nothing. So the question
is not what to collect or even what to derive — the twenty-fourth reading taken
out of the server-side join of 0212 costs an array — it is **what order to
publish them in**, and an order a screen invents is the failure this subsystem
exists to prevent.

Two keys were available and they disagree about which page to go to.

- **The pace**, which is the rate the verdict is taken from. It is what the
  question sounds like it asks for: *most skimmed first*.
- **The reading time its readers did not have**, `needMs − dwellMs` where
  positive, which is a magnitude in reader-milliseconds.

They disagree on the ordinary case, not an edge one. A band four hundred readers
each had a second of, where its words take five, is short of **1,600 seconds** of
reading at a pace of 0.2. The same band on a page one reader hurried past in a
tenth of a second is short of **4.9** at a pace of 0.02. The rate puts the single
reader first.

## Decision

**`PartPace` publishes its pages as two lists and a head: `ranked`, `unranked`
and `worst`. `ranked` is ordered by `shortMs` — the reading time that page's
readers did not have — most first, then the lower pace, then by tree id and
newest revision first.**

1. **The key is a magnitude, not a rate**, which is the rule every other order
   in this subsystem already takes: a deployment's pages are ranked on the
   readers each loses (0250), its unread places on what one fix recovers
   ([0377](0377-a-deployments-unread-places-are-a-fourth-order-ranked-on-what-one-fix-recovers.md)).
   A page with the worst rate in the deployment and one reader on it is not the
   page to go and look at.
2. **The tie-break is the pace**, and it is only ever reached by pages whose
   readers had time enough — `shortMs` is nought exactly where `pace` is at least
   1 — so it ranks the pages nearest to being short. The last key is the page
   itself, so two pages that cost the same do not reorder on a refresh.
3. **Every figure on a row is that page's own, at that page's own door scale**
   (0250), and not a share of the figure above it. `readers`, `dwellMs` and
   `needMs` add to `PartPace`'s three exactly, which is the only thing tying the
   breakdown to the figure it breaks down and is asserted term by term.
4. **A row's verdict is its page's own reading's verdict**, carried off
   `PacedPart.standing` and never re-derived from the row's own `pace`. The two
   quotients agree mathematically and need not agree in their last float place,
   and `standings` counts the first — so a breakdown of *skimmed on two of them*
   that recomputed the verdict could name three pages or one. A screen reads
   `standing`; it does not compare `pace` to a threshold.
5. **`shortMs` is the one term that does not add**, and it is published on a row
   that is ranked by it. The rows' `shortMs` sum to at least `PartPace.shortMs`
   and are equal to it only where no page had time to spare, because the pooled
   figure lets a page readers lingered on pay for a page they skimmed and a row
   pays for nothing but itself. Both figures are true; a surface adding the rows
   up has published a number the reading above it contradicts.
6. **A placement with no figures is in `unranked`, by page, carrying its
   silence** — and **none of its terms is in the sums above**. That is not a
   rounding: a part that says nothing can have been on screen for twenty seconds,
   and that time has no words to be measured against. The row carries it, the
   pooled numerator does not, and adding it would have put time in a numerator
   whose denominator refused it.

## Consequences

- *Which page is this part skimmed on* is answerable, and it is the sentence
  `standings` could begin and not finish. `worst` is the one page to go to.
- **`ranked.length` is `counted`** and `ranked.length + unranked.length` is
  `placements`, so the census and the breakdown cannot disagree about how many
  pages there are or what state each is in.
- **The rows stand where the figure above them is withheld.** A part whose words
  are a floor and whose readers stayed longer than the counted words take has no
  publishable pooled pace at all, and the breakdown is then the only thing on the
  reading that says which page to go and fix the declaration on.
- A page the door could not scale carries its own `unscaled` silence on its row.
  The missing straddle correction only ever moves a pace **down**, so such a row
  can rank too low and never too high — the same reason 0325 keeps the page
  rather than refusing it. A floored row's `shortMs` is a floor for the same
  reason and in the same direction.
- **Two names reach `@jam-overture/loom/signals`** — `PacedPlace` and
  `MeasuredPlace` — at **20 bytes** of the published names index: 27,289 over
  2,116 names on `main`, 27,309 over 2,118 with them, leaving 12,691 of 40,000.
  `MeasuredPlace` exists so a screen drawing the order does not null-check four
  fields that an ordered row cannot be missing.
- **Nothing reaches a reader's browser**, no payload field, no counter, no
  column and no table. `broadcast.ts` and its import graph are untouched.
- `readers` on a row is a weight and not a headcount, as `PartPace.readers` and
  0256 already are: a reader who met the part on two pages is two of them.

## Alternatives considered

- **Ordering by the pace.** Rejected, and tested against: it puts a page one
  reader hurried past above a page four hundred readers skimmed. It is also the
  only key here that is not comparable across pages of different sizes.
- **Ordering by the readers, or by the words passed.** Rejected: both rank the
  busiest page first whether or not its readers were short of anything, which is
  a list of where the traffic is and not of what to fix. `wordsPassed` is already
  `pace.ts`' ranking key *within* one page, where the readers are held constant
  and it is the right one.
- **One list with the silent pages at the end.** Rejected for the shape 0377
  already took: a row with no figure sorted into an order by a figure it does not
  have is a row whose position means nothing, and a surface cannot tell where the
  order stops.
- **Publishing the rows unordered and letting the screen sort.** Rejected: this
  is a judgement about which page to go to, and leaving it to a surface is how
  two screens come to publish two different *worst pages* from one reading.
- **Re-deriving each row's verdict from its own `pace`.** Rejected: it would
  disagree with `standings` in the last float place, which is the one kind of
  disagreement nobody can see and nobody can reproduce.
- **Summing the rows' `shortMs` and publishing it as the part's.** Rejected: it
  is a different figure from `PartPace.shortMs` and both are true, so publishing
  both on one reading with nothing distinguishing them is how a surface comes to
  add two numbers that are not in the same units. The row-level figure is
  published and documented as not adding, next to the key it is the key for.
- **A second function rather than three fields.** Rejected: it would read the
  same readings and the same rows a second time to recompute terms this loop
  already holds, and the two could then be called with different arguments and
  disagree.
