# 0084. In a two-dimensional band, rows are nodes and columns are positions

**Status:** Accepted
**Date:** 2026-08-22
**Section:** §4b

## Context

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) settles
what happens to repeated content: it becomes child nodes. Every band ported so
far has had exactly one axis of it — features across a grid, tiers across a row,
milestones down a rail — so the rule applied once and there was nothing to
decide.

A comparison table has two. Its criteria repeat down the side and its subjects
repeat across the top, and every intersection is content in its own right.
Reading 0052 literally on both axes at once does not produce an answer, because
a tree is a tree: one of the two has to be the axis that gets nodes, and the
other one gets whatever is left.

The question is not academic, because it decides what a delta can say. If
subjects are nodes, "add a fourth plan" is one `insert` and "add a criterion" is
a change to every subject. If criteria are nodes, it is the other way round. And
whichever axis loses has no node anywhere in the tree to carry a prop, so
anything scoped to it — *tint the column we are steering people towards* — has
nowhere to live at all.

This is the last of the seven Hermes pairs whose shape was genuinely open, and
the one the port map flagged as needing a record of its own.

## Decision

**Rows are nodes. Columns are positions.**

A `loom.comparison-table` holds one `loom.comparison-row` per criterion, and
each row holds one `loom.comparison` per subject. The subjects' own names are a
row too — a `loom.comparison-row` of `role: "subject"` cells, placed in the
table's `columns` region and rendered into `<thead>`.

Three things follow, and they are the decision rather than consequences of it:

**A column-scoped decision belongs to the container.** There is no node that is
"the second column", so `feature` is a prop on the table naming an *ordinal*,
and the tint is a static rule keyed on `nth-child` in the library stylesheet. It
is not an `emphasis` on each cell of that column, because that is one decision
stored five times with nothing keeping the copies in step.

**The ordinal is enumerated, not interpolated.** `feature` accepts `first`
through `fourth` and each is a class with its own rule already written.
[0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) is why: the
stylesheet is static text with no prop and no theme reaching it, and a column
index interpolated into a selector would be the first value in that file a
proposal could choose. Four is where a comparison stops being readable anyway.

**Adding a subject is a change to every row, and the delta model should say so.**
It is one `insert` per row plus one in the header, not a single operation. That
is not a defect to design around — it is what actually changes on the page, and
a shape that made it look like one small edit would be lying to the Gate that
weighs it.

## Why rows rather than columns

Three reasons, and the third is the one that would have decided it alone.

- **HTML's table model is row-major.** `<tr>` is a real element and "column" is
  not; a column exists only as the *n*th cell of each row. Choosing columns as
  the node axis would mean a tree whose shape had to be transposed before it
  could be rendered as a table, and the render is a pure function of one node
  ([0008](0008-the-renderer-is-a-total-pure-projection.md)) — nothing in it can
  see across siblings to do the transposing.
- **A reader arrives row-first.** A criterion is a question and the subjects are
  answers to it, which is how the band is read aloud and how it is scanned.
- **Only row-major markup can be navigated.** `<th scope="col">` and
  `<th scope="row">` are what make the fifteenth cell announce *Reversible, Code
  generation, No* rather than *No*. A grid of `<div>`s, or a table built from
  columns, cannot say it at any price — and a comparison table nobody can read
  back is the one band where the markup *is* the feature.

## Consequences

- **The pair is a trio.** `loom.comparison-table`, `loom.comparison-row` and
  `loom.comparison` — the singular being one subject measured against one
  criterion, which is what the word means.
  [0054](0054-a-container-is-its-childs-name-plus-the-arrangement.md) is
  satisfied without amendment: two arrangements over one singular, a row of
  comparisons and a table of them, exactly as `loom.faq-list` sits over
  `loom.faq`. Nothing about 0054 needs to change to describe a band three levels
  deep, which is worth knowing before the next one.
- **A five-subject comparison cannot feature its fifth column.** Named, bounded,
  and stated in the schema rather than discovered.
- **The band costs more nodes than any other.** Five criteria across three
  subjects is one table, six rows and eighteen cells. That is the honest count
  for a structure with two axes, and it is the reason
  [`primitive-granularity.md`](../docs/primitive-granularity.md)'s bound on
  decomposition matters here more than anywhere: the answer to a *wider* table
  is fewer subjects, not a props bag.
- **A column-scoped decision that is not a tint would need a new prop and a new
  rule.** There is deliberately no general mechanism. If a second one ever
  arrives, it is the same shape — an ordinal on the container, a static rule per
  position — and the third one is the point at which this should be revisited.

## Alternatives considered

**Columns as nodes — `loom.comparison-column` holding its own cells.** It makes
"add a subject" one `insert`, which is the operation a pricing page most often
wants, and it is how `loom.tier-table` already works. Rejected because it is not
a table: the criteria in adjacent columns line up only by accident of equal
content height, there is no `scope` to give any cell, and the band's whole claim
— that you can enter it from either edge — stops being true. `loom.tier-table`
is the right primitive for a page that wants that operation to be cheap, and it
already exists; this band is the one that exists because that one cannot compare
line by line.

**Subjects as an array prop on the table — `subjects: string[]`.** One `configure`
adds a column, and every cell stays where it is. Rejected outright by 0052: a
prop that decides how many children exist is `insert` and `remove` wearing a
prop's name, and the subjects are content — they are the words a visitor reads
across the top of the band, and they would have had no author, no history and no
inverse.

**`emphasis` on every cell of the featured column.** Rejected for the reason the
21 August report gives for keeping a mosaic's rhythm on the container rather than
a `span` on its children: a value that means nothing without knowing what its
siblings are doing does not belong on a child. Here it is worse than a mosaic's
span, because the same decision would be written into six separate nodes and
nothing in the tree would connect them — a `remove` of one row would silently
leave the column half-tinted.

**A column index interpolated into the stylesheet.** The general answer, and
rejected by 0055 as stated above. Being able to feature any column is not worth
making the stylesheet a surface a proposal writes into.
