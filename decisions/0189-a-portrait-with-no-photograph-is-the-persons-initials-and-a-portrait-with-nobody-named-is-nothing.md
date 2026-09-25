# 0189. A portrait with no photograph is the person's initials, and a portrait with nobody named is nothing

**Status:** Accepted
**Date:** 2026-09-25
**Section:** §4b

> **Why this number.** The highest record on `main` is `0187`, and `Loom daily
> build` has `0188` on an open branch (#388). This is the next free one, taken
> the way [0160](0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md)
> and [0155](0155-a-container-may-only-add-to-its-children-what-they-left-unspoken.md)
> describe.
>
> **Why `Accepted`.** It supersedes no record, changes no schema the tree
> depends on, and touches neither the tree nor the delta model. It names a rule
> four primitives in one library had already been answering two different ways,
> and says which answer is right. The one prop it adds is
> [0160](0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md)'s
> shape applied unchanged.

## Context

Four primitives in this library draw a person: `loom.avatar`, `loom.person`,
`loom.quote` and `loom.message`. Each takes an optional URL for a photograph.
On 25 September they answered *what happens without one* two different ways:

| | with a photograph | without one |
| --- | --- | --- |
| `loom.person` | the photograph | the initials |
| `loom.avatar` | the photograph | the initials |
| `loom.quote` | the photograph | **nothing** |
| `loom.message` | the photograph | **nothing** |

**This catalogue ships no photographs.** That is a standing decision, asserted
by test: a starting composition cannot supply an asset and will not link to
somebody else's. So the right-hand column is not an edge case here — it is the
*only* column. Every quote and every turn in every band this library ships was
faceless, permanently, and had been since each shipped.

Nothing caught it, and the reason is the reason
[0187](0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md) exists.
All four render cleanly, satisfy their schemas, emit no diagnostic and measure
no overflow. The difference is only ever visible in a picture — and until 25
September this library had never photographed a **page**, only bands. A wall of
faceless quotes four bands above a team band full of faces is not visible in a
shot of either one.

The strongest evidence that nobody could see it is that the catalogue had
already written the fallback down as fact. `testimonials-band.ts` said, in its
own doc comment, from the day the band was written on 19 September:

> `loom.quote` draws a monogram from the author when there is no avatar, so the
> band is complete without one rather than visibly missing something.

It did not.

## Decision

**A primitive that draws a person falls back to that person's initials, and
draws nothing at all when nobody is named.**

Both halves are load-bearing.

**The initials, not an empty box.** `loom.avatar` already argued this and the
argument generalises unchanged: *a monogram in the accent tint reads as a
decision; an empty grey circle reads as something that failed to load.* A
library whose asset column is permanently empty cannot treat the photograph as
the normal case and the absence as degradation. The drawn face is the normal
case here.

**Nothing, where there is nobody.** A face is a claim that somebody said this.
Where the tree names no one — `loom.message`'s `name` is optional, and a
transcript that is obviously one person and one assistant routinely leaves it
off — there is no face to draw and a circle in its place is a hole rather than a
decision. This is [0187](0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md)'s
rule about a frame, applied to the thing inside one.

**One function draws all four.** `src/primitives/portrait.ts`, beside
`monogram.ts` and for the reason that file gives: *"a second copy is how two
faces on one page end up disagreeing about what a three-word name reduces to."*
`monogramOf` moved the two letters out in August and left the circle behind,
and the circle is exactly what diverged. A rule four primitives have to remember
is a rule two of them will forget; a function they have to call to reach the
photograph at all is a rule none of them can.

What stays with the caller is the **box** — a portrait is answerable to its
content rather than to the theme, and a team card's 4.5rem, an attribution's
2.75rem and a chat turn's 2.25rem are all correct — and the **accessible name**,
which is the one argument that is not about paint. A portrait with the name
beside it in the same node is decoration and is hidden; a portrait standing on
its own is a picture of somebody and carries `role="img"` with a label. Getting
that backwards is a screen reader announcing the person twice.

### The prop this needs, and why it is a prop

A face can only be drawn from a name, and `loom.quote`'s `author` is not always
one. The canonical `testimonials` band attributes its quotes to **roles** —
*Head of Platform*, *Founder* — on the standing rule that a starting composition
may not ship a fabricated endorsement from a person who does not exist. The
initials of a role are not a face: *Founder* reduces to a circle with `F` in it,
which reads as a person whose name got lost.

Nothing can infer the difference. `monogramOf("Head of Platform")` is `"HO"`
and `monogramOf("Hanna Ochoa")` is `"HO"`, and no rule over a string tells the
two apart. So the tree says it, and `loom.quote` takes `anonymous: boolean`,
meaning **this attribution names nobody**.

That is [0160](0160-a-prop-that-unblocks-a-rendering-names-the-content-and-never-the-layout.md)
unchanged, and it meets all three of that record's conditions:

1. **Genuinely unobservable**, and the assertion above is the demonstration
   rather than the claim.
2. **It changes no node.** One record, one attribution, two renderings of it —
   `docs/primitive-granularity.md`'s question answered literally: changing it
   changes nothing about the set of nodes.
3. **Wrong degrades rather than breaks.** A quote wrongly marked loses a face. A
   quote wrongly unmarked puts the initials of a job title in a circle. Neither
   is a broken page.

And it names the **content**, never the layout: *nobody is named here* stays
true, where *draw no avatar* would pin every tree that said it to the answer
this library had in September.

`loom.message` needs no such prop, and the asymmetry is worth stating because it
looks like an oversight. Its `name` is already optional, so a turn that has
nobody to name simply has no name — the tree says the same fact by saying
nothing, and a second way to say it would be two spellings of one thing.

## Alternatives considered

**Leave `loom.quote` and `loom.message` as they were.** This is the status quo
and it is what every green test since 19 September endorsed. Rejected on the picture:
the wall of eight quotes reads as eight paragraphs and the team band four bands
below it reads as four people, and the difference is not a taste.

**Make the portrait a slot, and put a `loom.avatar` in it.** Genuinely
defensible, and stronger on 0052 than what was chosen: a quote with a face and a
quote without are different sets of nodes, the face becomes reachable by
`insert` and `remove`, and one primitive would draw every face in the library.
Not taken here, for two reasons — it removes a prop from two settled schemas,
which is a breaking change to every tree that carries one; and this run's
evidence is a photograph of a defect, which argues for the fallback and says
nothing about the seam. **Filed in `FINDINGS.md` rather than decided**, because
it deserves an argument of its own rather than a paragraph in a record about
something else.

**Infer whether the author is a person's name.** A heuristic over capitalisation
or word count. Rejected: `Head of Platform` and `Hanna Ochoa` are the same
shape, and a rule that is right most of the time puts a stranger's initials on a
page nobody re-read.

## Consequences

- Eight quotes in `testimonials-wall`, one in `proof-story` and every turn in
  `code-conversation` draw a face where they drew nothing. Photographed under
  both starter palettes in `the-face-the-band-promised.specimen.ts`.
- `testimonials` draws none, deliberately, and now says so in the tree.
- `.loom-message` aligns its row to `flex-start` rather than `flex-end`. The
  messenger convention puts a portrait at the foot of a speaker's last bubble
  and assumes a transcript with no name lines in it; this one prints the name
  and the time above the bubble, so a face pinned three lines below the name it
  belongs to belongs to nothing. That rule had never been rendered with a
  portrait in it.
- `library.test.ts` names the four rather than counting them, so a run that
  drops the fallback from one fails with the name of the primitive that went
  blank.
