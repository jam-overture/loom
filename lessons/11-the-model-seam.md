# 11 — The model seam: containing the one thing that will not repeat

**After this lesson you will be able to** say why the seam's return type is one a
model cannot produce, name the three things the boundary refuses to let across and
give the argument for each, say why the network boundary sits *below* prompt
assembly rather than above it, explain why a failure names an actor rather than a
retry, and say what the record of a step you cannot re-run can honestly claim.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md).

This lesson opens Part III. Everything in Part II was built so a decision could
be re-run and come out the same. This is the one step where that is false.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. A model may not name the nodes it inserts. Give the reason, without using the
   word "trust". (L04)
2. Loom throws deliberately in two places. Give the rule that distinguishes them
   from everywhere else — the rule, not the two places. (L05)
3. Two of the five composition outcomes carry no disposition. Name them, and say
   what they have in common. (L10)
4. Two failures, both `Result`s: a delta naming a node that is not there, and a
   change the Gate refused. Which is which in the journal, and what does a
   monthly report lose by adding them together? (L07)
5. What does `baseRevision` protect against? (L03)

Question 1 is the one this lesson turns into a *type*. You have known since
lesson 04 that a model may not name what it inserts. This lesson is about the
fact that it cannot.

---

## Predict

In writing, before reading on.

> 1. Write the interface you would put a model behind — just the type, one
>    method. Now list every distinct thing that can happen when you call it that
>    your signature cannot express. Commit to a **number** before you read on,
>    and keep the list; you will score it twice.
>
> 2. You have to test this thing. Name everything that happens between "an intent
>    arrives" and "a `ProposedChange` exists" — as many steps as you can. Then
>    draw one line through your list where the network call goes, and mark each
>    step above or below it. Last: which side should the *interface* sit on, and
>    what does putting it on the other side cost your test suite?
>
> 3. Your seam has to report failure. Write down the failure cases you would give
>    it. Then answer this, and **rate your confidence 1–5 before you read on**:
>    should the failure carry a `retryable: boolean`? Write down what a caller
>    would do with it.

Question 1 is the lesson. Question 3 is the one most people get wrong, and it is
wrong in a way that looks like helpfulness.

---

## The problem

You have a tree, an intent, and a model. Write the function.

```ts
const interpret = async (utterance: string, tree: LoomTree): Promise<TreeDelta> => {
  const reply = await client.messages.create({ model, system, messages: [...] })

  return JSON.parse(reply.content[0].text)
}
```

Four lines, and it is roughly what every AI feature ships with. Watch it fail,
three times, in ascending order of how much the failure costs you.

**It throws.** The network is down, the key is missing, the reply is not JSON.
Lesson 05 refused this generally and the fix is known: return a `Result`. This is
the cheap problem, and you already have the tools.

**It cannot say which failure.** So you widen the error type — and the question
of *how far* is more interesting than it looks. A host that treats "no API key"
the same as "the service is busy" retries forever at something that will never
work. A host that treats "the model did not understand you" the same as "the
service is busy" retries at something where the retry is the wrong response
entirely: nobody has asked the person to say it differently. You reach for a
union, and it works, and this is the medium problem.

Both of those are shapes of failure, and shapes of failure are fixed by widening
a type. Then there is the third one, and it is not about failure at all.

**There is no value of `TreeDelta` the model is allowed to produce.**

Not "it might produce a bad one". A `TreeDelta` contains `NodeId`s on every
inserted node, plus a `deltaId`, a `treeId`, and a `baseRevision`. Lesson 04
established that the runtime mints ids and the proposer does not. So the return
type on that signature is a type the far side of the boundary **cannot inhabit** —
and no amount of validating what comes back changes that, because validation is
a check somebody can forget and this needs to be a thing nobody can say.

Which turns the question around. It is not *how do I put a model behind an
interface*. Interfaces are easy. It is:

> **Interpretation is the one step whose output cannot be re-derived. Everything
> else in Part II was built so a decision could be re-run and come out the same.
> Given that this one cannot: what does the boundary around it have to refuse,
> and what can the record of it honestly claim?**

---

## The idea

> **A seam is not where you hide a dependency. It is where you decide what may
> cross. Loom cuts twice, and at each cut names exactly what does not get
> through.**

### The seam does not mention a model

```ts
export interface ChangeInterpreter {
  readonly interpret: (
    intent: EditIntent,
    tree: LoomTree
  ) => Promise<Result<ProposedChange, InterpretationError>>
}
```

Read it for a vendor. There is no model id, no prompt, no token, no temperature.
Nothing in `src/runtime/` knows that a model exists anywhere in the system.

That is not politeness about naming. **Two of Loom's shipped interpreters do not
call a model at all.** `revertInterpreter` computes an undo from the log (0032,
and lesson 06 — an undo is a proposal, not a rewind). A demo preset computes a
change from the tree it is handed (0057). Both are pure functions wearing the
seam's clothes, both go through `assessChange`, `gate`, `applyDelta` and the
store like anything else, and **nothing downstream can tell**. Exercise A is a
third one you can write in fifteen lines, driven through the whole pipeline.

So say what the seam is actually for, because the obvious answer is wrong:

> **The seam exists because interpretation is the non-deterministic step — not
> because it is the model.**

0057 makes that explicit, and it is why the pattern could be generalised into a
record rather than staying a trick the demo used. If the seam existed to hide a
vendor, a deterministic interpreter would be a mock. It is not a mock; it is a
first-class citizen that happens to be a function.

### The second cut, and why it is lower than you drew it

Below `ChangeInterpreter` there is a second boundary, and it is the whole network:

```ts
export interface ModelClient {
  readonly complete: (request: ModelRequest) => Promise<Result<ModelCompletion, ModelClientError>>
}
```

A `ModelCompletion` carries the reply **text**, and the model that served it.
Not a parsed object. Not a validated reply. Text.

