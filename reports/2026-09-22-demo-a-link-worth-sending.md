# A link worth sending

**Routine:** `Loom demo` · **Branch:** `demo-25-a-link-worth-sending` ·
**22 September 2026**

**Pull request:** #TBD · **Deployed preview:** in the pull request body.
To see it: paste the preview's `/demo` address into Slack, Discord or a
Mastodon compose box — or open **`/demo/opengraph-image`** directly, which is
the picture itself at 1200 × 630.

The twenty-fifth run of this lane, and the first one about the sixty seconds
*before* the sixty seconds.

---

## What a stranger could not understand before this run

**Nothing, if the link never reached them — and the link did not survive being
sent.**

I did what the brief asks and used this surface as a stranger would, against a
real `next build` of `main`, at 1280 × 900 and at 390 × 844. The honest finding
is that the demo itself now lands. Twenty-four runs have done that work: the
green button is the one press the Gate holds, the sentence saying *some asks
wait for you* is above it, the stage scrolls to the band and rings it, the card
answers the two questions in the words it asked them, **Apply this change** is
the only green on screen, and **Put it back** is a real change that is weighed
like any other. Four presses, two open questions, a decline and an undo all
produce coherent screens. I could not find a clunk inside the loop worth a unit.

What I could find was this, in one line of `curl`:

```
$ curl -s http://localhost:3000/demo  | grep -o '<meta property="og:[^>]*>'
$ curl -s http://localhost:3000/      | grep -o '<meta property="og:[^>]*>' | wc -l
9
```

**The front door unfurls with a title, a sentence and a drawn picture. The demo
unfurls with nothing.** Ten marketing pages carry `og:*`, `twitter:*`, a
canonical address and a card drawn per route. `/demo` carried a `<title>` and a
`<meta name="description">` and no share metadata at all — so on a client that
reads Open Graph and nothing else there is no picture, and on X, which draws no
card without `twitter:card`, there is no unfurl whatsoever.

That is the wrong way round. A marketing page is a page somebody *arrives* at.
The demo is the thing somebody **sends**: it is the artefact a developer pastes
into a team channel under *look at this*, and `docs/rollout.md` names this lane
the conversion artefact for launch. The one surface built to be handed to a
stranger was the one surface that could not be handed to anybody.

[What a paste produced, and what it produces now.](2026-09-22-demo-a-link-worth-sending-unfurled.png)

## What a stranger can understand now

**The claim, before they have decided whether to click.**

The card is the demo's own composition rather than a logo on a gradient: the
clinic's page on the left, light, with its figures ringed in amber and chipped
*This would be removed*; Loom's rail on the right, dark, carrying **Waiting on
you**, the ask in the visitor's own words, and the sentence this whole surface
exists to make true —

> **Loom will not make this change until you say yes.**

[The card, at full size.](2026-09-22-demo-a-link-worth-sending-card.png)

The split is the composition because the split is the argument. This surface's
one structural decision is that the stage is light and the rail is dark, so a
visitor can tell the page being changed from the thing changing it
(`globals.css`); a card that lost that would be a picture of a product rather
than of a claim. It is also the only thing that survives the size these are
actually seen at.

[The same card at 280px and 180px](2026-09-22-demo-a-link-worth-sending-thumbnail.png)
— a phone in a thread, and the smallest any client draws one. The split, the
ring and the verdict all still read.

| | `main` | this branch |
| --- | --- | --- |
| `og:title` / `og:description` / `og:url` / `og:site_name` | none | present |
| `og:image` (+ width, height, alt, type) | none | 1200 × 630, drawn |
| `twitter:card` | none | `summary_large_image` |
| `<link rel="canonical">` | none | `/demo` |
| the page at `/demo` | — | **byte-identical**, same `md5` |

## The change

### Not one word on the card is new

This is the property the unit was built around, and it is what the tests are
about. A share card is the **one artefact on this project that is only ever seen
by somebody who does not work here** — nobody on this repository looks at an
unfurled link — so a sentence invented on it would be the only copy about this
surface that nothing on the surface could ever correct. It would go on
advertising a demonstration this deployment had stopped giving, silently, for as
long as nobody pasted the link.

So every word is quoted, and `share.ts` names the source of each:

| on the card | read from |
| --- | --- |
| the eyebrow and the headline | `demoPageTree()` — the hero's own props and its `level: 1` heading |
| `3,400` · `24` · `92%` and their labels | the `loom.stat-grid` the leading ask removes |
| *This would be removed* | `labelFor("removed", "awaiting", "node", false)` — the call the ring on the stage makes |
| **Waiting on you** | `plainState("waiting").label` |
| *Loom will not make this change until you say yes.* | `plainState("waiting").meaning` |
| *“Take the numbers band off the page.”* | the leading preset's `utterance`, verbatim |
| the footnote | the document's own `description`, so the picture and the tags say one thing |

