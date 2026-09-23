# 0184 — A primitive may read under whichever name a prop gives, and says so as a declaration rather than a name

**Status:** Accepted
**Date:** 2026-09-23
**Section:** §2 — the data seam, reaching the catalogue, the interpreter's prompt and the render walk

## Context

[0181](0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md)
gave a primitive `reads`: a fixed list of the binding names it looks its
answers up under, so a model can be told the names and the walk can report a
tree that asked under one the primitive never reads.

It shipped and nothing declared. That was expected — the declaring half is
`Loom primitives`' — but reading the two primitives that would declare first
showed why they could not:

| primitive | what it reads | a fixed list can say |
| --- | --- | --- |
| `loom.feed` | `loom.data[binding ?? "entries"]` | nothing honest |
| `loom.tally` | `loom.data[binding ?? "value"]` | nothing honest |

Both take the name from an **optional prop** with a default. A fixed list would
have to write the default and then be wrong about every node that set the prop:
a `loom.feed` reading `rows` and answered under `rows` would be reported as a
binding nobody reads, and — the worse direction — a node answered under
`entries` while its prop said `rows` would pass the check while drawing an
empty region for ever.

0181 saw the shape and put it in the *rejected* column of another alternative:
inferring names from the component was rejected partly because *"the one thing
it certainly cannot see is a key computed from a prop."* What it did not do was
give the author a way to say it.

## Decision

### 1. An entry in `reads` is a name or a prop that gives one

```ts
type BindingDeclaration =
  | string
  | { readonly fromProp: string; readonly default: string }
```

`reads: [{ fromProp: "binding", default: "entries" }]` says *this primitive
reads one binding, under whichever name the `binding` prop gives, and under
`entries` when it gives none.*

It is a list of declarations, not a second field beside `reads`, so a primitive
that reads one fixed binding and one prop-named one declares both in one place
and every consumer walks one list.

**0181's decision 1 widens; nothing in it is reversed.** `reads: ["entries"]`
means exactly what it meant, is still checked exactly as it was, and no
declaration written against 0181 changes meaning. Decisions 2 through 5 —
absence against emptiness, the catalogue projection, the `data-unread`
diagnostic, the structural reader — stand as written.

### 2. The walk resolves the declaration against the node's own props

`unreadBindings` takes the node's props alongside the declaration, because a
prop-named entry means something different on every node carrying it. A
declaration that is not a string resolves to the prop's value when that is a
non-empty string, and to the default otherwise.

The fallback is deliberately wider than "absent". A prop whose value is not a
string cannot reach a rendered node — props are validated before the walk asks
for data — and guarding it here costs one comparison and removes the need for
anything later to keep that true.

The seam answers the **declaration** rather than the names. `bindingsReadBy` is
asked about a *type* and half of an answer is a question about a *node*, so the
registry cannot resolve it and does not pretend to; the walk holds both halves,
which is where the resolution belongs and is the same reasoning that put
`data-unresolved` in the walk rather than in the resolution.

### 3. The prop half is checked against the schema, and the name half against the grammar

0181 noted that `reads` had no second list to drift against — a binding name is
not a prop name, so nothing could be renamed out from under it. The prop-named
form brings exactly that, so it is checked exactly as `frames` and `copy` are:
a `fromProp` the props schema does not declare is refused, with a new
`undeclared-reads-prop`. The `default` goes through `bindingNameSchema` like
any other declared name, reusing `invalid-binding-name`.

Two things are **not** checked, and both are stated rather than implied:

- **That the named prop holds a string.** The catalogue keeps a prop's name and
  whether it is required and deliberately not its type (0009), so this is not
  knowable at registration. It is not silently assumed either: the walk's
  fallback is what makes a non-string harmless.
- **That the component actually looks under that name.** That needs the
  component called, which is the audit's job and not the registry's — the same
  line `registeredBehaviours` already draws.

A schema whose keys cannot be enumerated at all — a union of shapes — allows
the declaration, which is the answer `undeclaredCopyProp` already gives: a list
that was never built is not evidence of a mistake.

### 4. The catalogue carries the form out, and the model is told how to read it

`CataloguedPrimitive.reads` carries declarations rather than flattened names,
and the catalogue line a model reads writes the prop-named form out:

| declared | the line says |
| --- | --- |
| `["entries"]` | ` reads: entries` |
| `[{ fromProp: "binding", default: "entries" }]` | ` reads: the name in "binding" (default entries)` |
| `[]` | ` reads: none` |
| nothing | *(no clause)* |

Flattening to the default would have been cheaper and is the one thing that
would make the clause actively misleading. A model shown `reads: entries` can
bind one thing correctly and has no way to bind a second, because the prop is
the whole mechanism by which two bindings on one primitive get different names.
The data block gains one sentence saying how to act on it: bind under the
default and leave the prop off, or set the prop and bind under the same name.

## Consequences

- **The two primitives that read a binding can now declare**, which is what
  0181 shipped for and what has been waiting since. It is `Loom primitives`'
  edit and is filed for them, naming the two lines.
- **Additive in the strict sense.** No existing declaration changes meaning, no
  prompt changes for a deployment that declares nothing, and the diagnostic
  list for every tree in the repository is byte-identical.
- **The refusal half is now worth building.** The 22 September finding asked
  that a binding name nothing reads be refused at the write path rather than
  reported at render, and said it belonged in the same run as the second or
  third declaration rather than the tenth. `0179`'s route is on `main` now, and
  the first declarations are one `Loom primitives` edit away, so the next
  framework unit is that factor.
- **A host implementing `PrimitiveResolver` by hand still gets nothing**, the
  same deal every declaration seam makes.

## Alternatives considered

**Replace the list with the prop-named form entirely.** A primitive with fixed
names would declare `{ name: "entries" }` and there would be one shape rather
than two. Rejected: it makes the common case — a primitive that reads one fixed
name — pay for the rare one in every declaration and in every reading of one,
and a union of a string and an object is a shape TypeScript narrows in one
`typeof` and a reader recognises without being told. One mechanism is worth
paying for when the two shapes would otherwise diverge downstream; here they
converge on one resolved name before anything acts on them.

**A second field, `readsFromProp`, beside `reads`.** Rejected: two fields is two
lists for every consumer to walk and two chances to handle one and forget the
other, for no gain over one list with two member shapes.

**Resolve the declaration in the registry, so `bindingsReadBy` keeps returning
names.** It would have left `unreadBindings` and the seam untouched. Rejected:
the registry is asked about a type and would have to be handed a node's props
to answer, which is a seam that takes an argument it has no business knowing
about. The walk already holds the node.

**Make the prop required, so there is no default to declare.** A node would
always say which name it binds under and the declaration would be just the prop
name. Rejected: it changes two primitives' props for the convenience of a
declaration, and it makes the simplest possible use — bind one thing to a feed
— cost a prop the author would otherwise never write.

**Let the default be absent, meaning *this primitive reads nothing unless the
prop is set*.** Rejected: nothing in the library works that way, and an absent
default would resolve to no name at all, which is indistinguishable at the walk
from a primitive that declared `[]` — a third answer collapsing into the second
is exactly what 0181's decision 2 exists to prevent.

**Check that the named prop is a string prop.** Rejected: the catalogue does not
carry prop types and adding them for one check is the structural-description-of-
arbitrary-Zod cost the catalogue was designed to avoid (0009). The walk's
fallback makes the unchecked case harmless rather than undefined.
