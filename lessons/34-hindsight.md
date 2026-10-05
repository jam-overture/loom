# 34 — Hindsight: the fact a witness saw and may not write down

**After this lesson you will be able to** say why *would this policy have changed
anything* is a question only a record can answer, and why the obvious way of
answering it is wrong in the one direction that matters; state the partition the
Gate's stakes rules are cut along, and say what question each side of it answers;
explain why only one of the two kinds can be asked again and why the other kind
does not need to be; say what makes a narrowed input a contract rather than an
abridgement; give the reason a simulation runs the real rules rather than a copy,
in a sentence about *when* a copy goes wrong rather than about how often; say what
a level means when something that fed it is missing, and why that is a different
claim from the same level with nothing missing; explain why a missing field is
sometimes provably harmless and what it takes to show that; and say why the thing
that answers this question is not allowed to return the type the Gate returns.

**Prerequisites:** [01](01-why-a-runtime.md), [02](02-ui-as-data.md),
[03](03-change-as-data.md), [04](04-identity.md),
[05](05-purity-at-the-seams.md), [06](06-undo-as-computation.md),
[07](07-measuring-a-change.md), [08](08-two-axes.md), [09](09-the-gate.md),
[10](10-the-pipeline.md), [11](11-the-model-seam.md), [12](12-projection.md),
[13](13-refusal-and-repair.md), [14](14-rendering.md),
[15](15-primitives-and-the-registry.md), [16](16-persistence.md),
[17](17-telemetry.md), [18](18-data.md), [19](19-destinations.md),
[20](20-origins.md), [21](21-appearance.md), [22](22-reach.md),
[23](23-anchors.md), [24](24-silence.md), [25](25-exhaustiveness.md),
[26](26-liveness.md), [27](27-scale.md), [28](28-corroboration.md),
[29](29-readership.md), [30](30-rendezvous.md), [31](31-behaviour.md),
[32](32-layout.md), [33](33-shortfall.md).

Lesson 33 left you a question with three answers already in it. **When does the
party that knows this run, relative to the moment somebody needs to be told?** A
fact nobody owns needs an instrument. A fact one party owns and knows early needs
a declaration. A fact one party owns and knows too late needs somebody in a
position to come and ask for it.

This seam has the fourth answer, and it is the one that list cannot hold. The
party that knows ran **at exactly the right moment**. It held every input, it
computed the right answer, it wrote that answer down, and the answer is still
there months later, correct, in a file you can read.

And the question somebody now wants to ask of it cannot be answered, because what
the witness was allowed to keep is not what the witness saw.

---

## Warm-up

Closed book, five minutes, mixed across five lessons. Write something for all
five before you look anything up.

1. The log is the truth and the snapshot is a view you can rebuild. Say what that
   buys, and then say the one thing a log of deltas cannot give you about a
   revision that is six months old. *(16)*
2. Telemetry records a self-graded confidence number. Say what the thing that
   measures it is forbidden to do with it, and give the reason in a form that is
   not about this system. *(17)*
3. A reading hands back `words`, `unread` and `unspoken`. Say what decides that
   those are three fields rather than one list, and state the rule in the form
   *one field per …*. *(24)*
4. Stakes and reversibility are two axes. Give an example of a change that is
   high on one and low on the other, in each direction, and then say what a single
   blended number would have cost the Gate. *(08)*
5. A list of union members and a `switch` over that union are two different
   claims. Say which one a compiler checks, and name the place to put the list so
   that making it incomplete is a build failure. *(25)*

Question 3 is the one this lesson leans on hardest and it arrives in a place you
would not expect. Question 2 is the one to be most careful with: the forbidden
act is not *reading* the number.

---

## Predict

**In writing, before reading on.** Four questions. Question 2 is the question of
the lesson and the one to rate your confidence on. Question 4 looks like a
bookkeeping detail and is the design.

1. A deployment has judged nine hundred changes under one Gate policy. Its
   operator wants to know what would have happened if `commerce.checkout` had not
   been a protected type — which of those nine hundred would have been waved
   through instead of held.

   Write down what you would need to have kept, in order to answer that. Then
   write down which parts of it you think a telemetry record is allowed to hold,
   given lesson 17 and lesson 16. Be specific: name fields.

2. Suppose the record grows the two fields the simulation turns out to be missing,
   and the host then rebuilds a `ChangeAnalysis` out of a record and re-runs
   `assessStakes` on it — the Gate's real function, not a copy — against the
   policy it is considering.

   An analysis also carries six lists of *specifics*: the unreachable targets,
   the unregistered types, the nodes whose props their own primitive refuses, the
   questions nothing reads, the redirected forms, the repointed regions. None of
   those is on the record, so the caller passes six empty arrays.

   Write down what that simulation answers for a change the Gate **refused**.
   Then write down what it answers for an ordinary large redesign the Gate merely
   held. **Rate your confidence 1–5.**

3. The Gate's stakes rules fall into two kinds, and the difference is which
   question each one answers. Without looking at the list: write down the two
   questions. Then write down which kind survives being asked again six months
   later from a record alone, and give your reason in terms of *what the rule
   reads* rather than in terms of what the record holds.

4. A record is missing one field that one of the rules needs. The function
   answering *what would this have been* has to return something.

   Write down the three options you can see, and pick one. Then write down what a
   screen built on your choice says to an operator who asks *would protecting
   `loom.card` have caught any of this* — and say whether your answer and *no* are
   distinguishable to that operator.

Do not read on until all four are written. Question 2 is where the majority
answer is both confident and backwards, and being backwards about it in the right
direction is what the rest of this lesson is for.

---

## The problem

### The only evidence worth consulting is the judgments you already made

A Gate policy is a set of choices, and nobody's first guess at it is right. A host
picks a removal threshold, decides `commerce.checkout` matters, sets a ceiling per
origin — and then runs for three months and accumulates the only thing that could
tell it whether those were good choices: **a journal of the changes it really
judged**, under the policy really in force, about its own pages.

So the screen an operator wants is a counterfactual over that journal. *Move this
threshold. Now show me which of the changes I held would have applied, and which
of the ones I applied would have been held.* `/portal/rules/what-if` is that
screen, and it was built to replay the escalation ladder — the rungs that turn a
stakes level and a confidence and an origin into a disposition.

