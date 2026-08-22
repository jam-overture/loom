# 2026-08-21 — Lesson 13: Refusal and repair

**Landed:** [`lessons/13-refusal-and-repair.md`](../13-refusal-and-repair.md),
its syllabus link in `lessons/README.md`, **Sets P and Q** in
`lessons/review-schedule.md`, and the four count updates in
`apps/loom/app/(lessons)/` that a fifteen-set schedule had hardcoded.

`pnpm verify` **green**: 1489 runtime tests across 101 files, 921 app tests
across 82. Nothing skipped, nothing weakened.

Part III is now complete: 11, 12, 13.

## Reader feedback: nothing to address this run

Two pull requests are open — **#123** (`Loom marketing`, the front door) and
**#124** (`Loom docs`, architecture). Neither is this lane. No open lessons PR,
and no maintainer comment on anything this lane has landed. The 08-20 report
checked the same thing the same way and found the same nothing.

The one open question this lane is carrying is answered below rather than asked
again.

## A lesson rather than machinery, and the 08-20 report said otherwise

The 08-20 report ended "Machinery next run." I chose a lesson instead, and the
reason is a promise that report made two paragraphs earlier.

**Set Q was owed with 13.** The 08-18 and 08-20 reports both asked whether Part
III's consolidation set — the counterpart to E and M — should arrive on the
maintainer's signal or automatically, and said that with no answer *it lands
with 13*. Part III ends at lesson 13. Deferring 13 for a run of machinery would
have deferred Set Q with it, and a consolidation set that arrives two runs after
the part it consolidates has missed the spacing interval it exists to hit.

