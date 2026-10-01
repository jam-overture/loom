# 05 — Purity at the seams

**After this lesson you will be able to** say why every fallible function in Loom
returns a `Result` instead of throwing, name the one property that decides what
belongs in a `CompositionRuntime`, explain the difference between a log and an
audit trail, say where Loom throws on purpose and why those cases are not
exceptions to the rule, and tell an obligation from a guarantee when both are
written in the same sentence.

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
  readonly propsVocabulary?: PropsVocabulary
  readonly bindingReader?: BindingReader
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

The three optional fields are optional for two different reasons, and being able
to sort them is a better test of whether you have the idea than reciting the five.
`repairer` is a second visit to the interpreter, so it is the same source of
variation as the first field; it is absent by default because a refusal being
terminal is the safer thing to have to ask for. The other two are not sources of
variation at all — `propsVocabulary` is a pure validator and `bindingReader`
answers a question about a registry, and both answer the same on both runs. They
are here because they are things a **deployment** declares, and the composition
root is where a deployment gets to speak.

So the type is doing two jobs, and only one of them is the inventory. A field
can sit on `CompositionRuntime` without being an answer to *what could differ
between two runs* — which is the question Self-check 1 turns on, and the reason
it asks about the five rather than about the type.

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

### The promise, and who has to keep it

`EventSink.emit` returns `void`, and the interface comment states a rule:

> Emission is fire-and-forget: a sink that throws cannot fail a change the Gate
> already accepted.

The reason is that narration must not be able to change the story it narrates. If
emitting could fail a change, a telemetry outage would become a product outage,
and — the sharper problem — the recording system would be deciding what there is
to record. 0024 is the record that took this seriously: emission does no IO at
all, the collector buffers, the host flushes once, and a batch that fails is
dropped rather than retried.

Now read the sentence again and ask something else of it. Not *is that a good
rule* — it is — but **who has to do something in order for it to be true?**

There are two possible answers and they are not close together:

- **Every host that ever writes a sink.** The rule is then an obligation
  travelling with a public interface, and it holds exactly as long as nobody
  gets it wrong.
- **The runtime, once, at the place every event leaves through.** The rule is
  then a guarantee, and a host that gets it wrong is a broken observer rather
  than a broken product.

A comment cannot tell you which of the two it is. Both read identically, and
this one read as the second while being the first: `emitter` in `pipeline.ts`
and `narrator` in `commit.ts` — two copies of the same three lines — called
`emit` bare. Every sink in the repository honoured the rule, so nothing
misbehaved, and *a codebase where everyone happens to comply* is not a system
that provides a guarantee. It is one that has not met the person who will not.

**That is the general thing to take out of this section**, and it applies well
beyond event sinks:

> An obligation and a guarantee are written in the same words. The difference is
> whether a stranger can violate it, and you find that out at the call sites,
> never in the comment.

Open `events.ts` now and you will find the comment answering the question in its
very next line — *that is a guarantee the runtime provides, not an obligation
this interface places on whoever implements it.* It is allowed to say that
because somebody made it true first. A comment that says which of the two it is
is worth having; it is worth nothing as evidence, because the version that was
wrong was equally confident and cost nothing to write.

### Where the promise is kept now

Before the exercises, one thing to decide for yourself, because deciding it is
what makes the rest land.

A sink is handed `change-applied`, which the pipeline emits **before** anything
is persisted, and `change-committed`, which the write path emits **after**
`store.append` has returned. Under a bare `emit`, a throw at either one
propagated out of `commitIntent`.

> **Which of those two is worse, and what does a user see in each case?** Write
> an answer before reading on. They are not symmetric, and the asymmetry is what
> decided the design.

They fail in opposite directions:

| Sink throws on | What happens under a bare `emit` |
| --- | --- |
| `change-applied` | `composeChange` throws, and the tree `applyDelta` had already returned is lost past the `return`. In `commitIntent` this lands *before* `store.append`, so the change is abandoned between the Gate accepting it and the log receiving it — and no `commit-failed` is emitted, because the thing that would emit it is the thing that threw. |
| `change-committed` | The inverse, and worse. The store ends at revision 1 with the change durably in it, and `commitIntent` throws instead of returning `committed`. A host reports failure to a user for a change that happened. |

