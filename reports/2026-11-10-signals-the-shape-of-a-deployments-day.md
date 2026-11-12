# The shape of a deployment's day

**`Loom signals`, 10 November 2026, morning run.**
Branch `signals-82-the-shape-of-a-deployments-day`. Record
[0389](../decisions/0389-a-range-of-hours-is-folded-into-its-days-and-into-the-hours-of-a-readers-day-where-the-mean-is-the-only-comparable-figure.md),
`Accepted`. `pnpm verify` **EXIT=0**, read out of a file in its own command, on
the committed tree. Pull request
[#851](https://github.com/jam-overture/loom/pull/851); preview
<https://loom-git-signals-82-the-shap-0df26d-jpizzolato36-6341s-projects.vercel.app>,
which Vercel reported `Building` as this was written — nothing in the change
reaches the site, and this session's network policy does not reach
`*.vercel.app`, so the deployment's own status is the evidence rather than a
fetch of the page.

## What this run completed

**Two counters in this subsystem keep a clock, and an hour is not the unit a
screen can draw.** Page views are counted under the hour they began in (0356)
and what readers did under the hour they did it in (0362). Both are read over a
range as a dense hourly series. `portal-wireframes.md` *1 · Signals* offers a
range picker of **last 24 hours, 7 days, 30 days** over a bar chart of page
views: the first is 24 bars and **the third is 720**.

`src/signals/rhythm.ts` folds a series two ways. Both folds are pure functions of
a reading a caller already holds — no store, no clock, no registry, no DOM, no
new table, nothing added to any payload, and nothing that reaches a browser.

| | |
| --- | --- |
| `daySeriesOf` | the same range as one bar per day: thirty rather than seven hundred and twenty |
| `dayShapeOf` | twenty-four bars whatever the range — **what a reader's day looks like on this deployment** |
| `busiestHoursIn` / `quietestHoursIn` | *your readers are here at 09:00*, and the hours a change could go out in |

with `arrivalDaysOf`, `actedDaysOf`, `arrivalDayShapeOf` and `actedDayShapeOf`
as the four wrappers, so no surface writes the accessor for which number on an
hour it is counting.

**The second fold is a question no counter here had been asked.** A run of hours
says *how many readers arrived, and when*, once. Every 09:00 of a range summed
together says when readers are on the site and when nobody is — which is two
things an operator has no way to ask today, and the second of them (*when can a
change go out without anybody reading the page as it moves*) is a question this
product is unusually entitled to answer, since publishing a change is what it
does.

**The mean per day is the key, and the totals are the plausible-false figure.**
A range is hour-aligned and almost never a whole number of days, so the hours of
the day do not rest on the same number of days: *last 7 days* read at 09:30 holds
eight 09:00s and seven 03:00s, and a shape drawn from the sums says readers come
at 09:00, one eighth of which is that the range holds one more of them. So
`DayHour.perDay` is what the two orders rank on, `days` and `count` are published
beside it, and `DayShape.even` says whether the raw counts may be compared at all
— which they may only on a range that is a whole number of days.

**An hour of the day no day could speak for is withheld and never nought.**
*Nobody reads this page at 03:00* and *this range holds no finished 03:00* are one
bar apart on a chart and opposite answers. `quietestHoursIn` will not name an
unobserved hour, which is the one way this reading could recommend a deploy window
off the absence of evidence rather than off evidence of absence. An **observed**
nought is a real answer and is named.

**The arithmetic closes in both directions, and that is asserted rather than
argued.** A partial day keeps its count and is marked (`hours`, `whole`), so the
days sum to the hours in every range. The shape leaves a partial hour out of both
the mean and the day count and publishes what it held as `incomplete`, so
`count + incomplete` is the figure the series publishes for the range.

## Decisions I took that were not specified

**Building this rather than the narrower entry point.** The highest-leverage item
in `FINDINGS.md` for this lane looked like the 7 November request to publish
narrow doors onto `src/signals/`, filed because the documentation cap was six
days from turning the merge gate red for four surfaces. **That deadline is
gone**: `weight.ts` measured the heaviest generated page at 264,650 of 600,000 on
the afternoon of 8 November — 275,350 bytes of headroom, six weeks rather than
four days — after the documentation lane stopped publishing a declaration's
commentary under its first paragraph. The entry's own closing paragraph asks for
exactly the restraint that follows: *"please do not take a test's deadline as a
reason to publish a door you would not otherwise publish."* So the entry is
updated with the measurement, left open on its merits, and says what a run whose
unit is the door would have to do (the intake path is the candidate, with the
import graph measured either side of it). It is not a corner of a run that was
adding a reading.

**Two folds in one module rather than two units.** They are one rule applied
twice — dense buckets, `begins` clipping inherited, partial buckets marked rather
than dropped, denominators distinct — and `hourlySeriesOf`'s own documentation
argues that two spellings of that rule are two chances for a chart to claim a
quiet week. A second run writing the second fold would have read whichever
spelling it read last (0218, 0235 are the two instances of that in this
subsystem).

**Folding the series rather than re-reading the rows.** The input is a *series*,
which has already been through `hourlySeriesOf` — so the clipping, the density and
the `whole` marking are inherited rather than restated, and the honesty rule has
one home. It also makes the dangerous mistake unexpressible: a row of either
hourly table names a tree, a revision and an audience, so three rows can name one
hour, and `whole` is the field no row carries and every series does. Handing the
rows in does not typecheck.

**Whole hours of offset rather than a time zone.** A zone needs a database and
summer-time arithmetic, and the counters are hour buckets, so a half-hour zone is
not nameable from them however much machinery sat behind it. Both readings
publish the offset they were taken at, a fraction is truncated, and an offset
beyond a day is taken modulo one — because neither names a zone and both would
otherwise move a bar's label by a whole day. **Which offset a project's screen
draws is configuration**, so it is filed for the portal rather than decided here.

**No floor, and the reason is not the region counter's reason.** A region bucket
is kept only above a view floor (0214) because a place and a handful of views is a
person. Neither fold narrows anything the hourly series does not already narrow,
both are strictly coarser than it — twenty-four buckets where the series
published seven hundred and twenty — and no bucket here names anywhere or
anybody. A floor would withhold a figure that is already published hour by hour.

**No day-of-week fold.** The same machinery with a different modulus and the
obvious next question; a thirty-day range holds four or five of each weekday, so
it needs the same unevenness rule and the same withholding. Nothing on a
wireframe asks for it, and a fold nobody draws is dead code. Named in the plan's
*what is left* rather than built.

## Records added

**0389**, `Accepted` — *a range of hours is folded into its days and into the
hours of a reader's day, where the mean is the only comparable figure.* Seven
clauses, seven rejected alternatives. It contradicts no accepted record and
touches neither the tree schema nor the delta model, so it is not architectural.

**Written as 0376, and renumbered to 0389 by `Loom merge` on 12 November.**
When this branch was cut `main` carried 0374 as its highest; **0375 was claimed
by two open branches at once** (#847 and #848) and 0371 by #834, so 0376 looked
free from here. #850 claimed it eleven minutes earlier on a branch this one
could not see, and merged first, so it keeps the number (0097). 0377 to 0380
have since landed on `main` and 0381 to 0388 are claimed by eight open branches,
which made 0389 the next free number.

## Real test numbers

`pnpm install && pnpm verify` — **EXIT=0**, read out of `verify2.exit` in its own
command rather than from a harness notice, which is worth repeating: **the
harness's completion notice for the first gate run said exit code 0 and the file
said `EXIT=2`.** The failure was real and mine (below).

| | files | tests |
| --- | --- | --- |
| framework and tools | 277 | **6,765** |
| application | 471 | **7,526** |

**14,291 pass. Nothing failed, nothing was skipped, no test was weakened, and no
existing assertion changed its claim in this lane or any other.**

- **+25 tests, +1 file**, measured against `origin/main` over the same scope
  (`vitest run src/`): **249 files and 6,119 tests become 250 and 6,144.** All 25
  are the new `src/signals/rhythm.test.ts`; no existing test file changed.
- The baseline was taken in a worktree of `origin/main` where `dist.smoke.test.ts`
  and two `src/cli/` files fail or do not collect, because that worktree has no
  built package. 6,112 collected there plus the 7 the two uncollected files hold
  is the 6,119 above, which is also the figure #848 measured yesterday.

**One red on the way, and it is the same red §81 reported yesterday.** `pnpm
verify` went to `EXIT=2` at `tsc`: the duplicate-hour fixture was handed to
`actedDaysOf`, which takes a whole `ActedSeries` and so wants a `count` the
fixture had no reason to carry. **Twenty-five tests had passed under `vitest`
minutes earlier, because `vitest` does not typecheck.** The fix is better than the
fixture was: that case now goes through the generic `daySeriesOf` and
`dayShapeOf`, which is what it is actually about.

### Mutations

**19 run, 19 killed.** Each was applied to `src/signals/rhythm.ts` alone and
judged against `rhythm.test.ts`. **One survived the first pass, it was a real gap,
and it was the gap that matters most**; the numbers below are the second run's.

| | mutation | tests failed |
| --- | --- | --- |
| 1 | the day is cut in UTC whatever the offset | 1 |
| 2 | the hours of the day are named in UTC whatever the offset | 1 |
| 3 | the offset is taken as given, fractions and all | 1 |
| 4 | the hour in progress is averaged into its hour of the day | 2 |
| 5 | an hour of the day no day could speak for reads nought | 5 |
| 6 | the mean is over the shape's days rather than the hour's | 2 |
| 7 | a day is counted once per hour behind an hour of the day | 1 |
| 8 | a day's hours are counted once per row rather than once each | 1 |
| 9 | a day the range or the clock cut short is left out | 1 |
| 10 | a day is whole once all twenty-four of its hours are present | 1 |
| 11 | the day series drops what an unfinished hour held | 1 |
| 12 | what the shape left out is not published | 2 |
| 13 | the hours are even when their counts match rather than their days | 1 |
| 14 | a range with nothing finished in it reads as never counted | 1 |
| 15 | an hour of the day nothing was observed in may be called quiet | 2 |
| 16 | the hours are ranked by their total rather than by the mean per day | **1 — was 0** |
| 17 | a tie between two hours goes to the later one | 1 |
| 18 | the days of a series are not put in order | 6 |
| 19 | a request for fewer hours than none is not clamped | 1 |

**16 is the one that survived, and it is the whole argument of the record.**
Ranking the hours of the day by their totals is the plausible-false order, and
every fixture I had written the ranking against was a range of a whole number of
days — where the totals and the means agree, so the wrong key is invisible. The
test that kills it now holds **an hour with one busy day above an hour with two
quieter ones**: 09:00 with two days of ten each (`perDay` 10) against 10:00 with
one day of fifteen (`perDay` 15), where the totals would rank them the other way
round. That the mutation had to be run to find this is the point — the key was
chosen for the right reason and asserted against a fixture that could not tell.

**7, 8 and the pair behind them are the double-count guard this lane requires.**
An hour handed over twice adds its count twice — occurrences add — and is one hour
of one day in every denominator: `DayBucket.hours`, `DayShape.days` and the day
count behind `perDay`. A denominator that counted a day twice would be a mean
permanently half what it should be, which is 0158's error in a new place.

## What a browser pays

**Nothing.** `src/signals/rhythm.ts` is server-side, pure, and imported by
nothing a browser loads; no file in `broadcast.ts`' import graph is in this
branch. Measured through the gate's own bundler and `gzipSync`: **7,543 bytes
minified, 3,350 gzipped** — what `main` measures, to the byte, and what the table
at the top of `docs/signals.md` already says.

## Findings filed and closed

**Filed for `Loom portal`:** the thirty-day range the picker already offers can
be drawn by day, and the day shape is a second chart in the same reading. With
the three rules a screen has to hold (draw `perDay` and never `count`; an hour
with no `perDay` is not a quiet hour; a `whole: false` bar is the range's edge and
not a quiet Sunday) and the one thing the reading cannot decide, which is the
offset.

**Filed for `Loom docs`:** sixteen new names on `@jam-overture/loom/signals` with
no prose, with the paragraph written to be lifted. **It is the fourth entry asking
for a paragraph on the same page** — 8 November's seven names, 9 November's five,
#848's eight and these sixteen — and one paragraph answers all four.

**Closed:** the 7 November entry about the intake status reporting two of a
deployment's three reader windows. **The field landed on `main` on 8 November** in
#816 — `IntakeStatus.kept`, with its doc comment carrying the finding's own
argument, and `docs/deployment.md` gained the key in the same branch — and the
status line was never flipped. Verified on `main` at `24216f47`; nothing was asked
of anybody and nothing was built for it here.

**Filed for this lane:** `DayShapeSilence` is a new silence set and is **not in
`silences.ts`' census** (0240). `unmeasured` would map onto the condition the
other sets already have; `unsettled` — *the range holds buckets and none of them
is finished* — is a statement about a **clock**, and all nineteen members of
`SILENCE_CONDITIONS` are about a window, a row, a vocabulary or a filing rule. A
twentieth is an edit to the closed set 0240's table is published over, which is a
record and a unit of its own rather than a line in this one. Half-registering it
would be worse than leaving it out, by that module's own argument, so it is
written down with the three options and this lane's preference.

**Filed for `Loom daily build`:** the transit mangling ate the **`decisions/`
link** out of #851's body — twice, inline and then bare on a line of its own,
while two shorter bare URLs a line below came through clean. That is the second
of the two triggers the 5 November entry set for raising it, and the first
instance where one body shows both outcomes. Nothing is asked; the remedy is
still to stop rather than to fix, and this run left the mangled link rather than
editing the body a third time.

**Updated, not closed:** the 7 November request for narrower entry points onto
`src/signals/`, with the measurement that removes its deadline and what a run
whose unit is the door would owe.

## Open questions

**Nothing blocking.** Three, all of which can wait.

1. **Which offset should a project's day be drawn at?** The reading takes one and
   publishes it; the counters hold UTC. A deployment whose readers are in one
   country has its whole day shifted by a fixed number of hours, and that number
   is a per-project setting rather than a figure anything can derive — the region
   counter knows where readers are, but *which clock an operator reads their own
   dashboard in* is a preference and not an inference. **Recommend one
   per-project setting**, beside the other intake settings, defaulting to UTC and
   named in the portal rather than guessed from the regions.
2. **Should the day of the week be the third fold?** Same machinery, one more
   question, and the same unevenness rule. **Recommend waiting for a screen to
   ask.**
3. **Is the deploy-window question worth a figure of its own?** *The quietest
   three hours of your readers' day* is a sentence this reading can already say,
   and the thing an operator would actually want is *publish this change at 03:00
   UTC tomorrow* — which is a judgement about a change and a clock, and would
   belong beside the agenda rather than here. **Recommend no for now**, and
   nothing in this record forecloses it.

**Per-reader identity:** nothing here moves toward it or away from it. Both folds
are counts against a clock, with no key, no address and no join that would need
one. Deferred and untouched, as it was.

## Working beside the framework lane

`Loom daily build`'s open branch (#847) does not touch `src/signals/`. **#848 is
this lane's own open branch** and the overlap is worth naming: it adds `unread.ts`
and touches `frontier.ts`, `window-agenda.ts` and `index.ts`; this branch adds
`rhythm.ts` and touches `index.ts`. **The collisions are both textual and both in
files that are lists** — one export line in `src/signals/index.ts`, and the step
appended before *Still not in scope* in `docs/signals.md`, where #848 is §81 and
this is §82. Nothing here reads anything #848 adds, in either order of merging.
`decisions/README.md` and `reference.generated.json` are regenerated, never
hand-resolved.
