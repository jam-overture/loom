# 0375. A deployment's unread places are a fourth order, ranked on what one fix recovers

**Status:** Accepted
**Date:** 2026-11-09
**Section:** §5 (reader signals), the counters

## Context

[0374](0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)
made one page's unread parts readable as **the places its reading stopped** — a
part no view reported reaching whose containing part was reached — with every
unread part behind exactly one of them. It was written because `skipped` is the
wrong figure to put on a screen: a pricing band nobody reached has the band, the
rows inside it, the cells inside those and every heading among them all
reporting `skipped`, so `PageReading.standings` counts forty about a page with
one place to fix.

That reading is per page, and the question an operator actually asks is not.
This lane filed the gap as a finding the same day: **the fix-list has no order
over unread-ness at all**, and the only figure available to put one on is the
count the frontier was built to replace. `agenda.ts` guards the *orphaned* case
and says so in a paragraph of its own — a page whose counters name nodes its
tree does not contain reads mostly `skipped`, which manufactures the steepest
fall in a deployment — but it has no guard for the ordinary case, and no figure
to use instead. Two pages with one unread band each would be ordered by how
deeply each band happens to nest, which is a fact about the markup and not about
the readers.

Three more facts shaped what could be built.

**The frontier reading did not carry its audience.** `PageReading` has it and
`ReadingProgress` carries it for precisely this reason — an order over a
deployment's pages tells two readings apart by a tree, a revision **and** an
audience (`readingKeyOf`), and a reading that drops the audience hands that
order two forms of one page it cannot tell apart (0300). `pageFrontierOf`
dropped both the audience and the census, so no order could have been built over
it without counting a deployment's second form as its first handed in twice
(0158).

**An empty frontier is four different sentences.** A page nobody opened has no
frontier; a page every part of which was reached has no frontier; a window
holding two forms with none asked for is read as neither, so every part is
`unknown` and it has no frontier either (0290); and a reading whose rows name
nodes the revision does not contain reads as *a page every reader stopped at the
very top of*, which is the most plausible-looking output the reading has. Of the
four, only the second means what the emptiness looks like.

**The three orders already over these pages are all in readers** — readers lost
at a fall (0250), readers lost between the two ends of a question (0333), the
readers a fault costs (0271) — and a part of a page is none of those things.

## Decision

**A deployment's pages are published as a fourth order, ranked by the parts of
each page that its single costliest unread place accounts for, in its own module
and its own unit, and it does not reach the fix-list.**

`deploymentUnreadOf` in `src/signals/unread.ts` takes one `PageFrontier` per
page and returns `DeploymentUnread`. Seven clauses.

**1. The key is what one fix recovers, and never a page's total.** A row's
`costs` is `UnreachedPart.unseen` for the page's largest place: the parts behind
the one place somebody would go and fix. Ranking on the page's whole unread
count would put a page with ten scattered small places above a page with one
large one and send an operator where their afternoon buys least, and ranking on
the number of places does the same thing one step more plainly. The precedent is
0250, which ranks a page by its **steepest** fall and not by everything it
loses: a fix-list is a list of things somebody will do one of.

Ties fall to the share of the page one place hides, then to tree id and newest
revision first, so two pages of equal cost do not reorder on a refresh.

**2. The page's worst place is taken from `largestUnreachedIn` and not chosen
again.** One rule for *which place is worst*, in the module that publishes the
places — the lesson `readingKeyOf` was published for (0293), applied before the
second spelling exists rather than after.

**3. Both figures are published and neither is added into the other.**
`DeploymentUnread.unseen` is the parts nobody reached and `places` is the number
of places they are behind, side by side over the ranked rows: *four hundred and
twelve unread parts in nine places* is the sentence, and the second number is
the one an afternoon is spent on. The first is what a screen would otherwise
have printed alone, which is 0374's whole subject.

**4. Five standings, and only one of them means what an empty reading looks
like.** `ranked`, `whole`, `unread`, `unsplit`, `mismatched`. They are asked in
the order the wrong answers are comforting in: `mismatched` first, because a
wrong tree-and-window pair produces places and figures and they are artefacts;
then `unsplit` before `unread`, because a window read as neither of two forms
has a view floor of nought while its counters are full; and only then is an
empty frontier allowed to mean `whole`.

**5. A page the order did not rank has its figures withheld rather than zeroed,
and its reading carried whole.** `at`, `costs` and `share` are `null` off the
order — `0` would read as *nothing here went unread*, which on a `mismatched`
page is the opposite of what is known. The standing is where *there is no
figure* is said, and the row carries the frontier reading, so every place a
withheld page has is findable in the place it was taken to (0301, 0326). The
sums in clause 3 are over the ranked rows for the same reason.

**6. `PageFrontier` carries the audience and the census.** `audienceId` and
`audiences`, from `PageReading` unchanged, on the terms `ReadingProgress`
carries them: the first is what makes two forms of one page two rows, and the
second is the only thing that tells a window read as neither form from a page
nobody opened.

