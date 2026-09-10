# The question was about a band nobody had seen, and named it `loom.stat-grid`

**Routine:** `Loom demo` · **Branch:** `demo-13-the-part-it-is-about` · **10 September 2026**

The ninth run of this routine, and the direct successor to the eighth. That run
ended by naming what it had not fixed:

> **A visitor on a phone still answers the Gate's question without ever having
> seen the band it is about.** … This branch gives them a way *back* from the
> mark; it does not put the mark in front of them in the first place. That is a
> second claim about what a stacked layout owes a visitor and it belongs in its
> own unit, with its own screenshot.

This is that unit. It does not carry the visitor to the band — that is the thing
`SpotlightScroll` correctly refuses to do, because it would carry them away from
the two buttons the question is waiting on. **It brings the band to the
question**, which is a thing only a runtime that keeps the page as a tree can do
at all.

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 390×844, 360×640 and 1440×900, as somebody
who had never heard of Loom, pressing what the rail puts first. The wide run is
the sequence the last eight reports describe and it reads. The phone run is this:

Press **Take the numbers off**. The rail brings the card into view and the Gate's
question arrives under your thumb, exactly where `AnswerInView` puts it —
*Apply this change* at **y = 646** in an 844px viewport. Then look at what you are
being asked:

> **“Take the numbers band off the page.”**
> Loom will not make this change until you say yes.
> Riskier than a request from here is allowed to be without asking.
> **[ Apply this change ] [ No thanks ]**
> What this would do to your page
> Deletes the `loom.stat-grid`, and the 3 pieces inside it.
> Inside `loom.page`

The band it is about — the clinic's three headline figures — is at **y = 4,620**.
Five and a half screens below. So the entire account of the thing a stranger is
being asked to personally authorise is **two registered type ids and a count**,
and not one word off the page.

That is the maintainer's own direction inverted at the exact moment it matters
most. *Plain language is the default; the technical record is one click away.*
Here the plain layer was `loom.stat-grid` and the click was optional.

### The part that no test could have caught, again

Sixth instance of this lane's standing diagnosis and the first that is a *seam*
rather than a missing line. **Nothing is broken. Everything is right.**

- `effect-view.ts` composes a plain sentence, and its own comment argues — well,
  and for its own surface correctly — that keeping `loom.card` and `n_gone` on
  the surface is what tells one row from another for a reviewer.
