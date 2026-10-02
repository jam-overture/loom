# 2026-10-02 — The witness that runs too late, and the count a page cannot be told

**Chose a lesson, not machinery, and said why.** The alternation the brief allows
would have let this run be course machinery — the 30 September run was, and the
one before that was lesson 32. The deciding factor was that
[0206](../../decisions/0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)
is the first seam in some time whose *argument* is the interesting part rather
than its mechanism: the obvious remedy is five lines, is the one the finding
proposed, and does not work for three separable reasons, only one of which is
about React. A lesson is the only artefact in this repository that can carry that,
and a reader who has it can avoid the same mistake in a system with no components
in it.

**Landed:** [lesson 33, *Shortfall: the fact whose only witness runs too late to
report it*](../33-shortfall.md). Part V's sixteenth seam. Roughly **50 minutes**
to work through — seven exercises, three of them a few seconds and four worth
stopping on, with exercise C the one that decides whether the lesson has landed.

## Why this subject, and how it answers the question lesson 32 handed it

Lesson 32 ended on *what is this fact a function of, and which of those inputs
does anybody in this system own?* — and said, in passing, that **a seam where the
answer is all of them is a check waiting to be written.**

This seam is that answer and the check was not waiting to be written, which is the
whole reason it is worth a lesson. Twelve rows arrive from a source. A primitive
parses each against a shape it holds and draws eleven. Both inputs are owned by one
party; that party performs the comparison itself; it is the only thing in the
system that could be wrong about the result. Every condition lesson 32 said was
missing is satisfied.

And the count could not be reported, because of **when that party runs**. A
component body is called after `renderLoomTree` has returned the diagnostics array
every caller reads, as many times as somebody renders the element, and sometimes
never. So Part V's axis moves again: it has had facts a checker cannot reach,
cannot interpret, cannot compare, is asked the wrong question about, and has to go
and measure. This is the first that is about **the clock**.

The remedy is the seventh the part has used and I made the lesson state it as a
transferable rule rather than as a description of a seam: *when the only party that
knows a fact runs at the wrong time, do not take its report — take its function,
and call it yourself at the right time.*

## What I emphasised, and the reason

**The three reasons, in an order where only the first matters.** The record gives
three arguments against a `report` on the render context, and the temptation is to
present them as a list of equals. They are not. *A component body runs after the
walk has finished* would be true in a system with no React in it at all, as long as
describing a page is separated from rendering one — it is lesson 14's own
distinction, arriving as a scheduling constraint. The other two are React's.
The lesson says so and draws the general consequence: **a seam rejected for a
framework's reason might be worth revisiting when the framework changes; one
rejected for the architecture will not be.**

**Why one declaration is a function where eight are data.** This is the part most
likely to transfer to a reader's own work, so it got a test rather than an
explanation: *is the thing you are asking an author to declare a property of their
component, or a computation over its inputs?* `reads` is a list of names, and a
name is data — which is exactly why 0184 could answer the name-from-a-prop case
with a `{ fromProp, default }` form instead of a callback. *How many rows survived
a shape* is the primitive reading an answer, and the only data form of it is a
number somebody maintains by hand. Self-check 4 and review question 5 apply the
test to something the lesson never discusses — how long a primitive's content
takes to read — because a rule you can only apply to the example it came from is a
fact, not a rule.

**What the declaration is handed, and the half nobody predicts.** Everybody gets
*the props and the answers* from the shape of the problem. Predict 3's second half
is the one with teeth: handing it anything *more* would be a defect, because the
single property that makes this construction worth anything is that the
declaration **can be the same function the component calls**. Give it the resolved
tree and you have commissioned a second implementation of *which rows parse*,
which is a second answer to which rows parse.

**The lie the seam cannot catch, said out loud.** A declaration returning
`{ given: 12, shown: 12 }` for a component that drew eleven is consistent,
believable, silent, and wrong. Exercise G runs it beside the honest construction
and prints both. The lesson states that nothing can enforce the honest one, names
the other declarations carrying the same exposure, and does not dress the
invitation up as a guarantee — which is the only version of this section worth
printing, because a reader who believes the count is checked will trust it in
exactly the case where it is not.

**The guard is about lesson 14's promise, not lesson 05's.** The warm-up asks for
the difference and the lesson turns on it. Nothing here is about `Result`:
`renderLoomTree` has to return an element, a declaration is a third party's code
running inside it, and `the node still rendered: true` on all four rows of exercise
E is *total* being kept under a pressure lesson 14 never imagined — not a node the
renderer cannot resolve, but somebody else's function, free to throw.

