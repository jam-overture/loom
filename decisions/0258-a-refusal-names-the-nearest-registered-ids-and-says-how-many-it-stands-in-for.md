# 0258 — A refusal names the nearest registered ids and says how many it stands in for

**Status:** Accepted
**Date:** 2026-10-11
**Section:** §3 (render seam), §4 (data and submission seams)

> **Renumbered on 2026-10-11**, from 0256, when this branch (#578) was merged.
> `main` had meanwhile accepted a different 0256 — *a kind's share of the readers
> who met it is a weighted mean of sound shares* (#576) — and two records sharing
> a number is fatal (0097). 0257 went to the other record on that same branch, so
> 0258 was the next free number. Nothing in this record changed but its number;
> the references to it on this branch were updated with it.

## Context

Three seams refuse an id a tree named and nothing registered, and all three
answer the same way: by listing what *is* registered.

| seam | where | what it lists |
| --- | --- | --- |
| theme | `describeThemeError` | every palette, font pack or style preset |
| data | `resolveDataPlan`, through `no-such-source` | every source id |
| submit | `resolveSubmissionPlan`, through `no-such-endpoint` | every endpoint id |

The instinct behind all three is right.
[0008](0008-the-renderer-is-a-total-pure-projection.md) makes a fault something
the render *records* rather than throws, so somebody reads it later with nothing
to go on but the sentence — and this is the one family of faults where the right
answer is almost always one of a short list. Printing the list is how a reader
learns what they should have written.

The list is the wrong shape for it, and `Loom docs` measured that on 10 October
while printing a real instance of each of the twenty-four render diagnostics for
*What a render reports*. Laid out together, the unresolved-theme sentence was
**284 characters against a median of 144**, and **172 of them were the list** at
this repository's twenty-one starter palettes. The filing's argument is the part
that matters: twenty-one is not a number this runtime sets. A deployment with a
palette per brand has as many as it has brands, and the sentence is then a
paragraph in every log line and every diagnostic panel that prints it.

**The filing says it is the only sentence in the union whose length is a
deployment's to set, and that is where it is wrong.** The measurement was of one
real instance per code, and `data-unavailable` has seven reasons of which the
sampled one was not `no-such-source`. Measured on this branch, with ten sources
of ordinary dotted names — fewer entries than the theme registry has — the data
sentence came to **215 characters** and the submission sentence to **202**. A
source id is a dotted name rather than a word, so the data seam was the worse of
the three per entry and nobody had looked at it.

So this is a property of a *kind* of refusal rather than of the theme registry,
and the three were already drifting: two spell the clause `registered:` and one
`Registered:`, and each had its own `|| "none"`.

## Decision

**A refusal names the few registered ids nearest the one that was asked for, and
says how many it is standing in for.** One module, `src/registered.ts`, owns it,
and the three seams call it.

```
No palette "sunset". Registered: slate, sage, linen, dusk, paper (nearest 5 of 21).
```

Three parts, each load-bearing:

1. **Nearest, not first.** The reason to print the registry at all is that the
   right answer is probably in it; the first five in registration order bear no
   relation to what somebody meant to type. Ranking is by edit distance, with
   containment checked ahead of it — `cat` is fifteen edits from
   `catalogue.services` and nine from `crm.contacts`, so distance alone answers a
   half-typed name with the wrong part of the registry. Registration order is
   the tie-break.
2. **Capped at five.** Five ids of ordinary length is about fifty characters,
   which keeps the clause the smaller half of a sentence it had been the larger
   half of.
3. **With the count.** `(nearest 5 of 21)` rather than five names alone, because
   five names and nothing else read as the first five somebody registered, and a
   reader who believed that would go looking in the wrong place.

Two boundaries, and both were settled by a test in another lane rather than by
argument in this one.

**A list that fits is printed whole, with no count after it, and "fits" is one
more than the cap.** Hiding a single id costs more than showing it:
`(nearest 5 of 6)` is seventeen characters to withhold a name worth about
twelve. Measured on the six sources lesson 18 registers, capping at five saved
**one character** and lost a name. The cap exists to bound the clause, so it
gives way where it would not.

**A whole list keeps the order it was registered in; only a capped one is
ranked.** The first draft ranked unconditionally, on the argument that it costs
nothing and still puts the likely intent first. That argument is wrong in a way
three lesson transcripts made visible: ranking is how the few are *chosen*, and
where nothing is chosen it buys nothing, costs the host its own order, and makes
the same registry print differently for every id somebody mistyped — output two
refusals cannot be compared across.

**What is bounded is the sentence and nothing else.** Every refusal still
carries its complete list where a caller reads it — `ThemeError.available` is
unchanged — and every registry still publishes its whole catalogue. That is what
makes the cap cost nothing, and it is the half that the filing's framing of
*completeness versus helpfulness* does not have: the completeness lives in the
data, where a panel can page through it, and the sentence has the narrower job.

## Consequences

The three sentences, produced rather than quoted, measured by
`src/registered.specimen.ts` against this branch and against `main`:

| seam | before | after |
| --- | --- | --- |
| theme, 21 palettes | 276 | 166 |
| data, 10 sources | 215 | 153 |
| submit, 9 endpoints | 202 | 146 |
| **the three together** | **693** | **465** |

And the property the numbers are for: **the after column does not move when the
registry grows.** A host with a hundred palettes pays what this repository's
twenty-one pay.

`describeRegistered` and `nearestRegistered` are internal. They are not on
`src/index.ts`, because nothing outside asks for them yet and a published helper
is a promise to keep; a surface that wants to offer *did you mean* in its own UI
is the finding that would change that.

The ranking is over spelling and claims no more. Nothing in `sunset` says it and
`ember` are both warm, so a reader who typed a palette name from imagination
gets five plausible ids and a count rather than a correction — which is why the
clause says *nearest* rather than *did you mean*.

One existing assertion changed. `theme.test.ts` asserted the sentence contained
`editorial`, which was true because the sentence held all twenty-one; `editorial`
is not among the nearest five to `chartreuse`. It now asserts what it meant —
the id that was refused, the count, and a bound on the length — and a second test
asserts that the refusal still carries all twenty-one, which is the property that
makes the first one safe.

## Alternatives considered

**Leave it; a log line is allowed to be long.** The filing names this and it is a
real position. Refused because the length is unbounded rather than merely long:
the argument that 284 characters is acceptable says nothing about the deployment
where it is 2,000, and nothing in the runtime stood between those two.

**Cap without ranking** — the first five and *and sixteen others*. Half the fix
for the same characters. The cap is what bounds the sentence; the ranking is what
makes the five worth reading, and without it the clause is a bounded list of
things the reader almost certainly did not mean.

**Rank unconditionally**, including lists printed whole. This was the first
draft and it shipped as far as the merge gate, which refused it: see the second
boundary above.

**Rank without capping.** Puts the likely answer first and leaves the length
exactly where it was.

**Drop the list and name only the count** — *"21 palettes are registered"*.
Shortest, and it removes the thing the clause exists for. A reader who has to go
and look the ids up has been handed a fact rather than an answer.

**Carry the full list on `DataUnavailable` and `SubmissionUnavailable`**, as
`ThemeError` already does, so those two seams lose nothing to the cap either.
Not taken here: both are flat `{ reason, detail }` shapes shared across every
reason either seam has, and widening a published type to hold a field that one
reason in seven uses is a larger change than this one. It costs nothing today
because a caller holding the registry can ask it for `sources` or `endpoints`
directly, which is where the complete list has always been.

**A shared `describeRegistryRefusal` covering the whole sentence**, not just the
clause. Refused: the three prose frames are different on purpose — a palette is
named by the tree's root, a source by a binding, an endpoint by a form — and
folding them would make one sentence that fits none of the three.
