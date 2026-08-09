# 05 — Purity at the seams

**After this lesson you will be able to** say why every fallible function in Loom
returns a `Result` instead of throwing, name the one property that decides what
belongs in a `CompositionRuntime`, explain the difference between a log and an
audit trail, and say where Loom throws on purpose and why those cases are not
exceptions to the rule.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md).

---

## Warm-up

Closed book, five minutes, mixed across all four prior lessons.

1. The four operations, and which one mints an id. (L03, L04)
2. A stored reference to a node has gone stale. What do you observe under ids,
   and what do you observe under paths? (L04)
3. What does `baseRevision` protect against, and why is the protection needed at
   all? (L03)
4. Why is there no conditional node? (L02)

Write something for all four. The second one is the one to get fully, not
approximately.

---

## Predict

In writing, before reading on:

> The Gate refused a change last Tuesday. This morning somebody asks you to show
> that the refusal was correct — not to assert it, to **demonstrate** it.
>
> 1. Write the list of things that would have had to be recorded last Tuesday for
>    you to re-run that decision today and get the same answer. Be exhaustive.
>    The list is shorter than you expect and you will probably still miss
>    something on it.
> 2. `assessChange` meets a delta it cannot analyse and throws. The caller
>    catches it and logs `assessment failed: <message>`. Name a concrete question
>    that log can no longer answer — an actual question somebody would ask, not
>    "it isn't typed".
> 3. The telemetry sink is down, so every `emit` throws. A change the Gate has
>    already accepted is halfway through being narrated. Should it still apply?
>    Commit to an answer before reading on.

Question 1 is the one that carries the lesson. Do not move on with a vague list
— write the actual items, because you are going to check it against a program's
answer later and the interesting part is the gap.

---

## The problem

A log records what happened. An audit trail claims something stronger: that what
happened was *right*. The difference between the two is not how much detail they
carry. It is whether the claim can be checked.

Checking means something specific. You take the recorded inputs, you run the same
code against them, and you compare what comes out with what was written down. If
they agree, the record and the code are consistent and you have learned
something. If they disagree, one of them is lying and you know to go looking.

Loom's whole proposition — from lesson 01 — is that a change is attributable and
reviewable. That is a claim about the record. So Loom needs the check to be
possible, which means it needs the pipeline to be a function you can re-run.

Two ordinary pieces of code destroy that property, and both look like nothing at
the moment you write them:

```ts
throw new Error("could not assess this delta")
occurredAt: new Date().toISOString()
```

The first sends a failure out through a channel the record does not cover. The
second is worse, and it is worth staring at before you are told why: **that
function has an argument it never declared.** Its answer depends on something
that is not in its signature, is not in the record, and cannot be supplied by
whoever tries to reproduce it.

---

## The idea

Two rules, and everything in this lesson is one of them:

> **A failure is a value. A side effect is a parameter.**

### Nothing throws across a seam

Every fallible operation returns a `Result`:

```ts
type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError }
```

The usual argument for this is that the type system forces the caller to
acknowledge failure. True, and not the main point. The main point is that the
error side is an **enumerated union of data**. `TreeError` is thirteen named
codes, each carrying the fields that failure needs — a `nodeId`, an index and a
child count, a key and a node kind. Not a message. Not a stack.

That is the difference between a failure you can record and one you can only
report. A closed set of failure codes is something you can put in an event, store
in a journal, count over a month, and chart. `catch (thrown)` gives you `unknown`
— a set with no members you can name and no bottom.

And for Loom this is not a general preference about error handling. Look at what
the comment on `RuntimeEvent` says the event stream is for:

> a Gate that refuses the right things is only demonstrable if refusals are
> recorded

A refusal is not an error condition in this system. **It is the product.** A
runtime whose value is that it says no to the right things, and which reports
"no" by throwing, has arranged for its principal output to be the one thing it
does not write down.

### Atomicity was free, and lesson 03 did not tell you why

Lesson 03 said a delta is applied whole or not at all, and you may have filed
that as rollback — a transaction, a journal, an undo buffer, something that
puts back what was disturbed.

There is none. `applyDelta` builds a *new* tree and returns it. A failure means
it returns an error instead, so the new tree is simply never handed to anyone,
and the old one was never touched because nothing in the call could touch it.

This is worth sitting with, because it inverts how atomicity usually feels. In a
mutating implementation, atomicity is a feature you implement and can implement
incorrectly — there is a partial state, and code whose job is to unwind it, and
that code has bugs. Here there is no partial state to unwind and no unwinding
code to get wrong. Lesson 03's hardest property is a consequence of this lesson's
first rule, and it cost nothing.

