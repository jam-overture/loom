# 0256 — A kind's share of the readers who met it is a weighted mean of sound shares, and the weight is the door's

**Status:** Accepted

**Date:** 11 October 2026

**Section:** §4c (reader signals)

## Context

[0257](0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)
made the library askable for the first time, and was explicit about the one
thing its figure is not. A kind's read share there is `read ÷ (read + skipped)`
over the **places** it stands: a ratio of two counts of parts of trees, with no
reader and no rollup window in either term, which a deployment that shortens its
window cannot move. What it costs is that a placement on a page nine thousand
people read counts the same as one on a page three people read — so a kind read
in the one busy place and skipped in nine quiet ones reports a read share of one
in ten, and *most of the readers who met it read it* would also have been true.

The figure everybody asks for next is that other one, and this lane filed its
shape rather than shipping it with a caveat inside 0257's type, because a census
of places and a census of readers are two artefacts with two error models and
nothing but prose would have told them apart on one row.

The arithmetic anybody would write first is `reached ÷ views` per placement and
a mean over them, and it is wrong in the way that matters. Each term is a
distinct view count inflated by **its own page's** straddle rate (0147), and
that is exactly the fact that forced every page's loss onto the door's scale
before an order over pages could mean anything
([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)).
A mean weighted by appearances weighs the pages readers linger on most heavily,
so shortening a rollup window would move the answer and move no reader.

## Decision

**`libraryReachOf(readings, rows)` in `src/signals/library-reach.ts` publishes a
kind's share of the readers who met it, and the unit is one page view of one
place.**

A reader cannot be the unit and no field would make them one: two page views of
two pages are two page views, with nothing saying whether one person made both,
which is rule 1 of the plan and 0146 rather than a gap. So the unit is the pair
*(a page view, a place this kind stands on that page)* — a page view of a page
bearing three placements of one kind is three of them — and that is what makes
the figure addable at all.

**Every term is put on the scale the door counts in, off that page's own row by
the published matching rule.** Per bearing placement:

- the weight is `appearances ÷ (1 + inflation)`, which comes to
  `min(appearances, opened)` — the page views a rollup folded, at the door's
  scale;
- the numerator is `reached × weight ÷ appearances`, so each page contributes
  its own sound share with that weight behind it.

`share` is `met ÷ counted` over those sums, which makes it **a weighted mean of
each page's own sound share with that page's exact arrivals as the weight**.
0229's cancellation has already happened inside each term before the pages meet,
and the weights carry no straddle, so the one error a deployment controls — its
rollup window — cannot move the figure at all.

**The weight is taken as the smaller of two whole numbers.** The division of
three floats agrees with it to fifteen places and not to sixteen, and 0229 has
already been bitten by exactly that arithmetic.

**Two denominators, for 0229's reason one level up.** `share` is taken of the
folded page views at the door's scale and `atMost` of the openings, which are
exact; `openings = counted + pending` is published as an identity rather than
described. As in a page's own reading, the estimate may sit above the ceiling
while openings are pending, because the two are then taken of different
populations.

**Nothing is withheld for a collection that is behind**, and this is where this
reading parts from 0229. A page's `readers` is withheld while openings are
pending because projecting a folded rate onto page views no rollup has reached
answers a question about readers nobody measured. Here the weights *are* folded
page views — `min(appearances, opened)` keeps only those — so there is no
projection to refuse. A lagging page weighs less than a caught-up one, which
shifts the evidence and not the share, and `pending` is the figure that says by
how much.

**A kind standing on a page the door cannot scale has no share at all**, not a
share over the pages that could be scaled. A weighted mean over a subset is a
figure whose denominator nobody named, and *of the places we could price* is not
a sentence a surface will print — it will print the number. So the share is
withheld for the whole kind, and the pages that caused it are published once for
the reading.

**A placement nothing could speak for is in neither term.** A standing of
`unknown` means the window said nothing about it, so putting its nought into the
numerator against its page's readers would call it a skip — the one direction a
census of a quiet deployment must not be wrong in (0212). It is counted as
`unknown` and excluded, which is 0257's `read ÷ (read + skipped)` holding at the
other unit.

**The page that could not be scaled is named in the page's own vocabulary and
not in this one.** A funnel answer reuses `ReachSilence` outright (0231) because
a funnel is asked of a page and so is a reach reading. This reading's subject is
a **kind** (0240), so the three door states are published twice at two subjects:
as a `KindReachSilence` on the row, and as a `ReachSilence` on the page in
`unscaled`. The published table is what says they are one state at two subjects,
which is `one-reason` and never `one-state`.

