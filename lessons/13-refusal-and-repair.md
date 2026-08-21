# 13 — Refusal and repair: one attempt, and both halves in the record

**After this lesson you will be able to** say why a refusal is not a dead end
and not a negotiation; give the argument for exactly one repair attempt without
using the word "limit"; say what a repairer is handed and why it is the whole
disposition rather than a summary; name the party that stamps the link between
a refusal and its repair, and why it is not the party that produced the repair;
tell the three things this system calls "refused" apart; and say what makes
salami-slicing a pattern telemetry can find rather than a thing the runtime
prevents.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md),
[12](12-projection.md).

Lesson 09 gave the Gate the power to say no. Lesson 10 ran that no through a
pipeline and stopped. This is what happens next, and the interesting part is
not the second attempt — it is what the second attempt is not allowed to hide.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Undo is a delta rather than a snapshot. Give the property of the log that
   makes that possible, then say what `authoredBy` says on the delta a revert
   produces, and why that field exists beside `interpreter`. *(06, 11)*
2. The Gate is an ordered ladder and the first rule that fires wins. Name the
   rule that is checked *before* the ordinary stakes ceiling gets a say, and
   say what it is protecting. *(09)*
3. `PolicyContext` is the tree and the intent, and it cannot see the proposal.
   Say what that decision protects, and what would look healthy while measuring
   nothing if it were reversed. *(10)*
4. Give the sentence lesson 12 uses to define a projection. Then name the half
   of it people drop when they repeat it. *(12)*
5. Two of the seven interpretation codes name the **asker** as the actor who
   would have to do something. Name both, and say why neither is a failure of
   the model. *(11)*

Question 1 is this lesson's scaffolding. A repair and an inverse are both "a
delta that follows a delta", and by the end of this lesson you should be
unable to confuse them.

---

## Predict

In writing, before reading on.

> 1. A proposal comes back from the Gate refused. You are designing what
>    happens next, and you have decided the system will offer one more go.
>    Write the loop: how many attempts, where the count lives, and what stops
>    it from becoming a search for the weakest change the Gate will accept.
>    **Rate your confidence 1–5 before you read on.**
>
> 2. Write the list of everything you would hand to the thing doing the
>    revision. Be specific — name values, not categories. Then go back through
>    your list and cross off every item you could drop without the revision
>    getting worse. Commit to the shortened list before you go on.
>
> 3. A change was refused, then revised into something smaller, and the smaller
>    one was accepted and committed. Someone asks: *how often does this system
>    refuse changes?* Write the number you would give for this episode, and the
>    one sentence you would attach to it. **Rate your confidence 1–5.**

Predict 1 asks you to design a loop. The interesting part of the answer is not
the number you chose.

---

## The problem

### The line is somewhere the asker cannot see

"Remove the whole checkout section" may be refused where "remove the promo
banner inside it" would have been fine. The person who asked cannot be expected
to know where the policy's line sits — the policy is a host's configuration,
the stakes are computed from the shape of a delta they never saw, and the
disposition they get back is the first time anything told them.

So a refusal that is simply terminal pushes the work onto the asker, who now
has to guess. It also produces worse data: a refused-and-abandoned intent tells
telemetry that something was refused and nothing at all about what *would* have
been acceptable. Both of those are ordinary product problems and the fix is
obvious. Feed the refusal back to whatever produced the proposal, and let it
offer something weaker.

### The obvious fix is a laundering machine

Here is the same mechanism, described by someone trying to get a change past
the Gate:

1. Propose the whole removal. Get refused.
2. Propose half of it. Get accepted.
3. Raise a fresh intent for the other half. Get accepted.

Nothing about step 2 looks wrong in isolation. Nothing about step 3 looks
wrong at all — it is a new intent, with a new proposal, judged on its own
merits, and by every rule the Gate has it *is* fine. The two halves are only
suspicious together, and only if something in the record says they were
together.

0006 puts it in one sentence, and it is the sentence this lesson is built on:

> **The danger is not that the loop exists; it is that the loop could be made
> invisible.**

Sit with the shape of that for a second, because it is a different kind of
argument from the ones Part II made. The Gate's rules are all of the form
"this must not happen". This one is of the form "this will happen, and it must
not be able to happen quietly". Those demand different machinery.

### Whose capability is it, anyway?

There is a third problem underneath, and it is the one lesson 11 handed
forward. Suppose repair were a method on `ChangeInterpreter` — optional, so
that interpreters without one still typecheck. Then a deployment that wired in
a repair-capable interpreter would get repair, and nobody would have decided
that. The capability would arrive as a property of whichever object happened to
be in the constructor.

Lesson 11 said it as a rule: *a capability that arrives by accident is one
nobody decided to grant.* Here is the concrete cost of ignoring it — "does this
deployment let an AI have a second go at a change a policy refused" is exactly
the kind of question an operator must be able to answer by reading their own
composition root, and not by reading the source of an interpreter they
installed from somewhere else.

---

## The idea

Repair in Loom is four decisions, and each of them answers one of the problems
above.

### A repair is a fresh proposal, not a patch of the refused one

