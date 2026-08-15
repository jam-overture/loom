# 0058. A binding is a question the tree asks, answered before the walk

**Status:** Accepted
**Date:** 2026-08-15
**Section:** §4e → §3, §4b

## Context

The port has reached the thing Loom has no answer for. The README's port table
names it in one line — Hermes resolves `binding` fields from a profile and from
integrations; Loom has "plain JSON props, no resolution layer" — and five of the
seventy blocks depend on it: `about` binds three fields to one profile,
`services` and `products` bind a list to a connected integration with a
`show-prompt` fallback, `feed` and `marquee` the same. Ported without an answer,
those blocks become an author typing their own services into props by hand,
which is not the block anyone used.

Three constraints pull against each other.

**Rendering cannot wait.** `renderLoomTree` is a pure synchronous function of
the tree and the resolver — no hooks, no IO, no module cache — and that is what
lets it run inside a Server Component and what makes two renders of one revision
agree. Fetching a profile is IO by definition. An `await` anywhere in the walk
gives that up.

**Props belong to the tree.** A model proposes props, the Gate weighs them, the
log attributes them and the inverse takes them back. Data belongs to whoever
runs the deployment: it changes without a proposal, it differs per visitor, and
nobody undoes it. Putting an answer where a prop goes would make the tree a
cache of someone's database, and every `configure` a write against stale content.

**Params are AI-authored.** A binding names a source and asks it with
parameters, and both arrive from a model through the same path as everything
else in the tree. A source taking a free-form query is the failure
[0053](0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md) rejected
for URLs, in a place where the blast radius is the host's data rather than one
`href`.

## Decision

