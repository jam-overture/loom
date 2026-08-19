# 0068. A primitive is a target when the reader aims at the whole of it

**Status:** Accepted
**Date:** 2026-08-19
**Section:** §4b

## Context

[0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
built the declaration and left the library to adopt it, filing the adoption as
a finding for the primitives routine. The finding named four primitives and one
open question, and both halves turned out to be wrong in the same way — they
were answered by reading each primitive's *props* rather than its *rendering*.

The finding's list was `loom.action`, `loom.card`, `loom.feature` and
`loom.logo`, and a later run added `loom.product` on the grounds that it has an
`href` like the others. The question it could not answer was `loom.article`,
whose root is an `<article>` and whose anchor is its title, so it is not a
nested-anchor hazard at all — the note proposed that it might need "a different
word rather than be squeezed into that one".

Both come from the same missing sentence. 0064 states the *mechanism* it is
defending against — HTML forbidding interactive content inside interactive
content — and never states the **test** for whether a given primitive is one.
Applied to a schema, "has an `href`" gets two of the seven answers wrong, and
each wrong answer is expensive in a different direction:

- **`loom.product` declared** would make the Gate refuse this library's own
  intended composition. Its `href` links the *name*, and
  [0066](0066-a-card-is-the-target-when-it-is-read-and-the-control-is-the-target-when-it-is-bought.md)
  puts a real `loom.action` in the region beneath it on purpose. A check that
  refuses the shape the library ships is a check every host turns off, which is
  the failure 0064 called out for the unconditional form and then walked into
  from the other side.
- **`loom.article` left undeclared** loses a real hazard. Its title anchor
  carries a `::after` stretched over the whole card, so a control placed
  underneath is unreachable — no click ever gets to it. The markup is valid,
  the screenshot is correct, and the button does nothing. That is precisely the
  failure 0064 exists to catch, arriving by a mechanism 0064 did not name.

The word "target" was doing the work and nobody had defined it.

## Decision

**A primitive declares itself interactive when the thing a reader aims at
covers the whole node. How it covers it does not matter.**

Two ways to cover a node, and they are equivalent for this purpose:

1. **The root is the anchor.** `loom.action` always; `loom.card`,
   `loom.feature` and `loom.logo` when the tree gives them an `href`.
2. **An overlay spans the node.** `loom.article`, whose title anchor stretches
   a `::after` across the card, when the tree gives it an `href`.

And one way that is not covering it:

3. **A control inside the node's surface.** `loom.product`, which links its
   name and leaves the rest of the card free — the composition 0066 requires.
   Undeclared.

So the starter library's declarations are:

```ts
loom.action   "always"
loom.link     "always"
loom.card     { whenProps: ["href"] }
loom.feature  { whenProps: ["href"] }
loom.logo     { whenProps: ["href"] }
loom.article  { whenProps: ["href"] }
loom.product  —
```

Containers declare nothing. `loom.nav`, `loom.footer`, `loom.link-list` and
every `-grid` arrange targets and are not one.

**The test to apply to the next primitive is a question about the rendering, not
about the schema:** *is there anywhere inside this node a reader could put a
second control and have it work?* If the answer is no, it is a target.

## Consequences

- **`loom.article` needs no new vocabulary**, which is what the open question
  was really asking. The overlay case and the nested-anchor case differ in
  mechanism and agree in consequence, and 0064's declaration is about the
  consequence. A second field would have been a second thing for every future
  primitive author to get wrong.
- **The Gate's refusal reason is a shade imprecise for the overlay case.** It
  will say a target was placed inside a target, which is true of the reader's
  aim and not of the markup. The verdict is right, and the wording is the
  framework routine's to sharpen if it ever confuses anyone. Filed rather than
  fixed here, because `src/runtime/` is not this lane.
- **A declaration can still be a lie, and now in one more way.** 0064 already
  noted that nothing checks a component really emits an anchor. Nothing checks
  it really emits an overlay either, and `loom.article`'s is a class the
  stylesheet acts on — a refactor that dropped `loom-cover-link` would make the
  declaration false with no test failing. The library's test asserts the
  declaration list itself, which catches a primitive that grows an `href` and
  forgets to say so; it cannot catch the reverse.
- **Every deployment that calls `interactiveTypesFor` now gets a live check.**
  Until this record the starter library declared nothing, so 0064 refused
  nothing anywhere. It is still opt-in — a host that declares no vocabulary is
  unchanged — but the vocabulary now exists to opt into.

## Alternatives considered

**A second declaration for the overlay case** — the "different word" the
finding proposed. Rejected: it splits one fact about the reader into two facts
about implementation, and a host writing a Gate policy would have to know that
both mean "do not put a control in here". The mechanism belongs in the
primitive's doc comment, which is where it now is.

**Declare `loom.product` and give it an exemption for its own `action`
region.** This is the parentage claim 0054 rejected, arriving as an exception
list. It would also be a lie about the node: the surface of a product card
genuinely is free, and a `loom.action` a tree puts in the body of one works
exactly as it looks.

**Declare nothing until the framework can verify a declaration.** Rejected for
0064's own reason: the check being partly unverifiable is not a reason to have
no check, and the verifiable half — that a named prop exists — is the half that
catches the drift that actually happens.
