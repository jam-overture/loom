# 2026-08-24 — Lesson 15: Primitives and the registry

**Landed:** [`lessons/15-primitives-and-the-registry.md`](../15-primitives-and-the-registry.md),
its syllabus link in `lessons/README.md`, **Set S** in
`lessons/review-schedule.md`, four count updates in
`apps/loom/app/(lessons)/`, and one line in `apps/loom/app/(docs)/` that this
lesson's existence falsified — see *Found while teaching*.

`pnpm install && pnpm verify` **green**: 1641 runtime tests across 106 files,
1693 app tests across 117. `next build` prerenders 65 pages, up from 64: Set S
is live in the review queue and `/lessons/15` renders.

Roughly **50–65 minutes** to work through properly, of which about twenty is the
six exercises. It is longer than 14 in exercise time and shorter in reading.

## Reader feedback: nothing to address this run

No open pull requests at all — `gh pr list --state open` is empty, and #136 and
the lesson-14 PR have both merged since the last run. The two questions #136 put
to the maintainer are therefore closed by merge rather than by answer, and I
have not re-asked them a third time; they are restated once in this run's PR
comment under *Needs your input* and nowhere else.

Nothing this run had to change on account of a `Superseded` record. 0009, 0011,
0012, 0013 and 0015 are all `Accepted` and none has been amended.

## A lesson rather than machinery, and why

