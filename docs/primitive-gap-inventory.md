# What is actually missing from this library

**Measured 2026-09-13, at 92 primitives**, against shadcn/ui's component list and
21st.dev's block taxonomy, for a maintainer target of **250 by 2026-09-19**.

Three consecutive runs in August read `docs/hermes-port-map.md`'s empty tables as
*the range is finished* and went hunting for a ninetieth content model; each came
back with a definition list. Two runs since found real gaps by other instruments
— asking what a *page* could not do, and reading what other lanes had
*measured*. Neither instrument produces a number. **This document is the count**,
so the week's target is planned against something rather than guessed at twice
more.

The short answer: **the honest ceiling on distinct primitives is about 110–120,
not 250.** The number 250 is reachable, and the rest of it is compositions. The
arithmetic is at the end.

> **Where the count is, 5 October 2026: 103 primitives, 54 bands, 157 droppable
> things.** Tier A closed on 14 September except the radio group, which is in
> Tier B's second group below and blocked there. Tier B's first group is
> **unblocked and three of its four have shipped**; its other two groups are the
> whole of what is left behind a framework decision. Read the corrected Tier B
> before planning a run against this document — it said something false for
> eleven days and that is what the correction is about.
>
> **The vocabulary moved by one on 5 October and the recommendation is
> unchanged** — this document's own arithmetic puts the honest ceiling at
> 110–120 and says to spend the week on compositions. `loom.inline-link` is the
> hundred and third and it is the kind of addition that recommendation leaves
> room for: it was not chosen off a gap list, it was **filed by a consuming lane
> that had built the thing and deleted it** (`Loom marketing`, 4 October), which
> is the instrument this document has said twice is better than a taxonomy.
>
> **The designs-per-part instrument reached zero on 5 October** and the question
> it was left open on is answered below. The instrument for choosing the next
> composition is [reach](#what-the-reach-measurement-says-after-those-four),
> which stands at 92 of 103.

## The thing that makes 250 look reasonable, and why it misleads

21st.dev advertises **1152 hero components, 216 pricing sections, 161
testimonials, 318 features**. Read as a component count that is overwhelming, and
it is the number behind the maintainer's target.

**It is not a count of primitives. It is a count of _designs of one block_.**
Those 1152 heroes are one thing — the block a visitor reads first — drawn 1152
ways: centred, split, full-bleed, gradient mesh, typing effect. A registry whose
unit is the *design* grows without limit and has to, because a user picks one and
pastes it.

Loom's unit is not the design. A hero here is `loom.hero` plus a composition plus
props plus a theme, and the same four axes produce the same visual range without
a second primitive. **So the axis that matches 21st.dev's numbers is
compositions × themes, not the primitive count**, and comparing 92 to 1152 is
comparing a vocabulary to a phrasebook.

This matters practically, not just semantically. A 250-entry vocabulary is
[measured below](#what-the-count-costs) to cost every interpretation request
about 42,600 characters, and the model must pick one entry from 250 descriptions
that are, by construction, mostly near-neighbours. A 250-entry *phrasebook* costs
nothing per request, because a composition is assembled from primitives already
registered ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md),
[0120](../decisions/0120-a-starting-composition-is-a-subtree-a-catalogue-hands-to-the-ordinary-seam.md))
and adds no type.

## Tier A — **closed, 14 September**

Nothing here needed a framework change, and all of it has now shipped. The table
below is kept as written on 13 September, with what closed each row, because the
*reasoning* for why each was missing is still the useful part. **Do not rebuild
these.**

| row | closed by |
| --- | --- |
| a figure drawn from numbers | `loom.stat-chart` over `loom.stat`, #289 |
| a stat that carries its trend | `magnitude` on `loom.stat`, #289 — the figure now plots, which is what the row was for |
| paging through a run of things | `loom.link-pager`, #294 |
| the empty state | `loom.empty-state`, #294, and `cause` on it, #301 |
| the waiting state | `loom.waiting-state`, #294 |
| a consent checkbox | `checkbox` in `FIELD_TYPES`, #294 |
| a radio group | **not shipped, and not cheap** — see the correction below |

> **Why this heading was worth editing.** On 14 September two runs of
> `Loom primitives` spent the same afternoon on this list: a scheduled run
> finished it on #294 while an interactive session was building its own empty
> state for #300, which was withdrawn. Nothing in the repository recorded that a
> run was *working on* an item — only that one was done — and the list read as
> open to both of them. Marking a tier closed the moment it closes is the
> cheapest half of that, and it is why this section now leads with a verdict
> rather than with a list.

