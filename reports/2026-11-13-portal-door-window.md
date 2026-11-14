# Portal 10: the read door answers the reader window

**Run:** portal, 13 November 2026, from 23:17 UTC · **Pull request:** #894 ·
**Unit:** 10, *A reader keeps the pages they first saw*
([0383](../decisions/0383-a-reader-keeps-the-pages-they-first-saw-for-a-window-the-project-sets-and-their-browser-holds-one-number-many-readers-share.md)),
second piece

## Why this unit

#890 (unit 9, *Accept for a segment only*) is finished and waits on the
maintainer's `pnpm db:push`, so unit 9's next piece has nothing on `main` to
build on. Unit 10's first piece merged as #891, and its report named the
door's answer as next. No other portal branch was pushed within three hours.

## What shipped

- `/api/pages/live` answers `window` beside `pages`, `rules` and `forms`, read
  in the same call as the pages so a site never holds versions from one pull
  beside pages from another:
  - `{ "ms": 0 }` under *Off*, which reads nothing more than before;
  - otherwise `{ "ms", "floor", "number", "held" }`, `held` being
    `[{ "treeId", "versions": [{ "until", "tree" }] }]`, each page's versions
    a pin can still be served, oldest first, under the page's own id.
- `_lib/proposing/held.ts` works it out: the floor, the number and which
  versions are wanted are pure (`floorOf`, `numberOf`, `wantedOf`), and the
  versions are rebuilt from each page's current copy with `treesAt`, folded
  from the version the site published, as *Compare* and *Propose reverting*
  fold it.
- The `Loom daily build` finding of 13 November now carries the exact fields
  and how a client resolves a pin against them.

No screen changed: this is the door's answer, and *Settings* still says the
window is not in effect, which stays true until a site's Loom package reads a
pin.

## Decisions taken, and why

- **A state's number is the millisecond it was made, not a count.** Clause 3
  has every change that goes live advance the number by one. Loom keeps no
  counter of live states, but it keeps when each happened (a change's entry on
  its copy's record, a copy's start, a snapshot's arrival). A time advances
  with every change and is shared by every reader who arrived between the same
  two changes, which is what the clause needs of the number; it needs no table
  and no `pnpm db:push`, and it cannot drift from the record. A counter would
  need a table written on every *Accept*, revert and snapshot. Asked on the PR;
  reversible, since a pin the door no longer recognises reads the newest.
- **The floor is the newest snapshot, copy start or revert across the
  project.** A snapshot comes from the site's build, so every deploy ends every
  pin, which is clause 4's reason (an older tree is not promised to draw under
  newer components). The copy start is included because the changes replayed
  onto a new copy are stamped just before it starts and are not new changes.
- **Only versions a pin can still be served are sent**: replaced after both the
  floor and the window's start. A cookie older than the window has run out.
- **All or none per page.** A page whose versions cannot all be rebuilt holds
  none, and so does one whose site moved on before Loom followed it, since its
  record is folded from the version the site published. A gap would serve a
  pin a page that was never live at its number; the newest page is the
  freshness failure clause 5 allows.
- **A window that cannot be read is *Off*, not a failed pull.** Before
  `pnpm db:push` for #891 the table does not exist, nobody can have chosen a
  window, and a 503 would cost every site its newest pages.

## Records added

None. The deviation on the number is in `docs/portal.md` and on the PR.

## Tests

- `held.test.ts`: 9 tests (Off reads nothing; nothing held after a build with
  no change; two changes held with their `until`s; a version replaced before
  the window began left out; nothing before the newest build; a revert raises
  the floor; a restarted copy raises the floor; a page whose site moved holds
  nothing; a record that cannot be read fails the answer).
- `live.test.ts`: 29 tests, two new (the window is answered as handed; a moved
  window changes the tag).
- `pnpm verify`: see the PR.

## Toward the wireframes

`docs/portal-wireframes.md` section 4 (*Accept* to live): the timeline's *Held
for returning readers until …* step and measuring a held change from when the
window has run out are still owed, and neither means anything to a reader until
the pull client reads a pin (`Loom daily build`).
