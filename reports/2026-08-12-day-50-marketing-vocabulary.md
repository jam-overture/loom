# 2026-08-12 (day 50) — the vocabulary a page is actually built from

**Build order section:** **§4b step 3** (the demo vocabulary), plus the three
follow-ups you approved on #68.

**Branch:** `day-50-marketing-vocabulary` (→ `main`).

**Screenshots:** [editorial](2026-08-12-day-50-marketing-vocabulary-editorial.png) ·
[bold](2026-08-12-day-50-marketing-vocabulary-bold.png) — the same tree, both
starter palettes, nothing changed but three ids on the root.

---

## Where this run started

`main` is at `1a0897f`; #68 is merged. **#69 is open and unmerged** — the
docs-only PR that carries your "Go with your recommendations" into the `### 4b`
order so a fresh session reads it. I did not merge it, and this branch is based
on `main`, not on it.

One thing worth recording because it cost ten minutes: the container's local
`main` and `origin/main` refs were stale by fourteen commits (day 35), and the
real state was on a detached HEAD. `git fetch origin main` fixed it. Anything
that branches without fetching first will silently build on day 35.

**Your feedback outranked the plan and is done first.** All three:

| You approved | Where it landed |
| --- | --- |
| `auditRegistry` probes for slot placement | `probeSlotPlacement` in `sdk/conformance.ts`, wired into `auditRegistry` |
| The theme registry joins the model's catalogue | `themeCatalogue` on `ModelInterpreterConfig`, rendered into the prompt |
| A naming convention for decomposed pairs | [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md) |

## One ordering note

The `### 4b` list in `README.md` still says step 3 is "one real page". The
standing instruction for these runs puts **the demo vocabulary** at step 3 and
the page at step 4, on the grounds that the demo list and the marketing list are
one list. I followed the instruction, not the README, because the page cannot be
good before the vocabulary is: a real page built from `section` + `prose` +
`stat-grid` would be a layout demo, and what it has to be is something that
looks like a product. **The README's step 3 wording is now out of date** — worth
correcting when #69 or a successor lands.

## What was built, in plain language

**Eight primitives, taking the library from ten to eighteen**, chosen so that a
marketing page can be built end to end from them and so that §4d builds the real
site from this same list rather than beside it.

| Primitive | Why this one, and what it proves |
| --- | --- |
| `loom.hero` | The flagship, and the one that decides whether the library reads as a product. Three named regions (`heading`, `actions`, `media`), a four-way `backdrop` enum, staggered entrance motion. It is the port's answer to Hermes' **eleven** hero variants — eleven registered documents with eleven field lists become one primitive with one enum. |
| `loom.feature-grid` + `loom.feature` | The "what makes this different" band. The second decomposition pair, so 0054's naming rule has something to be a rule *about*. The tile is a whole link when it has an `href`. |
| `loom.quote` | Social proof. Hermes had this twice — a singleton `testimonial` and a `testimonial-grid` over a shape — and they are one content model at two scales, so the port keeps one primitive with the richer schema. |
| `loom.logo-cloud` + `loom.logo` | The "trusted by" band, and Hermes' `clients` and `affiliations` collapsed into one. Wordmark fallback when there is no image, which is what keeps a logo wall from being a row of empty boxes. |
| `loom.faq-list` + `loom.faq` | The questions band, and the library's only interactive primitive — `<details>`, no JavaScript, exactly as Hermes had it. |

Four things were deliberately **not** built: pricing, nav, footer and a CTA
band. Pricing is a genuine design question (a tier's feature list is a
decomposition *inside* a decomposition) and deserves a run rather than a
half-hour; nav and footer are cheap and can go with the page. `loom.section` +
`loom.action` already make a serviceable closing CTA. **Five good ones beat
nine thin ones** and the brief said so.

### The quality bar, and what it cost

Every one of the eight is rendered above under both starter palettes with no
hard-coded colour and no diagnostics. Two things were needed to get there that
the structural ten never needed:

**Motion, which inline styles cannot express**
([0055](../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)).
Keyframes have no inline form, and neither do `:hover`, `details[open]` or
`prefers-reduced-motion`. So a primitive that needs any of them emits one
static stylesheet beside its own root. It is a module constant with nothing
interpolated into it, every value in it is a `var(--loom-…)`, and React 19
dedupes it to one element per page. The point is not the animation: it is that
**the tree cannot reach it**. `loom.hero` takes `backdrop: "aurora"` and does
not take a duration, an easing or a colour, so there is no prop for a proposal
to get wrong and nothing for the Gate to have to weigh.

