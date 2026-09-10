# 0122. A primitive says which of its props a reader reads, and empty is not silence

**Status:** Accepted
**Date:** 2026-09-10
**Section:** §1

## Context

Two lanes filed the same gap on 10 September, from opposite ends of it.

`Loom demo`, building a preview of the node a proposal is about:

> Nothing can answer "what words does this node show?" A node's visible copy is
> split between text children and props, and which props are copy is known only
> to the component.

`Loom demo` again, reading the portal's review queue, filed for `Loom portal`:

> `textIn` misses copy that lives in props, which is most of it. […] So a
> proposal to delete the clinic's three headline numbers reports *no words at
> all*, and the reviewer sees `3 pieces` where the page says *"3,400 ·
> appointments last year"*.

That is a reviewer approving a deletion against a description of it that omits
what is being deleted, and it is not a defect in `textIn`. `textOf` walks text
children and is right to. The reason most copy is not in a text child is
[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md): a fixed
field stays a prop and only repeated content earns a node. `loom.stat` holds its
figure, its label and its caption as props; `loom.quote` holds the quote, the
author and the role as props. That rule is the library's direction, so the gap
widens with every primitive rather than narrowing.

Which props are words is knowable by exactly one party. `loom.stat`'s `value`,
`label` and `caption` are read; `loom.hero`'s `backdrop`, `align` and `stature`
are not; all six are strings in the same shape of JSON. The schema types both the
same. `description` is one line of prose written for a model. There is nothing
else to ask, so every consumer either renders the subtree and reads the markup
back, or guesses — and both surfaces here guessed, in the same direction, quietly.

## Decision

**A primitive may declare `copy`: the props whose values a reader reads as words.
`copyIn` reads a node against those declarations, and reports what it could not
classify rather than under-reporting it.**

```ts
definePrimitive({ type: "loom.stat", copy: ["value", "label", "caption"], /* … */ })

copyIn(node, registry)
// → { words: ["3,400", "appointments", "last year"], unread: [] }
```

Four things bound it.

**Empty and absent are different answers.** `copy: []` says *this primitive shows
no words of its own* and is believed. Leaving `copy` out says *nobody has said*,
and every string-valued prop on such a node comes back in `unread`, named. There
is deliberately no default: a default would collapse the two, and the collapse is
the failure — a reading that returns nothing for a stat is indistinguishable from
a stat that says nothing, which is how the portal's queue got here. It is the
bargain `RegistryPairings.unprobedProps` already makes, one declaration along.

**A declaration is trusted about its exclusions too.** A primitive that declares
`["headline"]` and also holds `backdrop` has said `backdrop` is not copy, and
`unread` stays empty for it. Only silence is reported. Anything else would make
declaring worse than not declaring.

**A non-string value is skipped, never coerced.** A component renders `3400` as
*3,400* and owns that formatting; the runtime knows the number and not the
separator. `String(value)` would put a figure on a reviewer's screen that the
page does not show. A missing word is a gap and a wrong one is a lie, and this
seam exists because somebody is approving a change against what it says.

**A drifted declaration is refused at registration.** `undeclared-copy-prop`,
beside `undeclared-frame-prop` and `undeclared-interactive-prop`. Less rides on
this one — a drifted copy prop makes a preview quieter than the page, where a
drifted frame prop makes a security allowlist stop applying — but the failure has
the same shape: a prop renamed, a declaration left pointing at nothing, and no
way to see it from outside.

## Consequences

- **Nothing in the runtime reads it.** It changes no render, no validation and no
  Gate judgement, the same as `role` (0114) and `submits` (0065). It is a fact
  carried from the author who knows it to the consumer who needs it.
- **Nothing declares it yet, so `copyIn` currently answers `unread` for the whole
  starter library.** That is the honest answer and not a failure — nobody has
  said. `src/primitives/` is `Loom primitives`' lane and declaring `copy` across
  it is that routine's call and timing; filed for them.
- **A consumer gets a worse answer before it gets a better one.** A surface that
  switches from `textOf` to `copyIn` today reads the same text children plus a
  list of props nobody classified. What it gains immediately is *knowing* that
  the list exists, which is the thing neither surface could see.
- **The catalogue does not carry it.** The catalogue is what a model reads to
  choose a primitive, and nothing filed asks a model to know which prop is copy.
  Same reasoning as 0114, same door left open if a model ever needs it.
- **`PrimitiveRegistry` gained `copyFor`.** It is a returned type rather than one
  hosts implement, so it breaks nobody; and `CopyDeclarations` is a two-line
  structural interface, so a caller with a table and no registry can satisfy it.

## Alternatives considered

- **Rendering the node and reading the markup back.** The demo's own finding
  raises it — *it may well be that rendering is the answer* — and 0121 makes it
  possible. Rejected: it needs a DOM, a render pass and a string parse to recover
  something the tree already holds; it cannot run where the callers are asking
  from, which is a proposal nobody has approved and a queue row on a server; and
  it returns the component's chrome — labels, units, a *Read more* — mixed into
  the words the tree actually says, with no way to tell them apart.
- **Inferring copy from the schema.** Every `z.string()` that is not an enum, a
  URL or a token. It would be right for `loom.stat` and wrong for `loom.hero`'s
  `backdrop`, which is a path, and for every `id`, `href` and `name` in the
  library — and it would be *silently* wrong, which is what we already have.
- **A `PrimitiveText`-shaped declaration, keyed by purpose.** `{ heading:
  "value", detail: "label" }`, so a consumer could ask for the leading word
  rather than all of them. A better answer to a question nobody has asked; the
  two filings both want *the words*, in order. A list can grow into a map later
  without a consumer changing what it asks.
- **Widening `textOf` to take a registry.** Fewer concepts, and it would have
  made a pure tree function depend on a deployment's registry — `tree/` knows
  nothing about `sdk/` and the direction of that arrow is worth more than the
  saved export. `copyIn` sits in `sdk/`, where the declarations are.
- **One-file-per-consumer helpers, as today.** The status quo: the portal has
  `textIn`, the demo has `in-question.ts`, and the next surface writes a third.
  Rejected because all three are the same guess and none of them can tell it is
  guessing.
