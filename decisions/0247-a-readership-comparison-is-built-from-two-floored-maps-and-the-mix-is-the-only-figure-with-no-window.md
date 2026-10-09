# 0247 — A readership comparison is built from two floored maps, and the mix is the only figure that survives having no window

**Status:** Accepted
**Date:** 2026-10-09
**Section:** §4c (reader signals)

## Context

Four readings in this subsystem compare two windows of a page. Where the reading
stops ([0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)),
the words a change put in front of readers
([0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)),
whether readers had time for a part, and — as of the open pull request beside
this one — the room a change made to read in. Each is careful about which of its
figures is comparable across two revisions and each attributes what moved to the
change.

**None of them can see the one thing that would make that attribution wrong: the
readers were not the same people.** A page read by its home market in March and
by a conference audience in April got better or worse for a reason no tree
contains, and every comparison above would report the difference as the change's
work. It is the standing confounder of the whole before-and-after programme, and
until now nothing in the subsystem could even be asked about it.

Region is the only thing Loom knows about who a reader was
([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)),
and it was deliberately built as a map rather than as an answer: buckets of page
views per country per revision, floored so that no bucket is a person, with the
address it was read from never stored. `regionReadingOf` reads one map.
**Nothing held two of them against each other**, which is the question a
comparison needs answered before its own answer means anything.

Three facts about those rows decided the shape, and two of them are
uncomfortable.

**A comparison is a second place a small bucket could be given away.** The floor
promises that no bucket smaller than it is ever named. *This country had forty
readers and now has a figure we are withholding* keeps the letter of that and
breaks it in substance: it says there are between one and twenty-four people
there, which is narrower than the floor permits and is a disclosure the single
map it came from never made.

**A region counter has no window.** Every other counter here is written by a
rollup over a window of the buffer; a region is stamped at the door, once, when
a page view began, and the row is a running total per revision with nothing on
it but an `updatedAt`. So *this week against last week* — which 0224 and 0239
both answer by handing the same function two windows of one revision — **cannot
be asked of a readership at all**, and the two numbers a comparison does have
are a revision that has been live for a month against one that has been live
for a day.

