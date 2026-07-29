# 0009 — Primitives receive AI-authored props in a bag, never spread

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §3 — Adaptive Renderer → §4 — Framework SDK

## Context

An element node carries `props: JsonObject`. The renderer has to hand them to the
registered component. The obvious way is the React-idiomatic one:

```tsx
createElement(primitive, { ...node.props, children })
```

That reads naturally and makes a Loom primitive look like any other React
component. It is also the wrong shape here, and the reason is what makes Loom
different from a template engine: **the props are AI-authored and arrive from
storage.**

A spread means a proposal can name any prop the component accepts — including the
ones React reserves. `dangerouslySetInnerHTML` on a primitive that forwards its
rest props to a DOM element turns "make the heading friendlier" into script
injection. `key` and `ref` silently change reconciliation. A `className` a
primitive did not expect quietly overrides a design system. None of this requires
a malicious model; a confidently wrong one is enough, and the Gate cannot catch
it, because at Gate time the props are a legal `JsonObject` and the damage
depends on what the component does with them.

## Decision

A primitive receives exactly three props:

```ts
type LoomPrimitiveProps = {
  readonly loom: LoomRenderContext   // nodeId, type, and edit-mode decoration
  readonly props: JsonObject         // the node's props, exactly as in the tree
  readonly children: ReactNode       // rendered children, or null
}
```

The node's props stay in the `props` bag. The renderer never spreads them, never
merges them into the component's own props, and never interprets them. A
primitive reads what it declares out of the bag; nothing else can be smuggled
past it.

`loom` is the runtime's namespace. Everything the runtime supplies — identity
today, edit-mode decoration, whatever §5 and §6 add — goes under it, so the
runtime never has to compete with a primitive's own prop names.

**§4 inherits an obligation from this.** The bag is the natural place to validate
a primitive's declared prop schema, and it is the boundary where that validation
belongs: one Zod parse of `props` against the registered schema, at the seam that
already exists. That is §4's to build; this record fixes where it goes.

## Consequences

- A primitive cannot be a bare DOM tag. `staticPrimitiveResolver({ box: "div" })`
  does not typecheck. Every registered primitive is a real component that decides
  what its props mean — which is the point, but it is a real cost: adapting an
  existing component library means writing a thin wrapper per component.
- Reserved React names in a tree are inert. `dangerouslySetInnerHTML` in
  `node.props` reaches the bag and stops there, tested.
- Props are visible as data at the seam, so §6 can record what a delta actually
  set without instrumenting components.
- Prop validation has an obvious home rather than being scattered across
  primitives, and a primitive that skips it fails in its own render rather than
  corrupting anything above it.
- Primitive authors give up React ergonomics — destructuring `{ title, variant }`
  from their own props — in exchange for a bag they destructure one level down.

## Alternatives considered

**Spread props and blocklist the dangerous names.** Rejected. A blocklist is a
list of the attacks known on the day it was written, and it grows with React,
with the DOM, and with whatever a host's component library treats as special.
The bag needs no list.

**Spread props and require primitives not to forward rest props.** Rejected: it
is a convention no type can enforce, and the failure is invisible until it is a
security bug in someone else's product.

**Namespace the runtime's props instead (`__loomNodeId`) and spread the rest.**
Rejected. It solves collisions between the runtime and the primitive, which is
the smaller problem, and leaves collisions between AI-authored props and React's
reserved names, which is the dangerous one.

**Validate props against the primitive's schema in the Gate instead.** Rejected
for now, and worth revisiting when §4 exists. The Gate is pure and knows nothing
about a registry; giving it one would make its decisions depend on which
deployment is asking, and a change that gates differently per host is not a
change anyone can reason about. Validation at the render seam fails in one
deployment and reports why, which is the honest place for a deployment-specific
fact.
