# 0054. A container is its child's name plus the arrangement it puts them in

**Status:** Accepted
**Date:** 2026-08-12
**Section:** §4b

## Context

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) settled
that a repeated item becomes a child node, which turns roughly forty of the
seventy Hermes blocks into *pairs*: a container primitive and the primitive it
repeats. The first pair shipped as `loom.stat-grid` over `loom.stat` and the
name was never argued for — it just read well.

It stops reading well as soon as there is a second one. Three conventions were
already in play in the port notes for the same shape:

| Hermes block | Candidate names |
| --- | --- |
| `stats` | `loom.stat-grid` / `loom.stat` |
| `faq` | `loom.faq` / `loom.faq-item` |
| `pricing-tiers` | `loom.pricing-tiers` / `loom.pricing-tier` |
| `clients` | `loom.clients` / `loom.client-logo` |

They disagree about everything: whether the container is plural, whether the
child carries an `-item` suffix, and whether the pair shares a stem at all. The
cost of leaving it is not aesthetic. A model picks a primitive by reading the
catalogue, and a catalogue where the container for stats is `stat-grid` and the
container for questions is `faq` — with `faq` *also* being a plausible name for
the single question — is a catalogue that invites the model to insert the wrong
one. It has no way to check its guess: an unregistered type is dropped at
render, and the wrong registered type renders something wrong instead.

Decided once here, before the remaining sixty decide it sixty times.

## Decision

**The child is the singular thing, with no suffix. The container is that same
word plus the arrangement it puts them in.**

```
loom.stat-grid   over  loom.stat
loom.feature-grid over loom.feature
loom.logo-cloud  over  loom.logo
loom.faq-list    over  loom.faq
loom.tier-table  over  loom.tier      (unbuilt; named by the rule)
```

Three consequences fall out of the rule and are part of it:

- **No `-item` suffix, ever.** `-item` says "this is part of a list", which the
  parent already says and the tree already shows. It also produces the one
  genuinely ambiguous pair, `faq` / `faq-item`, where the shorter name could
  mean either.
- **The container is never a bare plural.** `loom.stats` and `loom.stat` differ
  by one character in a catalogue read by a model that is choosing between them,
  and by nothing at all when spoken.
- **The arrangement word is descriptive and drawn from a small set** — `grid`,
  `list`, `cloud`, `table`, `row`, `carousel`. It names what the container does
  with its children, which is the only thing it does, and it is what a person
  calls that band of the page.

The rule is retrospective-compatible: `loom.stat-grid` / `loom.stat` already
satisfies it, so nothing shipped has to be renamed.

## Consequences

- The seven pairs still to port have their names decided before they are
  written, and the review of each is about the content model rather than about
  what to call it.
- A container's name states its layout, so a primitive that changes how it
  arranges its children changes its own name — a `loom.faq-list` that became a
  grid would be a rename, which is a breaking change to any stored tree. That is
  the honest cost, and it is small: the layout word describes the *kind* of
  arrangement, not its parameters, and `columns` remains an ordinary prop. A
  `faq-list` with two columns is still a list.
- A pair is discoverable from either half. A model that knows `loom.feature`
  exists can guess `loom.feature-grid` and be right, which is the practical
  value of a rule over a set of individually reasonable names.
- Primitives that are not halves of a pair are unaffected: `loom.hero`,
  `loom.quote` and `loom.section` name themselves.

## Alternatives considered

- **Plural container, singular child** (`loom.stats` / `loom.stat`). The most
  obvious rule and the most quietly dangerous: the two names are visually and
  audibly near-identical exactly where they need to be distinguished, and
  English plurals are irregular enough (`loom.faqs`, `loom.people`,
  `loom.testimonia`?) that the rule needs exceptions in its first ten uses.
- **Container named for the section, child suffixed** (`loom.faq` /
  `loom.faq-item`). This is Hermes' convention, inherited from a world where the
  block was the only registered thing and the item was a *shape* it privately
  held — the suffix was doing real work there because the two lived in different
  registries. Here they are peers in one registry, and the suffix marks one peer
  as subordinate to another, which the tree already shows.
- **A declared relationship rather than a naming convention** — a
  `childType: "loom.stat"` field on the container's definition, with names left
  free. Rejected as more machinery than the problem needs: it would make the
  catalogue longer, it would tempt the renderer into enforcing a parentage that
  [0008](0008-the-renderer-is-a-total-pure-projection.md) says it must not, and
  it does not actually solve the model's problem, which is choosing a name to
  insert before it has any parent in hand.
- **No convention; name each pair well.** What the run started with. It produces
  a catalogue that is locally reasonable and globally arbitrary, and every future
  port decision re-opens it.