That half works, and it works in a way worth noticing before the half that did
not: it reproduces each recorded verdict under the deployment's **own** policy
first, and declines to show you a counterfactual for any row it could not
reproduce. A simulation that cannot predict the past has not earned a prediction
about the future.

### Half the levers moved nothing, and answering *nothing would change* is worse than refusing

The ladder reads a handful of the policy's fields. The rest of them — the
protected types, the protected prop keys, the removal thresholds, the breadth
threshold, the depth threshold — do not move a rung. They move the **stakes
level** that the rung is reading, and the stakes level is on the record as a
single word.

That word is the *output*. How it was arrived at is a function of a page as it
stood that day, and that page is three months of revisions behind you.

Offer an operator those levers against a record that cannot feel them and every
answer comes back *nothing would change*, which is not a refusal and not a result.
It is **a lie shaped like a result** — the one output a screen like this must never
produce, because the person reading it came specifically to find out whether
moving the lever matters.

### What the witness was allowed to keep

Here is the shape of the thing, and it is worth being exact because every wrong
answer in this lesson comes from being vague about it.

`assessStakes` is handed a `ChangeAnalysis`. That record holds counts, it holds
four lists of type and prop names — and it holds **six lists of specifics**: which
targets this change leaves unreachable, which node asked a question nothing reads,
which form now posts somewhere else, and so on. Each entry in each of those six
names a part of a particular page: a node id, a prop path, an endpoint name, and a
sentence a factor wrote about it.

None of that crosses into telemetry, and the reason is lesson 17's rather than an
oversight. A record that carried node ids and prop values would be a record of
what a deployment's visitors were shown, kept forever, in a corpus whose whole
purpose is to be aggregated across deployments. 0023 keeps content out, and
every field that was ever added to a record has had to argue its way past that
rule.

So the witness ran at the right moment, held everything, got it right — and the
deposition it was permitted to leave behind is nine numbers, four lists of names
the host itself registered, and the codes of the rules that fired.

**This is not a gap. It is the bill for a property the system wants.** Which makes
the question not *how do we keep more* but a different one entirely.

### The obvious remedy, and the direction it is wrong in

The finding that opened this asked for exactly two optional fields —
`affectedNodeCount` and `configuredPropKeys` — so that a host could assemble a
`StakeInput` from a record and call `assessStakes` itself. The Gate's own
function. No copy, no second implementation, five lines of glue.

A caller doing that has to supply the six lists of specifics, and it has none of
them, so it passes six empty arrays. Empty is what a rule has to be handed to stay
silent. And **five of those six lists are the inputs to `critical` rules.**

Work out what follows before you read it. Exercise B runs it.

---

## The idea

### Two kinds of rule were in one list and nothing named the difference

The Gate's stakes vocabulary has fourteen rules, and they have always answered two
different questions.

Seven of them ask *how much of this deployment's page does this touch.* How many
nodes went. How broadly. How close to the root. Which of the types this host said
it cares about were destroyed, rewritten, moved. Every one of those reads a field
of a `GatePolicy`, so the same change under two policies is two answers — which is
the whole premise of a counterfactual.

The other seven ask *is this change coherent at all.* A target nobody can reach. A
type nothing is registered for. Props the declaring primitive refuses. A question
no primitive reads. A form or a region pointed somewhere else. Work written over.
No field of a policy moves any of them. A host that wants them silent declares no
vocabulary (0002), and that is the only knob there is.

So, as the partition is published:
**seven of those rules read a field of the policy**, and
**seven are fixed at their code.**
The first kind is *measured*; the second is *fixed*. Before 0215 both kinds sat in
one array and the difference had no name, which is why a simulation built on that
array could not tell which of its answers it was entitled to.

### Only the measured kind can be asked again, and the fixed kind does not need to be

This is the sentence to take away, and both halves of it are load-bearing.

A measured rule can be asked again because its inputs are the kind of fact a
record is allowed to carry: counts, and names the host itself registered. Run the
rule over the record, against the new policy, and you have a real answer.

A fixed rule cannot be asked again at all — its input is one of those six lists,
and the list is gone. But there is nothing to ask. No policy field moves it, so the
level it raised is a property of the rule itself. The record carries the rule's
**code**, and for a fixed rule the code is the whole of the answer.

`FIXED_LEVELS` is where those levels live, declared once, because the level now has
two readers who are months apart: the Gate, holding a delta, and `remeasureStakes`,
holding a record. The second reader exists *because* these seven cannot be
re-measured, and it would otherwise need a second copy of seven numbers —
lesson 28's second source, with the bill going to whoever next changes one.

### The partition is published, and it is derived rather than written out

```ts
export const FIXED_STAKE_FACTOR_CODES: readonly FixedStakeFactorCode[] =
  STAKE_FACTOR_CODES.filter(isFixedStakeFactor)

export const MEASURED_STAKE_FACTOR_CODES: readonly MeasuredStakeFactorCode[] =
  STAKE_FACTOR_CODES.filter((code): code is MeasuredStakeFactorCode => !isFixedStakeFactor(code))
```

Lesson 25's rule, and by now you should be able to say why it is this shape without
being told: two hand-written lists would be two places to forget, and the thing
that decides which side a rule belongs on is already written down exactly once —
whether `FIXED_LEVELS` names it. A rule added to the schema joins a side by
derivation. Neither list can be the stale copy, because neither list is a copy.

The type-level half is the same move: `MeasuredStakeFactorCode` is
`Exclude<StakeFactorCode, FixedStakeFactorCode>`, so a fifteenth rule is in one of
the two unions whether or not anybody remembers it exists.

### The narrowed input is the contract, not an abridgement

The seven measured rules stopped taking a `ChangeAnalysis` and started taking this:

```ts
export type StakeMeasurement = {
  readonly insertedNodeCount: number
  readonly removedNodeCount: number
  readonly movedNodeCount: number
  readonly affectedNodeCount: number
  readonly shallowestAffectedDepth: number
  readonly touchedPrimitiveTypes: readonly PrimitiveType[]
  readonly removedPrimitiveTypes: readonly PrimitiveType[]
  readonly relocatedPrimitiveTypes: readonly PrimitiveType[]
  readonly configuredPropKeys: readonly string[]
}
```