This is the whole list; it is short, and the shortness is the finding.

| | what it is | why nothing covers it |
| --- | --- | --- |
| **a figure drawn from numbers** | bar, line, sparkline | the single largest hole. `loom.stat` prints one number and `loom.meter` draws one proportion; **nothing in 92 plots a series**, and a metrics band that cannot show a trend is the one marketing claim this library cannot make |
| **a stat that carries its trend** | figure + delta + direction | today `loom.stat` is figure and label. "↑ 24% MoM" is the form every dashboard-shaped marketing page uses |
| **paging through a run of things** | a page-through control | `loom.link-trail` goes *out* of a page, `loom.nav` goes *across*; nothing goes *along*. By [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md) this is probably `loom.link` plus an arrangement |
| **the empty state** | what a region says when it holds nothing | with the binding seam ([0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)) a list can now legitimately arrive empty, and every surface will otherwise invent its own "no results yet" |
| **the waiting state** | a placeholder with the shape of the thing | same reason. A bound region that has not answered has nowhere to say so |
| **a consent checkbox / a radio group** | ~~two members of `FIELD_TYPES`~~ — **wrong, see below** | `loom.field` takes `text email tel url number date textarea select`; a contact form that cannot ask for consent is a real gap |

**Tier A is five primitives and one enum widening.** That is the honest total of
what this library is missing that it could build this afternoon.

### The correction the last row needed

Counted as "two strings, not two files". That is right for one of them and wrong
for the other, and it was found by building both.

- **`checkbox` is genuinely two characters of enum.** `loom.field` falls through
  to `<input type={type}>`, so it shipped on #294. Its label wants to sit
  *beside* the box rather than above it, which is a layout change the field has
  not had.
- **`radio` is not, and is still unbuilt.** A radio group is one
  `<input type="radio">` **per choice**, and the choices are `loom.option`
  children that render themselves. That works for `select` because an
  `<option>` inside a `<select>` is what an option *is*; a radio group needs each
  choice to render as an input and a label, and **no node can know it is inside a
  radio group** — a render is a total pure projection of one node
  ([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)).

  Two runs reached that independently on 14 September. #294's account is the one
  to read, and it closes the three escapes: **React context is unavailable
  because these are Server Components**, `cloneElement` over `children` reaches
  elements the render seam owns, and CSS cannot carry it because an element's
  *tag* is not a custom property. It offers three shapes, smallest first, with a
  `loom.choice` primitive as the boring one.

**Nothing is blocked**: a form that needs one of several uses a `select`. But it
is one enum member and one open design question, not two strings, and this
paragraph is here so the next run does not re-count it as cheap.

## Tier B — **three groups, not one decision** (corrected 1 October)

This section said *"roughly nine, and they arrive together or not at all,
because they are one framework decision rather than nine"* from 13 September to
1 October. **That stopped being true on 20 September** and the document a lane
reads before choosing work said otherwise for eleven days;
[0176](../decisions/0176-a-control-may-be-answerable-to-another-control-and-they-agree-through-the-dom.md)
sorts the nine by what each actually needs and says of the first group *"This
record settles the first."* `Loom lessons` filed the correction on 29 September,
having measured it from the other end — `present` and `dismiss` were in the
vocabulary and nothing in the library declared either.

So, split the way 0176 splits them:

| group | what it needs | state |
| --- | --- | --- |
| **dialog · dropdown · lightbox · tooltip** | a region that opens and can be closed by something other than the opener | **unblocked 20 Sep by `present`/`dismiss`.** Three of the four shipped 1 October — `loom.menu`, `loom.popover`, `loom.lightbox` |
| **tabs · segmented control · pricing toggle · radio group** | one of *n* children chosen, where the labels are in the children | **blocked, and `ARCHITECTURAL`.** A container receives its children as one rendered node and cannot read a prop off one (0008), so a control that renders *n* labelled buttons cannot learn what to put on them. 0176 filed it and did not build it |
| **toast** | a region that appears on an event nobody pressed | **blocked.** One primitive, one gap, and the only member of the vocabulary that would render no control the reader aims at |

### What the first group's three cost, and the one it did not buy

`loom.menu` and `loom.popover` are the named and general halves of one shape
(0062), `loom.lightbox` is the first primitive in the library to declare **both**
members of the pair, and the gallery row of Tier C — *gallery →
`loom.mosaic`* — became true the day a tile existed that opens.

