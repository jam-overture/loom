# 0389. A range of hours is folded into its days and into the hours of a reader's day, where the mean is the only comparable figure

**Status:** Accepted
**Date:** 2026-11-10
**Section:** §5 (reader signals), the counters

> **Renumbered on 2026-11-12**, from 0376, by `Loom merge`. `main` had meanwhile
> accepted a different 0376 — *a page's audience rules are an attributed log and
> its forms are rows* (#850) — and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> #850 was opened eleven minutes earlier and merged first, so it keeps the
> number. 0377 to 0380 are on `main` and 0381 to 0388 are claimed by eight open
> branches, which makes 0389 the next free number. Nothing in this record
> changed but its number; references on this branch were updated with it.

## Context

Two counters in this subsystem keep a clock. Page views are counted under the
hour they began in
([0356](0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md)),
and what readers did under the hour they did it in
([0362](0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)).
Both are read over a range as a dense hourly series, and `hourlySeriesOf` in
[`arrivals.ts`](../src/signals/arrivals.ts) spells the honesty rule the two
share once: an hour with no row is a nought that is drawn, an hour before
counting began is not drawn at all, and the hour in progress is marked rather
than drawn as a fall.

**An hour is the unit the counter holds, and it is not the unit a screen can
draw.** [`portal-wireframes.md`](../docs/portal-wireframes.md) *1 · Signals*
offers a range picker of **last 24 hours, 7 days, 30 days** over a bar chart of
page views. The first is 24 bars. The third is **720**, and a surface handed 720
bars either draws them a third of a pixel wide or buckets them itself — and a
surface bucketing them itself is the rule above spelled a third time, in a route
group, by whoever is drawing the chart that week. 0356 and 0362 both put their
fold here for exactly that reason.

**The second fold is a question no counter here has been asked.** A run of hours
says *how many readers arrived, and when* once. Folded the other way — every
09:00 of a range summed together — it says what a reader's day looks like on this
deployment: when they come, and when nobody does. That is two questions an
operator has and cannot ask today: *when are my readers here*, and *when can I
publish a change without anybody reading the page as it moves*.

**And it is the fold with a plausible-false figure in it.** A range is
hour-aligned and almost never a whole number of days, so the hours of the day do
not rest on the same number of days. *Last 7 days* read at 09:30 holds eight
09:00s and seven 03:00s; a shape drawn from the sums says readers come at 09:00,
one eighth of which is that the range holds one more of them. The figure is the
right shape, it moves with the traffic, and it is wrong by a day's worth of one
bar — the failure
[0374](0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)
was written about, arriving from the other direction.

## Decision

**An hourly series is folded two ways, in the lane that reads the counters, and
the hours of the day are compared by a mean rather than by a total.**
`src/signals/rhythm.ts` holds both folds. Each is a pure function of a series a
caller already holds: no store, no clock, no registry, no DOM, nothing added to
any payload, table or browser.

**1. A day is a bucket of its hours, and a day the range or the clock cut short
keeps its count and is marked.** `daySeriesOf` gives a thirty-day range thirty
bars. `DayBucket.hours` says how many of a day's twenty-four the series could
speak for and `DayBucket.whole` whether all of them are present and over, so a
morning nobody has finished arriving in is not drawn like the twenty-nine days
before it. What happened in a partial day happened and is counted: the bar is
marked rather than subtracted, and the sum over the days equals the sum over the
hours it was folded from in every range.

**2. The hours of the day rest on different numbers of days, so the comparable
figure is the mean over the days behind each.** `DayHour.perDay` is the key
`busiestHoursIn` and `quietestHoursIn` rank on; `DayHour.count` and
`DayHour.days` are both published beside it so a screen can say what the mean is
of. `DayShape.even` says whether the raw counts may be compared directly, which
they may only where the range is a whole number of days.

**3. An hour of the day no day could speak for is withheld and never nought.**
*Nobody reads this page at 03:00* and *this range holds no finished 03:00* are
one bar apart on a chart and opposite answers: the first is a measurement, the
second is a range too short or a deployment that began counting this morning. So
`perDay` is absent for the second, as every other reading in this subsystem
withholds rather than zeroes
([0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md),
[0326](0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)),
and **`quietestHoursIn` will not name an unobserved hour**. That is the one way
this reading could recommend a deploy window off the absence of evidence rather
than off evidence of absence.

**4. Only whole hours reach the shape, and what they left out is published.** The
hour in progress holds part of an hour's traffic, so averaging it into its hour
of the day understates that hour by however much of it is left; it is kept out of
both the numerator and the day count. What it held is `DayShape.incomplete`
rather than dropped, so `count + incomplete` is the figure the series publishes
for the range and a screen can say *and forty-one more in the hour you are in*.

**5. Counts add and denominators are distinct.** Both folds take occurrences by
addition and days by distinctness, which is the rule the hourly counters were
built under (0362): an hour handed over twice adds its count twice and is one
hour of one day either way. A denominator that counted a day twice would be a
mean permanently half what it should be, and that is the error
[0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
is about.

**6. The input is a series and not a store's rows, and the type is what says
so.** A row of either hourly table names a tree, a revision and an audience, so
three rows can name one hour; only a series has been through the fold that makes
an hour unique. `whole` is the field no row carries and every series does, so
handing the rows in does not typecheck.

**7. The offset is whole hours from UTC, published back, and is not a time
zone.** Both counters bucket by UTC hour, so a deployment whose readers are in
one country has its whole day shifted — a nine-o'clock peak in California
arrives here as a 17:00 bar. `RhythmOptions.offsetHours` moves where the day is
cut and what each hour of the day is called, and both readings publish the offset
they were taken at. An hour bucket cannot be divided, so a zone at a half-hour
offset is not nameable from these counters at all, and a zone that observes
summer time is named by one offset or the other and is an hour out for the rest
of the range. A fraction is truncated and an offset beyond a day is taken modulo
one, because neither names a zone and both would otherwise move a bar's label by
a whole day.

## Consequences

- **The range picker the wireframe already offers can be drawn.** *Last 30 days*
  is thirty bars rather than seven hundred and twenty, from a reading the portal
  already fetches, with no second query and no new store method. The chart is
  still the portal's to draw.
- **Two questions are answerable that no counter here could answer**, and both
  are about a deployment's own traffic rather than about any reader: when readers
  are on the site, and when they are not.
- **Nothing reaches a reader's browser.** `broadcast.ts` and its import graph
  hold no file this touches, no payload field is added, and no new kind is
  proposed: rule 6's five kinds are untouched. The bundle measures what it
  measures on `main`.
- **No new table, no migration, nothing stored.** Both folds are read-time, so a
  deployment that upgrades can draw a month of days over hours it counted before
  this existed.
- **No floor, and the reason is not the region's reason.** A region bucket is
  kept only above a view floor
  ([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md))
  because a place and a handful of views is a person. Neither fold narrows
  anything the hourly series does not already narrow — the shape is strictly
  coarser than the series it folds, twenty-four buckets where the series
  published seven hundred and twenty — and no bucket here names anywhere or
  anybody. A floor would withhold a figure already published hour by hour.
- **Sixteen new names on `@jam-overture/loom/signals`**, which is the widest
  door in the package. Filed for `Loom docs` rather than written here.
- **Per-reader identity is no closer and no further.** A fold of counts against a
  clock holds no key, no address and no join that would need one.

## Alternatives considered

**Bucketing in the surface that draws the chart.** The portal holds the hourly
series and could group it in the component. Rejected: it is the third spelling of
`hourlySeriesOf`'s rule, in a route group, and the two folds here each have a
figure that is wrong in a plausible direction if the rule is spelled slightly
differently. 0356 and 0362 both put the fold in this lane; this follows them.

**Ranking the hours of the day by their totals.** Simpler, one fewer field, and
right whenever the range is a whole number of days. Rejected: ranges are
hour-aligned and almost never that, so the totals rank the hours by where the
range happened to end. The mutation that makes this change survived the first
sweep of this module's tests, which is the evidence that it is invisible rather
than obviously wrong; the test that kills it is the one holding an hour with one
busy day above an hour with two quieter ones.

**Drawing an unobserved hour of the day as nought.** Every bar present, no
absent figure for a caller to handle. Rejected under clause 3: it is the lie this
reading would be most costly for, because the deploy-window question reads the
quiet end of the chart.

**Dropping what a partial hour or a partial day held.** It would make every
published figure a figure about whole buckets only. Rejected for the day series,
where it would stop the days summing to the hours and would tell an operator
nothing arrived this morning; taken for the shape, where an average of a part of
an hour is a different kind of statement, and what is dropped is published
instead.

**A stored table bucketed by hour of the day.** Rejected: it is derivable from
rows that already exist, so it would cost every delivery a write to learn
nothing new — and it would fix the offset at write time, which is the choice 0356
refused when it declined to store one. A second table would also have to be
exact against the first for ever (0158).

**A time zone rather than a fixed offset.** Rejected: it needs a zone database
and summer-time arithmetic to place a bucket, and the counters are hour buckets,
so a zone at a half-hour offset could not be named however much machinery was
behind it. The offset is published back so a screen cannot claim a zone it was
not given.

**A third fold by the day of the week.** The same machinery with a different
modulus, and the next question after these two. Not built: a thirty-day range
holds four or five of each weekday, so it needs the same unevenness rule and the
same withholding, and nothing on any wireframe asks for it yet. A fold nobody
draws is dead code.
