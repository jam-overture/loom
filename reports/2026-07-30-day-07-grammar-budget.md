# 2026-07-30 (day 7) — The interpreter talks to a real model

**Build order section:** §2 — Composition Runtime (interpretation), reopened to fix it

**Visual:** [2026-07-30-day-07-grammar-budget.svg](2026-07-30-day-07-grammar-budget.svg)

**Branch:** `day-07-grammar-budget`, off `main` at `9d4e6f3`

---

## Review feedback

**This run *is* the feedback.** You approved 0014 — the escalation the midday run
raised and the evening run reported as blocking — with the instruction to
implement it, supersede 0004, add both guards, and get `main` green. That is what
this is. You also merged #10, so §4's registration contract is on `main`.

---

## What was completed

**`pnpm verify` is green with the live test running.** 378 tests, none skipped.
Before this change the model-backed interpreter had never once succeeded against
a real model; every offline test asserted our beliefs about the API's constraints
rather than the constraints.

The single live call that used to fail now returns a delta that applies:

```
✓ modelInterpreter against the live API
  > turns a plain instruction into a delta that applies   3556ms
```

Three changes, exactly as 0014 specified.

**Props are one JSON-encoded object** (`draft.ts`, `schema.ts`, `materialize.ts`).
Where a node's props used to be an array of tagged key/value pairs — five schema
variants per value, repeated at every element at every level of the unrolled
schema — they are now a single string the model fills with ordinary JSON. That
repetition, not the nesting depth, was what put the schema over the ceiling.

`decodeProps` is now the whole trust boundary for props: parse, require an
object, validate every value against the JSON value space. A bad bag is a
`malformed-proposal`, which is the honest classification — the model said
something it was not allowed to say.

**`slot` is no longer an insertable kind.** A slot is a projection region a
primitive declares, not content an edit adds, and §4's catalogue already tells the
model which slots a primitive has. Slots already in a tree are untouched:
addressable, configurable, movable, and insertable-into as before.

**Depth stays at 4.** Nothing was given up structurally.

**Both guards now exist**, which 0014 required and neither of which did before:

| guard | what it catches | needs a key? |
| ----- | --------------- | ------------ |
| `draftSchemaByteSize() ≤ GRAMMAR_BUDGET_BYTES` | a commit that grows the schema past the budget | no |
| the live smoke test | the real boundary moving, or the API changing its mind | yes, skips cleanly without |

---

## The thing the implementation taught us

**0014's measured 3065 bytes was optimistic. The honest figure is 3381.**

The probe that produced the table in 0014 carried fewer `description` strings
than the real schema generator does. When I first implemented it faithfully —
including a genuinely helpful description on `props` explaining the encoding —
the schema came out at **4143 bytes**, over the guard and inside the rejection
band. The descriptions were the entire difference: ~1200 bytes of them, because
every description repeats at every level of the unrolled schema. One helpful
sentence about props cost four copies of itself.

They are now terse, and the reason is recorded in `schema.ts` next to them: the
system prompt already explains ids, indices, and the prop encoding at length, to
the same model, in the same request. A second explanation inside the schema buys
nothing and is billed four times. That is a non-obvious property of an unrolled
schema and it will catch someone again if it is not written down.

Measured after trimming:

| depth | bytes |
| ----- | ----- |
| 1 | 2070 |
| 2 | 2507 |
| 3 | 2944 |
| **4** | **3381** |

Each level costs ~437 bytes, so depth 5 would be 3818 — over the guard and above
the highest figure ever observed accepted (3681). Depth 4 is not a comfortable
choice; it is the last one that fits.

---

## Decisions I made that weren't specified

1. **`GRAMMAR_BUDGET_BYTES = 3500`,** with a second test asserting the guard
   itself stays below 4136 — the lowest figure observed rejected. The guard trips
   before the API does, which is the point; a schema growing past it is a change
   someone looks at rather than a 400 in production.

