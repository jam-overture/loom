# Unit 9 piece 2: the read door answers each page's audience rules

**Lane:** `Loom portal` · **Date:** 11 November 2026 ·
**Branch:** `claude/project-thread-hod9mb` ·
**Records:** none new (builds 0371 clause 4) ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 9, piece 2 ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md)
*6 · Segments*

Claimed by a portal run at 2026-11-11 23:20 UTC (#866).

## Why this, and why now

No portal pull request or `portal-*` branch was open, so no run still going
held a claim. Units 8a to 8d are done bar items waiting on the maintainer.
Row 9 named piece 2 as next: piece 1 (#863) writes each page's rules through
0376's store, and 0371 clause 4 says those rules reach the site through the
read door in the same pull. Its input (the store, the door) is on `main`, and
it needs no table.

## What shipped

- **`_lib/pages/live.ts`.** The door answers `{ pages, rules }`. `rules` holds
  `{ treeId, rules }` for each live page with a non-empty list, in the pages'
  order, each list in its stored order (the later rule wins a contested part,
  0359 clause 3). `liveRulesOf` is the pure step from what the store holds to
  the answer. `ReadDoor` gains `rulesOf(application, treeIds)`.
- **`_lib/pages/store.ts`.** `appReadDoor.rulesOf` reads through
  `audienceRulesFor`, the same store the *Segments* screen writes, with the
  screens' read budget.
- **`(portal)/_lib/segments/rules.ts`.** `readPageRules` is generic over the
  page it reads (anything with a `treeId`), so the door and the screen share
  one bounded read rather than two.
- **`FINDINGS.md`.** The 11 November (evening) entry for `Loom daily build`
  now spells the exact answer shape the pull client should read, and says the
  door's half is done.

## Decisions taken, and why

- **A page with no rules, or an emptied list, has no entry.** Both mean the
  base for every reader, and one spelling keeps the tag still when nothing a
  reader could be served has changed. Reversible.
- **A failed rules read fails the whole pull (503).** 0358 clause 4 and 0371
  clause 4: a site keeps its last pages and rules together, never pages from
  one pull beside rules from another. Answering pages without rules would tell
  a sorting client that every rule was removed.
- **`rules` is always present**, as an array, even when empty. Every site's tag
  moves once with this change, which costs each pulling site one full answer.
- **No decision record.** This builds 0371 clause 4 as written; the shape was
  the one the finding already named (`AudienceRule[]` per page id).

## Safe to land before the client

`src/live/pull.ts` parses the answer with a non-strict
`z.object({ pages: z.array(z.unknown()) })`, so `rules` is dropped by today's
client. Nothing a reader is served changes until `Loom daily build` closes its
half of the finding.

## Tests

`pnpm verify` exits 0: the package's 6,848 tests pass (2 skipped, 283
files), and the app's 7,802 (481 files), with typecheck, findings, reports
and prerender checks. New: three door cases (each page's list in order, the
rules asked for exactly the pages answered, a change of rules alone moves the
tag), a fourth 503 case for rules that cannot be read, two for
`liveRulesOf`, and one for `readPageRules` read by page id alone. The first
push failed the Vercel build on a generic type `readPageRules` returned
(`Awaited<Read>` with a string union); the read now returns a tagged outcome
per page.

## Toward the wireframe

*6 · Segments* now has its rules reaching a site's server. Still missing:
piece 3 (the segment picker on *Signals*, *By page* and *Goals*, `?segment=`),
piece 4 (*only for: <segment>* on a change, its own record), and the pull
client's half, so every segment still says *None yet*.