That looks like the wrong side of the line, and Predict 2 probably drew it
higher. A boundary returning a validated `InterpretationReply` would be better
typed, and everything above it could stop worrying about JSON.

Now count what sits between the two cuts. Prompt assembly. JSON parsing. Schema
validation. The three-way outcome. Materialization — every id minted.
The delta parse. Provenance. The hash. That is all of the logic, all of the
places a bug lives, and **all of it is pure**.

Put the boundary above it and testing any of it requires a fake that reimplements
it, which means your tests assert that your fake agrees with your fake. Put the
boundary below it and every line is unit-testable with no network and no
credential. Exercise B assembles a complete request — model, effort, ceiling,
system prompt, output schema — and handles a reply, offline.

The rule in general form, which is worth more than the instance:

> **Cut below the impurity, not below the thing you want to replace.**

The network call is the only part of interpretation that cannot be a function of
its inputs. Everything else was impure only by association, and a boundary drawn
around the association drags a great deal of testable logic into the dark with
it.

There is a second dividend that is easy to miss. 0005 requires that **exactly one
test may touch the network** — a live smoke test that skips when no key is
present. Everything it covers is covered offline; what it adds is proof that the
schema Loom hands a real model is one a real model can satisfy, which no fixture
can establish. That test is affordable *because* the seam is low: there is only
one thing left that a fixture genuinely cannot check.

### What may not cross, one: identity

A model does not produce a `TreeDelta`. It produces a **draft** — the same four
operations, with inserted nodes carrying no `id`. `materializeDelta` is the
inverse projection: it mints every id through the same `IdFactory` the rest of
the system mints through, and supplies `deltaId`, `treeId` and `baseRevision`
itself.

Read 0003's consequence rather than its rule, because the rule is the boring
half:

> **Id collisions from a model are impossible by construction, not by validation.
> `applyDelta`'s collision check remains, but it now guards against runtime bugs
> rather than against the proposer.**

That is the difference between a rule and a shape. A model that reused an id it
saw in the tree would be expressing "insert" and "collide" with the same bytes —
so the draft schema simply has nowhere to put the id.

`baseRevision` earns its own sentence. The delta is authored against the revision
the **intent** named, never the tree as it stands when the model is called. So an
intent raised against a tree that has since moved produces a proposal that fails
to apply — lesson 10's `not-applicable`, loudly — rather than one quietly
re-aimed at a tree the asker never saw. 0003 considered the alternative and named
the cost exactly: it would trade a loud failure for a quiet wrong answer.

Exercise C is this from three sides, and its middle row has a wrinkle worth being
slow about.

### What may not cross, two: an exception

Lesson 05 in general; here in the specific place where it is hardest. This is the
boundary with a network behind it, and a network is where throwing is most
natural — the SDK throws, `JSON.parse` throws, a schema violation throws if you
let it.

Nothing in `src/interpretation/` throws. And the property that survives is the
one lesson 10 depends on:

> **A reply this module cannot make sense of is an `InterpretationError`, never a
> proposal the Gate gets to refuse.**

Lesson 10 showed you that as a shape — `not-interpreted` carries no disposition
and no assessment, because neither exists. This is where that fact is *created*.
"I did not understand you" and "you may not do that" stay separable in telemetry,
which is what makes it possible to judge an interpreter and a policy
independently (0003). Exercise D puts six answers through the seam and gets six
outcomes, none of them a proposal and none of them a throw.

### What may not cross, three: the difference between "no" and "I don't know"

This is Predict 3, and it is where most designs are thin.

Seven `InterpretationError` codes; five `ModelClientError` codes below them. And
one total function, `interpretationFault`, mapping all seven onto five **actors**:
`asker`, `model`, `provider`, `deployment`, `runtime`.

> **A failure names the actor who would have to do something for the next attempt
> to go differently.** Not what went wrong. Not whether to retry. *Who must act.*

0040 is the record, and it was written after a defect worth knowing about. The
adapter had three codes and put **every** thrown SDK error into `unavailable`,
which is documented as "ask again later". The SDK throws on a 400 as readily as
on a 529. So a request Loom itself had assembled badly was reported to its host
as a transient outage — and 0040's phrasing is the thing to keep: that is *not an
imprecision, it is a false statement about the future.*

The tell is better still. A live smoke test needed to know whether the API had
declined to answer, and the seam did not know, so the test matched
`/^(429|5\d\d)\b/` against the vendor's error **message** — a string the vendor
may reword at any time.

> **A test parsing prose to recover a fact the type system threw away is the
> clearest evidence available that the type was wrong.**

Now the boolean, which is what Predict 3 was for. `retryable` is true of
`unavailable`, false of `rejected` and `misconfigured`, and genuinely arguable
for `malformed-proposal` — resampling an identical request may well produce a
usable answer next time. Retrying is **policy**: a host may reasonably resample a
malformed proposal and refuse to resample anything else. A seam that answers
"should you retry" decides that policy on its host's behalf while knowing less
than the host does. Naming the actor gives a host everything it needs to decide
and commits Loom to nothing it cannot know.

One more thing about the classification, because the asymmetry is deliberate:
401, 402 and 403 are `misconfigured`; a 4xx that is not 408, 409 or 429 is
`rejected`; **everything else** — 5xx, a transport failure that never got a
response, a status nobody recognises — falls to `unavailable`, because
`unavailable` is the answer that claims least. Guessing "retryable" for something
permanent costs one wasted attempt. Guessing "permanent" for something transient
tells a host to abandon work that would have succeeded.

Exercise E prints the whole mapping.

### The vendor is optional, and that is a fact about the import graph

`@anthropic-ai/sdk` is an **optional peer dependency**, and the adapter is a
separate entry point — `@loom/runtime/anthropic` — that the package root does not
re-export. A host that brings its own model never loads it and never installs it.

