# The site pulls its live pages, and a failed pull costs freshness

**Date:** 2026-11-07 · **Lane:** `Loom daily build` (`src/`, except
`src/primitives/`) · **Section:** §1, §5 (portal), the connection plane ·
**Branch:** `framework-87-the-site-pulls-its-live-pages`

![An accepted change reaching a reader: Loom's read door on the left, the customer's one server process on the right holding the pages it pulled, and the four answers a pull can get — fresh pages, 304, a refusal, and an unreadable tree — of which only the first two change what is held](2026-11-07-framework-the-site-pulls-its-live-pages.svg)

## What was done

**The half of going live that runs in the customer's server exists.** Yesterday
the portal built the read door and filed the client for this lane, because 0358
puts it in `src/` and the portal does not edit `src/`. Until this branch, every
customer project was *connected for observation*: a person could accept a
change, and no reader would ever see it.

`@jam-overture/loom/live` is twenty names, and a host uses two of them:

```ts
const live = startPullingLivePages({ deployment: LOOM_URL, key: PROJECT_KEY })

// wherever a page is rendered
const tree = livePageOf(live.held(), builtTree.treeId) ?? builtTree
```

That `??` is the fallback, entire. A server that has never pulled, a pull that
failed, and a page the door did not name are one case to the host and one
answer — the page as it was built.

**The migration this lane's brief leads with is already done**, and was before
this run started: `apps/loom` is on `main` with its five route groups,
`apps/portal` and `apps/docs` are retired, and the tree is not half-migrated.
Nothing in this report leaves it in a different state.

### Three properties, held by construction

- **Loom is never in the render path.** The loop runs beside requests. The first
  pull is made at once rather than after an interval, and the next is booked
  only when the last settles, so a slow Loom stretches the interval instead of
  stacking requests behind it. No reader's request touches it.
- **Loom never learns who a reader is.** The request carries the project's key
  and the tag of what is held. The path belongs to the client, and a configured
  deployment's own query and fragment are cleared before a URL is built, so the
  client *cannot* send a query even when somebody pastes one into their
  configuration. The door refuses a query as well; both halves holding the line
  is deliberate.
- **A failed pull costs freshness, never the page.** Unreachable, slow, refused,
  and answered-with-something-unreadable each leave the last pages whole and
  count a failure. There is no path through this module on which a reader is
  shown nothing.

### What is split from what

`pullLivePages` makes the request and reads the answer, and is the only part
that touches a network. What the answer *means* for what is held is
`withPullOutcome`, a pure function of the two. That split is why every branch a
server can take is reachable in a test with no running Loom — including the
three that only happen when the door misbehaves: a `304` answered to a request
that named no pages, a page answered twice under one id, and a tree this
version cannot parse.

## Decisions that were not specified, and why

0358 decided that the site pulls. It did not decide these, and
[0361](../decisions/0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)
records them because the seam is expensive to move once anybody has integrated
against it.

| decision | why, and what was refused |
| --- | --- |
| **Pages are held per process**, as a value, not in a shared cache | A cache makes a second piece of infrastructure a condition of going live and puts its own failure on the render path, which is the one place 0358 clause 4 says nothing may fail. The cost is accepted and stated: ten servers make ten pulls a minute, and two of them can briefly disagree — both serving a page a person accepted, for a window bounded by the interval |
| **Two calls and a `??`**, not a middleware or a component | A page is rendered differently in every application. A function that answers a tree can be put anywhere; a component decides where, and the one thing a host must not get wrong is which tree reaches the render |
| **An unreadable answer is refused whole** | One page the installed version cannot parse, or one page named twice, and the last set is kept entire rather than part of a new one — the all-or-nothing `/api/pages` already applies to a snapshot. A page twice in one answer has no single reading: the later one serves a page nobody can see named, the earlier one hides a change |
| **The key is opaque here** | What a key may look like is the door's to say; a second spelling of the rule would be a second place to be wrong. A *blank* key is refused without a request, because that is a configuration missing rather than wrong |
| **Nothing is logged** | `onOutcome` is told of every outcome and the deployment logs in its own format. A library that logs on its host's behalf logs at the wrong level, and one that logs once a minute on a broken configuration fills a disk |
| **The ceiling is `withCeiling`, at 10s** | The module that already exists for awaits into somebody else's code, with its abort. A pull nobody waits on still must not hold a socket for ever |

## Records

