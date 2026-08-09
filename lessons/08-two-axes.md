# 08 — Two axes: stakes and reversibility

**After this lesson you will be able to** say what each of the two axes measures,
give the test that tells you whether two axes are really two, explain why damage
is graded and permanence is a yes-or-no, say why an irreversible change still
arrives with a working undo attached, name the two reasons a change is called
irreversible and where each one comes from, and describe how a host can collapse
the two axes back into one without writing any code.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md).

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. `analyzeDelta` takes a tree and a delta and no policy. Name what that buys,
   and name what it costs. (L07)
2. Three of the four inverses are a handful of fields and one is unbounded.
   Which one, and what is its size a function of? (L06)
3. Give the property that decides whether a value may be read inside a function
   or has to arrive as a parameter. (L05)
4. Why is a half-applied delta worse than a rejected one? (L03)
5. A card was deleted and an identical one built in its place. Is it the same
   node? Name what decides, and name one thing in the system that would report
   the difference. (L04)

Question 2 is the one this lesson spends, so get it exact.

---

## Predict

In writing, before reading on.

> 1. You are building the thing that decides whether a proposed change may be
>    applied. You have already ruled out a single risk score. Write down the
>    **two** properties you would grade instead, and for each one write down how
>    many distinct values its scale has. Then find one property of a change that
>    belongs to *both* of your scales, write it down, and say what your system
>    does to a change that has it.
>
> 2. A change trips three separate concerns. Each one, on its own, your system
>    rates `medium`. Write down the level you would report for the change as a
>    whole. Then write down what your answer implies about a change that trips
>    thirty `medium` concerns, and decide whether you still believe it.
>
> 3. A change sets one prop on one node. The interpreter is 99% sure of it, and
>    the person who asked has the widest latitude the policy grants. It is also
>    permanent — undoing it in the tree will not undo what it did. Write down
>    what should happen to it. Then, separately: when a system reports that a
>    change cannot be undone, what should it be holding in the field called
>    `inverse` — nothing, something partial, or a complete delta? Commit to one.

Question 1 is the one to spend time on, and the entry you write for "belongs to
both" is the one the lesson is going to argue with. Question 3's second half has
an answer most people find backwards on first reading.

---

## The problem

Here are two changes. Rank them.

> **A.** Delete the page's entire footer — a slot, four elements, eleven text
> nodes. Sixteen nodes gone.
>
> **B.** Set `live` from `false` to `true` on one checkout button. One
> operation, one prop, one node, and the confirmation emails start sending.

Whatever you are building, something has to say which of these gets applied
without a person and which does not. Suppose the answer is a single number, a
"risk" score, and the rule is that changes above a threshold need a human.

Put A above B and B gets applied automatically — sixteen nodes is obviously more
than one prop, and the emails go out. Put B above A and every footer deletion in
the product now needs a human, which sounds prudent until you watch what happens
to the humans: they see forty of them a week, all fine, all reversible, and they
learn to click through. The rule that fires constantly for harmless things is
the rule that stops being read, and it stops being read right before the one
that mattered.

There is no third ordering. The scale is one-dimensional and the two changes are
extreme in different directions, so any position you choose for them is wrong
about one of them.

Notice what is *not* the objection here. Lesson 07 rejected a score because you
cannot divide a measurement back out of a judgment afterwards — an argument
about the record. This is a different complaint, and it lands even if you never
keep a record: A and B are not more-and-less of the same thing. A is large and
completely undoable. B is tiny and permanent. Squeezing both onto one scale does
not lose precision; it loses a distinction.

So the question is not "how risky is this change". It is: **which properties of
a change have to stay separate all the way to the decision, and how would you
know if they had quietly stopped being separate?**

That second half is not rhetorical. It happened here, on 2026-07-28, and a
failing test is what noticed.

---

## The idea

> **How much damage, and whether it can be taken back, are two questions. Grade
> the first. Answer the second yes or no.**

Damage is `stakes` — four levels, with named factors. Permanence is
`reversibility` — a boolean, with named reasons. The Gate sees both, separately,
and lesson 09 is what it does with them.

### The two signatures, and the difference between them

```ts
assessStakes       (input: StakeInput, policy: GatePolicy)
                   → StakeAssessment

assessReversibility(tree, delta, analysis, policy, inverseDeltaId)
                   → Result<Reversibility, TreeError>
```

Read them for what is *missing*. `assessStakes` has no tree — lesson 07's rule,
still holding: judgment does not get to walk the structure. And it cannot fail.
Give it an analysis and a policy and a `StakeAssessment` comes out, always.

`assessReversibility` has the tree, and it returns a `Result`. Both facts have
the same cause, and it is the whole of lesson 06 in one line: **the way this
system answers "can it be undone" is by building the undo.** `invertDelta` needs
the tree, and it can fail, so this axis inherits both.

That asymmetry is worth carrying, because it tells you what kind of claim each
axis is making. Stakes is an opinion about facts already gathered. Reversibility
is a computation with a by-product, and the by-product is the undo itself.

### Four levels, and the highest one wins

`StakeLevel` is `low | medium | high | critical`, and the level of an assessment
is the **maximum** of its factors' levels. Not the sum. Three `medium` factors
come out `medium`; exercise A runs exactly that, and it is worth predicting
before you read on, because "three concerns are worse than one" is a strong
intuition and the code disagrees with it.

