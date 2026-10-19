# 0299 — A deployment-wide door adds every form's arrivals, and waits on the oldest fold under it

**Status:** Accepted

**Date:** 19 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-19**, from 0298, before this branch opened its pull
> request. 0298 was the next number free on `main` when this record was written;
> #679 then merged its own 0298 — *a project's ingest key is public and names
> its application* — while this branch was verifying, and two records sharing a
> number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)), so
> the record already on `main` keeps the number and this one gives way. Nothing
> in it changed but its number; the references on this branch were updated with
> it.

## Context

[0297](0297-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md)
fixed a quiet undercount in `regionReadingFor` — a revision served in two forms
has two region rows for one country and the second was dropped as the first
handed in twice — and filed the same fault in the reading beside it:

> `pageViewsFor` deduplicates a revision's door rows the same way region rows
> were deduplicated, so a whole-window read of a two-form revision takes one
> form's door and reports the other as a duplicate. It is the same fault in a
> different reading, and summing two door rows is a change to
> `pageViewReadingOf` rather than to a key.

The door is where this subsystem counts arrivals: one row per tree, per
revision, per audience
([0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)),
holding `opened` counted once at the door and `appearances` counted once per
rollup window
([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)).
A page served in two forms
([0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)) has two
of them. `pageViewsFor` took the first row of the ones it matched and reported
every row after it as `duplicated`, so an asking that named no audience — the
deployment-wide question — was answered like this:

```
SKIERS  opened 4,   appearances 5
RIDERS  opened 400, appearances 400   →   opened 4, duplicated: 1
```

**It is worse here than it was in the region map**, because the door is a
denominator. Six readings divide by it: a page's reach, a funnel's reach, three
library readings through `doorOf`, and `inflationFor`, whose whole job is to hand
one revision's straddle rate to a pace correction. One form's openings under
another form's counters is every share on those screens scaled by whatever
fraction of the deployment's arrivals happened to be in the row that sorted
first.

## Decision

**A door read without an audience named is the sum of every form's door; the
census says what it summed; and the fold it waits on is the oldest one under
it.**

1. **The dedup key is the audience**, which is what the store keeps one row per
   (0284). Two forms' doors are two rows and one arrival count. A second row of
   *the same* form is still a window handed in twice, is still dropped, and is
   still counted in `duplicated` — the openings on it are a running total and
   adding them would double arrivals permanently
   ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).

2. **The forms add because arrivals are people.** A reader who arrived arrived
   once, whichever form they were served, so the sum is one deployment's
   arrivals — the same clause 2 of 0297, one counter along. It stays the
   opposite of a page reading, where adding two forms' node counters is one
   number about two pages
   ([0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md))
   and `PageHealth` calls it `audiences-mixed`.

3. **The arithmetic is the reading's own, taken over the rows.** `summedOf`
   hands the rows to `pageViewReadingOf` rather than adding them again, so
   `opened` and `appearances` add; `drift` and `pending` are **summed per row
   and never taken from the two sums**, because a form mid-collection has
   openings no fold has reached and subtracting in the aggregate would let that
   cancel another form's straddles; and `inflation` is recomputed from the
   summed drift over the summed openings rather than averaged over the forms.
   That is the rule `pageViewReadingOf` already states for revisions, holding
   for forms of one revision for the same reason.

4. **`RevisionPageViews.audiences`** — the census `audiencesIn` answers, over
   the rows the reading added, in the three-valued shape 0297 gave the region
   map: `[]` where the rows named none, one name where it is one form's door,
   more than one where it is a sum. More than one is a measurement and never a
   fault.

5. **`audienceId` is what the asking named and never what the rows turned out to
   say.** It becomes `AudienceId | null`, like `RegionReading.audienceId`, and a
   single-membered census does not fill it in: a window holding one form today
   is not a reading of that form (0297 clause 3, 0294 clause 7). `RevisionPageViews`
   therefore stops extending `StoredPageViews`, because a reading over two rows
   cannot carry one row's audience.

6. **`updatedAt` on a sum is the newest of its rows**, because the question it
   answers is when the published number last changed.

