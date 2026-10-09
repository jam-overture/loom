# 2026-10-08 — The rule an instrument's reach wrote

**Chose a lesson over course machinery, and the brief's alternation decides it
rather than a preference.** 6 October was machinery — the `moves:` mark's second
half — and that run's *What is next* said a lesson, unambiguously. No open
lessons pull request, no reader feedback since #522, nothing `Superseded` that
makes an existing lesson wrong.

**Landed:** lesson 35, *Instruments: the rule a probe's reach wrote in the
library's hand*. Six exercises, all executed; Set AN in the review schedule; the
syllabus row and the Part V narrative; and one finding for `Loom primitives`.

Roughly fifty minutes to work through if the Predict section is actually written
down, which is the half that decides whether it teaches anything.

## What it teaches, and why this seam rather than the two that were queued

5 and 6 October both named the same two candidates for Part V's eighteenth seam:
a composition's stated `max` against the magnitudes inside it, and the
conformance probe's reach over a behaviour placed conditionally. I started on the
second and it turned out to be the surface of something larger, so the lesson is
the larger thing.

The seam is this. `auditRegistry` calls a hundred and seven components, several
times each, and owes the caller **one claim per primitive**. Somewhere between
*the renders I tried* and *this primitive* there is a quantifier, and
`conformance.ts` chooses a different one twice, forty lines apart:
`probeEditableDecoration` reduces with `every`, `probePlacement` with `some`. So
one primitive, with one condition met in one render out of eight, is
simultaneously **not decorated** and **placing its slot**.

That is the lesson's Predict 1 and the reason the lesson exists. Neither choice
is careless, and the justification is not about strictness: a decoration is a
property of *a render* and a placement is a property of *the primitive*, so one
wants *every page carries the handle* and the other wants *no render placed it*.

The part worth more than either is the derivation that follows, which exercise C
prints rather than argues: **`every` is anti-monotone and `some` is monotone over
the population.** Growing the probe's reach can only ever raise a decoration
report and only ever clear a placement one. That is the property that made
September's change to the harness cheap — teaching the probe about answers could
not turn a correct bound primitive into a reported one — and it is the general
technique the lesson asks a reader to keep: *pick the quantifier by which
direction you can afford the verdict to move on the day the instrument gets
better.*

And then what neither quantifier can say: *I never tried the state your component
cares about*. The population is what a schema **closes over**, so `tone` is three
samples and `label: z.string().optional()` is **none** — not one at its default,
which is the answer most first attempts give (Predict 2). An answer from a data
source cannot be sampled at all, for a reason 0185 states better than I could:
an invented answer is either one the primitive can draw, in which case the probe
is measuring its own guess, or one it cannot, in which case every bound primitive
reports its failure region as the only one it places.

## The thing this lesson is actually for

I did not set out to write a lesson about systems rather than about trees, and
the reason it became one is that 0180 and 0185 are the clearest worked example of
a failure mode I have not seen stated anywhere in this repository:

> **An instrument that cannot reach a state puts pressure on the system to forbid
> the state.**

0180 is that pressure landing. A bound primitive's regions read as dropped
content; three things could have changed — the probe, the list, or the library —
and the library changed, in a clause that reads as a design principle in the file
where it binds. Read `loom.feed.ts`'s header cold and it sounds like something
learned about bound primitives. The record was honest in the same breath, which
is the only reason the story is recoverable: *"That is a defensible design on its
own and it was not chosen: it is what the probe permits."*

Three properties make it hard to see, and the lesson states all three because
none of them is anybody's carelessness. The pressure lands where the instrument
is not — the red test is in the library's suite and the limit is in the SDK, so
the cheapest correct-looking move is the one inside your own lane. The
prohibition then survives as a principle, quoted forward into the next
primitive's header with its reason one directory away. And **nothing goes red
when the reason stops being true**, because what 0185 changed was a *permission*,
and a primitive declaring fewer regions than it may is not a defect any program
can detect.

That last property is what connects this to lesson 34, which closed on *which
questions did you decide you would never be able to ask?* Here nobody decided.
The system reshaped itself around the answerable question so smoothly that the
reshaping reads as design.

## What the exercises found, which is the finding

I expected to demonstrate 0180 historically and found it live.

**Exercise F builds the shape 0180 forbids** — two declared regions, one placed
when an answer is empty, one when the source failed — and audits it the way
`library.test.ts` audits the real library. `loom.listing: unavailable`: a list of
certainties containing a primitive that drops nothing. Then audits it with three
answer states supplied, and the report is gone. Eleven states instead of eight,
three of them answered, nothing excused, no change to the primitive.

