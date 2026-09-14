# Reader signals — the approved plan

**Status: approved by the maintainer, 13 September 2026.** This supersedes the
*Maintainer direction — do not start these* section of
[`reports/2026-09-12-reader-signals.md`](../reports/2026-09-12-reader-signals.md),
which deferred capture, storage, aggregation and interpretation. **That deferral
is lifted.** Work in this document is approved and may be started by the lane
that owns it.

Written by the framework routine at the maintainer's instruction, in an
interactive session on 13 September — the same route by which
[`routines.md`](routines.md) came to exist, since a routine cannot write the
governance it is bound by on its own initiative.

## Why this matters more than it looks

Loom exists so a page can change from how people actually use it. **A model that
cannot hear what readers did cannot adapt well** — it can only restate the tree
back at itself. Signals are the input half of the entire premise, and until now
the framework could speak them and nothing could hear them.

The commercial half follows from the same fact: a deployment that can see, app by
app, which bands readers reach and which asks they answer has a reason to open
the portal every day.

## What is already built

| | |
| --- | --- |
| Four closed kinds | `viewed`, `dwelled`, `activated`, `disclosed` |
| Identity | node id + primitive type, filed under the batch's tree and revision |
| Content | **none** — no text, no URLs, no typed values, nothing about the reader |
| Configuration | the host's argument, never a prop in the tree |
| Default | off; an unaddressed render is byte-identical |
| Browser cost | **4.8 KB**, guarded by `src/signals/browser-weight.test.ts` |

Decision [0136](../decisions/0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md).
The guide is */docs/the-runtime/what-your-readers-do*.
`prototypes/ski-apparel` is a working end-to-end example, including the rail.

## The rules this is built under

These are settled. A change to any of them is a decision record, not a judgement
call inside a pull request.

1. **A signal stays anonymous and node-shaped.** No visitor id, no device id, no
   fingerprint, no cross-page stitching, no replay, no cursor coordinates
   ([0146](../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
2. **A funnel is correlated inside one page view** — an opaque random `view` key
   that never leaves the aggregation step, never persists, and is never derived
   from anything about the reader (0146). This is what makes conversion
   answerable without making a reader identifiable.
3. **Measurement is never a prop in the tree.** A proposal must not be able to
   switch reader measurement on by writing a delta (0136). This rules out a
   "tracking component" a page could drop in, and it is deliberate.
4. **Performance is not traded for measurement.** The broadcaster's import graph
   reaches no package; `browser-weight.test.ts` fails if one creeps back in. The
   ledger is linear, not quadratic — it was quadratic once, and a 6,000-node page
   took 314 ms. Anything added stays behind both.
5. **Aggregates are the durable artefact.** Raw batches are a short-lived buffer,
   rolled up and expired. Retention is per-deployment configuration with a short
   default, never a constant (0146).
6. **The vocabulary stays closed.** Four kinds, plus `completed` as the one
   approved addition below. A sixth is a record.

## The plan, in order

Each step is a lane's to build. Later steps depend on earlier ones being on
`main`; do not start one whose input does not exist yet.

### 1. The broadcaster stops going blind · `Loom daily build` · **approved, first**

`broadcastReaderSignals` finds addressed elements once, when it is called
(`src/signals/broadcast.ts:296`), and never looks again. Anything rendered
afterwards is invisible to `viewed` and `dwelled`: a band behind a Suspense
boundary, a region a client component mounts, a list that grows — **and every
band the Gate just changed.**

That last one is the whole product. *Before versus after a change* is the
measurement that justifies Loom existing, and it is exactly the measurement
that does not work. Client-side navigation is the sharpest case: a broadcaster
left on the old root reports nothing more, and nothing says so.

**Done looks like:** a `MutationObserver` on the root for added and removed
addressed elements — the broadcaster already runs one for disclosures at
`broadcast.ts:336` — and a sentence in the module documentation that a new root
or revision is a new broadcast. Closes the open finding of 12 September.

### 2. `completed`, the kind that closes a funnel · `Loom daily build` · **approved**

The existing four measure attention. None of them says a reader *finished*
anything, so the portal could show engagement and never conversion.

`completed` fires when a form inside an addressed node submits successfully. It
is observable from the root the way clicks already are (`broadcast.ts:378`
delegates `click`), it carries no more than the other four — a node id, its type,
an instant — and it is the difference between "they looked at the pricing band"
and "they bought".

**Not approved:** `hovered`. It is absent on touch, fires constantly, and is the
one addition that genuinely threatens rule 4. If it is ever wanted it should be
*hovered with intent* — dwell-thresholded — and it needs its own argument.

### 3. Ingestion, storage and rollup · `Loom daily build` · **approved, after 1 and 2**

**Reuse the telemetry subsystem's shape; do not build a parallel one.**
`src/telemetry/` already has a journal, a sink, memory and Postgres
implementations, a contract suite and `retention.ts`. Signals get the same
treatment: an ingestion function that parses with `parseReaderSignalBatch`, a
store interface with two implementations and one contract suite, and rollup to
per-node-per-revision counters.

The `view` key of 0146 is minted here-ward — in the broadcaster, carried on the
batch, consumed by rollup, dropped with the raw window.

**Also here:** the fold. `prototypes/ski-apparel/readings.mjs` is already a pure,
browser-safe aggregation of batches into dwell, reached, jumps and opened. It
becomes a framework module so that the portal's view and any demo rail are the
same arithmetic rendered twice rather than two implementations that drift.
(`prototypes/` belongs to no lane and is not edited — the module is written in
`src/`, taking the prototype as the reference.)

### 4. The portal view · `Loom portal` · **approved, after 3**

App by app: which bands readers reach, how long they stay, which asks they open,
which they complete, and the funnel pairs the deployment named. Before and after
a change, because step 1 makes that honest.

**Do not start before step 3 is on `main`** — there is nothing to read until
then, and a screen built against an imagined shape is a screen rebuilt.

### 5. Docs, lessons, marketing · their lanes · **approved, after 3**

The guide exists for broadcasting and will need the capture half. Lessons and
marketing follow the same rule: **after the shape settles, not during.** Writing
them while step 3 is in flight means writing them twice.

## Still not in scope

- **Signal-to-intent derivation** — a signal automatically becoming a
  `system-signal` proposal. The runtime has gated `system-signal` since §2 and
  the wiring is deliberately still open. It is the next question after this
  plan, not part of it.
- **Anything in rule 1's list.** Identity is not a later phase; it is refused.
- **A tracking primitive.** See rule 3.

## Under consideration, not approved

**Longer retention as something a deployment pays for.** The maintainer's
intent, and the reason rule 5 makes the window configuration rather than a
constant: selling a longer window should be a number per deployment, not a
migration on live data. No pricing, no tiers and no billing work is approved —
only that the design must not foreclose it.
