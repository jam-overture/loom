# 2026-08-06 — Lesson 05: Purity at the seams

**Landed:** [`lessons/05-purity-at-the-seams.md`](../05-purity-at-the-seams.md).
Part II opens.

Also in this PR: 05 linked from the syllabus and from lesson 04's *Next*, and a
new interleaved Set G in `review-schedule.md`. No code changed.

## Why 05, and not the lesson 04 repair

PR #49 is still open with the `recycled-node-id` correction to lesson 04. That
repair outranks new work, but it is already written and waiting on review, and
redoing it here would collide with it. So this run took the next syllabus item.
One consequence worth stating plainly: **until #49 merges, lesson 04's last
exercise on `main` still claims an outcome that 0038 changed.** Lesson 05 does
not depend on that exercise and does not repeat the claim.

Branched off `main` rather than off #49's branch, per the standing procedure. The
two touch lesson 04 in different sections — #49 in the exercises, answers and
reference table, this one in a single line of *Deeper* — and `review-schedule.md`
in different places, #49 inside Sets D and E, this one appending Set G after F.

## What I emphasised, and why

The syllabus line is "why nothing throws, why the clock is injected, and why that
is what makes an audit trail real". Those read as three facts. The lesson's job
was to make them one.

**The unifying claim, stated once and then earned.** *A failure is a value. A
side effect is a parameter.* Both rules exist for the same downstream reason: an
audit trail is a log whose claim can be **checked**, checking means re-running
the decision against the recorded inputs, and each rule removes one way that
becomes impossible. A throw sends the failure out through a channel the record
does not cover; an ambient effect is an argument the function never declared, so
nobody trying to reproduce it can supply it. I wanted a reader to be able to
derive both rules from "the record must be checkable", not to recall them as
conventions.

**`CompositionRuntime` as an inventory, not as dependency injection.** This is
the sentence I would most want to survive a month: the five-field record is not a
wiring convenience, it is *the list of everything in the pipeline that can answer
differently on two identical runs*. Read that way, the type answers questions it
otherwise cannot — Self-check 1 asks whether `applyDelta` should be a sixth
field, which is trivial once you have the property and unanswerable if you think
the list is "dependencies".

**Refusals are the product, not the error path.** The lesson leans on the comment
in `events.ts`: *a Gate that refuses the right things is only demonstrable if
refusals are recorded.* A system whose value is saying no, which reports "no" by
throwing, has arranged for its principal output to be the one thing it does not
write down. That reframing is what makes `Result` feel necessary rather than
fastidious, and it is why exercise C exists.

**Atomicity was free, and lesson 03 did not say why.** The elaboration hook.
Lesson 03 taught all-or-nothing and most readers file it as rollback. There is
no rollback anywhere in `applyDelta` — it builds a new tree and a failure means
the new tree is never handed back. Lesson 03's hardest property is a consequence
of this lesson's first rule. If 03 and 05 read as unrelated, the lesson failed,
so Explain-it-back 2 and Set G question 2 both target exactly that derivation.

**And the second hook, backwards into 04.** Lesson 04 ended by saying the
`IdFactory` seam "matters far more than it looks" and deferred the reason. Here
it is: ids are the join key `compareTrees` and `auditSnapshot` match on, so
ambient minting would make every replay produce a tree that is correct in every
respect and shares not one id with the original. Lesson 04 gave the guarantee;
05 is where it becomes *evidence*. Two lessons, one argument.

Deliberately left alone: the Gate's two axes and the disposition vocabulary get
named in passing but not explained — 08 and 09 own those. `parseTree` /
`parseDelta` are named as the boundary that never throws without unpacking what
they validate.

## What the exercises revealed

Five snippets executed. The four in the lesson were extracted mechanically from
the rendered markdown into `src/scratch.test.ts` and run as one file, so the code
in the lesson is the code that ran; the fifth was run to check a claim in an
answer rather than to be printed. Scratch file deleted.

**Exercise B is the lesson.** Two runs of `composeChange` with the clock and the
id factory pinned are byte-identical. The same two with `systemClock` and
`randomIdFactory` differ in **18 leaf values, which are 18 occurrences of exactly
4 field names**: `deltaId`, `intentId`, `occurredAt`, `proposalId`. Three ids and
a timestamp, every one minted at a seam.

I did not expect the number to be that clean, and it does more work than the
prose could. Everything else in a six-event narration is identical — the whole
tree, the whole delta, the resolved policy, every stake factor, the reversibility
analysis, the inverse delta, and the disposition with its reason. "The pipeline
is a pure function of its inputs plus five declared seams" stops being a slogan
when the diff prints four field names. It is also a direct answer to the Predict
question, which asks the reader to list what would have to be recorded to re-run
a decision — nearly everyone lists the tree, the intent and the model's reply,
and the two that go missing are the two the exercise pins.

