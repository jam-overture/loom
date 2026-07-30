# 0021. A held proposal stays server-side, and an answer names its id

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

0002 gave the Gate three answers, and the interesting one is
`requires-confirmation`: the change is neither applied nor refused, it is
offered. 0019 then made the portal a review queue rather than a design tool, so
answering held changes is most of what the portal is *for*.

Nothing had said where a held proposal lives between being offered and being
answered. It cannot be nowhere: the person who answers arrives in a later
request, and `confirmChange` needs the same `ProposedChange` the Gate judged —
not a fresh interpretation of the same sentence, which would be a different
delta that the reviewer never saw.

Two places suggest themselves, and both are wrong.

**The tree's log.** It is already the durable record of everything that happened
to a tree. But 0016 makes the log the truth and a revision the count of its
entries, so an entry that advanced nothing breaks the invariant `auditSnapshot`
exists to check. A log that contains things that did not happen is not a log.

**The browser.** The obvious shape — return the proposal, post it back on
confirm — is the one a reasonable engineer reaches for, because it needs no new
storage at all. It is also precisely what 0017 rules out. A confirmation
carrying its own proposal is a client posting an authored change; the delta, the
`origin` and the self-graded `confidence` would all arrive asserted by the
caller, and re-gating them would be gating the client's word about itself.

## Decision

**A held proposal is held server-side in its own store, keyed by its
`proposalId`. Answering one names the id and nothing else.**

The contract is `HoldStore`, with four operations, and three properties that are
the actual decision:

**`release` is a take, not a read.** It removes and returns in one step. Both
answers — confirm and discard — go through it, so "a proposal is answered
exactly once" is a property of the store rather than a rule every caller has to
remember. Two reviewers racing on the same change cannot both come away holding
it.

**A hold names the revision it was judged against, and a hold whose tree has
moved is dead rather than stale.** Confirming one releases it and reports
`revision-conflict`. It cannot ever apply again — its delta names a base
revision that is now in the past — so keeping it in the queue would only produce
a row that refuses every time it is clicked.

**Confirming re-runs the Gate.** `confirmChange` re-assesses against the tree as
it stands and a policy that now refuses still refuses. A human saying yes is
permission to proceed, not permission to skip the check.

The store is separate from `TreeStore` rather than a widening of it. They have
different lifetimes — a log entry is permanent and a hold is transient by
definition — and different scopes, and a `TreeStore` implementation should not
have to grow custody of things that never became history in order to be a
conforming store.

## Consequences

- The portal's confirm and discard actions carry a `proposalId` and a `treeId`,
  and nothing else. There is no shape a client could send that would author a
  change.
- **Holds do not survive a restart** in the reference implementation, and a
  durable deployment needs a `HoldStore` alongside its `TreeStore`. This is the
  visible cost of keeping them apart, and it is the right cost: losing a held
  proposal loses an offer, not history.
- **Nothing expires a hold.** A tree that is never written to again keeps its
  holds indefinitely. Deliberately not solved here — an expiry policy is a host
  decision, and inventing one before a host has asked for it would put a clock
  in a contract that currently needs none.
- A discarded proposal leaves the runtime as a `hold-discarded` event and
  nothing else. That event is the highest-value signal §6 will have: it is the
  only record of a change the Gate was prepared to allow and a human did not
  want, which is exactly what 0007's calibration has to learn from. Until §6
  consumes events, a discard is not durably recorded anywhere.
- Custody can fail, and a failure means an offered change is simply gone. That
  is narrated (`hold-failed`) rather than returned only to the caller, because
  otherwise a change would disappear between two events that both say things
  went well.

## Alternatives considered

**Round-tripping the proposal through the client**, re-gated on the way back.
Rejected under 0017: re-gating a client-asserted proposal gates the client's
claims about its own provenance, and `origin` and `confidence` are inputs the
Gate cannot verify.

**Holding it in the log as a non-advancing entry.** Rejected against 0016: the
snapshot audit replays the log and compares, and entries that never applied make
that comparison meaningless.

**Widening `TreeStore` with hold operations**, so a deployment configures one
backing store instead of two. Tempting — it is genuinely less to wire up — and
rejected because it puts a transient concern in the contract that defines
permanence. It would also mean every `TreeStore` implementation, including ones
written for read-heavy edge deployments, has to implement custody it will never
use.

**Re-interpreting the utterance at confirmation time** rather than storing the
proposal. This removes the store entirely, and is the most wrong of the options:
the reviewer would be confirming a delta that did not exist when they read the
rationale. A review queue whose subject can change between the reading and the
clicking is not a review queue.

**Keeping a hold whose tree has moved, so it can be retried.** Rejected because
there is nothing to retry: the delta is authored against a revision that is
gone. What a user wants there is re-interpretation against the new head, which
is a new intent, not a retry of an old one.
