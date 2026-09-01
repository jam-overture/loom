# 09 — The Gate: a ladder, not a score

**After this lesson you will be able to** name the three outcomes and say why
there is no fourth, explain what "first match wins" buys and what it costs a
person reading a year of records, give the argument behind each ordering in the
ladder that carries one, state in one sentence the argument that two of the
rules share and that no stake level could replace, predict which reason a change
trips when four rules are true at once, say what makes a rung of the ladder
unreachable, and say what an executed walk of the ladder does not prove.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md).

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. Give the test for whether two axes are really two, and name one input Loom's
   two axes share. (L08)
2. Why may a model not name the nodes it inserts? Give the reason without using
   the word "trust". (L04)
3. Undoing a `remove` costs something that undoing an `insert` does not. Say
   what. (L06)
4. `assessStakes` never sees the tree. Name what that buys and what it costs.
   (L07)
5. Why is there no conditional node? (L02)

Question 1 is the one this lesson turns on its side and points at something
else.

---

## Predict

In writing, before reading on.

> 1. You have four things to decide with: a damage level with four values, a
>    reversibility boolean, an interpreter's confidence between 0 and 1, and
>    which of four kinds of caller asked. You must produce one of three answers.
>    Write down the shape of your solution — not the answers, the *shape*. Then
>    count how many distinct situations that shape obliges you to have an opinion
>    about, and write down what happens when two of your conditions are true at
>    the same time.
>
> 2. A change is irreversible **and** its damage is above what its caller may
>    auto-apply. Write down the reason your system records. Then: a month later
>    someone counts those records to find out how often irreversibility is what
>    holds changes up. Say whether your answer gives them a number they can
>    trust, and why.
>
> 3. A policy has two knobs on the same four-value scale: *refuse at or above
>    this level*, and *auto-apply at or below this level, for this caller*. A
>    host sets the first one lower than the second. Write down what you think
>    happens, and then write down whether the system should have let them save
>    it.
>
> 4. A proposal changes one prop, on one node, and nothing else. Nothing is
>    removed. It undoes cleanly. The interpreter is 99% sure, and a developer
>    asked for it. The prop says which of the deployment's own registered
>    endpoints a form posts to, and after the change it names a different one.
>    The page looks identical. Write down what your system does with that change.
>    Then, supposing you decide it should not go through without a person, write
>    down which part of the design you reach for to make that happen — and be
>    specific, because the whole question is *which* part.

Question 1 is the one to spend real time on; the count you write down is the
argument in *The problem*. Question 3 is the one this lesson ends on, and it is
worth committing to an answer you would defend. Question 4 is a change that was
actually proposed against this runtime, and the second half of it is the one to
write in full: name the mechanism you would use, not the outcome you want.

---

## The problem

You have everything the last two lessons built. A `ChangeAnalysis` of ten
fields, condensed into a stake level with named factors. A reversibility boolean
with named reasons and a working inverse. A confidence number the interpreter
graded itself with, and an origin saying who asked.

Now produce one of three answers: apply it, show a person, refuse.

The shape that comes to mind first is a table. One row per situation, the answer
written in the last column. It is honest, it is explicit, and you can read it.
So write down how many rows it has: four stake levels, times two reversibility
values, times four origins. Thirty-two, and confidence is a continuous number,
so either you band it — three bands, ninety-six rows — or the table cannot
express it at all.

Ninety-six rows would be tolerable if they were ninety-six decisions. They are
not. Most of them say the same thing as the row above, and nothing in the table
tells a reader which rows are load-bearing and which are filler. Worse, watch
what happens when a new input arrives — and one did, in August: a proposal can
now declare that it writes over work still in the log (0035). That is one more
boolean, so the table doubles to a hundred and ninety-two rows, and every one of
the ninety-six you already wrote has to be looked at again to decide what its
twin says. A structure where adding an input means re-deciding everything you
already decided is a structure that will be wrong within two months, because
nobody re-decides a hundred and ninety-two rows. They patch the eight they
thought of.

You know the second shape already and both previous lessons have shot at it: a
weighted score with a threshold. Lesson 07 objected that a score is a
measurement and a judgment multiplied together, and you cannot divide them apart
again afterwards. Lesson 08 objected that a single scale cannot hold two
properties that are extreme in different directions.

There is a third shape, and it is the one worth taking seriously, because it is
what most systems actually do: a set of independent checks, each returning true
or false, ORed together. *If it is irreversible, or above the ceiling, or the
model was unsure — ask a person.* It is small, it extends cleanly, and every
check is readable on its own.

It fails on the question a user asks next, which is **why**. Three checks
returned true. The system has to say one sentence. Which one does it say?

You can answer "all of them", and then you have handed a person three sentences
and no idea which is the one they are being asked about. You can answer "the
first true one", and you have just invented an ordering — except that you
invented it by accident, in whatever sequence you happened to write the `if`s.

So the real question is not how to combine four inputs. It is:

> **When several things are true about a change at once, which one gets to be
> the reason — and where is that decision written down?**

---

## The idea

> **The Gate is seven rules in a fixed order, plus a default. The first rule that
> fires produces the whole verdict, and each rule's position in the list is
> itself a decision somebody made.**

That is the entire mechanism. What makes it interesting is the second half of
the sentence.

### Three outcomes, and why not four

`accepted`, `requires-confirmation`, `rejected`. Nothing else.

The test for whether a fourth belongs is not whether you can name one — you can,
easily: *apply it but warn*, *apply it and flag for review*, *queue it for
later*. The test is whether the **host** has to do something different. Loom's
three are three because they are three different next actions: apply the delta,
put it in front of a person, tell the caller no. "Apply but warn" is an
acceptance where the host also renders the reason, and the reason is on the
disposition already. It is not a fourth outcome; it is the host reading the one
it got.

That distinction is worth keeping, because outcome sets grow by exactly this
route — someone wants a different *presentation* and adds a *state*, and now
every rule in the system has to have an opinion about it.

### A rule is a predicate with a verdict already attached

```ts
type GateRule = (assessment: ChangeAssessment, policy: GatePolicy) => Disposition | null
```

Read that signature closely, because it is doing more than it looks like.

A rule does not return `true` or `false`. It returns a complete disposition —
kind, reason code, detail, the stakes and reversibility it saw, the policy that
judged it — or `null`, meaning *I have no opinion about this change*.

That is what makes first-match-wins expressible at all. If rules voted, the
combination logic would have to live somewhere else and would be exactly the
score you refused. Because each rule carries its own verdict, "which rule fires"
and "what the answer is" are the same question, and the code that runs them is
four lines:

```ts
for (const rule of ESCALATION_RULES) {
  const escalation = rule(assessment, policy)
  if (escalation) return escalation
}

return accept(assessment, policy)
```

The loop holds no policy of its own. Everything the Gate believes is in the
order of one array and in the seven functions it names.

### The ladder, and which rungs carry an argument

Top to bottom, with the question that matters for each — *why here?*

**1. `rejectBelowConfidenceFloor`** — confidence under `confidenceFloor`
(default 0.3). At the very top, which is the first surprise: the gravest outcome
in the system, triggered by the least alarming input. A change nobody is even
sure interprets the request is not improved by asking a person about it. The
person is being handed a guess and no way to check it, and their approval would
be noise dressed as consent. Refusing it costs one re-ask.