The strongest intuition to get rid of first: repair does *not* take the refused
delta and shrink it. It re-asks the original question, with the refusal
attached as context.

You can read this straight off `prompt.ts`:

```ts
export const buildRepairMessage = (request, tree, catalogue, themes) =>
  `${buildUserMessage(request.intent, tree, catalogue, themes)}

You proposed this, and it was refused:

${renderDelta(request.refused.delta)}
...`
```

The repair message *is* the ordinary user message, plus a suffix. The
catalogue, the theme vocabulary, the tree outline and the original utterance
are all sent again, unchanged. What is added is three things: the refused delta
rendered as an outline, the rationale that accompanied it, and the reason it
was refused.

That is a projection, and it is the one lesson 12 pointed at on its way out:
`renderDelta` takes a `TreeDelta` — a value with ids, an id of its own, a base
revision and a JSON prop bag per inserted node — and produces a numbered list
of operations in the order they apply. Same shape as every other projection in
the system: source of truth in, deterministic string out, source untouched.

Why does the *whole ask* get re-sent rather than just the objection? Because
the repairer's job is to satisfy the same request differently, and a thing that
had only the refused delta and the objection could satisfy the objection
without satisfying the request. "Remove less" is trivially achievable by
removing nothing.

### One call path, one difference

Interpreting an utterance and revising a refusal share everything except that
suffix, and `interpretation/interpreter.ts` makes that literal — both go
through one private `propose` function:

```ts
interpret: (intent, tree) =>
  propose(config, intent, buildUserMessage(intent, tree, ...)),

repair: (request, tree) =>
  propose(config, request.intent, buildRepairMessage(request, tree, ...)),
```

Same system prompt, so the cacheable prefix is identical (lesson 12, exercise
E). Same output schema, so a repair is constrained by the same grammar as a
first attempt. Same parse, so a repair that comes back malformed is a
`malformed-proposal` and not a special case. Same rule about what a bad answer
means: an unreadable reply is an `InterpretationError`, never a proposal the
Gate gets to refuse.

The shared path is worth noticing as a design move on its own. Two entry points
that differ by one string is the smallest surface on which "a repair obeys the
same rules as a proposal" can be *true by construction* rather than maintained.

### Exactly one attempt, and the "one" is structural

Look at what `attemptRepair` in `pipeline.ts` actually is: a function that
requests a repair, judges what comes back, and returns that outcome. There is
no path back into itself. There is no counter.

```ts
const judged = judgeProposal(runtime, tree, { ...repaired.value, repairOf: refused.proposalId }, policy)

return judged.kind === "not-applicable"
  ? judged
  : dispositionOutcome(runtime, tree, judged.assessment, judged.disposition)
```

`dispositionOutcome` applies, holds, or rejects. It never calls
`attemptRepair`. So a repair that is refused again is terminal, and it is
terminal because of the call graph rather than because of a number that
happened to be 1.

The difference between that and `if (attempts < maxAttempts)` is not
stylistic. A counter is a value, values have configuration, and configuration
drifts: someone raises it to 2 for a demo, and the system quietly becomes a
search procedure for the weakest change the Gate will accept. **Any number
above one is that search.** A cap of one is the only cap that is not a
gradient, which is why 0006 rejects "configurable attempt count" outright
rather than picking a default.

### The runtime stamps the link

`ProposedChange.repairOf` is set by the pipeline, from the refused proposal's
id. The repairer does not get to say what it is repairing — and if it claims
something, the claim is overwritten:

```ts
{ ...repaired.value, repairOf: refused.proposalId }
```

The spread order is the whole argument. This is the same rule you have met
three times already in different costumes: **attribution that the proposer
controls is attribution the proposer can omit.** Node ids are minted by the
`IdFactory` and not by the model (04). A disposition's `policyId` and
`policyFingerprint` are stamped by the Gate and not by the caller (09).
`interpreter` comes from the completion's `servedBy` and not from the reply
(11). And here: the link between a weak second proposal and the strong first
one is written by the only party with no reason to misreport it.

### Both halves are emitted, in order

The refusal's `disposition-decided` fires *before* `repair-requested`, and the
repair's fires after. That ordering is not incidental — it is what makes
"refused, then accepted a smaller version" a shape in the event stream rather
than an inference.

The stream for a successful repair reads:

```
change-proposed -> change-assessed -> disposition-decided
  -> repair-requested
  -> change-proposed -> change-assessed -> disposition-decided -> change-applied
```

Two proposals, two verdicts, one intent. `repair-failed` records a repairer
that declined, so even the attempt that produced nothing leaves a mark.

### Refusals only

Repair applies to `rejected` and nothing else.

Not to `requires-confirmation`: the Gate held that change because a *person*
should decide it, and answering their question with a smaller change nobody
asked about is worse than asking. "A human should look at this" is not an
objection to be routed around.

Not to `not-applicable`: that is an interpreter that produced a delta the tree
cannot accept, which is a defect rather than a judgment. Repairing it would be
retrying a bug against the same inputs.

### Detected, not prevented

