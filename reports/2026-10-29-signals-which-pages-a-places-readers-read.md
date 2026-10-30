# Reader signals — which pages the readers of a place read

**29 October 2026 (evening)** · `Loom signals` · branch
`signals-62-which-pages-a-places-readers-read` · §62 of
[`docs/signals.md`](../docs/signals.md) · record
[0323](../decisions/0323-the-pages-a-places-readers-read-are-published-at-a-floor-on-the-cell.md)

## Before anything was built

**One open pull request, this lane's, and no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October. **Six days old now.** Both comments on it are a routine's own —
  the Vercel bot's and the merge routine's note explaining why it skipped it —
  so nothing outranked the queue. No review has been left.
- **#721** merged, with it §60, §61 and records `0321` and `0322`. `main` has
  moved four commits past where it was cut, none of them on the signal path.

**This work is a new branch off `main` rather than a fourth commit on #706**,
which is the exception to step 3 of the procedure in
[`docs/routines.md`](../docs/routines.md) and the same call the last two runs
made. #706 is held *because* it carries a `Proposed` architectural record, and
the merge routine skips it for exactly that reason — so pushing onto it would
hold this unit behind a review it does not need. `main` had not moved on the
signal path and `Loom daily build` has no branch open there, so there was
nothing to race.

The record is **0323**: `main` holds up to 0322 and 0308 is the only number
claimed elsewhere.

**Nine open findings owned by this lane were read first, and none of them was
the work.** Four are limits written down with nothing asked of anybody, two are
last night's and recommend leaving them, two are the 28 October pair that
recommend the same, and one — *a form that posts with `fetch` is invisible to the
conversion counter* — is a question for the maintainer before it is a unit. So
the work came from the third item in this lane's standing brief: **whatever makes
the aggregates worth opening**, and *a counter nobody can phrase a question
against is not finished*.

## What I completed

**§62 / 0323 — which pages the readers of a place read.**

The region counter has been read in one direction since it existed. A row is a
place, a page, a revision, an audience and a count of the page views that
*began* — and both readings over it group by place and sum the pages away: §7
answers *where were the readers of this page*, §40 and §54 answer it of a
revision and of a window.

**The other direction was never asked and needs nothing new to answer it.**
*Germany is a third of your readers — what are they reading* is the question an
operator asks second, it is the same rows grouped the other way, and it was
unaskable. No payload field, no header, no column, no migration, no store method
and no browser change: the eleventh thing taken out of the rows a deployment
already has rather than added to what it takes.

It is also the right counter to transpose. A region view is counted once, at the
moment a page view began, and is never recounted — unlike a node's `views`,
which is a distinct count inside a rollup window and is added to the next
window's. So a cell summed across revisions and across months does not drift.

### The floor is the whole of the design

What makes this a decision rather than a grouping is that **a breakdown is finer
than the bucket it breaks down.** A region map withholds a place too small to be
a readership. A country with four hundred views is a readership — and *one view
of the careers page* inside it is a person. Published at the bucket's own floor,
the transpose would hand back, one level down, exactly what the floor exists to
refuse, and it would do it on the one reading designed to be read beside a page
name.

So **the floor applies to the cell.** A page is named inside a place only where
its own count in that place clears the floor, and what did not clear it is
reported as a total naming no page — the same bargain the map strikes one level
up, so the numbers still add to the views there were.

### What is on the branch

`regionPagesOf(rows, { floor })` in
[`region-pages.ts`](../src/signals/region-pages.ts), publishing the map and, for
each place the map **named**, which pages the readers there read.

- **A cell is a place and a page**, summing every revision and every form.
  Across revisions because the question is about the page — thirty readers from
  one country over two revisions are a readership, and flooring the revisions
  apart would withhold both halves and report a page nobody reads. Across forms
  because arrivals are people and a reader who arrived arrived once, whichever
  form they were served (0297), so a page served in two forms is **one** page in
  one place and is named once.
- **A place the map withheld has no breakdown at all**, because naming a page
  inside an unnamed place would name the place.
- **The unplaced bucket is broken down in full.** `unknown` is never withheld by
  the map, however small, because it names no place and there is nobody in it to
  re-identify — and the same argument reaches its cells. *Two views of the
  pricing page from somewhere we cannot name* is strictly less than the door
  already publishes exactly, per revision.
- **`unattributable` is a third standing and not an absence of readers.** No page
  in the place above the floor is *this place's readers cannot be attributed to a
  page*, never *nobody read anything* — the readership is in the map above it,
  and it is the attribution that is withheld rather than the readership that is
  absent. **It will be the commonest standing on a real deployment for some
  time**, and that is the floor working rather than a fault.
- **A share is of the whole bucket, withheld views included**, because dividing
  by the named pages makes the shares sum to one and hides what is withheld — so
  a place whose attribution is mostly withheld would read as a fully attributed
  one.
- **The map is held rather than restated.** `RegionPagesReading.map` is
  `regionReadingOf` over the same rows, unchanged, so a breakdown's totals cannot
  disagree with the map a screen already shows. Two spellings of one rule that
  agree today is the fault this subsystem has been bitten by twice (0218, 0235).
