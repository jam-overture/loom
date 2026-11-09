# 0372. A page's unread parts are reported as the places its reading stopped, and each is behind exactly one

**Status:** Accepted
**Date:** 2026-11-09
**Section:** §5 (reader signals), the counters

> **Written as `0372` rather than `0371`.** `0370` is the highest on `main`, and
> `0370` and `0371` are both claimed by open branches — #829 (*every read of a
> tree carries an explicit stack*) wrote `0370`, which `main` already has, and
> #834 wrote `0371`. `0372` is the next number free on `main` and on every open
> branch, which is the precedent #802 and 0368 set for this situation: take the
> number that needs the fewest records renumbered at merge (0097).

## Context

[0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)
joined a window's tallies to the tree they were filed against, and the sentence
it was built for is the one this subsystem exists to say: *which parts of a page
are read and which are scrolled past*. A counter can only ever say what
happened; the tree is the universe that turns silence into a measurement, so
`pageReadingOf` gives every addressed node of a revision a standing — `read`,
`skipped`, or `unknown` where nothing can be said.

**Part by part is not how that answer is true.**

A page whose pricing band never came into anybody's viewport has the band, the
rows inside it, the cells inside those, and every heading and price among them
all reporting `skipped`. That is one fact about one band, restated once per node
underneath it. `PageReading.standings` counts forty, and a screen drawn on that
number says *forty parts of this page go unread* about a page with **one** place
a reader stopped.

It is the plausible-false-number failure in its worst direction. The figure is
the right shape, it moves when the page changes, it is defensible from the rows,
and it is forty times the size of the thing to fix — so a fix-list built on it
lists forty parts and leads with whichever one sorted first. Seven readings are built on top of
`PageReading` and every one of them inherits it, because the count is on the
reading itself: `agenda.ts` already has a paragraph about `skipped`
manufacturing the steepest fall in a deployment, and it is this count it is
about.

There is a second defect underneath it, filed on 8 November and left open for
exactly this run. `PartReading.parentId` is the **tree** parent, and a slot is a
node with children and is never a part — only an element carries the identity
attributes a broadcaster reads — so an element handed into a slot has a slot's
id as its `parentId`, an id that appears nowhere in `PageReading.parts`. Any
reading that grouped a page's parts by their containers would hang a band off a
node it has no row for. `insideReadingOf` does not have the defect, because 0368
clause 4 made its `withinId` the nearest *addressed* ancestor; `parts.ts` had
never been asked the question.

## Decision

**A page's unread parts are reported as the places its reading stopped — the
frontier — and every unread part is accounted for by exactly one of them.**

**1. `PartReading.withinId` is the nearest addressed ancestor, and `parentId`
stays the tree parent.** A second field rather than a correction: `parentId` is
published, three readings and the generated reference carry it, and it is the
right answer to the question it asks — *where is this node in the tree*.
`withinId` is the answer to the other one, is what `within` names on the wire
(0167), and is the same field by the same rule as `InsidePart.withinId` (0368
clause 4). One page has one containment, and two readings of it must not
disagree about what contains what.

**2. A place the reading stopped is a part that reported nothing whose
containing part did not.** `src/signals/frontier.ts` is `pageFrontierOf`, a pure
function of a `PageReading` — no tree, no registry, no store, no clock. Nothing
is collected, stored or sent to derive it: the containment comes from the tree
the counters already name, and the browser could not answer this at any payload,
because it does not know which of the nodes it reports on contains which others.

**3. Every unread part is behind exactly one of them, and the partition is on the
nearest.** `UnreachedPart.unseen` counts the parts whose nearest frontier part is
this one, so the figures add to `PageReading.standings`' `skipped` without a
caller checking anything, and *this is the one place to fix and it costs you
nineteen parts of the page* is a sentence rather than an estimate. The same
partition carries the words: a part's `copy` is its own and never its subtree's
(0122), so `unreachedWordsIn` concatenates rather than deduplicates.

**4. The frontier nests only around a defect, and says so rather than
double-counting.** A part that reported nothing while a part inside it reported
reach was demonstrably on a reader's screen, so it is a primitive not spreading
its identity attributes — the failure `sdk/conformance.ts` exists to catch — and
the read part's own unreached children are a second frontier part inside the
first. Taking the partition on the *nearest* frontier part keeps the arithmetic
exact in that case, and the defect is published as `PageFrontier.notReporting`
and `UnreachedPart.reportedBelow` instead of being absorbed.