**A binding is a question, carried in the tree, and never an answer.**
`loom:data` is the second key in the reserved namespace
[0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
opened — it predicted this exact cost, "a key and a diagnostic rather than
another record" — and it holds a map of binding names to a registered source id
and its params:

```json
"loom:data": { "services": { "source": "catalogue.services", "params": { "limit": 6 } } }
```

Nothing about the reply is in the tree. Two deployments serving one revision
show the same page asking the same questions, and differ only where their data
differs.

**Resolution happens before the walk, in three steps.** `planTreeData` is a pure
pass that reads every binding out of the tree and returns the deduplicated set of
questions. `resolveDataPlan` is the one step that does IO, asking every question
at once. `renderLoomTree` takes the answers as a finished lookup and stays
exactly as synchronous as it was. `renderRequest` is where the three meet, and
it was already async.

**A source is registered, like a primitive and like a theme id.** `defineSource`
declares an id, one line for the catalogue, a Zod schema for what it accepts, a
Zod schema for what it answers, and the adapter. The registry is the allowlist:
a binding can only reach what a deployment registered, params are validated
before the adapter is called, and the answer is validated after — the adapter's
types are a claim about a database, and the schema is what makes the claim true
on the day the column changed. `dataCatalogue` projects the registry the way
`catalogueOf` projects primitives, because a source a model was never told about
is one it can only guess at.

**An answer is `ready` or `unavailable` with a reason — never merely absent.**
A primitive receives `loom.data`, beside `props` rather than merged into it, and
a binding that could not be answered says which of six things went wrong. There
is deliberately no way to express "empty" as a failure: a source with nothing to
report answers `ready` with an empty list. Collapsing those two is the mistake
the portal spent its 15 August run undoing — a reader who takes "we could not
reach your services" for "you have no services" concludes their data is gone.

**Every failure is total.** An unregistered source, params the source refuses,
an answer that fails its own schema, an adapter that throws, and an adapter that
reports a timeout or a refusal all produce a diagnostic and a node that still
renders. The single `try` in the runtime's own code is the one around a host
adapter, because an adapter is not Loom's code and one integration's bad
afternoon must not be why a page 500s.

## Consequences

- **A page is no longer a function of the tree alone.** This is the real cost and
  it is not hidden: 0050 wrote that the reserved namespace keeps "the page a
  function of the tree alone", and a tree that asks a question does not have that
  property. What survives is the weaker and still useful claim — *the tree alone
  determines what is asked*. Which questions, of which sources, with which
  params, is fixed by the revision; only the answers vary. A page that renders
  differently for two visitors does so at named points, each of which is a
  binding somebody proposed and the Gate weighed.
- **A revision no longer pins what a reviewer saw.** Approving a change to a
  bound node approves the question, not the answer that was on screen. §6 already
  records diagnostics; what it does not record is which answers a render used,
  and reconstructing a page as a reviewer saw it would need that. Named here as
  the open question it is, rather than solved speculatively.
- **The renderer now depends on the data seam, and not the reverse.**
  `src/data/` knows nothing about React and imports nothing from `render/`, so a
  host can plan and resolve a tree's data without loading the renderer — which is
  what a cache warmer or a static export would want.
- **`loom.data` is on every render context**, empty for the overwhelming majority
  of nodes that bind nothing. That costs one frozen null-prototype object shared
  by all of them, and it means a primitive reads `loom.data.services` without
  first proving the map exists — the same bargain `loom.slots` makes.
- **Identical questions are asked once.** Hermes' `about` bound three fields to
  one profile; three round trips for one row is a cost paid on every request
  forever. Bindings sharing a source and params share a key and an answer, with
  key order canonicalised so that params a model happened to write in a different
  order are still one question.
- **`partitionReservedProps` moved** out of `render/theme.ts` to a top-level
  `reserved-props.ts`, because the namespace acquired a second reader that is not
  part of rendering. `render/theme.ts` re-exports it, so the `@loom/runtime/react`
  surface is unchanged.
- **No primitive in the starter library binds anything yet.** The seam exists and
  is proved by tests; what is not yet built is the authoring half — a primitive
  declaring which binding names it reads, so the catalogue can tell a model that
  `loom.services` wants a `services` binding. That is the next unit, and it
  changes `definePrimitive` rather than anything decided here.

## Alternatives considered

**Resolve inside the walk, and make rendering async.** The obvious shape, and it
is one `await` away in `renderElement`. It gives up the property that makes the
renderer what it is: a synchronous pure function has no ordering between nodes,
cannot deadlock, and cannot make a page's latency depend on its depth. An async
walk resolves a binding when it reaches it, so a card nested six deep waits for
five ancestors, and the same tree rendered twice can interleave differently.
Rejected for that, not for difficulty.

**Put the answer in the props.** Then a primitive's own Zod schema validates its
data, and primitives need no second bag. It makes the tree a cache: a `configure`
proposed against a node whose props were last filled by a database write is a
proposal against content nobody authored, the inverse of such a change restores
data rather than a decision, and the Gate would be weighing the stakes of
"someone's services list changed overnight". The tree stops being a document.

**A binding as a new node kind.** `{ kind: "binding", source, params }` beside
`element`, `text` and `slot`. Honest about it being a distinct thing, and it puts
the resolution point in the structure where a reader can see it. It changes the
tree schema, so every built tree, every delta, every store snapshot and the
model-facing reply schema migrate — for a thing that is a property *of* a node
rather than a node. The reserved namespace exists to hold exactly this.

**Let the adapter take the params uninterpreted.** Less registration ceremony,
and each host validates its own. It hands a model whatever query language sits
behind the adapter, and the deployment that forgets to validate does not find out
until a proposal asks a source for a column nobody meant to publish. The schema
is not ceremony; it is the allowlist.

**One answer per node rather than a named map.** Simpler shape, and it fits the
`services` and `products` blocks exactly. `about` binds three fields, and the
Hermes registry is the evidence that the multi-binding case is the normal one,
not the exotic one. A map costs nothing when there is one entry.

**Report unavailability as an absent key**, letting a primitive write
`loom.data.services ?? []`. Much the nicest to write, and it makes the mistake
above unavoidable rather than merely possible: the primitive that treats a
missing answer as an empty list is the one that tells a visitor their services
are gone when in fact the integration timed out. The verbose shape is the one
that cannot lie.

**Cache answers across requests inside the seam.** Tempting, and every host will
want it. It belongs behind the adapter, where a host can key and invalidate it
deliberately, for the same reason `TreeSource` holds the tree cache
(`render/request.ts`). A cache inside the seam would be a second source of truth
about data the runtime does not own.