**2. `rejectAtRefusalFloor`** — stakes at or above `refusalFloor` (default
`critical`). Above every escalation, so a host that has declared this much damage
refusable cannot have that overturned by some *other* property of the change
turning out to be interesting. The floor is sovereign. Everything below this line
can only ever ask.

**3. `confirmIrreversible`** — `reversible` is false. This is the ordering 0002
names explicitly, and lesson 08 ended on it: it sits **above** the stakes ceiling
because the ceiling is per-origin, and permanence must not depend on who asked.
Change B from lesson 08 — one prop, 99% confident, developer origin, sends an
email — is auto-applied by any rule that consults the ceiling first.

**4. `confirmDiscardsLaterWork`** — the assessment carries a
`discards-later-work` stake factor.

**5. `confirmRedirectedSubmission`** — the assessment carries a
`redirected-submission` stake factor: a form that posted to one of the host's
registered endpoints now posts to another. Rungs 4 and 5 share one argument,
they are the two rules in the ladder that a stake level could not have been, and
they are the subject of their own section below.

**6. `confirmAboveCeiling`** — stakes above `ceilingFor(policy, origin)`. The
only rule in the system that reads who asked.

**7. `confirmBelowMinimumConfidence`** — confidence under `minimumConfidence`
(default 0.7). Last, so that when something about the *change* is also true, the
change gets the wording. "This removes your checkout" is a better thing to show
a person than "the model was 60% sure".

Then the default: `accept`, with reason `within-policy`.

Now notice what rungs 1 and 7 have in common. **The same input — one number,
`provenance.confidence` — is read by the first rule and by the last, and they are
as far apart as the ladder allows.** Position is not a property of which input a
rule reads. It is a property of what the rule *concludes*, and the two confidence
rules conclude opposite things: one says *this is not worth a person's time*, the
other says *this is worth a person's time*.

That is the sentence to keep from this lesson. If you had grouped the rules by
input — "the confidence rules", "the stakes rules" — you would have written a
ladder that cannot express what this one expresses.

### What first-match-wins costs, stated plainly

Exercise B relaxes one knob at a time and walks the whole ladder, seven verdicts
from one change. Run it before reading on; the rest of this section is about one
detail in its output that is easy to miss.

The interpreter's confidence is 0.5 on rows 2 through 6. The policy's minimum is
0.7. So rule 7 was *true on five consecutive rows*, and named on exactly one of
them.

That is not a bug — it is the design working. But it has a consequence, and it
is the one to carry away:

> A disposition holds **one** reason, so a count of reason codes across a corpus
> is a count of *first* reasons. Every rule is undercounted by however often a
> rule above it also fired.

Someone asking "how often does low confidence hold up a change?" and counting
`confidence-below-minimum` in the journal gets a number that is wrong in a
direction they cannot see, and the size of the error depends on the *policy*, not
on the model. Tighten a refusal floor and the apparent confidence problem
improves.

Two things make that tolerable, and it is worth being precise about which does
what. The first is that nothing is lost: the `ChangeAssessment` holds every stake
factor and every irreversibility reason, and the disposition is a summary of a
decision, not the evidence for it. The second is that the alternative is worse in
a specific way — see *It could have been otherwise*, where returning every reason
turns out to move the ordering problem into the host rather than solve it.

But "tolerable" is not "free", and a course that told you the ladder had no cost
would be lying to you about the most-used artefact in the system.

### The rules a level could not have been

Rungs 4 and 5 are the ones to understand properly, because between them they are
the clearest case in Loom of a decision that a *value* cannot express and a
*rule* can. Take rung 4 first; rung 5 is the same argument made a second time,
which is what turns it from a special case into a shape.

Discarding work already in the log produces a stake factor at level `high`
(lesson 08). Suppose you stop there — no rule, just the factor — and let the
ordinary ceiling handle it. Read the default ceilings:

```ts
{ "user-instruction": "medium", "system-signal": "low",
  "scheduled-adaptation": "low", developer: "high" }
```

A `high` factor is above the `medium` ceiling a user instruction gets, so it is
held. It is above the `low` ceilings, so it is held. And it is **at** the `high`
ceiling a developer gets — `isAbove` is strict — so for that one origin it is
auto-applied, silently, with the discarding happening and nobody told.

You can try to fix that by promoting the factor to `critical`. Now it is a
refusal for everyone, which is worse: the whole point of an undo that discards
later work is that it is a thing a person should be *allowed to decide*, not a
thing nobody may do. `stakes.ts` says exactly this in a comment, and 0035 is the
record.

The trap is that neither `high` nor `critical` is wrong. The scale simply cannot
say the thing that needs saying:

> **A level cannot express "never auto-apply", because the ceilings are per
> origin. Only a rule above the ceiling can.**

Exercise C is that argument as two lines of output: two changes, both `high`
stakes, both from a developer, one accepted and one held. The difference is not
in the level — the level is identical — it is in *which factor* produced it, and
that is a distinction only a rule positioned above the ceiling can make.

### The same argument, a second time

Rung 5 is Predict 4. A `configure` moves one node's `loom:submit` from
`newsletter.subscribe` to `contact.enquiry`. Both endpoints are ones the host
registered on purpose, so nothing left the deployment and no address was
authored — the seam that keeps addresses out of the tree is untouched, and it
was never the thing at risk. What changed is that the next visitor's name, email
address and message now arrive somewhere else, and nothing on the page says so.

Run that through everything the last two lessons built and watch it come out
clean. One prop, on one node: not a large removal, not a broad change, not
structural. Reversible — set the prop back. Confident. And from a developer, so
`high` sits at the ceiling rather than above it. The obvious instrument is
`protectedPropKeys`, and it fails in three ways worth naming, because the shape
of the right instrument falls out of them: it is opt-in, so the default is
silence about the one prop nobody should be silent about; it fires on any touch
of the key, so a form *acquiring* a destination is escalated identically to one
being moved; and its sentence is *configures protected `loom:submit`*, which
tells a reviewer that a key changed and not where anyone's data now goes.

So `redirected-submission` is a factor of its own, and then the whole of rung 4's
argument runs again without a word altered. Why not `critical`? Because
`nested-target` — the factor that *is* `critical` — measures a change that is
wrong however it was meant, and this one measures a change that is often exactly
right: a deployment splitting one mailing list into two repoints its forms, and
a refusal would mean no proposal may ever move a form at all. Why not leave it to
the ceiling, then? Because `high` is at a developer's ceiling, and where a
stranger's data goes must not depend on who asked for it to move.

Two different facts, a fortnight apart — 0035 on 4 August, 0071 on the 19th —
arriving at the same position in the ladder for the same reason. State it once
and it covers both:

> **When the thing that must not happen is *silently*, a level cannot say so and
> a rule above the ceiling can.** A level is a claim about how much damage a
> change does; "never without a person" is a claim about who decides, and the
> ceiling has already made that answer depend on the origin.

There is a second thing rung 5 does that is worth the ten seconds. It is
measured **between the two trees**, not off the operations — the destinations
declared before the delta, compared by node id with the ones declared after. So a
delta that moves a destination and moves it back reports nothing, because nothing
moved. And a node that *gains* a declaration it did not have is a new form rather
than a moved one: nobody's expectation about where their message goes is being
relocated, so escalating it would make the reviewer's sentence false half the
time. Exercise G is both of those, and the second is the one people get wrong.