**A dialog is the one the group did not deliver, and the reason is the trigger's
word rather than its behaviour.** A control's name is declared by the primitive
and resolved through the text seam, which is per *type* — so every
`loom.lightbox` on every page says `Expand`, and a deployment may translate that
but a tree may not write it. For an affordance that is the right answer, and for
the three that shipped the generic word is the word a reader wants. A dialog's
trigger is the page's call to action, which is content, and the seam has nowhere
to put it. Filed on 1 October against the framework; until it moves, a dialog
here would be a modal opened by a chip reading *Open*.

## The reach of the catalogue over the vocabulary — measured 19 September

**A second axis this document did not have, and it changes the recommendation
below rather than adding to it.** Everything above counts what the *library*
is missing. This counts what the *catalogue* can reach, which is a different
question with a worse answer.

| | on `main`, 19 Sep | after `primitives-39` |
| --- | --- | --- |
| primitives registered | 96 | 96 |
| primitive types some band builds | **52** | **63** |
| registered and unreachable by dropping in a band | **44 (46%)** | **33** |
| bands · page parts | 30 · 19 | 34 · 21 |

`CATALOGUE_TYPES` in `src/primitives/compositions/index.ts` is the exported
measurement, so this table is one `filter` from any registry rather than a
number somebody re-derives. **It is deliberately not a ceiling** — a primitive
is registered before a band uses it, so a test demanding the two lists agree
would fire on the ordinary order of work.

### Forty-four is the misleading number; nineteen is the real one

| | count | verdict |
| --- | --- | --- |
| needs an asset — `media`, `embed`, `before-after`, `carousel`, `overlay` | 5 | **not work.** The catalogue ships no image source at all, by test |
| not a landing page — `book`, `event`, `listing`, `product`, `offering`, `recording` + grids, `message`/`message-list` | 16 | **wants a second page sequence**, not a band on this one |
| a state, not a band — `empty-state`, `waiting-state`, `link-pager` | 3 | belongs to a bound region (0058) |
| structural — `page` | 1 | it is the root |
| **genuinely missing** | **19** | **eleven closed on 19 Sep**; eight left |

The eight left, in priority order: `table`/`table-row`/`table-cell` (a
specification band), `halo`/`backdrop`/`reveal` (the treatments that make a
page pop — not a band, a pass over the bands that exist), `divider`, `spec`,
`pin`.

### Why this was invisible for a month

The queue has been sourced from `docs/hermes-port-map.md`, which is a complete
ledger of Hermes — and a ledger tells you what is left of the thing it lists
and nothing about what was never on it. Hermes' users are creators, so no
Hermes block is developer-product shaped, so `loom.code`, `loom.code-span` and
`loom.kbd` sat registered and unreachable while the catalogue could not draw
the landing page of the product that owns it.

**The instrument, for whoever picks this up: measure the catalogue against the
registry, not the registry against Hermes.**

## Designs per part — measured 2 October

**A third instrument, and the one a run choosing catalogue work should read
first.** The two above count what the *library* lacks and what the *catalogue*
cannot reach. Neither can see the gap this one measures, which is the gap
21st.dev's numbers are actually made of: a part of the page with exactly one
design is a part where a deployment has no choice at all, and the catalogue
reads as complete from every other angle while it is true.

Measured with `compositionsForPart` over `COMPOSITION_PARTS`, which is one
`filter` from any registry and needs no script:

| | 1 Oct | 2 Oct | 3 Oct |
| --- | --- | --- | --- |
| parts | 22 | 22 | 22 |
| bands | 44 | 48 | 52 |
| **parts with exactly one design** | **9** | **5** | **1** |

The nine were `banner`, `nav`, `bento`, `specs`, `comparison`, `credentials`,
`team`, `changelog` and `footer`. Four of them closed on 2 October — `nav`,
`bento`, `comparison` and `footer` — and those four rather than any other four
because **two of them are the bands a page cannot be without.** A page may skip
its changelog and most do; no page skips its header or its footer, so a single
design there is the catalogue deciding, for every deployment, what the top and
the bottom of their page look like.

**The five left, in the order a run should take them:** `specs`, `team`,
`credentials`, `changelog`, `banner`. Each is one band of work and none is
blocked by anything.

### Four of the five closed on 3 October, and `banner` is the one left

`specs-sheet`, `team-leads`, `credentials-posture` and `changelog-notes` took the
first four in the order above. **`banner` is deliberately not the fifth**, and the
reason is this document's own bar rather than a shortage of time.

