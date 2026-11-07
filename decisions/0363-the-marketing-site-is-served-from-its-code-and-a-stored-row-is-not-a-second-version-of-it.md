# 0363. The marketing site is served from its code, and a stored row is not a second version of it

**Status:** Accepted
**Date:** 2026-11-07
**Section:** §5 (portal), the marketing surface

> **Why this number.** `0362` is the highest on `main`, and no open pull request
> adds `0363`.
>
> **Accepted on 7 November**, the day it was raised. It partially supersedes
> [0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md),
> which the maintainer accepted, so it was his to accept. He answered
> *"Accept 0363"* on #805.

## Context

On 7 November the maintainer reported that loomjs.org was *"back to the
incorrect version again"*, then that it was correct, then a minute later that it
was incorrect again. Nothing touching the marketing site merged in that time.

The cause is in `(marketing)/_lib/render.ts`. Since 12 October (0259 condition
1) every page was served from its row in the app's store, and from its builder
only when the store had nothing or did not answer within 1.5 seconds. Two facts
made those two different pages:

- **Seeding never overwrites.** `db:push` writes a page that is absent and
  leaves a present one alone, and nothing else writes these rows. So each row
  is the page as its builder stood on the first `db:push` after 12 October,
  frozen.
- **A cold connection takes longer than 1.5 seconds.** `bounded.ts` says so
  itself: the portal's budget was raised to 5 seconds on 13 October because
  1.5 seconds *"reports an outage every time an instance is new"*. The site's
  budget stayed at 1.5.

So a warm server served the frozen row, a cold one served the current code, and
a reader got whichever the timing picked. Every marketing change merged since
the rows were seeded reached only the readers who happened to land on a cold
server.

0259's reason for the rows still holds: a page the portal governs needs an
identity, a revision and something for a proposal to be held against. What
changed since is how an accepted change reaches readers.
[0358](0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md)
and [0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)
settled that the site pulls its live pages and lays them over the page as
built, with the built page as the fallback. That path does not need the site to
read its own rows at all.

## Decision

1. **A marketing page is served from its builder, always.** `pageTreeFor` builds
   the page and puts the reader's palette on it. It does not read the store, so
   no timing and no database state can change which page a reader gets.

2. **The rows stay, for the portal.** Seeding is unchanged: `db:push` still
   writes each page once, and the portal still lists and governs those rows.
   They are not served.

3. **An accepted change reaches readers through the live-page pull** (0361),
   wired as `livePageOf(live.held(), builtTree.treeId) ?? builtTree`. That
   wiring is its own change and is not made here. Until it lands, an accepted
   change on this site reaches no reader, which is already true today for every
   reader on a cold server.

4. **0259 condition 1 is superseded for the marketing surface** where it says
   the surface renders from the store. Its other clauses stand.

## Consequences

- The front door shows exactly what is on `main`, on every request. A
  marketing change is live when it deploys, for every reader.
- No marketing request reads the database for its page. A database outage
  cannot change what the site says, and the 12 October failure the budget was
  added for (the site served nothing while Supabase was unhealthy) cannot recur
  on this path.
- The stored rows go on drifting from the code. That matters for the portal,
  where a proposal is held against the row: it can be written against copy the
  site no longer shows. Refreshing a row needs a store operation `TreeStore`
  does not have, which `stored.ts` already files for `Loom framework`.
- `siteStore`, the store handle on the 1.5-second budget, had no other reader
  and is removed. `SITE_READ_BUDGET_MS` stays for the one read a marketing
  request still makes, the reader-signal key.

## Alternatives considered

**Re-seed the rows on every deploy, overwriting.** It would make the row and the
code agree most of the time, and it is the smallest change in lines. It was
rejected because it throws away whatever was appended to a row since, which is
the history 0259 stored the rows for, and because it still leaves two sources
that agree only until the next merge, with a window between deploy and re-seed
where they differ again.

**Raise the site's budget to match the portal's 5 seconds.** That makes the row
win almost every time, so readers would steadily see the frozen October page
rather than the current one. It hides the flip by making the wrong page
consistent, and it puts a database round trip back in front of every reader.

**Keep serving the row, and make code changes append to it.** Every marketing
merge would have to become a delta against a stored tree. That is the governed
path the portal is for, applied to the maintainer's own edits, and it would
make editing the site's code stop changing the site, which is exactly the
surprise the maintainer reported.

**Do nothing until the live-page pull is wired.** The pull lays accepted
changes over a page, but the page it falls back to is whatever `pageTreeFor`
returns. Wiring it on top of the current code would keep the flip underneath.
