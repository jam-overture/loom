# 17 August 2026 — a target inside a target, and the first thing the Gate refuses for being wrong

**Routine:** `Loom daily build` · **Section:** §2 → §4 · **Branch:** `day-55-a-target-inside-a-target` · **Pull request:** [#88](https://github.com/jam-overture/loom/pull/88)

![The change, why nothing caught it, and what now does](2026-08-17-day-55-a-target-inside-a-target.svg)

One finding closed. A primitive can now say whether it renders a target the
reader aims at, and the Gate refuses a change that leaves one of them inside
another.

## What this closes

The primitives routine filed it this morning, after the compose-and-arrange
layer widened `loom.card` from a tile holding fixed fields into a general
surface holding whatever the tree puts on it:

> `loom.card` takes an `href`, which makes the whole surface the target a reader
> aims at […] It also means a tree may put a `loom.action` inside a card that has
> one, and nested anchors are invalid HTML that browsers resolve by dropping one
> of the two links. The reader sees a card that does not work.

The finding was right about the shape of the problem *and* about why no existing
seam could speak to it. [0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)
forbids the renderer from enforcing parentage; `auditRegistry` probes a primitive
in isolation, which is what makes it cheap; a props schema sees one node and
never its descendants. `loom.card`'s own doc comment says a linked card should
hold no link, which is documentation rather than enforcement.

It is worth being precise about why this one matters more than it sounds. A
browser handed nested anchors does not report anything. It resolves the
ambiguity by dropping one of the two links, so the page renders, it looks
correct in a screenshot, and one of the things on it silently does not work. It
is the rare structural mistake that is invisible to review and obvious to a
reader who clicks.

## What changed

[0064](../decisions/0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
— **a primitive says whether it is a target, and the Gate derives the nesting.**

**The declaration is about the node, never about the parent.**

```ts
definePrimitive({ type: "loom.card",   interactive: { whenProps: ["href"] }, … })
definePrimitive({ type: "loom.action", interactive: "always",               … })
```

The conditional form is load-bearing rather than a convenience. A `loom.card`
with no `href` holding a `loom.action` is the ordinary composition of a page, so
a type-level check — "cards are targets" — would refuse the commonest correct
thing on the page and be turned off within a day. A prop that is absent, `null`,
or the empty string does not count either, or the change that *fixes* a nesting
by clearing the `href` would be refused for producing one.

**It travels with the primitive and the policy derives it.**
`interactiveTypesFor(registry)` reads the declarations into
`GatePolicy.interactiveTypes`, so a host writes one line rather than a table
that goes stale the day someone gives `loom.feature` an `href`. Vocabulary in
the policy is the shape `protectedPrimitiveTypes` already has; deriving it
rather than hand-writing it is the shape `textCatalogue` already has.

**The measurement is on the resulting tree, and only what the change
introduced.** Every operation kind can produce a nesting and only one of them
looks like it does: `insert` and `move` put a target somewhere, and `configure`
breaks every link already inside a card by giving the card an `href`. So the
analysis compares the nested pairs in the tree the delta produces against those
in the tree it started from. A change is answerable for the breakage it
introduces and not for the breakage it inherited — which also means the tree
that is already broken does not block every unrelated edit to the page.

**The disposition is a refusal, and it comes from the existing ladder.** The
factor is `critical`, which under the default refusal floor is
`stakes-at-refusal-floor` — no new Gate rule.

## Decisions taken that were not specified

**Why refuse rather than ask.** Every other stake factor measures a change that
might be right: destroying a protected primitive is what a redesign looks like,
and discarding work is sometimes the point. This one measures a change that is
wrong however it was meant. Refusal is also the *useful* disposition and not
merely the severe one — a refused proposal is the one the repairer gets to try
again, and "you put a link inside a link" is feedback a model can act on, where
confirmation puts a question to a person who can only answer no. A host that
wants none of it declares no interactive vocabulary, which is the default.

**Why the analysis takes a predicate.** `analyzeDelta` was, until now, a
function of the tree and the delta alone, and its own doc comment says it knows
nothing about whether a change is acceptable. That still holds: "this node
renders a target" is a fact, not a judgment, and what the pairs are *worth* is
still decided downstream in stakes and the Gate. But it is a fact that cannot be
recovered from the tree, so it arrives as an argument — defaulting to "nothing
is a target", which leaves every existing caller unchanged.

**Why the type lives at the root rather than in `runtime/`.** It has two readers
that do not know about each other — `definePrimitive`, where an author declares
it, and `GatePolicy`, where a deployment's set arrives. Nothing under `sdk/`
imports from `runtime/` today and this was not the change to start with, so the
declaration vocabulary sits in `src/interactivity.ts` beside the other shared
identifier schemas, and the tree walk that uses it sits in
`src/runtime/nesting.ts`. That is the same move `reserved-props.ts` made when
the `loom:` namespace acquired a second reader.

**Why `InteractiveTypes` is keyed by `string`.** Keying it by the branded
`PrimitiveType` made the obvious spelling of a policy fail to compile — an
object literal cannot satisfy a branded index signature. The schema still
validates every key as a primitive type on the way in.

**What was checked, and what deliberately was not.** The registry refuses a
trigger naming a prop the schema does not declare, which catches the drift that
actually happens: a prop renamed with the declaration left pointing at the old
name. It does not check that the component really renders an anchor. A probe
could try, and it would read as a false negative for any primitive that
delegates its root to another component — the same limit
`probeEditableDecoration` already documents about itself. Left unchecked
deliberately rather than guessed at.

## Records

- **Added [0064](../decisions/0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)**,
  `Accepted`. It supersedes nothing. It is adjacent to
  [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md),
  which rejected a `childType` field on a definition, and the record says why
  this is not that: 0054 turned down a claim about a primitive's *relationships*,
  which the renderer would then be tempted to enforce. This is a claim about what
  the primitive *is*, checkable by looking at the component alone, and the
  renderer never reads it.

Not treated as an escalation. It contradicts no `Accepted` record — 0008 stays
exactly as it is, and the renderer is not the thing doing the checking.

## Findings

**Closed:** *a linked card may legally contain a link, and nothing can say so*
(filed by `Loom primitives`, 17 August).

**Filed for `Loom primitives`:** the starter library declares no interactivity
yet, so nothing about any deployment on `main` changes until it does.
`loom.action` is `"always"`; `loom.card`, `loom.feature` and `loom.logo` are
`{ whenProps: ["href"] }` by inspection of their schemas. It is a one-line
addition per primitive and the registry will refuse a typo.

**Filed for whoever owns the demo's wiring:** the seam has no live user until a
policy is built with `interactiveTypesFor(registry)`. The natural place is the
demo, which my brief says is mine and which lives in `apps/portal/lib/demo`,
which the portal routine is actively editing on #87. Not touched this run rather
than race for a file; recorded as an open question below.

## Open questions

1. **Who wires the demo's policy?** The lane table says the framework routine
   owns "the demo"; the demo's files are inside `apps/portal`, and the portal
   routine has an open PR proposing further changes to `lib/demo/session.ts`.
   Two routines editing one directory is the thing `docs/routines.md` exists to
   prevent. A sentence in the lane table would settle it.
2. **Is a render-time diagnostic worth having as well?** This catches a change
   *before* it lands, which is the valuable half, but says nothing about a tree
   that arrived some other way — hand-authored, imported, or written before a
   host declared its targets. A `nested-target` diagnostic beside
   `data-unavailable` would cost almost nothing given the walk now exists. Not
   built, because this run was already one unit.
3. **Is `critical` the right level for a host that has lowered its refusal
   floor?** A deployment with `refusalFloor: "high"` now refuses this *and*
   everything else at high. That composes correctly but it means the strongest
   signal the Gate has is shared. Worth a look if anyone actually lowers it.

## Test numbers

`pnpm verify` — **green**: build, typecheck, **1282 runtime tests across 91
files**, and the portal's own **484**, unchanged and untouched by this diff.
Nothing was skipped and nothing was weakened.

**41 new tests**, counted from the diff:

| file | tests | what they hold |
| --- | --- | --- |
| `src/runtime/nesting.test.ts` | 15 | the predicate and the walk — slots, depth, the nearest ancestor, `constructor` as a primitive type and as a trigger prop |
| `src/runtime/analysis.test.ts` | +7 | one case per operation kind, plus inherited-versus-introduced and the change that *removes* a nesting |
| `src/runtime/stakes.test.ts` | +3 | the factor, its level, and the detail naming every pair |
| `src/runtime/pipeline.test.ts` | +4 | end to end: refused, with both nodes named; not refused with no vocabulary; not refused for an unlinked card; refused however high the origin's ceiling |
| `src/runtime/policy-fingerprint.test.ts` | +3 | declaring a target is an edit; a changed trigger is an edit; a reordered vocabulary is not |
| `src/sdk/registry.test.ts` | +5 | the declaration survives registration; a trigger naming an undeclared prop is refused; an unenumerable schema is left alone |
| `src/sdk/interactivity.test.ts` | 4 | the derivation, and that it drives the predicate the analysis uses |

The runtime total is the whole suite on this branch. The comparable figure on
`main` is not quoted, because the only run of it this session was made before
`dist/` existed and three smoke tests reported against a build that was not
there — an honest 41-from-the-diff is worth more than a subtraction against a
number that was measuring something else.

The one number worth reading twice is the third pipeline test: an action inside
a card with no `href` still applies. That is the case a cheaper design would
have broken, and it is the reason the declaration names props rather than types.