### The rung that arrived after the ladder was written

0002 wrote down what it would cost to add a rule to this design, in one line of
consequences: *adding a rule means choosing its position in the precedence order,
which is a visible decision rather than a weight nudge.*

On 19 August that bill came due, and it is worth looking at what was actually
paid. `redirection.ts` was new. `stakes.ts` gained a factor. `disposition.ts`
gained a reason code. And `gate.ts` gained one function and **one line in the
middle of an array** — `confirmRedirectedSubmission,` between
`confirmDiscardsLaterWork` and `confirmAboveCeiling`. Not one existing rule
changed. Not one existing verdict changed, except for changes that move a form.

Compare that with the decision table from *The problem*, which was at a hundred
and ninety-two rows and would now be at three hundred and eighty-four — every one
of the old rows needing a decision about what its twin says. That is the whole
argument for the ladder, and it has now been paid out twice in a fortnight:
`discards-later-work` on the 4th of August, `redirected-submission` on the 19th.
Two new inputs, two new lines, nothing re-decided.

But the position was still a decision, and the diff does not argue for it. Why
fifth? Below rung 2, so a host that has declared this much damage refusable still
gets a refusal — the floor stays sovereign, which is the same sentence rung 4
gets. Above rung 6, or the whole thing is pointless. And after rung 4 rather than
before it, which is the one place there was a genuine choice and the one place
nothing much turns on it: a change that both discards later work and moves a form
is held either way, and the only question is which sentence the person is shown
first. Exercise G's third row is that tie being broken, and it is broken by the
array's order and by nothing else.

**Now the part that cost something.** The ladder absorbed a rule in one line, and
the prose about the ladder did not. This lesson said "six rules" for a week after
there were seven, and gave every rung below the new one a number one too low;
lesson 08 repeated the count once; and two review-set questions
asked you to write the six rules from memory and then checked your recall against
a list with a rung missing. Nothing connects an array in `src/` to a sentence in
`lessons/`, and nothing ever will.

Notice what did *not* catch it. Every exercise in this lesson is executed before
it is written down, and every printed output was correct the whole time — because
the fixture they run against has no form in it, so rung 5 returns `null` on every
row and never speaks. Exercise B walks the ladder from outside by removing one
true thing at a time, and it walked past a rung without printing a wrong line.
That generalises past this course:

> **An executed example proves what it reached. It says nothing about what it
> did not reach, and the second kind of claim is the one prose likes to make.**

Which is why Exercise G exists, and why it is the exercise to do slowly.

### Who asked, and where that stops mattering

Origin is load-bearing in exactly one place: `ceilingFor`. Everywhere else it is
recorded and not consulted. Lesson 07's separation is why — origin is not a fact
about the change, so it must not touch the damage estimate; a change is not
larger because a robot proposed it.

Two things about that lookup are worth running rather than reading. Exercise D
does both.

`ceilingFor` falls back to `low` when an origin is absent from the map. A host
that lists three origins and forgets the fourth has not created a hole; it has
created the narrowest possible latitude for the origin it forgot. That is the
same instinct as lesson 05's — when in doubt, fail toward asking.

And at the top of the scale, origin stops mattering entirely. `refusalFloor`
cannot be set above `critical`, because `critical` is the top of the scale, and
rung 2 tests `isAtLeast`. So:

> **Under every policy that can be written, a `critical` change is refused.** Not
> "usually", not "by default" — there is no policy in which a critical change
> reaches rung 6.

Which means the four ceiling values have three distinct behaviours: a ceiling of
`critical` and a ceiling of `high` are the same policy, because the level that
distinguishes them is refused before the ceiling is read. Exercise D's last two
rows are that fact, and it is worth sitting with, because a host writing
`autoApplyCeiling: { developer: "critical" }` plainly believes it is saying
something.

### A rung that no change can reach

Lesson 08 gave you a test for whether two axes are really two: *every combination
of their values is reachable*. Point that same test at a ladder instead of a
grid and it asks a different question — **can this rule fire at all?** — and
under some policies the answer is no.

Two knobs sit on the confidence scale: `confidenceFloor` (reject below) and
`minimumConfidence` (confirm below). The schema validates each as a number
between 0 and 1, and does not compare them. Set the floor at 0.9 and the minimum
at 0.5, and rung 7 becomes unreachable: to fire it, a change would have to be at
or above 0.9 and below 0.5.

The same shape shows up on the stakes scale. Set `refusalFloor` to `medium` and
give an origin a ceiling of `high`, and rung 6 can never fire for that origin —
anything above `high` is `critical` and is refused at rung 2, and anything at or
above `medium` is refused there too, so the only levels that reach rung 6 are
below every ceiling.

Exercise E runs both, and the result is stronger than "a rule goes quiet". The
inverted confidence pair produces **identical output to a policy with the two
knobs collapsed to one value** — 0.9 and 0.5 behaves exactly like 0.9 and 0.9,
on every input. The host's `minimumConfidence: 0.5` is not doing something
subtle. It is doing nothing at all, and the configuration file says otherwise.

Is that a defect? Argue it before you read the answer to E. The case for leaving
it alone is real: a host may genuinely want a two-outcome gate with no
confirmation band, and refusing to parse the policy would be the runtime
overruling a host about what a host may mean — which is the same trade lesson 08
declined to make about overlapping vocabularies. The case against is that this
host almost certainly did not want that, and nothing tells them.

### The verdict names its judge

One last thing the ladder does, in the helper every rule funnels through.

`decide` stamps `policyId` and `policyFingerprint` onto every disposition —
inside the Gate, not by the caller. The comment gives the reason in a line: a
caller could stamp a policy that is not the one the rules consulted, and *a
disposition naming a policy it was not decided under is worse than one naming
none*.

The pair does two jobs (0033, 0048). The name is what a host can look up in its
own configuration. The fingerprint is what proves the name still means what it
meant — because a host that edits a policy is supposed to rename it, and that
contract is one the runtime cannot enforce, only check. Exercise F judges one
assessment under a policy, an edited policy with the same name, and the same edit
under a new name, and the two digests tell you which of those was an edit.

That is also the clearest demonstration that the Gate is pure. The assessment is
judged three times, by three policies, after the fact, with no tree and no clock
in sight. "Would this have been held under today's rules?" is a question you can
answer by calling a function on a stored record — which is the property lesson 05
spent its whole argument on, arriving here as something you can use.

---

## In the code

| What | Where |
| --- | --- |
| Seven rules, the order, and the loop | [`src/runtime/gate.ts`](../src/runtime/gate.ts) |
| Three kinds, eight reason codes, and what a verdict carries | [`src/runtime/disposition.ts`](../src/runtime/disposition.ts) |
| The ceilings, the floors, and `ceilingFor` | [`src/runtime/policy.ts`](../src/runtime/policy.ts) |
| `isAbove` and `isAtLeast` — where strictness lives | [`src/runtime/stake-level.ts`](../src/runtime/stake-level.ts) |
| What a policy contained, as one comparable string | [`src/runtime/policy-fingerprint.ts`](../src/runtime/policy-fingerprint.ts) |
| The precedence tests — the specification of the order | [`src/runtime/gate.test.ts`](../src/runtime/gate.test.ts) |