The second one settles it. Past `store.append` the log is the truth — that is
0016, and it is [lesson 16](16-persistence.md)'s whole subject — and a runtime
whose *observer* can make it lie about the truth is not honest
about what changed — which is the property this whole project exists for. Losing
an event is a cost. Reporting a durable change as an error is the system
contradicting its own record.

So [`0042`](../decisions/0042-a-sink-observes-and-the-runtime-contains-it.md)
moved the promise from the sinks to the runtime. Every event now leaves through
one `narrator` in [`src/runtime/narration.ts`](../src/runtime/narration.ts),
which contains whatever `emit` throws, and the comment on it is the whole
decision in a line:

> A sink is free to be a bad citizen; what it cannot be is load-bearing.

Three things follow from putting it *there* rather than at each call site, and
each one is a separate idea.

**It is structural rather than remembered.** The two duplicate emitter factories
are gone. There is one door, and a call site written next year cannot forget to
use it, because building a `RuntimeEventEnvelope` by hand is now the odd thing
to do. Compare the alternative that was on the table — a `guardedSink(sink)`
decorator the host wraps its sink in. Same containment, and it is the same
obligation one level further out: a host that forgets to wrap gets the old
behaviour with nothing to indicate anything is missing. **A guarantee a caller
can opt out of by omission is not one.**

**It covers rejecting as well as throwing, and this is the half you would not
have written yourself.** `emit` is declared `() => void`, which does not stop a
host writing an `async` one, because TypeScript assigns `() => Promise<void>` to
`() => void` without a murmur. Such a sink does not throw. It hands back a
rejected promise that nobody is holding, and an unhandled rejection is a
process-level failure on exactly the serverless hosts 0024 was written for. A
`try`/`catch` at the call site would not have caught it, which is worth saying
plainly: **the shape a host reaches by accident is the one the obvious guard
misses.** `narrator` checks the returned value for a `then` and attaches a
no-op handler — attached, never awaited, because awaiting is what 0024 forbids.
Exercise E is that assignment compiling.

**The clock is deliberately outside the containment.** A sink that fails is a
broken observer and the change is still true. A clock that fails means the
runtime cannot say when anything happened — and the same clock stamps
`appliedAt` on the commit itself, so containing it would put a *wrong time in
the log* rather than lose an event. It propagates, and exercise G is it
propagating. Notice what the line is: not "contain effects", which would have
been the tidy rule, but **contain the effect whose failure costs less than the
lie you would have to tell to hide it.**

### What containment costs, said out loud

The event is lost and **nothing says so**. There is nowhere for the runtime to
report a failed emit — the sink is the reporting channel, and it just failed.

That is an accepted cost, not an oversight, and the reasoning is worth having
because it is the kind of trade that usually gets made silently. A counter would
have to live on `CompositionRuntime`, which is a *value*, not a stateful object;
making it stateful to hold a number with no reader is a worse trade than losing
the number. If a reader ever appears, the honest shape is a seam of its own
(`onEmitError`) added then, rather than a mutable field added now in
anticipation.

Which leaves `collectTelemetry` in an interesting position. It still wraps its
own `emit` in a `try`/`catch` that counts and drops — but that is no longer what
keeps the system safe, because containment does. What it keeps is the **count**.
Containment makes a drop harmless; only the sink can make it *visible*. The
comment in `sink.ts` that claimed otherwise was corrected when 0042 landed, and
the distinction — `collectTelemetry` is no longer load-bearing for correctness
and is still load-bearing for observability — is the sort of thing that rots
quietly if nobody writes it down.

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
| The one door every event leaves through | [`src/runtime/narration.ts`](../src/runtime/narration.ts) — `narrator` |
| The sink that keeps the count | [`src/telemetry/sink.ts`](../src/telemetry/sink.ts) — `collectTelemetry` |