### A side effect is a parameter

The composition runtime declares what it depends on:

```ts
export type CompositionRuntime = {
  readonly interpreter: ChangeInterpreter
  readonly policySource: PolicySource
  readonly events: EventSink
  readonly clock: Clock
  readonly idFactory: IdFactory
  readonly repairer?: ChangeRepairer
}
```

Read that as a dependency-injection convenience and you have missed it. It is an
**inventory of everything in the pipeline that can answer differently on two
identical runs**:

| Field | What varies |
| --- | --- |
| `interpreter` | a model — the one genuinely non-deterministic step |
| `policySource` | which rules judge this change |
| `events` | where the narration goes |
| `clock` | now |
| `idFactory` | fresh names |

Everything *not* on that list — `assessChange`, the stake factors, the
reversibility analysis, `gate`, `applyDelta`, `invertDelta` — is a pure function
of its arguments. So the non-determinism budget of an entire change is five
fields long, and you can read it in one place.

The clock earns its seat the same way the id factory does. `systemClock.now()` is
four tokens of code and it is a side effect: it reads something outside the
program that nobody supplied and nobody can supply again. Injected, it becomes an
input like any other, and "what time did this runtime think it was" is a question
with an answer rather than a shrug.

`PolicySource` shows the rule biting somewhere less obvious. `resolve` is
**synchronous**, and the comment in
[`policy-source.ts`](../src/runtime/policy-source.ts) gives the reason:

> a replay could not fetch what the original run fetched

A host whose policy lives in a database is not forbidden from having one. It is
required to load it *before* entering the write path and close over it — which
turns "the policy" from something the decision reaches out for into something the
decision was handed. The same move as the clock, applied to a different effect.

### What that buys, exactly

Pin every seam, run the same change twice, and the two narrations are the same
bytes. Leave the clock and the id factory ambient and they are not — and the
exercises below tell you precisely how not: eighteen leaf values differ across a
six-event transcript, in exactly four distinct fields, every one of them minted
at a seam.

That is the whole payoff, and it is smaller and more concrete than "purity is
good". It means the question *was this refusal correct?* is a thing you re-run,
not a thing you take on faith from a log.

### It is also what makes lesson 04 checkable

Lesson 04 ended by saying minting is a side effect, so it enters through an
injected `IdFactory`, and that this would matter more than it looked. Here is the
reason.

Lesson 04's ids are the join key. `compareTrees` matches nodes across two trees by
id; `auditSnapshot` folds a log and matches the result against the tree being
served. Both are answering "are these the same node?" by asking "is this the same
id?".

Now suppose minting were ambient — a bare `crypto.randomUUID()` inline, wherever a
node gets built. Replay the recorded intent and you get a tree that is correct in
every respect and shares not one id with the original. Every node reports
`missing` and `extra`. The audit cannot run, so the claim that the snapshot
matches the log cannot be checked, and the only thing left to do with the record
is believe it.

Stable identity is a property of the design. The seam is what makes that property
*demonstrable*. Lesson 04 gave you the guarantee; this lesson is where it becomes
evidence.

### Where Loom throws on purpose

The rule is not "never throw". Two places throw, deliberately:

**`assertNever`**, at the end of every exhaustive switch. Reaching it means the
union grew and a switch did not. There is no honest error value to return for
that: it would be asking every caller to handle a case that cannot occur, which
teaches people to write `if (!r.ok) throw` and lose the whole benefit. The
compiler already made reaching it a type error; the throw is what happens if you
defeat the compiler.

**The builders** — `buildElement`, `buildText`, `buildSlot` — parse eagerly and
throw on a malformed literal. Their doc comment says why: they are for trusted,
in-process callers, so a bad primitive type there is a typo in source rather than
untrusted input. Data arriving from the wire or from a model goes through
`parseTree` and `parseDelta`, which never throw.

The line between the two worlds is worth naming, because it is the whole rule in
one sentence:

> **A throw is a fact about the program. A `Result` is a fact about the data.**

### The promise the runtime does not keep for you

`EventSink.emit` returns `void`, and its comment states a rule:

> a sink that throws or blocks must not be able to fail a change the Gate already
> accepted

The reason is that narration must not be able to change the story it narrates. If
emitting could fail a change, a telemetry outage would become a product outage,
and — the sharper problem — the recording system would be deciding what there is
to record. 0024 is the record that took this seriously: emission does no IO at
all, the collector buffers, the host flushes once, and a batch that fails is
dropped rather than retried.

