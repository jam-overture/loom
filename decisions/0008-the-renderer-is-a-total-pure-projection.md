# 0008 — The renderer is a total, pure projection of the tree

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §3 — Adaptive Renderer

## Context

§1 and §2 produce a validated tree. §3 has to turn one into React, per request,
on an edge runtime or inside a Server Component.

Two questions decide the shape of everything after it. The first: what may the
renderer depend on? The second: what does it do when the tree names something it
cannot render — a primitive the host has not registered, because AI proposed it,
or because a deployment rolled the code back but not the tree?

The second question is not hypothetical for Loom specifically. In a framework
where a person writes the JSX, an unknown component is a build error and never
ships. Here the tree is data that changes without a deploy, so a tree naming a
primitive this deployment does not have is a normal Tuesday.

## Decision

**The projection is a pure function of tree, resolver, and options.** No hooks,
no state, no IO, no module-level cache, no clock. `renderLoomTree(tree, options)`
returns the same element for the same inputs, which is what lets it run per
request at the edge and in RSC without the runtime being the thing that decides
where it runs.

**Rendering is total.** It always returns an element. Anything it could not
honour comes back beside the element as a `RenderDiagnostic` — a value, not a
thrown error and not an absent page. An unknown primitive omits that node **and
its subtree** and records one diagnostic naming the node and the type.

**Node ids are React keys.** §1 mints an id once and never changes it on move or
configure. Using it as the key is what makes React reconcile a moved subtree as a
move rather than as a delete plus an insert, so component state inside a section
survives an accepted delta that relocated it.

**Storage is a boundary and is parsed here.** `TreeSource.load` returns
`unknown`; `renderRequest` runs `parseTree` on the result before anything reaches
the projection, and refuses a document whose `treeId` is not the one the request
asked for.

**A resolver is one lookup.** `PrimitiveResolver.resolve(type) => LoomPrimitive |
undefined` is the renderer's entire dependency on the registry. §4 owns
registration — declared prop schemas, packaging, scaffolding — and whatever it
becomes has to satisfy no more than this to be renderable.

## Consequences

- The renderer is testable with no DOM, no browser, and no framework harness:
  render, then assert on the element tree or on static markup.
- Diagnostics are §6's input for a failure class it would otherwise never see —
  "which primitives are trees asking for that deployments do not have" is the
  signal that a proposal was accepted against a registry that has since moved.
- Because unknown primitives omit rather than fail, a host that wants strictness
  has to opt into it by inspecting `diagnostics` and choosing a status code. That
  is a real obligation and it is deliberately the host's.
- Omitting a subtree means a partially rendered page can be served. That is the
  intended trade, and the diagnostic is what makes it visible rather than quiet.
- Rendering cannot fetch. Any primitive needing data fetches it itself, or the
  host resolves it before rendering and projects it through a slot.

## Alternatives considered

**Return `Result<ReactNode, RenderError>` and fail the whole render on an unknown
primitive.** Rejected. It makes one stale card blank the page, which is a worse
outcome than a gap for a runtime whose whole premise is that the tree changes
independently of the code. The information is not lost — it moves from an error
to a diagnostic, where the page still renders and the fault is still recorded.

**Render a visible placeholder for an unknown primitive.** Rejected as a default:
a placeholder is a design decision inside someone else's product, and Loom does
not get to put an "unknown component" box in a customer's checkout. A host that
wants one registers a primitive for the type, which is the same mechanism with
the choice in the right hands.

**Promote an unknown primitive's children into its parent.** Rejected. A card's
contents spilling into the page body looks like a layout bug rather than a
missing component, and it is harder to diagnose than a gap.

**Position paths as React keys instead of node ids.** Rejected: a keyed-by-index
list remounts everything below an insert, which throws away exactly the component
state a "move this section up" edit should preserve. §1 minted stable ids for
this.

**Let the renderer load the tree itself (a default source, a fetch, a cache).**
Rejected. It puts IO in the one place that must stay pure and makes "which tree
does this request get" a property of the library rather than of the host. The
seam is an interface the host implements; a cache belongs behind it, where it can
be keyed and invalidated deliberately.

**Trust the tree coming out of storage and skip `parseTree`.** Rejected. Storage
holds documents written by older schema versions and, in principle, by anything
with write access — validating at every boundary is a standing rule, and the
renderer is the last boundary before a user sees the result.
