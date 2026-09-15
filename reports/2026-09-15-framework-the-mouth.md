# The mouth — the endpoint a browser posts to, and the four questions it was waiting on

**Routine:** `Loom daily build` · **Date:** 2026-09-15 · **Branch:** `framework-37-the-mouth`
**Section:** §4c (reader signals), §5 (the application)

## What was done

Reader signals could not be measured by any deployment, and had not been able to
since step 3 of `docs/signals.md` landed on 14 September. The buffer, the rollup,
the counters and the collector were all built, published, tested and **reachable
from nothing**: `ingestReaderSignals` was called by its own test and by no route
handler anywhere in `apps/loom`.

This branch builds the missing piece — a public endpoint at
`/api/reader-signals` — and, with it, the first end-to-end path from a browser to
a number the portal can read.

It also closes the two findings that named the gap, and files two new ones.

## Why this was the unit

**The brief is stale at the top and I did not do what it says first.** It opens
with "your next unit: the one-application migration", which outranks everything
below it. That migration **landed on 19 August 2026**, four weeks ago:
`apps/loom/app/` has all five route groups, `apps/portal`, `apps/docs` and
`apps/marketing` are retired, sign-in is middleware at the `(portal)` boundary in
`apps/loom/proxy.ts`, and `docs/routines.md` records it. Nothing is
half-migrated. I read the brief's next instruction instead — open findings owned
by this lane — and that queue had three entries pointing at one hole.

The findings, in the order they were filed:

| Filed | By | What it said |
| --- | --- | --- |
| 14 Sep | this lane | The drain has no filler. Four questions named, deliberately not answered in a hurry |
| 14 Sep | `Loom portal` | Came to start step 4, found the seam unwired. Named the three missing pieces |
| 15 Sep | `Loom portal`, on #310 | Shipped the screen anyway. "The capture half has no mouth" |

Two of the portal's three pieces turned out to already be done — `db:push` has
reached `ensureReaderSignalsSchema` and `signals:collect` has run the rollup
since `framework-35`, both after that finding was written. **Only the receiver
was missing.**

## The four questions, and what they were answered with

They are the ones this lane wrote down a day ago and did not want to answer at
the end of the run that raised them. [0161](../decisions/0161-a-public-page-writes-to-one-application-endpoint-and-is-counted-by-a-key-that-outlives-nothing.md)
is the record; the short version:

**Where it lives.** `apps/loom/app/api/reader-signals/` — outside all five route
groups, because three of them serve the pages that would post to it. The first
thing to sit at the application root, and `app/_lib/` now exists beside it for
shell code that belongs to no surface.

**Whether an unconfigured deployment refuses.** Yes — `404` until
`LOOM_SIGNAL_INTAKE=on`. Signals are off unless a host asks (0136), and until now
that was only true of the broadcaster; an endpoint ships with the application and
has no page's excuse. A value that is *neither* on nor off answers `503` naming
what was typed, rather than being read as off — a deployment that configured
something and got silence is indistinguishable here from an audience of nobody.

**Who may post.** Anybody, and the endpoint may not learn who. A published page
is public so a session check is unavailable, and 0146 forbids the alternative. A
sender is an **HMAC-SHA256 of the forwarded-for entry
`LOOM_PORTAL_TRUSTED_PROXY_HOPS` hops from the right, keyed with random bytes
minted per process and never stored.**

**How often.** 120 deliveries a minute per sender, 64 KB each. A broadcaster
flushes every five seconds, so one page view is twelve a minute and the limit is
eight tabs' worth. 64 KB is the ceiling `sendBeacon` itself imposes, which makes
it a claim about the sender rather than a number somebody liked — and it is
measured off the bytes, never off `content-length`.

### The decision I would defend hardest

**The rate-limit key is random per process rather than keyed with the session
secret**, which is what `auth/subject.ts` does for the same job.

`auth/subject.ts` keys with the secret because its subjects are **written to a
table** and must survive a restart. Nothing here is written anywhere: the counter
is a map in one process's memory, so a key only has to be stable for as long as
that map is. So the digests are meaningless to the next process, to the other
instance, and to anybody holding a heap dump of this one — and **no key exists
anywhere that could turn one back into an address.** On the endpoint 0146 is
actually about, that is worth more than the exactness it gives up.

The first answer I reached for was the **view key**, which is already on every
batch, already anonymous, and already expires with the window. It is
attacker-chosen: a sender mints their own 32 hex characters and can mint a fresh
one per delivery, so it would limit honest browsers and nobody else. Waiting a
day to answer this was worth it.

## Measured, against a real `next build`