The reason is that a sum is a score wearing a disguise. Once three mediums make
a high, somebody has to decide whether four smalls make a medium, and whether a
critical plus a low is worse than a critical — and those weights are exactly what
0002 refused. A maximum needs no weights: the level is the worst single thing
that is true about the change, and you can always name it.

Which is why the level is not the interesting part of the output. `factors` is:

```ts
{ code: "large-removal", level: "medium", detail: "removes 3 nodes" }
```

The level routes the change. The factors explain it. A disposition that says
`high` tells a user nothing they can act on; one that says *removes 14 nodes and
touches `commerce.checkout`* can be argued with, which is the point.

### Why the other axis is not graded

You could imagine grading it — "mostly reversible", "reversible with effort".
Try to write the level boundaries and you will find there are none to write. The
question is whether performing the undo returns the world to where it was, and
the world does not do partial credit: the email is either unsent or sent.

But the axis is not a bare boolean either. It carries `reasons`, in exactly the
shape `factors` has, for exactly the same purpose — and it keeps them as a list
rather than the first one, so a change that is irreversible twice over says so
twice. Both axes obey the same rule: **record what was true, not just what it
added up to.**

### `reversible: false` does not mean there is no undo

This is the one people get backwards, and it is Predict 3's second half.

An irreversible change still arrives with a complete, working inverse delta.
`Reversibility.inverse` is present whether or not `reversible` is true, and the
comment on the field says so in six words: *present even when `reversible` is
false*. Exercise B takes an inverse from an assessment that has just declared the
change irreversible, applies it, and gets the original tree back byte for byte.

That is not a contradiction, because the two statements are about different
things:

> The **inverse** is a claim about the tree. `reversible` is a claim about the
> world.

Lesson 06 made this argument against snapshots and it lands here as the payoff: a
snapshot lets you say *yes, anything is undoable*, because putting a copy back
always works — and that is a fact about your document, which stops being useful
the moment a node configures a payment flow. Loom computes the document-level
undo *and* keeps a separate field for whether it is worth anything. Handing over
an undo you have just described as insufficient is honest rather than confused:
the host may still want it, and the runtime is not the thing that gets to decide
that.

### Two reasons, arriving from opposite directions

Exactly two things make a change irreversible.

**`out-of-tree-effect`.** A primitive whose configuration reaches outside the
tree — a live payment flow, a sent message. Host vocabulary, declared in
`outOfTreeEffectTypes`, and it has to be declared: Loom Core cannot know which of
your primitives sends email. This one says *the undo would run and would not
help*.

**`retention-budget-exceeded`.** The removal is bigger than
`inverseRetentionBudget`, which defaults to 200 nodes. This one says *the undo
would work perfectly and we decline to carry it*.

Those are not two flavours of one thing. The first is a fact about reality that
Loom is told. The second is a policy about Loom's own storage, and it exists only
because of lesson 06's asymmetry — three of the four inverses are a handful of
fields and the inverse of a `remove` is as large as whatever you deleted. The
budget is where that asymmetry finally costs something.

The comparison is `removedNodeCount > budget`, strictly. A removal that exactly
fills the budget is still reversible, which is a boundary worth having run rather
than assumed; exercise C runs it.

### What the budget actually counts

Read `assessReversibility` closely and one line does something you might not
expect:

```ts
retainedNodeCount: analysis.removedNodeCount
```

The reversibility axis does not measure the inverse. It re-uses a number the
damage axis already computed, and the unit is **nodes destroyed** — not the
weight of the delta that would restore them.

For a removal those coincide, and for the other three operations they part
company. A `configure` destroys the previous values of the props it overwrites;
nothing in the tree holds them afterwards, and the inverse is the only thing that
does. Those values are not nodes, so they are not counted, so the budget cannot
see them. Exercise D puts a 4187-byte inverse and a 4075-byte inverse in front of
the same policy and gets `false` and `true`.

Is that a bug? Make your own case before reading the answer to D. The field is
honestly named — "nodes an inverse delta may retain" is precisely what it does —
and the argument that this is fine rests on props being small, which is a claim
about hosts rather than about Loom.

### Orthogonality is a property of the knobs, not of the inputs

Here is where most readings of "two independent axes" go wrong, including,
probably, the answer you wrote for Predict 1.

Independence does **not** mean the axes are computed from disjoint inputs. They
are not. Two of `ChangeAnalysis`'s ten fields feed both:

| Field | Feeds stakes via | Feeds reversibility via |
| --- | --- | --- |
| `removedNodeCount` | `large-removal`, thresholds 3 / 12 | `retention-budget-exceeded`, budget 200 |
| `touchedPrimitiveTypes` | `protected-type-touched` | `out-of-tree-effect` |

One number, two axes. So what makes them independent?

> **Two axes are two axes when every combination of their values is reachable.**

That is the test, it is empirical, and exercise C is it: one delta, four
policies, and all four cells of the grid — low/reversible, medium/reversible,
low/irreversible, medium/irreversible — produced from the same
`removedNodeCount` of 2. The shared input does not couple the axes because each
axis reads it through its own knob, and the knobs move independently.