---

## Try it

Predict every output in writing before running anything. Shared preamble:

```ts
import { describe, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "./ids.js"
import { assessChange } from "./runtime/assessment.js"
import { gate } from "./runtime/gate.js"
import type { IntentOrigin } from "./runtime/intent.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./runtime/policy.js"
import type { DiscardedWork, ProposedChange } from "./runtime/proposal.js"
import { formTree, sampleTree } from "./testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "./tree/delta.js"

const spare = sequentialIdFactory("x")

const deltaOf = (treeId: TreeId, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(), treeId, baseRevision: 0, operations,
})

/** Everything about the ask that is not the delta: who, how sure, what it writes over. */
type Ask = {
  readonly origin?: IntentOrigin
  readonly confidence?: number
  readonly discards?: readonly DiscardedWork[]
}

const proposalOf = (delta: TreeDelta, ask: Ask = {}): ProposedChange => ({
  proposalId: spare.proposalId(),
  intentId: spare.intentId(),
  delta,
  rationale: "teaching",
  ...(ask.discards === undefined ? {} : { discards: ask.discards }),
  provenance: {
    origin: ask.origin ?? "user-instruction",
    interpreter: "scratch",
    authoredBy: "model",
    confidence: ask.confidence ?? 0.9,
    interpretedAt: "2026-08-16T00:00:00.000Z",
  },
})

/** Assess a change and judge it, printing only what the verdict itself carries. */
const verdict = (label: string, policy: GatePolicy, operations: TreeOperation[], ask: Ask = {}) => {
  const { tree } = sampleTree()
  const proposal = proposalOf(deltaOf(tree.treeId, operations), ask)

  const assessed = assessChange(tree, proposal, policy, spare.deltaId())
  if (!assessed.ok) throw new Error(assessed.error.code)

  const disposition = gate(assessed.value, policy)

  console.log(label, JSON.stringify({
    stakes: disposition.stakes,
    reversible: disposition.reversible,
    kind: disposition.kind,
    reason: disposition.reason.code,
  }))
}
```

**A — one number, two rules.** Seven rows, and the two boundaries are the point.
Write down where each transition happens *and* which side of it the boundary
value itself lands on.

```ts
describe("A", () => {
  it("walks confidence across both of its thresholds", () => {
    const { ids } = sampleTree()
    const rewrite: TreeOperation[] = [
      { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
    ]

    for (const confidence of [0.1, 0.29, 0.3, 0.5, 0.69, 0.7, 0.9]) {
      verdict(`confidence ${confidence}: `, defaultGatePolicy, rewrite, { confidence })
    }
  })
})
// Q1: two rules read this one number and they are at opposite ends of the
//     ladder. Say what each concludes, in a phrase, and then say why swapping
//     their positions would not merely change the wording.
```

**B — the ladder, from outside.** One change, seven verdicts, each step relaxing
exactly one thing. Predict all seven reason codes in order before running. This
is the exercise of the lesson; give it ten minutes.

```ts
describe("B", () => {
  it("reveals the ladder one relaxation at a time", () => {
    const { ids } = sampleTree()
    const change: TreeOperation[] = [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]
    const discards: readonly DiscardedWork[] = [{ revision: 4, nodeIds: [ids.body] }]
    const asked = { origin: "scheduled-adaptation", confidence: 0.5, discards } as const

    const strict = gatePolicySchema.parse({
      policyId: "strict",
      protectedPrimitiveTypes: ["loom.card"],
      outOfTreeEffectTypes: ["loom.card"],
      refusalFloor: "high",
    })
    const floorRaised = gatePolicySchema.parse({
      policyId: "floor-raised",
      protectedPrimitiveTypes: ["loom.card"],
      outOfTreeEffectTypes: ["loom.card"],
    })
    const inTree = gatePolicySchema.parse({
      policyId: "in-tree",
      protectedPrimitiveTypes: ["loom.card"],
    })

    verdict("1 all of it, confidence 0.1:", strict, change, { ...asked, confidence: 0.1 })
    verdict("2 confidence up to 0.5:    ", strict, change, asked)
    verdict("3 refusal floor to default:", floorRaised, change, asked)
    verdict("4 drop the out-of-tree list:", inTree, change, asked)
    verdict("5 declare no discards:     ", inTree, change, { ...asked, discards: [] })
    verdict("6 drop the protected list: ", defaultGatePolicy, change, { ...asked, discards: [] })
    verdict("7 confidence up to 0.9:    ", defaultGatePolicy, change, {
      ...asked, discards: [], confidence: 0.9,
    })
  })
})
// Q2: the confidence is 0.5 on rows 2 through 6 and the policy's minimum is 0.7.
//     Count how many of those rows mention confidence. Then: you are asked how
//     often low confidence held changes up last month, and the journal holds one
//     reason per verdict. Say what you would report, and what you would have to
//     read instead to be right.
```

**C — two `high`s, one origin, two paths.** The level is identical on all three
rows. Predict the three dispositions.

```ts
describe("C", () => {
  it("puts two high-stakes changes from one origin on different paths", () => {
    const { ids } = sampleTree()
    const precious = gatePolicySchema.parse({ policyId: "precious", protectedPropKeys: ["variant"] })
    const trusting = gatePolicySchema.parse({
      policyId: "trusting", autoApplyCeiling: { developer: "critical" },
    })

    const protectedProp: TreeOperation[] = [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]
    const ordinary: TreeOperation[] = [
      { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
    ]
    const discards: readonly DiscardedWork[] = [{ revision: 4, nodeIds: [ids.body] }]

    verdict("protected prop:      ", precious, protectedProp, { origin: "developer" })
    verdict("discards later work: ", precious, ordinary, { origin: "developer", discards })
    verdict("discards, no ceiling:", trusting, ordinary, { origin: "developer", discards })
  })
})
// Q3: same level, same origin, different outcomes. Say what the Gate knows here
//     that `stakes.level` does not carry — and then say what you would have to
//     add to the *level* to get the same behaviour, and what that would break.
```

**D — who asked, and where that stops mattering.** Seven rows. The last two are
the ones to be sure about.

```ts
describe("D", () => {
  it("asks who is asking, and finds where that stops mattering", () => {
    const { ids } = sampleTree()
    const removeSlot: TreeOperation[] = [{ op: "remove", nodeId: ids.main }]

    for (const origin of [
      "developer", "user-instruction", "system-signal", "scheduled-adaptation",
    ] as const) {
      verdict(`${origin.padEnd(20)}:`, defaultGatePolicy, removeSlot, { origin })
    }

    const partial = gatePolicySchema.parse({
      policyId: "partial", autoApplyCeiling: { developer: "critical" },
    })
    verdict("origin left off the map:", partial, removeSlot, { origin: "user-instruction" })

    const guarded = (ceiling: "high" | "critical") =>
      gatePolicySchema.parse({
        policyId: `guarded-${ceiling}`,
        protectedPrimitiveTypes: ["loom.card"],
        autoApplyCeiling: { developer: ceiling },
      })
    const removeCard: TreeOperation[] = [{ op: "remove", nodeId: ids.card }]

    verdict("critical, ceiling high :", guarded("high"), removeCard, { origin: "developer" })
    verdict("critical, ceiling crit.:", guarded("critical"), removeCard, { origin: "developer" })
  })
})
// Q4: the fifth row's policy never mentions `user-instruction`. Say what it got
//     and why that direction is the right one. Then, from the last two rows:
//     how many behaviourally distinct values does `autoApplyCeiling` have under
//     the default refusal floor? Prove it from the ladder, not from the output.
```

