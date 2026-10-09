# 07 — Measuring a change

**After this lesson you will be able to** say what `analyzeDelta` extracts and
what it deliberately refuses to know, give the rule that decides whether
something belongs in a measurement or in a judgment, explain why one move is
counted twice over — once as a node and once as a subtree — and say what a record
has to contain before "the Gate got stricter" and "the changes got bigger" can be
told apart.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md).

---

## Warm-up

Closed book, five minutes, mixed across six lessons. Write something for all five
before you look anything up.

1. What does `invertOperations` invert each operation *against*, and why can it
   not be the tree the delta started from? (L06)
2. Name the property that decides whether something belongs on
   `CompositionRuntime`. (L05)
3. Which of the four operations mints an id? (L03, L04)
4. A stored reference to a node has gone stale. What do you observe under ids,
   and what do you observe under paths? (L04)
5. Why is `slot` a distinct node kind rather than an element with a special
   name? (L02)

Question 1 is the one this lesson is about to reuse, so get it exact rather than
approximate.

---

## Predict

In writing, before reading on.

> 1. You have a proposed change and you have to decide whether it is dangerous.
>    Write down the list of things you would extract from it first — actual field
>    names, actual types. Then go back through your list and mark each entry **F**
>    or **J**: **F** if two different companies running Loom on two different
>    products would compute the same value for the same delta, **J** if the answer
>    depends on what that company cares about. Count how many of each you wrote.
>
> 2. A delta moves the slot containing a checkout button from the bottom of a page
>    to the top. Nothing else. Write down (a) how many nodes this change affected,
>    and (b) which primitive types it touched. Defend both numbers to somebody who
>    gives you different ones.
>
> 3. Two changes, a month apart, both came back `requires-confirmation`. You want
>    to know whether the Gate got stricter or the changes got bigger. What must
>    have been written down, at the time, for that question to be answerable at
>    all? "The disposition" is not an answer — say what is *in* it.

Question 3 is the one that decides the lesson, and it is worth more than a
minute. Question 1 is the one you will most enjoy being wrong about.

---

## The problem

Something has to decide whether a proposed change may be applied. Write that
function's signature and you have already made the mistake:

```ts
const isDangerous = (tree: LoomTree, delta: TreeDelta, policy: GatePolicy): boolean
```

or, more sophisticated and no better:

```ts
const riskOf = (tree: LoomTree, delta: TreeDelta, policy: GatePolicy): number
```

The usual objection to the second one is that a score is not explainable — you
can tune it and you cannot justify it, and 0002 rejects it in those terms. That
objection is correct and it is not the one that matters here, because the first
signature has the same disease and returns a boolean.

The disease is that both functions do two different jobs in one pass, and only
one of the two jobs is about the change.

Walk it forward a month. You have a hundred of these decisions in a journal.
Somebody asks the question every operator of such a system eventually asks:

> **Are we refusing more than we used to because the model got worse, or because
> we got stricter?**

Look at what the record can answer. If the only thing written down is
`rejected`, the question is unanswerable — not hard, *unanswerable*, because the
two hypotheses predict exactly the same journal. Add the policy name and it is
still unanswerable: you now know the yardstick changed, and you have nothing that
was measured with it.

To tell those two stories apart you need something in the record that is a fact
about the change and holds still while the policy moves. And you cannot extract
that afterwards from a verdict, because the verdict already mixed it in.

That is the problem. It is not "how do we assess a change". It is: **what has to
be true of the measurement for a judgment made with it to remain checkable after
the standards change?**

---

## The idea

One sentence, and it is symmetric:

> **Measurement happens with no policy in the room. Judgment happens with no tree
> in the room.**

The two signatures are the whole design, and they are worth reading side by side
rather than being told about:

```ts
analyzeDelta (tree: LoomTree, delta: TreeDelta)        → Result<ChangeAnalysis, TreeError>
assessStakes (input: StakeInput, policy: GatePolicy)   → StakeAssessment
gate         (assessment: ChangeAssessment, policy)    → Disposition
```

The first takes a tree and no policy. The second takes a policy and no tree. The
third has neither and is a pure function of a small record — 0002 requires it in
those words: *no IO, no clock, no tree, no state*.

So the separation is not a convention anybody has to remember. It is a type
error to break it. There is no way to write a rule about `commerce.checkout`
inside `analysis.ts`, because nothing in that file knows the word `policy`.

### The test for which side something belongs on

Predict 1 asked you to mark each field **F** or **J**. That is the real test, and
here it is stated properly:

> Would two hosts, running Loom on two different products with two different
> ideas about what matters, compute the same value for the same delta against the
> same tree?

`removedNodeCount: 3` — yes, always. `touchedPrimitiveTypes: ["loom.card"]` —
yes; the *list of types present* is a fact, and whether `loom.card` is precious
is not. `stakes: "critical"` — no, obviously. So the first two are measurements
and the third is a judgment, and the boundary is not a matter of taste.

If your Predict 1 list had entries like "touches a payment component" or
"destructive: true", you wrote judgments in the shape of facts. That is the
default failure and it is worth noticing that it does not feel like an error
while you are doing it.

### Policy-free is not purpose-free

Here is the part that is easy to get backwards, so read it slowly.

`ChangeAnalysis` has both `touchedPrimitiveTypes` and `removedPrimitiveTypes`,
and the second is a subset of the first. Why carry a subset separately? Only one
reason: a downstream rule wants to tell *destroying* a primitive from
*reconfiguring* one, and it cannot recover the distinction from the union. The
comment in `analysis.ts` says so outright — "stakes need to tell the two apart."

