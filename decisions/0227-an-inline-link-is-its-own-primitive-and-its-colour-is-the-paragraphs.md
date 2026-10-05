# 0227. An inline link is its own primitive, and its colour is the paragraph's

**Status:** Accepted
**Date:** 2026-10-05
**Section:** §4b

## Context

`loom.link` shipped on 28 September for a site header and a footer column, and
its own props docblock named a third job: *"`accent` for the one link in a
paragraph that is the point of the paragraph."* That link could not be drawn.

`Loom marketing` found it on 4 October building `/what-you-run`, which has the
only sentence on that site naming another page of it. The inline link was built,
photographed on all three palettes and **taken out again**, and the finding
measured three reasons — none of them a mistake in `loom.link`, each correct for
a menu item and wrong for a phrase:

- **No underline at rest.** The underline is a wipe-in on hover, pinned open
  only for `aria-current="page"`. In a nav bar, position says the word is
  pressable. Inside a sentence nothing does, so the phrase reads as emphasis.
- **`color: accent`, and under `minimal` the accent slot holds `#0a0a0a`** —
  the same hex as `fg-default`, deliberately, because a single-ink palette has
  nothing else to be. That is the palette every visitor and every screenshot
  gets first. Photographed: in a `tone: "muted"` paragraph the phrase came out
  *darker* than its sentence and read as bold.
- **`display: "inline-block"`, with its own `fontSize` and `lineHeight: 1.4`**
  against `loom.prose`'s 1.6. The inline-block is load-bearing for that
  underline — a background a wrapped inline box would paint twice at two widths
  — and its cost is a phrase that cannot break mid-phrase, set on a line a
  different height from the ones above it.

Two questions had to be answered and only one of them is about markup.

## Decision

**An inline link is a primitive of its own, and it sets no colour, size, weight
or line height.**

### One — why a primitive and not a fourth `tone`

[0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
closed-set clause keeps renderings on one enum, so a fourth `tone` is the first
answer to reach for. It is the wrong one for the reason `loom.code-span` already
records against `loom.code`: the clause is a rule about renderings of **one
content model**, and a flag that switches other props off is a schema saying two
things and hoping the author reads the right half.

Here the count is three of five. `scale` is off, because the phrase is the size
of the sentence whatever that is. `tone` is off, by the rest of this record.
`current` is off, because it works by pinning an underline open and this
underline is already open. Only `href` and `external` survive.

[0061](0061-a-suffix-that-names-the-markup-earns-its-place.md) is the precedent
and it is this shape exactly — `loom.perk` and `loom.perk-list-item` are the
same content in different markup and are two primitives, because the element a
primitive *is* can be what separates it from its twin. **`loom.link` is the
`inline-block`; `loom.inline-link` is the `inline`.**

The name breaks `loom.code-span`'s suffix on purpose. `loom.link-list`,
`loom.link-trail` and `loom.link-pager` are a three-member family in which
`loom.link-*` means *a container of links*, and a `loom.link-span` would be the
only member that is not one — read by a model choosing from a hundred and three
descriptions with nothing but a name and a sentence. A mild inconsistency with
one primitive beats a collision with three.

### Two — the colour inherits, and the underline is the affordance

**`color: inherit`, always, with no prop able to change it**, and the mark that
says the phrase is pressable is a `text-decoration` drawn at rest.

This is not a simplification of three tones into none. It is the only spelling
that is correct everywhere the primitive is allowed to go:

- On a palette whose accent *is* its foreground, an accent phrase is invisible
  as a link. An inherited one is the sentence's own ink with a rule under it.
- Inside a muted paragraph it is muted; inside a hero painted on an accent
  ground it is that ground's ink. **A token could not have done this**, because
  the right colour is not a slot — it is the colour of the words either side of
  it, and `inherit` is the only thing that knows.
- In greyscale and under forced colours it still reads, because a rule is not a
  hue.

The hover and focus state moves the thickness from 1px to 2px rather than
tinting, for the same reason: an accent hover is no hover at all on a single-ink
palette. The whole of it lives in the stylesheet
([0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md)) and **nothing
is set on the element**, which is the stronger form of the rule — there is no
declaration on the node for a paragraph to lose an argument with.

### Three — the general rule this is an instance of

> **A primitive that lives inside a sentence states no property the sentence
> states.**

`loom.emphasis` reached it one axis across, declining `weight("heading")` for
`bolder` because a token promises the value comes from the theme and promises
nothing about it *differing from the one beside it*. `loom.code-span` and
`loom.kbd` reached it on size, taking `em` over a ramp step because a span in a
lede and a span in a footnote are the same span. This record is the colour axis
and states the three as one rule, so the fourth inline primitive does not
rediscover it.

## Consequences

- **`loom.link`'s `accent` tone loses its stated purpose and keeps its
  behaviour.** Its docblock names a job this primitive now does; nothing is
  deprecated, because the tone is still the right thing for a footer column that
  wants one item louder. The sentence in that docblock is corrected rather than
  the prop removed.
- **A phrase can be re-worded without being re-made.** Its words are child text
  ([0059](0059-a-leaf-whose-whole-content-is-one-string-takes-it-as-a-child.md)),
  so swapping which words carry the link is a `move` against the text nodes
  rather than a `configure` of a prop bag.
- **`copy` is `[]`.** Nothing a reader could quote lives in a prop here, and the
  `↗` an outbound phrase draws is `aria-hidden` and a glyph, which
  [0223](0223-a-prop-is-copy-when-a-reader-could-quote-it.md) rules out of copy
  in the same words.
- **The mark is an `inline-block` and that is load-bearing.**
  `text-decoration` propagates from an ancestor and cannot be cancelled on a
  descendant inline box, so an inline arrow is an arrow with a line under it.
- **It makes a second design of `banner` possible**, which took the catalogue's
  last part with a single design to two and the designs-per-part instrument to
  zero.
- **This record does not touch `loom.link`, the tree schema or the delta model**,
  so it is not an escalation. It adds a type to the registry and a rule to the
  prose layer.

## Alternatives considered

**A fourth `tone: "inline"` on `loom.link`.** Rejected above, on the count: three
of its five props contradict the rendering, and the two that do not are the two
this primitive keeps. The near-miss is that a `tone` *looks* exactly like the
closed set 0052 protects — and 0052 is about renderings of one content model,
which a nav item and a phrase are not.

**An `accent` colour with the underline added.** Rejected because it fails on the
palette the finding was photographed on, and fails invisibly: the phrase is
legible, it is simply not distinguishable from the sentence as anything but
emphasis. A defect that renders cleanly is the kind this library has learned to
test for rather than to look at.

**A `tone` whose members all inherit.** Considered and dropped as a prop with
nothing to say. Once the colour must come from the paragraph, the only
differences left are weight and size, and both are properties the sentence
already states — so every member would have been the trap this record names.

**Keeping the underline as `.loom-underline`'s background gradient.** Rejected
because that gradient needs a block box, which is the third of the finding's
three defects. `text-decoration` wraps across lines, skips descenders, and adds
nothing to the line box.

**A `loom.link-span`, for consistency with `loom.code-span`.** Rejected on the
prefix collision above. The suffix convention has one member and the prefix
family has three.
