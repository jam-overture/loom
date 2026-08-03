# 0033. The policy is resolved per change, and named on the verdict

**Status:** Accepted
**Date:** 2026-08-03
**Section:** §2 → §6

## Context

0002 made the Gate a pure function of an assessment and a `GatePolicy`, and left
open where the policy comes from. In practice it came from one field on
`CompositionRuntime`, set once when the runtime was assembled and never varied
again. Two things followed from that, and both are wrong for a framework.

**A host could not judge two changes differently.** One process serving two
tenants, two surfaces, or a staging tree beside a production one had one gate
setting for all of them. The escape was to build a second `CompositionRuntime`
per request and keep every construction site in step — which is not an
architecture, it is a convention nobody can enforce. 0031 said the interesting
adaptive behaviour belongs to the applications built on Loom; this was the hole
in that claim, because the one knob a consumer would reach for first was fixed
for the lifetime of the process.

**A disposition could not say what it was decided under.** That was tolerable
only while the answer was always the same. The moment policy can vary, a stored
verdict with no policy on it is unreproducible: a reader cannot tell whether a
change was held because it was risky or because it was judged under the strict
policy, and "would this be held today" has no answer. Every other fact about a
change — who asked, which interpreter, how sure it claimed to be, who allowed it
— is already on the record. The standard it was measured against was the one
missing.

## Decision

**`CompositionRuntime.policySource` replaces `CompositionRuntime.policy`.** A
`PolicySource` is `(context: PolicyContext) => GatePolicy`, where the context is
the tree and the intent. `fixedPolicy(policy)` is the honest spelling of what a
single-tenant host wants.

Four properties, each of which is the decision rather than a detail of it:

- **The source cannot see the proposal.** The context holds the tree and the ask,
  both of which exist before anything is interpreted, and resolution happens
  before the interpreter runs. A source that could read the proposed change could
  pick a lenient policy in answer to a change the strict one would have refused,
  and the refusal rate would look healthy while measuring nothing. Who is asking,
  and of what, chooses the standard; what comes back is then judged by it.

- **Resolution is synchronous and pure.** It sits inside the decision path. An
  implementation that awaited a lookup would make every change slower and every
  decision unreproducible — a replay cannot re-fetch what the original run
  fetched. A host whose policy lives in a database loads it before entering the
  write path and closes over it.

- **It is resolved once per intent, not once per proposal.** A repair (0006) is
  judged by the same policy as the proposal it replaces, because the entire point
  of a repair is that it is comparable to what was refused. `confirmChange`
  resolves again, deliberately: the second look is a look at things as they stand
  now, which is the rule the recomputed assessment already follows, and a host
  that tightened its policy while a proposal sat in the queue meant that for the
  queue too.

- **The verdict names the policy.** `GatePolicy.policyId` is host-declared and
  the Gate stamps it onto every `Disposition` it returns. It is stamped inside
  `gate`, not by the caller, because a caller could name a policy other than the
  one the rules consulted — and a disposition naming a policy it was not decided
  under is worse than one naming none.

The name is host-declared rather than minted or hashed, which puts a contract on
the host: **a name identifies content.** A host that changes what a policy
contains gives it a new name, because every disposition already written under the
old name claims to have been judged by what that name meant then.

Telemetry mirrors a new `policy-resolved` event — narrowing changes payloads and
never membership (0023). The runtime event carries the whole policy, because the
next stage in the request needs the values; the stored record keeps only the
name, because a policy is host configuration versioned where the host keeps it,
and copying it onto every change would store one document a million times to
answer a question the name already answers.

A `Disposition` restored from storage without a `policyId` reads as
`unattributed`, not as `default`. Those judgments were made under a policy nobody
wrote down, and naming today's default would be a guess presented as a record.

## Consequences

A host can now vary the Gate per tenant, per surface, per tree, or per origin
with one function, and every verdict says which way it went. That is the concrete
form of "consumers build their own adaptivity" — the runtime supplies the seam
and the record, and the host owns the judgment.

Every construction site of `CompositionRuntime` changed, which the compiler
found. `fixedPolicy(defaultGatePolicy)` is a one-line migration and reads as the
statement it is.

The Gate is still exactly as pure as 0002 made it: the source is called by the
pipeline, never by `gate`, which continues to see only an assessment and a
policy.

`policyId` is a name, not a fingerprint. A host that edits a policy in place
without renaming it makes every record naming it describe something that no
longer exists. The runtime cannot detect this, and says so here rather than
implying a guarantee it does not provide.

Calibration and the episode fold gain a dimension nothing yet groups by. A
segmented calibration report — "the strict policy holds twice as much and the
holds are discarded twice as often" — is now computable from public exports, and
belongs to whoever wants it.

## Alternatives considered

**Leave the policy static and let hosts build a runtime per request.** Rejected.
It works and it is what the portal already did, but it makes the varying part
invisible: nothing in the type says the policy may differ, so nothing stops two
call sites diverging, and no verdict records which one applied. The seam exists
to make the variation declared rather than incidental.

**Pass the policy as an argument to `composeChange`.** Rejected. It moves the
choice to every call site instead of one place, and `confirmHeld` would have to
carry a policy across a request boundary to answer a proposal made earlier —
which is precisely the stale judgment `confirmChange` recomputes to avoid.

**Give the source the proposal, or make it async.** Rejected, and separately, for
the reasons in the decision. Both are conveniences that cost the property the
Gate exists to have: a decision that can be explained and re-derived.

**Mint the policy id, or hash the policy's contents.** Rejected for now. A digest
would make the name identify the content by construction rather than by contract,
which is strictly stronger — but it requires a canonical serialisation of the
policy that is stable across versions of the schema, and a hash is not a name a
human can look up in their own configuration. The contract is stated instead, and
a fingerprint stored *alongside* the name remains open if drift proves real.

**Put the policy on the proposal's provenance instead of the disposition.**
Rejected: provenance is what the interpreter claims about its own output (0003),
and the policy is what the runtime judged that output against. Folding them would
let a future interpreter appear to nominate the standard it is measured by.

**Store the whole policy on every telemetry record.** Rejected: it is a static
document copied per change, and two copies of the same configuration eventually
disagree — the same reason 0023 gives for not copying the log.
