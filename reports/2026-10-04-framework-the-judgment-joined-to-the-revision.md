# The judgment joined to the revision

**Date:** 2026-10-04 · **Section:** §6 (telemetry) · **Lane:** `Loom daily build`
**Branch:** `framework-the-judgment-joined-to-the-revision`
**Records:** [0225](../decisions/0225-a-judgment-is-joined-to-a-revision-by-a-bounded-lookup-and-the-lookup-says-what-it-did-not-reach.md).
**None superseded.**

---

## What this run did

`TelemetryJournal` has a fourth operation. `assessments` takes a set of proposal
ids and answers with the assessments the journal holds for them — one round trip,
one row per proposal, bounded by how many ids it will look at, and explicit about
any it did not reach.

That is the join `/portal/history` needed and could not afford. A revision holds
a `proposalId` and no judgment, because 0016 makes the revision log the truth
about the *page* and whether a change reached outside the page is not a fact about
the page. So the fact is reachable, and until today only by paging a journal that
only grows. `Loom portal` filed that on 3 October, after the screen it affects —
the one with the undo button on it — shipped without the notice.

**It is a seam and not a sentence.** Nothing on `/portal/history` changes here.
What the screen says when the answer comes back is `Loom portal`'s to write; this
run made asking cheap.

---

## The measurement, because the claim is about cost

A journal of 2,000 records on one tree, 400 of them assessed proposals. The
twenty proposals one page of history is showing, joined to their assessments,
three ways — by paging the journal as a consumer had to before, and by one
lookup:

```
                          read() round trips  records off the table  found
  the newest twenty       1                   200                    20
    assessments()         1                   20                     20  (3.6ms, unasked 0)
  twenty, ten pages back  6                   1200                   20
    assessments()         1                   20                     20  (1.9ms, unasked 0)
  the oldest twenty       10                  2000                   20
    assessments()         1                   20                     20  (2.1ms, unasked 0)
```

**The first row is paging at its best and it is the row that matters least.** The
newest page is one read because the journal was asked for its newest end; a reader
who walks back two screens is already at six reads and 1,200 records for the same
twenty answers. And the left-hand column is a function of **journal size**, which
grows forever — 2,000 records is a small journal, and these numbers scale with it.
The right-hand column is a function of how many rows the page is showing, which
does not.

The plan, with the index `TELEMETRY_DDL` now creates:

```
  Limit  (cost=8.18..8.19 rows=1 width=72)
    ->  Sort  (cost=8.18..8.19 rows=1 width=72)
          Sort Key: seq DESC
          ->  Index Scan using loom_telemetry_assessed_proposal_idx on loom_telemetry
                Index Cond: (((event -> 'assessment'::text) ->> 'proposalId'::text) = 'p_s3801'::text)
```

`loom_telemetry`'s own table comment has said since §6 was built that the event
stays one JSON document, its type and its proposal id are deliberately *not* also
columns, and *"an index on a JSON path is available the day a query needs one"*.
This is that day, and the statement is additive and idempotent.

---

## The four things the contract decides

Each could have gone the other way, and the record argues each one.

| | what it says |
| --- | --- |
| **bounded by ids** | `MAX_ASSESSMENT_LOOKUP` is 400 — above `MAX_LISTING_LIMIT`, so a caller paging revisions at the store's widest page never meets it |
| **`unasked`** | the ids a call did not reach, named rather than dropped |
| **a miss is absent** | a proposal nothing was recorded about is not in the map and is not an error |
| **two narrations, latest wins** | append-only means two assessments of one proposal are a history; `DISTINCT ON … ORDER BY seq DESC` |

The one worth arguing about is `unasked`. Silent truncation would make *nothing
was recorded* and *nobody looked* the same empty answer, on the one screen whose
job is to tell somebody something before they press a button. The alternative —
refusing — needed a second member on `TelemetryError`, whose entire doc comment is
an argument for why it has one, and *you asked about too many things* is not the
journal being unavailable.

---

## Decisions this run made that nothing specified

**`TelemetryPruner` and `TelemetryWriter`.** `applyRetention` needs `read` and
`forget`; `collectTelemetry` needs `record`. Neither needs a lookup, and without
this the two inline journal doubles in `retention.test.ts` and `sink.test.ts`
would each have grown a stub for a method their test never calls. That is exactly
the smell `store.ts` wrote down months ago when it published `TreeReader` — *"it
makes every stub grow a method the code under test never calls, which is how a
test starts describing the interface instead of the behaviour"* — and a fourth
method is the event that made it worth repeating. Both are `Pick` aliases, every
journal satisfies both, nothing a host built changes.

