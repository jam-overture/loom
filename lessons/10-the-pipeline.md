# 10 — The pipeline: a sequence that can stop

**After this lesson you will be able to** name the stages in order and say what
each one is forbidden to do, give the two shapes an outcome can have and say why
one of them carries no verdict, explain why a held change is judged twice and
what the second judgment is allowed to overturn, say what "resolved once" means
when a change is decided on two separate occasions, and predict what happens when
the Gate holds the same change a second time.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md).

This lesson closes Part II. It is the one that puts the other five in a line.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Name the property that puts a field on `CompositionRuntime`. Then name one
   thing the runtime calls that fails the test. (L05)
2. Name the three Gate outcomes, and give the test for whether a fourth belongs.
   (L09)
3. `analyzeDelta` takes a tree and a delta. `assessStakes` takes an analysis and
   a policy. Neither takes both. What does that symmetry buy a person reading a
   year of records? (L07)
4. What does `baseRevision` protect against? (L03)
5. Undoing a `remove` costs something that undoing an `insert` does not. Say
   what. (L06)

Question 2 is the one this lesson takes apart. You have known since lesson 09
that the middle outcome means *show a person*. This lesson is about the fact that
the person is not here.

---

## Predict

In writing, before reading on.

> 1. Write the signature of the function that turns an intent into a changed
>    tree. Just the signature. Now write down what it returns when the Gate says
>    a person should look at this first. Do not fix it — write down what your
>    signature *obliges* you to return there, and say in one sentence what is
>    dishonest about it.
>
> 2. A change was held for a person to look at. Forty minutes later they say yes.
>    Five things existed at the moment of the hold: the proposal, the tree it was
>    judged against, the policy that judged it, the measurements taken of it, and
>    the verdict. For each one, write **reuse** or **recompute**, and one line of
>    justification. Commit to all five before reading on; a partial answer here
>    is worth less than a wrong one.
>
> 3. The second look re-runs the Gate. The Gate returns *a person should look at
>    this first* — again, for the same reason as before. Write down what your
>    system does next, and then write down how many different answers you can
>    think of that a reasonable person might defend.

Question 2 is the lesson. Question 3 is the one most people get wrong, and it is
worth noticing *how confident* you were before you find out.

---

## The problem

You have every part. Lesson 03 gave you a delta that applies atomically. Lesson
05 made the impure things into seams. Lesson 07 measures a change without judging
it. Lesson 09 judges it without measuring it. Nothing is missing.

So write the function that runs them.

```ts
const compose = async (runtime, tree, intent): Promise<LoomTree> => {
  const proposal = await runtime.interpreter.interpret(intent, tree)
  const assessment = assessChange(tree, proposal, policy)
  const disposition = gate(assessment, policy)

  return applyDelta(tree, proposal.delta)
}
```

Six lines, and the shape is right — each stage hands its output to the next, and
the orchestrator itself decides nothing. Now watch it fail, three times, in
ascending order of how much the failure costs you.

**It cannot say no.** `gate` returned a disposition and the code ignored it. Fix
that and the return type is wrong: sometimes there is no new tree. You reach for
`Result<LoomTree, …>` and it works, and this is the cheap problem.

**It cannot say "I did not understand you".** The interpreter can fail, and so
can the assessment — a delta naming a node that is not there does not *apply*,
which is not the same as being *refused*. Lesson 07 already made you tell those
apart in the journal. Now the type has to carry the distinction, because a caller
that treats "the model did not understand" as "the policy said no" will retry the
one that will never succeed and give up on the one that would.

Both of those are shapes of failure, and shapes of failure are solvable by
widening a union. Then there is the third one.

**It cannot say "ask Jonathan".**

There is no value of `LoomTree` that means *a person should look at this*. There
is no value of `Result<LoomTree, TreeError>` that means it either. And you cannot
solve it the way you solve everything else asynchronous, by awaiting — because
the person is not late, they are *elsewhere*. They arrive in a different request,
in a different process, from a browser that was not open when the change was
proposed, possibly tomorrow. Nothing in this call stack can wait for them,
because by the time they answer, this call stack does not exist.

So the function has to be able to stop. Not fail, not block: **stop, having
decided something, with the change still pending.** And then something else has
to be able to pick it up.

Which is where the interesting question is, and it is not "how do I store the
proposal". Storing it is easy. The question is what a stored decision is still
worth when it is taken out of storage:

> **A verdict was reached about a specific tree, under a specific policy, using
> measurements taken at a specific moment. An hour later, none of those three is
> guaranteed to still hold. What does the second half of the pipeline have to
> redo — and what does redoing it mean for the person who already said yes?**

---

## The idea

> **The pipeline is a sequence with a gap in it. `composeChange` runs it up to
> the gap; `confirmChange` is a second entry, not a continuation. Everything the
> second entry redoes, it redoes because "resume" is not a thing you can honestly
> do to a decision.**

### The orchestrator does nothing

Before the interesting half, the boring half, because it is the payoff of five
lessons.

Read `pipeline.ts` looking for a decision it makes. There is one loop-free
sequence of calls, a `switch` on the Gate's three kinds, and an `if` for the
repairer. Interpretation belongs to the interpreter, measurement to
`analyzeDelta`, judgment to `gate`, structural change to `applyDelta`. This
module sequences them, emits events, and turns what comes back into something a
caller can act on.

