# 0260 — A project is the unit Loom stores, governs and measures under

**Status:** Accepted — refuses 0220
**Date:** 2026-10-12
**Section:** §1, §5

> **Why it is raised.** It refuses
> [0220](0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md),
> which is `Proposed` and says Loom supports exactly one app per deployment.
> 0220 was written on 1 October *because* the maintainer asked to see **"which
> apps I have registered with Loom"**, and its honest answer then was *there is
> no such thing, and here is what a second would cost*. On 12 October he
> answered it: *"The whole portal is geared toward one app…when I can have
> many."* 0220 says what that costs and where the work starts, so this record
> is mostly 0220's own bill, accepted.
>
> **Why this number.** `0259` is the highest record on `main` at `c93995d1`,
> and no open pull request adds one.
>
> **Accepted on 13 October**, and **clause 4 corrected the same hour.** It said
> `/api/reader-signals` *"authenticates a project-scoped key today and nothing
> else"*. It authenticates nothing: there is no key check, no origin check, and
> no middleware anywhere in the repository. Checked rather than assumed, because
> it is the clause the portal's first unit rests on
> ([`docs/portal.md`](../docs/portal.md)) and the plan and this record
> contradicted each other about it. Corrected in place rather than by a
> successor, since no decision moved and only a statement about the code was
> wrong.

## Context

The portal is unusable, and not because its screens are badly made. Every one
of them is a faithful rendering of 0220. `Your app`, singular, is its monument:
13,298 pixels naming the one app and printing its whole registry and policy
inline, because under 0220 there is nothing above it to put either under.

0220 anticipated this exactly:

> If it is **refused** — that is, if the maintainer wants several — the work is
> §1's and starts at the store's signatures, not at a screen.

It also wrote down the bill, which is still accurate and is reproduced here
rather than re-derived: an identifier above the tree; the hold store, the
journal and the signal ledger following it; a registry per app; and
authorisation acquiring a scope.

Two things have changed since 1 October that make the answer different.

**The first is that the portal now has real rows to lose.** On 12 October the
marketing site became three stored trees ([0259](0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
condition 1). Those three and the portal's demonstration page share one store
with no way to say which belongs to what, which is the condition 0220 called
tolerable while every stored tree was a demonstration.

**The second is the stated purpose of the portal.** The maintainer, 12 October:

> *"The primary purpose of the portal will be to register / hook up their
> application to the portal and begin processing signals from their web
> pages."*

A thing an application registers *as* is a thing Loom must be able to name.
There is no reading of that sentence that one-app-per-deployment satisfies.

## Decision

**A project is the unit Loom stores, governs and measures under, and a
deployment holds many.**

1. **A `ProjectId` sits above every identifier Loom has.** A `TreeId` is unique
   within a project rather than within a store. Every store, hold, journal and
   signal read takes a project, and none of them can span two.

2. **A project owns a registry, a policy source and an ingest credential.**
   0220's triple is right about what an app *is*; it is wrong only about how
   many there are. The registry is resolved per request, which is what
   `PolicySource` already does for the policy and what nothing does for the
   registry.

3. **Authorisation gains a scope.** [0027](0027-identity-is-server-derived-and-absence-fails-closed.md)'s
   *the actor comes from the session, never from the form* acquires its second
   half: **the scope comes from the route, never from the body.** A reviewer is
   a reviewer *of* something.

4. **A signal is filed against a project or it is refused.** An unattributable
   batch is dropped rather than stored against whatever tree id it happens to
   name. **Nothing authenticates the intake today** — no key, no origin check,
   no middleware — so the only control a deployment has is whether the intake is
   open at all, and this clause is therefore a unit of work rather than a
   configuration change. Corrected on 13 October; the sentence here previously
   said a project-scoped key was already being authenticated.

5. **Nothing is migrated by guessing.** The rows that exist belong to the
   deployment that wrote them, so the migration puts them in one project named
   for it rather than inventing a distribution.

## Alternatives considered

**Keep 0220 and run a deployment per project.** 0220's own answer, and it is a
real one — two processes, two stores, two composition roots. It fails the
stated purpose: a person who has to provision a deployment to add a landing
page has not registered an application, they have operated a server. The
Supabase model the maintainer pointed at has one control plane and many
projects, and that is the shape being asked for.

**Add `projectId` as a nullable column now and populate it later.** 0220
rejected this and was right: *"an identifier nothing reads is an identifier
nothing maintains."* The migration is the work and the field is the easy part.

**Vary only the policy, per 0220's cheap version.** `PolicySource` already
gives different governance without different storage, and it is built and
shipping. It does not give a list of projects, a per-project credential, or
signals somebody can tell apart — which is all of what was asked for.

## Consequences

- **`docs/portal.md` is superseded.** It is the approved plan of 1 October and
  it assumes one app in every section.
- **`Your app` is deleted rather than rebuilt.** It is 0220's screen.
- The portal's rail stops being a flat list of twenty-two routes and becomes a
  workspace, a project, and a project's sections.
- **The migration is the risk, and it is a real one.** Nine tables carry a tree
  id or a node id today and every one of them gains a column. A hold listing
  that spanned two projects would put one project's changes in another's queue,
  which 0220 named as the one failure a governance surface cannot have.
- If this is **refused**, the portal stays one app's and the maintainer's
  request of 12 October cannot be met; the honest response would be to say so
  on the screen rather than to keep building against it.