But look closely at where that promise is kept. `collectTelemetry` upholds it
inside its own `emit`, with a `try`/`catch` that counts and drops. The runtime's
emit call sites do not. Exercise D asks you to find out what that means, and you
should predict the answer before you run it — your Predict question 3 already
committed you to one.

---

## In the code

| What | Where |
| --- | --- |
| `Result`, `reduceResult`, `assertNever` | [`src/result.ts`](../src/result.ts) |
| The failures a tree operation can have | [`src/tree/errors.ts`](../src/tree/errors.ts) |
| `Clock`, `EventSink`, `RuntimeEvent` | [`src/runtime/events.ts`](../src/runtime/events.ts) |
| The seam inventory | [`src/runtime/pipeline.ts`](../src/runtime/pipeline.ts) — `CompositionRuntime` |
| Why policy resolution is synchronous | [`src/runtime/policy-source.ts`](../src/runtime/policy-source.ts) |
| The `IdFactory` seam | [`src/ids.ts`](../src/ids.ts) |
| Throwing on purpose, for trusted callers | [`src/tree/builders.ts`](../src/tree/builders.ts) |
| The sink that keeps the promise | [`src/telemetry/sink.ts`](../src/telemetry/sink.ts) — `collectTelemetry` |

---

## Try it

Predict every output in writing before running anything.

**A — two failures, and what survives them.**

```ts
import { describe, it } from "vitest"
import { sequentialIdFactory } from "./ids.js"
import { sampleTree } from "./testing/fixtures.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement } from "./tree/builders.js"
import { describeTreeError } from "./tree/errors.js"

const spare = sequentialIdFactory("p")

describe("A", () => {
  it("returns a failure", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(tree, {
      deltaId: spare.deltaId(), treeId: tree.treeId, baseRevision: 0,
      operations: [{ op: "insert", parentId: ids.headline, index: 0, node: banner }],
    })

    console.log(result.ok)
    console.log(JSON.stringify(result.ok ? null : result.error))
    console.log(result.ok ? "" : describeTreeError(result.error))
  })

  it("throws a failure", () => {
    try {
      buildElement(spare, { type: "Not A Primitive Type" })
    } catch (thrown) {
      console.log(thrown instanceof Error, (thrown as Error).name)
      console.log(JSON.stringify(thrown))
    }
    // Q1: both of these are failures and both are deliberate. One of them a
    //     host could count over a month. Say which, and say what the *other*
    //     one is for — it is not sloppiness.
  })
})
```

**B — the same change, twice.** This is the exercise the lesson exists for. The
harness is longer than the others; read it, because what it pins is the point.

```ts
import { randomIdFactory, type IdFactory } from "./ids.js"
import { ok } from "./result.js"
import { systemClock, type Clock, type EventSink } from "./runtime/events.js"
import { composeChange, type CompositionRuntime } from "./runtime/pipeline.js"
import { fixedPolicy } from "./runtime/policy-source.js"
import { defaultGatePolicy } from "./runtime/policy.js"
import {
  buildIntent, buildProposal, collectingEventSink, fixedClock, scriptedInterpreter,
} from "./testing/doubles.js"
import { type SampleTree } from "./testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"

const tweak = (ids: SampleTree["ids"]): TreeOperation[] => [
  { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
]

type Seams = {
  readonly clock: Clock
  readonly idFactory: IdFactory
  readonly events?: EventSink
}

/** One run of the pipeline, with everything impure supplied from outside. */
const transcript = async (
  seams: Seams,
  build: (ids: SampleTree["ids"]) => TreeOperation[] = tweak
) => {
  const { tree, ids } = sampleTree()

  const delta: TreeDelta = {
    deltaId: seams.idFactory.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: build(ids),
  }
  const intent = buildIntent(seams.idFactory, { treeId: tree.treeId, baseRevision: tree.revision })
  const proposal = buildProposal(seams.idFactory, { intentId: intent.intentId, delta })

  const collector = collectingEventSink()
  const runtime: CompositionRuntime = {
    interpreter: scriptedInterpreter(ok(proposal)),
    policySource: fixedPolicy(defaultGatePolicy),
    events: seams.events ?? collector,
    clock: seams.clock,
    idFactory: seams.idFactory,
  }

  const outcome = await composeChange(runtime, tree, intent)

  return { kind: outcome.kind, types: collector.types(), json: JSON.stringify(collector.envelopes) }
}

/** Every leaf where two JSON values disagree. */
const diffPaths = (a: unknown, b: unknown, path = "$"): readonly string[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return [path]

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>

  return Object.keys({ ...left, ...right }).flatMap((key) =>
    diffPaths(left[key], right[key], `${path}.${key}`))
}

describe("B", () => {
  it("runs twice", async () => {
    const pinned = () => transcript({ clock: fixedClock(), idFactory: sequentialIdFactory("r") })

    const first = await pinned()
    const second = await pinned()
    console.log(first.kind, first.types.length)
    console.log(first.json === second.json)

    const live = await transcript({ clock: systemClock, idFactory: randomIdFactory })
    console.log(first.json === live.json)

    const paths = diffPaths(JSON.parse(first.json), JSON.parse(live.json))
    console.log(paths.length)
    console.log(JSON.stringify([...new Set(paths.map((p) => p.split(".").pop()))].sort()))
    // Q2: how many leaf values differ, and how many distinct field names is
    //     that? Now go back to your Predict answer 1 and compare the two lists.
  })
})
```

