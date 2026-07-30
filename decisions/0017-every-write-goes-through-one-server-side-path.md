# 0017. Every write goes through one server-side path

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §5

## Context

The portal needs a write path. The open question was whether a change is composed
on the server from an utterance, or composed in the browser and posted as a
finished delta.

There is a second, less obvious half to the same question. The portal will offer
**direct manipulation** as well as a prompt box — drag a node, edit text inline,
delete a card. Those gestures produce a delta with no model involved at all, so
there is an obvious temptation to let them skip the interpreter and append
directly. That is the part that actually needed deciding.

## Decision

**Composition happens on the server. `store.append` is reachable only through
`composeChange`. There is exactly one write path, and direct manipulation uses
it too.**

Three reasons, in descending order of how hard they are to argue with.

**The API key cannot go to the browser.** 0005 put model access behind a
`ModelClient` seam precisely because it is the whole network boundary.
Client-side composition means shipping `ANTHROPIC_API_KEY` to every visitor.
That alone settles it.

**A gate that runs on the client is not a gate.** 0002 made the Gate a pure
function of stakes and reversibility, and purity is what makes it testable — but
it is also what makes it trivially removable if it runs where the caller controls
the code. A refusal the client is free to skip is a suggestion. Same for
provenance: `origin` feeds how much latitude a change gets, and a client-asserted
origin is unfalsifiable. 0007 already trusts self-graded `confidence` on purpose;
letting the browser assert the origin *and* the confidence would compound a
deliberate risk into a careless one.

**A second write path becomes the only write path.** If direct manipulation can
append without a Gate, then every change that is inconvenient to gate will be
expressed as direct manipulation. The runtime's central claim — that every change
is inspectable, attributable and reversible — survives exactly as long as there is
no way around it.

So direct manipulation enters as an `EditIntent` whose delta is already known.
Its `origin` is **`developer`**, not `user-instruction`: the enum's real axis is
*how the delta was authored*, and a gesture is a human authoring a delta directly
with no interpretation in between. That is strictly more trustworthy than a
sentence a model had to interpret, and the Gate should be able to see the
difference. `user-instruction` stays for the prompt box, where interpretation —
and therefore the possibility of misinterpretation — is involved.

## Consequences

- The portal's client is a view and an input surface. It posts an utterance or a
  gesture; it never posts an authored history.
- **This costs almost nothing in feel, because of 0016.** The client can apply a
  change optimistically and reconcile against the response: a stale write is
  refused with `revision-conflict {expected, found}`, which names the head the
  client did not have, so recovery is re-interpreting against it rather than
  guessing. Optimistic latency without client authority.
- Every write is one round trip to a model, which is slow for a gesture that
  needed no model. Mitigated by the fact that an intent carrying its own delta
  needs no interpreter call at all — the path is shared, the model is not.
- `store.append` being unreachable except through `composeChange` is a
  convention, not a type-level guarantee: `TreeStore` is a public interface and a
  host can call it. Enforced in the portal by keeping the store instance out of
  every module except the one route that owns the write. A stronger version —
  requiring evidence of a Gate disposition to append — was considered and is
  noted below.
- Edit-mode addressing (0010) becomes load-bearing rather than decorative: the
  gesture has to name a node, and `data-loom-node` is how the client knows which.

## Alternatives considered

**Client-side composition, server-side validation only.** Rejected on the key
alone, and it would not have survived the Gate argument either.

**A separate un-gated endpoint for direct manipulation**, on the reasoning that a
human dragging a node has already expressed exact intent, so there is nothing to
interpret and nothing to gate. Tempting and wrong for the third reason above: the
exception becomes the rule. It also confuses two things — there is nothing to
*interpret*, but there is still something to *record*, and the log is the product.

**Requiring an append to carry proof of a Gate disposition** (a signed token, or
a disposition argument `append` refuses to proceed without). This is the version
that makes the single path structural instead of conventional, and it is
genuinely better. Deferred rather than rejected: it changes the `TreeStore`
contract that landed hours ago, and the right time to change a contract is when a
second implementation exists to check the change against. Worth revisiting before
any deployment where the store is reachable from more than one service.

**Origin `user-instruction` for direct manipulation.** Rejected because it erases
the distinction the Gate most wants: whether a model interpreted anything. Two
changes that differ in whether interpretation could have gone wrong should not
arrive looking identical.
