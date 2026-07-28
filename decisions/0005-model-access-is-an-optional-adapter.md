# 0005 — Model access is a narrow seam with an optional adapter

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime

## Context

The interpreter needs to call a model. Two things follow from that, and they pull
against each other.

The first is testing. The nightly suite must be deterministic, offline-capable,
and free to run: it cannot depend on the network, and it must be green with no
credentials present. That means the HTTP call has to be replaceable.

The second is what Loom is. A front-end framework whose core imports a specific
vendor's SDK has taken a position on which model authors your UI. That is a
position Loom should not take on a host's behalf.

## Decision

**A one-method seam.** `ModelClient.complete(request) -> Result<ModelCompletion,
ModelClientError>` is the entire network boundary. A request carries the model
id, ceiling, effort, system prompt, user message, and output schema; a completion
carries the reply **text** and the model that actually served it. Returning text
rather than a parsed object is deliberate: parsing, validating, and deciding what
a bad answer means all stay above the seam, where they are unit-testable.

`ModelClientError` has three variants, because they mean different things
upstream: `unavailable` ("ask again later"), `refused` ("this model will not
answer this"), and `incomplete` ("the answer was cut off"). The last maps to
`malformed-proposal`, not to a missing answer.

**The vendor adapter is opt-in.** `@anthropic-ai/sdk` is an *optional peer
dependency*, and the adapter is a separate entry point (`@loom/runtime/anthropic`)
that the package root does not re-export. A host that brings its own model never
loads it and never installs the SDK. The adapter takes the SDK's `messages`
resource structurally, so production passes the real client and tests pass a
stub.

**The default model is `claude-opus-5`, at effort `high`.** Interpretation is the
one step where being wrong is expensive: a plausible-but-wrong delta passes
through a Gate that trusts the confidence the proposer reported. Both are
configurable per interpreter, and the model that actually served the request is
recorded in provenance rather than assumed.

**Exactly one test may touch the network.** A live smoke test skips when
`ANTHROPIC_API_KEY` is absent. Everything it covers is covered offline; what it
adds is proof that the schema we hand a real model is one a real model can
satisfy, which no fixture can establish.

## Consequences

- The interpreter's logic — prompt assembly, parsing, validation, malformed
  handling, provenance — is tested with no network and no key.
- Swapping vendors is one file. Adding a second is a second entry point.
- The API key is read from `process.env` by the SDK; it is never written to a
  file in the repo, echoed into a log, or recorded in provenance. Provenance
  carries a prompt *hash*, not the prompt.
- The seam is deliberately thinner than the vendor API. Streaming, tool use,
  caching, and multi-turn conversation are all invisible to it. Any of them
  becomes a change to this contract, and gets a record.
- Splitting the entry point means the SDK's types are available at typecheck
  (as a dev dependency) while staying optional at install. A consumer who
  imports `@loom/runtime/anthropic` without installing the SDK gets a resolution
  error at build time, which is the right moment to find out.

## Alternatives considered

**Import the SDK in the core and export the adapter from the root.** Rejected:
it makes a vendor a hard dependency of every Loom consumer, and it puts a
network client in the import graph of a package whose whole point is that its
decisions are pure.

**Call the HTTP API with `fetch` and no SDK.** Rejected. It looks lighter, but it
means hand-maintaining request shapes, error taxonomies, and retry behaviour that
the vendor already maintains correctly — and the seam already delivers the
independence that motivated it.

**A richer seam that returns a parsed reply.** Rejected: it moves parsing and
malformed handling below the boundary, so testing them would require a fake that
reimplements them.

**Mock the HTTP layer (`fetch`, `nock`, or similar) instead of a seam.**
Rejected: it tests our wire format against our own assumptions about the vendor's,
and it couples every test to a transport detail.

**Record and replay real API responses (VCR-style cassettes).** Not chosen for
now. Hand-written fixtures are clearer about what each one is testing, and a
cassette recorded once tends to become the only shape anyone tests against.
Worth revisiting when the reply format stabilises and the corpus grows.

**A cheaper default model.** Not chosen. Interpretation is per intent, not per
render, and the failure mode of a weaker interpreter is a confidently wrong
delta. A host that wants to trade accuracy for cost sets `model` explicitly.
