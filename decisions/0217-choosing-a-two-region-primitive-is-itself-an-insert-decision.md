# 0217. Choosing a two-region primitive is itself an insert decision

**Status:** Accepted
**Date:** 2026-10-03
**Section:** §4b

## Context

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) and
[`docs/primitive-granularity.md`](../docs/primitive-granularity.md) settle the
question for **props**: a prop that decides how many children exist is
`insert`/`remove` smuggled into a prop bag, and the test is *does changing this
prop change the set of nodes?*

Both are written about props, and both are silent about the identical mistake one
level up. A composition that holds two things side by side picks a container, and
two of the library's containers draw the same picture:

```ts
loom.split   // slots: ["start", "end"]  — exactly two regions
loom.grid    // children, columns: a floor fed to auto-fit
```

At the width either is photographed at, the two are indistinguishable. What
differs is what can happen next. `loom.split`'s regions are slots, and
[0051](0051-a-slot-is-a-region-the-primitive-places.md) makes a slot *a region the
primitive places, at a position no reordering of `children` can reach* — so the
count of regions belongs to the primitive. There are two, there will always be
two, and **a third child is an `insert` with nowhere to land**.

This was found by building `team-leads`, whose first draft put two foregrounded
people in a `loom.split`. The band renders identically either way. What the split
costs is that a deployment promoting a third person cannot say so, by any
operation, ever — which is the wall the granularity doc describes as invisible
until somebody hits it, reached without a single prop being involved.

The near-miss is sharp because the reasoning that leads to `loom.split` is good
reasoning. There are two leads; a primitive that holds exactly two things is a
closer fit for *two leads* than a grid that would hold forty; and picking the
tighter type is ordinarily right. It is wrong here for the reason 0052 is about,
and nothing said so.

## Decision

**Choosing a container that fixes the number of regions is an `insert`/`remove`
decision, and it is weighed on the same test as a prop.**

The question is not *which primitive fits what I am building today*. It is:

> **Is the count fixed by the content, or only by my content?**

A fixed-region primitive is correct when the count is a fact about the *kind of
thing*, and wrong when it is a fact about the instance. Concretely, for the two
containers above:

| | |
| --- | --- |
| the regions hold **different kinds of thing**, and a third kind is not a thing this band is made of | `loom.split` — the count is the content's |
| the regions hold **the same kind of thing**, n of them | a container that takes children — the count is the deployment's |

Two bands shipped the same day are the pair to read:

- **`credentials-posture`** puts an argument in `start` and a column of
  certifications in `end`. A compliance band is an argument and its evidence;
  there is no third thing it is made of, and swapping the two is already
  `reverse: true`. The split is right.
- **`team-leads`** puts two people side by side. A company that promotes somebody
  has three, and that is an ordinary edit. The split is wrong, and
  `loom.grid` at a two-column floor draws the identical pair.

**Where both readings are genuinely defensible, take the container that accepts
children**, for the granularity doc's own reason: over-decomposing costs tedium
and under-decomposing costs reachability, and only one of those is recoverable.

This changes no primitive and no schema. `loom.split` is unchanged and remains
the right answer wherever the first row applies — the point is that the choice
is now made on a stated test rather than on which type reads tighter.

## Consequences

- A composition author has one question to ask before picking a container, and it
  is the question 0052 already asks about props.
- The mistake is **catchable**, which it was not before. A test asserting that
  the repeated things in a band share one parent that takes children goes red
  when somebody reaches for a fixed-region primitive —
  `compositions.test.ts` holds that for `team-leads`.
- A band whose regions are genuinely two kinds of thing is unaffected, and saying
  so in its doc comment is now a claim with a test behind it rather than taste.
- It says nothing about primitives with fixed regions in general. A `loom.card`'s
  `media` and `footer`, a `loom.lightbox`'s `preview` and `full`, a
  `loom.credential`'s `mark` and `meta` are all regions of *different kinds*, and
  are exactly the first row.

## Alternatives considered

**Leave it to the granularity doc.** The doc's test is written about props and its
whole framing — *"read each prop and ask which of the four operations it is
impersonating"* — points a reader at a prop bag. A run that has no suspicious
prop reads it, agrees with it, and picks the split anyway. That is what happened.

**Make `loom.split` take children and place the first two.** It would remove the
trap by removing the primitive's own claim, and it would be a worse primitive: the
regions would stop being addressable by name, a band could no longer say *the
argument* and *the evidence*, and `reverse` would stop meaning anything. 0051's
regions are worth keeping; what was missing was the rule for when to want them.

**A lint over the catalogue — refuse a slot holding a node type that appears in
the sibling slot.** It would have caught `team-leads` and would also refuse a
legitimate band whose two regions happen to hold the same primitive for different
reasons. The property is about what the *content* fixes, which no walk of the tree
can see, so the judgement belongs with the author and the test belongs per band.
