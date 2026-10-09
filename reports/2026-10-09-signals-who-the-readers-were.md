# Reader signals — who the readers were, before and after

**Routine:** `Loom signals` · **Date:** 2026-10-09 · **Branch:**
`signals-16-who-the-readers-were`

## What I completed

§20 of [`docs/signals.md`](../docs/signals.md): `readershipChangeOf(was, now)`
in [`src/signals/readership.ts`](../src/signals/readership.ts), with
`regionReadingFor` added beside `regionReadingOf` in
[`region.ts`](../src/signals/region.ts), both published from
`@jam-overture/loom/signals` and recorded in
[0247](../decisions/0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md).

**The gap it closes is the one every comparison in this lane has been standing
on.** §10 compares where reading stops, §16 the words a change put in front of
readers, §19 the room a change made to read — and every one of them attributes
what moved to the change. Each is careful about which of its figures is
comparable across two revisions. None of them can see the fact that would make
the whole attribution wrong: **the readers were not the same people.** A page
read by its home market in March and by a conference audience in April got
better or worse for a reason no tree contains, and all three readings would
report the difference as the change's work.

§7 built the only thing Loom knows about who a reader was, on 2 October, and
built it as a map rather than as an answer. **Nothing has ever held two maps
against each other.** So this is the map asked a question — *the two windows
were read by much the same mix of places, so the comparison beside this one is
comparing like with like*, or the other sentence, which is the valuable one.

It is the **eleventh** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary**, and the broadcaster was not touched — measured
rather than asserted, below.

### The fact that decided the shape

A comparison is a **second place a small bucket could be given away**, and the
floor is the whole reason a region may be counted at all (0214).

*This country had forty readers and now has a figure we are withholding* keeps
the letter of the floor and breaks it in substance: it says there are between
one and twenty-four people there, which is narrower than the floor permits and
is a disclosure the single map it came from never made.

So `readershipChangeOf` takes **two `RegionReading`s and never two sets of
rows**, and the property that follows is structural rather than careful: a
figure appears in the comparison only where the floored map it came from already
published it, because the function never sees more. That is a test rather than
an argument — one walks every row of a comparison and requires a withheld
figure wherever the map withheld the bucket, so a figure added here later has to
keep the property or break the test.

**The cost is one conflation and it is deliberate.** A region named before and
unnamed now has either emptied or fallen under the floor, both are `thinned`,
and which is not said. Nought names nobody; one to twenty-four names somebody.

## Decisions I took that were not specified

- **The bucket that names nowhere is compared even where one map has none of
  it**, because it is the one region never withheld — a map without one placed
  every arrival it counted, so its absence is exactly nought rather than a
  withholding. **I built it the other way first and caught it in my own test
  fixture rather than from a red test**, which is worth saying plainly: the
  first version of the proxy-change test wrote an unplaced row of *nought
  views* into the earlier map to make the comparison work, and a store never
  holds such a row. Written the way a store would have it — no row at all — the
  unplaced bucket was `thickened`, carried no share movement of its own, and the
  entire shift was charged to the countries it had drained. The screen would
  have read *your readers in Britain left* on a dropped header. The fixture
  passed; it was the wrong fixture. `unplaced` is now a standing of its own so
  that no surface can call it an audience shift, and the test is written with
  the row absent.
- **`moved` is a floor and `movedAtMost` a ceiling, and a quiet page gets
  `unsettled` rather than a verdict.** The regions one map names and the other
  withholds contribute a term nobody can evaluate; every such term is at least
  nothing, so the sum over the comparable regions is a floor, and the whole
  unaccounted share of both sides is the most the rest can come to. On a
  deployment whose traffic is spread thinner than its floor the two numbers open
  wide, and that is the floor working rather than a fault. The remedy is
  readers, not a smaller floor.
- **The counts are published and the ratio between them is not.** This is the
  one counter in the subsystem that is *exact* — stamped once at the door, never
  recounted, addable across revisions and months — and 0224's refusal of counts
  does not reach it. It is still not a trend, for a worse reason: **a region
  counter has no window.** The row is a running total per revision, so the two
  numbers are a revision live for a month against one live for a day, and any
  growth figure anybody quoted would be a measurement of exposure. `arrivals`
  carries both totals as the weight behind the mix and nothing divides them.
- **No threshold decides what a movement is.** §10 needed a one-reader
  cross-multiplication and §19 needed a counterfactual; a region count is exact,
  so one view of difference is one view of difference. It is the only comparison
  in this subsystem with no threshold inside it, and I would rather say that
  than invent one for symmetry.
