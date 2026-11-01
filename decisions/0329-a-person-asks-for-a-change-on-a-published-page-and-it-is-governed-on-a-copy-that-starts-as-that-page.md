# 0329. A person asks for a change on a published page, and it is governed on a copy that starts as that page

**Status:** Proposed
**Date:** 2026-11-01
**Section:** §5 (portal), §3 (write path)

> **Why it is raised.** Unit 7 of [`docs/portal.md`](../docs/portal.md), *the
> queue*, needs proposals to queue. Since unit 6 a project holds its site's
> pages ([0312](0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md)),
> but nothing proposes a change to one. The maintainer is asked on 1 November
> where proposals come from first; clause 1 is the recommended answer, and the
> record stays *Proposed* until he gives his.

## Context

Everything a change needs already exists in the framework and in this
deployment. The interpreter turns a sentence into a proposal against a
registry (0013). The Gate weighs it and applies it, holds it, or refuses it,
and a held proposal waits in a hold store until somebody answers it
(`commitIntent`, `confirmHeld`, `discardHeld`). Both the tree store and the hold
store are scoped to one application at construction. The portal kept the
readings that turn an outcome or a hold into sentences when unit 0 removed the
screens that used them.

What is missing is the link between those pieces and a project's pages. A
published page sits in `loom_published_pages`, which 0312 clause 3 keeps apart
from the governed tree store on purpose: what a site says it serves is not a
change Loom accepted. The write path, though, reads and writes a `TreeStore`,
so a proposal against a published page needs a governed tree to be made
against.

## Decision

1. **The first proposals come from a person asking on a page.** A project's
   *Pages* tab opens each page, and on it a person whose role can accept
   anything (an approver or an owner) types what they want changed. The
   interpreter drafts it, the Gate decides, and the screen says what happened
   in the words `outcome.ts` already uses. Proposals the AI raises on its own,
   from what *Signals* reads, are the reasoning plane's and come later through
   the same path.

2. **A change is governed on a copy of the page that starts as the published
   tree, exactly.** The first time anybody asks about a page, its published
   tree is put into the project's own tree store at the revision the site
   published. Nothing about it is changed on the way in, so the starting point
   in the record is what the site said it serves, and every revision after it
   is one a proposal produced. 0312 clause 3 still holds: the published table
   is never written by a proposal, and the copy is never written by a snapshot.

3. **The tree store and the hold store are the project's own**, scoped to its
   one application at construction (0296), like every store the signals door
   files into. A proposal for one project cannot read or hold against
   another's page by passing the wrong id.

4. **The model is told this deployment's registry, as it is today.** The
   catalogue is the starter library (`_lib/registry.ts`), which is what this
   deployment's own site is built from. A customer page made of parts outside
   it is refused by the interpreter or the Gate rather than guessed at. Syncing
   a customer's own registry is the library plane's job.

5. **Asking needs the model key.** Without `LOOM_ANTHROPIC_API_KEY` the page
   says so in place of the request box, rather than accepting a request it
   cannot answer.

6. **What happens to an accepted change is unit 8's.** Until then an applied
   change is a new revision of the copy, recorded and shown on the page, and
   the site is not changed.

## Alternatives considered

- **The AI proposes on its own, from *Signals*.** It is the product's thesis,
  and it is the larger build: briefs, a schedule, a budget for model calls and
  a way to say why it proposed what it did. Nothing about it changes the queue,
  so the queue is built first on the path a person can watch end to end, and
  the reasoning plane feeds the same queue when it exists.
- **Propose directly against the published table.** One store fewer, but a
  snapshot would then overwrite accepted changes, and 0312 clause 3 refused
  mixing the two for that reason.
- **Copy every published page into the tree store when it arrives.** A copy
  per page per snapshot, most of which nobody will ever ask about, and the
  door would then be writing governed state, which is the conflation 0312
  refused. Copying on first ask writes only what is governed.
- **Let any member ask, viewers included.** A viewer can accept nothing, so a
  change they asked for that the Gate holds would wait on somebody else with
  no one having chosen to raise it. Asking is limited to roles that could
  accept at least something.

## Consequences

- No new tables: `loom_trees`, `loom_revisions` and `loom_holds` already carry
  an application column.
- When a site publishes a newer version of a page than the copy began from,
  the copy does not follow it. Reconciling the two is owed before unit 8 opens
  pull requests, and is a record of its own.
- The queue itself, a *Waiting* tab where held changes are accepted or refused
  within each role's ceiling, is the next pull request.
