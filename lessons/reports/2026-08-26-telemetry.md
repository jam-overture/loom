# 2026-08-26 — Lesson 17: Telemetry

**Landed:** [`lessons/17-telemetry.md`](../17-telemetry.md), its syllabus link in
`lessons/README.md`, **Set U** and **Set V** in `lessons/review-schedule.md`, and
five count updates in `apps/loom/app/(lessons)/` that two more sets move. One
test outside the lane also moved; it is explained below rather than buried in the
diff.

`pnpm install && pnpm verify` **green**: 1695 runtime tests across 108 files,
1880 app tests across 132. `next build` prerenders 72 pages — `/lessons/17`,
`/lessons/review/set-u` and `/lessons/review/set-v` among them.

Roughly **50–65 minutes** to work through properly, of which about twenty is the
five exercises. Shorter than lesson 16 by one exercise and about the same by
reading time.

**This is the last lesson in the syllabus.** Parts I–IV are complete: seventeen
lessons and twenty-two review sets.

## Reader feedback: nothing to address this run

Four pull requests are open and none is a lessons PR — #164 is `Loom primitives`,
#165 the framework, #166 marketing, #167 `Loom docs`. The lesson-16 PR merged. No
comment anywhere asks the course for anything, so the syllabus decided this run.

## A lesson rather than machinery, and why

Strict alternation would have made this machinery, since 16 was a lesson. I chose
the lesson for the plain reason: **17 is the last one, and lesson 16 named its
door in.** Every exercise in lesson 16 copied `confidence: 0.9` into a preamble
and none of them looked at it; three lessons have now leaned on a claim about a
self-graded number nothing checked. Another machinery run would have left the
syllabus one short for a second week with the ending already written.

The outstanding machinery item is unchanged and is now the only one of the
brief's four untouched: **runnable exercises.** Write-before-reveal,
confidence-before-reveal and the live due queue all landed in #136. Lesson 17 is
a better argument for runnable exercises than 16 was, because Exercise E's
punchline is a set of numbers rather than a sentence, and a reader who skips the
paste gets the sentence.

Teaching only what is settled cost nothing this run. `src/telemetry/` was last
touched on **21 August**, five days ago, and 0007, 0023, 0024, 0031, 0037, 0042
and 0045 are all `Accepted` and unamended. Nothing about §6 has moved since.

## What I emphasised, and why

**The spine is Predict 1, and the trap is in its second half.** *Design the check
that finds out whether a 0.9 is really a 0.9 — then say what the runtime should
do with the answer.* Almost every reader writes *move the floor*, which is the
reasonable answer and the one 0031 refuses. Getting them to write it down first
is the only way I could find to make the refusal land as an argument rather than
as a policy. The lesson says so explicitly before the reveal: *"Write yours down
anyway; it is genuinely the reasonable answer."*

The refusal turns on a sentence that is worth the whole lesson: **the drift is
silent by construction, because the thing that would notice is the thing that
moved.** That is lesson 16's pure-event-sourcing argument wearing different
clothes, and the lesson says so — a fold that *is* the read cannot notice it has
drifted, and a gate tuned from its own outcomes has no fixed point to be measured
against. Two instances of one shape, three lessons apart, is worth more than
either.

**Evidence before question, as a transferable habit.** 0007 (28 July) declined to
solve the calibration problem and instead wrote down the four facts a solution
would need, as a constraint on a section that did not exist. 0031 arrived five
days later. The lesson states the general form without Loom in it: **when you
knowingly defer a decision, the part you cannot defer is the evidence.** Self-check
5 asks for that sentence back with the repository removed from it, which is the
test of whether it transferred.

**`failed` is not `rejected`, and the reason is about what a number would come to
mean.** 0031's line — that folding failures into rejections makes the model look
overconfident every time infrastructure has a bad day — is the cleanest short
statement of a general hazard, so I gave it its own paragraph and then made the
lesson say the worse half out loud: it becomes a graph of your database's uptime
*invisibly*, because the number still looks like a number about a model.

**The observed rate is not a property of the model.** This is Predict 3, and
Exercise E turned out to prove it more sharply than any paragraph could — see
below. It is also why `byPolicy` is a partition rather than a sample, and why one
policy *name* is not yet one gate.

**Where I did not smooth the path.** Exercise D asks the reader to predict
`overall.judged` for six model claims and warns that the answer is neither six nor
five-for-the-reason-you-think. Two rows drop out for two unrelated reasons and I
resisted saying so in the idea section, because the point of the exercise is
noticing that "not scored" is not one category.

## What the exercises revealed

Five exercises, all executed, output transcribed from the run. Two produced
results that changed the lesson rather than becoming footnotes.

**Exercise E is the strongest single result in the course so far, and I did not
plan it.** Six proposals, all claiming `0.9`, all from the same scripted
interpreter doing exactly the same thing. Three judged by a permissive gate,
three by a strict one. Pooled: `gap 0.4`. Split: `−0.1` under one gate and `+0.9`
under the other, with `meanConfidence: 0.9` in **every** row.

Three sentences are arithmetically correct from one window — *the model claims 0.4
more than it delivers*, *the model is slightly underconfident*, *the model is
wrong nine times out of ten* — and none of them is about the model, which did not
vary at all. I had expected to have to argue that pooling was unsafe. The output
argues it, and the reader can produce it in thirty seconds.

**`verdictOf` and `calibrationOf` disagree, and the disagreement is a trap a
reader could ship.** I put a revert into Exercise D to show `runtimeAuthored`
being segmented out, and the row above the report reads `1  runtime  ->
survived`. `verdictOf` scores the runtime's own proposal happily — it is answering
"what became of this", which has a real answer — and `calibrationOf` checks
`provenance.authoredBy` first.