Nine facts, and the narrowing is doing something a comment could not. It is not
*these rules happen not to need the rest*; it is **this is the part a record is
allowed to carry, and therefore the part a question can be asked about later.**

Read `affectedNodeCount` and the comment on it in `src/runtime/stakes.ts`:
*breadth reads the count and never the ids.* The rule used to take
`affectedNodeIds` and call `.length` on it. Same arithmetic, and a completely
different claim about what the rule is a function of — because the version that
takes the array cannot be run from a record and the version that takes the number
can. **The signature is what decided it**, which is lesson 32's own correction
turning up one lesson later in a different part of the system.

Two producers put the same rules to the same numbers: `stakeMeasurementOf`, from a
delta, inside the Gate; and `measurementFrom`, from a journalled record, inside the
simulation.

### It is the Gate's rules, not a copy of them

`remeasureStakes` calls `measureStakes` — the exported seven, the same function
`assessStakes` calls. Nothing in the telemetry module knows what a large removal
is.

The argument is lesson 28's and it is about *when*, not about how often. A
reimplementation of *large removal* in a portal would be correct the day it was
written, and would be reviewed by somebody comparing it to the Gate, and would
pass. It would go wrong months later, when a threshold's semantics move by a
`>=`, silently, with no test anywhere relating the two — and it would go wrong on
the one screen a person consults specifically because they do not trust their own
recollection of what the Gate does.

### A level with something missing is a floor, and it has to say so

Four of the fields the measurement needs are **optional on the record**, because
0045 says a telemetry field added after records exist is optional and never
defaulted: `undefined` and `[]` are different claims.

So an older record may genuinely not say which prop keys a change configured. The
simulation has to hand `configuredPropKeys` *something*, and the only thing it can
hand a rule to produce no factor is `[]`.

Which is where lesson 24 arrives in a place you did not expect it. The measurement
cannot hold *unknown* — it is nine facts, and a count has no third state. And the
level cannot carry a caveat; it is one word off a four-rung scale. So the caveat
goes in a field of its own:

```ts
export type RemeasuredStakes = {
  readonly level: StakeLevel
  readonly factors: readonly RemeasuredFactor[]
  readonly unreadable: readonly StakeFactorCode[]
}
```

`unreadable` empty is the claim that `level` is exact. `unreadable` non-empty
means the true stakes are that level **or higher** — a floor rather than an answer
— and a caller either says so on the screen or sets the row aside.

This is the same construction as lesson 24's `unspoken`, with one difference worth
dwelling on. 0045 established that absent is not empty as a *statement*, and
every consumer until now has merely passed the distinction along. This is the
first one that has to **act** on it, and the action is to produce a different kind
of number.

Note what `unreadable` is not. It is not a list of mistakes, and it is not about
whether the figure happens to be right. Exercise E has a record whose floor and
whose exact answer are the same word, and it is still listed as unreadable,
because the point of the field is not *this number is wrong* but **you are not
entitled to believe this number**. A floor that coincides with the truth is still
a floor. You cannot tell which kind you are holding by looking at it, which is the
entire reason the field is there.

### Unreadable only where the policy could actually have reached

A simulation that said *unreadable* for every rule whose inputs are partly absent
would be useless, because almost every record predates almost every field. So the
test is narrower, and it is a fact about the record rather than a default:

- A host protecting nothing is not asking about protected types.
- A change that removed no nodes removed no types, whatever it failed to write
  down.
- A change that configured no nodes set no prop keys.

And the sharpest of the four, which is an argument rather than a lookup. Breadth is
the one measured rule whose input is a length, and an old record does not carry it.
It is still *bounded*: an insert or a remove contributes its whole subtree to both
the affected set and to its own node count, a move and a configure contribute one
node to both, and the affected set is a set — so `affectedNodeIds.length` can never
exceed those four counts added up. When even that ceiling is under the threshold,
the rule **provably cannot fire**, and the missing field does not matter.

That is the difference between *we did not keep it* and *we do not need it*, and it
is why this lever answers over a journal written before any of this existed rather
than only over records written after it. Exercise F is the two cases side by side.

### Why this returns its own type and not the Gate's

The tempting shape is for `remeasureStakes` to return a `StakeAssessment`, so the
two paths share one type and a screen can be written once.

A `StakeFactor` carries a `detail` — *destroys protected commerce.checkout*,
*removes 14 nodes* — and that sentence names the nodes it found. A re-measure holds
no nodes. It would have to invent the sentence or leave it empty, and **a type
whose field is a lie in one of its two producers is worse than two types.**

What a `RemeasuredFactor` carries instead is the one thing a `StakeFactor` has no
reason to:

```ts
export type RemeasuredFactor = {
  readonly code: StakeFactorCode
  readonly level: StakeLevel
  readonly source: "remeasured" | "recorded"
}
```

`remeasured` means this rule was run against the policy you handed in.
`recorded` means its code is its level and no policy you could write would move it.
A reader of the simulation needs to know which, for every row, and nothing above
the row can tell them.

---

## In the code

| What | Where |
| --- | --- |
| the closed vocabulary of rules | `stakeFactorCodeSchema` in `src/runtime/stakes.ts` |
| the levels a code alone settles | `FIXED_LEVELS`, same file |
| turning a code back into a level | `fixedStakeLevel`, same file |
| the two halves, derived | `FIXED_STAKE_FACTOR_CODES` and `MEASURED_STAKE_FACTOR_CODES`, same file |
| the facts a policy-dependent rule may read | `StakeMeasurement`, same file |
| the measurable half of an analysis | `stakeMeasurementOf`, same file |
| the seven that can be run twice | `measureStakes`, same file |
| the whole judgment, as the Gate makes it | `assessStakes`, same file |
| the six lists that do not cross | `nestedTargets` and five beside it in `src/runtime/analysis.ts` |
| what a record keeps | `assessmentSummarySchema` in `src/telemetry/event.ts` |
| asking a record what it would have been | `remeasureStakes` in `src/telemetry/remeasure.ts` |
| the record as a measurement | `measurementFrom`, same file |
| which rules this record cannot answer | `unreadableUnder`, same file |
| the provable bound on breadth | `affectedNodeCeiling`, same file |
| the decision | [0215](../decisions/0215-a-stake-rule-either-reads-a-policy-or-is-fixed-at-its-code-and-only-the-first-kind-can-be-asked-again.md) |
| content does not cross the boundary | [0023](../decisions/0023-telemetry-narrows-the-stream-and-never-copies-the-log.md) |
| a later field is optional and never defaulted | [0045](../decisions/0045-a-telemetry-field-added-later-is-optional-forever.md) |
| which rules the Gate raised | [0198](../decisions/0198-a-refusal-records-which-rules-it-broke-and-the-rules-names-are-a-closed-vocabulary.md) |
| silence is the default for every vocabulary | [0002](../decisions/0002-gate-is-a-pure-function-of-two-axes.md) |

