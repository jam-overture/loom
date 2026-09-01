# The seams you were handed

**Routine:** `Loom primitives` · **Date:** 2026-09-01 · **Branch:**
`primitives-20-the-seams-you-were-handed` · **Section:** §4b

## What this run did, and why this rather than more primitives

No new primitives. Three that already shipped now use seams the framework lane
built for them and nobody had placed.

The brief's standing order is breadth, and the reason this run is not breadth is
`FINDINGS.md`: open findings owned by this lane are an input queue *ahead of the
plan*, and three of them are the same shape — **a capability arrived, here is
exactly where it goes, nothing is broken until you use it**. They had been open
for six, six and five days respectively. Two of them are not cosmetic:

| Finding | Filed | What it cost while open |
| --- | --- | --- |
| `loom.nav` is one declaration and one CSS rule from a phone menu | 25 Aug | the front door's bar was **three rows and a quarter of the first screen** at 390px |
| `loom.embed` still frames whatever the tree says | 26 Aug | an **AI-authored `iframe` src** reached the page with nothing but a scheme check on it |
| the render seam can make a decorative copy now | 25 Aug | one node id on two elements, correct only by accident |

The second is a security surface. The first is the single most visible defect in
the library on the device most of a demo audience will hold. Neither was going
to be fixed by adding a seventy-first primitive.

The maintainer's own framing is the tiebreak: *"when we demo this it really
needs to pop."* A bar that takes a quarter of the phone's first screen before
any content does the opposite, and it is the first thing on every page.

**No maintainer review comments were outstanding** on #204, #196 or #188 — the
only comments on all three are this lane's own and Vercel's. So the findings
queue was the top of the stack.

## The three placements

### 1. `loom.nav` collapses behind a menu button

`behaviours: ["disclose"]`, `text: { disclose: "Menu" }`, `interactive:
"always"`, a box around the control, and four rules in the stylesheet.

Three details are load-bearing and each would have shipped a rule that silently
did nothing:

- **The control is wrapped in a box this file owns.** 0092's plain contract is
  `[data-loom-disclosed="false"] ~ .region`, and it is unusable here: the
  control's button carries `display: inline-flex` *as an inline style*, so no
  rule can hide the button itself on a laptop. Wrapping moves the hiding to an
  element this primitive controls — the `:has()` form 0092 explicitly permits.
- **The menu's `display` had to leave the component.** It was an inline
  `display: flex`, and an inline value beats the rule that hides it. This is the
  same trap #204 reported from the other side — *a child that lays itself out
  inline cannot be rearranged by its container* — and it is now the second
  confirmed instance. Its alignment stays inline, because that varies by prop
  and nothing overrides it.
- **Nothing rendered means nothing hidden.** The control returns `null` until an
  effect proves scripting runs, so a page served without it has no button, no
  attribute, no matching rule, and the menu it always had. `:empty` removes the
  waiting box so it leaves no gap. The no-JS screenshot is the proof and it is
  in the pull request.

**One honest cost, stated in the file.** On a phone the menu is ordered below
the actions while sitting above them in the markup, so a reader tabbing through
reaches the links before the button they are drawn under. Reading order and
source order genuinely differ between the two layouts and no single source order
is natural for both; the source order is the laptop's.

**A defect the screenshots found and no assertion could.** The drawer first
shipped with `align-items: stretch`, which made every link fill the bar — and
the current-page marker is an underline the link paints across its own box, so
`Product` was underlined the full width of the phone. The same mark rendering as
a text underline on a laptop and a full-width rule on a phone is one primitive
saying two different things. `flex-start`. **Sixth consecutive run in this lane
where a picture found what the assertions could not.**

### 2. `loom.embed` honours the deployment's allowlist

`frames: ["src"]` and a branch. Two halves are worth reading twice:

- **The `src` placed is the seam's normalised `url`, never `given.src`.**
  Echoing the prop would leave the check advisory — two strings that are one
  origin to an allowlist can be two documents to a browser. There is a test that
  fails if anyone puts the prop back.
- **A refusal draws the box and says so**, on 0073's precedent. Rendering
  nothing reads as a page that forgot a section; rendering the frame anyway
  makes the allowlist decoration. The box keeps its aspect ratio so nothing
  around it moves.

**One string where `loom.form` has three.** The form splits its notices because
a visitor reads them differently — not finished, try again shortly, refused. A
frame has no such split: every refusal is a deployment that will not frame this
document, none is transient, and nothing a visitor could do differs. The reason
goes to the render diagnostics, where the person who can act on it is looking.
The notice names no origin and no registry, and there is a test that it does
not: a public page should not describe a deployment's shape.

The file's old closing paragraph — *"nothing here can tell"* whether a frame is
same-origin — is now false and was rewritten rather than left. The outcome
carries `sameOrigin`. It stays a **disclosure** rather than something this file
acts on: dropping `allow-same-origin` for a same-origin frame gives the document
a null origin and breaks the embed the host deliberately registered.

