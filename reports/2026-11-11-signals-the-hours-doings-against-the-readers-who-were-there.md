# Reader signals, 11 November 2026 — the hour's doings, against the readers who were there

**Branch:** `signals-84-the-rate-by-the-hour-readers-acted-in`
**Lane:** `Loom signals` · `src/signals/`, the intake, `docs/signals.md`
**Records added:** 0395 (`Accepted`), 0396 (`Proposed` — **ARCHITECTURAL, needs
review**)
**`pnpm verify`:** EXIT=0

## What this run completed

`actedSeriesOf` has drawn *nine presses at eleven o'clock* since 6 November.
Whether that is a good hour or a bad one was not in the bar: nine presses out of
twenty page views and nine out of five hundred are the same height. The figure
that tells them apart is a denominator per hour, and
[0362](../decisions/0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)
clause 9 refused one — for a reason that is real and that this lane wrote down
the same evening it landed. The numerator counts what readers **did** in an hour
and the denominator counts page views that **began** in one, so a reader who
arrived at 10:59 and pressed at 11:01 is in the eleven o'clock numerator and the
ten o'clock denominator. Over a month that error is two page views; over an hour
it is the whole of the figure, and it fails in the worst direction, because *a
press with no arrival* divides by nothing.

That finding also said what the honest shape would be if a per-hour figure were
ever wanted — **not a quotient per bucket but a rolling denominator**, the page
views of the hour and the hour before, which is where a page view that straddles
the boundary actually was — and named the test to write first. Both are done.

**`actedAgainstOf` in `src/signals/acted.ts`** pairs each hour of an acted series
with the page views of that hour and the hour before it. `ActedAgainst` and
`ActedAgainstHour` are the shape;
[0395](../decisions/0395-an-hours-denominator-is-the-page-views-of-that-hour-and-the-one-before-published-beside-the-count-and-never-summed.md)
is the record. Four things in it are the design rather than the arithmetic:

- **The boundary error goes inside the window.** An hour with five presses and
  no arrivals of its own is now five against the twenty readers who came in the
  previous hour, rather than five presses from nobody.
- **The denominators are never added up and there is no total to add.** Every
  page view is in two hours' windows on purpose, so a sum of them over a day is
  about twice the day's page views. `ActedAgainst` publishes no denominator
  total. The numerator still sums, because occurrences add (0368), and that
  asymmetry is why this is a reading of its own rather than two more fields on
  `ActedSeries`: a counter that adds and a counter that must never be added, on
  one row, with nothing distinguishing them, is one surface away from publishing
  a deployment at twice its size.
- **A denominator the reading cannot speak for is withheld, never nought.**
  `views` is `number | null`. `0` is a real nought — both hours were counted and
  nobody came. `null` is the earlier hour being one the arrivals series does not
  reach, which is the first hour of any range and every hour before page views
  were first counted.
- **It pairs two readings, not two stores.** The guarantee it needs is the one
  `readReaderActedRate` already makes — one range, taken once, into both halves
  — so `ActedRateReading` gains `against` and a screen holds one answer about
  one range from one call, with no second read. Handed two series a caller
  assembled over different ranges, every unreachable hour is withheld rather
  than divided by what was never read: a mismatch degrades to a pair the reading
  will not speak for, never to a number nobody can tell is wrong by looking at
  it.

## The decision I did not take, and why

**0362 clause 9 says, in as many words, that the rate is "taken once, over the
range, and never per hour", and its own alternatives section rejected "a rate
per hour" on that clause.** The *reason* it gave is answered by the rolling
window. The clause as written is not.

Under this lane's standing instruction that is ARCHITECTURAL, so
[0396](../decisions/0396-an-hourly-rate-is-the-quotient-of-the-rolling-pair.md)
is `Proposed`, **nothing implements it**, and nothing is marked superseded. What
I built is the half that clause 9 permits — hourly counts, and a denominator
published beside them rather than divided into them. What I left out is the
division: `ActedAgainstHour` has no `per100`, and `ActedRate`'s single quotient
over the range is untouched.