**7. A part that said nothing with a reader below it is a different list and a
different sentence.** `DeploymentUnread.notReporting` is a **slice** of the
rows, over every row and not only the ranked ones, so nothing is counted twice
(0158) and a library defect is named on the page whose figures are withheld —
which is the page where nothing else would say so. The instruction is a fix in
the library and not a page to rewrite: a part a reader was demonstrably below
and which said nothing about itself is a primitive that does not spread the
identity attributes a broadcaster reads, which `sdk/conformance.ts` exists to
catch.

**And the question the per-page reading could not be asked.**
`worstPlacesIn(unread, limit?)` is every place across the deployment, worst
first, each carrying the page it is on — *where in this deployment is the one
place worth going to*, over nine pages rather than one opened at a time. Over
the ranked pages only, because a withheld page's places are artefacts and this
is the list whose rows are furthest from the standing that says so.

**It does not reach `deploymentAgendaOf` and does not move
`DeploymentAgenda.first`.** The order stands beside the fix-list, published from
`windowAgendaOf` as `WindowAgenda.unread` the way `DeploymentAgenda.converting`
stands beside `page`, and which of them a screen opens with is the screen's
judgement. Its key is parts of a page and the fix-list's three are readers, so
there is nothing to compare: the refusal
[0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
makes about adding figures in different units, applied to a fourth unit.

## Consequences

**A deployment can be asked where to go, and not only which page.** Nine pages'
frontiers were nine screens; they are one list, and the list is ordered by what
doing one thing on it is worth.

**The count `skipped` was going to be ordered on now has an alternative in the
place a fix-list would reach for it.** The finding of 9 November is closed by
this and the answer is a published order rather than a note on a module.

**The fix-list is unchanged, and that is a decision somebody may revisit.** A
page high in this order and absent from `DeploymentAgenda.page` is a real state:
readers reach the parts they reach and lose nobody at a fall. Whether `first`
should ever name it is a judgement about a screen, and it stays open with the
figures now on the table rather than being settled by the run that built them.

**Four orders over one window is a rung that now publishes six readings.**
`windowAgendaOf` makes this one, under the rule it already keeps: a reading with
a published call of its own is handed in, and a reading that is one call over the
assembly's own readings is made.

**Nothing reaches a reader's browser, and nothing is added to any payload or
table.** A place the reading stopped is derived from the tree the counters
already name, which is what 0167 refused to put on the wire for exactly these
kinds. The broadcaster measures 7,543 bytes minified and 3,350 gzipped, which is
what it measures on `main`.

**Two new fields on a published reading.** `PageFrontier` gained `audienceId`
and `audiences` a day after it shipped. Additive, so nothing that reads it
breaks; the alternative was an order that silently counted two forms as one.

**Nothing here is a step toward per-reader identity and nothing here makes it
more expensive to add.** The reading is a tree, a set of standings and a
partition over them. No key, no region, no reader, nothing per person: the
`view` key is not read, not stored and not named by either module, and the
audience that now travels is a *form of a page* (0263, 0284) and not a property
of a person.

## Alternatives considered

**Ranking on the page's whole unread count.** The obvious key and the wrong one.
It would have reproduced, one level up, the exact defect 0374 was written about:
a page with forty unread leaves outranks a page with one unread band, and the
second is the page to go and look at. Rejected, and the mutation that applies it
fails three tests.

**Ranking on the number of places.** The honest reading of *how many things are
there to fix*, and it orders a deployment the same wrong way round: forty places
costing one each beat one place costing forty. Published as `places` because it
is worth saying; refused as the key.

**A share of the page rather than a count of its parts.** It is the better
sentence on a small page and it cannot be the key, because the smallest page in
a deployment would hold the top of the order for ever — a two-part page with one
unread part is half of itself. It is the tie-break instead, which is where it is
right.

**Widening `AgendaWork` or `DeploymentAgenda` to hold this.** It would put a
figure in parts into a reading whose every figure is a count of pages joined
from readings in readers, and it would make `first` a comparison between a
reader and a part. 0327 refuses exactly that, and 0330/0336 already record what
happens when one order's evidence is read off another's.

**Deriving the frontiers inside `deploymentUnreadOf` from a window and a
registry.** It would reach a tree and a store from a module that is a pure
function of readings, and it would make a second copy of a reading a screen
already draws — the defect every derived reading in this subsystem takes
readings to avoid (0330).

**Correcting `pageFrontierOf` to key on something other than the audience.**
There is nothing else to key on: two forms of one page are one tree at one
revision, told apart by a column and nothing else (0284). The field had to
travel.

**A sixth signal kind, or a fault-vocabulary member for `notReporting`.**
Neither. The vocabulary is closed (rule 6 of [`docs/signals.md`](../docs/signals.md))
and nothing here needs a new kind; and a fault nobody has seen in the wild is a
name invented ahead of its reader, which is the trap `role`'s one-member
vocabulary was written to avoid. The list is published and a member waits for a
real instance.

**Calling the wrong-pair standing `contested` or `orphaned`.** `contested` is
`agenda.ts`' word for a page an order ranked and a fault spoiled, and `orphaned`
is `parts.ts`' word for the rows themselves. One word for two figures in one
subsystem is how a screen comes to draw the wrong one, so the standing is
`mismatched` — the tree and the window do not belong together.