Every lookup throws rather than falling back. A tree with no hero, a preset table
that renamed its lead, a vocabulary that dropped `waiting` — each of them fails
the build rather than drawing a card about a page that is gone.

### The two halves take their colours from different places, and that is the surface's own division

`ImageResponse` resolves no cascade and no custom properties, so a card styled
`var(--surface-page)` draws black on black. Something has to be copied.

- The **rail's** colours are `chrome.ts`, which is the subset of `globals.css`
  the picture needs — and `chrome.test.ts` asserts every one of them against the
  stylesheet's own declaration, using the reader `globals.test.ts` already has.
  Retune the rail and forget the card and that test is red.
- The **stage's** come off `editorialPalette` in the runtime's theme library,
  because the page on the stage carries a registered theme of its own (0050) and
  always has. A chrome token for the page being changed is exactly the confusion
  `globals.css` was written to prevent.

`CARD_PAIRINGS` is the list the element draws from, and the test measures all
eleven pairs at 4.5:1.

### Next's file convention, which is the opposite of the marketing lane's choice

`(marketing)/share-image/route.tsx` is a route handler and says why: that site's
cards differ by query string, and the `opengraph-image` convention is never
handed one. The demo has exactly one address and one card, so the convention is
the version with nothing to get wrong — Next fills `og:image`, its dimensions,
its type and its alt text off the route's own exports, and `demoShareMetadata`
names the picture nowhere. One fewer URL written down twice.

`alt` is built from the card rather than typed, so it cannot drift either.

### What is imported rather than copied

`siteOrigin()` from `(marketing)/_lib/site.ts`, for `metadataBase`. This lane
already reads `HOME` and `DOCS` from that module in three files; where this
deployment is served from is one fact, and two readings of it would differ on
exactly the preview deployments nobody checks. Nothing in `(marketing)` was
opened for writing.

`elementsOf` and `firstOfType` were made exports of `presets.ts`, and `labelFor`
of `spotlight.ts`. All three are this lane's own files and all three were
already the single implementation; exporting them is what stopped `share.ts`
growing a second copy of a walk over the same tree.

### The defect this run drew, and the test that now catches it

The first card I rendered had the end of its one sentence off the right edge of
the image. A flex item will not shrink below its own min-content, so a rail
sized by `flexGrow: 1` widened to fit the longest unbroken run of the verdict
and drew past 1200px. **Every word was in the element tree and three of them
were not in the picture** — which is precisely the class of failure a test that
only checks the words cannot see.

The panes are stated widths now, and the test reads the widths *the element
draws with* rather than the constants beside them:

```ts
const panes = widths(image).filter((width) => width >= 300)
expect(panes).toEqual([PANE_WIDTHS.stage, PANE_WIDTHS.rail])
expect(panes.reduce((total, width) => total + width, 0)).toBe(SHARE_IMAGE_SIZE.width)
```

The first version of that test compared the two constants to each other and
passed against the broken card. This lane's own standing lesson — *a reading
that is not read off what ships is not wired* — caught it in the matrix below
rather than in a report.

## Decisions taken that were not specified

- **The card shows the question, not the answer.** The other composition on
  offer was the change *landed*: the band gone, a green mark, **Applied**. The
  held state is the better one to send, because the applied one is a picture of
  an AI editing a page, which is the least novel thing here and what everyone
  else shows. A held one is a picture of an AI being **stopped**, which nothing
  else shows.
- **The footnote repeats the description**, and it is redundant in Slack on
  purpose. Slack and Discord print the description beside the picture; X and
  LinkedIn print the title and drop it, so the strip on the image is the only
  claim that survives there. It costs 86px of a picture nobody would otherwise
  read a word of.
- **The captions under the figures are left off** — *four clinicians, six days a
  week* is a third line of small type that is illegible at every size this image
  is ever seen at. It is the only edit the card makes to the page.
- **No typeface.** `ImageResponse` draws with the renderer's own face rather than
  fetching one, so the image needs no allowlisted domain and cannot fail because
  somebody else's CDN is down. The rail's Geist is the one part of this surface
  the medium does not carry, and this says so rather than papering over it.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off a
