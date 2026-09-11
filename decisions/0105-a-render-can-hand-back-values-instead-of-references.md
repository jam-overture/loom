# 0105 — A render can hand back values instead of references

**Status:** Accepted
**Date:** 2026-09-02
**Section:** §3 — Rendering

## Context

Two decisions meet in every Loom page and neither is negotiable on its own.

[0008](0008-the-renderer-is-a-total-pure-projection.md) makes the renderer a
total pure projection into React: a walk produces elements, and the one consumer
is a browser. [0050](0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
mounts the theme once, on the root, as CSS custom properties, and a primitive
paints itself by *naming* one — `loom.section` emits `var(--loom-bg-surface)` and
never learns which palette answered it. That is what makes a re-theme one
`configure` on the root and nothing else ([0049](0049-a-theme-is-three-ids-in-the-tree.md)),
and it is the property the whole library is written against.

Together they assume a cascade. Something eventually has to render where there is
none:

- **An image renderer** takes inline styles and literal values. It resolves no
  custom properties, so a projection whose every colour is a `var()` comes out a
  blank rectangle.
- **An email body** is the same problem with a different renderer.
- Anything else that has to show a page where a browser is not.

`Loom marketing` hit it first. The marketing site draws a share card for every
address a visitor can send somebody, and it is the only file on that surface that
is not a Loom tree — not for want of trying, because there is no arrangement of
the seam by which a registered primitive can draw one pixel of it. That lane
filed the hand-drawn copy of a page as a finding on 29 August, recommended this
change over a second projection target, and said to make it when something wanted
it. The share card is a thing that wants it; a second medium is coming for every
surface after it.

## Decision

**A render may be asked for the theme's values rather than its references:
`renderLoomTree(tree, { themeValues: "literals" })`, and the same option on
`renderRequest`.** The default is `"variables"` and nothing about a browser
render changes.

In that mode, every `var(--loom-…)` in an inline style is replaced by what the
mounted theme says it is — the substitution a browser would have done, done
before the page leaves the renderer. Nothing about any primitive changes and
nothing about the tree changes: a primitive still names a slot, and the mode is a
property of the request rather than of the deployment, so one route serves a page
and the next draws the same tree into an image off the same registry.

**It happens one node in, at each primitive's own output, and that is forced.**
The projection is a tree of *component* elements: what a primitive paints does
not exist until something renders it, so a pass over what `renderLoomTree`
returns sees `<loom.card>` and no styles at all. The seam therefore stands a
substituting component in front of each node's primitive, calls it, and resolves
what it produced — stopping at the child elements, which are the next nodes'
stand-ins and resolve their own output when they are rendered. Every node pays
for itself and nothing is walked twice.

Calling the primitive rather than mounting it is what keeps this one element per
node instead of two, and it is sound for exactly the reason 0008 gives: a
primitive is a pure function of the props the seam hands it and holds no state.
A primitive that broke that would already have broken rendering the same tree
twice. A class component cannot be called, so it is mounted as it always was and
keeps its references; nothing in this package is one.

**Three things this does not reach**, all the same shape — it resolves the values
a render *produced*, and does not run the parts of CSS that are not values:

| | |
| --- | --- |
| The library stylesheet | `:hover`, `:last-child`, keyframes, `::after` — the five things that cannot be said inline. No renderer without a cascade evaluates them either. |
| Inside a control | A behaviour's control renders on the client, so its subtree does not exist yet. Its own `style` prop is resolved; what it returns is not there to walk. |
| An unanswered property | A reference the theme does not declare and that named no fallback is left exactly as the primitive wrote it, which is what a browser does with it too. Nothing here invents a value. |

A render asked for values with **no theme mounted** says so in a diagnostic
(`theme-values-unmounted`) rather than quietly handing back a page of
references. Who asks is the reason: a caller wants values when whatever it is
feeding cannot resolve a reference, and in that medium nothing downstream would
notice they never arrived.

## Consequences

- A real tree of registered primitives can be rendered into a medium with no
  cascade, which is the first time 0008's projection has been true anywhere but a
  browser. The share card, the OG image and the email body stop being
  hand-drawn copies of a page.
- 0049's guarantee is untouched, and is now checked in a second place: the tests
  render one tree under two palettes with values inlined and get two different
  pages, which is the same assertion every ported primitive already has to pass.
- The substitution is a public seam of its own (`substituteVariables`,
  `inlineThemeVariables`), so a surface holding an element tree it built itself
  can resolve it without going through a render.
- One thing a host can now do wrong: ask for values, get a page whose stylesheet
  rules were never going to arrive, and conclude the mode is broken. The limits
  are in the module's own documentation and in the table above, and the failure
  is visible rather than silent — what is missing is hover states and last-child
  rules, not colour.
- `asCallablePrimitive` moved from `sdk/conformance.ts` to `render/primitive.ts`,
  beside the type it is about. Two things in this package now call a primitive
  rather than mounting one, and both decline a class the same way.

## Alternatives considered

**A pass over what `renderLoomTree` returns.** The obvious shape, built first,
and it silently does nothing: the projection is component elements, and their
styles do not exist until React renders them. Worth recording because it looks
right, tests green against hand-built element trees, and fails only against a
real tree.

**Move the primitives' styles into the library stylesheet.** Cleanest-sounding
and the wrong shape. The render seam must not depend on `src/primitives/`, and a
control that only looks right under a mounted stylesheet renders invisible in a
preview pane that mounts none. It also does not help: a medium with no cascade
cannot read a stylesheet either.

**A second projection target** — the walk producing something other than React.
The architectural version, and much the largest. It is the right answer if Loom
ever needs a medium React cannot describe at all; it is not the answer to a
share card. Worth a record if it is ever wanted.

**Report every unanswered property as a diagnostic.** Wanted, and not reachable:
the substitution happens while React renders, and `renderLoomTree` has returned
its diagnostics by then. The one case that *is* knowable synchronously — asked
for values, no theme mounted — is the one that is reported. `inlineThemeVariables`
returns the unanswered names to a caller driving it directly.
