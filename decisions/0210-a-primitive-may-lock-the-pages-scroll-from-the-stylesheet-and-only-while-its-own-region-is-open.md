# 0210. A primitive may lock the page's scroll from the stylesheet, and only while its own region is open

**Status:** Accepted
**Date:** 2026-10-01
**Section:** §4b

## Context

[0176](0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
added `present` and `dismiss` to the behaviour vocabulary and drew the line
between what the runtime owns and what the primitive owns in its sixth clause:

> **The runtime opens and closes a boolean and nothing more.** Focus trapping,
> `inert` on the rest of the page and a scroll lock are facts about the region
> and the page around it, which is the half the primitive owns. A primitive
> presenting a *modal* region arranges them itself.

That is the right split and it left one of the three unbuildable. A primitive's
means are an inline style, a declared class and the one stylesheet this library
emits — all of them static, all of them scoped to the subtree the primitive
drew. Focus trapping and `inert` are script and stay out of reach. The scroll
lock is different, and nobody had noticed: **it is one declaration on an element
no primitive renders.**

`loom.lightbox` is the first primitive to present a region over the whole
viewport, and the reader's experience of it without a lock is the thing the
primitive is judged on: a picture fills the screen, the wheel scrolls the page
behind it, the scrim slides away, and the frame is left floating over the middle
of a band it has nothing to do with. Every reference implementation of a
lightbox sets `overflow: hidden` on the document while it is open, in script,
on open and on close.

## Decision

**A primitive that presents a region over the whole viewport may lock the
document's scroll with a `:has()` rule on the document element, scoped by its own
library class and its own presented state.**

```css
html:has(.loom-lightbox[data-loom-presented="true"]) {
  overflow: hidden;
}
```

Three properties make this a rule rather than a reach, and all three are
load-bearing:

1. **It is scoped by a library class, like every other selector in the file.**
   The guidance `stylesheet.ts` has carried since it was written is *scope every
   selector to a library class*, and this one is — inside the `:has()`. It
   matches while a Loom lightbox is open and at no other time, on a page with no
   lightbox on it the rule is inert, and nothing about the host's own document
   element is touched.

2. **It is released by the same mechanism that sets it.** There is no open
   handler to pair with a close handler and no state to get out of step: the
   attribute is the lock. A frame closed by the cross, by Escape, by a second
   press on the trigger, or by React unmounting the control all release it,
   because all four stop the selector matching. A scroll lock in script is a
   pair of calls that can be left half-done; this one cannot be.

3. **It cannot fire on a page served without scripting.** No control, no
   attribute, no match — which is the same property that makes the hide rule
   safe, read from the other end. A page without scripting has every frame open
   and its scroll intact, which is the correct reading of a page with no
   overlays on it.

**What stays out of reach is stated rather than approximated.** Focus is not
trapped and the rest of the page is not `inert`, so a reader on a keyboard can
tab out of an open frame into the page behind it. Neither is expressible in CSS
and neither is faked.

## Consequences

**The one rule in this library that selects the document element**, and it is
worth being the only one. A second primitive wanting the same lock adds its own
class to the same rule rather than its own rule, so the list of things that may
hold the page still is one line of CSS somebody can read.

**`html` rather than `body`**, which is not interchangeable here: the document
element is the scrolling box in every engine that matters, and `overflow:
hidden` on `body` alone leaves the page scrollable in several.

**It is not a general escape hatch.** What makes it defensible is that the
declaration is a fact about the *page* while this primitive's own region covers
it. A primitive reaching the document element to set anything a reader would
still see after the region closed is doing something this record does not
permit.

**The scroll position is kept and not restored.** `overflow: hidden` holds the
page where it was rather than scrolling it to the top, which is the behaviour a
script-based lock has to work to achieve. One of the two places this is better
than the thing it replaces.

**A long frame is scrolled from inside itself.** The plate carries
`overflow: auto` and a maximum block size, so a tall picture is reachable while
the page behind it is not. Without the lock those two scrollers compete and the
browser picks; with it, there is one.

## Alternatives considered

**Leaving it to the host.** A documented note saying *add this rule if you use a
lightbox* is a primitive that works only where somebody remembered something,
which is the shape `behaviour.ts` rejects by name — it fails silently, in
somebody else's deployment, with nothing in the render to say why.

**A sixth behaviour that locks the scroll.** Considered and rejected on 0176's
own reasoning: a behaviour is a *control*, something the reader aims at, and
this renders nothing. The one field in the vocabulary's shape that would have
had to carry it — `rendersControl: false` — exists for a behaviour that renders
nothing, and the thing wanted here is not a behaviour at all. It is a
consequence of a state already published.

**`position: fixed` on the document while open**, the pre-`:has()` workaround.
It locks the scroll and loses the reader's place, because a fixed document
element reports its scroll position as zero. Rejected for being worse at the one
thing it is for.

**`overscroll-behavior` on the frame.** It stops a scroll *chaining* out of the
plate once the plate has reached its end, which is a real improvement and is now
set. It does nothing about a wheel over the scrim, which is most of the frame's
area.
