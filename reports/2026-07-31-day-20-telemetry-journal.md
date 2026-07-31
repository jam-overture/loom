# 2026-07-31 (day 20) — the telemetry journal

**Build order section:** §6 — the telemetry pipeline. First unit.

**Branch:** `day-20-telemetry-journal`, off `main` at `7f40afd`

---

## Where this run started

No open PR and no review comments waiting: #21 through #25 are all merged, and
the only comment on #24 was mine explaining that its red Vercel check was an
environment-variable problem rather than a code one. So this run picked up the
next incomplete unit in the build order.

§1 through §5 are functional end to end — a tree, a delta, a Gate, a renderer, a
registry and CLI, and a portal writing through one server-side path into
Postgres. §6 is next, and it is the one section the build order says to start
*early*: "capture ProposedChange + Provenance + Disposition + outcome from day
one, even before v2 consumes it."

Day 13 left the seam open and named it. `lib/write.ts` said so in a comment:

> The event sink is a no-op, which is the honest state of §6 … The provenance of
> applied changes is not lost by this — it is in the store's log — but the
> refusals and the discards are, and that is exactly what the telemetry pipeline
> is for.

That is now false, which was the point of this run.

---

## What was built

**A durable journal for what the runtime narrates**, and a fold that turns it
back into the question anyone actually asks: *what happened to that change?*

Five pieces, in `src/telemetry`:

- **`event.ts`** — the narrowing. A `RuntimeEvent` becomes a `TelemetryRecord`
  through one total function, with Zod schemas for everything it produces.
- **`journal.ts`** — the `TelemetryJournal` contract: record a batch, read a
  keyset page.
- **`sink.ts`** — `collectTelemetry`, the `EventSink` that buffers in the request
  and writes once.
- **`memory.ts` / `postgres.ts`** — two implementations, checked against one
  suite.
- **`episode.ts`** — `episodesOf`, a pure fold from records to episodes.

And the portal now uses it: a write is *begun* rather than referenced, so each
request gets its own sink and flushes it before returning.

---

## The three rules that decide what is stored

This was the decision worth taking care over, because records are written
continuously and read months later — a shape chosen now is one every future
analysis lives with, and the ones already written cannot be re-derived.

**A proposal is kept whole, delta included.** For a change that was refused, or
held and then discarded, this journal is the only record it ever existed: the
revision log by construction holds only what was applied. Dropping the delta
would leave §6 able to say *that* something was refused but not *what*.

**Anything the log already holds is dropped.** An applied change's inverse delta
is in `loom_revisions`, attached to the revision the record names. Two copies of
one delta are two things that can disagree, silently, because nothing would be
comparing them.

**The utterance is not kept.** `Provenance` has carried `promptHash` rather than
the prompt since §2, with a comment saying provenance carries no user content.
Telemetry is the same data with longer retention and a wider audience, so an
`intent-received` record keeps origin, scope, base revision and the *length* of
what was said — not the text. A test asserts the utterance does not appear in the
serialised record.

What the narrowing may *not* do is change membership. A stage the runtime
narrates but telemetry silently discarded is a stage nobody could prove ran, so
all 17 event types survive, and the exhaustiveness guard makes adding an event a
compile error in `event.ts` rather than an event that quietly never lands. There
is a test that walks every variant and checks both halves of that: the type is
preserved, and the record parses back from JSON.

Recorded as **0023**.

---

## Emission does no IO

`EventSink.emit` has promised since §2 that a sink cannot fail a change the Gate
accepted. That was free while the only sinks were a no-op and a test collector.
A database makes it a real constraint, and there were three ways to go.

Awaiting the write inside `emit` breaks the promise outright. Firing it
un-awaited keeps the promise and loses the records — on Vercel, work not awaited
when the response returns is cancelled, so it would work in development and
silently not work in production, which is the worst failure shape on offer.

So: **`emit` narrows and appends to a list; the host flushes once and awaits it.**
`record` takes a batch, which is also what lets an implementation make a request's
narration atomic — half a request's events are worse than none, because an
episode missing its disposition reads as a change that was proposed and never
judged.

Two failure rules, both chosen against the helpful instinct:

- **A failed batch is dropped, not retained for a retry.** A failing journal will
  fail the retry too, and a queue that grows while it drains moves the outage
  into the write path. The drop count is exposed; the records are not kept.
- **The buffer has a ceiling** (1000). A host that forgets to flush would
  otherwise leak memory into the write path for the life of the process.

An event the collector cannot narrow — one outside the union, meaning a host bug
— is counted and dropped rather than thrown. That is the §2 promise kept
literally.

Recorded as **0024**.

---

## Episodes are folded, not stored

`episodesOf` computes, per intent, what was proposed, what the Gate decided, and
what became of it. It is a derivation rather than a second table, which is the
same relationship 0016 set between the log and the snapshot and for the same
reason: a stored episode table would be a second copy of facts the journal
already holds, and the two would drift.

The shape is one episode per **intent**, not per proposal, because the things §6
exists to notice do not fit a row-per-proposal:

- an intent that was never interpreted has no proposal at all;
- a refusal repaired into an acceptable change is two proposals and an ordering
  (0006's "both halves of that story");
- a held change that was confirmed is one proposal with two dispositions — the
  Gate's second look is the one that decided.

Resolutions are `committed`, `refused`, `awaiting-answer`, `discarded`,
`not-interpreted`, `not-writable`, `failed`, or `open`.

The fold is honest about being partial: a page that opens after a proposal was
made cannot attribute that proposal's later events, so they come back as
`unattributed` rather than being dropped. A refusal rate computed over a silently
shrunk denominator is worse than no refusal rate.

The fold's tests drive the **real** write path — `commitIntent`, `confirmHeld`,
`discardHeld`, with a scripted interpreter — rather than hand-written records. A
test that assembled the records itself would be answering its own question, and
would keep passing after the pipeline stopped narrating a stage.

---

## Decisions I made that weren't specified

1. **One journal table, no derived columns.** `loom_telemetry` stores `seq`,
   `tree_id`, `occurred_at` and the event document. Event type and proposal id
   are *not* also columns: they already live in the document, and two copies of a
   fact are two things that can disagree. An index on a JSON path is available
   the day a query needs one.

2. **`seq` is a `bigserial`, and it orders by arrival rather than by
   `occurredAt`.** Two serverless instances disagree about the clock by more than
   the gap between two events in one request, so a timestamp cursor would skip or
   repeat rows.

3. **Failure codes are stored as opaque strings**, not as a mirror of §1/§2/§5's
   error unions. Adding an error code elsewhere in the codebase must not make
   records written yesterday fail to parse today.

4. **The portal shares one database handle.** `lib/database.ts` now owns the
   connection and both the store and the journal use it. Two clients would double
   this deployment's connection count against the pooler for no benefit.

5. **`beginWrite()` replaced `portalWritePath`.** The sink is the one part of a
   write path that cannot be process-wide. The store, holds and interpreter are
   still shared; only the collector is per request, and the actions await
   `finish()` before returning.

6. **`clampLimit` was extracted to `src/paging.ts`** and the store's
   `clampListingLimit` now delegates to it. Telemetry pages want different bounds
   (200 default, 1000 max — episodes span a dozen records) but the same clamping
   rule, and writing the rule twice is how two listings start behaving
   differently.

7. **A Zod schema for `Disposition`.** It had none, because until now a
   disposition never outlived the process that decided it.

8. **`ensureTelemetrySchema` was added to `db:push`**, and `docs/deployment.md`
   now lists `loom_telemetry` in the required RLS step. A new table in the
   `public` schema is exposed through PostgREST the moment it exists — the note
   there now says that explicitly, for the tables that come after this one.

---

## Decision records

| #    | Title                                                       | Status   |
| ---- | ----------------------------------------------------------- | -------- |
| 0023 | Telemetry narrows the event stream and never copies the log | Accepted |
| 0024 | Emission never does IO, and the host flushes once           | Accepted |

Nothing superseded, no `Accepted` record contradicted. **No ARCHITECTURAL
escalation** — neither the tree schema nor the delta model is touched, and no
already-built code needs migrating. Telemetry reads the runtime's existing event
stream and adds a store beside it.

---

## Test coverage / status

```
@loom/runtime   62 files, 587 tests   green   (was 57 / 533)
@loom/portal     6 files,  33 tests   green + build
```

`pnpm verify` green across the workspace, offline, with no database and no API
key required.

The 54 new runtime tests are: the journal contract (11, run twice — once against
memory, once against PGlite), Postgres specifics (4), the narrowing (12), the
collector (7), and the fold (11). Portal gains 2 for the wiring.

What the Postgres-specific tests assert beyond the shared contract: a batch lands
as one statement with contiguous sequence numbers; the schema is idempotent; a
stored record that no longer parses is **reported rather than returned**; and a
failed write comes back as a `Result` rather than a thrown error at the caller.

Nothing skipped, nothing weakened, no test disabled.

---

## Open questions for the next session

1. **Nothing reads the journal yet.** That is deliberate — §6 says capture from
   day one, before a consumer exists — but the obvious next unit is a portal view
   over `episodesOf`, and it is the first thing that would make a bad narrowing
   visible. Recommend it as the next §6 unit before anything in §7.
2. **`auditSnapshot` still has no schedule.** (Carried.) With a journal in place
   there is now somewhere for its result to go.
3. **No retention policy.** The journal only grows, and there is no compaction,
   TTL, or archival. Nothing needs one at alpha volume, and inventing a policy
   before anyone has read a record would be guessing.
4. **Auth on the portal.** (Carried from day 15, unchanged and still the largest
   gap.) An unauthenticated prompt box on a public URL is model spend for anyone
   with the link; Deployment Protection remains the stopgap.
5. **Still not exercised against real Supabase.** (Carried.) PGlite is real
   Postgres but not a pooler. `loom_telemetry` needs `db:push` re-run and RLS
   enabled on the new table before the next deploy — both are in
   `docs/deployment.md`.
6. **The compile step**, and **the schema at 3381 of a 3500 guard**. (Both
   carried, both unchanged by this run.)
7. **Node-level provenance.** (Carried from day 1.) Still unforced.
