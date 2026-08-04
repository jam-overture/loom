# 0034. A sign-in that cannot be counted is refused

**Status:** Accepted
**Date:** 2026-08-03
**Section:** §5

## Context

0027 shipped identity with the gap named in its own consequences:

> **There is no rate limit on sign-in.** The key is long and compared in constant
> time, but nothing slows down an attacker guessing.

Three runs later it was still open, and it is the last unclosed item in the
record that made this portal safe to leave on a public URL with a model key
behind it.

The keys are 24 characters and the comparison leaks nothing, so this is not
about making a search infeasible — it already is. It is about the two things an
unlimited endpoint costs regardless: the deployment pays for every guess, and a
key that leaks somewhere else can be confirmed here at any rate the attacker
likes.

Four questions had to be answered together, because the answer to each one
changes what the others can be:

1. Who is an attempt counted against, when the only thing the caller has
   presented is a key that was wrong?
2. What happens when the thing that remembers cannot answer?
3. Where does the count live, given that a serverless deployment has many
   processes and no shared memory?
4. What stops a caller who can change whatever answer question 1 depends on?

## Decision

**An attempt that cannot be counted is refused. Attempts are counted per caller,
by a keyed digest of the address a trusted proxy observed, and there is no cap
that any anonymous caller can use to lock a reviewer out.**

### Refused, not allowed

`AttemptLog` is fallible at every operation, and `attemptSignIn` turns a failure
into `unavailable` — nobody signs in — rather than proceeding uncounted.

This is 0027's argument applied one layer down. That record made absent identity
configuration fail closed because "a portal that quietly degrades to open access
looks exactly like a portal that is working correctly". A throttle that stops
counting when its store is unreachable degrades to exactly that: an endpoint
that accepts unlimited guesses and renders a perfectly normal sign-in form while
doing it.

The cost is real and is not hidden: a deployment whose database is configured but
whose `loom_signin_attempts` table was never created admits nobody until
`db:push` is run. The sign-in page says so and names the fix, in the same spirit
as the message that names a missing environment variable.

The one failure that does not refuse is `forgive`. The key was right and the
caller is on the roster; a row that could not be deleted expires on its own, and
turning a housekeeping error into a lockout would be strictness with no
security in it.

### Counted before the key is compared

The order is: ask the log, then compare, then record. A locked-out caller never
reaches the comparison.

Checking afterwards would leave the roster answering the question the caller came
to ask, and cost them only time. The lockout has to take away the oracle, not
just the throughput.

Costs: a valid key presented during a lockout is refused, and a shared address
means shared consequences. Both are the throttle working. The escalation is
calibrated so that the reviewer who caused it waits a minute, not an afternoon.

### The subject is a keyed digest, not an address

The throttle needs to recognise a caller it has seen before. It does not need to
know where they are, and a table of addresses beside a public form is a visitor
log nobody asked this portal to keep.

So what is stored is `HMAC-SHA256(address, session secret)`. Keyed, not hashed:
the IPv4 space is four bytes, so an unkeyed digest of an address is a reversible
encoding of it.

Rotating the session secret therefore clears every lockout as well as every
session. That is the correct pairing — rotation is the "start again" lever, and
half of one would be a surprise.

### The address is read from the right, by a configured hop count

A forwarded-for list is appended to by each hop, so the entries on the left are
the ones a caller could have invented. `LOOM_PORTAL_TRUSTED_PROXY_HOPS` (default
1, correct on Vercel) says how far from the right to read.

A list shorter than the configured hop count yields no address at all, and
attempts with no establishable address are counted together in one bucket. That
is stricter than counting them separately, which is the direction to be wrong in;
on a host that always sets the header the bucket is empty, and on `pnpm dev` it
is one person.

### No global cap

An attacker who rotates addresses evades this throttle. The obvious answer — a
deployment-wide ceiling on failures per hour — is rejected, and the reason is
worth having on the record.