**A backdrop that is actually round.** The first version of `aurora` was a
`radial-gradient` fading to `transparent`, which is the obvious way to write it
and produces two grey rectangles: fading to `transparent` interpolates towards
transparent *black*, so an accent field greys out on its way to nothing, and the
element's own square edge stays visible where the gradient has not finished
before `overflow: hidden` cuts it. It is now a solid palette colour behind a
radial **mask**, sized so the mask reaches zero at the field's own edges. Caught
by looking at a screenshot, which is the only way it could have been caught.

## The three approved follow-ups

**`auditRegistry` now probes slot placement.** A declared slot is a promise: the
catalogue tells a model the region exists, a proposal puts content there, and a
primitive that never reads `loom.slots.aside` drops it — rendering correctly,
reporting nothing, with the content gone from the page and still in the tree.
The probe hands one marker per declared slot and looks for each in the output.
It searches every prop, not only `children`, so a region handed onwards as
`header={loom.slots.header}` counts as placed rather than as a drop.

The same call answers your second question, which is why they were folded
together: it also reports whether `children` reached the output, so **a leaf is
now a fact the audit knows** rather than one the renderer cannot derive. Six of
the eighteen are leaves. Nothing is enforced — `unplacedSlots` and `leaves` are
values a host asserts on, the same bargain `notDecorated` already made — and the
library test asserts `unplacedSlots` is empty and the leaf list is exactly those
six, so a primitive quietly losing its `children` fails the build.

**The theme registry reaches the model.** `themeCatalogue` on
`ModelInterpreterConfig` renders a block between the primitives and the tree:
every registered palette, font pack and preset by id, with the sentence its
author wrote. The hex is not in it — a model choosing between registered
palettes by description is 0049's bargain; a model choosing colours is the thing
it rules out. It carries one instruction, because the vocabulary without it is
decoration: the theme is the one key **no primitive declares**, every other rule
in the prompt says to set only declared props, so the block says where a theme
lives, that all three ids travel together, and that a colour never goes on a
primitive.

**Decomposed pairs have a naming rule** (0054): the child is the singular thing
with no suffix, and the container is that word plus the arrangement — `grid`,
`list`, `cloud`, `table`. So `loom.faq-list`/`loom.faq`, not
`loom.faq`/`loom.faq-item`. `loom.stat-grid`/`loom.stat` already satisfied it, so
nothing shipped needed renaming, and the seven pairs still to port have their
names decided before they are written.

## Decisions not explicitly specified, and why

- **A hero's copy stays in slots; a feature's copy is props.** The split follows
  0052 rather than length: a heading is prose a reader edits as prose and can be
  reordered, so it is a node; a feature's `title` and `body` are fixed fields of
  one record that are meaningless apart, so they are props, exactly as
  `loom.stat` holds its value and label. The same reasoning makes `loom.quote`
  props rather than children — an attribution that outlived its quote would be a
  valid tree saying nothing.
- **`loom.logo-cloud` does not scroll.** A seamless marquee needs the row
  rendered twice, and a duplicated row means two DOM elements carrying the same
  `data-loom-node` id — the exact failure 0051 rejected. A portal that resolves
  an id to the second copy points a reviewer at a node they did not click. The
  still version is also what most real pages have.
- **`loom.feature`'s icon is one character, not a URL.** An icon *set* is a
  registry of its own, and a URL puts a network fetch behind a tile that must
  render instantly. An emoji is a vocabulary a model cannot get wrong.
- **`loom.faq`'s `open` is a prop.** Which question starts open is an editorial
  decision about the page, and editorial decisions belong in the tree where a
  proposal can change one and a reviewer can see that it did.
- **The stylesheet is emitted by each primitive that needs it, not by
  `loom.page`.** Tidier the other way and wrong: a hero inside a host's own
  chrome, or a tile in the portal's preview pane, would lose its motion
  depending on an ancestor it cannot see.
- **`buildUserMessage` took a fourth optional parameter** rather than growing a
  `catalogues` object. Two optional positionals is the smaller change and left
  every existing call site and test untouched; the object is the better shape if
  a third catalogue ever appears.

## Records added or superseded

