# 2026-10-10 — The fact nobody could not see

**A lesson, by the alternation, and 9 October's report said so unambiguously.**
That run was machinery (the second look). No open lessons pull request — the nine
open ones belong to `docs`, `marketing`, `framework` (two), `primitives` (two),
`signals`, `demo` and `portal` — and no reader feedback since #522. Nothing `Superseded` makes an
existing lesson wrong.

**Landed:** lesson 36, *Vantage: the fact a render cannot see and a document
already holds*. Part V's nineteenth seam. Roughly 70–85 minutes to work through
with the predictions written, which is in line with 33–35; the Predict section is
four questions and the first of them is five separate answers, so it is front
loaded in a way the recent lessons have not been.

It also discharges the finding `Loom primitives` filed against this lane on
9 October, which is the second half of the run and is written up below.

## Which lesson, and why this one out of two

The queue carried two candidates from 5 October onward: a composition's stated
`max` against the magnitudes inside it, and the behaviour-placement case that
turned out to be the surface of lesson 35. The first, and not by preference —
lesson 27 ends on a question I could not answer when I got there, and the answer
turned out to be better than the question.

Lesson 27's closing question was *when a decision record argues for a behaviour
and the code implements a default instead, what in this repository would ever
notice?* Going to look for the noticing is how this lesson happened. There is no
such thing, and the interesting part is not the absence — it is that **the
noticing was possible at two of three moments and the repository had concluded it
was possible at none.**

The sentence that did it is lesson 27's own, quoted from `loom.stat-chart.ts`:

> `max` is a prop because nothing can compute it — a render is a total pure
> projection of one node (0008), so the container cannot read its children.

Whole, it is exact. The first clause on its own says something much larger and
false, and the first clause is the one that travelled: into `loom.trend.ts`, into
`metrics-chart-band.ts`, and into lesson 27. The two numbers sit nine lines apart
in one literal in `metrics-chart-band.ts`, and separately in a local variable
inside `analyzeDelta`.

So this is the first Part V seam where **nothing is out of reach, by anybody, at
any moment.** Every earlier one is somebody unable to answer. This one is
everybody able to and nobody asked.

## What I emphasised, and the two things I deliberately did not

**The moment, not the party.** Part V has been about parties (18–21, 24, 30),
scopes (23) and populations (25, 35). This one is a *when*, and the lesson is
built so the reader derives the three moments rather than reading a list: the
render has no vantage and should not be asked for one, the catalogue has both
halves in one literal in a pure function, and the write path has the whole tree
as `analyzeDelta`'s first argument and **already walks it for a pair** —
`introducedNestedTargets`, produced-less-inherited, which is lesson 22's subject
and the reader has already done it.

**The shape of the available seam.** This is the generalisation I want the reader
to leave with and it is stated once, as a blockquote, rather than repeated: *a
check's population is usually decided by the shape of the seam that was
available, and then gets mistaken for the shape of what is possible.* Every write
path check is `(type, props) → verdict` because almost every question about a page
is, and the one exception was built by somebody whose fault made a page
**unusable**. Nothing has yet been forced out of that shape by a fault that
renders politely.

**And the discriminator nobody chose**, which is the part of this seam I had not
expected and which earns the lesson its place after 35. The catalogue has two
bands that plot a series and both state `max: 100` with the same prop from the
same schema. `metrics-chart` holds six figures in the same literal: checkable
today, in milliseconds, with no host. `metrics-trend` names `binding:
"uptimeByMonth"`: **unreachable permanently**, because the comparison straddles
the one seam nothing static crosses. Nothing in either band's type, props schema
or catalogue line says which is which. The discriminator is how the figures got
into the document, and that is a property of the authored artefact and of nothing
the system models.

Lesson 35 asked who chose a population. A population nobody chose has no argument
to overturn, and that is strictly worse than one chosen badly.

**What I did not emphasise, first:** I did not pitch the missing check as a
defect. It would pass on the day it was written — exercise B prints both zeros —
and the lesson says so in as many words and sits with it, because lesson 23 is
about exactly the move of calling a check that reaches nothing a remedy. The case
*for* writing it is made from the population rather than the fault: the catalogue
grows, and `loom.stat-chart`'s own header names the band that will break it, in
the present tense.

**Second:** I did not write the lesson as being about charts. Exercise D's three
schema verdicts are there to make the rule general — *a ceiling in a schema is a
promise one node can be held to; a ceiling in a prop is a relationship, and a
relationship has no node to be checked at* — and the meter is the control that
makes it a rule rather than an observation about `loom.stat-chart`.

## What the exercises revealed, which was the ending

Six exercises, each executed, `src/scratch.test.ts` deleted. Two of them changed
what the lesson is about.

**Exercise E was going to be one row and became three.** The plan was to show the
Gate accepting a ceiling change. Adding the meter beside the chart — one node, to
have something that *is* refused — turned it into the whole argument:

```
  pull the ceiling down to 100       accepted   within-policy
  add a quarter ten times the rest   accepted   within-policy
  put 140 on the meter               rejected   stakes-at-refusal-floor
```

Two changes that make a chart lie, accepted; one out-of-range number on a meter,
refused at **the refusal floor** — the strongest verdict in the ladder, the one a
host cannot configure past. Same function, same tree, `propsVocabularyFor` wired
for all three. Not because the meter's fault is worse. Because the meter's fault
is a fact about one node.

**And the thing I went looking for and found already written.** I expected the
finding to be *nothing checks this pair*. What is actually true is that
`compositions.test.ts` **does** check this pair, and its doc comment is a better
statement of this lesson's thesis than the lesson is: *"its absence is the
quietest failure in this band's vicinity … So the check has to be about the pair,
which is what this is: any stat under a chart, in any band, now or later."*

There are two facts about that pair. A figure with no magnitude draws nothing. A
figure above the ceiling draws a full column. **The first is asserted over every
band now and later; the second is asserted nowhere**; both come off the same walk
and the same two numbers, four lines against three, in the same loop.

That reframed the lesson's ending away from vantages entirely. Having the moment,
having both halves, and having a working precedent in the same file does not make
a check get written. *The failure being legible does.* A gap in a series is a
hole and somebody notices a hole; a full bar is not a hole, it is a picture. That
is not a fact about Loom and no declaration will fix it, which is why the lesson
closes on a question that needs a method rather than a backlog.

## The marks, and two is a first

Exercises A and B both carry a `moves:` mark, which makes lesson 36 the first
lesson in the course with two. The reason is mechanical and worth stating because
it will recur: **a mark governs exactly one fence**, and these two fences are two
readings of `src/primitives/compositions/` at two different sizes. A prints each
plotted band's ceiling and figures; B counts the bands and the figures and then
runs both halves of the pair check over them. One mark covering both would have
had to cover B's two zeros — which are the control, and whose moving is this
lesson's subject arriving for real. Two marks say two different things.

A's mark also carries the one thing it does **not** cover, explicitly: the second
band's `figures in the subtree: (none)` becoming anything else would mean a read
series had stopped being rows, and half of *The idea* is then wrong rather than
stale.

Both marked fences have a registered claim in `claims.test.ts`, which is what
that file requires: *six figures and no binding* counts A's fourth line, *one
authored plot in the catalogue* counts B's first. Exercise C's three full columns
look exactly like a drifted transcript and need no mark — they come off a fixture
in the lesson, not off anything another lane can move.

## Discharging the 9 October finding on lessons 29 and 35

`Loom primitives` filed this against my lane and asked for four things. All four
are here, and the entry in `FINDINGS.md` says so with the detail.

**Lesson 35's falsified sentence, re-taught rather than accepted.** That was the
one the filer most wanted rewritten and they were right to. The paragraph now
reads 0246 as the lesson's own subject arriving in the lesson's own transcript:
`unplacedSlots` being zero was never a fact about the library, it was a fact about
a library all of whose regions happened to be reachable without an answer, and it
read as the first thing for two weeks. The handover blockquote is replaced with
the part a blockquote cannot say — the gap between a corrected line and the
sentence that says what the line *means* is the third October instance, after
lessons 32 and 24, and this time **the mark worked**: it said *news, not drift*,
and the news got filed instead of pasted.

**Both marks re-aimed.** Lesson 29's said *the three zeros above are the control*
next to prose saying *the two zeros*, which is a message to another lane that
contradicts itself. Lesson 35's said *the four empty verdict lists are expected to
stay empty* when three are. Both now name their control lines and cover the one
that moved, with the reason.

**And the registered claim's own note**, which nobody asked for and is the same
class of thing: `claims.test.ts`'s `matters` for lesson 29 said *a fourth control
line is a change this prose is wrong about*, written when there were three of
them. It now says what the sentence is doing rather than how many lines there
were the day it was written.

Left open, and filed elsewhere: the generalisable half — `auditRegistry`
reporting *bound primitives probed with no answer* as a verdict of its own. It is
`Loom daily build`'s and still open. Until something does it, this pair of lines
moves again the next time a bound primitive declares a failure region, and the
two marks are what stops that reading as drift.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