A banner is a strip, one sentence, and one thing to do about it. The second design
anybody would name is *the strip whose action is a button rather than a link* —
and the honest reading of that is a `loom.button` where a `loom.link` was, which
is a different set of nodes by the letter of 0162 and is the thinnest entry the
catalogue would contain. A badge in front of the sentence makes it thinner still,
because the canonical already carries a `loom.emphasis` doing that work.

So the designs-per-part instrument now has **one row left and the honest answer
to it may be that a part with a single design is sometimes correct.** A part whose
whole content is one sentence has less room for a second design than a part that
is a wall of cards, and forcing one would put a catalogue entry where 0162 says a
`configure` belongs. The next run reading this list should decide that question
rather than assume the number should reach zero — and if it does build one, the
bar is a *region* of the strip the canonical does not have, not a swapped leaf.

### The answer, 5 October: zero, and the bar as written could not have been met

`banner-inline` closed the row, and the paragraph above is left standing because
half of it was right and the half that was wrong is worth seeing.

**The bar as written cannot be cleared by anything**, and that is a fact about
`loom.banner` rather than about any band: the strip declares exactly one region,
`action`, and the canonical fills it. There is no second region for an alternate
to find. Phrased as *a region the canonical does not have*, the bar says `banner`
may never have a second design — a stronger claim than this document meant and
not one 0162 supports.

The question is answered the other way and the answer is narrow: **a part whose
content is one sentence earns a second design when the sentence can be built a
way the canonical closed off.** Until 5 October it could not be. News-then-a-
button is the only shape a library with no inline link can draw, and
`loom.inline-link` (0227) is what made the other shape exist. A second design
that required a primitive to be written is not a swapped leaf by any reading —
and it is a different *reader's job* rather than a different paint: one strip is
scanned for a control, the other is read as a sentence whose destination is one
of its phrases.

The caution was still right about the two designs it named. *A `loom.button`
where a `loom.link` was* and *a badge in front of the sentence* are both still
too thin, and neither is what shipped.

**This instrument is now retired as a chooser of work, at zero.** Four runs chose
work from it and it went 9 → 5 → 1 → 0. What it cannot see, and what the next
instrument will have to, is whether the *second* design of a part that now has two
is the one a deployment actually wants — reach counts whether a primitive is
buildable, designs-per-part counts whether a part offers a choice, and neither
counts whether the choice is a real one.

The bar for a second design is 0162's and `compositions.test.ts` holds it: a
**different set of nodes**, not the same band with different props. The test
that catches the near-miss is already written — two designs of a part whose node
types read the same in the same order fail by name — so the cost of getting this
wrong is a red build rather than a catalogue entry where a `configure` belongs.

### What the reach measurement says after those four

Reach went 89 → 90 of 102. `loom.popover` came into reach, through
`comparison-ways`, which is the band that shows its working.

**5 October: 92 of 103.** `loom.inline-link` arrives reached, through
`banner-inline`, and `loom.link-pager` came into reach through
`articles-index` — a band written for exactly that, because the pager had been
registered since 21 September, rendered by `library.test.ts`, and **never put on
a page by anything**. It is the clearest case this document has for why reach is
the instrument that replaces designs-per-part: a primitive nobody can see is a
primitive nobody has reviewed, whatever the registry says about it.

The eleven still unreached split three ways and the split is the thing to plan
against, not the number:

| | why | what would close it |
| --- | --- | --- |
| `loom.media`, `loom.embed`, `loom.lightbox`, `loom.carousel`, `loom.before-after`, `loom.overlay`, `loom.pin` | **an image source.** `mediaUrlSchema` excludes `data:` with a good reason and a `/path` is a broken image on every deployment that does not host it | not a band. A framework answer — an asset the catalogue may name, or a binding (0058) that supplies one |
| `loom.menu` | **a word**, unchanged from 3 October | the filing about a control's name |
| `loom.link-trail`, `loom.waiting-state`, `loom.page` | **a page that is not a landing page.** A breadcrumb belongs above an interior document and a skeleton belongs to a band that is waiting on an answer | a catalogue of pages rather than of bands, which is a larger question than a band |

Seven of eleven are one blocker, and it is not in this lane.