Not a test — `pnpm --filter @loom/app start` with the build `pnpm verify`
produced, driven with `curl`. Verbatim:

```
$ curl http://127.0.0.1:3210/api/reader-signals                    # LOOM_SIGNAL_INTAKE=on
{"intake":"on","durable":false,"maxBytes":65536,"deliveries":120,"windowMs":60000,
 "subjects":0,"detail":"reader signals are being collected into memory, which a
 serverless deployment forgets; set DATABASE_URL to keep them"}

$ curl -X POST --data '<one batch>' …                              → 204

$ curl -X POST --data '[<one batch>,{"kind":"nonsense"}]' …        → 400
batch 1 is not a reader signal batch: treeId Required

$ curl -X POST --data-binary @144602-bytes.json …                  → 413
a delivery may be 65536 bytes

$ … the 121st delivery of the window                               → 429
retry-after: 53
this sender has delivered 120 batches inside the window; wait 53s
```

The 429 arrived on the **118th** delivery of that loop, not the 121st, because
the `400` and the `413` above it each spent one. That is the designed behaviour
and I had not thought to check it: a refusal that costs the sender nothing is an
endpoint that can be hammered for free.

The other two states, each from a separate `next start`:

```
# no LOOM_SIGNAL_INTAKE at all
POST → 404
GET  → {"intake":"off", …,"detail":"reader signals are not being collected;
        set LOOM_SIGNAL_INTAKE=on to collect them"}

# LOOM_SIGNAL_INTAKE=enabled
POST → 503  LOOM_SIGNAL_INTAKE is "enabled", which is neither on nor off, so no
            batch is being kept. Set it to "on" or remove it.
GET  → {"intake":"unusable", …}
```

**There is no screenshot, and the reason is worth saying rather than leaving as
an omission.** The unit has no page. I took one — the `GET` status rendered in
Chromium at 1280×900 through `pnpm shoot` — and deleted it: it was two lines of
JSON on a field of white, and it told a reader less than the block above. The
transcript is the visual.

## The chain, as a test rather than a claim

`app/_lib/reader-signals/chain.test.ts` is the one I would keep if I could keep
only one. Every link in this subsystem passed its own tests for a day while the
chain did not exist, so "each piece is tested" is exactly the evidence that was
true the whole time it was broken.

It posts what a page sends, through the endpoint, into the buffer, through
`collectReaderSignals`, and reads the tally out the far end:

- two batches about `n_hero` at revision 4, 8,200 ms and 3,100 ms of dwell
- collected at 30 s → `nothing-ripe`, and the store is still empty (0158: a batch
  is counted once it has been held for the window, not before)
- collected at 120 s → `counted 2 batches`, `views: 1`, `dwellMs: 11300`
- and the buffer is empty afterwards, because counting and forgetting are one
  operation

It caught its own first version: the fake clock returned a number, `Date.parse`
read `30000` as **the year 30000**, and everything was ripe immediately. A green
test that proved nothing. The clock now reads ISO like every other clock in this
runtime, and the comment beside it says why.

## Decisions taken that were not specified

- **`deliverReaderSignals` is published, and from the broadcaster's entry point
  rather than one of its own.** The broadcaster takes a `send` and does not care
  what it does, which is right (0042) and leaves every host writing the same
  fifteen lines of beacon code — the two `send` implementations in this
  repository both *draw* the batch rather than posting it. It was built with a
  `@loom/runtime/signals/deliver` entry point first and then moved: the module
  imports nothing at runtime, so a door of its own bought no bytes and cost a row
  in the documentation's entry-point rail and a generated API page, which is
  another lane's file changed from this one. **An export that earns a door earns
  it in bundle size.**
- **The limits are not configurable.** One switch, no `LOOM_SIGNAL_MAX_BYTES`. A
  deployment needing different numbers is a finding and a decision, not a
  variable set in a hurry on the afternoon the table starts growing.
- **A bounded read rather than trusting `content-length`.** The header is a
  number the caller wrote and these callers are strangers. Reading the stream to
  the ceiling and one byte past it is cheaper to reason about and impossible to
  lie to. The alternative — refusing a delivery with no `content-length` — is one
  line and breaks mysteriously behind a proxy that re-chunks.
- **A `GET` that reports the endpoint's own state.** Off, misconfigured, and *on
  but keeping batches in memory* all present to the portal as no numbers, and the
  failure being closed here was exactly that this was invisible from outside.
- **The gate carries its own policy.** The first version had the policy on the
  settings and the gate built from it, and a test caught them disagreeing — the
  handler read one and the gate counted by the other. A door has one policy.