Every row is in `src/`, like lesson 33's and unlike lesson 32's — one party owns
the fact. What is different from lesson 33 is the column you cannot see: the *time*
each row runs at. Rows one to eight run while a delta is in front of them. Rows ten
to fourteen run with nothing but a file. The whole design is the handshake between
those two columns.

---

## Try it

Seven exercises. **Predict every output in writing, then run.** Exercise B is
Predict 2 and is the one to commit to hardest — it is four lines and it is the
argument of the lesson. Exercises E and G are the same construction at two
distances, and the pair is the point rather than either one.

Put each snippet into `src/scratch.test.ts` and run

```bash
pnpm vitest run src/scratch.test.ts
```

The shared preamble for all seven. It is two journalled records and the policy that
judged them: a redesign that was refused because of what it touched, and a
one-operation change that was refused because the model invented a primitive.

```ts
import { describe, it } from "vitest"

import { proposalIdSchema } from "./ids.js"
import {
  assessStakes,
  FIXED_STAKE_FACTOR_CODES,
  fixedStakeLevel,
  gatePolicySchema,
  isFixedStakeFactor,
  MEASURED_STAKE_FACTOR_CODES,
  STAKE_FACTOR_CODES,
  stakeMeasurementOf,
  type ChangeAnalysis,
  type GatePolicy,
} from "./runtime/index.js"
import { remeasureStakes, type AssessmentSummary } from "./telemetry/index.js"

/** Every list empty, every count zero. */
const EMPTY_ANALYSIS: ChangeAnalysis = {
  operationCount: 0,
  insertedNodeCount: 0,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 0,
  relocatedNodeCount: 0,
  affectedNodeIds: [],
  touchedPrimitiveTypes: [],
  relocatedPrimitiveTypes: [],
  removedPrimitiveTypes: [],
  configuredPropKeys: [],
  nestedTargets: [],
  unknownPrimitives: [],
  invalidProps: [],
  unreadBindings: [],
  redirectedSubmissions: [],
  repointedBindings: [],
  shallowestAffectedDepth: 0,
}

/** The policy in force the day both records below were written. */
const IN_FORCE: GatePolicy = gatePolicySchema.parse({
  policyId: "acme-v3",
  protectedPrimitiveTypes: ["commerce.checkout"],
  protectedPropKeys: ["price"],
})

/** A redesign. Refused, and every rule it raised reads a field of the policy. */
const REDESIGN: AssessmentSummary = {
  proposalId: proposalIdSchema.parse("p_4ktrim"),
  stakes: "critical",
  reversible: false,
  operationCount: 9,
  insertedNodeCount: 2,
  removedNodeCount: 14,
  movedNodeCount: 1,
  configuredNodeCount: 3,
  touchedPrimitiveTypes: ["commerce.checkout", "loom.card", "loom.stack"],
  removedPrimitiveTypes: ["commerce.checkout", "loom.card"],
  relocatedPrimitiveTypes: ["loom.banner"],
  relocatedNodeCount: 4,
  shallowestAffectedDepth: 1,
  affectedNodeCount: 11,
  configuredPropKeys: ["price", "label"],
  retainedNodeCount: 14,
  irreversibilityReasons: ["out-of-tree-effect"],
  outOfTreeEffectTypes: ["commerce.checkout"],
  stakeFactorCodes: [
    "protected-type-removed",
    "protected-type-touched",
    "protected-prop-configured",
    "large-removal",
    "broad-change",
    "shallow-structural-change",
  ],
}

/** One invented node, deep in a leaf. Refused, and no field of a policy says so. */
const INVENTION: AssessmentSummary = {
  proposalId: proposalIdSchema.parse("p_7qhero"),
  stakes: "critical",
  reversible: true,
  operationCount: 1,
  insertedNodeCount: 1,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 0,
  touchedPrimitiveTypes: ["acme.testimonial"],
  removedPrimitiveTypes: [],
  relocatedPrimitiveTypes: [],
  relocatedNodeCount: 0,
  shallowestAffectedDepth: 4,
  affectedNodeCount: 1,
  configuredPropKeys: [],
  retainedNodeCount: 0,
  irreversibilityReasons: [],
  stakeFactorCodes: ["unknown-primitive"],
}

const analysisFrom = (summary: AssessmentSummary): ChangeAnalysis => ({
  ...EMPTY_ANALYSIS,
  operationCount: summary.operationCount,
  insertedNodeCount: summary.insertedNodeCount,
  removedNodeCount: summary.removedNodeCount,
  movedNodeCount: summary.movedNodeCount,
  configuredNodeCount: summary.configuredNodeCount,
  relocatedNodeCount: summary.relocatedNodeCount ?? 0,
  affectedNodeIds: Array.from({ length: summary.affectedNodeCount ?? 0 }, () => "n_0" as never),
  touchedPrimitiveTypes: summary.touchedPrimitiveTypes,
  removedPrimitiveTypes: summary.removedPrimitiveTypes ?? [],
  relocatedPrimitiveTypes: summary.relocatedPrimitiveTypes ?? [],
  configuredPropKeys: summary.configuredPropKeys ?? [],
  shallowestAffectedDepth: summary.shallowestAffectedDepth,
})

const label = (summary: AssessmentSummary): string =>
  summary === REDESIGN ? "redesign " : "invention"
```

