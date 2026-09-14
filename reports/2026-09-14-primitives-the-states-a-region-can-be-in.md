# The states a region with nothing in it can be in

**Routine:** `Loom primitives` · **Date:** 2026-09-14 · **Branch:**
`primitives-33-the-states-a-region-can-be-in` · **Section:** §4b

## What this run built, and why it was the one thing that could be built

`loom.placeholder`. The library is **94**.

It is the only work available today that is not waiting on something. #298 —
which narrows the package's exported surface and is what makes compositions
cheap — is open, and until it lands `main` has 222 characters of docs-index
headroom, which is one more band. **Primitives do not pay that toll**:
`src/primitives/index.ts` exports none of them by name, so a ninety-fourth costs
the index nothing. That asymmetry is exactly what
[0155](../decisions/0155-the-catalogues-public-surface-is-the-list-and-the-lookup-not-every-band-by-name.md)
records, and today it decided what to work on.

## The gap, and why it arrived with the binding seam

For ninety-three primitives every list on a Loom page was authored, so a list
with no children was a page somebody had not finished writing. Bindings changed
that: [0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
lets a region ask a question answered from a source, and **a source can
legitimately have nothing to say.** A page whose three services come from a
database has a real, correct, shipped state in which that band is empty — and
nothing in the library could draw it, so every surface was going to invent its
own "no results yet".

## Two states, because 0058 says collapsing them is the mistake

That record is unusually direct, and it is the whole of the design:

> **An answer is `ready` or `unavailable` with a reason — never merely absent.**
> […] a source with nothing to report answers `ready` with an empty list.
> Collapsing those two is the mistake.

So `state` is **required with no default** — the one deliberate friction in the
schema, because the two members mean opposite things to a visitor and a guess is
worse than a refusal. A test asserts a placeholder that will not say which
nothing it is produces a diagnostic.

| | `empty` | `unavailable` |
| --- | --- | --- |
| what happened | the source answered, with nothing | the source could not answer |
| does a visitor wait? | no — the page is finished | yes — it is probably temporary |
| element | an ordinary box | `role="status"`, announced politely |
| edge | dashed — a space to be filled | solid — a panel reporting something |

The accessibility half is the part worth arguing for: a reader who is not
looking at that region is told when it **failed**, and is not told when it is
merely empty, because "you have nothing yet" is not an event. A screen reader
gets the same two-way distinction the props make.

**There is no `waiting`.** A binding is answered *before the walk* — that is
0058's title — so a rendered tree never contains a region still waiting for its
data, and a loading state would be vocabulary no page could reach. Refused
rather than shipped unreachable.

## Why it is not a `loom.callout`

A callout is an `<aside>`: content *beside* the argument. A placeholder is not
beside anything — it stands **in the place of** what the region was going to
hold, and is the only thing in it. As an aside, a page's empty services band
would enter the document outline as a digression from itself.

## The correction this run had to make to its own inventory

`docs/primitive-gap-inventory.md` counted "a consent checkbox / a radio group"
as **one enum widening — two strings, not two files.** That was written on
13 September and half of it is wrong. Both were added, and:

- **`checkbox` renders.** `loom.field` falls through to `<input type={type}>`.
  (Its label wants to sit beside the box rather than above it, which is a layout
  change the field has not had.)
- **`radio` does not.** A radio group is one input **per choice**, and the
  choices are `loom.option` children that render themselves. An `<option>`
  inside a `<select>` *is* what an option is, so `select` works; a radio group
  needs each option to render as an input and a label, and **no node can know it
  is inside a radio group** (0008). It is the wall `loom.stat-chart` met over its
  scale — and CSS cannot carry this one, because an element's *tag* is not a
  custom property.

So the widening was **reverted rather than half-shipped**, and the inventory now
carries the correction inline. A lone `<input type="radio">` that silently
ignored its four choices would have passed every test in this repository.

## Which Hermes fields became nodes

None. There is no Hermes block for *a region with nothing in it* — Hermes pages
were authored end to end, so the state could not arise. `title` and `body` are
fixed fields and stay props (0052); the one thing to do about it is a node, in
the `action` region, because a page may want no action, one, or a different one.

## What a screenshot caught

The action button sat against the left edge while the title and body centred:
the region the seam hands back is a block that takes the full width, so
`align-items: center` on the parent never reached the button inside it. Centring
the *wrapper* is the fix, and it is in the file's comment.

## What the library still cannot express

Unchanged, plus the `radio` design question above, which is new and is real.

## Findings filed

None new. The lesson-count finding fired for the **fourth** time today —
93 to 94 across three lessons — which is now the strongest evidence in it.
