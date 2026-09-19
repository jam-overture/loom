# 0170. A library is a set to choose from, and a vocabulary is priced per entry

**Status:** Accepted
**Date:** 2026-09-18
**Section:** §4 — Framework SDK, measured through the §2 interpretation prompt

## Context

The maintainer's target is 250 starter primitives, with the instruction that
*"if increasing the number of primitives is producing a scaling issue with the
framework itself, we will have to figure this out."* `Loom primitives` measured
it on 13 September and filed what it found.

Measured again today, on `main`, with the starter registry and the starter
themes:

| block | characters per request | guarded |
| --- | --- | --- |
| system prompt | 2,816 | constant, and cacheable |
| themes (21 palettes, 20 packs, 10 presets) | 6,155 | **yes — under 8,000** |
| primitives (96 entries) | **16,718** | **no** |

The primitives block is 65% of a request before the tree arrives, it grows at
about 171 characters per entry, and nothing looks at it. At 250 entries it is
roughly 43,000 characters — about 11k tokens on every interpretation request,
cache or no cache.

**The asymmetry is what was filed.** The smaller block has a ceiling and the
larger one does not, and that is not a decision anybody made:
`prompt.test.ts`'s budget was written when the catalogue was 51 entries and it
measures `themes`, so it never fired as the library grew on the other axis.

The obvious fix — the same ceiling over `primitives` — is the wrong one, and
working out why is what this record is for. That ceiling would fire on exactly
the growth the library is being grown for. A red `pnpm verify` is now the merge
gate for four surfaces, so it would fire as a build failure in five lanes that
did not cause it, and it would be raised without being read. A ceiling nobody
believes is worse than no ceiling: it teaches every lane that a budget is a
number you edit.

The finding also states the thing that dissolves the problem, and states it as
an aside:

> **The starter library is a set to choose from, not a set every deployment
> ships.**

That is true, and nothing in the package acted as though it were.
`createStarterPrimitiveRegistry(additional)` only *adds*. A deployment wanting
sixty of the ninety-six had one move available, which was to filter the exported
array on its type strings — the pattern-match
[0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
was written to end, and a filter fails silently besides: a name nothing carries
yields a smaller registry and says nothing.

## Decision

**The size of a vocabulary is a deployment's choice. The price of one entry is
this package's.** Two changes follow, and one thing is deliberately not built.

**`selectPrimitives(entries, types)`** — the inverse of `additional`, in
`@loom/runtime/sdk`. It returns the named entries in the library's own order, or
refuses, naming **every** type the library does not carry rather than the first.
A name given twice selects one entry, because the result is a subset and because
a registry refuses a duplicate type — a selection that passed a repetition
through would turn a harmless one in a host's list into a refusal two calls
later.

It takes entries rather than reaching into `@loom/runtime/primitives`, so it
slices any library, including one a deployment wrote itself.

**`measureCatalogue(catalogue)`** — in the prompt seam, beside `measurePrompt`,
so the price is taken from the block that is actually sent. It reports the whole
block, the cost of each entry, and the mean. An entry's cost is its rendered line
and the newline that ends it, taken through `renderCatalogue`, for the reason
`UserMessageParts` exists: a second way of working out what an entry looks like
is a second thing to keep in step.

**The ceiling goes on `perEntry`, not on the block.** 200 characters, about 17%
above today's 171. It does not move when the library grows and it does move when
an entry gets more expensive, which is the half that goes wrong without anybody
choosing it — a description that has grown past the one line it is meant to be,
or a primitive declaring more props than a model needs shown. A second guard
holds the instruction wrapped around the list under 500 characters, because that
part is paid by every deployment whatever it registered.

**No absolute budget constant is exported.** What a vocabulary may cost is a
judgment about the model a deployment sends to and the latency it will accept.
A number shipped from here would be a guess about both, and a guess with a
ceiling's authority.

## Consequences

A host that finds its requests expensive has a number per entry and a way to
spend less, and neither existed this morning:

```ts
const chosen = selectPrimitives(STARTER_PRIMITIVES, ["loom.page", "loom.section", …])
if (!chosen.ok) throw new Error(describeSelectionError(chosen.error))

const registry = createPrimitiveRegistry(chosen.value)
```

The starter library can grow to 250 and past it without this repository's build
going red for it, which is what the maintainer asked for. What it cannot do is
get quietly more expensive per entry.

The *count* of registered primitives is now the only unguarded term in the
request, and that is on purpose: it is the term a deployment sets.

What this does not do is help a deployment **choose** the sixty. Choosing is by
name today, which means reading the library. Narrowing by what a primitive *is*
needs a vocabulary for that — the filed finding proposes `band`, `item`, `leaf`,
`wrapper`, `control` as members of `PrimitiveRole`, and that is left open below.

## Alternatives considered

**A ceiling on the primitives block, matching the themes one.** The finding's
first suggestion and the smallest diff. Rejected on what firing would mean: the
block grows because the library grows, the library is being grown on the
maintainer's instruction, and the ceiling would stop four other surfaces'
builds on the way. It would be raised every time it fired, and a budget that is
always raised is documentation with a test's cost.

**A budget a host passes in, checked by the runtime —
`catalogueFits(cost, budget)`.** Rejected for now as a predicate with nothing in
it: it is `cost.characters > budget`, written on the caller's side of a
comparison the caller already has both sides of. Worth adding the day something
in this package would *act* on the answer, and not before.

**Widen `PrimitiveRole` with `band`, `item`, `leaf`, `wrapper`, `control`, and
select by role.** The finding's third piece, and the one it explicitly declined
to decide. Rejected here too, for a reason of sequence rather than of merit:
`PrimitiveRole` has one member because
[0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
set the bar at *a consumer that cannot answer its question from the registry*,
and five new members would be five declarations that 96 starter primitives do
not carry — written in `src/primitives/`, which is another lane's. A vocabulary
landed on one lane's side of a boundary and declared on nobody's is a vocabulary
that answers `[]` to every question for as long as that lasts. Selecting by name
works today and is not in its way; the role vocabulary is filed for the lane that
would have to declare it.

**Narrow the catalogue per request, sending the model only the primitives an
intent might need.** Rejected, and the finding is right that it is the risky
version: it means knowing what an intent needs before the model has chosen,
which is a retrieval step with a failure mode of its own — the primitive that
was right and was not sent. Narrowing per deployment has no such mode and is
most of the benefit.

**Shorten the rendered line — drop descriptions, or the prop list.** Rejected.
The description is the only thing telling a model what a primitive is *for*, and
the prop names are what stop it inventing them; both are what the block is. The
cost per entry is low and the count is what is large.

**Leave `createStarterPrimitiveRegistry` to grow a second parameter.** Rejected
on the lane boundary rather than on the design: that factory is in
`src/primitives/`. `selectPrimitives` composes with it from outside and works on
any library, and a convenience wrapper over the starter set remains open to the
lane that owns it.
