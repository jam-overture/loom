# 0083. A scoped request sends the scope, not the page it sits on

**Status:** Accepted
**Date:** 2026-08-22
**Section:** §2

## Context

[0082](0082-a-refusal-says-what-became-of-the-repair.md)'s sibling unit built
`measurePrompt`, and the maintainer asked the question the numbers invite: **is
there a performance concern as pages get bigger?**

Measured on synthetic pages of five nodes per section, with the starter
catalogues wired:

| sections | tree | total | tree's share |
| --- | --- | --- | --- |
| 1 | 414 | 17,321 | 2% |
| 10 | 3,400 | 20,307 | 17% |
| 50 | 16,993 | 33,900 | 50% |
| 100 | 34,043 | 50,950 | 67% |
| 500 | 173,546 | 190,453 | **91%** |

**The growth itself is well-behaved.** Linear, about 68 characters a node, no
surprises. The catalogue sizes that prompted the measurement invert as pages
grow: the theme block is a fifth of a marketing page and a thirtieth of a large
one.

Two properties were already right and are worth stating so nobody "fixes" them.
The message is assembled constants-first — primitives, themes, tree, request —
so the 16,858 fixed characters form a **cacheable prefix**. And context
exhaustion is not the near-term wall; a 200k-token window is roughly two thousand
sections away.

**The problem is that the tree is the one block a cache can never hold.** It
changes with every revision, it is re-sent on every proposal, and
`buildRepairMessage` embeds `buildUserMessage` whole — so a refused-then-repaired
intent sends the entire page twice.

**And the lever that should bound it did not.** `EditIntent.scopeNodeId` says the
change is confined to a subtree. `renderTree` rendered the **whole tree** with a
`<- scope` marker against one line, so scoping a change to one card on a
five-hundred-section page still shipped all 173,546 characters — and cost
**eleven characters more** than not scoping it, for the marker and the scope
sentence. The affordance that looked like the answer was, measurably, the
opposite of it.

## Decision

**A scoped render sends the spine and the scope, and collapses everything else to
a count.**

Each ancestor from the root down to the scope contributes its own heading and
nothing else. Its other children become one line per side:

```
tree t_1 revision 0
n_7 element loom.page title="Home"
  … 1 preceding child omitted
  n_5 slot main
    n_4 element loom.card elevation=1 variant="outlined"   <- scope
      n_3 text "Body copy"
  … 1 following child omitted
```

**The spine is kept because addressing needs it.** A delta names a parent id, and
a model that cannot see the chain above the scope cannot write an operation that
lands.

**Two counts rather than one**, and this is the part that would be easy to get
wrong. The preceding count *is* the scope node's index among its siblings, which
is what an insert beside it would have to name. A single total would take that
away for one saved line.

**The elision is stated rather than silent.** A model shown a subtree with no
indication that anything was removed is being told this is the whole page, and
will propose accordingly — a heading it thinks is missing, a duplicate of
something it cannot see.

**A scope naming a node the tree does not contain renders the whole tree**, which
is what happened before there was anything to elide. It is a caller error, and
[0008](0008-the-renderer-is-a-total-pure-projection.md) does not let a total
projection throw. Scoping to the root likewise renders everything, because that
is what scoping to the root means.

## Consequences

The tree block stops growing with the page:

| sections | tree, unscoped | tree, scoped | total saved |
| --- | --- | --- | --- |
| 10 | 3,400 | 502 | 14% |
| 50 | 16,993 | 515 | 48% |
| 100 | 34,043 | 515 | 66% |
| 250 | 86,046 | 523 | 83% |
| 500 | 173,546 | **528** | **91%** |

**A scoped request is now the size of what it is allowed to touch**, whatever it
is sitting on. What remains is dominated by the constant catalogues, which is the
half a cache can hold. Both a unit test on the renderer and one on `measurePrompt`
hold this, phrased as "does not grow" rather than as a number, so neither has to
be updated when the outline changes shape.

**The saving is only available to callers that set a scope**, and nothing sets one
automatically. Deciding a scope from an utterance is a judgement about what the
user meant, which belongs to whoever is composing the intent — a portal that knows
which node a reviewer clicked has the answer for free; a bare instruction with no
selection does not, and correctly sends the page.

**A scoped prompt hash changes.** Provenance records the hash rather than the
prompt ([0028](0028-a-tree-is-auditable-only-if-its-host-can-reproduce-the-seed.md)),
so a scoped intent replayed against this version hashes differently from the same
intent before it. Nothing stored becomes unreadable; a hash comparison across the
change is simply not meaningful, which is true of any change to the prompt.

**The model sees less, and that is the point and the risk.** A change confined to
a subtree cannot draw on a sibling for consistency — "match the heading style of
the section above" is not answerable from a scoped render. That is what a scope
*means*, and a caller wanting the page in view should not set one; but it is a
real narrowing and the reason this is a record rather than a patch.

## Alternatives considered

**Leave it, and treat page size as a caching problem.** Rejected because the tree
is precisely the uncacheable part. Every other block is constant per deployment
and already ordered as a prefix; the growth is entirely in the one thing that
changes every revision.

**Render sibling headings without their subtrees.** Bounded by breadth instead of
depth, which sounds like a compromise and is not one: the marketing home page's
`main` slot is broad and shallow, so this would have kept most of the cost while
still losing the detail a model might have wanted. It also has no obvious stopping
rule — headings at which levels?

**Truncate the outline at a character budget.** Rejected outright. A budget that
cuts wherever it lands produces a tree that is silently wrong at the cut, and the
model has no way to tell a truncated page from a small one. An elision that names
what it removed is honest at any size; a truncation is not.

**Summarise the omitted siblings — types and counts by type.** Attractive and
deferred. It would let a model reason about the page it cannot see, at a cost that
grows with the number of distinct types rather than with nodes. Nothing needs it
yet, and it is additive to the line this record introduces.

**Have the runtime infer a scope when the utterance implies one.** Rejected as
belonging elsewhere. Deciding that "make this card quieter" means one card is
interpretation of the user's intent, not rendering of the tree, and a renderer
guessing at it would silently narrow what the model may propose.
