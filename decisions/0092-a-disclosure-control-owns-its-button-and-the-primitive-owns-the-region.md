# 0092. A disclosure control owns its button and the primitive owns the region

**Status:** Accepted
**Date:** 2026-08-25
**Section:** §4b

## Context

`loom.nav` wraps rather than collapsing. That was settled on 19 August and the
reasoning holds: nothing in a render reads a viewport
([0008](0008-the-renderer-is-a-total-pure-projection.md)), so a disclosure menu
would need the links inside a `<details>` on a phone and outside it on a laptop
— one subtree in two places. The alternatives were rendering the menu twice,
which gives a screen reader two copies of it, or client state, which the runtime
did not have. The finding priced the wrap at two rows and accepted it.

**The price has moved.** `Loom marketing` measured it again on 22 August: the
front door is five links and an action, which at 390px is *three* rows and about
a quarter of the first screen before any content. Nothing is broken and no link
is unreachable, which is why that entry is a measurement rather than a bug. But
the trade was priced at two rows and the site has grown past the size the
argument was made about, and the surface will not drop a destination to keep the
bar short — every surface being reachable from every page is what `pages.test.ts`
holds and 0070 asks for.

`Loom primitives` then filed the observation that joins it to the other standing
entry in this lane's queue. A menu that opens and a button that copies are both
**behaviour**, and behaviour stopped being something the runtime did not have on
22 August:
[0086](0086-a-behaviour-is-a-control-the-runtime-builds-and-a-primitive-places.md)
built the seam, with `copy` as its single member and the note that adding to the
vocabulary is deliberately a change to this package.

So the question this answers is not whether a disclosure should exist. It is
what the *second* member of a closed vocabulary looks like when the first one
turned out to be the easy case.

**`copy` is the easy case.** What it acts on is the node's own text, which the
renderer already has, read off the same tree the page was projected from. The
control is therefore complete on arrival: it takes a string and two labels and
needs nothing from the primitive but somewhere to sit. That is what let 0086
hand over a `ReactNode` rather than a component, and reject a component on the
ground that there were no props anybody could get right or wrong.

A disclosure has no such content. What it acts on is **a region of the render** —
a column of links the primitive laid out, at a width the primitive chose, inside
a box the primitive owns. None of that is in the tree, and none of it is the
runtime's to know.

## Decision

**The control owns one button and publishes its state; the primitive owns the
region and decides what the state means.**

- `disclose` joins the vocabulary in `src/render/behaviour.ts`, which now has
  two members. It takes one text key, `disclose`.
- The control renders a single `<button>` carrying `aria-expanded` and
  `data-loom-disclosed`, exported as `DISCLOSED_ATTRIBUTE`. It stamps that
  attribute on **its own element and nothing else**. It does not wrap the
  region, does not hold a ref into it, and is never told where it is.
- **The contract is a CSS selector**, and it is the whole of the contract. A
  primitive writes `[data-loom-disclosed="false"] ~ .its-own-region { display:
  none }`, in whatever media query it wants the collapsing to apply to, or
  `:has(…)` on an ancestor if it wraps the control in a box of its own.
- **The region defaults to visible and the rule hides it**, never the reverse.
- **The control renders only where it will work** — nothing on the server,
  nothing on the first client render, and the button from an effect — which is
  0086's rule for `copy` applied to a strictly worse failure. See below.
- **One name, not two.** The button is called the same thing open and closed and
  `aria-expanded` carries the state, which is the disclosure pattern as the ARIA
  practices state it. `copy` takes two strings because its second string is a
  momentary confirmation, not a second name.
- Both of 0086's registration checks apply unchanged and were left unchanged: a
  disclosure needs its string, and a primitive taking one must declare itself
  `interactive`, because a menu button inside a linked card is a `button` inside
  an `a` exactly as a copy button is.

**Why the region is not the runtime's.** Three shapes would have let the runtime
hold both halves — a wrapper component, a ref into the primitive's markup, or an
id the seam mints and the primitive puts on its region. Each of them requires the
runtime to have an opinion about a layout it cannot see. Only `loom.nav` knows
that the thing collapsing is a row of links, that it should collapse below a
phone width and not above it, and what the rest of the bar should do with the
space. An attribute is the smallest thing that carries the state across that
line without carrying an opinion with it.

