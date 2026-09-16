# 2026-09-15 — Lesson 25: the one question of three a compiler answers

**Landed:** [`lessons/25-exhaustiveness.md`](../25-exhaustiveness.md), Set AD in
[`review-schedule.md`](../review-schedule.md), the syllabus row and the Part V
paragraph in [`lessons/README.md`](../README.md), four pinned expectations in
this lane's own tests, one finding filed in `FINDINGS.md` and one closed.

`pnpm install && pnpm verify`: **green, exit 0.** Runtime 2,620 tests across 150
files; application 4,377 tests across 251 files; 637 findings, 0 malformed; 104
prerendered pages, 828 text junctions, 0 run together.

Those are the numbers after merging `main`, which moved seven commits ahead while
this ran (#302–#308). Verify was green before the merge too — 2,572 and 4,254 —
and the merge was taken rather than left because `FINDINGS.md` is the most
conflicted path in the repository and this branch adds eighty lines to the top of
it. Nothing the merge brought in touches a module these exercises import: the
`src/` half of it is `primitives/` and `signals/`, and `transcripts.test.ts`
re-ran every Try it program against the merged checkout and found no drift.

**No test was added or removed.** The four changed assertions are all pins that
every new set moves and that say so in their own comments — the set letters in
`schedule.test.ts`, the queue length and the last three letters in
`queue.test.ts`, and the recognised-transcript count in `transcripts.test.ts`
(83 → 89, one per exercise). Nothing in `src/` is touched by this branch.

**Fifty to sixty-five minutes** to work through. Six exercises, and the Predict
section is four questions rather than the usual three or four long ones, so it is
shorter than 18 or 24 and denser than 20.

## Why this lesson, and why it is in Part V

The last run was a repair and left the syllabus question open: Part V's next seam
should be chosen by lesson 24's closing question — *when your system cannot
answer, what does it return, and who would notice if it started returning that
when it could?*

Taken literally that points at another seam in `src/`. I read it the other way,
at the checker rather than at the checked, and the answer is better than the
literal reading would have got: **a compiler's answer to a question it was never
asked is no output at all, which is the same output as a pass.**

That earns Part V membership on the question rather than on the shape, and I say
so in the lesson rather than pretending the shape fits. The first seven seams are
about a fact somebody else owns — a host's registry, a deployment's theme,
another document's anchors, a component author who has not spoken yet. This one
is about a fact **nobody** owns, and the remedy is therefore not a declaration at
all: it is a place to put a claim where getting it wrong is an event.

The subject is `everyMemberOf` and
[0132](../../decisions/0132-a-type-that-mirrors-a-schema-is-derived-from-it.md),
both from `framework-29` on 12 September — three days settled, `Accepted`, and
nothing since has touched `src/closed-set.ts` or `src/runtime/policy.ts`.

## What I emphasised, and why

**1. Three questions, not one.** This is the spine.

- *Is every member handled?* The compiler answers, and this is what everybody
  means by "exhaustive".
- *Is every member listed?* Nothing answers. You keep a copy, and the copy is
  silently wrong the day a member lands.
- *Can every member happen?* Nothing answers, ever. This is lesson 18's dead
  `unavailable`.

The reason the second is dangerous rather than merely unchecked is that the first
is answered *so well* that people generalise from it. A developer who has spent a
year being caught by missing `switch` cases has learned, correctly, that the
compiler will not let a union get past them — in one direction. The lesson makes
the reader write the wrong generalisation down in Predict 1 before it says any of
this.

**2. Completeness is not a property a value can have.** The explanation that
makes the rest derivable rather than memorable: a type is a claim about values,
membership is a question about one value at a time, and completeness is a
question about the relationship between a whole value and a whole type — for
which there is nowhere in the syntax to write it down.

Which is why the fix has to *make* somewhere, and why `everyMemberOf` turns
writing the list into a call. Two details of the signature are load-bearing and I
gave both a paragraph: the currying (TypeScript infers all of a call's type
arguments or none), and `[Union] extends [List[number]]` rather than the naked
form (which would distribute over the union and ask a different question).

**3. How strong is a completeness check? Ask what its second source is.** This is
the part I expect to transfer furthest, because it is not about Loom or
TypeScript. A check compares two things and is worth exactly the independence of
the second one. The six-row table in *The idea* ranks every published list in this
runtime by that question, and the row to sit with is the fifth:

> **A test that restates the value it is testing is not a check; it is a second
> copy with a tick beside it.**

**4. The two directions of a mirror, measured rather than asserted.** 0132 states
the asymmetry and I did not take it on description — see below.

## The exercises

Six, all executed against this checkout's `src/` before anything was written
down, by putting the Try it fences into `src/scratch.test.ts` in document order
and running `pnpm vitest run src/scratch.test.ts`. The transcripts in the lesson
are that run's. `src/scratch.test.ts` is deleted. `transcripts.test.ts` now
recognises six more blocks and every one of them matched the runner's own output
on the first try.

**A — the same union, twice.** A `switch` handles both refusals it is handed and
prints a sentence for each; a consumer keeping its own four-member list counts one
of two and reports a clean total. Nothing warns.

**B — what the check costs at run time.** `everyMemberOf` hands back the array it
was given, identically, and the printed function body is the whole of it:

```
the same array back: true
the body it ran: (list, ..._complete) => list
```

I kept this exercise because the printed body is the point — the strongest check
in the lesson has no run-time artefact, which is both what makes it free and the
one real thing it costs. A bundler that strips types, a consumer in JavaScript, a
generated client: none of them inherit it.

**C — how strong is each check in this runtime.** Seven lists, each compared with
its second source where one exists:

```
TREE_OPERATIONS             4  agrees with the schema
TELEMETRY_EVENT_TYPES      18  agrees with the schema
PALETTE_SLOTS              17  is the schema's own list
STAKE_ORDER                 4  agrees with the schema
STORE_ERROR_CODES           5  no schema to ask
COMPOSITION_OUTCOME_KINDS   5  no schema to ask
UNJUDGED_REASONS            3  no schema to ask
```

This is the exercise I would defend hardest, and the reason is that **every row
in it is true and three pairs of rows mean completely different things.** Three
say *agrees with the schema* and two of those three are checked by a real test in
the runtime while `STAKE_ORDER` is not — the comparison the reader is looking at
was made by the exercise, just then, for the first time. Three say *no schema to
ask* and they are a compile-time check at the declaration, a compile-time check
in a test file, and nothing at all.

Three strengths of guarantee, and from outside they are the same three strings.

**D — the rank of a level nobody listed.** The consequence exercise, and the one
that found something:

```
indexOf: -1
compareStakes(fifth, critical): -4
compareStakes(fifth, low): -1
isAtLeast(fifth, critical): false
isAtLeast(fifth, low): false
highestStake([low, fifth]): low
today, the schema refuses it: true
```

`isAtLeast(fifth, "low")` being `false` is the line. A level meant to sit above
`critical` ranks *beneath* `low`, because `indexOf` answers `-1` and every
comparison in the Gate is arithmetic on that number.

**E — the third question.** Four ways to make the memory store refuse, tallied
against the published list: `4 of 5`, with `unavailable` never reached. The
exercise then argues against its own headline, which is the part that took the
longest to write: **this is correct, not a defect.** An in-memory map is always
there; the reason is for the Postgres driver. And it looks *exactly* like lesson
18's defect, where the same code was unreachable in every implementation for a
month. A tally cannot tell you which of the two you are in.

**F — one statement, counted.** Thirteen knobs from the schema, thirteen keys on
the parsed default, agreeing — and the exercise says plainly that this proves
less than it looks, because both numbers come from the same schema. It is what a
passing consistency check looks like when it is comparing something with itself,
printed beside a section arguing that such checks are the weak row of the table.

## The measurement the course cannot run

0132 says a field added to a schema and not to its hand-written mirror compiles
clean. I did not take that on description either, because it is three days old and
the whole lesson rests on it. On this checkout, editing `src/runtime/policy.ts` on
a working copy and running `pnpm typecheck`:

| the disagreement | errors |
| --- | --- |
| schema has a fourteenth field, a mirror type does not | **0** |
| the type names a field the schema does not produce | **73, in 12 files** |

Both reverted; `git status` was clean before anything was committed and `src/` is
untouched by this branch.

I also checked the two cheap answers Predict 2 offers, because the lesson claims
both fail: `const x: readonly Code[] = ["a", "b"]` and
`["a", "b"] satisfies readonly Code[]` against a three-member union both compile
with no error.

And I ran the diagnostics themselves, which produced the one thing in this lesson
that is in no record. The incomplete-list error **does not name the missing
member** — it says *Expected 2 arguments, but got 1* and points at a conditional
type. Supply any second argument and the same compiler says
*Argument of type '"not-found"' is not assignable to parameter of type
'"unavailable"'.* The information was never absent; there was nowhere in the
message for it to go. That is the honest cost of a type-level check and it is now
in the lesson: the check is as precise as you like and the diagnostic is as good
as the shape you smuggled it into.

**These two numbers are the one thing in the lesson that is not recomputed when
the page is built**, and the lesson says so where it prints them, names the date,
and says which of the two is structural (`0`, for the same reason it was zero in
August) and which will move as tests are added (`73`). That is the honest handling
of the question the last run left open — *should a lesson state a count it did not
print?* The answer this run arrived at is: it may, if it says where the count came
from, when, and what would make it stale.

## Found while teaching

**Two published lists claim completeness with nothing checking either, and one of
them is what the Gate ranks with.** Filed for `Loom daily build`; `src/` is that
lane's and nothing here is fixed.

`framework-29` closed four unions on 12 September and did not revisit the lists
that already existed, which was not its unit. Two of those are unguarded:

- **`UNJUDGED_REASONS`** is a bare literal — and `src/tree/delta.ts`'s own doc
  comment names it as an exemplar of the remedy, *"the same one
  `EPISODE_RESOLUTION_KINDS` and `UNJUDGED_REASONS` already are"*. One of that
  pair is guarded and the other is the sentence's own counterexample. Three
  members, one consumer: a call and a comma.
- **`STAKE_ORDER`** is the consequential one. It is a hand-written copy of a union
  that *does* have a schema, its test compares it against a third copy of the same
  four strings, and `rankOf` is `indexOf`. Exercise D is what happens next:
  `rejectAtRefusalFloor` (`gate.ts:96`) asks `isAtLeast` and returns `null`,
  `confirmAboveCeiling` (`gate.ts:159`) asks `isAbove` and returns `null`, and
  `highestStake` folds from a `"low"` seed so the factor never leaves the
  analysis. A change at the new top severity would be applied without being
  mentioned, by a ladder behaving exactly as designed.

**Latent, not live** — `stakeLevelSchema` has four members and refuses a fifth at
the boundary, which is exercise D's last line and the reason this is a lesson
rather than an incident. What is wrong today is that the thing standing between
the Gate's arithmetic and a one-line schema edit is a test that restates its own
subject.

I filed the fix as three options and picked none, because `STAKE_ORDER` is an
*order* rather than a set and the two coincide only because the schema happens to
be written in severity order. Deriving it from `schema.options` makes declaration
order load-bearing for the Gate; `everyMemberOf` keeps the order explicit and only
forces completeness; and there is a third answer that is neither, which is to stop
`rankOf` answering `-1`. That is a design call in somebody else's lane.

**And one closed in passing, as bookkeeping only.** The 26 August finding *the
Gate grew a seventh rule and lesson 09 still says six* was still marked open. The
work was done on 27 August by `lessons-15-the-seventh-rung` — eleven places in
lesson 09, one in lesson 08, every rung below position five renumbered, Set K
question 1 and Set M question 5 amended — and the entry never said so. I verified
all four before closing it. It had been the first thing a lane reading the ledger
for its next job would find, and it pointed at a lesson that is right.

## What I did not do

**I did not fix either finding.** `src/` is not this lane's, and a lessons pull
request that also changes the Gate's arithmetic is a pull request nobody can
review.

**I did not build course machinery this run.** The brief allows alternating and
the last two runs were a lesson and a repair, so machinery is arguably due. I
chose the lesson because the material had a three-day-old record, a measurable
claim I could re-run, and a consequence in the Gate that would have gone on being
invisible — and because the machinery item I would have picked is the one the last
run argued against building (a checker for what a lesson says the code *is*).

**No new part.** This lesson does not fit Part V's original shape and I considered
opening Part VI for it. Against: one lesson is not a part, the review schedule
anchors five of its sets to parts, and the honest relationship is that lesson 25
answers lesson 24's question rather than starting a new subject. The README's Part
V paragraph now says which axis it adds instead.

## What is next

The obvious hand-forward is that **lesson 25 goes stale the day either finding is
closed**, and unlike most staleness this one is caught: exercise C prints
`UNJUDGED_REASONS` and `STAKE_ORDER`, and `transcripts.test.ts` compares those
lines on every `pnpm verify`. Guarding `UNJUDGED_REASONS` does not change that
output, but deriving `STAKE_ORDER` from `stakeLevelSchema.options` changes the
fourth row from *agrees with the schema* to *is the schema's own list*, and
whichever run does it will see this lesson go red and name itself. That is what
the exercise discipline is supposed to feel like from the other side.

The syllabus question for lesson 26 is the one this lesson ends on: **which of the
things this system relies on are claims nobody ever states, and what would it take
for stating one to be cheaper than not?** The `role` vocabulary with its one
member is a candidate — a closed set that is complete, checked, and has nothing to
be complete *about* yet.