**E — a rung nothing can reach.** Two policies that differ in one number, then
four that differ in one level. Predict whether any row differs from the one
above it.

```ts
describe("E", () => {
  it("looks for a rung no change can reach", () => {
    const { ids } = sampleTree()
    const rewrite: TreeOperation[] = [
      { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
    ]

    const inverted = gatePolicySchema.parse({
      policyId: "inverted", confidenceFloor: 0.9, minimumConfidence: 0.5,
    })
    const collapsed = gatePolicySchema.parse({
      policyId: "collapsed", confidenceFloor: 0.9, minimumConfidence: 0.9,
    })
    console.log("both parsed:", JSON.stringify({
      inverted: [inverted.confidenceFloor, inverted.minimumConfidence],
      collapsed: [collapsed.confidenceFloor, collapsed.minimumConfidence],
    }))

    for (const confidence of [0.5, 0.7, 0.89, 0.9]) {
      verdict(`inverted  ${confidence}:`, inverted, rewrite, { confidence })
      verdict(`collapsed ${confidence}:`, collapsed, rewrite, { confidence })
    }

    const removeSlot: TreeOperation[] = [{ op: "remove", nodeId: ids.main }]
    for (const ceiling of ["low", "medium", "high", "critical"] as const) {
      const policy = gatePolicySchema.parse({
        policyId: `floor-below-ceiling-${ceiling}`,
        refusalFloor: "medium",
        autoApplyCeiling: { developer: ceiling },
      })
      verdict(`floor medium, ceiling ${ceiling.padEnd(8)}:`, policy, removeSlot, {
        origin: "developer",
      })
    }
  })
})
// Q5: the first `console.log` proves the inverted policy parsed. Say which rung
//     it deleted, and then decide whether `gatePolicySchema` should have refused
//     it — and say what your answer commits you to about the stakes knobs in the
//     second half, which have the same shape. The last four rows show one
//     change; add a low-stakes one before you generalise.
```

**F — one assessment, three judges.** Nothing here touches a tree.

```ts
describe("F", () => {
  it("judges one assessment three times", () => {
    const { tree, ids } = sampleTree()
    const proposal = proposalOf(deltaOf(tree.treeId, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]), { origin: "user-instruction", confidence: 0.9 })

    const storefront = gatePolicySchema.parse({ policyId: "storefront" })
    const assessed = assessChange(tree, proposal, storefront, spare.deltaId())
    if (!assessed.ok) throw new Error(assessed.error.code)

    const judge = (label: string, policy: GatePolicy) => {
      const disposition = gate(assessed.value, policy)
      console.log(label, JSON.stringify({
        kind: disposition.kind,
        reason: disposition.reason.code,
        policyId: disposition.policyId,
        policyFingerprint: disposition.policyFingerprint,
      }))
    }

    const edited = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence: 0.95 })
    const renamed = gatePolicySchema.parse({ policyId: "storefront-v2", minimumConfidence: 0.95 })

    judge("as it was judged: ", storefront)
    judge("same name, edited:", edited)
    judge("edited, renamed:  ", renamed)
  })
})
// Q6: two of the three fingerprints match and two of the three names match, and
//     they are not the same two. Say what each pairing tells a reader. Then say
//     what this exercise proves about the Gate that no amount of reading
//     `gate.ts` would, and name the lesson-05 property it is an instance of.
```

**G — the rung the ladder walk never reached.** Exercise B relaxed one true thing
at a time and produced seven codes, and one rung stayed silent through all of it,
because `sampleTree` has no form in it. This is the fixture that does. Six rows;
`detail` is printed this time, because on two of them it is the point.

Predict all six before running, and give rows 5 and 6 more than a moment — one of
them is the same change as row 1 and the other very nearly is.