2. **The proxy is conservative and I said so rather than refining it.**
   Descriptions almost certainly do not affect the *compiled grammar* much, yet
   the guard counts them. Erring toward tripping early is the safe direction for a
   limit nobody outside the service can measure, and the live test is the only
   authority on where the real boundary sits.

3. **Duplicate prop keys are no longer detectable, and I did not try to keep the
   check.** `JSON.parse` collapses `{"a":1,"a":2}` to the last value before any
   Loom code sees it. Detecting it would mean hand-rolling a JSON scanner to
   police a case that resolves deterministically in every parser anyone would use.
   Recorded in 0014's consequences and in `materialize.ts`, because it is a
   capability that existed and now does not.

4. **Error text truncates the offending value to 80 characters.** A parse failure
   quotes what it could not parse, that string is model-authored, and it ends up
   in telemetry. Tested.

5. **The system prompt gained the two rules the schema stopped enforcing** — how
   to encode props, and that a slot cannot be inserted. The schema no longer
   makes either unsayable, so the prompt has to say it. Note this changes the
   system prompt constant, so every prompt hash from before today differs from
   every hash after; provenance stays comparable within a version, not across
   this change.

6. **A fixture per new failure mode**, replacing the ones that became
   impossible: `NON_OBJECT_PROPS_REPLY` (parses, but to an array) and
   `INSERT_SLOT_REPLY` (a kind the schema no longer offers). The old
   `DUPLICATE_PROP_REPLY` is gone with the check it tested.

---

## Decision records

| #    | Title                                               | Status                            |
| ---- | --------------------------------------------------- | --------------------------------- |
| 0004 | The model-facing schema is a projection, not the AST | **Superseded by 0014** (text intact) |
| 0014 | The reply schema must fit a compiled-grammar budget  | **Accepted** (was Proposed)       |

0014 gained an **As built** section recording the three ways the implementation
departed from the proposal — the byte figure, the description cost, and the lost
duplicate-key check. The proposal's own text is unchanged above it, so the trail
shows what was approved as well as what was built.

**The escalation is resolved, not bypassed.** 0004 was contradicted by approval,
not by a refactor.

---

## Test coverage / status

```
Test files  40 passed
Tests       378 passed | 0 skipped
```

`pnpm verify` green. **7 net new tests**, and for the first time a green run
includes the network.

What the new tests pin down:

- the schema stays inside the budget, and the budget stays below the observed
  rejection boundary
- `props` is structurally one `{ type: "string" }`, and no tagged variant
  survives anywhere in the schema
- `element` and `text` are offered as insertable kinds and `slot` is not
- a prop bag that is unparseable, that parses to an array, a string, a number,
  `null`, or `true`, or that contains a value outside the JSON value space, is
  each refused with its own message
- a parse failure's message is bounded even when the offending text is 500 bytes
- a proposed slot insert is `malformed-proposal`
- the live call produces a delta that applies and grows the tree

---

## Open questions for the next session

1. **§4's CLI scaffolding is still the next build-order unit.** Untouched by this
   run: `loom init`, `loom add primitive` generating a stub that satisfies the
   contract, and a generated test that actually runs `auditRegistry`.

2. **Depth 4 is the last depth that fits, at 3381 of 3500.** Anything that adds a
   field to an operation, a node kind, or a description will trip the guard. The
   two escape hatches are both recorded and neither is built: trim descriptions
   further, or split the schema per operation behind a cheap classifying call
   (0014's strongest rejected alternative). Worth designing before it is urgent.

3. **Prompt size is pushed from two directions** — large trees (day 3) and large
   registries (0013). Unchanged by this run, and now the more interesting limit,
   since the schema limit is understood.

4. **One live call is thin evidence.** It proves the schema is accepted and that
   one plain instruction round-trips. It does not tell us how often a real model
   produces an unparseable prop bag, which is exactly the failure this change
   accepted. That number is a §6 telemetry question, and 0011's obligation about
   `PropsIssue` messages being content-bearing applies to it.

5. **Node-level provenance.** (Carried from day 1.) Still unforced.
