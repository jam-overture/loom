# 0113. The pairings probe reports where it stops looking, rather than inventing a price

**Status:** Accepted
**Date:** 2026-09-06
**Section:** §4b

## Context

[0089](0089-the-text-ramp-is-held-to-four-grounds.md)
replaced a hand-written contrast list with one derived from the components, and
split every pairing into two claims: `painted`, where one primitive sets both
the ink and the ground beneath it and a palette that fails it is refused; and
`composed`, where the ink floats and the ground comes from wherever the tree put
it, which is measured and reported rather than asserted.

The derivation has a limit nobody had written down. `registryPairings` renders
each primitive through `probeColourPairings` under `probeConfigurations`, which
is the empty configuration plus one per closed choice. No other prop is ever set
— including required ones. That is fine for a component whose elements exist
unconditionally: `loom.event` draws its date whether or not a date arrived, so
the date's ink is derived even with no props at all.

It is not fine for a component that guards on a prop:

```ts
given.price === undefined ? null : createElement("p", { style: { color: colour("accent-strong") } }, given.price)
```

`loom.offering` writes that price on the `bg-surface` of the card it drew
itself. **Both ends are one primitive's, so the pairing is `painted` and the
palette bar should refuse a failure of it.** The probe never sees it, because
the element does not exist under an absent optional prop — so the row was
written `composed`, and a palette whose `accent-strong` failed on `bg-surface`
would have shipped with the audit *reporting* a page nobody can read instead of
refusing it.

`Loom primitives` filed this on 2 September, and it surfaced only by accident:
`loom.event` was written with its date in `accent-strong`, `date` is required,
the probe saw the pairing immediately, and *never declares a painted pairing as
the softer composed* failed with exactly one entry. The check works. Nothing was
watching the gap it cannot see through.

## Decision

**Two parts, and only the first is about a row.**

**1. `accent-strong on bg-surface` is declared `painted`, from the component
rather than from the probe.** Every registered palette already clears it, so
`failures` stays empty and the pinned composed shortfall in `contrast.test.ts`
is untouched — the change is that a future palette failing it is refused instead
of noted. The `where` names `loom.offering price` alongside `loom.field inside a
card`, which is the same pairing reached the other way.

The checks in `pairings.test.ts` already allow this direction and only this
direction: *never declares a painted pairing as the softer composed* fires when
the derivation finds `painted` and the list says otherwise, and *declares
nothing the library does not render* is satisfied by the pairing being rendered
at all, on either basis. **Declaring a stricter bar than the derivation reached
is safe; declaring a softer one is how a real failure goes quiet.** That
asymmetry is what makes a hand-declared row tolerable here at all.

**2. The probe reports where it stops, and does not guess past it.**
`RegistryPairings.unprobedProps` names, per primitive, the declared props no
configuration sets: optional, and not a closed choice. That is exactly the set a
component guards an element on and the probe cannot open. A schema whose keys do
not enumerate answers `undefined` rather than an empty list, the distinction
`declaredProps` already makes.

**It is a report, not a check.** Pinning the whole set would churn on every
optional prop any lane ever adds, which is a test that trains people to update
it without reading it. What is pinned is the one case that produced a false row:
`loom.offering`'s `price` is unreachable, the derivation reaches only `composed`
for that pairing, and the list declares `painted`. If the probe ever grows to
open a guarded prop, that test fails and the row stops needing a person behind
it.

## Consequences

- One pairing moves from reported to refused. No palette in the repository
  changes state; the bar is now correct for the next one.
- A list whose comment says it is read off `src/primitives` can now say which
  part of them it read. That was the honest half of the finding and it is the
  half with no code in it.
- **A row may legitimately be `painted` where the derivation says `composed`,
  and that is now a documented state rather than a discrepancy.** The cost is
  that "derived" is no longer the whole story for this list — a reader has to
  know the asymmetry, which is why it is written in `contrast.ts` beside the
  rows rather than only here.
- `unprobedProps` is non-empty for most of the starter library, which is
  expected and is not a defect count. It is the map of where a stricter reading
  might be owed, for a lane looking for one.

## Alternatives considered

- **Render each primitive again with every optional prop filled with a
  placeholder.** The obvious fix, and the reason this record exists rather than
  a comment. It derives the real set only if the placeholders are real: a
  `price` wants a string, a `date` wants a parseable one, an `href` wants a URL,
  and a schema with a `.refine()` across two fields wants a combination. A
  pairing derived from an invented value is a fact about the invention, and the
  failure mode is the same silence 0089 was written against — a green tick over
  something that was measured wrongly rather than not at all. Rejected, and
  rejected specifically rather than in general: if a future probe can take
  values from the primitive's own schema without choosing them, this is worth
  reopening.
- **Leave the row `composed` and note the gap in prose.** What the filing lane
  did, correctly, since `src/theme/` is not theirs. As a resting state it keeps
  a false statement in a list whose whole value is being true.
- **Require every primitive to paint its inks unconditionally.** Would make the
  probe complete by making the library worse: an empty `<p>` where there is no
  price is a layout artefact, and 0008 leaves a component free to render nothing.
- **Fail the build on any unprobed prop.** Turns an honest report into a bar
  that most of the library trips over for no defect, which is how a check gets
  suppressed rather than satisfied.
