# 0315 — A window answers where its readers were, at a floor it is handed, and the readership is published beside the forms it splits into

**Status:** Accepted

**Date:** 25 October 2026

**Section:** §4c (reader signals)

## Context

[0309](0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md)
made the step from a store to a reading: `readReaderWindow` reads one window
and `windowReadingsOf` joins it into one `PageReading` per page, per revision,
per form. Thirty-eight readings take one of those, or a list of them, so every
one of them became reachable from a store in a line.

**One did not, and it was named as a gap at the moment it was created.** The
region rows are carried on the window and counted in the form census — a form
named only by a bucket still gets a page reading — and **no map is joined out
of them.** A caller that wanted *where are my readers* had two steps where every
other reading had one, and the second step was the one with a rule in it.

The reason was real. `regionReadingOf` takes a **floor**; the floor is
per-deployment configuration (§7, `regionFloorOf`, raise-only above
`DEFAULT_REGION_FLOOR` of 25); and this rung reads no configuration and should
not start. But leaving it out had a cost that is not visible in the types:
**a caller who passed no floor got the default rather than the deployment's**,
and nothing anywhere said so. A deployment that had raised its floor to 100
because it serves small countries would have had its map drawn at 25 by any
screen that forgot, and the screen would have looked right.

Three further things only the join knows, which is what makes this the join's to
do rather than a second call's:

- **The form split.** A readership is of one readership (§38) and two forms of
  a page are two populations (0290), so a map per form is the honest shape — and
  a caller doing it by hand would re-derive a split this rung already did.
- **Which rows are repeats.** A caller concatenating two windows adds a bucket
  to itself, which is the one error here that cannot be undone (0158).
  `regionReadingFor` guards one revision; nothing guarded a window.
- **That the maps and a deployment-wide map must be the same rows.** Two calls
  by hand are two chances to read different sets of rows and publish totals
  that do not agree.

## Decision

**`windowReadingsOf` joins the region rows too, into
`WindowReadings.regions`, at a floor handed in with the call.**

1. **The floor is an argument, never a lookup.** `WindowReadingOptions` is
   `RegionReadingOptions`, passed through to every map and to the readership.
   The rung holds one piece of configuration it was **given** rather than one it
   went looking for, which is the line §7 already draws, and `regionFloorOf`
   underneath stays raise-only — a caller cannot use this to read a deployment's
   map below the floor.

2. **Both answers are published, not one.** `regions.maps` is one map per
   revision per form; `regions.readership` is the deployment's whole map.
   **Because the floor bites harder the narrower the group**: thirty views of
   one country split fifteen and fourteen across two forms are a readership the
   whole map names and both split maps withhold. A rung that published only the
   split would answer the maintainer's own question — *where are my readers* —
   **worse than the two calls it replaces**, which is the opposite of what a
   rung is for. Summing two forms' arrivals is right here and wrong on the
   counters, and the asymmetry is 0297's: a person who arrived arrived once,
   whichever form they were served, while adding two forms' node counters is one
   number about two pages.

3. **A map is keyed so it pairs with its page reading.** `WindowRegionReading`
   carries `treeId`, `revision` and `audienceId`, which is exactly
   `ReadingOfAudience`, so `readingKeyOf` takes one as it takes a `PageReading`
   (0290) and a screen holding both lists pairs them on the published rule
   rather than on a spelling of its own.

4. **The groups are the region rows' own audience column**, rather than the
   forms the other row sets name. Every row is then in exactly one map by
   construction, which is what makes the maps and the readership add to the same
   number of views; grouping by a form named elsewhere would leave a row naming
   none in no map at all. A form with no region rows has no map rather than an
   empty one — a map holding no rows is not a form a deployment has arrivals
   for, and in practice cannot occur, because a region row is written for every
   arrival the door counts.

