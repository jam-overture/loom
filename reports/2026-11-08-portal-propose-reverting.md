# *Propose reverting* on a page's history

**Lane:** `Loom portal` · **Date:** 8 November 2026 ·
**Branch:** `claude/project-thread-rbk5gl` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8c ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *5 ·
Pages · History*, the version cards

Claimed by a portal run at 2026-11-08 13:38 UTC (#819).

## Why this, and why now

No portal pull request or `portal-*` branch had been pushed in the last three
hours, and the maintainer had left no comment on one. 8a and 8b are done (8b
short of *Stays on*, which waits on per-reader time on a part). 8c owed two
pieces, *Propose reverting* and *Compare*. *Propose reverting* came first
because it closes the loop the history opens: a card that says *Hurt* had no
way to act on it. Its inputs (the page's copies, their records, the runtime's
revert plan) are all on `main`.

## What shipped

- **A Loom change still on the live page offers *Propose reverting*** on its
  card on *Page history*, to a role that may propose a change (the same role
  that may press *Look now*). A line under the button says what will happen: a
  revert is weighed like any change, so within the project's rules it goes
  live on the site's next pull, and otherwise it waits under *For review*.
- **Pressing it raises the revert as a change the person asked for.** Made
  live, the card says so and links to the revert's own timeline from *Accept*.
  Held, it says it is under *For review* and links there. Where the runtime
  cannot plan an undo, or the Gate refuses it, the card says that in the
  portal's existing words for it.
- **The revert serves the goal the reverted change served.** It is recorded
  under the revert's intent before the write, as every proposal's goal is
  (0352), so *For review* leads with that goal, the revert's timeline names
  it, and the revert is measured on it like any other change.
- **The history reads a revert as a version.** The reverted change ends at
  *Undone* (as its timeline already said); the revert is its own card,
  *Version N: reverted version M*, with what it put back under it. A revert
  offers no revert of its own, and the card says why if one is asked for:
  having the change back is Loom proposing it again.
- **It never plans from the wrong start.** A revert is planned by replaying the
  page's current copy from the version the site published. Where the site has
  since published a newer version Loom has not followed yet, the card says to
  revert after Loom's next look at the page instead.

## How it is built

- `_lib/proposing/revert.ts` (new): `proposeReverting` reads the page's copies'
  records (`recordsOfPage`), finds the change and checks it is standing and not
  itself an undo (`mayRevert`, also what the screen reads), checks the copy
  stands on the published version (`standsOn`, the same check following uses),
  plans with the runtime's `planRevert`, records the goal under a freshly
  minted intent, and commits through `revertInterpreter` +
  `computedChangeRuntime`, exactly the route `revertRevision` takes. It does
  not call `revertRevision` because that mints the intent inside, and 0352
  wants the goal recorded under the intent before the write. What the change
  was made from is kept after the write, as `proposeFor` and *Accept* do.
- `_lib/accepted-reading.ts`: `recordsOfPage` lifted out of `acceptedOnPages`
  so the revert and the screens read a page's records one way.
- `_lib/going-live.ts`: `AcceptedChange.undoes` names the change a revert
  undid, by the entry it names on its own copy.
- `_lib/page-history.ts`: `versionWordsOf`, a card's heading and lines.
- `pages/[tree]/actions.ts`: `revertAction` (the page is read from what the
  site published, never from the form); `_components/revert-form.tsx`; the
  card takes a `revert` slot.

## Decisions taken, and why

- **The Gate weighs the revert; it is not forced into *For review*.** The
  framework's undo is a change like any other (0032), and the person pressing
  the button is the human step 0358 asks for. Forcing every revert to wait
  would have the same person answer their own question a second time, and the
  Gate already holds the reverts that matter: one that writes over a later
  change to the same part is always held (0035), and the rest are weighed at
  `user-instruction`'s ceiling. Reversible: the origin is one field.
- **No record.** This applies 0032, 0035, 0352 and 0358 and decides nothing
  they leave open.

## Tests

- `proposing/revert.test.ts`, 8 tests: a revert made live puts the copy back
  to the published page, records the goal under its intent and what it was
  made from; the reverted change reads *undone* and the revert names it; a
  change cannot be reverted twice, nor a revert reverted; a change not on the
  page is refused; a newer unfollowed version is refused; a revert that writes
  over a later change is held, with its goal recorded; a change with no
  recorded goal is still reverted; a store that does not answer changes
  nothing.
- `going-live.test.ts` +1, `page-history.test.ts` +3, `version-card.test.tsx`
  +1.
- `pnpm verify`: see the pull request for the run's numbers.

## Where the wireframe stands

*5 · Pages · History* now has the chart, the *Measured on* picker, one card per
version with its verdict, the dashed *Not live yet* card and *Propose
reverting*. Still missing: *Compare* on each card, and the page's own *For
review (N)* tab.
