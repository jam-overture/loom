# 0257 — A kind of part is read across the places it stands, and the unit is the placement and never the reader

**Status:** Accepted

**Date:** 10 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-11**, from 0254, when this branch (#576) was merged.
> `main` had meanwhile accepted a different 0254 — *the testing door publishes
> one primitive broken in whichever way the caller names* (#575) — and two
> records sharing a number is fatal (0097). 0255 and 0256 were claimed on open
> branches, so 0257 was the next free number. Nothing in this record changed but
> its number; the references to it on this branch were updated with it.

## Context

Every reading this subsystem publishes answers about **one page**: where its
reading stops (0221), how much of what it says gets read (0235), what a change
did to it (0224, 0239, 0244, 0251). [0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
is the first that is larger than a page, and it is still an order *over* pages —
the unit it ranks is a page and the sentence it gives is *fix this one next*.

Nothing could be asked about a **kind of part**. A deployment builds forty pages
out of the same two dozen primitives, and *do readers read the testimonial band
anywhere* is a question about the library rather than about any one page. It is
the question a model proposing a change most wants answered before it proposes
one, and it is the question `docs/signals.md`' first queue item names in so many
words — *which roles readers engage with and which they skip*. A type's
placements are scattered across forty readings, and nothing joined them.

The join is free. A `PartReading` already carries the type, the role its type
declared (0114), the standing the window gave it and the words it says
(0212). The only question is what a row over them counts.

## Decision

**`libraryReadingOf(readings)` is a census of the library by kind of part, and
its unit is the placement.** A placement is one element node of one revision —
exactly what a `PartReading` is. A type's row says *`loom.testimonial` stands in
nine places and readers reached two of them*, and a role's row says the same of
every part playing one role.

**Nothing that counts readers is on a row.** `views`, `reached` and `engaged`
count distinct page views, and distinctness cannot be added (0147). A
`RoleReading` already refuses them one level down (0212), and across pages the
case is stronger rather than weaker: each page's distinct counts are inflated by
**its own** straddle rate, which is the fact that forced every page's loss onto
the door's scale before it could be ranked (0250). The published keys are pinned
by a test.

**So the headline is a share of places, and it is sound without any
correction.** `read ÷ (read + skipped)` is a ratio of two counts of parts of
trees. No reader appears in either term, no rollup window appears in either
term, and a deployment that shortens its window cannot move it. A placement
whose standing is `unknown` is in neither term, so a quiet deployment is not
reported as a skipped one.

**Words add and are published; dwell adds within a kind and is not totalled.** A
part's words are its own and a page's words partition across its parts exactly
once (0212), so two placements' words are two different sentences and
`wordsReached ÷ words` is honest. `dwellMs` is not: a part is on screen while its
children are, so a nested placement's seconds are its ancestors' too. It is
published per kind as a volume of attention, with that said on the field, and
there is **no reading-wide dwell total** because across kinds it is not a
duration anybody spent.

**`mostSkipped` is ranked by the count of places and not by the share**, which is
0221's rule: a kind skipped in its one and only place is a perfect share and a
smaller problem than one skipped in seven of nine. It is a **type** and never a
role, because a type is the thing an author can replace.

**Two silences, and one of them is new in kind.** `unread` is *no placement of
this kind has a verdict*. `unplaced` is *there is none of this kind in the pages
read* — only ever a role row, and the reason a role row exists for every member
of the vocabulary whether or not anything plays it.

**So the silence table gains a fourth subject and an eleventh condition**
(0240). `kind` is the first subject that is not a thing a deployment holds: a
page, a part and a pair all exist because something was read, while a kind comes
from the vocabulary, so a reading of one can be silent because there is none of
it. The condition `nothing-of-the-kind` is the first here that is not an absence
of measurement but an absence of the thing measured, and the two arrived together
for one reason — a subject that comes from a vocabulary is exactly a subject that
can be empty. **0240 is not superseded and not edited**; its claim that the
subject is a property of the reading and uniform across its set is exactly true
of this set too.

**A type whose readings disagree about its role is named rather than averaged.**
A type plays one part (0114), so a disagreement is two libraries read as one —
readings joined against two different registries and concatenated — and every
role row is then about neither. The first reading's answer stands and
`roleDisagreed` says which types were affected, which is the alarm
`PageReading.orphaned` is for the same class of caller error.

## Consequences

- A deployment can ask what its library does for its readers, by type and by
  role, off readings it already builds. Nothing was added to a payload, a
  browser, a column, a store or the vocabulary; the broadcaster was not touched
  and its bundle is byte-identical.
- **The share is about places and never about people, and a surface that prints
  it as *readers skip this* is printing something the reading did not say.** A
  placement on a page nine thousand people read counts the same as one on a page
  three people read. The reading's own documentation says so, and the figure that
  would fix it is named below and deliberately not built.
- The role rows are nearly empty today, because nothing in `src/primitives/`
  declares a role. The join is at read time (0212), so the day one is declared
  every counter already stored reinterprets and these rows start answering with
  no migration. That is the third consumer of the same missing declaration and is
  filed again.
- A census can be lied to in exactly one way — the same page handed in twice —
  and that is deduplicated by tree and revision, with the drop counted. Two
  revisions of one tree are two live versions of one page and are kept as two
  (0250).
- Per-reader identity is no closer and no further away. This reads stored
  counters and the trees they were filed against, holds no reader state of any
  kind, and would be unaffected by an identified batch.

## Alternatives considered

**Weighting each placement by its page's readers.** The figure everybody will
ask for: *the share of readers who met this kind and read it*. Rejected here, not
refused — it is `reached ÷ views` per placement and a mean over them, which is
two distinct counts each inflated by its own page's straddle, so the pages whose
readers linger would weigh most and a deployment that shortened its rollup window
would watch the figure move with no reader moving. That is 0250's fact one level
across, and 0250's own correction — `opened` at the door — is what would fix it.
It is a second question with a second input and is filed as one, rather than
shipped as this one with a caveat on it.

**A share of placements multiplied by a readership.** Refused outright. A share
of one part of a page times the page's readership was a count of people larger
than the page had, found on a reader card on 8 October; a share of *places* times
a readership is worse, because its denominator is not people at all.

**One census keyed by type, with roles left to the caller.** Rejected. Grouping
is the step a consumer gets wrong — adding `reached` across rows is the mistake
0147 exists to prevent and it is one line away — and the two groupings share one
accumulator and one pass. A role census is also the half that improves for free
when the declarations land.

**A deployment-wide dwell total, or one headline figure over the kinds.**
Rejected for the nesting reason above, and because the artefact is a census: the
only error available to it is counting the same page twice, and a total would add
a second.

**Leaving a role nothing plays out of the rows.** Rejected. *Nothing in this
library is a heading* is a fact about the library, and a surface that had to tell
a missing row from an empty one would be reading the vocabulary itself. The cost
is the eleventh condition, and the condition is true.