`narration.ts` is forty lines and three of its four comments are about something
it deliberately does *not* do. Read it before the exercises; it is the shortest
file in this lesson and the densest.

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
    // Q4: this sink fails on the last event, after the delta has already been
    //     applied. What does the caller get, and what did the sink see? Then
    //     say which of those two lines you could have predicted from the
    //     `EventSink` comment alone.
  })
})
```

**E — the sink a host reaches by accident.** The same failure written `async`.
Predict two things before running: whether the outcome differs from D, and what
`emit` hands back to a caller that does nothing with it.

```ts
import { type RuntimeEventEnvelope } from "./runtime/events.js"

describe("E", () => {
  it("is contained in the shape a host reaches by accident", async () => {
    const seen: string[] = []
    const asyncDown: EventSink = {
      emit: async (envelope) => {
        seen.push(envelope.event.type)
        if (envelope.event.type === "change-applied") throw new Error("telemetry is down")
      },
    }

    try {
      const out = await transcript({
        clock: fixedClock(), idFactory: sequentialIdFactory("a"), events: asyncDown,
      })
      console.log("returned", out.kind)
    } catch (thrown) {
      console.log("threw", (thrown as Error).message)
    }
    console.log(seen.length, seen.at(-1))

    /** What a bare call site would have been handed, had one survived 0042. */
    const recorded = JSON.parse(
      (await transcript({ clock: fixedClock(), idFactory: sequentialIdFactory("b") })).json
    ) as readonly RuntimeEventEnvelope[]
    const applied = recorded[recorded.length - 1] as RuntimeEventEnvelope

    try {
      const returned: unknown = asyncDown.emit(applied)
      console.log("bare emit", returned instanceof Promise ? "returned a promise" : "returned void")
      void Promise.resolve(returned).catch(() => undefined)
    } catch (thrown) {
      console.log("bare emit threw", (thrown as Error).message)
    }
    // Q5: `asyncDown` is annotated `EventSink` and there is no cast anywhere in
    //     this block. Say what that means for a host, and then say what a
    //     `try`/`catch` around a bare `emit` would have done about it.
  })
})
```

**F — the inverse, in the write path.** D and E both fail before anything is
persisted. This one fails after. It needs a store, so the harness is its own.

```ts
import { memoryTreeStore } from "./store/memory.js"
import { findNode } from "./tree/navigation.js"
import { commitIntent, type WritePath } from "./write/commit.js"
import { memoryHoldStore } from "./write/held.js"

