# 0064. A primitive says whether it is a target, and the Gate derives the nesting

**Status:** Accepted
**Date:** 2026-08-17
**Section:** §2 → §4

## Context

`loom.card` takes an `href`, which makes the whole surface the thing a reader
aims at. `loom.feature` has done the same since the first port. Both calls are
right: a card whose only clickable thing is a "learn more" that says nothing is
a worse target than the card itself.

It also means a tree may put a `loom.action` inside a card that has one. Nested
anchors are invalid HTML, and a browser handed them does not report anything —
it resolves the ambiguity by dropping one of the two links. The page renders, it
looks correct in a screenshot, and one of the things on it silently does not
work. The primitives routine filed it as a finding on 17 August after the
compose-and-arrange layer widened `loom.card` from a tile that holds fixed
fields to a general surface that holds whatever the tree puts on it.

**Nothing in the seams already built can catch it, and each for a good reason.**
[0008](0008-the-renderer-is-a-total-pure-projection.md) forbids the renderer
from enforcing parentage. `auditRegistry` probes a primitive in isolation, which
is what makes it cheap and what makes it blind here. A props schema sees one
node's props and never its descendants. `loom.card`'s own doc comment says a
linked card should hold no link, which is documentation rather than enforcement
and was all that lane could do.

The constraint is real, checkable in principle, and until now expressible
nowhere.

## Decision

**A primitive declares whether it renders a target and what makes it one. The
Gate derives, from that vocabulary, whether a change leaves one target inside
another — and refuses it if so.**

Four parts.

**1. The declaration is about the node, never about the parent.**

```ts
definePrimitive({
  type: "loom.card",
  interactive: { whenProps: ["href"] },   // an anchor when the tree gives it one
  …
})

definePrimitive({ type: "loom.action", interactive: "always", … })
```

`InteractiveWhen` is `"always"` or `{ whenProps }`. The conditional form is not
a convenience: a `loom.card` with no `href` holding a `loom.action` is the
ordinary composition of a page, and a check that refused it would be a check
every host turns off. A prop that is absent, `null`, or the empty string does
not count — otherwise the change that *fixes* a nesting by clearing the `href`
would be refused for producing it.

This is not the parentage declaration
[0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) rejected.
0054 turned down `childType: "loom.stat"` — a claim about what a primitive's
*relationships* may be, which the renderer would then be tempted to enforce.
This is a claim about what the primitive *is*, checkable by looking at the
component alone, and the renderer never reads it.

**2. It travels with the primitive, and a policy derives it.**
`interactiveTypesFor(registry)` reads the declarations into
`GatePolicy.interactiveTypes`. A host writes one line rather than a table, and
the day someone gives `loom.feature` an `href` the policy grows with the
library. Vocabulary in the policy is the shape `protectedPrimitiveTypes` and
`outOfTreeEffectTypes` already have; deriving it rather than hand-writing it is
the shape `textCatalogue` already has.

**3. The fact is measured on the resulting tree, and only what the change
introduced counts.** Every operation kind can produce a nesting and only one of
them looks like it does: `insert` and `move` put a target somewhere, and
`configure` breaks every link already inside a card by giving the card an
`href`. So the analysis compares the nested positions in the tree the delta
produces against those in the tree it started from, and reports the difference.
A change is answerable for the breakage it introduces and not for the breakage
it inherited.

**4. It is a `critical` stake factor, which under the default refusal floor is a
refusal.** No new Gate rule. Every other factor measures a change that might be
right — destroying a protected primitive is what a redesign looks like — and
this one measures a change that is wrong however it was meant. Refusal is also
the *useful* disposition and not merely the severe one: a refused proposal is
the one a repairer gets to try again, and "you put a link inside a link" is
feedback a model can act on, where confirmation would put the question to a
person who can only answer no.

A host that wants none of this declares no interactive vocabulary, which is the
default and is exactly today's behaviour.

## Consequences

- **A whole class of silently broken page is unreachable through the Gate**, for
  any deployment that declares its targets. It is the first thing the runtime
  refuses for being *wrong* rather than for being *consequential*.
- **`ChangeAnalysis` gains a fact that needs vocabulary to state.** The analysis
  stays free of judgment — it reports the pairs, and the policy decides what
  they are worth — but it is no longer computable from the tree alone. The
  predicate arrives as an argument, defaulting to "nothing is a target", so
  every existing caller is unchanged.
- **A declaration can be a lie, and only part of that is checkable.** The
  registry refuses a trigger naming a prop the schema does not declare, which
  catches the drift that actually happens: a prop renamed with the declaration
  left pointing at the old name. It cannot check that the component really
  renders an anchor — a primitive that delegates its root to another component
  reads as neither, the same false negative `probeEditableDecoration` already
  documents. Left unchecked deliberately rather than guessed at.
- **The starter library declares nothing yet**, so nothing changes for any
  deployment on `main` until `src/primitives/` adopts it. That is the primitives
  routine's lane, and it is filed for them.
- **Adding a field to the policy changes every policy fingerprint's shape half.**
  Judgments recorded before this version are `incomparable` to ones after, which
  is what that half is for.

## Alternatives considered

- **A render diagnostic instead.** The registry is already at the render seam,
  so a `nested-target` diagnostic beside `data-unavailable` would cost almost
  nothing and would need no vocabulary in the policy. Rejected as the *primary*
  home because it reports after the fact: the page is already broken and already
  served. It remains worth having for trees that arrive from outside the Gate —
  hand-authored, imported, or written before a host declared its targets — and
  is left open rather than built.
- **A type-level declaration with no props** (`interactive: true` on
  `loom.card`). Half the code and unusable: it refuses the commonest correct
  composition on the page, an action inside an unlinked card.
- **A dedicated Gate rule, below the refusal floor**, so the disposition is
  `requires-confirmation` — the shape `discards-later-work` has. Rejected
  because that shape exists for changes a person might legitimately want, and
  nobody wants a link a browser will drop. The rule would also skip the repair
  path, which is where the useful outcome is.
- **A declared constraint on the parent** — "this primitive admits no
  interactive descendants". More machinery, it re-opens what 0054 settled, and
  it states the rule once per primitive when the rule is the same everywhere:
  interactive content does not nest.
- **Enforcement in `applyDelta`**, refusing the operation outright. Wrong layer:
  the tree model is vocabulary-free by construction, and a delta that a host's
  policy would accept must still apply.