7. **`foldedAt` on a sum is the fold the reading is waiting on**: the oldest
   fold attested by a row that still has openings pending, or the oldest
   attested of them all where none has, and absent where nothing attests one
   ([0274](0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md)).
   For one form's door that is the row's own timestamp, unchanged. For a sum it
   is the only choice that keeps a fault from hiding behind a busier form — a
   fold that ran a minute ago on one form cannot vouch for a form whose
   openings have been waiting a day — and it is taken over *the rows still
   waiting* rather than over all of them so that a quiet form with nothing
   pending cannot invent a stall. **A summed door is therefore stalled exactly
   when one of its forms is**, which is a property of the field rather than of
   `health.ts`.

8. **An unparseable fold instant attests no fold** and is skipped rather than
   kept as the oldest, which is how a stall reading already treats one (0274).
   One unreadable row cannot make a deployment's whole collection look
   unattested.

## Consequences

- **Nothing is superseded.** 0147, 0158, 0214, 0274, 0284, 0290 and 0297 stand.
  Clause 5 is 0297 clause 3 applied to a second reading, not a change to it.
- **Nothing reaches a reader.** No payload, no browser code, no column, no store
  and no kind of signal: the sum is taken at read time out of rows the store
  already keeps apart. `broadcast.ts` is byte-identical to `main`. This is the
  thirtieth thing taken out of what this subsystem already knows.
- **A deployment serving one form of every page sees no figure move.** Its door
  readings gain a census with one member and an `audienceId` that is `null`
  where the asking named none — which no reading in the repository reads, and
  which the type now admits to.
- **A deployment serving two forms gets six readings corrected upward**, and the
  correction is to the denominator: page reach, funnel reach, the three library
  readings through `doorOf`, and `inflationFor`. A share that was taken of one
  form's arrivals is now taken of the deployment's.
- **`duplicated` means what its doc comment always claimed** on this reading
  too: a window handed in twice, and nothing else.
- **A stall is judged per form without `health.ts` learning about forms**, by
  clause 7.
- **The parked per-reader identity work is no harder.** Every row in the sum is a
  counter about a revision and a form; nothing keys on a reader; and the census
  is a set of `aud_` names a host wrote about predicates Loom never sees.
- **One thing is left and is filed**: no screen reads `audiences` on a door, so
  a deployment-wide figure that is a sum over forms is drawn exactly like one
  form's. It is `Loom portal`'s, and it is the third such finding (0295, 0297).

## Alternatives considered

- **Keep `measured` as one row and add a `summed` beside it.** Rejected: the
  wrong number would stay the one every existing caller reads, and the six
  readings above would each have to choose. The matching rule exists so that a
  consumer does not make this choice
  ([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
- **Refuse a deployment-wide door over two forms, as a page reading refuses two
  forms' counters.** Rejected on clause 2, and it would withhold the arrival
  count from exactly the deployments 0263 was built for — the same argument 0297
  made for the region map, and the door is the denominator those deployments'
  every other figure needs.
- **Take `drift` and `pending` from the summed `opened` and `appearances`.**
  Rejected: it is arithmetically tidier and reports a page as more exact than
  any part of it is. A form with six openings no fold has reached and a form
  with six straddles would net to a revision with neither, which is the one
  thing `pageViewReadingOf`'s own doc comment says never to do.
- **Average the forms' inflations, or weight them by openings.** Rejected: the
  weighted average *is* the ratio of the sums, so it is either wrong or a second
  spelling of the same arithmetic — and the unweighted one is wrong in the
  direction that flatters a quiet form.
- **Group `pageViewReadingOf`'s `revisions` by revision too, so a window's list
  holds one entry per revision rather than one per form.** Rejected for now: its
  entries each name their own form, which is an honest list, and its totals
  already add across forms. A caller that wants the deployment-wide figure for
  one revision asks `pageViewsFor`, which is the call that knows what the asking
  was. Grouping there would also mean a screen listing a revision could no
  longer show the two forms it is serving.
- **Infer `audienceId` from a single-membered census** (clause 5). Rejected
  exactly as 0297 rejected it: one name on the rows is not one population behind
  them, and a window holding one form today is not a reading of that form.
- **Take `foldedAt` as the newest fold, or the oldest over every row.**
  Rejected: the newest lets a busy form vouch for a lagging one, which hides the
  fault the field exists to raise; the oldest over every row lets a quiet form
  with nothing pending invent a stall on a healthy deployment. Clause 7's rule
  is the one that makes the summed answer agree with the per-form answer.