describe("F", () => {
  it("commits under a sink that refuses the last word", async () => {
    const { tree, ids } = sampleTree()
    const idFactory = sequentialIdFactory("w")

    const store = memoryTreeStore()
    await store.create(tree)

    const delta: TreeDelta = {
      deltaId: idFactory.deltaId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: tweak(ids),
    }
    const intent = buildIntent(idFactory, { treeId: tree.treeId, baseRevision: tree.revision })
    const proposal = buildProposal(idFactory, { intentId: intent.intentId, delta })

    const seen: string[] = []
    const down: EventSink = {
      emit: (envelope) => {
        seen.push(envelope.event.type)
        if (envelope.event.type === "change-committed") throw new Error("telemetry is down")
      },
    }

    const path: WritePath = {
      store,
      holds: memoryHoldStore(),
      runtime: {
        interpreter: scriptedInterpreter(ok(proposal)),
        policySource: fixedPolicy(defaultGatePolicy),
        events: down,
        clock: fixedClock(),
        idFactory,
      },
    }

    const outcome = await commitIntent(path, intent)
    console.log(outcome.kind)

    const head = await store.head(tree.treeId)
    const body = head.ok ? findNode(head.value.root, ids.body) : undefined
    console.log(head.ok ? head.value.revision : "no head", body?.kind === "text" ? body.value : "?")
    console.log(seen.at(-1))
    // Q6: write down what these three lines would have been before 0042, then
    //     say which line a *user* of this host would have seen, and what they
    //     would have done next.
  })
})
```

**G — the seam that is not contained.** One of the five is left to fail. Predict
which, and why, before you look at the code.

```ts
describe("G", () => {
  it("does not contain the clock", async () => {
    const stopped: Clock = {
      now: () => {
        throw new Error("no clock")
      },
    }

    try {
      const out = await transcript({ clock: stopped, idFactory: sequentialIdFactory("k") })
      console.log("returned", out.kind)
    } catch (thrown) {
      console.log("threw", (thrown as Error).message)
    }
    // Q7: state the rule that puts the sink inside the containment and the
    //     clock outside it, in one sentence, without using the word "important".
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

Four more, all from 0042, and they are about the *containment* rather than about
`Result`. They are worth reading as a set, because three of the four are cheaper
than what was chosen and the fourth is better:

**Reword the two comments so the promise reads as an obligation on the sink.**
Free, and it makes the documentation true by lowering the contract to match the
code. Rejected on where the failure lands: a durable change reported to a user
as an error. A framework whose claim is that change is inspectable cannot make
its inspection load-bearing on the write path.

**A `guardedSink(sink)` decorator the host wraps its own sink in.** Rejected, as
above: the same obligation one level further out, and omission is silent.

**Count contained failures on the runtime.** Rejected, and this is the one worth
arguing with, because losing events silently is a genuine cost and a counter is
four lines. It would make `CompositionRuntime` — a value — stateful, to hold a
number nothing reads. The shape that is honest when a reader appears is a seam,
added then.

**Make `emit` return a `Result` instead of throwing.** Rejected, and the reason
is the interesting one, because by this lesson's own first rule it is the right
answer: it puts the guarantee in the type where a comment cannot drift away from
it. It was rejected because the caller's only possible response to an `err` here
is to ignore it — the runtime has already decided that a failed emit changes
nothing — so the type would be honest about a choice nobody gets to make, at the
cost of breaking every sink anyone has written. **A `Result` is for a failure the
caller can do something about.** That is a sharper statement of this lesson's
first rule than the lesson itself makes, and it arrived from somebody trying to
apply the rule too evenly.

---

## What this lesson got wrong, and for how long

Everything above about `narrator` is new. For seven weeks this lesson taught the
opposite, at length, and the way that happened is more useful than the
correction.

**The fault was found by writing exercise D.** Not by reading `events.ts` — the
comment there was reassuring and had been for months. By writing a sink that
throws, running it, and looking at what came back. The lesson shipped on 6
August with a *Found while teaching* entry that stated the gap, ran both failure
directions, and recommended containing them at both call sites, noting the cheap
alternative was to reword the comments.

**The repository did it the next day.** 0042 took the recommended half rather
than the cheap one, chose one door over two `try`/`catch` blocks, and added the
two things the lesson had not thought of — the rejecting `async` sink, and the
argument for leaving the clock outside.

**And then nobody came back.** The report that landed the fix said, in as many
words, that shipping it would leave this lesson wrong. It was right. Two later
reports carried the same note forward as an open item. The lesson went on
telling readers that each sink had to uphold the promise for itself and that the
runtime left the sinks it was handed alone, which by then was backwards, and every
one of its exercises kept passing — because a program that prints
`threw telemetry is down` and a lesson that says `threw telemetry is down` do not
disagree until somebody runs the program.

Three things in that sequence are worth keeping, and none of them is "check your
work":

1. **Prose is the part of a lesson nothing can check.** This course holds counted
   phrases against the lists that settle them, and it holds a transcript against
   a run. An argument has one copy and nothing to disagree with. The two
   sentences this lesson located the guarantee in the wrong place with were
   wrong for seven weeks in a file under continuous test, and nothing in this
   repository was in a position to notice.
2. **A drift that was predicted in writing is still a drift.** Knowing it would
   happen, and saying so in the report that caused it, changed nothing — because
   a note in a report is not a place where being wrong is an event. That is
   [lesson 25](25-exhaustiveness.md)'s conclusion arriving at this lesson's
   expense.
3. **The mechanism that found it is the one the course already had.** Writing
   the exercise out and running it. That is what found the gap in August, and it
   is what found the stale answer in September. It is slow, it does not scale,
   and it is the only thing here with a record of working.

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

5. **Connect it back:** the first rule of this lesson is that a failure is a
   value, and 0042 rejected making `emit` return a `Result` — which is that rule
   applied exactly. Say why the rejection is right rather than an exception,
   and then give the rule in the sharper form the rejection implies.

6. Find an interface you maintain whose doc comment promises something the
   callers are trusted to do. Do not fix it. Just say, out loud, which of the
   two answers on page one it is — an obligation or a guarantee — and what the
   first host to violate it would see.

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
   happen to a change the Gate has already accepted, then say what does happen
   if you wire that sink into `composeChange` yourself — and name what you lose
   when it does.

5. The clock and the event sink are both injected seams and both can fail. One
   failure is contained and the other propagates. Give the rule that decides
   which, and then apply the same rule to `idFactory`: would you contain a
   throwing id factory?

6. `EventSink`'s comment said the right thing for months while the runtime did
   not do it. State what you would have had to look at to find that out, and say
   why the comment being accurate about every sink in the repository was not
   evidence.

---

## Reflect

- Predict Q1: compare your list against the four field names exercise B printed.
  Which did you have? Almost everyone lists the tree, the intent, and the model's
  reply. The clock and the id factory are the ones that go missing, and they go
  missing for the same reason — you do not think of them as inputs.
- Predict Q2: did your answer name a *question*, or did it describe the type
  system? The version that convinces people is a question somebody actually asks.
- Predict Q3: you committed to whether a failing sink should stop an accepted
  change. Exercises D and F show what Loom does. Were you right about what
  *should* happen, wrong about what *does*, or both? Note which one you were more
  confident about — the *should* is an opinion you can defend, and the *does* was
  a guess about a codebase you had not looked at.
- Before the table in *Where the promise is kept now*, you wrote down which of
  the two failure directions is worse. If you picked `change-applied` — losing a
  change — you are in good company and you were weighing the wrong thing. Say
  what you were weighing, and what the argument you were missing is.
- Lesson 03 asked you to defend atomicity to a sceptic. Would your answer be
  different now that you know there is no rollback to defend?

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** From memory, list the five fields of `CompositionRuntime` and
  say what varies in each. Then explain — out loud — why the id factory being a
  seam is what makes lesson 04's audit possible.
- **In 1 month:** Redo exercise B from memory. Predict the four field names
  before you run it. Then, without opening `narration.ts`, say what it contains,
  what it deliberately does not contain, and what it reports when containment
  fires.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0002`](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) — the decision function itself
- [`decisions/0024`](../decisions/0024-emission-never-does-io-and-the-host-flushes-once.md) — emission does no IO, and what a failing batch costs
- [`decisions/0042`](../decisions/0042-a-sink-observes-and-the-runtime-contains-it.md) — the promise moved from the sinks to the runtime, and the four alternatives it turned down
- [`decisions/0028`](../decisions/0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md) — what an audit needs from the host
- [`src/result.test.ts`](../src/result.test.ts) — the tests are the specification
- Next: [06 — Undo as computation](06-undo-as-computation.md)

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

**Q4** The caller gets the outcome. The sink threw and nothing happened to the
change:

```
returned applied
["intent-received","policy-resolved","change-proposed","change-assessed","disposition-decided","change-applied"]
```

All six events reached the sink — `seen` is pushed to before the throw — and the
change applied anyway. `composeChange` returned `applied` with the new tree in
it, because the throw never left `narrator`.

The second half of the question is the one to have got wrong. **Neither line is
predictable from the `EventSink` comment**, and that is the point of asking.
The comment says a sink that throws cannot fail an accepted change; a comment
saying so is compatible with a runtime that provides it and with a runtime that
merely expects it, and those two produce opposite outputs here. You had to look
at the call site. This lesson did not, for seven weeks, and printed the other
line.

What you are not seeing is the cost. The `change-applied` envelope is gone —
dropped inside `contain`, uncounted, unreported. Nothing in this transcript says
an event was lost, and nothing anywhere else does either. The narration a reader
gets from a broken sink is not a complete narration; it is whatever survived,
with no marker where the rest was.

**Q5** No cast, and it compiles:

```
returned applied
6 change-applied
bare emit returned a promise
```

`asyncDown` is annotated `EventSink` and `emit` is `async`. TypeScript assigns
`() => Promise<void>` to `() => void` without complaint — that is not a bug, it
is the rule that lets you ignore a return value — so a host that reaches for
`async` because their logger is async has written a sink that **rejects** rather
than throws, and nothing told them.

The last line is what a bare call site would have been handed: a rejected
promise, returned, with nobody holding it. A `try`/`catch` around that call
catches nothing at all — there is nothing to catch; the failure arrives later,
at the process, as an unhandled rejection. On the serverless hosts 0024 was
written for that is a dead process rather than a logged error.

So the guard everyone would have written — wrap the two `emit` calls in
`try`/`catch` — would have closed the shape a host reaches on purpose and left
open the one they reach by accident. `narrator` checks the returned value for a
`then` and attaches a no-op handler to it. Attached, never awaited: awaiting is
the thing 0024 forbids, and a handler is not an await.

(The exercise defuses that promise on the line after it prints, which a bare
call site would not. That defusing is the whole difference between this block
and a crashed test run.)

**Q6** The store has it, and so does the caller:

```
committed
1 Rewritten
change-committed
```

Revision 1, the new text in the tree, `committed` returned, and the sink's last
sight of anything was the `change-committed` it refused.

Before 0042 those three lines were `1 Rewritten` and a thrown
`telemetry is down` reaching whoever called `commitIntent`. The store was
identical — that is the part to sit with. **The change was durable in both
worlds.** The only thing that differed was what the caller was told about it.

What a user saw: an error. What they did next: the change again. A form
resubmitted, a second identical revision on top of the first, or a support
thread about a save that failed and happened. And the audit trail this entire
lesson is built to defend would have shown, correctly, that it was applied —
against a user who had been told it was not, by a system whose observer had a
vote.

That is why this direction settled the design rather than the other one. Losing
the `change-applied` event costs a change. Losing the `change-committed` event
would have cost the record's agreement with reality, which is the only thing
Loom is selling.

**Q7** It propagates:

```
threw no clock
```

The clock is outside the containment, and stating the rule is the exercise. The
version that works: **contain the failure whose consequence is a gap in the
record; do not contain the one whose consequence is a false entry in it.** A
sink that fails loses an event, and a missing event is visibly missing to
anybody reading the stream in order. A clock that fails and is contained would
mean either an envelope with a fabricated `occurredAt` or a commit stamped
`appliedAt` with a time nobody stood behind — a record that reads as complete
and is wrong.

"Losing data is worse than failing loudly" is the instinct, and it gets this
backwards. The thing being protected is not the data. It is whether the record
can be believed.

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

And it does. It does not depend on your sink, which is the part worth being
precise about: every event leaves through `narrator`, which contains a throw and
a rejection alike, so a sink you wire in yourself is contained whether or not you
wrote it carefully. `collectTelemetry` additionally never lets the case come up —
it does no IO at emit time, buffers, and drops on a failed flush.

What you lose is the event, and the knowledge that you lost it. Containment
reports nothing, because the only channel for reporting it is the thing that just
failed. If you need the number, keep it in your own sink, which is what
`collectTelemetry` is still doing and is now the only thing it is doing that
matters.

**5** Contain the failure whose consequence is a missing entry; let the one whose
consequence is a *false* entry propagate. A lost event is visibly absent. A
fabricated timestamp is not, and the clock stamps `appliedAt` on the commit as
well as `occurredAt` on the envelope.

Applied to `idFactory`: no, and it is not a close call. There is nothing to
contain *toward*. A contained sink still has a change to return; a contained id
factory would have to invent an id, and a minted id is a join key (lesson 04) —
inventing one produces a tree whose identity is a lie, which is the fabricated
entry the rule is about. It fails the same test as the clock, for the same
reason, and it is a good sign if the two felt different before you applied the
rule.

**6** The call sites. Nothing else would have shown it: the type is `void`
either way, the comment is the same sentence either way, and every test passed
because every sink in the repository behaved.

Every sink behaving is not evidence about the guarantee, because a guarantee is
a claim about the sinks that have *not* been written yet — and specifically about
the ones written by somebody who has not read the comment. A codebase where
everybody complies is indistinguishable from one that enforces, right up until
the first stranger, and the first stranger is the case the promise exists for.