So the shape of the measurement is chosen by what judgment will need. That is not
a contradiction and it is not a leak. **Analysis anticipates the distinctions
judgment makes; it does not make them.** It hands over both lists and expresses
no opinion about which matters — and a host that protects nothing gets both lists
anyway, at the same cost, meaning nothing.

The practical consequence is the one worth carrying: a measurement that collapses
a distinction is unrecoverable, and a measurement that keeps a distinction nobody
uses costs a field. Those are not symmetric risks, and analysis is built as if it
knows that.

### What counts as one

Three counting rules, and they look inconsistent until you find the sentence they
come from:

- `insert` counts **every node in the inserted subtree**. A banner with two text
  children is 3, from one operation.
- `remove` counts **every node in the removed subtree**, likewise.
- `move` counts **one**, however large the subtree that travels with it. Its
  entry in `affectedNodeIds` is a single id.

The sentence: these numbers answer *how much content did this change bring into
existence or destroy*. A move brings nothing into existence and destroys nothing.
The subtree that rides along is the same subtree, with the same ids, in the same
order (lesson 04 — a `move` does not touch identity), so counting it would be
counting nodes that are exactly as they were.

That is a coherent definition and you should hold onto it, because the next
section is going to charge you for it.

### The same change, worded twice

Here is the situation that definition does not survive on its own, and it is
worth stopping on because it is a whole class of problem rather than one bug.

A page has a slot, `main`, and inside it a card the host has declared protected.
A change moves that card up beside the header. There are two deltas that do it:

```
move main → header      one operation, and the card rides along inside it
move card → header      one operation, and it names the card
```

They are not quite the same physical change — the first also relocates the slot —
but on the question the host cares about, *is the protected card somewhere it
was not*, they are identical. A person looking at the two pages afterwards
cannot tell which delta produced which.

Now recall who writes the delta. **A model chose between those two spellings**,
and nothing in the system told it which to prefer. So if the measurement answers
differently depending on which node the delta names, the verdict downstream moves
with a choice that carries no information — and 0044 states the consequence in
the sharpest available form: *a Gate whose verdict moves with that choice is not
gateable in the sense the project claims. The same proposal, worded twice, gets
two answers.*

That is not a subtlety about moves. It is the general requirement on any
measurement whose input is authored by something that has freedom of expression.

Loom's answer is a fourth counting rule and one definition that holds for all four
operations:

- **`touchedPrimitiveTypes` means created, destroyed, or reconfigured.** A move
  contributes nothing to it, whichever node it names.
- **`relocatedPrimitiveTypes`** carries element types from the *whole moved
  subtree*, and **`relocatedNodeCount`** carries its size — the named node
  included.
- **`movedNodeCount` keeps its old meaning**: nodes a `move` operation *named*.
  One operation relocating two hundred nodes is a fact that now has a field
  instead of being invisible.
- **`affectedNodeIds` stays shallow.** It is the input to a breadth rule, and the
  breadth of a relocation is a different question from the breadth of a rewrite —
  which is exactly why it got its own number rather than being folded into this
  one.

Read that list as one move, not four. Every phrasing-independent reading of a
change forces a choice between two answers, and the rule for picking is
conservative: **where the two spellings disagree, take the reading that raises
the estimate.** Reversibility applies it too — it reads touched *and* relocated
types against the out-of-tree list, because a change wrongly called irreversible
is merely offered for confirmation, while one wrongly called reversible is
applied.

Exercise D is those two deltas, run. You will be asked to predict the numbers and
the levels before you see them, and there is more than one thing in that output
worth being wrong about first.

### Depth, and why the shallowest

`shallowestAffectedDepth` is the cheapest structural signal in the system: root
is 0, and the field reports the smallest depth any operation touched. For a
`move` it is the smaller of where the node came *from* and where it is going
*to*.

Why the shallowest, rather than the average or the deepest? Because the field is
answering "what is the loudest structural claim this change makes". A delta that
retypes one word deep in a leaf *and* deletes the header is a delta that deletes
the header. An average would let the small edit dilute it; the deepest would
report only the small edit. Neither is a summary anyone would want at 3am.

And a `move` takes the shallower end for the same reason — hoisting a leaf to sit
beside the header restructures the page just as much as pushing the header down
into a leaf does. Exercise C runs both directions and gets the same number twice,
which is the point rather than a coincidence.

### The forward walk, for the third time

```
state := the tree the delta starts from
for each operation, in order:
    measure(operation, state)     ← against the state it observes
    state := apply(operation, state)
```

You have seen this loop before. Lesson 03 gave you the property — operations are
ordered, each sees the previous one's effect. Lesson 06 showed that
`invertOperations` is forced into this shape by it. `analyzeDelta` is the same
loop for the same reason: a delta may insert a banner and then configure it, and
an operation measured against the original tree would be measuring a node that
does not exist there.

Three functions in the codebase have this shape — `applyDelta`, `invertDelta`,
`analyzeDelta` — and it is worth being able to say why all three must, because it
is the clearest evidence that lesson 03's ordering property was a real decision
and not a detail.

It also produces the same free property lesson 06 found: because the loop calls
`applyOperation` on the way past, **analysis fails exactly when the delta does not
apply.** Exercise E swaps two operations that are individually fine and watches
the measurement refuse.

### An inapplicable proposal is not a rejected one

`analyzeDelta` returns a `Result` (lesson 05), and its error side is `TreeError`
— `node-not-found`, `index-out-of-range`. Not a stake level. Not a refusal.

The comment on `assessChange` is precise about why that distinction is load-bearing:

> A failure here means the delta does not apply at all — a malformed proposal
> rather than a rejected one. That distinction matters downstream: an
> inapplicable proposal is an interpreter bug, not a policy decision.