The system prompt asks a model not to work around the objection, in as many
words:

> A revision must be a more conservative way to satisfy the same request —
> smaller in what it destroys, or narrower in what it touches. It must not be
> the same change split into a smaller piece so that the remainder can be asked
> for again.

That is guidance, and guidance is not enforcement. Nothing in the runtime can
tell "a smaller change that satisfies the request" from "the first slice of the
same change" — they are the same four operations, and the difference lives in
an intent that has not been raised yet.

So the enforcement is somewhere else, and it is two facts in the record:
`repairOf` links the two proposals, and both dispositions are stored. Together
they are exactly the shape a query needs to ask *how often does this
interpreter get refused and then accepted on a weaker version, and is that rate
going up?* The loop is not prevented. It is made impossible to run quietly, and
0006's `Consequences` says so in as many words: §6 is expected to look for it.

That is a real trade and it is worth being uncomfortable with it for a moment.
A system that *prevented* salami-slicing would need to know what a future
intent is going to ask for. This one instead guarantees that the pattern has a
fingerprint, and puts the burden on someone reading telemetry. Whether that is
enough depends on whether anyone reads it — which is the same bet lesson 07
made when it separated measurement from judgment.

### "Refused" is three different words

The vocabulary here will trip you, and the trip is worth taking deliberately
rather than by accident. This system uses *refused* for three unrelated things:

| Where | What it means | Whose problem |
| --- | --- | --- |
| `Disposition.kind: "rejected"` | The Gate will not allow this change | the policy's, and the asker's |
| `InterpretationError.code: "refused"` | The model declined to answer at all | the asker's content |
| `EpisodeResolution.kind: "refused"` | This episode ended with nothing applied | nobody's; it is a summary |

The second one is the one that catches people, and it catches them in exactly
the place this lesson is about: a *repair* can fail with `refused`, which means
the model's own guardrail declined — nothing to do with the Gate's refusal that
prompted the repair in the first place. Two refusals, one after the other,
about different things. `interpretationFault` says the first belongs to the
`asker` and the second to the `model`, which is the distinction 0040 exists to
keep.

---

## In the code

**`src/runtime/interpreter.ts`** — `ChangeRepairer` and `RepairRequest`. Two
interfaces where one would have compiled. Read the doc comment on
`ChangeRepairer`: *"a runtime that is handed no repairer cannot repair"* is the
entire argument, and it is a sentence about the composition root rather than
about the interface.

**`src/runtime/pipeline.ts`** — `attemptRepair`, and the four lines in
`composeChange` that reach it. Notice that `policy` is resolved once, above the
interpretation, and passed down — so the repair is judged under the same policy
as the proposal it replaces. Resolving again would let the two be compared
against different rulers, which is the one comparison the Gate exists to make.

**`src/interpretation/interpreter.ts`** — `propose`, and the two-line
`modelInterpreter` that implements both seams with it. The doc comment above
`propose` is the "one call path" argument; the one above `modelInterpreter` is
the "offered here, never assumed" argument.

**`src/interpretation/prompt.ts`** — `buildRepairMessage`, and the last
paragraph of `INTERPRETER_SYSTEM_PROMPT`. Read that paragraph twice. It is the
only place in the codebase that argues with a model rather than constraining
it, and knowing which sentences in a system are guidance is a skill.

**`src/interpretation/render.ts`** — `renderOperation` and `renderDelta`. Four
lines of switch and one comment that tells you what it is for: *so a repair is
a revision of something specific rather than a second guess at the same
utterance.*

**`src/runtime/events.ts`** — `repair-requested` and `repair-failed`. The doc
comment on the first says "emitted *after* the refusal's own
`disposition-decided`, never instead of it", which is an ordering constraint
written down in the only place a reader would look for it.

**`src/telemetry/episode.ts`** — `ProposalEpisode.repairOf`,
`ProposalEpisode.repairRequested`, and `tallyEpisodes`. This is where the two
facts become a number. Also read the comment on `resolutionOf`: a commit
anywhere in the chain settles the intent, because *the first refusal is part of
the story, not the ending.*

**`src/telemetry/calibration.ts`** — the comment at the top of the file. A
repair is scored as its own proposal rather than merged into the one it
replaced, because both graded themselves and both grades are evidence.

---

## Try it

