# 0300 — What audience a reading is of is a three-way answer, and a window of two forms is read as neither

**Status:** Accepted

**Date:** 20 October 2026

**Section:** §4c (reader signals)

> **The number skips one deliberately.** `main` carries 0298, and the next
> number after it is held by an open pull request of this lane,
> [#680](https://github.com/jam-overture/loom/pull/680), written and verified
> last night. The next number free on `main` is therefore one another branch is
> already using, and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)), so
> this takes the one after that rather than the one after `main`. If #680 is
> closed unmerged there is a hole, which is reported rather than fatal — and
> that is also why nothing here cites #680's record by number: it is not on this
> branch, so a citation of it would not resolve.

## Context

[0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
made a reading *of one audience*. Its context section listed four things that
were wrong before it, and the third was this:

> **one funnel question answered twice and the second answer dropped**, the
> same way, through `duplicatedPairs`.

Its clause 4 then scoped the three joins that pick a page's rows out of a
window — the door row, the funnel answers and the region map — *when the asking
names one*. **When the asking names none, all three went on doing exactly what
the context section said they had stopped doing.** Two have since been corrected
one at a time, each after publishing a real second population as a count of rows
handed in twice:
[0297](0297-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md)
for the region buckets and #680 for the door's arrivals.

The funnel was the third, and it is the worst of the three, because it divides.
`funnelReachOf` filtered its rows by audience only where one was named and
otherwise took the first row per question, counting the rest in
`duplicatedPairs`; the door row it divides by was picked out of a **different
array** by the same rule. So a numerator from one form could be published over a
denominator from the other, with the pairing decided by the order two lists
arrived in. Measured on fixtures: four of a hundred skiers and four hundred of a
thousand riders — both forty per cent — came back as an entry share of **0.004**
with one row of each kind reported as a caller's duplicate. Two orders of
magnitude, and the one number in the reading nobody reads as an undercount
carrying the evidence.

**Three readings is a pattern and the pattern has a cause.** `null` was doing
two jobs. A reading recording no audience is either a window of rows written
before the column existed (0284) — one population by construction, read whole —
or a window holding two forms with none asked for, which is no population at all
and must be read as neither (0290 clause 3). The two want opposite handling and
were spelled as one value, so a reading that treated them alike compiled, passed
its tests, and was wrong only on a deployment doing exactly what
[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) built.
Each test that should have caught it used two *different* key values — two
countries, two revisions, two trees — so each documented the intent while the
code failed only where two rows share a key.

## Decision

**What population a reading is of is one of three answers, published as a type,
and a window of two forms with none asked for is read as neither.**

1. **`AudienceScope` is the three-way answer**
   ([`src/signals/audiences.ts`](../src/signals/audiences.ts)), beside
   `readingKeyOf` and `formKeyOf` because it is the third rule of the same kind:
   a thing every reading decides in its own loop, published once. Its members
   are `one` (the audience asked for, or the only one the window named),
   `unlabelled` (nothing named an audience, so one population by construction,
   read whole) and `mixed` (two or more, none asked for, read as neither). Every
   member carries both `audienceId` and the census, so a caller that only wants
   the audience needs no switch.

2. **The refusal is a case rather than a `null` a reading can fall past.** That
   is the whole mechanical point of making it a type: `audienceScopeOf` cannot
   hand back an audience for an ambiguous window, so the fourth reading written
   against this subsystem has to write a branch for it. `audienceScopeRead`
   reads the answer back off a reading that already recorded it, which is what a
   comparison needs.

3. **A funnel reading of an unsplit window reads no pair.** `pairs` is empty,
   every row of the revision is counted in `otherAudiencePairs` — this page's
   other form, whose readers are real and are not the ones being read —
   `duplicatedPairs` is nought, and `FunnelReach.audiences` names both
   populations. It is the shape `pageReadingOf` already had for its parts, and
   the refusal is read off it with `audienceScopeRead` rather than subtracted
   from two fields.

4. **The ambiguity is of the window, not of one list in it.** The scope is taken
   over the populations of the page reading **and** of the funnel rows together,
   because a caller holding a reading of one form and funnel rows of two is as
   unable to say whose answer it is as the reverse, and only the reverse was
   reachable through the reading's own census.

5. **Summing the pairs instead is refused, and that is a fact about the question
   rather than caution.** Arrivals at the door are counted once per page view
   and therefore add across forms (0297, #680), which is why the door's figures
   on a refused reading are still published and are still the deployment's. A
   funnel pair is two node ids a deployment wrote down in advance, and the
   deltas an audience earns can leave one of those ends out of one form: a sum
   would put the readers who could answer the question over the readers of both
   forms, understating conversion by an amount nothing in the rows can state.
   The deployment-wide funnel answer is `byAudience` and one reading per form
   (0290 clause 2) — available, exact, and the caller's to ask for.

6. **A comparison refuses a side that was read as neither, before it pairs.**
   `FunnelChangeSilence` gains `audiences-mixed` and
   [`silences.ts`](../src/signals/silences.ts) gains the condition
   `two-forms-unsplit`. The ordering matters: an empty side **pairs cleanly**,
   so without the guard every question of the other side comes back as added or
   removed and the reading says *this change added every funnel question you
   ask* about a window that was simply never read. It is held apart from
   `two-audiences` because the remedies differ — pick a form, versus split the
   window — and it is the first condition in that table about what the caller
   handed in rather than about the deployment, the window or the shape of the
   page.

7. **Nothing was added to a payload, a browser, a column, a store or the
   vocabulary of kinds.** The column has been there since 0284 and the
   broadcaster is byte-identical. An `aud_` is an opaque name a host chose for a
   predicate Loom never sees, so this is grouping rows by a column the host
   wrote, and rule 1 of [`docs/signals.md`](../docs/signals.md) is untouched.

## Consequences

**A deployment serving two forms and asking the deployment-wide funnel question
gets no pairs where it used to get one form's.** That is the intended direction:
what it got was one population's conversion over a denominator that could be the
other population's, labelled as the page's. The answer it wants is two readings,
and `byAudience` has been the way to get them since 0290.

**The door's figures survive the refusal, so a refused reading is not an empty
one.** `opened`, `appearances`, `drift` and `pending` are the deployment's
arrivals, which add across forms. *This many readers arrived across both forms;
which of them converted is a question per form* is a sentence, and it is the one
this reading can honestly say.

**`FunnelReach` gains `audiences` and that is a published type change.** No
reading or surface in the repository reads it yet, so nothing moves; it is there
because the census is what tells the three states apart and a reading that
publishes only its audience leaves that as a subtraction for every caller to
make the same way.

**`pageReadingOf` is unchanged in behaviour and now spells its rule by importing
it.** Its own tests are the proof: none of them moved.

**The fourth reading of this shape is `pageViewsFor`, and it is not in this
change.** It is fixed on #680, which was written last night and is waiting to
land; touching the same function here would hand the merge a conflict in the
file both changes rewrite. The two compose rather than overlap — once #680 is on
`main`, the door figures on a refused funnel reading are the sum over both forms
rather than whichever row sorted first — and adopting `AudienceScope` there is
filed in `FINDINGS.md` for this lane.

**What this does not make impossible.** A reading that never asks the question
still cannot be caught by a type: `audienceScopeOf` has to be called. What the
type removes is the quiet half of the fault — a reading that *does* ask and is
handed an ambiguous window can no longer read an audience out of it.

## Alternatives considered

**Sum the two forms' pairs, as 0297 and #680 sum arrivals.** Rejected, and it
was the close call. Arrivals are counted once per page view at the door and add
across anything (0219); two forms' page views are disjoint, so their funnel
counts add too — within one rollup window. What breaks it is not the arithmetic
but the question: a pair's ends are node ids, and a delta can remove an end from
one form, so a summed numerator is over the readers who could answer while the
summed denominator is over everybody. The understatement is unbounded and
unstatable from the rows, and *this funnel is broken* is the claim somebody acts
on. Clause 5.

**Add `audiences-mixed` to `ReachSilence` so the reading names its refusal in
the existing vocabulary.** Rejected. `ReachSilence`'s three members are states
of the *deployment* — no row, no opening marked, no window folded — and four
other silence sets map it member for member, so a fourth would need a meaning in
contexts that cannot reach it. The refusal is a state of what the caller handed
in, and `pageReadingOf` already reports that state with a census and no silence.

**Give `FunnelReach` a one-member refusal field of its own.** Rejected as a
second vocabulary for a state `audienceScopeRead` already names. The sibling
reading publishes a census and lets `health.ts` name the fault; two shapes for
one state is what this module exists to stop.

**Write one contract test over every reading that picks rows out of a window,
rather than a type.** Rejected as the whole answer, and done in part anyway.
A table of today's readings catches a regression in them and says nothing about
the next one, and the fourth entry in such a table is exactly the reading this
change cannot touch. The type is what reaches a reading nobody has written yet.

**Keep taking `matching[0]` and merely stop counting the rest as duplicates.**
Rejected. It would make `duplicatedPairs` honest and leave the published rate a
cross-population quotient, which is the part somebody acts on.