- **`READERSHIP_SHIFTED_ABOVE` is a tenth, published and not overridable**,
  which is 0230's split applied: the words a reader gets through in a minute are
  a fact about a page's text and may be replaced, and how much margin a claim
  needs is the framework's promise about its own confidence. A surface wanting a
  different line draws it on `moved`.
- **Six standings and no new silence vocabulary.** Every reason a figure is
  absent here is one of the standings, so a withheld `moved` and a standing
  cannot disagree. That is §18's shape, and it also keeps this branch out of
  `silences.ts`, which #555 is editing — I checked that afterwards rather than
  deciding on it.
- **`regionReadingFor` filters before it floors**, which is a narrower answer
  than a deployment-wide map and is meant to be: the floor bites on a smaller
  bucket per revision, so a quiet page reports more of itself as withheld. It
  also dedupes by region and reports `duplicated`, because the stored counts are
  running totals and adding two reads of one row would double a bucket — the one
  error here that cannot be undone afterwards (0158).
- **I took 0247, not 0244.** 0244 is claimed by #555 (this lane's) **and** by
  #556 (the framework's), 0245 by #548 and 0246 by #557. The next number free of
  `main` is 0244 and taking it would have made a three-way clash out of a
  two-way one, so I took the next free of `main` **and** of every open pull
  request, as this lane did on 6 and 8 October for the same reason.

## Records added

- [0247 — A readership comparison is built from two floored maps, and the mix is
  the only figure that survives having no
  window](../decisions/0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md).
  Accepted. **Nothing superseded.** It reuses 0214's floor and its unplaced
  bucket, 0219's exactness, 0221's ranking rule, 0224's statement about what is
  comparable and 0230's split between a fact and a threshold, and narrows
  nothing any of them said.

## Findings filed

- **For `Loom portal`** — what this makes drawable, which is *not* another row
  on the reader card: `comparability` is the sentence that belongs **above** a
  before-and-after card, `moved` and `movedAtMost` are drawn together or not at
  all, `unplaced` is about the deployment and never its readership, `arrivals`
  is a weight and never a trend, and a `thinned` region is not a region whose
  readers left.
- **For the maintainer** — *this week against last week* is unanswerable for a
  readership, with a recommendation. It is in *Open questions* below.

Nothing closed. The lane's open findings are all owned elsewhere, or are
measurements rather than requests.

## Test numbers

Real, from this branch, and nothing was skipped or weakened.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0**, end to end |
| `src/signals/readership.test.ts` | **25 tests, 25 passed** (new) |
| `src/signals/region.test.ts` | **27 tests, 27 passed** (5 new) |
| `src/signals/` | 27 files, **719 tests, 719 passed** (122 s) |
| Root suite | 196 files, **4,364 tests, 4,364 passed** |
| `apps/loom` | 412 files, **7,385 tests, 7,385 passed** |
| `pnpm findings:check` | 1,076 findings, **0 malformed** |
| `pnpm prerender:check` | 128 pages, 1,586 junctions, **0 run together** |

**30 tests added**, all in this lane's own files. **Nothing failed on the way
and nothing was weakened** — which is unusual enough in this lane's recent
reports to be worth stating rather than implied: the two habits that have cost
the last three runs a red run each, a record number written into a doc comment's
grammar and `reference.generated.json` regenerated before `dist/` was rebuilt,
I checked for deliberately before the first full run. `src/documentation.test.ts`
and the API extraction test both pass on the first attempt.

**I ran `pnpm verify` twice and the second run is the one quoted.** The first
one was started before the last two edits to `readership.ts` and
`readership.test.ts` landed, so its green was green about a tree that is not the
one in the commit. It passed too; it is not the number in the table.

### The double-count test, which the lane's standard requires

Two shapes of double count were available here and both are tested.

**A region counted twice in one map.** The stored counts are running totals per
tree, revision and region, so a caller that concatenates two reads holds the
same row twice — and adding them would double a bucket, which is the error 0158
says cannot be undone. `regionReadingFor` keeps the first row per region and
reports `duplicated`; the test hands it one row three times and asserts the
bucket is 60 rather than 180.

**A region counted twice across the two maps.** One map handed in as both sides
is a readership that did not move. A join that listed a region once per side
would report every country twice and a mix that moved by nothing in twice as
many rows, which is the shape of mistake that looks healthy on a screen. The
test asserts three rows for three regions, three distinct region codes,
`moved: 0`, and arrivals equal on both sides.

