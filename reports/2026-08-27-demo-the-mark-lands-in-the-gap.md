# The mark was pointing at the wrong thing, and four runs looked for a free corner

**Routine:** `Loom demo` · **Branch:** `demo-07-the-mark-lands-in-the-gap` · **27 August 2026**

The seventh run of this routine. The six before it fixed where the demo lives, how
its controls are ranked, whose page is on the stage, which change the primary
button asks for, what the record says once you have answered, and what the undo
promises. The sequence is whole: **Loom proposes, the Gate stops it, you are
asked, you say yes, it lands, and you can put it back.**

This run is about the one thing on the page that was still wrong at the end of it,
and it has been open since 23 August: **the mark Loom leaves on the page was
pointing at a band that had not changed, and printing its label across that band's
own words.**

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 1440×900 and 390×844, as somebody who had
never heard of Loom, pressing what the rail puts first.

Press **Take the numbers off**. Loom stops, asks, you say yes, the three figures
go. The page scrolls you to the change and this is what is there:

> A green ring around the patient's testimonial — a band that did not change —
> with **Something was removed here** printed across its first line, over *"the
> coast path with my"*.

Two separate things are wrong in that frame and only one of them had been named.

**The blemish**, which the 23 August finding filed: the chip covers the words. A
mark that covers what it is pointing at has undone itself; that sentence was
written by the run before it about the opposite corner, and it indicted this one
too.

**The claim underneath it**, which nobody had written down: *the ring is around
the wrong band.* The testimonial is intact. It moved up because the numbers
above it are gone. A visitor who reads a green ring as *this is what changed* —
which is exactly what the ring means everywhere else on this surface — has been
told that Loom edited a patient's words, forty pixels from a card saying the
change was to the numbers.

So the sixty seconds ended like this:

> Land. Press the green button. **Waiting on you.** Press **Apply this change**.
> The numbers go. The page carries you to a testimonial, ringed in green, with a
> label across it saying something was removed. Leave, having watched an AI
> reach into a page and not being sure what it touched.

### The finding was four runs old, and the question in it had no answer

The 23 August entry asks *which corner is free*, and it had already ruled out
every candidate with a browser: top-left lands on the stat grid's first figure;
straddling the edge is cut in half by `loom.hero`, which clips its own overflow;
a padding on the marked node would move the page the mark is describing, which is
why the ring is an `outline` rather than a border. With every corner spoken for,
three consecutive runs deferred it behind a defect that broke the argument rather
than the finish — correctly each time, and by yesterday the deferral was itself
the finding.

**The question had no answer because it was the wrong question.** The chip is not
in the wrong corner of the right band. It is on a band that did not change.

And this surface's own code has always known that. `spotFor` has a branch called
`placed === "near"`, and it exists precisely because a removed node has left the
tree and an added one has not arrived: there is nothing to point at, so the mark
is *borrowed* onto a neighbour, and the label softens from **This was removed** to
**Something was removed here**. The distinction is written into the label table
in words. It was never written into the geometry — both kinds of mark were drawn
in the same corner — so a chip about an empty space was placed on the one surface
near it that is guaranteed to be full.

The free space was never a corner. **It is the gap** — the height a band vacated,
or the height a band is about to fill — and it is empty by construction.

That is this lane's standing diagnosis for the fourth run running, and the first
time it has predicted the fix rather than explained it afterwards: *this surface's
failures are not broken machinery; they are machinery that does not reach the
screen, or reaches it in a voice that belongs somewhere else.*

## What a stranger can understand now

The same press, on this branch:

> The green chip sits **in the gap the numbers left**, in the empty space between
> the divider and the testimonial. The testimonial's first line reads. The ring is
> still there and still green, and the chip above it says **Something was removed
> here** — pointing at the place where the numbers were, which is the only place
> on the page where anything happened.

And the ask that inserts a band, which had the same defect in a quieter form. On
`main`, **Something new would go here** sat inside the top-right corner of the
closing band, which reads as *the new thing goes in this one*. It now sits in the
gap above that band, which is where the section would actually be inserted — the
record's own disclosure says `into loom.page, before loom.section`.

