# 0114. A primitive declares what part it plays, and the registry is what gets asked

**Status:** Accepted
**Date:** 2026-09-07
**Section:** §1

## Context

`Loom portal` built a page name on 6 September. A tree has no name — the schema
carries an id, a revision and a root, and nothing a person chose — so the name is
derived from what the page already says about itself: the first heading in
reading order, its text, tidied. That derivation is sound and is not what this
record is about.

It needed one constant, and the constant is the finding:

```ts
const TITLE_TYPES: readonly string[] = ["loom.heading"]
```

The portal is entitled to that array. It registers four primitives and knows
which of them is a heading. **A host that registered `acme.hero` is not**, and it
would write the same array with its own type in it — and get it wrong the day
somebody registers a second heading primitive, because there was nothing in the
registry to ask instead.

A registry could already answer what exists, what each primitive accepts, what
each projects, whether one is a target, whether one posts, and which of its props
reach a frame. What it could not answer was anything *about* a primitive beyond
its identifier. So a consumer wanting a semantic fact had exactly one move:
pattern-match on the type string. `description` is prose written for a model and
cannot be matched on; a type is an identifier, and an identifier is not a
category.

The portal is Loom's own consumer, and whatever it has to hard-code is what every
other host will hard-code. This one is small and completely typical.

## Decision

**A primitive may declare a `role`, from a closed vocabulary, and a registry
answers which types declared each one.**

```ts
definePrimitive({ type: "acme.hero", role: "heading", /* … */ })

registry.typesWithRole("heading") // ["acme.hero"]
```

Four things bound it.

**The vocabulary is closed, and it has one member.** `heading` is what was asked
for, by the one consumer that filed for it. A page root, a body text and a byline
were all considered and left out: each was derived from what the portal happens
to register rather than from a consumer that could not answer its question, and a
vocabulary invented ahead of its readers is wrong in a way nobody can measure.
The bar for a second member is the bar this one cleared — a consumer that cannot
answer its question from the registry, written down as a finding.

**A role is not a boolean.** `submits` is a boolean because a primitive either
posts or does not and there is no second question of that shape. This is the
opposite: the categorical question a host asks is one of a family, and the
members arrive one filed consumer at a time. A boolean per member — `isHeading`,
`isByline` — is one more field on every definition there is, per question anyone
ever asks. One optional field carrying a closed vocabulary grows by a string.

**A role is not a position.** "The page's title" is the *first* heading in
reading order, and which node is first is a fact about a tree, not about a
primitive. A primitive can say it is a heading; only a tree can say which heading
leads. Keeping the two apart is what lets one declaration serve a page name, an
outline and a table of contents rather than only the first of them.

**A misspelling is refused rather than read as silence.** TypeScript stops
`role: "title"` at the declaration. A host writing JavaScript has only the
registry, and an unknown string accepted there would read to every consumer as a
primitive that declares no role — the silent failure, and the same one
`unknown-behaviour` and `undeclared-frame-prop` already exist to prevent. So
`unknown-role` joins them.

## Consequences

- **Nothing in the runtime reads a role.** It changes no render, no validation
  and no Gate judgement. It is a fact carried from the author who knows it to the
  consumer who needs it, and nowhere in between — the same shape as `submits`,
  which is read only by an audit.
- **The catalogue does not carry it, deliberately.** The catalogue is what a
  model reads to choose a primitive, and nothing filed asks a model to know which
  component is a heading. Adding a field there would change every proposal prompt
  in service of a consumer that is a host rather than a model. If a model ever
  needs it, that is a separate decision with its own filing.
- **`PrimitiveRegistry` gained a method.** It is a returned type rather than one
  hosts implement — `createPrimitiveRegistry` is the only constructor — so unlike
  [0112](0112-a-second-listing-on-the-hold-store-scoped-by-the-handle-and-keyed-by-two-columns.md)
  this breaks nobody.
- **The consumer that filed for it is in another lane.** `_lib/page-name.ts` is
  `Loom portal`'s file and its `TITLE_TYPES` keeps working untouched; replacing
  it with `portalRegistry.typesWithRole("heading")` is that lane's call and
  timing, and it needs `role: "heading"` on its own `loom.heading` first. Until
  it does, this seam is declared by nothing and answers empty — which is the
  honest answer for a deployment that registered no heading, not a failure.

## Alternatives considered

- **A free-form `role: string`.** Every consumer would then match on a string
  again, one level further from the type, and two hosts would spell the same part
  `heading` and `title`. The whole value is that a consumer and an author agree
  without meeting.
- **A tree-side helper — "the leading node of these types".** It is the last hand
  written line in the portal's derivation and would have removed it. Left out
  because the finding asked for two things and this is a third: the portal's
  `.find()` over `outlineTree` already works and is correct. The fact it could
  not get right was *which types*, and that is what this answers.
- **Deriving the role from the component.** A probe could see that a primitive
  emits an `h1`. It would be wrong for the primitive whose level is a prop, wrong
  for `acme.hero` wrapping its heading in a banner, and it would make a
  declaration into a guess — the same argument
  [0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
  made for `interactive`.
- **Leaving it to hosts.** The status quo, and it is survivable: the array is one
  line. It was rejected because the array is *silently* wrong rather than broken,
  and the deployment it is wrong on is the one that registered its own primitives
  — which is every real host and none of the ones in this repository.