Five exercises. Put the preamble and one exercise at a time into
`src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

**Predict every output in writing, then run.** The proposal ids in these
outputs are minted by a sequential factory shared across the whole file, so
they are the numbers you get running A, B, C and D in that order — a detail
that becomes exercise D's punchline.

Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import { buildRepairMessage, renderDelta } from "./interpretation/index.js"
import { err, ok } from "./result.js"
import type { EditIntent, IntentOrigin } from "./runtime/intent.js"
import {
  interpretationFault,
  type InterpretationError,
  type RepairRequest,
} from "./runtime/interpreter.js"
import { composeChange, type CompositionRuntime } from "./runtime/pipeline.js"
import { fixedPolicy } from "./runtime/policy-source.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { tallyEpisodes } from "./telemetry/episode.js"
import {
  buildIntent, buildProposal, collectingEventSink, fixedClock,
  scriptedInterpreter, scriptedRepairer,
  type CollectingEventSink, type RecordingRepairer,
} from "./testing/doubles.js"
import { harnessWith, removalDelta } from "./testing/episode-harness.js"
import { sampleTree, type SampleTree } from "./testing/fixtures.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeOperation } from "./tree/delta.js"
import { commitIntent } from "./write/index.js"

const spare = sequentialIdFactory("r")

type Ops = (ids: SampleTree["ids"]) => TreeOperation[]

type Stage = {
  readonly runtime: CompositionRuntime
  readonly events: CollectingEventSink
  readonly tree: SampleTree["tree"]
  readonly ids: SampleTree["ids"]
  readonly intent: EditIntent
  readonly proposal: ProposedChange
  readonly repairer?: RecordingRepairer
}

/**
 * A runtime with every seam scripted, and a repairer that answers however the
 * exercise says. Nothing here is a model.
 */
const stage = (options: {
  readonly ops: Ops
  readonly origin?: IntentOrigin
  readonly confidence?: number
  readonly policy?: GatePolicy
  /** The repairer proposes these instead. */
  readonly repairWith?: Ops
  /** The repairer answers with a failure instead of a proposal. */
  readonly repairFails?: InterpretationError
  /** The repairer claims this `repairOf` on what it hands back. */
  readonly repairClaims?: string
}): Stage => {
  const { tree, ids } = sampleTree()
  const intent = buildIntent(spare, {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance: "clear out the main region",
  })

  const proposalOf = (ops: Ops, confidence?: number): ProposedChange =>
    buildProposal(spare, {
      intentId: intent.intentId,
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: ops(ids),
      },
      ...(options.origin ? { origin: options.origin } : {}),
      ...(confidence === undefined ? {} : { confidence }),
    })

  const proposal = proposalOf(options.ops, options.confidence)

  const repairer = options.repairFails
    ? scriptedRepairer(err(options.repairFails))
    : options.repairWith
      ? scriptedRepairer(
          ok({
            ...proposalOf(options.repairWith, 0.95),
            ...(options.repairClaims === undefined
              ? {}
              : { repairOf: options.repairClaims as ProposedChange["repairOf"] }),
          })
        )
      : undefined

  const events = collectingEventSink()

  return {
    runtime: {
      interpreter: scriptedInterpreter(ok(proposal)),
      policySource: fixedPolicy(options.policy ?? defaultGatePolicy),
      events,
      clock: fixedClock(),
      idFactory: spare,
      ...(repairer ? { repairer } : {}),
    },
    events, tree, ids, intent, proposal,
    ...(repairer ? { repairer } : {}),
  }
}

/** The whole main region: the slot, the card inside it, and the card's text. */
const clearMain: Ops = (ids) => [{ op: "remove", nodeId: ids.main }]
/** One text node inside it. */
const clearBody: Ops = (ids) => [{ op: "remove", nodeId: ids.body }]

/** A host that refuses at medium rather than only at critical. */
const strict = gatePolicySchema.parse({ policyId: "strict", refusalFloor: "medium" })
```

### Exercise A — what a repairer is actually handed

```ts
describe("A", () => {
  it("prints what a repairer is handed", async () => {
    const s = stage({ ops: clearMain, policy: strict, repairWith: clearBody })
    await composeChange(s.runtime, s.tree, s.intent)

    const request = s.repairer?.requests[0] as RepairRequest
    console.log(buildRepairMessage(request, s.tree))
    console.log("--- and the whole disposition, not a summary of it ---")
    console.log(JSON.stringify(request.disposition, null, 2))
  })
})
```

Predict, before running: **how much of the original prompt appears again?**
Write down which of these you expect to see — the tree, the original utterance,
the refused delta, the rationale, the reason code, the reason detail, the
stakes level, the policy's name. Then predict what the *refused delta* looks
like on the page: JSON, or something else?

The output:

```
Current tree:

tree t_1 revision 0
n_7 element loom.page title="Home"
  n_2 element loom.header
    n_1 text "Welcome"
  n_5 slot main
    n_4 element loom.card elevation=1 variant="outlined"
      n_3 text "Body copy"
  n_6 element loom.footer

Request (user-instruction): clear out the main region

You proposed this, and it was refused:

1. remove n_5 and its subtree

Your reasoning was: satisfies the intent

It was refused because — stakes-at-refusal-floor: removes 3 nodes; restructures at depth 1

Propose a more conservative way to satisfy the same request, or say "not-understood" if there is none.
--- and the whole disposition, not a summary of it ---
{
  "kind": "rejected",
  "reason": {
    "code": "stakes-at-refusal-floor",
    "detail": "removes 3 nodes; restructures at depth 1"
  },
  "stakes": "medium",
  "reversible": true,
  "confidence": 0.9,
  "policyId": "strict",
  "policyFingerprint": "71ff452d:4a4030b86d65a438"
}
```

Three things to notice, in increasing order of how easy they are to miss.