Now run that test on the design 0002 rejected. Under a single blended axis, or
under the implementation where out-of-tree effects raised the damage estimate
*and* set the irreversible flag, one cell is not reachable: you cannot express
"permanent, but not much damage". That is not a tuning problem. A combination
that cannot be represented is a change the system is unable to describe, and the
one it could not describe was B from *The problem* — small, confident, permanent.

Which is exactly how it was caught, and the record says so plainly:

> **One combined "risk" axis.** Rejected during implementation, by a failing
> test: a change that was small, confident, and irreversible was being refused
> outright instead of escalated, because out-of-tree effects were feeding both
> axes and double-counting. The test was right and the design was wrong.

Sit with the failure mode, because it is not the one you would predict. The
system was being *too strict*. It refused a change it should have offered to a
person, and a design error that makes a system cautious is the kind that survives
review — nobody files a bug because the robot asked permission. It took a test
that had written down the expected disposition to notice.

### The line the code does not draw

0002 says no input may feed both axes, and now you know the code satisfies that
at the level of *declarations* rather than of *types*. `protectedPrimitiveTypes`
and `outOfTreeEffectTypes` are separate lists, and nothing stops a host from
putting `commerce.checkout` in both.

Nor should it, necessarily. A checkout plausibly *is* both precious and
out-of-tree, and 0002 explicitly endorses composing knobs — a host that wants a
hard block on a primitive is told to declare it protected and lower the refusal
floor. But apply this section's test to a policy that double-lists, and one cell
goes missing again: there is no longer any change that touches that type,
triggers the out-of-tree reason, and leaves stakes low.

Exercise E runs it, and adds the refusal floor as a second variable so you can
watch the cell's disappearance turn into a different disposition. Whether that is
a flaw or a host getting what it asked for is a question the exercise puts to you
rather than answers, and the difference between then and now is worth stating
either way: in July the runtime double-counted with nobody asking. Today only a
host can do it, deliberately, in its own configuration, under its own policy
name — and `policyId` is on every disposition, so the record says which.

### The one that could have been permanence and is damage

There is a third thing that could plausibly have made a change irreversible, and
it is instructive that it did not.

A revert computed from the log can write over revisions that came after the one
it is returning to. The proposal declares this — `discards`, a list of revisions
and the nodes they touched (0035) — and it produces a `discards-later-work`
stake factor at level `high`. Damage. Not irreversibility.

The reason is one sentence, and it is the sharpest available statement of where
the line between the two axes runs:

> The discarded revisions stay in the log, and the tree they made can be restored
> by undoing the undo.

Nothing was destroyed. Something was *overwritten*, which is bad, and recoverable
by the ordinary mechanism. Compare it with the retention budget, where the
content genuinely has nowhere else to live, and the two look nothing alike
despite both being about content you might want back.

Exercise F runs the same delta twice, differing only in whether the proposal
declared what it writes over — and the difference between `accepted` and
`requires-confirmation` comes from a field the delta itself cannot express.

### What the Gate does with two of them

Briefly, because it is lesson 09's subject. The Gate is six ordered rules, first
match wins, and two of the orderings matter here:

- Irreversibility is escalated **before** the stakes ceiling is consulted. The
  ceiling is per-origin — a developer may auto-apply `high` stakes, a scheduled
  adaptation may not — and permanence must not depend on who asked. That is what
  keeps *The problem*'s change B out of the auto-apply path.
- The refusal floor is checked **before** either. A host that has declared this
  much damage refusable gets a refusal, and the escalations do not override it.

Exercise E's last two rows are that second bullet, and lesson 09 is where the
whole ladder gets an argument rather than a mention.

---

## In the code

| What | Where |
| --- | --- |
| The damage axis: seven factors, highest wins | [`src/runtime/stakes.ts`](../src/runtime/stakes.ts) |
| Four levels, and the comparisons on them | [`src/runtime/stake-level.ts`](../src/runtime/stake-level.ts) |
| The permanence axis, and where the undo comes from | [`src/runtime/reversibility.ts`](../src/runtime/reversibility.ts) |
| Both axes assembled, and the last place a tree is touched | [`src/runtime/assessment.ts`](../src/runtime/assessment.ts) |
| Which knob moves which axis | [`src/runtime/policy.ts`](../src/runtime/policy.ts) |
| What a decision records about each axis | [`src/runtime/disposition.ts`](../src/runtime/disposition.ts) |
| The tests that caught the one-axis design | [`src/runtime/gate.test.ts`](../src/runtime/gate.test.ts), [`src/runtime/reversibility.test.ts`](../src/runtime/reversibility.test.ts) |

---

## Try it

Predict every output in writing before running anything. Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "./ids.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { ProposedChange } from "./runtime/proposal.js"
import { assessReversibility } from "./runtime/reversibility.js"
import { assessStakes } from "./runtime/stakes.js"
import { sampleTree } from "./testing/fixtures.js"
import { applyDelta } from "./tree/apply.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"
import { createTree } from "./tree/tree.js"

const spare = sequentialIdFactory("x")

const deltaOf = (treeId: TreeId, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(), treeId, baseRevision: 0, operations,
})

