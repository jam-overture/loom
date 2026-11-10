# Unit 8a: the *By page* finding answered, with nothing on the screen to change

**Lane:** `Loom portal` · **Date:** 9 November 2026 ·
**Branch:** `claude/project-thread-v2fuas` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8a (done; unchanged) ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *1 ·
Signals, By page*

Claimed by a portal run at 2026-11-09 23:20 UTC.

## Why this, and why now

No portal pull request was claimed by a run still going: the newest portal
branch, `claude/project-thread-yjybid`, merged as #846 at 21:34 UTC. #834
(record 0371, Proposed) still waits on the maintainer, with no comment from him.
Everything left in the plan's order waits on him too (top-bar search, the
predicted effect on *For review*, *Stays on it* on *Goals*, unit 9).

Open findings owned by the portal come ahead of the plan, and `Loom signals`
filed one today: *the By page drawer's skipped count is a page's markup depth as
much as its readers*, offering `pageFrontierOf` (0372) as a better figure for
that box.

## What shipped

Only the answer, in `FINDINGS.md`. The drawer has no skipped count: no file
under `apps/loom/app/(portal)/` reads `PageReading.standings`, and the drawer
draws exactly what the wireframe lists, all of it from hourly tallies. So no
number on the screen is wrong, and nothing was changed.

*Where readers stopped* would be a new part of the drawer. The wireframe does not
have one, and *The rules, with teeth* ban a surface without a unit, so it is not
built. The pull request asks the maintainer whether he wants it.

## Tests

No code changed. `pnpm verify` result is on the pull request.

## Still missing from the wireframes

Unchanged from #846: top-bar search, the predicted effect on *For review*,
*Stays on it* on *Goals*, and unit 9 (0371, #834). All wait on the maintainer.
