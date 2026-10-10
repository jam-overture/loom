# 0250 — A deployment is ordered by readers lost at the door's scale, and a page the door cannot scale is out of the order

**Status:** Accepted
**Date:** 2026-10-09
**Section:** §4c (reader signals)

## Context

Every reading in this subsystem answers about **one revision of one page**:
where its reading stops
([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)),
how much of what it says gets read
([0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)),
whether readers had time for a part
([0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)),
what a change did to any of those, and who the readers were
([0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)).

A deployment has forty pages. **Nothing could put them in an order**, so the
first question anybody opening a portal asks — *where is the problem* — was the
one question the counters could not be asked. Every answer available was
*here is a page; here is what is wrong with it*, which requires already knowing
which page to look at.

The arithmetic looks like a sort and is not, because of one fact about the
counters it would sort on.

**A distinct view count is generous by every page view that straddled a rollup
window** ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
measured per revision since
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md).
Inside one page that over-count very nearly divides out of a ratio, which is
what 0221 rests on: a reader who straddled a window straddled it for the whole
page, so the inflation is common to a fall's numerator and its denominator.

**Across two pages it does not divide out, because the straddle rate is each
page's own.** A page readers linger on for twenty minutes, against a rollup
window of five, posts its batches into four windows and has every distinct
count against it inflated roughly fourfold. A page read in ninety seconds does
not. So an order over the raw losses is partly an order over how long readers
stay — and in the direction that is hardest to notice, because the pages that
rise to the top of it are the pages readers spend the most time on, which reads
as plausible.

The correction already exists and is published per page: `drift ÷ opened` off
that page's own door row, with `inflationFor` as the rule for picking the row,
written once beside the counter because the matching is the part that fails
quietly.

## Decision

**`deploymentReadingOf(pages, rows)` in `src/signals/deployment.ts` orders a
deployment's pages by the readers each loses at its sharpest fall, scaled to the
door: `lost ÷ (1 + inflation)`.** It takes the `ReadingProgress` of each page and
the whole window of page-view rows, and picks each page's own row out of them
with the published rule rather than another hand-written copy of it.

**The scaled figure is not a count of people and is not rounded into one.** It is
a loss restated at the scale the door counts in, which is the only thing that
makes two pages' losses the same kind of number. `lost` is published beside it,
unscaled, so nothing is hidden.

**A page the door cannot scale is reported out of the order rather than in it.**
Four standings say why — nothing read it, there is no door row, the row has
opened nothing, or it loses more readers at one fall than have ever appeared —
and two more say where it stands when it is in the order or has no fall at all.
The three absences map onto conditions
[0240](0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
already publishes; the fourth maps onto its existing inconsistency condition.

**No deployment-wide loss is published.** The artefact is an order, not a sum.
The one figure that is added is `arrivals`, which may be added for the reason no
other counter here may: a page view began on exactly one revision of exactly one
tree and was counted once at the door (0219).

**Both revisions of one tree stay in the order.** A revision shipped an hour ago
with four readers does not supersede the one nine thousand people read, and
`trees` says the two rows are one page so a surface can group them.

Nothing is added to a payload, a browser, a column, a store or the vocabulary.
The broadcaster is untouched.

## Consequences

- The portal has a landing screen it could not build: *these are your pages,
  worst first, and this is the band each loses its readers at*. What 0221 made
  showable for one page is now rankable across all of them.
- **It is the first thing this subsystem can tell a model without being told
  which page to look at.** 0221 named the band; this names the page, and the two
  together are an address a proposal can be written against.
- A deployment that upgraded mid-window sees its pages reported as `unscaled`
  until door rows exist for them. This clears itself, and it is the honest state:
  those pages are measured and are not yet comparable.
- The order moves when a deployment's rollup cadence changes, because the
  straddle rate does. That is the correction working — the raw losses would move
  too, and silently.
- A caller that concatenates two reads is caught twice: a repeated reading is
  dropped and counted, and a repeated door row neither doubles a page's arrivals
  nor halves its scaled loss. Counting the same thing twice cannot be undone
  ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)),
  so both are tested rather than argued.
- 0240's table gains a seventh vocabulary, and with it the first reading whose
  silences are about something **smaller than itself**: an order is silent about
  one of its members. 0240's claim holds — the subject is uniform across a set
  and is a property of the reading — and the thing it was easy to read into it,
  that a reading's silences are about the reading, was never true of anything but
  the first six. Nothing is superseded; the paragraph is written down.

## Alternatives considered

**Order on the raw `lost` counts.** One fewer dependency and no correction to
explain. Rejected: it is an order over dwell time as much as over readers lost,
and the bias favours exactly the pages a straddle inflates most. The failure is
invisible on the screen, which is the kind this subsystem has refused since
0147.

**Order on `share` alone, which needs no correction at all.** Rejected for the
reason 0221 already gave about one page's falls: a page two readers out of three
abandoned is a worse rate and a smaller problem than one four hundred out of a
thousand left. Across pages that is worse still — every quiet page outranks every
busy one, for ever.

**Divide the loss by the exact `opened` instead of scaling it.** Rejected, and
0221's reason is the whole of it: `reached` and `opened` are different counters
written in different places, and their ratio can honestly exceed 1. Scaling a
difference of two counts from one place is sound; dividing across the two is not.

**Keep only each tree's newest revision.** Tidier, and it is one page per row,
which is what somebody asking the question probably pictures. Rejected: a change
shipped an hour ago is the newest revision and has almost no readers on it, so
the rule would hide the revision that nine thousand people actually read behind
the one four did.

**Rank the unscalable pages in a second order of their own, by share.** Rejected:
two orders on one screen is two rankings a person has to reconcile, and the
second one is the ranking the alternative above was refused for. They are
reported as rows with a standing instead, which is a diagnosis rather than a
league table.

**Add a deployment-wide total of readers lost.** Rejected. Two revisions of one
tree are two rows in the order, so the total would count one page's problem
twice — and a figure that was added cannot be unadded afterwards. The published
shape is pinned by a test, so a total added later has to argue with it first.

**Add a standing for a page whose counters say more readers were lost than the
door ever saw.** Taken rather than rejected, and it is worth saying why it is not
defensive clutter: the scaled loss is a headline figure, and the one way it can
come out absurd is a reading no rollup produced. The fall it was taken from is
published anyway, because the disagreement is the thing worth seeing.