/** A proposal from the most trusted origin, as sure of itself as it can be. */
const proposalOf = (delta: TreeDelta): ProposedChange => ({
  proposalId: spare.proposalId(),
  intentId: spare.intentId(),
  delta,
  rationale: "teaching",
  provenance: {
    origin: "developer", interpreter: "scratch", authoredBy: "model",
    confidence: 0.99, interpretedAt: "2026-08-09T00:00:00.000Z",
  },
})
```

**A — three concerns against one.** Write down both levels, and the factor codes,
before you run it.

```ts
describe("A", () => {
  it("weighs three concerns against one", () => {
    const { tree, ids } = sampleTree()

    const stakesOf = (policy: GatePolicy, operations: TreeOperation[]) => {
      const r = analyzeDelta(tree, deltaOf(tree.treeId, operations))
      if (!r.ok) return JSON.stringify(r.error)
      return JSON.stringify(assessStakes({ analysis: r.value, discards: [] }, policy))
    }

    const shape = gatePolicySchema.parse({ policyId: "shape", breadthThreshold: 2 })
    const precious = gatePolicySchema.parse({ policyId: "precious", protectedPropKeys: ["variant"] })

    console.log("three concerns:", stakesOf(shape, [{ op: "remove", nodeId: ids.main }]))
    console.log("one concern:   ", stakesOf(precious, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]))
    // Q1: which change would you rather be handed at 3am, and which one does
    //     this system route more carefully? Then say what you would have to
    //     change to make the first one outrank the second, and what that would
    //     oblige you to decide next.
  })
})
```

**B — the undo it says is not good enough.** Six lines of output. The last one is
a boolean and it is the one to commit to in writing.

```ts
describe("B", () => {
  it("calls a change irreversible and hands over the undo anyway", () => {
    const { tree, ids } = sampleTree()
    const live = gatePolicySchema.parse({ policyId: "live", outOfTreeEffectTypes: ["loom.card"] })

    const delta = deltaOf(tree.treeId, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ])
    const analysis = analyzeDelta(tree, delta)
    if (!analysis.ok) throw new Error(analysis.error.code)

    const rev = assessReversibility(tree, delta, analysis.value, live, spare.deltaId())
    if (!rev.ok) throw new Error(rev.error.code)

    console.log("reversible:", rev.value.reversible)
    console.log("reasons:   ", JSON.stringify(rev.value.reasons))
    console.log("retained:  ", rev.value.retainedNodeCount)
    console.log("inverse:   ", JSON.stringify(rev.value.inverse.operations))
    console.log("stakes:    ", JSON.stringify(
      assessStakes({ analysis: analysis.value, discards: [] }, live)))

    const applied = applyDelta(tree, delta)
    if (!applied.ok) throw new Error(applied.error.code)
    const undone = applyDelta(applied.value, rev.value.inverse)
    if (!undone.ok) throw new Error(undone.error.code)

    console.log("the undo restores the tree exactly:",
      JSON.stringify(undone.value.root) === JSON.stringify(tree.root))
    // Q2: `retained` is 0 and `reversible` is false. Say in one sentence what
    //     each of those two numbers is a claim about. Then: this change is the
    //     smallest thing the fixture can express. What is its stake level, and
    //     is that the right answer?
  })
})
```

**C — one knob at a time.** Five rows. Predict `stakes`, `reversible` and
`retained` for each, and predict the fifth row especially carefully.

```ts
describe("C", () => {
  it("turns one knob at a time", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, [{ op: "remove", nodeId: ids.card }])
    const analysis = analyzeDelta(tree, delta)
    if (!analysis.ok) throw new Error(analysis.error.code)
    console.log("removedNodeCount:", analysis.value.removedNodeCount)

    const both = (label: string, policy: GatePolicy) => {
      const rev = assessReversibility(tree, delta, analysis.value, policy, spare.deltaId())
      if (!rev.ok) throw new Error(rev.error.code)
      console.log(label,
        "stakes:", assessStakes({ analysis: analysis.value, discards: [] }, policy).level,
        " reversible:", rev.value.reversible,
        " retained:", rev.value.retainedNodeCount)
    }

    const grid = (medium: number, budget: number) =>
      gatePolicySchema.parse({
        removalThresholds: { medium, high: 12 },
        inverseRetentionBudget: budget,
      })

    both("medium 3, budget 200:", grid(3, 200))
    both("medium 2, budget 200:", grid(2, 200))
    both("medium 3, budget 1:  ", grid(3, 1))
    both("medium 2, budget 1:  ", grid(2, 1))
    both("medium 3, budget 2:  ", grid(3, 2))
    // Q3: one delta, one measurement, four different pairs of answers. Name the
    //     single number both axes are reading here, then say why reading the
    //     same number does not make them the same axis. The fifth row is a
    //     boundary — state it as a comparison operator.
  })
})
```

**D — what the budget can see.** Not the fixture: a card carrying two 2000-character
props. Two deltas, one policy, and the byte counts are printed so you cannot
argue with them.

```ts
describe("D", () => {
  it("weighs two inverses of nearly the same size", () => {
    const factory = sequentialIdFactory()
    const card = buildElement(factory, {
      type: "loom.card",
      props: { copy: "A".repeat(2000), notes: "B".repeat(2000) },
      children: [buildText(factory, "hello")],
    })
    const tree = createTree(buildElement(factory, { type: "loom.page", children: [card] }), factory)

    const policy = gatePolicySchema.parse({ policyId: "thrifty", inverseRetentionBudget: 1 })

    const check = (label: string, operations: TreeOperation[]) => {
      const delta = deltaOf(tree.treeId, operations)
      const analysis = analyzeDelta(tree, delta)
      if (!analysis.ok) throw new Error(analysis.error.code)

      const rev = assessReversibility(tree, delta, analysis.value, policy, spare.deltaId())
      if (!rev.ok) throw new Error(rev.error.code)

      console.log(label,
        "reversible:", rev.value.reversible,
        " retained:", rev.value.retainedNodeCount,
        " inverse bytes:", JSON.stringify(rev.value.inverse.operations).length)
    }

    check("delete the card:", [{ op: "remove", nodeId: card.id }])
    check("blank its props:", [
      { op: "configure", nodeId: card.id, set: { copy: "", notes: "" }, unset: [] },
    ])
    // Q4: the budget is 1 node. One of these is refused and one is waved
    //     through, and their inverses differ by under 3%. Decide whether that
    //     is a bug, and — the part that matters — say what your fix would do to
    //     the telemetry column that already exists, and to a query written
    //     against it last month.
  })
})
```

**E — one type in two vocabularies.** Five policies, one delta. Write all five
dispositions down first; at least one of them is not what you expect.

```ts
describe("E", () => {
  it("puts one primitive type in both vocabularies", () => {
    const { tree, ids } = sampleTree()
    const proposal = proposalOf(deltaOf(tree.treeId, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]))

    const run = (label: string, policy: GatePolicy) => {
      const assessed = assessChange(tree, proposal, policy, spare.deltaId())
      if (!assessed.ok) throw new Error(assessed.error.code)
      const disposition = gate(assessed.value, policy)
      console.log(label, JSON.stringify({
        stakes: assessed.value.stakes.level,
        reversible: assessed.value.reversibility.reversible,
        kind: disposition.kind,
        reason: disposition.reason.code,
      }))
    }

    run("neither list:             ", defaultGatePolicy)
    run("out-of-tree, floor default:", gatePolicySchema.parse({
      policyId: "a", outOfTreeEffectTypes: ["loom.card"],
    }))
    run("both lists,  floor default:", gatePolicySchema.parse({
      policyId: "b", outOfTreeEffectTypes: ["loom.card"], protectedPrimitiveTypes: ["loom.card"],
    }))
    run("out-of-tree, floor high:   ", gatePolicySchema.parse({
      policyId: "c", outOfTreeEffectTypes: ["loom.card"], refusalFloor: "high",
    }))
    run("both lists,  floor high:   ", gatePolicySchema.parse({
      policyId: "d", outOfTreeEffectTypes: ["loom.card"],
      protectedPrimitiveTypes: ["loom.card"], refusalFloor: "high",
    }))
    // Q5: rows 2 and 3 reach the same disposition by different routes — say what
    //     is different about them anyway. Then rows 4 and 5: one fact about this
    //     change, two host declarations, and a change of verdict. Is that the
    //     bug 0002 describes, or a host getting precisely what it configured?
    //     Argue it, then say what you would change in `policy.ts`, if anything.
  })
})
```

**F — the axis it did not go on.** The same delta twice.

```ts
describe("F", () => {
  it("writes over work that is still in the log", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, [
      { op: "configure", nodeId: ids.body, set: { value: "Old copy" }, unset: [] },
    ])

    const run = (label: string, proposal: ProposedChange) => {
      const assessed = assessChange(tree, proposal, defaultGatePolicy, spare.deltaId())
      if (!assessed.ok) throw new Error(assessed.error.code)
      const disposition = gate(assessed.value, defaultGatePolicy)
      console.log(label, JSON.stringify({
        stakes: assessed.value.stakes.level,
        factors: assessed.value.stakes.factors.map((factor) => factor.code),
        reversible: assessed.value.reversibility.reversible,
        retained: assessed.value.reversibility.retainedNodeCount,
        kind: disposition.kind,
        reason: disposition.reason.code,
      }))
    }

    run("undeclared:", proposalOf(delta))
    run("declared:  ", { ...proposalOf(delta), discards: [{ revision: 4, nodeIds: [ids.body] }] })
    // Q6: `reversible` is the same on both lines. Say why that is right, in one
    //     sentence, without using the word "reversible". Then: the second line
    //     is `high` because of something the delta does not contain. Name what
    //     would have to be true of a *dishonest* declaration for this to be
    //     unsafe, and check whether it can be.
  })
})
```

---

## It could have been otherwise

**One blended risk axis.** The rejected design, and now you have its failure mode
precisely: it makes a combination unrepresentable. The failing test in July
described a small, confident, irreversible change and expected an escalation; the
implementation refused it, because out-of-tree effects were raising damage as
well as clearing the reversible flag. Note which direction the bug ran — toward
caution — and how easily that survives a review.

**Reversibility as a property a primitive declares.** `loom.checkout` announces
"I am not reversible", and the runtime believes it. 0002 keeps this as an *input*
and rejects it as the mechanism: a declaration is a claim, and producing the
inverse is a proof. Computing it also proves the delta applies at all, which is
one fewer thing to discover later. The out-of-tree list is the residue — the part
that genuinely cannot be computed, because nothing in a tree knows an email was
sent.

**Grading reversibility too — "mostly reversible", "reversible with effort".**
Symmetrical and appealing, and it dissolves when you try to write the boundaries.
The two reasons Loom has are not points on a scale: one is about reality and one
is about storage, and a level that blends them would need a weight, which is the
thing this whole design refuses.

**Making `discards-later-work` an irreversibility reason instead of a stake
factor.** The strongest of the alternatives, since discarded work is genuinely
lost from the *tree*. Rejected because it is not lost from the log, so an undo of
the undo restores it — and if that counted as irreversible, so would every
ordinary edit, since every edit writes over the state before it.

**Refusing a policy that lists a type in both vocabularies.** Never proposed, and
worth deciding for yourself after exercise E. It would enforce 0002's letter at
the cost of a real configuration — a checkout that is both precious and
out-of-tree — and it would replace a host's explicit choice with the runtime's
opinion about what a host may mean.

**Summing the factors instead of taking the maximum.** Cheap to write and it
reintroduces weights immediately: three mediums make a high, so somebody must
decide about four lows, and about two highs versus one critical. The weights
would then need tuning, and a tuned number is 0002's original objection with
extra steps.

---

## Explain it back

Closed book.

1. Explain the two axes to somebody who has built an approval system with a
   single risk score. **Do not use the word "orthogonal".** Get to a concrete
   change their system must place wrongly, and then give them the test they could
   run against their own code today to find out whether they have the same bug.

2. **Derive it from lesson 06.** Lesson 06 argued against snapshot undo partly
   because "anything is undoable" is a claim about a document. Show that
   `reversible` and `inverse` are that same distinction turned into two fields,
   and then say what would go wrong if the runtime dropped the inverse whenever
   it set `reversible: false`.

3. **Derive it from lesson 07.** Lesson 07's rule was that measurement carries no
   policy and judgment carries no tree. `assessReversibility` takes both. Explain
   why that is not a violation, by saying which part of it is the measurement and
   which is the judgment — then say what it would cost to split them into two
   exported functions, and whether you would.

4. Find a system in your own experience that graded one thing and should have
   graded two — a severity field, a priority scale, a single "risk" column. Which
   combination could it not express? What did people do instead, and how long did
   the workaround last?

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
rating is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. Give the test for whether two axes are really two, in one sentence. Then apply
   it to `stakes` and `reversibility`, naming the input they share.

2. A change comes back `reversible: false`. Say what the assessment contains in
   `inverse`, what it contains in `retainedNodeCount`, and what each of those two
   is a claim about.

3. Name the two irreversibility reasons, say which one is host vocabulary and
   which is a structural knob, and give the one-sentence difference in what they
   assert.

4. A revert writes over three revisions of somebody else's work. Say which axis
   that lands on and why, and give the property of the log that decides it. Then
   name the thing that would have to be true for the answer to flip.

---

## Reflect

- Predict 1: what did you write for "belongs to both scales"? If you wrote
  nothing, the section on knobs is the one to reread — two axes sharing an input
  is the normal case, not the broken one. If you wrote something and concluded
  the design was therefore wrong, you made the same inference the July
  implementation did.
- Predict 2 asked about three `medium` concerns. If you wrote `high`, you were
  summing, and it is worth writing down now what your rule would have said about
  thirty of them.
- Predict 3's second half asked what an irreversible change holds in `inverse`.
  Exercise B answered it and then applied the thing. If your answer was
  "nothing", say what you were assuming `reversible` was a claim about.
- Lesson 07 ended by asking whether you would file exercise D's empty
  `touchedPrimitiveTypes` as a bug. You now know that field also feeds the
  reversibility axis, through `outOfTreeEffectTypes`. Does that change your
  answer? Write one sentence; this is the third time the question has been put to
  you and the first time you have had both axes in hand.
- Which of the four cells in exercise C's grid did you predict wrongly? That one
  is the coupling you were assuming, and it is worth naming out loud.

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** From memory, write the seven stake factor codes with their
  levels, then the two irreversibility reasons. Then say, for each of the seven,
  whether the input it reads also feeds the other axis.
- **In 1 month:** Redo exercise C from memory — predict all five rows, including
  the boundary — and then say what the grid would look like if `removalThresholds`
  and `inverseRetentionBudget` were one knob.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0002`](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) — the two axes, and the test that caught the one-axis design
