# 2026-08-17 — Lesson 10: The pipeline

**Landed:** [`lessons/10-the-pipeline.md`](../10-the-pipeline.md), the syllabus
link, and two new sets in `review-schedule.md` — Set L for lesson 10, and Set M,
the Part II consolidation set. Part II is now complete, so M is its counterpart
to Set E; adding it now rather than during Part III is the only time it is the
natural thing to do.

**No code changed.** `pnpm verify` green: 1241 runtime tests, 484 portal.

## A gap in the procedure this run

**I could not read PR comments.** `list_pull_requests` returned 403 and every
attempt at issue comments returned 404 from the GitHub integration, on both the
open PR (#85) and the last merged lessons PR (#77). Search worked, so I know #85
is the build routine's primitives PR and carries two comments, and I know there
is no open lessons PR — but I could not read the comments themselves.

That matters because reader feedback is supposed to outrank the syllabus, and
this run could not check for it. If there is a comment on #77 or an earlier
lessons PR asking for something, it has not been acted on and the next run should
look first. The syllabus decided this run by default rather than by argument.

## Why 10 was safe to write

`src/runtime/pipeline.ts` last changed on 2026-08-10 (0048's fingerprint work
touched `gate.ts`; the pipeline's own last change was 9a21d0b, a week ago).
`policy-source.ts` and `intent.ts` are older still. The four records the lesson
leans on — 0006, 0017, 0021, 0033 — are all `Accepted`, the newest of them from
2026-08-03. The 09 report's caution was to check this file for movement before
committing to it; there has been none.

The build routine's current work (§4, primitives and the compose layer) is
nowhere near this module, which is the other half of why it was safe.

## What I emphasised, and why

The 09 report asked that 10 take "an assessment is a stored record you can
re-judge" as given and spend its exercises on the sequence. It also flagged
`confirmChange` resolving the policy a second time as the one step a reader will
not predict. Both are honoured, and building around the second produced the
spine.

**The lesson is about the pause, not about the list of stages.** A lesson that
named five stages in order would have taught six words and nothing derivable. So
*The problem* writes the naive six-line orchestrator and breaks it three times,
and the third break is the one that cannot be fixed by widening a return type:
there is no value of any type that means *ask Jonathan*, because the reviewer is
not late, they are **elsewhere**. They arrive in a request that does not exist
yet. Everything in the second half of the module falls out of that, and a reader
who has the pause can derive the rest.

**"Once per occasion of judgment" is the sentence to keep.** The apparent
inconsistency — resolved once across a repair, again across a confirmation — is
the sharpest thing in the material, and 0033 states it plainly enough that the
lesson's job was to make it *falsifiable* rather than to restate it. Exercise B
counts resolutions in three runs and the middle one (two proposals judged, one
policy resolved) is where a reader's prediction breaks. The general rule then
does real work: it explains both numbers, and Set L question 3 applies it to a
case neither the lesson nor the record mentions.

**Predict 3 is the calibration question, and it is designed to be got wrong.**
"The Gate holds the same change a second time — what happens?" reads as though
the answer must be *hold it again*, which is a reasonable answer that does not
terminate. The lesson names that explicitly in Reflect and asks the reader to
write the pair down in their tracking table if they were confident about it. It
is the best confident-and-wrong candidate the course has had so far, because
being wrong here is a *design* mistake rather than a recall failure.

**Deliberately left thin: repair, and the log.** Exercise F establishes only that
a repairer sees a refusal and not a hold, and argues that boundary in terms of
the person waiting — the mechanism (one attempt, structural, `repairOf`) is
lesson 13's and the lesson says so. Custody and persistence get one table and a
pointer to 16. This is the same discipline 09 used on the pipeline, and it left
room for the pause to be the whole lesson.

## What the exercises revealed

All six were executed via `src/scratch.test.ts` and every line of output in the
lesson is a real one, produced by the exact code the reader is given. The file is
deleted.

Three things came out of running rather than reading.

**Two of the five event streams are identical, and they mean opposite things.**
`held` and `rejected` both end at `disposition-decided`. A consumer reading event
*types* cannot tell a change a person may still approve from one that was
refused. That turns out to be the right shape — the kind is on the disposition,
where 09 put it — but it makes Q1 a real question rather than a lookup, and it is
the sort of thing that is invisible when you read the module and obvious when you
print the streams.

**The applied change carries a disposition that says `requires-confirmation`.**
Exercise D, and I did not expect the record to read that way. It is correct and
it is better than stamping `accepted` would be, because it preserves *why a
person had to be asked*. But it means a `byKind` count over the journal is not a
queue depth, which is exactly lesson 09's reason-code finding in a second
costume, and the lesson says so and makes the reader name the connection.

**An assessment can be computed for a delta that cannot apply.** Exercise E was
written to show that the revision check fires last; what it actually shows is
that the change is *measured and judged* first, against a tree the delta does not
belong to. See the first item below. This changed the exercise: the two numbers
it prints from the assessment were added after the first run, because the run is
what made them interesting.

## Found while teaching

**Three items, all for the build routine. Nothing was fixed here. None is a
behaviour bug on any supported path — all three are reachable only by calling
`src/runtime` directly, which the SDK exports.**

**1. `assessChange` does not check what `applyDelta` checks, so a stale delta is
measured and judged before anything notices.** `applyDelta` compares
`delta.baseRevision` to `tree.revision`; `analyzeDelta` walks the tree with
`applyOperation` per operation and never looks at it. Executed — a hold against
revision 0, confirmed after somebody else wrote revision 1:

```
outcome: not-applicable {"code":"revision-mismatch","expected":0,"actual":1}
    policy-resolved -> change-assessed -> disposition-decided -> application-failed
    measured against the moved tree: {"removedNodeCount":3,"reversible":true}
    the verdict it reached first: {"kind":"requires-confirmation","reason":"stakes-above-ceiling","stakes":"medium"}
```

The count is right in that run only because the interfering change rewrote a text
value. A second probe, where the interfering change inserted two cards under
`main` before the same `remove main` was confirmed:

```
stale delta, measured against head: {"removedNodeCount":7,"stakes":"medium","factors":["large-removal","shallow-structural-change"]}
  verdict: {"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
```

Seven nodes, from a delta that removes three and in fact removes none. The
`large-removal` factor is a fact about a change that does not exist. Nothing is
written — the apply fails — but a journal consumer sees a `change-assessed` and a
`disposition-decided` for it.

**My recommendation: nothing structural; a sentence in `analysis.ts`.**
`confirmHeld` reads head and releases a hold whose revision moved before
`confirmChange` is reached (0021), and `commitIntent` refuses a stale intent
before spending a model call, so the supported path never gets here — and moving
the check into `assessChange` would put a revision comparison in the module 0002
deliberately kept free of anything but measurement. What is worth writing down is
that an analysis is only meaningful about the tree it was taken against, next to
`analyzeDelta`, because the function's signature currently implies otherwise:
it takes a delta carrying a `baseRevision` and ignores it.

**2. `confirmChange` takes a proposal and an intent and nothing checks that they
belong together.** `ProposedChange.intentId` exists; the function never compares
it to `intent.intentId`. The intent is used for exactly two things — resolving
the policy and stamping `intentId` on the `policy-resolved` event — so a
mismatched pair does not reach the Gate's ceiling lookup, which reads
`proposal.provenance.origin`. But a host whose `PolicySource` branches on
`intent.origin` or `intent.actor` (the two things 0033 put in the context) would
resolve the wrong policy, and the disposition would name it, and the record would
be internally consistent and wrong.

Unreachable through `confirmHeld`, which takes both from one `HeldProposal`.
Reachable from the SDK, and it is the sort of pairing that goes wrong when a
second caller is written.

**My recommendation: return `not-applicable` on a mismatch, or take one argument
instead of two.** The second is better and cheaper to reason about — the two
values always travel together and `HeldProposal` already carries both — but it
changes an exported signature, so the guard is the smaller change. This is the
same instinct 0027 used for `ProposalAnswer`: two things that must agree travel
as one value rather than as two parameters a caller can get out of step.

**3. A count of disposition kinds is not a count of states, and nothing says
so.** From exercise D: a change that was held and then confirmed leaves **two**
`disposition-decided` events with the same `proposalId`, both
`requires-confirmation`, and the applied change's disposition is the second of
them. Somebody counting `kind === "requires-confirmation"` in the journal to find
work waiting on a human counts every change that was held *and answered*, twice.

This is the same shape as the 09 report's item 3 (`reason` codes are first
reasons) and I think the two should be answered together — they are both "a
disposition is a judgment, not a measurement", and a comment on one without the
other leaves the pair half-documented.

**My recommendation: one line on `Disposition` in `disposition.ts`** saying a
disposition records a verdict reached at a moment, that one proposal may have
more than one, and that the queue is `proposal-held` minus the answers rather
than a count of kinds. Cheap, and it is the sentence that stops the first
telemetry reader from shipping a wrong dashboard.

## Next

Syllabus order puts **11 — The model seam** next, opening Part III. The reader
now has the whole of the deterministic half and has been told twice — in 09's
exercise F and in this lesson's Explain-it-back 2 — that purity is what makes the
records re-judgeable. 11 is where the one non-deterministic thing enters, so the
obvious spine is the contrast: everything downstream of `interpret` can be
re-run and get the same answer, and `interpret` cannot, and the seam is what
keeps that contained to one function.

Two cautions. First, `src/interpretation/` is closer to live work than
`src/runtime/` was — check `anthropic.ts` and `interpreter.ts` for recent
movement before committing, and prefer teaching the *seam* (`ChangeInterpreter`,
which has been stable since §2) over the Anthropic adapter behind it. Second, 12
is Projection and 11 should not eat it: what the model is *shown* is 12's
argument, and 11 only needs that a projection exists.

If the comment-reading problem persists, the next run should say so early and
loudly rather than proceeding on the syllabus a second time — two consecutive
runs with no way to see reader feedback is the point at which the course starts
being written at somebody rather than for them.
