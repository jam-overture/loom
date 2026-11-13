# 0382. A part that reported nothing with a reader below it is an eighth collection fault, and it reaches both ranking keys

**Status:** Accepted
**Date:** 2026-11-11
**Section:** §5 (reader signals), the counters

## Context

[0374](0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)
gave a page's reading a frontier, and with it `PageFrontier.notReporting`:
**parts that said nothing while a part inside them said it was reached.** A
reader was demonstrably below such a part, so it was on a screen and did not say
so. `frontier.ts` has called it *a defect rather than a reading* since the day it
landed, and `UnreachedPart.reportedBelow` carries the same fact per stop.

**Nothing acted on it.** It was a list of node ids on one page's reading, and a
page's reading is not where a deployment looks to find out what is wrong with
its collection. The entry this lane filed on 9 November put the gap plainly:

> `notReporting` is a different list and wants a different sentence. A part that
> said nothing with a reader demonstrably below it is a primitive to fix in the
> library, not a page to rewrite — **the fault vocabulary has no member for it**
> and the fix-list would be the place to say so.

That is the whole of this record. `collectionHealthOf` already takes the page
readings rather than the counters, for the reason an orphaned counter and an
uncredited action are visible at all: the join to the tree is what makes a fault
nameable. The one fault it could see and did not name was this one.

## Decision

**An eighth member of `CollectionFault`: `parts-unreporting`.**

1. **It is raised from `pageFrontierOf`, not spelled a second time.** `healthOf`
   reads `pageFrontierOf(reading).notReporting.length`, exactly as it reads
   `pageActionOf(reading).unwalked` for `actions-uncredited` (0242). One more
   linear pass over a page's parts, which is the bound every reading in this
   subsystem is held to.
2. **Its remedy is `senders`,** and it is published next to
   `actions-uncredited` — the two faults found by joining the counters to the
   tree and answered by the same hand. `openings-unmarked` is the senders' third
   and is not beside them, because a fault's place in this order is what it
   costs rather than whose hand it falls to (0271).
3. **`PageHealth.unreporting` carries the count**, beside `orphaned` and
   `doubled`. A count of parts of a tree and never of readers, so it is never
   ranked and never added to an arrival count: what a faulted page costs stays
   its `arrivals`.
4. **It reaches both ranking keys.** `spoilsTheLoss` and `spoilsTheConversion`
   are both `true`, so a ranked page with a silent part leaves the order of
   falls and the order of conversions and arrives in the fix-list as
   `contested` — collection work, carrying the rank it was taken out of.

### Why it spoils the fall, which is the sharper half

A fall is between two siblings on `reached` (0250). A part that never reports has
a `reached` of nought **while readers were demonstrably below it**, so the fall
into it is total — and a total fall is the sharpest fall a page can have. The
ranking key is the deployment's sharpest fall, so **one silent part is enough to
put a page readers were perfectly happy with at the head of the fix-list.** That
is `rows-mishandled`'s failure mode (0212) arrived at from the other direction,
and it is the reason a page with this fault must leave the order rather than lead
it.

The wider reason is the one on the member itself and matters more than the
arithmetic: **what this fault can see is a fraction of what it names.** Only a
part with something reported *inside* it is detectable, so a silent leaf — a
heading, a price, a control with nothing under it — is indistinguishable from a
part nobody reached. The fault therefore says *this page has senders that do not
report everything they are on*, which is a claim about every `reached` count on
the page, and not *these are the parts that went missing*.

### Why it spoils the conversion, where the argument is weaker

Written down rather than carried over, because a fault vocabulary written by
analogy is right in one of its two places and wrong in the other (0336). A funnel
end is satisfied by the node a signal names and the kind it is (0167), so a
silent end makes `converted` nought and manufactures a total loss exactly as it
manufactures a total fall. But a funnel's ends are usually controls with nothing
inside them, and a control with nothing inside it is never the part this fault
can name — so the end itself is rarely the detected part. It is `true` on the
wider claim instead: a page with one container that does not report has senders
that do not report, and an end that never fired is indistinguishable from an end
nobody reached.

### What it does to a page that also has a mishandled row

Both are published, in the vocabulary's own order, which is what a fault costs
and whose hand it falls to (0271) rather than which fault caused which — so the
silence is read before the mishandled row that may have produced it. A tree and a
window that do not belong together leave most of a page reading `skipped` and can
manufacture this fault as readily as they manufacture a fall. **Neither is
suppressed on the strength of the other**, because a page can have both for
unrelated reasons and hiding a real sender defect behind a caller's mistake is
the worse error. A caller holding both fixes their own two arguments first and
reads the page again.

## Consequences

- **A deployment is told about a class of defect it could not previously be
  told about**, with the remedy named: the primitive is not spreading the
  identity attributes a broadcaster reads, which `sdk/conformance.ts` is the
  check for.
- **Pages leave the two orders that silent parts corrupt**, which is the point,
  and they leave carrying the rank they would have had — so *why was this page
  moved* is answerable from the row.
- **This fault is the one most likely to be common on first adoption**, and
  that is information rather than noise. A deployment whose containers do not
  report has a fix-list built on `reached` counts it should not act on.
- **It cost four fixtures in this repository, and that is the finding.** 57 of
  the 125 tests in three files went red the moment it was raised — five of them
  the vocabulary tests a new member legitimately moves, the other 52 fixtures.
  Every
  page fixture in `agenda.test.ts`, `health.test.ts` and `window-agenda.test.ts`
  gave its bands counters and gave the stack holding them none — so every page
  this lane has ever tested against was a page whose outermost part was on a
  reader's screen and said nothing. The fixtures were modelling the defect by
  accident and nothing could see it. They now report the page as well, which is
  what a sender does.
- **Nothing reaches a reader's browser**, nothing is stored, nothing is added to
  a payload and **no new name is published** on `@jam-overture/loom/signals`: a
  member of a closed union and a field on a published type are neither of them
  names, so the documentation site's names index is byte-for-byte what `main`
  holds.

## Alternatives considered

- **Leave it out of both ranking keys, as `actions-uncredited` is.** Rejected,
  and it was the tempting one because it would have cost no fixture. That fault
  is `false` on a provable disjointness — a fall is made of `reached` and an
  uncredited sender spends `engaged` (0242). This fault is **about** `reached`.
  Saying `false` would be saying the ranking key survives a counter that is
  wrong, which is not true and would have been the over-caution's opposite: a
  verdict that is comfortable and wrong.
- **A reading of its own, grouping silent parts by the primitive type they
  are** — *which of your components are silent*, which is the sentence the
  finding reaches for. Deferred rather than refused: it is the better screen and
  it is a unit, it publishes several names onto an index with 148 bytes left,
  and it answers a question nobody can ask until a deployment knows it has the
  defect at all. Named in the plan as the next step.
- **Suppress it where `rows-mishandled` is present.** Rejected above: a page can
  have both for unrelated reasons, and this reading guessing between them is
  worse than publishing both.
- **Exempt the outermost part of a page**, which would have cost no fixture at
  all. Rejected as the plainest version of narrowing a check until it stops
  firing: a root that never reports while its bands do is the clearest instance
  of the defect, not an exception to it.
- **Count silent parts without raising a fault** — publish `unreporting` on
  `PageHealth` and leave the standing `sound`. Rejected: a page whose `reached`
  counts cannot be trusted is not sound, and a figure with no verdict beside it
  is a figure a screen draws and nobody acts on.
