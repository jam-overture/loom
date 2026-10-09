# 0246. A bound primitive's failure region is a slot over its declared sentence, and one slot serves both failure answers

**Status:** Accepted
**Date:** 2026-10-09
**Section:** §4b

## Context

A bound primitive draws one of four things depending on what its source
answered: the rows, the `empty` region when the answer is *ready and nothing*,
or a line of declared text when the source did not answer or answered with a
shape the primitive cannot draw.

Only the first three were ever addressable. The failure line was declared text
under [0060](0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md),
and `loom.feed` — the first bound primitive, 20 September — wrote down why in a
paragraph this record exists to retire:

> *"Only `empty` is a slot, and that is a limit rather than a preference.
> `auditRegistry` probes a primitive across its closed prop choices and reports
> a slot nothing ever places; it cannot supply an answer, so a region this
> places only when a source failed is a region the audit reads as dropped
> content."*

Every clause of that was true when it was written. The audit probes each
primitive under every configuration its schema closes over and reports a
declared region nothing placed; with no answer to probe with, a region drawn
only on a failure is a region that never appears, and the audit was right to
report it. [0180](0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md)
generalised the consequence into a rule about the library — *"a bound primitive
may therefore declare only the regions it places without an answer"* — and
conceded in the same breath that it was the probe and not the design.

**The probe changed on 23 September.**
[0185](0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md) made a
probe's configuration `{ props, data }` and gave `auditRegistry` an `answers`
map. Its consequences say the restriction *"no longer binds"*, and then say
exactly whose call the design is:

> *"whether a failure region becomes a slot is `Loom primitives`' call, made on
> the design rather than on what the instrument permits."*

Nobody made it, for sixteen days. Two things kept it invisible, and both are
worth stating because neither is a kind of fault a test can find.

The first is that **a discharged permission does not fail anything.** What
changed in September was what the library was *allowed* to declare. A primitive
declaring fewer regions than it may is not a defect any program can detect, so
the suite that produced the rule went on enforcing precisely what it had
enforced before — and did so honestly, because no caller ever passed `answers`.
`src/sdk/audit.test.ts` proved the mechanism against a primitive that exists
only inside that file; every audit over the real registry took one argument.

The second is that **the sentence outlived its reason and was copied.**
`loom.plate` landed on 6 October, thirteen days after the discharge, restating
the rule in the present tense with the instrument's name still in it: *"because
`auditRegistry` cannot supply one."* It was copied from `loom.feed`, where it
had been true. That is the fault 0185's alternatives section names as worse than
a false positive — *"an instrument that shapes the thing it measures, silently"*
— and the shaping did not need the instrument to still be there. A sentence
about it was enough.

## Decision

### 1. The failure region is a slot, named `unavailable`

`loom.feed`, `loom.trend`, `loom.voices` and `loom.plate` declare
`slots: ["empty", "unavailable"]`. A tree may place content in the region a
bound primitive draws when its source did not answer.

This is 0051 applied rather than widened: a failure region **is** a region the
primitive places, and the only thing that ever argued otherwise was an
instrument's reach. What it buys is the thing 0052 is argued on — reachability.
A band whose source is down currently says *"This list could not be loaded."* in
muted body text, and a page that wanted a heading, a sentence and a *contact us*
button there had no way to say so. Now it has, using the primitives the library
already has.

### 2. The slot is **over** the declared sentence, not instead of it

The region falls back to the declared text when the tree places nothing:

```ts
loom.slots["unavailable"] ?? noticeOf(loom.text.unavailable)
```

This is what makes the change additive rather than a migration. Every tree
already stored renders exactly what it rendered before, and 0060 keeps its whole
job: a deployment serving French still has two strings to replace, and a model
that has nothing to say about a failure it cannot see is not asked to invent
anything.

It also answers the objection that would otherwise sink the decision — that a
region rendered almost never is a region nobody reviews, so authored failure
copy rots unseen. True, and it is an argument against *requiring* the region,
not against offering it. A tree that does not place it has nothing to rot.

### 3. One slot serves both failure answers

`unavailable` (the source did not answer) and `mismatched` (it answered with a
shape this cannot draw) are two different facts, and the difference is **the
author's, not the reader's**. A visitor cannot observe which one happened and
has the same thing to do about either. Asking a tree for two regions would be
asking for two sets of words that no one can tell apart, and the honest result
would be the same copy pasted twice.

So the distinction stays exactly where it is useful: in what the primitive says
when the tree says nothing. The two declared sentences are unchanged, and each
failure branch falls back to its own.

### 4. `loom.tally` keeps its sentence and gains no region

It is a leaf. [0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)
settled that a leaf has no inside, and a tally is one figure rendered inline
inside a stat — there is no rectangle to put a heading and a button in, and
giving it a slot would mean giving it an interior it does not have.

