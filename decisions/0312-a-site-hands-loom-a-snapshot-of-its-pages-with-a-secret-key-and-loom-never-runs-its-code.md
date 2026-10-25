# 0312. A site hands Loom a snapshot of its pages with a secret key, and Loom never runs its code

**Status:** Accepted
**Date:** 2026-10-24
**Section:** §5 (portal), §1

> **Why it is raised.** Unit 6 of [`docs/portal.md`](../docs/portal.md), *the
> read path*, rests on the question
> [0275](0275-a-connection-is-a-read-path-and-a-write-back-path-and-loom-never-writes-into-the-customers-store.md)
> left open: *what a repository hands Loom — the built tree as a snapshot
> artifact, or a module Loom evaluates.*
>
> **Accepted on the maintainer's answer.** Asked on 24 October whether a site
> hands over a snapshot or Loom runs its module, he chose *snapshot*, after
> asking what running the module would buy. Clause 1 is his. Clauses 2 to 6 are
> how the snapshot travels and where it is kept, and are written to be read
> against that choice.

## Context

Since 0262 a page is served by the customer's own app, and the control plane
governs it from outside. Signals already reach the control plane without a
read path (0275 clause 4); what Loom does not have is **the page itself**. The
*Signals* screen lists pages by the address a renderer gave them, because a
customer's trees are not in this deployment, and units 7 and 8 — a proposal a
person accepts, then a pull request — need a tree to propose against.

A tree is data: `loomTreeSchema`, parsed at every boundary by `parseTree`. The
customer's build already has it, because their app renders from it.

## Decision

1. **A site hands Loom a snapshot of its pages: the trees it serves, as
   JSON.** Loom never fetches, imports or evaluates a customer's code.

2. **The snapshot is posted to `/api/pages` with a publish key**, a secret per
   project, sent as `Authorization: Bearer`. It is a second key beside the
   ingest key, and deliberately unlike it: the ingest key is public because it
   is in every page (0298), so it can only ever *add readers*; a key that can
   change *what Loom believes a page is* must be one nobody can read off a
   page. It is 128 bits minted by the portal, shown once to an owner, and
   stored as a SHA-256 digest — 0285 clauses 2 and 3, for the same reasons.

3. **A snapshot is kept as the site's published pages, apart from the
   governed tree store.** One row per application and page: the newest tree
   received for it and when. The tree store's revisions are changes Loom
   accepted; a snapshot is what the site says it serves. Filing one as
   the other would put a revision in the record that no proposal produced.

4. **A snapshot adds and replaces, and never removes.** A page missing from a
   snapshot keeps its last tree, and the screen says when that arrived. A
   build that sends part of a site must not empty the rest of it, and
   *removed* is a decision for a person, not an inference from an absence.

5. **The door is strict and bounded.** Every tree is parsed with `parseTree`
   and its invariants checked; one invalid tree refuses the whole snapshot,
   so a site never ends up half-published. A body is at most 1 MB and 200
   pages. A closed project takes no snapshot.

6. **The portal shows a project's pages on a *Pages* tab**: each page by the
   name its own heading gives it (`pageNameOf`), its version, and when it
   arrived. Anybody in the project reads it; only an owner mints the key.

## Alternatives considered

- **Loom evaluates the site's module.** Always current and no build step, and
  it can see a page whose structure is computed when it runs. Refused by the
  maintainer: Loom would run every customer's code on its own servers, which
  needs a sandbox with time and memory limits and still trusts the repository;
  it breaks on any page that needs the customer's own packages, environment or
  database; and it is Loom reaching into the customer's app, which 0275 clause
  2 refuses.
- **Loom reads the snapshot from the repository** the project names (4a).
  Needs a credential into every customer's repository, couples the read path
  to one host, and reads what is committed rather than what is deployed.
- **Send the snapshot with the public ingest key.** One key fewer, and anyone
  who read a page's source could replace that site's pages in Loom.
- **Append each snapshot to the governed tree store.** One store fewer, and a
  record whose revisions are no longer all accepted changes.

## Consequences

- Two new tables, `loom_publish_keys` and `loom_published_pages`: a deployment
  runs `pnpm db:push` once.
- A site needs a build step that posts its trees. This deployment's own pages
  are the first to do it (6b).
- *Signals* can name pages from what a site published, which is a follow-up.
- Units 7 and 8 propose against the published tree, not against a copy Loom
  made.
