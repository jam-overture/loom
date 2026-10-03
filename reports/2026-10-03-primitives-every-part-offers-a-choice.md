# 2026-10-03 — every part offers a choice

On 2 October the catalogue's third instrument — **designs per part** — found nine
parts of a page with exactly one design, and four of them closed. Five were left,
in a stated order:

```
specs    team    credentials    changelog    banner
```

**This run is the first four of those five**, the decision record the first of
them produced, and three findings. The instrument reads **1** now, and the last
row is `banner`, which this report argues may be correct as it stands.

A part with one design is a part where a deployment has no choice at all, and the
two other instruments in this repository — reach, and the gap inventory — both
read clean the whole time it is true.

---

## What shipped

| | |
| --- | --- |
| `specs-sheet` | three cards, one per part of the system, four limits each on their own line and the qualifying sentence on the card's floor |
| `team-leads` | two people in full with a way to reach each, a rule, and the other seven as overlapping faces with one line |
| `credentials-posture` | the security argument in a column, four dated certifications beside it, each with a mark and a status chip |
| `changelog-notes` | three releases with their notes open — a badge, a date, a title, a summary, and the changes as a list |
| `0217` | *choosing a two-region primitive is itself an insert decision* — the near-miss `team-leads` produced, written as a rule |
| `every-part-offers-a-choice.specimen.ts` | all four, **each beside the canonical it is now an alternate to**, two palettes, two viewports |
| 5 tests | one per band holding the claim that band rests on, and one holding the instrument itself |

The catalogue is at **52 bands over 22 parts** and **154 droppable things**.
`pnpm verify` is green.

---

## One — why these four, and not a fifth

The brief's standing question is *which primitives, and why those.* No primitive
shipped this run, and the reason is the same arithmetic as 2 October: the gap
inventory puts the honest ceiling at 110–120 against a library of 102 and ends
**"hold the vocabulary near 110 and spend the week on compositions."** That is the
lane's own measured recommendation, now three runs old, and this run follows it
rather than re-opening it.

Which left *which* compositions, and the designs-per-part instrument answers that
in an order it already wrote down. This run took it literally: the first four.

**The fifth was not taken, and that is a judgement rather than a shortfall.** A
banner is a strip, one sentence, one thing to do about it. The second design
anybody would name is *the strip whose action is a button rather than a link*,
which is a different set of nodes by the letter of
[0162](../decisions/0162-the-catalogue-is-a-phrasebook-and-the-page-is-one-path-through-it.md)
and would be the thinnest entry in the catalogue. The brief says four excellent
beats twelve thin, and a fifth built to reach zero on a counter would be the
twelve-thin failure in miniature.

So the inventory now carries the open question instead: **a part whose whole
content is one sentence may be a part where one design is correct**, and the next
run should decide that rather than assume the number must reach zero. If it does
build one, the bar stated there is a *region* the canonical strip does not have —
not a swapped leaf.

---

## Two — which fields became nodes and which stayed props

No Hermes block was ported: none of these four parts has one. `specs`, `team` and
`credentials` are arrangements of content models already in the library, and
`changelog` is page furniture Hermes never had as a block. So the question is
answered against the designs themselves, the way the 2 October run answered it.

| | | why |
| --- | --- | --- |
| a **group of limits** (`specs-sheet`) | **node**, a `loom.card` | three cards holding the same arrangement is repeated content. A `groups: SpecGroup[]` prop makes *add a fourth area* and *move storage above serving* both unreachable |
| a **limit** inside a group | **node**, a `loom.spec` in its own `loom.list-item` | and the list-item is load-bearing, see §3 |
| the sentence qualifying a group | **`text` children** in the card's `footer` region | prose is children (0052); the *region* is the card's because a floor-aligned sentence is what keeps three cards of different lengths from reading as ragged |
| a **lead** (`team-leads`) | **node**, a `loom.person` in a `loom.card` | the whole subject of 0217 — see §4, this is the one to push on in review |
| the way to reach a lead | **node**, a `loom.link` in the card's footer | a `contactHref` prop is `insert`/`remove` wearing a label: a deployment whose founders take no cold mail removes a node instead |
| each face in the row | **node**, a `loom.avatar` | the plainest case there is |
| the two **regions** of the posture band | **slots**, and correctly — see §4 | an argument and its evidence are different kinds of thing, and there is no third kind a compliance band is made of |
| a certification's **mark** | **node**, a `loom.icon` in the `mark` region | a `glyph: string` prop could not be replaced by a real seal later. As a node, that swap is one `insert` over one `remove` |
| its **status chip** | **node**, a `loom.badge` in `meta` | and the region is plural on purpose: *Current* **and** *Scope: runtime only* is two badges, which a `status: string` could not hold |
| a **release** (`changelog-notes`) | **node**, a `loom.card` | a fourth is one `insert` at index 0, which is what shipping looks like |
| a **change** within a release | **node**, a `loom.list-item` | the whole reason this band exists — see §5 |
| the **version** | **node**, a `loom.badge` | a judgement rather than a rule: it could have been a `version` prop. It is a node because a release that is also *Breaking* is two badges |
| `columns`, `density`, `marker`, `ratio`, `spacing`, `justify`, `padding`, `tone` | **props**, all of them | each changes how however-many children are drawn and changes the set of nodes not at all |

