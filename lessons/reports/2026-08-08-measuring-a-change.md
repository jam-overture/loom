# 2026-08-08 — Lesson 07: Measuring a change

**Landed:** [`lessons/07-measuring-a-change.md`](../07-measuring-a-change.md).
Part II is three lessons deep.

Also in this PR: 07 linked from the syllabus, lesson 06's *Next* pointer made a
link, and a new interleaved Set I in `review-schedule.md`.

**Stacked on `lessons-06-undo` (#55), which is stacked on `lessons-05-purity`
(#52).** Same reasoning as last run: `main` still ends at lesson 04, 07's
warm-ups draw on 05 and 06, and the alternative is a lesson that pretends its
prerequisites do not exist. Merge order is #49 → #52 → #55 → this. That question
was raised for a decision on #55 and has not been answered, so I have kept the
existing behaviour rather than changed it unasked.

## What I emphasised, and why

The syllabus line is "what analysis extracts, and why measurement is separated
from judgment". Three choices:

**The separation is a pair of signatures, not a principle.** The easy version of
this lesson explains that analysis gathers facts and the Gate applies policy,
which is true and teaches nothing, because a reader can agree with it without
being able to place a new field on the right side. So the lesson is built on one
symmetric observation:

> `analyzeDelta(tree, delta)` takes a tree and no policy.
> `assessStakes(input, policy)` takes a policy and no tree.

Both are executable and both are checkable by reading two lines of source. The
separation is not something to remember; breaking it is a type error. Everything
downstream in the lesson — the F/J test in Predict 1, exercise B, Self-check 2 —
is that one sentence in a different costume.

**"Why" is answered from the record, not from tidiness.** The obvious motivation
for separating measurement from judgment is that layered code is nicer, and a
reader who accepts that motivation will happily accept a policy argument on
`analyzeDelta` the first time it saves work. So *The problem* is built on a
question instead: **are we refusing more than we used to because the model got
worse, or because we got stricter?** Two hypotheses, identical journals under a
verdict-only record, and unanswerable even once the policy name is added. That
frames the measurement as the thing that has to hold still while the yardstick
moves, and it makes exercise B's headline result — analysis byte-identical, level
`low` against `critical` — the payoff rather than a demonstration.

**Policy-free is not purpose-free.** This is the distinction I most want to
survive a month, and it is the one nobody arrives at unaided. `ChangeAnalysis`
carries `removedPrimitiveTypes` *and* `touchedPrimitiveTypes`, where the first is
a subset of the second, and it exists only because a downstream rule wants to
tell destroying from reconfiguring. The shape of the measurement is chosen by
what judgment will need; the measurement still makes no judgment. Without that
paragraph a reader concludes that analysis is meant to be ignorant of the Gate,
which is wrong and would lead them to delete the field.

Deliberately left for lesson 08: everything about what the levels *mean*, the
ordering of factors, the two axes as axes. Stakes appear in this lesson only as a
function you hand an analysis to, twice, to watch the analysis not move.

## What the exercises revealed

All five exercises were executed via `src/scratch.test.ts` and every claimed
output is a real one. `pnpm verify` is green — exit 0, 886 + 227 — which it must
be, since no code changed.

**Exercise D is the best thing in the lesson and it is not the thing I planned.**
I wrote it expecting to contrast a removal with a move. What it actually prints
is that **relocating the slot that contains a protected primitive reports
`touchedPrimitiveTypes: []`** — an empty list, under a policy that has declared
`loom.card` protected, for a delta that carries the card from one side of the
page to the other. Remove the slot: `critical`. Move the card directly: `high`.
Move the slot containing the card: `medium`, on a factor that never mentions the
card. Two ways of expressing the same relocation differ by a whole level.

That is now the exercise readers are told to slow down on, and its answer refuses
to resolve it: the "correct" case and the "gap" case are both written out at full
strength, plus a third reading under which nothing should change and the host
should be tuning `shallowDepthThreshold` instead. A lesson that handed down a
verdict here would be teaching a conclusion I am not confident in — and the
question of which side of the measure/judge line a rule belongs on is exactly
what lesson 09 turns on, so leaving it live is worth more than closing it.

**The empty-delta case turned out to be the better teaching example of a
non-bug.** `analyzeDelta([])` reports `shallowestAffectedDepth: 0` — a delta that
touches nothing claiming it touched the root, via the `Number.isFinite` fallback.
It is inert, and the lesson makes the reader establish that rather than assert
it: the field's only reader is `shallowStructuralChange`, whose first line
returns `null` when nothing was inserted, removed or moved. That is a small
piece of "go and check what reads this" method, and it pairs with lesson 06's B2
— which is the same shape with the opposite outcome, a real bug that an unrelated
check happened to catch.

**Two smaller findings that came free.** In exercise A the inserted ids print as
`n_x3, n_x1, n_x2` — parent first with the highest number, because the builder
makes children first and the walk is pre-order. That is lesson 02's fixture
surprise arriving in a new place, and it costs one sentence. And `remove main`
reports 3 nodes for a slot containing one card, because slot and text nodes are
nodes; a reader predicting 1 or 2 has a workable but wrong model of what
`removedNodeCount` counts.

**Exercise E confirmed the third instance of the forward walk.** Two operations,
insert-then-configure, are measurable; the same two reversed fail with
`node-not-found`. `applyDelta`, `invertDelta` and `analyzeDelta` now all have the
same loop for the same lesson-03 reason, and that is the interleaving payoff Set
I question 4 is built on.

## Found while teaching

Two items, both for the build routine. Nothing was fixed here.

**1. `ChangeAnalysis` does not define "touched", and the definition it uses is
not the one the field name implies.**

`tallyOperation`'s `move` case adds the moved node's own type to
`touchedPrimitiveTypes` only when the node is an element, and never looks inside
the subtree. Executed, under a policy declaring `loom.card` protected:

| Delta | `touchedPrimitiveTypes` | Stakes |
| --- | --- | --- |
| `remove main` | `["loom.card"]` | `critical` |
| `move card → header` | `["loom.card"]` | `high` |
| `move main → header` | `[]` | `medium` |

The third row is a protected primitive crossing the page with no factor naming
it. The behaviour is *internally consistent* — "touched" means named-by,
created-by or destroyed-by an operation, which is the same definition that makes
`movedNodeCount` 1 — so I do not think this is a bug in the ordinary sense. What
it is: a field whose name licenses a reading the code does not implement, driving
a rule called `protected-type-touched`, where the two available phrasings of one
relocation differ by a level.

**My recommendation: document, do not change behaviour.** Two or three lines on
`touchedPrimitiveTypes` giving the definition and stating explicitly that a
subtree riding along a `move` is not touched. Changing the measurement (collect
types from the whole moved subtree) would make the field mean different things
depending on which operation contributed an entry, and it is the field telemetry
retains. Changing the rule needs data that is not in `ChangeAnalysis` at all. If
you want the gap actually closed rather than described, that is a decision
record, not a patch — and the lesson is written so it stays correct either way.

**2. `removedPrimitiveTypes` does not cross into telemetry, and it is the one
that drives the only `critical` factor.**

`assessmentSummarySchema` keeps 7 of the 10 analysis fields. Dropped:
`affectedNodeIds` (unbounded and identifying — clearly right),
`configuredPropKeys` (host vocabulary shading into content — defensible), and
`removedPrimitiveTypes`. The third is bounded, non-identifying, and already a
subset of a field that *is* retained, and it is the input to
`protected-type-removed`, the only factor that reaches `critical`.

The consequence is narrow and real: a corpus can group by "the Gate saw
`commerce.checkout`" but not by "the Gate saw `commerce.checkout` **destroyed**",
which is the query the field exists to make possible. Nothing is lost outright —
`change-proposed` retains the whole delta, so it can be recomputed against the
log — so this is queryability, not data loss. It also does not fall under any of
the three narrowing rules stated at the top of `event.ts`, which is what makes it
look like an omission rather than a decision.

**My recommendation: add the column.** One field on the schema and one line in
`summariseAssessment`. If it was left out deliberately, a sentence in the
narrowing rules saying so would be enough, and is cheaper.

## Needs your input

**Nothing blocking.** One thing to decide rather than let drift, and it is the
same one I raised on #55 and #52:

**Six lessons and three build PRs are now open against a `main` that last moved
on 5 August.** This lesson is the third stacked on unmerged predecessors, and the
chain is #49 → #52 → #55 → this. That is still the right call per lesson — a
course is sequential — but the cost compounds: the stack is reviewed in order or
not at all, and each new lesson makes the first one older.

**My recommendation: land #49 and #52 as a pair when you next have half an hour,
and let the rest follow.** They are small, they merge cleanly in either order,
and getting `main` to the end of lesson 05 shortens every future stack. If you
would rather each lesson PR stand alone against `main`, say so and I will draw
warm-ups only from merged lessons — at a real cost to the interleaving, which is
the part of the method that is doing the most work.

**Still open from earlier runs, unchanged:** the `EventSink`/`emit` wrapping
question on #52 (and #54 is the fix, so lesson 05's exercise D goes stale the day
#54 lands — the merge-order note on #52 has the detail), and the
`invertOperations` doc comment on #55.

## Next

Syllabus order puts **08 — Two axes: stakes and reversibility** next, and it is
settled: `stakes.ts` and `reversibility.ts` last changed on 4 August with 0035,
0002 is Accepted and dated 28 July, and lesson 07 leaves three pointers into it —
the two irreversibility reasons from 06, the levels deliberately withheld here,
and exercise D's unresolved question. No reason to deviate.
