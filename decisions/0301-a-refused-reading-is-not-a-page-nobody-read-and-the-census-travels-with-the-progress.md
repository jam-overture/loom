# 0301 — A refused reading is not a page nobody read, and the census travels with the progress

**Status:** Accepted

**Date:** 20 October 2026

**Section:** §4c (reader signals)

## Context

[0300](0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md)
was written yesterday, about `null` doing two jobs: a reading recording no
audience is either a window written before the column existed — one population,
read whole — or a window of two forms with none asked for, which is no
population and must be read as neither. It published `AudienceScope` so that the
second is a case a reading has to answer rather than a value it can fall past,
and adopted it in the two readings that refuse.

It closed with a note that the refusal is published and nothing downstream reads
it. That note understated the problem. **The refusal is published as a nought
that already means something else**, and three readings derived from it branch on
that nought:

| reading | what it does with the nought | what it printed |
| --- | --- | --- |
| `readingProgressOf` | publishes no runs and no steepest fall | correct |
| `readingChangeOf` | `silence: "nothing-measured"` | *one of the two windows held no page views* |
| `deploymentReadingOf` | `standing: "unread"` | *nothing reported a view of this version in the window* |

A page reading of a window holding two forms with none asked for puts every part
at `unknown` and its view floor at nought (0290). A page nothing has opened puts
every part at `unknown` and its view floor at nought. **The two are
indistinguishable to anything holding only the floor**, which is what the second
and third rows hold — and the sentences they print are not approximations of each
other. One sends a deployment to look for a sender that has stopped reporting.
The other tells it to split the window by audience and ask again, which is a
function call away.

**The deployment order is where it is worst, because the row contradicts
itself.** That order asks the door for each page's arrivals, and the door answers
a window of two forms by **summing** them (0297,
[0299](0299-a-deployment-wide-door-adds-every-forms-arrivals-and-waits-on-the-oldest-fold-under-it.md)):
arrivals are people, and a reader who arrived arrived once whichever form they
were served. So the published row reads *a thousand readers arrived, and nothing
reported a view of this version*. Both halves come off the same window. On
fixtures: a page served to a hundred skiers and nine hundred riders, handed in
unsplit, stood in `standings.unread` with `opened: 1000` beside it.

**`ReadingProgress` could not have told them apart.** It carries `audienceId`,
deliberately and for a stated reason — the order picks each page's door row by
that trio — but not the census. `audienceScopeRead` needs both: a reading's
`audienceId` is `null` for a window that named one audience and for a window that
named two, and only `audiences` separates them. So the refusal was not lost by
oversight downstream; it was never reachable there.

The fourth reading of a page's rows out of a window, `pageViewsFor`, was also
still spelling 0300's rule inline — it was being rewritten the same night the
rule was published and was deliberately left alone to keep two changes out of one
function. That is filed and is closed here.

## Decision

**A reading read as neither population is reported as that, by every reading
derived from it, and never as a page nobody read.**

**`ReadingProgress` carries `audiences`**, from the page reading, unchanged.
Additive, and it is the whole of what makes the rest possible: the pair of
`audienceId` and `audiences` is what `audienceScopeRead` reads, so a reading
downstream can ask the published question instead of inferring from a floor.

**`ChangeSilence` gains `audiences-mixed`**, taken off either side's own scope
and **checked before the view floor**, because the refusal is that floor's cause
and a cause names itself better than its symptom. The parts census still stands,
for `nothing-measured`'s reason: what a change did to the tree is read off the
two trees and off no counter, so a reading may say *one band was added, and which
readers these counters are of was not said*.

**It cannot co-occur with `different-audiences`, so the order between those two
is not a decision.** `crossesAudiences` needs an audience on both sides and a
mixed side has none; a side that names one *and* holds two in its census is
`one` and not mixed, because an audience asked for always wins (0300). The two
states partition the window. The guard that **is** ordered is the view floor —
and this was found by a mutation that moved the mixed check above
`crossesAudiences` and **survived**, which is what a first draft of this record
claiming the precedence mattered would have been wrong about.

**`RankStanding` and `MovementStanding` gain `unsplit`**, mapped in the silences
table to the condition the funnel comparison brought yesterday,
`two-forms-unsplit`. In the one-window order it is checked before `unread`. In
the change order it is the standing `audiences-mixed` maps to, where
`different-audiences` and `nothing-measured` go on sharing `unread`: those two
are both *there was nothing to compare on one side*, and the cause travels on the
row for a surface that wants to say which.

**The arrivals are published beside the refusal rather than withheld.** They are
the deployment's and they add across forms, so the honest row is *this many
readers arrived; which of them read what is a question per form*. The refusal is
about the reading, not about the door.

