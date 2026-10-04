# 0221 — Where reading stops is a fall between two siblings, and a ratio of two counts off one row set

**Status:** Accepted
**Date:** 2026-10-03
**Section:** §4c (reader signals)

## Context

[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
made the tree the universe a window of counters is read against, so silence
became a measurement: every element node of a revision comes back in reading
order with `read`, `skipped` or `unknown` beside it. Its own doc comment says
what it stops short of — *the shape of the answer is where in the page the
reading stops, and a set of rows keyed by id cannot show it.*

That shape is the first thing this subsystem could tell a **model** rather than a
person. *Readers get through the first four bands and the fifth is where they
leave* is a sentence a change can be proposed from; *n_42 was read by 84 views*
is a sentence somebody has to interpret first. And it needs nothing new: no kind
in the vocabulary, no byte on the wire, no attribute in the render, no column in
a store. It is arithmetic over `reached` on rows that already exist, which is the
asymmetry [`docs/signals.md`](../docs/signals.md) is built to exploit.

Two things stood in the way of doing it the obvious way, and both are about
honesty rather than mechanics.

**The obvious way is a page-wide curve of `reached` in reading order, and it is
not a curve.** A part deep inside the first band comes before the second band in
document order and is reached by fewer readers than either — so the sequence is
not descending, and a fall in it is not a reader leaving. Drawn as a curve it
would show a page losing and regaining readers several times per band, and every
one of those movements would be an artefact of nesting.

**And `reached` is not a number a rate can be built on.** It is a distinct view
count summed across rollup windows, so it is generous by every page view that
straddled a boundary — accepted in 0147, and measurable per revision only since
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md).
A figure of the form *84 readers reached band four* inherits that inflation
whole.

## Decision

**Where reading stops is a fall between two siblings, and it is reported as a
ratio of two `reached` counts taken off the same rows.** `readingProgressOf` in
[`src/signals/progress.ts`](../src/signals/progress.ts) takes a `PageReading` and
nothing else, and returns runs of falls.

1. **The unit of comparison is a run: one parent's element children, in the
   order a reader meets them.** Every comparison is between two members of one
   run. Siblings are at one level of one parent, so a fall from one to the next
   is a reader who got to one and not the other; cousins are not comparable and
   are never compared. Every part of a page is a step in at most one run — its
   parent's — so no reader's progress is counted at two depths. A run of one
   child is left out, because a stop is between two parts.

2. **The figure is `lost ÷ reached`, and both numbers are `reached` counts from
   the same window.** This is why it can be shown. A reader who straddled a
   rollup window straddled it for the whole page, so the inflation 0147 names is
   very nearly common to the numerator and the denominator and divides out:
   *four in ten readers stopped here* survives an over-count that *four hundred
   readers* does not. It is never divided by the page's view floor and never by
   the page views counted at the door (0219) — those measure a different thing in
   a different place, and a rate built across the two would be a number no two
   rows agree about.

3. **A part that reported something other than a view cannot anchor a stop.** Its
   standing is `unknown` with views on the page, its `reached` is 0, and the
   truth is *not zero, unknown* — a press was delegated to a band that no
   `viewed` ever named, so a reader plainly had it in front of them (0167 does
   not put `viewed` on a delegated signal's ancestry). A stop therefore names the
   two nearest parts in the run that can anchor one, passing over the parts in
   between, and the parts passed over are counted in `unanchored` where a reading
   can see them. A part with **no row at all** is the opposite case: that is a
   statement — nobody got here — and it anchors.

4. **A rise is counted and never reported as a negative fall.** More views
   reaching the later part than the earlier one is something scrolling cannot
   do: a reader who arrived at an anchored link or a restored position, or a part
   that is on screen whatever anybody does, such as a footer a short page never
   pushes down. It is a different sentence, so it is a different field.

5. **The page's one headline figure, `steepest`, is ranked by readers lost, then
   by share, then by reading order.** *Where does this page lose readers* is a
   question about readers. A band two readers out of three abandoned is a worse
   rate and a smaller problem than one four hundred out of a thousand did, and
   ranking by share would put the smallest band on the page at the top of every
   screen for ever.

6. **A window with no views of the revision answers nothing** — no runs and no
   steepest — rather than answering that every part was abandoned. It is the same
   refusal `unknown` already makes one level down (0212), made once instead of
   once per part.

## Consequences

- **The portal can ask where a page loses its readers, and say it with a figure
  that holds.** The screen 0219 gave an exact denominator to now has a shape to
  draw as well as a set of rows, and the one rate on it that is robust to the
  straddle is the one this produces.
- **Nothing was added to a payload, a browser, a column or the vocabulary.** The
  broadcaster is untouched, so its measured weight is unchanged. This is the
  third thing derived from the server-side join rather than collected (0212,
  0214, 0219 being the others), and the argument for the join gets stronger each
  time.
- **`unanchored` is a diagnosis nobody had.** A long list means presses are being
  delegated to regions that no `viewed` names — a sender or a primitive not
  reporting what it is — rather than a page nobody read. That failure was
  previously invisible: it looks exactly like a quiet page.
- **The join is still thin where 0212 left it thin.** A run's steps carry the
  role its type declared, and nothing in `src/primitives/` declares one, so a
  reading today says *where* readers stop and not *what kind of part* they stop
  at. Filed for `Loom primitives` and unchanged by this.
- **A reading is linear in the parts and pure.** No store, no clock, no DOM, and
  the previous anchorable step is carried rather than searched for, so a run of
  unanchorable parts costs its length and not its square — rule 4's standing
  requirement, which the ledger has been bitten by once already.
- **Per-reader identity is no cheaper and no dearer.** Nothing here is keyed by
  anything but a node, and the question it answers is about a page.

## Alternatives considered

- **A page-wide curve of `reached` in reading order.** Rejected: it is not
  descending, for the structural reason above, and a screen drawn from it would
  show readers leaving and returning several times per band with every movement
  an artefact of nesting. A curve is also the shape most likely to be exported,
  screenshotted and quoted, which makes a wrong one expensive.
- **Dividing by the page view count from the door (0219), so every fall is a
  share of the true readership.** Rejected, and it was tempting precisely
  because that denominator is exact. The two numbers come from different
  counters written in different places: `opened` counts arrivals once, `reached`
  is summed distinct counts, and their ratio can exceed 1 for honest reasons. A
  figure that is sometimes 112% is a figure a screen cannot show, and the
  robustness argument runs the other way — the straddle cancels between two
  `reached` counts and does not cancel against `opened`.
- **Picking the page's spine — descend through single-child wrappers, then call
  those children the bands — and reporting one run.** Rejected: it is a
  heuristic about markup in a subsystem whose value is that its figures can be
  defended. Every run is reported and a consumer that wants the top-level one
  takes the shallowest, which is the same answer without a rule that is wrong on
  somebody's page.
- **A threshold — the furthest part at least half the readers reached.**
  Rejected: the threshold is policy, it would have to be configuration, and it
  answers less than the falls do. `furthest` is kept because *the last part
  anybody reached* needs no threshold to be true.
- **Writing the falls into the counters at rollup time.** Rejected for 0212's
  reason, which has not weakened: a window's arithmetic stamped onto a stored row
  cannot be corrected once the raw window has expired, and a read-time reading
  reinterprets every row already stored the day the parts declare more about
  themselves.