### Exercise A — the partition, and what each side of it is a function of

```ts
describe("A", () => {
  it("prints the partition, and what each side of it is a function of", () => {
    console.log(`rules in the Gate's stakes vocabulary: ${STAKE_FACTOR_CODES.length}`)
    for (const code of STAKE_FACTOR_CODES) {
      console.log(
        isFixedStakeFactor(code)
          ? `  fixed     ${fixedStakeLevel(code).padEnd(8)} ${code}`
          : `  measured  ${"—".padEnd(8)} ${code}`
      )
    }
    console.log(
      `  fixed ${FIXED_STAKE_FACTOR_CODES.length}, measured ${MEASURED_STAKE_FACTOR_CODES.length}, and the two lists are filtered from the one above`
    )
    console.log("")
    console.log(`fields on a GatePolicy: ${Object.keys(gatePolicySchema.shape).length}`)
    console.log(
      `facts a StakeMeasurement carries: ${Object.keys(stakeMeasurementOf(EMPTY_ANALYSIS)).length}`
    )
    console.log(`  ${Object.keys(stakeMeasurementOf(EMPTY_ANALYSIS)).join(", ")}`)
    console.log(`lists on a ChangeAnalysis that name parts of a page: ${
      ["nestedTargets", "unknownPrimitives", "invalidProps", "unreadBindings", "redirectedSubmissions", "repointedBindings"].length
    }`)
  })
})
```

```
rules in the Gate's stakes vocabulary: 14
  measured  —        protected-type-removed
  measured  —        protected-type-touched
  measured  —        protected-type-relocated
  measured  —        protected-prop-configured
  measured  —        large-removal
  measured  —        broad-change
  measured  —        shallow-structural-change
  fixed     high     discards-later-work
  fixed     critical nested-target
  fixed     critical unknown-primitive
  fixed     critical invalid-props
  fixed     critical unread-binding
  fixed     high     redirected-submission
  fixed     high     repointed-binding
  fixed 7, measured 7, and the two lists are filtered from the one above
fields on a GatePolicy: 14
facts a StakeMeasurement carries: 9
  insertedNodeCount, removedNodeCount, movedNodeCount, affectedNodeCount, shallowestAffectedDepth, touchedPrimitiveTypes, removedPrimitiveTypes, relocatedPrimitiveTypes, configuredPropKeys
lists on a ChangeAnalysis that name parts of a page: 6
```

Four of these numbers are worth sitting with for a moment, and the interesting one
is not the seven and seven.

The vocabulary comes out in the order the Gate raises its rules, and the partition
falls as a clean cut rather than interleaved — which is not a coincidence and is
not arithmetic either. The two lists were one list, cut where the kinds change and
*not reordered*, because `stakeFactorCodes` on a record is written in the order the
factors came out and a reordering would have changed what every existing record
means. The order is part of the data.

Then the last two lines together. Nine facts a measurement may carry; six lists it
may not. The six are not the smaller half of the analysis — they are the half that
names things, and a glance at the four `critical` rows above shows where they go.
Four of the five rules that can refuse a change outright read one of those six
lists.

### Exercise B — rebuild the analysis and re-run the real Gate on it

Predict 2. The claim under test is that passing six empty lists is a detail.

```ts
describe("B", () => {
  it("rebuilds an analysis from each record and re-runs the whole Gate on it", () => {
    for (const summary of [REDESIGN, INVENTION]) {
      const again = assessStakes({ analysis: analysisFrom(summary), discards: [] }, IN_FORCE)
      console.log(
        `${label(summary)}  recorded ${summary.stakes.padEnd(8)} rebuilt ${again.level.padEnd(8)} ${
          summary.stakes === again.level ? "" : "<- the Gate refused this one"
        }`
      )
      for (const code of summary.stakeFactorCodes ?? []) {
        const raised = again.factors.some((factor) => factor.code === code)
        console.log(`    ${raised ? "raised again" : "SILENT      "}  ${code}`)
      }
    }
  })
})
```

```
redesign   recorded critical rebuilt critical
    raised again  protected-type-removed
    raised again  protected-type-touched
    raised again  protected-prop-configured
    raised again  large-removal
    raised again  broad-change
    raised again  shallow-structural-change
invention  recorded critical rebuilt low
    SILENT        unknown-primitive
```

`critical` to `low`. Three rungs, in the direction that reassures, on a change the
Gate refused outright.

And the first row is what makes it a trap rather than a bug. The simulation is
**perfectly correct about the redesign** — six rules, same six, same level — which
is the change an operator is least worried about, because a large destructive
redesign is obviously large and destructive. It is exactly wrong about the
one-operation change that was refused, which is the row somebody opens this screen
to understand.

A simulation is not wrong at a rate. It is wrong on a *population*, and the
population here is *the changes the Gate stopped*. Nothing about the shape of the
output says so: `low` is a valid level, the function returned normally, and if you
built a screen on this it would be a screen with numbers on it.

This is lesson 25's rule again, from the other end. There it was *a check is
bounded by the population of values that pass through the place it runs.* Here it is
the same sentence about a simulation, and the population it is wrong about is the
one the whole feature exists for.

### Exercise C — ask the record instead of rebuilding the page

```ts
describe("C", () => {
  it("asks each record under the policy that judged it", () => {
    for (const summary of [REDESIGN, INVENTION]) {
      const asked = remeasureStakes(summary, IN_FORCE)
      const codes = asked.factors.map((factor) => factor.code)
      const recorded = summary.stakeFactorCodes ?? []
      console.log(
        `${label(summary)}  recorded ${summary.stakes.padEnd(8)} remeasured ${asked.level.padEnd(8)} unreadable ${
          asked.unreadable.length === 0 ? "none" : asked.unreadable.join(", ")
        }`
      )
      console.log(
        `    reproduces the recorded rules: ${
          codes.length === recorded.length && recorded.every((code) => codes.includes(code))
            ? "yes"
            : "no"
        }`
      )
      for (const factor of asked.factors) {
        console.log(`    ${factor.source.padEnd(10)} ${factor.level.padEnd(8)} ${factor.code}`)
      }
    }
  })
})
```

```
redesign   recorded critical remeasured critical unreadable none
    reproduces the recorded rules: yes
    remeasured critical protected-type-removed
    remeasured high     protected-type-touched
    remeasured high     protected-prop-configured
    remeasured high     large-removal
    remeasured medium   broad-change
    remeasured medium   shallow-structural-change
