# 0091. Motion stops in edit mode, and that is where a decorative duplicate belongs

**Status:** Accepted
**Date:** 2026-08-25
**Section:** §4b

## Context

`loom.logo-cloud` was written on 19 August with a paragraph explaining why it
does not scroll:

> A seamless marquee needs the row rendered twice, and a duplicated row means
> two DOM elements carrying the same `data-loom-node` id — the exact failure
> [0051](0051-a-slot-is-a-region-the-primitive-places.md) rejected when it
> considered leaving slot content in `children` as well. A portal that resolves
> an id to the second copy points the reviewer at a node that is not the one
> they clicked.

That reasoning is correct and it is why the library has had no marquee, which
Hermes had and which the brief names as one of the three blocks that cannot
decompose. The mechanics are not negotiable: a loop with no visible seam
translates a track by exactly one run's width, so the run after the seam has to
be a second copy of the run before it. One copy leaves an empty band once a
cycle. There is no pure-CSS arrangement of one copy that does not.

Two ways out were available and both are worse:

- **Give up the duplicate.** A band that pauses empty every cycle is not the
  primitive anybody asked for.
- **Accept the duplicate ids.** A portal resolving `data-loom-node` finds the
  first match; whether that copy is the one on screen when someone clicked is a
  function of an animation's phase. This is the failure 0051 named, arriving by
  a different door.

## Decision

**Edit mode is a rendering, and a primitive whose motion would fight the review
may render still under it.**

Concretely, for `loom.marquee`: when `loom.editable` is present the band renders
one run, unwrapped by an animation and wrapped by the layout, with every child
addressable exactly once. When it is absent the band renders two runs and
travels.

The argument is not the id collision. It is that **you cannot click a logo that
is sliding past.** A moving target is hostile to the one activity edit mode
exists for, and a band that holds still while somebody is editing it is what the
editing wants regardless of what the DOM would have looked like. The identity
question resolves as a consequence rather than as the motive, and that ordering
matters: a rule justified only by an implementation problem would be argued away
the moment the implementation changed.

What falls out is a property rather than an intention:

> **A decorative duplicate exists only where identity attributes do not.**

`editableAttributes` is built only in edit mode (`render.ts`), so in a published
render there is no `data-loom-node` on anything, and a duplicated subtree
duplicates nothing that resolves. A test in `library.test.ts` asserts that no
fixture in the library renders one node id twice in edit mode.

Three limits, so this is not read as wider than it is:

- **This is a rendering difference, never a content difference.** The same nodes
  in the same order with the same props; what changes is whether the primitive
  also emits a copy of them that is `aria-hidden` and `inert`. A primitive that
  showed *different content* in edit mode would be lying to the reviewer about
  the page they are approving, which is the whole thing the portal exists to
  prevent.
- **Reduced motion takes the still rendering too**, by the stylesheet rather
  than by the component, since a primitive cannot know. The echo is
  `display: none` and the run wraps — a stopped loop is otherwise a row clipped
  at the band's edge showing whichever items happened to be inside it.
- **`loom.editable` is not a general licence to branch.** It answers exactly one
  question — is somebody editing this — and the only thing a primitive may do
  with the answer is stop moving.

## Consequences

- The portal's preview does not show the motion. That is a real cost and a
  visible one: whoever is looking at the band can see it is still. A silent
  version of this — motion that plays but resolves clicks to the wrong copy —
  would be worse and much harder to find.
- `loom.logo-cloud` keeps its paragraph and its behaviour. It is the still band,
  and most pages want one; `loom.marquee` is the moving band, and they are two
  primitives rather than a `scroll` prop for the reason 0052 gives about
  renderings that are not the same content model — one wraps and reads as a
  wall, the other travels and reads as a ticker.
- A primitive may now read `loom.editable` for something other than spreading
  it. Nothing else in the library does, and a second one should cite this record
  or supersede it.
- Nothing in the tree names any of this. There is no `still` prop, no
  `duplicate` prop and nothing for the Gate to weigh, which is
  [0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md)'s bargain
  holding.

## Alternatives considered

- **Strip identity from the duplicate.** The honest fix, and not available from
  this side of the seam: children arrive as already-rendered React elements
  carrying their attributes, so a primitive cannot render them anonymously. It
  would need the render seam to offer a decorative context, which is
  `src/`'s and is filed as a finding rather than assumed.
- **Animate each item on its own delay**, so no copy is needed. Seamless, and it
  needs a per-item delay computed from the item count — which a static
  stylesheet cannot interpolate (0055) and which would need one rule per
  (count, index) pair rather than one per count. It also spaces items evenly
  regardless of their widths, which looks wrong the moment two items differ.
- **A `still` prop on the primitive.** Moves the decision into the tree, where a
  model could publish a band that does not move for no reason a reviewer would
  see, and where the portal's own preview would still be wrong whenever the prop
  said `false`. It answers neither half.
- **Let the portal pause animations.** Plausible, in the lane that owns the
  portal, and it fixes the clicking without fixing the ids: a paused duplicate is
  still a duplicate. Worth doing anyway, and not instead of this.
