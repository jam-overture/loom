# The Gate policy

**Draft for the maintainer to mark up, 3 October 2026.** Nothing here is approved
and no lane owns it yet. It exists to answer one question — *is "make the policy
precise" a routine, a handful of framework units, or mostly documentation?* — and
the honest answer is visible only once what a policy can and cannot say is
written down.

## Why this matters more than it looks

The Gate is the product's argument. A customer evaluating Loom is evaluating
whether they can let AI change a page they are responsible for, and the policy is
**the only part of that argument they write themselves**. Everything else —
stakes, reversibility, the ladder, the record — is ours.

Today they get a `defaultGatePolicy` and fourteen fields, and **not one named
preset**. "Can I be strict about pricing and relaxed about the blog" has a good
answer that nothing in the repository tells them, and "give me something sensible
for a regulated site" has no answer at all.

## What a policy can say today

Fourteen fields on `gatePolicySchema`, in four groups.

| Group | Fields | What it decides |
| --- | --- | --- |
| **Host vocabulary** | `protectedPrimitiveTypes`, `protectedPropKeys`, `outOfTreeEffectTypes`, `interactiveTypes`, `registeredPrimitiveTypes` | Which parts of *this* deployment are consequential. Two of them (`interactiveTypesFor`, `registeredTypesFor`) are read off the registry so they cannot drift from the components |
| **Shape thresholds** | `removalThresholds.medium` / `.high`, `breadthThreshold`, `shallowDepthThreshold`, `inverseRetentionBudget` | When size, breadth, depth or an impractical undo turn a change into a bigger one |
| **Confidence** | `minimumConfidence`, `confidenceFloor` | How sure an interpreter must be to apply, and below what it is refused |
| **Disposition** | `autoApplyCeiling` (per origin), `refusalFloor` | The highest stakes each origin may apply unattended, and where refusal starts |
| **Identity** | `policyId` | The name a host gives what the above means, written onto every disposition |

Those feed **fourteen stake factors** and an **eight-rung ladder** consulted in
order, the first match deciding: `confidence-below-floor`, `stakes-at-refusal-floor`,
`irreversible`, `discards-later-work`, `redirected-submission`, `repointed-binding`,
`stakes-above-ceiling`, `confidence-below-minimum`. A disposition names the one
rule that fired, never a score (0002).

### The part nobody has written down

**A policy is chosen per change.** `PolicySource.resolve({ tree, intent })` is
handed the tree being changed and the intent asking, and returns the policy for
*that* change. `fixedPolicy` is the convenience; it is not the shape.

So most of what "be very precise" usually means is **already possible and
undiscovered**:

- stricter on the pricing page than the blog — the tree is in hand;
- stricter for `system-signal` than for a developer — that is `intent.origin`, and
  it is also already a ceiling;
- a different policy per actor, per surface, per revision, per time of day.

Before a single field is added, somebody should write the four-line example that
shows this. **A knob added for something a host could already express is a knob
we maintain forever.**

## What a policy cannot say today

Honest inventory. The third column is the design question, and it is the whole
point of this document.

| The ask | Expressible now? | Where it belongs |
| --- | --- | --- |
| "Stricter on these pages / surfaces" | **Yes**, via `PolicySource` | Documentation and an example, not a field |
| "A different ceiling for this actor" | **Yes**, via `PolicySource` and `intent.actor` | Same |
| "Never touch *this node* or *this subtree*" | No — protection is by type and prop key, never by address | **A field.** Declarative, digestible, and the most asked-for thing missing |
| "At most N of this primitive" / "only inside that one" | No | **A field**, if the vocabulary stays declarative |
| "These props may only take these values" | Partly — `propsVocabulary` on the runtime (0179) | **A seam**, and it already exists. Not a field: a hundred Zod schemas do not digest |
| "No more than N unattended changes an hour" | No | **A seam.** It needs state, and a policy is a pure value |
| "Only between 09:00 and 17:00" | No | **A seam** for the same reason, or `PolicySource` if the host keeps the clock |
| "Two people must approve this" | No | **Not the Gate.** The Gate decides *whether to ask*; who answers is the hold path's question, and needs its own record |
| "Stricter until this model has a track record" | No — calibration (0031) is a reader, not an input | **Open question**, below |
| "Turn off this ladder rung" / reorder them | No, deliberately | **Not approved.** Two deployments whose dispositions cannot be compared is the cost |