### 3. `loom.marquee`'s echo is a decorative copy

`loom.decorative()` rather than `children`. Nothing visible changes.

**The test that can be written is weaker than the change, and that is the
interesting part.** The echo exists only when published, and identity exists
only when editing — 0091 holds the band still for an editor and a still band has
no echo — so the two conditions are mutually exclusive in this primitive and no
render of it can show a duplicated id either before or after. Which is precisely
the finding's point: the old code was correct *by accident of where it is used*
rather than by construction, and an accident is not a property. The test holds
the visible half; the identity half is `render/decorative.test.ts`'s.

`loom.logo-cloud` still declines to scroll. Whether it *should* is a design
question, and the finding says so; it is not this lane's to answer alone.

## Which Hermes fields became nodes, and which stayed props

**None, either way.** This run ported no Hermes block and added no primitive, so
0052's granularity question was not asked. The Hermes port stands where #204
left it — **47 of 70 blocks on `main`**, with the remaining pairs (playable
media, reading, property, dated things) still the plan's next structural work.

The one granularity-adjacent call is that `disclose` is **not** a prop.
`open`/`collapsed` on `loom.nav` would be a prop that decides what a reader can
see, changing no node — and it would be wrong for a different reason than 0052's:
a render is a pure function of the tree (0008), so a tree-carried open state
would be a page that renders open for everyone or closed for everyone. The state
belongs to the reader, which is why 0092 puts it on the control.

## Records

**None written, deliberately.** All three changes are applications of records
already `Accepted` — 0092 for the disclosure, 0095 for the frame allowlist, 0093
for the decorative copy — and every non-obvious call is argued in the doc comment
of the file that makes it. Ten open branches already claim an `0096`; an
eleventh that decides nothing would be noise. If a record is wanted for the
`flex-start`/marker-consistency call, it is one file and I will write it.

## Findings

**Closed — three**, all owned by this lane, each naming this pull request.

**Filed — four:**

1. **A primitive that places a control cannot be hidden by its own primitive's
   stylesheet**, because the runtime's controls carry inline styles. Every
   future `disclose` or `copy` placement needs a wrapper for the same reason.
   Worth a sentence in 0086's neighbourhood; owned by `Loom daily build`.
2. **No surface renders `loom.embed`, so no surface wires `origins`.** The first
   one that embeds anything gets the refusal notice and will think the primitive
   is broken. Owned by every surface lane, and it is three lines when it bites.
3. **`facts.test.ts` still derives one count and hard-codes the other.**
   Sixteenth occurrence, fifth lane. Recommendation unchanged: **merge #174.**
4. **`21st.dev` blocked for the thirteenth time**, sixth lane. `docs/routines.md`
   lists it under `permissions.allow`; `WebFetch` returns `EGRESS_BLOCKED`. The
   visual bar in the brief has never once been consulted by the routine told to
   consult it.

## The cross-lane line

`apps/loom/app/(marketing)/_lib/copy.ts` — `FACTS.decisions` `"94"` → `"95"`.
One character in the marketing lane's file. `main`'s own `pnpm verify` fails
`facts.test.ts` independently of this branch (95 records, the constant says 94),
and the procedure forbids opening a pull request on red. This branch adds no
record, so 95 is the true count. **Sixteenth occurrence and the fourth time this
lane has had to make it.**

## Test numbers

`pnpm verify` **green**.

| Suite | Files | Tests | Skipped |
| --- | --- | --- | --- |
| Runtime | 111 | 1,751 | 0 |
| Application | 134 | 1,963 | 0 |

Nine tests added to `src/primitives/library.test.ts` (181 → 190). **Nothing was
weakened.** One existing test changed its expectation rather than its strength:
`loom.nav` left the "a container is not a target" list because the primitive's
nature changed — a container that places a `<button>` *is* a target, the registry
refuses the behaviour without the declaration — and a new test asserts the new
truth (`declarationOf("loom.nav")` is `"always"`) rather than the list simply
getting shorter.

Every screenshot was taken at a **true 390px viewport** through Playwright, and
each shot carries a `scrollWidth === innerWidth` measurement: **ten of ten, no
overflow**, both palettes, all three disclosure states.

## What the library still cannot express

- **A tab strip.** `tabs` is still blocked on client-side selection. `disclose`
  is now the second behaviour and the vocabulary's shape is proven, so a
  `select` member is a smaller question than it was — but it is the framework
  lane's and it needs a record.
- **A drawer that does not reorder itself.** The tab-order cost above is real
  and unavoidable without either two renders of the menu or a `move` the tree
  cannot express per-viewport.
- **A container query on the nav.** The collapse is a media query at `48rem`
  because making the bar a container would set containment on a `position:
  sticky` element and nobody has measured what that does. A nav in a narrow
  column will collapse late. The standing container-query finding covers it.
- **A shadow slot in the palette**, still. Unchanged from #188.
