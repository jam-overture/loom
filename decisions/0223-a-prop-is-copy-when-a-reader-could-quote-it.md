# 0223. A prop is copy when a reader could quote it, and a glyph is not a quote

**Status:** Accepted
**Date:** 2026-10-04
**Section:** §1

## Context

[0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md) gave a
primitive a way to say which of its props a reader reads, and shipped with
nothing declaring it. [0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
did the same for `role` three days earlier. Both said so in their own
consequences, and both were filed for this lane.

Three weeks and five findings later the answer the library gave about itself was
still *nobody has said*, which is 0122's bargain working exactly as designed and
worth nothing to the three surfaces that ask:

- a **review queue** reporting `3 pieces` where the page says *3,400 ·
  appointments last year*, because `textOf` walks text children and
  [0052](0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md) puts a
  fixed field in a prop;
- **`wordsReadIn`** (0212), which answers which copy a reader actually reached
  and answered the empty list for every page built from this library;
- **`TITLE_BEARING`**, hard-coded in two hosts, correct for whatever each host
  happens to register and wrong the day anybody registers a second heading.

The declaring is one pass over the library, which the 19 September finding asked
for and the 30 September finding argued had to be a run rather than a side
effect: *two primitives out of ninety-eight declaring `copy` is a registry that
answers a consumer with a picture of a library that mostly declines to say.*

A pass over a hundred and two primitives is a hundred and two judgements, and
the judgement is not always obvious. `loom.stat`'s `value` is plainly words and
`loom.card`'s `href` is plainly not. In between: an image's `alt`, an icon's
accessible label, a banner's landmark name, a form field's posted `name`, an
option's posted `value`, a three-character marker holding a tick, a meter's
`value` that the component prints as *60%*. Without a rule each of those is
decided a hundred and two times, differently, by whoever is holding the file.

## Decision

**A prop is copy when a reader could quote it from the page. Where its value
lands in the DOM is not the test.**

Six rules settle every case in the library.

1. **Drawn as text → copy.** The ordinary case, and 93 of the declarations.

2. **Drawn as the accessible alternative for something visual → copy.** An
   image's `alt`, an icon's `aria-label`, an embed's frame `title`, a banner's
   landmark name, an avatar's or logo's `name` where an image replaces the
   monogram. It is prose a person wrote for a reader, and a change that rewrites
   it takes words away. An attribute is where the markup puts it, not evidence
   about whether anybody reads it.

3. **A string the page transmits rather than shows → not copy.** A URL, a form
   field's `name`, an option's posted `value`, a binding name, an anchor id, an
   SVG path, a view box. Each is read by a machine at the other end.

4. **A glyph is not a quote.** `loom.pin`'s `marker` is three characters and
   `loom.feature`'s `icon` is four: a tick, a cross, a numeral, an emoji. A
   change that swaps one takes no words away, and a reviewer handed `✦` in a list
   of removed words is handed noise. **The limit is the argument** — a prop that
   could hold a sentence is not on this list, which is why `loom.milestone`'s
   `marker` at 32 characters (*Q1 2025*, *v2.1*) is copy and the two above are
   not.

5. **A number the component prints is declared; a number that positions, scales
   or counts is not.** `loom.meter`'s `value` becomes *60%* on the page and
   `loom.rating`'s `score` is printed as `score.toFixed(1)`, so both are
   declared and both come back in `unspoken` — *somebody told me these are words
   and what is in them is not one* — which is the field 0122 built for exactly
   this and the honest answer where coercing would be a lie. `loom.stat`'s
   `magnitude` plots a bar and prints nothing; `loom.heading`'s `level`,
   `loom.pin`'s `x`, `loom.before-after`'s `position` and
   `loom.waiting-state`'s `lines` are the same shape of fact.

6. **Everything else declares `[]`.** 58 of 102, and it is the half that pays:
   a `loom.stack` that has not said is a node every reading has to report, and
   `[]` is what empties `unread` for a whole page.

**`role` stays at one declaration.** `loom.heading` says `role: "heading"` and
nothing else does, because nothing else is what a reader takes as the title of
what follows. 0114's vocabulary has one member and its bar for a second is a
consumer that cannot answer its question; this pass found no such consumer and
does not widen it.

## Consequences

- **102 of 102 primitives declare `copy`**, 58 of them `[]`, 44 of them 93 props
  between them. `copyFor` answers for every type in the library and
  `typesWithRole("heading")` answers `["loom.heading"]`.
- **Every starting composition reads clean.** Across the catalogue's 52
  compositions a reading returns 971 words and `unread: []`, and the metrics
  band — whose `textOf` is the empty string — returns its four figures and their
  four labels.
- **Three `unspoken` entries exist in the whole catalogue**, all of them rule 5:
  two meters and a rating. `copy.test.ts` holds the list rather than the count,
  so a third printed number arrives in review.
- **A declaration can no longer drift silently.** The registry already refused a
  declaration naming a prop the schema does not have; `copy.test.ts` renders
  every primitive with a marker in each prop and refuses the two failures the
  registry cannot see — a declared prop the component never draws, and an
  undeclared prop it draws as text.
- **Rule 2 is the one a consumer could disagree with**, and it is filed rather
  than hidden: `copy` is one list read by two questions — *what would this
  change take away* (where alt text counts) and *what did a reader read* (where
  a sighted one did not read it). The list cannot answer both perfectly and the
  shape that would is the framework's call.
- **A host can stop hard-coding its own heading array**, and the ordering lesson
  24 insists on — the declaration first, the registry question second, or
  neither — is now satisfied for this library.
- **Lesson 24's Exercise F transcript is stale**, by design: three paragraphs of
  it rest on `declaring copy: 0`. Filed for its owning lane with the new
  transcript rather than edited from here.

## Alternatives considered

**Declare only the primitives whose words a consumer has asked about.** Four
primitives would have covered the review queue's filed example. Rejected for the
reason the 30 September finding gives: a registry answering for four of a hundred
and two is a picture of a library that declines to say, and `unread` on every
other node is the same silence with more steps.

**Leave `alt` out, so that every declared prop is one a sighted reader reads.**
Cleaner for `wordsReadIn` and wrong for the queue: a proposal that rewrites every
alt text on a page would report that it changes no words. Rule 2 takes the
failure that is recoverable by a consumer over the one that is invisible.

**A second vocabulary — `copy` for shown words, something else for alternatives.**
The right shape if the tension in rule 2 turns out to bite, and not this lane's
to invent: it is a field on a primitive definition, which is the framework's.
Filed with the measurement instead.
