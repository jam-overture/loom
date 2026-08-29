# 0096. A scroll-driven entrance is anchored to entry, so an element that cannot scroll is already finished

**Status:** Accepted
**Date:** 2026-08-29
**Section:** §4b

## Context

`loom.reveal` animates its children as the reader scrolls to them, using a CSS
scroll-driven animation — `animation-timeline: view()` — and no script at all.
That is [0055](0055-motion-is-a-static-stylesheet-the-primitive-emits.md) read
literally, and it is the first motion in this library whose clock is a position
rather than a duration.

The clock being a position changes the failure mode, and the change is not
small. A time-driven entrance always finishes: the worst a wrong duration can do
is look wrong for a moment. A scroll-driven one holds its element at the
animation's **first keyframe** until the timeline advances, and the first
keyframe of every entrance worth having is `opacity: 0`. So a range that never
advances does not look wrong. It renders **a page with a hole in it**, silently,
with the content present in the DOM, addressable, announced to a screen reader,
and invisible.

There are three ranges to choose from and the choice looks like a matter of
taste:

| Range | Complete when |
| --- | --- |
| `cover` | the element has finished passing through the scrollport |
| `contain` | the element is fully inside the scrollport |
| `entry` | the element has finished *entering* the scrollport |

It is not a matter of taste, because a `view()` timeline resolves against the
element's **nearest scroll container**, and any `overflow: hidden` ancestor is
one. This library renders several: `loom.card` clips so its media region can be
flush, `loom.marquee` clips so its track can travel, and `loom.mockup` clips so
its screen fits the shell. A reveal placed inside any of them has a scrollport
that is a box no taller than its own content and that never scrolls at all.

**This is not hypothetical and it was not caught by reading.** `loom.backdrop`
was written with `overflow: hidden` — a rounded band with a ground in it wants
to clip — and the specimen page for this very run put a `loom.reveal` inside
one. Every child of that reveal sat at a fixed timeline progress of 81.4%,
unchanged at any scroll position, and never animated. Nothing rendered wrong,
no assertion failed, and no screenshot showed it; it took reading
`animation.timeline.currentTime` off the live page. `loom.backdrop` no longer
clips — its ground layers carry `border-radius: inherit`, and the one ground
that grows past its own box clips itself — but the shape of that mistake is
general, and it is the reason this record exists rather than a comment.

Under `cover` and `contain`, such an element sits at a progress the browser
computes from a degenerate range — and the value it lands on is not something a
primitive should be betting a page's content on. Under `entry`, an element that
already fills its scrollport has, by definition, finished entering it.

## Decision

**A scroll-driven entrance in this library is anchored to `entry 0%` and
`entry 100%`.** Not `cover`, not `contain`, and not an `entry` range that stops
short of `100%`.

Two properties follow, and they are the reason rather than a side effect:

1. **An element that cannot scroll is finished, not hidden.** Fully entered is
   the resting state of a box inside a scrollport it already fills, so the
   worst case of putting a reveal somewhere it does not belong is that its
   motion does not play. The content is there.
2. **The animation completes while the element is on its way in**, which is what
   an entrance is. A range ending at `cover` finishes as the element leaves,
   which reads as a page that animates its content on the way *out*.

The corollary is that **the fallback is what remains rather than what is
written**. `animation-timeline` is one declaration and an unknown declaration is
dropped, so a browser that has never heard of a scroll timeline keeps the
ordinary `animation` above it and plays the entrance once on load — which is
`loom.hero`'s entrance and a perfectly good page. Nothing in this library is
ever hidden by a feature the browser does not have.

One mechanic has to be written down beside the rule, because it is invisible
once it is wrong: **the `animation` shorthand resets `animation-timeline` and
`animation-range`**. The timeline has to be declared *after* the shorthand or it
is silently discarded and every reveal on the page becomes a slower `loom.rise`
that nobody notices is broken. A test asserts the order.

## Consequences

- No prop selects the range. It is not a taste, and a tree that could set it
  could set a page's content invisible — which is exactly the class of thing
  0055 keeps out of the tree.
- **A stagger prop is refused for a related reason.** `animation-delay` is
  ignored on a scroll-driven animation, so a `stagger` prop would do nothing in
  every browser that supports what the primitive is for. The sequencing comes
  free: each child has its own view timeline, so a column arrives a row at a
  time and a row of three arrives together, because it genuinely did.
- The next primitive to reach for a scroll timeline — a progress rail, a
  parallax ground — inherits the anchor and the ordering rule rather than
  re-deriving them from a page that came out blank.
- The rule is about *entrances*. A scroll-driven animation whose first keyframe
  is a resting state, rather than an absence, is not bound by it and should say
  so where it is written.