- **The memory journal stays a supported state**, matching the store, the
  telemetry journal and the attempt log. What is refused is leaving it unsaid: on
  serverless it means `signals:collect` reads a database no instance wrote to, so
  `durable` is reported rather than implied.

## Records

- **Added:** [0161 — A public page writes to one application endpoint, and is
  counted by a key that outlives nothing](../decisions/0161-a-public-page-writes-to-one-application-endpoint-and-is-counted-by-a-key-that-outlives-nothing.md),
  `Accepted`. Nothing superseded. Index regenerated.

## Findings

**Closed — two, both this lane's to close:**

- *the buffer has a drain and no filler* (14 Sep, this lane's own). All four
  questions answered and built.
- *step 3 of the signal plan is on `main`, nothing in the deployment calls any of
  it* (14 Sep, `Loom portal`). Piece 1 built; pieces 2 and 3 were already done
  before the finding was written.

**Not closed, because it is not on `main`:** the 15 September finding on #310
(*the capture half has no mouth*) says the same thing and lives on the portal's
branch. It is answered by this branch and whichever merges second should close
it.

**Filed — two:**

1. **The door is open and nobody is speaking through it.** No page on this
   deployment renders `addressed: true` or starts a broadcaster, so the endpoint
   is open and receiving nothing. Two calls per surface, both in the surface's
   hands (0136), and `deliverReaderSignals` makes the second of them one line.
   Owned by `Loom demo`, `Loom marketing`, `Loom docs`, `Loom lessons`. **This is
   the last thing between the portal's reader screen and a number on it.** It is
   safe to land at any time: nothing is switched on until the maintainer sets the
   variable.
2. **Reading a forwarded-for header is a fact about the deployment, and it lives
   in the portal's sign-in code.** `clientAddress` and `resolveTrustedHops` are
   imported from `(portal)/_lib/auth/subject.ts` rather than copied — counting
   from the right is subtle and already tested, and a copy reading the leftmost
   entry would hand every caller a bucket they choose themselves. Nothing is
   blocked. Not moved here because the module, the `LOOM_PORTAL_…` variable name
   and the `.env.example` entry move together, and a live deployment's
   configuration feels the rename.

## Cross-lane diffs, named

Two files outside `src/` and the application shell were touched, both under the
rule that a new export in `src/` must not leave a generated file stale:

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — regenerated with
  `pnpm build && pnpm --filter @loom/app docs:api`, in that order. 16 entry
  points, 1,057 exports.
- `decisions/README.md` — regenerated with `pnpm decisions:index`.

Nothing hand-written in `(docs)` was edited. The entry-point rail was the reason
the separate `signals/deliver` door was dropped rather than added.

## Verification

`pnpm install && pnpm verify` — **green, exit 0.**

| | Files | Tests |
| --- | --- | --- |
| Runtime (`src/`) | 152 | 2,649 |
| Application (`apps/loom`) | 256 | 4,416 |

638 findings, 0 malformed. 102 prerendered pages, 828 text junctions, 0 run
together.

**70 tests are new, across 7 new test files** — 29 in `src/signals/`
(`intake.test.ts` 21, `deliver.test.ts` 8) and 41 in
`app/_lib/reader-signals/` (`receive.test.ts` 21, `settings.test.ts` 8,
`subject.test.ts` 6, `route.test.ts` 4, `chain.test.ts` 2). Nothing failed in the
final run, nothing was skipped, and **no existing test was changed or
weakened** — this branch adds files and edits none of the repository's existing
tests.

It was red twice before it was green, both mine and both in test files written
after the last `tsc`: a `vi.fn()` whose call tuple typed as empty, and a
`treeId` string handed to a branded parameter. Also red once on the
`signals/deliver` entry point, which failed three documentation tests that check
the exports map against the docs rail — the right failure, and the reason the
entry point is gone.

## Open questions

1. **`docs/signals.md` step 4's gate is what misled the portal lane**, and it is
   an approved plan document rather than this lane's file. It says *"do not start
   before step 3 is on `main` — there is nothing to read until then"*, which read
   as lifted when #295 merged and was not, because step 3 built modules nothing
   called. A one-line note under step 3 naming the endpoint would stop it
   happening to step 5's three lanes. I have not edited it.
2. **`LOOM_SIGNAL_INTAKE` is not set on the deployment**, and only the maintainer
   can set it. Until it is, the endpoint answers 404 to everything — which is
   correct, and means a surface can merge a broadcaster whenever it likes without
   anything being switched on by accident.
3. **The rate limit is per instance** and the record says so plainly. If reader
   signals are ever load-bearing commercially, the shared-counter question comes
   back; it is not worth a table today.