**The whole ask is there again.** Tree, revision, origin, utterance. A repair
is a fresh answer to the same question, and the prompt is shaped like one.

**The objection is two values, not one.** `stakes-at-refusal-floor` says *which
rule fired*; `removes 3 nodes; restructures at depth 1` says *what about this
change made it fire* — and that detail is the stakes factors, joined. A
repairer given only the code knows it must lower the stakes and does not know
which of the three or four things that produce stakes it should go after.

**The `RepairRequest` carries the whole `Disposition`, and the prompt uses two
fields of it.** That looks like waste and is not: the interface is a seam, and
a repairer that is not a model — one that shrinks deltas arithmetically, say —
would want `stakes`, `reversible` and `confidence`, none of which the message
above mentions. The seam is written for what a repairer might need; the prompt
builder decides what *this* repairer is told.

Now the projection itself, on a delta with one of each operation:

```ts
describe("A", () => {
  it("renders one of each operation", () => {
    const demo = sequentialIdFactory("d")
    const { tree, ids } = sampleTree()

    console.log(
      renderDelta({
        deltaId: demo.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [
          {
            op: "insert",
            parentId: ids.main,
            index: 0,
            node: buildElement(demo, {
              type: "loom.note",
              props: { tone: "quiet" },
              children: [buildText(demo, "Back soon")],
            }),
          },
          { op: "remove", nodeId: ids.card },
          { op: "move", nodeId: ids.footer, parentId: ids.header, index: 1 },
          { op: "configure", nodeId: ids.page, set: { title: "Away" }, unset: ["subtitle"] },
        ],
      })
    )
  })
})
```

Predict: what does `configure` show about the values it sets?

The output:

```
1. insert into n_5 at 0:
    n_d2 element loom.note tone="quiet"
      n_d1 text "Back soon"
2. remove n_4 and its subtree
3. move n_6 into n_2 at 1
4. configure n_7 set title unset subtitle
```

`configure` prints the prop *keys* and not the values. `set title` — not `set
title="Away"`. Sit with that for a moment before deciding whether it is a bug.

The argument for it: this projection exists to tell a model what it proposed so
it can propose something narrower, and *how many props were touched* is the
part that bears on narrowness. The argument against: a repairer asked to be
"narrower in what it touches" might reasonably want to know that the title was
being set to something drastic. Both are real. Notice that `insert` renders its
node's props in full, so the file is not consistent about this — which is the
kind of asymmetry worth being able to *see* and then decide about, rather than
absorbing as the way things are.

### Exercise B — five endings

```ts
describe("B", () => {
  it("runs five endings", async () => {
    const runs = [
      ["repaired, accepted ", stage({ ops: clearMain, policy: strict, repairWith: clearBody })],
      ["repaired, refused  ", stage({ ops: clearMain, policy: strict, repairWith: clearMain })],
      ["repairer said no   ", stage({ ops: clearMain, policy: strict,
        repairFails: { code: "not-understood", detail: "no smaller change satisfies this" } })],
      ["model declined     ", stage({ ops: clearMain, policy: strict,
        repairFails: { code: "refused", detail: "model declined to answer: content policy" } })],
      ["no repairer wired  ", stage({ ops: clearMain, policy: strict })],
    ] as const

    for (const [label, s] of runs) {
      const outcome = await composeChange(s.runtime, s.tree, s.intent)
      const disposition =
        outcome.kind === "rejected" || outcome.kind === "applied" ? outcome.disposition : undefined

      console.log(label, "->", outcome.kind, "|", disposition?.reason.code)
      console.log("     ", s.events.types().join(" -> "))

      for (const { event } of s.events.envelopes) {
        if (event.type === "repair-failed") {
          console.log("      repair-failed:", event.error.code,
            "| fault:", interpretationFault(event.error))
        }
      }

      if (outcome.kind === "rejected" || outcome.kind === "applied") {
        console.log("      what came back:", outcome.assessment.proposal.proposalId,
          "| repairOf:", String(outcome.assessment.proposal.repairOf))
      }
    }
  })
})
```

Predict, before running: all five outcome kinds, all five event streams, and —
this is the one — for each of the four that end `rejected`, **which proposal
comes back inside the outcome**: the first one, or the repair?

The output:

```
repaired, accepted  -> applied | within-policy
      intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> repair-requested -> change-proposed -> change-assessed -> disposition-decided -> change-applied
      what came back: p_r4 | repairOf: p_r3

repaired, refused   -> rejected | stakes-at-refusal-floor
      intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> repair-requested -> change-proposed -> change-assessed -> disposition-decided
      what came back: p_r6 | repairOf: p_r5

repairer said no    -> rejected | stakes-at-refusal-floor
      intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> repair-requested -> repair-failed
      repair-failed: not-understood | fault: asker
      what came back: p_r7 | repairOf: undefined

model declined      -> rejected | stakes-at-refusal-floor
      intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> repair-requested -> repair-failed
      repair-failed: refused | fault: model
      what came back: p_r8 | repairOf: undefined

no repairer wired   -> rejected | stakes-at-refusal-floor
      intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided
      what came back: p_r9 | repairOf: undefined
```

