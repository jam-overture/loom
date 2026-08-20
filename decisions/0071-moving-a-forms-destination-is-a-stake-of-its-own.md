# 0071. Moving a form's destination is a stake of its own

**Status:** Accepted
**Date:** 2026-08-19
**Section:** §2 → §4g

## Context

[0065](0065-a-submission-names-a-destination-and-never-carries-one.md) settled
how a form gets somewhere to post: `loom:submit` names an endpoint the
deployment registered, and the address itself never enters the tree. A model
cannot compose an address, append to one, or pass anything that reaches one. The
seam holds.

It holds against a proposal *inventing* a destination. It says nothing about a
proposal *choosing between* the ones the host already registered:

```json
{ "op": "configure", "nodeId": "n_form", "set": { "loom:submit": { "to": "contact.enquiry" } } }
```

A deployment that registered `newsletter.subscribe` and `contact.enquiry` did so
on purpose, so nothing here leaves the deployment and no address was authored.
And the next visitor who fills in that form sends their name, their email
address and whatever they typed to a different place than the page was built to
send it — without seeing that anything changed, because nothing on the page did.

The analysis reported that as `configuredPropKeys: ["loom:submit"]`: a prop
changed on an unprotected node, ranked with a heading rewrite. The framework
routine filed it against its own lane on 18 August and left it undone, because
#88 was open across the same three files.

A host could reach some of this today by listing `loom:submit` in
`protectedPropKeys`. That is the wrong instrument in three ways, and they are
worth naming because the shape of the right one falls out of them. It has to be
opted into, so the default is silence about the one prop nobody should be silent
about. It fires on any touch of the key, so a form *acquiring* a destination —
an ordinary new form — is escalated identically to one being moved. And its
sentence is `configures protected loom:submit`, which tells a reviewer a key
changed and not where anyone's data now goes.

## Decision

**A change that moves a node's `loom:submit` from one registered endpoint to
another is a stake factor of its own, `redirected-submission`, at `high`, with a
Gate rule that holds it whatever the origin's ceiling allows.**

Four parts, each doing one thing.

**It is measured between the two trees, not off the operations.** `redirection.ts`
compares the destinations declared before the delta with the ones declared after,
by node id. A delta that moves a destination and moves it back reports nothing,
because nothing moved.

**It is a redirection only where a node's identity persists across the change.**
A node that gains a declaration it did not have is a new form — an `insert` of a
form pointing at `contact.enquiry` creates an expectation rather than moving one.
A node that loses one, or whose declaration stops parsing, is a form that stops
posting: breakage the shape factors measure, and not this fact.

**It is `high`, not `critical`.** The comparison with `nested-target` is the
argument. That factor is `critical` — refused under the default floor — because
it measures a change that is wrong however it was meant. This one measures a
change that is often exactly right: a deployment splitting one mailing list into
two repoints its forms, and a refusal would mean no proposal could move a form at
all. The thing that must not happen is that it happens unnoticed.

**So the Gate holds it, in the shape [0035](0035-discarded-work-is-a-stake-and-only-the-runtime-declares-it.md)
established for discarded work.** A level cannot say "never auto-apply" while
ceilings are per origin ([0002](0002-gate-is-a-pure-function-of-two-axes.md)): a
`high` factor is a hold for a user instruction and an auto-apply for a developer,
and where a stranger's data goes should not depend on who asked for it to move.
The rule sits below the refusal floor, so a host that has declared this much
damage refusable still gets a refusal.

**No vocabulary knob.** `loom:submit` is the runtime's own key
([0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)),
and whether a destination moved does not depend on which primitives a deployment
protects. Unlike the interactive vocabulary that `nested-target` needs, this fact
is fully derivable from the tree, so it is derived rather than declared.

## Consequences

A host that registered two endpoints and a form that posts to one of them now
gets a confirmation, with both endpoint ids in the sentence, the first time
anything proposes moving it. Nothing that was accepted before is refused: the
new rule produces `requires-confirmation`, never a rejection, except where the
host's own refusal floor was already at `high`.

`DispositionReasonCode` gains a member, which is a breaking change for any
exhaustive map over it. Three existed in this repository and all three are in
this branch; a host with its own is a compile error rather than a wrong label,
which is the failure mode to want.

The endpoint ids are now in a disposition's `detail`, and dispositions are
stored, rendered and aggregated. An endpoint id is a host-authored identifier and
not a secret — 0065 keeps the *address* out of the tree, and the id is the thing
a catalogue already shows a model — so this leaks nothing the catalogue does not.

**It does not cover a form that stops posting.** A `configure` that unsets
`loom:submit`, or one that makes the declaration unparseable, leaves a form that
renders and submits nowhere. That is real and it is not this factor; it is
recorded as an open question rather than folded in, because "the destination
moved" and "the form broke" are different sentences for a reviewer and the second
one is a diagnostic the submission seam already produces at render time.

## Alternatives considered

**Leave it to `protectedPropKeys`.** The three failures above: opt-in by default,
no distinction between acquiring and moving a destination, and a sentence about a
key rather than about a destination. Rejected.

**Make it `critical` and refuse it.** Symmetrical with `nested-target` and wrong
for the reason the decision gives: moving a form is a change deployments
legitimately make, and a refusal is not a hold — it is "no proposal may ever do
this". The Gate would be enforcing that forms are immutable, which nobody
decided.

**A level with no Gate rule.** Simpler, and it would auto-apply the change for
any origin whose ceiling reaches `high`. That is precisely the case the factor
exists for.

**Treat a form that gains a destination as the same event.** It would catch more
and say less. Nobody's expectation is being moved when a form that posted nowhere
starts posting somewhere, and collapsing the two would make the sentence a
reviewer reads — "this form now posts somewhere else" — false half the time.

**Put the check in the submission seam rather than the runtime.** `src/submit/`
knows about destinations and nothing about deltas; it sees one tree at a time and
could not tell a moved destination from an original one. The comparison is a
property of a change, so it belongs where changes are analysed.