- `proposal-effect.ts` offers a words preview, `The words it takes away: …`, and
  it never fired here. `textIn` walks a node for children of kind `text`, and
  **`loom.stat` holds its figure, its label and its caption as props** — because
  [0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
  says a fixed field stays a prop and only repeated content earns a node. Both
  files are right. The intersection is a proposal to delete a clinic's proudest
  numbers, described to a stranger with none of the numbers in it.
- `spotlight.ts` rings the band in amber and labels it *This would be removed*,
  4,620px away, where it does nobody on a phone any good.

`grep` found in one call what reading the card had not: the words preview exists,
has four consumers, and cannot fire for the demo's own leading ask.

## What a stranger can understand now

The same press, same viewport, same scroll position — the buttons are still at
**y = 646**:

> **“Take the numbers band off the page.”**
> Loom will not make this change until you say yes.
> Riskier than a request from here is allowed to be without asking.
>
> **This is what would come off the page.**
>
> ┌──────────────────────────────┐
> │ **3,400**                    │
> │ appointments last year       │
> │ four clinicians, six days a week │
> │ **24** ⌄                     │
> └──────────────────────────────┘
>
> **[ Apply this change ] [ No thanks ]**

It is not a picture of the band and not a description of it. **It is the band**,
rendered a second time through the same registry, the same validator and the same
components the stage resolved, wearing the same theme. There is no second copy of
the clinic's page anywhere in this repository. That is the demo's own claim about
itself, taken at its word.

And for the other change the Gate holds — *Add the opening hours* — it is the one
preview that could not be a screenshot of anything, because the section is not on
the page yet. It comes out of the delta.

## The changes

### `_lib/in-question.ts` — which part, and what would happen to it

Pure, and takes a tree and a delta, for the reason `proposal-effect` gives about
itself: the mapping from "a delta and a tree" to "the part a person is being
asked about" is the part worth testing and it does not need React.

Three decisions in it:

- **The subject comes off the tree, except for an insert, where it comes out of
  the delta.** That asymmetry is the delta model's rather than this file's
  ([0001](../decisions/0001-tree-and-delta-as-the-unit-of-change.md)), and it is the reason
  a preview is worth building: an insert is the one change whose subject cannot
  be pointed at.
- **One part, ever.** The same discipline `MAX_SPOTS` applies to the marks, and
  more strictly — three previews stacked inside a question is a quiz. A delta of
  six has its whole account one click down, unchanged.
- **Nothing at all in three cases**, each one where a preview would be worse than
  none: the delta names the page itself (the re-theme — an excerpt of the root is
  the page, rendered twice, a hand's width apart); the delta names a node this
  tree does not have (the card already says *that part isn't on this page any
  more*, and a preview has nothing to draw); the delta has no operations.

### `demo/_components/part-in-question.tsx` — the rendering, and the theme it would otherwise lose

**A theme is mounted on the root *primitive*, not on the tree.** `mountedTheme`
resolves it from the root's reserved props and hands it to whichever primitive is
the root; `loom.page` puts the variables on its own element. Root a render at a
band instead and there is no theme at all, no diagnostic, and a preview of the
clinic's page in a typeface the clinic does not own. So the variables go on the
frame, taken from the `ResolvedTheme` the page render **already produced** —
re-resolving them here would be a second answer to a question that has one, and
the failure mode would be a preview in last month's palette that nothing catches.

**Edit mode is off, and that is load-bearing rather than tidy.** The mark on the
stage is a stylesheet keyed on `data-loom-node`, so a preview carrying that
attribute would match the same rule and draw a second amber ring, and a second
chip reading *This would be removed*, inside the card asking about the first one.

It is a Server Component and the card is a client one, so the page builds the
element and hands it across the boundary. That is the boundary working rather
than something worked around: rendering a tree needs the registry, and the
registry is not a thing to drag into a client bundle.

### `record-card.tsx` — above the buttons, which is the whole placement

Under them it would be an explanation offered to somebody who has already
pressed one. Above them, the sequence a stranger lives is: what you asked, what
Loom decided, *what it is about*, and then the decision.

### `globals.css` — the window, the fade, and the layer that nearly ate the rule

Three rules and each is a decision:

- **Hidden above 1024px.** There the band is ringed on the stage forty pixels
  from the card and a second rendering of it would be the surface talking for its
  own sake. In CSS rather than a `matchMedia` read at mount, for the reason the
  record bar gives.
- **The layout is in the stylesheet rather than in utilities on the element.**
  This is the one that would have shipped broken and is worth writing down:
  Tailwind orders its layers `theme, base, components, utilities`, so `flex` as a
  utility on `.demo-part` **outranked** `display: none` written in `components`,
  and the first wide screenshot showed the preview on a 1440px viewport with
  nothing in the code to say why. Moving `display: flex` into the same rule fixed
  it. `globals.test.ts` now holds both halves.
- **A window with a faded cut, 13rem tall.** At rail width the stat grid falls to
  one column and stands about 330px, which would have pushed the two buttons off
  the bottom of a phone — the exact defect `AnswerInView` exists to prevent,
  caused by the fix for a different one. The fade and the bottom padding are one
  number (44px) so a band *shorter* than the window ends above the fade and is
  never touched by it. 44px rather than 20px because at 20px the fade cut the
  second line of *Where to find us* through the middle of the letters and read as
  a rendering fault; over a whole line the same clip reads as a page going on.

## Decisions taken that were not specified

- **Only for a change that is waiting on an answer.** An applied change has moved
  the page — that is its own announcement — and a preview of what already
  happened is a receipt nobody asked for. The two conditions match `effect`'s,
  and for the same underlying reason: a change that has landed describes a tree
  that is gone.
- **Nothing in the preview is pressable** (`pointer-events: none`). It is the
  clinic's page rendered inside Loom's question, so *Book an assessment* in there
  is a button that is not on the page the visitor is looking at. It is **not**
  `inert`: that would take the preview out of the accessibility tree, and the
  visitor who most needs to be told what is about to be deleted is the one who
  cannot see the white panel. A link inside a preview can still take keyboard
  focus, which is a real if small imperfection; said here rather than left to be
  found. Neither change the Gate holds on this page contains one.
- **The jargon line was left exactly as it is.** *Deletes the `loom.stat-grid`* is
  still on the card, under the buttons, unchanged — it is `(portal)`'s file and
  the rule is that nothing is ever removed. The preview is the plain layer that
  was missing above it, not a replacement for the layer below. Filed for its
  owner instead.
- **The excerpt keeps the page's own treeId and revision**, because that is what
  it is: this page, at this revision, from one node down. Nothing mints an id,
  nothing is stored, nothing is committed or proposed.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record — it renders a node that was already being rendered.
  Nothing was escalated and nothing was left out for review.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, first attempt.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 |
| `@loom/app` | 160 | 2516 |

Nothing failed, nothing was skipped, no test was weakened. **Nineteen tests are
new:**

- **`_lib/in-question.test.ts`, nine**, in the node suite, with every operation
  computed by a real preset against the real tree rather than written as a
  fixture — the interesting failures here are the ones where the delta is right
  and the preview shows the wrong thing, and a hand-written operation cannot
  produce one. That a removal's subject is read off the page as it stands; that
  an insert's is the node the proposal is carrying, which the page does not have;
  that a move names the band that would travel; that the re-theme previews
  nothing, because an excerpt of the root is the page; that a node this tree does
  not have previews nothing; that an empty delta previews nothing; that only the
  first operation is previewed; that the excerpt keeps the identity of the page it
  came out of; and that every lead is in words a stranger has already been given
  and in the conditional.
- **`_components/part-in-question.test.tsx`, seven**, in the dom suite. The first
  of them is the whole unit: that the preview contains `3,400` and *appointments
  last year* — the words the card's own account of this change does not contain
  and structurally cannot. Then: that an insert shows a band the page does not
  have yet; that the lead sits above it; that the frame carries the page's theme
  variables; that it renders without a theme the way the stage would; that it
  carries **no** `data-loom-node`, so the mark on the stage cannot land inside the
  card; and that the two class names the stylesheet clips and hides by are both
  there.
- **`globals.test.ts`, three.** The wide-screen exemption; the layer trap, held so
  a future run cannot reintroduce it by reaching for a utility; and the window,
  the fade and the fact that nothing in it is pressable.

## Findings

**Filed:**

- `Loom portal`: **the plain reading of a change prints registered type ids, and
  its words preview cannot see copy held in props.** Both were found here and
  neither is fixable from this lane. The second is the one that widens: 0052 sends
  fixed content to props as a matter of direction, so `loom.quote`, `loom.stat`
  and everything like them report *n pieces* and no words, on the portal's review
  queue as much as on the demo's card.
- `Loom daily build`: **a preview of a tree loses its theme, silently, and there
  is no seam for "the words a node shows".** Both were worked around inside this
  lane in a handful of lines. What is missing is anything in the runtime that says
  how to render *part* of a themed tree — which is what every preview, inspector
  and side-by-side is.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, ninth
  consecutive run, while `docs/routines.md` lists it as allowed under both
  mechanisms.
- `@jonathanbravecredit`: **the brief still opens with the move to `/demo`**,
  which landed on 21 August — sixth consecutive run.

**Closed:** nothing. The two open findings owned by this lane are untouched and
both are still the right size for a unit of their own — the scope control
("ask about just this", 22 August) and the ring that still encircles a band that
did not change for a `near` mark (27 August).

## The one thing I did not fix, said plainly

**The visitor still cannot see the band in its place.** This preview shows the
part; it does not show where on the page the part sits, and on a phone the ringed
band and the sentence *the page is marked where this would happen* are still
4,620px apart. A visitor who wants to see the numbers *in the clinic's page* has
to go and find them. That may be the right amount — the question is about the
part, and the part is now in the question — but it is a claim I am making rather
than one I tested, and the honest next unit is the one that tests it.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **“Ask about just this”** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-09-10-demo-the-part-it-is-about-before.png) | `main`, 390×844, two seconds after **Take the numbers off**: the question, the two buttons, and `Deletes the loom.stat-grid` |
| [after](2026-09-10-demo-the-part-it-is-about-after.png) | the same press, same viewport, on this branch — the clinic's own numbers inside the question, buttons unmoved at y=646 |
| [insert](2026-09-10-demo-the-part-it-is-about-insert.png) | *Add the opening hours*: the one preview that cannot be a screenshot of anything, because the section is not on the page yet |
| [small](2026-09-10-demo-the-part-it-is-about-small.png) | 360×640, the narrowest phone worth caring about — the preview fits and the buttons stay on screen |
| [wide](2026-09-10-demo-the-part-it-is-about-wide.png) | 1440×900 on this branch — the preview is removed by the stylesheet and not one pixel of the wide layout moved |

Both phone pairs are the same script driven against two `next build` outputs —
this branch's and `main`'s — so the only difference in the frame is the change.
Not the preview deployment, which this environment cannot open (`vercel.app` is
not on the sandbox's egress allowlist; the standing 19 August finding).

**Preview:** see the deployment comment on the pull request. One push, one
preview.

**To see it yourself:** open `/demo` at 390×844 in a desktop browser's device
mode, or on a phone. Press the green button and look at what is between the rule
sentence and the two buttons. Then press **No thanks** and press *Add the opening
hours* instead — that one shows you a band the page does not have yet. Then widen
the window past 1024px and confirm it is gone, because out there the same band is
ringed in amber six inches to the left.
