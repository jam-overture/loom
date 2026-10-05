# Reader signals — a share of the readers there were, which is the denominator every rate was missing

**Routine:** `Loom signals` · **Date:** 4 October 2026 (second run) · **Branch:**
`signals-08-a-share-of-the-readers-there-were`

## What I completed

**§11 of [`docs/signals.md`](../docs/signals.md): the join between a window's
counters and the exact number of readers that window had.**
`pageReachOf(reading, rows)` in [`src/signals/reach.ts`](../src/signals/reach.ts)
takes a `PageReading` and the page-view rows for the same tree and revision, and
answers, per part, in reading order: *about two hundred of the three hundred and
twenty readers who arrived got as far as the pricing band.*

The two halves of every rate in this subsystem have been one row apart since
3 October and nothing took both. A part's `reached` is a distinct count added
across rollup windows, so it is generous by every visit that straddled one
(0147). The denominator a reading used was the largest `views` any single row
reported — a floor, and it says so. §8 put the exact count in
`loom_reader_page_views`, with `appearances` beside it so that the straddle is
measured rather than bounded, and closed by handing the portal *"an exact
denominator for every rate on the reader screen"*. Nothing joined them, so what
a screen could draw was a count nobody could qualify or a share of a floor.

It is the **fifth** thing taken out of the server-side join rather than
collected. **Nothing was added to a payload, a browser, a column, a store or the
vocabulary**, and the broadcaster was not touched — the diff for
`src/signals/broadcast.ts` and every module it reaches is empty.

Recorded in
[0229](../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md).

### The shape, and why there are two denominators

**The estimate is `reached ÷ appearances`.** Both are summed distinct counts off
the same windows, so the straddle over-count is in the numerator and the
denominator and very nearly divides out. That is 0221's cancellation argument one
level up: a part against its page rather than a part against its neighbour. There
is a test that doubles every rollup window's counting of the same readers and
asserts the share and the headcount do not move.

**The ceiling is `reached ÷ opened`, held at 1.** The openings are exact and
cannot be inflated by a window boundary, and `reached` is at least the number of
readers who really got there, so the true share is at or below it. For a part
nearly everybody reaches it is 1 and says nothing — a root is in the viewport of
every page view, so where any visit spanned two windows its `reached` is above
the openings on its own. **That is the ordinary state and not a fault**, which is
exactly why §9 refused this denominator for a fall between two siblings; the
refusal stands and this record extends 0221 rather than revising it.

**The gap between the two is the straddle.** It closes to nothing where nobody's
visit spanned two windows, and `exact` says so. That is the first time the one
control a deployment has over this error — the rollup window's length — can be
checked against a number after it is turned. 0147 named a control nothing could
evaluate afterwards.

**The headcount is the sentence.** `readers` is `reached × opened ÷ appearances`:
the estimate at the exact arrival count. One lovely property falls out rather
than being computed — a root's headcount comes back as the arrival count itself,
because the root is reached by every view and the denominator carries the same
over-count as the numerator. There is a test for it.

## Decisions I took that the step did not specify

**1. The headcount is one division of two whole numbers, not the share
multiplied back up.** This was a real defect, caught by the invariant test in the
first run: seven readers in a hundred, times a hundred, is `7.000000000000001`,
which is **above the most readers who could have got there** — so the figure
broke its own ceiling by a quadrillionth. The same lesson §10 recorded for the
one-reader threshold, in a different spelling: no float decides how many people
there were. `(reached * opened) / appearances` is exact wherever the counts
divide exactly, and there is a test asserting seven is seven.

**2. The headcount is withheld while any opening is pending, and the share is
not.** Openings a rollup has not folded are readers whose reading nobody has
counted, so projecting the folded rate onto them would answer a question about
people who were never measured. The share stays, because *of the page views we
have counted, half got this far* is a true sentence with its population named.
The cost is that `readers` is `null` in a live deployment between a visit and the
next collection, which is a normal state and is written down as one in the
finding for the portal.

**3. Three silences rather than a null, and the middle one is the find.**
`unmeasured` is no row for the pair. `uncounted` is arrivals with no window
folded yet. **`unopened` is a row with appearances and no openings, which means
the senders are not marking their openings** — every rate on the screen with no
denominator while the counters look perfectly healthy. Nothing else in this
subsystem can say that, and it is exactly what a page running a broadcaster from
before the opening marker shipped looks like.

**4. I narrowed the alarm after building the wrong one.** My first version
flagged a part whose `reached` exceeded the *openings*, which sounds like the
right check and fires on the root of every healthy deployment with any straddle
at all — it would have withheld the headcount on the one part whose headcount is
exactly right. The defensible comparison is `reached` against the
**appearances**: a view that reached a part in a window is a view that appeared
in it, so rows written by the same rollups cannot produce it. What can is node
counters older than the page-view column, which is what an upgraded deployment's
first reading looks like, and it clears itself as old windows expire.