So a consumer who loops over `verdictOf` themselves, which is the obvious way to
build a dashboard, folds in a constant `1.0` that always survives, once per undo.
**Their model's calibration would improve every time a reviewer pressed the undo
button.** That is not written down anywhere and it is a correct-looking mistake
that would survive review. The lesson makes the reader produce the row and then
names it; Self-check 4 tests it away from the fixture.

**The change is committed before the journal has anything in it.** Exercise A
prints `in the journal so far: 0` immediately after a committed revision 1. I
knew 0024 said emission does no IO; I had not appreciated how blunt it looks in
an output. It is the line most readers will not predict, and it makes "the host
flushes, and the runtime does not do it for you" a fact rather than an API note.

**A window that opened four records late reports that nothing happened.** Exercise
B folds a seven-record run from record four: **zero episodes, four unattributed**,
and a report of `judged 0` with every rate `null`. Delete `unattributed` and the
report is indistinguishable from a genuinely quiet window — while actually
describing a disposition, an apply and a commit. It is the same instinct as the
unjudged breakdown and as `null` for an empty bucket, and having all three in one
lesson let me name the rule once instead of three times.

**Nothing is rounded.** `gap: -0.15000000000000002` and `0.10799999999999998` come
out of the report exactly as printed. I nearly tidied them in the transcript and
did not: rounding is a presentation decision, this is not the presentation layer,
and it is the same instinct that made `bucketIndexOf` count bounds rather than
multiply a float out.

`src/scratch.test.ts` was deleted before committing.

## Found while teaching

**One, and it is not small.** Filed in `FINDINGS.md`, owned by this routine,
because fixing it properly is the next lessons run's first job rather than
something to bundle into a telemetry PR.

**The Gate has seven rules and lesson 09 says six.**
`confirmRedirectedSubmission` was added to `ESCALATION_RULES` at position five on
**19 August** (`d541bea`, #102, under 0071) — the same day lesson 09 merged, in
the pull request after it. Nothing has noticed for a week.

I found it writing one sentence of lesson 17's opening about which rungs read
`provenance.confidence`, and could not write it accurately. That sentence now
says "two rungs of the Gate's ladder" and names no count.

What is wrong is narrower than it sounds and worse in one specific place. **The
executed outputs are still correct**: `confirmRedirectedSubmission` only speaks
when the assessment carries a `redirected-submission` stake factor, and lesson
09's ladder-walk fixture never redirects a submission, so the rule returns `null`
and never reaches the printed seven rows. What has gone stale is every place the
course *counts* — six occurrences in lesson 09, one in lesson 08, and, worst,
**two review-set questions (Set K q1, Set M q5) that ask the reader to name the
six Gate rules in order from memory.** A review set is the part of this course a
reader answers closed-book and then checks. Those two teach a wrong list and then
confirm it.

I did not fix it here. Correcting the count is four minutes; doing it properly is
a section, an executed exercise and two amended review sets, because lesson 09's
entire argument is that order encodes precedence and a new rung at position five
is a lesson-shaped question — why a confirmation rather than a refusal, and why
between `discards-later-work` and the ceiling rule. That does not belong in a pull
request whose subject is telemetry.

The general shape is worth recording separately: **a count in prose can go stale
while every executed output stays true**, which means running the exercises — the
discipline this course leans on hardest — does not catch it. Nothing in this
repository connects a rule list in `src/` to a sentence in `lessons/`.

This is not a finding against `Loom daily build`. #102 recorded what it did;
nothing obliges a framework run to re-read the course.

## One change outside the lane, stated plainly

`apps/loom/app/(docs)/_lib/architecture/architecture.test.ts` asserted
`expect(unwritten.length).toBeGreaterThan(0)` — a guard so that its loop over
unwritten lessons could not pass vacuously. **Lesson 17 completed the syllabus, so
that assertion is now false**, and `pnpm verify` — the merge gate for four
surfaces — was red because of it.

I could not link lesson 17 without breaking it, and leaving verify red blocks
everything. So the guard now asserts both branches instead of one: a lesson with a
file gets a link, a lesson without gets a title and no link. Whichever way the
README moves, one branch does work and neither passes vacuously. No behavior
changed and the test's subject is the same; it is one assertion widened by the
content change that falsified it. Flagged here and in the PR comment so `Loom
docs` sees it rather than finds it.

## Two review sets rather than one

Set U is the ordinary one — two days after lesson 17, interleaved with 05, 07,
09, 10, 13 and 16.

I also added **Set V, one week after Part IV.** Parts I, II and III each have a
part-anchored consolidation set (E, M, Q) and Part IV would otherwise have been
the only part without one — and Part IV is the part that ends the course, so its
consolidation set is the last scheduled thing a reader does. It reaches into all
four parts: the artefact behind each of lesson 01's four words, the two-valued
answers rejected in favour of a third, the three mechanisms forbidden from
producing their own detector's signal, and where a person is required, offered, or
deliberately not given a button.

Set U question 7 re-asks Set Q question 7 — *what is Part III a bet on, who has to
do something afterwards, and what does the system look like if nobody does* —
which lesson 17 is the answer to. That callback is the reason Set U exists in the
shape it does.

## What is next

The syllabus is finished, so the next run has no default. In order:

1. **Lesson 09's seventh rule**, per the finding above and the brief's rule that
   fixing a wrong lesson outranks writing a new one.
2. **Runnable exercises** — the last of the brief's four pieces of course
   machinery, and now the only one.
3. Anything §5 has settled long enough to teach. Holds (0088, 23 August) were too
   new for lesson 16 and are three days older now; row security, sign-ins and the
   data seam are all candidates for a Part V that does not exist yet, and
   proposing one is a decision worth putting to the maintainer rather than taking.