### The two near-misses, run out loud

**`columns: "three"` on the specification grid** looks like a count and is not.
`COLUMN_MINIMUMS` feeds `auto-fit`, so the name is a **minimum width** — a fourth
area dropped in wraps at the same floor rather than being squeezed into a row of
four. Ask the sharper question — *does changing this prop change the set of
nodes?* — and it does not. Same reading as `loom.feature-grid`'s own `columns`,
and the same reading `footer-signup` ran on 2 October.

**`density: "comfortable"` on a release's list** is the other one. It reads as a
statement about how much there is and is a statement about the gap between two
rows; three items and thirty get the same leading.

The one that genuinely went the wrong way first is **the leads' container**, and
it is §4.

---

## Three — the thing two primitives do together that neither states

`specs-sheet` has no middots, and nothing turned them off.

The separator between two specifications is `.loom-spec + .loom-spec::before` — a
position selector, because no render of one node can know it has a sibling
([0008](../decisions/0008-the-renderer-is-a-total-pure-projection.md)). It draws
between two specs that are **adjacent**. In the sheet each spec is the only child
of its own `loom.list-item`, so the adjacency never matches and every line begins
with its figure.

That is the behaviour the design wants, and the alternative — four specs as
siblings in a column — is the arrangement `specs-band`'s own comment warns about,
which produces a floating middot at the head of every line but the first.

**It is a fact about the markup two primitives produce together and neither of
them can state it**, so it is a test rather than a comment, and it is asserted as
a pair: the sheet's specs are never siblings, the canonical's always are. Either
half alone would pass against a band that had quietly become the other one.

---

## Four — the near-miss, which became a decision record

`team-leads`'s first draft held the two foregrounded people in a `loom.split`.
The band renders identically either way, under both palettes, at both viewports.

**It is wrong, and not for a reason about taste.** A split has exactly two
regions, because [0051](../decisions/0051-a-slot-is-a-region-the-primitive-places.md)
makes a slot *a region the primitive places, at a position no reordering of
`children` can reach* — so the count belongs to the primitive. A third lead is an
`insert` with nowhere to land, and a company promoting somebody cannot say so by
any operation, ever.

What makes this worth a record rather than a comment is that **the reasoning that
leads to `loom.split` is good reasoning.** There are two leads; a primitive that
holds exactly two things fits *two leads* more tightly than a grid that would hold
forty; picking the tighter type is ordinarily right. And
`docs/primitive-granularity.md` does not catch it, because its test is framed
about **props** — *read each prop and ask which of the four operations it is
impersonating* — and this draft had no suspicious prop at all. A run reads the
doc, agrees with it, and picks the split anyway. That is what happened here.

[0217](../decisions/0217-choosing-a-two-region-primitive-is-itself-an-insert-decision.md)
states it as one question:

> **Is the count fixed by the content, or only by my content?**

And the pair that shipped the same day is the argument:

| | the regions | the verdict |
| --- | --- | --- |
| `credentials-posture` | an argument, and its evidence | **split is right** — there is no third thing a compliance band is made of, and swapping them is already `reverse: true` |
| `team-leads` | a person, and another person | **split is wrong** — a third is an ordinary edit, and `loom.grid` at a two-column floor draws the identical pair |

The record changes no primitive and no schema. `loom.split` is unchanged. What
changed is that the choice is now made on a stated test, and the mistake is
**catchable** — `compositions.test.ts` asserts the lead cards share one parent
that takes children, which goes red the moment somebody reaches for the split
again.

---

## Five — what a rail of milestones structurally cannot hold

`changelogBand` is a `loom.milestone-list` of five releases. `loom.milestone`
carries `body` as **one string** — a fixed field under 0052, and right for a rail,
where a release has one line about it.

A release does not have one line about it. It has three or four things that
changed, and they are **repeated content**, which the same rule says is child
nodes. There is nowhere in a milestone for a third item to go, and writing them
into `body` separated by semicolons is the shape the rule exists to refuse: a
reader who wants the second item moved or dropped is asking for an operation
against a string.

That is a gap in the *design* rather than in the library — `loom.list` has been
registered since the first port — and it is the band. Both designs are right and
the rail is not the lesser one: a page whose changelog band exists to prove the
project is alive wants five dated lines and a link, which is why the canonical
stays the canonical.

---

## Six — the tests, and the nine planted defects

Five tests, none of them a count. That discipline is the 2 October run's and it is
worth restating: a test asserting *there are three cards* goes red when somebody
writes a fourth release, which is the change the band exists to make easy.

Each test asserts the property that earned the catalogue entry, **and every one is
run against the pair** rather than against the alternate alone — a test that
passed because both designs changed together would assert nothing.

Six defects were planted and all six caught:

| planted | caught by |
| --- | --- |
| two specs as siblings inside one sheet row | *adjacent specs* |
| the leads put back into a `loom.split` | *take a third* |
| one credential loses its `meta` chip | *mark and meta* |
| a decorative glyph gets a `label` | *mark and meta* |
| a release whose changes are one row | *changes as nodes* |
| an alternate dropped from the catalogue | *single design* |

The fourth is the one worth naming: an `aria-label` on a glyph that sits beside
the name it decorates makes a screen reader say *shield*, then *SOC 2 Type II*. It
is invisible in every photograph, under both palettes, at both viewports.

**And the instrument itself is now a test.** *Leaves one part in the catalogue
with a single design* is a floor rather than a count: closing `banner` makes it
stricter, and a part that lost its alternate goes red. A new part admitted under
[0171](../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md)
arrives with one design and is the one case that fails honestly — which is the
right moment to be told.

---

## Seven — where this run had to leave its lane, said plainly

**`apps/`, which the brief says not to edit.** Four new bands turned the app suite
red in three files, and this is the second consecutive run for which that is true.
All are corrected on this branch and the correction is not uniform:

| | what was done |
| --- | --- |
| `_lib/packages.ts`, `_components/bands.tsx` | **the 2 October entry's own remedy, taken** — three doc comments state the *claim* now rather than the arithmetic, so they will not recur |
| `_lib/counts.test.ts` | bumped `forty-eight` → `fifty-two`, and it **should stay a literal** — the one place in the repository where the catalogue's size is asserted rather than read |
| `_lib/api/reference.generated.json` | regenerated with the repository's own `pnpm --filter @loom/app docs:api` |

**The fourth is new information and it is filed.** `offered.test.ts` imports every
published door and holds it against the generated reference, so a band added to
`…/compositions` fails with *"hands back a object called `specsSheetBand` and no
page on this site mentions it."* That is the check working — and it means **every
run that adds a band turns the app suite red in a file this lane does not own**,
with no doc-comment remedy available, because regenerating is the correct response
and there is nothing to reword.

**And the brief's own first instruction could not be followed.** `WebFetch
("https://21st.dev")` returns `EGRESS_BLOCKED`, for the fifteenth recorded time
since 16 August. The standing entry has the two remedies and both are the
maintainer's. The floor this run actually worked to is the one in the repository.

---

## Eight — what the library still cannot express

Unchanged from 2 October except where noted, because none of these four bands is
the one that would move them:

1. **A control whose word comes from the tree.** Still why `loom.dialog` is
   unbuilt and why `loom.menu` is registered, tested, described in every
   interpretation request, and at reach zero.
2. **A panel that does not exist before hydration.** Architectural, filed, and
   **not exercised by this run** — none of these four declares a control, which is
   why this sheet is static and needs no `wait`.
3. **One of *n* children chosen, where the labels are in the children.** Tier B's
   second group: tabs, segmented control, pricing toggle, radio group.
4. **An image.** `credentials-posture` wants a real seal and `team-leads` wants
   two faces; both ship what the library draws for itself, which is a glyph and a
   monogram. The monogram is the one place where the absent asset produces
   something a page can legitimately ship rather than a hole.
5. **`copy` and `role`, declared by nothing.** 0 of 102 for each, unchanged.
6. **New: a fixed decoration with no floor.** `loom.credential`'s mark is a square
   at every width, and `credentials-posture` is the first band to fill it. Filed
   with the measurement rather than fixed — the prop that would fix it reopens a
   property the current shape buys, and that is the maintainer's call rather than
   a thing to widen this run into.

---

## The pictures

All four new bands, each **directly above or below the canonical it is now an
alternate to**, under both starter palettes at 1280 and 390. Read down a column
and the claim 0162 rests on is visible without opening a file: in every pair the
second band contains a kind of node the first has nowhere to put.

| | editorial | bold |
| --- | --- | --- |
| wide, all eight bands | ![](2026-10-03-primitives-every-part-offers-a-choice-editorial-wide.png) | ![](2026-10-03-primitives-every-part-offers-a-choice-bold-wide.png) |
| phone | ![](2026-10-03-primitives-every-part-offers-a-choice-editorial-phone.png) | ![](2026-10-03-primitives-every-part-offers-a-choice-bold-phone.png) |

No shot overflows its viewport on either palette:

```
…-editorial-wide   1280x3400@2x  scrollWidth 1280 / innerWidth 1280
…-editorial-phone   390x844@2x   scrollWidth  390 / innerWidth  390
…-bold-wide        1280x3400@2x  scrollWidth 1280 / innerWidth 1280
…-bold-phone        390x844@2x   scrollWidth  390 / innerWidth  390
```

**This is the first sheet in the lane where every pair could be stacked.** The
2 October sheet had to leave `nav` and `footer` unpaired, because two bars at the
top of one document photographs as a defect rather than as a comparison. None of
these four parts is a page edge.

The thing the phone shots show that the wide ones do not is the one filed in §8:
at 390px a marked credential gives about a third of its card to the mark, and the
unmarked canonical one band above sets the same four facts on fewer lines.