## What the exercises turned up

**`times the component pushed: 0`.** Exercise C is the lesson in one line and I did
not know it would read that cleanly until it ran. At the moment `renderLoomTree`
returns — which is where every caller in this repository reads diagnostics — the
component has pushed nothing, because the component has not been called. The
rejected proposal's count is *correct*, is `11 of 12`, and arrives after the array
has been read and put down. The thing to notice is that it would have passed every
test anybody thought to write for it, because a test renders the element.

**One walk, two renders, two pushes, one diagnostic.** Exercise D makes the
second reason concrete without `StrictMode`, deliberately: nothing in it is in
development mode or in a browser, and the component's count still doubles, because
*rendering an element twice* is an ordinary thing to do to a description of a page
— a page and a social image, a server render and a hydration. The framework's own
double-invoke is a third occasion rather than the only one, which is a stronger
argument than the one the record makes.

**The batch refusal has a better transcript than I expected.** Exercise E's fourth
case declares `entries 11 of 12` beside `extra 2 of 1`. The good reading is
perfectly believable and is **not reported**, and the sentence names the second
reading as the reason. My first transcription of that row said *the declaration
returned no readings at all* — I had pasted the third case's detail — and it was
caught by diffing the markdown's fences against the captured run rather than by
reading. Worth recording because it is the same failure the whole exercise
discipline exists to prevent, and the thing that caught it was mechanical.

**`unshownRows` filters before it sorts, and that is not a style choice.**
Exercise F's last line prints the declaration's own array afterwards and it is
still in its own order. `filter` copies, so the sort never reaches the value the
primitive returned. In a module whose whole subject is calling a function somebody
else wrote, *do not scribble on the argument* is the half that gets no decision
record, and the exercise now says it.

**Of the two primitives that read a binding, only one can have a shortfall.**
Exercise G's census prints `loom.tally, loom.feed`, and `loom.tally` reads a
figure — which is either read or not, so there is no partial. That is a nicer
framing of *absence is not emptiness* than the abstract one: the registry answers
`undefined` for `loom.feed` not because nothing is wrong but because nobody has
said, and for `loom.tally` because there is nothing to say.

## Every exercise executed, and how the transcripts were checked

Seven exercises, written into `src/scratch.test.ts`, run with
`pnpm vitest run src/scratch.test.ts`, output transcribed from the run, and the
file deleted before committing.

Then the step that caught the one error: the program fences were extracted back
**out of the finished markdown**, written to `src/scratch.test.ts`, run again, and
every line of every plain fence checked against what that run printed. Two
transcripts had drifted in transcription and one of them — exercise E's fourth row
— was a sentence about a different fault. The course's own
`transcripts.test.ts` would have caught both, and did on the next run; doing it by
hand first is still worth the two minutes, because the failure it reports is a
diff and not a lesson.

## Mutations

Five deliberate breakages, one at a time against the finished files, each restored
from a byte-for-byte copy with `diff` clean afterwards.

| mutation | caught by |
| --- | --- |
| one digit changed in exercise C's transcript (`1` → `2`) | `transcripts.test.ts`: `expected [ 'times the component pushed: 2' ] to deeply equal []` |
| the two lesson pointers removed from `Explain it back` prompt 2 | `elaboration.test.ts`: `expected 31 to be 32` |
| question 9 dropped from Set AL | `schedule.test.ts`: `expected … to have a length of 9 but got 8` |
| `shown` renamed to `placed` in the printed `UnshownReading` | `declarations.test.ts`: `lessons/33-shortfall.md:325 against src/render/unshown.ts:54` |
| **a prose count changed from four to five** | **nothing — 27 files, 428 tests, all green** |

The last row is the one with something in it, and it is the limit `lessons/README.md`
already states rather than a new discovery: *most of what a lesson says carries no
second copy.* What makes it worth the paragraph is that I then **removed the
claim** instead of leaving it checked by nothing.

The first draft said 0206 *"opens by counting four ways a binding can be wrong and
observing that three of them are visible from outside"*. There is no runtime list
of those codes — `describeRenderDiagnostic` is an exhaustive switch over a union,
and a union is not an array — so nothing in `claims.test.ts` could hold the number,
and manufacturing a second copy by parsing `diagnostics.ts` for `"data-` would be
the expensive remedy lesson 28 argues against for a fact this incidental. So the
sentence was rewritten to sort the ways rather than count them, with the record's
own three listed and attributed to the day the record was written. Two other
occurrences went the same way, in the Self-check and in Set AL.