**And the counts are exact**, which is the pleasant surprise and the trap. 0224
refused counts because two revisions are two windows of two trees read by two
sets of readers and nothing divides out. A region count has none of that error:
counted once, never recounted, addable across revisions and months
([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
The exactness is real and it does not make the pair a trend, because what
differs between the two numbers is mostly how long each revision was up.

## Decision

`readershipChangeOf(was, now)` in [`src/signals/readership.ts`](../src/signals/readership.ts)
compares two readerships, and `regionReadingFor(where, rows, options)` in
[`region.ts`](../src/signals/region.ts) picks one revision's rows out of a
window of them so that no caller writes the filter twice.

**It takes two readings and never two sets of rows, and that is the whole
privacy design.** A figure appears in the comparison only where the floored map
it came from already published it, which is structural rather than careful: the
function never sees more than the two maps disclose. The cost is one conflation
and it is accepted — a region named before and unnamed now has either emptied or
fallen under the floor, both are `thinned`, and which is not said. Nought names
nobody; one to twenty-four names somebody.

**The bucket that names nowhere is the one exception, because it is never
withheld.** A map without an unplaced bucket was written by a platform that
placed every arrival it counted, so its absence is exactly nought and it is
compared like a published figure. Without that exception the commonest
measurement fault this exists to catch would be reported as its opposite: a
proxy that stops writing the header fills a bucket that was not there before, so
the unplaced share would carry no movement of its own and the whole shift would
be charged to the countries it drained.

**The figure is the mix, as a floor and a ceiling.** `moved` is half the sum of
the absolute share movements over the regions both maps name — the share of
readers who would have to be somewhere else for the two windows to have the same
composition. It is a floor, because the regions one map names and the other
withholds contribute a term nobody can evaluate and every such term is at least
nothing. `movedAtMost` adds the whole unaccounted share of both sides, which is
the most those terms can come to. Where the floor withholds little the two are
nearly one number; where a page is quiet they open wide, and that is reported as
`unsettled` rather than as a verdict.

`READERSHIP_SHIFTED_ABOVE` is a tenth, published and **not** overridable, for
the reason the pace thresholds are not
([0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md),
[0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)):
how much margin a claim needs is the framework's promise about its own
confidence. A surface wanting a different line draws it on `moved`, which is
published for exactly that.

**The counts are published and the ratio between them is not.** `arrivals`
carries both totals, because the weight behind a mix is worth seeing — *this
moved among six hundred readers rather than six* — and no growth figure is
published at all, because the one anybody would quote would be a measurement of
how long each revision had been up. The mix survives the missing window and a
count does not: a composition is roughly the same over a day and over a month of
one audience.

**Six standings and no silence vocabulary.** `like-for-like`, `shifted`,
`unplaced`, `unsettled`, `unmeasured` and `incomparable` carry every reason a
figure is absent, so a withheld `moved` and a standing cannot disagree — which
is the shape 0242 chose and is why the silence mapping has sets to map rather
than one more.

**Two maps floored differently compare nothing.** A bucket named at one floor and
withheld at another is an artefact of the two floors rather than a movement of
readers, and every figure built on it would inherit that. The standing says so
and the rows are withheld with the figures.

Nothing is added to a payload, a browser, a column, a store or the vocabulary of
kinds. It is the eleventh thing taken out of what this subsystem already knows
rather than collected.

## Consequences

**Every before-and-after reading now has a confounder check beside it**, and the
check is cheap: two region reads of the same revisions the comparison used. A
surface drawing *readers get further since the change* can say whether it was
the same readers, and a model told *this band lost readers* can be told that the
audience moved instead.

**A readership comparison is answerable on a page with traffic and says so on a
page without.** A per-revision map is floored harder than a deployment-wide one,
because the floor bites on a smaller bucket, so a quiet deployment will read
`unsettled` and be right to. The remedy is readers, not a smaller floor, and the
floor stays raise-only.

**`this week against last week` is unanswerable for a readership**, and this is
the first asymmetry in the subsystem where a question the other comparisons
answer has no answer here at all. Closing it means a windowed region counter —
rows per period rather than per revision — which is a column and a migration,
and it is a question rather than a plan. Stated here so that the absence is a
known limit rather than a gap somebody later reads as an oversight.

**`moved` and `movedAtMost` can be far apart, and a surface must draw both or
neither.** Drawing the floor alone understates a quiet deployment's movement by
however much its floor is holding; drawing the ceiling alone makes every quiet
page look like a different audience. The standing is what a card leads with and
the pair is what it shows.

**The disclosure surface is unchanged.** The comparison publishes a subset of
what the two maps it is built from publish, which is asserted rather than
argued: a test walks every row and requires a withheld figure wherever the map
withheld the bucket. A future figure added here has to keep that property or
break that test.

**No threshold decides what a movement is.** The one-reader cross-multiplication
0224 needed, and the counterfactual the pace comparison needed, have nothing to
do here: the counter is exact, so one view of difference is one view of
difference. It is the only comparison in this subsystem with no threshold inside
it.

## Alternatives considered

**Take two sets of rows and floor inside the comparison.** The obvious shape,
and it is the leak. Holding both sides unfloored makes *named here, withheld
there* available and tempting, and the one thing standing between the subsystem
and a bucket of three readers being locatable would be that nobody wrote the
line. Two readings in makes it unavailable.

**Tell an emptied bucket from one that fell under the floor.** Rejected for the
same reason, in two words instead of a number. It is also the figure a person
would most want, which is why the refusal is written down rather than left to
taste.

**Normalise shares over the named buckets so they sum to 1.** Rejected: a window
whose traffic is mostly under the floor would then report a complete-looking
picture of a fraction of itself, and the unaccounted share — which is the bound
on everything else here — would be arithmetically invisible.

**Publish a growth ratio beside the arrivals.** Rejected on the window. Every
reading of it would be a statement about exposure wearing a statement about
readership, and it is exactly the mistake 0224 refused for counts, available
here in a form made more plausible by the counter being exact.

**Report the mix as one number, the way a comparison of shares does.** Rejected:
a single number off a floored map is a floor pretending to be a measurement, and
on a quiet deployment it would be badly low with nothing beside it to say so.
The pair costs one field and makes the quiet case honest.

**Make `READERSHIP_SHIFTED_ABOVE` configuration.** Rejected, consistent with
0230's split: the reading rate is a fact about a page's text and may be
replaced, and a threshold is the framework's statement of how much margin a
claim needs. A deployment that disagrees has `moved` and may draw its own line.

**Leave the unplaced bucket out of the mix.** Considered, because a swing in it
is not a fact about readers. Rejected: its views are a share of the window and
leaving them out would make the shares of a comparison stop accounting for the
arrivals there were. It is in, and `unplaced` is a standing of its own so that a
surface never calls it an audience shift.