**5. A page nobody opened has no frontier.** `skipped` means *the window held
views of this revision and none of them said anything about this part*, so a
window with no views makes every part `unknown` and this reading empty. *A page
with visits, every part of which went unseen* is not a state counters can
produce (0212), and the empty frontier is the honest answer rather than a page
read as stopped at the top — the same distinction
[0301](0301-a-refused-reading-is-not-a-page-nobody-read-and-the-census-travels-with-the-progress.md)
drew for a refused reading, reached here by the same route.

**6. *Passed over* is the one statement about a reader rather than about an
absence.** `PageFrontier.passedOver` names parts that were reached, hold at least
one part, and whose every part went unreached — a reader had it on screen and
went past the whole of what it holds. A part with an `unknown` anywhere inside it
is withheld, because *every part of it* cannot be claimed about a part nothing
can be spoken for.

**7. Nothing here is called a stop.** `progress.ts` already measures a **fall** —
of the views that reached one part, how many reached the next of the same run —
and calls it `ReadingStop`. This measures the other end of the same page: parts
that reported nothing at all, where there is no ratio to take. One word for two
figures in one subsystem is how a screen comes to draw the wrong one.

## Consequences

- **A fix-list can be ordered by what a fix is worth.** `largestUnreachedIn`
  ranks the frontier by `unseen` — the parts of the page one absence costs —
  which is a figure no reading in this subsystem could compute before.
  `agenda.ts` and the portal's *By page* drawer are the two places it belongs,
  both read-time, and neither needs a migration to adopt it. Filed rather than
  changed here: the fix-list's ordering is a judgement about a screen.
- **`PartReading.withinId` is a new published field**, and the two fields now
  invite the question of which to use. The documentation on each says so in a
  sentence, and the one case where they differ — a slot between two elements — is
  asserted in `parts.test.ts`.
- **Nothing reaches a reader's browser.** `broadcast.ts` and its import graph are
  untouched; `frontier.ts` is server-side, pure, and imported by nothing a
  browser loads. The bundle measures the bytes it measures on `main`.
- **Linear in the parts.** One pre-order pass for the containment and the subtree
  ends, one forward pass to assign each unread part to the frontier part that
  accounts for it, and prefix counts for the subtree standings. Rule 4's bound
  exists because the ledger was quadratic once; the words are pushed into one
  array per frontier part for the same reason, since rebuilding an array per part
  behind one frontier part is the same shape.
- **The frontier counts parts of a tree, not rows**, so a window handed in twice
  cannot inflate it: `pageReadingOf` has already dropped the repeat and said so
  (0158). It is asserted rather than argued.
- **Five new names on `@jam-overture/loom/signals`**, which is the widest door in
  the package. Filed for `Loom docs` rather than written here.
- **Per-reader identity is no closer and no further.** The reading is a tree, a
  set of standings and a partition; there is no key, no region, no reader and no
  join that would need one.

## Alternatives considered

**Correcting `parentId` to mean the containing part.** One field, no choice for a
caller, and the honest meaning. Rejected: it is a published field that three
readings and the generated reference carry, and a silent change of meaning is the
kind of thing 0097 exists to stop. A caller reading it as the tree parent — which
is what it says — would start getting a different answer with no signal.

**Reporting the frontier as a flag on `PartReading`.** `stops: boolean` on each
part, and a caller filters. Rejected: the figure that matters is not *which part*
but *how much of the page one absence accounts for*, and that is a count over a
subtree. A boolean would leave every consumer to compute the partition, which is
the arithmetic a nested frontier makes easy to get wrong.

**Taking the partition on the outermost frontier part rather than the nearest.**
Simpler to say: everything beneath a frontier part belongs to it. Rejected: it
double-counts in the one case the frontier nests — a read part inside an
unreported one — and it double-counts *silently*, because the two figures still
look plausible. The nearest-frontier rule makes the sum equal `skipped` in every
window, which is a property a test can hold.

**Computing the frontier at rollup time, onto the stored rows.** Rejected for
0212's reason and one more. A standing is a fact about a window of reading
*against a revision of a tree*, and the tree a window is read against is a
choice the caller makes — a goal reads every revision, this reads one. Baking it
would fix that choice at write time.

**A sixth signal kind for *a reader scrolled past this*.** Rejected under rule 6
of [`docs/signals.md`](../docs/signals.md), and it is also the wrong instrument:
a browser cannot tell *scrolled past* from *never rendered*, and the server can,
because it holds the tree. Collecting it would cost every reader bytes on every
page to learn less than the join already knows.
