# 0381. A part's pace across pages is one pooled quotient, and a goal's part is a reading of its own

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §5 (reader signals), the counters

## Context

A goal is a kind of signal on a part
([0350](0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)):
one node id, counted on the pages a project named or on every page that has it.
Every figure a goal has is therefore keyed on **a part across pages**, and the
one a screen has been waiting for since 8 November is how long readers stay on
it — recorded twice in `docs/portal.md` as *waiting on time on a part being
counted per reader*.

**Nothing was missing from the rows.** A tally carries `dwellMs` beside
`reached` for every part of every revision, and
[0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)
divided the two for a part of **one** page. What was unaskable is the same
question of a part standing on nine pages: nine rows, nine word counts and nine
doors, and nothing added them.

Two things could have answered it and neither does.

- **The kind row.** `libraryPaceOf`
  ([0325](0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md))
  pools every placement of a type. A goal names one node; the type row holds the
  other forty-nine sections of the deployment, and nothing in the library
  readings can narrow to a node.
- **The screen.** A surface could read the tallies for the node and divide
  `dwellMs` by `reached` itself. That is two columns divided with none of this
  subsystem's five rules applied to them — no per-page door scale, no per-page
  word cost, no floor, no silence and no deduplication — which is exactly the
  plausible-false-number failure this subsystem exists to keep off a screen.

## Decision

**`partPaceOf` is a reading of its own, keyed on a node id, and its pace is one
pooled quotient of two reader-millisecond sums.** It takes the node, the
readings of the pages it is counted on, the deployment's page-view rows, and the
costing rate; it publishes `PartPace`, whose `spentMs` is *the time the typical
reader who reached this part had there*.

1. **Pooled, never a mean of the pages' paces.** The numerator is `dwellMs`
   added as the rows hold it; the denominator is `readers × wordsWithin ×
   msPerWord` added over the counted pages. What comes out is a mean of the
   per-page paces **weighted by the words each page put in front of readers**,
   which is 0325's rule arrived at again rather than assumed: four hundred
   readers hurrying through a hundred words is a worse figure and a bigger thing
   than one reader lingering over four, and a mean of ratios lets the quiet page
   outvote the busy one.
2. **Each page's own words and each page's own door.** The same node can say
   more on one page than on another, so the cost is taken per page; the readers
   are put on that page's own door scale before two pages are added (0250),
   because one scalar over nine straddle rates would be a correction nobody
   measured. There is therefore no `inflation` option, for the reason
   `libraryPaceOf` has none.
3. **The arithmetic, the verdict and the silences are 0325's, read rather than
   respelled.** `paceStandingOf` takes the verdict, so a floor can hold up
   anything but `skimmed`; a page the door cannot scale is kept and counted,
   because the missing correction only ever moves a pace towards the safe
   verdict; and the silence vocabulary is `KindPaceSilence` **as values** — *it
   stands nowhere*, *nowhere it stands was read*, *its words could not be
   counted*, *it says nothing that takes time* are the same four states of the
   same quotient. Only the sentence is part-shaped, in
   `describePartPaceSilence`.
4. **Which pages is the caller's answer, not this reading's.** A goal naming
   pages hands in those pages' readings; a goal naming none hands in every page
   it can read. Narrowing inside would have put the goal vocabulary in
   `src/signals/`, which is the portal's and not this subsystem's.
5. **One reading handed in twice is counted once**, on `readingKeyOf`, and
   reported in `duplicated` — the error that would otherwise double both terms
   of the quotient while looking like twice the evidence
   ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
   A second door row for one revision is ignored and counted the same way.

**Nothing is collected for it.** No payload field, no counter, no column, no
table, no byte on any wire and nothing in a reader's browser: it is the
twenty-third reading taken out of the server-side join of
[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md).

## Consequences

- *Stays on it* on **Goals** is answerable now, as a figure since counting
  began, from counters the deployment already holds. It is **not** answerable
  over a range: the hourly table holds what readers *did* and not what they
  saw, which is a stated limit of
  [0362](0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)
  and unchanged by this.
- **A node standing as two primitives on two pages is reported, not resolved.**
  `typeDisagreed` names the later types and the first page's answer stands,
  because the two halves of every sum here would otherwise be about two
  different things with nothing on a screen saying so. It is the shape
  `LibraryPace.roleDisagreed` uses for the neighbouring disagreement.
- `readers` is a weight and not a headcount: a reader who met the part on two
  pages is two of them, as 0256 already says of a kind's.
- **Three names reach `@jam-overture/loom/signals`** — `partPaceOf`,
  `PartPace`, `describePartPaceSilence` — which is **27 bytes of the docs names
  index's 12,738 of headroom, leaving 12,711**. They were costed against the 148
  bytes that index had when this was written; #859 front-coded the file before
  it merged. The silence vocabulary is reused for the reason that outlives the
  cap rather than the one that motivated it: a twenty-third `meaningOf` and its
  closed set are two more places for two names of one state to drift apart.
- A per-page breakdown is **not** published. One part on nine pages has nine
  verdicts and `standings` counts them, but which page the part is skimmed on is
  a second question with a second shape, and nothing has asked it.

## Alternatives considered

- **A row on `LibraryPace` narrowed to a node.** Rejected: a library is keyed by
  kind, every figure on it pools a type's placements, and a node row among them
  would be a row of a different subject sorted into the same order.
- **A `nodeId` filter inside `libraryPaceOf`.** Rejected for the same reason
  plus one worse: a reading whose key set changes with an argument cannot be
  held to a published shape.
- **A mean of the per-page paces.** Rejected and tested against: it is the
  figure that reads `lingered` for a part four hundred readers skimmed.
- **A twenty-third silence vocabulary.** Rejected: four states already named,
  and a second name for each would need a second `meaningOf`, a second closed
  set and a second entry in `SILENCE_VOCABULARIES` — three places for the two
  to drift apart in, for no state a screen could not already phrase. The bytes
  it also saved were a reason of the week it was written and are no longer one.
- **An hourly dwell counter per part, so the figure takes a range.** Not taken
  here. It is about 6,000 rows an hour for a 6,000-node page, per revision, in a
  table nothing sweeps — the cost this lane's entry of 6 November priced and
  declined. It remains available and remains a decision of its own.
