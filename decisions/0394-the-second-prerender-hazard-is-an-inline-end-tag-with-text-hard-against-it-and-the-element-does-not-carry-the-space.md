# 0394. The second prerender hazard is an inline end tag with text hard against it, and the element does not carry the space

**Status:** Accepted
**Date:** 2026-11-13
**Section:** §1 (process)

## Context

[0119](0119-the-page-a-reader-gets-is-the-one-pnpm-verify-reads-last.md) put one
hazard in `pnpm prerender:check`: React's `<!-- -->` separator between two
adjacent text children, failing when the characters either side of it run
together. It closed with the terms for a second one:

> The check is also blind to any hazard nobody has met yet. It is one class, the
> one that shipped. Adding a second is a function and a test beside this one,
> and the argument for each should be a defect that reached a reader — not a
> hazard somebody imagined.

**One reached a reader on 23 October**, filed by `Loom docs` and open since. The
source is an ordinary sentence with a real space in it:

```tsx
<p>…so a page can say <em>color</em> in a sentence and show you a name…</p>
```

`container.textContent` under `vitest` reads *say color in a sentence*. What
`next build` wrote is:

```html
…so a page can say <em>color</em>in a sentence…
```

**`pnpm prerender:check` passed** — 133 pages, 1,917 text junctions, 0 run
together — and the page was found by looking at a screenshot. This is 0119's
defect one step to the left. There the space had been *moved* into a second text
child, so React wrote a separator and the check had a marker to read. Here the
space was *dropped*, so there is no second text child, no separator, and nothing
for a detector built on the marker to look at. **A hazard that leaves no marker
is invisible to a detector built on the marker.**

The mechanism that drops the space is not established, by that entry or by this
record. What is established is the artefact: the source has the space, `vitest`
renders it, the built page does not.

## Decision

**A second class, beside the first:** an inline element's end tag, with a
joining character immediately after it, and the element's own text ending in a
joining character too. `tagRunTogethersIn` reports it, `tagJunctionsIn` counts
what was read, and `pnpm prerender:check` fails the gate on either class.

Three things fix its shape, and each is a number read off this site's 139 built
pages rather than a judgement.

**Only text-level elements.** The hazard is characters a reader sees touch, and
they touch only when nothing between them breaks the line. The check reads the
spec's *text-level semantics* set — `a`, `abbr`, `code`, `em`, `span`, `strong`,
`time` and the rest — and says nothing about `</p>in` or `</li>two`, which are
the next line rather than the same one. This is the definition of the hazard
rather than an allowance: flagging a block element's end would turn the gate red
over correct output, and the gate is four surfaces' now.

**An element that carries its own space is not a junction.** 80 of this site's
82 inline junctions are `</span>`, and every one of them keeps the space inside:
`<span>Asked: </span>Make the main heading…`. Reading the character *before* the
end tag answers all 80 without naming `span` anywhere, which an allowed list of
tag names would not — a `</span>` that really did swallow its space would be
exempt for ever.

**One allowance, for the one shape with no second spelling.** The remaining two
are `<code>PageReading</code>s` and `<code>Map</code>s`: a plural hung on a code
chip. 0119 refused an exemption list because the junction it was about had an
honest alternative — `` {`${n}px`} `` rather than `{n}px` — so an exemption would
have been a second way to say one thing. **This one has no alternative.** Moving
the `s` inside the element styles it as code and changes what the page says; it
is the only way to write the sentence. The allowance is held to a single `s`
that ends the word, so a space lost before any word at all still reports.

**The closing direction only.** A space lost *before* a tag —
`say<em>color</em>` — is the same shape in the markup as a styled badge sitting
against the text it labels, and that shape is on this site **2,134 times across
139 pages**, every one of them correct. Nothing in the output tells them apart.
So the opening direction is left open, as 0119 left the span-crossing one, and
is stated in the module rather than hidden.

## Consequences

Measured on this branch, with the second class in: **139 prerendered pages,
2,103 text junctions, 0 run together; 82 tag junctions, 0 run together.** The
site is clean today and the two `</code>s` plurals are allowed by name rather
than by silence.

**Verified end to end rather than reasoned about**, as 0119's was: a page
carrying the 23 October sentence exactly as `next build` wrote it was put into
`apps/loom/.next/server/app`, the check failed with exit 1 and printed

```
__probe.html: reads "ri" — …so a page can say colorin a sentence and show you a name…
```

and the probe was removed.

**The message now cuts the junction's own markup out rather than blanking it.**
`contextAround` replaced every tag and comment with a space, which was invisible
for the first class — the separator is a comment and comments were already
removed with nothing — and would have printed this class's defect as
*say color in a sentence*, a sentence that reads fine and names nothing. Both
classes now print what a reader is served: `16of those blocks are TypeScript`
and `say colorin a sentence`.

**What it still cannot see**, beyond the opening direction: a space lost across a
nested element, `<span>Asked:<b>x</b></span>Make`, where the character before the
end tag is `>`. That is 0119's span-crossing blind spot met from the other side,
and closing it needs the rendered text stream, which is shape 2 below.

A surface that ships either shape now gets a red `pnpm verify` naming the page
and printing the sentence, rather than a screenshot somebody happened to take.
The whole check still costs about a second and opens no browser.

## Alternatives considered

**An allowed list of tag names**, which is what the finding costed: `</span>`
allowed wholesale plus `<code>…</code>s`. Rejected because the first half is
answered better by the mechanism — the space is *inside the span*, and reading
for that covers all 80 of today's cases and every future element that does the
same thing, while exempting `span` would blind the check to the one defect it
exists for on the element it is most likely to appear on.

**Comparing the built text against the `textContent` a test sees** — shape 2 of
the finding, and the complete answer to the whole class, both directions and
across nested elements. It needs a page rendered twice by two transforms and
lined up, which is a second tool rather than a function beside this one.
Not rejected: deferred, and the reason to build it is a defect this check misses.

**Nothing, with the finding as the record** — shape 3. It is a defensible answer
for one instance and it was the answer for three weeks. What makes it the wrong
one now is the same sentence 0119 ends on: the next instance is found by somebody
looking at a picture, and four surfaces share the transform and therefore the
blind spot.

**Flagging every end tag rather than the text-level ones.** Zero false positives
on today's site, because no block element's end is followed by text hard against
it — and that is luck rather than a property. The first `</p>text` or `</li>text`
anybody writes would be a red gate for four surfaces over output a reader reads
correctly.