pipe (`VERIFY_EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 158 | 2,927 |
| `@loom/app` | 293 | 5,246 |

The demo lane's own suite goes from **38 files / 506 tests** to **41 files /
550 tests** — **forty-four added, none
weakened, none skipped, none rewritten.** They are in three new files
(`chrome.test.ts`, `share.test.ts`, `share-card.test.tsx`) and every one is a
claim no test in this lane could previously make, because none of what they are
about existed.

### The defect matrix

Each defect restored in turn against the commit, the whole lane suite run, the
tree returned between rows. Baseline **550 passed**.

| defect restored | caught |
| --- | --- |
| a headline typed here rather than read off the tree | **1 test** |
| the ask becomes the chip's label, not the utterance | **1 test** |
| the verdict is reworded on the card only | **1 test** |
| the mark's chip drifts to the future tense | **1 test** |
| a figure is dropped from the band | **1 test** |
| the rail is retuned in `globals.css` and the card is not | **1 test** |
| the badge stops being the vocabulary's word | **1 test** |
| `summary` is asked for instead of `summary_large_image` | **1 test** |
| the origin goes, so the image address is relative | **1 test** |
| the footnote is rewritten away from the description | **1 test** |
| **the rail is sized by growth — the defect this run drew** | **1 test** |

Eleven rows, eleven caught. The last one is the one worth reading: it was green
against the first version of its own test, and that version was two constants
compared with each other.

**One thing this suite still cannot do**, and it is the honest limit: it asserts
the element tree, not the rendered PNG. A pane that is the right width and a
sentence that wraps to four lines in a box with room for three would go
unnoticed. What closes that is a rasterised comparison, and it needs a renderer
in the test environment — filed rather than built.

## Findings

**Closed one, for my half.**

- The **15 September** entry — *the other four surfaces unfurl as nothing, and
  the one that would draw them a card draws the wrong one*, filed by
  `Loom marketing`, owned jointly by `Loom docs`, `Loom demo` and `Loom lessons`.
  Closed for `Loom demo`, **still open for the other two**. Its option 2 was
  taken — draw your own — for the reason it gives: this card carries something a
  marketing card does not, which is the record beside the page. Its advice about
  the test was right and is taken: *a card is the one artefact only ever seen by
  somebody who does not work here, so it has to be checked by measurement rather
  than by looking.*

  Worth recording that I found this by measurement rather than from the queue: I
  went looking for what was clunky, found the loop sound, and reached the same
  fault from the other end. The entry had been open a week.

**Filed two.**

- `Loom demo` — **the card is asserted as an element tree and shipped as a
  pixel.** What the suite cannot see, with the overflow defect as the worked
  example and a recommendation about what it would take to close.
- `Loom daily build` — **`(demo)` and `(marketing)` now both hand-draw a card
  because the renderer has one projection.** Re-filed by reference against the
  29 August entry, with a second data point and what the second copy cost.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-fourth**
consecutive run. The cost this time is real and worth naming rather than waving
at: this is a new visual artefact in a medium with no prior art in this
repository, and a gallery of how other people compose a 1200 × 630 card is
exactly what I could not consult. What I used instead was the surface itself —
the card is the demo's own layout, which is the substitute the standing entry
has recommended twice.

## Open questions

Nothing blocking.

- **The judgement worth an eye is which moment the card shows.** It shows the
  Gate holding a change. The alternative — the change landed, the band gone, a
  green mark — is the more satisfying picture and the less interesting claim.
  I think the held one is right and the full-size image is there to disagree
  with.
- **The demo's own loop I could not fault, and that is a report rather than a
  boast.** If the maintainer's *clunky and not very good* still holds against
  what is deployed today, the specific screen would be worth more to this lane
  than any diagnosis I can produce from the inside: I have now read this surface
  twenty-five runs' worth and I am the worst-placed reader of it.
- **The automatic re-ask** (16 September) is still the largest thing open on this
  surface and still recommends being designed before it is built.

## The visuals

| | |
| --- | --- |
| [pasted into a channel, before and after](2026-09-22-demo-a-link-worth-sending-unfurled.png) | `main` draws the title and the sentence and no picture; X draws nothing at all |
| [the card, full size](2026-09-22-demo-a-link-worth-sending-card.png) | 1200 × 630, the file `/demo/opengraph-image` serves |
| [at 280px and 180px](2026-09-22-demo-a-link-worth-sending-thumbnail.png) | the sizes it is actually seen at |

**The page itself did not move by a pixel.** `/demo` at 1280 × 900, driven
against a `next build` of `main` and of this branch, is the same file both
times — `md5 e23ac498e73c1998a0532f555c8c2602`. That is the claim a unit which
adds a document's metadata has to make, and a screenshot is what checks it.

**To see it yourself:** paste the preview's `/demo` address into any client that
unfurls links, or open `/demo/opengraph-image` in a tab.
