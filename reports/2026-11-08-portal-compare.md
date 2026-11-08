# *Compare* on a page's history

**Lane:** `Loom portal` · **Date:** 8 November 2026 ·
**Branch:** `claude/project-thread-ho1e1e` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8c ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *5 ·
Pages · History*, the version cards

Claimed by a portal run at 2026-11-08 15:25 UTC (#821).

## Why this, and why now

No portal pull request or `portal-*` branch had been pushed in the last three
hours, and the maintainer had left no comment on a portal pull request. 8a and
8b are done (8b short of *Stays on*), and the last piece 8c owed was
*Compare*. Its inputs (the page's copies, their records, the version the site
last published, and the runtime's `treesAt`) are all on `main`.

## What shipped

- **Every Loom change on *Page history* offers *Compare*.** It opens a drawer
  beside the cards, whose subject is in the address (`?compare=<proposal id>`,
  kept when *Measured on* picks another goal, and *Measured on* kept when the
  drawer closes), as the drawers on *Signals* are.
- **The drawer draws the page just before the change and just after it, side
  by side,** as two small outlines of the page's parts nested as the page
  nests them, never tree JSON. A part added or changed is outlined green on
  *After*; a part taken off is outlined red and dashed on *Before*; a part
  moved is outlined green where it went and red and dashed where it was. A
  sentence above says how many of each (*1 part added, 1 part moved, 1 part
  taken off.*), and each part's id is one point away.
- **A long page stays a small outline.** Each changed part is drawn with the
  parts it sits inside and the part either side of it; every other run of
  parts folds into one line, *12 parts unchanged*.
- **A part moved to the top marks that part alone**, not every part it passed:
  the parts that kept their order are the longest run both versions read in
  the same order, and only the others count as moved.
- **It never draws a guess.** Where the page cannot be rebuilt, the drawer
  says why: the change no longer fits the site's newer version (Loom keeps
  only the version the site last published, so the page around a dropped
  change is gone); the site has published a newer version Loom has not
  followed yet (compare after Loom's next look); or the record would not fold
  back. A store that does not answer says so.
- The site's own versions offer no *Compare*: the version before them is not
  kept anywhere.

## How it is built

- `_lib/compare.ts` (new, pure): `compareTrees(before, after)` marks each part
  `added`, `changed` (its type, props or the words directly in it), `moved`
  (another parent, or out of the longest common order among its siblings) or
  `removed`, and says the summary; `foldedOutlineOf(rows)` folds the outline
  for drawing.
- `_lib/compare-reading.ts` (new): `compareChange` finds the change on the
  page's current copy's record, checks the copy stands on the version the
  site last published (`standsOn`, as *Propose reverting* and the read door
  do), and asks the runtime's `treesAt` for the revision before the change and
  the change's own, folded from that version, in one read of the log.
- `pages/[tree]/_components/compare-panel.tsx` (new): the drawer.
  `version-card.tsx` takes a `compare` link beside *Follow it from Accept*.
- `pages/[tree]/history/page.tsx`: reads `?compare=`, reads the copies and the
  published page only once the drawer is open, and lays the cards and the
  drawer out side by side on a wide screen.

## Decisions taken, and why

- **Compare draws the change as it is on the live page's record.** A change
  carried onto a newer copy by the replay (0358 clause 6) is drawn where it
  sits on that copy, so *Before* is the page readers had just before it as the
  site now publishes it. That is the page the verdict is about.
- **No table.** Drawing the site's own edits, and changes dropped by them,
  would need every published version kept, which is a new table and a
  `pnpm db:push`. Not taken: the wireframe's purpose (seeing what a Loom change
  did) is served without it. Said in `docs/portal.md` for a later run.
- **No record.** This applies 0358 and decides nothing it leaves open.

## Tests

- `_lib/compare.test.ts`, 10 tests: an unchanged page marks nothing and says
  so; a part taken off is marked on *Before* with what was inside it; one
  added on *After*; one moved to the top marks only itself on both sides; one
  moved into another part; a part's own settings changed marks it and not its
  parent; every kind at once in one sentence; folding keeps a change's
  ancestors and neighbours and folds the rest; an unchanged page folds to one
  line.
- `_lib/compare-reading.test.ts`, 7 tests against the memory tree store: the
  page before and after a change; a later change drawn from the page the
  earlier one left; the current copy read once a newer version was followed; a
  change not on the record, and a page never copied, are not drawn; a
  published version the copy does not stand on is not drawn; a store that
  does not answer is unreadable.
- `compare-panel.test.tsx`, 5 tests; `version-card.test.tsx` +1 assertion.
- Portal suite: 119 files, 2,152 tests before this run's last additions; full
  `pnpm verify` figures are in the pull request.

## Where the wireframe stands

*5 · Pages · History* now has the chart, *Measured on*, one card per version
with its verdict, the dashed *Not live yet* card, *Propose reverting* and
*Compare*. Unit 8c is done in the portal. Still missing from the section: the
page's own *For review (N)* tab, and *Compare* on the site's own versions
(needs each published version kept).