- [`decisions/0032`](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md) — why an undo goes back through the Gate like anything else
- [`decisions/0035`](../decisions/0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md) — the thing that could have been irreversibility
- [`src/runtime/gate.test.ts`](../src/runtime/gate.test.ts) — the tests are the specification
- Next: 09 — The Gate *(not yet written)*

---

## Answers

**Q1** Three concerns against one:

```
three concerns: {"level":"medium","factors":[{"code":"large-removal","level":"medium","detail":"removes 3 nodes"},{"code":"broad-change","level":"medium","detail":"touches 3 nodes"},{"code":"shallow-structural-change","level":"medium","detail":"restructures at depth 1"}]}
one concern:    {"level":"high","factors":[{"code":"protected-prop-configured","level":"high","detail":"configures protected variant"}]}
```

Deleting a slot and everything in it trips three factors and comes out
**medium**. Setting one prop on one node trips one factor and comes out
**high**. The second change is routed more carefully than the first, and the
factors are the whole explanation: the host said `variant` carries meaning, and
nothing the first change did was worse than `medium` on its own.

`highestStake` takes the maximum, so the factor list length never enters the
level. To make the first outrank the second you would have to sum — and then
immediately answer the next three questions, which are whether four lows make a
medium, whether two highs make a critical, and what the numbers are. That is the
weighted score 0002 rejected, arrived at by accident in three steps.