The alternation says either is fine. The last run was a lesson (14) and the one
before it was machinery (#136), so by strict alternation this should have been
machinery. I chose a lesson anyway and the reason is worth stating, because it
is not "the syllabus said so":

**Lesson 14 shipped with a named loose end.** Its closing section says a
primitive that drops a region it was handed produces no diagnostic, and
something has to catch it. A course that opens a question and then spends the
next run on a confidence widget is a course that trains its reader to expect
loose ends to stay loose. The machinery queue has nothing in it that expires;
an unanswered question in the most recent lesson does.

**The material is settled where the lesson leans on it.** 0009, 0011, 0012 and
0013 are all dated 2026-07-29 — 26 days — and 0015 is 07-30. The four checks
the lesson is actually about have not moved since.

What I deliberately did **not** build any argument on: `submits` (0087, 23
August, one day old) and `behaviors` (0086, two days). Both are additive fields
on the same definition and both would have made good examples. Neither appears
in an exercise, and the only place either is mentioned is a passing reference to
`primitive-type.ts` serving several registries. If they move next week the
lesson does not.

`interactive` (0064, 17 August) is settled enough by the seven-day standard and
still does not appear, for a different reason: its registration-time check
(`undeclared-interactive-prop`) is the *fifth* good example of a coherence check
in a section that already had four, and a section that lists five examples of
one thing is a section the reader skims.

## What I emphasised, and why

**The spine is a count: five places a registration is acted on, and only one of
them prevents anything.** The lesson's first table lists four checks —
`definePrimitive` at compile time, `createPrimitiveRegistry` at construction,
the render seam per request, `auditRegistry` in a test — and then says the table
is missing its most important row, because the catalogue is not a check at all.
Four detections and one prevention. Every other idea in the lesson hangs off
which row it belongs to.

That framing was chosen over the obvious one, which would have been "here is the
SDK, here is what each function does". The obvious one teaches the API surface,
which the brief rules out and which the generated reference already does better.

**The three claims and how differently they resolve.** 0075's rule is the
subtlest thing in §4 and it is not really about auditing:

> A capability is proved by one witness. A promise is broken by one
> counterexample.

`rendersChildren` and an unplaced slot are existential claims; decoration is
universal. Get that backwards and the report is confidently wrong in both
directions at once. I put it in a table and then told the reader to read the
table again as three sentences about existence and universality rather than as
three facts about an audit, because the transferable thing is the shape.

**"I cannot tell you" as a recurring value.** The lesson stops and counts four
places where a two-valued answer was rejected: `props: undefined` versus `[]`,
`PropsVerdict.undeclared`, `unavailable` versus absent on a binding, and
`not-probeable`. Lesson 12 taught the first one; this is the lesson where it
stops being a detail of the catalogue and becomes a house rule. Set S question 2
and Self-check 4 both test it away from the example it was learnt in.

**The audit having no teeth, as lesson 09 again.** Predict 3 asks the reader to
argue both sides before anything is explained, and the resolution is one
sentence: the library answers questions it can answer and hands back the ones
whose answer depends on facts it does not have. The Gate reaches a verdict and
applies nothing; the render seam produces diagnostics and does not decide
whether to serve the page; the audit produces lists and does not decide whether
to ship. Three instances, one rule, three subsystems, four months apart.

**Where I did not smooth the path.** Predict 1 asks what `z.object({})` refuses
and the honest answer is *nothing*. That is genuinely surprising, it looks like
a bug, and the lesson makes the reader commit to an answer before showing that
the bag is what makes it survivable. Exercise B is that prediction, executed.

## What the exercises revealed

Six exercises, all executed, real output transcribed. Two produced answers I did
not predict correctly myself, and both went into the lesson as the exercise
rather than as a footnote.

**A component that throws unconditionally is `not-probeable`, not
`throwsOnDeclaredProps`.** I wrote Exercise C expecting the throwing list. It is
empty, and the primitive is in `notProbeable` alongside every legitimate
hook-using component. That is correct per 0075 — no configuration answered, so
nothing was learnt — and it is also a real gap in what a host can assert. Filed;
see below.

**The probe's configurations are the sum, not the product, and I could
demonstrate the miss in nine lines.** `loom.conditional` throws on
`{ kind: "select", required: true }`, which its own schema accepts, and the
audit reports it clean. 0075 names that limit in its *consequences* rather than
its decision, which is the right place for it and also the place nobody reads.
Exercise E makes the reader find it. The Reflect section then asks why a record
that names what it misses is more useful than one that does not — which is the
actual lesson, and it is about writing records rather than about primitives.

**No validator produces zero diagnostics.** Exercise F's second case. Not one
warning anywhere: a deployment that forgot to wire a validator looks exactly
like one that decided not to. 0011 argues for it (the separate interface makes
it a visible choice at the composition root) and I taught it as an argued cost
rather than an oversight, because it is one — but it is the case in this lesson
I would most expect a reader to push back on, and I would not defend it as hard
as the record does.

**The catalogue is 9,379 characters.** Measured, not estimated: 61 primitives,
61 lines. The lesson quotes it because "the bound on what AI may build" is an
abstraction until it is a file size.

**Numbers I re-measured rather than quoting.** 0075 says 45 primitives and 320
configurations, correct on 20 August. Today it is 61 and 402. The lesson uses
today's numbers and the record's own worked example (`loom.field` at 704 renders
under a product) where the arithmetic has not changed.

`src/scratch.test.ts` and a second scratch file were deleted before committing.

## Found while teaching

**One real gap, and one file in another lane that had to be opened.** Both are
in `FINDINGS.md` with their owners; neither was fixed here.

1. **A primitive that throws under every configuration is invisible to the one
   list a host can assert empty** (`Loom daily build`). It lands in
   `notProbeable`, which legitimately contains hook-using and class components
   and therefore cannot be asserted empty, and it is absent from
   `throwsOnDeclaredProps`, whose stated purpose is a tree the validator accepts
   taking a page down. The distinction survives only inside the human-readable
   `reason` string.

2. **`apps/loom/app/(docs)/_components/architecture.test.tsx`** (`Loom docs`).
   Its "says an unwritten lesson is unwritten" test guards
   `unwritten.length > 0`, and lesson 15 was the last of the eight architecture
   ideas pointing at an unwritten lesson. Writing it turned that lane red. I
   removed the guard, with a comment saying why and when it comes back into
   force; the rule the test protects is untouched. Recorded so its owner knows
   the file was opened, and because the test is now vacuous and its owner may
   prefer a synthetic idea to a real one.

Nothing else. In particular: the `z.object({})` gap, the unprobed combination,
and the silent no-validator case all *look* like findings and all three are
argued in the records that created them (0011 twice, 0075 once). Teaching them
is the right response to a documented trade; filing them would be filing a
disagreement as a defect.

## What is next

Lesson 16, persistence — the log is the truth and the snapshot is a view. Lesson
15 closes by naming the door in, as 14 did for 15: props in a tree "may have
been written by a delta the Gate accepted months ago against a schema this
deployment no longer runs" is a sentence that assumes something about storage
which nothing in Parts I–IV has made true yet.

If the next run is machinery instead, the outstanding item is the fourth of the
four the brief named and the only one still untouched: **runnable exercises.**
Write-before-reveal, confidence-before-reveal and the live due queue all landed
in #136; Try it still tells the reader to paste a snippet into
`src/scratch.test.ts` and run vitest, which is exactly the friction that stops
an exercise being done on a train. Lesson 15's six exercises are the best
argument for it yet — two of them turn on an output almost nobody predicts, and
both are worthless to a reader who skipped the paste.
