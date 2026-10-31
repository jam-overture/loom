# 0325 — A kind's pace is a pooled ratio over its outermost placements, and an unscaled page is kept

**Status:** Accepted

**Date:** 30 October 2026

**Section:** §4c (reader signals)

## Context

Five readings stand on one list of `PageReading`s and answer five different
questions about one primitive type: the **places** it stands and how many were
reached ([0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)),
the share of the **readers** who met those places that read it
([0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)),
the share of those readers that acted inside it
([0265](0265-what-readers-do-inside-a-kind-of-part-is-a-share-of-the-readers-who-met-it-and-the-door-is-only-a-weight.md)),
and what a change did to two of those.

**Every one of them is about reach, and none is about reading.** A part counts
as reached when half of it stood half a viewport up the screen
([0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md)),
which is a fact about scrolling. The question an author rewriting a band
actually has is the next one — *did anybody have time to read it* — and a page's
own reading has answered it per part since
[0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md):
the time its readers had against the time its words take, at a published
costing rate, with `skimmed` reached before the word floor is consulted because
words nobody counted can only make a part more skimmed than it already reads.

Asked of a **kind** it was unaskable, for the reason every library question was
before the join that answered it: a type's placements are scattered across forty
readings and nothing added them up. Nothing new is collected to answer it — no
payload, no browser change, no counter that does not exist, no column and no
byte on any wire.

## Decision

**`libraryPaceOf` publishes one row per type and one per role, and a kind's pace
is a pooled ratio of two reader-millisecond sums.** `src/signals/library-pace.ts`,
pure, linear in the parts times the rows, reaching no store, no clock and no
DOM.

Each counted placement contributes:

- **the time on screen**, `dwellMs`, added exactly as the rows hold it;
- **the time its words take the readers who met it**, `readers × wordsWithin ×
  msPerWord`, with the readers put on the door's scale (0250) before two pages
  are added.

`pace = Σ dwellMs ÷ Σ (readers × wordsWithin × msPerWord)`, and
`paceStandingOf` — 0230's own function, not a second spelling of its thresholds
— turns it into `skimmed`, `paced`, `lingered` or `unknown`.

Four decisions inside that are not forced by it:

**1. A pooled ratio and not a mean of ratios.** What comes out is a mean of the
per-placement paces weighted by the words each placement put in front of
readers, which is the magnitude a page's own reading already ranks its parts by.
A plain mean would let a caption two readers hurried past drown a band four
hundred of them did, which is
[0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)'s
rule stated the other way round.

**2. The straddle correction is in the readers and nowhere else.** A page view a
rollup counted twice carries one page view's dwell, so the numerator is sound as
it stands and the whole correction is in the denominator. The correction is read
off **each page's own row**, which is why this reading takes the rows where a
page's takes an `inflation` number: one scalar over forty pages would be a
correction nobody measured (0250).

**3. A page the door cannot scale is kept, and 0256 refuses one.** This is the
deliberate divergence. A share of readers must withhold, because a weighted mean
over the pages that could be priced is a figure whose denominator nobody named
and no direction of error is safe. A pace has a safe direction: leaving the
correction off only makes the readers more numerous, the denominator larger and
the pace lower — **towards `skimmed`, which is the verdict 0230 built to be
defensible**. So the page is kept, no correction is applied to it,
`KindPace.unscaled` says how many of the row's readers came from such a page,
and `LibraryPace.unscaled` names the pages in the vocabulary whose subject is a
page (0240).

**4. The outermost placement of a kind on a page stands for the ones inside
it.** A part is judged against its subtree's words, so a kind's figures nest
wherever it stands inside itself. Without a rule, a stack inside a stack puts
the inner stack's words and seconds into the row twice — and the role row for
parts that declare none is nearly every part of nearly every page, so it would
count one page's words once per level of its tree. An inner placement is counted
in `KindPace.nested` and is in no term. Nothing is lost: the outer placement's
words already include the inner one's.