## The rules this would be built under

Proposed, and the first four are already decided elsewhere.

1. **A disposition names one rule that fired, never a score** (0002). Two
   independent axes, stakes and reversibility, and a named reason.
2. **A policy is a value, not code.** Zod-parsed, serialisable, and digested by
   `policyFingerprintOf` into every disposition so two verdicts months apart can
   be compared (0033). **Anything that cannot be digested is a seam on the
   runtime, not a field on the policy** — the precedent is 0179.
3. **Vocabulary comes from the registry wherever it can.** `interactiveTypesFor`
   and `registeredTypesFor` read what a component declared about itself, so the
   knowledge cannot drift into a policy file.
4. **Empty means undeclared, not empty.** It is what lets a default be additive
   and safe at the same time.
5. **Scope is a function, not a field.** Per-page, per-actor and per-origin
   precision is `PolicySource`, and a field that duplicates it is a field that
   can disagree with it.
6. **A preset is a value a host can read, diff and edit** — never a mode inside
   the Gate. A named preset that took a different code path would be a second
   Gate, and the record would stop meaning one thing.

## A plan, if this is worth doing

Ordered, with the cheapest and most valuable first.

### 1. Presets, and the page that helps someone choose

Three or four named policies — a cautious one for a regulated marketing site, a
middling one, a permissive one for an internal tool — each with **a test that
proves what it holds and what it lets through**, and a short page saying which to
start from and what to change first. This is the gap a customer meets on day one,
it is pure breadth, and it needs no new runtime capability.

### 2. Decide whether a disposition must say what *else* judged it

Two open findings, and they are the same one from two sides: `propsVocabulary` is
a seam, so a deployment that wires it produces dispositions whose fingerprint is
byte-identical to the week before (21 September), and the portal has both floors
wired while only one is in the fingerprint (23 September).

Nothing is broken. But *the policy did not change* is true and is not the whole
truth about what judged the change, and the fingerprint exists precisely so that
sentence can be trusted. **This is a maintainer decision**, not a routine's.

### 3. Protection by address, not only by type

"Never touch this node or anything under it." Declarative, digestible, and the
most obvious thing a host asks for that a policy cannot say.

### 4. Containment and cardinality vocabulary

"At most one of these", "this only inside that". Same test as above: it is a
field only while it stays declarative.

### 5. The recipes, for the documentation lane

Per-page, per-actor and per-origin policy as worked examples — which is step 1's
other half, and may turn out to be most of what "very precise" means.

## Still not in scope

- **A policy DSL, or rules as code.** It is the natural reading of "very
  precise", and it ends the comparability the fingerprint buys. Rule 2.
- **Disabling or reordering the ladder.**
- **Approval routing** — who answers a held change, how many of them, in what
  order. A real question, and the hold path's rather than the policy's.

## Open questions for the maintainer

1. **Should a disposition name the seams that judged it**, or is the policy
   fingerprint enough? (Step 2. This one decides how honest the record is.)
2. **Where do presets ship** — in `@jam-overture/loom`, or beside the primitives
   in their own package? They are content, not runtime, which argues for the
   second; they are useless if a host has to find them, which argues for the
   first.
3. **Is calibration an input to policy?** A model with a poor record could face a
   lower ceiling automatically. It is attractive and it makes a disposition
   depend on history, which is a different kind of thing to explain to an
   auditor.
4. **Who owns this.** Steps 1 and 5 are breadth and look like a routine. Steps 2
   to 4 are a small number of expensive records inside `src/runtime/`, which is
   the framework lane's core and is tightly coupled — `policy.ts` is not a leaf
   the way `src/signals/` was.