Worth noticing what is *not* lost by taking the maximum. All three factors are
still in the record, with their details. A reader of this assessment can see
exactly what the change did; what they cannot see is a claim that three medium
things add up to something the system has a name for.

**Q2** The undo it says is not good enough:

```
reversible: false
reasons:    [{"code":"out-of-tree-effect","primitiveTypes":["loom.card"]}]
retained:   0
inverse:    [{"op":"configure","nodeId":"n_4","set":{"variant":"outlined"},"unset":[]}]
stakes:     {"level":"low","factors":[]}
the undo restores the tree exactly: true
```

`retained: 0` says the inverse carries no destroyed content — a claim about the
**delta's size**. `reversible: false` says undoing the tree would not undo what
happened — a claim about the **world**. They are not in tension because they are
not about the same thing, and the last line settles it: the inverse works
perfectly, restores the tree byte for byte, and the assessment still says the
change cannot be taken back. The tree goes back. The email does not.

Note also what the inverse contains: `set: {variant: "outlined"}` — the *old*
value, which existed nowhere else once the change applied. Lesson 06's point
about the inverse being the only holder of destroyed content applies to
`configure` too, in miniature.

The stake level is `low`, with no factors at all. This is change B from *The
problem*, reproduced: the smallest thing the fixture can express, and permanent.
Under a single risk axis there is nowhere to put it, and that is the entire
lesson in six lines of output.