**No pace over the whole library is published**, because two *different* kinds
nest in each other wherever a band holds a paragraph, and a total over the rows
would add one page's words once per level. That is the artefact a census of
places does not have and the reason 0257's census refuses to add `dwellMs`
across kinds.

**`KindPaceSilence` is the twenty-first silence vocabulary and brings no
condition and no subject.** Its two census reasons were already a kind's and are
reused as values (0256's move); its other two are the states a part's own pace
reports, said of a kind, which 0240's table is what holds together.

**`atDoorScale` is published from `door.ts`.** The per-placement half of the
scaling rule — `count × counted ÷ appearances` — was five hand-written copies
across three modules, which is the state `door.ts` was created to end and did
not quite reach: it held the per-page half and left the per-placement half at
each call site. A sixth copy was the alternative. The multiplication stays
before the division, so the helper is bit-identical to every copy it replaces
(0229 has been bitten by that exact reordering).

## Consequences

- *Do readers have time for your testimonial band, anywhere it stands* is one
  call, and so is the same question of a role. It is the first library reading
  that is about reading rather than about reach.
- A row carries two partitions over its placements and both are tests rather
  than sentences: `nested + counted + Σ silences = placements`, and the
  standings add to `placements − nested`.
- `dwellMs`, `needMs` and `shortMs` nest across kinds and must never be summed
  over rows. Nothing here sums them, and the refusal to publish a library-wide
  pace is the same fact stated once.
- A deployment with no door rows at all still gets every pace, biased towards
  `skimmed`, and `unscaled` is how much of it that is. A deployment with rows
  gets the corrected figure and `unscaled` is nought.
- The role rows are thin for the reason every role figure in this subsystem is
  thin — nothing in `src/primitives/` declares one (0114) — and thinner here
  than elsewhere: with no role declared, every part of a page is one kind, so
  the `null` row is the page's own pace and `nested` is everything else. That is
  the honest answer rather than a fault, and the day a role is declared the rows
  start answering with no migration, because the join is at read time (0212).
- Three modules now call `atDoorScale` where they spelled the rule out. The two
  cross-door terms of a reader-weighted comparison call it with its second
  argument, which is the only reason that argument exists.

## Alternatives considered

**A mean of the per-placement paces.** Rejected: see decision 1. It is the
figure a reader expects from the words *average pace* and it is the one that
cannot be defended, because every placement weighs the same however few readers
met it.

**Withholding the whole kind where one bearing page cannot be scaled**, as 0256
does. Rejected: see decision 3. It would make the figure absent on exactly the
deployments that have not finished wiring their door, where the uncorrected
figure is both available and safe — and `skimmed` is the verdict those
deployments most need.

**Counting nested placements and stating that the figures nest.** Rejected. The
`null` role row makes it indefensible rather than merely untidy: it would count
a forty-word page's words once per level of its tree and call the result the
pace of the parts that declare no role. A figure that has been added twice
cannot be unadded
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).

**Dropping the page root from every row**, as a page's own reading drops it from
`mostSkimmed`. Rejected: the root is a real placement of a real type and its
pace is the sentence *readers spend a third of the time this page's words take*,
which is the one a screen opens with. What the root must not do is win every
ranking it is entered in, so it is kept in the rows and the kinds that hold one
are out of `mostSkimmed` — which is 0230's rule at the other scale.

**A `standings` census over places and no pooled figure at all**, mirroring 0257
and leaving the reader-weighted figure for a later unit, as reach was split from
the census. Rejected: the split there existed because the two figures have
different denominators and shipping one without the other invited the wrong
reading. Here both come off one pass over the same placements, and the census is
published as `standings` on the same row.

**A new condition for *its words are a floor, said of a kind*.** Rejected:
`words-a-floor` already says it, and 0240's whole claim is that a condition is a
state of the world and a subject is a property of the reading. The twenty-first
set bringing no condition is evidence for that claim rather than an omission.
