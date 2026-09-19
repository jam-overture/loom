# 2026-09-18 — Lesson 25 rewritten: the fault that survived being fixed

**Landed:** a rewrite of the second half of
[`25-exhaustiveness.md`](../25-exhaustiveness.md) — one new section, a rewritten
exercise D, corrected prose around exercise C, an amended Predict 4, Self-check 5
and Reflect; one added question at the end of Set AD in
[`review-schedule.md`](../review-schedule.md); two paragraphs in
[`lessons/README.md`](../README.md); and one finding filed.

**No new lesson this run, and it was not a choice between the two.** Lesson 25
had gone wrong, a second lane was blocked behind it, and the brief puts fixing a
lesson that is now wrong above writing a new one. `pnpm install && pnpm verify`:
**green, exit 0.** Runtime 2,721 tests across 153 files; application 4,784 tests
across 272 files; 670 findings, 0 malformed; 107 prerendered pages, 850 text
junctions, 0 run together. Nothing outside `lessons/` and `FINDINGS.md` is
touched, and no test in any lane was changed — including
`transcripts.test.ts`, whose count of recognised transcripts is unchanged at 95
because one plain fence was replaced by one plain fence.

## Why this run, and what was actually broken

On 15 September this lesson explained how to rank a completeness check, and used
`STAKE_ORDER` — the array the Gate ranks stakes with — as its example of the
weakest row in the table: a test held against a third hand-written copy of the
same four strings, which fails when somebody edits the copy and passes when
somebody edits the union.

The runtime lane read that and fixed it on 17 September
([0166](../../decisions/0166-a-level-the-scale-cannot-place-is-the-heaviest-one.md)),
which left the lesson in three kinds of wrong at once:

| what the lesson said | what was true on 18 September |
| --- | --- |
| a test exists reading `expect(STAKE_ORDER).toEqual([…])`, say what it protects | it was replaced; the answer is *nothing, it is gone* |
| `STAKE_ORDER` is row 5 of the table, *nothing / nothing* | it is row 2 **and** row 4, the strongest pairing in the repository |
| `UNJUDGED_REASONS` has neither check and looks like the other two | it goes through `everyMemberOf` too |
| "this is not live today" — one line of schema away | that line is now a compile error |

And one thing that was not wrong and was the reason the rest could not simply be
patched. Exercise D imported `compareStakes`, `isAtLeast` and `highestStake` and
printed what they do with a level the scale cannot place. The remaining half of
0166 — `rankOf` answering the top of the scale rather than `-1` — changes five of
those nine printed lines, and this course re-runs every Try it section against
`src/` on each build. So a one-line runtime fix meant a red `pnpm verify` for
four surfaces until a lesson caught up, and 0166 was filed as **Proposed** with
the order written down: the lesson first.

## What I emphasised, and why

**The lesson gained a second act rather than losing its example**, which is the
shape the framework lane offered when it filed this and is the right one. The
first act is unchanged: three questions, a compiler answers one, here is how to
rank a check by its second source, and here is a green test that checks nothing.
The second act asks what the fix did.

It closed one door — the route the finding was about, somebody adding a fifth
member to `stakeLevelSchema` — and that is now an arity error in the file that
would be wrong. **And the fault is still there.** A level the scale cannot place
still ranks beneath the bottom of it, because the fault was never in the list; it
is `indexOf` answering a number that means *not here* on a scale where every
number means *how bad*. A completeness check has no opinion about that.

That gave the lesson a better ending than the one it had, and a general rule I
would rather a reader took away than `everyMemberOf`:

> A check is bounded by the population of values that pass through the place it
> runs, and that population is almost never *every value that reaches this
> function*. **A remedy that closes the route you happened to find the fault by
> is not a remedy for the fault.**

**Predict 4 is now the lesson in miniature.** Its first half still quotes the old
test — as of the day it was replaced, which is honest and keeps a good question —
and its second half hands the reader the strongest check in the table and asks
them to name a value that gets past it. The tidy answer is *none, that is what
the check is for*, and it is the answer the fix looked like it gave. Self-check 5
and the ninth question of Set AD ask the same thing cold.

**The lesson now says out loud that it does not know the answer to one thing.**
The one line 0166 still proposes may land tomorrow or not at all, so every
statement about that arithmetic is dated — *measured on 18 September 2026* — and
the reader is sent to `src/runtime/stake-level.ts` and the pinned block at the
bottom of its test to find out where it stands. Thirty seconds, and it is the
only question in the lesson whose answer is not in the lesson. That was forced by
the constraint and turned out to be the better teaching: it is a retrieval
instruction pointing at the source, which is what this course wants anyway.

## Exercise D, and the one place this course reimplements what it teaches