Telemetry keeps them as two different events, `assessment-failed` and
`disposition-decided`. Collapse them and a month of "the Gate refused 40 changes"
turns out to include eleven the Gate never saw, because the interpreter produced
something that could not be measured. One of those numbers is a statement about
your policy and the other is a bug report, and they must not be added together.

### What survives the request

The measurement is not kept so the Gate can use it — the Gate has it in hand. It
is kept so the question in *The problem* is answerable later. `change-assessed`
carries an `AssessmentSummary`, and the comment on it is the clearest statement
of this lesson's thesis anywhere in the source:

> The disposition that follows says stakes, reversibility and confidence; this
> says how big the change was and what it touched, which is what makes "the Gate
> refuses this class of change" measurable rather than anecdotal.

Verdict and measurement, side by side, per change. That is what lets somebody a
month later hold one still and watch the other move — which is exactly the
question Predict 3 asked, and the reason lesson 17 on calibration is possible at
all.

Ten of the fourteen analysis fields cross into telemetry. Four do not:
`affectedNodeIds` (unbounded, and identifying), `configuredPropKeys` (host
vocabulary that shades into content), and `nestedTargets` and
`redirectedSubmissions` (both carry node ids and host endpoint names). Work out
for yourself which of the four you would defend, and note that nothing is lost
outright either way: `change-proposed` retains the whole delta, so any of it can
be recomputed against the log. What the summary buys is a column you can group
by, and what it costs is a column you cannot.

Three of those ten arrived after records already existed, and the shape they
arrived in is worth one paragraph because it is a rule rather than a courtesy.
`relocatedPrimitiveTypes`, `relocatedNodeCount` and `removedPrimitiveTypes` are
**optional and never defaulted** (0045). A `.default([])` would have been the
obvious way to add them, and it would have put a sentence in the mouth of every
record written before the field existed: *no types were relocated*. That record
did not decline to name a relocated type — it could not name one. `undefined` and
`[]` are different claims, and a consumer that cannot tell "recorded as none"
from "not recorded" computes a rate whose older half silently reads as zero.
Which is the same failure as *The problem*, one layer down: the record has to
stay honest about what it was in a position to say.

---

## In the code

| What | Where |
| --- | --- |
| The measurement, and the fourteen fields | [`src/runtime/analysis.ts`](../src/runtime/analysis.ts) |
| Facts plus policy, out comes a level | [`src/runtime/stakes.ts`](../src/runtime/stakes.ts) |
| Where the two are stitched together | [`src/runtime/assessment.ts`](../src/runtime/assessment.ts) |
| The knobs, and which kind each is | [`src/runtime/policy.ts`](../src/runtime/policy.ts) |
| What survives the request | [`src/telemetry/event.ts`](../src/telemetry/event.ts) — `assessmentSummarySchema` |
| The tests, which are the specification | [`src/runtime/analysis.test.ts`](../src/runtime/analysis.test.ts) |

---

## Try it

Predict every output in writing before running anything. Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type NodeId, type TreeId } from "./ids.js"
import { analyzeDelta } from "./runtime/analysis.js"
import { defaultGatePolicy, gatePolicySchema } from "./runtime/policy.js"
import { assessStakes } from "./runtime/stakes.js"
import { sampleTree } from "./testing/fixtures.js"
import { buildElement, buildText } from "./tree/builders.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"

const spare = sequentialIdFactory("x")

const deltaOf = (treeId: TreeId, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(), treeId, baseRevision: 0, operations,
})

