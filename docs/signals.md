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
| Five closed kinds | `viewed`, `dwelled`, `activated`, `disclosed`, `completed` |
| Identity | node id + primitive type, filed under the batch's tree and revision |
| Content | **none** — no text, no URLs, no typed values, nothing about the reader |
| Configuration | the host's argument, never a prop in the tree |
| Default | off; an unaddressed render is byte-identical |
| Browser cost | **4.8 KB**, guarded by `src/signals/browser-weight.test.ts` |

Decision [0136](../decisions/0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md).
The guide is */docs/the-runtime/what-your-readers-do*.
`prototypes/ski-apparel` is a working end-to-end example, including the rail.

## Who owns this

**`Loom signals`**, a routine the maintainer created on 30 September 2026 to run
beside `Loom daily build` on the same schedule. Its lane is `src/signals/`, the
intake under `apps/loom/app/`, and this file.

It is pointed at one thing: **what Loom can answer about its readers, rather than
how much it collects.** The six rules below are the shape of that, and the first
place to look for new capability is what is already in a batch — a tree id and a
revision join to the registry on the server, so most "we should send more" turns
out to be "we should interpret what we have".

`src/render/` and `src/sdk/` stay `Loom daily build`'s, so an attribute on the
markup or a declaration on a primitive is a finding filed for that lane. So is
signal-to-intent derivation, which is still out of scope for everyone.

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
6. **The vocabulary stays closed.** Five kinds, `completed` having landed on
   1 October ([0211](../decisions/0211-a-completion-is-a-form-the-browser-let-go.md)).
   A sixth is a record.

## The plan, in order

Each step is a lane's to build. Later steps depend on earlier ones being on
`main`; do not start one whose input does not exist yet.

### 1. The broadcaster stops going blind · `Loom signals` · **done**

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

### 2. `completed`, the kind that closes a funnel · `Loom signals` · **done, 1 October**

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

**Done**, and three things were settled in the building that the step did not
say ([0211](../decisions/0211-a-completion-is-a-form-the-browser-let-go.md)).
A completion is a `submit` the page did not cancel, which is the whole of what a
browser can attest — so a form posted with `fetch` and cancelled reports
nothing, deliberately. The cancellation is read in a microtask after the
dispatch, because whether the broadcaster's listener runs before or after the
page's own is registration order. And the kind **carries `within`**: it is a
third `DELEGATED_READER_SIGNAL_KIND`, since the node a completion names is the
form and the band the form was the end of is the thing worth reading — the
rarest kind in the vocabulary, so 0167's volume argument does not reach it.
`ReaderTally` gains `completions`; a `FunnelPair` ending in `completed` is a
conversion rate and needed no new shape. The broadcaster grew 281 bytes
minified, 88 gzipped.

### 3. Ingestion, storage and rollup · `Loom signals` · **done**

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

### 6. What a signal means, joined on the server · `Loom signals` · **done, 1 October**

A batch names a node, a tree and a revision. The registry knows what that node
*is* — the part it plays (0114), which of its props a reader reads (0122) — and
intake and rollup hold both. So `dwelled on n_42` can be counted as *time spent
on a pricing band* with **no byte added to the payload**, no browser change, and
no new decision about what to keep.

That is the asymmetry worth exploiting: the wire stays node-shaped and anonymous,
while what can be asked of the counters grows. Which roles readers engage with
and which they skip; which parts of a page are read and which are scrolled past;
which copy a reader actually reached.

**Not this:** sending the metadata from the browser. 0167 already refused
ancestry on the high-volume kinds — payload multiplied by page depth, to buy what
the server could derive — and the same argument covers roles, parts and copy.

**Done.** `pageReadingOf(tree, tallies, declarations)` in `src/signals/parts.ts`
is the join: every element node of a revision in reading order, each with the
role its type declared, the words it says itself, and the counters filed against
it or nothing. Four things were settled in the building and are in
[0212](../decisions/0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md):

- **The join is at read time, not at rollup time.** A declaration is a fact about
  the library, not about a window of reading, so stamping it onto a stored row
  bakes today's silence into counters that outlive it — and the correction is
  impossible once the raw window has expired. Read-time means the day
  `src/primitives/` declares `copy` across itself, every counter already stored
  reinterprets.
- **The tree is what makes silence a measurement.** A part nobody reached has no
  row, so no reading of the counters alone can say a part was *skipped*. The
  element nodes of the revision are the universe — a text or slot node carries no
  identity attributes, so no signal can ever name one — and against that universe
  absence is an answer. This is the half of step 6 that works today and needs no
  declaration from anybody.
- **Three standings, not two.** `read`, `skipped`, and `unknown` for a window
  with no views at all or a part that reported something other than a view. A
  two-valued reading has to call a page nobody opened a page everybody skipped.
- **A grouped row adds occurrences and never view counts.** `views`, `reached`
  and `engaged` are absent from every per-role total: distinctness cannot be
  added (0147), and `engaged` would count one press twice, once on the control
  and once on the band it was inside (0167). A role row counts *parts* read,
  skipped and unknown instead.

**It answers thinly today, and the thinness is in another lane.** Nothing in
`src/primitives/` declares `role` or `copy`, so every part comes back
`role: null` with its string props named in `copy.unread` — 0114's and 0122's
stated bargain, where *nobody has said* is a different answer from *there are
none*. Filed for `Loom primitives`, which now has a second consumer and a
concrete payoff.

### 7. Region, as an aggregate and nothing else · `Loom signals` · **approved**

Where readers are, which the intake can read from the request without the browser
knowing anything about it. Three constraints are the design:

- **it lands on a counter, never on a batch** — a region beside a `view` key on a
  raw row is a step toward a profile;
- **a bucket is kept only once it holds enough views to not be a person**, with
  the floor as configuration and the reason in the record;
- **the address it came from is never stored**, and no digest of one outlives the
  process.

## Still not in scope

- **Signal-to-intent derivation** — a signal automatically becoming a
  `system-signal` proposal. The runtime has gated `system-signal` since §2 and
  the wiring is deliberately still open. It is the next question after this
  plan, not part of it.
- **Anything in rule 1's list.** Identity is not a later phase; it is refused.
- **A tracking primitive.** See rule 3.

## Under consideration, not approved

**Per-reader identity, deferred 30 September 2026.** A unique id per reader,
returning-reader measurement, anything that stitches one person across page
views. The maintainer is interested and has parked it: intake stays per
deployment, not per person, because a persistent reader id is personal data in
the EU, the UK and California, and shipping it would hand every Loom deployment a
consent obligation it did not ask for.

When it returns it is **opt-in, and a gate with a record rather than a banner**: a
broadcaster that refuses to start without a recorded decision, an intake that
refuses an identified batch which cannot show which decision allowed it, and
collection that can be shown and withdrawn. A consent *prompt* may be a primitive
that displays the choice and calls a handler the host supplies — the switch stays
host configuration, per rule 3.

**It is parked, not open.** Do not build it and do not write a record arguing for
it. If a design choice would make adding it later expensive, say so in a report.

**Longer retention as something a deployment pays for.** The maintainer's
intent, and the reason rule 5 makes the window configuration rather than a
constant: selling a longer window should be a number per deployment, not a
migration on live data. No pricing, no tiers and no billing work is approved —
only that the design must not foreclose it.