**5. I claimed no floor on the share, and the attempt is in the record's
alternatives.** Subtracting the drift from the reach looks like a provable floor
and is not: it holds only if every page view that opened also appears in some
folded window, and knowing how many *distinct* views signalled at all is the one
quantity that cannot be added across windows — 0147, one more time. So an
estimate and a ceiling, and no floor claimed. I would rather publish two honest
figures than three with one of them quietly assuming its own conclusion.

**6. No page-level total of readers, and the absence is asserted.** One reader
who reached four bands is in four rows. Same decision §10 took, same test.

**7. The two numbers are read through the page-view reading rather than
subtracted again here.** One definition of drift, pending and inflation; a second
would be a second place for them to disagree with the counter they describe.
Tested by asserting the four figures equal `pageViewReadingOf`'s for the same
row.

**8. The counters' own floor is still published.** `countedViews` carries the
number a reading gave on its own, so a deployment can see the difference the join
made rather than being told the old figure was wrong.

## Records

- [0229 — A share of readers is estimated against the appearances and bounded
  against the
  openings](../decisions/0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md),
  **Accepted**. It contradicts nothing. 0221's refusal of the exact denominator
  for a fall is restated and kept; 0147's bound and 0219's measurement are used
  as they stand; 0212's read-time join is where this one lives; nothing on the
  wire, in the browser, in a schema, in a store or in the vocabulary moved.
  **Written as 0226** — 0225 was the highest on `main`, and the four open
  branches checked that day carried no claim on it. #515 claimed 0226 on a
  branch opened eleven minutes earlier and merged first, so `Loom merge`
  renumbered this record to **0229** on 5 October; the note under its header
  records that, and every link and citation of it moved with it.

## Findings

**Filed:**

- **`Loom portal`** — the call, and four things to know: `share` is the figure to
  show and `atMost` is not, `readers` is the sentence and is `null` in the
  ordinary live state, `exact` and `inflation` are the hand-written caveat
  computed, and `unreconciled` is the one state to refuse to draw. Plus the three
  silences, of which `unopened` deserves a screen of its own.
- In the same entry, **their correction to my 4 October entry is accepted**:
  I marked the before-and-after reading *nothing is blocked* and it is blocked,
  because a `PageReading` of an older revision needs that revision's tree and a
  store hands over `head` with no seed, so `replayTree` cannot be called. That is
  `src/store/` and the framework lane's; it was filed on 1 October and #513 is
  the second filing, which is the right number of times. **§11 is unaffected** —
  it reads one revision against its own page views, so it works today with the
  one page a store will give.

**Closed:** none. The one open finding this lane owns is still the `fetch` hole
in `completed` (1 October), which is a question for the maintainer before it is a
unit of work.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, written to a file and the exit
status read in a separate command.

| | this branch |
| --- | --- |
| Runtime suite | **181 files, 3,820 tests, 0 failed** |
| Application suite | **378 files, 6,776 tests, 0 failed** |
| `findings:check` | 997 findings, 0 malformed |
| `prerender:check` | 124 pages, 1,536 junctions, 0 run together |

**17 tests added across one new test file, nothing skipped, nothing weakened.**
The runtime figure differs from `main`'s by exactly that file: I changed no
existing test, and the only other file of mine the suites read is the generated
API reference. (The published surface went to 1,291 exports across 17 entry
points — three new types, `PageReach`, `PartReach` and `ReachSilence`, and three
new values, `pageReachOf`, `REACH_SILENCES` and `describeReachSilence`.)