/** Policy that has been told one primitive matters. Nothing else differs. */
const strict = gatePolicySchema.parse({
  policyId: "strict",
  protectedPrimitiveTypes: ["loom.card"],
})
```

**A — the three counting rules.** Three deltas, one operation each. Write down
all five numbers for each before you run it.

```ts
describe("A", () => {
  it("counts the same tree three ways", () => {
    const { tree, ids } = sampleTree()

    const banner = buildElement(spare, {
      type: "loom.banner",
      children: [buildText(spare, "Sale"), buildText(spare, "Ends Friday")],
    })

    const counts = (operations: TreeOperation[]) => {
      const r = analyzeDelta(tree, deltaOf(tree.treeId, operations))
      return r.ok
        ? JSON.stringify({
            operationCount: r.value.operationCount,
            insertedNodeCount: r.value.insertedNodeCount,
            removedNodeCount: r.value.removedNodeCount,
            movedNodeCount: r.value.movedNodeCount,
            affectedNodeIds: r.value.affectedNodeIds,
          })
        : JSON.stringify(r.error)
    }

    console.log("insert:", counts([{ op: "insert", parentId: ids.page, index: 0, node: banner }]))
    console.log("remove:", counts([{ op: "remove", nodeId: ids.main }]))
    console.log("move:  ", counts([
      { op: "move", nodeId: ids.card, parentId: ids.header, index: 0 },
    ]))
    // Q1: which of the five numbers could you have predicted from the operation
    //     alone, and which needed the tree? Then: the move carries a text node
    //     across the page with it. Find that text node in the output.
  })
})
```

**B — measure once, judge twice.** The same analysis, handed to two policies that
differ in exactly one field.

```ts
describe("B", () => {
  it("measures once and judges twice", () => {
    const { tree, ids } = sampleTree()

    const analysis = analyzeDelta(tree, deltaOf(tree.treeId, [
      { op: "remove", nodeId: ids.card },
    ]))
    if (!analysis.ok) throw new Error(analysis.error.code)

    console.log("analysis:", JSON.stringify(analysis.value))
    console.log("default: ", JSON.stringify(
      assessStakes({ analysis: analysis.value, discards: [] }, defaultGatePolicy)))
    console.log("strict:  ", JSON.stringify(
      assessStakes({ analysis: analysis.value, discards: [] }, strict)))
    // Q2: one measurement, two verdicts. Count the values on the first line that
    //     the second and third lines could have changed. Then say what you would
    //     have to add to `analyzeDelta`'s signature to make that count nonzero —
    //     and what it would cost you a month later.
  })
})
```

**C — depth, five ways.** Six numbers. The last one is a delta with no
operations at all; predict it too.

```ts
describe("C", () => {
  it("measures depth five ways", () => {
    const { tree, ids } = sampleTree()

    const depth = (operations: TreeOperation[]) => {
      const r = analyzeDelta(tree, deltaOf(tree.treeId, operations))
      return r.ok ? r.value.shallowestAffectedDepth : r.error.code
    }

    console.log("configure page:     ", depth([
      { op: "configure", nodeId: ids.page, set: { title: "Home" }, unset: [] },
    ]))
    console.log("insert into main:   ", depth([
      { op: "insert", parentId: ids.main, index: 0,
        node: buildElement(spare, { type: "loom.banner" }) },
    ]))
    console.log("deep edit + footer: ", depth([
      { op: "configure", nodeId: ids.body, set: { value: "Deep" }, unset: [] },
      { op: "remove", nodeId: ids.footer },
    ]))
    console.log("move body -> page:  ", depth([
      { op: "move", nodeId: ids.body, parentId: ids.page, index: 0 },
    ]))
    console.log("move footer -> card:", depth([
      { op: "move", nodeId: ids.footer, parentId: ids.card, index: 0 },
    ]))
    console.log("empty delta:        ", depth([]))
    // Q3: the two moves go in opposite directions and report the same number.
    //     Say what each is measuring. Then the last line: a delta that does
    //     nothing reports depth 0, which is the root. Is that a bug? Answer it
    //     by finding what reads this field and asking whether it would fire.
  })
})
```

**D — the one to slow down on.** Three deltas. In all three the card ends up
somewhere it was not, and the policy has been told `loom.card` is protected.

**Write down, for each of the three: the stake level, and `relocatedNodes`.**
Six numbers. The last two rows are the pair from *The same change, worded twice*,
so you have the definitions — what you do not have is `stakes.ts`, and composing
the two is the exercise.

```ts
describe("D", () => {
  it("removes a subtree, then relocates the same subtree two ways", () => {
    const { tree, ids } = sampleTree()

    const report = (label: string, operations: TreeOperation[]) => {
      const r = analyzeDelta(tree, deltaOf(tree.treeId, operations))
      if (!r.ok) return console.log(label, JSON.stringify(r.error))

      console.log(label, JSON.stringify({
        touched: r.value.touchedPrimitiveTypes,
        removed: r.value.removedPrimitiveTypes,
        relocated: r.value.relocatedPrimitiveTypes,
        moved: r.value.movedNodeCount,
        relocatedNodes: r.value.relocatedNodeCount,
        affected: r.value.affectedNodeIds,
      }))
      console.log("  under strict:", JSON.stringify(
        assessStakes({ analysis: r.value, discards: [] }, strict)))
    }

    report("remove main:", [{ op: "remove", nodeId: ids.main }])
    report("move main:  ", [{ op: "move", nodeId: ids.main, parentId: ids.header, index: 0 }])
    report("move card:  ", [{ op: "move", nodeId: ids.card, parentId: ids.header, index: 0 }])
    // Q4: the last two rows come out at the same level. Say what makes them
    //     agree — and then find the three places in that output where they still
    //     differ, and say for each one whether the difference is a fact about the
    //     change or an artefact of how it was worded.
  })
})
```

**E — the forward walk, and the failure that is not a refusal.** The same two
operations in two orders.

```ts
describe("E", () => {
  it("walks forward, and refuses what does not apply", () => {
    const { tree, ids } = sampleTree()

    const banner = buildElement(spare, { type: "loom.banner" })
    const insert: TreeOperation = { op: "insert", parentId: ids.main, index: 0, node: banner }
    const configure: TreeOperation = {
      op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [],
    }

    const sequenced = analyzeDelta(tree, deltaOf(tree.treeId, [insert, configure]))
    console.log("in order: ", JSON.stringify(sequenced.ok ? sequenced.value : sequenced.error))

    const reversed = analyzeDelta(tree, deltaOf(tree.treeId, [configure, insert]))
    console.log("reversed: ", JSON.stringify(reversed.ok ? reversed.value : reversed.error))

    const missing = "n_nowhere" as NodeId
    const absent = analyzeDelta(tree, deltaOf(tree.treeId, [{ op: "remove", nodeId: missing }]))
    console.log("absent:   ", JSON.stringify(absent.ok ? absent.value : absent.error))
    // Q5: name the other two functions in the codebase with the identical loop,
    //     and the lesson-03 property that forces all three. Then: the third line
    //     is a failure. Is it a refusal? Say what conflating the two costs
    //     somebody reading a month of the journal.
  })
})
```

---

## It could have been otherwise

**A weighted risk score with a threshold.** 0002 rejects it as tunable but not
explainable. Worth adding the version this lesson gives you: a score is a
measurement and a judgment multiplied together, and you cannot divide them again
afterwards. Two changes that scored 0.7 under different weightings have nothing
in common, so a corpus of scores cannot answer a single question about how the
system's standards moved.

**Let each Gate rule read the tree itself.** No `ChangeAnalysis` type at all —
`protectedTypeRemoved(tree, delta, policy)` walks the tree, and so does the next
rule, and the next. Tempting because it deletes a layer. Rejected on three counts:
eight rules walk the tree eight times; two rules can quietly disagree about what
the delta did, because each computes it separately; and the Gate stops being a
pure function of a small record, which is the property 0002 spends its entire
argument on. It also leaves nothing to record — the facts would exist only inside
the rules that consumed them.

**Pass the policy into `analyzeDelta` and measure only what matters.** The
efficient version: if nothing is protected, why collect `touchedPrimitiveTypes`?
This is the one to take seriously, because it is genuinely cheaper and looks
harmless. It fails on the record. A `ChangeAnalysis` computed under policy A and
one computed under policy B would no longer be the same kind of thing, so two
months of journal would stop being comparable at the moment somebody edits a
config file — and re-judging an old change under a new policy would require
re-walking a tree you may no longer be storing.

**Widen `touchedPrimitiveTypes` to include the moved subtree.** One line, and it
makes exercise D's last two rows agree, which is the whole objective. Rejected
because it makes "touched" mean created, destroyed, reconfigured **or**
relocated, and then the factor a reviewer reads says *touches protected
loom.card* about a card nothing wrote to. It also collapses a distinction
telemetry has to keep for good: a corpus asking how often the runtime rewrites
protected primitives would count relocations among them for ever, with no field
left to separate them again. That is the asymmetry from *Policy-free is not
purpose-free*, arriving with a bill attached — the cheap fix is the one that
loses information, and lost information does not come back.

**Make `affectedNodeIds` subtree-wide for moves too.** Consistent-looking, and
rejected on what reads it: it is the input to `broad-change`, so every relocation
of a large subtree would become a broad change. Breadth of relocation and breadth
of rewriting are two questions, and answering them with one number means
answering neither.

**A `large-relocation` stake factor, mirroring `large-removal`.** Symmetry, and
rejected for now: a relocation destroys nothing and is fully reversible, so it is
not damage in the sense stakes measure. Note the shape of that refusal, because
it is the healthy one — `relocatedNodeCount` is recorded anyway, so if a host
ever demonstrates that moving enough of a page is dangerous on size alone, the
evidence is already in the corpus and the factor is a small addition. Measure
now, judge later, is available precisely because the two were separated.

**Record the whole `ChangeAnalysis` on the disposition.** Rejected for the reason
lesson 06 gave for storing the inverse: it puts a derived value in the record
beside the value it derives from, where the two can disagree and nothing is
checking. The telemetry summary is the deliberate middle — a projection chosen
for querying, sitting beside a retained delta the numbers can always be
recomputed from.

---

## Explain it back

Closed book.

1. Explain to somebody who has built a risk-scoring system why Loom does not have
   one. Do it **without using the word "explainable"**, and get to a concrete
   question their score cannot answer about their own history.

2. **Derive it from lesson 06.** `analyzeDelta` and `invertOperations` have the
   same loop. Show that the shape is *forced* in both cases by the same property
   from lesson 03 — and then say what each of the two would get wrong if it
   walked the operations in reverse. The two wrong answers are different, and the
   difference is worth having.

3. **Derive it from lesson 05.** Lesson 05 said a side effect is a parameter, and
   that a function whose answer depends on something not in its signature cannot
   be re-run. State the rule this lesson adds in the same form, then say why a
   policy argument on `analyzeDelta` would be the same category of mistake as
   reading the clock — and where the analogy breaks, because it does.

4. Find a case from your own work where a measurement and a threshold were stored
   as one number — an alert that fired, a health check that went red, a score. When
   the threshold changed, could you still compare against last year? What did you
   do instead?

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
rating is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. Give the three counting rules from memory — insert, remove, move — and then
   the single sentence all three are derived from.

2. `analyzeDelta` takes two arguments and neither is a policy. Name what that
   buys. Then name what it costs, in work the system does that it could have
   skipped.

3. A delta names a node that is not in the tree. Say what `analyzeDelta` returns,
   what the journal records, and why that is a different kind of entry from a
   refusal. Then say what goes wrong in a monthly report that treats them alike.

4. A change relocates a protected primitive by moving the slot that contains it.
   Name every field that sees it and every field that does not, then give the
   level. Then the part that matters: the same relocation written as a move of
   the card itself is a *different delta with different numbers* and comes out at
   the *same level*. Say what has to be true of a measurement for that to be by
   design rather than by luck — and name the property of **who writes the delta**
   that makes it a requirement here and merely tidy in a framework a person types
   into.

---

## Reflect

- Predict 1: how many **J** entries did you write? If the answer is zero, look
  again at whether you actually wrote field names or wrote conclusions —
  "destructive: true" is a **J** in an **F**'s clothing, and it is the most
  common thing to put on that list.
- Predict 2 asked how many nodes a slot-move affects and which types it touches.
  Exercise D printed both, and the honest answer is that the question has three
  numbers in it, not two: one field counts what the operation named, one counts
  what travelled, and one — the one whose name you probably used — reports
  nothing at all. If you defended a single number to somebody who gave you a
  different one, go back and check whether the two of you were answering the same
  question.
- Predict 3: your answer probably included the policy id, which is genuinely
  necessary and genuinely not sufficient. What else did you list, and did you
  list anything that is a fact about the change rather than about the decision?
- You have now seen the forward walk three times, in three files, for one reason.
  If it felt familiar in exercise E rather than new, that is spacing working —
  note it, because it is the effect the schedule is buying.
- Exercise D produced a stake level you did not expect. Before moving on, write
  one sentence saying whether you would file it as a bug. Lesson 08 will ask you
  again with more to go on.

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** From memory, write the fourteen fields of `ChangeAnalysis` and
  mark each one with what it is *for* — the downstream rule that wants it. Any
  field you cannot justify, look up. Then mark the four that do not reach
  telemetry, and say what each would have cost the corpus.
- **In 1 month:** Redo exercise D from memory: predict all three stake levels and
  all three `relocatedNodeCount`s before running it.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0002`](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) — the Gate as a pure function, and the score it rejects