**`pageViewsFor` reads 0300's rule from `audienceScopeOf`**, with the `mixed`
branch written out rather than left to fall past a `null`. Behaviour is
unchanged, and one thing it must not adopt is written down: **the audience it
publishes is the one the asking named, never `scope.audienceId`.** The scope's
`one` member fills a single-membered census in, which is right for the two
readings that only filter rows by it and wrong for a reading that publishes the
field — a window holding one form today is not a reading of one form (0297,
0299).

**`unsplit` is the one standing in either order that is a fault in the asking.**
Every other reason a page is out of an order is a state of the deployment's
readers or of its rows. This one is a state of what the caller handed in, and the
remedy is `byAudience` and two readings, after which the page stands in the order
twice.

## Consequences

- **A deployment serving two forms and reading its pages unsplit stops being
  told its pages are unread.** It is told the window holds two forms, which is
  the fault it actually has.
- **`standings.unread` becomes trustworthy.** It was the headline count of pages
  nobody read and it absorbed every refused reading, so on a two-form deployment
  it could have read *forty pages nobody read* about forty pages with readers on
  all of them.
- **Three new members on three published unions**, each guarded by
  `everyMemberOf` and an exhaustive switch, so every surface that draws a
  standing or a silence is forced to name them. `Loom portal` has a row to draw
  and a sentence for it; that is filed rather than done.
- **The same guard went into the three remaining comparisons of this shape in
  the same unit** — `copyChangeOf`, `paceChangeOf` and `actionChangeOf`, which
  each took two page readings and published `nothing-measured` of a window that
  held two forms of them. All five comparisons over two page readings now report
  it, and what survives the refusal in each is its own tree half. The ordering
  that needed an argument rather than a cause is in `actionChangeOf`: a mixed
  side and a sender that does not walk (0167) are reachable at once and neither
  causes the other, so the state whose **remedy is a call** is reported first,
  because taking it reveals the other and taking the other does not reveal it.
- **The silences table gains no condition.** All three map to
  `two-forms-unsplit`, which the funnel comparison brought yesterday, and the
  mapping now says what it is worth saying: the comparison's is a state of the
  pair and the deployment order's is a state of one page, so they are one reason
  at two subjects and never one sentence.
- **One test in this lane had to stop deriving provenance from set order.**
  `silences.test.ts` records which set first brought each condition by folding
  over the sets in arrival order, and the before-and-after reading — one of the
  first five — has now adopted a condition the eleventh set brought. The fold
  would have reported that nobody ever brought it, which is the one deletion its
  own note says it exists to prevent. A declared condition is now credited to its
  declarer whichever set reports it first; an **undeclared** one still fails as
  the novelty of the first set to report it.
- **Nothing reaches a reader.** No payload field, no browser code, no column, no
  store, no new kind. The broadcaster is byte-identical to `main`.
- **Per-reader identity is no cheaper or dearer to add later.** Everything here
  is about a column a host wrote and an audience predicate Loom never sees.

## Alternatives considered

- **Leave the sentences as they were and let a surface read the census.** The
  census was not there to read: `ReadingProgress` dropped it, which is the whole
  finding. And even with it carried, pushing the distinction onto every surface
  is how two screens come to disagree — the reason every rule in this subsystem
  is published once beside the counter it is about.
- **Make `pageReadingOf` publish a floor of `null` rather than `0` when it
  refuses.** This is the shape that fixes the ambiguity at the source and it was
  the first thing tried. It is a breaking change to a field eleven readings and
  four comparisons divide by, it would turn every one of them into a
  null-handling question, and it would make *nobody read this* and *we refused to
  attribute this* share one spelling again the moment any of them coalesced it to
  nought. The census answers the question without touching a number.
- **One standing for both, with the cause only on the row.** This is what the
  change order does for `different-audiences` and `nothing-measured`, and it is
  right there: both are *nothing to compare on one side*. It is wrong here
  because the one-window order publishes **no** silence field — the standing is
  the whole answer — and because what `unsplit` has in common with `unread` is a
  nought rather than a state of the world.
- **Refuse the door's arrivals too, so the row says nothing at all.** Rejected
  for 0299's reason: arrivals are counted once per page view and add across
  forms, so withholding them would discard a sound measurement to make a refusal
  look tidier. A row that says *a thousand arrived and which of them read what is
  a question per form* is the honest one.
- **Add the refusal to `readingProgressOf` as its own silence set.** A progress
  reading publishes no silence and needs none: *no runs and no steepest fall* is
  the right answer to both kinds of nought. Giving it a set would have put a
  nineteenth vocabulary in the silences table to say what the two readings above
  it already say.