**The material is maximally settled.** 0006 is `Accepted`, dated 2026-07-28 —
24 days. 0040 is `Accepted`, 2026-08-06. Every file the lesson cites last
changed on 08-15, except `pipeline.ts`, which changed today and only in a
comment (§4c's doc-comment pass, `0006` → `the gate exists to make (0006)`).
Nothing in the repair path has moved behaviourally since the record that
created it.

**Machinery next run, and it is a specific piece.** `_lib/links.ts` says it
plainly in a doc comment: *"Where a lesson's text is, which is not here yet"* —
`lessonPointer` returns a GitHub blob URL, so every reference the surface makes
to a lesson leaves the surface. Rendering the lesson prose into the route group
is the piece that closes that, and it is the last thing standing between the
schedule machinery and a course that lives at one address. It is also large
enough that starting it in the same run as the last lesson of a part would have
shortchanged both.

## What I emphasised, and why

**The lesson is not about the second attempt.** It is about what the second
attempt is not allowed to hide, and every section is arranged around 0006's
sentence:

> The danger is not that the loop exists; it is that the loop could be made
> invisible.

That is a different *kind* of argument from anything in Part II. Every Gate rule
is of the form "this must not happen". This one is of the form "this will
happen, and it must not be able to happen quietly", and those demand different
machinery. The lesson says so explicitly, because a reader who files repair
under "another safety rule" has missed the only thing that makes it interesting.

**The strongest wrong intuition is that repair shrinks the refused delta**, and
Predict 2 is built to catch it. `buildRepairMessage` is `buildUserMessage` plus
a suffix: the catalogue, the theme vocabulary, the tree outline and the original
utterance all go again, unchanged. A repair is a *fresh answer to the same
question*, and the reason it must be is one sentence: something holding only the
refused delta and the objection could satisfy the objection without satisfying
the request — "remove less" is trivially achievable by removing nothing.

**"Exactly one, structurally" is the line I spent the most words on.** A reader
who writes `if (attempts < max)` in Predict 1 has given a correct-looking answer
to a question about drift, and the counter's failure mode is social rather than
technical: someone raises it to 2 for a demo, and the system becomes a search
procedure for the weakest change the Gate will accept. The lesson makes the
structural version concrete by showing that `attemptRepair` has no path back
into itself — `dispositionOutcome` applies, holds, or rejects, and never calls
the function it was called from.

**"Refused" is three different words, and that is a table.** `Disposition.kind:
"rejected"`, `InterpretationError.code: "refused"`, and
`EpisodeResolution.kind: "refused"` are three unrelated facts sharing a word,
and the place they collide is exactly here: a *repair* can fail with `refused`,
meaning the model's own guardrail declined, which has nothing to do with the
Gate refusal that prompted it. Exercise B runs both in sequence so the reader
sees `interpretationFault` put one on the `asker` and the other on the `model`.

**Repair against undo is the discrimination the lesson turns on**, and it is
deliberately not stated as a summary. Warm-up 1 primes it from lesson 06,
"Explain it back" 1 demands the paragraph, and the instruction is explicit:
*if your paragraph would still be true with "repair" and "inverse" swapped, you
have not distinguished them.* The pay-off is not "computed versus generated" —
that is a restatement. It is what each one can be **wrong** about, which is why
`authoredBy` exists as a field distinct from `interpreter`.

**Deliberately left thin: what a host does with a refusal.** The portal's review
queue, and what a person sees when a change was refused and repaired, is §5
material and not Part III's.

## What the exercises revealed

All five ran through `src/scratch.test.ts`, every line of output in the lesson
is real, and the file is deleted. Three things came out of running rather than
reading, and two of them changed what the lesson says.

**`renderDelta` prints a `configure`'s prop keys without their values, and an
inserted node's props in full.** `configure n_7 set title unset subtitle` — not
`set title="Away"`. I had assumed symmetry and would have written it. The lesson
now presents the asymmetry as a thing to *see and then decide about*: the
argument for keys-only is that this projection exists to tell a model how
*broadly* it reached, and the argument against is that a repairer told to be
"narrower in what it touches" might want to know the title was being set to
something drastic. Both are real. I have not filed it as a defect because it is
defensible either way and the file is not this lane's; it is in the lesson as an
exercise in noticing rather than in the findings as a bug.

**The repair's proposal id came back *lower* than the refusal's.** In the
telemetry exercise the refusal is `p_h2` and the repair that replaced it is
`p_h1`. Nothing is broken: `harnessWith` constructs its scripted repairer's
answer before the interpreter's, so the repair's id was minted first — a test
harness artefact, not a runtime one, where both ids are minted inside `propose`
at the moment each call is made. But it is the best accident this lesson got.
A reader who sorted those two proposals by id would conclude the small change
came first and the large one was the escalation, which is the opposite of what
happened. Lesson 04 taught that an id says nothing about position in the tree;
this is its sibling — **an id says nothing about position in time either, and a
system that needs the order says so with a field.** That became exercise D's
closing paragraph, and Predict 3's real subject.

**The tally says `refused: 0` on an episode that contains a refusal.** One
episode, two proposals, verdict `rejected` on the first with
`repairRequested: true`, and `byResolution.refused` is `0` because the episode
resolved `committed`. Both numbers are true and they answer different questions.
That is Predict 3's trap and it is not a trick — someone asked "how often does
this system refuse changes" will get a confidently wrong answer from whichever
field they reach for first, and the lesson makes them commit to a number before
showing them the two.

One thing I checked and did not use as a finding: both dispositions in the
telemetry exercise carry not just the same `policyId` but the same
`policyFingerprint`. That is 0006's "there is no second-chance policy to keep in
step with the first", visible from outside as a digest, and it is in the lesson
as a fact rather than as a question.

## Found while teaching

**One finding, filed for `Loom daily build`.**

`CompositionOutcome` cannot distinguish *"refused, and a repairer declined"*
from *"refused, and no repairer was wired in"*. Exercise B runs both:

```
repairer said no    -> rejected | stakes-at-refusal-floor
      what came back: p_r7 | repairOf: undefined
no repairer wired   -> rejected | stakes-at-refusal-floor
      what came back: p_r9 | repairOf: undefined
```

Identical values. `attemptRepair` returns the *original* refusal's assessment
when the repairer errs, so the returned proposal carries no `repairOf` — the
same shape a run with no repairer produces. Only the event stream separates
them, via `repair-failed`.

The third case is fine: a repair that was judged and refused again comes back
carrying `repairOf`, so it is distinguishable. It is the declined case that
collapses into "nothing was tried".

Why it is worth a line rather than a shrug: this is the same shape 0040 exists
to fix one layer up. A host that wants to tell an operator "we asked for a
smaller change and the interpreter could not find one" has to reconstruct that
from a stream, which is the thing 0040's alternatives section rejects — *"a fact
the adapter has at hand should not be reconstructed downstream from a
sentence."* The fix is small and is not mine to make: an optional field on the
rejected outcome naming the repair attempt's fate, or the interpretation error
itself.

Filed in `FINDINGS.md`, owned by `Loom daily build`. Not fixed here — a lessons
PR that also changes behaviour is a lessons PR nobody can review.

## Needs your input

**Nothing blocking, and the standing question is now closed by default.** Set Q
landed with 13, as the last two reports said it would if you did not say
otherwise. If you would rather it had waited for your signal, say so and I will
take it back out — it is one section and two lines of test.

One thing worth a sentence if you have one:

**Is the `configure` rendering asymmetry a defect?** `renderDelta` shows prop
keys for `configure` and full props for `insert`. I have left it in the lesson
as a judgement call for the reader rather than filed it against the framework,
because both behaviours are defensible and the choice belongs to whoever owns
the prompt. If you think it is a bug, it is a two-line change in
`src/interpretation/render.ts` and a finding rather than a lesson.

## Next

Syllabus order puts **14 — Rendering** next, and it opens Part IV. The
alternation says machinery first, and the piece is named above: the lesson text
rendered into `(lessons)/` so `lessonPointer` stops sending readers to GitHub.

Reachable material for 14 when it comes: `src/render/` and 0008 (`the renderer
is a total pure projection`), 0050 (`the runtime's props are namespaced and the
root mounts the theme`), 0051 (`a slot is a region the primitive places`). The
argument 13 hands forward is thinner than usual and that is deliberate — 12
established that a projection is built for one consumer's job, 13 showed a
projection whose consumer had already been wrong once, and 14 gets the first
projection in the course whose consumer is a person.
