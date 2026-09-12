# 0132 — A type that mirrors a schema is derived from it

**Status:** Accepted
**Date:** 2026-09-12
**Section:** §2 — Composition Runtime

## Context

`GatePolicy` stated the Gate's thirteen knobs twice: once as `gatePolicySchema`,
and once as a hand-written type beneath it. The line that looked like it held the
two together did not.

```ts
export const defaultGatePolicy: GatePolicy = gatePolicySchema.parse({})
```

That assignment catches one direction only. A field **removed** from the schema
makes the parsed value un-assignable and fails the build, which is right. A field
**added** to the schema is an excess property on a *returned value* rather than on
a fresh object literal, so it is assignable, it compiles, and `keyof GatePolicy`
never hears about it. Every consumer keyed on the type silently omits the new
knob.

This was measured rather than argued. Adding a fourteenth field to the schema on
`main` and type-checking the repository produces **no errors at all**.

`Loom docs` filed it on 4 September, having met it from the outside: *What AI may
change* describes every knob and refuses to keep a list, so its rows are a
`Record<keyof GatePolicy, Knob>`. That device is only as good as the key, and the
key was a hand-maintained mirror. The lane closed it where it could —
`knobs.test.ts` holds `KNOB_ORDER` against `Object.keys(gatePolicySchema.shape)`
— which puts a surface in the position of telling the runtime about a mismatch
inside the runtime, and warns no second consumer.

## Decision

**Where a type and a Zod schema describe the same shape, the schema is the
statement and the type is derived from it.**

```ts
export type GatePolicy = Readonly<z.infer<typeof gatePolicySchema>>
```

**Where the derived type would be weaker than the hand-written one, the
difference is expressed in the schema rather than recovered afterwards.** Exactly
one difference existed here: `z.array(...)` infers a mutable array, and the three
host-vocabulary lists promised `readonly`. The fix is `.readonly()` on those three
schemas, which is already this package's idiom — seven array schemas across
`src/tree/`, `src/interactivity.ts`, `src/interpretation/` and `src/submit/`
carry it. Every other member was already equivalent, including the enum-keyed
`autoApplyCeiling` record, and the nested `removalThresholds` object, whose
`readonly` property modifiers never affected assignability in either direction.

The rule is about the *mirror*, not about Zod. A hand-written type that happens to
describe a schema's output is a second statement of one thing, and the cost of
the second statement is paid on the day they disagree — which is a day nothing
announces.

## Consequences

- A field added to `gatePolicySchema` now reaches `keyof GatePolicy` by
  construction. The same fourteenth-field experiment that produced silence on
  `main` fails to compile in **two** places on this branch: `policy.test.ts`, and
  `policy-fingerprint.ts`, whose `PolicyProjection` had been quietly projecting
  thirteen of fourteen fields with nothing to say so.
- `knobs.test.ts` on the documentation site keeps passing and is no longer the
  only thing standing between the runtime and the drift. Whether that lane now
  retires it is its own call; it is filed, not done here.
- The three vocabulary lists are frozen at parse time, which `.readonly()` does
  at runtime as well as in the type. Nothing in the repository mutates them, and
  every `GatePolicy` in `src/` and on all four surfaces is built by
  `gatePolicySchema.parse(...)` rather than as an object literal, so no
  construction site changes.
- `GatePolicy` no longer reads as a list a person can scan. The schema above it
  is that list, with each knob's prose attached to the knob, which is where a
  reader was better served anyway.

## Alternatives considered

**Assert the two agree in `policy.test.ts`** — `Object.keys(gatePolicySchema.shape)`
against the keys of `defaultGatePolicy`. The documentation lane offered this as
the cheaper option and it is genuinely cheap. Rejected as the primary fix because
it keeps two statements and adds a third thing to maintain, and because a runtime
check cannot repair what the *type* omits: a consumer writing
`Record<keyof GatePolicy, …>` still gets thirteen keys. It is kept anyway, beside
the derivation, because the derivation is the claim and a claim worth making is
worth checking.

**A mapped type over `z.infer` that makes every array readonly** — closes the same
gap without touching the schema. Rejected because it recovers in a type what the
schema is the right place to say, and because it would be a fourth spelling of
"these lists are readonly" in a package that already has a first.

**`.readonly()` on every schema in the package for consistency.** Out of scope and
not obviously right: it changes runtime behaviour by freezing, and the three lists
here were changed because a public type already promised `readonly` and would
otherwise have narrowed. Anywhere else it is a fresh decision with its own
consequences.

**Leave it and rely on the documentation site.** What was happening. It works
until a second consumer keys off the type, and `policy-fingerprint.ts` shows there
already was one.