**Q3** One delta, four pairs of answers:

```
removedNodeCount: 2
medium 3, budget 200: stakes: low     reversible: true   retained: 2
medium 2, budget 200: stakes: medium  reversible: true   retained: 2
medium 3, budget 1:   stakes: low     reversible: false  retained: 2
medium 2, budget 1:   stakes: medium  reversible: false  retained: 2
medium 3, budget 2:   stakes: low     reversible: true   retained: 2
```

The shared number is `removedNodeCount`, which is 2 for all five rows and is read
by both axes: by `largeRemoval` against `removalThresholds.medium`, and by the
retention check against `inverseRetentionBudget`. `retained` never moves, because
it *is* that number — `assessReversibility` assigns
`retainedNodeCount: analysis.removedNodeCount` and computes nothing of its own.

Reading the same number does not make them one axis, because each reads it
through a knob the other does not touch, and all four combinations are reachable:
rows 1–4 are low/reversible, medium/reversible, low/irreversible,
medium/irreversible. That reachability is the test. Under the July design one
cell was missing, and a missing cell is a change the system cannot describe.

Row 5 is the boundary: 2 nodes removed against a budget of 2 stays **reversible**,
because the check is `removedNodeCount > policy.inverseRetentionBudget` — strictly
greater. A removal that exactly fills the budget fits.

**Q4** Two inverses, one policy, opposite verdicts:

```
delete the card: reversible: false  retained: 2  inverse bytes: 4187
blank its props: reversible: true   retained: 0  inverse bytes: 4075
```

The refused inverse is 4187 bytes. The accepted one is 4075 — 97% of it. The
budget of 1 node stopped the first and could not see the second, because the
second destroys no nodes: it overwrites two props, and the 4000 characters that
have nowhere else to live ride into the inverse as `set` values that
`retainedNodeCount` does not count.

*The case that it is fine.* The field is named for what it does. `inverseRetentionBudget`
is documented as "nodes an inverse delta may retain", `retainedNodeCount` as
"nodes the inverse must carry — the content a removal destroyed", and both are
accurate. Node count is a stable, host-independent unit; bytes are not, since
they depend on how a host serialises. And the case rests on props being small,
which they usually are.

*The case that it is a gap.* The budget's stated purpose is the point at which
"undo stops being practical", and practicality is about weight. A host that
stores content in props — and nothing forbids it — has a budget that cannot see
its largest inverses. The blind spot is not proportional to anything: it is
total, because a `configure` contributes exactly zero to the number the check
reads.

The part worth more than the verdict is what a fix would cost. `retainedNodeCount`
is not local: it is a column in `assessmentSummarySchema`, retained per change in
telemetry, sitting beside `removedNodeCount` — where it is, today, provably the
same integer. Redefine it to mean the inverse's true weight and the two columns
diverge, silently, from the day of the deploy. Every query written against either
one keeps running and starts meaning something else. Lesson 07's argument about
comparability across a corpus applies to this field, and the cheapest honest fix
is therefore documentation plus a *new* field, not a redefinition of this one.

**Q5** Five policies, one delta:

```
neither list:              {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
out-of-tree, floor default: {"stakes":"low","reversible":false,"kind":"requires-confirmation","reason":"irreversible"}
both lists,  floor default: {"stakes":"high","reversible":false,"kind":"requires-confirmation","reason":"irreversible"}
out-of-tree, floor high:    {"stakes":"low","reversible":false,"kind":"requires-confirmation","reason":"irreversible"}
both lists,  floor high:    {"stakes":"high","reversible":false,"kind":"rejected","reason":"stakes-at-refusal-floor"}
```

Row 1 is the baseline: nothing declared, so the same change is simply accepted.
Row 2 is change B — one prop, 99% confidence, the widest ceiling in the policy,
and it still requires a person, because `confirmIrreversible` sits above
`confirmAboveCeiling` in the ladder.

Rows 2 and 3 reach the same disposition and are not the same record. Row 3 says
`stakes: high`, so the journal entry for an identical change under two different
policies carries a different damage estimate — which is exactly what lesson 07
said the retained numbers were for. Same verdict, different evidence.

Rows 4 and 5 are where it bites. One fact about the change — it touches
`loom.card` — is declared twice, and the second declaration pushes stakes to
`high`, where the host's lowered floor turns a confirmation into a refusal. Under
the same floor with only one declaration, it stays a confirmation.

**Is that 0002's bug?** No, and the distinction is the useful part. In July the
*runtime* did this: one host declaration produced escalation on both axes, and no
configuration could avoid it. Here the host wrote `loom.card` in two lists and
lowered its refusal floor to `high`, which is precisely the composition 0002
recommends to anyone wanting a hard block on a primitive. The system did what it
was told, and `policyId: "d"` is stamped on the disposition, so a reader a month
later can go and look at what "d" meant.

What is true is that the guarantee is narrower than 0002's wording suggests. "No
input may feed both axes" holds over declarations, not over types, and a host can
make one property of the world feed both. If I were changing `policy.ts` I would
not enforce disjointness — a checkout really is both — but I would say this in
the schema comments, because a reader of 0002 currently has grounds to believe
the runtime prevents something it does not.

**Q6** The same delta, twice:

```
undeclared: {"stakes":"low","factors":[],"reversible":true,"retained":0,"kind":"accepted","reason":"within-policy"}
declared:   {"stakes":"high","factors":["discards-later-work"],"reversible":true,"retained":0,"kind":"requires-confirmation","reason":"discards-later-work"}
```

`reversible` is `true` on both lines and it should be: everything this change
writes over is still in the log, and the state it replaced can be reached again
by the ordinary mechanism. Nothing is gone. Something is merely no longer on
top — which is damage, and damage is graded.

The escalation comes from `discards`, a field on the proposal that the delta
cannot express: "set this text back" and "set this text back, throwing away what
two people wrote afterwards" are the same four operations (0035). Only something
holding the log can tell them apart, so the thing that computed the delta from a
log says so alongside it.

A dishonest declaration would have to make the Gate *more permissive* to be
unsafe — and it cannot. `discards` only ever adds a factor at `high`; there is no
value of it that removes one or lowers a level. Understating it (declaring
nothing, the default) gives you the top line: accepted, with the discarding
happening anyway and nobody told. That is a real failure mode and it is a bug in
whatever computed the proposal, not a loophole in the Gate, which is why 0035 puts
the declaration on the runtime rather than on a model.

**1** Two axes are two axes when every combination of their values is reachable —
not when their inputs are disjoint. `stakes` and `reversibility` share
`removedNodeCount` (read as `large-removal` on one axis and as the retention
budget on the other) and `touchedPrimitiveTypes` (read as `protected-type-touched`
and as `out-of-tree-effect`). They stay independent because each axis reads those
inputs through its own policy knob, and exercise C produces all four cells from
one delta. The July design failed this test: "small damage, permanent" was
unreachable.

**2** `inverse` contains a complete, applicable delta that restores the tree
exactly — always, whatever `reversible` says. `retainedNodeCount` contains the
number of nodes that delta must carry, which is `analysis.removedNodeCount` and
is 0 for any change that removes nothing.

The inverse is a claim about the tree: this is what it would take to put the
structure back. `reversible` is a claim about the world: whether putting the
structure back would undo what the change did. A snapshot system can only ever
make the first claim, which is why it always answers yes.

**3** `out-of-tree-effect` is host vocabulary — `outOfTreeEffectTypes`, declared
per deployment, because Loom cannot know which of your primitives sends email.
`retention-budget-exceeded` is a structural knob — `inverseRetentionBudget`,
shipping with a default of 200, host-independent.

The difference in what they assert: the first says the undo would run and would
not help; the second says the undo would work perfectly and the runtime declines
to carry it. One is about reality, one is about storage.

**4** Stakes, via the `discards-later-work` factor at `high`. The property of the
log that decides it is that **the log only grows**: the discarded revisions are
still in it, so the tree they made can be restored by undoing the undo. Nothing
was destroyed, so nothing is permanent, so it is not the other axis.

It would flip if the log could forget — if revisions could be compacted or
pruned, a revert past a pruned point really would destroy the only copy, and the
same declaration would have to become an irreversibility reason. Worth holding
onto: telemetry retention (0037) already lets the *journal* forget, and the
reason that does not affect this answer is that the journal and the revision log
are different stores. If they ever merge, this answer changes.
