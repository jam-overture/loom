# 2026-07-30 (day 5, follow-up 2) — The key works, and the first live call found a real bug

**Build order section:** §2 — Composition Runtime (interpretation). Not a new build unit: this is the consequence of the live test finally running.

**Visual:** [2026-07-30-day-05-grammar-limit.svg](2026-07-30-day-05-grammar-limit.svg)

**Branch:** `day-05-schema-grammar-limit`, off `main` (PR #7 merged as `63dcde3`)

> ## ⚠️ ARCHITECTURAL — needs review
>
> This run found that **the model-backed interpreter has never worked against a
> real model**, and fixing it contradicts specifics of Accepted record 0004.
> Per the escalation rule I have **not** changed the schema. Record
> [0014](../decisions/0014-the-reply-schema-must-fit-a-grammar-budget.md) is
> written as `Proposed`, 0004 is left standing and untouched, and the evidence
> is below.
>
> **`pnpm verify` is RED**, and will be red on every future run until this is
> decided. That is the test doing its job, not a regression introduced here.

---

## The key arrived

`LOOM_ANTHROPIC_API_KEY` is present in the test process — confirmed, 108
characters, and `ANTHROPIC_API_KEY` remains absent exactly as the midday
diagnosis predicted. PR #7 is merged. The unreserved-name fix works, and the
skip-for-four-runs is over.

## The first live call failed, correctly

```
400 invalid_request_error
"The compiled grammar is too large, which would cause performance issues.
 Simplify your tool schemas or reduce the number of strict tools."
```

This is the exact question day 3 flagged as the one thing no fixture could
settle — *"whether the API accepts the JSON Schema I generate."* The answer is
no, and it has been no since §2 shipped. Every offline test passes because every
offline test asserts our beliefs about the constraint rather than the constraint
itself: objects closed, `required` complete, no recursion, depth bounded. All
true, all insufficient.

**Nothing in the pipeline downstream of interpretation is implicated.** The
Gate, the delta model, apply, inverse, the repair loop, and §3's renderer are
all unaffected and all still proven. What is broken is one boundary: the
document we hand the model.

## What was measured

Rather than guess, I probed the API with variants of the emitted schema.
`kinds` is how many node kinds an `insert` may introduce; `props` is `tagged`
(0004's five-variant union) or `encoded` (one JSON-encoded string).

| depth | props   | kinds | bytes | verdict |
| ----- | ------- | ----- | ----- | ------- |
| **4** | tagged  | **3** | **15890** | **REJECTED — ships today** |
| 5     | encoded | 3     | 13904 | rejected |
| 3     | tagged  | 3     | 8650  | rejected |
| 4     | encoded | 3     | 7392  | rejected |
| 2     | tagged  | 3     | 5030  | rejected |
| 3     | tagged  | 1     | 4819  | rejected |
| 3     | encoded | 3     | 4136  | rejected |
| 2     | tagged  | 1     | 3681  | accepted |
| 1     | —       | —     | 3220  | accepted |
| **4** | **encoded** | **2** | **3065** | **accepted** |
| 3     | encoded | 2     | 2608  | accepted |
| 4     | encoded | 1     | 2561  | accepted |
| 2     | encoded | 3     | 2508  | accepted |

Two conclusions:

**There is a budget of roughly 4 kB of schema JSON.** Everything at or below
~3.7 kB was accepted; everything at or above ~4.1 kB was rejected. It is
undocumented as a number and should be assumed to move.

**Depth alone cannot fix it.** Depth 2 with the tagged prop union is still
refused, and depth 2 is barely worth having. The five-variant prop union is what
consumes the budget, because it repeats at every element at every level — that
is why the shipped schema is nearly four times over.

## What I recommend, and why I did not do it

**Depth 4, props JSON-encoded, element and text insertable** — 3065 bytes,
accepted, and the roomiest accepted variant. It keeps the full depth-4
structural allowance 0004 wanted and gives up two things:

- **Typed props at the grammar level.** They move to `materialize.ts`, which
  already stands between the reply and the delta, and then to §4's declared
  prop schema — which is where 0011 already put prop validation. The type
  information is recovered by the component that declared it.
- **AI-inserted slots.** A slot is a projection point a primitive declares, not
  content a UI edit introduces, and §4's catalogue already tells the model which
  slots a primitive has. Existing slots stay addressable, configurable, and
  projectable.

I did not implement it because it contradicts 0004 on both of those specifics,
and 0004 is Accepted. The alternatives — including a per-operation schema split,
which is the strongest one and buys real headroom at the cost of two round trips
— are argued in 0014.

## Test coverage / status

```
Test files   1 failed | 33 passed (34)
Tests        1 failed | 311 passed (312)
```

**`pnpm verify` is RED.** The single failure is the live smoke test, failing on
the 400 above. Stated plainly rather than worked around:

- I did not weaken, skip, or delete the test. It is reporting a true defect in
  shipped code, which is the only reason it exists.
- It will fail on every run from now on, because the key now reaches the test
  process. There is no offline-green fiction to hide behind any more, and that
  is an improvement.
- Everything else is unchanged and green: 311 passing, the same set as the last
  two runs.

No new tests this session. The guard that *should* exist — an offline assertion
that the emitted schema stays under the budget, which would have caught this on
day 3 with no key — is deliberately not added here, because its threshold and
the shape it guards both depend on the decision. It should land with whichever
option is chosen, alongside the live acceptance check.

## Decisions I made that weren't specified

1. **Probing the API to map the budget rather than reporting the single 400.**
   Four extra calls turned "it's rejected" into a table with an accepted shape
   in it. The cost was a few cents; the alternative was handing you a problem
   instead of a decision.

2. **No code change at all, including no "temporary" depth reduction.** A lower
   depth does not make it pass, so a partial change would trade a clear failure
   for a quieter one and still contradict 0004.

3. **Reporting red rather than making it green.** Marking the test skipped again
   would restore a green build and delete the only signal that the interpreter
   does not work.

## Decision records

| #    | Title                                              | Status                       |
| ---- | -------------------------------------------------- | ---------------------------- |
| 0014 | The reply schema must fit a compiled-grammar budget | **Proposed** — ARCHITECTURAL |

0004 is **not** superseded and **not** edited. If 0014 is accepted, 0004 gets
`Superseded by 0014` at that point and not before.

Numbering note: 0011–0013 belong to the day-6 run on PR #8, which is stacked
behind this work and not yet merged. No collision.

## Open questions for the next session

1. **0014 needs an answer before §2 works.** Recommended option and the full
   menu are in the record. This blocks nothing in §4 or §5 — those do not call a
   model — but it blocks the end-to-end story the whole project is for.

2. **The budget needs a guard once the shape is settled** — offline size
   assertion plus the live acceptance test. Both belong in the same change.

3. **The threshold is empirical and undocumented.** Treat ~4 kB as a
   this-week observation, not a contract.

4. **Carried, unchanged:** node-level provenance (day 1); `renderTree`
   outgrowing the prompt on large trees (day 3) — now more pressing, since
   prompt size and schema size compete for the same request.
