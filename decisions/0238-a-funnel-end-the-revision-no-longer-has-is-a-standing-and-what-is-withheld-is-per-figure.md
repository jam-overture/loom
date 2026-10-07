# 0238 — A funnel end the revision no longer has is a standing, and what is withheld is per figure

**Status:** Accepted
**Date:** 2026-10-06
**Section:** §4c (reader signals)

> **Renumbered on 2026-10-07**, from 0236, when `Loom merge` brought `main` into
> the branch that carried it (#539). `main` had meanwhile accepted a different
> 0236 — *a viewport names a device, and the pointer is part of it* (#538) — and
> two records sharing a number is fatal (0097), so the record already on `main`
> keeps the number. This record was written on 6 October and nothing in it
> changed but its number; the citations on the branch were updated with it.

## Context

A `FunnelPair` is two node ids a deployment writes down in advance, and asks of
a revision: *of the page views that did X to node A, how many did Y to node B*
([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
A revision is a tree a proposal changed. Nothing has ever held those two facts
against each other.

So a pair whose end was moved out, renamed or removed by a change answers
`reached 0, converted 0` against every revision after it, and
[0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)
turns that into `entry.share` of nought, `lostBefore` of 1 and
`worse: "before"` — *every reader who arrived failed to reach the start of this
funnel.* That is byte-identical to a pricing band at the bottom of a page
nobody scrolls, and the two remedies are opposite: one is a page to fix, the
other is a question to re-point. A deployment acting on the first reading
rewrites a page that is fine.

The counters cannot tell them apart and never will: a count is the absence of
evidence either way. The tree can, and §6 already holds it —
`pageReadingOf` is every element node of a revision, which 0212 made the
universe a window is read against precisely so that absence could be an answer
rather than a missing row. Nothing joined it to the pairs.

This is the eighth thing taken out of that server-side join rather than off the
wire. Nothing is added to a payload, a browser, a column, a store or the
vocabulary of kinds.

## Decision

**`funnelReachOf` takes a `PageReading` where it took a tree id and a revision
number.** The reading *is* the revision: it carries both, so `pageViewsFor` and
the row filters are unchanged, and a caller can no longer name one revision
while holding another revision's tree. 0231 is **extended, not superseded** —
the property it records holds in full, because a reading is still handed in
rather than inferred and both sets of rows are still filtered to it and reported
on.

**Each end gets an `EndStanding`, and the set has two members.** `present` means
the revision has an element node with that id; `absent` means it has not. It is
deliberately not three: *the node is there and cannot satisfy this kind* is the
case a pair asking for `activated` on a band falls into, and nothing in the tree
can say so. `role` declares one member today (0114) and it is not *a control*.
So `present` means the question still names something and no more, and the doc
comment says that rather than implying a guarantee it cannot keep.

**What is withheld is per figure, not per pair.** An absent `to` leaves
`reached` a fact about readers — they got to the first end whatever became of
the second — so `entry` and `lostBefore` still stand and only the figures
needing the second end are withheld. An absent `from` withholds all of them,
`lostBefore` included, because its nought reads as *every reader failed to
reach it*, which is the inversion this standing exists to stop. `reached`,
`converted` and `updatedAt` are always published: they are what is stored, and
*this question is stale and here is what it last counted* is the useful
sentence.

**`rate` is withheld on a stale end although it needs no denominator.** It
survives a silence, because two counts off one row divide into each other
without arrivals (0221's cancellation). It does not survive a missing end: a
silence is *no denominator*, and a stale end is *no question*, and the second
is not a thing to publish a ratio for.

**An absent end with a count against it is `orphaned`**, which is the alarm
`PageReading.orphaned` raises for the node counters, raised for the pairs. Rows
written by one honest deployment cannot produce it; a tree and a window that do
not belong together can. It is independent of `unreconciled`, which is a count
above the page views there were to hold it, and both can be set at once.

**`stalePairs` and `orphanedPairs` are counted off the deduplicated pairs**, so
a caller who concatenated two reads of the store cannot double them (0158).

**A pair is never reported as out of order.** The tree says where the two ends
sit, so the available and tempting fate is *the `to` now precedes the `from` in
reading order*. There is none, because a pair has no path and no ordering beyond
its two ends (0146): it asks which page views did both things, not in which
order, and a reader who scrolls back up satisfies it honestly.

## Consequences

- **A screen can lead with the number of its questions that have gone stale.**
  *Three of your five funnel questions are about parts this version of the page
  no longer has* is a sentence nothing could previously say, and it is the one a
  deployment acts on after a change lands.
- **Asking a funnel question requires holding the page.** A caller with the
  counters and no tree can no longer call this. There is no such caller today —
  `funnelReachOf` landed this morning with none — and the portal already builds
  the reading for three other figures on the same screen. The cost is real for a
  status endpoint or a backfill and is accepted: the alternative is the
  ambiguous answer by default, which is the defect.
- **Every existing figure is unchanged where both ends are present**, which is
  the ordinary case. The thirty-three tests 0231 shipped pass untouched against
  a reading whose tree holds every node they name.
- **The gap this leaves is a declaration, and it is another lane's.** Until a
  primitive can declare what it is able to report, *a band that cannot be
  pressed* and *a button nobody pressed* are one answer. Filed.
- **It costs one pass over the reading's parts**, to build a set of its node
  ids. The function stays linear and reaches no store, no clock and no DOM; the
  broadcaster's import graph is untouched and its weight is unchanged.

## Alternatives considered

**Leave the reading optional, so the existing call keeps working.** The smaller
change, and the one the finding's wording suggests. Rejected: the ambiguous
answer would stay the default, every consumer would have to remember to pass the
tree, and the one that forgot would draw a stale question as an abandoned funnel
with no way for anything downstream to notice. There is no consumer to spare.

**§10's five fates for a dissolved stop, reused here.** The finding proposed
them and they are the right vocabulary one revision later —
`absent`, `moved`, `reordered`, `separated`, `unanchorable` all describe *a pair
compared across two readings*. A funnel is asked of one revision at a time, so
four of the five have nothing to be relative to, and `reordered` is refused
above on its own merits. Reusing the set would have meant three members that can
never be returned.

**A blanket `null` on every figure of a stale pair.** Simpler to describe and
one line shorter. Rejected because it throws away a true measurement: where only
the `to` is gone, the readers who reached the first end did reach it, and
`entry.share` is the figure that says how much of the page's traffic the stale
question was about — which is exactly what a person deciding whether to re-point
it needs.

**Withhold the counts as well, so a stale pair reports nothing at all.**
Rejected: the counts are what was stored and they are the evidence that the
question used to work. A pair showing `reached 400` beside *this end is gone* is
how somebody recognises which question they lost.

**Infer the staleness from `PageReading.orphaned` instead.** It already lists
counter rows naming nodes the tree lacks, so an orphaned pair end would often
appear there. Rejected: it is populated from the node tallies rather than the
funnel rows, so a pair whose end never counted anything — the common case, and
the one the finding is about — leaves no trace in it at all.