**C — a failure with nowhere to throw to.** Same harness, a delta that names a
node the tree does not have:

```ts
import type { NodeId } from "./ids.js"

describe("C", () => {
  it("narrates a failure instead of raising one", async () => {
    const missing = "n_nowhere" as NodeId

    const out = await transcript(
      { clock: fixedClock(), idFactory: sequentialIdFactory("m") },
      () => [{ op: "remove", nodeId: missing }]
    )

    console.log(out.kind)
    console.log(JSON.stringify(out.types))
    // Q3: this change did not happen. How many events did it leave behind, and
    //     which stage is the last one named? What could a reader reconstruct
    //     from that list that a single line of `catch`-and-log would not give
    //     them?
  })
})
```

**D — the sink is down.** You committed to an answer in Predict 3. Write down
what you expect `console.log` to print, then run it.

```ts
describe("D", () => {
  it("emits into a sink that is down", async () => {
    const seen: string[] = []
    const down: EventSink = {
      emit: (envelope) => {
        seen.push(envelope.event.type)
        if (envelope.event.type === "change-applied") throw new Error("telemetry is down")
      },
    }

    try {
      const out = await transcript({
        clock: fixedClock(), idFactory: sequentialIdFactory("d"), events: down,
      })
      console.log("returned", out.kind)
    } catch (thrown) {
      console.log("threw", (thrown as Error).message)
    }

    console.log(JSON.stringify(seen))
    // Q4: this sink fails only on the last event, after the delta has already
    //     been applied. What does the caller get? And given that `commitIntent`
    //     calls `composeChange` and only then persists — what is in the store?
  })
})
```

---

## It could have been otherwise

**Typed exception classes, caught at a boundary.** The obvious alternative, and
it gets you structured errors. What it does not get you is a signature that says
so: the type of `assessChange` is identical whether it throws four things or
none, so a caller learns what can go wrong by reading the body, or by finding
out. And `catch` is indiscriminate — the same block that handles your enumerated
`AssessmentError` also swallows the `TypeError` from the bug three frames down,
and reports it as an assessment failure.

**A global `now()` that tests monkeypatch.** Cheaper at every call site and
genuinely works for testing. It is still ambient: nothing in a function's type
tells you it depends on time, so you discover which functions do by watching a
suite go flaky. And it forces one clock on the process — telemetry retention
(0037) reasons about a cutoff, and a test that needs the retention clock and the
pipeline clock to disagree cannot have that.

**An effect system, or wrapping everything in an IO type.** Rejected as a tax on
every line of the codebase to buy something a five-field record already provides.
The goal was never purity as a discipline; it was an enumerable list of what
varies.

**`emit` async and awaited, so events are durable at the moment they happen.**
Rejected in 0024, and the reasoning is the one to remember: it inverts the
dependency. A Gate decision would become hostage to a database it has no reason
to know about. The un-awaited version is worse still — it works in development
and silently loses everything on a serverless host, which is the worst available
failure shape.

**`Result` everywhere, including the impossible cases.** Rejected: a caller made
to handle variants that cannot occur will write `if (!r.ok) throw new Error()`,
and once that is in the codebase the enumeration is decorative.

---

## Explain it back

Closed book.

1. An engineer tells you: "we have typed exception classes and structured
   logging, so this is ceremony with extra steps." Answer them **without using
   the word "pure"**. Name the concrete question their setup cannot answer, and
   say who asks it and when.