- [`decisions/0023`](../decisions/0023-telemetry-narrows-the-stream-and-never-copies-the-log.md) — why the summary is a narrowing rather than a copy
- [`decisions/0007`](../decisions/0007-confidence-is-self-graded-and-must-be-calibrated.md) — the thing the retained measurement is eventually for
- [`decisions/0044`](../decisions/0044-a-move-relocates-a-subtree-and-the-analysis-measures-the-subtree.md) — the measurement answers the same for the same change, whichever node the delta names
- [`decisions/0045`](../decisions/0045-a-telemetry-field-added-later-is-optional-forever.md) — why 0044's new fields are optional and never defaulted
- Next: [08 — Two axes: stakes and reversibility](08-two-axes.md)

---

## Answers

**Q1** Three deltas, one operation each:

```
insert: {"operationCount":1,"insertedNodeCount":3,"removedNodeCount":0,"movedNodeCount":0,"affectedNodeIds":["n_x3","n_x1","n_x2"]}
remove: {"operationCount":1,"insertedNodeCount":0,"removedNodeCount":3,"movedNodeCount":0,"affectedNodeIds":["n_5","n_4","n_3"]}
move:   {"operationCount":1,"insertedNodeCount":0,"removedNodeCount":0,"movedNodeCount":1,"affectedNodeIds":["n_4"]}
```