A global cap has to be checked before the key is compared, or it does not limit
anything. That makes it a lockout of **every** reviewer that **any** anonymous
caller can trigger, for the price of a loop. Trading "an attacker who can rotate
addresses gets more guesses at a 24-character key" for "anyone at all can lock
the roster out of their own portal" is a bad trade, and the second failure is
much easier to cause than the first.

What closes that gap properly is a layer that sees the request before the
application does — Vercel's Deployment Protection, a WAF — which is where
address-rotation defence belongs and is not something this portal can implement
from inside the request it is trying to refuse.

### The table is the portal's, not the runtime's

`loom_signin_attempts`, its DDL and its Drizzle schema live in `apps/portal`,
beside the roster they defend.

The runtime takes an actor on an intent and never asks how a host established
one. A `loom_signin_attempts` table shipped from `@loom/runtime` would be the
framework asserting that its consumers authenticate people, and 0018 spent a
record establishing that the portal is a consumer that gets no privileges the
framework does not give everyone. This is the first table the portal owns, and
that is the shape a consumer is supposed to have.

## Consequences

- **A missed `db:push` after this deploys is a full sign-in outage** on any
  deployment with a database, until the table exists. Documented, recoverable in
  one command, and the direct price of failing closed.
- **Without `DATABASE_URL` the throttle counts per instance.** On one process it
  is a real throttle; on serverless a caller is counted once per warm instance
  rather than once. Not a state to run a public portal in — and neither is a
  portal with no durable store for its trees, so the two failure modes arrive
  together and are already documented as one.
- **A shared address is a shared count.** Two reviewers behind one office NAT
  spend one budget. At alpha scale this is a handful of people; at any larger
  scale, the address stops being a good proxy for a caller and this record should
  be revisited rather than stretched.
- **The count restates `afterFailure` as SQL.** Atomicity demanded a single
  statement — a read-then-write lets an attacker's parallel guesses collapse into
  one increment — and the price is one rule written twice. The contract suite
  runs against both implementations so a disagreement is a failing test rather
  than a throttle that behaves differently in production than in development.
- **The table cannot outgrow the window.** A new subject's first failure sweeps
  everything already forgotten, which is exactly the request an
  address-rotating caller sends. Without it, an unauthenticated endpoint would be
  an unbounded write.
- **Nothing is emitted to telemetry.** A refused sign-in is not a runtime event
  and 0023 makes the telemetry stream a narrowing of that one; a failed sign-in
  has no tree and no proposal. An operator who wants sign-in visibility has no
  way to get it from this portal today.

## Alternatives considered

**A global cap on failures per window.** Rejected above: it hands any anonymous
caller a lockout of every reviewer.

**Counting against the key presented, rather than the caller.** Attractive
because it is exactly what an attacker varies, and it needs no address at all.
Rejected: it means storing or digesting submitted keys, and the one case where
that matters is the case where a *correct* key was submitted by an attacker —
so the table would be the one place in this system holding a derivation of a live
credential. A throttle is not worth building a credential store to run it.

**Delaying the response instead of refusing it.** Sleeping proportionally to the
failure count slows guessing without ever locking anyone out, which avoids the
whole lockout-DoS question. Rejected on the host: a serverless function billed by
duration turns every wrong guess into a small bill, so the defence funds the
attack. It is a good answer on a long-lived server and a bad one here.

**Making the throttle a runtime concern**, so that any consumer gets it. Rejected
for the reason above — the runtime does not know that its hosts have users — and
because the seam it would need (`AttemptLog`) is three operations a consumer can
write in an afternoon, which is a poor trade for the framework taking a position
on authentication.

**An identity provider with lockout built in.** Still the eventual answer, and
still rejected for the reasons 0027 gave: adopting one pulls in a lifecycle
nobody has built. `attemptSignIn` takes the log and the credential check as
arguments, so an IdP replaces both without moving a page or an action.
