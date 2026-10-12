# 0262 — What readers do inside a kind of part is a share of the readers who met it, and the door is only a weight

**Status:** Accepted

**Date:** 12 October 2026

**Section:** §4c (reader signals)

## Context

Three questions can be asked of one primitive type across a deployment's pages,
and until now two of them were answered.
[0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)
counts the **places** a kind stands and how many were reached;
[0256](0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)
counts the **readers** who met those places and read it. Both are about
attention.

The third is about what readers *did*, and it is the one a person who wrote the
component actually has: *of the readers who met my pricing card, how many did
something inside it?* `engaged` has been on a tally since the counters existed
and [0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)
interpreted it for one page a week ago. Nothing had ever asked it of a
**component**, which is the thing an author can replace and the thing `git log`
holds.

Nothing has to be collected to answer it. The counters are the same ones already
in hand, the join to the registry is the one every reading here already pays for
(0212), and the only thing that can be got wrong is the arithmetic of putting
several pages' answers together — which is where 0256 found its correction and
where this one parts from it.

## Decision

**`libraryActionOf(readings, rows)` in `src/signals/library-action.ts` publishes,
per primitive type and per role, the share of the readers who met a kind of part
that acted inside it. The unit is one page view of one place, as 0256's is.**

### It is the page reading summed, and not a second reading of a nought

Every rule about what one counter means stays 0242's and is applied by
`pageActionOf`, whose rows this folds: *a leaf has no inside*, *a press is an
occurrence and not a reader*, *an absent row is not a nought*. What is added is
only the arithmetic across pages. A library reading that re-decided what a
nought means would be a second answer to a settled question, and the two would
drift.

### The door appears in the weights and nowhere else

A placement's own share is `engaged ÷ reached`: two distinct page-view counts off
one row, so the straddle over-count (0147) is common to both terms and divides
out — 0242's figure, sound for 0221's reason. Across pages it does not divide
out, because the straddle rate is each page's own (0250), so each page's weight
is put on the scale the door counts in exactly as 0256 does: `appearances ÷ (1 +
inflation)`, which is `min(appearances, opened)`, taken as that minimum of two
whole numbers.

**But both terms here are reaches off the same rows**, so a page's own scale
factor cancels inside that page's contribution and only the *relative* weight of
one page against another needs the door. 0256's share divides a reach by the
**arrivals**, which puts the scale in its denominator and takes the whole figure
with it when a page cannot be scaled. Two consequences follow, and they are the
substance of this record:

- **A kind borne by one page needs no door row at all.** Its share is that
  page's own sound figure. A test gives the same answer at a fourfold straddle
  with no row present, because there is nothing for the straddle to move.
- **A page whose placements nobody reached needs no scale either**, since it
  contributes nothing to either term whatever its scale is. So the pages that
  must be scalable are exactly those that contributed reach, and `weighed` is how
  many there were.

Where two or more pages contributed reach and one of them cannot be scaled, the
whole kind is withheld — 0256's refusal unchanged and for its reason: a weighted
mean over a subset is a figure whose denominator nobody named.

### A count is published only on the door's scale

A scale-free row publishes its `share` and **not** `met`, `acted` or `ignored`.
Those are counts of page views at the door's scale, and a row the door could not
scale has no number on that scale to offer; putting the counters' own number in
the same column would mix two scales in one ranking. `onDoorScale` says which a
row is, and `unranked` says how many rows the ranking could not see — because a
ranking that silently skipped rows is the kind of omission a surface presents as
a complete answer.

### There is no nought share, and that is not a gap

A census can report that nobody read a kind; a reach reading can report that
nobody who arrived met it. Neither is available here, because the denominator is
*the readers who got there*. A kind nothing reached is `unread` and never a
nought — a nought would be the one thing the counters cannot tell apart from
nobody ever seeing it.

### A kind that is only ever a page's root does not lead the reading

A root is reached by every view that renders and its `engaged` is the page-wide
headcount of readers who did anything at all (0242), so such a row contains
every row it would outrank and would lead with *readers opened your pages and
did nothing* for ever. It is kept out of `mostIgnored` the way a page's own
reading keeps its root out (0242, and 0230 before it) — but by the row's `roots`
against its `placements` and never by the type's name, because a kind is not a
node: a type that is a root on one page and a band on another is a fact about a
component, stays in the ranking, and carries `roots` to say how much of it is
page-wide.

