# 0010 — Edit mode decorates; it never invents DOM

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §3 — Adaptive Renderer → §5 — Portal

## Context

The build order asks for an "editable decorator injected by the runtime, zero
cost when edit mode is off". The portal needs to map something a person points at
back to a `NodeId`, and needs the tree and revision an `EditIntent` will be
authored against.

The reflex solution is a wrapper: render each node inside a
`<span data-loom-node="…">`, or `<span style="display:contents">` to avoid
disturbing layout. It requires nothing of primitives and it addresses every node
uniformly.

It also changes the DOM. `display: contents` removes the box from layout but
leaves the element in the tree, so `.parent > .card` no longer matches,
`:first-child` shifts, and `:nth-child` counts a wrapper. A page that lays out
correctly with edit mode off and subtly wrong with it on is a page nobody
reviewed — and edit mode is exactly when someone is looking closely and deciding
whether a proposed change is good.

## Decision

**Decoration is attributes on elements that already exist.** In edit mode the
render context carries an `editable` object of `data-loom-*` attributes, and the
primitive spreads it onto its own root element. The renderer adds no element,
ever, in either mode.

- every element node: `data-loom-node`, `data-loom-type`
- the root element additionally: `data-loom-tree`, `data-loom-revision`

The root pair is deliberate. It is exactly the base an `EditIntent` needs, so a
portal can author one from the DOM alone, and an intent authored against a stale
render names the stale revision rather than silently claiming the current one —
which is what makes §1's base-revision check fire instead of applying a delta to
a tree that moved.

**Text and slot nodes are not decorated.** Neither has an element of its own, and
inventing one for them is the thing this record rules out. They are addressed
through their nearest element ancestor.

**Zero cost when off is literal.** With edit mode off, `editable` is absent from
the render context — not empty, absent. Nothing is allocated and nothing reaches
the markup; the whole cost of the decorator is one boolean test per element.

**§5 inherits two things from this.** Addressing is "nearest decorated ancestor",
not "the node under the cursor". And a primitive that drops `loom.editable`
renders correctly but is invisible to the portal, so §4's registration contract
is where that gets caught — a conformance check on registration, not a runtime
surprise.

## Consequences

- Markup is byte-identical with edit mode off, so a decorated render and a
  production render lay out the same. Tested by tag count.
- A person cannot point at a sentence and get its `TextNode` id; they get the
  element containing it, which becomes the intent's `scopeNodeId`. That is
  weaker than §1 intended when it made text a node, and it is the price of not
  touching the DOM. If §5 proves it insufficient, the honest fix is a new record
  superseding this one — not a wrapper added quietly.
- Decoration depends on primitives cooperating. That is a contract, and an
  uncooperative primitive fails visibly (nothing in the DOM to click) rather than
  subtly.
- The attributes are stable public names. The portal, tests, and any external
  tooling read them, so renaming one is a breaking change.

## Alternatives considered

**Wrap every node in `<span style="display:contents">`.** Rejected, above: it
changes what CSS selectors match, precisely when someone is judging a change.

**Wrap only text nodes.** Rejected. It buys text addressability at the cost of
the same class of breakage in the one place it is hardest to predict — a parent
whose only child was text now has an element child, so `:empty`, `:only-child`,
and text-specific styling all shift.

**Attach a `ref` and register nodes in a client-side map instead of attributes.**
Rejected: it requires a client component per node, which forfeits RSC and the
edge, and it makes edit mode cost something when it is off.

**Emit a separate id→path map alongside the markup for the portal to consult.**
Rejected. It is a second source of truth about a structure that changes on every
accepted delta, and it goes stale exactly when the page is being edited.

**Have the renderer spread the attributes onto whatever the primitive returns**
(cloning its root element). Rejected: `cloneElement` on a component's return
value reaches through its abstraction, breaks for primitives returning fragments
or `null`, and would silently rewrite a component's own props.