That is this course's own stated preference acted on rather than described: **where
a sentence can be written so it carries no count, that is better than being
checked.** It is also the third time a run has reached for it, after lessons 22 and
24 declined to count the primitive library.

## Found while teaching

**Nothing for another lane this run.** No file outside `lessons/` and
`apps/loom/app/(lessons)/_lib/` was changed and none needed changing. Everything
this lesson teaches about `src/` is the system working as designed, including the
one thing a reader might report as a gap.

That one thing is worth a sentence so the next run does not re-file it. `loom.feed`
has a `readAnswer` that already computes the number this seam exists to carry, and
it declares no `unshown`, so exercise G prints `(none)` for the whole library. That
is **not** a finding against anybody: 0206's own consequences name it, say the line
belongs in `src/primitives/`, and file it for `Loom primitives` — whose directory it
is. `FINDINGS.md` is untouched by this run.

**A note for whoever writes that line.** When it lands, exercise G's last two
transcript lines go red, and that red is the lesson's claim moving rather than
drift. It is the arrangement lesson 29's exercise C already has, and the pin's doc
comment in `transcripts.test.ts` now says so by name, so a lane that trips it can
tell in one read whether to edit the lesson or to look for a mistake. The lesson's
prose was written to survive the change: the count is read off the registry at run
time and the paragraph above it says *on the day this lesson was written*.

## Needs nobody, but worth knowing

The lesson's Self-check question 7 asks a reader to name the other declarations on
a primitive that carry the same unenforceable-honesty exposure, and the answer is
`copy`, `interactive` and `submits`. That is three places where the library asks an
author to describe their own component and cannot check the description. It is not
a defect and there is nothing to file; it is a shape, and if a fourth ever arrives
it would be worth asking whether the shape should have a name.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 172 files / 3,462 tests |
| `@loom/app` | **356 / 6,267**, 1 skipped |
| findings ledger | 937 entries, 0 malformed |

124 prerendered pages, 1,451 text junctions, 0 run together; 3 metadata
conventions, 0 unserved. The new page is `/lessons/33`, and `/lessons/review/set-al`
joins it. The one skipped test is `app/(docs)/_lib/signals/page.test.ts`, which is
not this lane's and was skipped before this branch; nothing here is skipped,
weakened or deleted.

Course machinery this lesson moved, all of it pins: Set AL, `RECOGNISED_TRANSCRIPTS`
140 → **147**, the queue's whole-course length 37 → **38**, the last-three letters
`["AJ", "AK", "AL"]`, the schedule's letter list and last-set assertions,
`LESSONS_WITH_A_DERIVATION` 31 → 32, the set count in `syllabus.ts`'s doc comment,
and two rows in `declarations.test.ts`'s `HELD` census for the two types this
lesson prints — `UnshownReading` whole, and `UnshownDeclaration` as an alias.
**No new `claims.test.ts` entry**, for the reason the mutation section gives: the
one count this lesson wanted to make has no second copy anywhere, so the sentence
stopped making it.

Scope is `lessons/` and `apps/loom/app/(lessons)/_lib/`. `git diff origin/main` is
empty for `src/`, `decisions/`, `tools/`, `FINDINGS.md` and every other route group.

## What is next

**Part V's seventeenth seam, on this lesson's question**, which is neither reach
nor ownership but timing: *when does the party that knows this run, relative to the
moment somebody needs to be told?* The candidates lesson 32's report carried are
still there — a composition's stated `max` against the magnitudes inside it, now
six runs deferred, and the conformance probe's reach over a behaviour placed
conditionally, which got more interesting on 1 October when behaviours started
being placed conditionally. Contrast ([0204], [0205]) is the third and it is the
one to be careful with: lesson 21 already teaches the separation audit, including
`colour-only` versus `also-marked` and the borrowed just-noticeable difference, so
the only genuinely new material is `auditMarkGroundings` — a check whose population
excluded the case, which is lesson 25's shape arriving a third time. A lesson there
would need to be about *populations* rather than about colour, and it may be better
as a second half for lesson 25 than as a seam of its own.

**Or the machinery, now five runs deferred and still true.**
`transcripts.test.ts` cannot say that a block's red is *expected*, and this run
has just added the second block in the course that has signed up for it — exercise
G's census — beside lesson 29's exercise C. Two is the number at which a convention
is cheaper than a comment.

**Or the declaration check's second source root**, which lesson 32's run found and
did not take: `tools/` holds types two lessons now have reason to print, and
letting `declarations.test.ts` see them means answering what happens when a name
exists in both roots.