That is why the module is 300 lines and testable without a model, a clock, a
database, or a network. Exercise A runs the whole pipeline five times, five
different ways, and nothing in it is real except the tree.

The one thing the orchestrator *does* own is the order. Which is not nothing:
the order is where the two interesting choices live, and both are below.

### Five outcomes, and only three of them are verdicts

```ts
type CompositionOutcome =
  | { kind: "applied";               assessment; disposition; tree; inverse }
  | { kind: "awaiting-confirmation"; assessment; disposition }
  | { kind: "rejected";              assessment; disposition }
  | { kind: "not-interpreted";  error: InterpretationError }
  | { kind: "not-applicable";   proposal; error: TreeError }
```

Look at what the bottom two do not have. No `disposition`. No `assessment`. Not
because they were omitted for brevity — **because they do not exist.** A change
that was never interpreted was never measured and never judged. A delta that does
not apply cannot be measured, so the Gate never saw it.

This is lesson 07's separation arriving as a type. Lesson 07 asked you which of
two `Result` failures is a refusal and which is not; here you cannot get it wrong,
because the outcome that would let you conflate them does not typecheck. A caller
holding a `not-applicable` has no disposition to misread as a refusal, and a
monthly report that counts refusals cannot accidentally sweep in interpreter
bugs.

Note also which side of the line the failures fall on, and why the naming is
careful. `not-interpreted` is a fact about the ask. `not-applicable` is a fact
about the delta — 0006 calls it an interpreter bug, and the repairer is
deliberately not offered it, because there is nothing about the policy to work
around.

### The standard is chosen before the answer exists

The very first thing `composeChange` does after announcing the intent is resolve
the policy — **before interpretation**, before there is a proposal to look at.

```ts
const policy = runtime.policySource.resolve({ tree, intent })
emit({ type: "policy-resolved", intentId: intent.intentId, policy })

const interpreted = await runtime.interpreter.interpret(intent, tree)
```

`PolicyContext` is `{ tree, intent }` and nothing else. The source *cannot* see
the proposal, and that is a property of the type rather than a rule someone has
to follow.

The reason is worth stating in the general form, because it is a trap that is
easy to build and hard to detect. If the thing that chooses the standard can see
the answer, then it can choose a lenient standard in response to an answer the
strict one would have refused — and the refusal rate stays healthy while
measuring nothing at all. Who is asking, and about what, chooses the standard.
What comes back is then judged by it.

Resolution is also synchronous and pure. A source that awaited a network lookup
would make every decision unreproducible: a replay cannot re-fetch what the
original run fetched, and lesson 05's whole argument was that a decision you
cannot re-derive is not an audit trail. A host whose policy lives in a database
loads it before entering the write path and closes over it.

### The gap

```ts
case "requires-confirmation":
  return { kind: "awaiting-confirmation", assessment, disposition }
```

That is the whole of the pause, in the orchestrator. No tree comes back — there
is no new tree, nothing was applied. What comes back is the assessment and the
verdict, which is exactly what a person needs to answer the question.

What is *not* here is where the proposal goes. `composeChange` hands it to its
caller and forgets it. Custody is the layer above's job (`src/write/commit.ts`,
and lesson 16), and it is separate for a reason worth carrying: the composition
runtime is a function of a tree it was handed. Give it a store and every test of
it needs a store, and §2 acquires a persistence dependency to support one of five
outcomes.

The thing to take from the gap right now is smaller and sharper: **the pipeline
returns without an answer, and the answer arrives through a different door.**

### Resume is not a thing you can do

Here is the door. `confirmChange` takes a runtime, a tree, the proposal, and the
intent — and look at what it does with them:

```ts
const policy = runtime.policySource.resolve({ tree, intent })   // again
const assessed = assessChange(tree, proposal, policy, …)        // again
const disposition = gate(assessment, policy)                    // again
```

Three of the four stages run a second time. Only the proposal is reused.

Set your Predict 2 answers beside that and see how you did. The argument for each
is the same argument in three costumes, and it is this: **a stored decision is a
record of what was true then, and the question being asked now is about now.**

- **The proposal is reused**, and this one is not a detail. Re-interpreting the
  utterance would produce a *different delta* — the reviewer would be confirming
  something that did not exist when they read the rationale. A review queue whose
  subject can change between the reading and the clicking is not a review queue.
  That is 0021, and it is the reason a `HoldStore` exists at all.

- **The tree is recomputed against**, because it is passed in fresh. The
  assessment that reaches the Gate the second time measures the delta against the
  tree as it stands, not as it stood.

- **The policy is resolved again**, deliberately. A host that narrowed its policy
  while a proposal sat in the queue meant that for the queue too.

- **The measurements are recomputed**, because they are measurements *of* the
  delta *against* a tree, and the tree is the new one.

- **The verdict is recomputed**, and this is the one with teeth:

> **A human saying yes is permission to proceed. It is not permission to skip the
> check.**

Exercise C is that sentence as three lines of output. The same held proposal,
answered under a policy that has since been tightened, is **refused** — with a
human saying yes, at the moment they said it.

### One resolution per occasion, not per call

Now the part that looks like an inconsistency and is the actual design.

`composeChange` resolves the policy **exactly once**, and reuses it for a repair.
`confirmChange` resolves it **again**. Both of those are the same rule, and the
rule is not "once per call" or "once per proposal":

> **The policy is settled once per *occasion of judgment*. A repair is the same
> occasion; a confirmation is a new one.**

