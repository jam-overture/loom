# 0061. A suffix that names the markup earns its place; a suffix that names the parent does not

**Status:** Accepted — partially supersedes 0054
**Date:** 2026-08-16
**Section:** §4b

## Context

[0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) settled
container/child naming with three consequences, and the first of them is
absolute:

> **No `-item` suffix, ever.** `-item` says "this is part of a list", which the
> parent already says and the tree already shows.

The pricing band shipped on 16 August under that rule: `loom.perk-list` over
`loom.perk`, where `loom.perk` renders an `<li>`. The maintainer's review of
that PR asked for something the rule forbids:

> *"For `loom.perk`, I think it is more a matter for an incorrectly named
> primitive. It actually should be a `perk-list-item`. This is more
> semantically correct as it is indeed a perk but was designed to be used in
> the context of a list…so hence a list item. Now this opens up the use of a
> `loom.perk` which may be a stand alone perk div."*

That is a naming instruction with a design argument inside it, and the argument
is not the one 0054 rejected. 0054 was defending against a suffix that carries
**no information** — `faq-item` tells a reader only that a `faq-item` goes
inside a `faq`, which the tree shows and the parent's name says. The suffix
proposed here carries a different fact: **`loom.perk-list-item` renders an
`<li>`, and `loom.perk` renders a `<div>`.** That is not membership. It is the
element, and no other part of the tree states it.

Underneath the naming is a defect the rename exposes. The library shipped one
primitive for two jobs. A perk is wanted in a checklist inside a pricing tier,
and it is *also* wanted standing alone — the reassurance under a call to action
("✓ No card required"), a qualifier beside a price, a single line in a split's
column. Shipped as an `<li>`, every standalone use emits a list item in no list.
The PR called that a "soft coupling" and asked whether it was worth it; the
maintainer's answer is that it is not a coupling to accept, it is two
primitives.

## Decision

**A suffix is permitted when it names the markup the primitive emits, and
forbidden when it only names where the primitive sits.**

Concretely, and replacing **0054's first consequence** — *"No `-item` suffix,
ever"* — and only that one:

```
loom.perk-list  over  loom.perk-list-item   (a <ul> over its <li>)
loom.perk                                    (the same content, a <div>, standing alone)
```

- **`-item` is not banned outright; it is banned as a filler.** `loom.faq-item`
  would still be wrong, because `loom.faq` renders a `<details>` whether or not
  a list is around it and the suffix would add nothing. `loom.perk-list-item`
  is right, because `<li>` and `<div>` are a real fork and the name is where a
  model learns which one it is getting.
- **The test is whether the suffix changes what is rendered.** If dropping it
  would name a primitive that emits the same element, the suffix is filler. If
  dropping it names a *different registered primitive* with different markup,
  the suffix is doing the work a name exists to do.
- **0054's other two consequences stand unchanged.** A container is still never
  a bare plural, and the arrangement word is still drawn from the small
  descriptive set. This record touches only the first.

**The cost is that 0054's stem rule stops uniquely identifying a pair.**
Stripping `-list` off `loom.perk-list` names `loom.perk`, which is now the
standalone `<div>` rather than the container's child. A model that guesses the
pair from the container's name gets a registered primitive that renders — and
renders a `<div>` where an `<li>` belonged. That is the honest price of this
record and the strongest argument against it. It is bounded by both names being
in the catalogue with one line each saying where each goes, which is the same
mechanism every other choice between two primitives relies on.

## Consequences

- **`loom.perk` as shipped on 16 August is renamed to `loom.perk-list-item`,
  and `loom.perk` is a new primitive.** A rename is a breaking change to any
  stored tree, which 0054 already noted about itself. **The blast radius here is
  zero**: `loom.perk` reached `main` in #75 hours before this record, no demo
  tree, portal fixture or `apps/` code references it, and the only trees that
  contain one are the library's own test fixtures.
- **The content model is shared, not copied.** `perk-content.ts` holds the Zod
  schema, the three markers and the row's layout; both primitives are a root
  element around it. A fourth state cannot be added to one and forgotten in the
  other, which is the failure two near-identical modules invite.
- **The library gains its first pair that is two markups of one content model.**
  It will not be the last — a nav link and a footer link, a `<dt>`/`<dd>` and a
  standalone term, a table cell and a card — so the rule is worth having before
  the second one arrives rather than after.
- **`auditRegistry`'s leaf list grows by one** and both are leaves, which is
  what a probe should say about two primitives that hold their copy in props.
- If this record is **rejected**, the revert is one commit: delete
  `loom.perk.ts`, rename `loom.perk-list-item.ts` back, and inline
  `perk-content.ts` into it. Nothing else in the library depends on the split.

## Alternatives considered

**Keep 0054 as written and refuse the rename.** The record is `Accepted`, the
governance says a contradiction is an escalation, and a routine overturning a
naming rule on its own would be exactly what that rule exists to prevent. It is
the reason this record was written `Proposed`, with 0054 left standing, and the
rename shipped in #81 while the record waited — the maintainer accepted it on 17
August. What refusing could not do is answer the defect underneath: one
primitive would still be doing two jobs, and the standalone use would still emit
an `<li>` in no list.

**Rename, and keep one primitive.** `loom.perk-list-item` alone, with
standalone use simply unsupported. Cheaper by one primitive and one module, and
it loses the thing the maintainer's note actually opens up — "✓ No card
required" under a hero button is a real line on a real page and there is nowhere
else in the library to put it.

**One primitive with an `element` or `standalone` prop.** A prop that switches
`<li>` to `<div>`. It reads as economical and it is a prop that decides what is
rendered, which 0052 permits. Rejected because the choice is not the tree's to
make on content grounds — it is determined entirely by the parent, so a model
setting it wrongly produces invalid markup that renders fine and fails silently.
A name a model picks once beats a prop it can get wrong.

**Name the pair for the markup on both sides** — `loom.perk-list` over
`loom.perk-list-item`, and the standalone as `loom.perk-line` or `loom.perk-note`.
It would keep 0054's stem rule true, since stripping `-list` would name nothing
registered. Rejected because the standalone is the *plain* case and deserves the
plain name; a reader meeting `loom.perk-line` would reasonably ask what a perk
without a line is.

**Defer until the marketing site needs a standalone perk.** The library would
stay consistent with 0054 and the rename would happen once, later, with real
usage behind it. Rejected on timing rather than principle: `loom.perk` is hours
old and unreferenced, and every day it stays is a day a stored tree could
acquire one and make the rename cost something.