`operationCount` and `insertedNodeCount` are readable off the delta alone — the
inserted subtree travels inside the operation, so its 3 nodes are right there.
`removedNodeCount` is not: the delta says `remove n_5` and the 3 is a fact about
the tree, which is why `analyzeDelta` needs one. `movedNodeCount` is always the
number of `move` operations, by definition.

Now the text node. The move takes the card from `main` to `header`, and the card
has a text child, `n_3`, which crosses the page with it. It is not in the output.
`affectedNodeIds` is `["n_4"]` and nothing else — the subtree rode along and the
measurement did not count it, exactly as the definition says.

Two smaller things worth catching. The inserted ids come out `n_x3, n_x1, n_x2`:
the banner is `n_x3` although it is the parent, because the builder makes
children first, and the walk is pre-order. Lesson 04 told you an id says nothing
about position, and here is a list where reading the numbers in order would tell
you the wrong story about the tree. And `remove main` reports 3 for a slot with
one card in it — slot, card, text — because `nodeCount` walks everything under
the target, and slot and text nodes are nodes.

**Q2** One measurement, two verdicts:

```
analysis: {"operationCount":1,"insertedNodeCount":0,"removedNodeCount":2,"movedNodeCount":0,"configuredNodeCount":0,"relocatedNodeCount":0,"affectedNodeIds":["n_4","n_3"],"touchedPrimitiveTypes":["loom.card"],"removedPrimitiveTypes":["loom.card"],"relocatedPrimitiveTypes":[],"configuredPropKeys":[],"nestedTargets":[],"unknownPrimitives":[],"invalidProps":[],"unreadBindings":[],"unplacedSlots":[],"redirectedSubmissions":[],"repointedBindings":[],"shallowestAffectedDepth":2}
default:  {"level":"low","factors":[]}
strict:   {"level":"critical","factors":[{"code":"protected-type-removed","level":"critical","detail":"destroys protected loom.card"},{"code":"protected-type-touched","level":"high","detail":"touches protected loom.card"}]}
```

The count is **zero**. There is nothing the policy could have changed about the
first line, because the first line was computed before either policy existed and
the function that computed it cannot name one.

Meanwhile the verdict went from `low` — no factors at all, the delta removes 2
nodes and the default `medium` threshold is 3 — to `critical`, on the strength of
one array entry in a config file. Same delta, same tree, same numbers. `low` and
`critical` are the two ends of the scale.

That is the lesson in one output, and it is worth stating the direction
carefully: the point is not that policy has a large effect. The point is that the
line above it **did not move**, so a year from now you can put those two
assessments next to each other and attribute the entire difference to the
yardstick. If the policy had been an argument to `analyzeDelta`, the top line
would differ too, and nothing downstream could tell you which of the two things
changed.

What would it cost to add the policy argument? Exactly that. You would save
collecting a couple of arrays for hosts that protect nothing, and you would lose
the ability to compare any two records written under different configurations —
which is the only reason the records are kept.

**Q3** Six numbers:

```
configure page:      0
insert into main:    2
deep edit + footer:  1
move body -> page:   1
move footer -> card: 1
empty delta:         0
```

The fixture is `page(0) → header/main/footer(1) → headline/card(2) →
body(3)`. Configuring the page is depth 0, the root. Inserting into `main`
measures the *new child's* depth, 2, not the parent's — the insert happens one
level below what it names. The third mixes a depth-3 edit with a depth-1 removal
and reports 1: the shallowest wins, and the deep edit contributes nothing.

The two moves are the pair to look at. `body → page` takes a node from depth 3
and puts it at depth 1, so `min(3, 1) = 1`. `footer → card` goes the other way:
from depth 1 down to depth 3, so `min(1, 3) = 1`. Same number, and it is the same
number for a reason rather than by accident — one end of a move is always the
shallower one, and the change restructures the page at that end whichever
direction it travels.

**The empty delta is the interesting line.** The tally starts at
`POSITIVE_INFINITY` and nothing lowers it, so the final `Number.isFinite` check
falls back to 0 — a delta that touches nothing reports that it touched the root.
Read on its own that is a false statement in a record.

