# 0329. Loom proposes changes to a published page from what its readers did, on a copy that starts as that page

**Status:** Accepted
**Date:** 2026-11-01
**Section:** §5 (portal), §3 (write path), §4c (reader signals)

## Context

Unit 7 of [`docs/portal.md`](../docs/portal.md), *the queue*, needs proposals
to queue. Since unit 6 a project holds its site's pages
([0312](0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md)),
and since unit 5 it holds what readers did on them, but nothing proposes a
change to a page. The maintainer was asked on 1 November where proposals come
from first, a person typing a request or the AI raising its own, and answered:

> *AI proposes itself.*

Everything a change needs already exists. The signals subsystem publishes per
page how far readers got (`pageReachOf`), where they stopped
(`readingProgressOf`) and whether they did anything inside a part
(`pageActionOf`), and 0221 and the action reading both say they were built to
be sentences a proposal can be written from. The interpreter turns a sentence
into a proposal against a registry (0013). The Gate weighs it with its origin
as an input, and `system-signal` is the origin it already gives the least
latitude to. A held proposal waits in a hold store until somebody answers it.

What is missing is the step from readings to a sentence, and a governed tree to
write against: a published page sits in `loom_published_pages`, which 0312
clause 3 keeps apart from the governed tree store on purpose.

## Decision

1. **The AI raises the first proposals itself, from what readers did.** For
   each published page it reads the version the site serves, and when enough
   readers have been counted (thirty page views) it hands the project's model
   the page in reading order with how many readers reached each part and how
   many acted inside it. The model answers with one change and the figure that
   argues for it, or with *nothing* and why. That answer becomes an intent with
   origin `system-signal` and actor *Loom*, and goes through the interpreter
   and the Gate like any other: nothing the model says reaches a page without
   passing the same rules.

2. **A change is governed on a copy of the page that starts as the published
   tree, exactly.** The first time anything is proposed for a page, its
   published tree is put into the project's own tree store at the revision the
   site published. Every revision after it is one a proposal produced. The
   published table is never written by a proposal, and the copy is never
   written by a snapshot.

3. **The tree store and the hold store are the project's own**, scoped to its
   one application at construction (0296). A proposal for one project cannot
   read or hold against another's page by passing the wrong id.

4. **One question per page at a time.** Nothing is proposed for a page while a
   change to it waits for an answer, while its copy holds a change the site
   does not serve yet (what readers did says nothing about a change they never
   saw), or while the site has published past the copy.

5. **Loom looks once a day, by itself.** A scheduled sweep looks at every page
   of every open project that has a model key of its own (0332), one page after
   another, and stops starting pages before the platform would stop it; the
   order turns by one each day so a page cut today is looked at first
   tomorrow. A page's screen also has *Look now*, for an approver or owner who
   wants to see it happen.

6. **The model is told this deployment's registry, as it is today.** The
   catalogue is the starter library, which is what this deployment's own site
   is built from. A customer page made of parts outside it is refused by the
   interpreter or the Gate rather than guessed at.

7. **What happens to an accepted change is unit 8's.** Until then an applied
   change is a new revision of the copy, and the site is not changed.

8. **A held change waits on a *Waiting* tab**, oldest first, saying what was
   proposed and why, of which page, by whom, why the Gate stopped and what is
   at stake. *Accept* and *Turn down* are offered to a role whose ceiling
   covers the change's stake, and both answers need it: a role that could turn
   down what it cannot accept could stop an owner's change by answering first.
   *Accept* runs the Gate again against the page as it then stands.

## Alternatives considered

- **A person types the request on the page.** This was built first and
  recommended, because a person can watch the whole path end to end. The
  maintainer chose the AI instead, and the queue, the copy and the Gate are the
  same either way, so a request box can be added later as a second source
  without changing anything here. Shipping both now would leave two ways to
  start a change before the one the product is about has been tried.
- **Let the model write the change directly from the readings, in one call.**
  One call instead of two, but the interpreter's prompt, schema and repair are
  built for one request against one tree, and a second prompt asking it to
  read figures as well would make every rule about what a bad answer means
  apply to two jobs at once. Two calls keep each one testable on its own.
- **Propose directly against the published table.** One store fewer, but a
  snapshot would then overwrite accepted changes, and 0312 clause 3 refused
  mixing the two for that reason.
- **Look at a page every time readers arrive.** It would react fastest and
  spend the most: a model call per batch per page, most of them about figures
  that have not moved. Once a day is often enough for figures that need dozens
  of readers to mean anything.

## Consequences

- No new tables for the queue: `loom_trees`, `loom_revisions` and `loom_holds`
  already carry an application column.
- A change that was turned down leaves the copy where it was, so the next day's
  sweep may propose it again. Remembering what was refused, and why, is owed.
- When a site publishes a newer version of a page than the copy began from,
  the copy does not follow it and nothing more is proposed for that page.
  Reconciling the two is owed before unit 8 opens pull requests, and is a
  record of its own.
- A page served in two forms (0263) has nothing proposed for it: its readers
  are two populations and picking one is a decision not taken here.
- This deployment's own application is the exception to clause 7: its
  governed pages are the ones its marketing site renders (0259), so a change
  applied to them is live.
