# A site that pulls and does not keep its newest pages is said so

**Lane:** `Loom portal` · **Date:** 7 November 2026 ·
**Branch:** `claude/project-thread-6mzvkw` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8 ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *4*, the
site's connection

## Why this, and why now

No portal pull request was open and the maintainer had left no comment on one.
`FINDINGS.md` had one open entry owned by the portal from today, filed by
`Loom daily build` with the pull client (#798): *a site pulling a tree its
installed Loom cannot read is indistinguishable on the portal from one that is
up to date*. Open findings owned by the portal come ahead of the plan, and this
one is small, concrete and on a screen that exists, so it came first. The rest
of 8c (the chart, *Propose reverting*, *Compare*, the goal picker) is next.

## What was wrong

The pull client refuses an answer whole when the Loom installed on the site
cannot read one page in it, and keeps showing the pages it held. That is the
right failure, but a site doing it still pulls every minute, the door still
answers it, and *Connect your site* says *Your site pulls its pages*. An
accepted change sits on Loom's copy and reaches no reader, and the screen says
everything is fine.

## What shipped

- **The door records whether the site kept each answer.** A site sends back the
  tag of the pages it holds (`If-None-Match`), and the client moves that tag only
  with the pages it names. So a site that took the newest pages names them back
  on its next pull and is answered `304`; a site that refused them goes on naming
  the older ones and is answered the newest again, every time. The door already
  knew which of those it was answering; it now passes it on (`SitePull.kept`).
- **`loom_site_pulls` gains `kept`** (boolean, default false), set once a site
  names that answer back and never unset. Added to the table's DDL as
  `ADD COLUMN IF NOT EXISTS`, so `scripts/db-push.ts` adds it. **Needs
  `pnpm db:push` on production.**
- **The live portal keeps working before the push.** The insert now names its
  columns by hand (the query builder would have written `kept` into it as
  `default` and failed on the old table), and *kept* is a second statement. On a
  table without the column every pull is still recorded, *Connect your site*
  still says whether the site pulls, and adds one line: whether it keeps the
  newest pages could not be read. A Postgres test runs the store against the
  table as it was pushed before this change.
- **A new read, `SitePullStore.newest`**: the answer first given latest, when it
  was first and last given, whether it was named back, and whether any answer
  ever was. Memory and Postgres implementations, held to one contract (PGlite).
- ***Connect your site* says it.** Once a site that has named some answer back
  has been given the newest pages for ten minutes or more without naming them
  back, the last section reads *Your site pulls, and is not keeping its newest
  pages*: since when it has been given pages it has not kept, that a change
  accepted since then has not reached readers, that the usual cause is a Loom on
  the site that cannot read them and updating it fixes it, and when it last
  pulled. A site that has gone quiet is told that first.

## Decisions taken

- **A correction to the finding's route 1.** It said the rows that exist could
  tell the two apart. They could not: a row is the tag the door *answered*, and
  a refusing site is answered the newest tag just as a healthy one is. What
  differs is the tag the site *sent*, so that is what is now recorded, as one
  boolean per answer. The request is unchanged, so 0262 and 0361 clause 3 hold.
- **Ten minutes** (`NOT_KEPT_AFTER_MS`). A site that keeps the pages names them
  back on its next pull, a minute later at the interval the client suggests, so
  ten minutes is ten chances. It takes two answers to span any time, so a site
  pulling less often than that is never flagged on one answer.
- **Only a site that has named some answer back can be said not to keep one.**
  A site that never sends a tag (a hand-written client, `curl`) cannot be read
  this way, and rows written before the column existed all say *not kept*;
  neither is ever read as a refusal. The cost: a site whose very first answer it
  could not read is not flagged. It is said nowhere else either, and the
  finding's route 2 (a schema floor on the answer) would be the way to catch it.
- **A sentence, not an alert**, as the finding recommended.
- **No decision record.** Nothing here decides direction: it records one more
  fact about a pull the door already answered and says it on a screen that
  exists. The finding is closed with the correction above.

## Still open

- **The timeline's *Live* step** reads the first answer given after *Accept* as
  the moment the change went live. For a site that did not keep it, that moment
  is wrong. With `kept` recorded it can be read properly (live when an answer
  given since *Accept* was kept), but changes made live before the column
  existed would then lose their *Live* moment, so it wants its own run and a
  rule for rows from before. Noted in `FINDINGS.md` and `docs/portal.md`.

## Tests

- `pulls.contract.ts`: 5 new (no newest for a site that never pulled; the newest
  answer with whether it and any answer was kept; kept once stays kept; a site
  that never named an answer back; one project's answers kept from another's),
  run against memory and Postgres.
- `pulls-postgres.test.ts`: 1 new, the store on the table as pushed before the
  column: pulls are recorded, *kept* fails alone, `newest` says it cannot read.
- `live.test.ts`: the existing pull test now asserts `kept` on the `200` and the
  `304`; 1 new, a site that goes on naming the pages it held is told of twice as
  not keeping the newest.
- `pulling.test.ts`: 11 new for `keepingOf` and `connectionWords`, including the
  plain-language rule over every new sentence.
- `pulling-section.test.tsx`: 1 new, the heading for a site not keeping.
- `pnpm verify`: see the pull request for the numbers on the merged head.

## Screens

The screenshot is in the pull request's description: *Connect your site* for a
project whose site has been given its newest pages for an hour and a half and
has not kept them, against a local Postgres and `next start`.

## Where this leaves section 4 of the wireframes

- Done: the site's connection says whether it pulls, whether it has stopped, and
  now whether it keeps what it is given.
- Still missing: the *Live* step reading *kept* (above), and the pull client
  wired into a real site (the marketing lane's thread, and a 0.3.0 release).