A repair (0006, and lesson 13) exists to be *comparable to the proposal it
replaces* — that comparison is the entire point of recording both halves. Judge
the repair under a freshly resolved policy and the pair stops being a comparison:
you no longer know whether the second one got through because it was smaller or
because the standard moved.

A confirmation is not a comparison. It is a fresh question — *may this happen,
now?* — asked on a different day, by a different person, about a tree that has
moved on. Reusing the old policy there would answer a question nobody asked.

Exercise B counts the resolutions. Predict all three numbers before running; the
middle one is where people are wrong.

### The Gate's second look, and the one thing it may do

You know the second look re-runs the Gate. So what happens when the Gate, on the
second look, says `requires-confirmation` again?

```ts
if (disposition.kind === "rejected") {
  return { kind: "rejected", assessment, disposition }
}

return applyAssessedChange(runtime, tree, assessment, disposition)
```

**It applies.** Only `rejected` blocks.

Predict 3 asked you for this, and if you wrote "hold it again", notice that you
were describing an infinite queue: the condition that produced the hold has not
changed, so a second hold produces a third, and the person answers the same
question forever. If you wrote "error", notice that you were treating a correct
verdict as a malfunction.

The right way to read it is that the two verdicts are answers to two different
questions. The first look asked *may this be applied without asking anyone?* and
answered no. The second look asks *may this be applied at all?* — because the
asking has already happened — and `requires-confirmation` is not a no. Only a
refusal is a no, and a refusal survives a human's yes because a refusal is the
Gate saying the change is out of bounds regardless of who wants it.

`ConfirmationOutcome` says this in the type: it is `CompositionOutcome` narrowed
to `applied | rejected | not-applicable`. There is no `awaiting-confirmation` in
it. **A change the Gate holds a second time is not offered a third.**

Exercise D is the consequence, and it is the sort of thing that looks like a bug
in a log until you have this lesson: a change that was applied, carrying a
disposition whose kind is `requires-confirmation`. That record is correct and it
is more informative than an `accepted` would have been — it says *this was
applied, and here is why somebody had to allow it.*

### The revision check is last, not first

One more thing the sequence gets to decide: where the staleness check goes.

A hold names the revision it was judged against. If the tree has moved since,
the delta cannot apply — `applyDelta` checks `delta.baseRevision` against
`tree.revision` and refuses (lesson 03). So a confirmation that arrives after
somebody else wrote to the tree comes back `not-applicable` with
`revision-mismatch`.

It comes back that way from the *last* stage. Exercise E prints the event stream
and the change is assessed and judged first, and only then fails to apply. That
ordering is not an accident of where the check happens to live: `applyDelta` is
the one function that must never produce a half-applied tree, so the check that
protects the tree lives with the thing that touches it (lesson 03's atomicity,
arriving here as placement).

There is a cost to putting it there, and exercise E is built to show it rather
than tell it. Look at what the assessment measured.

The layer above closes this: `confirmHeld` reads head and compares it to the
hold's revision *before* calling `confirmChange` at all, and a hold whose tree has
moved is released rather than left in the queue — it is dead, not stale, because
its delta names a base revision that is now in the past. So the ordering below is
a second line of defence, and exercise E is reaching past the supported door to
look at it. Which is the useful thing to do to a second line of defence.

### Where this sits

`composeChange` is not the whole write path, and it is worth knowing the shape of
the layer above before you go looking for the log in `pipeline.ts` and fail to
find it.

| | `composeChange` / `confirmChange` | `commitIntent` / `confirmHeld` |
| --- | --- | --- |
| Owns | may this happen | it happened |
| Touches | a tree it was handed | the store, the hold store |
| Async because | one model call | IO |
| Lesson | this one | 16 |

The rule that binds them is 0017: **`store.append` is reachable only through this
path.** A gate you can go around is a suggestion, so there is exactly one door,
and direct manipulation in the portal — dragging a node, editing text inline —
goes through it too, as an intent whose delta is already known and whose origin is
`developer`.

---

## In the code

| What | Where |
| --- | --- |
| The sequence, the gap, and the second entry | [`src/runtime/pipeline.ts`](../src/runtime/pipeline.ts) |
| The five seams a runtime is assembled from | `CompositionRuntime`, same file |
| Which policy judges a given change, and what it may not see | [`src/runtime/policy-source.ts`](../src/runtime/policy-source.ts) |
| Every stage, including the ones that fail | [`src/runtime/events.ts`](../src/runtime/events.ts) |
| The one door an event leaves through | [`src/runtime/narration.ts`](../src/runtime/narration.ts) |
| The layer above: head check, custody, the log | [`src/write/commit.ts`](../src/write/commit.ts) |
| Where a held proposal lives between the offer and the answer | [`src/write/held.ts`](../src/write/held.ts) |
| The sequencing tests | [`src/runtime/pipeline.test.ts`](../src/runtime/pipeline.test.ts) |

---

## Try it

Predict every output in writing before running anything. The event streams in A,
C and E are the point of those exercises — predict the arrows, not just the
outcome word.

Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory } from "./ids.js"
import { err, ok } from "./result.js"
import type { EditIntent, IntentOrigin } from "./runtime/intent.js"
import type { InterpretationError } from "./runtime/interpreter.js"
import { composeChange, confirmChange, type CompositionRuntime } from "./runtime/pipeline.js"
import { fixedPolicy, type PolicySource } from "./runtime/policy-source.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import {
  buildIntent, buildProposal, collectingEventSink, fixedClock,
  scriptedInterpreter, scriptedRepairer,
  type CollectingEventSink, type RecordingRepairer,
} from "./testing/doubles.js"
import { sampleTree, type SampleTree } from "./testing/fixtures.js"
import { applyDelta } from "./tree/apply.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"

