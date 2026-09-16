# 0161 — A public page writes to one application endpoint, and is counted by a key that outlives nothing

**Status:** Accepted
**Date:** 2026-09-15
**Section:** §4c (reader signals), §5 (the application)

## Context

Every write in Loom until now has been made by a deployment's own server. A
proposal arrives through the portal behind a session; telemetry is narrated by
the runtime about itself; the store is written by code the deployment shipped.
The Gate, the roster and the throttle all sit on that ground, and 0018 draws the
line that keeps them there.

Reader signals break it, and they are the only thing that does. A published page
is public, so the thing that posts a batch is **a browser belonging to somebody
this deployment has never met**, and the table it posts into is the largest one a
deployment with signals switched on will own.

Step 3 of `docs/signals.md` built the receiving half and deliberately stopped at
the door. `ingestReaderSignals`, `rollUp`, `ReaderTallyStore` and
`collectReaderSignals` were published, tested, and reachable from nothing:
across the whole application the only code that mentioned reader signals
exercised the *broadcaster*. Three findings from three lanes said so — the
framework's own on 14 September naming the four questions it did not want to
answer in a hurry, the portal's the same day on finding step 4's input unwired,
and the portal's again on 15 September, after it shipped a screen that reads a
table nothing writes to.

The four questions were: **who may post**, **how often**, **where the endpoint
lives**, and **whether a deployment that never asked for signals refuses.**

## Decision

**One public endpoint at the application root, off by default, rate-limited on a
key that is meaningless outside the process holding it.**

**Where it lives.** `apps/loom/app/api/reader-signals/` — outside all five route
groups. The pages a reader reads on this deployment are in `(demo)`,
`(marketing)` and `(docs)`, so an endpoint owned by one surface would be a route
the other two post to. It is the application's, which is what one application
(0067) is for, and it is the first thing to sit at that root.

The framework publishes `DEFAULT_READER_SIGNAL_PATH` and `deliverReaderSignals`,
a `send` for the broadcaster that beacons to it, from
`@loom/runtime/signals/broadcast` — the browser entry point, rather than a door
of its own. `deliver.ts` imports nothing at runtime, so it costs the same bytes
either way, and the host starting a broadcaster in a bundle is exactly the host
who needs a `send`. **The path is a default and not
a constant the receiver shares**: a deployment may serve the endpoint anywhere,
and this is what the host with no opinion gets. It is relative, so a delivery is
same-origin by construction — a beacon cannot preflight, so a cross-origin one
carrying `application/json` is refused by the browser before it is sent, and a
deployment collecting on another origin finds that out at the seam rather than
in production.

**Whether an unconfigured deployment refuses: yes, with a 404.** Signals are off
unless a host asks (0136), and until now that was only true of the broadcaster.
An endpoint has no page's excuse — it is one URL that ships with the
application. `LOOM_SIGNAL_INTAKE=on` opens it; unset, every delivery gets a 404,
which is true and tells a stranger scanning for write endpoints nothing.

**A value that is neither on nor off is neither.** `LOOM_SIGNAL_INTAKE=enabled`
answers 503 naming what was typed. This is `resolveConnectionString`'s rule: a
deployment that configured something and got silence is the failure nobody
notices, and here it is indistinguishable from an audience of nobody.

**Who may post: anybody, and the endpoint may not learn who.** A session check is
not available and 0146 forbids the alternative. So a sender is counted by an
**HMAC-SHA256 of the forwarded-for entry `LOOM_PORTAL_TRUSTED_PROXY_HOPS` hops
from the right, keyed with random bytes minted per process and never stored.**

The key being random rather than the session secret is the part worth stating.
`auth/subject.ts` keys with the secret because its subjects are written to a
table and must survive a restart. Nothing here is written anywhere: the counter
is a map in one process's memory, so a key only has to be stable for as long as
that map is. The digests are therefore meaningless to the next process, to the
other instance, and to anybody holding a heap dump of this one, and no key
exists anywhere that could turn one back into an address.