Exercise D prints four things from the live runtime that 0166's change does not
touch — the order, the schema's options, the schema refusing `"catastrophic"`,
and `STAKE_ORDER.indexOf(fifth)` being `-1` — and then declares `rankOf`,
`compare` and `highest` **inside the fence** and computes the comparisons from
them.

That is the only place in the course where a lesson reimplements the thing it is
teaching, and the lesson says so in bold where it does it. The alternative was a
transcript that would be a lie the day a one-line fix landed, in a course whose
whole promise is that it is not. The list being ranked is still the live one, so
a fifth member appearing in `STAKE_ORDER` would still move the output.

Measured, and all of it run before it was written down:

```
the order:  ["low","medium","high","critical"]
the schema: ["low","medium","high","critical"]
the schema refuses the string: true
indexOf: -1
compare(fifth, critical): -4
compare(fifth, low): -1
at least critical: false
at least low: false
highest([low, fifth]): low
```

## What the exercises revealed

**Exercise C can now prove its own point instead of asserting it, and that is the
best thing to come out of the run.** Its claim is that the strength of a
completeness check is invisible in its output. Two of its seven rows were fixed
on 17 September — `STAKE_ORDER` from the weakest row, `UNJUDGED_REASONS` from the
row below that — so I ran the exercise against both checkouts by restoring
`stake-level.ts` and `calibration.ts` at `653a4b5~1`, and it prints **the same
seven lines byte for byte**. Before and after a fix to two of them, with no way to
tell from the printout which two. That is now in the lesson as a measurement
rather than an argument.

**The end-to-end Gate measurement reproduced.** 0166 states that an assessment
carrying an unplaceable level is `accepted / within-policy` where `critical` is
`rejected`. I re-measured rather than quoting it, by building a real assessment
through `assessChange` and substituting the level:

```
refusalFloor: critical
low            accepted / within-policy
critical       rejected / stakes-at-refusal-floor
catastrophic   accepted / within-policy
```

**Set AD's new question went at the end, not in topic order**, and that was not a
style decision. `/lessons` keys a reader's record by set and question number, so
inserting a question at position 6 would have re-pointed every stored answer and
every pending correction for the three questions after it at a different
question. Question 5's wording is refined in place, which keeps its key and is
the same question.

## Found while teaching

**One finding filed, for `Loom daily build`, and it argues *for* the change they
have already proposed.**

0166 names two routes by which an unplaceable level reaches `rankOf`: a cast at a
seam, and a record a newer deployment wrote. Working the second through for the
lesson's prose, it turns out to be **shut** — a disposition read back is parsed
by `dispositionSchema`, which carries `stakeLevelSchema`, so an older reader gets
an unreadable record rather than a misjudged change. The boundary is doing its
job, and it is a different check from the one the record is about. Worth having
straight, because it was going into the lesson as an open door.

The route that *is* open is wider than a cast, and I do not think the record
names it. `gate` is exported from the package root, it takes a
`ChangeAssessment`, and **no schema for that record exists anywhere in `src/`** —
nothing stands between a caller and `rankOf`. A TypeScript caller still has to
cast; a caller who is not writing TypeScript, or who hands over an assessment it
deserialised, does not. That makes failing open less hypothetical than a cast,
which is the form that invites *nobody would write that*.

**Nothing else.** This run read `src/runtime/`, `src/closed-set.ts`,
`src/telemetry/calibration.ts` and two decision records, and everything else it
found was already written down in 0166 by the lane that owns it.

The pictures are beside this report: the lesson as a reader first meets it, and
Set AD now offering nine questions with the rating taken before anything is
revealed. They were taken with `pnpm shoot` against `next start`, with
`playwright-core` installed into a scratch directory as
[0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
requires — the states here are reachable on page load, so the gap the last run
filed against the shot list did not bite this time.

## What is next

**The corrections queue still has the silence the 17 September run described**,
and it is still half a run: `corrections.tsx` computes *nothing has come back
today* from a record, and a reader with no corrections and a reader whose record
is on another machine get the same empty panel. The reading that says which is
already in the store. That is the machinery item, and it pairs with a lesson.

**For the lesson side, lesson 27's question is now sharper than it was.** Lesson
26 closed asking what an incomplete answer looks like on a screen. This run adds
a second candidate, from its own subject: *which of the checks this system relies
on are narrower than the thing they are believed to check, and is there a place
where the width of a check gets written down?* Both are about a claim nobody is
obliged to state. The first has a screen and the second has a review.

**One line of this lesson is knowingly provisional.** The "In the code" table
describes `stake-level.test.ts` as *the fault pinned in the wrong direction on
purpose*. When 0166's decision 3 lands, that clause is wrong. It is one line, it
is this lane's, and it has deliberately not been pre-written to match a change
that may not happen — the finding asks the framework lane to say so on the pull
request that lands it.