**The `ZodError` result is better than the one I was expecting.** I had assumed
the contrast in exercise A would be "structured value versus shapeless
exception". It is not: `JSON.stringify` on a `ZodError` produces perfectly good
JSON. That made the lesson better, because it forced the real distinction into
the open — nothing in `buildElement`'s *type* mentions it, the `catch` that
receives it is typed `unknown` and would equally receive a `TypeError` from a
bug three frames down, and `"Invalid"` with an empty `path` is all the detail
there is. The line ended up being "a throw is a fact about the program; a
`Result` is a fact about the data", which is sharper than the one I set out to
write and which I would not have found by reasoning about it.

**Exercise C's event list makes the stage boundary visible.** A delta naming a
node that is not in the tree yields `not-applicable` and four events ending at
`assessment-failed`. A reader learns that interpretation *worked* — so the model
is not the problem — and that assessment is where it stopped. `catch`-and-log
collapses that into one line, and the distinction it collapses is the one between
"our model is producing nonsense" and "our model is fine and something downstream
refuses it", which need different fixes.

## Found while teaching

Nothing was fixed in code. Both items are for the build routine.

**1. `EventSink`'s promise is kept sink by sink, and nothing enforces it at the
call site.** `events.ts` states it as a property of the system — *a sink that
throws or blocks must not be able to fail a change the Gate already accepted* —
and `telemetry/sink.ts` restates it as `EventSink`'s "standing promise". Every
sink in the repository honours it: `noopEventSink` does nothing,
`collectingEventSink` pushes to an array, and `collectTelemetry` wraps its body
in a `try`/`catch` that counts and drops. But `emitter` in `pipeline.ts` and
`narrator` in `commit.ts` call `emit` bare, so the guarantee is an obligation on
the implementer of a **public interface** rather than something the runtime
provides.

Both halves executed:

- A sink throwing on `change-applied`: `composeChange` throws. `applyDelta` had
  already returned the new tree, so the throw unwinds past the `return` and the
  applied tree is lost. In `commitIntent` this lands before `store.append`, so
  the narration's last entry says `change-applied` and nothing was committed —
  precisely the gap `commit-failed` exists to cover, entered through a door that
  emits no `commit-failed`, because the thing that would emit it is the thing
  that threw.
- A sink throwing on `change-committed`: the inverse, and worse. Run against
  `memoryTreeStore`, the store ends at **revision 1 with the new text durably in
  it** while `commitIntent` throws instead of returning `committed`. A host would
  report failure to a user for a change that happened.

This is a contract, not a broken invariant, and 0024's reasoning for
fire-and-forget is sound and unaffected. The question is only whether a promise
this load-bearing should depend on every host's sink being written correctly,
when there are exactly two call sites and the fix is a `try`/`catch` at each.
**My recommendation: wrap both**, accepting that it swallows exceptions from a
buggy sink — that is what fire-and-forget means, it is what `collectTelemetry`
already chose for the equivalent case, and the alternative failure is a durable
change reported as an error. If the maintainer would rather not swallow, the
cheap alternative is to change the two comments so they read as an obligation on
the sink rather than as a guarantee to the caller.

**2. A stale count in a doc comment.** `src/testing/doubles.ts` opens with "test
doubles for the runtime's three impure seams — the interpreter, the clock, and
the event sink". `CompositionRuntime` has five, and `randomIdFactory` reads
`crypto.getRandomValues`, so the id factory is impure by the same standard. The
sentence is defensible as "the three this file doubles" — `sequentialIdFactory`
lives in `ids.ts` and `fixedPolicy` in `policy-source.ts` — but it reads as a
claim about the runtime, and it is the first thing anyone opening the file sees.
A five-word edit.

**Not a finding, noted because the last report raised it:** `pnpm verify` now
passes on a clean clone — `ce06ffc`, *Make pnpm verify pass on a clean clone*,
already on `main`. Verified here from a fresh `pnpm install`: exit 0, 886 runtime
tests, 227 portal tests. Item 1 of the 2026-08-04 report can be considered
closed.

## Needs your input

**Nothing blocking.** One question, with a recommendation, in the PR comment.

## Next

Syllabus order puts **06 — Undo as computation** next, and the ground is settled
enough: `tree/inverse.ts` has been stable since 2026-08-02, and Set E's question
6 already reaches into it deliberately.

One thing to carry into that run rather than discover during it. 0032 (*an undo
is a proposal, not a rewind*) is **Accepted — partially superseded by 0035**, and
0035 (*discarded work is a stake, and only the runtime may declare it*) is
Accepted and says so from the other side. So lesson 06 has to be written against
the pair, and the part 0035 took over — who may declare that an undo discards
later work — is not a footnote to the inverse-delta idea. It may be the more
interesting half.