It is inert, and you can establish that without trusting anybody: the only reader
of the field is `shallowStructuralChange` in `stakes.ts`, and its first line is
`if (!isStructural(analysis)) return null` — no inserts, removes or moves, no
factor, regardless of depth. So the 0 is never consulted. Worth doing that check
rather than assuming it either way, and worth noticing what kind of safety it is:
the value is wrong and something unrelated happens not to ask. Lesson 06's B2 has
the general form of this — a bug caught by a check aimed at something else has
been postponed, not caught. Here there is no bug to postpone, only a field that
would start lying the moment a second reader appeared.

**Q4** Three deltas:

```
remove main: {"touched":["loom.card"],"removed":["loom.card"],"relocated":[],"moved":0,"relocatedNodes":0,"affected":["n_5","n_4","n_3"]}
  under strict: {"level":"critical","factors":[{"code":"protected-type-removed","level":"critical","detail":"destroys protected loom.card"},{"code":"protected-type-touched","level":"high","detail":"touches protected loom.card"},{"code":"large-removal","level":"medium","detail":"removes 3 nodes"},{"code":"shallow-structural-change","level":"medium","detail":"restructures at depth 1"}]}
move main:   {"touched":[],"removed":[],"relocated":["loom.card"],"moved":1,"relocatedNodes":3,"affected":["n_5"]}
  under strict: {"level":"high","factors":[{"code":"protected-type-relocated","level":"high","detail":"relocates protected loom.card"},{"code":"shallow-structural-change","level":"medium","detail":"restructures at depth 1"}]}
move card:   {"touched":[],"removed":[],"relocated":["loom.card"],"moved":1,"relocatedNodes":2,"affected":["n_4"]}
  under strict: {"level":"high","factors":[{"code":"protected-type-relocated","level":"high","detail":"relocates protected loom.card"}]}
```

Three levels: **critical**, **high**, **high**.

**What makes the last two agree.** Neither of them touches anything — `touched`
is empty on both, and the card is not rewritten by either. What names the card is
`relocated`, and it names it in both rows, because that field is collected over
the whole moved subtree rather than at the node the operation happened to point
at. The factor that fires is `protected-type-relocated`, and it sits at `high` —
the same level `protected-type-touched` carries. That choice of level is the
part worth noticing: it means a delta naming the card directly keeps exactly the
stakes it always had, and the delta naming its container gains them. Nothing was
lowered to make the two meet.

**Now the three places they still differ**, which is the half of the question
that separates a reader who looked from one who inferred:

1. **`relocatedNodes` is 3 and 2.** A *fact*. Moving `main` relocates the slot,
   the card and the text; moving the card relocates the card and the text. The
   slot really does travel in one and not the other, and the number says so.
   These are not two spellings of one change — they are two changes that agree
   about the only thing the policy asked about.
2. **`affected` is `["n_5"]` and `["n_4"]`.** A *fact*, and a narrow one on
   purpose: `affectedNodeIds` reports the nodes an operation named, which is what
   a breadth rule wants. It is the field that would have been most tempting to
   widen and the one that was most firmly left alone.
3. **`move main` carries a second factor, `shallow-structural-change`.** A fact
   again — `main` sits at depth 1 and the card at depth 2, so the slot-move is
   the shallower restructuring. It does not change the level, because the
   `high` factor already dominates it. Which means the two rows land on the same
   verdict by *different* routes, and the level is equal without the assessments
   being equal.

There is a fourth difference and it is the one to be honest about: the *codes*
differ between the removal and the relocations. `remove main` still reports
`protected-type-touched`, because a removal genuinely destroys and rewrites. So
"touched" has one meaning across all four operations — created, destroyed, or
reconfigured — and a move is outside it by definition rather than by omission.

**Why this is a requirement and not tidiness.** A person writing a delta by hand
would pick one spelling and stick to it, and a framework serving that person
could ship the inconsistent version for years without anyone noticing. Loom's
deltas are drafted by a model, which has a free and unforced choice between
naming the slot and naming the card — so a measurement that answers differently
per spelling produces a Gate whose verdict is partly a function of the model's
prose style. That is not a rounding error in an audit trail; it is the audit
trail describing something other than the change.

The general rule, which is worth more than this instance: **a measurement whose
input is authored by something with freedom of expression must be invariant under
that freedom.** And where invariance forces a choice between two answers, take
the more conservative one — the reason reversibility now reads relocated types as
well as touched ones is that a change wrongly called irreversible is merely
offered for confirmation, while one wrongly called reversible is applied.

### What this lesson used to say here

Until 0044, `move main` came out at **`medium`** with `touchedPrimitiveTypes:
[]`, and `move card` at **`high`** with `["loom.card"]` — the same relocation, a
whole level apart, decided by which node the delta named. This lesson taught that
as an open question with three defensible answers and asked you which you would
pick.

It was not a hypothetical for long. The exercise you just ran is the one that
found it: it was executed while this lesson was being written, handed over as a
finding, and 0044 is the answer. That record's *Alternatives considered* section
opens with this lesson's own recommendation — document it and change nothing —
and rejects it, on the grounds that the problem was never that the field was
misnamed. This lesson reasoned from the field's **name** and reached "explain it
better"; the record reasoned from the **verdict** and reached "the verdict must
not move". The second is the one that has to be defensible.

Two things that are easier to see with both versions in front of you. The first
is that the exercise did its job and the lesson did not: running the code found
a real defect, and then this page went on describing the defect for three weeks
after it was fixed. The second is what a resolved question costs a course —
before 0044, Q4 asked you to hold two honest readings at once, which is a better
exercise than any settled design can offer. Some of that difficulty is gone
because the system got better. That is the correct trade and it is still a loss.

**Q5** The same two operations, in two orders:

```
in order:  {"operationCount":2,"insertedNodeCount":1,"removedNodeCount":0,"movedNodeCount":0,"configuredNodeCount":1,"relocatedNodeCount":0,"affectedNodeIds":["n_x5"],"touchedPrimitiveTypes":["loom.banner"],"removedPrimitiveTypes":[],"relocatedPrimitiveTypes":[],"configuredPropKeys":["tone"],"nestedTargets":[],"unknownPrimitives":[],"invalidProps":[],"unreadBindings":[],"unplacedSlots":[],"redirectedSubmissions":[],"repointedBindings":[],"shallowestAffectedDepth":2}
reversed:  {"code":"node-not-found","nodeId":"n_x5"}
absent:    {"code":"node-not-found","nodeId":"n_nowhere"}
```

In order, the measurement sees a banner inserted and then configured: one
inserted node, one configured node, `loom.banner` touched, `tone` recorded. The
`configure` targets a node that exists only because the operation before it ran,
and the forward walk is what makes that measurable. Reverse the two and the same
`configure` fails with `node-not-found`, because at that moment the banner is not
in the tree — the delta is unmeasurable in one order and fine in the other, from
the same two operations.

The other two functions with this loop are `applyDelta` and `invertDelta`, and
the property that forces all three is lesson 03's: operations within a delta are
ordered, and each observes the effects of its predecessors. Any function that
computes something per operation has to reconstruct the state that operation saw,
and there is only one way to do that.

**No, it is not a refusal, and the distinction is the point.** A refusal is the
Gate looking at a well-formed change and deciding, under a named policy, that it
should not happen — that is the product working, and it is recorded as
`disposition-decided` with a reason code. `node-not-found` is a proposal that
could not be measured because it does not apply to the tree it claims to apply
to, recorded as `assessment-failed`, and it means the interpreter produced
something wrong. The comment on `assessChange` puts it in five words: *an
inapplicable proposal is an interpreter bug, not a policy decision.*

A monthly report that adds them together produces a single number that goes up
when the model degrades and goes up when the policy tightens, and gives you no
way to tell which — the same failure as *The problem*, arrived at from a different
direction.

**1** `insert` counts every node in the inserted subtree. `remove` counts every
node in the removed subtree. `move` counts one, no matter how large the subtree
that travels with it.

The sentence: these numbers measure **how much content the change brought into
existence or destroyed**, and a move does neither. Everything that rides along a
move is the same node with the same id in the same order, so counting it would be
counting nodes that did not change.

If you gave a fourth rule — a move is *also* measured over its whole subtree,
into `relocatedNodeCount` and `relocatedPrimitiveTypes` — that is right and it is
a different sentence. Those fields answer *what travelled*, which is not content
churn and is not measured to be added to it. Two questions, two sets of fields,
and the reason there are two is the answer to question 4.

**2** It buys a record that stays comparable. The `ChangeAnalysis` for a change
made in January means exactly what the one from a change made in December means,
so a verdict recorded beside it can be attributed to the policy — which is what
makes "did the Gate get stricter or did the changes get bigger" a question with
an answer, and it is the only reason the numbers are retained.

It costs work nobody uses. A host that protects no primitives still gets
`touchedPrimitiveTypes` and `removedPrimitiveTypes` collected on every proposal,
and a host that never looks at breadth still gets a `Set` of every affected id
built and turned into an array. That is real, and it is small: one pre-order walk
of the affected subtrees, which the loop is doing anyway because it has to apply
each operation to advance.

**3** It returns `err({ code: "node-not-found", nodeId })` — a `TreeError`,
lesson 05's enumerated failure, not a stake level and not a disposition. The
journal records `assessment-failed` carrying the code, which is a different event
from `disposition-decided`.

It is a different kind of entry because a refusal is a decision and this is a
malfunction: one says the policy worked, the other says the interpreter produced
a delta that does not fit the tree it was written against. A monthly report that
counts them together has one number that rises for two unrelated reasons, so it
can never be used to argue that anything in particular got better or worse — and
that number is exactly the one somebody will put in a slide.

**4** *Sees it:* `relocatedPrimitiveTypes` (`["loom.card"]`, collected over the
whole moved subtree), `relocatedNodeCount` (3 — slot, card, text),
`movedNodeCount` (1, the operation named one node), and
`shallowestAffectedDepth`. *Does not see it:* `touchedPrimitiveTypes`,
`removedPrimitiveTypes` and `insertedNodeCount`/`removedNodeCount`, because
nothing was created, destroyed or reconfigured; and `affectedNodeIds`, which
holds the slot's id alone. The level is **`high`**, from
`protected-type-relocated`.

*Why the agreement is by design.* The two deltas are different — different
`relocatedNodeCount`, different `affectedNodeIds`, and one of them carries an
extra depth factor. What has to be invariant is not the record but **the answer
to the question the policy asked**: is a protected type somewhere it was not.
That is invariant because the field the rule reads is collected over the moved
subtree rather than at the named node, so both spellings put `loom.card` in it.
A measurement is phrasing-independent when the fields the rules read are
functions of the resulting tree, not of the operation's grammar — everything
else may differ freely, and here it does.

*Why it is a requirement.* Because the delta is drafted by a model, and choosing
between "move the slot" and "move the card" is a free choice it makes with no
information behind it. A framework a person types into can tolerate a verdict
that moves with phrasing, because the person picks one phrasing and keeps it,
and because the person is also the one being gated. Loom cannot: the thing being
gated is the author, so a Gate sensitive to how the author phrases itself is
gating the wrong variable. Say that and you have question 4.

If you produced the level and not the invariance argument, the level was the easy
half — re-do this one in a week from the argument end, because lesson 09 turns on
being able to say what a rule is a function of.