**How often: 120 deliveries per sender per minute, 64 KB per delivery.** A
broadcaster flushes every five seconds, so one page view is twelve deliveries a
minute and the limit is eight tabs' worth. 64 KB is the ceiling `sendBeacon`
itself imposes, which makes it a statement about the sender rather than a number
somebody liked — and it is **measured off the bytes**, never off
`content-length`, because this is the one endpoint in Loom whose callers are
strangers.

**Neither limit is configurable.** A deployment needing different numbers is a
finding and a decision, not a variable set in a hurry on the afternoon the table
starts growing.

**The counter is bounded and, when full, shares one bucket.** Falling open would
be a limiter any attacker with enough addresses can switch off, which is worse
than none because the deployment believes it has one; refusing everybody takes
the site down over a crowd. Sharing a count is `SHARED_SUBJECT`'s answer to the
same question and the direction to be wrong in.

**The endpoint answers a `GET` with its own state.** Off, misconfigured, and on
but keeping batches in memory all present to the portal as no numbers, and the
failure being closed here was precisely that this was invisible from outside.

## Consequences

- A deployment can measure readers for the first time: switch the variable on,
  render `addressed: true`, start a broadcaster with `deliverReaderSignals()`,
  schedule `signals:collect`. Every piece of `docs/signals.md` step 3 is now
  reachable from a browser.
- **The rate limit is per instance**, because the counter is memory. Eight
  warm instances tolerate roughly eight times the stated rate. This is the
  caveat `attempt-log.ts` already carries for sign-ins, and the alternative is a
  database write to decide whether to allow a database write.
- A fixed window lets a caller who times deliveries across a boundary take two
  windows' worth in a moment. At 120 that is 240 and not worth a data structure.
- **No CORS.** Same-origin only, until a deployment asks for otherwise.
- `app/_lib/` now exists as the place for application-shell code that belongs to
  no route group, and it reaches `portalDatabase` from outside the portal's
  group — one handle for the process, the way `db:push` and `signals:collect`
  already do.
- Nothing on this deployment posts yet. Rendering addressed and starting a
  broadcaster is each surface's own call, which is the boundary 0136 draws, and
  those surfaces are other lanes'.

## Alternatives considered

**Keying the limit on the view key.** It is on every batch, it is already
anonymous, and it expires with the window — it looks perfect. It is
attacker-chosen: a sender mints their own 32 hex characters and can mint a fresh
one per delivery. It would limit honest browsers and nobody else.

**No per-sender limit at all — just the size ceiling and
`MAX_BATCHES_PER_DELIVERY`.** Bounds the cost of one request and not the number
of them, which is the wrong quantity when what is being protected is a table's
growth rate.

**A durable counter, in Postgres beside the sign-in attempts.** Correct across
instances and self-defeating: a row written per beacon to decide whether to
write a row per beacon. The honest per-instance caveat is cheaper than the
dishonest exactness.

**Keying with the session secret, as `auth/subject.ts` does.** Would work and
buys nothing — the counter does not outlive the process — and costs the property
that makes this endpoint defensible under 0146, that no key exists which could
reverse a digest.

**Refusing a delivery with no `content-length`.** One line, and every real
sender sets one. Rejected because a proxy that re-chunks would break the
endpoint entirely and mysteriously, and reading the stream to the ceiling and
one byte past it is both cheaper to reason about and impossible to lie to.

**Accepting for a deployment with no database, into memory, silently.** The
memory journal stays — it is right for `pnpm dev` and matches the store, the
telemetry journal and the attempt log. What is rejected is leaving it
unsaid: on serverless it means the collector reads a database no instance ever
wrote to, so the status endpoint reports `durable` rather than implying it.

**A `@loom/runtime/signals/deliver` entry point of its own.** Built first, then
dropped. It bought no bytes — the module imports nothing at runtime, so it costs
the same reached through either door — and it cost a row in the documentation's
entry-point rail and a generated API page, which is a documentation lane's file
changed from this one. An export that earns a door earns it in bundle size.

**A per-surface endpoint, or the portal's.** The portal is behind sign-in and
the readers are not. Three of the five route groups serve public pages, and the
one endpoint they share belongs to none of them.

**Building it in `framework-35`, at the end of the run that built the drain.**
The obvious thing and the wrong one — recorded here because the delay is what
produced these answers rather than the first ones that came to hand.
