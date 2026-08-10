# 0040. A failure names the actor who must clear it

**Status:** Accepted
**Date:** 2026-08-06
**Section:** §2 → §5

## Context

0005 put model access behind a narrow adapter and gave the seam three failure
codes: `unavailable`, `refused`, `incomplete`. `unavailable` carried a documented
meaning — "ask again later" — and `anthropicModelClient` put **every** thrown SDK
error into it:

```ts
} catch (cause) {
  return err({ code: "unavailable", detail: errorDetail(cause) })
}
```

The SDK throws on a 400 as readily as on a 529. So a request Loom assembled
badly — a schema the API rejects, a model id that does not exist, a prompt past
the size ceiling — was reported to everything downstream as a transient outage.
That is not an imprecision, it is a false statement about the future: a 529 will
plausibly succeed on the next attempt and a 400 will never succeed until
something changes, and the runtime told its host the two were the same event.

Day 35 found this while making the live smoke test skip on a provider outage.
The test could not ask the seam whether the API had declined to answer, because
the seam did not know; it had to match `/^(429|5\d\d)\b/` against the vendor's
error *message*, which is a string the vendor may reword at any time. A test
parsing prose to recover a fact the type system threw away is the clearest
evidence available that the type was wrong.

There is a third case the two-way split still misses. A deployment with no key,
a revoked key, or an account that cannot pay is not having an outage and did not
send a bad request: it cannot reach a model at all, and no amount of waiting or
re-authoring changes that. The portal already had this failure and already
misreported it — its keyless interpreter returned `interpreter-unavailable`,
telling a reviewer to try again at something that would never work.

## Decision

**A failure names the actor who would have to do something for the next attempt
to go differently.** Not what went wrong, and not whether to retry — who must
act. That is the fact every consumer actually wants, and the only one the seam
is in a position to know.

`ModelClientError` gains two codes beside the existing three:

| Code | Actor | What it means |
| --- | --- | --- |
| `unavailable` | nobody | The service could not answer now. The same request may work later. |
| `rejected` | Loom | The service refused the request itself. Repeating it unchanged fails identically. |
| `misconfigured` | an operator | This deployment may not talk to this model: credentials, entitlement, billing. |
| `refused` | the asker | The model would not answer this content. |
| `incomplete` | nobody | The answer was cut off; the reply is malformed rather than missing. |

`InterpretationError` gains the two that correspond — `interpreter-request-rejected`
and `interpreter-misconfigured` — and the seam exports one total function,
`interpretationFault`, mapping all seven codes onto five actors: `asker`,
`model`, `provider`, `deployment`, `runtime`. A reader switches on the actor and
cannot get the grouping wrong; a new code obliges its author to classify it and
obliges nobody else to change.

**The adapter classifies by HTTP status, and only where it is sure.** 401, 402
and 403 are `misconfigured`; a 4xx that is not 408, 409 or 429 is `rejected`;
everything else — 5xx, the "later" 4xx statuses, a transport failure that never
got a response, a status we do not recognise, a status that is not a number — is
`unavailable`. The asymmetry is deliberate: `unavailable` is the answer that
claims least, so it is the one an unknown falls back to. Guessing "retryable"
for something permanent costs one wasted attempt; guessing "permanent" for
something transient tells a host to abandon work that would have succeeded.

**The seam does not export a `retryable` boolean.** Retrying is policy — a host
may reasonably resample a `malformed-proposal` and refuse to resample anything
else — and an answer to "should you retry" would be the seam deciding that on
the host's behalf while knowing less than the host does. Naming the actor gives
a host everything it needs to decide, and commits Loom to nothing it cannot
know.

## Consequences

- **`describeWriteOutcome` reads differently for an uninterpreted write.** It was
  `not interpreted: ${detail}` for all causes; it is now a sentence per code that
  says what happens if nothing changes. A reviewer sees "this deployment cannot
  reach a model until an operator changes that" instead of a vendor message.
- **The portal's keyless interpreter stops lying.** It reports
  `interpreter-misconfigured`, so an unconfigured deployment reads as
  unconfigured rather than as a service having a bad day.
- **The live smoke test reads a code rather than a regular expression.** It skips
  when, and only when, `interpretationFault` says `provider`. A key that is
  present and refused now fails the build instead of skipping quietly, which is
  the outcome that should have been loud all along.
- **Telemetry needs no migration.** `TelemetryFailure.code` is a string, so the
  new codes flow into the journal as they are. Episodes recorded before today
  keep `interpreter-unavailable` on failures that were really rejections; that
  history is not rewritten, and a reader comparing rates across the boundary
  should know the split starts here.
- **The repair loop is unchanged.** It never sees these: an interpretation that
  fails returns `not-interpreted` before anything reaches the Gate. What changes
  is that a host reading the event stream can now tell an outage from a defect
  in what Loom sent, which is the distinction the loop's own retry policy would
  need if it ever grows one.
- **The classification depends on the SDK putting `status` on what it throws.**
  Read structurally, never with `instanceof`, because the SDK is an optional
  peer. A live test asserts a rejected key comes back `misconfigured`, so the
  assumption is checked against the real API rather than only against fixtures
  shaped by the same belief.

## Alternatives considered

**Leave it, and let hosts parse the detail.** This is what day 35's smoke test
did, and doing it once was enough to show why not: it puts a vendor's prose in a
load-bearing position, it re-derives the same fact in every consumer, and it
gets silently wrong the day the message changes. A fact the adapter has at hand
should not be reconstructed downstream from a sentence.

**One `rejected` code, no `misconfigured`.** Simpler, and it would have fixed the
defect as stated. Rejected because the two demand different people: a rejection
is a bug report for whoever maintains Loom, a misconfiguration is a task for
whoever runs this deployment. Collapsing them would leave the portal's keyless
case still telling a reviewer to try again, which is the most common instance of
this failure in practice and the one a §5 reader actually meets.

**Classify by the API's `type` field (`invalid_request_error`,
`authentication_error`, …) rather than by status.** More precise where present —
it separates `billing_error` from `permission_error`, both 403 — but it is a
vendor-specific vocabulary in a module whose job is to translate *out* of vendor
vocabulary, and it is absent on transport failures. Status is the coarser signal
and the one every HTTP provider has, so the mapping stays on status and the
vendor's own words survive in `detail` where an operator can still read them.

**A `retryable: boolean` on the error.** The most convenient thing for a caller
and the least honest thing for the seam: it is true of `unavailable`, false of
`rejected` and `misconfigured`, and genuinely arguable for `malformed-proposal`,
where a resample of an identical request may well produce a usable answer. A
seam that has to guess on one of five cases should describe rather than
prescribe. See the Decision above.

**A separate `isRetryable` helper beside `interpretationFault`.** Same objection,
one indirection further away. A host that wants it writes
`interpretationFault(error) === "provider"` and owns the policy that phrase
encodes.
