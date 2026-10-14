# 0275 — A connection is a read path and a write-back path, and Loom never writes into the customer's store

**Status:** Accepted
**Date:** 2026-10-13
**Section:** §1, §5

> **Why it is raised.** [0262](0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
> split governing a page from serving it and then said plainly that the sync
> between the two is *owed and deliberately not designed here*. This is that
> debt. The maintainer named three shapes of customer on 13 October — a project
> on a developer's machine, a project in a GitHub repository, and an app already
> serving its own trees out of its own database — and asked how a portal that
> hooks them up should be organised. The answer that makes those three one
> product rather than three is below.
>
> **What the maintainer settled, 13 October**, and what is this record's own
> argument. He settled the order — *"I agree a github PR write back should be
> first, it will be the most common connection"* — and the read-only registry
> and audience-scoped deltas that clauses 5 and 6 restate. Clauses 1 and 2 are
> the record's argument and are what he is being asked to accept.
>
> **It rests on a proposed record.** 0262 is `Proposed`, as are 0260, 0261 and
> 0263. This one cannot be accepted ahead of 0262 and should be accepted in the
> same pass.
>
> **Why this number.** Raised as `0270` and renumbered the same hour: `0270`
> was taken on `main` between writing and indexing, and a clash is fatal (0097).
> `0273` is the highest on `main` now, `0274` is claimed by **two** open pull
> requests — #627 and #628, a clash of their own that neither can see — so this
> is `0275`.
>
> **Accepted on 13 October**, with 0262, which it cannot precede.

## Context

Three customers, and the thing that differs is not their stack:

| | Where the tree of record lives |
| --- | --- |
| A project on a machine | files in a working copy |
| A project in a repository | files on a branch, deployed by CI |
| An app serving from its own store | a row in their database |

A portal that models these as three integrations builds three products and
maintains three. A portal that models them as **one pair of adapters** builds
one, because everything above the pair — signals, policy, holds, the record,
the model seam, audiences — is identical in all three.

The pair is a **read path** (how Loom learns what the app's tree is now) and a
**write-back path** (how an accepted change reaches the app). Nothing else about
a connection is load-bearing.

## Decision

1. **A connection is a read path and a write-back path, named per project.** A
   project may have neither, one, or both. A project with neither is *connected
   for observation* — a legitimate and useful state, and the first one a
   customer reaches.

2. **Write-back is taken, never pushed.** Loom makes an accepted revision
   available; the customer's side takes it — a pull request a person merges, or
   a pull their own process performs. **Loom holds no write credential into a
   customer's database and never calls into their running app.** This is 0262
   clause 2 made operational: a control plane that cannot write cannot break a
   page, and the worst an outage here can do is leave the authored page serving.

3. **The first write-back is a pull request against the customer's repository.**
   The maintainer's call, and the reasons are good: it needs no runtime trust,
   it arrives in a medium developers already review, it cannot take a site down,
   and it leaves the customer's deploy pipeline exactly where it was.

4. **Signals need no connection.** Reader signals go to the control plane
   directly (0262 clause 3) and name nodes, not content, so observation works
   with no read path and no write-back path at all. Ingest is therefore the
   first thing a project can do and does not wait on either adapter.

5. **The portal reads the registry and cannot change it.** A primitive is a
   component in the customer's repository. The portal shows what an app can be
   built from, synced as data; *which* of those the AI may use is a policy field
   and not a portal edit. There is no primitive management.

6. **A persona is an audience, and an audience earns deltas** (0263). The portal
   manages the rules that map context to deltas. It is not a page builder, and a
   hand edit, if one is ever offered, is a proposal with origin `human` through
   the same Gate as any other.

## Alternatives considered

**Loom writes into the customer's store.** The most direct sync and the one
that makes the demo shortest. Refused: it puts a hosted control plane inside the
customer's failure domain, inverts 0262 clause 2, and makes every Loom incident
potentially their incident. A pull is one more moving part and it is theirs.

**One integration per customer shape.** Honest about the differences and
unaffordable: three read paths, three write-backs, three sets of failure modes,
and a portal whose screens differ by customer type.

**Push by webhook into their app.** Rejected for the same reason as writing into
the store, in a thinner disguise: the customer's app must then be reachable,
authenticated and correct on Loom's schedule rather than its own.

## What this refuses

- A write credential into a customer's database, in any connection shape.
- A page builder in the portal.
- A second mechanism for personas beside audience-scoped deltas.
- Primitive management as a portal capability.

## Consequences

- **The CLI has no `push` or `pull` today.** It scaffolds a primitive registry
  and nothing else, so the machine-local connection is new work rather than a
  wiring job.
- **`/api/reader-signals` authenticates nobody**, so clause 4's "first thing a
  project can do" is itself the first unit of work.
- **A read path is owed a shape**: what a repository hands Loom — the built tree
  as a snapshot artifact, or a module Loom evaluates. Not settled here.
- The build order in [`docs/portal.md`](../docs/portal.md) follows from clause 4
  and clause 3 in that order: observation, then the read path, then governance,
  then the pull request.
