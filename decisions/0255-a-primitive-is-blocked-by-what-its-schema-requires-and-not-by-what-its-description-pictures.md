# 0255 — A primitive is blocked by what its schema requires, not by what its description pictures

**Status:** Accepted
**Date:** 2026-10-11
**Section:** §5 — the primitive library and its catalogue

> **Why this number.** `main` holds records to `0253`. `0254` is claimed by two
> open pull requests — #575 and #576 — which is the lane collision this lane
> filed on 9 October and the third consecutive number it has happened to, so
> taking it would trade one clash for another; a hole is reported rather than
> fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> `0245` is claimed by #548, still open on a maintainer question. `0255` is the
> next number free on `main` and on every open branch. This record supersedes
> nothing.

## Context

Reach — how many registered primitives at least one starting composition can
place — is the instrument this lane has steered by since September, and the
primitives it reports as unreachable are the queue of what to build next. On
5 October it was filed like this, and the table was repeated in four
consecutive reports:

| | why |
| --- | --- |
| `loom.media`, `loom.embed`, `loom.lightbox`, `loom.carousel`, `loom.before-after`, `loom.overlay`, `loom.pin` | **an image source** |

The reasoning was sound and is not what this record argues with. The catalogue
asserts *ships no image source at all*; `mediaUrlSchema` excludes `data:`
deliberately, because an inline SVG document is a script host and its bytes
would sit in the tree and in every delta that touched it; and a band shipping
`src: "/images/hero.jpg"` is a broken image on every deployment that does not
happen to serve that file. All of that holds.

**The classification was still wrong for five of its seven rows**, and reading
the schemas is all it took to see it:

| primitive | what its schema requires | blocked on an image? |
| --- | --- | --- |
| `loom.media` | `src: mediaUrlSchema` — **required** | **yes** |
| `loom.embed` | `src: mediaUrlSchema` — **required** | **yes** |
| `loom.carousel` | nothing. `slots: []`, children are the band's | no |
| `loom.overlay` | nothing. `slots: ["ground"]` | no |
| `loom.before-after` | nothing. `slots: ["before", "after"]` | no |
| `loom.lightbox` | nothing. `slots: ["preview", "full"]` | no |
| `loom.pin` | a surface whose height is known — corrected on 23 September | no |

Two of the five say so in their own files. `loom.carousel`'s header names its
children as *"a card, a quote, a shot, a tier"*. `loom.overlay`'s `scrim` prop
documents which grounds are safe without a wash: *"an overlay over a
palette-derived ground — a painted backdrop, a card, a flat surface — genuinely
wants no wash and is safe."*

So the blocker was never the asset seam. It was that each of these primitives
was **described** in terms of a photograph — *a headline across a photograph*,
*the screenshot that is unreadable at tile size*, *two states of one thing* —
and the inventory classified on the description.

`loom.pin` is the tell, and it is the second time this has happened to the same
row. On 21 September it was recorded that `pin` had been filed under *genuinely
missing* with a parenthetical saying it belonged in the image row, **and then
left in the first row anyway**; the correction on 23 September moved it and
named what it actually wants. One row was corrected by hand and the method that
produced the error was left in place, so it produced four more.

## Decision

**A primitive's reach blocker is read off its props schema and its slots, never
off its description or its doc comment.**

Concretely, for the inventory and for any report that classifies unreached
primitives:

1. **A required prop that nothing a composition may ship can satisfy is a
   blocker**, and it is named as that prop. `loom.media` is blocked on
   `src: mediaUrlSchema` and the row says so.
2. **A slot is not a photograph.** A region a primitive *places* (0051) is
   filled by the tree, so a primitive whose only unfilled regions are slots is
   reachable by definition — what is missing is a band, which is this lane's
   work and not a seam.
3. **Children are not a photograph either.** A primitive with `slots: []` that
   renders `children` takes whatever the band is made of.
4. **A row that cannot name the required prop, the closed vocabulary or the
   framework seam it waits on is not a blocked row.** It is an unbuilt band,
   and it belongs in the queue of work rather than in the queue of questions.

## Consequences

**Reach was understated by five primitives for five weeks, and the queue of
questions was overstated by the same five.** The cost was not idleness — the
lane built bands throughout — it was that *"seven primitives, four reports, and
a `loom.hero` that has never had a photograph in it"* was offered to the
maintainer as the library's largest single gap, and two thirds of it was work
this lane could have done without an answer.

**The asset seam is still real and still not this lane's.** `loom.media` and
`loom.embed` require a URL that no composition may ship, and the recommended
shape remains the binding seam
([0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md))
rather than the framework owning files. That recommendation is unchanged; what
changes is that it blocks **two** primitives rather than seven, which is a
different size of question.

**The rule generalises past reach**, which is why it is a record rather than a
line in a report. Every instrument this lane steers by is a walk over
declarations — what a primitive declares it reads, which behaviours have a
declarer, which parts have how many designs — and each of them can be read
either off the schema or off the prose beside it. The prose is written by
whoever built the thing, in the register of the example they had in mind, and it
ages the moment somebody finds a second use. A measurement taken off the prose
is a measurement of what the library's authors were picturing.

**It does not license ignoring a doc comment.** The two files that said their
grounds and their children were open were right, and reading them is what made
this cheap. The rule is about which of the two wins when they disagree: the
schema is what the runtime enforces and the prose is what somebody meant.

## Alternatives considered

**Correct the table and move on, with no record.** This is what happened on
23 September to `loom.pin`: the row was moved, the entry explained why, and
nothing said how the row had got there. The method that produced the error
survived the correction and produced four more instances of it over the next
fortnight. A second hand-correction would have been the cheapest thing to write
and the thing most likely to be needed again.

**Make it a test rather than a record.** A check that every unreached primitive
either has a required prop no composition can satisfy or is named in a closed
list of deliberate exclusions. This was genuinely attractive and is rejected for
the reason the reach check itself gives: a primitive is registered before a band
uses it, so anything asserting a property of the *unreached* set fires on the
ordinary order of work. It would go red every time this lane registered a
primitive and before it wrote the band — which is the sequence the library is
built in.

**Drop the classification and report reach as one number.** It is the number
that moves, and the `why` column is what makes it planning information rather
than a score. Reporting 100 of 107 with no breakdown would have hidden exactly
the thing this record is about: that five of the seven were work and two were
questions, and only the questions needed the maintainer.

**Treat the doc comments as the defect and rewrite them to stop picturing
photographs.** Rejected because they are not wrong. *A headline across a
photograph* is the case `loom.overlay` was built for and the best one-line
description of it; the same comment already names the palette-derived ground two
paragraphs later. The prose was doing its job and the measurement was reading
the wrong field.

## What this does not decide

Whether a band *should* exist for a reachable primitive is still 0162's and
0171's question, and three of the five were closed by bands in the run that
wrote this record — `comparison-wipe`, `testimonials-carousel` and
`cta-overlay`. `loom.lightbox` remains reachable and unbuilt, and the reason is
recorded as a finding rather than here: its central claim is the *opened* frame,
which `pnpm specimen` cannot press, so the band is worth having and its picture
will have to come from the other entry point of the harness.
