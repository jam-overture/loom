# The place one fix recovers the most of a page at

**`Loom signals`, 9 November 2026, evening run.**
Branch `signals-81-the-place-one-fix-recovers-most-of-a-page`. Record
[0375](../decisions/0375-a-deployments-unread-places-are-a-fourth-order-ranked-on-what-one-fix-recovers.md),
`Accepted`. `pnpm verify` **EXIT=0**, read out of a file.

## What this run completed

**This morning's run made one page's unread parts readable as the places its
reading stopped. The question an operator asks is not about one page.**

That reading — `pageFrontierOf`, record 0374 — answered the right thing and
answered it per page. The gap was filed as a finding the same morning and it was
the top of this lane's queue: **the fix-list has no order over unread-ness at
all**, and the only figure available to put one on was `PageReading.standings`'
`skipped`, which is the count the frontier was built to replace. `agenda.ts` has
a paragraph guarding the *orphaned* case and no guard for the ordinary one, so
two pages with one unread band each would have been ordered by how deeply each
band happens to nest.

`src/signals/unread.ts` is the fourth deployment-scale order. `deploymentUnreadOf`
takes one `PageFrontier` per page and is pure, linear, and reaches no store,
clock, registry or DOM.

**The key is what one fix recovers, and it is the one key that gets the
comparison right.** A row's `costs` is the parts behind the page's single largest
place.

| the page | unread parts | places | `costs` |
| --- | --- | --- | --- |
| one unread pricing band, three parts inside it | 6 | 3 | **4** |
| eight unread footnotes at the top level | 8 | 8 | **1** |

The first page has fewer unread parts in fewer places and is the page to go to,
because one afternoon there recovers four parts of it and one afternoon on the
second recovers one. Ordering on the page's whole unread count and ordering on
the number of places both rank them the other way round, and the mutations that
apply each of those fail three tests. The precedent is 0250, which ranks a page
by its **steepest** fall and not by everything it loses: a fix-list is a list of
things somebody will do one of, so the figure it is ordered by has to be what
doing one of them is worth.

**Both figures are published and neither is added into the other.** *Four
hundred and twelve unread parts in nine places* is the sentence: `unseen` is the
first number and `places` the second, side by side over the ranked rows. The
first is what a screen would otherwise have printed alone, which was 0374's whole
subject.

**An empty frontier is four sentences and only one means what it looks like.**

| standing | what the emptiness was |
| --- | --- |
| `whole` | every part of the page was reached by somebody |
| `unread` | nothing reported a view of this revision |
| `unsplit` | one window holds two forms and the asking named neither (0290, 0300) |
| `mismatched` | the counters name nodes this revision does not contain (0212) |

They are asked in the order the wrong answers are comforting in: `mismatched`
first, because a wrong tree-and-window pair produces places *and* figures and
they are artefacts; then `unsplit` before `unread`, because a window read as
neither form has a view floor of nought while its counters are full; and only
then is an empty frontier allowed to mean `whole`. A page off the order has
`at`, `costs` and `share` **withheld rather than zeroed** and its reading carried
whole, so every place it has is findable where it was taken (0301, 0326), and the
sums are over the ranked rows for the same reason.

**`worstPlacesIn` is the question the per-page reading could not be asked.**
Every place across the deployment, worst first, each carrying the page it is on —
*where in this deployment is the one place worth going to*, over nine pages
rather than nine screens opened one at a time. Ranked pages only.

**`notReporting` is a slice over every row.** A part a reader was demonstrably
below that said nothing about itself is a primitive not spreading the identity
attributes a broadcaster reads — `sdk/conformance.ts`' failure — so it is a fix
in the library and not a page to rewrite. It is over every row and not only the
ranked ones, which is what names the defect on the page whose figures are
withheld: the one page where nothing else would say so.

