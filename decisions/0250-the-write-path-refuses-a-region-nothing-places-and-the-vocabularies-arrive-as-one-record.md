# 0250. The write path refuses a region nothing places, and the vocabularies arrive as one record

**Status:** Accepted
**Date:** 2026-10-09
**Section:** §2 (the write path), binding on §3

> **Why this number.** `0249` is the highest record on `main`. Of the three open
> pull requests only #548 adds a record, and it claims `0245`, which `main` does
> not hold. So `0250` is the next number free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches neither the
> tree schema nor the delta model, so no built code migrates. It is the step
> [0249](0249-a-region-the-primitive-does-not-place-is-a-diagnostic.md) named as
> *the natural next step* and declined to decide, and it keeps 0179's rule that a
> seam is handed to the composition root rather than declared on the policy. A
> deployment that wires nothing keeps the behaviour it has. What it does change
> is the **shape of two published signatures**, which is a cost rather than a
> contradiction and is argued for below.

## Context

Two things were waiting on each other, and this record is the one run that could
do both.

**The half-built seam.** 0249 made a region a tree fills on a primitive that
places no region of that name into a render diagnostic, `slot-unplaced`. It said
plainly in its consequences that the write path does not refuse it yet, and that
the twin was blocked on something unrelated. Every other seam of this shape has
both halves: `data-unread` is reported by the renderer and refused by the write
path through `unreadBindingsIn`, which `analyzeDelta` is handed as a vocabulary —
so that, in that function's own words, *what the renderer reports as `data-unread`
is by construction what the write path declines to write*. `unknown-primitive` and
`invalid-props` have the same pair. A dropped region had one half, and it is the
quietest loss of authored content in a Loom page: the node draws, its props are
valid, nothing is fetched and wasted, and a paragraph the author wrote is simply
not there.

**The signature at its limit.** `analyzeDelta` carried four optional trailing
vocabularies — `isInteractive`, `isRegistered`, `checkProps`, `reads` — and
`assessChange` carried two of them positionally behind `inverseDeltaId`. The doc
comment had grumbled about the shape since the third arrived and predicted the
fourth; the fourth arrived and found the prediction. It also wrote down the
condition for fixing it: *four optional trailing predicates is as far as this
shape goes, and the run that collects them is the run that can also rewrite the
transcripts.* That condition is what made the fifth vocabulary and the collection
one unit of work rather than two, and it is why 0249 deferred rather than
smuggling a cross-lane change in behind a one-seam diagnostic.

Both halves were filed in `FINDINGS.md`, on 30 September and again on 9 October,
the second entry naming the first as its blocker and the fact worth recording:
the next vocabulary had stopped being hypothetical.

## Decision

**The write path refuses a region no primitive places, and the vocabularies the
write path asks about arrive as one record rather than as trailing parameters.**

- **`unplacedSlotsIn(node, places)` is the walk**, beside `unreadBindingsIn` in
  `src/runtime/vocabulary.ts`, over `SlotPlacer` — the renderer's own seam, not a
  second shape for this side. That is the move `PropsVocabulary` makes with
  `PropsVerdict` and `BindingReader` makes with itself, and for the identical
  reason: a host hands one object to both seams, an SDK registry satisfies it
  already, and the agreement between the two seams is a fact rather than a
  coincidence.
- **It reads each element's direct `slot` children and shares `unplacedSlots`
  with the renderer.** Only direct slot children are routed to a primitive
  (0051), so a slot inside another slot's fallback renders where it sits and is
  nobody's region to place; reading children rather than positions is what keeps
  the walk from reporting it. The comparison deduplicates and name-sorts for the
  reasons 0249 gives.
- **`ChangeAnalysis.unplacedSlots` is measured on both trees**, like
  `unreadBindings` and unlike `unknownPrimitives`, and keyed by node **and**
  name. A `move` can carry a region under a parent that places no such region,
  which is the case `unknownPrimitives` has no analogue of — a type is fixed when
  a node is inserted, and a region's fate belongs to the parent. A node that
  drops two regions has dropped two pieces of content, so a change that adds the
  second answers for the second and inherits the first.
- **`unplaced-slot` is a stake factor fixed at `critical`.** `unread-binding`'s
  level, by its argument with one word changed: the repair is one string and the
  registry holds it, so a refusal tells a repairer what to write instead where a
  confirmation could only be answered no. It is the stronger case rather than the
  weaker — a question nothing reads costs a round trip and draws an empty state,
  and a region nothing places costs the content *and everything under it*.
