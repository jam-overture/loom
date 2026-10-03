# Reader signals — how many page views, exactly, and how generous the rest are

**Routine:** `Loom signals` · **Date:** 3 October 2026 · **Branch:**
`signals-05-exactly-how-many-page-views`

## What I did

Built step 8 of [`docs/signals.md`](../docs/signals.md): **the exact count of
page views, and the over-count in every other view figure turned from a bound
into a measurement.** It is the one thing
[0214](../decisions/0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)
named and left unbuilt — *"a column and a counter"* — and the recommendation the
last run put to the maintainer on #486, which has had no answer, so I took it.

Nothing was added to a payload and nothing to a browser. The marker this reads
already ships for the region counter, so this is the second thing derived from
one byte rather than a second byte sent.

### The problem, in one line

Every figure the portal will show about readers is a rate, and the only
denominator available was `views` summed off the tallies — a **distinct** count
added across rollup windows, so a reader whose visit spans a boundary is counted
twice.
[0147](../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)
accepted that and bounded the error by *views per window × page-view duration ÷
window length*, which is arithmetic a deployment cannot evaluate from its own
rows. So a screen could say a number was slightly generous, and never how much.

### What now exists

`loom_reader_page_views` — a tree, a revision and two numbers.

| | written by | what it is |
| --- | --- | --- |
| `opened` | the intake, on the request path | page views that **began**, from the opening markers in a delivery, deduplicated by view key. Counted once, never recounted, and therefore addable across windows, revisions, trees and months |
| `appearances` | every rollup, through the `apply` it already called | the same page views as the windows saw them — once per window each appeared in, which is exactly what every `views` figure is made of |

`pageViewReadingOf(rows)` reads them: `opened`, `appearances`, **`drift`**
(`appearances − opened`, the straddle), **`inflation`** (`drift ÷ opened`, the
fraction a screen says out loud), and **`pending`** (openings no rollup has
folded yet — the other sign of the same subtraction, and what a stalled
`signals:collect` looks like instead of counters that appear exact).

The sentence that was not available yesterday: *of 1,240 page views of revision
4, 310 reached the pricing band — and these figures are 4% generous, because 50
of those readers were counted in two windows.*

## Decisions I took that the step did not specify

**1. The counter lives on `ReaderTallyStore`, not in a store of its own.** A
store of its own was tidier and would have needed the rollup half threaded
through `collectReaderSignals` and into `apps/loom/scripts/signals-collect.ts`,
which is the framework lane's file. That would have shipped a column with
nothing writing it — which is the exact failure three findings already named
about this subsystem in September. The counters store is already applied in the
one place a rollup runs, so `appearances` wired itself. The door is handed
`ReaderOpeningCounter`, which is `opened` and nothing else: a public write
endpoint that could read a deployment's tallies would be one query from serving
them.

**2. No floor, and no switch.** 0214 floors a region bucket because a country
with four views in it is a person. *Four page views of revision 3* names nowhere
and nobody, so there is nothing to withhold — and nothing an operator should
have to switch on before every other number is divisible. A deployment that
switches regions off still counts how many readers it had; there is a test for
that specific sentence, because it is the one a refactor would quietly undo.

**3. `regionCountsOf` is handed the openings rather than the delivery.** It used
to walk the batches itself, which meant two functions each deciding how many
readers arrived. Now the walk is `openingsOf` and a region is a stamp on its
result, so a map's views always add up to the page views there were. Its nine
walk-and-dedup tests moved to `openingsOf`, where the walk now is; four tests
about stamping stayed behind. That is a published signature change and it is in
the report rather than in a footnote.

**4. The marker still stops at the door.** I did not put `first` in the buffer,
which is the obvious way to let a rollup count arrivals. 0214 settled that the
buffer is for what a rollup reads, a raw row saying *this page view began at this
moment* is a step toward a profile, and — the reason I would hold to anyway — it
would give two things the authority to decide how many readers there were, with
no third number to arbitrate the day they disagree.

**5. `drift` and `pending` are totalled per row, never as the difference of two
sums.** A revision mid-collection would otherwise cancel another revision's
straddles and the page would claim counters more exact than any revision on it.

## Records

- [0219 — A page view is counted once at the door, and the over-count in the
  node counters is a
  measurement](../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md),
  **Accepted**. It contradicts nothing: 0214 anticipated this column, and 0147's
  bound is still true — it has simply stopped being all a deployment has.

**On the number 0217, and why this record is 0219.** The next number free on
`main` was 0215, and **both #485 and #486 claimed it** — the second time in a
month that one number has been claimed twice. I took 0217 and left the two
numbers for the two open claims, so that `Loom merge` would have one renumbering
to do rather than three. `pnpm decisions:index` prints a note for a hole and
passes, which is how `main` already reads for 0152–0154.

*Renumbered to 0219 on 3 October by `Loom merge`:* #487 had claimed 0217 too,
from the primitives lane, and merged first. So there were three claims on two
numbers rather than two on one, and this record moved to the next number free on
`main` and on the open branches. 0215 went to #485, 0216 to #488, 0217 to #487,
0218 to #486.

## Findings

**Filed:**

- **`Loom portal`** — the reader screen can divide by an exact number of page
  views now, and say how generous the figures above it are. Includes the two
  things to be careful of: a rate against `opened` can exceed 100% and is not a
  bug (`reached` is a summed distinct count and `opened` is not), and `pending`
  is a collection that has not run rather than a reader count.
- **`Loom signals`** (mine, deliberately left open) — `ON CONFLICT … DO UPDATE`
  refuses to touch one row twice in a single statement, and the guard for it is
  now on one of the four counter tables. The other three cannot be handed a
  duplicate key by any producer in the repository today, and a caller composing
  counters by hand can. Four tables' worth of change hung off a unit about one of
  them is the wrong shape, so it is written down with the remedy instead.