invention  recorded critical remeasured critical unreadable none
    reproduces the recorded rules: yes
    recorded   critical unknown-primitive
```

Both records reproduce, under the policy that judged them, with nothing
unreadable — which is the precondition the screen imposes before it will show you
a counterfactual at all.

The `source` column is the whole of what exercise B was missing. The redesign's six
rows say `remeasured`: those rules ran, here, now, against the policy in the
argument. The invention's single row says `recorded`: nothing ran, the code was
turned back into its level, and that is not a weaker answer — it is the complete
answer to a question no policy can change.

Notice what is *not* in either list. No `detail`. There is no sentence saying
*destroys protected commerce.checkout*, because the nodes it would name are three
months gone. The type has no field for a sentence, so there is nowhere for a
plausible invented one to sit.

### Exercise D — move the policy and ask both records again

```ts
describe("D", () => {
  it("moves the policy and asks both records again", () => {
    const policies: readonly (readonly [string, GatePolicy])[] = [
      ["as judged", IN_FORCE],
      [
        "stop protecting commerce.checkout",
        gatePolicySchema.parse({ ...IN_FORCE, protectedPrimitiveTypes: [] }),
      ],
      [
        "and stop protecting price",
        gatePolicySchema.parse({ ...IN_FORCE, protectedPrimitiveTypes: [], protectedPropKeys: [] }),
      ],
      [
        "and call 30 nodes a large removal",
        gatePolicySchema.parse({
          ...IN_FORCE,
          protectedPrimitiveTypes: [],
          protectedPropKeys: [],
          removalThresholds: { medium: 20, high: 30 },
          breadthThreshold: 40,
          shallowDepthThreshold: 0,
        }),
      ],
    ]

    for (const [name, policy] of policies) {
      const parts = [REDESIGN, INVENTION].map((summary) => {
        const asked = remeasureStakes(summary, policy)

        return `${label(summary)} ${asked.level.padEnd(8)} (${asked.factors.length} rule${
          asked.factors.length === 1 ? "" : "s"
        })`
      })
      console.log(`${name.padEnd(34)} ${parts.join("   ")}`)
    }
  })
})
```

```
as judged                          redesign  critical (6 rules)   invention critical (1 rule)
stop protecting commerce.checkout  redesign  high     (4 rules)   invention critical (1 rule)
and stop protecting price          redesign  high     (3 rules)   invention critical (1 rule)
and call 30 nodes a large removal  redesign  low      (0 rules)   invention critical (1 rule)
```

The left column is the lever working: `critical`, `high`, `high`, `low`, with the
rule count falling as each field stops mattering. An operator can read that row and
know what loosening would cost.

The right column never moves, and **that is the answer rather than the limit.** An
operator who loosens every knob in the policy and sees `invention critical` has
been told something true and useful: this refusal is not a consequence of how
cautious you chose to be. There is no setting under which Loom will apply a change
that inserts a node nothing can draw, and the screen says so without pretending to
have simulated it.

Two details in the left column repay a second look. `high` appears twice for
different reasons — the first time because `protected-type-touched` and
`protected-prop-configured` are both `high` and dropping the type list leaves the
prop; the second because `large-removal` at fourteen nodes is `high` on its own. And
the last row is `low` with **zero** rules, which is what a stakes assessment with
nothing to say looks like. It is not an error and it is not `unreadable`: those
seven rules ran and all seven declined.

### Exercise E — a record written before the field one rule needs

```ts
describe("E", () => {
  it("asks a record written before the field it needs existed", () => {
    const { configuredPropKeys: _dropped, ...older } = REDESIGN
    const olderRecord = older as AssessmentSummary

    console.log(`does the record say which props were configured? ${
      olderRecord.configuredPropKeys === undefined ? "no — the field is absent" : "yes"
    }`)
    for (const [name, policy] of [
      ["protects price", IN_FORCE],
      ["protects no prop key", gatePolicySchema.parse({ ...IN_FORCE, protectedPropKeys: [] })],
    ] as const) {
      const asked = remeasureStakes(olderRecord, policy)
      console.log(
        `  ${name.padEnd(21)} ${asked.level.padEnd(8)} ${
          asked.unreadable.length === 0
            ? "exact      unreadable: none"
            : `A FLOOR    unreadable: ${asked.unreadable.join(", ")}`
        }`
      )
    }
  })
})
```

```
does the record say which props were configured? no — the field is absent
  protects price        critical A FLOOR    unreadable: protected-prop-configured
  protects no prop key  critical exact      unreadable: none