If 0396 is accepted the work is **one line and four tests** — the division and
the four withholdings. No stored column, no payload field, no browser byte,
nothing to migrate.

**The thing worth your eye**, and it is in both the record and the finding: the
pair being published means a surface *can* divide the two numbers itself today,
with no record and none of the withholdings a reading would guarantee. I decided
that was better said out loud than avoided by withholding the denominator too —
the denominator is the honest half, and a screen that cannot get it draws the
ambiguous bar instead.

## Real test numbers

`pnpm install && pnpm verify` — **EXIT=0** on the committed tree.

| | files | tests |
| --- | --- | --- |
| framework (`vitest run`) | 280 | **6,832** |
| application (`@loom/app`) | 473 | **7,622** |

That is **+11 tests and no new file** over `main` on the same scope (`main` is
280/6,821 and 473/7,622 — the application figure is unchanged because the only
file it gained is the regenerated reference). Nothing was skipped, nothing
weakened, and nothing failed at any point in this run.

`pnpm findings:check` reports **1,510 findings, 0 malformed**. `pnpm
reports:check` reports 2,205 visuals, 153.0 MB, none over 1.1 MB.
`pnpm prerender:check` reports 139 pages, 2,062 junctions, 0 run together.

**Five mutations run by hand against the new reading, five killed:**

| mutation | result |
| --- | --- |
| drop the earlier hour from the window (`here + before` → `here`) | 5 tests failed |
| treat an unreachable earlier hour as nought (`before ?? 0`) | 5 tests failed |
| roll the window forward instead of back (`hour + ARRIVAL_HOUR_MS`) | 6 tests failed |
| publish a total denominator on `ActedAgainst` | 1 test failed |
| drop the hour-in-progress mark (`whole: true`) | 1 test failed |

