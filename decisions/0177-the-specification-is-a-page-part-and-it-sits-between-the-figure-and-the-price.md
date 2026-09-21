# 0177. The specification is a page part, and it sits between the figure that persuades and the price

**Status:** Accepted
**Date:** 2026-09-21
**Section:** §4b

> **Why this number.** The highest record on `main` is `0175`. `0176` is claimed
> by #353, open at the time of writing. `0177` is the next number free on `main`
> and on every open branch.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches no schema,
> no tree, no delta and no primitive's props. It adds one member to
> `COMPOSITION_PARTS`, a `const` tuple inside `src/primitives/compositions/`,
> which is this lane's own directory, and it does so by **applying**
> [0171](0171-a-page-part-is-earned-by-the-region-it-occupies.md) rather than
> amending it. 0171 is the rule; this is the second time it has been run, and
> the first time by a routine that did not write it.

## Context

`loom.table`, `loom.table-row` and `loom.table-cell` were built on 22 August,
for a finding `Loom lessons` filed about documents: thirteen lessons had
degraded every table into one card per row, which is the standard responsive
fallback and loses the column-wise scan that made somebody write a table.

A month later the trio was still the largest single thing the catalogue could
not draw. It is registered, tested, and described in **every interpretation
request a deployment sends** — which is what
[0170](0170-a-library-is-a-set-to-choose-from-and-a-vocabulary-is-priced-per-entry.md)
made concrete: an unreachable primitive is not merely absent from the
phrasebook, it is surface a host pays for on every request. Two consecutive gap
inventories ranked it first of what was left:

> The eight left, in priority order: `table`/`table-row`/`table-cell` (a
> specification band), `halo`/`backdrop`/`reveal`, `divider`, `spec`, `pin`.

The treatments closed on 20 September. This record is about the first item.

**Nothing was blocking it except the question this record answers.** A table
needs a band to live in, a band needs a part, and `COMPOSITION_PARTS` had no
member a sheet of figures could be a design of.

## Decision

**A specification is a part of a page.** It occupies the region between the
figures that persuade and the price, and `COMPOSITION_PARTS` gains `specs`
between `metrics` and `pricing`.

### 0171's test, run in both directions

0171 is emphatic that the bar is not *is this content different* — content is
the wrong axis, because the tuple is an order and an order is a statement about
places. The test is that two parts **cannot stand in for each other**.

| swap | what the page loses |
| --- | --- |
| `specs` in place of `metrics` | the break. `metricsBand`'s own comment says what it is for: *"a landing page that is five bands of cards on the same ground reads as a list however good each band is; a full-width surface with four large figures on it is the break."* A table is not a break — it is the densest thing on the page |
| `metrics` in place of `specs` | the precision. Four round figures are claims. *Bursts to 2,000 for sixty seconds, then shaped rather than refused* is not a claim and cannot be made into one |
| `specs` in place of `comparison` | the answer to *why not the thing I already use*, which is a question about somebody else's product and which no table of our own numbers addresses |
| `comparison` in place of `specs` | the same precision, for the same reason: a comparison cell holds a verdict from a closed set of three marks, by construction |

Four swaps, four losses. The region is real and it is not any of its
neighbours'.

### The position is part of the decision

0171's first consequence is that **a part is admitted with its position**, and
that a candidate which could reasonably go in four places has not identified a
region. This one goes in exactly one, and the argument is an escalation of
precision that a reader walks down:

> `metrics` — four figures, rounded, at display size, to be *believed*.
> `specs` — the same kind of fact, unrounded, at reading size, to be *checked*.
> `pricing` — what it costs.

Placing it after `pricing` was considered and is worse: a specification read
after a price is a page asking somebody to commit and then telling them where
the edges are, which is the order a support ticket gets written in.

## Alternatives considered

**Ship it as a design of `comparison`.** The cheapest option, and it keeps the
canonical page at twenty-one bands. Rejected because 0171 names its failure
mode by name: *"The failure mode of this option is not a refused band — it is a
band shipped under the wrong part, where 0165 then forces it to answer to that
part's anchor."* A specification band anchored `#comparison`, reached from a
navigation link that says *Compare*, is wrong in a way that gets harder to undo
the more pages are assembled from it.

**Ship it as a design of `features`.** Rejected on the same test in one
direction: a page with a feature grid and no spec sheet is an ordinary landing
page, and a page with a spec sheet and no feature grid is a data sheet nobody
has been given a reason to read. `features` cannot stand in for `specs` and
`specs` very nearly can stand in for nothing — which is the asymmetry that says
*part*, not *design*.

**Build the table into the `pricing` matrix instead, and add no part.**
`pricingMatrixBand` is already a two-dimensional band, so the trio would become
reachable with no tuple change at all. Rejected because it makes a limit a
property of a plan. The whole editorial point of this band is the sentence its
caption carries — *every figure below is a limit of the system, not of a plan* —
and a limit moved into the pricing matrix is a limit the page is now claiming
can be bought around.

**Widen `loom.comparison-table` so it can hold ordinary cells, and add no
primitive and no part.** Rejected: `loom.table`'s own header settled this from
the other side in August. A comparison cell draws a tick, a cross or a dash
*because that is what a comparison is*, and a cell that could hold anything
would lose the property that a proposal cannot put a tick beside something a
reader does not get.

## Consequences

**The canonical page is twenty-two bands.** One longer, and 0171 says plainly
that this is the price and who pays it. The observation it left for whoever
reached this point stands and is worth repeating rather than re-deriving: at
some point the honest answer is more than one page sequence — a landing page, a
product page, a pricing page, each a named path through the same phrasebook.
Twenty-two is not that point, but a specification band is the most page-type-
shaped member admitted so far, and it is the row to watch.

**Five registered primitives become reachable by dropping in a band**:
`loom.table`, `loom.table-row`, `loom.table-cell`, `loom.spec` and
`loom.divider`. The measure has moved 52 → 63 → 66 → 71 over four days; this is
+5 from **one** band, against +11 from eleven, and it costs no new primitive and
nothing per interpretation request.

**A band may hold the same fact twice, at two registers, on purpose.** The run
of `loom.spec` nodes above the table repeats the table's first four rows. That
is not redundancy to be refactored away: it is what a specification is, and
`loom.spec`'s own header already drew the distinction this relies on — a stat is
a band's headline and a spec is *a detail attached to something else, never the
loudest thing in its card*. A run that restated the numbers at stat size would
be the `metrics` band a second time, which is the defect the swap test above is
about.

**One rule about regions is now checked rather than conventional.** A heading
region is placed in a `<thead>` and a `<thead>` holds rows, so column headings
go inside a row and never straight into the slot. `comparisonBand` recorded in
August what the absence of that check looks like in a photograph — every mark
one column right of its heading, with the steered tint on the competitor — and
until this record there was one band it could go wrong in. There are now two,
and `compositions.test.ts` holds the rule over both.
