# The band you drop in whole

**Routine:** `Loom primitives` · **Date:** 2026-09-09 · **Branch:**
`primitives-26-five-units-one-tree` (pushed onto #248) · **Section:** §4b

## What this run did, and why this rather than a ninetieth primitive

**Nine starting compositions**, and the seam that gets them onto a page. No new
primitive. Three defects in existing ones, all found by a screenshot.

The Hermes ledger closed yesterday — every *pair to build* and *atomic to build*
table in `docs/hermes-port-map.md` is empty, 68 of 70 blocks settled, and the
two that remain want a state seam and a binding rather than a primitive. So the
brief's breadth mandate is down to its second clause: *fill the gaps a marketing
page needs that Hermes never had*. Against eighty-nine primitives that clause is
thin. The library has a hero, a bento, a comparison table, a timeline, a
pricing table, a testimonial wall, a nav, a footer, a marquee, window chrome and
a carousel. What a ninetieth would add is a definition list.

**What is genuinely missing is not a primitive. It is the other half of the
argument every one of the eighty-nine was built on.**
[`docs/primitive-granularity.md`](../docs/primitive-granularity.md) makes the
case for decomposition and then answers its own strongest objection:

> The obvious objection to composition is convenience. If a hero is six nodes,
> does every hero start as six operations?
>
> No — because `insert` carries a whole subtree, not a single node. So a
> starting composition is **one `insert` operation** carrying a six-node hero.

Nothing built it. Twenty-seven runs paid decomposition's price and never
collected. The bill is written down in the port map, which files thirteen Hermes
blocks under *compositions — nothing to build* with this beside the first of
them:

> Building these as primitives would be the exact mistake the granularity doc
> names: a `loom.cta` with `title`, `desc`, `btnText` and `btnUrl` is four props
> impersonating four nodes.

That verdict is right, and **"nothing to build" is true of the registry and
false of the page**. A `cta` was still eight operations to put anywhere and a
pricing band was forty-two, which made the cheapest block in Hermes one of
the more expensive ones in Loom.

The maintainer's framing is the tiebreak, as it was on 1 September: *"when we
demo this it really needs to pop."* Nine bands that assemble into a landing page
in nine reviewable operations is a demonstration. A ninetieth primitive in a
library of eighty-nine is a number going up.

**No comments were outstanding** on #248 or on the five pull requests it
consolidates — the only comments on any of them are this lane's own and
Vercel's. **The four open findings owned by this lane are all limits recorded so
they are not rediscovered as bugs**, not defects waiting on a fix, so the
findings queue was empty and the plan was the top of the stack.

**Pushed onto #248 rather than a new branch**, for the third consecutive run,
following your #216 finding rather than step 3 of my brief. Filed again below.

## The nine bands

| | Nodes | What it is |
| --- | --- | --- |
| `hero` | 11 | eyebrow, level-one heading, lead, primary + secondary action |
| `proof` | 8 | a logo wall of six names under one line |
| `features` | 13 | a titled section over six feature tiles |
| `metrics` | 6 | four figures on a surface, to break the page's rhythm |
| `pricing` | 42 | three tiers, their perks, their buttons, one badge |
| `testimonials` | 8 | three quotes, attributed by role |
| `faq` | 10 | five questions at a reading measure, the first open |
| `cta` | 11 | the closing ask on the accent ground |
| `footer` | 52 | four link columns, a wordmark, a legal line |

`pricing` and `footer` are the two that make the case on their own: **ninety-four
nodes between them**, every one of them decomposed for a reason 0052 gives, and
every one of them an operation somebody had to author by hand until today.

They are in the order a landing page uses them, and that order is the only extra
information `STARTER_COMPOSITIONS` carries over the nine modules. Taken in
sequence they are a page — which is what the screenshots are.

## What a composition is, in four properties

[0120](../decisions/0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md)
is the record. The short form, because each part refuses something:

1. **A subtree, not a primitive.** Every node is a type already registered.
   Nothing is added to the registry, and a `loom.cta` with four props would have
   been the fat primitive the granularity doc spends four pages refusing.
2. **It arrives through the interpretation seam.** One `insert`, wrapped in a
   `ChangeInterpreter`, handed to `commitIntent` like anything else — assessed,
   gated, held, logged, revertable. This is 0057 applied to a second case, which
   is what 0057 was generalised for; it is not a second pattern.
3. **It re-plans against the tree it is handed.** A band chosen against a page
   that has since grown two more appends after them. A band whose named parent
   is gone declines rather than proposing something the runtime would refuse.
4. **It leaves no trace of itself.** Nothing records which composition built a
   band and nothing can. That is the property that keeps a catalogue a
   convenience *over* the delta model rather than a second way to author one —
   and it is asserted, not just asserted about.

The brief's constraint — *a catalogue of them must never become a parallel
channel into the tree* — is what (2) and (4) exist to satisfy. There is no new
door: the catalogue is published on the `@loom/runtime/primitives` entry point
that already existed, and **nothing outside `src/primitives/` was edited**
except the generated API reference, which is regenerated rather than written.

## Which fields became nodes and which stayed props

The question 0052 asks of a port, asked here of an assembly. Nine bands, and the
interesting answers are all in one direction — **things that look like a
composition's parameters and are not**:

| Looks like a parameter | Is | Why |
| --- | --- | --- |
| how many tiers a pricing band has | **nodes** | `insert`/`remove`. A `pricingBand({ tiers: 4 })` is the original mistake wearing a function signature |
| which tier is "Most popular" | **a node** | a `loom.badge` in the `badge` region, so moving it is one `move`. `loom.tier`'s own doc comment already argued this; the band is where it becomes visible |
| whether a tier is featured | **a prop** | `emphasis` paints a ring; no delta reorders a border |
| which FAQ starts open | **a prop** | changes what a reader can see, changes no node |
| the logo wall's introducing line | **a prop** | exactly one of it, on the container |
| the six names in the wall | **nodes** | however-many, each insertable alone |
| how many columns a grid has | **a prop** | a floor fed to `auto-fit`, never a count — unchanged from `loom.feature-grid` |
| which way a footer group runs | **a prop** | `direction`. The clearest small pair in the catalogue: *how many* is structure, *which way* is a prop, and they are the same primitive one field apart |

**Nothing in a composition is parameterised at all**, and that is the decision
rather than an omission. A parameter that decides how many children exist is
`insert` and `remove` smuggled into an argument list, and the answer is the same
as it is for props: insert the band, then insert a tier.

## The copy rule, and the one place it bends

Nine bands of "Lorem ipsum" would not read as a page, which is the whole thing a
starting composition is for. So the copy is ordinary product English a page
would keep and edit — with one line drawn: **nothing that would be a claim about
a third party if it were left in.**

- **No named customers.** The logo wall is six company-shaped words with no
  owner, drawn as wordmarks. A real name would be this library putting a false
  customer claim into a tree a page may publish before anyone re-reads it.
- **No attributed testimonials.** The three quotes are attributed by *role* —
  "Head of Platform", "Engineering manager, 40-person team" — and no name and no
  company. Structurally complete, obviously unfinished to whoever fills it in,
  and not a fabricated endorsement.
- **No outbound links.** Every `href` in the catalogue is a same-origin path:
  `/start`, `/pricing`, `/docs/api`. 0100 and 0102 are what make that
  expressible, and there is a test that fails on the first `https://` anyone
  adds. Twenty-one live links in the footer and not one dependency outside the
  deployment.
- **No images, anywhere.** `mediaUrlSchema` refuses `data:` deliberately and a
  same-origin path names a file this library cannot put in a host's `public/`,
  so a `src` would be either a broken image or a live third-party request. The
  hero's `media` slot ships empty and `loom.quote` draws its own monogram.
  Asserted, so the next band cannot quietly add one.

## The three defects a picture found, and no assertion could

**Eighth consecutive run in this lane.** All three are valid CSS, all three
render with no diagnostic, and all three are in the geometry — which vitest has
no layout engine to measure.

### 1. A feature tile was taller than the row it was in

`loom.feature` sets `height: 100%` and `padding: space(5)` and never set
`box-sizing`. The percentage resolves against the grid track and the padding is
then added *outside* it, so **every card overflowed its own row by 66px**. With
one row that put the tiles over the top of whatever band came next; with two
rows the second row was drawn **through** the first.

Measured rather than eyeballed — row one `240 → 558`, row two `524 → 842`, a
34px overlap against a declared 32px gap. After the fix, `240 → 492` and
`524 → 776`.

It had never been seen because **no fixture in this repository had ever put six
tiles in a three-column grid.** The composition is the first two-row feature
grid the library has rendered, and it found a defect that has been on `main`
since `loom.feature` shipped. `loom.section` writes the same
`boxSizing: "border-box"` line with the same reasoning — *"no stylesheet resets
these"* — which is what makes this an omission rather than a difference of
opinion.

### 2. A band narrower than the page sat flush against its left edge

`loom.page` lays its children out in a column and a flex item defaults to
`stretch`, so a `loom.section` at `width: "readable"` inside a `wide` page
capped itself at the measure correctly and then sat against the left edge with a
third of the page empty beside it. The closing call to action and the FAQ list
were both drawn that way and both looked like a mistake.

`marginInline: "auto"` on `loom.section` and on `loom.faq-list`. **Neither
primitive was wrong on its own**, which is why ninety of them missed it: the
section's width was right, the page's width was right, and the defect only
existed in the pair.

### 3. The harness photographed the hero mid-animation, and it nearly shipped as a defect

The first hero screenshot had **no buttons in it**. They were in the DOM, at the
right size, with the right colours — the entrance animation had not finished at
the 300ms the harness waited, and the primary action was at an opacity that
rendered as nothing on the dark palette. It was one step from being written up
as *the hero drops its actions slot*.

`reducedMotion: "reduce"` on the browser context and a longer settle. This is
the same shape as the 6 September finding about `loom.reveal` photographing a
page blank — **the standing recommendation should be that every screenshot in
this repository is taken with reduced motion**, not just the ones with a reveal
in them. Filed.

Two guards were added for (1) and (2). They assert the declaration rather than
the geometry, because the geometry is not assertable here — a guard against the
line being deleted, not a proof that the layout is right. The proof is the
screenshots, and that asymmetry is now eight runs old.

## Records

**[0120](../decisions/0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md), `Accepted`.**
It decides where a thing that did not exist lives and what it is called; it
refines no `Accepted` record, changes no schema, and touches neither the tree
nor the delta model. It is 0057 applied to a second case, which is what 0057 was
written to generalise, so it is not an escalation.

Numbered **0120**, skipping `0116`–`0119`, on 0097's licence and the same
reasoning 0115 gave yesterday: thirty pull requests have been open since
1 September, a clash is fatal to every lane's `pnpm verify`, and a hole costs one
line in the index.

## Findings

**Filed — four**, below and in `FINDINGS.md`. **None closed** — the four this
lane owns are all recorded limits rather than defects, and none of them was
touched by this run.

## Test numbers

`pnpm verify` **green**.

| Suite | Files | Tests |
| --- | --- | --- |
| Runtime | 120 | 1,946 |
| Application | 158 | 2,497 |

**Thirty-three tests added** — 31 in a new `src/primitives/compositions.test.ts`
and 2 in `library.test.ts` for the geometry above. **Nothing was weakened and
no existing expectation changed**, which is worth saying because three
primitives changed their rendering: all three changes are additive CSS
properties that no existing assertion reads.

The one worth knowing about is the rot check. A composition names its primitive
types in string literals, so it can disagree with the subtree it builds and with
the registry — and the failure would otherwise be a band silently losing nodes on
somebody's page months from now. Every band is rendered under both starter
palettes and any diagnostic fails the build; `uses` is checked in **both**
directions against the types actually built.

Every screenshot is at a **true 1280px or 390px viewport** at
`deviceScaleFactor: 2` with `reducedMotion: "reduce"`, each carrying a
`scrollWidth === innerWidth` measurement: **four of four, no overflow**, both
palettes, both widths.

## The cross-lane line

**None.** This run adds no primitive, so `FACTS.primitives` does not move, and
`FACTS.decisions` became a floor rather than a count on 8 September. The only
file changed outside `src/primitives/` is
`apps/loom/app/(docs)/_lib/api/reference.generated.json`, which is generated by
`pnpm --filter @loom/app docs:api` and not written by hand — the same
regeneration #248 already documents.

## What the library still cannot express

- **A tab strip**, still, and it is now the only band on a modern marketing page
  the catalogue cannot assemble. Blocked on a `select` member of the behaviour
  vocabulary, which is the framework lane's and needs a record.
- **A pricing toggle** — monthly against annual — for the same reason. It is the
  one thing missing from the `pricing` band, and it is state rather than
  structure.
- **A band with an image in it.** Every media slot in the catalogue ships empty,
  and that stays true until a deployment has assets. The right answer is
  probably the binding seam (0058) rather than a URL in a composition.
- **A composition a surface can offer as a menu.** The catalogue is a list with
  labels and promises, and no surface renders it. That is the first thing worth
  building on top of this, and it is not this lane's file.
- **A shadow slot in the palette.** Unchanged since #188.