There is also no page-wide or deployment-wide total anywhere in the module to
double, which is the third shape and is absent by construction: the one sum it
takes is over shares of one window, and that is `moved`.

## Browser byte cost

**Nothing was added that runs in a browser**, and this is the measurement rather
than the assumption. `broadcast.ts` bundled with esbuild — minified, ESM,
browser platform — from a clean `git archive` of `origin/main` and from this
working tree, both written to the same output path so the gzip header is
identical on both sides:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped (`gzip -9`) | **2,952 bytes** | **2,952 bytes** |

`cmp` reports the two bundles **byte-identical**. `readership.ts` is not in
`broadcast.ts`'s import graph — it is reached only from `src/signals/index.ts`,
which the broadcaster does not import — and its one value import is
`UNKNOWN_REGION` from `region.ts`, which is server-side already.
`browser-weight.test.ts` passes, and its guard is the import walk rather than a
byte threshold, so the walk is what would catch a regression here.

## The door to per-reader identity

**No design choice in this unit makes the parked opt-in any more expensive, and
one of them makes it slightly cheaper.** There is no new column, no new wire
field, and nothing in the module asks who a reader is: a comparison is two
floored maps of page-view counts, and the view keys that produced them were
dropped at the door and never written down.

The cheaper half is worth naming because it is the kind of thing that is hard to
add later. The module's whole disclosure discipline is *a comparison may publish
only what the readings it is built from publish*, and that property is exactly
the one a consent-gated reading would need: an identified reading would be built
from the same shape, and a comparison over it would inherit the rule rather than
need a second one written for it. If per-reader identity ever returns, this
comparison gains a denominator and loses nothing.

## Open questions

One, and it is not blocking. It is filed for you in `FINDINGS.md` as well, with
the same recommendation.

**A readership cannot be asked *this week against last week*.** Every other
comparison this lane has built takes two readings and does not care what makes
them two — two revisions answers *what the change did*, two windows of one
revision answers *this week against last week*, out of the same function. A
readership comparison does not have that property, because a region bucket is
stamped at the door once and the row it lands on is a running total per
revision with no window on it. So the only pair comparable is two revisions,
and even then the two arrival counts are a revision live for a month against one
live for a day.

What is salvaged, and the reason the unit was worth building anyway: the **mix**
survives the missing window and a **count** does not. A composition is roughly
the same over a day and over a month of one audience.

**My recommendation is to leave it open.** Closing it means region counts kept
per period rather than per revision — a column, a key change and a migration of
live counters, which is architectural by this lane's own rule — and three things
argue against spending it now. A per-week bucket is *smaller* than a
per-revision one, so a windowed region counter would make a **quieter** map than
the one a deployment has today, which is the opposite of what somebody asking
for it would expect. It would also be the first aggregate in this subsystem that
grows without bound in time rather than in the size of a deployment's trees,
which is the one place rule 5's retention argument touches a region at all. And
if a trend is what is actually wanted, the cheaper half is two timestamps on the
row that already exists — a revision's first and last arrival, which would let
the counts be read *per day live* without a new key or a migration. Say which
and this lane builds whichever.

## Working beside the other lanes

- **#555 is this lane's own, open, and holds §19** —
  `src/signals/pace-change.ts` and an added member of `SilenceVocabulary`. I did
  not stack on it. This branch takes §20 and touches neither
  `pace-change.ts` nor `silences.ts`, which is the same note §18 carried for
  §17 and §16 carried for §15.
- **One likely conflict in `docs/signals.md`, and it is not small.** Both
  branches insert a new section immediately before *## Still not in scope*, so
  the two inserts land at the same position and git will report it. Resolving it
  is keeping both sections in either order; nothing in §20 depends on §19 and
  nothing in §19 mentions §20. I put my row in the *What is already built* table
  two rows above #555's insertion point rather than beside it, so the table
  should merge cleanly, but the table is one region and I would not promise it.
- **`decisions/README.md` and `reference.generated.json` are generated** and
  both branches touch both. Regenerate, never hand-resolve. `pnpm build` first,
  then `pnpm --filter @loom/app docs:api` — in that order, or the committed
  reference is generated from the previous doc comments and drifts against the
  rebuild inside `pnpm verify`.
- **No other open pull request touches `src/signals/`.** I checked all six
  against `origin/main`: #548 and #557 are `Loom primitives`', #553 is the
  portal's, #554 the demo's, #556 the framework's, #555 this lane's.
- **No maintainer comments on any open pull request**, review or issue, at the
  time of writing. Nothing outranked the queue.
