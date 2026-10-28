# 0319 — The two libraries a window holds are assembled from a placing the deployment hands in, and a form nobody can place is on neither side

**Status:** Accepted

**Date:** 27 October 2026

**Section:** §4c (reader signals)

## Context

[0309](0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md)
turned a store into readings and
[0318](0318-a-windows-before-and-after-pairs-are-one-per-form-and-they-are-its-latest-two-revisions.md)
turned those readings into pairs, which reached five of the nine comparisons in
this subsystem. The other four — `libraryChangeOf`, `libraryCopyChangeOf`,
`libraryReachChangeOf` and `libraryWordReachChangeOf` — do not take a pair. They
take two whole **libraries**, every page as it stood against every page as it
stands, and 0318 named the fact that it did not assemble them as a gap on the
day it was built.

The gap is one line away in appearance:

```ts
libraryChangeOf(pairs.map(({ was }) => was), pairs.map(({ now }) => now))
```

**That composes, it runs, and it is wrong in a way the result does not say.** It
drops every form in `unpaired` — which is exactly where a page published inside
the window lands, because a page published inside the window has one revision in
it. `pagesGained` is the figure `libraryChangeOf` exists to report, and a
deployment that published two pages this week would read nought beside a `pages`
count that looks right. 0158's rule holds here as everywhere: a total that is
wrong and plausible is the error nothing notices afterwards.

**And the forms cannot be placed from anything this lane holds.** A form the
window holds one revision of is three different pages wearing one shape — a page
published inside the window, a page withdrawn inside it, or a page nobody
touched — and no counter row tells them apart. `StoredTally.updatedAt` is when
the fold last wrote the row, not when the page went up, and a door row's is the
same. The only party that knows is the deployment, which knows what it published
when.

## Decision

**`windowLibrariesOf(pairs, rows, placings)` in `src/signals/window.ts`, which
places a form from a source the caller hands in and names the forms that source
could not place.**

1. **A paired form is on both sides and is never asked about.** Its earlier
   revision is the earlier library's page and its later one is the later
   library's, by construction. There is nothing for a caller to answer and
   therefore nothing of its answer to ignore.
2. **An unpaired form is placed by `FormPlacings`, a `placingFor(form)`
   function** — the shape `RevisionTrees` and `PartDeclarations` already use, so
   a store, a cache, a map built for the call and a one-line double all satisfy
   it. `placingsIn` builds one from a list, keyed by the published form rule
   (0293), first-wins as `treesIn` is.
3. **The placings are a closed set of three.** `published` is the later side
   only, `withdrawn` the earlier side only, `unchanged` both sides at the one
   revision there is. `FORM_PLACINGS` and `describeFormPlacing` are published
   with them, so a surface can account for every form it was asked about.
4. **`undefined` is an answer, not a gap.** A form the source cannot place is in
   `unplaced` and on neither side, because **both guesses are assertions**: the
   later side says a page nobody touched was published, and both sides say a
   page published this week was always there.
5. **Forms named twice across the two lists are dropped after the first and
   counted in `duplicated`**, the pair winning over the unpaired form. Nought
   for anything `windowPairsOf` produced; not nought for a caller that built a
   `WindowPairs` of its own, and the repeat cannot be carried — two readings of
   one form on one side are `ambiguous` to `pairedWindowOf`, which takes the
   page out of every figure in the comparison while the totals go on looking
   right (0158).
6. **Each side is a `LibraryWindow`, and both carry the window's whole set of
   door rows.** `pageViewsFor` picks each page's own row from them on the
   revision and form its reading names (0290), and the two sides name different
   revisions, so one array answers both without either side borrowing the
   other's arrivals. All four library comparisons are then one call off a
   window.
7. **It adds no figure of its own**, which is the rule 0309 set and 0318 kept.
   `unplaced` and `duplicated` are facts about what it did not carry, not
   figures derived from what it did.