- **Added [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)** —
  *A container is its child's name plus the arrangement it puts them in.* Four
  alternatives rejected, including the plural/singular pair (`loom.stats` /
  `loom.stat`, near-identical exactly where they must be distinguished) and a
  declared `childType` relationship (more machinery, and it does not solve the
  model's actual problem, which is choosing a name before it has a parent).
- **Added [0055](../decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)** —
  *Motion is a static stylesheet the primitive emits, never a prop in the tree.*
  Five alternatives rejected, including motion props on the primitive (the thing
  it exists to refuse) and a stylesheet the host installs.
- **Nothing superseded.** 0055 revisits a *premise* stated in day 49's report —
  "there is no stylesheet to attach" — but not its conclusion: layout is still
  intrinsic and the only media query in the library is the reduced-motion one.
  That was report prose rather than a record, so there is nothing to supersede,
  and 0055 says so explicitly.

Index regenerated with `pnpm decisions:index`.

## Tests

`pnpm install && pnpm verify` — **green**.

| | Files | Tests |
| --- | --- | --- |
| Runtime | 82 | **1121 passed**, 0 failed |
| Portal | 34 | **381 passed**, 0 failed |

**Nothing failed and nothing was skipped.** Worth flagging as a change from
every previous run: the live Anthropic smoke test **ran** this time rather than
skipping — a key is present in this environment — and both its cases passed
(4.5s). The unit suites still pass with no key.

**29 new tests:** 10 in `src/primitives/library.test.ts`, 7 in
`src/sdk/conformance.test.ts`, 5 in `src/sdk/audit.test.ts`, 6 in
`src/interpretation/prompt.test.ts`, 1 in `src/interpretation/interpreter.test.ts`.

The library tests add a second fixture — a marketing page built from the new
eight — and assert: the two fixtures between them use **every** registered
primitive; the page renders with zero diagnostics; the hero's eyebrow, heading,
lede, actions and media appear in that order; **one** stylesheet is emitted for a
page whose hero, tiles, logos and questions each ask for one; the stylesheet is
byte-identical under both palettes and holds no literal colour; exactly one
`<details>` is open; a logo with no image falls back to a wordmark; the whole
page is byte-identical below the root across a re-theme; and the registration
list, the empty `unplacedSlots`, and the exact six leaves.

The probe tests cover: every declared region reaching the output; the region a
primitive promised and dropped being named; a region handed onwards through a
prop counting as placed; a leaf told from a container by whether `children`
arrived; a primitive that declares no regions having nothing to report; an
unprobeable primitive declining rather than being called a drop; and a slot
named `constructor` not being read off `Object.prototype`.

The prompt tests cover: absence when no theme registry is wired; every id listed
with its description; the placement instruction; **no hex anywhere in the
prompt**; the block sitting between the primitives and the tree where a cache can
hold it; and reaching a repair.

## Open questions

1. **`loom.hero`'s `stature: "tall"` is `78vh`, which is a viewport unit in a
   library that reads no viewport.** It is the one place layout depends on the
   window rather than on content, and it is the correct behaviour for a landing
   hero — but it sits oddly beside "responsiveness comes from intrinsic layout".
   **Recommendation: leave it and note the exception.** A hero that holds the
   fold is what the prop is *for*, and expressing it any other way needs a
   measurement the renderer cannot make.
2. **Pricing needs a decision before it is built.** A tier has a features list,
   so 0052 makes each feature line a node — which means either a third primitive
   (`loom.tier-feature`) or letting a tier's children be ordinary prose. The
   first is honest and verbose; the second is cheaper and loses the tick marks.
   **Recommendation: a third primitive**, named `loom.tier` / `loom.tier-table`
   per 0054 with a `loom.tier-feature` leaf — but say if you would rather it
   were the cheap version, because it is the pattern the other list-inside-list
   blocks will copy.
3. **Should the portal show the audit's new `leaves` list?** It now knows which
   primitives cannot hold children, which is exactly what an insert menu needs
   to avoid offering "insert into" on a node where nothing would appear. It is a
   portal change, not a runtime one. **Recommendation: fold it into the demo
   step**, where there will be a real tree to insert into.
4. **The `README.md` §4b step 3 wording is stale** (see the ordering note
   above). Small, but the next session reads it first.

## What is next

**§4b step 4: the demo.** The vocabulary is now good enough that the page can
be good, and the demo's job is not "AI changed a page" — it is the change *and
the record of it, side by side*: the proposal with its rationale and provenance,
the stakes and reversibility in the Gate's own words, which rule fired under
which policy, the inverse delta with undo as a real button, and the revision it
produced. Every one of those fields exists in the runtime today; what is missing
is the surface. Built as self-contained routes so §4d can embed them.
