# What readers did, by the hour they did it in

**Lane:** `Loom signals` · **Date:** 6 November 2026 (evening) ·
**Branch:** `signals-77-what-readers-did-by-hour` ·
**Records:** [0360](../decisions/0360-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md) ·
**Plan:** [`docs/signals.md`](../docs/signals.md) §77 ·
**Closes:** `Loom portal`'s 6 November finding, *a goal's figure for a range,
and `By page`'s bars for one, need what readers did on a part counted by hour*

## Why this, and why now

No maintainer comment was waiting and no pull request of this lane's was open —
one pull request is open on the repository, `#778`, and it is `Loom docs`'. The
only open finding addressed to this lane and asking for work was the portal's,
filed this morning against the last row of `docs/portal.md` 8a. It is the direct
sequel to §76: page views are counted by hour now, the range picker is drawn
(#791), and the **three remaining things on the *Signals* screen that read a
range** — the primary goal's figure, the *By page* drawer's per-kind bars, each
goal's trend — all need the *parts* counted by hour rather than the arrivals.

Nothing of `Loom daily build`'s is open on the signal path; `git fetch` showed
`main` at #791 and nothing racing this.

## What shipped

A seventh counter, and the readings over it.

- **`loom_reader_acted_hours`** — application, audience, tree, revision,
  **part**, hour, and what readers did to that part in it: `activations`,
  `opens`, `closes`, `completions`.
- **It holds the three delegated kinds and no others** (`activated`,
  `disclosed`, `completed`) — the kinds a reader aimed at something to cause
  (0167), which are exactly 0350's three goal kinds. No new vocabulary, no
  payload field, no browser change.
- **Written by the fold, from the same pass as the tallies, in the same
  transaction.** `rollUp` emits the hourly rows beside the tallies;
  `applyWindow` writes both or neither.
- **Read as a range and a beginning**, with the part narrowing both:
  `tallies.acted({ treeId?, nodeId?, audience?, revision?, from?, to? })`.
- **Three readings**: `actedSeriesOf` (dense bars, hour in progress marked),
  `actedChangeOf` (the range against the equal period before, `was: null` where
  counting had not begun), and `readReaderActed` / `readReaderActedRate` — the
  latter joining the counter to the door's arrivals to give the figure 0350
  defines, *7 presses in 200 page views, 3.5 per 100*, over a range.
- **One shared rule extracted rather than respelled**: `hourlySeriesOf` in
  `arrivals.ts` is now the one place the dense-fill honesty lives (a quiet hour
  is a drawn nought, an hour before counting began is not drawn, the hour in
  progress is marked). `arrivalSeriesOf` is a dressing of it and its own tests
  were the guard.
- The portal's bounded wrapper forwards the fifth listing (one line, in its
  read budget), so the app typecheck is green and the screen never reaches the
  table.

## Decisions taken that were not specified, and why

**The distinct counters and `dwellMs` are not sliced by hour.** The portal's ask
said *the same counts `tallies()` answers*, which would be every counter. Two of
the three reasons are arithmetic and one is money:

- `views`, `reached` and `engaged` are distinct counts of page views, and
  distinctness does not add — a page view crossing an hour is one view in each
  and two in their sum. **The honest hourly denominator already exists**: page
  views that began in the hour, counted once, at the door (0214, 0356).
- a `dwelled` signal is observed for every part that comes into view, so an
  hourly dwell row per part is about 6,000 rows an hour for a 6,000-node page —
  144,000 a day, per revision, in a durable table nothing sweeps.

