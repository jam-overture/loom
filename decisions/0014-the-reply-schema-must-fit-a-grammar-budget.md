# 0014 — The reply schema must fit a compiled-grammar budget

**Status:** Proposed — ARCHITECTURAL, needs review
**Date:** 2026-07-30
**Section:** §2 — Composition Runtime (interpretation)

> This record **contradicts specifics of Accepted record
> [0004](0004-model-facing-schema-is-a-projection.md)**. Per the escalation
> rule it is written as `Proposed` and 0004 is left standing and unmodified.
> Nothing in the code has been changed to match it.

## Context

0004 decided that the model-facing schema is a projection of the AST, bent to
fit structured output: nesting unrolled to a fixed depth of 4, prop values
expressed as a five-variant tagged union with a `{"kind":"json"}` escape hatch,
and every object closed.

That was asserted offline against the documented constraints — every object
closed with a complete `required`, allowlisted keywords only, no recursion,
depth asserted. Day 3's report named precisely what remained unproven: *"whether
the API accepts the JSON Schema I generate."*

The key reached the test process for the first time on 2026-07-30. The first
live call answered the question:

```
400 invalid_request_error
"The compiled grammar is too large, which would cause performance issues.
 Simplify your tool schemas or reduce the number of strict tools."
```

**The interpreter shipped in §2 has never worked against a real model.** Every
offline test passes, because every offline test asserts our beliefs about the
constraint rather than the constraint.

## What was measured

The API was probed directly with variants of the emitted schema. `kinds` is how
many node kinds an `insert` may introduce (3 = element/text/slot, 2 =
element/text, 1 = element only); `props` is `tagged` (0004's five-variant union)
or `encoded` (one JSON-encoded string).

| depth | props   | kinds | bytes  | verdict      |
| ----- | ------- | ----- | ------ | ------------ |
| **4** | tagged  | **3** | **15890** | **REJECTED — this is what ships today** |
| 5     | encoded | 3     | 13904  | rejected     |
| 3     | tagged  | 3     | 8650   | rejected     |
| 4     | encoded | 3     | 7392   | rejected     |
| 2     | tagged  | 3     | 5030   | rejected     |
| 3     | tagged  | 1     | 4819   | rejected     |
| 3     | encoded | 3     | 4136   | rejected     |
| 2     | tagged  | 1     | 3681   | accepted     |
| 1     | —       | —     | 3220   | accepted     |
| **4** | **encoded** | **2** | **3065** | **accepted** |
| 3     | encoded | 2     | 2608    | accepted    |
| 4     | encoded | 1     | 2561    | accepted     |
| 2     | encoded | 3     | 2508    | accepted     |

Two things follow, and the second is the important one.

**There is a budget, and it tracks schema size closely.** Everything at or below
~3.7 kB was accepted; everything at or above ~4.1 kB was rejected. The threshold
is a property of the service, is not documented as a number, and should be
treated as approximate and liable to move.

**Reducing depth alone cannot fix this.** Depth 2 with the tagged prop union is
still rejected, and depth 2 is already too shallow to be worth having — it
allows an element containing only text. The prop representation, not the depth,
is what consumes the budget, because the five-variant union is repeated at every
element at every level.

## Decision (proposed)

Adopt **depth 4, props JSON-encoded, two insertable node kinds** — 3065 bytes,
accepted, and the largest structural budget of any accepted variant.

Concretely, three changes to `schema.ts` / `draft.ts` / `materialize.ts`:

1. **A node's props are one JSON-encoded object string**, parsed and validated
   on our side, instead of an array of tagged key/value pairs. `materialize.ts`
   already stands between the reply and the `TreeDelta`, so the parse has a
   home, and §4's registry now validates the parsed result against the
   primitive's declared schema — the type information the tagged union was
   carrying is recovered there, by the component that actually declared it.
2. **`slot` is removed from what an `insert` may introduce.** A slot is a
   projection point a primitive declares, not content a UI edit adds; §4's
   catalogue already tells the model which slots a primitive has. Element and
   text remain.
3. **Depth stays at 4**, so nothing is lost from 0004's structural allowance.

## Consequences

- The interpreter would work against a real model, which it currently does not.
- Prop *types* stop being enforced by the grammar and start being enforced by
  `parse` plus §4's declared schema. That is strictly later, and a malformed
  prop bag becomes a `malformed-proposal` rather than something the model was
  prevented from saying. It is also where 0011 already put prop validation.
- AI can no longer introduce a slot. Existing slots are unaffected — they are
  addressable, configurable, and projectable as before.
- The budget is undocumented and empirical, so it needs a guard: a size
  assertion offline (cheap, catches a regression with no key) **and** the live
  acceptance test (authoritative, catches the threshold moving). Neither exists
  yet; both should land with whichever option is chosen.
- 0004's core claim survives intact and is *reinforced*: the model-facing schema
  is a projection that bends to the transport, and the AST is untouched. What
  fails is only its estimate of how far the transport bends.

## Alternatives considered

**Depth 2 with the tagged prop union and all three kinds.** Rejected: measured
at 5030 bytes and refused. Not available at any depth worth having.

**Keep the tagged union, drop to element-only inserts at depth 2** (3681 bytes,
accepted). Rejected: it keeps typed props but forbids inserting text, which
breaks the most ordinary edit there is — "add a line of text to the footer" is
the smoke test's own case.

**Split into several narrower schemas, one per operation kind, chosen by a first
cheap classifying call.** Not chosen now, and the strongest alternative if the
budget tightens further. It buys a lot of headroom — each schema carries one
operation — at the cost of two round trips, a classifier that can be wrong, and
a provenance story that has to describe two calls. Worth revisiting rather than
dismissing.

**Ask for the delta as free text and parse it.** Rejected. It gives up the
guarantee that motivated structured output in the first place, and 0003 is built
on the model not naming ids.

**Raise it with the vendor / wait for the limit to change.** Not a plan. The
limit is real today and the interpreter is broken today.