- **`regions` is a third member of `WriteCheck`**, so wiring the seam is recorded
  on every judgment it makes (0248). The policy fingerprint cannot see a seam, so
  a deployment that wires one would otherwise move its own refusal rate and leave
  nothing behind saying which day it moved.
- **`ChangeVocabulary` is one optional record, and `assessChange` takes
  `WriteCheckSeams`.** Every member is optional and every default is the no-op a
  deployment that has wired nothing already got, so `analyzeDelta(tree, delta)`
  measures exactly what it measured before. The member names are the parameters'
  own, so a caller that passed them positionally reaches the same answers by
  writing down which one it meant. `assessChange` taking `WriteCheckSeams` itself
  rather than a shape of its own is what makes what it passes to the analysis and
  what it records as wired one fact read twice.
- **A member is `?: X | undefined` rather than optional alone**, under
  `exactOptionalPropertyTypes`, for the reason `WriteCheckSeams` already gives: a
  caller holding an `X | undefined` at an optional seam is the ordinary case, and
  making it rebuild the record to say so would put the presence test in two
  places.

## Consequences

- **The pairing is complete.** Every *something arrived and was not drawn* in the
  render seam that a write path could refuse before the fact now is refused
  before the fact, on a deployment that hands the seam over.
- **Two published signatures changed shape**, and that is this record's real
  cost. `analyzeDelta`'s third parameter is a record where it was a predicate,
  and `assessChange`'s fifth is a record where there were two. Nothing about
  either function's answers moved. A caller that passed nothing is unaffected,
  which is every caller in the starter library and on four surfaces; a caller
  that passed a vocabulary positionally has a one-line edit with the compiler
  pointing at it.
- **Four lesson transcripts were rewritten and this is the forced cross-lane
  edit the condition was about.** Lessons 22 and 23 called `analyzeDelta` with a
  predicate; 30 and 31 called `assessChange` with a props vocabulary; 34 holds a
  hand-built `ChangeAnalysis`, a printed vocabulary and the counts around it.
  They are `Loom lessons`' files, the diff is a call shape and a set of numbers
  rather than any teaching, and the alternative was leaving the shape at its
  limit for a second vocabulary to find.
- **A fifteenth rule was three edits, all of them forced**, exactly as 0198's
  consequences predicted of the fourteenth: the schema, the two counted sentences
  registered in `src/record-claims.test.ts` and the lessons' claims registry, and
  the two surfaces' `Record<StakeFactorCode, string>` tables, which are total
  over the union and stop compiling. The prediction holding twice is the evidence
  that the arrangement works.
- **A sixth vocabulary is now cheap.** It is a member on a record and a default,
  with no order for anybody to remember and no transcript pinned to the shape.
  That is the whole point of having paid for this once.
- **A deployment resolving primitives from a plain map gets no new refusals**,
  which keeps `staticPrimitiveResolver` as honest as it was: it has never been
  able to say what a primitive places.

## Alternatives considered

**Add the fifth vocabulary as a fifth trailing parameter.** The cheapest diff,
and the one the shape's own comment had already ruled out: five positional
optionals whose order nobody can hold in their head, reached through
`undefined, undefined, undefined` at every call that wants only the last. The
test file for the fourth already read that way and reads better now.

**Collect the vocabularies and leave the write path's twin for later.** Would
have paid the cross-lane cost for a pure refactor and delivered no behaviour,
which is the shape of change hardest to justify to a reviewer. The collection is
worth doing *because* something needs the fifth slot; doing it on its own would
have been a shape argument with no consumer.

**Four positional optionals, with the fifth as a trailing record.** Rejected as
the worst of both: two conventions in one signature, and a reader who has to know
which vocabulary falls on which side of the line.

**Refuse the node, the way `invalid-props` does.** 0249 rejected this for the
renderer and the argument carries: a region nothing places is not a reason to
delete the dialog. Here the question does not even arise — the write path refuses
the *change*, not the node, and what it offers a repairer is the name to write
instead.

**Report the dropped region and raise no stake factor.** The field would have
been measured and read by nothing, which is dead weight in a record whose whole
purpose is to be judged. It would also have left the renderer and the write path
disagreeing about how much a dropped region matters, which is the drift the shared
seam exists to prevent.

**Put `SlotPlacer` on the `GatePolicy` instead.** Refused by 0179 and not
reopened: a reader is behaviour, a policy is data with a fingerprint, and a policy
carrying a function cannot be compared with the one that decided yesterday. The
seam goes to the composition root and `wiredChecks` is how a judgment says it
arrived.
