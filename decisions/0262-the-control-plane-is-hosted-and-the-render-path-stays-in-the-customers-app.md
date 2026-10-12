# 0262 — The control plane is hosted and the render path stays in the customer's app

**Status:** Proposed
**Date:** 2026-10-12
**Section:** §1, §5

> **Why it is raised.** [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
> made a project the unit Loom stores under, and left open where the thing doing
> the storing *runs*. The maintainer settled it on 12 October: Loom operates a
> portal for customers who want one, and a customer who would rather not use it
> keeps the mechanism to run everything themselves. This record says what that
> splits, and — more usefully — what it does **not**.
>
> **Why this number.** `0261` is the highest record on `main` at `6204f9e0`, and
> no open pull request adds one.

## Context

The maintainer's words, 12 October:

> *"I imagine we would host for those people who want to use the portal, but if
> anyone wants to skip the portal, then I guess they would be hosting
> themselves. They have the mechanism to do so, but we also give them the portal
> to make it easier."*

And the purpose the portal is for:

> *"The user registers their app, we can read its current state, we set up
> ingesting the signals, we set up a link to their preferred AI service (for
> direct prompting), we set up a link to their preferred AI model to manage the
> ingestion of the signals and enable the app to evolve, we send responses from
> AI to their tree to update it."*

Three shapes were weighed and two are refused below. The one taken turns on a
distinction the codebase already draws and had not yet named.

## Decision

**Loom is split along the line between governing a page and serving it.**

| | runs where | what an outage costs |
| --- | --- | --- |
| **Control plane** — the portal, signal intake, the governance record, policy authoring, every call to a model | Loom's machines, or the customer's if they self-host | governance stops; **no page stops** |
| **Data plane** — resolving a request to a tree and drawing it | always the customer's app | their site |

Five consequences:

1. **A tree the customer serves is local to the customer.** The control plane
   holds the governed copy and the record of how it got that way; the app holds
   what it draws from. A change accepted in the portal reaches the app by a sync
   — the mechanism is step 4's and is not decided here.

2. **An unreachable control plane degrades to the authored page, never to an
   error.** This is already true and already tested: `pageTreeFor` is
   `(await storedPageFor(route)) ?? treeFor(route, context)`, and
   `stored.test.ts` asserts the fallback against a store made to fail. The
   property predates this record; the record makes it load bearing.

3. **Signals go to the control plane directly.** They are write-only,
   high-volume and tolerate loss, which is the one shape that can be hosted with
   no coupling at all: an ingest outage costs analytics, not uptime.

4. **Every model call is control-plane work**, including prompting from the
   portal and reading signals to propose an evolution. Prompting, judging and
   proposing are slow, occasional and human-adjacent. Serving is fast and
   per-visitor. Nothing that calls a model belongs in the render path.

5. **Self-hosting is the same portal against the customer's own database.** Not
   a reduced build and not a second product — one codebase, two operators, as
   the comparable control planes do.

**The runtime's existing model adapter stays.** The maintainer's call: a host
calling a model from its own process remains supported, and may be marked
deprecated later in favour of the portal rather than removed now. Two call sites
with different trust properties is a known and accepted state.

**Holding a customer's model credential in the control plane is accepted.** It
is the one new item of custody this record creates, and the maintainer took it
explicitly. The blast radius is a model bill rather than the customer's data,
which is what distinguishes it from the refused option below.

## Alternatives considered

**Host the store, as a database product does.** The Supabase shape the
maintainer pointed at, and it fails on the thing that makes Loom different from
a database: **the store is in the render path.** Every page view would be a
network call to Loom, so a Loom outage is the customer's outage. It also
collapses the claim the product is sold on — see *What this refuses* below.

**Host the portal, pointed at the customer's database.** Cheaper to build and
strictly worse to own: Loom would hold production database credentials for every
customer. A model key is a bill; a database URL is everything they have.

**Refuse hosting and ship only the self-hosted portal.** What exists today. It
is a real answer and it is the one the maintainer declined, because provisioning
a deployment to govern a landing page is not registering an application.

## What this refuses, and it is the load-bearing half

**The control plane never learns who a reader is.**

A hosted store would mean a request to Loom per visitor, carrying that visitor's
audience context, because the tree would have to be *selected* per reader on
Loom's side. That is the strongest possible form of the thing the product says
it does not do — and `/what-you-run` says it in those words: *"It does not send
your code, your data, or anything about who is reading."*

Under this record the selection happens in the customer's own process, against
trees it already holds, and the sentence stays true. **This is the reason to
prefer the split on its merits, independent of the marketing copy**, and it is
why audience-scoped serving
([0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)) makes
the split more necessary rather than less.

## Consequences

- **A sync is now owed** and is the one piece this record names without
  designing: how an accepted change reaches the app, and how the app's current
  state reaches the portal. Push, pull on an interval, or at build time — step 4
  decides, and all three satisfy clause 2.
- `/api/reader-signals` becomes a cross-network endpoint with a project-scoped
  credential, which it has never had — the finding filed on 12 October.
- The marketing site's claims stay true as written, so nothing in
  `(marketing)` is owed a correction. The maintainer said he did not mind a
  disconnect; under this record there is not one.
- If this is **refused** in favour of hosting the store, 0263 should be
  reconsidered at the same time: per-reader selection on Loom's side is a
  different product with different privacy claims, and the two records stand or
  fall together.