**`loom.menu` did not, and it is the one entry on the unreached list that is not
waiting for somebody to write a band.** It is waiting on a word. `loom.nav`
declares `disclose` and names its own control `Menu`; `loom.menu` names its
control `Menu` too, because a control's word belongs to the primitive and is
resolved per type (0055, 0063). A bar holding both has two buttons reading *Menu*
at 390px, one inside the other — so the obvious second nav design, the one whose
destinations fold behind a button, cannot be built at the quality bar until the
filing about a control's name moves. Recorded here so the next run reading the
unreached list does not spend an afternoon rediscovering it.

## Tier C — things that look missing and are not

Checked so the next run does not re-propose them. Each is covered, and the
covering primitive is named.

accordion → `loom.faq` (*"a disclosure a reader opens"*) · alert → `loom.callout`
· announcement bar → `loom.banner` · breadcrumb → `loom.link-trail` · progress →
`loom.meter` (*"a bar or a ring"*) · steps / how-it-works → `loom.milestone-row`
· navigation menu → `loom.nav` · separator → `loom.divider` · data table →
`loom.table` · testimonial → `loom.quote` · typography → `loom.prose` +
`loom.heading` · social links → `loom.link-list` · logo wall → `loom.logo-cloud`
+ `loom.marquee` · bento → `loom.mosaic` · press / awards → `loom.credential` ·
video → `loom.embed` · map → `loom.media` (static) or `loom.embed` (live) ·
newsletter → `loom.form` · changelog → `loom.milestone-list` · integrations →
`loom.orbit` · comparison → `loom.comparison-table` · gallery → `loom.mosaic` of `loom.lightbox` (the tile that opens, 1 Oct)

A **general** `loom.disclosure` and a **general** `loom.definition-list` were
both considered again and both rejected again: the first is `loom.faq` with the
marketing shape filed off, and the second is the thing three August runs kept
returning with. Adding either is
[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)'s
shades-of-one mistake.

## What the count costs

Measured on `main` at 92 entries, with `measurePrompt`:

| | entries | characters in the primitives block, per request |
| --- | --- | --- |
| today | 92 | **15,685** (~170 per entry) |
| Tier A + B built | ~110 | ~18,800 |
| a padded 250 | 250 | **~42,600** (~11k tokens) |

Two facts about that table matter more than the numbers.

**The themes block has an enforced ceiling and the primitives block does not.**
`prompt.test.ts` holds the theme catalogue under 8,000 characters and explains
why. The primitives block is at 15,685 — nearly twice the guarded one — with no
test naming a limit. That asymmetry is not a decision anybody made; it is the
ceiling nobody has had to write yet.

**The framework already anticipated this and left the answer in a comment.** The
theme budget's own failure message says one possibility is *"the starter library
has grown past what one deployment should register all of."* That is the designed
answer: **the starter library is a set to choose from, not a set every deployment
ships.** What is missing is the affordance —
`createStarterPrimitiveRegistry(additional)` only *adds*, so taking a coherent
slice means a host hand-filtering `STARTER_PRIMITIVES` with nothing to filter on.

[0114](../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
is the shape that would fix it. Its `role` vocabulary has one member, `heading`,
and it says the bar for a second is *"a consumer that cannot answer its question
from the registry, written down as a finding."* The interpretation prompt is now
that consumer. Filed for `Loom daily build`.

## The arithmetic to 250

| | 13 Sep | planned for 19 Sep | **actual, 19 Sep** |
| --- | --- | --- | --- |
| primitives | 92 | ~110 — Tier A now, Tier B if the behaviour vocabulary opens | **96** (Tier A closed; Tier B never opened) |
| starting compositions | 9 | ~140 | **34** |
| **droppable things** | **101** | **250** | **130** |

**The second row missed by a wide margin and the reason is worth recording
rather than apologising for.** Compositions grew 9 → 34 in six days, which is
four a day against a plan that needed twenty-two a day. Nothing was blocked;
the bands were simply built at the quality bar the brief also sets, and a band
is a day's argument rather than an hour's typing. A run that hit 140 would
have hit it with bands nobody photographed.

250 is reachable this week **and every one of them is real** — provided the
second row does the work. That is also the row that matches what 21st.dev's
numbers actually count, costs nothing per request, and needs no framework
decision to start.

The alternative reading of the target — 250 primitives — requires about 140 that
do not exist, which means splitting things 0052 says not to split and shipping
shades of one. It would also triple the per-request cost of every page this
system ever changes, and make the model choose from 250 mostly-identical
descriptions, which degrades the proposals the demo is built to show.

**Recommendation: hold the vocabulary near 110 and spend the week on
compositions.**