**No reading-wide share and no headcount.** A share over every kind at once is a
share over every (page view, placement) pair in the deployment, in which a page
built from forty parts weighs forty times one built from a band — a denominator
that is an artefact of how finely the pages were written. And `met` is a count of
page views at the door's scale that is deliberately not rounded into people: a
share of one part of a page multiplied back up was a count of readers larger
than the page had, found on a reader card on 8 October, and a share of places
times a readership is worse.

**The ranking is by the readers missed and never by the share** (0221), and
`mostMissed` is a type rather than a role because a type is what an author can
replace.

Nothing is added to a payload, a browser, a column, a store or the vocabulary of
kinds, and the broadcaster is not touched. It is the fifteenth thing taken out of
what this subsystem already knows rather than collected.

## Consequences

**0257 is not superseded and is not corrected.** Its share of places is sound,
needs no door row, and answers the question an author changing a primitive has —
*where does this kind stand, and is it reached there*. This answers a different
question, and the two are built from one list of readings and pair on
`kindKeyOf`. A surface that holds both must label them, because *nine places in
ten* and *nine readers in ten* are different sentences about the same kind and
can differ by an order of magnitude.

**A deployment with no door rows gets no weighted figure at all**, and falls back
to the census. That is the intended trade: the figure a surface could misread is
one the function never offers, which is §7's refusal in a third costume.

**The straddle is now accounted for in every reading that crosses two pages.**
0250 scaled a page's loss to the door; this scales a placement's reach. The two
are the same correction applied to the two things this subsystem counts across
pages, and no third such reading should invent a third spelling of it.

**`pending` has a second meaning on a row here and it is a weight and not a
bound.** On a page's reach it withholds a headcount; here it says how unequally
the evidence behind a share is distributed. Both are published figures and
neither is a correction a caller applies.

**The silence table gains a tenth vocabulary and nothing else** — no condition
and no subject, which is the first set since the seventh to add neither. 0240's
claim holds, and what this set adds to it is the limit on reuse: a set cannot be
reused by a reading whose subject differs, because the subject is published per
vocabulary. 0240 is not superseded and not edited; the module carries the
corrected counts and the paragraph.

**It is one more consumer of a declaration nobody makes.** Every role row comes
back under `role: null` until `src/primitives/` declares one, which is 0114's
stated bargain and is filed for that lane for the fifth time. The join is at
read time (0212), so the day a role is declared these rows start answering with
no migration.

## Alternatives considered

**Weighting each placement by its page's appearances.** The obvious arithmetic,
and refused: the weights then carry each page's own straddle rate, so the pages
readers linger on dominate the mean and a deployment that shortened its rollup
window would watch the figure move with no reader moving. Measured on a fixture
where one page straddles fourfold, it reads 0.5 where the truth is 0.65, and the
test that pins the sound figure publishes the refused one beside it for the
record.

**Computing the share over the placements the door can scale, and reporting the
rest.** More useful and less honest. Two kinds' shares would then be taken over
two different subsets of the library and would not be comparable with each
other, which is the whole purpose of the weighted figure; and *over eight of the
nine places* is a caveat a surface reads past.

**Withholding the share while any opening is pending**, as a page's `readers` is
withheld. Refused once the weight was defined as the folded page views at the
door's scale, because there is then nothing being projected onto an unmeasured
reader. Withholding would have silenced every figure here for the first minutes
of every deployment, for an error that is in the weights rather than in the
terms.

**Reusing `ReachSilence` for the kind's own reason**, as a funnel answer does.
Refused because the subject is published per vocabulary (0240) and this
reading's subject is a kind: the reuse would have had a surface print *this
version of the page* over a row about a primitive type. The three door states
are said twice instead, at two subjects, which is what the relation table is
for.

**Putting the weighted share on `KindReading` beside the share of places.** This
is 0257's own refusal and it still stands. One type carrying a corrected number
and an uncorrected one, with prose to tell them apart, is the near-duplicate
this subsystem has been bitten by twice; and the two have different inputs, so
the census would have had to take rows it does not read.

**A deployment-wide share across kinds.** Refused: its denominator counts a page
once per element node, so it measures how finely the pages were written as much
as how they are read. The published keys of the reading are pinned by a test, so
adding one later is a decision rather than an oversight.
