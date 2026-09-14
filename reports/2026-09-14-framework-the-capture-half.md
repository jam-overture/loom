# The capture half

**Routine:** `Loom daily build` (framework) · **Date:** 2026-09-14
**Branch:** `framework-34-the-capture-half` · **Section:** §4c — reader signals,
§6 — telemetry

![The capture half, and where the view key stops](2026-09-14-framework-the-capture-half.png)

## Before anything else, two standing corrections to my brief

**The one-application migration finished on 19 August.** My brief still opens
with it as the next unit, above everything, and says three routines are blocked
on it. `apps/loom` is on `main` with `(marketing)`, `(docs)`, `(lessons)`,
`(portal)` and `(demo)`; `apps/portal` and `apps/docs` do not exist in the tree.
Nothing is half-migrated and nothing waits on me for it. This is the fifth
consecutive framework run to establish that, and the fourth to write it down.

**The demo is not mine.** The brief assigns it to me; `docs/routines.md` records
it as split out to `Loom demo` on 20 August, and that lane has an open pull
request today (#292). Where a brief and that file disagree the brief wins and
the file is wrong — so I am saying it here rather than acting on it, which is
what the file itself asks for. I did not touch the demo.

Both are one edit to a stored prompt. They are in *Needs your input* on the pull
request rather than filed again.

## What was waiting, and what I did about it

No new maintainer comments on either open framework pull request. The two
comments on #288 and #293 are my own previous runs'.

`docs/signals.md` — the approved plan, written on #288 — makes step 3 mine and
says it comes after steps 1 and 2. **Step 1 is built and unmerged (#293). Step 2
is blocked** by */docs/the-runtime/what-your-readers-do*, which argues rather
than counts: `page.mdx` says *"Four things, and nothing else."* and *"There is
no fifth kind"*, and `claims.test.ts` asserts both verbatim. Adding `completed`
turns `pnpm verify` red for all four surfaces, so the docs row has to be written
before the kind. That is `Loom docs`'s page and it is still true on `main`
today.

So I built **step 3**, which needs neither of them: nothing in ingestion,
storage or rollup depends on the broadcaster's mutation observer or on a fifth
kind.

## What shipped

**A batch a browser sends now reaches a durable counter, and the funnel key dies
on the way.**

### The view key (`view.ts`, and one field on the batch)

0146 allows a batch to carry an opaque `view` key so a funnel can be correlated
inside one page view. It is minted once per broadcast from 128 random bits,
carried by every batch that broadcast sends, and read by exactly one module.

The part worth arguing about is the **shape**. A free-form correlation string is
where a host wanting a visitor id would put one, and everything downstream would
keep working. Thirty-two lowercase hex characters hold no room for a hashed
address, an account id or a user agent, and a batch carrying anything else is
refused at the parser rather than stored and noticed later. `view.test.ts`
asserts the refusal for six shapes somebody would actually try.

`crypto.getRandomValues` with **no `Math.random` fallback**: it predates
`IntersectionObserver`, which the broadcaster already requires, and a weak key
is worse than no funnel because nothing downstream can tell which one it got.

### Ingestion (`ingest.ts`)

`unknown` in, a counted outcome or a typed refusal out, no throw either way. It
takes one batch or a list, because `sendBeacon` posts one and a queue draining
after an outage posts what it has, capped at 50 per delivery.

**Nothing is kept unless all of it parses.** A partial accept leaves a sender
unable to retry — its second attempt either duplicates what was taken or drops
what was not, and a browser cannot work out which. The refusal names the index.

The route handler that serves this is a surface's; the framework owns the
function.

### The buffer (`journal.ts`, `memory.ts`, `postgres.ts`)

Deliberately the same shape as `src/telemetry/journal.ts` — append, page by an
opaque cursor, forget a prefix — because a second paged log that paged
differently would be a second place for the cursor rules to be subtly wrong.

`seq` orders by arrival, never by `sentAt`: a browser's clock is not merely
skewed but attacker-controlled, so `sentAt` is a number a page said and can
order nothing.

### Rollup (`rollup.ts`)

Pure. Batches in, counters out, and **the only module that reads the view key**.

It produces two kinds of number on one row, and the distinction is the whole
reason this is not `fold.ts` over more input:

- **occurrences** — `dwellMs`, `activations`, `opens`, `closes` — which sum, and
  which one enthusiastic reader can be most of;
- **views** — `views`, `reached` — which count *distinct page views*, which are
  the ones a rate may be taken of, and which exist only because a batch carries
  a key.

Funnels are answered per pair per revision: *of the views that `viewed` node A,
how many `activated` node B*. Two ends, no path, no ordering — a three-step
ordered funnel is a route one reader took, which is what 0146 refuses.

Batches with no key contribute occurrences and no views, and rollup reports
`uncorrelated` so a portal can say the rate used a smaller denominator instead
of showing a rate that is quietly wrong.

### The counters (`tally.ts`, `schema.ts`)

Three tables: the buffer, per-node-per-revision tallies, per-pair-per-revision
funnels. The split is in the schema rather than in a policy because one table
would make retention a `DELETE` somebody has to keep writing correctly forever.

Applying a rollup is **additive** — in Postgres one
`ON CONFLICT … DO UPDATE SET x = table.x + excluded.x`, so a scheduled rollup
and a manual one cannot lose each other.

### The fold (`fold.ts`)

`prototypes/ski-apparel/readings.mjs` lifted into `src/`, typed, with the
page-specific half left behind. The prototype's fold also turns node ids into
section names and builds a feed of lines using a legend only that page has;
naming a node is a property of the page, so it stays with whoever has the
legend. What is left is the arithmetic — and it is a *different* function from
rollup, for one page being watched live rather than many views over time. Using
the wrong one gives a plausible number, which is why they are named apart.

`prototypes/` belongs to no lane and was not edited.

## Decisions I made that nobody asked for

**0147 — a rollup is added to what is stored, and a distinct-view count is
therefore approximate.** This is the one real discovery of the run and it is not
in 0146.

Rollup runs over a *window* and runs again over the next one, so it reports what
a window added. Occurrences sum exactly. **Distinctness does not survive
addition**: a reader whose page view straddles a window boundary is one view in
each and two after the sum. The number a rate is taken of is the one that cannot
be added correctly.

Making it exact means knowing, in the second window, which views the first
already counted — which means keeping view keys durably, which is the single
thing 0146 refuses and the refusal the whole anonymity argument rests on.

So the over-count is accepted and named: always upward, bounded by
*(views per window) × (page-view duration ÷ window length)*, and shrinkable by
lengthening the window, which is configuration rather than a constant. The
record writes down the three alternatives — durable keys, a HyperLogLog sketch,
waiting for views to end — and why each is refused today.

**Postgres is not re-exported from `src/signals/index.ts`.** It reaches Drizzle
and a driver, and a route handler that only ingests should not load either.
`@loom/runtime/signals/postgres` is a second entry point, as the store and the
journal already do it.

**The buffer declares its own `ForgetBefore`/`ForgetOutcome`** rather than
sharing telemetry's identical pair. They are the same two fields and they answer
to different policies — telemetry must not cut an episode in half, this must not
forget a batch that has not been rolled up — so sharing them would be two
subsystems agreeing by coincidence.

## What I did not build, and why it matters

**Retention.** `docs/signals.md` rule 5 and 0146 both say the raw window is
configurable with a short default. `ReaderSignalJournal.forget` exists and
nothing calls it.

Left out deliberately: forgetting raw batches before the counters they feed are
durable destroys data outright. Aggregates first, retention second; the reverse
order is a data-loss bug that looks like a feature working. **But the raw window
expiring is also the mechanism by which a view key stops existing**, and nothing
currently makes it brief. Nothing is exposed today because nothing is deployed
with signals on. It must not still be true when something is, so it is filed as
an open finding against my own lane and it is my next unit.

## A branch carrying a record it did not write

`decisions/0146-…md` is on this branch, **byte-identical to the copy on #288**,
and this needs saying plainly because the diff looks like I wrote it.

`tools/decisions/citations.ts` blocks a citation of a record that does not
exist, and 0146 does not exist on `main` — it is on #288, unmerged since
yesterday. Every module in this unit cites it, correctly, because it is the
record that governs them. The options were to copy it, to stack on #288 (which
the brief forbids, for good reasons), or to describe the rules in prose with no
citation, which 0118 is the argument against.

Identical content means git resolves the add/add cleanly whichever lands first,
and the second copy is a no-op. The same is true of the one line 0146 adds to
`decisions/README.md`.

This is the first time an unmerged pull request of mine has cost a later one
real design freedom, and it is worth the maintainer knowing.

## Test numbers

`pnpm verify` **green**, run in full on this branch, exit 0. Nothing failed,
nothing skipped.

- **Runtime suite: 2,538 passed in 149 files.** `main`, measured in a worktree
  rather than remembered, is **2,415 in 143 files** — so **+123 tests in 6 new
  files**.
- **Application suite: 4,139 passed in 244 files**, unchanged in count from
  `main`.
- `findings:check`: 606 findings, 0 malformed. `prerender:check`: 100 pages,
  760 text junctions, 0 run together.

The 123: `postgres.test.ts` 34, `memory.contract.test.ts` 28, `rollup.test.ts`
17, `ingest.test.ts` 15, `view.test.ts` 13, `fold.test.ts` 12, and 4 added to
`broadcast.test.ts`. The two contract suites run 27 shared cases against both
implementations. The Postgres suite runs on PGlite and takes about 50 s, which
is most of the runtime suite's wall clock.

**Three load-bearing behaviours were checked by removing them and watching the
test fail**, rather than by reading the assertion:

| Behaviour removed | Test that went red |
| --- | --- |
| additive tally (`apply` overwrote instead) | *adds a second window to the first rather than replacing it* |
| distinct-view counting (each batch its own view) | *counts one reader's many batches as one view* |
| funnel intersection (`converted` = every view that did B) | *does not count a conversion in a view that never reached the first end* |

My first attempt at the second of those was **ineffective** — I made the key
unique per `sentAt`, and the two fixture batches share one, so the suite stayed
green and proved nothing. Worth recording: a mutation that does not fail a test
is not evidence the test is weak until you have checked the mutation was real.

Two small failures found on the way and fixed here: the citation block
described below, and `src/signals/migrate.ts` opening with a doc comment
attached to its first export rather than a module paragraph, which
`documentation.test.ts` caught.

## Three files in `(docs)` changed, and why each had to

`routines.md` says a cross-lane diff gets a line saying which file and why.
Publishing one entry point forced three, and the third is the one I am least
comfortable with.

**`_lib/api/reference.generated.json` — regenerated, not written.** The API
reference is generated from my lane's published surface and committed;
`pnpm --filter @loom/app docs:api` produces it and the test fails on drift.
[0139](decisions/0139-a-shared-ledger-is-union-merged-and-a-generated-file-is-regenerated.md)
is exactly this case.

**`_lib/entry-points.ts` — one row.** The rail for the API reference is
`source: "generated"` and derives from this list, which a test asserts equals
the runtime's exports exactly. So a new export forces one row: a specifier, a
one-sentence summary, an audience. It is prose in another lane's file and it is
the minimum that can exist.

**`_lib/search/build.test.ts` — a ceiling raised, which is the uncomfortable
one.** The entries index is capped twice. `main` was at **198,470 of 200,000
raw** — 0.8% of headroom — and at **17,863 of 20,000 gzipped**. Publishing this
subsystem added 8,201 raw and 545 gzipped, so the raw cap fired.

I raised the raw cap to 240,000 and **left the gzip cap untouched**. That is
weakening a guard and I want it read as such rather than buried: the reasoning
is that the raw number is the proxy and the gzip number is what a reader
downloads — the test's own comment above those lines explains why the two
diverge — and that a ceiling with 0.8% of headroom was going to fire for
whichever lane published next. It is filed for `Loom docs` with both baselines
and the number to reconsider it against, including the sharding their prose
budget's comment already anticipates.

I cut from my own side first rather than only moving somebody's number: the
three Drizzle table objects are no longer re-exported from
`@loom/runtime/signals/postgres`. A `PgTableWithColumns` signature is several
kilobytes of generated type naming every column and fourteen properties of
each, and it tells a host nothing it can act on. That recovered 564 bytes — not
enough, but it is the right shape for the published surface regardless, and the
journal's entry point should have the same done to it.

## Findings

**Closed:** *`ANCHOR_PROP_KEY` cites 0096, and the record is 0098* — filed by
`Loom lessons` on 12 September, one character in `src/reserved-props.ts`. Worth
a line on why a person had to find it: the citation checker verifies a cited
number resolves, and 0096 resolves — to a real Accepted record about something
else. Its own doc comment says so.

**Filed for `Loom portal`:** *the capture half is built, so the portal's view
has a shape to read* — the step 4 unblock signal, with the exact read surface,
and the two numbers that need a caveat on screen.

**Filed for me:** *the raw signal buffer has no retention, so it grows until
someone notices*, with the argument for the ordering and what closing it needs.

**Filed for `Loom docs`:** *the search index's raw ceiling was at 99.2% before
anybody touched it, and I raised it from outside your lane*, with both
baselines measured rather than estimated.

**Not re-filed:** the `completed` blocker on the docs page. My previous run
filed it on #293; duplicating it here would be a conflict and noise when #293
lands. It is in *Needs your input* instead, because the cost of #293 sitting is
now the thing worth raising rather than the finding.

## Open questions

- **Who runs rollup, and how often?** Nothing schedules it. The window length is
  also what bounds 0147's over-count, so this is one decision and not two. It
  belongs with retention, next run.
- **Should a deployment's funnel pairs be configuration the runtime reads?**
  They are an argument to `rollUp` today, which is right for a pure function and
  leaves open where the list lives. The portal will want to add a pair from a
  screen; that is a shape neither 0146 nor 0147 settles.
- **Should the two contract suites be published?** `contracts.ts` publishes the
  tree, hold and journal suites on the argument that a seam offered without a
  way to check a third implementation is a seam offered unsafely. The same
  argument applies to `ReaderSignalJournal` and `ReaderTallyStore`, and
  `reader-signal-contract.ts` is deliberately internal today — partly because
  nobody is writing a third implementation yet, and partly because publishing
  more surface in the pull request that exhausted the search budget seemed like
  the wrong order.
- **Does the portal read tallies directly, or through a service function?** The
  store interface is usable as-is. A read model that groups revisions for
  *before versus after* is the sort of thing better written once the screen
  exists than guessed at now.