Neither change touches the ring, the colours, the scroll, or a word of copy. The
mark says the same thing it said yesterday. It is now in a position that means it.

## The changes

### `_lib/spotlight.ts` — a `Spotlight` says where its chip goes

`SpotPlacement` is `inside | above | below`, and it is the difference between a
mark on a *thing* and a mark on a *place*:

- **`inside`** — the band the chip names is the band the change is about, so the
  chip is in its corner. Unchanged, including both corrections the 22 August run
  made with a browser: inside rather than straddling, because a primitive may clip
  its overflow, and right rather than left, because a band's first words are at its
  left.
- **`above` / `below`** — the node is not in this tree at all and the band is only
  its neighbour, so the chip is drawn outside the box, in the seam.

`neighbourOf` now returns the band **and which side of it the gap is on**, and
that turned out to be three separate corrections rather than one:

1. **The side is not a constant.** The old function resolved a position to *the
   band now standing there* — the band below the gap — except when the missing
   node was the last child, where a `Math.min` clamp silently returned the band
   *above* it instead. Same function, opposite side, indistinguishable from
   outside. A chip that always drew above its neighbour would point at the wrong
   seam by the height of a whole band.
2. **`index` counts children; the old walk counted elements.** It filtered to
   elements and then indexed with a number that had counted slots and text nodes
   too. Every child of the demo page's root is an element, so this has never been
   wrong here and would be on a tree whose bands are interleaved with anything
   else. The walk now steps outward from the position to the first element on each
   side.
3. **Above the first band there is no gap**, so the chip stays in the corner
   there. The top of the stage cannot be scrolled to, and `loom.hero` clips its own
   overflow, so a chip drawn above it is not imprecise — it is absent. Imprecise
   and legible beats exact and invisible, and the label still says *here* rather
   than *this*. No preset reaches this; a visitor typing their own ask can.

`spotlightCss` gains `chipPosition` and one more rule: a band carrying a chip
*beneath* it overlaps the band that follows, which paints later and would cover
the chip if it has a ground of its own — which on this page is every other band.
The marked band is lifted one step in the stacking order, which moves nothing: it
is already `position: relative` for the chip's sake. Only for `below`; a chip in
the gap above overlaps the band before it, which has already painted.

### `_lib/spotlight.test.ts` — five new, and two of them are for states no preset reaches

Both edge cases are reachable only by a visitor typing their own ask against a
configured model, which is exactly why they are held by tests rather than by a
screenshot: nothing else in this repository will ever look at them.

## Decisions taken that were not specified

- **The ring was left around the neighbour.** For a `near` mark it still encircles
  a band that did not change, and the honest alternative — dropping the ring and
  drawing a rule along the seam instead — is a second claim about what a mark
  *is*, in the same unit as the first. It also cannot be drawn safely: a seam rule
  needs either `::before`, which on this page is the testimonial's own quotation
  glyph and several other primitives' decoration, or a `box-shadow`, which would
  silently replace a card's own. With the chip in the gap the ring reads as the
  neighbourhood rather than the change, and the label carries the distinction it
  has always carried. Filed as a note rather than taken.
- **No decision record.** Nothing here touches the tree schema, the delta model or
  an `Accepted` record. It is a position, computed from a position the record has
  always carried. Nothing was escalated and nothing was left out for review.
- **One line in another lane's file**, and it is the standing `FACTS.decisions`
  defect: `(marketing)/_lib/copy.ts` said 94 decision records and `decisions/`
  holds 95, so `pnpm verify` was red on a branch that adds no record. Bumped to 95
  and filed. The alternative is a lane that cannot open a pull request until the
  owning lane next runs.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on the second attempt: the
first was red on `(marketing)/_lib/facts.test.ts` before the count above was
corrected, and green everywhere else.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 |
| `@loom/app` | 134 | 1968 |

Nothing failed, nothing was skipped, no test was weakened. **Five tests are new**,
all in `_lib/spotlight.test.ts`, and three existing ones in that file gained a
placement assertion:

- **The gap above the neighbour**, through the real write path: press the primary
  ask, answer it, and assert the mark's placement is `above` — the band is the one
  *below* the gap, so a chip inside it, or under it, points at a stretch of page
  where nothing was taken away.
- **The gap at the end of the page**, where the missing node was the last child and
  the only band left is above it.
- **The top of the page**, where there is no gap and the chip goes back in the
  corner.
- **The geometry itself**, asserted as `inset` rather than as a screenshot:
  `bottom: 100%` puts the chip's lower edge on the band's top edge; `top: 100%`
  puts it under; the corner case is unchanged.
- **The stacking rule**, in both directions — present for `below`, absent for
  `above`.

Run against the unmodified `spotlight.ts` first: **7 failed, 21 passed**. None of
them is asserting something that was already true.

`src/` was not opened. No framework gap was found and no primitive was wanted.

## Findings

**Closed:** the 23 August *the mark's chip lands on the words when a band's
content starts at its top right* — four runs open, and the answer was not a fourth
corner.

**Filed:**

- `Loom demo` → itself: the run's own diagnosis, with the three corrections the
  fix turned up, because the shape is now four for four and belongs in the channel
  rather than in a report.
- `Loom marketing`, `@jonathanbravecredit`: **`FACTS.decisions` again**, now
  having reached a lane that had not seen it before, on a branch with no decision
  record in it.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, verified a
  seventh time from this lane — and honestly, at no cost this run: what decided
  the chip's position was driving the built page and looking at where it landed,
  which no reference gallery could answer.
- `@jonathanbravecredit`: **the brief still opens with a task that landed on
  21 August**, fourth consecutive run. Dated on the existing entries.
- `@jonathanbravecredit`: **the commit-identity trap, sixth time.** I committed
  this unit as `jonathanbravecredit <jpizzolato36@gmail.com>` — the exact pair
  behind five blocked deployments — and caught it before pushing, on a glance at
  `git log`. Amended, no force-push, no preview lost. Filed because *how* it
  happened is the evidence: I had read the 26 August entry about it, in this
  session, twenty minutes earlier, and the appealing wrong thing was appealing
  again for its own fresh reason.

## The one thing I did not fix, said plainly

**The ring still encircles a band that did not change**, for a `near` mark. The
chip now says where the change was and the ring still says *look here*, and those
are no longer the same place — which is an improvement and is not the whole
answer. The reasoning for leaving it is above; the note is in `FINDINGS.md` for
whoever takes the mark next.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-08-27-demo-the-mark-lands-in-the-gap-before.png) | `main`, two seconds after **Apply this change**: the chip printed across the testimonial's first line |
| [after](2026-08-27-demo-the-mark-lands-in-the-gap-after.png) | the same press, same viewport, same scroll, on this branch: the chip in the gap the numbers left |
| [insert before](2026-08-27-demo-the-mark-lands-in-the-gap-insert-before.png) | *Something new would go here*, inside the closing band's corner |
| [insert after](2026-08-27-demo-the-mark-lands-in-the-gap-insert-after.png) | the same ask, with the chip in the gap the section would fill |
| [phone](2026-08-27-demo-the-mark-lands-in-the-gap-phone.png) | 390×844, the applied removal. The gap is narrower and the chip still clears the quote |

Every pair is the same script driven against two `next build` outputs — this
branch's and `main`'s — so the only difference in the frame is the change. Not the
preview, which this environment cannot open (`vercel.app` is not on the sandbox's
egress allowlist; the standing 19 August finding).

**Preview:**
`https://loom-git-demo-07-the-mark-la-f6764e-jpizzolato36-6341s-projects.vercel.app/demo`

One push, one preview. The commit identity was set and then reset before the push
rather than left alone — see the finding above; the pushed commits carry the
environment's default author, which is the one on the Vercel team.

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, and look at the gap between the diamond divider and the testimonial.
Then press *Add the opening hours* and look at the space just above the last band.

Nothing is scheduled and nothing is watching this pull request. The harness
subscribes a session to a pull request it opens before the routine gets a turn;
this one was **unsubscribed** immediately, which is the accurate word rather than
"not subscribed" (the 25 August finding).