The second and fourth are the two this lane owes anything that counts. The
fourth is the double-count test 0395 clause 2 is about: twelve hours of ten page
views each sum to **220** across the pairs and **120** across the range, and the
reading is held to carrying the first figure nowhere.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` and its import graph are
untouched. Measured on this branch: **7,543 bytes minified, 3,350 gzipped**,
against ceilings of 8,000 and 3,600 — which is `main`'s figure to the byte.

## The names index: 97 bytes left

This unit publishes three names — `ActedAgainst`, `ActedAgainstHour`,
`actedAgainstOf` — and `searchNames()` measures **39,903 of 40,000**, up from
`main`'s 39,852. Gzipped it is 11,161 of 12,000 and the per-entry average is
19.04 of 24, so the raw cap is the only one near. **The gate is green on this
branch.**

It is worth saying plainly that **97 bytes is less than one unit of any lane's
ordinary work.** #851 is held on this exact number (16 names, 241 bytes, 93
over). This unit fits because it happens to publish three names, and I will not
pretend that choosing a unit by what it spends on a documentation budget is a
sound way to pick work. Nothing new is argued here — `Loom merge`'s four options
on #851 stand and this lane's preference is still to narrow what reaches the
index — but the margin is now small enough that the next pull request from any
lane could take the gate red for all four surfaces.

## Records added

- **0395** — *An hour's denominator is the page views of that hour and the one
  before, published beside the count and never summed.* `Accepted`. Seven
  clauses, four alternatives recorded including the two that would have been
  cheaper and wrong.
- **0396** — *An hourly rate is the quotient of the rolling pair.* `Proposed` —
  **ARCHITECTURAL, needs review**, contradicting 0362 clause 9 and implemented
  nowhere.

0378 is claimed by #855 and 0379 by #854, so this run took the next two numbers
free on `main` **and** on every open branch, which is the practice the last three
runs settled on after 0375 and 0376 each clashed.

## Findings

**Closed** — this lane's own entry of 6 November (evening), *the hourly rate's
numerator and denominator are counted at different moments*, in the half that
was buildable. The rolling denominator it specified is built and the test it
named is written.

**Filed** — three:

1. **The per-hour denominator exists and the division is a `Proposed` record.**
   Owned by `@jonathanbravecredit`, because an accepted clause and a measurement
   now disagree and that is not a lane's to settle.
2. **The first bar of any hourly pair has a count and no denominator**, because
   `readReaderArrivals` draws a series over the range it was asked for and this
   join needs one hour more. Owned by this lane, with the three shapes a future
   run could take and a preference for the third (the reading carrying the rows
   it was already built from — the store is read from the start of the earlier
   period already, so nothing extra is fetched).
3. **Three more names, and 97 bytes left on the names index.** Owned by
   `Loom docs`, with both measurements and the one-line sentence the door's page
   would want.

## Open questions

1. **0396.** Should an hourly rate be published at all, now that the shape its
   refusal was about has a remedy? My recommendation is **yes, as a partial
   supersession of clause 9 and no other clause** — the pair is already
   published, so the division is going to be taken by whichever screen wants it,
   and it is better taken where the four withholdings can be guaranteed than in
   a component. Refusing it is also a defensible end state, and is the one in
   force today.
2. **The first bar.** Worth closing, or worth leaving withheld? My
   recommendation is **leave it until a screen asks** — the withholding is
   correct and the pair is complete from the second bar on, and the remedy
   touches `ArrivalReading`'s published shape, which every chart on the Signals
   screen reads.
3. **The names cap.** Not this lane's to close and already before you on #851.
   My recommendation is unchanged: **narrow what reaches the names index**,
   starting with the sharding the test's own docblock prescribes, which needs no
   product decision.

## Beside the framework lane

`Loom daily build` has #854 open (`tools/sources/deployment.ts`), which does not
touch the signal path. Two of this lane's own branches are open and neither
overlaps this one in code: #851 adds `src/signals/rhythm.ts` and a line to
`src/signals/index.ts`; #855 changes `src/signals/agenda.ts` and
`src/signals/window-agenda.ts`. This branch touches `src/signals/acted.ts` and
its test only. The shared files are the usual four — `docs/signals.md` and
`FINDINGS.md` append, `decisions/README.md` and `reference.generated.json`
regenerate.

**This is a third open branch from this lane rather than a push onto either**,
which is the same departure from *Procedure* step 3 that #855 recorded and for
the same reason: #851 is held on a decision only the maintainer can make, and
#855 is waiting for review. Stacking on either would put a unit that passes the
gate on its own behind someone else's decision. This branch takes §84 and
records 0395 and 0396, so #851's §82 and #855's §83 fit before them untouched.

## Per-reader identity

Nothing in this run moves the parked door either way. A pair here is two counts
about an hour of a revision, with no key, no region and nothing per reader; the
rolling window is arithmetic over two tables and remembers nothing between two
readings. Adding an opt-in identity later would add a table rather than change
this reading.

---

## Postscript, 13 November — what the two days changed

This report is the account of 11 November and the figures above are the ones
measured that day. Two of them went false while the pull request waited, neither
because of anything on this branch, and both are corrected in `docs/signals.md`
and in 0395 rather than rewritten here.

- **The broadcaster bundle is 7,852 minified and 3,458 gzipped**, not 7,543 and
  3,350. #870 spent 309 bytes on 12 November teaching the broadcaster to carry a
  reader's segment (0385). This branch still adds nothing to it: the figure is
  `main`'s, as it was then.
- **The names index is no longer near its cap.** The front-coding in #859 put the
  file at **27,488 of 40,000** with this branch's three names in it — 12,512 of
  headroom, against the 97 this report was written to warn about. The warning was
  right and the remedy landed: the finding filed here is closed on that, and #851
  was unblocked by it rather than by anything argued above.

Two other things the wait changed, neither of them a measurement:

- **The records are 0395 and 0396**, not 0380 and 0381. `main` gave both numbers
  to other records while this waited, and two records sharing a number is fatal
  (0097).
- **The branch had to take `main` in.** Eighteen commits landed under it,
  including §85 through §88 of this plan, and `docs/signals.md` conflicted
  because every one of them appends a step where this one does. Resolved by
  keeping both sides and ordering §84 between §83 and §85, which is where it was
  always going to go — the later runs left the number free.

Re-verified after the merge on 13 November: `pnpm verify` **EXIT=0**, figures in
the pull request comment of that date.