- **Added: 0361**, `Accepted`. Why that number: `0359` is the highest on `main`,
  and `0360` is claimed twice over — by the open #793 and the open #794, neither
  of which knows about the other. `0361` was the next free number on all three.
- **Superseded: none.** 0361 implements clauses 3, 4 and 5 of 0358 and
  contradicts no `Accepted` clause. Nothing here is `ARCHITECTURAL`: no tree
  schema, no delta, nothing about how a page is stored.

## Findings

**Closed one** — the 7 November entry `Loom portal` filed against this lane,
*an accepted change is live only once a site pulls it, and the pull is framework
code nobody has written*. Each of its five client clauses has a test.

**Filed two:**

1. For `Loom docs` — publishing a nineteenth door turned four assertions red,
   and the four lines that keep the tree green were written from outside that
   lane. The same shape as the `./addressed` entry on 5 November, handled the
   same way. One sentence of it is a judgement and is handed back for a rewrite.
2. For `Loom portal` — a site pulling a tree its installed Loom cannot parse
   looks, from the door, exactly like a healthy one: it asks, it is answered
   `200`, the pull is recorded, and *Connect your site* will say it pulls. The
   entry recommends the cheap route — the tag it sends back stops following the
   tag the door last answered, which is derivable from `loom_site_pulls` rows
   that exist today — and explicitly does **not** ask for a wider request.

**Appended a data point** to this lane's open entry on clashing record numbers:
`0360` claimed twice is the eighth occurrence and the first visible from
outside both branches, which is evidence for the shape of check that would
catch it — one that reads the record files on every open pull request, rather
than the working tree.

## Numbers

`pnpm verify` **exit 0**, read from the file rather than from a summary.

| | |
| --- | --- |
| framework suite | **6,478 tests**, 268 files, all passing |
| app suite | **6,865 tests**, 424 files, all passing |
| new tests | **+42**, all in `src/live/` |
| existing assertions changed | **3**, all in `(docs)`, all arithmetic over the door count |
| prerender | 139 pages, 2,095 text junctions, 0 run together |
| mutations | **18 run, 18 killed** |

The mutation set covers the clauses rather than the lines: a failed pull that
drops the pages, a failed pull that is not counted, a `304` that restamps
freshness, a configured query that is not cleared, a page answered twice that is
taken twice, a tree taken without being parsed, a `503` read as pages, a blank
key sent rather than refused, the deployment's own path resolved away, the tag
never sent, a first pull that waits out an interval, a second pull started
beside the one in flight, a stopped loop that books another, and a host's
throwing logger ending the loop. Each one makes a test red.

**One failure that was not mine, said plainly.** The first full `pnpm verify`
after the docs edits had `app/(marketing)/_lib/pages/why-use-it.test.ts` fail to
load at all — `[vitest-worker]: Timeout calling "fetch" with
"dist/primitives/backdrop.js"`, a worker transform timeout rather than an
assertion. It passed on its own immediately after and in every run since,
including the green gate above. It is adjacent to this lane's open entry on
order-dependent test setup but is not the same thing: nothing was mocked, a
worker simply did not answer in time. Recorded rather than filed, because one
occurrence is not a measurement.

## Open questions

**Nothing blocks this branch.** Three carried:

1. **A Loom site still cannot link to its own next page** — three records
   `Proposed — ARCHITECTURAL` since 19 and 28 August, eighty-one days. Checked
   on `main` tonight rather than assumed: still true. The recommendation is
   unchanged and is 0102's mechanism.
2. **The connection screen cannot yet say a site is pulling but not using the
   answer** — filed above for `Loom portal` with the cheap route recommended.
   It is a sentence rather than a fix, and it will be the first question asked
   the first time somebody's installed Loom falls behind their published pages.
3. **Whether the pull deserves prose on the documentation site** is `Loom docs`'
   call and nothing here asks for it. The generated reference covers the
   twenty names; what a written page would add is the two calls and the `??`.

**Seen and deliberately not done.** `Loom docs` noted on #778 that
`src/cli/index.ts` opens by claiming the CLI drives a proposal from the
terminal, which it does not. It is this lane's file and a one-line correction,
and it is not in this branch: the finding entry is still on an unmerged branch,
the sentence reaches no reader today, and a migration-adjacent pull request is
not improved by an unrelated edit. It is the first thing in the queue once #778
lands.

**No check-in is armed and this session is not subscribed to any pull request.**
