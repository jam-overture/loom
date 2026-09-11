# 0115. Three fields of one shape are a list wearing three names

**Status:** Proposed — `ARCHITECTURAL — needs review`
**Date:** 2026-09-08
**Section:** §4b

> **Why this number.** `0111` through `0114` are skipped deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits in as many words. The highest record on `main` is `0110`, roughly
> thirty pull requests have been open since 1 September, and a clash is fatal to
> every lane's `pnpm verify` while a hole costs one line in the index. `0096`
> was claimed by ten branches at once and the repair took a run. This is the
> cheap side of that trade.
>
> **Why `Proposed`.** It refines
> [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md), which
> is `Accepted`, so the primitives brief makes it an escalation. Nothing in this
> branch waits on it: `loom.spec` and `loom.listing` are built on precedent
> already on `main` — see *Consequences* — and 0052 is neither superseded nor
> amended here.

## Context

0052 sorts a Hermes block's contents into nodes and props with a rule that has
ported fifty-two blocks without trouble:

> A field that holds **one value of which there is exactly one** stays a prop.

Read that rule against `PropertyListing`, the last block in
[`docs/hermes-port-map.md`](../docs/hermes-port-map.md)'s *pairs to build*
table:

```ts
{ name: "beds",  schema: { kind: "scalar", type: "string" } },
{ name: "baths", schema: { kind: "scalar", type: "string" } },
{ name: "sqft",  schema: { kind: "scalar", type: "string" } },
```

Each of the three holds one value of which there is exactly one. Each is
therefore a prop, and 0052 has answered — **incorrectly**, and it takes a second
reading to see why. The three fields are not three properties of a listing. They
are one property occurring three times: *a measured fact about the thing*, with
a figure and the unit it counts. `beds` is not a different kind of field from
`sqft` in the way that `price` is different from `address`; it is the same field
with a different unit in it.

So a listing can say *3 beds* and *1,450 sq ft*, and cannot ever say *0.4 acres*
or *2 parking spaces* or *planning granted*, because the fourth fact has no
field and no runtime can register one mid-session
([0001](0001-tree-and-delta-as-the-unit-of-change.md)). That is the wall
[`docs/primitive-granularity.md`](../docs/primitive-granularity.md) describes:
not expensive, **unreachable**, and invisible until a visitor hits it.

The rule reads the wrong way here because it asks its question of **one field at
a time**. A list that a schema has already flattened into named columns does not
look like a list from inside any single one of them.

This is not a one-off. The port map records the same shape twice more without
naming the pattern:

| Where | How the schema holds it | What it actually is |
| --- | --- | --- |
| `hours-of-operation` | `monday` … `sunday`, seven fields | seven days, a list |
| a hotspot overlay | `hotspots: Hotspot[]` on the frame | one mark per node — [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) already catches this one, because the array is visible |
| `PropertyListing` | `beds`, `baths`, `sqft` | however many measured facts the thing has |

The middle row is the one 0052 catches unaided: an array in a prop *looks* like
an array. The first and last rows are the same mistake with the array already
spread out, and they are the ones that get through.

## Decision

**Fields of one shape, occurring more than once in a schema, are a list. Port
them as child nodes even though no single one of them is repeated.**

The test 0052 asks is *is there exactly one of it?* The test to ask **first**
is:

> **Would a fourth one of these be a reasonable thing to want?**

If yes, the fields are members of an open set that someone has written out by
hand, and the set is the content model rather than any of its members. If no —
a card has one `title`, one `price`, one `href`, and a fifth title is not a
thing — they are what 0052 already calls fixed fields and they stay props.

Two qualifications, because the rule is easy to over-apply:

- **One shape, not one type.** `address` and `price` are both strings and both
  occur once; they are not a list, because they are not two occurrences of one
  idea. What repeats in `beds`/`baths`/`sqft` is *figure plus unit*, and the
  field names are the units. Sameness of shape is about what the field means,
  not what it is typed as.
- **A closed set stays props.** 0052's last clause is untouched: where the
  alternatives really are a fixed vocabulary the schema names — a divider's
  three ornaments, a card's three chrome styles — a prop selecting among them is
  a prop. Weekdays look like a closed set and are not one, because the list is
  *days a business is open* rather than *days of the week*; the seven-field
  schema is what makes them look closed.

## Consequences

**It records existing practice rather than changing it.** `loom.pin` shipped on
this reasoning on 4 September — the port map says so in as many words, that
Hermes *"would have held the marks as a `hotspots[]` field on the frame, and by
0052 they are nodes"* — and the map's own note on `hours-of-operation` reaches
the same answer for the seven weekday fields. Both were decided case by case in
a doc comment. This is the rule those two cases were instances of, written down
so the next one does not have to be argued from scratch.

**It costs a primitive per shape.** `loom.spec` exists because of this rule, and
that is the price: a library that decomposes a flattened list gains a leaf every
time. The bound is the same one the granularity doc sets — the grammar budget
([0014](0014-the-reply-schema-must-fit-a-grammar-budget.md)) — and it is paid
here only because the leaf turned out to be general. A figure and the unit it
counts is a listing's beds, a plan's limits and a machine's memory, so one leaf
covers all three.

**It does not reopen the fifty-two blocks already ported.** The sweep this
rule would justify is worth doing deliberately rather than as a side effect of
this record, and the one block it plainly implicates —
`hours-of-operation` — the port map already sends to `loom.milestone-list` for
exactly this reason. No shipped primitive is wrong under it.

**A field pair that is genuinely two things is unaffected**, and the check for
that is the fourth-one question rather than the field's name. `loom.stat`'s
`value` and `label` are one fact, not two occurrences of one shape.

## Alternatives considered

**Leave 0052 as it is and decide case by case.** This is what has happened
three times and it worked all three times, which is the argument for it. Against
it: each of those three was decided by somebody who happened to look twice at a
schema, and the failure mode is silent — a block ported with `beds`, `baths` and
`sqft` as props renders every fixture correctly and is wrong only for the page
nobody has written yet. A rule that fires on the *schema* rather than on the
porter's attention is what makes the next one cheap.

**Amend 0052 in place** under
[0099](0099-a-record-is-amended-when-only-the-count-moved.md). Rejected: 0099
covers an amendment where only a count moved, and this adds a test that changes
which answer some ports get. It is a corollary with its own reasoning and its
own rejected alternatives, and folding it into 0052's Decision section would
make that record answer two questions.

**Make it a rule about the source schema rather than about the content.** A
mechanical version — *three or more same-typed scalar fields are a list* —
would have caught this case and would also have swept up `address`, `price` and
`href`, which are three same-typed scalars and three genuinely different things.
The judgement cannot be removed; it can only be asked at the right moment, which
is what the fourth-one question does.