**It does not reach the fix-list, and that is asserted rather than claimed.**
`read.agenda` is checked equal to `deploymentAgendaOf` over the same three
readings, so `DeploymentAgenda.first` is provably untouched. The order is
published from `windowAgendaOf` as `WindowAgenda.unread`, beside the agenda the
way `converting` stands beside `page`.

### The second thing in the branch, and the order could not exist without it

`PageFrontier` dropped its audience. `PageReading` has it and `ReadingProgress`
carries it for exactly this reason — an order over a deployment's pages tells two
readings apart by a tree, a revision **and** an audience (`readingKeyOf`), and a
reading that drops the audience hands that order two forms of one page it cannot
tell apart (0300). Built on `main`, an order over frontiers would have counted a
deployment's second form of a page as its first handed in twice, which is the
permanent kind of miscount (0158).

`audienceId` and `audiences` travel now, from the reading unchanged. The census
is the second half: a window read as neither of two forms is empty in the same
shape an unopened page is, and the census is the only thing that tells them
apart.

## Decisions I took that were not specified

**Publishing the order beside the fix-list rather than re-ranking the fix-list.**
The finding asked for an order and left where it goes open, saying the ordering
*is a judgement about a screen*. Its key is parts of a page and the fix-list's
three orders are readers, so there is nothing to compare (0327) — and re-ranking
what an operator is already handed, on a figure in a fourth unit, is a decision
about a screen rather than a join. The figures are now on the table and `first`
is left as it was, deliberately.

**Ranking on the largest single place and not on the page's total.** The
page's whole unread count is on its reading already and is deliberately not the
key, for 0250's reason above. Both keys are published; only one is sorted on.

**Taking the page's worst place from `largestUnreachedIn` rather than scanning
for it.** A linear max would have been marginally cheaper and would have been a
second spelling of *which place is worst* in a subsystem that has been bitten by
exactly that (`readingKeyOf`, 0293). One sort per page is `O(f log f)` in a
reading that is already `O(n)` in the page, which is well inside rule 4's bound —
the rule is about the quadratic shape, not about a sort.

**Five standings rather than reusing `DeploymentSilence`.** `unread` and
`unsplit` are spelled the same as that set's members because they mean the same
thing; `unscaled` and `inconsistent` have no meaning here, and `whole` and
`mismatched` have no member there. A borrowed set with two dead members and two
missing ones is worse than a closed set of its own.

**`mismatched` and not `contested` or `orphaned`.** `contested` is `agenda.ts`'
word for a page an order ranked and a fault spoiled; `orphaned` is `parts.ts`'
word for the rows themselves. One word for two figures in one subsystem is how a
screen draws the wrong one.

**The share is the tie-break and never the key.** It is the better sentence on a
small page — forty parts behind one band is most of a fifty-part page and a
corner of a four-hundred-part one — and as a key the smallest page in a
deployment would hold the top of the order for ever.

**Not giving `notReporting` a fault-vocabulary member.** This lane recommended
waiting for one real instance this morning and I did not revisit it. The list is
published; the name waits for its reader.

**Not adding the place to `AgendaRow`.** It is the obvious next thing and it is a
fifth argument to `deploymentAgendaOf` plus an answer to *may `first` ever name an
unread band*, which is a judgement about a screen. Filed, with the three things a
fix has to settle, rather than done in the corner of a run whose unit is a new
reading.

## Records added

**0375**, `Accepted` — *a deployment's unread places are a fourth order, ranked
on what one fix recovers*. It contradicts no accepted record and touches neither
the tree schema nor the delta model, so it is not architectural. Seven clauses
and eight rejected alternatives, the three worth reading being ranking on the
page's total, ranking on the number of places, and widening `DeploymentAgenda` to
hold this.

**Numbered 0375, which is the next free number on `main` and on every open
branch.** `main` carries 0374 as its highest; 0371 is still claimed by #834 and
0375 is claimed by nothing.

## Real test numbers

`pnpm install && pnpm verify` — **EXIT=0**, read out of `verify2.exit` rather
than from a harness notice, after the API reference was regenerated.