const spare = sequentialIdFactory("x")

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
 * A whole runtime with every seam scripted: a tree, an ask about it, and the
 * proposal the interpreter will answer with. Nothing here is a model.
 */
const stage = (options: {
  readonly ops: Ops
  readonly origin?: IntentOrigin
  readonly confidence?: number
  readonly policy?: GatePolicy
  readonly policySource?: PolicySource
  /** Make the interpreter fail instead of proposing. */
  readonly interpretation?: InterpretationError
  /** Wire in a repairer that offers these operations instead. */
  readonly repairWith?: Ops
}): Stage => {
  const { tree, ids } = sampleTree()
  const intent = buildIntent(spare, { treeId: tree.treeId, baseRevision: tree.revision })

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
  const repairer = options.repairWith
    ? scriptedRepairer(ok(proposalOf(options.repairWith, 0.95)))
    : undefined
  const events = collectingEventSink()

  return {
    runtime: {
      interpreter: scriptedInterpreter(
        options.interpretation ? err(options.interpretation) : ok(proposal)
      ),
      policySource: options.policySource ?? fixedPolicy(options.policy ?? defaultGatePolicy),
      events,
      clock: fixedClock(),
      idFactory: spare,
      ...(repairer ? { repairer } : {}),
    },
    events, tree, ids, intent, proposal,
    ...(repairer ? { repairer } : {}),
  }
}

/** A policy source that answers the same way every time and counts being asked. */
const counting = (policy: GatePolicy) => {
  const calls: string[] = []

  return {
    calls,
    source: { resolve: ({ intent }) => (calls.push(intent.intentId), policy) } as PolicySource,
  }
}