Run twice. The first was the branch as written; `main` then moved three pull
requests (#563–#565) ahead of it, so the base was merged in and the gate re-run.
**The figures below are the second run**, which is the one that counts.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 201 files / 4,512 tests — `src/` was not opened on this branch; the change is #563–#565 |
| `@loom/app` | 419 files / 7,699 tests |
| findings ledger | 1,105 entries, 0 malformed — two of them this run's |
| `prerender:check` | 131 pages, 1,644 text junctions, 0 run together; 3 metadata conventions, 0 unserved |

**Nothing of this lane's moved across that merge, and nothing in it had a real
chance of moving it.** #565 added `src/signals/action-change.ts` and
`src/signals/deployment.ts` and widened `silences.ts`; #563 and #564 are the
portal and demo route groups and their reports. None of that is `src/runtime/`,
`src/primitives/` or `src/sdk/`, which is where every transcript, claim and
printed type in this course reads from — and `transcripts.test.ts`,
`claims.test.ts` and `declarations.test.ts` are green on the merged tree, so no
exercise, count or declaration drifted. That is the merge being checked rather
than my having read the diff. `FINDINGS.md` union-merged with no conflict, per
0139, so none of the four entries now in that window was dropped.

**No test weakened, skipped or deleted.** Pins moved, all of them upward and all
of them because a lesson landed: `RECOGNISED_TRANSCRIPTS` 161 → 167 (six
exercises, six whole transcripts), the marked-fence census to
`[24, 29, 32, 33, 35, 36, 36]`, `LESSONS_WITH_A_DERIVATION` 34 → 35, the
unscheduled queue 40 → 41, the last three set letters from `AL, AM, AN` to `AM, AN, AO`,
and `REVIEW_SETS` gaining `AO` with ten questions. Two claims added to
`TRANSCRIPT_CLAIMS`; one existing `matters` string reworded, named above.

**Preview**, on the pull request:
`https://loom-git-lessons-36-vantage-jpizzolato36-6341s-projects.vercel.app`
— the lesson at `/lessons/36`, the new set at `/lessons/review/set-ao`. I could
not open either from this container: the environment's network policy denies
that host, so the evidence that it renders is Vercel's own check plus
`prerender:check`'s 131 pages locally, which include both routes. The same note
is on lesson 35's report from 8 October — it is a setting on the environment
rather than anything in this branch, and it is worth whoever next wants to look
at a page rather than a test knowing that it has now cost two runs.

No decision record: a lesson is not a decision, and nothing about the runtime,
the tree schema or an `Accepted` record is touched.

Scope is `lessons/36-vantage.md` (new), `lessons/README.md`,
`lessons/review-schedule.md`, `lessons/29-readership.md`,
`lessons/35-instruments.md`, `FINDINGS.md`, this report, and five test files
under `apps/loom/app/(lessons)/_lib/`. `src/`, `tools/`, `decisions/`,
`reports/`, the root `README.md` and every other route group are untouched.
`src/scratch.test.ts` existed while the exercises were being written and is
deleted.

## Found while teaching

**One, filed for `Loom primitives` and not fixed**, in two asks of very different
size.

The small one is three lines in `compositions.test.ts`, beside the four that are
already there: no figure under a `loom.stat-chart` exceeds that chart's
`max ?? 100`. It passes today and buys nothing this week. What makes it worth
having is that the primitive's own header names the band that will break it.

The large one is the design question and is genuinely theirs: **nothing anywhere
declares that `loom.stat-chart`'s `max` is the ceiling for `loom.stat`'s
`magnitude`.** Without that declaration the fit cannot move past the catalogue,
and *with* it the walk and the vantage are both already built —
`introducedNestedTargets` is the shape, in `analyzeDelta`, today. Lesson 22's
predicate comes from a host's policy and lesson 30's seam is closed by a rule a
primitive states about itself; this one has no declarer, and 0185's argument about
what a wrong declaration costs in each direction is the conversation to have
before writing one. Which is why it is a finding and not a patch from this lane.

I did not file the clamp, and want to say why in case a later run reads the
transcript and thinks it was missed: `min(1, max(0, …))` in `stylesheet.ts` is
**right**, and removing it would turn a misleading chart into a destroyed page.
That it is also what makes the fault invisible is the finding, not a defect in the
clamp.

**Nothing else for another lane.** The three things this run found in its own
files — the two stale marks and the stale `matters` string — are fixed above
rather than filed, per the boundary, and they are the 9 October entry's own
subject arriving in this lane's directory one day later.

## What is next

**Machinery, by the alternation.** Two candidates and the first is now the one I
would take.

The second look has no `Quiet`. A reader with no re-answers gets no panel, which
is right on the review queue and wrong on the **corrections page**, where
somebody has gone looking: *nothing has come back yet* and *everything that came
back, you got* are the same blank there, and that is the distinction lesson 24 is
about, drawn seven times already for the queue next to it. Small, no design
question outstanding, and it is this surface failing its own argument.

Per-row reveal for lesson 35's exercise C is still the open design question and
still the maintainer's — question 2 of *Needs your input* on #552, unanswered
since 8 October. It stays unbuilt.

For the lesson after that, the behaviour-placement seam is still unwritten and is
now the only thing on the queue, since this run took the other one. Lesson 36's
own closing question — *of the facts this system is in a position to check and
does not, which would announce themselves if they went wrong* — is a better
candidate than either, and it is not a lesson yet: it is a survey somebody has to
do first, and the surveying is not this lane's.
