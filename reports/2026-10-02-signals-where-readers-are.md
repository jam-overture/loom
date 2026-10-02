# Reader signals — where readers are, counted once per reader

**Routine:** `Loom signals` · **Date:** 2 October 2026 · **Branch:**
`signals-03-where-readers-are`

## What I completed

**Step 7 of `docs/signals.md` — region, as an aggregate and nothing else.** A
deployment can now see which countries its readers are in, per tree and per
revision, without the browser being told anything and without an address being
stored anywhere.

| | |
| --- | --- |
| New table | `loom_reader_regions` — tree, revision, country, page views |
| Written by | the intake, on the request path; no rollup touches it |
| Read with | `regionReadingOf(rows)` — buckets above the floor, plus what was withheld |
| Floor | **25 views**, raise-only, applied at read time |
| Browser cost | **31 bytes minified, 16 gzipped**; 13 bytes on the wire once per page view |
| Record | [0213](../decisions/0213-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md) |

The pieces: `src/signals/region.ts` (the vocabulary, the counting, the floor and
the reading), a region store with memory and Postgres implementations behind one
contract suite, a fourth table with row-level security in the migration, and the
intake wiring — three environment variables, read and reported by
`GET /api/reader-signals`.

### The thing the step did not anticipate, which decided the whole shape

**A region counter has to count page views, and an intake cannot count them.**

Rollup counts distinct views by comparing view keys inside a window. The door
cannot, because a view key is the one value in this seam that may never be
written down (0146) — so an intake has no way to tell a reader's fortieth
delivery from a fortieth reader. The only unit available to it unaided is the
delivery.

That is not a blurred number. It is **the floor inverting**. The floor exists so
that no named bucket can be one person; a reader who stays ten minutes posts a
hundred batches, so counting deliveries lets one person clear any floor on their
own and be reported as a readership, with nothing on the screen saying so. The
protection would have been there, visibly, doing the opposite of its job.

So a batch now says whether it opened its page view: `first: true`, on at most one
batch of a view, refused by the parser unless the batch names the view it opened.
It is the first addition this plan has made to a payload, and I want to be
explicit about why it survived the test the brief sets — *what could be derived
from what is already there?* Nothing: deriving it on the server means remembering
which view keys have been seen, which is precisely the value rule 2 forbids
keeping, and on serverless it would be wrong by a factor nobody could state,
because the batches of one page view land on whichever instance takes them.

**What it bought beyond the floor meaning something: a region view is exact.** It
is counted once, at the instant a page view began, so region numbers add across
revisions, trees and months. Every other view count here is a distinct count
summed across rollup windows and over-counts the views that straddle a boundary
(0147). The same marker would give a rollup an exact count of page views *begun*
in a window — that approximation solved rather than bounded — which I have
deliberately not built: it is a column and a counter, and it is a question for the
plan rather than a thing to tack onto this.

## Decisions I took that the step did not specify

All five are in 0213 with what I rejected.

**1. The floor is applied when the rows are read, not when they are written.**
The plan says a bucket is *kept* only once it is large enough, and the literal
reading does not work: a bucket that is never written can never reach the floor,
so the map would stay empty for ever. Deleting small rows on a schedule is worse —
the smallest buckets are the ones most likely to survive between runs. So every
arrival is counted, and `regionReadingOf` is the only thing that names a bucket.
The honest cost, stated in the record: a row saying one view came from Luxembourg
is in the database, and nothing that reads through a reading can show it.

**2. The floor is raise-only, which is this subsystem overriding an operator.**
25 views by default; a deployment may ask for more caution and not less, and a
smaller number is refused *out loud* in the status rather than quietly replaced.
The precedent is the rate gate, whose limits the environment cannot widen either:
the floor is what makes the aggregate an aggregate, so a deployment that could set
it to one would be running a different product and the difference would be
invisible on the screen that showed the result. **If you wanted 25 to be
something else, it is one constant** — I took the number from my own
recommendation yesterday because the alternative was shipping nothing.

**3. Region counting is on by default, which is the only default in this intake
that is not off.** The endpoint is already the opt-in (0136, 0161): a deployment
that switched intake on asked to measure its readers, and what this adds is a
floored count of page views per country with no address kept and nothing on a raw
row. Off-by-default would have meant your own deployment showing an empty map
until you set a variable you had not been told about. `LOOM_SIGNAL_REGION=off`
refuses it and everything else keeps working.

**4. A region is a closed set — two letters or the word for not knowing.** The
header is written by whatever sits in front of the application, and on a
deployment whose proxy passes a caller's value through it is written by the
caller. Anything that is not a country code is unplaced, so the worst a poisoned
header can do is add to a bucket that already exists rather than write free text
into a column. The casualty is deliberate and small: the `T1` some platforms send
for a Tor exit reads as unplaced.

**5. The readers nobody could place are a bucket and are never withheld.** They
name no place, so there is nobody in them to re-identify, and hiding them would
make a reading's numbers stop adding up to the number of views there were. On a
deployment behind a proxy that writes no country header this is *every* view,
which is a fact about the measurement that a blank map should not be allowed to
hide.

One smaller choice, in the record as a consequence: **a region that cannot be
written never fails a delivery.** The batch is already kept by then, and refusing
would invite a retry that counted every signal in it twice (0158). The outcome
reports the lost bucket; the counter simply did not move.

And one that is three lines of code and worth naming because both store
implementations had to agree: **the opening marker is read at the door and not
buffered.** A buffer is for what rollup reads, and rollup has no question about
arrivals. The journal contract suite now fails if either implementation keeps it.

## What I did not do, and why