/** Deep, small, reversible. Nothing objects to this one. */
const tweak: Ops = (ids) => [
  { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
]
/** The whole main slot and the card inside it. */
const removeSlot: Ops = (ids) => [{ op: "remove", nodeId: ids.main }]
```

**A — the sequence, from outside.** Five runs of one pipeline. Write down all
five event streams before running. The last two are the ones to be careful about:
count the arrows, and say for each stream which stage is the one that never ran.

```ts
describe("A", () => {
  it("shows the sequence from outside, five times", async () => {
    const ghost: Ops = () => [{ op: "remove", nodeId: "n_999" } as unknown as TreeOperation]

    const runs = [
      ["accepted       ", stage({ ops: tweak })],
      ["held           ", stage({ ops: removeSlot, origin: "system-signal" })],
      ["rejected       ", stage({ ops: tweak, confidence: 0.1 })],
      ["not-interpreted",
        stage({ ops: tweak, interpretation: { code: "not-understood", detail: "which card?" } })],
      ["not-applicable ", stage({ ops: ghost })],
    ] as const

    for (const [label, s] of runs) {
      const outcome = await composeChange(s.runtime, s.tree, s.intent)
      console.log(label, `-> ${outcome.kind}`)
      console.log("   ", s.events.types().join(" -> "))
    }
  })
})
// Q1: two of the five streams are the same length and mean opposite things.
//     Name them, and say what a reader has to look at to tell them apart. Then:
//     one event fires in all five streams that a reader might expect to fire in
//     only three. Say which, and give the argument for emitting it on a change
//     that never reached a verdict.
```

**B — where the policy is settled.** Three numbers. Predict all three; the middle
one is the one to commit to hardest.

```ts
describe("B", () => {
  it("counts how often the policy is settled", async () => {
    const plain = counting(defaultGatePolicy)
    const a = stage({ ops: tweak, policySource: plain.source })
    console.log("accepted outright:      ",
      (await composeChange(a.runtime, a.tree, a.intent)).kind, "| resolved", plain.calls.length)

    const withRepair = counting(defaultGatePolicy)
    const b = stage({
      ops: tweak, confidence: 0.1, repairWith: tweak, policySource: withRepair.source,
    })
    const repaired = await composeChange(b.runtime, b.tree, b.intent)
    console.log("refused, then repaired: ", repaired.kind, "| resolved", withRepair.calls.length)
    console.log("   ", b.events.types().join(" -> "))

    const held = counting(defaultGatePolicy)
    const c = stage({ ops: removeSlot, origin: "system-signal", policySource: held.source })
    const first = await composeChange(c.runtime, c.tree, c.intent)
    const afterCompose = held.calls.length
    const second = confirmChange(c.runtime, c.tree, c.proposal, c.intent)
    console.log("held, then confirmed:   ", `${first.kind} then ${second.kind}`,
      "| resolved", afterCompose, "then", held.calls.length - afterCompose)
  })
})
// Q2: two proposals were judged in run two and one policy was resolved. Two
//     proposals were judged across runs three's two calls and two policies were
//     resolved. State the rule that produces both numbers — it is one rule, and
//     it is not "once per call". Then say what run two would lose if it resolved
//     twice, in terms of a question somebody asks of the record later.
```

**C — the second look.** One held proposal, answered three times under three
policies. Predict all three outcomes and all three reason codes. The first row is
the one worth being slow about.

```ts
describe("C", () => {
  it("answers one held proposal under three policies", async () => {
    const held = stage({ ops: removeSlot, origin: "system-signal" })
    const first = await composeChange(held.runtime, held.tree, held.intent)
    if (first.kind !== "awaiting-confirmation") throw new Error(first.kind)
    console.log("the hold:      ", JSON.stringify({
      kind: first.disposition.kind,
      reason: first.disposition.reason.code,
      stakes: first.disposition.stakes,
    }))

    const policies = [
      ["unchanged  ", defaultGatePolicy],
      ["tightened  ", gatePolicySchema.parse({ policyId: "tightened", refusalFloor: "medium" })],
      ["loosened   ", gatePolicySchema.parse({
        policyId: "loosened", autoApplyCeiling: { "system-signal": "critical" },
      })],
    ] as const

    for (const [label, policy] of policies) {
      const events = collectingEventSink()
      const runtime: CompositionRuntime = {
        ...held.runtime, events, policySource: fixedPolicy(policy),
      }
      const outcome = confirmChange(runtime, held.tree, held.proposal, held.intent)
      console.log(label, JSON.stringify({
        outcome: outcome.kind,
        verdict: outcome.kind === "not-applicable" ? outcome.error.code : outcome.disposition.kind,
        reason: outcome.kind === "not-applicable" ? "-" : outcome.disposition.reason.code,
      }))
      console.log("   ", events.types().join(" -> "))
    }
  })
})
// Q3: in row one the Gate returned the same verdict it returned an hour ago and
//     the change was applied anyway. Say why that is not the Gate being ignored.
//     In row two a human said yes and the change did not happen. Say which of
//     those two rows you would find harder to explain to the person who clicked,
//     and what the interface owes them in each case.
```

**D — what the record says afterwards.** No new mechanism; this is C's first row
read from the other side. Predict how many `disposition-decided` events there are
and what each says.

```ts
describe("D", () => {
  it("reads back what the record says about one proposal", async () => {
    const held = stage({ ops: removeSlot, origin: "system-signal" })
    await composeChange(held.runtime, held.tree, held.intent)
    const confirmed = confirmChange(held.runtime, held.tree, held.proposal, held.intent)

    for (const { event } of held.events.envelopes) {
      if (event.type === "disposition-decided") {
        console.log("verdict on", event.proposalId, "->", JSON.stringify({
          kind: event.disposition.kind, reason: event.disposition.reason.code,
        }))
      }
    }
    console.log("outcome:", confirmed.kind)
    console.log("the disposition on the applied change:", JSON.stringify(
      confirmed.kind === "applied" ? confirmed.disposition.kind : confirmed.kind
    ))
  })
})
// Q4: the change was applied and its disposition does not say `accepted`. Argue
//     that this is a defect. Then argue that stamping `accepted` there would
//     destroy something, and name what. Which argument do you actually believe?
//     Then: someone counts `requires-confirmation` verdicts in the journal to
//     find out how many changes are waiting on a human. Say what they get, and
//     name the lesson-09 finding this is another costume of.
```

**E — a hold whose tree moved.** Predict the outcome, the error code, and the
event stream. Then predict the two numbers the assessment reports, which are the
reason this exercise is here.

```ts
describe("E", () => {
  it("answers a hold whose tree moved on underneath it", async () => {
    const held = stage({ ops: removeSlot, origin: "system-signal" })
    await composeChange(held.runtime, held.tree, held.intent)

    /** Somebody else writes to the tree while the proposal sits in the queue. */
    const meanwhile: TreeDelta = {
      deltaId: spare.deltaId(),
      treeId: held.tree.treeId,
      baseRevision: held.tree.revision,
      operations: [
        { op: "configure", nodeId: held.ids.body, set: { value: "Someone else" }, unset: [] },
      ],
    }
    const moved = applyDelta(held.tree, meanwhile)
    if (!moved.ok) throw new Error(moved.error.code)
    console.log("revision:", held.tree.revision, "->", moved.value.revision)

    const events = collectingEventSink()
    const outcome = confirmChange(
      { ...held.runtime, events }, moved.value, held.proposal, held.intent
    )
    console.log("outcome:", outcome.kind,
      outcome.kind === "not-applicable" ? JSON.stringify(outcome.error) : "")
    console.log("   ", events.types().join(" -> "))

    for (const { event } of events.envelopes) {
      if (event.type === "change-assessed") {
        console.log("    measured against the moved tree:", JSON.stringify({
          removedNodeCount: event.assessment.analysis.removedNodeCount,
          reversible: event.assessment.reversibility.reversible,
        }))
      }
      if (event.type === "disposition-decided") {
        console.log("    the verdict it reached first:", JSON.stringify({
          kind: event.disposition.kind,
          reason: event.disposition.reason.code,
          stakes: event.disposition.stakes,
        }))
      }
    }
  })
})
// Q5: the delta could never have applied to this tree, and it was measured and
//     judged before anything noticed. Say which function holds the revision
//     check and why it is the right home for it. Then: name the *other* check,
//     one layer up, that means this ordering is a second line of defence rather
//     than the only one — and say what a reader of the journal sees here that
//     they would not see through the supported door.
```

**F — what a repairer is offered.** Two runs, one repairer each. Predict both
counts.

```ts
describe("F", () => {
  it("offers a repairer a refusal and a hold", async () => {
    const refused = stage({ ops: tweak, confidence: 0.1, repairWith: tweak })
    const a = await composeChange(refused.runtime, refused.tree, refused.intent)
    console.log("refused change:", a.kind,
      "| repairer asked", refused.repairer?.requests.length, "times")

    const heldUp = stage({ ops: removeSlot, origin: "system-signal", repairWith: tweak })
    const b = await composeChange(heldUp.runtime, heldUp.tree, heldUp.intent)
    console.log("held change:   ", b.kind,
      "| repairer asked", heldUp.repairer?.requests.length, "times")
    console.log("   ", heldUp.events.types().join(" -> "))
  })
})
// Q6: give the argument for the second count without using the words "scope" or
//     "design decision" — say what would be *wrong*, for the person waiting, if
//     the number were 1. Then say what a runtime with no repairer at all can be
//     relied on not to do, and why that is a property of the composition root
//     rather than of the interpreter.
```

---

## It could have been otherwise

**Return the tree and throw on everything else.** The version the six-line sketch
becomes under pressure. It collapses three unlike things — *the model did not
understand*, *the policy said no*, *a person must decide* — into one channel that
carries a string, and the caller's only tool for telling them apart is matching
on message text. Lesson 05 refused this generally; here the specific cost is that
`requires-confirmation` is not an error at all, so the error channel would be
carrying a success.

**Block until the human answers.** Genuinely tempting, and it is what a CLI
would do. It fails on a fact about the world rather than about the design: the
reviewer is in a browser that may not be open, and the runtime is on a host that
may not exist in ten minutes. Any implementation of it is a queue and a
subscription with a promise in front, which is the same architecture wearing a
disguise that also holds a request open for an hour.

**Carry the assessment forward and trust it at confirmation time.** The efficient
one — it saves a walk of the tree and a Gate call, both cheap. It is wrong in
proportion to how long the hold sat: the assessment measures the delta against a
tree, and the tree is not the same tree. And it quietly answers a policy question
with an hour-old answer, which 0033 names directly: a host that narrowed its
policy meant that for the queue too.

**Re-interpret the utterance at confirmation instead of storing the proposal.**
This removes the hold store entirely, which is a real saving — 0021 notes that
holds do not survive a restart in the reference implementation, and this option
makes that problem vanish. Rejected as the most wrong of the alternatives: the
reviewer read a rationale for one delta and would be confirming a different one.
A review queue whose subject changes between the reading and the clicking is not
a review queue.

**Let the client post the proposal back on confirm.** No hold store, no custody,
and it is the shape most web applications reach for. It is exactly what 0017
rules out: `origin` and `confidence` are inputs the Gate cannot verify, so
re-gating a client-supplied proposal gates the client's word about itself.

**Resolve the policy per proposal rather than per intent.** One line, and it
looks more consistent than what Loom does. It costs the comparison a repair
exists to make: two dispositions from the same intent judged under two policies
cannot tell you whether the second proposal got through because it was smaller.

**Hold again if the Gate holds again.** The intuitive answer to Predict 3, and the
one that does not terminate: the property that produced the hold is unchanged, so
the second hold produces a third. The alternative worth taking seriously is a
distinct outcome — *held again, and here is what changed* — but that is a fourth
disposition kind by another name, and lesson 09's test applies: the host's next
action is the same as for the hold it already knows how to render.

---

## Explain it back

Closed book.

1. Explain to somebody who has written the six-line version why their function
   cannot be fixed by widening its return type. Do not use the words "pause",
   "suspend", or "resume". Get to the concrete thing about the reviewer that
   breaks it.

2. **Derive it from lesson 05.** Lesson 05 said that a decision worth auditing is
   one you can re-derive from what was recorded. Show that `confirmChange` is
   that property being *used* rather than merely honoured — and then say which
   single field of `CompositionRuntime` would have to change for the second look
   to become impossible, and what it would have to change to.

3. **Derive it from lesson 09.** The Gate has three outcomes and the middle one
   is the reason this lesson exists. State what the middle outcome costs the
   system, in terms of machinery that would not exist without it. Then argue that
   lesson 09's rule for adding a fourth outcome — *does the host do something
   different* — was actually a rule about this lesson's material all along.

4. Find a system you have used where an approval was granted and then the thing
   still did not happen — a deploy, an expense, a merge, an access request. Was
   the second check explained to you, or did it look like the system losing your
   approval? Say what would have made it legible, and then check that against
   what exercise C's second row would show a user.

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
rating is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. Name the five outcomes. Then say what the two that carry no disposition have
   in common, and give a question a monthly report would get wrong if the type
   let them carry one.

2. The policy is resolved once in `composeChange` even when a repair happens, and
   again in `confirmChange`. State the one rule both follow, then apply it to a
   case neither lesson mentions: two intents, raised a second apart, against the
   same tree. How many resolutions, and why is that the right number?

3. A held change is confirmed. The Gate returns `requires-confirmation` again.
   Say what happens, then give the argument, then say what the disposition
   recorded on the applied change says and why that is better than `accepted`.

4. `PolicyContext` is `{ tree, intent }`. Say what it deliberately cannot see,
   and describe the failure that omission prevents in terms of a metric that
   would look healthy while meaning nothing.

5. Where does the revision check that stops a stale confirmation live, and where
   does the *other* one live? Say which fires first in a supported deployment,
   and what the later one is for.

---

## Reflect

- Predict 1 asked what your signature obliges you to return for a held change.
  Whatever you wrote, look at whether you reached for a nullable tree, an
  exception, or a new type — and note that the first two are the two options
  *It could have been otherwise* rejects. If you reached for a union, you had the
  answer before the lesson; check whether you also had the *reason*.
- Predict 2 asked for five reuse-or-recompute decisions. Score them. The one to
  look hardest at is the proposal, because it is the only *reuse* in the list and
  the argument for it is the opposite of the argument for the other four.
- Predict 3 is the calibration question of this lesson. If you wrote "hold it
  again" with confidence 4 or 5, that pair — confident and wrong — is the one to
  write down in your tracking table. It is a reasonable answer that does not
  terminate, which is the most instructive kind of wrong.
- Part II is done. Look back at lesson 05's claim that purity is what makes an
  audit trail real, and say which exercise in this lesson is that claim being
  spent rather than stated.

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** Write the five outcomes from memory, then beside each one write
  the last event that fires before it is returned. Then say which two share a
  last event and what distinguishes them.
- **In 1 month:** Redo exercise C from memory — predict all three rows — and then
  do the thing the exercise does not: say what a *fourth* row would show if the
  tree had also moved, and which of the two failures wins.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0017`](../decisions/0017-every-write-goes-through-one-server-side-path.md) — one write path, and why direct manipulation uses it too