Add `formTree` to the preamble's fixtures import — `import { formTree, sampleTree }
from "./testing/fixtures.js"` — and everything else here is the preamble's.

```ts
describe("G", () => {
  it("finds the rung the ladder walk never reached", () => {
    /** The shared helper above is bound to `sampleTree`; this is it, on a form. */
    const onForm = (
      label: string,
      policy: GatePolicy,
      build: (ids: ReturnType<typeof formTree>["ids"]) => TreeOperation[],
      ask: (ids: ReturnType<typeof formTree>["ids"]) => Ask = () => ({})
    ) => {
      const { tree, ids } = formTree()
      const proposal = proposalOf(deltaOf(tree.treeId, build(ids)), ask(ids))

      const assessed = assessChange(tree, proposal, policy, spare.deltaId())
      if (!assessed.ok) throw new Error(assessed.error.code)

      const disposition = gate(assessed.value, policy)

      console.log(label, JSON.stringify({
        stakes: disposition.stakes,
        kind: disposition.kind,
        reason: disposition.reason.code,
        detail: disposition.reason.detail,
      }))
    }

    const repoint = (ids: ReturnType<typeof formTree>["ids"]): TreeOperation[] => [
      { op: "configure", nodeId: ids.form, set: { "loom:submit": { to: "contact.enquiry" } }, unset: [] },
    ]

    const trusting = gatePolicySchema.parse({
      policyId: "trusting",
      autoApplyCeiling: {
        developer: "critical", "user-instruction": "critical",
        "system-signal": "critical", "scheduled-adaptation": "critical",
      },
    })
    const strict = gatePolicySchema.parse({ policyId: "strict", refusalFloor: "high" })

    onForm("1 moved, user asked:   ", defaultGatePolicy, repoint)
    onForm("2 moved, developer, no ceiling:", trusting, repoint, () => ({ origin: "developer" }))
    onForm("3 moved, and discards: ", defaultGatePolicy, repoint, (ids) => ({
      discards: [{ revision: 4, nodeIds: [ids.aside] }],
    }))
    onForm("4 moved, floor at high:", strict, repoint)
    onForm("5 the aside gains one: ", defaultGatePolicy, (ids) => [
      { op: "configure", nodeId: ids.aside, set: { "loom:submit": { to: "contact.enquiry" } }, unset: [] },
    ])
    onForm("6 moved, and moved back:", defaultGatePolicy, (ids) => [
      { op: "configure", nodeId: ids.form, set: { "loom:submit": { to: "contact.enquiry" } }, unset: [] },
      { op: "configure", nodeId: ids.form, set: { "loom:submit": { to: "newsletter.subscribe" } }, unset: [] },
    ])
  })
})
// Q7: rows 1 and 4 have the same `detail` and different codes, and neither rule
//     wrote that sentence. Say who did, and what that tells you about what a
//     reason code is for. Then: rows 5 and 6 are both accepted, for two
//     different reasons. Give both — and for row 6, say what would have to be
//     true of the *delta* for the answer to change, then say whether any delta
//     can make it true.
```

---

## It could have been otherwise

**A decision table over every combination of inputs.** The shape most people
reach for, and the one *The problem* counts: thirty-two rows before confidence,
ninety-six with it banded, one hundred and ninety-two once `discards` arrived in
August, three hundred and eighty-four a fortnight later when a moved form
destination arrived. The fatal property is not the size, it is that adding an
input obliges you to re-decide every row you already wrote — so in practice
nobody does, and the table quietly stops describing the system.

**An existing knob instead of a new rule.** A host worried about forms being
repointed can list `loom:submit` in `protectedPropKeys` today, which is why this
is the alternative to argue with rather than the one to dismiss: it needs no new
code at all. It fails three ways. It is opt-in, so a deployment that never
thought about it is silent about the one prop whose meaning is *where a
stranger's data goes*. It cannot tell a form acquiring a destination from a form
being moved, so ordinary new forms are escalated identically. And the sentence a
reviewer gets names a key rather than a destination. The general form is worth
keeping: **a knob that can be made to produce the right outcome is not the same
as one that produces the right sentence**, and on a system whose whole claim is
reviewability the sentence is half the feature.

**Every true reason, returned together.** The most serious alternative, and the
one to argue against carefully, because it looks strictly more informative. Three
costs. A host still has to show a person one sentence, so the ranking still has
to exist — it just moves into the host, where it varies between hosts and is
written by people who have not read this file. Counting becomes ambiguous in a
new way: `byReason` sums to more than the number of decisions, and 0047's
per-policy partition ("every judged proposal lands in exactly one segment") stops
being checkable against itself. And the question "what stopped this change" loses
its answer — which is the question a person actually asks.

**Rules as independent predicates, worst outcome wins.** Sort the fired rules by
severity of outcome and take the worst. This gets the *kind* right without an
authored order — but two rules with the same kind then tie, and something must
break the tie, and that something is an ordering. It is the ladder with a
detour, and the detour hides the decision.

**A severity number per rule, sorted at runtime.** The same idea with the
ordering made explicit as data. Worse than a list, for a reason worth
generalising: an array is reviewed as a whole, in one diff, in one screen. Seven
numbers scattered across seven declarations are each reviewed alone, and nobody
ever sees the order they add up to. 0002 puts this precisely — adding a rule
means choosing its position, *which is a visible decision rather than a weight
nudge*.

**Confidence as a stake factor rather than two rules.** Tempting: it is already a
number, and stakes already take a maximum. It breaks in both directions. A guess
is not damage — a low-confidence change to one text node does not become
destructive because the model was unsure — so blending it into the level makes
the level mean two things. And the refusal at the bottom would need `critical`
to fire, which would say a barely-understood tiny change is as grave as
destroying a checkout.

**Origin as a stake factor.** Would let who-asked change the damage estimate,
which is a claim about the change that is not true of the change. Origin belongs
where it is: in the ceiling, which is a statement about latitude, not about
damage. This is lesson 07's separation holding one layer further up.

---

## Explain it back

Closed book.

1. Explain the ladder to somebody who has written the OR-of-predicates version —
   `if (irreversible || aboveCeiling || unsure) ask()`. Do not use the word
   "precedence". Get to the concrete thing their version cannot do, and give them
   the change to their own code that would fix it.

2. **Derive it from lesson 08.** Lesson 08's test for two axes was that every
   combination of their values is reachable. State the version of that test that
   applies to a ladder, then use it on a policy with `refusalFloor: "low"` and
   say which rungs survive. Then say what the two tests have in common — one
   sentence, and it should be about configuration rather than about code.

3. **Derive it from lesson 07.** Lesson 07 separated measurement from judgment:
   `analyzeDelta` takes no policy, `assessStakes` takes no tree. Say which side
   of that line the Gate is on, then find the place where the Gate reads
   something that is not a fact about the change at all, and say why that is not
   a violation.

4. Rungs 4 and 5 exist for the same reason, and the reason is one sentence. Say
   it once, so that it covers both without naming either. Then invent a third
   fact that would qualify — something a future Loom might measure — and say
   which of the two tests it passes and how you know it passes the other.

5. Find an approval or escalation system you have used where several rules could
   fire at once — an alerting policy, a code-review requirement, a fraud check.
   What did it tell you when two fired? If it told you one thing, could you find
   out which rule chose it? If it told you everything, what did you do with the
   list?

---

## Self-check

Write your answer, rate your confidence 1–5, **then** reveal. The confidence
rating is not decoration: the answers you are confident and wrong about are the
ones that quietly break your model later.

1. Name the seven rules in order. Then, for every ordering in the ladder that
   carries an argument, give that argument in one sentence — and where two rules
   share one argument, give it once and say why it covers both.

2. `confidence` is read by the first rule and by the last. Say what each
   concludes, and say what that pair proves about how position in the ladder is
   chosen.

3. A change discards later work and comes from a developer, whose ceiling is
   `high`. The factor is also `high`. Explain, without using the word "rule",
   why the ceiling alone cannot produce the right answer here — then say what
   promoting the factor to `critical` would do instead.

4. A host sets `refusalFloor: "medium"` and `autoApplyCeiling: { developer:
   "high" }`. Say which rung that makes unreachable for that origin, whether the
   schema rejects it, and what you would do about it. Then give the general
   statement of which this is one instance.

5. Exercise B removes one true thing at a time and prints a verdict for each,
   and every line it has ever printed has been correct. Say what it nevertheless
   failed to show for a week, why running it more often would not have helped,
   and what kind of claim an executed example cannot support.

---

## Reflect

- Predict 1 asked for a shape and a count. If you wrote a table, look at your
  count and then at what happened in August when `discards` arrived. If you
  wrote a score, note that you have now rejected it for three different reasons
  across three lessons, and try to state all three without looking.
- Predict 2 asked what gets recorded when two things are true. Exercise B is
  the answer, and the interesting part is not the reason it gives — it is the
  five rows where the confidence rule was true and silent.
- Predict 3 asked about a floor set below a ceiling. You now know the schema
  accepts it. Did you predict the runtime would reject it, clamp it, or take it
  literally? Whichever you wrote, say what that told you about who you think
  should win between a host's configuration and a runtime's opinion — and check
  that against what you concluded in lesson 08 about a type listed in two
  vocabularies. If those two answers disagree, one of them is worth revisiting.
- Predict 4 asked which part of the design you would reach for. If you wrote
  `protectedPropKeys`, you reached for the instrument the maintainers reached for
  first, and *It could have been otherwise* is the three reasons they put it
  down. If you wrote "make the level `critical`", check that against what you
  wrote for Self-check 3 about `discards-later-work` — it is the same answer to
  the same shape, and you have now rejected it twice.
- Lesson 08 promised that this is where the ladder "gets an argument rather than
  a mention". Which of the seven turned out to have the argument you did not
  expect?
- This lesson said "six" for a week after there were seven, and the exercises
  that would have caught it all passed. Before you file that as somebody's
  sloppiness: say what you would put in place to catch the next one, then say
  what that thing costs and who pays it.

---

## Come back to this

- **In 2 days:** Self-check 1 and 3, closed book.
- **In 1 week:** Write the seven rules in order from memory, and beside each one
  write the disposition kind it produces. Then say which rules could swap
  positions without changing any verdict — only the wording — and which could
  not.
- **In 1 month:** Redo exercise B from memory: predict all seven reason codes,
  then say for each row which *other* rules were also true at the moment it was
  decided — and name the one that was true on none of them and say how you know.
- See [`review-schedule.md`](review-schedule.md).

---

## Deeper

- [`decisions/0002`](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) — the ladder, and why position beats weight. It records six rules, which is what the ladder had in July
- [`decisions/0033`](../decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md) — where the policy comes from, and why the verdict names it
- [`decisions/0035`](../decisions/0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md) — rung 4, the first rule a level could not have been
- [`decisions/0071`](../decisions/0071-moving-a-forms-destination-is-a-stake-of-its-own.md) — rung 5, the second one, and the three ways the existing knob was wrong
- [`decisions/0048`](../decisions/0048-a-name-is-checked-by-a-fingerprint-beside-it.md) — the digest beside the name
- [`src/runtime/gate.test.ts`](../src/runtime/gate.test.ts) — the `rule precedence` block is the order, written down as assertions
- Next: [10 — The pipeline](10-the-pipeline.md)

---

## Answers

**Q1** One number, two rules:

```
confidence 0.1:  {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
confidence 0.29:  {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
confidence 0.3:  {"stakes":"low","reversible":true,"kind":"requires-confirmation","reason":"confidence-below-minimum"}
confidence 0.5:  {"stakes":"low","reversible":true,"kind":"requires-confirmation","reason":"confidence-below-minimum"}
confidence 0.69:  {"stakes":"low","reversible":true,"kind":"requires-confirmation","reason":"confidence-below-minimum"}
confidence 0.7:  {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
confidence 0.9:  {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
```

Both boundaries land on the permissive side, because both rules test
`confidence >= threshold` and return `null` — no opinion — when it holds.
Exactly 0.3 is not below the floor, so it escapes the refusal and falls to the
confirmation; exactly 0.7 is not below the minimum, so it is accepted.

Rung 1 concludes *not worth a person's time*. Rung 6 concludes *worth a person's
time*. Swapping them would not just reword the verdict — it would change the
outcome for every change between the two thresholds, from a rejection to a
confirmation, because each rule carries its own kind. That is the difference
between an ordering over reasons and an ordering over answers.

**Q2** The ladder, from outside:

```
1 all of it, confidence 0.1: {"stakes":"high","reversible":false,"kind":"rejected","reason":"confidence-below-floor"}
2 confidence up to 0.5:     {"stakes":"high","reversible":false,"kind":"rejected","reason":"stakes-at-refusal-floor"}
3 refusal floor to default: {"stakes":"high","reversible":false,"kind":"requires-confirmation","reason":"irreversible"}
4 drop the out-of-tree list: {"stakes":"high","reversible":true,"kind":"requires-confirmation","reason":"discards-later-work"}
5 declare no discards:      {"stakes":"high","reversible":true,"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
6 drop the protected list:  {"stakes":"low","reversible":true,"kind":"requires-confirmation","reason":"confidence-below-minimum"}
7 confidence up to 0.9:     {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
```

Seven rows, seven reason codes, in ladder order and ending at the default.
Nothing here reads `gate.ts`: the ladder is observable from outside, by removing
one true thing at a time and watching what speaks next.

Observable, but not *fully* — and this is the line that was wrong in this lesson
for a week. Seven codes out of a ladder of seven rules plus a default is eight
possible answers, so one is missing, and it is rung 5. `sampleTree` contains no
`loom:submit` anywhere, so `redirectedSubmissionsBetween` finds no destinations
in the tree before the change, returns an empty list on every row, and
`confirmRedirectedSubmission` returns `null` seven times without ever being
noticed. Exercise G is the row this exercise cannot produce.

Row 6 is the answer to the question. Confidence was 0.5 on rows 2 through 6, and
the policy's minimum is 0.7, so rung 7 was true on **five** rows and named on
**one**. Something above it always had something to say.

So: what would you report? Not the count of `confidence-below-minimum` in the
journal. That number answers "how often was low confidence the *first* thing
wrong", which is a fact about the policy as much as about the model — tighten a
floor and it improves without the interpreter changing at all. To answer the
question actually asked you need the assessments, where the confidence sits
beside every stake factor and every irreversibility reason, unranked. The
disposition is a decision; the assessment is the evidence, and they are not
interchangeable.

Worth noticing what the ladder is *not* doing wrong here. Every row's verdict is
correct — the gravest true thing about the change is what a person is told.
The cost is entirely in the aggregate, which is exactly where it is hardest to
notice.

**Q3** Two `high`s, one origin, two paths:

```
protected prop:       {"stakes":"high","reversible":true,"kind":"accepted","reason":"within-policy"}
discards later work:  {"stakes":"high","reversible":true,"kind":"requires-confirmation","reason":"discards-later-work"}
discards, no ceiling: {"stakes":"high","reversible":true,"kind":"requires-confirmation","reason":"discards-later-work"}
```

Identical level, identical origin, identical reversibility. One is auto-applied
and two are held.

The first row is the ceiling doing its job: `high` stakes against a developer's
`high` ceiling, and `isAbove` is strict, so it is not above and nothing objects.
The host declared `variant` precious and gave developers wide latitude, and it
got both.

Rows 2 and 3 are the rule that sits above the ceiling. Row 3 is the proof that it
is not the ceiling in disguise — `autoApplyCeiling: { developer: "critical" }` is
the widest latitude the type permits, and the change is still held.

What the Gate knows that `stakes.level` does not carry is **which factor**
produced the level. To get the same behaviour from the level alone you would have
to promote `discards-later-work` to `critical`, and then rung 2 catches it first
and it is a refusal for everybody — including a person who is entitled to look at
a revert and say yes. There is no value on a four-point scale that means "always
ask, never refuse, whoever you are", because the meaning of every value depends
on a per-origin ceiling. That is a rule's job.

**Q4** Who asked, and where that stops mattering:

```
developer           : {"stakes":"medium","reversible":true,"kind":"accepted","reason":"within-policy"}
user-instruction    : {"stakes":"medium","reversible":true,"kind":"accepted","reason":"within-policy"}
system-signal       : {"stakes":"medium","reversible":true,"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
scheduled-adaptation: {"stakes":"medium","reversible":true,"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
origin left off the map: {"stakes":"medium","reversible":true,"kind":"requires-confirmation","reason":"stakes-above-ceiling"}
critical, ceiling high : {"stakes":"critical","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
critical, ceiling crit.: {"stakes":"critical","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
```

One delta — delete the `main` slot and everything in it — decided four ways by
who asked. A developer and an explicit human instruction get it applied; a
system signal and a scheduled adaptation have to ask. This is the only place in
Loom where origin changes an outcome.

Row 5's policy names only `developer`, so `ceilingFor` falls through its `??` to
`low` and `user-instruction` gets the narrowest latitude in the system rather
than the widest. That is the right direction for the same reason lesson 05 gave:
the failure mode of asking too often is an annoyed developer, and the failure
mode of the other direction is a change nobody saw.

The last two rows: `refusalFloor` cannot exceed `critical`, since `critical` is
the top of `STAKE_ORDER`, and rung 2 fires on `isAtLeast`. So a `critical`
change is refused under **every** policy, and rung 6 never sees one. Which
means `autoApplyCeiling` has three behaviourally distinct values, not four:
`critical` and `high` differ only in what they say about critical changes, and
critical changes never reach the rule that reads them.

**Q5** A rung nothing can reach:

```
both parsed: {"inverted":[0.9,0.5],"collapsed":[0.9,0.9]}
inverted  0.5: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
collapsed 0.5: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
inverted  0.7: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
collapsed 0.7: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
inverted  0.89: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
collapsed 0.89: {"stakes":"low","reversible":true,"kind":"rejected","reason":"confidence-below-floor"}
inverted  0.9: {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
collapsed 0.9: {"stakes":"low","reversible":true,"kind":"accepted","reason":"within-policy"}
floor medium, ceiling low     : {"stakes":"medium","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
floor medium, ceiling medium  : {"stakes":"medium","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
floor medium, ceiling high    : {"stakes":"medium","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
floor medium, ceiling critical: {"stakes":"medium","reversible":true,"kind":"rejected","reason":"stakes-at-refusal-floor"}
```

The policy parses — the first line is there so you cannot suspect an exception
was swallowed — and rung 7 is gone. Firing it needs a confidence at or above 0.9
*and* below 0.5. Every paired row is identical, which is the stronger claim: the
inverted policy is not merely missing a rung, it is **the same gate** as one with
both knobs at 0.9. `minimumConfidence: 0.5` reads like a setting and is not one.

The stakes half has the same shape and needs the extra row the comment asks for.
All four ceilings refuse this `medium` change, because rung 2 fires first. Add a
low-stakes change and all four accept it, because `low` is at or below every
ceiling. The levels reaching rung 6 are those strictly below `medium`, and only
`low` qualifies, and `low` is under every ceiling — so no setting of
`autoApplyCeiling` changes any verdict under this floor. The knob is inert for
that origin, whatever it says.

**Should the schema refuse them?** The case for is that no host means this. The
case against is the one lesson 08 made about a type listed in both vocabularies:
refusing replaces a host's explicit configuration with the runtime's opinion
about what a host may mean, and there is a real reading here — *reject below 0.9
and never merely confirm* is a coherent two-outcome gate. What is not defensible
is the current middle ground, where the host writes a number, the runtime accepts
it, and it means nothing.

Note what your answer commits you to. The two cases have the same shape, so
"validate the confidence pair, leave the stakes knobs alone" needs an argument
for the difference, and I do not think there is one. My own answer: no
`superRefine`, because both configurations have honest readings — but say so in
the schema comments, next to the knobs, where someone setting them will be
looking. The cheapest honest thing is for the code to admit what it ignores.

**Q6** One assessment, three judges:

```
as it was judged:  {"kind":"accepted","reason":"within-policy","policyId":"storefront","policyFingerprint":"8deb064d:c90a420f3e617e10"}
same name, edited: {"kind":"requires-confirmation","reason":"confidence-below-minimum","policyId":"storefront","policyFingerprint":"8deb064d:d1ee22c8ebc1db2f"}
edited, renamed:   {"kind":"requires-confirmation","reason":"confidence-below-minimum","policyId":"storefront-v2","policyFingerprint":"8deb064d:d1ee22c8ebc1db2f"}
```

Rows 1 and 2 share a name and differ in fingerprint: **an edit that broke 0033's
contract**, and the digest is what notices. Rows 2 and 3 differ in name and share
a fingerprint: **a rename, which is not an edit**, and a reader comparing verdicts
across the two names can safely pool them. The two pairings are the two questions
a reader of old records has, and neither field answers both.

The shape half — `8deb064d` — is identical on all three, because all three are
the same version of `GatePolicy` with the same knobs. It would change if Loom
added a policy field, and then records from either side of the upgrade would read
as *incomparable* rather than as "the host edited everything".

What this proves that reading `gate.ts` cannot: one assessment was judged three
times, minutes apart, with no tree, no clock, and no re-interpretation, and the
third judgment is as valid as the first. That is `gate` being a pure function of
its two arguments — lesson 05's rule, arriving as a capability rather than a
constraint. "Would this change have been held under the policy we run today?" is
answerable for every decision the system has ever made, because the inputs to
that decision are all still on the record.

**Q7** The rung the ladder walk never reached:

```
1 moved, user asked:    {"stakes":"high","kind":"requires-confirmation","reason":"redirected-submission","detail":"redirects a submission: n_form1 from newsletter.subscribe to contact.enquiry"}
2 moved, developer, no ceiling: {"stakes":"high","kind":"requires-confirmation","reason":"redirected-submission","detail":"redirects a submission: n_form1 from newsletter.subscribe to contact.enquiry"}
3 moved, and discards:  {"stakes":"high","kind":"requires-confirmation","reason":"discards-later-work","detail":"discards work from revision 4 at 1 node"}
4 moved, floor at high: {"stakes":"high","kind":"rejected","reason":"stakes-at-refusal-floor","detail":"redirects a submission: n_form1 from newsletter.subscribe to contact.enquiry"}
5 the aside gains one:  {"stakes":"low","kind":"accepted","reason":"within-policy","detail":"reversible, within the stakes ceiling, and confidently interpreted"}
6 moved, and moved back: {"stakes":"low","kind":"accepted","reason":"within-policy","detail":"reversible, within the stakes ceiling, and confidently interpreted"}
```

Row 1 is the rung, with both endpoint ids in the sentence: a reviewer is told
where the messages were going and where they will go instead, which is what
`protectedPropKeys` could not have said.

Row 2 is the rule earning its position. Every origin's ceiling is `critical` —
the widest latitude the type permits — and the change is still held. Nothing
about a ceiling can produce that, which is rung 4's argument arriving a second
time and is the whole of *The rules a level could not have been*.

Row 4 is the floor still sovereign: the same change under `refusalFloor: "high"`
is refused rather than held, at rung 2, before rung 5 is consulted.

**Rows 1 and 4 have the same `detail` and different codes, and neither rule
composed that sentence.** `assessStakes` did, when it built the factor;
`rejectAtRefusalFloor` joins the details of every factor it found, and
`confirmRedirectedSubmission` copies the one factor it looked for. Which is the
answer to the first half of Q7: **a reason code says which rule spoke, and the
detail says what was found.** They vary independently, and a reader who treats
the code as the description of the change will misread every verdict where the
floor fired.

Row 3 is the tie in the array being broken. Two rules are true — the change
discards work *and* moves a form, both `high` — and the reader is shown the
discard, because `confirmDiscardsLaterWork` is one line earlier in
`ESCALATION_RULES`. Nothing deeper than that decides it, and both outcomes would
have been defensible; what would not be defensible is not knowing which.

Rows 5 and 6 are both accepted, and for two different reasons.

Row 5: the `aside` posted nowhere and now posts to `contact.enquiry`. That is not
a redirection, because no expectation is being moved — it is a form that did not
exist as a form before. Escalating it would mean every ordinary new form on every
page gets a confirmation, and the sentence "this form now posts somewhere else"
would be false.

Row 6: two operations, moving the destination to `contact.enquiry` and back
again. The delta plainly touches `loom:submit` twice, and nothing is escalated —
because the factor is measured **between the two trees**, by comparing
destinations by node id, and the two trees agree. So the answer to the last
question is that **no delta can make row 6 escalate**: for the answer to change,
the tree after the change would have to name a different endpoint, and if it did
it would not be row 6. Reading the operations instead would have caught it, and
would also have escalated every no-op — which is the trade, stated as a rule of
thumb: *measure the change where the change is, not where the request for it is.*
