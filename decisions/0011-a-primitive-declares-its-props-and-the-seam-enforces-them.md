# 0011 — A primitive declares its props, and the render seam enforces them

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §4 — Framework SDK

## Context

0009 put a node's props into a bag so nothing AI-authored could reach a React
reserved name, and left §4 an obligation: the bag is where a primitive's declared
prop schema should be checked. This record discharges it and fixes three things
the obligation did not settle — whether declaring a schema is optional, what
happens when props fail it, and whether the checked props are the ones the
primitive receives.

The pressure behind all three is that props in a Loom tree arrive from storage,
authored by a model, and may have been written by a delta the Gate accepted
months ago against a schema this deployment no longer runs. A primitive's
TypeScript types say what it expects; nothing so far made that true.

## Decision

**Declaring a prop schema is mandatory.** `PrimitiveDefinition.props` is required.
A primitive that declines to say what it accepts is asking a deployment to trust
a model's guess about its internals; a primitive that genuinely takes none says
so with `z.object({})`, which is a claim rather than a silence.

**Validation lives behind a separate interface.** `PropsValidator` is its own
seam, not a method on `PrimitiveResolver` — the same shape as `ChangeRepairer`
against `ChangeInterpreter` in 0006. A renderer handed no validator does not
validate, so "this deployment checks AI-authored props" is visible at the
composition root. A registry satisfies both interfaces, because a component's
narrowed prop type is only sound when the object that resolved it also vetted
the props.

**Invalid props omit the node and its subtree, with a diagnostic.** Exactly what
0008 does for an unknown primitive, for the same reason: rendering is total, one
bad node must not blank a page, and what could not be honoured comes back as a
value beside the element.

**Validation is a predicate, not a codec.** The parse output is discarded. What a
primitive receives is the tree's props, unchanged — no defaults, no coercion. A
schema that supplied values would make the rendered page a function of the
deployment's schema version as well as the tree, and two deployments rendering
the same revision differently breaks the property the whole runtime rests on:
that the tree is the page.

**A validator that does not know a type the resolver resolved is reported**
(`props-undeclared`) and the node still renders. Two seams disagreeing is a
composition-root fault, not something the tree did.

## Consequences

- A tree that survived the Gate can still fail to render, and that is now a
  normal, named condition. The Gate judges a delta against a policy; the render
  seam judges props against a deployment's primitives. Neither subsumes the
  other, and the second is where a deployment-specific fact belongs (0009's
  closing argument, unchanged).
- A strict schema turns 0009's inert prop into a refused node: a proposal setting
  `dangerouslySetInnerHTML` on a strict primitive now stops one step earlier,
  with a diagnostic naming it. Whether a primitive is strict is its author's call.
- Defaults must live inside primitives. An author who wants `variant="plain"` when
  the tree omits it writes that in the component, where presentation belongs.
- `PropsIssue.message` is developer-facing text from the declaring schema, and
  Zod's own messages can quote a rejected value. Diagnostics are therefore
  content-bearing; §6 must treat them as such rather than as safe constants.
- `LoomPrimitiveProps<TProps>` is now generic, so a primitive can read
  `props.title` without narrowing. The claim rests on the registry pairing the
  component with its own validator — one narrowing cast, in `definePrimitive`,
  named and argued there.

## Alternatives considered

**Optional schemas, so adoption is gradual.** Rejected. The one thing every
primitive must state is what a model may set on it; making that optional means
the deployments that most need checking are the ones that skip it. Hosts who want
no checking already have `staticPrimitiveResolver` and no validator.

**Render the node anyway and let the primitive cope.** Rejected. It hands a
primitive a bag its own types say cannot occur, which pushes an unchecked cast
into every author's lap and moves the failure from the seam that knows what went
wrong to a component that does not.

**Render with the parse output, so schemas can default and coerce.** Rejected,
and this is the closest call. It is ergonomic, and it is how every form library
works. It also means the same tree renders differently on two deployments, and
that a page's content cannot be read off the tree — which is the property that
makes a delta reviewable, attributable, and reversible in the first place.

**Validate in the Gate instead.** Still rejected, for 0009's reason: the Gate is
pure and knows no registry, and a change gated differently per deployment is not
one anyone can reason about.

**One interface with an optional `validateProps` method.** Rejected on 0006's
precedent — an optional method reads as an implementation detail, while a
separate interface makes the capability a wiring decision someone made.