- [`decisions/0021`](../decisions/0021-a-held-proposal-stays-server-side-and-answers-are-by-id.md) — where a held proposal lives, and why confirming re-runs the Gate
- [`decisions/0033`](../decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md) — once per intent, again per confirmation
- [`decisions/0006`](../decisions/0006-one-repair-attempt-and-both-halves-recorded.md) — the repair path, which lesson 13 takes properly
- [`src/runtime/pipeline.test.ts`](../src/runtime/pipeline.test.ts) — the narration tests are the sequence, written down as assertions
- Next: 11 — The model seam *(not yet written)*

---

## Answers

**Q1** The sequence, from outside:

```
accepted        -> applied
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> change-applied
held            -> awaiting-confirmation
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided
rejected        -> rejected
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided
not-interpreted -> not-interpreted
    intent-received -> policy-resolved -> interpretation-failed
not-applicable  -> not-applicable
    intent-received -> policy-resolved -> change-proposed -> assessment-failed
```

The two identical streams are `held` and `rejected`. Both end at
`disposition-decided`, because in both cases the pipeline reached a verdict and
did not apply anything — and the whole difference between *a person may still say
yes* and *no* is inside that last event, in `disposition.kind`. A reader
consuming only event *types* cannot tell a held change from a refused one, which
is the correct place for the distinction to be: the kind is on the disposition,
where lesson 09 put it.

