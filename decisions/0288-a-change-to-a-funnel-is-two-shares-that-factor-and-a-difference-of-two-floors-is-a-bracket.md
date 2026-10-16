# 0288 — A change to a funnel is two shares that factor, and a difference of two floors is a bracket

**Status:** Accepted

**Date:** 16 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-16**, from 0286, when `main` was merged into the
> branch that carried it (#654). `main` had meanwhile accepted a different
> 0286 — *a pinned press is one that leaves the document, and the harness says
> which presses it refused* — and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> This record was written on 16 October and nothing in it changed but its
> number; the citations of it on this branch were updated with it.

## Context

[0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)
reads a revision's funnels against the readers that revision had: of the
arrivals, the share that never reached the first end, the share that reached it
and did not finish, and the share that did both. It answers about **one
window**.

Every other reading in this subsystem that measures attention has had its
comparison for a fortnight — where reading stops
([0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)),
how much of a page gets read
([0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)),
whether readers had time for it
([0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)),
who the readers were
([0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)),
what readers did inside a part
([0251](0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)),
and four of them at the scale of a library (0266, 0270, 0279, 0280).

**The funnel had none**, and it is the one counter here a deployment opens the
portal for. *We shipped a change — did more readers buy?* is the commercial half
of the premise this subsystem exists to serve, and the answer was two screens
and a subtraction done by eye.

Two things had to be settled before it could be written, and neither was
obvious from the readings either side.

**The first is whether a funnel's movement can be attributed at all.** 0251
refused a counterfactual for what readers *do*, and the refusal was structural
rather than cautious: `engaged ÷ reached` has readers on both sides of the
division, so there is no reader-free term to hold still while the other moves,
and a share can rise because more readers acted or because fewer reached it —
opposite findings that nothing available could separate.

**The second is that `rate` is the one figure here that leans down.** 0231 found
it: a page view whose reader met the first end in one rollup window and
converted in the next contributes `reached 1, converted 0` to the first and
nothing to the second, so the conversion is **lost** rather than duplicated. It
published `rateAtMost` as the ceiling that bounds the damage. Nobody had ever
subtracted two of those, and
[0282](0282-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md)
had just been bitten, one reading across, by exactly that shape: a figure safe
to publish as *at most* on one page is a movement nobody made when two of them
are held against each other.

## Decision

**`funnelChangeOf(was, now)` holds two `FunnelReach`es against each other**, in
[`src/signals/funnel-change.ts`](../src/signals/funnel-change.ts). Pure; nothing
is added to a payload, a browser, a column, a store or the vocabulary of kinds,
and the broadcaster is byte-identical.

**A funnel's two factors are separable, and the identity is exact.** Of the
readers who arrived, the share that finished is the share that got to the first
end multiplied by the share of *those* who finished:

```
conversion.share = entry.share × rate
```

Both factors have their numerator and their denominator inside **one window**,
so each window's straddle (0147) has very nearly divided out of each term before
the two sides meet — the test 0251 set for any ratio across two windows, and the
reason 0251's refusal does not reach this. So the counterfactual 0244 and 0279
publish applies: the later window's reach at the earlier window's closing rate
isolates one side, the other diagonal isolates the other, and
`ConversionCause` answers *your change did not sell more — it got more readers
to the pricing band, and the same share of them bought.*

**The cause has three members and not four, and that is arithmetic rather than
judgement.** 0244 and 0279 both publish *neither alone was enough and the two
together were*, because the figure they split is a **sum** and the interaction
is reachable. A **product** has no such case: its two counterfactuals multiply
to the product of its two levels — `(entryNow × rateWas) × (entryWas × rateNow)
= conversionWas × conversionNow` — so if the conversion share rose, at least one
of them is above `conversionWas`, and if it fell, at least one is below.
Publishing a fourth member would be a state every surface had to handle and
nothing could ever produce. `conversionCauseOf` is published and **total
anyway**: handed four numbers that are not a funnel's two factors it returns
`null` rather than attributing a movement to a side that did not carry it.

**The rate movement is published as a bracket and not only as a ratio.** Each
side's true rate is somewhere in `[rate, rateAtMost]`, so the true ratio is
somewhere in `[now.rate ÷ was.rateAtMost, now.rateAtMost ÷ was.rate]`, and
`rateMoved` says whether that interval clears 1. Both ends or neither: half an
interval is a figure a surface draws as a bound.

**A silence here withholds half of the reading and never the row.** A share of
the arrivals needs the door on both sides, so the door's three states (0229)
withhold `entryRatio`, `conversionRatio`, the counterfactual, `readersMoved` and
the bracket. They do **not** withhold the rate, the movement or the question: a
rate is two counts off one row and needs no count of the readers who arrived.
`FunnelChange.compared` is populated under every silence this reading has.

**What a change did to the question is its own movement.** A funnel pair is the
one thing read here that a deployment *wrote* rather than a tree or a vocabulary,
and 0238 made an end the revision no longer has a standing rather than a nought.
`QuestionMovement` says `broken` where the earlier revision had both ends and the
later is missing one — a thing to fix in the configuration rather than in the
page. It is a fact about the two trees, so it is answered under every silence,
as a census of what a change added and removed is (0251).

**The ranking is by readers and never by rate**, which is 0221's rule:
`readersMoved` is the movement in the conversion share at the later window's
scale, a mass for ranking and not a count of people, as every `…Moved` figure
here is (0280). **No ratio or difference of two windows' raw counts is published
anywhere on this type**, for 0251's reason.

**The pairing rule is published once.** `funnelPairKey` moves out of
`funnel.ts`'s privates and is exported, because a comparison pairs its rows by
the same rule a reading deduplicates them by — and what counts as one question
is what decides what a duplicate is, which 0158 makes permanent if it is got
wrong in either place.

## Consequences

- **A deployment can say whether a change sold more, and which half of the
  funnel moved.** Off counters it already has, with no byte added to anything a
  reader downloads.
- **A rate movement the rollup window alone could produce is now visible as
  one.** A deployment that shortens `windowMs` (0158) between two readings loses
  more conversions to the straddle in the later window and reads its funnel as a
  collapse. The bracket contains 1 there, `rateMoved` is `false`, and
  `FunnelChange.undecided` counts how much of a screen is in that state. This is
  the third time 0219's drift has turned an argument into a number, and the
  first time it has been spent on a movement rather than on a level.
- **0282's lesson generalises and is now stated as a rule of this subsystem.** A
  figure published as a bound is safe at one window and unsafe at two: a
  difference of two bounds is not a bound. Where both bounds exist, the honest
  answer is an interval.
- **A `together` verdict is unreachable for a product and reachable for a sum**,
  so the two counterfactual vocabularies here are deliberately **not** one
  function. They are not two spellings of one rule; they are two rules, and the
  fourth member is the difference. The arithmetic they share is four lines and
  the names are the whole value of each.
- **The three closed sets a surface must handle grow by three**, and the
  sixteenth silence set is the first whose members cost half a reading rather
  than a figure or a row. What a silence withholds stays the reading's to say,
  which is what 0280 settled and this confirms at a larger scale.
- **Nothing here makes per-reader identity cheaper or dearer to add later.**
  Both sides are counters already stored; an identified batch would arrive with
  the same two factors and the same straddle.

## Alternatives considered

**Subtract the two rates and publish the difference.** The obvious shape, and
the one a screen would have built for itself. Rejected: the difference of two
figures that lean down by a deployment-set amount is not a figure anybody can
act on, and the direction of the error is the direction that reads as *this
funnel is broken*.

**Publish only the bracket and drop the ratio.** Honest and unusable: a surface
needs a figure to draw and a bracket to draw it with, and an interval alone
cannot be ranked.

**Correct `converted` for the conversions the straddle split, so a single rate
is honest.** 0231 rejected this and the reason stands: it needs to know which
view keys appeared in two windows, which means keeping view keys past the window
they were minted for — 0146's one refusal.

**Derive the comparison from the stored rows rather than from two readings.**
Rejected for 0231's reason one level up: the pairing of counters to the door's
rows is the part of every join here that fails quietly when it is got wrong, and
a second place doing it is a second place to get it wrong.

**Rank the pairs by the movement in their rate.** Rejected on 0221's rule. A
funnel four readers in six now finish is a better rate and a smaller win than
one four hundred in a thousand do, and a screen led by the first sends a
deployment at its quietest page.

**Make the four-member sufficiency rule a shared function and map it per
vocabulary.** Tempting, and it is the move this subsystem has made three times
(`counters.ts`, `door.ts`, `passageOf`). Rejected because the two rules are not
the same rule: a shared function would publish an outcome one of its callers has
to prove impossible, which is worse than four lines written twice.