The argument is not packaging hygiene. A front-end framework whose core imports a
vendor's SDK has taken a position on which model authors your UI, and that is a
position Loom should not take on a host's behalf.

The seam is also deliberately **thinner than the vendor API**. Streaming, tool
use, caching, and multi-turn conversation are all invisible to it. Any of them
becomes a change to this contract, and gets a record. A seam that grew to match
whatever the vendor added next would stop being a boundary and become a
re-export.

### What a record of a non-deterministic step can honestly say

Here is the part that makes this more than plumbing, and it is the one that
reaches back to lesson 05.

Part II's claim was that a decision worth auditing is one you can re-derive from
what was recorded. Interpretation breaks that claim, and no amount of seam
fixes it: you cannot re-run `interpret` and get the same delta. So the seam does
the only honest thing left. **It cannot make the step reproducible, so it makes
it accountable.**

| Recorded | The question it answers | What it cannot answer |
| --- | --- | --- |
| `promptHash` | was this the same ask? | *what* was asked — deliberately; provenance carries no user content |
| `interpreter` | which model **served** it | which model was asked for |
| `authoredBy` | is this a self-grade at all | |
| `confidence` | how sure it said it was | how sure it should have been (0007; lesson 17) |
| `interpretedAt` | when, from the injected clock | |

Two of these repay attention.

**`interpreter` is `completion.servedBy`** — the model that actually served the
request, which may not be the one asked for. A deployment that asks for
`claude-opus-5` and is served a dated snapshot has that fact in the record rather
than its own assumption about it. Exercise F shows the two differing in one line.

**`authoredBy` looks redundant beside `interpreter` and is not.** `interpreter`
names the thing; `authoredBy` names its *kind*. Calibration (0031, lesson 17)
measures self-grades, and a delta the runtime computed — an inverse behind a
revert, a preset — has no opinion to be right or wrong about: its `confidence: 1`
is a statement of arithmetic, not a guess. Calibration therefore has to tell the
two apart **by type rather than by recognising a magic interpreter name**, which
is a rule that stays true when somebody writes a fourth deterministic
interpreter and does not tell the telemetry module.

And the hash covers **what was sent, not what came back**. Exercise F's two runs
return different deltas under one hash, and that is correct: the hash establishes
that two records answered the same question, which is exactly the fact you need
in order to compare two answers. A hash of the reply would establish only that a
model said the same thing twice, and nothing needs to know that.

### Where the repair sits

`modelInterpreter` returns `ChangeInterpreter & ChangeRepairer`. It offers both,
and the two share everything below the user message — the same system prompt (so
the cacheable prefix is identical), the same output schema, the same parsing, the
same rules about what a bad answer means.

But they are **two interfaces, not one interface with an optional method**, and
lesson 10's exercise F is why: whether a deployment repairs is decided by whether
this object is also wired in as the runtime's `repairer`. The capability is a
line at the composition root rather than a property of whichever interpreter
happened to get wired in — and a capability that arrives by accident is one
nobody decided to grant.

Lesson 13 takes the rest: one attempt, why the "one" is structural rather than a
counter, and what recording both halves is for.

---

## In the code

| What | Where |
| --- | --- |
| The seam, its seven codes, and the five actors | [`src/runtime/interpreter.ts`](../src/runtime/interpreter.ts) |
| The network boundary, and nothing else | [`src/interpretation/client.ts`](../src/interpretation/client.ts) |
| Everything between the two cuts | [`src/interpretation/interpreter.ts`](../src/interpretation/interpreter.ts) |
| What a model is allowed to say | [`src/interpretation/draft.ts`](../src/interpretation/draft.ts) |
| Where the runtime names what the model built | [`src/interpretation/materialize.ts`](../src/interpretation/materialize.ts) |
| The exact bytes, kept a value rather than a side effect | [`src/interpretation/prompt.ts`](../src/interpretation/prompt.ts) |
| The one vendor adapter, and its status classification | [`src/interpretation/anthropic.ts`](../src/interpretation/anthropic.ts) |
| The one test that may touch the network | [`src/interpretation/anthropic.smoke.test.ts`](../src/interpretation/anthropic.smoke.test.ts) |
| A deterministic interpreter that ships | [`src/write/revert.ts`](../src/write/revert.ts) |

---

## Try it

Predict every output in writing before running anything. In C and E, predict the
*rows* — the point of both is which things come out the same and which do not.

Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import type { ModelClientError } from "./interpretation/client.js"
import { modelInterpreter } from "./interpretation/interpreter.js"
import { err, ok, type Result } from "./result.js"
import type { EditIntent } from "./runtime/intent.js"
import {
  describeInterpretationError, interpretationFault,
  type ChangeInterpreter, type InterpretationError,
} from "./runtime/interpreter.js"
import { composeChange, type CompositionRuntime } from "./runtime/pipeline.js"
import { fixedPolicy } from "./runtime/policy-source.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import {
  buildIntent, collectingEventSink, fixedClock, scriptedModelClient,
} from "./testing/doubles.js"
import { sampleTree } from "./testing/fixtures.js"
import type { TreeOperation } from "./tree/delta.js"
import type { LoomNode } from "./tree/node.js"

const spare = sequentialIdFactory("x")

/** A whole runtime around a given interpreter. Nothing here is a model. */
const stage = (interpreter: ChangeInterpreter) => {
  const { tree, ids } = sampleTree()
  const intent = buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })
  const events = collectingEventSink()

  const runtime: CompositionRuntime = {
    interpreter,
    policySource: fixedPolicy(defaultGatePolicy),
    events,
    clock: fixedClock(),
    idFactory: spare,
  }

  return { runtime, events, tree, ids, intent }
}