**Row two is the salami slice that did not slice.** The repairer re-proposed
exactly what was refused, and it was refused again, for the same reason, by the
same policy. That is the whole enforcement story in one row: nothing stopped
the repairer from trying, and nothing had to, because the Gate is a pure
function and asking it the same question twice gets the same answer.

**Rows three and four end the same way and mean different things.** In both,
the repairer produced no proposal. `not-understood` says the repairer
understood the objection and could find no smaller change that satisfies the
request — which is precisely the answer the system prompt asks for when none
exists, and `interpretationFault` puts it on the `asker`. `refused` says the
model's own guardrail declined to answer at all, and the fault is the `model`.
Nothing downstream distinguishes them; the journal does.

**And now the row that is worth being annoyed about.** Compare the last three
lines of rows three, four and five. All say `rejected`,
`stakes-at-refusal-floor`, `repairOf: undefined`. From the returned
`CompositionOutcome` alone you cannot tell "a repairer declined" from "there
was no repairer" — the two produce identical values, and only the event stream
separates them (`repair-failed` fires in one and not the other). Row two is
different, because the proposal that comes back carries `repairOf`.

Hold onto that. It is a real gap in a type, of exactly the kind lesson 11's
`InterpretationFault` exists to close, and it is filed as a finding rather than
fixed here.

### Exercise C — who stamps the link

```ts
describe("C", () => {
  it("shows who stamps the link", async () => {
    const claimed = spare.proposalId()
    const s = stage({ ops: clearMain, policy: strict, repairWith: clearBody, repairClaims: claimed })
    await composeChange(s.runtime, s.tree, s.intent)

    console.log("the repairer claimed repairOf:", claimed)

    for (const { event } of s.events.envelopes) {
      if (event.type === "change-proposed") {
        console.log("change-proposed:", event.proposal.proposalId,
          "| repairOf:", String(event.proposal.repairOf))
      }
      if (event.type === "repair-requested") {
        console.log("repair-requested:", event.refusedProposalId, "|", event.reason.code)
      }
    }
  })
})
```

The repairer here hands back a proposal that claims to be repairing some other
proposal entirely. Predict: which value ends up in the event stream?

The output:

```
the repairer claimed repairOf: p_r10
change-proposed: p_r11 | repairOf: undefined
repair-requested: p_r11 | stakes-at-refusal-floor
change-proposed: p_r12 | repairOf: p_r11
```

The claim is gone. `p_r10` appears exactly once — in the line printing what the
repairer said — and never again. The stamp is `p_r11`, the proposal that was
actually refused, and it is written by the pipeline.

Two smaller things in that output are worth their own sentence. The *first*
proposal's `repairOf` is `undefined`, which is what makes "is this a repair" a
question you can ask of a single proposal rather than of a pair. And the
`repair-requested` event names `p_r11` too — so the link exists twice in the
record, once forward from the refusal and once backward from the repair, which
is what lets a reader who has only one of the two find the other.

### Exercise D — what the record says a week later

```ts
describe("D", () => {
  it("reads the record back through telemetry", async () => {
    const { ids: sampleIds } = sampleTree()

    const harness = await harnessWith({
      policy: strict,
      script: (tree, ids, intent) =>
        ok(buildProposal(ids, {
          intentId: intent.intentId,
          delta: removalDelta(tree, ids, sampleIds.main),
          confidence: 0.9,
        })),
      repairer: (tree, ids, intent) =>
        scriptedRepairer(ok(buildProposal(ids, {
          intentId: intent.intentId,
          delta: removalDelta(tree, ids, sampleIds.body),
          confidence: 0.95,
        }))),
    })

    await commitIntent(harness.path, harness.intent)

    const { episodes } = await harness.fold()
    const episode = episodes[0]

    for (const proposal of episode?.proposals ?? []) {
      console.log(JSON.stringify({
        proposalId: proposal.proposalId,
        repairOf: proposal.repairOf,
        removed: proposal.delta.operations.map((operation) =>
          operation.op === "remove" ? operation.nodeId : operation.op),
        removedNodeCount: proposal.assessment?.removedNodeCount,
        stakes: proposal.disposition?.stakes,
        verdict: proposal.disposition?.kind,
        reason: proposal.disposition?.reason.code,
        judgedBy: proposal.disposition?.policyFingerprint,
        repairRequested: proposal.repairRequested,
        committedRevision: proposal.committedRevision,
      }))
    }

    console.log("resolution:", JSON.stringify(episode?.resolution))
    console.log("tally:", JSON.stringify(tallyEpisodes(episodes)))
  })
})
```

This is the salami slice, completed: the whole main region refused, one node
inside it accepted and committed. Predict, before running: **how many episodes,
how many proposals, and what `byResolution` says.** Then predict whether
`refused` in the tally will be 1 or 0, and commit to it — this is the exercise
Predict 3 was about.

The output:

```
{"proposalId":"p_h2","removed":["n_5"],"removedNodeCount":3,"stakes":"medium","verdict":"rejected","reason":"stakes-at-refusal-floor","judgedBy":"71ff452d:4a4030b86d65a438","repairRequested":true}
{"proposalId":"p_h1","repairOf":"p_h2","removed":["n_3"],"removedNodeCount":1,"stakes":"low","verdict":"accepted","reason":"within-policy","judgedBy":"71ff452d:4a4030b86d65a438","repairRequested":false,"committedRevision":1}
resolution: {"kind":"committed","proposalId":"p_h1","revision":1}
tally: {"episodes":1,"proposals":2,"held":0,"repairs":1,"byResolution":{"committed":1,"refused":0,"awaiting-answer":0,"discarded":0,"not-interpreted":0,"not-writable":0,"failed":0,"open":0}}

```

**One episode, two proposals, `refused: 0`.** The refusal is *right there* in
the record — verdict `rejected`, `repairRequested: true` — and the tally's
resolution column says nothing was refused, because a resolution is about the
episode and the episode ended committed. Both numbers are true and they answer
different questions. "How many asks did this system turn down?" is
`byResolution.refused`. "How many proposals did the Gate refuse?" is a count
over `proposals`, and it is not in the tally at all. If you gave one number in
Predict 3 without the sentence, this is what the sentence was for.

**`repairs: 1` is the number that makes the pattern findable.** It counts
proposals with a `repairOf`, so "how often does a refusal turn into an
acceptance" is `repairs` over refusals-that-had-a-repair-requested — two
fields, one query, no inference.

**Both dispositions carry the same `policyFingerprint`.** Not just the same
`policyId` — the same digest of the policy's *contents*. That is what "there is
no second-chance policy to keep in step with the first" looks like from the
outside: the strong proposal and the weak one were measured against a ruler
that is provably identical.

**And now the punchline you were told to watch for.** The refusal is `p_h2`.
The repair is `p_h1`. The repair's id is *lower than* the id of the proposal it
replaces.

Nothing is wrong. `harnessWith` builds its scripted repairer's answer before it
builds the interpreter's, so the repair's id was minted first — an artefact of
how the test harness is wired, not of the runtime, where both ids are minted
inside `propose` at the moment each call is made. But that is exactly the
point. **The order is in `repairOf` and in the event stream, and it is nowhere
else.** A reader who sorted these two proposals by id would conclude the small
change came first and the large one was the escalation — the opposite of what
happened. Lesson 04 said an id says nothing about position in the tree; here is
its sibling: an id says nothing about position in time either, and a system
that needs the order says so with a field.

### Exercise E — the sentence that is only a sentence

No code. Open `src/interpretation/prompt.ts` and read the last paragraph of
`INTERPRETER_SYSTEM_PROMPT` — the one beginning "Sometimes you will be shown a
proposal that was refused". Then answer in writing:

1. That paragraph forbids one specific move. State it in your own words, and
   name the exact record that predicted it.
2. Suppose a model ignores it completely and returns the first half of the
   refused change. Walk the path: what does the Gate do, what does the pipeline
   stamp, what does the journal hold, what does `tallyEpisodes` count? Be
   concrete at every step.
3. Now suppose it obeys the paragraph and returns `not-understood`. Same walk.
   Which of the two leaves a better record, and *for whom*?
4. Someone proposes deleting that paragraph on the grounds that guidance which
   is not enforced is decoration. Give the strongest argument you can for
   deleting it. Then give the argument against, and say which you believe.

The point of question 4 is not the answer. It is that "this rule is guidance,
not enforcement" is a fact about a system you should be able to state out loud
about any rule you meet — and most codebases will not tell you which is which.
This one does, in a doc comment, and knowing that is worth more than knowing
what this particular paragraph says.

---

## It could have been otherwise

Seven alternatives. The first two are the ones that would have been chosen by
default if nobody had argued.

**No repair loop; a refusal stays terminal.** The status quo before 0006.
Rejected because it pushes the work onto the asker, who has to guess what the
policy would accept, and because it produces worse data: a refused-and-
abandoned intent says nothing about what *would* have been acceptable. Note
that this alternative is still available to any deployment — it is what "wire
in no repairer" means, and it is the default.

**Repair as an optional method on `ChangeInterpreter`.** One interface instead
of two, and a smaller composition root. Rejected because an optional method
makes the capability implicit in the object: wiring in a repair-capable
interpreter would silently enable repair. This is the alternative to argue with
hardest, because it is what most codebases would do and the cost is invisible
until you go looking for who decided.

**Configurable attempt count, or repair-until-accepted.** Rejected outright
rather than defaulted to 1. Any number above one is a search procedure for the
weakest change the Gate will accept, which is the exact failure mode the record
exists to bound. A setting would make the bound negotiable by configuration,
and the negotiation would happen in a YAML file nobody reviews.

**Let the repairer declare what it is repairing.** Rejected: attribution the
proposer controls is attribution the proposer can omit. Exercise C is this
alternative failing on purpose.

**Repairing `requires-confirmation` too, to avoid bothering a human.** Rejected.
"A person should decide this" is not an objection to be routed around, and
answering it with a smaller change nobody asked about is worse than asking.
This is the alternative that most sounds like a kindness and is not.

