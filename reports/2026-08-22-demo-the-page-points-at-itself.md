# The page points at itself

**Routine:** `Loom demo` · **Branch:** `demo-02-the-page-points-at-itself` · **22 August 2026**

The second run of this routine, and it closes the open question the first one
ended on: *nothing points at what changed on the page.*

---

## What a stranger could not understand before this run

I used the demo the way somebody who had never heard of Loom would, at 1440×900
and at 390×844, and the failure is the same one in both.

**Three of the five changes act below the fold, and two of those are the ones the
Gate holds.** A visitor presses *Remove the stats* — the most interesting button
on the surface, because it is the one that produces a held proposal — and the
band it is about is four hundred pixels below the visible page. What they see is
the specimen page not moving, and a paragraph in the rail about a part of the
screen they cannot see.

So the demo's whole argument arrived one-directional. The rail explained the
change in the runtime's own words; the page — the thing that had *actually*
changed, and the only evidence a stranger has that any of it is real — said
nothing. The card said `remove demo-n32` behind a disclosure, which is exact and
is not an answer to *where*.

Two smaller failures fall out of the same gap:

- **On a phone it was worse**, because the page is not beside the rail, it is
  underneath it. "Press something, then scroll down" asks a visitor to go
  looking for a difference they were never shown.
- **Answering a hold produced no visible event at all.** *Apply this change*
  removed a band nobody could see, so the payoff for the surface's most
  persuasive interaction was a badge changing colour in the rail.

## What a stranger can understand now

They press *Remove the stats*. The stage scrolls to the numbers band, which is
now **ringed in amber with a chip reading "This would be removed"** — and in the
rail, forty pixels from their cursor, an amber badge saying **Waiting on you**,
an amber dot, and the sentence *"The page is marked where this would happen, if
you say yes."* Nobody has told them what amber means. They have seen it in three
places at once and read it.

They press *Apply this change*. The band is gone, the revision ticks to 1, and
the band that now stands where the numbers were is **ringed in green: "Something
was removed here."** The dot in the rail is green, the badge says **Applied**,
and *Put it back* is under it.

The colour is the entire mechanism, and it is the same two colours the record's
own badges have always used — so the teaching costs no new vocabulary and no
legend.

## The changes, in order of how much they move that

### `_lib/touched.ts` — the delta, read for *where* rather than *what*

`record.ts` already turned each operation into a sentence for a reader.
`touchedBy` reads the same operations for the node they name, and it is a
projection of what already exists rather than those sentences parsed back out —
a sentence is written for a person and drifts when it is copy-edited.

The interesting case is a **removal**, which has left the tree and has nowhere to
point. Its parent and index survive in exactly one place: the `insert` in the
inverse delta that would put it back. `assessReversibility` computes that
whether or not anybody undoes anything, so pointing at the gap costs a field
read.

### `_lib/spotlight.ts` — where to look, and what to call it

One resolution serves both halves of the demo, which is what makes this small.
For a change that **applied**, the tree on the stage is the result and the marks
land on what moved. For one still **waiting**, the tree is what it *would* move
and the marks land on what it is asking about. Neither can point at a node that
is not there, because both resolve against the tree the visitor is looking at.

Four decisions worth stating:

- **The root is never marked.** The re-theme configures the page node, so a mark
  would ring the whole stage and say "everything" — which is what the page
  turning over says already, and better. That preset draws no mark, deliberately.
- **A missing node is marked on its neighbour**, and the label changes with it:
  *"This would be removed"* on the band itself, *"Something was removed here"* on
  what now stands in its place. A chip reading "removed" on a band still standing
  would be the largest lie this surface could tell, so `placed` is a parameter of
  the label rather than an afterthought.
- **One change is marked, never two.** A held change wins, because it is the only
  thing on screen asking the visitor for something; failing that, whichever
  change produced *the revision now on the stage* — a stricter test than "the
  newest record", because answering a hold completes the record where it was
  asked rather than adding one.
- **At most three marks.** Ringing nine bands says "everything changed", which is
  the one thing a mark exists to disprove.

### It is a stylesheet, not a script

The mark is rules keyed on `data-loom-node` — the attribute edit mode already
puts on every primitive's own root — so it decorates without restructuring, works
before React hydrates, and is `""` when there is nothing to say. `renderLoomTree`
gains `editMode: true` for that and nothing else: the demo is not an editor and
nothing writes through the DOM.

The rules are served in the body rather than hoisted, and that is load bearing:
the primitives' own stylesheet is hoisted into the head with a precedence, so a
body rule of equal specificity wins the tie on source order. A primitive that has
its own `::after` (`loom.cover-link` does) loses to the mark rather than silently
swallowing it.

### What genuinely needed a browser

Scrolling, and it took two corrections that only a screenshot could have found.

- **Which scroller moves.** Wide, the stage scrolls inside itself and the rail
  does not move, so bringing a band into view costs nothing. Stacked, the two are
  one document — so scrolling to a change the Gate is *holding* would carry a
  phone visitor away from the two buttons it is waiting on. It scrolls always
  when wide, and when stacked only for a change that has landed.