/** A model-backed interpreter whose model is a fixed string. */
const modelStage = (
  reply: string | Result<{ text: string; servedBy: string }, ModelClientError>,
  servedBy = "claude-opus-5-20260601"
) => {
  const { tree, ids } = sampleTree()
  const client = scriptedModelClient(reply, servedBy)
  const intent = buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })

  return {
    client, tree, ids, intent,
    interpreter: modelInterpreter({
      client, idFactory: sequentialIdFactory("m"), clock: fixedClock(),
    }),
  }
}

/** What a model says when it wants a second card in the main slot. */
const CHANGE_REPLY = JSON.stringify({
  outcome: "change",
  rationale: "added a second card to the main slot",
  confidence: 0.82,
  operations: [
    {
      op: "insert",
      parentId: "n_5",
      index: 1,
      node: {
        kind: "element",
        type: "loom.card",
        props: '{"variant":"outlined"}',
        children: [{ kind: "text", value: "Second" }],
      },
    },
  ],
})
```

`n_5` is the main slot. If that surprises you, lesson 04 warned you: the fixture
builds leaves before their parents, so the ids run in construction order and say
nothing at all about position.

**A — an interpreter with no model in it.** Fifteen lines of pure function,
driven through the whole pipeline. Predict the outcome, the event stream, and the
verdict before running.

```ts
describe("A", () => {
  it("runs the whole pipeline on an interpreter with no model in it", async () => {
    /** A pure function from a tree to operations, wearing the seam's clothes. */
    const shorten: ChangeInterpreter = {
      interpret: (intent: EditIntent, tree) => {
        const operations: TreeOperation[] = []

        const walk = (node: LoomNode): void => {
          if (node.kind === "text" && node.value.length > 6) {
            operations.push({
              op: "configure", nodeId: node.id,
              set: { value: node.value.slice(0, 6) }, unset: [],
            })
          }
          if (node.kind !== "text") for (const child of node.children) walk(child)
        }
        walk(tree.root)

        if (operations.length === 0) {
          return Promise.resolve(err<InterpretationError>({
            code: "no-change-needed", detail: "nothing here is long enough to shorten",
          }))
        }

        return Promise.resolve(ok({
          proposalId: spare.proposalId(),
          intentId: intent.intentId,
          delta: {
            deltaId: spare.deltaId(), treeId: intent.treeId,
            baseRevision: intent.baseRevision, operations,
          },
          rationale: "shortened every long text node",
          provenance: {
            origin: intent.origin,
            interpreter: "loom/shorten-preset",
            authoredBy: "runtime" as const,
            confidence: 1,
            interpretedAt: "2026-07-28T00:00:00.000Z",
          },
        }))
      },
    }

    const s = stage(shorten)
    const outcome = await composeChange(s.runtime, s.tree, s.intent)

    console.log("outcome:", outcome.kind)
    console.log("   ", s.events.types().join(" -> "))
    if (outcome.kind !== "applied") return
    console.log("    verdict:", JSON.stringify({
      kind: outcome.disposition.kind, reason: outcome.disposition.reason.code,
    }))
    console.log("    provenance:", JSON.stringify({
      interpreter: outcome.assessment.proposal.provenance.interpreter,
      authoredBy: outcome.assessment.proposal.provenance.authoredBy,
      confidence: outcome.assessment.proposal.provenance.confidence,
    }))
  })
})
// Q1: nothing downstream could tell. Name the two fields of provenance that are
//     the only places the difference is recorded at all, and say which of the
//     two a calibration report has to read and why the other one will not do.
```

**B — where the cut is.** No network, no key, no credential anywhere. Predict
what the interpreter chose for the three request parameters you were not asked
about.

```ts
describe("B", () => {
  it("assembles a whole request and handles a reply, with no network and no key", async () => {
    const m = modelStage(CHANGE_REPLY)
    const result = await m.interpreter.interpret(m.intent, m.tree)

    const [request] = m.client.requests
    if (!request) throw new Error("no request")

    console.log("requests made:", m.client.requests.length)
    console.log("model:", request.model, "| effort:", request.effort,
      "| maxTokens:", request.maxTokens)
    console.log("system prompt:", JSON.stringify(request.system.slice(0, 44) + "..."))
    console.log("system prompt length:", request.system.length)
    console.log("outputSchema top-level keys:", Object.keys(request.outputSchema).join(", "))
    console.log("user message names the tree's own ids:", request.userMessage.includes(m.ids.card))
    console.log("result:", result.ok ? "a proposal" : `err ${result.error.code}`)
  })
})
// Q2: everything printed above was produced without a network or a credential.
//     List what is above this boundary, then say what testing any one of those
//     things would require if `ModelClient` returned a parsed reply instead of
//     text. Then give the general rule for where to cut, in one sentence that
//     does not mention models.
```

**C — who names an inserted node.** Three rows. Predict all three, and predict
the second one *hardest* — write down what you think happens, not what you think
should happen.

```ts
describe("C", () => {
  it("shows who names an inserted node, three ways", async () => {
    const m = modelStage(CHANGE_REPLY)
    const result = await m.interpreter.interpret(m.intent, m.tree)
    if (!result.ok) throw new Error(result.error.code)

    console.log("the model said:  ",
      JSON.stringify(JSON.parse(CHANGE_REPLY).operations[0].node).slice(0, 66) + "...")
    console.log("what materialized:", JSON.stringify(result.value.delta.operations[0]))
    console.log("supplied by the runtime:", JSON.stringify({
      deltaId: result.value.delta.deltaId,
      treeId: result.value.delta.treeId,
      baseRevision: result.value.delta.baseRevision,
      proposalId: result.value.proposalId,
    }))

    /** The same reply, with an id the model chose bolted onto the inserted node. */
    const withId = JSON.parse(CHANGE_REPLY)
    withId.operations[0].node.id = "n_5"
    const forced = await modelStage(JSON.stringify(withId)).interpreter
      .interpret(m.intent, m.tree)
    console.log("model named the node it inserts ->", forced.ok
      ? `a proposal; the node's id is ${JSON.stringify(
          (forced.value.delta.operations[0] as { node: LoomNode }).node.id)}`
      : `err ${forced.error.code}`)

    /** An id the model invented for an existing node it claims to address. */
    const invented = JSON.parse(CHANGE_REPLY)
    invented.operations[0].parentId = "the-main-slot"
    const bad = await modelStage(JSON.stringify(invented)).interpreter
      .interpret(m.intent, m.tree)
    console.log("model invented an existing id  ->",
      bad.ok ? "a proposal" : `err ${bad.error.code}: ${bad.error.detail}`)
  })
})
// Q3: rows two and three both break the same rule from lesson 04 and they do not
//     come out the same way. Say what each one actually did, then say why the
//     difference is not an inconsistency — what is it about row two's violation
//     that makes dropping it sufficient? Then name the one thing row two costs
//     a model that keeps doing it.
```

**D — six answers.** Predict each code. Two of the six are the model answering
*correctly*.

```ts
describe("D", () => {
  it("gives six answers to the same seam", async () => {
    const ops = JSON.parse(CHANGE_REPLY).operations

    const answers = [
      ["not JSON at all   ", "Happy to help! Here are the operations you asked for:"],
      ["JSON, wrong shape ", JSON.stringify({ outcome: "change", rationale: "x", confidence: 0.9 })],
      ["confidence of 4   ", JSON.stringify({
        outcome: "change", rationale: "x", confidence: 4, operations: ops,
      })],
      ["a change of nothing", JSON.stringify({
        outcome: "change", rationale: "x", confidence: 0.9, operations: [],
      })],
      ["understood, no-op ", JSON.stringify({
        outcome: "no-change", rationale: "the headline already says Welcome",
      })],
      ["did not understand", JSON.stringify({ outcome: "not-understood", rationale: "which card?" })],
    ] as const

    for (const [label, reply] of answers) {
      const m = modelStage(reply)
      const result = await m.interpreter.interpret(m.intent, m.tree)
      console.log(label, "->", result.ok ? "a proposal" : result.error.code)
      if (!result.ok) console.log("      ", result.error.detail)
    }
  })
})
// Q4: nothing above threw and nothing above reached the Gate. Two of the six are
//     the model answering correctly rather than failing — name them, and say what
//     it costs to report an answer as an error. Then say which lesson-10 outcome
//     all six of these produce, and what that outcome does not carry.
```

**E — five actors.** Predict every row, and predict the two rows that share an
actor before you look.

```ts
describe("E", () => {
  it("maps every failure onto a code and an actor", async () => {
    const codes = ["unavailable", "rejected", "misconfigured", "refused", "incomplete"] as const

    for (const code of codes) {
      const m = modelStage(err({ code, detail: `<${code}>` }))
      const result = await m.interpreter.interpret(m.intent, m.tree)
      if (result.ok) throw new Error("expected a failure")

      console.log(code.padEnd(14), "->", result.error.code.padEnd(28),
        "->", interpretationFault(result.error))
    }

    console.log("")
    for (const code of ["not-understood", "no-change-needed", "malformed-proposal"] as const) {
      console.log("(no call made)".padEnd(14), "->", code.padEnd(28),
        "->", interpretationFault({ code, detail: "…" }))
    }

    console.log("")
    for (const code of ["interpreter-misconfigured", "interpreter-unavailable"] as const) {
      console.log(describeInterpretationError({ code, detail: "no API key configured" }))
    }
  })
})
// Q5: five actors, seven codes. Two codes share an actor and arrived from
//     opposite directions — find them and say what they have in common that
//     justifies it. Then: a host wants to retry. Say exactly what it writes,
//     using this mapping, and say what it would have got wrong if the seam had
//     handed it a `retryable` boolean instead.
```

**F — what the record can claim.** Two runs, same ask, different answers. Predict
which of the printed fields differ between the runs and which do not, before
running.

```ts
describe("F", () => {
  it("records what a step that will not repeat can still be held to", async () => {
    const other = JSON.parse(CHANGE_REPLY)
    other.operations[0].node.children[0].value = "Something else entirely"
    other.rationale = "a different answer to the same question"
    other.confidence = 0.41

    for (const [label, reply] of [
      ["run one", CHANGE_REPLY],
      ["run two", JSON.stringify(other)],
    ] as const) {
      const m = modelStage(reply)
      const result = await m.interpreter.interpret(m.intent, m.tree)
      if (!result.ok) throw new Error(result.error.code)

      console.log(label, JSON.stringify({
        asked: m.client.requests[0]?.model,
        interpreter: result.value.provenance.interpreter,
        authoredBy: result.value.provenance.authoredBy,
        confidence: result.value.provenance.confidence,
        interpretedAt: result.value.provenance.interpretedAt,
      }))
      console.log("        promptHash:", result.value.provenance.promptHash)
      console.log("        inserted text:", JSON.stringify(
        (result.value.delta.operations[0] as { node: { children: { value: string }[] } })
          .node.children[0]?.value))
    }

    /** The same reply, a different ask. */
    const m = modelStage(CHANGE_REPLY)
    const reworded: EditIntent = { ...m.intent, utterance: "put a second card in the main slot" }
    const result = await m.interpreter.interpret(reworded, m.tree)
    if (!result.ok) throw new Error(result.error.code)
    console.log("a different ask -> promptHash:", result.value.provenance.promptHash)
  })
})
// Q6: two different deltas came back under one hash, and rewording the ask
//     changed it. Say what the hash is therefore a hash *of*, and name the
//     question two records sharing one are able to answer. Then say what a hash
//     of the reply would establish, and why nothing needs it.
```

---

## It could have been otherwise

**The model emits complete `LoomNode`s with ids.** One schema instead of two, and
the reply is already a `TreeDelta`. Rejected: it hands identity to the least
accountable component in the system, and it makes id uniqueness a validation
problem on every single proposal. The sentence that settles it is 0003's — a
model that reused an id it saw in the tree would express "insert" and "collide"
*with the same bytes*.

**The model emits placeholder handles (`$0`, `$1`) that the runtime resolves.**
Rejected as the flat-IR shape 0001 already turned down, arriving through a side
door: correlating handles across operations reintroduces a parallel addressing
scheme that only the interpreter understands.

**Accept model-supplied ids and rewrite them before applying.** Rejected as the
worst of the three: the wire format implies the model chose identity while the
runtime silently overrules it, so a reader of a recorded proposal cannot tell
which ids were real. Hold this one beside exercise C's second row, which is a
much narrower version of the same instinct and is worth arguing about.

**Author the delta against the tree's current revision rather than the intent's.**
Every proposal would then apply cleanly — including proposals answering a
question about a tree that no longer exists. Rejected: it trades a loud failure
for a quiet wrong answer.

**A richer seam that returns a parsed reply.** Predict 2's tempting answer.
Rejected because it moves parsing, validation, and malformed handling below the
boundary, so testing them requires a fake that reimplements them.

**Mock the HTTP layer (`fetch`, `nock`) instead of having a seam at all.**
Rejected: it tests our wire format against our own assumptions about the
vendor's, and couples every test to a transport detail. Note that this is not the
same objection as the previous one, and the difference is worth a minute.

**Import the SDK in the core and export the adapter from the root.** Rejected: it
makes a vendor a hard dependency of every Loom consumer, and puts a network
client in the import graph of a package whose entire point is that its decisions
are pure.

**A `retryable: boolean` on the failure.** The most convenient thing for a caller
and the least honest thing for the seam. See above; and note that it is
*arguable* for exactly one of the codes, which is the tell.

**One `rejected` code, no `misconfigured`.** Simpler, and it would have fixed the
defect 0040 was written for. Rejected because the two demand different people: a
rejection is a bug report for whoever maintains Loom, a misconfiguration is a task
for whoever runs this deployment — and collapsing them leaves the keyless portal
still telling a reviewer to try again at something that will never work.

**Classify by the vendor's own error `type` field rather than by HTTP status.**
More precise where present — it separates a billing error from a permission
error, both 403 — but it is vendor vocabulary in the one module whose job is to
translate *out* of vendor vocabulary, and it is absent on transport failures.

**Record and replay real API responses, VCR-style.** Not rejected outright; not
chosen for now. Hand-written fixtures are clearer about what each one tests, and
a cassette recorded once tends to become the only shape anyone ever tests
against.

---

## Explain it back

Closed book.

1. Explain to somebody who has written the four-line version why their
   `Promise<TreeDelta>` cannot be fixed by validating what comes back. Do not use
   the words "seam" or "boundary". Get to the concrete thing about `TreeDelta`
   that makes it the wrong return type.

2. **Derive it from lesson 04.** Lesson 04 said a model may not name the nodes it
   inserts, and gave you a reason. Show that this lesson is that reason being
   *enforced structurally* rather than restated — then name the check in
   `applyDelta` that still exists, and say what it is now guarding against
   instead.

3. **Derive it from lesson 05.** Lesson 05 said a decision worth auditing is one
   you can re-derive from what was recorded. This step cannot be re-derived. Say
   what the seam does instead, name the field that carries the most weight in
   that substitution, and then say what somebody comparing two records of the
   same ask is actually able to establish — and what they are not.

4. Find a system you use that calls something non-deterministic — a spam filter,
   a fraud check, a ranking, a recommendation. What does it record about the
   call? Could you tell, from its records, whether two decisions were made about
   the same question? If not, say what it would have had to store, and check that
   against this lesson's table.

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
rating is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. `ChangeInterpreter` returns `Result<ProposedChange, InterpretationError>` and
   not `Result<TreeDelta, …>`. Give both reasons — one is about identity and one
   is about what else a proposal carries.

2. Say why `ModelClient` returns text rather than a parsed reply, in terms of
   what would otherwise have to exist in the test suite. Then give the general
   rule for where to put the boundary, without mentioning models.

3. Name the five actors. Then give the rule for which one an unrecognised HTTP
   status falls to, and the argument for that direction rather than the other.

4. A `retryable: boolean` would be true, false, false, and arguable across four
   of the codes. Name the arguable one, say why it is arguable, and say what that
   single case proves about putting the boolean on the seam at all.

5. Two proposals carry the same `promptHash` and different deltas. Say what that
   pair establishes and what it does not. Then say which *other* provenance field
   a calibration report needs before it may count either of them.

---

## Reflect

- Predict 1 asked for a number. Score it twice: once against the seven
  `InterpretationError` codes, and once against the thing that is not a failure
  at all — the return type being unreachable. Most lists get some of the first
  and none of the second, and the second is the lesson.
- Predict 2 asked where the line goes. If you drew it above parsing, notice that
  the argument against you is not about elegance: it is that your tests would
  have asserted your fake agrees with your fake.
- Predict 3 is this lesson's calibration question. If you wrote **yes** to
  `retryable` with confidence 4 or 5, that pair goes in your tracking table. It
  is the most instructive kind of wrong: not a gap in knowledge, but a helpful
  instinct that quietly moves a decision to the component least equipped to make
  it.
- Look back at lesson 10's exercise F, where a runtime with no repairer could not
  repair. You now know that `modelInterpreter` implements the repairer interface
  anyway. Say in one sentence why those two facts are not in tension — and notice
  that you could not have said it two lessons ago.

---

## Come back to this

- **In 2 days:** Self-check 1 and 4, closed book.
- **In 1 week:** Write the five actors from memory, then beside each write one
  code that maps to it and one sentence a host could show a person. Then say
  which actor you would page at 3am and which you would not.
- **In 1 month:** Redo exercise C from memory — predict all three rows — then do
  what the exercise does not: write the fourth row you would add, for a model
  that addressed an existing node by a *well-formed id that is not in this tree*,
  and say which layer catches it and at which of lesson 10's outcomes.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0003`](../decisions/0003-ai-drafts-the-runtime-names.md) — the draft, and why the runtime names what it creates