- **The portal screen.** Reading is `Loom portal`'s, and the finding filed for
  them carries the four lines of code and the one correctness constraint — that
  `regionReadingOf` is where the floor lives, so mapping `store.regions()`
  straight onto a list publishes a single reader as a country.
- **The operator documentation.** `docs/deployment.md` §8 is where a deployment
  learns about `LOOM_SIGNAL_INTAKE`, and it is not one of this lane's three paths.
  Filed for `Loom daily build`, with the default called out as the part worth
  documenting. `docs/signals.md` carries the four variables in the meantime.
- **Anything per-reader.** Nothing here moves that door: an opening marker says a
  page view began and cannot say who, two openings from one person are
  indistinguishable from two people, and a region bucket holds no key anything
  could be joined to it by. The brief asks to say so if a choice made it dearer,
  and none did.

## Real test numbers

`pnpm install && pnpm verify` — **green**, on the final tree.

| | |
| --- | --- |
| Runtime suite | **173 files, 3,526 tests, 0 failed** (3,462 before) |
| Application suite | **356 files, 6,285 passed, 1 skipped, 0 failed** (6,262 before) |
| `findings:check` | 939 findings, 0 malformed |
| `prerender:check` | 122 pages, 1,451 text junctions, 0 run together |

**87 tests added**, nothing skipped and no existing test weakened. Two existing
assertions changed, both because an outcome gained a field rather than changed a
meaning: `ingestReaderSignals` now reports `regions: 0` when nobody said where a
delivery came from, and the Postgres row-security sweep now names four tables.

**The double-count cases, which this lane's standard requires naming** — all six
are tests rather than claims:

- a hundred deliveries from one page view count **one** view (`receive.test.ts`,
  and the same property at the unit level in `region.test.ts`);
- the same opening batch delivered twice in one body counts **one** — a retry
  queue draining after an outage does exactly this;
- two page views opening inside one delivery count **two**;
- three arrivals landing in the same instant against Postgres sum to **3**, not
  1, because the upsert adds in the statement (`postgres.test.ts`);
- a second delivery adds to the first rather than replacing it, in both store
  implementations (contract suite);
- and `regionReadingOf` sums a region's revisions **before** it applies the floor,
  so ten readers of one revision and twenty of the next are thirty readers of one
  country rather than two withheld buckets.

**Browser cost, measured rather than estimated.** `esbuild --bundle --minify` over
`src/signals/broadcast.ts`, before and after:

| | before | after |
| --- | --- | --- |
| minified | 6,446 | **6,477** (+31) |
| gzipped | 2,927 | **2,943** (+16) |

On the wire it is `"first":true` — 13 bytes — on one batch per page view, and
nothing on any other. `browser-weight.test.ts` still reports the broadcaster
reaching no package.

Nothing failed on the way that is worth a paragraph: one branded-type slip in a
new test that `tsc --noEmit` caught, and the API reference needed regenerating
(`pnpm --filter @loom/app docs:api`) because six new names are published from
`@jam-overture/loom/signals` — `regionReadingOf`, `regionCountsOf`,
`readerRegionOf`, `regionFloorOf`, `DEFAULT_REGION_FLOOR`, `UNKNOWN_REGION`, plus
the two store factories and the contract suite.

## Open questions

**1. The `fetch` hole, unanswered since yesterday and still the one that needs
you.** A host's form that posts with `fetch` calls `preventDefault`, so the
broadcaster sees a cancelled submit and reports no completion — a deployment can
have conversions and see zero. The only honest fix is a function the host calls,
`completed(node)` on the broadcast handle, because only the page knows its own
submission succeeded. Rule 3 refuses measurement as a *prop in the tree* so that a
proposal cannot switch it on; a host's own code is not a proposal.
**Recommendation: allow it, and let me write that distinction into a record that
amends nothing.** The finding stays open.

**2. The floor at 25.** Mine, chosen because the alternative was shipping nothing,
and the easiest thing in this change to move. One constant and one line of the
record if you want another number.

**3. Whether the reader-signal section of `docs/deployment.md` is this lane's.**
It documents the intake, which is mine; the file is not in my three paths, so I
filed a finding instead of editing it. Either answer is fine and one of them saves
a round trip.

## Defects planted, and what caught them

Each restored in turn against this commit, `pnpm test` run, and the file restored
with `git checkout HEAD --` between rows.

| # | the defect | what caught it |
| --- | --- | --- |
| 1 | the opening marker set on every batch rather than the first | `broadcast.test.ts` — *marks the first batch of a page view and no other* |
| 2 | `regionCountsOf` counting batches instead of distinct view keys | `region.test.ts` — *counts one view when the same opening arrives twice* |
| 3 | the floor clamped with `Math.min` rather than `Math.max` | `region.test.ts` — *cannot be lowered*, and the settings suite |
| 4 | the unplaced bucket subject to the floor | `region.test.ts` — *never withholds the readers it could not place* |
| 5 | the region counted before the journal accepted the batch | **nothing — and this is the row worth having run the matrix for.** See below |
| 6 | the Postgres upsert setting `views` rather than adding to it | the contract suite, in both implementations, and the concurrency test |
| 7 | the memory journal keeping the opening marker | the journal contract suite — *does not buffer the opening marker* |

### Row 5, which the matrix caught and nothing else did

Moving the region count to *before* `journal.receive` left all twenty-one tests
green. Every region test passed because the counting is right either way, and the
one test that refuses a delivery did not pass a region store at all — so a
deployment whose database refused a batch would have counted the reader who sent
it, and the bucket would have said a reader arrived from a country and read
nothing.

`counts no region for a delivery the buffer refused` is the test that was
missing. It fails against the defect and passes on the final tree, and it is the
87th of the 87 added — written after the matrix rather than before it, which is
the honest order and the reason the matrix is run at all.
