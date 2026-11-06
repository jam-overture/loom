# An accepted change follows the site's newer version

**Lane:** `Loom portal` · **Date:** 6 November 2026 ·
**Branch:** `claude/project-thread-mme06p` ·
**Records:** none new; builds [0358](../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md) clauses 5 and 6 ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8 ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *4 · From Accept to live*, the part no screen shows yet

## Why this, and why now

No portal pull request was open. The first row of the agreed order not done is
still 8a, and what is left of it (a goal's figure for a range, *By page*'s bars
for one) waits on the `Loom signals` finding for what readers did counted by
hour. 8b is done. So the next is unit 8, *Accept goes live*, whose record
(0358) merged today.

Unit 8 has three pieces in this lane: the read door, the replay, and the
screen. **The replay goes first**, because the door would be unsafe without it.
Until today a copy an accepted change had moved was left where it was when the
site published a newer version (0340 clause 2). Had the door served that copy,
a site that pulled it would have drawn the old version plus the change over its
own newer build. With the replay in place, the copy the door will hand out is
always the site's newest version plus what was accepted on it.

## What shipped

- **A copy is the live page (clause 5).** A page with an accepted change is no
  longer passed over: proposing for it goes on, against the copy. The *Nothing
  proposed* sentence that said the site does not serve the change yet is gone,
  with the case that produced it.
- **A newer version restarts the copy and replays (clause 6).** When a snapshot
  brings a different page, Loom checks whether it is the version the copy
  already stands on: the copy's accepted changes, applied to the snapshot, give
  the copy. If so (the site sent the same version again, or it now publishes
  what the changes reached), the copy stays. If not, a new copy starts from the
  snapshot and every change accepted on the old copy is applied to it again,
  oldest first.
- **Each replayed change is still the same accepted change.** Its proposal id,
  provenance and who allowed it are kept; only its address changes. So a later
  screen can follow one accepted change across copies by its proposal id.
- **A change that no longer fits is dropped**, and stays on the old copy's
  record, which is kept. An undo is applied again only if the change it undid
  was, and then names where that change landed.
- **A run cut off half way loses nothing.** The new copy is named the page's
  current one only after every change that fits is on it, and waiting changes
  are carried over only then (0340 clause 3, unchanged). A tree nothing names is
  left behind, and the next look starts again.

## Decisions taken

All inside 0358, so no new record:

- **A replayed entry's time is when it was replayed.** The record says when
  the runtime applied an entry. When it was *accepted* is on the old copy's
  record, under the same proposal id, and that is what clause 7's measuring
  window starts from.
- **No table for dropped changes.** Which changes were dropped can be worked
  out from the records: on the old copy, not on the new one, by proposal id.
  The screen that lists them can read them that way, so nothing needs
  `pnpm db:push`.
- **Telling a repeat from a newer version by replaying, not by storing the
  start.** The store keeps a copy's head and its changes, not the tree it began
  as. Replaying the changes onto the snapshot and comparing with the copy
  answers the question with no new column.

## Tests

- `following.test.ts`: the copy stays live when the site sends the same version
  again, and when it publishes what the change reached; a newer version restarts
  and replays the change with its proposal and provenance; a change that no
  longer fits is dropped and the old record keeps it; `replayOnto` keeps who
  allowed each change and re-points an undo; an undo of a dropped change is
  dropped; `standsOn` tells the three cases apart.
- `propose.test.ts`: proposing goes on against a copy a change was accepted on.
- `postgres.test.ts`: the replay against the Postgres tree store and copies
  table, under the proposal id the change already had.
- `pnpm verify` exit 0 on this branch: framework 6,434 passed (2 skipped), app
  6,814 passed across 418 files, prerender check clean.

## What is still missing from screen 4

- **The read door**, which hands a project's live pages to its public key, with
  no reader in the request (0262). Next run.
- **The pull client** in the customer's site, filed for `Loom daily build` with
  the door's contract.
- **The screen** from *Accept* to live to result, saying *connected for
  observation* until a site pulls, and listing dropped changes on the page's
  history.