The bottom two are the ones with a stage missing. `not-interpreted` never reached
`change-proposed`, so nothing was measured and nothing was judged.
`not-applicable` has a proposal and no `change-assessed`, because the assessment
is what failed — the delta names a node the tree does not have.

The event that fires in all five is **`policy-resolved`**. It fires before the
interpreter runs, so it fires even for an intent that never produces a proposal.
The argument for that is in `events.ts`: which policy was in force is a question
about *the ask*, not about the answer, and an interpretation failure under a
strict policy is not the same event as one under a lax policy. If you are
measuring how a tenant's traffic behaves, you want the denominator to include the
asks that went nowhere.

**Q2** Where the policy is settled:

```
accepted outright:       applied | resolved 1
refused, then repaired:  applied | resolved 1
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided -> repair-requested -> change-proposed -> change-assessed -> disposition-decided -> change-applied
held, then confirmed:    awaiting-confirmation then applied | resolved 1 then 1
```

Two proposals were judged in run two — you can count them in the stream, two
`change-proposed` and two `disposition-decided` — and the policy was resolved
once.

The rule that produces both numbers: **once per occasion of judgment, where a
repair is the same occasion and a confirmation is a new one.** A repair exists to
be comparable to the proposal it replaced; that comparison is the entire reason
0006 records both halves. Resolve twice and the pair stops being a comparison —
someone later asking "did the interpreter get through by proposing something
smaller?" would have no way to rule out "or because the standard moved between
the two". One resolution makes the two dispositions differ in exactly one thing:
the proposal.

Run three is two occasions and gets two resolutions, and that is the same rule,
not an exception to it.

**Q3** The second look:

```
the hold:       {"kind":"requires-confirmation","reason":"stakes-above-ceiling","stakes":"medium"}
unchanged   {"outcome":"applied","verdict":"requires-confirmation","reason":"stakes-above-ceiling"}
    policy-resolved -> change-assessed -> disposition-decided -> change-applied
tightened   {"outcome":"rejected","verdict":"rejected","reason":"stakes-at-refusal-floor"}
    policy-resolved -> change-assessed -> disposition-decided
loosened    {"outcome":"applied","verdict":"accepted","reason":"within-policy"}
    policy-resolved -> change-assessed -> disposition-decided -> change-applied
```

Row one is the one to have been slow about. The Gate returned exactly the verdict
it returned an hour ago — `requires-confirmation`, `stakes-above-ceiling` — and
the change was applied. That is not the Gate being ignored, because the two looks
are answering different questions. The first asked *may this be applied without
asking anyone?* The second asks *may this be applied at all?*, and
`requires-confirmation` is not a no; the asking it demands has already happened.
Only `rejected` is a no.

