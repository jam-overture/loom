# 0308 — A comparison of two populations is not a window nobody read

**Status:** Proposed — **architectural, needs review.** It reverses one clause
of [0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md),
which is accepted, so nothing in it is built and 0301 is not superseded. What
was built instead is at the end.

**Date:** 23 October 2026

**Section:** §4c (reader signals)

## Context

0301 found that a page reading refused for holding two forms with neither asked
for publishes a view floor of nought, which is indistinguishable from a page
nobody opened — and that two readings derived from it printed *nothing reported
a view of this version* over a window holding every reader of both forms. It
fixed that by giving `RankStanding` and `MovementStanding` the member `unsplit`.

In the change order it left a second conflation standing, and said so:

> In the change order it is the standing `audiences-mixed` maps to, where
> `different-audiences` and `nothing-measured` go on sharing `unread`: those two
> are both *there was nothing to compare on one side*, and the cause travels on
> the row for a surface that wants to say which.

**That sentence is not true of `different-audiences`.** A comparison refused for
spanning two known populations has nothing to compare *because the two sides are
of different readers*, not because a side was quiet. Both its windows reported
plenty. On fixtures now in `deployment-change.test.ts`: a page served to skiers
in the earlier window and to riders in the later one stands in `standings.unread`
with a hundred views on each floor and two hundred arrivals at the later form's
own door. Every figure on the row contradicts the sentence over it.

**It is the same failure 0301 was written about, one cause along.** `unsplit`
was carved out because what it had in common with `unread` was a nought rather
than a state of a deployment's readers. `different-audiences` has not even got
the nought in common: it is a fault in the pairing, beside `mispaired`, and its
remedy is the caller's.

**Where it shows is the silences table.** `MovementStanding` `unread` maps to
the condition `no-view-reported` — *nothing reported a view of it* — so a
comparison of two populations is published, at the table, as a window nobody
read. The condition that fits already exists: `two-audiences`, brought by the
before-and-after reading, *the two readings are of different audiences, and so
of different readers*. Nothing new is needed below the standing.

## Decision

*(Proposed. Not built.)*

**`DeploymentChangeSilence` gains `mispopulated`**, and so `MovementStanding`
does: the two readings are of two known populations, so there is no movement of
anybody here.

**`standingFor` maps `different-audiences` to it**, leaving `nothing-measured`
alone under `unread` — which then means what it says, as `unread` in the
one-window order came to mean what it says under 0301.

**`meaningOfDeploymentChangeSilence` maps it to `two-audiences`**, the condition
the before-and-after reading already brings. **The silences table gains no
condition**, exactly as 0301's three new members gained none.

**The name is `mispopulated`, beside `mispaired`.** The three standings that are
faults in the asking rather than states of a deployment's readers then read as a
family: `mispaired` is two pages, `mispopulated` is two populations,
`unsplit` is one window that is of no population at all. Each has a remedy the
caller can carry out, and no two of them are a sentence about traffic.

## Consequences

- **`standings.unread` becomes trustworthy in the change order**, as 0301 made
  it in the one-window order. It is the headline count of pages with nothing to
  compare, and on a deployment comparing two forms by hand it absorbs every one
  of them.
- **One new member on two published unions**, guarded by `everyMemberOf` and an
  exhaustive switch, so every surface that draws a standing is forced to name
  it. `Loom portal` gains a row to draw and a sentence for it.
- **The two fixtures that pin the present behaviour invert.** They were written
  in the same unit as this proposal for exactly that purpose.
- **Nothing reaches a reader.** No payload field, no browser code, no column, no
  store, no new kind, no change to `broadcast.ts`.

## Alternatives considered

- **Leave it, and let a surface read `MovedPage.silence`.** 0301's answer, and
  what stands today. It is defensible: the cause does travel, and a careful
  surface recovers everything. It is wrong for 0301's own reason — the standing
  is what a screen groups by, and grouping a fault in the pairing under a fact
  about readers is what sends a deployment to look for a broken sender. The two
  halves of 0301 should not disagree.
- **A note on `unread` saying it covers two states.** Cheaper and contradicts
  nothing, so it is what was done instead. It does not fix the count a screen
  groups by, and it does not fix the condition the silences table publishes.
- **Fold `different-audiences` into `mispaired`.** Both are pairing faults and
  one member would do. Rejected: *the two readings are of different pages* is
  false of two forms of one page, and the remedies differ — one is a caller
  pairing the wrong trees, the other is a caller comparing two readerships it
  meant to hold still.
- **A standing per comparison silence, with the bucket dropped.** This is where
  the direction ends, and it may be right. It is a bigger decision than this one
  and `nothing-measured` is the one member that genuinely is a state of a
  deployment's readers, so it is left as it is.
- **Wait for `Loom portal` to say whether a screen groups by standing.** The
  finding of 20 October proposed this and the routine has been paused for four
  runs. A member added to a closed union before anything draws it is the
  cheapest it will ever be, and the one direction that cannot be recovered is a
  surface built on the conflation.

## What was built instead

Nothing that depends on this. In its place, in the same unit:

- **Two fixtures in `deployment-change.test.ts`** standing a comparison across
  two populations beside a window nobody read, asserting that both land in
  `unread` and that only `silence` tells them apart — so 0301's promise that the
  cause travels is checked rather than stated, and the day this record is
  accepted there is a test that says what moved.
- **A note on the `unread` member** and on `standingFor`, saying that the
  standing covers two comparison silences and that the sentence it carries is
  true of one of them.
