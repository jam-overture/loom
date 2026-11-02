# 0335 — A fault reaches a conversion and a fall differently, so the fix-list asks each order its own question

**Status:** Accepted

**Date:** 2 November 2026

**Section:** §4c (reader signals)

## Context

[0330](0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)
joined two readings into one answer to *what should this deployment do next*: an
order of pages by the readers each loses at its sharpest fall
([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)),
and the faults in the deployment's own collection
([0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)).
It stated its own limit: **a page whose conversion collapsed is in neither
list.** A fall is between two siblings on the reach counter, so a pricing band
every reader reaches and nobody buys from reads `work: "none"`.

[0333](0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)
built the missing order — `deploymentConversionOf`, ranking the pages by the
readers each loses between the two ends of its sharpest question — and did not
join it, because joining it is two questions of analysis rather than a third
list. Both were filed the same evening. This record answers them.

### The first question, and it is the one that could go silently wrong

0330 publishes `spoilsTheLoss`: per fault, whether that fault reaches the figure
the order of falls is ranked on. Two of the seven do not, and that is the whole
reason the join is not the over-caution *any fault takes a page out of the
order*.

**Those answers are not transferable, and the filed finding's own guesses at
them were backwards in both places.** It supposed that `actions-uncredited`
might reach a conversion loss, because a question whose second end asks for
`activated` is about presses; and that `counts-inflated` would not, because the
conversion key divides the same inflation out of the same door row. The rollup
says otherwise on both counts.

- **A funnel end is satisfied by the node a signal names and the kind it is.**
  `rollupOf` files each view key under `(tree, revision, nodeId, kind)` and
  answers a pair out of those sets. The ancestry a delegated signal carries
  feeds exactly one counter, `engaged`
  ([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)),
  and **no funnel figure is made of it**. A sender that credits nobody therefore
  cannot touch a conversion key — a different reason from the fall's, which
  survives because a fall is made of `reached`
  ([0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)),
  and the same answer.