- [`decisions/0005`](../decisions/0005-model-access-is-an-optional-adapter.md) — the two cuts, the optional adapter, and the one test that may touch the network
- [`decisions/0040`](../decisions/0040-a-failure-names-the-actor-who-must-clear-it.md) — five codes, five actors, and the regex that proved the type was wrong
- [`decisions/0057`](../decisions/0057-a-preset-is-a-deterministic-interpreter.md) — the seam is about non-determinism, not about models
- [`decisions/0014`](../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md) — why props cross as a JSON string, which lesson 12 takes
- Next: [12 — Projection](12-projection.md)

---

## Answers

**Q1** An interpreter with no model in it:

```
outcome: applied
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> change-applied
    verdict: {"kind":"accepted","reason":"within-policy"}
    provenance: {"interpreter":"loom/shorten-preset","authoredBy":"runtime","confidence":1}
```

The full stream, the ordinary verdict, the ordinary apply. `assessChange` walked
the delta, the Gate judged it, `applyDelta` applied it, and not one of them
consulted anything about where the delta came from.

The two fields that record the difference at all are **`interpreter`** and
**`authoredBy`**, and a calibration report has to read `authoredBy`. `interpreter`
is a free string a host chooses — `loom/shorten-preset` here, a model id when a
model answered — so reading it means keeping a list of names that are known not
to be models, and that list is wrong the moment somebody writes a fourth
deterministic interpreter and does not update it. `authoredBy` is two values and
the type obliges whoever writes the next interpreter to pick one.