### The eleventh silence vocabulary, which brings one condition

`library-action`, seven members, subject `kind`. **Five are 0256's whole set
taken as it stands** — the census's two and the door's three — which is the
affirmative use of the limit 0256 found: a set cannot be reused across subjects,
and this reading's subject is a kind exactly as that one's is. So one word means
one state on any surface drawing both, and a test asserts the pair relates as
`one-state` rather than `one-reason`.

Two are added. `unwalked` is the eighth set's `no-action-credited` said of a
kind: a page holding occurrences that credit nobody (0167) puts reach into the
denominator and nothing into the numerator, so the kind is withheld rather than
blended and the pages are named. `unenterable` is the **twelfth condition**,
`nothing-inside`: a kind standing only in places with no element part under them
has no question to answer. It is the first condition in this subsystem about the
**shape of a page** rather than about a window, a row, a vocabulary or a filing
rule — it would be exactly as true if every reader in the world had read every
page. Its one sibling is `says-nothing`, the same fact about a page's words, and
the pair is now the shape of a page in the two things a reader can do with a
part: read it, and act in it.

## Consequences

- A deployment can ask *which of my components do readers use, and which do they
  only look at* across every page it has counted, and the answer survives a
  change to the rollup window. **Nothing was added to a payload, a browser, a
  column, a store or the vocabulary of kinds**, and the broadcaster is unchanged
  and byte-identical.
- **A row carries two numbers that must not be printed under each other's
  label.** `standings` is the *places* half — *readers acted in it in 3 of its 9
  places* — and `share` is the *readers* half. They can differ by an order of
  magnitude, which is the pairing care 0257 and 0256 already needed once and now
  need over three readings.
- **One page can switch off a kind's figure in two ways**, and the remedies are
  opposite: `unscaled`/`unopened`/`uncounted` are the door's states, and
  `unwalked` is a sender crediting nobody while its counters look healthy.
  `LibraryAction.unscaled` and `LibraryAction.unwalked` name the pages.
- `role` rows stay thin until `src/primitives/` declares one (0114, 0212). The
  join is at read time, so the day a role is declared every counter already
  stored reinterprets. Filed again, now with a sixth consumer.
- Nothing here makes per-reader identity cheaper or dearer to add later. Every
  input is a per-deployment aggregate and the unit is *(a page view, a place)*
  with no identity in it; a share of distinct readers would be a new figure
  beside this one rather than a correction to it.

## Alternatives considered

**Add `engaged` to the census's row and divide it there (0257's type).**
Rejected for the reason 0256 was written as its own module: the census's figures
have no window, no door and no correction in them, and a share of readers has
all three. One row carrying both error models, told apart by prose, is the thing
a surface prints wrongly.

**Weigh the pages by `reached` and skip the door.** This is `Σengaged ÷ Σreached`
across pages, which is the figure anybody writes first. Rejected and published as
a number in the suite rather than as a paragraph: with one page at a fourfold
straddle the sound answer is 0.34 and this gives 0.44, so a deployment that
shortened its rollup window would watch the figure move with no reader moving.

**Withhold a kind borne by one unscalable page, as 0256 does.** Rejected, and
this is the one place this record parts from that one. The refusal there is
forced by an absolute count in the denominator; here nothing is at risk, so
withholding would refuse an answer that is sound — and the single-page case is
exactly the common one for a component that stands on one page of forty.

**Publish the counters' own `met` and `acted` on a scale-free row.** Rejected:
the counts would be inflated by an unmeasured straddle, in the same column as
rows that are not, and the `mostIgnored` ranking reads that column.

**Blend an unwalked page's term into the mean.** Rejected. Its reach is real and
its nought is a filing rule, so the blend moves the figure by a sender's
configuration with no reader involved — the same class of error as a page the
door cannot scale, and it gets the same refusal.

**Report an `atMost` ceiling, as 0256 does.** Rejected because there is nothing
exact to bound it with: openings are counted at the door and actions are not. It
is also unnecessary, since the straddle cancels inside each page's contribution
rather than surviving into the result. `settled` reports the one error left,
which is openings not yet folded moving the weights.

**A share across every kind at once.** Rejected for 0256's reason: its
denominator counts a page once per element node, so it measures how finely the
pages were written as much as how they are used.