- **A band taller than the screen cannot be centred.** The hero on a phone is
  exactly this: `block: "center"` showed its middle, which is the one part of it
  that says nothing about the change. Over three-quarters of the viewport, it
  goes to the top instead.

### Where the chip sits, and why it moved twice

**Inside the band's top-right corner**, and both halves are corrections rather
than taste. *Inside*, because `loom.hero` clips its own overflow for its backdrop
— straddling the top edge cut the chip in half on exactly the band a phone
visitor had just been carried to. *Right*, because a band's first words are at
its left: at the top-left the chip landed on the stat grid's first figure, and a
mark that covers what it is pointing at has undone itself.

## Decisions taken that were not specified

- **No decision record this run.** Nothing here touches the tree schema, the
  delta model or an `Accepted` record — the mark is a projection of a delta that
  already exists and a stylesheet over an attribute that already exists. Nothing
  was escalated and nothing was left out for review.
- **Held changes are marked too**, not just applied ones. It was not asked for
  and it is the better half: the demo's most persuasive moment is *Loom is asking
  about **that** band*, and pointing at it is worth more than describing it.
- **The re-theme deliberately draws nothing.** Recorded because an absent mark on
  the primary button looks like a bug until you know why.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 101 | 1504 |
| `@loom/app` | 95 | 1162 |

Nothing failed, nothing was skipped and no test was weakened. **37 tests are new
this run**, all in this lane:

- `_lib/spotlight.test.ts` — **23**, and the shape is the point: every mark is
  resolved against a tree produced by driving a preset through the *real* write
  path — interpreted, assessed, gated, applied or held — rather than against a
  fixture delta. The interesting failures are the ones where the delta is right
  and the mark points at the wrong thing, and a fixture cannot produce those.
  Includes the two colours held against `globals.css`'s outcome tints, and the
  ring's contrast against **both** starter palettes' canvases, read from the
  registry — `editorial` is near-white and `bold` is near-black, and a visitor
  moves between them with one click.
- `_lib/touched.test.ts` — **5**, including the removal that is only locatable
  because the inverse is beside it.
- `demo/_components/change-spotlight.test.tsx` — **8**, the two scroll decisions
  and the tall-band case.
- `_lib/page-tree.test.ts` — **1** added: every band on the page has an
  addressable root in edit mode, with no diagnostics. That is the precondition
  the whole mark rests on, asserted where it can fail.

One test found a real fact I had wrong: *Move the quote up* is **held**, not
applied — a move near the root is a restructure. The test now asserts the same
node marked twice, in two colours, saying two different things.

## Findings

**Filed:**

- `Loom demo` — no framework gaps; `src/` was not opened. The mark needed
  `editMode`, `data-loom-node`, `findNode` and the inverse delta, all of them
  already public.
- `@jonathanbravecredit` — `21st.dev` is still `EGRESS_BLOCKED`, re-verified,
  dated on the existing entry rather than opened again.

**Closed:** none of mine. The 21 August finding for `Loom marketing` looks like
it is being answered by **#134** (*the front door leads to the demo*), which is
that routine's to close.

## Open questions

Nothing blocking. Two worth a sentence:

- **A refusal can now say a repair was declined and this surface still does not
  say it** (framework finding, 21 August, which names this lane's record panel as
  the obvious home). It was left for after #128 landed; #128 has landed, and it
  is the next thing I would build.
- **The demo knows which node a change is about and does not tell the
  interpreter** (framework finding, 22 August — `EditIntent.scopeNodeId` now
  saves 48–91% of a request). The presets do not need it. Free text might, and
  the demo is the one place a visitor can watch what a request costs.

## The visuals

| | |
| --- | --- |
| [held](2026-08-22-demo-the-page-points-at-itself-held.png) | *Remove the stats*: the band ringed amber, the chip, the amber dot and badge in the rail, the two buttons — the stage scrolled there by itself |
| [applied](2026-08-22-demo-the-page-points-at-itself-applied.png) | one click later: the band is gone, the gap is ringed green, revision 1 |
| [insert](2026-08-22-demo-the-page-points-at-itself-insert.png) | a held insert has no node yet, so the mark lands where it would go — eight hundred pixels down, and the visitor is taken to it |
| [record](2026-08-22-demo-the-page-points-at-itself-record.png) | the disclosure open: the whole account to the policy fingerprint, beside the mark it is about. **Nothing was removed to make the surface land.** |
| [phone](2026-08-22-demo-the-page-points-at-itself-phone.png) | stacked, after *Swap the hero backdrop*: carried to the top of the band, chip legible, nothing clipped |

Every screenshot above is this branch's `next build` output driven in Chromium,
not the preview — see the pull request for the preview URL, which this
environment cannot open.

**To see it yourself:** open `/demo`, press *Remove the stats* without scrolling
first, then press *Apply this change*. That is the sixty seconds.