**A map, not an array.** Each summary carries its own `proposalId`, so an array
would be lossless; every caller would then build the map the implementation has
already built to answer at all.

**Assessments, not judgments.** A lookup returning the disposition beside the
assessment was considered and refused: a refused proposal never becomes a
revision, so a history screen reads assessments, and the irreversibility codes are
on both.

**The number is 0225.** It was written as `0224`: `0221` was the highest on
`main`, #501 took `0222` and #503 took `0223`. The procedure says to re-read
`main` before choosing — on a repository with five same-day collisions in six
days, reading the open branches is the part that works. It was not enough here:
`Loom signals` wrote its own `0224` on #504 the same morning, neither branch
could see the other, and `Loom merge` renumbered this one to `0225` on the day
both landed.

**0222 is cited nowhere in the code.** It is the record that decided this join,
and it is on #501, which has not merged. `tools/decisions` fails the build on a
citation that does not resolve, and it caught exactly that on the first verify —
so the doc comments carry the argument and name 0225 instead. When #501 lands the
two records sit beside each other and neither needs editing.

---

## One cross-lane edit, filed for its owner

`pnpm verify` went red at `Failed to collect page data for
/docs/the-runtime/going-to-production`. The deployment page in `(docs)` generates
its storage tables from the runtime's own DDL and throws on any statement it
cannot classify — which is the right design, and the first expression index the
runtime has ever written is a statement it could not classify: brackets nest, and
it ends in a condition.

Three mechanical changes in `(docs)`, filed in `FINDINGS.md` for `Loom docs`:
the index grammar reads a nested bracket and an optional `WHERE` and **refuses** a
predicate containing a bracket rather than guessing; `SchemaIndex` carries
`where`, because an index mentioned without its condition would read as covering
every row when it covers one event type of fourteen; and the generated block
prints `, for rows where …`. That phrase is the only copy change and the thing I
am least sure of. Three tests came with it, in their own test file.

---

## Gate

| | `main` @ `e1b33d8` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 178 files / **3,728** | 178 / **3,747** |
| `@loom/app` | 374 / **6,674** | 374 / **6,677** |
| findings | 982 | **983**, 0 malformed |
| prerender | 124 pages, 0 run together | 124, 0 run together |

`pnpm verify` green, twice: once on the merge that unblocked #501, and once here.
**Nothing was skipped and nothing failed on the final run.** Nineteen tests added
in the package — the eight-case lookup suite runs over both journals, plus three
Postgres specifics — and three in the app, in the docs lane's DDL grammar.

The index test is the one to read twice. It asserts `Index Scan using
loom_telemetry_assessed_proposal_idx` **and** that the proposal path is the
`Index Cond`, with `enable_seqscan` off. A partial index is usable for its
predicate alone, so a query matching only the discriminant would name the index
and seek nothing — which is how a JSON-path index gets built, stays empty of
purpose, and says nothing about it.

---

## Open questions

**Does a disposition lookup follow?** Not built, not needed yet. If a screen ever
wants *what the Gate answered* by proposal rather than *what it read*, the shape
is the same and the argument for a separate method is the same as the argument
against bundling it here.

**Should the journal publish a reason vocabulary?** The irreversibility reasons
on `AssessmentSummary` are `readonly string[]` — open on purpose, so a code added
elsewhere does not make yesterday's records fail to parse. A consumer wanting to
*switch* on them has no closed set to switch on. Worth a look when a second
screen reads them.

**Nothing else in this lane is half-finished.** The one-application migration is
done and on `main`: `apps/loom` holds all four route groups, `apps/portal` and
`apps/docs` are gone, and `vercel.json` sits in `apps/loom`. The brief still names
it as the next unit; it was completed before this run.

---

## Scope

`src/telemetry/` (journal contract, both implementations, the shared split, the
schema and the migration), `src/testing/journal-contract.ts`, and the two
in-package consumers whose parameter types narrowed. No primitive was touched. No
surface content was written. The three files under `app/(docs)/` are the
mechanical consequence described above and are filed for their owner.