| | files | tests |
| --- | --- | --- |
| framework and tools | 277 | **6,765** |
| application | 470 | **7,509** |

**14,274 pass. Nothing failed, nothing was skipped, no test was weakened, and no
existing assertion changed its claim in this lane or any other.**

- **+25 tests, +1 file.** Measured against `origin/main` over the same scope
  (`vitest run src/`, same container, both runs green): **249 files and 6,119
  tests become 250 and 6,144.**
- **21 are the new `src/signals/unread.test.ts`**, **2 are in
  `src/signals/frontier.test.ts`** for the audience and the census, and **2 are
  in `src/signals/window-agenda.test.ts`** — one checking the rung's line against
  the published call, one checking that a page the fix-list ranks first and a page
  this order ranks first can differ while `read.agenda` stays equal to
  `deploymentAgendaOf` over the same three readings.

**Two reds on the way, both of them mine and both found by a gate.**

1. **`pnpm verify` went red at `tsc` on the first full run**, `EXIT=2`:
   `unread.test.ts` imported `TreeId` from `./index.js`, which does not export it
   — it is `../ids.js`. The twenty-one tests had passed under `vitest` minutes
   earlier, because `vitest` does not typecheck. It is the plainest available
   argument for running the whole gate rather than the file.
2. Two of my own fixtures were wrong before the code was, both in the tie-break
   test: a tally defaulting to `TREE` on a page read as `OTHER_TREE` made the
   whole window foreign, and then a four-part fixture whose first place in
   reading order was not the place I had written the assertion about.

### Mutations

**21 run, 21 killed.** Each was applied to `src/signals/unread.ts` alone and
judged against `unread.test.ts`. One survived the first pass, it was a real gap
in the tests, and the numbers below are the second run's.

| | mutation | tests failed |
| --- | --- | --- |
| 1 | the order is on the page's whole unread count | 3 |
| 2 | the order is on how many places there are | 3 |
| 3 | a wrong tree-and-window pair is ranked | 2 |
| 4 | a window read as neither form is not named | 1 |
| 5 | a page nobody opened reads `whole` | 1 |
| 6 | the two forms are asked about after the view floor | 1 |
| 7 | the worst place is computed for every standing | 1 |
| 8 | a page off the order costs nothing rather than nothing known | 2 |
| 9 | the sums are over every row | 1 |
| 10 | the places count is a count of pages | 3 |
| 11 | the last of two readings of one page stands | 1 |
| 12 | a page handed in twice is not counted | 2 |
| 13 | the defect list is over the ranked pages only | **1 — was 0** |
| 14 | every page's places are listed, ranked or not | 1 |
| 15 | the places are listed smallest first | 3 |
| 16 | only each page's worst place is listed | 2 |
| 17 | the share does not break a tie | 1 |
| 18 | the oldest revision of a page comes first | 1 |
| 19 | the share is of the places rather than of the page | 3 |
| 20 | the place taken is the first in reading order | 1 |

**13 was the real gap and it is the interesting one.** `notReporting` is a slice
over every row, and every fixture I had written it against was a page the order
had ranked — so narrowing it to the ranked rows changed nothing any test looked
at. The gap and the bug are the same thing: **the page whose figures are withheld
is the page where nothing else names the library defect.** The test now hands in a
page that is `mismatched` *and* reports nothing below a reader, and asserts the
row is in `unranked` and in `notReporting` at once.

**Mutations 11 and 12 are the double-count pair this lane requires.** 11 makes
the last of two readings of one page stand instead of the first; 12 stops
counting what was dropped. Both die, and the test beside them holds two readings
of two pages against one reading of each and asserts the ranked rows, both sums,
every standing and the tree count are identical (0158).

## What a browser pays