- **The floor is required**, which is 0322 applied at birth rather than
  retrofitted. A caller with nothing of its own to say passes
  `DEFAULT_REGION_FLOOR` and has said so in a line a reviewer can read.
- **No app half was needed**, which is the first visible return on 0322: the
  deployment reading context already carries the one field only this deployment
  can answer, so the composition is
  `regionPagesOf(window.regions, { floor: context.floor })` and nothing new is
  plumbed.

## Decisions I took that were not specified

**The floor applies to the cell rather than to the bucket.** This is the whole
unit and it was not handed to me as a rule; the alternative — break a named
bucket down in full, since the bucket already cleared the floor — is the obvious
reading and it is wrong, because a place and a page together identify where a
place alone does not.

**The transpose is not a member of `windowAssemblyOf`.** The assembly's three
members are each an input to a published comparison; a transpose is an answer a
surface asks for directly, it is deployment-whole and has no page reading to pair
with, and a fourth figure would be charged to every window read. Filed, with the
recommendation to revisit it the moment a surface actually draws the region map.

**A cell sums the forms a page was served in, and there is no per-form sibling.**
`regionReadingOf` has one (`regionReadingFor`); this does not, and the asymmetry
is deliberate. A per-form cell is the finest grain anything in this subsystem has
ever been counted at, and splitting floors each half separately so a page
nameable on the sum is withheld on both. Filed, with what a caller wanting one
form does today, which is one `filter` and deliberately not wrapped.

**Three standings rather than two.** A place with no nameable page and a place
with no readers are the two sentences a screen must never print over each other,
and with two members it would have had to.

**`RegionPageStanding` is not registered in `silences.ts`.** It is a standing,
not a silence vocabulary, and the region readings have none: a region reading
withholds rather than falling silent, and the withholding is published as counts.

## Records

- **0323** — *The pages a place's readers read are published at a floor on the
  cell, and a place with no page above it is unattributable rather than unread.*
  `Accepted`. Nothing superseded — 0214 decided the counter, 0297 decided that
  two forms' arrivals are one readership, and 0315 and 0322 decided how a floor
  reaches a reading; this adds a second direction to read the rows in. Eight
  alternatives recorded, including the three cell keys that were rejected and the
  two-member standing.

## Findings

**Closed:** none. Nine were read, and every one of them either asks nothing of
anybody or recommends being left — which is why the work came from the brief
rather than from the queue, and is worth saying rather than leaving as a silence.

**Filed:**

1. **The region rows answer a second question now, and nothing in the window rung
   reminds a caller it exists.** The hazard that mattered is closed by the
   required floor; what is left is discoverability. Two shapes costed,
   recommendation to leave it until a surface exists.
2. **A per-form transpose is deliberately not built**, because the value of the
   reading is in the summing. With what a caller wanting one form does today and
   the reason a record would be needed if it were ever built.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0**, read from `verify.exit` which
the gate wrote as a separate command, per `docs/routines.md`.

| | |
| --- | --- |
| Root suite | 242 files, **5,863 tests**, all passing |
| App suite | 375 files, **6,783 tests**, all passing |
| `src/signals/` | 51 files, **1,732 tests** (was 50 files, 1,709) |
| `src/signals/region-pages.test.ts` | new, **23 tests** |
| `apps/loom/app/_lib/reader-signals/` | 15 files, **186 tests**, unchanged |
| New cases | **23**, all in the package |
| Findings ledger | 1,357 entries, 0 malformed |

**Nothing failed in the end and nothing was skipped.** No test that was on `main`
or on this branch was changed, weakened or removed — this unit adds a module and
one export line, and every signature it builds on is unchanged.

**Three red `pnpm verify` runs before the branch was green, and all three were
mine.** Each is worth stating because two of them are about process rather than
about the reading.

1. **A record link whose slug was the prose rather than the filename.** 0323
   cited 0147 by the sentence `tally.ts` uses for it. The citation check in
   `tools/decisions/decisions.test.ts` caught it, which is the second time this
   lane has been caught by a guessed slug that reads identically in a diff to one
   that resolves.
2. **The generated API reference had moved and I had not regenerated it.** Eight
   names on a published door with no page mentioning them fails two app checks —
   one asks whether the committed reference is current, the other opens every
   door for real. Fixed with `pnpm --filter @loom/app docs:api` and committed as
   generated output, never hand-edited.
3. **The first run was untrustworthy and I threw it away rather than reading
   it.** I started mutation testing while `pnpm verify` was still in its root
   test phase, and the mutation script swaps the module under test on disk and
   restores it between mutants — so the suite was reading a file that was
   changing underneath it. The run happened to fail on the citation above rather
   than on anything the swapping caused, and that is luck and not evidence. The
   numbers in the table are from a clean run with nothing else touching the tree.
   This is the 27 October finding about mutation testing and commits, with a
   second edge on it: **not during a verify either.**

