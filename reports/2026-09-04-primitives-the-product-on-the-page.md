# The product on the page

**Routine:** `Loom primitives` · **Date:** 2026-09-04 · **Branch:**
`primitives-23-the-product-on-the-page` · **Section:** §4b

## What this run built, and why these three

Three primitives: **`loom.frame`**, **`loom.pin`** and **`loom.rating`**. The
library is **73**.

They are one unit and the unit has a sentence: *what a page selling software
shows, that a page selling a person never had.* Hermes was a creator-profile
toolkit. A photograph of a person needs no chrome around it, a profile is never
reviewed, and nothing on a creator's page is a **running interface** — so
nothing in the seventy blocks is any of the three, and no amount of working down
the port map would have produced them.

The remaining Hermes work was the other candidate and it lost on the brief's own
tie-break. What is left of the seventy is `book-list` / `currently-reading` and
`property-listings` — a book shelf and an estate agent's grid. The brief says
*prefer the primitives the demo and the marketing site will actually stand on*,
and no version of Loom's own site anybody has sketched renders either of those,
while every version of it has to show the portal. A framework's front door
without a picture of the framework running is the gap that was actually costing
something.

**Why three and not four.** *Four excellent primitives beats twelve thin ones*,
and the corollary held here: `loom.pin` is a genuinely hard primitive — two
completely different layouts of the same node, chosen by the width of the thing
it is in — and it took the time a fourth would have. A `loom.banner` was the
candidate dropped, and it was the right one to drop: an announcement strip is a
tinted `loom.section` holding a `loom.link`, which is a **starting composition**
(0057) and not a registered type.

## Which Hermes fields became nodes, and which stayed props

Nothing was ported this run, so the honest version of this section is *which
fields Hermes **would** have written, and what they became instead*:

| Would have been | Is | Why |
| --- | --- | --- |
| `hotspots: Hotspot[]` on the frame | **`loom.pin` child nodes** | Repeated content a page adds, moves and removes one at a time (0052). Moving one mark two percent left is a `configure` on *that* node; as an array it would have been a `configure` carrying all of them, with no attribution for any single one and an inverse that restores all three. |
| `chrome` as three blocks | **one prop** | Three renderings of the same content selected from a closed set the schema names — 0052's display-mode rule. Swapping a browser for a phone is one `configure`, not a `remove` and an `insert` that drops the screenshot and every mark on it. |
| the screen content as `children[0]` | **the `surface` slot** | The one region the frame treats differently: clipped to the chrome, given the ground, laid *under* the marks. That is what earns a region a name (0051). "The first child is the screenshot" is a rule no schema states and every `move` breaks. |
| `x`, `y`, `side` on a pin | **props** | The granularity doc's near-miss, answered by its sharper question: changing any of them moves this one mark and changes the set of nodes not at all. Same kind of value as `loom.orbit`'s seat angle, expressed the same way. |
| five stars on a rating | **not nodes** | Nobody inserts a sixth star, removes the third, or moves the fourth in front of the second. One value, and the stars are how it is drawn. |

The pair is the **third instance of `loom.orbit`'s shape** — the repeated thing
in `children`, the singular thing it is arranged around in a slot — and the
first where the two arrangements of the children are different layouts of the
*same* nodes rather than two containers.

## The one thing in this diff that is not a primitive

`loom.pin`'s two renderings:

- **Where the frame is at least 40rem wide**, marks are absolutely placed over
  the screen, each label flying out to the side the tree chose.
- **Where it is not**, they are a numbered legend under the screen — because
  three labels flying out over a 350px screenshot are three labels lying on top
  of one another and on top of the thing they point at.

Three properties of that are deliberate and each would have been easy to get
silently wrong:

1. **The legend is the unqueried rule.** The base layout is the legend and the
   overlay arrives inside the query, so a client that resolves nothing gets the
   readable arrangement (0079's own preference). Written the other way round the
   two are indistinguishable on any browser anyone would test on, which is why
   there is an assertion that the overlay's rule comes *after* the legend's.
2. **It is a `@container` query, not a width one.** What decides whether labels
   can fly out is the width of the **frame**, and a frame is as likely to be one
   column of a `loom.split` on a laptop as the whole width of a phone. Three
   merged primitives already do this (`loom.offering`, `loom.marquee`,
   `loom.orbit`); the frame declares its own containment and the pins read it.
3. **The only thing inline on a pin is its two coordinates.** An inline
   `position` would beat the rule that changes it, and here that rule changes
   `position` itself — so the mark carries `--loom-pin-x` and `--loom-pin-y` and
   nothing else, exactly as an orbit seat carries its angle and no radius.

## What the picture found that the tests could not — four things, for the ninth run running

1. **Content flush to a frame's edge is clipped by the frame's own radius.** The
   first showcase put a stat grid straight into the surface slot and the word
   `operations` lost its first letter to the corner. It is not a defect — a
   browser viewport has no padding and a screenshot must go edge to edge — but
   it is the first thing anyone composing into a frame will hit, and it is worth
   knowing that the answer is a padded composition inside rather than padding on
   the frame.
2. **A pin's dot lands on the content it is pointing at, not beside it.** The
   first coordinates put mark 1 in the middle of a table row and mark 3 over a
   stat's label. Nothing can assert that; the frame is a viewport and the
   primitive cannot know what is under a given percentage. Worth saying out loud
   because a model authoring pins will do the same thing.
3. **The frame's elevation is a shadow on a light palette and a halo on a dark
   one.** `box-shadow` takes `fg-default` because there is no shadow token, so
   `bold` gets a white glow rather than a dark shade. It reads as deliberate and
   it is the same idiom `.loom-lift` already uses — but it is a *different
   effect* under the two palettes, and that is the sort of thing only the two
   screenshots side by side will ever say.
4. **The legend rendering is better than the overlay on a phone, not merely
   survivable.** Three numbered rows under the screenshot read as a caption
   somebody wrote. That is worth recording because the cheap version of this
   primitive — hide the labels below a breakpoint — would have looked fine in
   every test and lost the content on the device most of a demo audience holds.

## Records

**None, deliberately.** Every decision here is an application of a record that
is already `Accepted`: the pins are 0052, the surface slot is 0051, the motion
and the two layouts are 0055 and 0079, the container query follows three merged
primitives, and the frame's naming needs no ruling because it is not a container
of repeated children (0054). Writing a record for each would be relitigating
what the brief says is settled, and the decision numbering is the one part of
this repository where an unnecessary entry has a measurable cost — #217 was a
whole run spent repairing a clash.

The `loom.frame` / `loom.embed` **word collision** is the one thing a future
reader will trip on, and it is answered in `loom.frame.ts`'s own comment rather
than in a record: `frames: ["src"]` names the props whose value reaches an
`iframe`, so the runtime knows which string to check against the origin
allowlist. `loom.frame` loads nothing, declares no framable prop, and shows
whatever the tree already put in its slot.

## Findings

**Filed, two:**

- **`bg-overlay` is a slot every palette must declare and nothing paints.**
  `loom.pin` is the library's first floating content and that slot is what it
  wants; the pairings list is derived from what components paint (0089), so
  there is no `fg-default on bg-overlay` row and adding one is `src/theme/`'s
  file. Shipped on `bg-surface`, which is **the same value under all three
  starter palettes**, so the rendering is identical and the swap is one token.
  The finding proposes either adding the row or retiring the slot.
- **A run that needs a picture rebuilds the harness that takes it.** Forty lines
  written this run and deleted before the pull request, because `tools/` is not
  this lane's directory. Written down with the two things that cost time —
  `data:` is not an allowed image scheme and image hosts are blocked, so compose
  the screen content out of Loom primitives instead.

**Appended to the standing entry:** `21st.dev`, blocked a **sixteenth** time.
This is the run where it mattered most — a browser chrome, an annotated
screenshot and a star rating are that site's own front page — and there is
nothing to add to the two fixes the 16 August entry already names.

**Closed:** none. No finding owned by this lane was open at the start of this
run; the three that were are closed by #229, which is still awaiting review.

## The two files outside this lane

Both are a growing library forcing a number somewhere else, both are what their
own tests instruct, and neither is a judgment call:

- `apps/loom/app/(marketing)/_lib/copy.ts` — `FACTS.primitives` `"70"` → `"73"`.
  `facts.test.ts` asserts that string against
  `catalogueOf(siteRegistry).length`, so a library that grows and a marketing
  site that does not is a red `main` for every lane. One token.
- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — regenerated with
  `pnpm --filter @loom/app docs:api`, which is verbatim what
  `extract.test.ts` says to do when the runtime's published surface moves. Three
  new entry points, no hand editing.

Named here per `docs/routines.md`.

## Test numbers

`pnpm install && pnpm verify` — **green**, on the second run. `1860` tests in
the runtime package before this run, **`1869`** after: nine new assertions in
`src/primitives/library.test.ts` under *the product on the page*, plus the
existing library-wide assertions updated to the new count. The application
package is **`2497`**, all passing.

The first verify was red on one test, and it is the good kind: `(docs)`'
`extract.test.ts` noticed three new modules on the published surface and said
which command regenerates the reference. Worth recording because it is the
second time in three runs that a `(docs)` assertion has caught something a
primitives run would otherwise have shipped — the first was a doc comment long
enough to push another symbol's past the reference's truncation.

Four existing assertions had to change and each is worth naming, because three
of them are the library holding itself to something:

| Assertion | Change |
| --- | --- |
| `registers as seventy primitives` | 70 → 73, and the ordered type list gained three entries in registration order. |
| `agrees with itself about which primitives are leaves` | gained `loom.pin` and `loom.rating`. A pin is a leaf and the frame it sits in is not, which is the split this run turns on. |
| `covers every registered primitive across the ten fixtures` | gained `productPage`. |
| `FACTS.primitives` | the cross-lane line above. |

Two failures were found by tests rather than by reading, and both changed the
code rather than the test:

- **`loom.rating` threw under the conformance probe.** A probe renders every
  primitive under `{}` before anything else (0075), so `score` arrives
  `undefined` and `undefined.toFixed(1)` is a component that throws rather than
  one the audit can report on. The arithmetic is total now. *Calling a method on
  a prop is the one way a primitive stops satisfying 0008*, and it is worth
  knowing that the audit catches it.
- **`loom.rating` painted an unlit star in `border-default`,** which is the
  right tone and not an available one: the pairings the palettes are held to are
  derived from what components paint, and a border slot used as ink adds four
  rows nothing checks. The unlit run takes `fg-subtle` and recedes with opacity
  instead — the same call `loom.frame` makes for its traffic lights.

Nothing was skipped and no test was weakened.

## What the library still cannot express

- **Tabs.** Still the one Hermes block behind a wall, and this run confirmed the
  wall is in the right place. Hermes' own renderer does it CSS-only with a radio
  group, and the trick does not port: the group needs a **shared `name`** across
  its members, and a Loom child cannot know its parent's id. `disclose` publishes
  a boolean per control, which is an accordion rather than a tab strip. What
  would close it is a fourth behaviour in `src/render/behaviour.ts` — one that
  publishes a *chosen member* the way `adjust` publishes a number (0096) — and
  that is the framework lane's vocabulary to grow, not this lane's.
- **A shadow that is a shade under every palette.** See the third picture
  finding. There is no shadow token and `fg-default` is the closest thing.
- **A mark that knows what is under it.** A render is a pure function of one
  node, so a pin cannot avoid the text it lands on. In real use an author
  positions them looking at the picture, which is exactly how it went here.
- **The two remaining Hermes pairs**, unchanged: a book shelf and a property
  listing. 52 of 70 ported, 67 of 70 settled.