Why calibration cares at all: `confidence: 1` here is arithmetic, not a guess.
The function did not estimate that it satisfied the intent; it computed the
change. Counting that as a model's perfect self-grade would flatter the
calibration curve with a number nobody graded (0031, 0057).

**Q2** Where the cut is:

```
requests made: 1
model: claude-opus-5 | effort: high | maxTokens: 16000
system prompt: "You translate a request about a user interfa..."
system prompt length: 2816
outputSchema top-level keys: anyOf
user message names the tree's own ids: true
result: a proposal
```

Above the boundary and exercised by that run, with no network and no key: the
model default, the effort default, the token ceiling, the system prompt, the
whole rendered tree in the user message, the emitted JSON Schema, the JSON parse,
the schema validation, the three-way outcome, materialization and its id minting,
the delta parse, the prompt hash, and every field of provenance.

If `ModelClient` returned a parsed `InterpretationReply` instead of text, then
testing "a reply that is not JSON" would require a fake that *fails to parse
JSON* — that is, a fake that reimplements the thing under test, and then asserts
that the two agree. The same goes for schema violations, truncation, and
everything else in exercise D.

The general rule: **cut below the impurity, not below the thing you want to
replace.** Only one step here cannot be a function of its inputs. Everything else
was impure by association, and a boundary drawn around the association takes all
of it into the dark.