One thing about running it at all, for the next run's benefit: `pnpm --filter
@loom/app docs:api` fails with *"points at ./dist/index.d.ts, which is not
there"* on a fresh container until `pnpm build` has run. `pnpm verify` builds
first, so the order that works is build, then regenerate, then verify.

### The planted defects, and what went red

Each mutation applied alone to `reach.ts`, the module's suite run, then reverted.
**Fifteen in the table and all fifteen red**; a sixteenth is below, with why it
could not be.

| the mutation | what went red |
| --- | --- |
| the share is taken of the readers who arrived instead of the appearances they were counted in | 4 cases, including *divides the straddle out of the share* |
| the headcount is projected onto the appearances instead of the openings | 4 cases |
| the headcount is the share multiplied back up instead of one division | *never puts the headcount above the most readers who could have got there*, and the whole-number case |
| the ceiling is not held at one | 3 cases |
| the ceiling is taken of the appearances, so it is the estimate twice | 3 cases |
| a headcount is projected while the collection is behind | *withholds the headcount while openings are pending* |
| a headcount is projected off counters that cannot be reconciled | 2 cases |
| the ordinary straddle is reported as counters that cannot be reconciled | 3 cases, including the root's own headcount |
| a reading with no row at all calls itself exact | *says nothing where no page views have been counted* |
| a reading is exact while openings are pending | *withholds the headcount while openings are pending* |
| the silence for a sender that never marks an opening is decided second | *separates a sender that never marks an opening from a revision nobody read* |
| the last row handed in for the revision wins instead of the first | the double-count case |
| rows filed under another revision are read anyway | *drops the rows filed under another revision* |
| the floor the counters gave is replaced by the exact count | *publishes the floor the counters gave on their own* |
| the most readers who could have got there is the reach itself | 2 cases |

**Fifteen mutations, fifteen red — but two went green on the first pass and the
two reasons are different.** Worth saying rather than hiding, because the matrix
is only worth running if the greens are acted on.

1. *Rows filed under another revision are read anyway* passed, because my test
   put the **matching row first** in the array — so a filter that reads row zero
   gets the right answer by luck. The other revision now comes first in that
   fixture, and the mutation goes red.
2. *The same row handed in twice is added* — a sixteenth mutation, and the one
   not in the table — passed because it is **behaviourally inert**, not because a
   guard is missing: the function reads one row's reading rather than the totals,
   so handing `pageViewReadingOf` both rows changes only numbers nothing reads.
   The spelling of that defect that does change the answer is **the last row
   wins**, and my fixture could not catch that one either, because both rows were
   identical. Two reads of one counter taken at different times are what a
   concatenating caller actually hands in, so the fixture is now an earlier and a
   later row, *the last row wins* is in the table, and it goes red.

### The double-count case this lane requires

Two of them. *Counts one revision's readers once when the counter is handed in
twice* is the one above — two reads of the same row, first stands, the fact
reported, as the reading upstream does for a duplicated node. And *has no
page-level total of the readers who got anywhere* asserts the absence of the
field on a page where one reader reached every band, which is exactly when a sum
would report three people.

## Browser cost

**Zero bytes added.** `src/signals/broadcast.ts` and every module it reaches are
untouched, so `browser-weight.test.ts` passes unchanged and the bundle is
byte-identical to `main`'s. Measured on this branch for the record: **6,477 bytes
minified** (esbuild, ESM, bundled from `dist/signals/broadcast.js`), which is the
same figure as the last two runs. Gzipped at `-9` it comes out at 2,956 bytes
against the 2,935 the last run printed from identical input, which is the
compressor invocation and not the code.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated with the
  repository's own `pnpm --filter @loom/app docs:api`.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0149–0154.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md`, the record
and this report.

**No other lane has a branch open on the signal path.** Of the four open pull
requests, #511 is the lessons transcripts, #512 and #513 are the portal's, and
#514 is the demo's. **#513 is the one this run answers**: it is the reader screen
reaching for exactly this arithmetic and writing the caveat by hand.

## The parked door

**Per-reader identity gets no cheaper and no dearer.** Every figure here is a
ratio between two aggregates of one revision, computed at read time and written
nowhere, so there is nothing to unwind.

One thing worth flagging in the direction of keeping the door cheap. The reason
this reading needs two denominators is that its numerator is a *distinct count
that was added*, and the reason it was added is that view keys are thrown away at
the end of a window (rule 2). If identity ever returns as an opt-in, the natural
upgrade is this same function with a real denominator — distinct consenting
readers rather than summed distinct views — at which point the estimate and the
ceiling collapse into one exact figure. Nothing here forecloses that:
`pageReachOf` takes a reading and two integers and does not know where they came
from. **I am not proposing it**; I am saying the shape does not have to be
rebuilt to take it.

## Open questions

**1. The `fetch` hole in `completed` — six days open, and still the only thing in
this lane actually blocked.** A host's form that posts with `fetch` calls
`preventDefault`, so the broadcaster sees a cancelled submit and reports no
completion: a deployment can have conversions and read zero, with nothing
distinguishing that from nobody converting. The only honest fix is a function the
host's own code calls — `completed(node)` on the broadcast handle — because only
the page knows its submission succeeded. Rule 3 refuses measurement as a *prop in
the tree* so that a proposal cannot switch it on; a host's own code is not a
proposal, but that distinction should be written down before anything relies on
it. **Recommendation: allow it, and let me write the distinction into a record
that amends nothing.** One run's work once you say, and if the answer is no I
would rather have the no and close the finding than build around it a fifth time.

Today sharpens it once more. What landed is *two hundred of the three hundred and
twenty readers who arrived got this far* — and the one rate that number exists to
be divided into is the conversion rate, which is the single figure in the
vocabulary with a known hole in it.

**2. What I would do next if you say nothing.** The candidate the last run named
— *the rollup's own exact count of page views begun in a window* — I have looked
at and **will not take**, and the reason is worth a line because it reads like
unfinished work and is not. A rollup cannot count openings: both journals drop
the marker at the door and the contract suite asserts they do, deliberately,
because a raw row that says *this page view began at this moment* is the step
toward a profile §7 refused. The honest version of that question is what §8 and
today's §11 already answer — the over-count measured per revision, and shares in
which it divides out.

So the next candidate is **the funnel read against the same denominator**.
`FunnelPair` answers *of the views that reached A, how many did B to C*, off two
rows, and it is the one reading in this lane that still has no arrival count
behind it — which means the conversion rate a deployment will quote is the figure
with the least qualification on it. It is in code I own and needs nothing from
another lane.

**3. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number. Whether the reader-signal half of `docs/deployment.md` is this
lane's is still one line of your reading; `docs/signals.md` carries the
environment variables meanwhile, and this step added none.
