# 0004 — The model-facing schema is a projection, not the AST

**Status:** Accepted
**Date:** 2026-07-28
**Section:** §2 — Composition Runtime

## Context

The interpreter constrains the model's reply with a JSON Schema, so a malformed
answer is rare rather than routine. Structured output accepts a strict subset of
JSON Schema, and two of its restrictions collide head-on with the AST:

- **No recursive definitions.** `LoomNode.children` is a list of `LoomNode`.
- **No open objects** — every object must declare its properties and close with
  `additionalProperties: false`. An element's `props` is an arbitrary JSON
  object, which cannot be described that way at all.

The tempting response is to loosen the reply format: ask for JSON in prose, or
accept a stringly-typed blob and validate afterwards. That trades a schema the
API enforces for a prompt the model may ignore, and moves the failure from
"rejected at generation" to "rejected after we paid for it".

## Decision

Keep the constrained reply, and treat the model-facing schema as an explicit
**projection** of the AST rather than a serialization of it. Three differences,
each a consequence of one restriction above:

1. **Inserted nodes carry no ids** — see 0003. Independent of JSON Schema, but
   it is the first thing that makes the two schemas distinct.
2. **Nesting is unrolled to a fixed depth** (currently 4) in the emitted schema,
   bottoming out at a `text` leaf. This bounds how much structure one proposal
   may introduce at once; it does not bound the tree, because a deeper subtree is
   built by a second insert against the node the first one created. The Zod draft
   schema stays fully recursive, so a deeper reply that somehow arrives still
   validates.
3. **Prop values are tagged**, one variant per JSON type
   (`{"kind":"string","string":"Home"}`, `{"kind":"number","number":1}`, …), with
   a `{"kind":"json","json":"[1,2]"}` escape hatch for arrays and objects. Every
   value has exactly one spelling, and the whole JSON value space stays
   reachable.

The JSON Schema is hand-written rather than derived from the Zod schema, because
the generated form would have to be edited into the accepted subset anyway. The
drift that hand-writing invites is guarded by tests: every object is asserted
closed with a complete `required` list, only allowlisted keywords may appear, the
unrolled depth is asserted, and every recorded reply fixture is validated against
both schemas.

## Consequences

- A reply that violates the shape is mostly prevented at generation rather than
  diagnosed afterwards. `malformed-proposal` stays a real code with real tests,
  because tagged values can still fail to decode (`{"kind":"json","json":"{x:2}"}`
  is schema-valid and undecodable) and because a truncated reply is still
  possible.
- The AST is untouched. Nothing about the tree schema bends to fit a wire format;
  the bending happens in `draft.ts`, `schema.ts`, and `materialize.ts`.
- Deep structure costs more than one round trip. Accepted: it also means each
  proposal the Gate reviews is smaller.
- Tagged prop values cost tokens and read awkwardly. Accepted for
  unambiguity — the alternative was a value that could arrive either encoded or
  raw with no way to tell which was meant.
- Two schemas can drift. The mitigation is tests, not types; if drift bites in
  practice, deriving the JSON Schema from Zod becomes worth its own record.

## Alternatives considered

**Ask for JSON in the prompt with no schema.** Rejected: makes malformed replies
routine, and pushes the cost of every mistake past generation.

**Free-form `props` with `additionalProperties: true`.** Not available —
structured output rejects it. This is a constraint, not a preference.

**Restrict AI-set props to scalars, no escape hatch.** Rejected: simpler and
smaller, but a primitive that takes an array or object prop would become
unconfigurable by AI, and Loom cannot know which primitives those are.

**JSON-encode every prop value as a string.** Rejected: total and uniform, but it
requires the model to escape ordinary strings (`"Home"` becomes `"\"Home\""`),
which is exactly the kind of mistake a schema cannot catch.

**A flat node list with parent references, to avoid recursion.** Rejected for the
same reason as in 0003 — it is the flat IR 0001 turned down.

**Tool use instead of structured output.** Not chosen: a tool call is validated
the same way and buys nothing here, since there is exactly one thing to call and
no execution loop. Worth revisiting if a repair loop needs multiple turns.