```

Two things here, and the second is the one worth the exercise.

The first is the conditional. The *same record* is unreadable under one policy and
exact under the other, and nothing about the record changed. `unreadable` is not a
property of a record; it is a property of **this record under this policy** — the
question is whether the policy you handed in would have consulted the field that is
missing. A host protecting no prop keys never looks at the list, so its absence
costs nothing.

The second: both rows say `critical`. The floor and the exact answer are the same
word, and the row is still marked. If `unreadable` meant *this number is wrong* the
mark would be noise here. It means something else — **you are not entitled to
believe this number** — and the two are different because you cannot tell by
looking which kind you have. A screen that hid the mark whenever the figure looked
plausible would hide it precisely when it is doing its job.

### Exercise F — the missing field that provably does not matter

```ts
describe("F", () => {
  it("asks two records with no affected-node count, under one threshold", () => {
    const withoutCount = (summary: AssessmentSummary): AssessmentSummary => {
      const { affectedNodeCount: _dropped, ...rest } = summary

      return rest as AssessmentSummary
    }
    const policy = gatePolicySchema.parse({ ...IN_FORCE, breadthThreshold: 8 })

    for (const summary of [REDESIGN, INVENTION]) {
      const bare = withoutCount(summary)
      const ceiling =
        bare.insertedNodeCount + bare.removedNodeCount + bare.movedNodeCount + bare.configuredNodeCount
      const asked = remeasureStakes(bare, policy)
      console.log(
        `${label(summary)}  ceiling from the four counts ${String(ceiling).padStart(2)}  threshold ${String(
          policy.breadthThreshold
        ).padStart(2)}  ->  ${
          asked.unreadable.includes("broad-change")
            ? "broad-change unreadable"
            : "broad-change answerable anyway"
        }`
      )
    }
  })
})
```

```
redesign   ceiling from the four counts 20  threshold  8  ->  broad-change unreadable
invention  ceiling from the four counts  1  threshold  8  ->  broad-change answerable anyway
```

Neither record says how many nodes its change named. One of them can still be asked
about breadth and the other cannot, and the difference is an **argument** rather
than a field.

Twenty is not a measurement of the redesign's breadth; it is the largest that
breadth could possibly have been, given counts the record has always carried. Above
the threshold, so the rule might have fired and might not, and the honest answer is
*I cannot tell*. One is the same ceiling for the invention, under the same
threshold, and below it — so the rule **cannot** have fired, and a `broad-change`
that provably could not happen is not a gap in the answer.

This is the move that makes the feature answer over a journal written before any of
these fields existed. A missing input is a problem only when something depended on
it, and *depended* is sometimes decidable from what you did keep. It is worth
noticing that the ceiling is derived from the record's own four counts rather than
stated by anybody: lesson 28's first remedy, in the one place in this lesson where
the second copy was already lying around.

### Exercise G — a record from before the Gate wrote down which rules it raised

```ts
describe("G", () => {
  it("asks a record written before the Gate journalled which rules it raised", () => {
    const { stakeFactorCodes: _dropped, ...rest } = INVENTION
    const pre0198 = rest as AssessmentSummary
    const asked = remeasureStakes(pre0198, IN_FORCE)

    console.log(`recorded stakes:  ${pre0198.stakes}`)
    console.log(`remeasured:       ${asked.level}  <- a floor`)
    console.log(`factors:          ${asked.factors.length}`)
    console.log(`unreadable:       ${asked.unreadable.length}`)
    for (const code of asked.unreadable) console.log(`  ${code}`)
  })
})
```

```
recorded stakes:  critical
remeasured:       low  <- a floor
factors:          0
unreadable:       7
  discards-later-work
  nested-target
  unknown-primitive
  invalid-props
  unread-binding
  redirected-submission
  repointed-binding
