# 0066. A card is the target when it is read; the control is the target when it is acted on

**Status:** Accepted
**Date:** 2026-08-18
**Section:** §4b

## Context

`docs/hermes-port-map.md` leaves nine pairs to build, and **seven of them are a
card in a grid**: written pieces, things for sale, things booked, credentials,
playable media, reading, property. Every one of them has a picture, a name, a
line of copy and somewhere to go. The question each will ask is the same one,
and it is not a naming question or a granularity question — 0052 and 0054
already answer those. It is: **what does the reader aim at?**

There are two answers in circulation and both are correct somewhere:

1. **The card is the target.** The whole surface is clickable. This is how every
   blog index, every news front page and every search result has worked for
   twenty years, and the reason is that there is only one destination and the
   card is a bigger target than a five-word link.
2. **A control on the card is the target.** The card holds a button — *Buy*,
   *Download*, *Book* — and the surface around it is not clickable. This is how
   a shop works, because a product card can have more than one destination and
   because a button is a promise about what happens next that a link is not.

Shipping both on one card is the failure mode, and it is the one Hermes' markup
invites: `articles` wraps the entire card in an `<a>`, which is answer 1 done
the common way, and it also produces the two defects that make answer 1 look
worse than it is.

- **The link's accessible name becomes the whole card.** A screen reader
  announces *"Link: March 2025 The Gate is not a linter Every proposal is
  measured on two axes before anyone sees it — read more"*, because the
  accessible name of an anchor is its text content. A sighted reader sees a
  headline; a listening reader hears a paragraph.
- **Nothing else on the card can ever be a link.** Nested anchors are invalid
  HTML that browsers resolve by dropping one of the two, so the card renders,
  screenshots correctly, and one of the things on it silently does not work.
  That is the open finding of 17 August, and it is why `loom.card`'s doc comment
  can only ask a tree not to do it.

Both defects are answer 1's *implementation*, not answer 1. The library needs
the rule and it needs the technique, before seven pairs each guess.

## Decision

**A primitive whose content is consumed by reading makes the whole card the
target, using a stretched title anchor. A primitive whose content is acted on
places a real control and links nothing else but its name.**

The two are settled per primitive, at port time, by asking what a reader does
with the thing — not exposed as a prop. A prop would be a choice a model gets
to make, and it is not a content question: a shop card whose surface is
clickable *under* its own buy button is broken in a way no author intended and
no screenshot shows.

**Reading — the stretched anchor.** The root is the semantic element
(`<article>`), the title is an `<a>`, and that anchor carries a `::after`
overlay that covers the card:

```css
.loom-cover { position: relative; }
.loom-cover-link::after { content: ""; position: absolute; inset: 0; }
```

- **The accessible name is the title alone**, because the anchor's text content
  is the title alone. The rest of the card is passed over on the way to it,
  which is what a listening reader wants from a list of twelve.
- **The root is not a target**, so a link inside the card is valid HTML rather
  than invalid. It is still a link under an overlay and still wants reviewing —
  but the failure moved from "the browser silently drops one of these" to
  "these two regions overlap", which is a failure a person can see.
- **Focus and hover are the title's**, which is correct: the thing focused is
  the thing whose name is announced.

**Acting — the control on the floor.** The root is the semantic element, the
name is an ordinary link when there is somewhere to read more, and the thing
that does the deed is a `loom.action` in a region the primitive pins to the
card's floor. No overlay is emitted at all, so there is nothing for the control
to fight.

`loom.article` is the first of the first kind; `loom.product` is the first of
the second. **They are the same five fields and differ only here**, which is
what makes the rule worth a record rather than a comment in one file.

## Consequences

- **The seven remaining card pairs are decided in advance.** `loom.credential`,
  `loom.book` and `loom.episode` are read; `loom.offering` and `loom.listing`
  are acted on; `loom.event` is acted on (a ticket link is a control). The port
  spends no run re-deciding it, which is what this record is for.
- **A `loom.action` inside a reading card is not refused and not endorsed.** It
  is valid markup that overlaps an overlay. This record does not create a check
  — it removes the *invalid-HTML* half of the 17 August finding for these
  primitives, and leaves the overlap for a reviewer.
- **`loom.card` is unchanged and still takes `href` on the root.** It is a
  general surface holding whatever a tree puts on it, so it cannot know what its
  contents are for; the stretched-anchor technique needs a title to stretch and
  a general card has none. Its doc comment's warning stands.
- **The stylesheet gains a pseudo-element category.** `::after` joins keyframes,
  state selectors, `prefers-reduced-motion` and position selectors as a thing
  that cannot be said inline. The alternative is a second element in the markup
  that exists only to be clicked, which is a node in the DOM that is not a node
  in the tree.

## Alternatives considered

**Wrap the card in an anchor, as Hermes does.** One element, no stylesheet, and
it is what most of the web ships. Rejected on the accessible name: a reader
using a screen reader on a twelve-item index hears twelve paragraphs where a
sighted reader scans twelve headlines, and no prop can fix it because the name
*is* the content.

**Make it a prop — `target: "card" | "title" | "action"`.** Reads as flexible
and costs nothing to add. Rejected because it is not a content decision and the
tree is authored by a model: a product card configured `target: "card"` with a
buy button on it is invisible in every projection and every screenshot, and
appears only when someone clicks the wrong half of a card. 0052 permits a prop
that selects among a closed set of renderings; it does not require one where the
right answer is a property of the content model rather than of the instance.

**Put the overlay on the card and give inner controls a `z-index`.** The
Bootstrap "stretched link" variant. Same result for the pointer, and it loses
the accessible-name property that is the main reason to prefer the title anchor,
because the overlay's owner is then the card. It also puts the burden on every
future child to know it must raise itself, which is a rule spread across
primitives rather than held in one.

**Do nothing and let each pair decide.** What would have happened without this
record. Rejected because seven pairs deciding independently is seven chances to
produce a library where two cards that look identical behave differently, and
that inconsistency is invisible until a reader hits it.
