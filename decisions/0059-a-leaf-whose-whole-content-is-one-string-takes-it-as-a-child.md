# 0059. A leaf whose whole content is one string takes it as a child

**Status:** Accepted
**Date:** 2026-08-16
**Section:** §4b

## Context

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) sorts a
Hermes block's contents into three piles: repeated content becomes child nodes,
fixed fields stay props, and *the block's own prose* becomes `text` children.
The first two piles are unambiguous. The third one names `loom.heading` and
`loom.prose` as its examples, and both are obviously prose — a paragraph, a
title, something a reader would edit as writing.

The library has quietly been sorting a fourth kind of thing for a while without
a rule for it: a leaf whose entire content is **one short string that nobody
would call prose**. `loom.action` takes its label as child text. `loom.badge`,
added this run, takes its label the same way. Meanwhile `loom.stat` holds
`value` and `label` as props and `loom.feature` holds `title` and `body` as
props, and each of those modules argues its own case in a comment.

Four primitives reaching the same shape by four separate arguments is how the
next fifty get it wrong. The remaining port is full of this case — a chip, a
tag, a nav link, a breadcrumb, a `kbd`, a step label — and each one is a stored
tree that cannot be migrated cheaply once it ships. The question is worth
answering once.

## Decision

**Count the strings that make up the node's content. One is a child; two or
more are props.**

- **Exactly one string, and it is the whole of what the node says** — the label
  of a `loom.action`, the text of a `loom.badge`. It is a `text` child.
- **Two or more strings that are meaningless apart** — a stat's `value` and
  `label`, a feature's `title` and `body`, a quote's `quote` and `author`, a
  tier's `name` and `price`. They stay props on one node.

The line is not about how literary the string is. It is about whether the node
has an *interior* at all. A badge with its label removed is not a badge with a
gap in it; it is nothing. A stat with its label removed is a number floating on
a page, which is a tree that renders and says nothing — the failure 0052
rejected "decompose everything" to avoid.

Three properties fall out, and they are the reason to prefer the child:

- **Re-authoring is a text edit.** Changing "Start free" to "Try it free" is a
  `configure` on a `text` node, which the analysis reports as a change to that
  string and nothing else. As a prop it is a `configure` on the leaf, carrying
  every other field of the leaf along with it — and for a one-string leaf that
  happens to be the same thing, which is exactly why the cheaper shape is free.
- **The string is attributable.** `attribution.ts` walks the log to say who
  placed each *node*; a label that is a node has an author, and a label that is
  a prop belongs to whoever last touched the leaf.
- **A leaf and a container answer the same way.** `loom.action` inside a hero's
  `actions` region and `loom.prose` inside its body are both "a node whose
  children are its words", so a model composing a page does not have to
  remember which small primitives are the exception.

**Multi-string leaves do not get regions instead.** A slot is for a place the
primitive treats differently ([0051](0051-a-slot-is-a-region-the-primitive-places.md)),
and a stat's value and label are not two regions — they are one record with two
fields. Reaching for slots here would produce a stat that could legally have
three labels and no value, which is 0052's argument against decomposing fixed
fields, wearing a different hat.

## Consequences

- The four primitives that already made this call — `loom.action`,
  `loom.badge`, against `loom.stat` and `loom.feature` — are consistent with the
  rule and need no change. The rule is written from them rather than imposed on
  them.
- The remaining port has one fewer judgement per leaf. A `loom.kbd`, a
  `loom.tag` and a `loom.step` label are children; a `loom.avatar`'s `src` and
  `alt` are props, as are a `loom.perk`'s `label` and `note`.
- **Node counts rise slightly.** Every action and badge on a page is two nodes
  rather than one. That is the same cost 0052 already accepted and the same
  bound applies — [0014](0014-the-reply-schema-must-fit-a-grammar-budget.md)'s
  grammar budget — and one extra `text` node per button is well inside it.
- A one-string leaf still declares a props schema, so this is not "leaves have
  no props". `loom.badge` has `tone` and `loom.action` has `href`, `variant`,
  `scale` and `external`: the *content* is a child and the *treatment* is props,
  which is the same split every other primitive in the library makes.
- **`loom.perk` is the case that shows the rule bites.** It looks like a
  one-string leaf and is not: `label` and `note` are two strings, and a note
  that outlived its claim would be a valid tree saying nothing. It keeps props,
  and the count is what decided it rather than the fact that a perk is short.

## Alternatives considered

**Every leaf holds its copy in props.** The tidier rule, and what `loom.stat`
and `loom.feature` would suggest read alone. It makes a button's label the one
piece of visible copy on a page that a reviewer cannot see as its own change,
and it puts `loom.action` and `loom.prose` — two nodes that are both "a
sentence" from the reader's point of view — on opposite sides of a line the
reader cannot see.

**Every leaf holds its copy as children.** Symmetrical, and it is 0052's
rejected "decompose everything" reappearing one level down. A stat as a node
with two anonymous text children cannot say which one is the number, so the
constraint that a stat has exactly one value moves out of the schema
([0011](0011-a-primitive-declares-its-props-and-the-seam-enforces-them.md)) and
into a convention about child order that every `move` can break.

**Decide per primitive, as the library has been doing.** It produced four
correct answers and four separate arguments, which is not a rule — it is four
precedents that the fiftieth port will have to read and weigh. The same
objection 0054 made to naming each pair well.

**A `contentProp` declaration on the definition** — let a primitive name which
of its props is "the copy", so tooling can offer a text edit either way. More
machinery than the problem needs, and it does not actually answer the question:
the tree still has to store the string somewhere, and this record is about
where.