5. **A map is not held to a tree.** A region map is of arrivals, not of nodes,
   so a revision in `unjoined` — `no-tree`, which is ordinary, because counters
   outlive the revisions they were filed against — still has its readers
   counted. Dropping them would under-report a deployment that has pruned old
   trees by exactly the readers it has least other record of, and it would make
   the maps and the readership disagree.

6. **A bucket handed in twice is dropped once and reported.** The dedupe is on
   tree, revision, form and region — the key the store keeps one row per — and
   it is applied **once**, before both the maps and the readership, so they drop
   the same rows. `regions.duplicated` is the count. This is
   `regionReadingFor`'s rule applied to a whole window rather than a second rule
   that agrees with it today.

7. **`undefined` is carried, not collapsed.** No region store offered is
   `regions: undefined` (0309 clause 2); a store that holds nothing is a
   readership of no views. *We cannot say where your readers are* and *you have
   no readers abroad* stay two sentences.

**This extends 0309 clause 8 and does not reverse it.** That clause says the
rung adds no figure *of its own* — it composes published rules. `regionReadingOf`
is a published reading, composed exactly as `pageReadingOf` is; the floor it
withholds by is handed in rather than invented; and nothing here counts, sums or
divides anything the two readings underneath do not.

## Consequences

- **Every reading in the subsystem is now one call from a store**, with no
  exception left. A screen drawing a region map is
  `windowReadingsOf(window, trees, registry, { floor }).regions`.
- **A deployment's floor reaches its map.** The configuration is one argument
  on the call a screen already makes, so forgetting it is a missing property
  rather than a silently wrong number — and the default it falls back to is the
  cautious direction.
- **The maps and the readership cannot disagree**, and that is asserted rather
  than reasoned: a window of six buckets across three revisions, two forms and
  two trees, handed in twice, has its per-form views sum to the readership's
  views exactly.
- **Linear in the rows.** One pass to group and dedupe, one `regionReadingOf`
  per group over that group's rows only — so the whole join is one walk of the
  region rows plus one of the kept ones, rather than a filter of the window per
  form (rule 4; the ledger was quadratic once and took 314 ms on a 6,000-node
  page).
- **Nothing reaches a reader.** No payload field, no browser code, no column, no
  store method, no new kind. `broadcast.ts` is byte-identical and the browser
  cost is unchanged.
- **The privacy floor is strengthened rather than widened.** Two callers could
  previously read one window at two floors; now one argument sets both answers,
  and the readership — the widest group, which withholds least — is the one a
  screen gets by default, with the split maps' extra suppression beside it.
- **Per-reader identity is neither cheaper nor dearer to add later.** The maps
  group rows by a column the host wrote and nothing is kept per reader; an
  identified window, if it ever came, would be grouped by the same key.

## Alternatives considered

- **A separate `regionReadingsOf(window, options)`**, keeping the join free of
  configuration entirely. Rejected: it leaves a screen making two calls and
  re-deriving the form split the join already did, and it is the shape in which
  the maps and the readership can be read from two different sets of rows.
  Keeping the join configuration-free was the argument for it, and the floor
  being *handed in* rather than read is what answers that.
- **Only the per-form maps**, since a reading is of one audience. Rejected for
  clause 2: the floor withholds more the narrower the group, so this makes the
  deployment-wide answer strictly worse than the status quo.
- **Only the readership**, since §7 is about where a deployment's readers are.
  Rejected: a readership comparison is of one readership (§38, 0294) and a
  caller could not get a form's map back out of a summed one.
- **Group by the forms the other row sets name**, for symmetry with `pages`.
  Rejected for clause 4: a region row naming no form would then be in no map,
  and the two totals would disagree on exactly the window a test builds by hand.
- **Drop the maps for revisions with no tree**, so that `regions.maps` and
  `pages` line up one to one. Rejected for clause 5: it loses real arrivals, and
  the alignment it buys is one a screen gets anyway from `readingKeyOf`.
- **Read the floor from a configuration store here.** Rejected for the same
  reason 0309 left the trees to the caller: it would make the reading path
  depend on another store for a lookup the caller does better, and every test of
  this module would need one.