### Mutation testing: sixteen planted, sixteen dead, two of them only after two cases were added

| planted | what died |
| --- | --- |
| no floor on the cell at all | 4 cases |
| the cell floor is one view rather than the deployment's | 4 cases |
| the unplaced bucket's cells are withheld like any other place's | 2 cases |
| a cell is keyed by the revision, so one page's revisions split | 8 cases |
| a cell is keyed by the form, so two forms of one page split | 8 cases |
| a cell overwrites rather than sums | 4 cases |
| the share is of the named pages rather than of the bucket | **survived, then 1 case** |
| a tie between two pages keeps whatever order the rows arrived in | **survived, then 1 case** |
| the standing has two members, so a place with no nameable page is attributed | 1 case |
| a place with some pages withheld reads as fully attributed | 1 case |
| the pages are least-read first | 7 cases |
| the withheld total counts the pages it named | 8 cases |
| the breakdown recounts the bucket from the cells it named | 1 case |
| every bucket is broken down, the withheld ones included | 4 cases |
| the breakdowns are in region-code order rather than the map's | 1 case |
| the floor the cells are read at is the runtime's rather than the map's | 1 case |

**The two survivors were test gaps and both were real.**

The share case divided seventy-five and twenty-five of a hundred, so the bucket
total and the named total were **the same number** — a reading that divided by
the wrong one passed. The denominator only differs where something is withheld,
which is the state this subsystem is mostly in, so the case now withholds a
tenth and asserts that the named shares sum to nine tenths rather than to one.

The tie case listed its two pages in tree-id order to begin with, and
`Array.prototype.sort` is stable — so removing the tie-break left the order
unchanged and the assertion held. The rows now arrive in the other order.

Both were fixed by adding a case, neither by weakening an assertion, and the
second round killed all sixteen. Run after the commit, per the finding of
27 October.

**The double-count case, per this lane's standing rule.** This unit counts, so
the way it would be wrong is counting a page twice or counting it under two keys.
Four cases cover it, and they are the four that killed the most mutants:

- **one page's revisions** in one place are one cell, named once;
- **two forms of one page** in one place are one cell, named once — and a further
  case where neither form clears the floor alone and their sum does, which is the
  case that would silently withhold a page a place reads;
- **the same row handed in twice** doubles the cell *exactly with* the bucket, so
  the shares are unchanged. The map sums whatever it is handed, so a caller that
  concatenated two reads of the store already doubles a bucket; what this asserts
  is that the transpose adds **no second** way to double, which is the only
  double-count it could own;
- **every view is accounted for at both levels** — named plus withheld equals the
  bucket, summed over buckets plus the map's own withheld equals the views there
  were.

**Browser cost: nothing.** `broadcast.ts` is byte-identical to `main` — `git
diff origin/main` on that file is empty — and the bundle measures **6,513 bytes**
minified and 2,982 gzipped, the same number as the last seven runs.
`browser-weight.test.ts` still reports no package in the broadcaster's import
graph. `region-pages.ts` is server-side, reaches no store, clock or DOM, and
imports nothing but `region.ts`, `closed-set.ts` and two types.

## Open questions

**Nothing blocking.** Four, and three are not new.

1. **#706 / `0308`** is six days old and unchanged: one reading of one clause,
   one member on two unions, one line in a switch. Recommendation: read it and
   say yes or no — it is the cheapest it will ever be, and it is the only thing
   holding that branch.
2. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so its notice
   publishes the weaker sentence and §60's verdict reads `unpromised` on every
   run. Recommendation: set it to the cron's real interval when the cron is
   scheduled — one environment variable, and the same number the stall check
   wants.
3. **Still nothing draws any of this**, fifteen runs running. Thirty-nine
   readings, nine comparisons, one assembly, one context — and not one of them is
   on a screen. `Loom portal` is paused, so this is the maintainer's rather than
   a lane's. It is worth saying what is specifically true of this one: the region
   map is the reading the maintainer asked for by name, and the transpose is the
   question he would ask of it next.
4. **Whether `unattributable` wants a number beside it on a screen.** A place
   whose attribution is entirely withheld publishes its bucket total and a count
   of the pages it could not name, which is enough to say *your four hundred
   German readers are spread over eleven pages and none has twenty-five of
   them.* Whether that sentence is useful or dispiriting is a judgement about a
   screen rather than about a counter. Recommendation: leave it to whoever draws
   it; nothing is missing from the reading.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and nothing
was built toward it.** The transpose is the opposite direction of travel: it takes
a counter that already refuses to be per-person and makes the *refusal* finer —
a cell is withheld at exactly the point where a place and a page together would
start to describe somebody. The rows it reads carry no view key, no address and
no digest of one, and the reading adds no column and no field to any of them.

If identity ever returns as an opt-in, what would change here is the denominator
and not the shape: a per-reader deployment could answer *how many distinct
readers in this place read this page* where this answers *how many page views
began*. That is a second figure beside the first, not a rewrite of it, and it
would need the same cell floor for the same reason.