### 5. The audit is handed answers, and a test asserts it needs them

`src/primitives/library.test.ts` carries a `BOUND_ANSWERS` map: three states for
each of the four region-shaped bound primitives (rows, ready-and-empty,
unavailable) and two for `loom.tally`. Decision 1 is not merely permitted by
this, it **depends** on it — without the answers the four new regions are
regions nothing places, and the audit says so correctly.

Three assertions keep it honest, and the second and third are the point:

- `unplacedSlots` is empty when the audit is given the answers.
- `unplacedSlots` names exactly those four primitives and exactly the
  `unavailable` slot when it is **not**. A fixture a suite does not need is a
  fixture that rots; this one is asserted from both sides.
- Every primitive whose `reads` is non-empty is a key in the map. The list is
  derived from the registry and compared against a map a person wrote, so a
  sixth bound primitive cannot arrive and be measured in one state unnoticed.

### 6. Every behaviour the runtime builds must have a declaring primitive

Not about bound primitives at all, and here because it is the same fault with a
different mechanism. `adjust` was built for `loom.before-after` on 1 September,
named for that primitive in
[0096](0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)'s
own Context, and sat undeclared for twenty-eight days while `FINDINGS.md`
recorded the entry asking for it as **closed**. `Loom lessons` found it by
asking the registry, in nine lines, on 29 September.

So: a member of `BEHAVIOUR_NAMES` that no registered primitive declares fails
`library.test.ts`. Asserted as full coverage rather than printed as a note,
because such a member is either a gap in this library — this lane's to fill — or
a control nothing needs, which is a deletion to propose. Both are worth a red
build, and a printed list is a thing nobody reads twice.

## Consequences

- **Four primitives gain an addressable region in a state no tree could reach.**
  The catalogue's `slots` entries change for them, which is what a model
  composing a page is told it may build (0013).
- **No stored tree changes.** The fallback is the sentence that was there, so
  every existing page renders byte-for-byte as before. Asserted under both
  starter palettes.
- **0180 is not superseded.** Its restriction was already discharged by 0185,
  which said so without superseding it either; everything else 0180 decides
  stands. This record makes the design call that discharge left open, and the
  two stale paragraphs stating the restriction as present tense are rewritten in
  `loom.feed` and `loom.plate`.
- **The audit now measures the bound primitives in the states they actually
  render.** Four of them were previously probed only in their failure state,
  under the name of the primitive — so a throw on a real row would not have been
  seen. It would be now.
- **`loom.tally` is the stated exception**, and the reason is 0242 rather than
  an instrument. If a later tally grows a rectangle, this is the record to
  revisit.
- **Two open findings close** — the 8 October entry on 0185's unexercised reach
  (items 1 and 2; item 3 is `Loom daily build`'s) and the 29 September entry on
  `adjust`, whose first two items had already landed and whose third is decision
  6 here.

## Alternatives considered

**Two slots, `unavailable` and `mismatched`.** Mirrors the two declared
sentences exactly and needs no judgement about what a reader can observe.
Rejected on what it would produce: the same copy in both regions on every page
that bothered to fill them, because the distinction is diagnostic. If a
deployment ever genuinely wants to say different things, the declared text
already does that and does it per-deployment, which is the better seam for it.

**Leave the failure line as declared text only.** The status quo, and it has a
real argument — authored copy for a state the author never sees is copy that
goes stale, and 0060's reasoning about a model having nothing to say about an
invisible failure is sound. Rejected because it answers a question about
*defaults* with a restriction on *reach*. The fallback keeps the default; what
was missing was any way to override it, and a page whose data is down is a page
with something worth saying.

**Require the region, with no fallback.** Would force every tree to confront the
failure state, which is arguably where the honesty is. Rejected: it is a
breaking change to every stored tree that binds anything, it makes a failure
region a thing a model must invent words for, and 0060 exists precisely because
those words are better owned by the primitive and replaced by a deployment.

**Derive the probe's answers from `reads`.** 0185 rejected this and the
rejection still holds — `reads` gives the *name*, which was never the hard half,
and an invented row is either one the primitive can draw (so the probe reports
on the invention) or one it cannot (so every bound primitive reports its failure
region as the only one it places). 0185 set a threshold of three bound
primitives for revisiting it and there are now five, so the question is live —
but it is `definePrimitive`'s shape and therefore `Loom daily build`'s, filed
rather than taken.

**Print the unplaced behaviours instead of failing on them.** What the 29
September finding offered as the lighter option. Rejected for the reason the
finding itself demonstrates: the gap it found was visible to anybody who ran
nine lines, and it survived twenty-eight days anyway. A note is a thing a run
reads once.