**Nothing.** `src/signals/unread.ts` is pure, server-side and imported by nothing
a browser loads; `broadcast.ts` and its import graph hold no file this branch
touches. Measured through the gate's own bundler and `gzipSync`: **7,543 bytes
minified, 3,350 gzipped**, which is what `main` measures to the byte.

The two fields added to `PageFrontier` are on a server-side reading and reach no
payload, no table and no wire. Nothing new is collected: a place the reading
stopped is derived from the tree the counters already name, which is what 0167
refused to put on the wire for exactly the kinds this reads.

## Findings

**Filed three, closed one.**

1. **Closed** — this lane's own entry of this morning, *the fix-list orders by a
   count that is forty times the size of the thing to fix*. The closing entry
   names each of the three things that entry said a future run should hold, says
   where each is held, and says plainly what it asked for that this did not do:
   the fix-list itself is unchanged.
2. **A fix-list row says which page to rewrite and not where on it** (this lane,
   `agenda.ts`). The place is one join away and the entry carries the table of
   the two locations available, which are different questions — a fall needs both
   ends to have reported, and a place the reading stopped is the end where there
   is no ratio to take — plus the three things a fix has to settle, the third
   being whether `first` may ever name an unread band.
3. **Eight new names on `@jam-overture/loom/signals`** (`Loom docs`). The
   generator's own output, and two sentences written to be lifted rather than
   rewritten. It is the **third** entry asking for a paragraph on that one page —
   8 November's seven names, this morning's five, and these eight — so one
   paragraph answers all three, and the entry says so.

## The branches beside this one

**No open pull request touches `src/signals/`, and nothing in this branch races
anything.** Three were open when this started:

- **#843** is this lane's own, from this morning: **no code at all** — one
  `FINDINGS.md` entry and a postscript to a report, recovered after #837 merged
  without them. Nothing in `src/` is in it, so there is nothing to collide with,
  and this branch is cut from `main` rather than stacked on it.
- **#834** (`Loom portal`) is a record and a plan file, and claims **0371**.
- **#778** (`Loom docs`) is a marketing-and-docs word count.

The files this branch shares with any of them are `decisions/README.md`, which is
generated and regenerated rather than hand-resolved, and `FINDINGS.md`, which is
union-merged and appended to. `reference.generated.json` is regenerated too.

**#829 and #837 both landed** since this morning's run, so `outlineTree` carries
an explicit stack on `main` now (0372) and the frontier reading this builds on is
on `main` as 0374. Nothing here depends on the first and everything here depends
on the second.

## Open questions

Three, all recommended, none blocking. They are in the pull request comment.

1. Whether an `AgendaRow` should carry the place a page's reading stopped
   (finding 2). **Recommend yes, as its own unit**, with the fifth argument
   required rather than optional.
2. Whether `DeploymentAgenda.first` may ever be *go and look at this band*.
   **Recommend no for now** — it is the one judgement here that is about a screen
   rather than about a figure, and the figures are now published for whoever
   draws it.
3. Whether the portal's *By page* drawer wants `worstPlacesIn` rather than a
   per-page call. **Recommend it reads the deployment list first** — nine pages'
   frontiers were nine screens, and the list is the thing that was missing.

## On the parked door

Nothing here makes per-reader identity more expensive to add later, and nothing
here is a step toward it. The reading is a tree, a set of standings and a
partition over them: no key, no region, no reader, nothing per person, and no
join that would need one. The `view` key is not read, not stored and not named by
either module.

**The field that travels is worth saying plainly, because it is the kind of
thing that gets mistaken for a step.** `PageFrontier` now carries `audienceId`
and `audiences`. An audience is a **form of a page** (0263, 0284) — the deltas a
tree earns for a readership, named on the counters by a column — and not a
property of a person. Two forms of one page are two rows here for the same reason
two revisions of it are: both are live, and the parts one form's readers never
reached are not the parts the other's never reached. Nothing in it identifies a
reader, and the reason it had to travel is the opposite of identity: without it
two populations would have been added into one.
