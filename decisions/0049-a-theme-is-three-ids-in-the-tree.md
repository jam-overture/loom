# 0049. A theme is three registered ids, carried in the tree

**Status:** Accepted
**Date:** 2026-08-10
**Section:** §4b → §1, §3

## Context

Sections 1–6 are functional end to end and the registry is empty. §4 built the
contract a primitive registers under; it never built a vocabulary to register.
The Hermes predecessor has one — 70 block definitions with 72 React renderers,
54 shapes, 18 layouts, and a theme system of 29 palettes, 22 font packs and 10
style presets — and porting it is the work that turns an architecture into
something a person can look at.

The port cannot start with the primitives. Hermes renderers read their colour,
type and spacing from `--loom-*` custom properties produced by its weft applier
from a palette, a font pack and a style preset. Loom has no equivalent: a grep
for `cssVariable`, `--loom-`, `palette` and `fontPack` across `src/` returns
nothing. Ported as-is, all 72 render unstyled. So the first question is not
which primitives to port but **where a theme lives**, and that question reaches
into §1.

## Decision

A theme is **three registered ids** — a palette, a font pack, a style preset —
and they are carried **as props on the tree's root node**, resolved through a
theme registry at render time and flattened into CSS custom properties mounted
at the render root.

Three consequences follow from where they sit, and they are the point:

- Changing the theme is a `configure` operation on one node. It is therefore
  inspectable, gateable, attributable and reversible by exactly the machinery
  §1 and §2 already built, with no new path and no schema change.
- What a model may choose from is bounded by the registry, the same bargain
  0013 makes for primitives. A proposal names `"bold"`; it cannot invent
  seventeen colours.
- A primitive reads `var(--loom-accent)` and never learns which palette is
  mounted, so re-theming a tree changes no primitive and touches no node below
  the root.

## Consequences

- "Make it warmer" is an ordinary `EditIntent`, and the Gate weighs a re-theme
  the way it weighs anything else. A host that considers its palette
  consequential declares it a protected prop key and gets confirmation for free.
- Three ids rather than three documents keeps the reply schema small, which
  matters against 0014's compiled-grammar budget — the schema already sits near
  its 3500-byte guard.
- Every palette must declare **every** slot. Normalising costs a little at
  authoring time and buys interchangeability: there is no slot a primitive might
  read that some palette leaves undefined, so any tree can wear any palette.
- Loom does not fetch fonts. Hermes emitted a Google Fonts URL from its applier,
  which put a network dependency inside a pure function; here families declare
  their own fallback stacks and a host that wants a webfont links it.
- The theme registry is a second registry with the same shape as the primitive
  one, not a special case inside it. Colour, type and shape vary independently
  from what a page is made of, and a host swapping to a dark palette should not
  restate its component vocabulary.
- **What this does not yet do:** nothing mounts the variables. The render root
  has to emit them, and that is §3 work this record authorises but does not
  perform.

## Alternatives considered

**A new `theme` field on `LoomTree`.** Conceptually tidier, and rejected on the
thesis. It is an ARCHITECTURAL change — schema plus migration — and worse, it
puts the theme *outside* the delta model. A second channel for changing what a
user sees, ungoverned by the Gate, is precisely what §1 exists to prevent. That
the tidier option is the one that breaks the guarantee is worth remembering.

**Host supplies the theme at render time, outside the tree.** Simplest of the
three, and it makes theming the one thing AI cannot adapt. Re-theming is among
the most common things anyone asks for; conceding it would concede much of the
product.

**Raw palette values in root props.** Keeps everything in the tree without a
registry, and unbounds the value space in the one place the system exists to
bound it. A model would emit hex nobody approved, and "is this change allowed?"
would become a question about colour theory.

**One registry for primitives and themes together.** Fewer moving parts, and it
conflates two vocabularies that a host will version and review separately.
