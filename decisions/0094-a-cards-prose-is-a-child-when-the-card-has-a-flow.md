# 0094. A card's prose is a child when the card has a flow, and a prop when it does not

**Status:** Accepted
**Date:** 2026-08-26
**Section:** §4b

## Context

Every card in this library holds a sentence, and the library has been answering
the same question about it two different ways without a rule.

- `loom.tier` holds its description as a **`loom.prose` child**, citing 0052's
  third clause — *the block's own prose becomes `text` children*.
- `loom.article` holds its excerpt as an **`excerpt` prop**, citing 0059 — *two
  or more strings that are meaningless apart stay props on one node.*

Both citations are correct, and the two records do not contradict each other:
0052 is about a *block's prose*, 0059 is about a *leaf's strings*. What is
missing is the test for which of the two a given card is, and the port map has
five more card pairs to build that will each ask it.

The cost of leaving it is not aesthetic. It is a stored-tree decision that
cannot be migrated cheaply: a sentence held as a prop and a sentence held as a
node are different trees, different deltas and different attribution, and
changing the answer after a tree ships means rewriting every instance of it.

`loom.offering` and `loom.credential`, ported in the same run, forced it. They
are the same content model to within their words — a name, a qualifier or two, a
line of copy — and the honest answer for one is not the honest answer for the
other.

## Decision

**Ask whether the card has a children flow at all. It has one exactly when its
content model has a repeated part.**

- **The card has a flow** — a list of what a plan includes, a checklist of
  outcomes, anything 0052 already turns into child nodes. Its prose is a
  `loom.prose` **child**, taking its place in that flow.
- **The card has no flow** — every field is one-per-record and `children` is
  unused. Its prose is a **prop**, which is 0059's multi-string leaf unchanged.

The reason is reachability rather than taste, and it is the granularity doc's
own argument applied one level down. A card with a flow *has somewhere for a
sentence to be a node among*. Held as a prop beside that flow, the sentence is
pinned above the list forever: "put the blurb under what's included" is a `move`
the runtime cannot emit, because one end of it is not a node. Held as a child it
is one `move`, and the card is not asked to grow a `descriptionPosition` prop
that only the person who predicted the question could have written.

A card with no flow has no such move available. There is nothing to reorder the
sentence *against*, so making it a node buys no reachability at all and costs
the things 0059 already counted — a second node per card in the projection and
in the grammar budget, and a card that can legally have three descriptions and
no name.

## Consequences

- **The two shipped cards were already right, and now they are right for a
  stated reason.** `loom.tier` has a perk list, so it has a flow, so its
  description is a node. `loom.article` has no repeated part at all — its
  `children` are literally `_unused` — so its excerpt is a prop. Nothing
  changes; the argument stops being made twice in two files.
- **The rule is checkable rather than felt.** *Does the port turn any field of
  this record into child nodes?* is a question with one answer, asked before the
  markup is written, and the answer is visible in the registry: the audit's
  leaves list is exactly the set of cards whose prose is a prop.
- **The five remaining card pairs are decided in advance**, which is what this
  record is for. `loom.book` and `loom.listing` have repeated parts (a shelf
  entry's tags, a property's features) and take their prose as children;
  `loom.episode` and `loom.event` should be read against their own Hermes shapes
  at port time rather than guessed at here.
- **It composes with 0066 rather than competing with it.** 0066 asks what the
  reader *aims at*; this asks what the author can *rearrange*. A card can be
  read-targeted with a flow, or acted-on without one.
- **A card can gain a flow later, and that is a migration.** If a future field
  of `loom.credential` turns out to be repeated content, its `note` becomes a
  node and every stored credential has to be rewritten. That is the honest cost
  and it is the same cost 0052 already carries; the mitigation is that the
  question is asked at port time, from the whole Hermes shape, rather than from
  whichever field happened to be implemented first.

## Alternatives considered

**Always a child.** Consistent, and it is what 0052's third clause says if read
without 0059 beside it. Rejected because it produces the leaf 0059 rejected: a
`loom.credential` whose name is a prop and whose one sentence is a node can be
given three sentences and no name, and the projection a model reads gains a node
per card for a rearrangement that has nothing to rearrange against.

**Always a prop.** Also consistent, and cheaper in nodes. Rejected on the
reachability argument above, which is the one the granularity doc says is not
recoverable: a tier whose description is a prop can never have it moved below
its perk list, by anyone, without a developer shipping a prop for it.

**Make it a prop with a position prop beside it** — `description` plus
`descriptionPlacement: "above" | "below"`. Rejected as the exact failure
`docs/primitive-granularity.md` names: it is a `move` smuggled into a prop bag,
it enumerates two of the arrangements someone might want, and the third one is
unreachable forever.

**Decide per card, and write the argument in the file.** What the library was
doing. It is defensible — both existing calls are correct — and it does not
scale to five more pairs written by five different runs, each of which would
re-derive it and some of which would derive it differently. The granularity doc
exists because the same reasoning applied twice is a rule that has not been
written down yet.
