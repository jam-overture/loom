# 0173. A change may not add a node the deployment cannot draw

**Status:** Accepted
**Date:** 2026-09-19
**Section:** §2

> **Why this number.** `0172` is the highest record on `main` and on both
> branches open at the time of writing (#343, #344). `0173` is the next number
> free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record, and it touches
> neither the tree schema nor the delta model: no built code migrates, and a
> deployment that changes nothing keeps the behaviour it has. What it adds is
> one policy field with an empty default, one fact in the analysis, and one
> stake factor — the same three places
> [0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md) added a
> fact in, by the same route, for the same reason.

## Context

`Loom docs` filed this on 17 September, having found it by **running** the
quickstart rather than by reading it. Two experiments, both ending `committed`:

- a delta whose `insert` names `app.nonesuch`, a primitive type nothing
  registered — revision appended, page drawn with an `unknown-primitive`
  diagnostic, the node absent from the output;
- a delta whose `insert` carries a `text` prop of 200 characters against a
  schema whose maximum is 160 — revision appended, node drawn **without its
  props**.

Neither reached a refusal and neither could have. `CompositionRuntime` is an
interpreter, a policy source, events, a clock, an id factory and an optional
repairer; there is no resolver and no validator anywhere on the write path. So
what is actually true is narrower than the documentation's *the registry is the
allowlist of what a proposal may say*:

- the **catalogue** bounds what a model is *shown*,
- the **render seam** bounds what reaches a *screen*, reporting the rest as
  diagnostics rather than blanking the page
  ([0008](0008-the-renderer-is-a-total-pure-projection.md)),
- and **nothing bounded what a delta may say**.

The cost is not a crash. It is that a revision nothing can draw becomes the
current one: the hole is served to every reader, on every request, until
somebody looks at a page rather than at a test. The one person positioned to
catch it — the model that invented the word — has already gone.

## Decision

**A declared library is a Gate vocabulary, and adding a node outside it is
critical damage.**

Concretely, three additions along the route 0064 established:

1. `GatePolicy.registeredPrimitiveTypes` — every primitive this deployment can
   draw. Host vocabulary, alongside `protectedPrimitiveTypes`,
   `outOfTreeEffectTypes`, `protectedPropKeys` and `interactiveTypes`.
2. `ChangeAnalysis.unknownPrimitives` — the nodes a delta's `insert` operations
   would add whose type the vocabulary does not hold, each named by node and
   type.
3. A `unknown-primitive` stake factor at `critical`, which under the default
   refusal floor is a refusal.

And, in the SDK, `registeredTypesFor(registry)`, so the list is read off the
registry the renderer already resolves against rather than hand-kept beside it.

Three properties carry the decision, and each is a choice that could have gone
the other way.

**Empty means undeclared, not empty.** `primitiveVocabularyFor([])` answers
`true` for every type. A host that leaves the field out is not claiming a
library of nothing; it is declining to say, and gets exactly the behaviour the
runtime had yesterday. This is the asymmetry with `NOTHING_INTERACTIVE`, which
answers `false` by default, and it is the only way a check whose natural
reading is an allowlist can ship as an additive change.

**Measured on what a change introduces, never on the tree it found.** Only
`insert` contributes: `move` carries nodes the tree already had, and `configure`
cannot change a type. A page may legitimately name a primitive a later
deployment withdrew — that is precisely why `renderLoomTree` reports instead of
throwing — and an ordinary edit to such a page is untouched by this. What the
rule does refuse is putting one **back**, which is the honest answer: the
primitive has to return before the page can.

**Critical, so a refusal, so a repair.** It joins `nested-target` as the second
factor that measures a change which is wrong however it was meant; every other
factor measures a change that might be right. And refusal is the *useful*
disposition rather than merely the severe one, for the reason 0064 gives and
more sharply here: a refused proposal is the one a repairer is offered, and
*that type does not exist* is the most actionable thing a model can be told,
because the catalogue it was handed already lists what does. Confirmation would
put an invented word to a person who can only answer no.

Adding a policy field changes the **shape** half of
`policyFingerprintOf` ([0033](0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md)),
so dispositions recorded before this version read as `incomparable` to ones
recorded after rather than as `changed`. That is the designed behaviour and the
reason the fingerprint has two halves: an honest *cannot tell* across an
upgrade, instead of a confident report that every host edited a policy it never
touched.

## Consequences

- A deployment that declares its library gets the defect closed: a proposal
  naming a primitive it does not have is refused, with the type and node in the
  refusal's own sentence, and a repairer gets one chance to name a real one.
- A deployment that declares nothing is bit-for-bit unchanged. `(docs)`'s
  `quickstart.test.ts` runs both of the experiments above against the live
  runtime and both still end `committed`, so the page's claim about what is true
  stays true and stays checked.
- `unknown-primitive` is now a name the system uses at both ends of itself: the
  write path refuses it, the render path reports it. The same fault, the same
  word, whichever end a reader arrives from.
- Every consumer keyed on `StakeFactorCode` or `keyof GatePolicy` is a compile
  error until it names the addition. Four did: the runtime's own two policy
  tests, `(marketing)`'s sentence register and `(docs)`' knob table. That is
  those guard rails working, and it is why the check could be added without
  anybody auditing the surfaces for places that would silently omit it.

**The half this does not reach, and cannot.** The second experiment — props that
fail the declared schema — is not closed and is not closeable this way. Checking
props needs the *schemas*, and a policy is a Zod-parsed, fingerprinted,
serialisable value that can hold names and not functions. A catalogue-shaped
vocabulary (prop names and which are required) would catch a missing required
prop and an invented key, and would still not catch 200 characters against a
maximum of 160 — and building it means the second, shallower schema language
`catalogue.ts` deliberately refused to maintain. Left open, filed, and named
here so the next run does not rediscover the wall.

## Alternatives considered

**A `validator` seam on `CompositionRuntime`, which is what the finding
proposed.** An optional `ChangeValidator` beside `repairer`, and a sixth
`CompositionOutcome` kind for what it refuses. Rejected on two counts. It
reaches the props half — genuinely more than this does — but a sixth outcome
kind breaks every exhaustive `switch` and every `Record<CompositionOutcomeKind,
…>` in four surfaces at once, and there are several; the merge gate is now four
surfaces wide and that is a change to make deliberately, not on the way past.
And a validator's refusal would not reach the repairer, because `RepairRequest`
carries a `Disposition` and a validation failure has none — widening that type
breaks every repairer a host has written. Losing the repair was the larger of
the two losses. The seam remains the right shape *if* the props half is worth
its cost, and this record does not close that door.

**A ninth rung on the Gate's ladder**, as `redirected-submission` and
`repointed-binding` have, so the refusal never depends on the origin's ceiling.
Unnecessary: `critical` is already at the default refusal floor, so a rung would
only change behaviour for a host that had *lowered* its floor — and a host that
did that has said, in the one place the runtime asks, that this much damage is
somebody's to approve. It would also add a `DispositionReasonCode`, which is a
third and fourth exhaustive map in two more lanes for no behaviour.

**`high` plus a never-auto-apply rule**, holding the change for a person rather
than refusing it, on the grounds that a rollback makes an unknown type
legitimate. Rejected once the measurement was settled: what a change
*introduces* is the only thing counted, so the rollback case is not the ordinary
edit — it is the undo, and holding an undo for a person who can only answer
*yes, serve the hole* or *no* is worse feedback than refusing it and saying
which primitive is missing. A host that wants the hold anyway has the
composition 0002 asks for: leave the type in the declared list.

**Collecting `analyzeDelta`'s two vocabularies into one record**, which is the
shape `StakeInput` argues for and the shape this change was first written in.
Rejected by a failing test rather than by reasoning: `analyzeDelta` is published
and lesson 22 calls it by hand with a predicate, so the record turned a lesson's
worked example into `TypeError: isInteractive is not a function` — and would
have done the same to every host that calls it. A published signature is not
tidied on the way past. The pair is kept honest instead by `assessChange` being
the only caller that reads a policy, and passing both in one expression.

**Deriving the vocabulary inside the runtime from a registry**, rather than
taking a list on the policy. It would mean nobody could forget it. It would also
put an SDK import in the Gate's inputs, make the vocabulary un-fingerprintable,
and take away the deployment's ability to decline the check — all three of which
0064 had already decided the other way for the same kind of fact.
