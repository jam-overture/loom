# 0044. A move relocates a subtree, and the analysis measures the subtree, not the phrasing

**Status:** Accepted
**Date:** 2026-08-08
**Section:** §2

## Context

`ChangeAnalysis` is the whole factual basis of a gating decision. The Gate is a
pure function of two axes and a policy (0002), and both axes are computed from
this record — so a fact it does not carry is a fact nobody downstream can decide
on, and a fact it states differently for the same change is a decision that
changes for no reason.

The lessons routine found the second of those while writing lesson 07, executed
it, and handed it over on #58. Under a policy declaring `loom.card` protected:

| Delta | `touchedPrimitiveTypes` | Stakes |
| --- | --- | --- |
| `remove main` | `["loom.card"]` | `critical` |
| `move card → header` | `["loom.card"]` | `high` |
| `move main → header` | `[]` | `medium` |

The last two rows are **the same physical relocation** — the card ends up under
the header either way — described by naming a different node. One of them raises
a protected-primitive factor and one of them names nothing at all, and they
differ by a whole stake level.

The same split runs through the reversibility axis. `irreversibilityReasons`
filters `touchedPrimitiveTypes` against `outOfTreeEffectTypes`, so a move that
named a live checkout was irreversible and a move that named its parent slot was
reversible.

Where this came from is worth recording, because it was not carelessness.
`tallyOperation` walks the whole subtree for `insert` and `remove` and stops at
the named node for `move` and `configure`. For `configure` that is exactly right:
configuring a parent does not reconfigure its children. For `move` it made
`touchedPrimitiveTypes` depend on which node the author chose to name — and it is
the field a rule called `protected-type-touched` reads and the field telemetry
retains.

This matters more for Loom than it would for a framework a person types into. A
delta is drafted by a model, and a model has a free choice between naming the
slot and naming the card. A Gate whose verdict moves with that choice is not
gateable in the sense the project claims: the same proposal, worded twice, gets
two answers.

## Decision

**The analysis answers the same for the same physical change, whichever node the
delta names.** Where a phrasing-independent reading forces a choice between two
answers, take the more conservative one.

Concretely, a move is measured over the subtree it carries:

- **`relocatedNodeCount`** — every node a move carried, the node it named
  included. `movedNodeCount` keeps its meaning (nodes a move operation named) and
  is now documented as such: one operation moving two hundred nodes is a fact
  that had no field.
- **`relocatedPrimitiveTypes`** — element types in the whole moved subtree.
- **`touchedPrimitiveTypes` means created, destroyed, or reconfigured**, and a
  move contributes nothing to it whichever node it names. That is one definition
  holding for all four operations rather than a different reach per operation.
- **`protected-type-relocated`**, a new stake factor at `high` — the same level
  `protected-type-touched` carries, so a directly-named move keeps the stakes it
  had and a riding-along one gains them.
- **Reversibility reads touched *and* relocated types** against
  `outOfTreeEffectTypes`. Whether relocating a live payment flow fires anything
  outside the tree is genuinely open; what is not open is that the phrasing
  should not decide it. A change wrongly called irreversible is offered for
  confirmation, and one wrongly called reversible is applied — so the tie goes to
  irreversible.

`affectedNodeIds` is deliberately left shallow, and stays documented as such. It
is the input to `broad-change`, a breadth measure, and a relocation's breadth is
its own field now.

## Consequences

- The two rows above now agree: both relocations are `high`, both name the card.
- A move of a protected primitive reports `protected-type-relocated` where it
  previously reported `protected-type-touched`. The level is unchanged, so no
  disposition changes for that case; the sentence a reviewer reads becomes true.
  **Dispositions written before this record name a factor code the Gate no longer
  emits for that shape of change** — the code is not retired, and telemetry
  written under it still means what it meant.
- A move of a subtree containing a protected primitive rises from `medium` to
  `high`, and one containing an out-of-tree-effect type becomes irreversible.
  Both are increases. A host whose ceiling sat at `medium` will now see
  confirmation requests for relocations it used to auto-apply, which is the point.
- `relocatedNodeCount` has no stakes threshold, deliberately. Stakes measure
  damage; a relocation destroys nothing, and `large-removal` exists because a
  removal does. The number is recorded because §6 keeps facts before v2 consumes
  them, and because it is the only place the size of a relocation appears at all.
- Three fields now cross into telemetry that did not before — the two new ones
  and `removedPrimitiveTypes`, whose omission the lessons routine found in the
  same pass. See 0045 for how they cross without breaking records already
  written.

## Alternatives considered

**Document it and change nothing** — the lessons routine's own recommendation:
two or three lines on `touchedPrimitiveTypes` saying a subtree riding along on a
move is not touched. It is honest, it costs nothing, and it was rejected because
it documents the wrong thing. The problem is not that the field is misnamed; it
is that two spellings of one change get two verdicts, and a comment explaining
that leaves the Gate deciding on how the model chose to phrase itself. The
lessons routine reached its recommendation from the field's *name*, and this
record reaches a different one from the *verdict*, which is the thing that has to
be defensible.

**Widen `touchedPrimitiveTypes` to include the moved subtree.** One line, and it
makes the table agree. Rejected because it makes "touched" mean created,
destroyed, reconfigured **or** relocated, and then `protected-type-touched` says
"touches protected loom.card" for a card nothing wrote to. It also collapses a
distinction telemetry has to keep: a corpus asking how often the runtime rewrites
protected primitives would count relocations among them for ever, with no field
to separate them again.

**Make `affectedNodeIds` subtree-wide for moves too.** Consistent-looking, and
rejected: it is the input to `broad-change`, so every move of a subtree over the
breadth threshold would become a broad change, and the field is documented as
directly-touched nodes. Breadth of relocation is a different question from
breadth of rewriting, and it now has its own number to be asked with.

**A `large-relocation` stake factor with its own threshold.** Symmetry with
`large-removal`, and rejected for now: a relocation is fully reversible and
destroys nothing, so it is not damage in the sense stakes measure. If a host ever
demonstrates that moving enough of a page is dangerous on size alone, the field
is already recorded and the factor is a small addition.