**Closed:** none. The three this lane owned were closed by #486, which has not
merged. The `fetch`-and-`completed` finding of 1 October is still a question for
the maintainer and is below.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, read out of a file rather than
off a pipe.

| | this branch | `main` |
| --- | --- | --- |
| Runtime suite | **174 files, 3,612 tests, 0 failed** | 173 files, 3,560 |
| Application suite | **359 files, 6,325 tests, 0 failed** | 359 files, 6,322 |
| `findings:check` | 951 findings, 0 malformed | 949 |
| `prerender:check` | 124 pages, 1,462 junctions, 0 run together | 124, 1,461 |

**55 tests added, nothing skipped, nothing weakened.** The Postgres contract
suite runs against PGlite and takes 103 seconds of that on its own.

### The contract suite found a real divergence

Adding the page-view counter added the first counter in this subsystem that a
caller composes by hand rather than reads off a rollup's map — and the contract
case *adds up two openings of the same revision in one call* failed on Postgres
while passing in memory. `ON CONFLICT … DO UPDATE` **refuses to affect one row
twice in a single command**: Postgres raises rather than applying the second
value, so the whole write was refused where the memory store added. At the door
that would have been arrivals silently not counted; the addition now happens in
front of the driver and both stores answer 5. Nothing in the repository could
have triggered it yet, which is exactly the kind of defect that ships.

### Planted defects: thirteen, thirteen caught

| the mutation | what went red |
| --- | --- |
| `openingsOf` counts deliveries, not distinct page views | *counts one arrival when a delivery carries the same opening twice* |
| `openingsOf` counts every batch, not just the opening one | *counts nothing for the deliveries that follow the opening one* |
| `openingsOf` trusts an opening that names no page view | *counts nothing for an opening that names no page view* |
| the rollup counts deliveries as appearances | *counts one reader's many batches once* |
| the rollup writes a zero row for a revision with no view key | *leaves out a revision whose batches carried no view key* |
| the memory store replaces openings instead of adding | *adds a second delivery's arrivals to the first* |
| the memory store adds appearances into the openings column | *keeps a rollup's appearances beside the openings* |
| a reading subtracts the totals instead of adding the rows' drift | *adds each revision's drift rather than subtracting the totals* |
| a reading reports a negative drift | *reports openings no rollup has reached as pending* |
| the door counts before the buffer has accepted | *counts no arrival for a delivery the buffer refused* |
| the door counts page views only when it counts regions | *counts the reader arriving even when regions are off* |
| Postgres drops the duplicate-key fold | *adds up two openings of the same revision in one call* |
| the door's write ordering is defeated at the `receive` check | three tests, including both *no arrival* and *no region for a delivery the buffer refused* |

### Browser cost

**Zero bytes.** Nothing in `src/signals/broadcast.ts` or any module it reaches
was touched; `browser-weight.test.ts` passes unchanged. The marker this is all
derived from was measured in 0214 at 31 bytes minified, 13 on the wire, once per
page view, and it already ships.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated, with the
  repository's own `pnpm --filter @loom/app docs:api`, which the gate insists on.
  The published surface moved: four new types, one new interface, two changed
  signatures.
- `decisions/README.md` — generated with `pnpm decisions:index`.

Everything else is `src/signals/`, `src/testing/reader-signal-contract.ts`,
`apps/loom/app/_lib/reader-signals/`, `docs/signals.md`, `FINDINGS.md` and the
record.

## The parked door

**Per-reader identity is no cheaper and no dearer for this change.** The row
holds two integers about a revision of a tree. There is no key in it, nothing to
join it to, and nothing that would have to be unwound if the question ever comes
back. The one design choice that touches the question at all is the one I
*didn't* make: the marker stays out of the buffer, so no raw row says *a reader
arrived at this moment*, which is the row a future identity feature would most
want and the one 0146 would least allow.

## Open questions

**1. The `fetch` hole in `completed` — three days open, and the only thing in
this lane actually blocked.** A host's form that posts with `fetch` calls
`preventDefault`, so the broadcaster sees a cancelled submit and reports no
completion: a deployment can have conversions and read zero, with nothing
distinguishing that from nobody converting. The only honest fix is a function the
host's own code calls — `completed(node)` on the broadcast handle — because only
the page knows its submission succeeded. Rule 3 refuses measurement as a *prop in
the tree* so that a proposal cannot switch it on; a host's own code is not a
proposal, but that distinction should be written down before it is relied on.
**Recommendation: allow it, and let me write the distinction into a record that
amends nothing.** One run's work once you say.

**2. What comes next, now that the plan's own list is finished.** Steps 1, 2, 3,
6, 7 and 8 are done and 4 and 5 are other lanes'. The two candidates I would
rank, if you would rather not pick:

- **The `completed` answer above**, which is a hole in a counter a deployment
  will read as a conversion rate.
- **What the join can answer about *where in a page* reading stops.**
  `pageReadingOf` already walks a revision in reading order with each part's
  standing, and `drift` now says how much to trust the numbers on it. *Readers
  get through the first four bands and the fifth is where they leave* is
  derivable from counters that already exist, needs no payload and no browser
  change, and is the first thing in this lane that would tell a model something
  actionable rather than tell a person something true.

**3. Not blocking, carried over.** The region floor is one constant if 25 is not
the number you want. Whether the reader-signal half of `docs/deployment.md` is
this lane's is still one line of your reading; `docs/signals.md` carries the four
environment variables in the meantime, and this step added none.
