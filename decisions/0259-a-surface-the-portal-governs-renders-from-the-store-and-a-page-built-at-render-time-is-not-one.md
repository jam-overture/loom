# 0259 — A surface the portal governs renders from the store, and a page built at render time is not one

**Status:** Proposed
**Date:** 2026-10-11
**Section:** §1, §5

> **Why `Proposed`.** It changes no code and contradicts no `Accepted` record.
> What it does is name the condition a surface has to meet before the portal can
> govern it — and meeting that condition requires a **second lane** to change how
> its routes render, which is not a portal routine's to decide. Written because
> the maintainer asked on 11 October for the marketing and docs surfaces to be
> *"hooked up to the portal under my account/login"*, and the honest answer is
> that one of them nearly can be, the other cannot, and neither is wiring.
>
> **Why this number.** `0258` is the highest record on `main` at `b7f90a5`, and
> no open pull request adds one.

## Context

The maintainer's words, 11 October:

> *"Our loom marketing page and docs page are already built in the Loom
> framework, so these should be hooked up to the portal under my account/login."*

The premise is half true, and the half that is not is the one that decides the
work.

### What the two surfaces actually are

**`(marketing)` is genuinely Loom trees, and has no store.** `/`,
`/how-it-works` and `/what-you-run` are each a `LoomTree` built by a function —
`homePageTree(context)` and its two siblings, through `createTree`,
`buildElement` and `sequentialIdFactory` — and rendered with `renderLoomTree`.
Nothing is persisted. There is no `TreeStore` anywhere under `(marketing)`: the
tree is constructed on every request, from code, and thrown away. It is a Loom
page in every sense except the one that matters here.

**`(docs)` is MDX and is not trees at all.** The pages are `page.mdx` files —
prose with React components in it. The tree-building under
`(docs)/_lib/reporting/` is the primitive catalogue and the API reference, which
are documentation *about* trees rather than documentation *as* a tree.

**The portal governs a `TreeStore`.** Every screen in `(portal)` reads
`portalStore` — the queue, the history, the checkup, the reader screens. A page
exists, for the portal, exactly when there is a row for it.

### Why "hooked up" is not a wiring job

A tree built at render time has no revision, no log, no inverse and no identity
that outlives the request. There is nothing for the portal to list, nothing for
a proposal to be held against, nothing for `/portal/history` to read and nothing
for a reader signal to be filed against. Writing a snapshot of such a tree into
the store does not fix that: it creates **two sources of truth**, and the one
the public sees is the code. A change accepted in the portal would land in the
store and change nothing anybody could visit, which is worse than not being
hooked up at all, because the portal would then be lying about what it governs.

### The surfaces are two apps in 0220's sense

[0220](0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
says an app is a registry, a policy source and a store, that Loom supports one
of each per deployment, and that *"running two apps today means running two
deployments."* One Next application is serving two:

| | `(marketing)` | `(portal)` |
| --- | --- | --- |
| registry | `createStarterPrimitiveRegistry()` — the whole library | four hand-written primitives |
| store | **none** | `portalStore`, memory or Postgres |
| policy | the ask runner's, per request | `portalPolicy` |

They share a process and a visual language and nothing that 0220 counts.

## Decision

**A surface is governed by the portal when the portal's store is where its
pages come from — not when its pages happen to be trees.**

Three conditions, and a surface meets all three or none:

1. **The surface renders from the store.** Its route reads a tree by id and
   renders what comes back. A builder function may still exist, as the thing
   that *seeded* the store or as a fallback for an empty one, but it stops being
   what a visitor is served.
2. **The portal's registry is the app's registry.** A tree is only readable
   against the registry it was built for. A surface whose pages name primitives
   the portal has not registered arrives in the portal as a list of parts it
   cannot draw.
3. **The store is durable.** A memory store makes the governance real only until
   the process is replaced, which on a platform deployment is often.

And one refusal:

4. **Prose is not brought under governance by rewriting it as a tree.** A
   surface whose pages are documents — MDX, markdown, anything whose source is
   the words — stays as it is. [0019](0019-the-portal-is-a-review-queue-not-a-design-tool.md)
   keeps the portal a review queue, and a review queue over hand-written prose
   is a content management system with extra steps.

## Consequences

**For `(marketing)`, this is buildable and is that lane's to build.** Its three
builders become the seed for three stored pages; its routes read the store and
fall back to the builder when the store is empty. The address-driven
rearrangement is unaffected — `runAsk` takes a tree and does not care where it
came from — but the context-dependent parts of those builders (the live paper
trail, the record of what the ask just did) are per-request and cannot be
stored, so that lane has to draw the line between what is the page and what is
the demonstration around it. **Filed for `Loom marketing`.**

**For `(portal)`, condition 2 is this lane's and is not a one-line change.** The
portal registers four primitives, and `/portal/app` reports the rest of the
starter library as *pieces this app has not turned on* — a deliberate feature,
not an oversight. Worse, the 9 October finding records that the portal's four
**share three names with starter primitives and none of their schemas**, so
exchanging one registry for the other would refuse the portal's own seed page.
Condition 2 is a real unit of work with a known hazard in front of it.

**For `(docs)`, nothing changes and nothing should.** The answer to *can the
docs be hooked up* is no, by clause 4.

**For the deployment**, condition 3 is an environment setting and the
maintainer's: without `DATABASE_URL` the portal's store is the server process.

**0220 is the record this one leans on and it is still `Proposed`.** Nothing
here requires it to be accepted — a single app is exactly what is being wired —
but if it is ever refused in favour of several apps, condition 2 becomes *the
portal's registry is the registry of the app whose page is being read*, and this
record would need revisiting rather than superseding.

## Alternatives considered

**Snapshot the marketing trees into the portal's store and leave the routes
alone.** Rejected above: the portal would govern a copy nobody is served. It is
the version of this that looks finished in a screenshot and is false in
production, which is the failure mode this lane photographs every run to avoid.

**Give the portal a read-only view of surfaces it cannot govern** — *here are
the pages this deployment serves, built in code, not under governance.* Rejected
for now: it requires the portal to import another route group's page builders,
which couples two lanes at their internals and is the entanglement the lane
boundaries exist to prevent. It is also a consolation prize for a thing that is
achievable properly.

**Rebuild the docs pages as trees so they can be governed.** Rejected by clause
4, and separately by cost: thirty MDX pages whose value is the prose, rewritten
into a structure that makes the prose harder to edit, to gain a review queue
over text nobody proposes machine changes to.