**Why late rendering matters more here than for `copy`.** A copy button that
ships before its capability is known is a button that does nothing — bad, and
the reason 0086 gated it. A *disclosure* that ships before its capability is
known is a button that does nothing **with every link in the menu hidden behind
it**, because the primitive's rule keys off the closed state the server rendered.
The page loses its navigation. Gating the control inverts that into the safe
failure: no button means no attribute, no attribute means no rule matches, and
the menu is simply open the way it was before any of this existed. Scripting off,
an old browser, a script that 404s — all three land on a page that still works.

The cost is a paint. On a phone the menu is briefly open and then collapses once
hydration lands. That is visible, it is the honest price of not being able to
hide something before knowing it can be got back, and a primitive that minds can
transition the collapse.

## Consequences

- **The vocabulary is two, and the shape of adding a third is now known.** The
  seam was written to be plural and had never been asked to be; a primitive can
  declare both, gets both, and the probe reports each independently — a
  component that places one control and forgets the other is named for the one
  it dropped. Tests were added for each of those, because "it places something"
  reporting nothing is the likeliest way this goes wrong.
- **`loom.nav` can collapse, and this record does not collapse it.** The
  declaration and the stylesheet rule belong in the same change as the button,
  which is `Loom primitives`' file and that lane's call — the same division 0086
  made for `loom.code`, and the reason it reverted the wiring it used to prove
  the build resolves. The 22 August measurement and the 24 August recommendation
  both stay open, now with a seam behind them instead of a gap.
- **The runtime ships a second client boundary**, in a second module, and
  `dist.smoke.test.ts` now reads the `"use client"` assertion off the directory
  rather than off a filename — so the run that adds the third control cannot
  forget to assert it. Neither module is re-exported from
  `@loom/runtime/react`, for 0086's reason.
- **`DISCLOSED_ATTRIBUTE` is public API**, which `copy` needed no equivalent of.
  It is in the generated reference and a stylesheet in someone else's deployment
  may select on it, so changing the string is a breaking change to a page's
  layout rather than to a type — the kind that compiles.
- **A disclosure has no `aria-controls`.** Naming the region would need an id the
  seam mints and the primitive places, which is the coupling this record exists
  to refuse for one attribute's worth of benefit. `aria-expanded` on a named
  button is the pattern's stated minimum, and because the closed region is
  `display: none` it is out of the accessibility tree entirely — so the button
  describes a state a screen reader can independently observe, rather than
  contradicting one.
- **A model is still never shown behaviours**, unchanged from 0086. Nothing in a
  tree names one, there is no prop to gate, and the catalogue does not grow.

## Alternatives considered

- **A wrapper component the primitive renders its region inside.** The obvious
  shape, and the one 0086 rejected for `copy` on the ground that there were no
  props anybody could get right or wrong. That ground does not hold here —
  children are a prop somebody could get wrong — so it was reconsidered on its
  own merits and rejected on different ones: the wrapper is an element in the
  middle of a layout `loom.nav` owns, it forces the region to be one contiguous
  subtree, and it makes the runtime the author of the media query. It also
  reintroduces the two-places problem 19 August identified, one level up.
- **A ref into the primitive's markup**, with the control toggling a class on a
  neighbour it finds. Rejected for the reason 0086 rejected reading the DOM for
  the copy text: the seam reaching into elements the primitive owns is a
  coupling neither side can see, and it fails at a different time than it is
  written.
- **An id minted by the seam and placed by the primitive**, which would buy
  `aria-controls`. Rejected as the most machinery for the least benefit:
  `aria-controls` is optional in the pattern and inconsistently supported, and
  the id becomes a second thing the primitive can place wrongly with nothing to
  check it against.
- **The `:has()`-driven checkbox toggle**, which the 19 August finding listed as
  the honest option available without a seam, and which the 22 August
  measurement said was worth more than it was. Rejected because there is a seam
  now. It carries the accessibility debt a checkbox-and-label disclosure always
  carries — no `aria-expanded`, because CSS cannot set one — and it would be
  this library answering a question 0086 has an accepted answer for, twice.
- **A second name for the open state** — "Menu" closed, "Close" open. Rejected
  as saying the state twice and saying it differently to an eye than to a screen
  reader, which is the failure `aria-expanded` exists to avoid.
- **Rendering the button on the server** and accepting the no-scripting failure.
  Rejected outright: it is the one failure mode here that loses the page's
  navigation, and it is silent.
