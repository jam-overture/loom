# Unit 9: a record for segments, before any of them is built

**Lane:** `Loom portal` · **Date:** 9 November 2026 ·
**Branch:** `claude/project-thread-oo16ax` ·
**Records:** [0371](../decisions/0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md) (`Proposed`) ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 9 ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *6 ·
Segments*, "It needs its own decision record before any of it is built"

Claimed by a portal run at 2026-11-09 05:30 UTC (#834).

## Why this, and why now

No portal-run pull request or branch had been pushed in the last three hours.
The open pull requests were #829 (framework), #778 (docs) and #825 (the Signals
chart, from its own thread and waiting on the maintainer), so this run stayed
off their files. Every earlier unit is on `main` except three pieces that wait
on the maintainer: the predicted effect on *For review*, what the top bar's
search finds (#833), and *Stays on it* on *Goals* (time on a part per reader).
Unit 9 is next in the order, its input (unit 8) is on `main`, and the plan says
it starts with a record. So this run writes the record and builds nothing.

## What the record decides

The wireframe's examples of a segment (*new or returning, from search, on a
phone*) are not in a delivery, and rule 1 of `docs/signals.md` keeps them out.
They are all things the site's own server knows while it draws the page
(`User-Agent`, `Referer`, its own cookie), which is the render context 0263 put
the audience predicate over. So 0371 says:

1. A segment is an audience; the portal says *segment*, the record says `aud_`.
2. The site sorts its readers by rules over its own context; only the
   segment's `aud_` id reaches Loom, on the batch, as 0284 already carries.
3. The portal keeps the rules, one ordered list per project (0359: last match
   wins), in portal tables.
4. The rules travel through the read door in the same pull, with no reader in
   the request (0358).
5. A segment's form of a page is accepted changes scoped to it, replayed like
   every other accepted change.
6. Every figure for a segment is for that audience alone; the 8c measuring
   rules apply per segment.
7. Four pieces: *Segments* (define, order, page views per segment; a table),
   the door answering the rules (pull client is a `Loom daily build` finding),
   a segment picker on *Signals*, *By page* and *Goals*, then *only for* on a
   change with its own record.

Defaults taken for the maintainer to confirm: at most ten segments a project;
keys are the site's words with *device*, *source*, *returning* offered as
examples; the proposer stays on the base until piece 4.

## Not merged, on purpose

The routine may not merge a pull request that adds a `Proposed` record. It
stays open for the maintainer. No finding is filed yet: the pull client's work
is filed when the record is accepted, so nothing is asked of another lane for a
direction not yet agreed.

## Tests

No code changed. `pnpm verify` exited 0 on this branch over `main` at `adba3c5`: the framework suite 273 files, 6,700 tests passed (2 skipped, as on `main`), and the app suite 464 files, 7,429 tests passed.

## Toward the wireframe

*6 · Segments* now has the record it asked for. Still missing from the
wireframes overall: the four pieces above (after acceptance), the predicted
effect on *For review*, the top bar's search and avatar menu, and *Stays on it*.
