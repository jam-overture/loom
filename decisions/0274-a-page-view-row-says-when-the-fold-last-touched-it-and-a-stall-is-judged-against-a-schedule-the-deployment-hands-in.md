# 0274 — A page-view row says when the fold last touched it, and a stall is judged against a schedule the deployment hands in

**Status:** Accepted

**Date:** 13 October 2026

**Section:** §4c (reader signals)

## Context

[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
counts a revision's page views from both ends: `opened` at the door, once per
page view that began, and `appearances` by each rollup that saw that page view in
its window. Their difference has two signs. One is `drift`, which is the
over-count in every distinct count stored against the revision
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md))
and is now measured rather than bounded. The other is `pending` — openings no
rollup has folded — and 0219 says plainly what it is: *the other sign of the same
subtraction, and what a stalled collection looks like.*

**It is also what a revision published two minutes ago looks like.** The lag of
the tallies behind the buffer is one window by design
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)),
so a live page always has openings waiting. The discriminator is time, and the
row could not supply it:

- `updated_at` is written by **both** writers. A busy page whose rollup has
  stopped keeps a fresh timestamp on every delivery the door counts, while its
  appearances never move again; a quiet page that is perfectly healthy looks
  stale by the same measure.

So
[0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
published `pending` per page and per deployment and **raised no fault from it**,
recording in its alternatives that a stalled-collection fault was drafted and
dropped — *a fault that fires on the wrong one of those is worse than no fault*
— and that the shape which would answer it is a second timestamp written only by
the fold. That was filed rather than built because it is a column on a live
counter table: a migration, two store implementations and the contract suite.

What it leaves is a deployment whose collection has genuinely stopped. Every
count on every reader card freezes where it was while the door goes on counting
arrivals, every rate reads low by however much reading has happened since, and
the only person who can tell is one who already knows when the cron last ran.

## Decision

**`loom_reader_page_views` gains `folded_at`, written by the fold and by nothing
else**, and `collectionHealthOf` gains a sixth fault, `collection-stalled`,
raised where openings are waiting and the last fold of that revision is older
than a **schedule the caller hands in**.

### The column

`folded_at timestamptz`, nullable and undefaulted, on the one table in this
subsystem written from two sides. The door's upsert leaves it out of its insert
and out of its `set`, which is the whole of what makes it readable: an arrival
must never move it, and a row an arrival creates attests no fold rather than
attesting one at the moment a reader arrived. `apply` stamps it with the same
instant it writes the window's appearances, in the same transaction, so the two
numbers a reading subtracts and the timestamp that explains them cannot disagree.

**Absent is one state and not two.** A row written before the column existed and
a row no fold has touched both read *nothing attests a fold*. There is no
backfill, because the only timestamp those rows carry is the one this record
exists to refuse. Postgres hands `null` back as an absent field so a reading has
one spelling to check rather than two, and the first fold after the migration
fills it in.

### The judgement

`CollectionSchedule` is an optional third argument to `collectionHealthOf`: the
instant the reading is taken, and `foldsWithinMs`, the longest a fold may
honestly be behind. That second number is the deployment's **collection interval
plus its ripeness window** — a batch is not folded until it ripens and then not
until the next run, so the two add — and it is handed in for the reason the
straddle correction is
([0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)):
nothing in Loom schedules a fold. A host calls the collection from a cron, a
deploy hook or by hand, and a framework that supplied a default would fault a
deployment that folds hourly for not folding in ten minutes.

**Four states answer *not stalled* without anything being sound**, and each is a
refusal rather than a gap: no schedule handed in; nothing pending, because a
collection that stopped where nobody is arriving is costing no reader's
measurement anything; no fold attested, which is every row of an upgraded
deployment until its next run; and a `foldsWithinMs` that is not a positive,
finite number of milliseconds, because a nought allowance would turn the lag the
design *requires* into a fault on every live page. A fold timestamp ahead of the
instant handed in is two clocks disagreeing and answers *no* by the same
subtraction rather than by a case of its own.

`CollectionHealth.unattested` counts the revisions with openings waiting and no
fold timestamp to judge the wait by. It is published whether or not a schedule
was handed in, and it is **not** a fault: nothing is wrong with a row that cannot
answer a question nobody could ask of it before today. A surface showing
`pending` without it would let a reader take *no fault* for *nothing is late*.

### Where the fault sits among the others

`collection-stalled` falls to `configuration`, the same hand as
`counts-inflated`, because what has stopped is the thing the deployment
schedules — and the two are adjacent in `COLLECTION_FAULTS` because two faults
falling to one hand is one errand (0271).

**They cannot both be true of one revision**, and the reason is arithmetic rather
than policy: `drift` and `pending` are the two signs of one subtraction, so a
revision whose appearances have outrun its openings has nothing pending to be
late. The two configuration faults are alternatives, not an addition, and a test
pins it.

**A stall can hide behind `openings-unmarked`.** A deployment whose senders never
mark an opening has nothing pending by construction, so its stall is invisible
until the door is counting again — which is why the marker is the first fault to
fix and is published first.

## Consequences

**A deployment can be told its collection has stopped**, on the screen that is
about the collection rather than about readers, with the page's exact arrivals as
what it is costing (0271) and the remedy in the same hand as the window.

**`pending` stops being a figure nobody can act on.** It is still published
unjudged where nothing can judge it, and `unattested` now says how much of it is
in that state rather than leaving a reader to infer that no fault means nothing
is late.

**The one timestamp written by one writer is now the pattern for the next
question of this shape.** Every other counter row here carries an `updatedAt`
written by whoever touched it last, and the lesson is that such a column can
answer *when did this change* and never *when did this particular writer last
run*.

**Nothing new is on the wire and nothing new is in a browser.** The marker this
rests on already ships, at 31 bytes minified and 13 once per page view (0214),
and the broadcaster is byte-identical. This is the twentieth thing taken out of
what the subsystem already holds rather than collected — and the first of them
that needed a column, which is why it is a record rather than a reading.

**It is a migration on live data, and an additive one.** `ALTER TABLE ... ADD
COLUMN IF NOT EXISTS folded_at timestamptz` runs inside the existing idempotent
DDL. A deployment that upgrades and never folds again reports `unattested` for
ever rather than a fault, which is the conservative direction: the state means
*nothing here can tell you*, and it is true.

**A deployment still has nowhere to state its collection interval.** The window
is `LOOM_SIGNAL_WINDOW_MS`; the cadence lives in whatever schedules the script,
outside the repository. Until an operator surface carries both, the schedule is a
caller's to assemble. Filed.

## Alternatives considered

**Reading the lag off `updated_at`.** The draft 0271 dropped, and it stays
dropped: the column is written by the door on every delivery, so the busiest
stalled deployment looks the freshest. This record exists because that number
cannot be made to answer the question.

**A default allowance — one window, or two.** Refused. The ripeness window is not
the cadence: a deployment folding hourly behind a ten-minute window is healthy
with a fifty-minute-old fold, and a default of one window would fault it on every
page. The framework publishes thresholds about its **own** numbers
([0218](0218-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md),
0271) and this is a fact about somebody's cron.

**Reading the clock inside the reading.** Refused for the reason every instant in
this subsystem is handed in: a reading that read the wall clock would answer
differently on two calls over one set of rows, and nothing could test the
boundary.

**A `foldedAt` on the tallies and the funnels too.** Refused for now. The
question is *has the fold stopped*, the door row is the one place both sides of
it are already written down, and a timestamp on four tables would be four places
for them to disagree about when the last run was. If a per-node answer is ever
wanted, it is one read of this row.

**Backfilling `folded_at` from `updated_at` on the migration.** Refused, and it
is the one tempting shortcut here: it would make the fault available on the day
of the upgrade rather than after the next run. It would also stamp a fold at the
instant of the last *arrival* on every busy row, which is precisely the false
negative — a stalled deployment, freshly attested, reported sound. One run of
waiting is worth a number that means what it says.

**A standing rather than a fault.** `unfolded` already names the state where
openings are waiting and nothing says that is late, and it is kept. A stall is
not that: it is something to go and do, which is what separates a fault from a
silence in this reading (0271).

**Judging the stall against each page's own traffic** — faulting a page whose
pending openings are a large share of its arrivals. Refused: the share is a fact
about how busy the page is since the last fold, so a quiet page that has not been
folded for a week would read sound and a busy one would fault within the window.
Time is the discriminator and the schedule is what makes it readable.
