# The read door: a site can pull its live pages

**Lane:** `Loom portal` · **Date:** 7 November 2026 ·
**Branch:** `claude/project-thread-teg3i5` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8 ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *4*, the timeline from *Accept* to live

## Why this, and why now

No portal pull request was open, and the maintainer had left no comment on one.
The order's first unfinished row is unit 8, *Accept goes live*
([0358](../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md)).
The replay (clauses 5 and 6) landed yesterday as #792, so a copy now follows
the site's newer version. That was the input the door needed: without it, a
door would serve a copy stuck on an old version over the site's own change.
The rest of 8a still waits on the `Loom signals` finding for what readers did
counted by hour (#794 is open in that lane), so unit 8 is the piece that is not
blocked.

## What shipped

- **`GET /api/pages/live`**, the read door of 0358 clause 3. It takes the
  project's public key (`lk_…`, the one its pages already post signals with,
  0298) as a bearer and nothing else, and answers `{ "pages": [...] }`: every
  page the site published, as it is live.
- **What "live" is** (`(portal)/_lib/proposing/live.ts`, pure apart from the
  store reads): a page Loom never copied is live as published; a page with a
  copy is live as the copy, under the page's own id, while the copy stands on
  the version the site last published (the same `standsOn` test the replay
  uses). Where the site has published a newer version that has not been
  followed yet, the newer version is live, not the older copy, because clause 6
  gives the site its own ground. This deployment's own site (0259) is always
  its copy. The door only reads; starting a copy again stays the snapshot's
  work.
- **No reader, no audience, by construction.** A request with any query is
  refused with 400, so 0262's property is enforced at the door rather than
  promised by a client.
- **Cheap to pull often.** Every answer carries a strong entity tag over the
  exact bytes, and `If-None-Match` answers `304` with no body.
  `cache-control: private, no-cache`.
- **Refusals are sentences for a log:** 401 with a `Bearer` challenge for no
  key, a key never issued or replaced, or a publish key; 403 for a closed
  project; 503 when any store cannot be read. A page that cannot be read fails
  the whole answer, so a site is never handed half of itself.
- **The pull client's finding**, filed for `Loom daily build`: what the door
  answers and the five things the client must do (pull on an interval from the
  server, send the tag, parse all before using any, keep the last pages on any
  failure, select per audience in the process).

## Decisions taken

- **The public key, not the publish key.** 0358 clause 3 says the public key.
  The answer is what every reader of the site is shown, so a key printed in the
  page source guards nothing more than it already does. The publish key stays
  a build's secret for writing.
- **A bearer header, not `?key=`.** The publish door takes its key the same
  way, and it lets the door refuse every query outright.
- **A closed project answers 403**, which the client treats as a failed pull
  and keeps what it last had. One line to change if the maintainer wants a
  closed project's site to fall back to its built pages instead.
- **No decision record.** It builds what 0358 decided and changes no rule.

## Tests

- 22 new tests: 10 on what is live (`live.test.ts` under `proposing/`) and 12
  on the door (`_lib/pages/live.test.ts`), including the query refusal, each
  key answered with only its own project's pages, `304` on a matching tag, and
  `503` rather than an empty site for each store.
- `pnpm verify` exit 0 on this branch: framework 6,434 passed (2 skipped), app
  6,836 passed across 420 files, prerender check clean.

## Where this leaves section 4 of the wireframes

The door is the middle of the timeline from *Accept* to live. Still missing:

- the door recording each project's last pull (a table, so `pnpm db:push`),
  which is what lets the screen say *connected for observation* until a site
  pulls, and *live* after;
- the screen itself, following an accepted change from *Accept* to live to its
  result, with the changes the replay dropped listed;
- the pull client, now a finding for `Loom daily build`.
