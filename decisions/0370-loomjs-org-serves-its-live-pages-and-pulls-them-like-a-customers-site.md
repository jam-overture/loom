# 0370. loomjs.org serves its live pages, and pulls them like a customer's site

**Status:** Accepted
**Date:** 2026-11-08
**Section:** §5 (portal), the connection plane

> **Why this number.** `0369` is the highest on `main`, and no open pull request
> adds `0370`.
>
> **Why `Accepted`.** The maintainer asked for it on 7 November, when he accepted
> 0363 and 0364: approved changes have to reach the site's readers, with no flip
> between the built page and the live one. This is the step 0363 left for
> after the site published its own pages (0369).

## Context

[0363](0363-the-marketing-site-is-served-from-its-code-and-a-stored-row-is-not-a-second-version-of-it.md)
made loomjs.org serve the page its code builds and nothing else, which ended
the flip between a stale row and the code. It also meant a change accepted on
the site's project in the portal never reached a reader: nothing between the
builder and the renderer asked Loom for it.

The pieces to fix that exist. The pull client
([0361](0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md),
[0364](0364-a-new-server-waits-for-its-first-pull-before-it-serves-and-never-waits-again.md))
holds a project's live pages in the server and waits for the first pull before
a new server serves. The read door answers them. Since
[0369](0369-the-sites-build-publishes-its-pages-and-a-refusal-never-stops-a-deploy.md)
the build publishes the pages they start from.

## Decision

1. **The site's reader-facing render serves Loom's live version of each page,
   or the page as built.** `servedTreeFor` takes the built tree, swaps it for
   `livePageOf(await live.ready(), treeId) ?? built`, and puts the reader's
   palette on afterwards, so an accepted change is served in any palette.

2. **It pulls the way a customer's site does**, through
   `@jam-overture/loom/live` and `/api/pages/live`, with the public key of the
   project the site counts under (the one `LOOM_SITE_PROJECT` names). Not a read
   of the tables in-process: the site is a project like any customer's (0298
   clause 4), and the path a customer depends on is then the path this site
   uses every minute.

3. **The production deployment pulls from its own pinned domain.** It pulls
   when the deployment is public and `LOOM_SITE_ORIGIN` is set, which is where
   0369 publishes. A preview pulls nothing and serves its code.

4. **One pull per process, for the key held now.** The key is read from the
   table the door reads (remembered for a minute). A replaced key stops the
   running loop and starts another, because the old key is refused from the
   moment it is replaced.

## Consequences

- A change accepted in the portal is usually served within a minute: a running
  server pulls once a minute, and a new server waits for its first pull, up to
  5 seconds when Loom is silent (0364).
- A server that was idle may serve one request from what it held before it
  pulls again. That is 0361's interval, and the page it serves is one a person
  accepted.
- A failed pull is one `loom:` warning line in the deployment's log, and the
  page is served as built.
- The build publishes each page in one palette and readers ask in three. A test
  holds that a live page identical to what was published is served exactly as
  the built page would be, in every palette, so the swap cannot change a page
  nobody changed.

## Alternatives considered

**Read the live pages in-process, from the tables, without a pull.** This
deployment is Loom, so it could call the read door's function directly and
skip the network. It would be faster on a cold server and have no key to hold.
It would also be a second way of going live that no customer has, so the pull
client and the door would be exercised by tests alone, and a fault in either
would reach every customer before it reached the site its makers look at. The
pull costs one request a minute per server.

**Keep serving from code, and ship accepted changes as code changes.** That is
the pull request 0358 removed, for this site only. The maintainer was explicit
that Accept is the last human step.

**Pull on previews as well.** A preview would pull production's project and
show production's accepted changes on top of a branch's code. It would preview
neither the branch nor production.

**Put the key in an environment variable.** A second copy of a key that is
replaced on *Connect your site*, which is the drift `readers/key.ts` was written
to avoid.
