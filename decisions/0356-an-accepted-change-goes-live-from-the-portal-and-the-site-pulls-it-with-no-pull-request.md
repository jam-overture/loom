# 0356. An accepted change goes live from the portal, and the site pulls it with no pull request

**Status:** Accepted — partially supersedes 0275 and 0340
**Date:** 2026-11-06
**Section:** §1, §5 (portal), the connection plane

## Context

[0275](0275-a-connection-is-a-read-path-and-a-write-back-path-and-loom-never-writes-into-the-customers-store.md)
made a connection a read path and a write-back path, and said write-back is
*taken, never pushed*: a pull request a person merges, or a pull the customer's
own process performs. Its clause 3 put the pull request first, on the
maintainer's word of 13 October. Unit 8 in [`docs/portal.md`](../docs/portal.md)
was that pull request.

Since then the portal grew the review that a pull request was standing in for.
Loom proposes a change from what readers did (0329), names the goal it serves
(0352), and a person accepts or turns it down on *For review*, where the Gate
runs again. A pull request after that is a second review of the same change in
another tool, and the change is still not live until a developer merges and
deploys it.

The maintainer, on 6 November 2026:

> *"Why does an accepted change require a PR? Wasn't part of the whole point
> that we shouldn't need PR's for a change?"*

and, choosing between going live on *Accept*, a pull request, or both per
project:

> *"No, I think the review flow should be within the portal. I don't like
> relying on Github or any third part for a change management process for
> something that is a human in the loop, when the alternative if it were an
> autmatically selected change would not require a PR."*

## Decision

1. **The review is the portal's, and *Accept* is the last human step.** An
   accepted change is live as soon as the customer's site next pulls (clause
   3). No pull request, no merge, no deploy, and no third party in the change
   process. A change the Gate applies on its own, without a hold, goes live
   the same way.

2. **There is no pull-request write-back.** Not as the default and not as a
   per-project option. 0275 clause 3 is superseded. Loom holds no credential
   to a customer's repository, and unit 8 needs no GitHub connection.

3. **The site pulls the live pages; Loom never pushes and is never asked per
   reader.** 0275 clause 2 holds as written, through its second form: *a pull
   their own process performs*. The customer's server fetches the project's
   live pages from Loom, with the project's public key (0298), on a short
   interval, and keeps them in its own process. A request carries no reader,
   no audience context and no page-view data, so the property
   [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
   calls load bearing still holds: **Loom is not in the render path and never
   learns who a reader is.** Selection for an audience (0263) happens in the
   customer's process against pages it already holds.

4. **A failed pull costs freshness, never the page.** The site keeps drawing
   the last pages it pulled, and with none, the page as it was built. This is
   0262 clause 2 applied to the new path, and it is tested the same way, against
   a pull made to fail.

5. **What is live is Loom's copy of the page.** The copy of 0329 is no longer a
   draft waiting for the site to catch up: it is what the site serves. So 0340
   clause 2 is superseded. A copy an accepted change has moved is not left
   behind, and proposing for the page continues.

6. **The site's own newer version still wins its ground.** When a snapshot
   brings a newer version of a page, the copy starts again from it (0340 clause
   1), and the changes accepted since the last start are applied to it again,
   oldest first, each through the write path. One whose operations no longer
   fit is dropped from the live page and listed on the page's history as
   *no longer fits the site's newer version*, where a person can see it and Loom
   may propose it again. Changes still waiting are checked exactly as 0340
   clause 3 says.

7. **Measuring starts at *Accept*.** The version an accepted change makes is
   live from the next pull, so its *after* window (decided on 5 November and
   recorded in [`docs/portal-wireframes.md`](../docs/portal-wireframes.md))
   starts then, not when a later snapshot arrives.

## Consequences

- Unit 8 becomes *Accept goes live*: a read door that hands a project's live
  pages to its key, the pull in the customer's app, the replay of clause 6, and
  the screen that follows an accepted change to its result. The GitHub App
  versus token question is closed with nothing to decide.
- The pull in the customer's app is framework code (`src/`), not the portal's.
  The portal builds the door and files the client for `Loom daily build`.
- A project whose site does not pull yet is *connected for observation* (0275
  clause 1): accepting still applies the change to Loom's copy, and the screen
  says plainly that the site is not pulling, so nothing reaches readers.
- The customer's repository stops being the whole truth of a page. The live
  page is the built page plus the accepted changes, and the portal's page
  history is where that is read.
- This deployment's own site already serves its pages from the store (0259),
  so for it the copy is the page today and nothing about it changes.

## Alternatives considered

- **Keep the pull request as the write-back, as 0275 planned.** It needs no
  runtime trust, arrives where developers already review code, and cannot take
  a site down. Refused by the maintainer: the person who accepts on *For
  review* has already reviewed the change, a second review in GitHub makes a
  third party part of a human-in-the-loop process, and a change the Gate
  applies by itself would then need more ceremony than one a person approved.
  It also leaves the change unlive until somebody deploys, which is the delay
  Loom exists to remove.
- **Offer both, chosen per project.** Keeps a door open for teams that want
  every change in code review, at roughly twice the work before either route
  ships, and with two kinds of *accepted* to explain on every screen. The
  maintainer declined the pull request outright, so building it as an option
  would be building what he has said he does not want.
- **Fetch the page from Loom on every request.** The simplest pull and the
  freshest, and the one 0262 refuses: Loom would be in the render path, an
  outage here would be the customer's outage, and each request would tell Loom
  that somebody is reading. A periodic pull by the server costs a short delay
  before a change is live and keeps all three properties.
- **Push the accepted page into the customer's app or database.** Live at once,
  and refused by 0275 for reasons that still hold: Loom would need the site to
  be reachable and authenticated on Loom's schedule, or a write credential to
  their data.