So the table counts **what readers did, not what they saw**, and that sentence
is the affordability property: a reader who presses one button on that same
6,000-node page writes one row. The consequence for the screen — two of the
drawer's five bars still cannot be drawn for a range — is filed for `Loom
portal` with a recommendation and a cheap second option.

**The fold writes it rather than the door.** The door is exact to the request
and has no repeat refusal; the fold refuses a batch it has already folded
(0314). Writing where that refusal already is makes *the hours sum to the tally
they slice* an invariant rather than a hope, and a replayed `POST` cannot double
one table while the other stays right.

**One pass, not two.** A second walk grouping the same batches by hour would
make the repeat judgement twice against a different grouping, so a repeat
landing either side of an hour boundary would be refused by one pass and counted
by the other — invisible, permanent (0158).

**The rate is taken once over the range and never per hour.** Numerator and
denominator are counted at different moments (did, versus began), so the error
lives at a range's two edges: two page views' worth of a month, the whole of an
hour. Filed, with the shape a per-hour rate would need if it is ever wanted.

## Tests

`pnpm install && pnpm verify` — **exit 0**, and run again on this branch after
`main` moved under it (#792 landed mid-run, touching only the portal's proposing
modules).

- framework: **6,522 passed**, 266 files
- app: **6,814 passed**, 418 files
- prerender check: 138 pages, 2,073 junctions, 0 run together, 0 unserved

New, by file:

- `src/signals/acted.test.ts` — **28 tests**: the closed set of three kinds and
  the openings-not-shuttings mapping a goal counts on; dense bars with the quiet
  hours drawn; one kind at a time; parts and revisions summing; the hour in
  progress marked; clipping to where counting began; the four comparison states
  (`was` withheld before counting, a rise from a counted nought, a fall to
  nought as a real quotient); the read that spans both periods rather than the
  range on the screen; and the rate, including **the range that holds presses
  and no arrivals**, where the figure is withheld rather than read as *nobody
  acts*.
- `src/signals/acted.contract.ts` — **21 tests × 2 stores**: the hour filed and
  added, the next hour in its own row, **two rows of one part-hour inside one
  call added rather than refused** (Postgres raises on it and a `Map` would keep
  the last), the four kinds apart, parts, trees, revisions and audiences apart,
  the beginning narrowed to the part, and the sum against the tally.
- `src/signals/rollup.test.ts` — **15 added** (49 → 64): the hour from
  `receivedAt` and not `sentAt`; attention writing **no** hourly rows at all; a
  region credited nowhere; **the sum invariant** against the tallies; and the
  two repeat cases — a correlated repeat folded once in *both* outputs, and an
  uncorrelated repeat counted twice in *both*, so the two can never disagree.
- `src/signals/collect.test.ts` — **5 added** (36 → 41): a window spanning an
  hour boundary writing two rows, the count in the summary, the rows going in
  **in the one window write**, two audiences kept apart, and a part's hours
  summing to its tally across two runs.
- `src/signals/postgres.test.ts` — row level security asserted on the new table.

Nothing was skipped and nothing weakened. One real failure on the way: the first
`pnpm verify` was red on the decision-citation gate, because this report's
module docs cited `0353` for *a batch delivered twice is folded once* and that
record is `0314` (0353 is claimed on an unmerged branch). Corrected, not
suppressed.

## What a browser pays

**Nothing.** `broadcast.ts` and every module it loads are untouched —
`browser-weight.test.ts` passes, and the bundle measures **6,513 bytes
minified, 2,980 gzipped**, the same bytes as §76 reported this morning. No
payload field, no new kind, and the one new table is one no browser can see.
The hour was already being stamped at the door.

## Findings filed

- **For `Loom portal`** — the drawer's `viewed` and `dwelled` bars still cannot
  be drawn for a range, with the recommendation (draw the three for the range
  and the two attention figures *since counting began*, labelled) and the
  alternative (ask for a page-grained hourly table; it is cheap in rows and a
  morning's work).
- **For `Loom portal`** — the fifth forwarding line in `bounded-store.ts`, as
  the fourth was filed this morning; written here, verify green, wording theirs.
- **For this lane** — the rate's two moments and the rolling denominator a
  per-hour rate would need.
- **For this lane** — the extracted dense-fill, with two things a future run
  should not do to it.

## Open questions

Three, all recommended as built, none blocking. They are in the pull request
comment.

1. Whether the *By page* drawer wants `viewed` and `dwelled` over a range —
   which would be a second, page-grained table. **Recommend: not yet**, and the
   screen says *since counting began* for those two.
2. Whether a sixth kind should ever be sliced by hour. The table takes
   `DELEGATED_READER_SIGNAL_KINDS` as its set, so a sixth delegated kind would
   land here by being added there — which is a record, not a judgement call
   (rule 6). **Recommend: leave the coupling**, it is the behaviour you want.
3. Whether `main` holding both this lane's `events.ts` reading and the portal's
   `events-reading.ts` should be resolved, which is still the maintainer's call
   from this morning's finding and is not a question this unit touches.

## On the parked door

Nothing here makes per-reader identity more expensive to add later. A row is a
part, an hour and four numbers: no key, no region, nothing per reader, and no
join that would need one. An opt-in identified counter would be a table beside
this one rather than a column in it.
