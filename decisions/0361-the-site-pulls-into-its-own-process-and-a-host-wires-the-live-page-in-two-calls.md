# 0361. The site pulls into its own process, and a host wires the live page in two calls

**Status:** Accepted
**Date:** 2026-11-07
**Section:** §1, §5 (portal), the connection plane

> **Why this number.** `0359` is the highest on `main`. `0360` is claimed twice
> over, by the open #793 and the open #794, so the next free number is this one.
>
> **Why `Accepted`.** It implements clauses 3, 4 and 5 of
> [0358](0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md),
> which decided that the site pulls and that the pull is framework code. It
> changes no tree schema, no delta and nothing about how a page is stored; it
> adds one door to the package and takes nothing away. What it fixes is the
> shape of the seam a customer's server wires, and that is the part a record is
> for: every integration written against it is expensive to move.

## Context

0358 made *Accept* the last human step, and put the half that runs in the
customer's server in `src/`. `Loom portal` built the door — `GET
/api/pages/live`, the project's public key as a bearer, `{ "pages": [...] }`
with an entity tag — and filed the client with what it answers and what a client
must do.

What that filing left open is the shape of the client, and two questions in it
are not implementation detail. The first is **where the pages live between
pulls**, because the answer decides how many requests a deployment makes and
whether two of its servers can disagree about what a reader sees. The second is
**what a host has to write**, because the pull is worth nothing if wiring it is
a project: the page it improves is a page that already renders, and anything
harder than a line will be left out of real applications.

## Decision

1. **A pulling server holds its live pages in its own process, as a value.**
   Not in a shared cache, not in the customer's database, and not in a file.
   Each process pulls for itself and holds what it got; `n` servers make `n`
   pulls an interval. Every pull produces a new holding rather than editing one,
   so a render that has read a page cannot have it changed underneath.

2. **The whole of a host's integration is two calls.** One at startup —
   `startPullingLivePages({ deployment, key })`, which answers a loop with
   `held()`, `pullNow()` and `stop()` — and one where a page is rendered:
   `livePageOf(live.held(), builtTree.treeId) ?? builtTree`. **The `??` is the
   fallback, entire.** A server that has never pulled, a pull that failed, and a
   page the answer did not name are one case to the host and one answer:
   `undefined`, meaning the page as it was built.

3. **The request is small by construction, not by care.** The client cannot
   build a request carrying a query, an audience or a reader: the path is this
   module's and the configured deployment's own query and fragment are cleared
   before a URL is asked for. The door refuses a query as well, and both halves
   holding the line is the point — the property
   [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
   calls load bearing does not rest on either side being well behaved.

4. **An unreadable answer is refused whole.** One page in the answer that this
   version cannot parse, or one page named twice, and the last set is kept
   entire rather than part of a new one — the same all-or-nothing `/api/pages`
   already applies to a snapshot. An entity tag moves only with the pages it
   names, so what the client sends back as `If-None-Match` always describes
   what it holds.

5. **The first pull is made at once, and the next is booked when the last
   settles.** Not `setInterval`: a slow Loom stretches the interval instead of
   stacking requests behind it, and two pulls are never in flight — including
   when a host calls `pullNow()`, which answers the pull already running. A
   minute is the default interval and ten seconds the default ceiling.

6. **The key is opaque to the client, and failures are the host's to log.**
   What a project key may look like is the door's to say, and a second spelling
   of the rule here would be a second place to be wrong; a key that is blank is
   a misconfiguration and is refused without a request. Nothing writes to a
   console: `onOutcome` is told of every outcome and a deployment logs in its
   own format, because a library that logs on its host's behalf logs at the
   wrong level.

## Consequences

- A deployment of ten servers makes ten pulls a minute per project, and two of
  them can briefly hold different pages — one has pulled and the other has not.
  Both are serving a page a person accepted; neither is serving a page nobody
  reviewed, and the window is bounded by the interval. This is the cost of
  clause 1 and it is paid deliberately.
- Memory is a page per published page per process. A site of a hundred pages
  holds a hundred trees, which is the same order as what it was built with.
- Nothing about selection changes: an audience is chosen in the customer's
  process (0263) against the tree `livePageOf` answers, after the pull.
- The failure count a holding carries is the only health signal, and it is read
  rather than pushed. A deployment that wants an alert reads `held().failures`
  or watches `onOutcome`.
- A tree the customer's installed version cannot parse makes the page stale
  rather than broken, which means an old server keeps serving old pages
  indefinitely and says so only in a log. That is the right failure and it is
  worth a line on the connection screen later.

## Alternatives considered

- **Hold the pages in a shared cache (Redis, or the customer's database), so a
  deployment pulls once.** Fewer requests, no window in which two servers
  disagree, and a restarted server is current immediately. Refused: it makes a
  second piece of infrastructure a condition of going live, it puts Loom's
  pages on a write path the customer has to operate, and the failure it adds —
  a cache that is unreachable — has to be handled on the render path, which is
  exactly where 0358 clause 4 says nothing may fail. Per-process holding needs
  nothing installed and its worst case is a pull that costs a request.
- **Fetch the page from Loom on each request, with an HTTP cache in front.**
  The smallest client imaginable and the freshest pages. Refused by 0262 and by
  0358's own alternatives: Loom would be in the render path, and a cache in
  front only narrows the window in which it is.
- **Give the host a middleware or a React component instead of two calls.** It
  would hide `??` and read better in a snippet. Refused: a page is rendered
  differently in every application — one framework, a dozen routing shapes —
  and the one thing a host must not get wrong is which tree reaches the render.
  A function that answers a tree can be put anywhere; a component decides where.
- **Validate the key's spelling in the client.** Catches a mistyped key at
  startup instead of at the first pull. Refused: a deployment is free to issue
  keys in another shape, and the door is the authority on what it issues. A
  blank key is refused because that is a configuration that is missing rather
  than wrong.
- **Log a failed pull.** One line, and every deployment would get it for free.
  Refused for the reason in clause 6, and because a library that logs once a
  minute on a broken configuration is a library that fills a disk.