**The sides are two generations of revisions and not two halves of a window.**
An `unchanged` form carries one reading onto both sides, so its views are the
window's views on both: the page contributed no movement because it was not
changed, and `LibraryChange.viewsWas` and `viewsNow` are the floors a reader
checks two windows' comparability against rather than numbers to subtract.
`republished` is already the published count of how many of the library's pages
moved, so a library assembled this way says in its own figures what it is.

## Consequences

- **Every one of the nine comparisons is now reachable from a store in three
  lines**, which was the point of the rung 0309 began. The comparison half of
  this subsystem — the half the product's argument rests on, that a change can
  be inspected and attributed — needs no caller to write a pairing or a placing
  by hand.
- **A caller with no publishing history gets a smaller library and is told
  so**, rather than a plausible one. `unplaced` is a list a screen can print
  beside the comparison: *three pages are not in this, and here they are.*
- **A deployment that places its forms wrongly gets a wrong comparison**, and
  nothing here can catch it. That is the cost of taking the answer from the
  only party that has it; the alternative costings below are all worse.
- **A page published and then revised inside one window is paired**, so it lands
  on both sides rather than being counted as a page gained. `pagesGained` is
  therefore a count of the forms whose **only** revision is new. Stated as a
  limit rather than a rule, and filed.
- **A page served in two forms is placed twice**, because a second form can
  begin while the first stands unchanged — which is exactly what `formsGained`
  exists to tell from a page published (0295). A caller that places only one of
  the two has the other reported rather than carried along with it.
- **No payload field, no column, no store method, no migration and no new
  kind.** `broadcast.ts` is untouched and the browser cost is unchanged. This is
  the twenty-somethingth figure taken out of what the subsystem already knows
  rather than collected.
- **Nothing here makes per-reader identity cheaper or dearer to add later.** A
  placing is about a page's publishing history, not about a person.

## Alternatives considered

1. **Leave it to the caller, with the forms reported** — what 0318 shipped.
   `pairs` and `unpaired` are both published, so a caller holding its own
   history assembles the two sides in two lines. **Rejected:** it is the one
   composition the rung leaves undone, and the caller who does not notice
   `unpaired` writes the broken line above and gets a plausible total. The whole
   argument for the rung is that a caller writing a rule by hand is a caller
   getting it wrong in a file nobody reviews for it.
2. **Derive the placing from the revision numbers** — a form whose only revision
   is 1 is new; one whose only revision is 7 existed before. **Rejected:** a
   revision number is a count of revisions and not a date, a deployment that has
   pruned old counters has a form at revision 7 with nothing below it, and a
   rule that is right most of the time about which pages are new is the kind of
   figure nobody checks.
3. **Derive it from `updatedAt`.** **Rejected for the same reason, harder:**
   `updatedAt` is when the fold last touched the row. Every row a deployment
   still serves is touched every rollup, so the field says which pages are
   *live*, which is nearly the opposite of what is being asked.
4. **Default an unplaced form onto both sides** (treat silence as *unchanged*).
   **Rejected:** it is the quiet wrong answer in the other direction — a
   deployment that published two pages reads `pagesGained: 0` with nothing
   saying so — and it is the mistake §56 had just finished correcting in the
   region floor, where a caller that passed nothing got a default and nothing in
   the types said so.
5. **Default an unplaced form onto the later side** (treat silence as
   *published*). **Rejected:** it publishes a page nobody touched as a page
   gained, which is the figure 0295 drew its distinction to protect.
6. **A boolean `published` predicate rather than three placings.** **Rejected:**
   it cannot say *withdrawn*, so a deployment that retired a page this week has
   `pagesLost: 0` and no way to say otherwise, and the two readings it can make
   are then *published* and *everything else*, which is a distinction the
   comparison does not have.
7. **Take the two libraries' readings directly, with no pairs argument.**
   **Rejected:** the caller is then back to splitting its window by revision,
   which is 0318's rule spelled a second time, and the placing is only needed
   for the forms 0318 already identified as unpaired.
8. **Return the four comparisons rather than the two libraries.** **Rejected**
   for 0309's reason, unchanged through 0318: it privileges four of the
   thirty-eight readings, derives figures in a second place, and makes this rung
   a thing that counts.
