# 0179. What a primitive accepts is a vocabulary the write path is handed, not a field on a policy

**Status:** Accepted
**Date:** 2026-09-21
**Section:** §2

> **Why this number.** `0178` is the highest record on `main`. `0176` is claimed
> by the open #353 and `0177`–`0178` by #358 and #359, so `0179` is the next
> number free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record — 0173 left this door
> open in as many words — and it touches neither the tree schema nor the delta
> model: no built code migrates, and a deployment that wires nothing keeps the
> behaviour it has, byte for byte. What it adds is one fact in the analysis, one
> stake factor and one optional seam on the composition root, which is the route
> [0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
> established and [0173](0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md)
> took a second time.

## Context

`Loom docs` found two defects on 17 September by **running** the quickstart
rather than by reading it. 0173 closed the first: a delta inserting
`app.nonesuch`, a primitive nothing registered, is now refusable.

The second is still live on `main`, and is the one this record closes. A delta
inserting a `loom.text` whose `text` prop carries two hundred characters against
a schema whose maximum is a hundred and sixty ends `committed`. The revision is
appended. The page is served. `renderElement` validates the props, finds they do
not satisfy the primitive's declared schema, returns `null`, and reports
`invalid-props` — so what the reader gets is a hole, on every request, until
somebody looks at a page rather than at a test.

It is the same failure 0173 described, one question further down. *Can this be
drawn at all* was answerable from a list of type names. *Will the primitive
declaring that type accept what this node carries* is not answerable from any
list, and that is the whole difficulty: host vocabulary reaches the Gate through
`GatePolicy`, and a policy is a Zod-parsed, digested, serialisable value.

0173 wrote down why no shape that fits on a policy answers the question, and
nothing since has changed it:

| what a policy could carry | what it catches | what it still misses |
| --- | --- | --- |
| type names (**shipped, 0173**) | an invented primitive | every prop |
| catalogue-shaped: prop names + required | a missing required prop, an invented key | `max(160)`, `.email()`, every refinement, every cross-field rule |
| a serialised schema language | most of it | it is the second schema language `catalogue.ts` refused to maintain, and it drifts from Zod the first day somebody writes a `.refine()` |

So the props half needs a **function**, and a function cannot be a knob. The
open question was not whether to check props but where to put the thing that
does the checking, and what its refusal is.

## Decision

**A props vocabulary is a seam on `CompositionRuntime`, its verdict is the
renderer's own, and what it finds is a `critical` stake factor rather than a new
outcome.**

Four additions, and the fourth is really the removal of a cost.

1. **`PropsVocabulary`** in `runtime/vocabulary.ts`: `(type, props) =>
   PropsVerdict`, which is `PropsValidator`'s signature and `PropsValidator`'s
   verdict, imported as a type from the render seam. `EVERY_TYPE_UNDECLARED` is
   the default and answers `undeclared` for everything.
2. **`ChangeAnalysis.invalidProps`** — the nodes a change would leave carrying
   props the primitive declaring their type refuses, each with the node, the
   type, and the issues the schema itself raised.
3. **An `invalid-props` stake factor at `critical`**, which under the default
   refusal floor is a refusal.
4. **`CompositionRuntime.propsVocabulary`**, optional and absent by default,
   threaded into both `composeChange` and `confirmChange`. And, in the SDK,
   `propsVocabularyFor(registry)`, so a host reads it off the registry the
   renderer already resolves against rather than hand-keeping it beside one.

Four properties carry the decision.

**The verdict is the render seam's, not a second vocabulary of failure.** A
boolean would have kept the runtime free of any import from `render/`, and it
would have thrown away the issues — and a refusal that cannot say *which* prop
and *why* is precisely the refusal a repairer can do nothing with. Sharing the
type costs one type-only import of a leaf module that holds no React and no
logic, and buys a guarantee no test of either seam alone can make: what the
renderer would decline to draw is, by construction, what the write path declines
to write.

**Measured on the tree the change produces, less what it found.** This is
`nestedTargets`' measurement and not `unknownPrimitives`', and props force the
difference. A type is fixed when a node is inserted, so only an `insert` can
introduce an unknown one; props are the one thing two operations in a delta can
argue about, and a delta that inserts a bad node and fixes it in the next breath
produces a page with nothing wrong on it. The subtraction is keyed by node id
alone, so a node that was already failing and fails *differently* afterwards
counts as inherited — deliberately, because a page can hold a node a later
schema tightened past, and counting the near-miss would mean the only way out of
such a node is one change that repairs it completely.

**`critical`, the same level as `unknown-primitive`, because the damage is
identical.** `renderElement` returns `null` for both. It is worth being blunt
about that rather than reasoning from how bad each *sounds*: a level that ranked
them differently would be ranking the explanation rather than the harm. And
refusal is the useful disposition rather than merely the severe one, for 0173's
reason — *`variant` is not one this primitive offers, and here are the two that
are* is among the most actionable things a model can be told, while confirmation
would put a broken node to a person whose only available answer is no.

**The refusal is an ordinary `rejected` disposition, and that is the point.**
0173 rejected the validator seam the 17 September finding proposed on two
counts, and named the second as the larger: a validator's refusal would not
reach the repairer, because `RepairRequest` carries a `Disposition` and a
validation failure has none. Routing the fact through the analysis and the
stakes means the refusal *is* a disposition, with the schema's own words in its
`reason.detail`, and the repairer is offered it by the path that already exists.
Nothing widens. Nothing about repair is lost.

## Consequences

- A deployment that wires `propsVocabularyFor(registry)` gets the second
  quickstart defect closed: a proposal whose props its own primitives reject is
  refused before the log keeps it, with the node, the prop and the schema's
  sentence in the refusal, and a repairer gets one chance to answer.
- A deployment that wires nothing is bit-for-bit unchanged. `EVERY_TYPE_UNDECLARED`
  finds nothing wrong with anything, and `(docs)`' `quickstart.test.ts` runs the
  experiment against the live runtime unchanged.
- **`invalid-props` is now a name the system uses at both ends of itself**, as
  `unknown-primitive` has been since 0173: the write path refuses it, the render
  path reports it, and both read the verdict off the same registry. The same
  fault, the same word, whichever end a reader arrives from.
- No new `CompositionOutcome` kind, so no exhaustive `switch` and no
  `Record<CompositionOutcomeKind, …>` in any of the four surfaces changes. The
  merge gate is four surfaces wide and this unit does not test it.
- **One knob-shaped honesty gap, stated rather than glossed.** The policy
  fingerprint records which *policy* judged a change, and a props vocabulary is
  not on the policy, so two dispositions recorded either side of a host wiring
  one carry the same fingerprint. The same is already true of the interpreter,
  the repairer, the registry and the renderer's own validator — none is
  fingerprinted, because none is policy. What a host *can* still vary per tree
  is everything the policy holds; what it cannot is whether props are checked at
  all. A deployment that needs that distinction has `PolicySource` and a second
  runtime.
- `analyzeDelta` takes a third trailing vocabulary. Every consumer keyed on
  `StakeFactorCode` is a compile error until it names the addition; one did,
  `(marketing)`'s sentence register, which is that guard rail working.

## Alternatives considered

**The `validator` seam the 17 September finding proposed, with a sixth
`CompositionOutcome` kind** — an optional `ChangeValidator` beside `repairer`,
and `not-valid` beside the five endings. Rejected, and the reasoning is 0173's
sharpened by having looked at what it would take. The outcome kind breaks every
exhaustive `switch` in four surfaces at once, which is a cost. The fatal part is
the other one: a sixth ending is *outside* the Gate, so it carries no
disposition, so `RepairRequest` has to widen to admit a refusal that has none —
and widening it breaks every repairer a host has written, to deliver a refusal
that is *less* repairable than the one this record ships. The seam was the right
shape for a question the Gate could not answer. It turned out the Gate could
answer it; it only needed the fact.

**A `checkDeclaredProps` boolean on the policy, with the function on the
runtime.** It would keep the fingerprint honest and let a host vary the check
per tree, which is `PolicySource`'s whole argument. Rejected because the pair
does not compose: a host that sets the flag and wires no vocabulary gets
silence, and a flag whose meaning depends on a wiring it cannot see is the kind
of knob that is discovered to have been off for a month. The render seam faced
exactly this choice for exactly this validator and answered it the same way —
`render/props.ts` says a renderer handed no validator cannot validate, so the
wiring *is* the visible choice — and two seams checking one thing should not
disagree about how a deployment turns it on.

**Deriving the vocabulary inside the runtime from a registry**, so nobody could
forget it. Rejected for the three reasons 0173 gives one question up: it puts an
SDK import in the Gate's inputs, and it takes away the deployment's ability to
decline the check. The type-only import of `render/props.ts` this record does
take is a different thing — a shape, not a source of facts.

**Reporting the fact and leaving the level to the host**, by way of a policy
field naming which prop failures are critical. Rejected as a knob for a
distinction nobody has yet needed: every reading of `invalid-props` ends with a
node that does not draw, and a host that wants the change through anyway already
has the answer 0002 asks for — wire no vocabulary, or declare no schema for that
type, which the `undeclared` verdict exists to express.

**Checking props on the *whole resulting tree* rather than on what the change
introduces.** Simpler to implement and simpler to describe, and it would make
every deployment that tightens a schema unable to edit any page still holding a
node that predates the tightening — including unable to repair it. The
inherited-subtraction is what makes this shippable against real pages, and it is
the same trade `nestedTargets` made for the same reason.
