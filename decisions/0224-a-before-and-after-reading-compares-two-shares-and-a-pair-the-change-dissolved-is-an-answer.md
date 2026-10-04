# 0224 — A before-and-after reading compares two shares, and a pair the change dissolved is an answer

**Status:** Accepted
**Date:** 2026-10-04
**Section:** §4c (reader signals)

## Context

*Before versus after a change* is the measurement Loom exists for. A model
proposes, a gate records, a page changes — and the only question that justifies
any of it is whether readers got further than they did before. §1 of
[`docs/signals.md`](../docs/signals.md) made it honest at the collection end: a
broadcaster that watches the root for added and removed addressed elements
reports the bands the Gate just changed instead of going blind at them.

Nothing read it. Every reading this subsystem publishes describes **one window of
one revision**:
[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
joins a window's counters to a tree,
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
counts that revision's page views exactly, and
[0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)
says where in that revision reading stops. Comparing two of them was left to
whoever was looking at two screens — which is the step where the product's whole
argument is either made or quietly lost, because the comparison is the part that
is easy to get wrong in a way that looks right.

Three things stood in the way, and all three are about what is comparable.

**A `reached` count is not comparable across two revisions.** Two revisions are
two trees read by two sets of readers in two windows: the counts differ because
the page changed, because traffic changed, and because the rollup windows
straddled differently (0147, measured per revision since 0219). Nothing divides
out, so *three hundred readers reached the pricing band and now four hundred do*
is three sentences about traffic wearing one about reading.

**A change takes pairs apart, and the obvious handling throws away the most
interesting case.** A stop is a pair of adjacent siblings. Remove an end, move
one away, or insert a band between them, and the pair is gone from the later
reading — so a comparison that joined on pairs and dropped the misses would be
silent about exactly the change anybody is most likely to make: *something was
put into the gap where readers were leaving.*

**And the measurement that looks most like success is the one that means a page
stopped being read at all.** A pair whose share was 0.6 and is now unmeasurable
because nobody reaches its first part subtracts to a perfect fix. It is the lie
in the direction nobody checks, which is the same shape 0221 found in a part that
reported something other than a view.

## Decision

**A before-and-after reading compares shares and never counts, pair by pair, and
reports every pair it cannot compare with the reason it cannot.**
`readingChangeOf(was, now)` in [`src/signals/change.ts`](../src/signals/change.ts)
takes two `PageReading`s and returns a `ReadingChange`. It is the fourth thing
taken out of the server-side join rather than collected: **nothing was added to a
payload, a browser, a column, a store or the vocabulary.**

1. **The unit of comparison is the stop, and the figure is a share.** A stop's
   share is `lost ÷ reached` off two rows of one revision, so by 0221's argument
   each side's window inflation has already divided out before the two sides
   meet. The difference of two shares is therefore a difference between two
   figures that were each honest alone. `improvement` is `was.share − now.share`,
   **positive where fewer readers stop**, and no count of one side is ever
   divided by a count of the other.

2. **A pair that cannot be compared is reported with its fate, carrying what its
   own side measured.** Five fates, in the order they are diagnosed: `absent`
   (one of the two parts is not in the other revision), `unanchorable` (one of
   them reported something other than coming into view there), `moved` (they are
   no longer children of one part), `reordered` (they are adjacent the other way
   round, so the two shares answer two different questions), and `separated`
   (still siblings, no longer next to each other). `separated` is the one worth
   looking at hardest, and it is the reason this list exists at all.

3. **A pair nobody reached on one side is `unreached` and is never a fixed
   fall.** It is filed on whichever side somebody did reach, because that is the
   side with a figure on it, and on the earlier reading when neither did.

4. **The threshold for a real move is one reader, evaluated in integers.**
   `resolution` is `1 ÷ min(was.reached, now.reached)` — the smallest share one
   reader could move on the coarser side — and `beyondOneReader` compares the two
   shares by cross-multiplying both denominators and the smaller count, so no
   division decides whether a reader exists. It is a statement about resolution
   and **not** a confidence interval: two out of three against one out of two is
   two readers, and no arithmetic makes it more.

5. **The ranking key is readers, not share**, for 0221's reason. `readersKept` is
   `improvement × now.reached`: the readers the change no longer loses here, at
   the volume the page has now. `mostKept` and `mostLost` are taken over the
   stops beyond one reader and nothing else.

6. **There is no page-level total of readers kept, and the absence is the
   decision.** A reader who got past the second band and then the third is in
   both stops' figures, so a sum counts them twice — 0147's distinctness trap for
   views and
   [0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)'s for
   presses, in the one place where the sum would look most like the headline.

7. **It compares two readings, not two revisions.** Hand it two windows of the
   same revision and no part is added, removed, moved or reworded, every pair
   matches, and what comes back is *this week against last week*. The labels
   `was` and `now` are the caller's; a caller who holds them backwards gets every
   sign reversed rather than a refusal, because there is no fact in the readings
   that says which is older.

8. **The tree half of the answer stands when the reader half cannot.** A window
   with no views silences every share (`silence: "nothing-measured"`) and still
   reports what the change did to the page: parts added, removed, moved, and
   reworded. *Three bands moved and one was reworded, and nothing has been
   measured since* is a true and useful sentence. Two different trees
   (`silence: "different-trees"`) answer nothing at all, parts included.

9. **A rewording is a floor and says so.** A part's own words are the props its
   type declared as copy
   ([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)) and its
   direct text children, so a rewording of a part whose type declares nothing is
   invisible. `parts.reworded` is positive evidence and `parts.unreadable` counts
   the shared parts where nothing could be seen either way — 0122's bargain and
   0212's, kept rather than quietly collapsed into *unchanged*.

## Consequences

- **The portal can show the measurement the product is for.** `mostKept` is one
  sentence: *the change keeps forty readers per two hundred at the pricing
  band.* `progress.was.steepest` and `progress.now.steepest` are carried, so
  *the steepest fall before, and what happened to it* is a lookup by two node
  ids rather than a second derivation.
- **The `separated` fate is a diagnosis nobody had.** A band inserted into a gap
  readers were leaving at previously looked, to any pair-joining comparison, like
  a fall that had been fixed.
- **`reworded` grows the day `src/primitives/` declares `copy`**, with no change
  here, because the join is at read time (0212). Until then the floor is low and
  `unreadable` says how low.
- **Two readings of one revision is now a first-class question**, which means
  week-over-week reading needs no second function and no stored comparison.
- **It writes nothing.** No table, no column, no retention. A comparison is
  arithmetic over rows that already exist, so it cannot drift from them and
  cannot be a second place that decides how many readers there were.
- **Counts up to about a hundred thousand views of one part of one revision in
  one window** keep `beyondOneReader` exact; above that its integer products
  leave `Number.MAX_SAFE_INTEGER` and the comparison would need rationals. The
  bound is stated where the function is.
- **It does not move the parked door.** Per-reader identity is neither cheaper
  nor dearer: every figure here is a ratio between two nodes of one revision in
  one window, built on counters already collapsed from view keys to counts, and
  the keys are gone by then by rule 2's design.

## Alternatives considered

- **Re-base every comparison on `opened`, the exact page-view count 0219
  added.** Rejected for the reason 0221 rejected it one level down, and it is
  worse here: `opened` is counted at the door and `reached` is a sum of distinct
  counts from a rollup, so a per-revision ratio between them can honestly exceed
  1 — and across two revisions it would make a traffic change look like a
  reading change. `opened` stays the right denominator for the rates 0219 filed
  about.
- **Compare the parts rather than the pairs** — reach, dwell and presses per
  node, side by side. Rejected: a per-node figure is a count, and the counts are
  the things that are not comparable across two windows. A table of them would be
  correct in every cell and wrong in every conclusion.
- **Drop the pairs that cannot be joined.** Rejected: see the `separated` fate.
  The commonest change is the one that dissolves a pair, so silence there is
  silence about most of the changes anybody will measure.
- **A statistical test — a confidence interval or a two-proportion comparison.**
  Rejected for now. It would be defensible arithmetic and an indefensible
  promise: the rollup inflation 0147 names is a systematic error, not a sampling
  one, so an interval computed as though the counts were independent draws would
  be narrower than the truth and would carry more authority than any other figure
  on the screen. One reader's worth is a weaker claim that is actually true.
  Filed as the thing to revisit if a deployment ever asks for significance.
- **Take two `ReadingProgress`es instead of two `PageReading`s.** Rejected: a
  progress leaves out the parts a diagnosis most needs — a root, and a part whose
  parent has no other child — so a part moved under a new parent would read as
  *something came between them*. One input per side also cannot be a mismatched
  pair. The two progresses are derived here and returned, so nothing downstream
  computes them twice.
- **Store the comparison.** Rejected: it is derivable from rows that are already
  kept, a stored one would be a second answer that could disagree with them, and
  rule 5 makes the aggregates the durable artefact rather than readings of them.