Row two is a human saying yes and the change not happening. The policy was
tightened while the proposal sat in the queue, `refusalFloor: "medium"` now
catches a `medium` change at rung 2, and the verdict is a refusal. A human saying
yes is permission to proceed, not permission to skip the check.

Row three is the reverse and it is worth noticing that the reason code changed to
`within-policy`: under the loosened policy this change would never have been held
in the first place, and the record of the second look says so.

Which is harder to explain to the person who clicked? Row two, by a distance. Row
one applies the change they asked for. Row two takes their approval and produces
nothing, and the honest interface has to say *the policy changed while this was
waiting*, using the two `policyId`s it has on the two dispositions — which is
exactly what 0033 put them there for.

**Q4** What the record says afterwards:

```
verdict on p_x11 -> {"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
verdict on p_x11 -> {"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
outcome: applied
the disposition on the applied change: "requires-confirmation"
```

**One proposal id, two verdicts, and the applied change carries a disposition
that says `requires-confirmation`.** (The id itself comes from a counter shared
across the whole file, so it will read differently if you run D on its own. What
matters is that it is the *same* id twice.)

The case that this is a defect: a disposition is supposed to say what happened,
and this one says the change needs confirming when in fact it was applied. A
reader filtering the journal for `kind === "requires-confirmation"` to find work
waiting on a human will find this one, and it is not waiting on anybody.

The case against stamping `accepted`: the disposition is the Gate's verdict, not
the pipeline's outcome, and the Gate did not accept this. Overwriting it would
delete the only record of *why a person had to be asked*, and that is the fact
worth keeping — "applied, and here is what made it need a signature" is strictly
more than "applied". The approval itself is recorded elsewhere and by name:
`hold-confirmed` carries the actor, and `answeredBy` lands on the revision (0029).

I believe the second, and the first is a real cost rather than a
misunderstanding. Which brings the counting question: someone counting
`requires-confirmation` verdicts to find changes waiting on a human gets a number
that includes every change that was held *and then confirmed*. What they want is
the hold store, or the `proposal-held` events minus the answered ones — the
verdict is a judgment, not a state.

That is lesson 09's finding in a second costume. There it was *a count of reason
codes is a count of first reasons*. Here it is *a count of verdicts is not a count
of states*. Both are the same mistake: reading a record of a decision as though
it were a measurement of the world.

**Q5** A hold whose tree moved:

```
revision: 0 -> 1
outcome: not-applicable {"code":"revision-mismatch","expected":0,"actual":1}
    policy-resolved -> change-assessed -> disposition-decided -> application-failed
    measured against the moved tree: {"removedNodeCount":3,"reversible":true}
    the verdict it reached first: {"kind":"requires-confirmation","reason":"stakes-above-ceiling","stakes":"medium"}
```

The delta could never have applied — its `baseRevision` is 0 and the tree is at 1
— and it was measured, judged, and held-for-confirmation *before* anything
noticed. `applyDelta` caught it, last.

That is the right home for the check. `applyDelta` is the function that must
never leave a half-applied tree (lesson 03), and the revision guard is part of
what that promise is made of; putting it there means every path into the tree is
covered, including ones nobody has written yet. The alternative — a check at the
top of `confirmChange` — protects one entry point and has to be remembered at the
next one.

The other check is one layer up, and it fires first in any supported deployment:
`confirmHeld` reads head, compares it to the revision the hold recorded, and if
they differ it **releases** the hold and reports `revision-conflict` without ever
calling `confirmChange`. A hold whose tree has moved is dead rather than stale —
its delta names a base revision that is in the past, so it can never apply — and
leaving it in the queue would only produce a row that refuses every time somebody
clicks it (0021).

What a journal reader sees here that they would not see through the door: an
assessment computed against a tree the delta does not belong to. `removedNodeCount`
is 3 in this run and that happens to be right, because the interfering change
only rewrote a text value. It would not stay right if the interfering change had
added nodes under `main` — the analysis walks the tree it is given, so it would
report the removal of nodes this delta was never authored to remove, and the
stakes are computed from that count. The verdict above is a judgment of a change
that does not exist.

Nothing is broken by it: the apply fails, nothing is written, and the supported
path never gets here. But it is worth knowing that `assessChange` does not check
what `applyDelta` checks, and therefore that an assessment is only meaningful
about the tree it was actually taken against.

**Q6** What a repairer is offered:

```
refused change: applied | repairer asked 1 times
held change:    awaiting-confirmation | repairer asked 0 times
    intent-received -> policy-resolved -> change-proposed -> change-assessed -> disposition-decided
```

A refusal reaches the repairer. A hold does not.

The argument, in terms of the person waiting: a hold is a question that has been
put to *them*. Handing it to a model to make smaller is answering somebody else's
question — the reviewer asked to see a change and would instead be shown a
different, weaker change they never asked about, or nothing at all. "A person
should decide this" is not an objection to be routed around. A refusal is
different in exactly the way that matters: nobody was asked, so nothing is being
pre-empted.

A runtime with no repairer cannot repair — `repairer` is optional on
`CompositionRuntime` and its absence makes the refusal terminal, structurally. So
"does this deployment let AI have a second go?" is answerable by looking at one
composition root, rather than by working out which interpreter got wired in and
whether it happens to have a repair method. That is 0006 choosing a separate
interface over an optional method for exactly this reason: a capability that
arrives by accident is one nobody decided to grant.

Lesson 13 takes the rest of this — one attempt, why the "one" is structural
rather than a counter, and what `repairOf` makes visible to telemetry.