```

`stakeFactorCodes` arrived with 0198. A record written before it says what the
stakes *were* and not which rules got them there — so every fixed rule at once
becomes a question this record cannot answer, and the whole fixed half of the
vocabulary comes back in one list.

Set this transcript beside exercise B's, because they are the same two numbers with
one difference. Both say `low` for a change that was refused as `critical`. B says
it as a result. This says it as a floor, with seven named reasons and a count of
zero factors, and a caller that reads `level` without reading `unreadable` turns
this back into B.

Which is the honest statement of what the field buys and what it does not. It makes
the shortfall **representable**; it does not make it impossible to ignore. The
discipline is on the caller, written down in 0215's consequences and in
`remeasureStakes`'s own doc comment, and enforced by nothing — and the screen that
already had the right habit got it from the ladder, where it had learned to set
aside every row it could not reproduce.

Exercise E's record is one field short and tells you so. This one is six months
older and tells you so in seven places. Neither is a defect in the journal. Both
are the journal being asked a question it was not written to answer, and saying
which part it cannot reach.

---

## It could have been otherwise

**Two optional fields and nothing else**, exactly as the gap was filed. Rejected
because it does not reach the stated goal, and exercise B is the measurement: a
caller still cannot build a `ChangeAnalysis` without fabricating ids and six empty
lists, and five of those lists are `critical` inputs, so the answer it computes is
wrong downward on refusals. The filing was right about the gap and wrong about the
remedy, which is the usual shape of a good finding.

**Journal the six lists of specifics**, so the whole analysis can be rebuilt and
nothing has to be partitioned. Rejected: that is content — node ids, prop paths,
endpoint names, the sentences a factor wrote — and 0023 keeps it out. It would
also grow every record by an unbounded amount to answer a question the codes
already answer.

**Default the absent fields to `[]` and return a level with no caveat.** Rejected,
and it is the reason `unreadable` exists at all. It is 0045's loss case exactly:
an operator asking *would protecting `loom.card` have caught any of this* would be
told **no** by every record written before the field existed, with nothing to
distinguish that from a measurement. The wrong answer and the right one are the
same word.

**Refuse to answer any record with an absent field.** The over-correction, and it
would have made the lever useless rather than unsafe: almost every record in a long
journal predates almost every field. Exercise F is what was built instead — ask
whether this policy on this record could have reached the missing field at all, and
only then give up.

**Return a `StakeAssessment`**, so one type serves both paths and a screen is
written once. Rejected because a `StakeFactor` carries a `detail` sentence naming
the nodes it found and a re-measure holds none. Inventing it is worse than omitting
it, and a type whose field is a lie in one of its two producers is worse than two
types.

**Reproduce the measurement in the portal and guard it with a build-time check**,
which is what that screen already does for the ladder's rungs. Rejected on cost
rather than on principle, and the line is worth seeing: the ladder comparison is
eight comparisons against fields that are on the record, where this is fourteen
rules with thresholds, a severity ordering and a host vocabulary. The existing
guard is affordable because what it guards is small.

**Keep one list of rules and let each one decide for itself whether it can be
re-run.** The shape that sounds most flexible. Rejected because it puts the
partition back into fourteen places after taking it out of none, and because the
thing a caller needs is not per-rule cleverness but a *published* answer to *which
of these can your question move*. Two exported lists, derived, are that answer.

**Put the stakes level's reasons in the disposition instead**, where the prose
lives. Rejected for lesson 17's reason: a disposition's sentence is for a person
reading one decision, and this is a question asked across nine hundred of them.
Prose does not aggregate.

---

## Explain it back

Two things to write in your own words. Do not look at the earlier sections while
you write. Then compare.

1. **A colleague says: "this is over-engineered. Log the inputs too — disk is
   cheap, and then you can re-run anything."**

   They are right that disk is cheap. Answer them without mentioning Loom, trees
   or telemetry: say what else keeping an input costs besides space, name the
   party that pays it and the moment they pay it, and then say what you would do
   instead for the inputs you have decided not to keep. The last third is the
   answer this lesson gives and your colleague's objection has no reply to.

2. **Derive this lesson from lesson 09 and lesson 24, without looking at either.**

   Lesson 09 gave you the Gate as a ladder of rules where the order encodes
   precedence, and — if you were reading closely — the fact that a rule is a
   function of a policy *and* of an analysis. Lesson 24 gave you the rule about how
   many ways an answer needs to be able to say *I cannot tell you*: one field per
   thing a reading can fail at, where distinct means the caller would do something
   different about it.

   Starting from those two, derive both halves of this design: why the rules had to
   be partitioned before anything could be re-asked, and what shape the answer has
   to have once they are. Then state the second half as a rule about **records**,
   with no rules, policies or levels in it.

Predict, before writing (2): the step most people skip is that the partition is not
a performance or tidiness move and not about which rules are *important* — it is
about which rules are a function of something a record is **permitted** to hold.
The permission is the input to the design, and it came from a different lesson than
either of the two above.

---

## Self-check

Seven questions. For each: **rate your confidence 1–5 before you write your
answer, then check.**

1. State the general rule this seam is an instance of, in a sentence with no
   policies, levels or records in it — it should be about what you owe a question
   you have decided in advance not to be able to answer. Then give one example from
   outside software entirely.
2. The Gate's stakes vocabulary has fourteen rules and they are cut into two
   kinds. Give the question each kind answers, and then say which of the two could
   be re-run from a record and why — making your answer about *what the rule reads*
   rather than about what the record holds.
3. A caller rebuilds an analysis from a record, passes six empty lists, and re-runs
   the Gate's own `assessStakes`. Say what it gets right and what it gets wrong, and
   then say what is dangerous about *which* of the two it gets wrong. Your last
   sentence should be about populations.
4. `remeasureStakes` calls `measureStakes` rather than reimplementing the seven
   rules. Give the argument, and make it about *when* a copy fails rather than about
   how likely it is to. Then name the one place in this course that has already paid
   this bill.
5. `unreadable` is empty for one record and names one rule for another, and neither
   record changed between the two calls. Explain. Then say what `unreadable`
   non-empty means for `level`, in the exact form a screen would have to use.
6. Two records are missing the count that `broad-change` reads. One can be asked
   about breadth anyway. Give the argument, say what makes it an argument rather
   than a lookup, and then say which of this course's three sources of a second copy
   it is.
7. Explain why the answer to *what would these stakes have been* is not allowed to
   be a `StakeAssessment`. Then name the field that makes it impossible, and say
   what the cheaper alternative — returning that type with the field left empty —
   would have cost a reader who found such a record in a log.

Question 1 is the one the rest of the lesson exists to support. Question 3 is where
a confident half-answer is most likely, because *it is wrong sometimes* and *it is
wrong about refusals* feel like the same observation and only one of them is a
reason to throw the design away.

---

## Reflect

Write for two minutes, then move on.

- Predict 1. If your list of what you would need to keep included node ids, prop
  values or the sentences a factor wrote, do not cross it out. Write next to it
  *who would have been able to read that, and for how long* — the answer to the
  question you were asked is in there, and it is not a technical answer.
- Predict 2 and your confidence. If you wrote that the simulation is *approximately
  right* with a 4 or a 5, write down the thing you did not ask: **which rows is it
  wrong about?** Being wrong at a rate and being wrong on a population are
  different defects and only one of them is visible in a sample.
- Predict 3. If your two questions were about how severe the rules are, or how often
  they fire, look again. The cut is *does a field of the policy decide this*, and
  nothing else — which is why `discards-later-work` at `high` and `nested-target` at
  `critical` are on the same side of it.
- Predict 4. If you picked *default it and return a number*, you are in good
  company: it was the shape originally filed. Write down what you would have said
  to the operator in exercise E's first row if your screen had shown them
  `critical` with no mark on it and they had acted on it.
- Now go and look at your own work. Find a record, log line, event or metric you
  keep, and write down one question somebody will eventually ask of it that it
  cannot answer. Then say which it is: a fact you could not reach, or a fact you
  **decided** not to keep. The second kind is the one worth a mechanism, and it is
  the one that looks like an oversight to everybody who arrives later.
- Last, the uncomfortable one. Find a place where you already answer such a question
  with a plausible number. Write down how a reader would tell your number from a
  real one, and if the answer is *they would not*, write down what field you would
  have to add.

---

## Come back to this

Set AM in [`review-schedule.md`](review-schedule.md), two days after this lesson.
Interleaved with 08, 09, 16, 17, 24 and 25 — heavy on 24, because the shape of the
answer here is that lesson's rule applied to a record instead of a reading; and on
09, because the partition cuts a list that lesson taught you to read as one thing.

Part V has seventeen seams now, and this one does not fit the question the
sixteenth ended on. Lesson 33 sorted seams by *when the party that knows runs*: too
late needs somebody to come and ask, early enough needs a declaration, nobody owns
it needs an instrument. The witness here ran at the perfect moment and held
everything. There was no reach problem, no interpretation problem, no second store,
no timing problem, and nothing undeclared.

What there was is a rule the system wrote for itself about **what it is allowed to
keep**, and the fact in question is on the wrong side of it — not inaccessible, not
unknown, *forbidden*. The eighth remedy follows from that and from nothing else:
when you may not keep a fact, partition the questions by which ones are a function
of what you *did* keep; run the real rules over that half rather than a copy of
them; and answer the rest by publishing the fact that you cannot, in a field of its
own, so that a floor and a measurement are not the same word.

The question to carry into an eighteenth seam is therefore not about reach, or
ownership, or timing. It is the one Predict 1 asks and most first answers skip
straight past: **which questions did you decide you would never be able to ask, on
the day you chose what to write down?** Every record is that decision, taken once,
usually by somebody who was thinking about something else — and the cost of it does
not arrive until the morning somebody needs an answer and gets a plausible number
instead of a refusal.
