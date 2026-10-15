# 0281. The answers a resolution was built from are published as data, and the far side re-plans

**Status:** Accepted
**Date:** 2026-10-15
**Section:** §4 (the binding seam)

## Context

`resolveDataPlan` hands back a `DataResolution`, which is two functions:

```ts
export interface DataResolution {
  readonly lookup: (nodeId: NodeId) => NodeData
  readonly problemsFor: (nodeId: NodeId) => readonly NodeDataProblem[]
}
```

That is the right shape for the render walk and it is unsendable. A closure
cannot cross from a server component to a client one, so the answers a loader
fetched could not reach a render that happens in a browser — and fetching in one
place and rendering in another is not an exotic arrangement. It is the one every
React framework pushes a host towards, and on the documentation site it is
forced rather than chosen: §4c settles that every example carries a working
propose-a-change box, a change produces a new tree, and the walk therefore runs
wherever the reader is.

**Both halves of a serialisable seam already existed and there was no way
between them.** `buildDataResolution(plan, answers)` is exported and is exactly
the function the far side needs; nothing public produced the
`ReadonlyMap<RequestKey, DataAnswer>` it takes. `resolveDataPlan` built that map
internally and folded it away, and `askOne` — the per-request step that carries
the ceiling (0140) — is private. So a host could not get from one to the other
without reimplementing the ceiling.

`Loom docs` filed this on 12 October after writing the workaround:
`app/(docs)/_lib/data/carry.ts` reads a resolution out through its own two
accessors and puts the readings back behind two of the same shape. The readings
it carries are real and it is tested. **Five of its lines are a guess that a
published seam should not have left to a caller** — which nodes to ask about:

```ts
[...plan.bindings.map((b) => b.nodeId), ...plan.problems.map((p) => p.nodeId)]
```

Both lists, because a node whose declaration could not be read at all is in the
second and never in the first. The filing records that this took one red test to
discover, and that a caller reaching for `bindings` alone — the obvious thing to
reach for — gets a carrier that silently drops every misdeclared node's problem.
The symptom is a page that renders without a diagnostic it should have had.

## Decision

**1. Resolving publishes what it asked.** `resolveDataPlan` and
`resolveTreeData` return `ResolvedData`, which *extends* `DataResolution` with
one field:

```ts
export interface ResolvedData extends DataResolution {
  readonly answers: DataAnswers
}
```

**2. The far side re-plans; it does not carry the resolution.** The round trip
is the tree and the answers, and nothing else:

```ts
const { answers } = await resolveTreeData(tree, { registry })   // where IO happens
const data = buildDataResolution(planTreeData(tree), new Map(answers))  // where the walk happens
```

This is what keeps *which requests were asked* inside the package. Planning is
already a pure function of the tree (0058), so the far side holds everything it
needs to derive the keys, and it derives them with the same code that minted
them rather than with a guess at what they were.

**3. The answers are pairs, not a `ReadonlyMap`.** `DataAnswers` is
`readonly (readonly [RequestKey, DataAnswer])[]`. The only reason to publish
them is that they travel, and `JSON.stringify` turns a `Map` into `{}` and says
nothing about it. A host that serialised one would send an empty object, rebuild
a resolution that answers nothing, and get a page of `data-unresolved`
diagnostics with no hint that the answers were lost in transit rather than never
fetched. `new Map(answers)` on the far side is two words and is the one place the
shape converts.

**4. A field, not a second API.** Nothing is added beside
`buildDataResolution`, and the per-request step stays private. `ResolvedData`
is assignable to `DataResolution`, so every caller that only renders — the
renderer, the specimens, the tools, and every compiled fence on the
documentation site — reads nothing new and changes nothing.

**5. `DataAnswer` is named.** `Result<JsonValue, DataUnavailable>` is what a
loader now has to write into its own return type, and a host should not have to
spell out a structure to describe something the seam already has a word for.

## Consequences

A host that fetches and renders in different places writes two lines and no
carrier. The guess goes away rather than getting easier: there is no node list
to derive, because nodes are not what travels.

**A repointed binding still reports `data-unresolved`, and that is preserved
rather than fixed.** Keys are canonicalised params, so re-planning a tree whose
binding was changed produces a key the answers do not hold, and
`buildDataResolution` reports `not-resolved` for it. That is correct: the answer
in hand is the answer to a question this tree no longer asks, and drawing it
would be showing a reader data that was never fetched for what they are looking
at.

**The answers are a `JsonValue` and a reason, so nothing in them is privileged.**
They are as safe to send as the page they were fetched for — which is the host's
judgement to make and always was, since the host chose the sources. Loom adds no
filter here and should not: a seam that silently dropped fields would make
`ready` mean something different on each side of the boundary.

`apps/loom/app/(docs)/_lib/data/carry.ts` can now shed its node derivation. That
is `Loom docs`' file and this change does not touch it; filed for that lane.

## Alternatives considered

**Returning `{ resolution, answers }`** — the shape the filing recommended.
Rejected because it breaks every caller of `resolveDataPlan` and
`resolveTreeData` to serve the few that need the answers, and `resolveTreeData`
has about twenty call sites including compiled teaching fences published on the
documentation site. Extending the interface gets the same field for no
migration.

**A published `carryDataResolution` / `restoreDataResolution` pair** — carrying
the resolution rather than the answers. Rejected because it makes nodes the unit
that travels, which is what makes the node list necessary, which is the guess
being removed. It would have moved the guess into the package rather than
deleting it.

**Exporting `askOne`** — making `buildDataResolution`'s input producible by
hand. Rejected: it publishes the step the ceiling hangs off, so a caller could
assemble answers that never passed through it, and 0140 exists because there is
no way to wait forever.

**Keying the answers by node rather than by request.** Rejected because it
undoes the deduplication planning exists for: two bindings naming one source
with the same params share a key and therefore share an answer, and a
node-keyed carry would send the same row twice and let the copies disagree.