**A `GatePolicy` knob for repair.** Rejected: the Gate judges changes; it does
not decide how many chances a proposer gets. Putting a non-judgement setting
inside the pure decision function's inputs would also change the policy
fingerprint, which would make two dispositions incomparable for a reason that
has nothing to do with judgment.

**A deterministic repairer that shrinks the delta in the runtime.** Not a
recorded rejection — nobody has built it, and the seam permits it: any
`ChangeRepairer` will do, and one that dropped the largest operation and
re-proposed would need no model call at all. What it buys is a repair path with
no non-determinism in it. What it cannot do is satisfy the same request a
*different* way — it can only propose subsets of what was already refused,
which is the salami slice by construction and never the "remove the banner
instead of the section" answer that motivated the loop. It would also author a
delta with `authoredBy: "runtime"`, whose `confidence` is not a claim that can
be wrong, so calibration would have to exclude it. Worth knowing as the shape
of a thing the seam allows and the design does not want.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections
while you write.

1. **Derive from lesson 06.** An inverse delta and a repair are both "a delta
   produced in response to a delta". Write the paragraph that distinguishes
   them. You must include: which one is arithmetic and which one is a claim;
   what `authoredBy` says on each and why that field exists; what `confidence`
   means on each; and one thing that can go wrong with one of them and is not
   even expressible for the other. If your paragraph would still be true with
   "repair" and "inverse" swapped, you have not distinguished them.

2. **Say the shape of the "make it visible" argument**, in a single paragraph,
   without using the word "repair". Include: what kind of problem it is the
   right answer to, what kind of problem it is the *wrong* answer to, and what
   the argument costs — who has to do work later for it to pay off. Then apply
   the shape to something you have met in Part II: find one other place in this
   system where a thing is recorded rather than prevented, and say whether the
   same bet is being made there.

Predict, before writing (1): the tempting distinction is "one is computed and
one is generated". That is a restatement, not a distinction. The one that pays
is what each of them can be *wrong about*.

---

## Self-check

Six questions. For each: **rate your confidence 1–5 before you write your
answer, then check.** The pair matters more than either alone.

1. "Exactly one attempt, structurally." Say what "structurally" buys that a
   counter initialised to 1 does not. Give the failure mode of the counter
   concretely — who changes it, when, and what the system becomes.
2. The repairer is handed the whole `Disposition` rather than the reason code.
   Give a concrete thing a repairer could not do with the code alone. Then name
   the field of the disposition you would drop first if you had to, and defend
   the choice against the seam's own argument for carrying all of it.
3. Two runs both come back `rejected` with the same reason code. In one, a
   repairer declined; in the other, none was wired in. Say what in the event
   stream separates them, and what in the returned outcome does not. Then say
   which lesson-11 idea that gap is an instance of.
4. Salami-slicing is detected rather than prevented. Name the two facts in the
   record that make it detectable, and say why the sentence in the system
   prompt forbidding it is not the enforcement. Then: name the thing the
   runtime would have to know for prevention to be possible at all.
5. A repair is judged under the same policy as the proposal it replaced. Say
   where in `composeChange` that is arranged, and what would break if the
   policy were resolved again for the repair. Name the field in the record that
   proves it did not happen.
6. Predict 3 asked how often this system refuses changes. Give both honest
   numbers for exercise D's episode, name the field each comes from, and give
   the question each one answers.

Question 3 is the one to be least satisfied with a short answer to.

---

## Reflect

Write for two minutes, then move on.

- Which prediction were you most confidently wrong about? If it was Predict 1,
  say what you reached for instead of "no path back into itself", and what that
  reflex is usually right about.
- 0006 says: *the danger is not that the loop exists; it is that the loop could
  be made invisible.* Find two other places in this course where that sentence
  would fit with a different subject. They exist. If you can only find one, the
  one you are missing is in Part II.
- You have now seen four values that are written by someone other than the
  party they describe: node ids, `repairOf`, a disposition's `policyId`, and
  `interpreter`. State the rule those four share in one sentence — it is about
  who has a reason to misreport — then find a value on `ProposedChange` that
  the rule pointedly does *not* apply to, and say why the exception is safe.
- Part III is finished. Say in one sentence what the model is allowed to do in
  this system, and in one sentence what it is not. If the second sentence is
  longer than the first, that is the right shape.

---

## Come back to this

Set P in [`review-schedule.md`](review-schedule.md), two days after this
lesson. Interleaved with 03, 05, 06, 09, 10, 11 and 12.

Then **Set Q, one week after Part III** — the consolidation set, the
counterpart to E and M. Part III is three lessons that only make sense
together: 11 said what may not cross the seam, 12 said what does and how it is
reshaped, 13 said what happens when the answer comes back and the Gate says no.
Set Q is the one that asks you to hold all three at once, and it is the set
most worth not skipping.

**Where lesson 14 goes next.** Part IV, and rendering. The tree as a total,
pure projection — the fourth projection in a course that has now used the word
in three lessons, and the first one whose consumer is a person rather than a
model.
