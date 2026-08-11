# 0050. The runtime's props are namespaced, and the root primitive mounts the theme

**Status:** Accepted
**Date:** 2026-08-11
**Section:** §3 → §4b

## Context

[0049](0049-a-theme-is-three-ids-in-the-tree.md) put a theme in the tree — a
palette, a font pack and a style preset, carried as props on the root node —
and explicitly left one thing undone: *nothing mounts the variables*. Getting
them onto the page raises two questions 0049 did not answer.

**The first is whose props those are.** Props belong to the primitive; the
registry validates them against the primitive's declared schema, and the SDK's
own example declares `.strict()`. A root primitive that does not know about
themes would therefore reject a tree wearing one, and the failure is not
cosmetic: the renderer omits a node whose props are invalid, so a `configure`
that sets the theme would blank the whole page. Making every root primitive
declare the key instead is worse in a different way — it contradicts 0049's
claim that a primitive "never learns which palette is mounted", because the
palette id would arrive in its props.

**The second is what carries the variables to the DOM.** The obvious answer is
a wrapper element around the root, holding the custom properties in its style.
[`editable.ts`](../src/render/editable.ts) already rejected exactly that shape
for edit-mode attributes, and the reason transfers unchanged: a wrapper changes
what `>`, `:first-child` and `:nth-child` select, so a page laid out correctly
only when it is unthemed is not the page anyone reviewed.

## Decision

**Prop keys beginning with `loom:` are reserved for the runtime.** The renderer
partitions every element's props on that prefix, reads the reserved half itself,
and passes only the remainder to the validator and to the primitive. Exactly one
reserved key exists today — `loom:theme`, honoured on the root node — and a
reserved key nothing reads is dropped with a `reserved-prop-unrecognised`
diagnostic rather than passed on or silently swallowed.

**The theme is mounted by the root primitive, on its own root element.** The
renderer resolves the selection once, flattens it via `themeVariables`, and
hands the result to the root node as `loom.theme` — a `CSSProperties` object the
primitive applies as `style`, the same shape of obligation as `loom.editable`.
No element is added to carry it.

Resolution is total, as the rest of rendering is. A theme the render cannot
mount produces an unstyled page and a diagnostic, never a thrown error or a
blank one: `theme-unresolved` when the registry refuses the selection,
`theme-unregistered` when the tree names a theme and the host wired no registry,
`theme-misplaced` for a selection below the root, where nothing reads it.

**There is no fallback theme.** A host-supplied default would mount a look the
tree does not name, which makes the page a function of deployment config as well
as of the tree — the thing 0049 rejected when it rejected host-supplied theming.

## Consequences

- A primitive can no longer have a prop named `loom:anything`. That is the cost
  of the carve-out, and it is bounded: the prefix is a constant in the runtime,
  so what is stripped does not vary by deployment and the page stays a function
  of the tree alone. `props.ts`'s "the primitive is handed the tree's props
  unchanged" now reads "unchanged, less the runtime's own namespace".
- Reserving a namespace rather than one key means the next runtime-owned prop —
  a locale, an audience marker, a per-node capability — costs a key and a
  diagnostic rather than another record.
- A root primitive that ignores `loom.theme` renders unstyled, and nothing at
  registration time catches it yet. `auditRegistry` probes for `loom.editable`
  only. What does catch it is the standing rule that a ported primitive must
  render under both starter palettes; extending the conformance probe is
  recorded as an open question rather than done here.
- `RenderOutput` now carries the `ResolvedTheme` it mounted, so the portal can
  say which palette a revision was served in without resolving the ids again.
- `ThemeRegistry.resolve` takes `unknown`. The selection arrives from storage
  like the rest of the tree, and the registry's parse is what makes it a
  selection; typing the parameter as one would have been a claim the caller
  could not honestly make.

## Alternatives considered

**A wrapper element at the render root, with `display: contents`.** The most
robust mount — it cannot be dropped by a primitive — and rejected on the
precedent `editable.ts` set. `display: contents` removes the box but not the
node, so descendant and child combinators still see it, and the host's own
`> *` selectors break against a tree that happens to be themed.

**A `<style>` element emitted beside the root, scoped by attribute.** Same
structural objection — it is a sibling node, so `:first-child` moves — and it
needs an attribute on the root element to scope to, which is the very thing a
wrapper was meant to avoid needing.

**Requiring root primitives to declare the theme key in their schema.** Keeps
props honestly the primitive's, and makes theming an opt-in property of whichever
primitive happens to be the root. Re-rooting a tree would then silently unstyle
it, and a primitive would learn which palette it is wearing.

**Stripping the key without a diagnostic when nothing reads it.** Cheaper, and
it makes the reserved namespace a place where data goes missing quietly. Loom
reports what it could not honour; a namespace is not an exception.

**A `defaultTheme` on the render options.** Convenient for a deployment with one
look, and it would mean two trees with identical content render differently
depending on where they are served. Rejected for the reason 0049 gives.
