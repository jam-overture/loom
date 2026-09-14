# 0155. A container may only add to its children what they left unspoken, so a shared treatment lives in a class and never on the element

**Status:** Accepted
**Date:** 2026-09-14
**Section:** §4b

> **Why this number.** The highest record on `main` is `0145`, and `0146`–`0154`
> are left free deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. Three lanes have branches open that can each claim
> the next free number without seeing the others; a clash is fatal to every
> lane's `pnpm verify` and a hole costs one line in the index. `0150` is already
> claimed by an open branch of this lane, which is the clash this gap exists to
> avoid.
>
> **Why `Accepted`.** It names a constraint the library has been under since its
> first stylesheet and states what to do about it. It refines no `Accepted`
> record, changes no schema, and touches neither the tree nor the delta model —
> it is `stylesheet.ts`'s first documented trap promoted from a warning about
> one primitive into a rule about every container.

## Context

`stylesheet.ts` has carried this warning since 22 August, in its list of
mechanics to know before writing a rule:

> **An inline style beats a rule here**, always. A primitive that sets a
> property inline has made that property unreachable from this file, so a value
> the stylesheet needs to vary — `loom.milestone`'s bottom gap — must not also be
> set on the element.

It was written for one primitive varying **its own** value from its own
stylesheet, and it was discovered the way these are usually discovered: a rule
that silently did nothing. `loom.nav` hit the same wall twice — the menu's
`display` had to leave the file before a media query could hide it, and the
disclosure control's `display: inline-flex` is an inline style that no rule can
reach, which is why the control is wrapped in a box this library owns.

**Building `loom.link-pager` turned the warning into a general constraint**,
because it is the first primitive whose whole job is to restyle *somebody
else's* element.

A page number is a `loom.link` — [0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md)
allows nothing else, and a second primitive for it would be `loom.link` with a
container's name on it. So the tile a reader taps has to be drawn by the
container onto a child it did not render and cannot configure. Every property
the tile needs falls into one of two sets:

| reachable from `.loom-pager .loom-link` | set inline by `loom.link`, unreachable |
| --- | --- |
| `background`, `border`, `border-radius` | `color`, `font-size`, `font-weight` |
| `min-width`, `text-align`, `padding-inline` | `display`, `line-height`, `padding-block-end` |

The first column is what the child left unspoken. The second is what it said,
and a container that needs anything in it is not blocked by a missing feature —
it is blocked by a decision another file made for a different reason, with
nothing anywhere saying that the decision was load-bearing.

The failure mode is the one that matters. A container writing a rule against a
property its child sets inline does not error, does not warn, and does not fail
a test. It renders a page that is *almost* right — here, a page number with a
box drawn tight around the text and a 24px hit area a thumb misses — and the
only instrument that catches it is a person looking at a photograph of the one
page that uses the container.

## Decision

**A property a container may need to vary belongs in the child's class, not on
the child's element.**

Concretely, and applying to every container primitive in this library:

- **A child's own presentational defaults go in a rule scoped to a class the
  child carries.** `loom.link` now emits `class="loom-link loom-underline"` and
  its two pixels of block padding are `.loom-link { padding-block-end: 2px }`.
  Nothing about the rendering changed; what changed is that
  `.loom-pager .loom-link` can now win with ordinary specificity.
- **A container styles its children only through a class it puts on itself**,
  never by reaching for element selectors. `.loom-pager .loom-link` reaches the
  pager's links; `a { … }` would reach the host's whole page, which is the
  scoping rule `stylesheet.ts` already states.
- **A container that finds it needs a property its child sets inline moves that
  property, in the same change, and says so where it moves it from.** It does
  not work around it with a wrapper element, and it does not give the child a
  prop.
- **What stays inline is what varies by prop.** `loom.link`'s `color` and
  `font-weight` are computed from `tone`, `scale` and `current`, so no rule
  could hold them anyway; `loom.link-list`'s alignment stays inline for the same
  reason, which `loom.nav` records for its own menu.

The rule has a natural test attached, and it is asserted rather than trusted:
the pager's test reads the stylesheet for the `.loom-link` rule *and* asserts
the property is absent from the markup. A link that took its padding back inline
would leave the pager's rule quietly doing nothing, and that assertion is the
only thing that would notice.

## Consequences

- **The library has a stated ceiling on what a container can do**, where before
  it had a per-primitive surprise. A run proposing a container now knows to read
  its intended child's inline styles first, and knows the remedy when the answer
  is wrong.
- **Two motion rules the tile needed came free.** `transition` and the
  reduced-motion switch-off both live in the same rules, which is where 0055
  puts motion regardless.
- **It is a reason to keep a child's inline style list short**, and that is a
  change in emphasis rather than a new rule. Every property a primitive sets
  inline is a property no future container can vary, and the cost is paid by
  somebody who has not been hired yet.
- **It does not make a child's rendering the container's business.** A pager
  draws a tile around a link; it does not decide what the link *says*, where it
  points, or whether it is the current page. Those are the child's props and the
  child's content, and 0052's line between them is untouched.

## Alternatives considered

**A `shape: "text" | "tile"` prop on `loom.link`.** One line, and it would have
worked. Rejected because the tile is the *pager's* treatment of its children and
not a thing a link is: a tree could then put tiles in a footer, and — worse —
put plain text links inside a pager, so the primitive's own appearance would
depend on a prop it does not control. It also spends a member of the grammar
budget ([0014](0014-the-reply-schema-must-fit-a-grammar-budget.md)) on every
link in the library to serve one band.

**A wrapper element per child, drawn by the container.** The `loom.nav` remedy,
and it does not reach: a container receives its children as one rendered
`ReactNode` and cannot wrap them individually without cloning elements the
render seam owns. That is the seam's shape and not this lane's to change.

**Leaving the padding inline and accepting a 24px tile.** Rejected on the
maintainer's standing quality bar rather than on principle — a pager whose
numbers are too small to hit with a thumb is the first thing anyone notices on a
phone, and the fix costs one moved declaration.

**A second, pager-specific link primitive.** Rejected by 0054 and by
[0061](0061-a-suffix-that-names-the-markup-earns-its-place.md) together: the
suffix would name where the primitive sits rather than what it emits, which is
exactly the filler 0061 keeps banned.