Two details worth having noticed. `effort: high` and `claude-opus-5` are 0005's
deliberate defaults, not caution — interpretation is per intent rather than per
render, and the failure mode of a weaker interpreter is a confidently wrong
delta. And `system` is a *constant*: the same 2816 bytes for every intent and
every tree, which is what puts it at the front of the request where a cache can
hold it, and what makes "what were we asking the model to do" answerable by
reading one string.

**Q3** Who names an inserted node:

```
the model said:   {"kind":"element","type":"loom.card","props":"{\"variant\":\"outli...
what materialized: {"op":"insert","parentId":"n_5","index":1,"node":{"kind":"element","id":"n_m2","type":"loom.card","props":{"variant":"outlined"},"children":[{"kind":"text","id":"n_m1","value":"Second"}]}}
supplied by the runtime: {"deltaId":"d_m1","treeId":"t_1","baseRevision":0,"proposalId":"p_m1"}
model named the node it inserts -> a proposal; the node's id is "n_m2"
model invented an existing id  -> err malformed-proposal: operations.0.parentId: Invalid
```

Row one is the ordinary case. The model sent a node with no id and a props
*string*; what came out has `n_m2` on the card, `n_m1` on the text inside it, and
props parsed into a real object. Note the child was named before its parent —
the same construction order lesson 04 made you look at, showing up in freshly
minted ids too. Everything in the third line was supplied by the runtime and none
of it was in the reply.

Row two: the model bolted `"id": "n_5"` onto the node it was inserting — the id
of the main slot, so a collision if it had been honoured. It was **not**
honoured, and it was also **not refused**. The draft schema has no `id` field on
a node, so the extra key was dropped during validation and the node got `n_m2`,
exactly as if the model had never said it.

Row three: the model addressed an existing node as `the-main-slot`. That fails
`nodeIdSchema` and comes back `malformed-proposal`.

Why the difference is not an inconsistency: **the two violations differ in
whether ignoring them can produce a wrong answer.** In row two the model
volunteered a value for a field the runtime owns outright — drop it and what
remains is exactly the change the model described, correctly named. In row three
the id is the model's *only* way of saying which node it means; there is no
correct interpretation to fall back on, and guessing would be inventing an
instruction. So one is dropped and one is refused, and the rule underneath is
that a field the runtime owns can be safely ignored while a field the model owns
cannot.

What row two costs: **a model that keeps supplying ids never finds out.** There
is no signal, no telemetry, and nothing in the reply to notice. In practice the
emitted JSON Schema sets `additionalProperties: false`, so a grammar-constrained
model cannot emit that key at all and row two is only reachable through a client
that does not enforce the schema. It is worth knowing which of those two things
is protecting you.

**Q4** Six answers:

```
not JSON at all    -> malformed-proposal
       reply was not valid JSON
JSON, wrong shape  -> malformed-proposal
       operations: Required
confidence of 4    -> malformed-proposal
       confidence: Number must be less than or equal to 1
a change of nothing -> malformed-proposal
       operations: Array must contain at least 1 element(s)
understood, no-op  -> no-change-needed
       the headline already says Welcome
did not understand -> not-understood
       which card?
```

Six answers, no exceptions, no proposals. Every detail is a sentence, because a
code alone would not have been debuggable — and note that the middle four came
from four different places: `JSON.parse`, the discriminated union, a field
constraint, and a minimum length.

The two that are the model answering correctly are **`no-change-needed`** and
**`not-understood`**. 0003 is explicit that these are *answers, not failures to
answer*: "I understood you and the tree already satisfies this" is a correct
response to a well-formed question, and so is "that is ambiguous". They travel as
`InterpretationError` because the seam's success type is a proposal and neither
of them is one — which is a cost, not a free choice. What it costs is that a
naive rate of "interpretation errors" mixes the interpreter working perfectly
with the interpreter breaking, and lesson 10's `interpretationFault` is what
recovers the distinction: both of these are `asker`, and none of the other five
is.

All six produce lesson 10's **`not-interpreted`**, which carries no assessment
and no disposition — because nothing was measured and nothing was judged. That is
the property this module creates, and lesson 10 only got to observe.

**Q5** Five actors:

```
unavailable    -> interpreter-unavailable      -> provider
rejected       -> interpreter-request-rejected -> runtime
misconfigured  -> interpreter-misconfigured    -> deployment
refused        -> refused                      -> model
incomplete     -> malformed-proposal           -> model

(no call made) -> not-understood               -> asker
(no call made) -> no-change-needed             -> asker
(no call made) -> malformed-proposal           -> model

this deployment cannot reach a model until an operator changes that: no API key configured
the model could not be reached, and may answer later: no API key configured
```

Note first that `incomplete` does not survive under its own name: a truncated
reply becomes `malformed-proposal`, because a cut-off answer is a *malformed*
reply rather than a missing one (0005). So one of the seven codes is reachable
from two directions — a reply the provider cut off, and a reply this module could
not parse — and two of the seven are never reachable through a client call at
all.

The two that share an actor from opposite directions are **`refused`** (the model
declined the content) and **`malformed-proposal`** (the reply could not be used).
One is the model choosing not to answer and the other is the model answering
badly, and they are one actor because the question is not *what went wrong*, it
is *who would have to do something differently*: in both cases the answer that
came back is the problem, and what would change the outcome is a different
answer — a resample, a different model, a different prompt. Nothing about the
provider, the deployment, or the asker is implicated by either.

What a host writes to retry:

```ts
if (interpretationFault(error) === "provider") schedule(retry)
```

One phrase, and the host owns the policy that phrase encodes.

With a `retryable` boolean instead, the host would have got `malformed-proposal`
handed to it pre-judged. Whichever way the seam had set it, someone is wrong: set
it `true` and a host that wants exactly the policy above starts resampling model
errors it never meant to pay for; set it `false` and a host that would happily
resample a garbled reply — a completely reasonable policy, and arguably the best
use of a retry in this whole list — is told not to bother. The seam has no way to
know which host it is talking to. **One genuinely arguable case out of five is
enough to disqualify the field**, because a boolean has no way to express "it
depends on what you are trying to do", which is the true answer.

The last two lines are `describeInterpretationError` on the same underlying
situation classified two ways, and they are worth reading side by side. Both say
what happens *if nothing changes* — one will never work, one might — which is the
part a code alone never carried. The second sentence is what the portal used to
print for a deployment with no key, and it was a lie that sent reviewers back to
click again.

**Q6** What the record can claim:

```
run one {"asked":"claude-opus-5","interpreter":"claude-opus-5-20260601","authoredBy":"model","confidence":0.82,"interpretedAt":"2026-07-28T00:00:00.000Z"}
        promptHash: 3c80f6a4610ae8397e18b9eaf77bf0be692ecd999c69e5ec1a55151815d7035c
        inserted text: "Second"
run two {"asked":"claude-opus-5","interpreter":"claude-opus-5-20260601","authoredBy":"model","confidence":0.41,"interpretedAt":"2026-07-28T00:00:00.000Z"}
        promptHash: 3c80f6a4610ae8397e18b9eaf77bf0be692ecd999c69e5ec1a55151815d7035c
        inserted text: "Something else entirely"
a different ask -> promptHash: 942813252b2e572ece0698bd06e9eea4fabaf2018ec7fdf3a6bb8c139651b8ea
```

Two different deltas, two different confidences, one hash. Reword the ask and the
hash moves.

So the hash is a hash of **what was sent** — the system prompt and the user
message, and therefore the tree and the utterance — and of nothing that came
back. What two records sharing one can answer is: *were these two answers to the
same question, asked of the same tree?* Which is precisely the fact you need
before comparing two answers at all. Without it, "the model gave a different
answer" and "somebody asked a different thing" are indistinguishable, and a
disagreement between two records means nothing.

A hash of the reply would establish that a model said the same thing twice.
Nothing needs to know that: if two replies are identical their deltas are already
identical and the records already say so, and if they differ the hash tells you
only what comparing them told you.

The other thing this run shows in one line: **`asked` and `interpreter` are not
the same value.** The request went out for `claude-opus-5` and the record says
`claude-opus-5-20260601`, because `interpreter` is `completion.servedBy` — what
actually answered, not what was requested. A deployment reading its own config to
find out which model authored last Tuesday's change would be reading its
assumption; the provenance is reading the answer.

And note what is *not* in any of it: the utterance, the tree, the prompt. The
hash is there so provenance can carry no user content and still identify the ask.
`interpretedAt` is the injected clock (lesson 05), which is why it is the same
string in both runs and why a replayed run reproduces it.
