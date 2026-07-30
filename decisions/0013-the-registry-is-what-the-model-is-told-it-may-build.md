# 0013 — The registry is what the model is told it may build

**Status:** Accepted
**Date:** 2026-07-29
**Section:** §4 — Framework SDK → §2 — Composition Runtime

## Context

Until now the interpreter told a model nothing about what exists. Its only source
of primitive types was the tree outline, and the system prompt papered over the
gap with an instruction to "reuse primitive types already present in the tree
unless the intent clearly calls for a new one". So "add a buy button to the
sidebar" left a model with three bad options: invent `commerce.buy-button` and
hope, reuse a card and call it a button, or answer `not-understood` for a request
the deployment can in fact satisfy.

§4 makes the answer available: a registry knows every type, its declared props,
and its slots. The question is whether the interpreter should be told, and how
much.

## Decision

**A deployment's registry is projected into a `PrimitiveCatalogue` and can be
given to the interpreter, which puts it in the prompt.** One line per primitive:
type, description, prop names with `?` marking optional, and slot names.

**It is a projection, not the registry.** The catalogue is plain data — the same
relationship the model-facing reply schema has to the AST in 0004. A registry
holds components and closures, none of which can be serialised, sent to a model,
or recorded in telemetry.

**It is deliberately shallower than the schemas it comes from.** Prop names and
optionality, not types or shapes. Describing arbitrary Zod to a model means
maintaining a second schema language, and the model already sees concrete prop
values in the tree outline.

**Unenumerable props say so.** A schema whose keys cannot be listed projects
`props: undefined`, rendered as `not declared` — distinct from `none`. "I cannot
tell you" and "there are none" would lead a model to different actions, so they
are different values.

**It is optional, and absent by default.** A host that wires no catalogue gets
exactly §2's behaviour. Nothing is invented to fill the gap.

**It leads the user message, ahead of the tree.** It is the most stable thing in
the request — a property of the deployment, not of the intent — so it sits where a
cache can hold it across intents.

## Consequences

- What AI may create is now bounded by what the deployment registered, and the
  bound is stated rather than discovered by refusal. A model asked for something
  unbuildable can say `not-understood` for the right reason.
- The catalogue is part of the prompt, so it is part of the prompt hash in
  provenance. Two deployments with different registries cannot produce the same
  provenance for the same utterance — tested. That is a feature: "which
  primitives were available when this was proposed" becomes answerable from the
  record rather than reconstructed.
- Prompts grow with the registry. A deployment with two hundred primitives will
  need a scoped or retrieved catalogue, which is the same pressure already
  recorded against large trees outgrowing the prompt. Both are the same open
  question and will want the same answer.
- The instruction to prefer existing types stays in the system prompt, so a model
  with a catalogue is told both what exists and to reach for what is already
  there — the catalogue widens what is possible, it does not invite redecoration.
- §5 and §6 get the same projection for free: an insert menu and a telemetry
  record of the available primitive set both read a `PrimitiveCatalogue`.

## Alternatives considered

**Put the catalogue in the system prompt.** Rejected. The system prompt is a
constant on purpose — one string that answers "what were we asking the model to
do" — and making it per-deployment would break the byte-identical cacheable prefix
0006 relies on for repairs.

**Generate a JSON Schema per primitive and constrain the reply to it.** Rejected
for now, and the most interesting rejection. It would make an invalid prop
unrepresentable rather than merely refused, but it requires a recursive,
per-primitive output schema, which is exactly the structured-output limitation
0004 already worked around by unrolling. Revisit if invalid-props diagnostics turn
out to be common in telemetry.

**Send the Zod schemas as text.** Rejected: it leaks the implementation of a
schema into a prompt, invites a model to reason about refinements it cannot see
the code for, and costs tokens proportional to schema complexity rather than to
the number of primitives.

**Let the interpreter hold the registry directly instead of a projection.**
Rejected. It would put React in the interpretation path, tie the model seam to a
renderer-facing type, and make the interpreter untestable without components.

**Derive the catalogue from the tree instead (what types appear in it).**
Rejected: it can only ever describe what has already been used, so the first use
of any primitive remains a guess — the exact failure this record removes.