2. **Connect it back:** lesson 03 called a delta atomic and you may have pictured
   a rollback. There is no rollback anywhere in `applyDelta`. Explain what makes
   that possible, and then say what atomicity would have cost to build — and to
   keep correct — if `applyDelta` mutated the tree in place.

3. **Connect it back:** lesson 04 said the runtime mints ids through an
   `IdFactory` seam and deferred the reason to this lesson. Give the reason. Then
   take lesson 04's `compareTrees` exercise specifically and say what its output
   would look like on a replay if minting were ambient.

4. Think of a system you have worked on where a failure was recorded as a string.
   What question got asked about it months later, and what did somebody have to
   do to answer it? That gap is the whole argument, in a form you already
   believe.

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
number is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. `CompositionRuntime` has five required fields. State the single property that
   decides whether something belongs on that list, and then use it to decide
   whether `applyDelta` should have been a sixth.

2. `PolicySource.resolve` is synchronous. Give the reason that is about the audit
   rather than about latency, and say what a host with a database-backed policy
   must do instead.

3. Name the two places Loom throws deliberately, and state the one rule that
   distinguishes them from everywhere a `Result` is returned.

4. Your `emit` writes to a database, and the database is down. Say what *should*
   happen to a change the Gate has already accepted, then say what happens today
   if you wire that sink into `composeChange` yourself.

---

## Reflect

- Predict Q1: compare your list against the four field names exercise B printed.
  Which did you have? Almost everyone lists the tree, the intent, and the model's
  reply. The clock and the id factory are the ones that go missing, and they go
  missing for the same reason — you do not think of them as inputs.
- Predict Q2: did your answer name a *question*, or did it describe the type
  system? The version that convinces people is a question somebody actually asks.
- Predict Q3: you committed to whether a failing sink should stop an accepted
  change. Exercise D shows what Loom does. Were you right about what *should*
  happen, wrong about what *does*, or both?
- Lesson 03 asked you to defend atomicity to a sceptic. Would your answer be
  different now that you know there is no rollback to defend?

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** From memory, list the five fields of `CompositionRuntime` and
  say what varies in each. Then explain — out loud — why the id factory being a
  seam is what makes lesson 04's audit possible.
