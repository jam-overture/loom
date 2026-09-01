# 2026-09-01 — Lesson 18: The write seam

**Landed:** [`lessons/18-the-write-seam.md`](../18-the-write-seam.md), a **Part
V** section and its syllabus link in `lessons/README.md`, **Set U** in
`lessons/review-schedule.md`, five count updates in
`apps/loom/app/(lessons)/` that a twenty-first set moves, and one finding in
`FINDINGS.md`.

Roughly **50–65 minutes** to work through properly, of which about half is the
seven exercises. Two of them (D's second half and G) are the reason it is not
shorter.

## The syllabus ran out, so I opened Part V

This is the decision of the run and it should be argued rather than announced.

Lesson 17 is the last lesson the syllabus named, and it is **written** — on
#168, open since 26 August. So the course as planned is finished, and the two
questions the last three runs have put to the maintainer (what happens when the
syllabus ends; is there a Part V) have gone six days without an answer because
nobody has been at the keyboard. A fourth run of deferring would have been the
worst available option: it spends the run and produces nothing a reader can
use.

So I picked, on the offer #207 already made in writing — *if you would rather
the routine just picked a Part V and started, say so and I will.* **Part V is
"Making it do something".** Parts I–IV are about a page that shows something,
where the worst a bad change does is look wrong, and where undo is a complete
remedy. Part V is about a page that acts, where undo is not.

**What decided the first subject.** `src/submit/` is eleven days old
(21 August), 0065 and 0087 are both `Accepted` and unamended, and 0087's own
open item — `loom.form` declaring `submits` — has since been closed by
`Loom primitives`. It is the most settled unteaught area in the repository, and
the course had touched it in passing and never explained it: before this run
the word "submit" appeared only in lesson 14, five times, all of them naming
the seam rather than teaching it — and neither 0065, 0086 nor 0087 was cited by
any lesson.

It is also the right *first* lesson of a part rather than merely an available
one. The seam's founding argument is the one that makes the whole part
necessary — a wrong `action` produces a page that looks completely correct and
sends a stranger's data somewhere nobody chose — and every other §4b subject
(behaviours, frames, holds) is a variation on it.

**Numbering.** This is lesson 18, leaving 17 for the telemetry lesson on #168.
If #168 is closed rather than merged there is a gap at 17; that seemed a much
smaller cost than renumbering a written lesson out from under an open PR. The
lesson deliberately **references nothing from 17** — prerequisites are 01–16 —
so it reads correctly for someone on `main` today, whichever way #168 goes.

## Reader feedback: none to act on, and that is the problem

No comment anywhere in the lessons lane is from a reader. Every comment on
#168, #176, #184, #192, #200 and #207 was posted by this routine. Nothing said a
lesson was too hard, too easy or unclear, so there was no feedback to weigh
against the syllabus, and nothing forced a correction: no record a lesson
depends on has moved to `Superseded`, and the ten partial supersessions in
`decisions/` are all old and already taught from both sides.

The lane is now **seven pull requests deep and nothing has merged since
25 August.** That is in the notification and in the PR comment, so it is not
re-argued here.

## What I emphasised, and why

**The reframe is the lesson, not the seam.** 0065's best sentence is the one
that changes the question: *the question is not "how do we validate a form
action a model wrote", it is "how does a form get an action a model never
wrote".* Predict 1 exists to make a reader spend their first two minutes
improving an allowlist, because that is what everyone does, and because the
one-line refutation — `https://collect.example.com/harvest` passes a scheme
allowlist — is worth more after you have invested in the wrong answer. The
lesson then names the transferable move explicitly: the first question has a
great deal of work available in it and no good answer, and the second one
deletes the dangerous thing.

**The asymmetry, argued from what varies rather than from what is scary.** The
write seam copies the read seam everywhere except params, and the reason a
reader reaches for — "writes are more dangerous" — is the conclusion, not the
argument. The lesson insists on the real one: a read genuinely varies (`limit: 6`
is a different question of the same source) and a write does not, so twenty
mailing lists are twenty endpoints. And it makes the point that this is not a
cost that was accepted but the mechanism itself — twenty registrations *is* the
allowlist being exact, written by the person who runs the deployment.

**Strictness, and what it actually costs the node.** This is the part I most
wanted a reader to be wrong about, and Exercise D's second half is where they
find out. `.strict()` on one parse in a codebase that parses stored JSON
permissively everywhere else looks like a style choice. It is not: stripping the
smuggled `action` would be *safe* — the form would post to the right place — and
that is exactly the objection. The system would silently tidy away the one
attempt it was built to make impossible. What actually happens is stronger than
almost anyone predicts, and it is the payoff of the exercise: the node loses its
submission **entirely**, including the valid `to`, because a declaration is
parsed as a unit and a failed one never becomes a planned submission. "Fails
closed" stops being a phrase there.

**Two audiences, kept apart.** Exercise G's four renders make the split visible
in one output: the visitor gets a sentence, the operator gets a diagnostic, and
neither gets the other's information — the visitor is never shown `token store
timed out`. It also shows the one place two of the three states genuinely do
collapse (misdeclared and never-declared read the same on the page), and the
lesson argues that the collapse is correct and happens in the primitive rather
than in the shape.

**Where I did not smooth the path.** Self-check 6 and the last Reflect prompt
both make the reader sit with Exercise F disagreeing with a decision record, and
I resisted resolving it for them. The whole point is that neither is wrong.

## What the exercises revealed

Seven exercises, all executed, output transcribed from the run.
`src/scratch.test.ts` was deleted before committing.

**A refused declaration takes the good half with it.** Predicted `lookup` would
be `unavailable` with a misdeclaration reason; it is `undefined`, the same as a
form that declared nothing, with the reason in `problemsFor` instead. Correct,
and more interesting than what I expected — it made Exercise D the centre of the
lesson rather than a footnote, and it is what produced the finding below.

**A decision record's consequences are now false, and the record is not wrong.**
0087 (23 August) states `undeclaredSubmitters: ["loom.form"]`. Running
`auditRegistry` today: `submits: ["loom.form"]`, both failure lists empty,
`declared=true probe=places`. `Loom primitives` closed the one-line gap 0087
filed for them. I nearly wrote the record's numbers into the lesson from the
record — which is precisely the drift the brief warns about — and caught it only
by running it. It is now Exercise F's payoff and Self-check 6.

**The starter library has one submitter out of sixty-eight.** Worth printing
because it makes `submits` concrete as *the list a deployment holds its endpoint
registry against*, rather than an abstraction.

**A host's own relative path is refused.** `signup` — an entirely ordinary
looking action — fails the target schema, because it would resolve against
whatever route the form happened to be rendered on. Better evidence than the
paragraph that the host's answer is checked too.

**Five failure reasons, no exceptions.** `c.throws` throws a real `Error` out of
host code and arrives as a value with `endpoint-threw` on it.

**One thing I got wrong and fixed before it shipped.** My first draft leaned
throughout on "the read seam you already know". It is not taught: `binding`
appears once each in lessons 14, 15 and 16, and `defineSource`, the data
catalogue and 0058's "identical questions are asked once" appear nowhere. Three
attributions to lessons 14 and 15 were wrong and are corrected; where the lesson
needs a fact about the read seam it now supplies it rather than assuming it.
Lesson 14 does establish the plan/resolve/walk shape and the async/sync split,
which is what the lesson actually leans on.

**And one device I cut.** A draft of Exercise G printed one line of output
deliberately wrongly and told the reader to check it. It was a bad idea however
well flagged: the course's transcripts are only useful if every one of them is
real, and one staged error would cost that for all of them. The real output is
there.

## Found while teaching

**One, filed in `FINDINGS.md`, owned by `Loom daily build`.** Not fixed here;
`src/render/` is not this lane.

`src/render/diagnostics.ts` says of `submit-misdeclared` that the node renders
"with no target, which is what a form primitive's **unavailable** path is for."
It is not — it lands on the *untargeted* path. A node whose `loom:submit` fails
to parse goes into `plan.problems` rather than `plan.submissions`, and only
planned submissions ever get an outcome, so `lookup` is `undefined` and the
`unavailable` branch is unreachable for this diagnostic. Rendered through the
starter library, a misdeclared form shows *This form is not connected yet* and
not *Please try again in a moment*.

The behaviour is right and fails closed, and the visitor-facing sentence is
arguably the correct one of the two, so the fix is very likely the comment
rather than the code. It is worth a line because the seam's safety argument
rests on those three states being distinct, and this is the only place a
document in the repository says two of them meet where they do not.

**I did file it rather than skipping `FINDINGS.md` to stay mergeable.** #207
deliberately did not touch the file for that reason and asked whether findings
should be filed properly; no answer came, and the brief's standing instruction
is to file. Noting the trade explicitly: this branch will conflict with any
other open branch that also appends to `FINDINGS.md`, at the end of the file,
where such conflicts are mechanical to resolve.

Nothing else. In particular the absent-versus-`unavailable` split, the missing
Gate treatment of a changed destination, and the probe's documented false
negative are all argued in 0065 and 0087. Teaching a documented trade is the
right response to it; filing it would be filing a disagreement as a defect.

## Verification

`pnpm install && pnpm verify` — **one failure, pre-existing and not this
branch's**: `apps/loom/app/(marketing)/_lib/facts.test.ts` expects
`FACTS.decisions` to equal the number of files in `decisions/`, and
`(marketing)/_lib/copy.ts:25` says `"94"` where there are 95. I ran it on a
clean `main` before touching anything and it fails there identically. It belongs
to `Loom marketing` and has been reported by #182, #184, #192, #200 and #207
already, so it is not filed again. Everything else is green: **1741 runtime
tests across 111 files**, and **1962 of 1963 app tests across 134 files** — the
one failure being that count — including all 91 tests under
`apps/loom/app/(lessons)/` and the five count assertions this run moved.

## What is next

**Set U question 6 is the door.** 0065's own consequences name the open one: a
`configure` that moves `loom:submit` from `newsletter.subscribe` to
`contact.enquiry` sends the next visitor's message somewhere else, both are
registered so nothing leaves the deployment, and the analysis reports it as an
ordinary prop change. A reader who has done lessons 07–09 now has a prop whose
change is unremarkable by every measure the Gate applies and which redirects a
stranger's data. That is the next lesson in Part V if the runtime has by then
decided what to do about it, and a good lesson either way — 0065 says it was
"named as the first open question rather than guessed at".

If the next run is machinery instead, the outstanding item is unchanged and is
the last of the brief's four untouched: **runnable exercises.** #184 built it and
has been open since 28 August. This lesson is the strongest argument for it yet
— Exercise D's second half and Exercise F both turn on an output the reader will
not predict, and both are worth nothing to a reader who skipped the paste into
`src/scratch.test.ts`.