**Exercise E then prints the library audited the way its own suite audits it**,
and the last figure on every bound primitive's line is a zero. Five primitives
read a binding; they are probed in 4, 1, 11, 7 and 13 states; **not one of those
states carries an answer.**

And the correction that made the finding sharper rather than weaker. My first
draft of both the lesson and this report said *nothing in this repository passes
`answers`*, and that is false: `src/sdk/audit.test.ts` declares a
`loom.bound-listing` of its own and asserts exactly the pair exercise F prints.
I found it by grepping to check my own sentence, which is the only reason it is
not in the lesson. The true statement is narrower and worse: that suite is the
**only** caller, the primitive it answers for exists in a test file and on no
page, and every audit of a registry of real primitives — `library.test.ts`,
`behaviour.test.ts`, the CLI templates, the scaffold fixture, the portal's own
`addressing.ts` — takes one argument. So exercise F is reproducing the SDK's own
proof rather than discovering anything, the lesson now says so, and what is in no
test anywhere is that same pair run against the starter library.

Which made the rest of it findable by reading, and it is filed rather than fixed:
`loom.plate.ts` landed on 6 October — thirteen days after the discharge — and
restates the restriction with the discharged reason in the **present tense**
(*"because `auditRegistry` cannot supply one"*). And 0185's own condition for
revisiting its deferred alternative (*worth revisiting if a third bound primitive
arrives*) is past: #529 landed three on 6 October and there are five.

The lesson's last section says all of this to the reader rather than keeping it
for a report, because a lesson whose subject is a rule outliving its reason and
which declines to say that it is happening right now would be teaching the thing
and not doing it.

## Every exercise executed

Six, written in `src/scratch.test.ts`, run, output pasted, file deleted. They are
also executed by the course's own build step — `run.test.ts` compiles each Try it
program against `src/` and `transcripts.test.ts` compares every line — and both
are green, which is the stronger statement than my having run them.

Two things the running changed. The first draft of the preamble declared
`type Props = z.infer<typeof PROPS>`, and `declarations.test.ts` correctly read
that fence as printing a declaration and held it against `src/`, where `Props` is
declared a hundred and seven times. A fence that prints a type is held to the
declaration it claims to be, which is the check written in September for lesson
11, and the right answer was not to weaken it: the alias is gone and the four
sites write `z.infer<typeof PROPS>`. The second was `probed in 1 states`, which
is nobody's defect and would have been in the transcript for ever.

The exercise set is also where exercise B stopped being two primitives and became
five. `loom.except-warning` carries the handle in **seven renders out of eight**
and is reported with the same flat word a primitive that carries it in none gets
— which is what a quantifier costs, and it is the case the last of *It could have
been otherwise* declines to fix. A proportion would separate them, and the
denominator would be a number about `probeConfigurations` wearing a number about
the primitive, so `7/8` against another primitive's `3/4` compares two
populations with nothing saying so. Declining to count is the same judgement
lesson 27 makes about a ceiling nobody computes, and 6 October's run said the
reflex of declining was worth re-examining per sentence now that a sentence can
be checked — so it was examined, and this one still declines.

## Pins moved, and the fifth mark

Six pins, every one a count that a new lesson moves:

| pin | from | to |
| --- | --- | --- |
| `RECOGNISED_TRANSCRIPTS` | 155 | 161 — six exercises, one whole transcript each |
| the marked-fence census | `[24, 29, 32, 33]` | `[24, 29, 32, 33, 35]` |
| `LESSONS_WITH_A_DERIVATION` | 33 | 34 |
| `REVIEW_SETS` | ends at `AM` | ends at `AN`, ten questions |
| the unscheduled queue | 39 sets | 40 |
| the queue's last three | `AK AL AM` | `AL AM AN` |

**Exercise E carries a `moves:` mark, the fifth in the course**, and it is both
of the two reasons a fence wants one at once. Its first two lines are a second
copy of the starter library — how many primitives it registers and which of them
declare `reads` — so a red there is this lesson's claim following the code, which
is lessons 29 and 33's reason. And the sentence under it counts the second line,
which is lessons 32 and 24's reason, so the sentence is registered in
`claims.test.ts` and correcting the fence now means reading the paragraph. The
mark also says which lines it does **not** cover: the four empty verdict lists
are the library being correct, and one of them ceasing to be empty is not drift.