- **In 1 month:** Redo exercise B from memory. Predict the four field names
  before you run it.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0002`](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) — the decision function itself
- [`decisions/0024`](../decisions/0024-emission-never-does-io-and-the-host-flushes-once.md) — emission does no IO, and what a failing batch costs
- [`decisions/0028`](../decisions/0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md) — what an audit needs from the host
- [`src/result.test.ts`](../src/result.test.ts) — the tests are the specification
- Next: 06 — Undo as computation *(not yet written)*

---

## Answers

**Q1** The first failure is a value:

```
false
{"code":"not-a-container","nodeId":"n_1","nodeKind":"text"}
Node n_1 is a text node and cannot hold children.
```

Three named fields — which failure, which node, what kind it turned out to be —
and a separate function that renders prose from them, so a host can localise or
restructure the message without the failure itself changing shape. That is the
one you can put in an event and count next month.

The second is a `ZodError`:

```
true ZodError
{"issues":[{"validation":"regex","code":"invalid_string","message":"Invalid","path":[]}],"name":"ZodError"}
```

Note that it is *not* shapeless — Zod serialises perfectly well, and if the
lesson were "structured errors good, exceptions bad" this would be an awkward
result. The distinction is elsewhere. Nothing in `buildElement`'s type mentions
it, the `catch` that receives it is typed `unknown` and would equally receive a
`TypeError` from a bug, and `"Invalid"` with an empty `path` is all the detail
there is.

And it is deliberate. `buildElement` is for trusted in-process callers — tests,
fixtures, the SDK's scaffolding — where `"Not A Primitive Type"` is a typo in
source, not input. A throw is a fact about the program. Data from the wire or
from a model takes `parseTree` / `parseDelta`, which never throw.

**Q2** With the seams pinned, two runs are the same bytes:

```
applied 6
true
```

With the clock and the id factory left ambient, they are not — and here is the
whole finding in two lines:

```
false
18
["deltaId","intentId","occurredAt","proposalId"]
```

Eighteen leaf values differ across a six-event narration, and they are eighteen
occurrences of **four** field names. Every one of the four is minted at a seam:
three ids from the `IdFactory`, one timestamp from the `Clock`.

Everything else is identical, and "everything else" is not a small remainder. It
is the whole tree, the whole delta, the resolved policy, every stake factor, the
reversibility analysis, the inverse delta, and the Gate's disposition with its
reason. All of it a pure function of the tree and the intent.

That is what "re-runnable" means concretely, and it is the answer to Predict 1.
If your list had the tree, the intent and the model's reply, it was a good list
and it was missing exactly the two things this exercise pins.

**Q3** Four events, ending at the failure:

```
not-applicable
["intent-received","policy-resolved","change-proposed","assessment-failed"]
```

The change did not happen and it still left a record with structure. A reader
learns that an intent arrived, which policy was going to judge it, that a
proposal was produced — so interpretation *worked*, and the model is not the
problem — and that assessment is where it stopped. The event carries the
`ProposedChange` and the `TreeError` whole, so the delta that could not be
assessed is inspectable.

`catch`-and-log gives you one line and loses the stage boundary. The stage is
what tells you where to look, and — for telemetry — is what separates "our model
is producing nonsense" from "our model is fine and something downstream refuses
it". Those need different fixes and would have been the same log line.

**Q4** The caller gets the exception:

```
threw telemetry is down
["intent-received","policy-resolved","change-proposed","change-assessed","disposition-decided","change-applied"]
```

All six events reached the sink, so the narration is complete and its last entry
says `change-applied`. It was applied — in memory, by `applyDelta`, which had
already returned a new tree by the time `emit` was called. That tree is now
unreachable: the throw unwound past the `return`.

And in the write path it is worse than losing a tree. `commitIntent` calls
`composeChange` and *then* persists, so the exception propagates out before
`store.append` is reached. Nothing is committed. The narration claims the change
was applied and the log does not contain it — which is precisely the gap
`commit-failed` exists to cover, entered through a door that emits no
`commit-failed` because the thing that would emit it is the thing that threw.

Move the same sink's failure one event later — to `change-committed`, which is
emitted *after* `store.append` returns — and it inverts. The store is at revision
1 with the new text in it, and `commitIntent` throws instead of returning
`committed`. The change is durable and the caller has been told it failed. Worth
predicting which of those two you would rather debug before you decide the
difference is academic.

So the answer to "should it still apply" is yes, unambiguously, and 0024 argues
it at length. But the guarantee lives in each **sink**, not at the emit call
site: `collectTelemetry` wraps its own body in a `try`/`catch` that counts and
drops, and the runtime does not wrap the sinks it is given. All three sinks in
the repository honour the contract. A fourth, written by a host against a public
interface whose comment reads as a promise, need not — and this exercise is what
that costs.

**1** Whether it can produce a different answer on two identical runs. Every
field of `CompositionRuntime` names a source of variation: a model, a policy
lookup, a destination, the time, fresh names.

`applyDelta` fails the test and should not be a sixth field. Given the same tree
and the same delta it returns the same result forever, so injecting it would buy
nothing and cost something real — the inventory only means anything if
everything on it belongs there. A list that also carries pure functions is a
list of dependencies, and a list of dependencies does not answer "what could
differ".

**2** Because resolution sits inside the decision path, and a replay cannot fetch
what the original run fetched. An awaited lookup would make the policy an input
that exists only at the moment of the original decision — the record could say
which policy was resolved, but re-running the decision would go and ask again,
and get whatever the database holds today. The check stops being a check.

A host whose policy lives in a database loads it before entering the write path
and closes over it in a `PolicySource`. The effect happens; it happens *outside*
the part that has to be reproducible. That is the same move as injecting the
clock, applied to a different effect.

**3** `assertNever`, and the eager parsing in `builders.ts`. The rule: **a throw
is a fact about the program; a `Result` is a fact about the data.**

`assertNever` is reached only if a union grew and a switch did not — a fact about
the code, for which no honest error value exists, and which the compiler already
treats as an error. The builders throw on a malformed literal because their
callers are trusted and in-process, so a bad primitive type is a typo in source.
Everything that handles data whose shape was not the author's to guarantee —
`applyDelta`, `parseTree`, `parseDelta`, `assessChange`, the interpreter, the
store — returns a `Result`.

**4** It should apply. Narration must not be able to change the story it
narrates, or a telemetry outage becomes a product outage and the recording system
starts deciding what there is to record.

What happens today depends on the sink. `collectTelemetry` never lets it come up:
it does no IO at emit time at all, buffers, and drops on a failed flush. Wire in a
sink that throws from `emit` and the exception propagates out of `composeChange`
— exercise D — taking the applied tree with it and reaching `commitIntent` before
anything was persisted. The promise is real and it is upheld sink by sink, not by
the runtime.
