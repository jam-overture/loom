# 0209. An app is a registry, a policy and a store — and Loom has one of each

**Status:** Proposed
**Date:** 2026-10-01
**Section:** §1, §5

> **Why `Proposed`.** It does not change any code and it contradicts no
> `Accepted` record. What it does is name a thing the framework has never named,
> and the naming has a consequence — a second one would have to be addressable —
> which is the tree schema's business and not a portal routine's to decide.
> Written because the maintainer asked the portal for *"which apps I have
> registered with Loom"* on 1 October and the honest answer is below.
>
> **Why this number.** `0208` is the highest record on `main` at `7257ad2`, and
> no open pull request adds one.

## Context

On 1 October the maintainer asked the portal to show **which apps are registered
with Loom**. The portal cannot, and the reason is not a missing screen.

**Nothing in Loom is an app.** A deployment is three objects wired at a
composition root:

| | what it decides |
| --- | --- |
| a `PrimitiveRegistry` | what may be drawn, and therefore what a model may propose (0013) |
| a `PolicySource` | which rules a change is judged by (0033) |
| a `TreeStore` | which pages exist, and their whole record |

Everything else is addressed under one of those. A `TreeId` is unique within a
store. A `NodeId` is unique within a tree. A hold names a `ProposalId` and a
`TreeId` and nothing above either. A reader signal is filed against a node and a
revision. **There is no identifier anywhere in the system for the thing that owns
a store**, because until now there has only ever been one of them per process.

Two things already lean on that and are worth naming, because they are the reason
it has not hurt:

- `PolicySource` exists precisely so that one process can judge *two tenants, two
  surfaces, or two trust levels* differently (its own words). It takes the tree
  and the ask and returns a policy. It is the one seam in the runtime that
  already contemplates more than one of something.
- `renderRequest` carries an opaque host context — *audience, locale, tenant* —
  which the host interprets and the runtime does not.

So the framework has anticipated multi-tenancy at the two seams where a decision
is made, and has never needed it at the seam where a thing is *stored*.

## Decision

**An app is the triple — a registry, a policy source and a store — and Loom
supports exactly one of them per deployment.**

Three consequences, stated so that a surface can be built on them today:

1. **A portal shows one app and says so.** Not a list of one, which would imply a
   second could appear and would be a claim the framework does not support.
2. **The word *app* is a reading of what is already there**, not a new object. It
   names the three things that are already wired together; it adds no field, no
   identifier and no migration.
3. **Running two apps today means running two deployments.** Two processes, two
   stores, two composition roots. That is a real answer and it is what somebody
   doing it now is already doing.

## Alternatives considered

**Give the portal a list of one.** The cheapest thing, and the dishonest one. A
list is a claim that its length can change, and this one's cannot without every
item under *Consequences* below. A reader who saw one row would reasonably look
for the button that adds a second.

**Call the store the app, and the trees its pages.** Nearly right, and it fails on
the two decisions that matter most. The registry bounds what may be built (0013)
and the policy bounds what may be done (0002), and neither lives in the store — so
"the app" would name the thing that holds the content and not the thing that
governs it, on a framework whose whole subject is the governing.

**Add an `appId` now and leave it unused.** Rejected for the reason a nullable
column is always rejected: an identifier nothing reads is an identifier nothing
maintains, and the first caller to need it would find it unpopulated for every row
written before it existed. If this is ever wanted, the migration is the work and
the field is the easy part.

**Say nothing, and let the portal show what it shows.** What happened until now,
and what prompted the question. A surface that never names its own subject makes
the reader supply it, and the reader's guess here was *there must be a list
somewhere*.

## What a second one would cost, if it is ever wanted

Recorded here so the question is answered once rather than estimated each time it
is asked. Every item is a schema or an addressing change, which is what makes this
§1's rather than §5's:

- **An identifier above the tree.** Every `TreeId` becomes unique *within an app*
  rather than within a store, or every store read takes an app. The first changes
  what an id means; the second changes every signature in `@jam-overture/loom/store`.
- **The hold store, the journal and the signal ledger follow it.** Each is keyed on
  a tree or a node today. A hold listing that spanned two apps would put one app's
  changes in another's queue, which is the one failure a governance surface cannot
  have.
- **A registry per app.** The renderer resolves against one registry; two apps with
  different catalogues means the resolver is chosen per request, which is what
  `PolicySource` already does for the policy and what nothing does for the registry.
- **Authorisation.** The portal's roster is a list of people who may review *this*
  deployment. With two apps, a reviewer is a reviewer *of* something, and 0027's
  "the actor comes from the session, never from the form" acquires a second half:
  the actor comes from the session and the *scope* comes from the route.

**The cheap version, if it is ever enough:** a deployment stays single-app and
`PolicySource` carries the variation that is actually wanted — different rules for
different surfaces of one product. That is built and shipping. It gives different
*governance* without different *storage*, and the maintainer's question may turn
out to mean that.

## Consequences

- The portal's `Your app` screen is correct as built: singular, and explicit that
  Loom looks after one app per installation.
- `docs/portal.md` records the multi-app model as out of scope for §5 rather than
  as unbuilt, which is a different claim and the honest one.
- If this is accepted, nothing changes. If it is **refused** — that is, if the
  maintainer wants several — the work is §1's and starts at the store's signatures,
  not at a screen.