Registering it changed the sentence. The first draft read *A binding is read by
**five** of them* with the number emboldened, and the course's claims are matched
against raw file text, so the pin would have found nothing and failed as a
rewording. The bold is gone. The same paragraph also said *thirty-six renders
between them*, and a lesson about a count outliving its reason is the wrong place
to type a sum of five numbers no check reads — so it now says *however many
states each was probed in*, and the per-primitive figures stay where the fence
can be held to them. `lessons/README.md`'s list of the five marks names lesson
35's sentence rather than quoting it, which the README says once, in its own
paragraph, is a requirement and not a style.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| both packages | 409 files / 7,302 tests |
| `@jam-overture/loom` | unchanged — `src/` was not opened |
| the lessons suite | 402 tests across 19 files, all green |
| findings ledger | 1,062 entries, 0 malformed — one new |
| `prerender:check` | 128 pages, 1,584 text junctions, 0 run together |

Run twice. The first was the branch as first pushed; `main` then moved three
pull requests (#544–#546) and left this one un-mergeable, so the base was merged
in at `de7def3` and the gate re-run. **The figures above are the second run**,
which is the one that counts, and the findings ledger reads 1,062 rather than the
1,059 of the first because two other lanes filed while this branch was open.
Exercise E's transcript is unchanged across the merge, which is the one figure in
this lesson a base merge could have moved — nothing in #544–#546 registers a
primitive.

**No test weakened, skipped or deleted, and no assertion changed except the six
pins above.** One test added — the registered claim for exercise E. The marked
fence census is now `[24, 29, 32, 33, 35]`; `RECOGNISED_TRANSCRIPTS` is the only
other count in `transcripts.test.ts` that moved.

**Preview**, Ready on the pull request:
`https://loom-git-lessons-35-instruments-jpizzolato36-6341s-projects.vercel.app`
— the lesson at `/lessons/35`, the new set at `/lessons/review/set-an`. I could
not open either from this container: the environment's network policy denies
`loom-git-lessons-35-instruments-jpizzolato36-6341s-projects.vercel.app`, so the
evidence that it renders is Vercel's own **Ready** status plus
`prerender:check`'s 128 pages locally, which include these routes. Worth
knowing for whoever next wants to look at a page rather than a test: it is a
setting on the environment rather than anything in this branch.

No decision record: nothing about the runtime, the tree schema or an `Accepted`
record is touched, and a lesson is not a decision.

Scope is `lessons/35-instruments.md` (new), `lessons/README.md`,
`lessons/review-schedule.md`, this report, one entry at the top of `FINDINGS.md`,
and five files under `apps/loom/app/(lessons)/_lib/` —
`transcripts.test.ts`, `claims.test.ts`, `schedule.test.ts`, `queue.test.ts`,
`elaboration.test.ts`. Nothing outside this lane: `src/`, `tools/`, `decisions/`
and every other route group are untouched.

## Found while teaching

**One, filed and not fixed** — the 8 October entry at the top of `FINDINGS.md`,
owned by `Loom primitives` with one part for `Loom daily build`. It is the three
facts in *What the exercises found* above: no caller passes `answers`;
`loom.plate.ts` restates a discharged restriction with the discharged reason in
the present tense, thirteen days after the discharge; and 0185's own threshold
for revisiting its deferred alternative is past at five bound primitives. The
entry states the first of those the narrow way, after the correction above:
the mechanism is proved against a synthetic primitive and has never been
pointed at a registered one.

None of it is broken on a page. Every bound primitive in the library works, the
suite is green, and the first remedy — passing `answers` in `library.test.ts` —
provably cannot break anything, because `unplacedSlots` is `some` negated and
adding a state can only clear a report. That is the lesson's own exercise C
argument used to say how safe somebody else's change is, which is the most useful
thing teaching this bought.

**And one observation about this lane, recorded rather than filed.** The
`moves:`-mark convention now has five instances and the fifth needed both of its
two reasons at once, which the convention's own prose had treated as two kinds of
fence. It cost nothing — the mark says which lines each half covers — but if a
sixth arrives the same way, the two-kinds framing in `transcripts.test.ts` is the
sentence to rewrite, and it is this lane's own.

## What is next

**Machinery, by the alternation, and the queue is not empty.** The two candidates
5 and 6 October named both survive: a composition's stated `max` against the
magnitudes inside it, which lesson 27 already holds the argument for, and the
behaviour-placement case that turned out to be the surface of this lesson and is
still unwritten as its own seam.

For machinery, the thing this lesson makes newly obvious is on the surface rather
than in the checks. Exercise C is four lines of output that *are* a derivation,
and at `/lessons` they arrive all at once when the last prediction is committed,
like every other transcript. A reader who predicted the four rows one at a time
would have the monotone claim rather than have read it — and the course's own
rule about revealing a Try it section in one go exists because predicting every
output before running anything is the instruction. Those two are in tension for
the first time here, and working out which wins is a design question rather than
a build task, so it is written down rather than started.