- **A conversion is a conjunction inside one rollup window, and a fall is not.**
  A fall is a difference of two independent distinct-view counts, so a window
  shorter than the visits inflates both ends and `lost ÷ (1 + inflation)` puts
  the difference back on the door's exact scale
  ([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
  `converted` counts the views in a pair's `from` set that are **also** in its
  `to` set, within one run. A page view that met the first end in one window and
  the second in the next contributes `reached 1, converted 0` and nothing to the
  next window's row: the conversion is not double-counted, it is **lost**
  ([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md),
  already recorded on `PairReach.rate` as the one figure here biased downward).

So a short rollup window **manufactures the loss this order ranks**, and
dividing by the straddle corrects the scale of a count rather than a count that
was never made. `PairReach.rateAtMost` bounds that error for the rate; nothing
bounds it for the key. `counts-inflated` is the fault a fall is explicitly safe
from and the fault a conversion is least safe from, and it is the one that can
be seen on a ranked page every day.

### The second question: whether `work` has to say a third thing

`AgendaWork` is four members — `page`, `collection`, `both`, `none`. A third
dimension read as a third kind of work gives eight combinations over a flat set
of four, and the member that would have to change is `both`, whose published
sentence is *rewrite it and repair a fault that does not reach the fall*.

## Decision

**A fault is asked about each order separately, and the published vocabulary of
work is unchanged.**

1. **`spoilsTheConversion` is published beside `spoilsTheLoss`** in
   `health.ts`, answering all seven faults. Six are `true`;
   `actions-uncredited` is `false`. It is beside the fault vocabulary for the
   reason its sibling is: the question is a statement about a fault, and a fault
   vocabulary written in two places is this subsystem's commonest defect.
2. **`deploymentAgendaOf` takes the order of conversions as a third required
   argument** and publishes `converting`, the conversion order's own order, as a
   list beside `page` rather than rows merged into it. The two keys are readers
   in two units — readers lost at one fall, readers lost between one question's
   two ends — so a merged ranking would be a figure in neither
   ([0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)).
3. **`AgendaWork` keeps its four members, their names and their meanings.** The
   vocabulary answers *whose hand the work falls to*, not *which part of the
   page*: a leak is the page writer's work exactly as a fall is. `page` and
   `both` now cover either kind of page evidence, and the row's own `order` and
   `conversion` members say which. **Nothing is superseded.**
4. **`AgendaRow.spoiled` keeps 0330's exact meaning** — a fault reaching the
   *fall's* key — and `spoiledConversion` is published beside it. Neither may be
   read off the other.
5. **Each page order is filled by its own predicate**, not off `work`. A row is
   in `page` where its fall is ranked and unspoiled, and in `converting` where
   its leak is ranked and unspoiled. Reading `work` to fill both lists would put
   a page whose leak a fault manufactured into the conversion order on the
   strength of its sound fall — 0330's defect reintroduced by a shortcut, and
   the state `counts-inflated` produces.
6. **`contested` widens to either order** and stays a slice of `collection`. A
   row says which of its two ranks was withdrawn.
7. **`first` prefers a contested page, then the worst fall, then the worst leak,
   then the worst fault.** Falls before leaks for a causal reason rather than a
   comparison of magnitudes, which is unavailable across two units: a reader who
   never reached an ask stopped *reading*, and 0333 deliberately leaves that
   reader in the order of falls — so a leak is a question about readers who did
   arrive, and rewriting an ask readers do not reach is work on a part of the
   page nobody sees.

## Consequences

- **A deployment's fix-list is no longer silent about the half of the product
  that pays.** A page every reader reads and nobody buys from is `page` work
  with a named figure, where it read `none` before.
- **One row can be sound evidence in one order and an artefact in the other**,
  and the agenda now says so on the row. A page carrying `counts-inflated`
  stands in `page`, is out of `converting`, and is in `contested`.
- **The fault vocabulary has three published statements per member** —
  `remedyOf`, `spoilsTheLoss`, `spoilsTheConversion`. A sixth kind's fault, or an
  eighth fault, has to answer all three, and the exhaustive tables in
  `health.test.ts` fail until it does.
- **`spoilsTheLoss` ⇒ `spoilsTheConversion` holds over today's seven, one-way,**
  and is published as a test rather than relied on as a rule. A fault added
  later could hold for a conversion and not for a fall; the test is what would
  say so.
- **`deploymentAgendaOf` gains a required argument**, which is a breaking change
  to a signature nothing outside its own test calls. An optional one would be a
  fix-list that type-checks, runs, and answers `none` about conversion — the
  hazard this subsystem has now recorded four times. A deployment that asks its
  readers nothing hands in the order it gets, every page `unasked`, and reads
  exactly as it did before.
- **No silence vocabulary is added**, and 0240's twenty-two sets stand. This
  reading withholds no figure of its own because it publishes none: every
  absence on a row is a standing a source reading already named.
- **No reader count is published**, for 0330's reason with a third unit added.
  Every figure here is a count of pages.
- **Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical: no
  payload field, no counter, no column, no store method, no migration and no new
  kind.
- It makes **per-reader identity no more expensive to add later.** It holds no
  reader and joins no reader; the unit is a page in all three source readings and
  in this one.

## Alternatives considered

- **Fold the conversion order into `page` without answering the fault question.**
  Rejected, and it is what the filed finding warned against. The row would carry
  one `spoiled` flag true of one of its two orders and silent about the other,
  and the silent one is the order a short rollup window ruins.
- **Transfer `spoilsTheLoss`'s table by analogy.** Rejected, and the two guesses
  above are why: both were wrong, in opposite directions, and either would have
  been invisible — a page in the wrong order with a true-looking number on it.
- **Supersede `AgendaWork` with a vocabulary that says three things.** Rejected.
  The axis the four members are on is *whose hand*, and a leak does not change
  hands. A third dimension over a flat set means eight members, and the member
  that would have to be renamed, `both`, is the one that stops the reading being
  over-cautious. A change of direction in an accepted vocabulary needs a stronger
  reason than a list that can be published beside the existing ones.
- **Rename `spoiled` to `spoiledLoss` for symmetry.** Rejected for now. It is
  the better pair of names and it is a rename of a published field whose meaning
  is unchanged, which buys legibility with churn and a superseded record. The
  asymmetry is stated on both members instead; a run that touches this
  vocabulary for another reason should take the rename then.
- **Default the conversion order to an empty one.** Rejected: see the
  consequence above. The hazard of an argument a caller may omit is the
  recurring defect of this subsystem's rungs, not a convenience.
- **Rank falls and leaks in one order.** Rejected twice over — the keys are
  readers in two units, and 0333 already refuses to rank the loss before an ask
  here because the order of falls ranks it.
- **Publish a deployment-wide conversion rate on the agenda.** Rejected: 0333
  refuses it at the source, and a join may not invent a figure neither of its
  inputs publishes.
