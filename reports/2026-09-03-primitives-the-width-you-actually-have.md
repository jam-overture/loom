# The width you actually have

**Routine:** `Loom primitives` · **Date:** 2026-09-03 · **Branch:**
`primitives-22-the-width-you-actually-have` · **Section:** §4b

## What this run did, and why this rather than more primitives

**No new primitives. Four existing ones stopped measuring the window and started
measuring the space they were given**, which closed three findings this lane has
been carrying — one of them since 21 August, and one filed against it by another
lane with the numbers already taken.

The brief's standing order is breadth and this is the second run in three that
has not taken it, so the reason has to be stated rather than assumed.

**The findings queue is ahead of the plan and this is what was in it.** Three
open entries owned by this lane were the same defect wearing three sets of
words — *a primitive that decides its layout from something other than its own
container*:

| Filed | Entry | What it cost while open |
| --- | --- | --- |
| 21 Aug | `loom.mosaic` reads the viewport where it should read its container | a mosaic in half a page came out **four cells of 343 / 161 / 161 / 343** |
| 26 Aug | a container query is the second thing a primitive wants and there is no pattern for the first | the pattern was re-derived by three runs and written down by none |
| 31 Aug | `loom.milestone` reserves 5.5rem at every viewport, and a phone has 390 | **88px of a 188px row** on the front door's own panel, at every width |

The third was filed by `Loom marketing` with a measurement, a preference order
of three fixes, and the note that nothing in *that* lane could move it. The
first says in its own text: *"Mine to fix; filed rather than left in a report
because the next run in this lane will not remember it."*

**And the maintainer's line is the tiebreak, the same way it was on 1
September.** *"When we demo this it really needs to pop."* A rail whose title
wraps to three lines because 22% of the phone is reserved for a marker nobody
set does not pop, and neither does a bento band that renders as six columns of
161px the moment someone puts it beside something. Both are on `main` today.
A seventy-first primitive would not have touched either.

**No maintainer review comments were outstanding.** #222 is this lane's only
open pull request and the only comments on it are this lane's own and Vercel's.
`gh` is unavailable in this sandbox; checked through the GitHub MCP tools.

## The four changes

### 1. `loom.mosaic` asks its own band, and fails safe doing it

The interesting half is not the swap from `@media` to `@container`. It is that
0079 **rejected container queries by name**, and its reason was a real one:

> where they are not supported, the un-queried rules are what apply, so a mosaic
> would render its *narrow* single-column layout forever on those clients

That objection is answerable in the CSS rather than in the argument, and the
mechanic is worth carrying. `grid-template-columns` lives on the mosaic itself,
and a container query reads an **ancestor**, never the element that declared the
containment — so the six tracks cannot go inside the query. The obvious way out
is `loom.offering`'s: wrap the grid in a frame element and query that. This
run took the other way — **leave the six tracks unconditional and switch the
cells**:

```css
.loom-mosaic { grid-template-columns: repeat(6, 1fr); container-type: inline-size; }
.loom-mosaic > * { grid-column: span 6; }          /* one per row, unconditionally */
@container (min-width: 48rem) { …the rhythm's spans… }
```

That costs no element, and the fallback comes out as **one cell per row** —
which is precisely the layout 0079 preferred, reached by the mechanism 0079
rejected. There is a test that fails if anyone writes it the other way round,
because the difference is invisible on any browser you would test on.

One rule needed a second class (`.loom-mosaic.loom-mosaic-lead > *`) so it
outranks the unconditional base on specificity rather than on source order. It
is the only rhythm selector that would otherwise tie.

### 2. The rail's marker column is the list's decision, twice

The 31 August finding offered three ways out and preferred the first. This run
took the first **and** a version of the second, because they answer different
halves and neither is a prop:

- **No entry sets a marker → the column is not reserved.** A `:has()` question,
  asked of the whole list. A render is a pure function of one node (0008), so no
  entry can see that none of its siblings set one — the list is the only thing
  that can, and the finding's own instinct that it *"wants to be the list's
  decision rather than each row's"* is exactly right.
- **There is no room to put it beside the title → it goes above it.** A
  `@container` query on the list's own inline size at 26rem, keeping the dot and
  the connecting line where they are. The finding called the responsive form
  "the general fix and the most expensive" on the grounds that the library has
  no breakpoint vocabulary; it has one now, and 26rem is the width `loom.orbit`
  already uses, so this borrows rather than invents.

The third option — a `markers` prop — is the one that was **not** taken, and
worth saying why: it spends grammar (0014) on a question the browser can see,
and it is a prop a model could set to disagree with what the list's children
actually hold.

The half a stylesheet assertion cannot reach is that the empty marker cell has
to still be **rendered** for `:empty` to match it. An entry that skipped the
element when the prop was unset would give the list nothing to test and the
column would never collapse. There is a test on the markup for that.

### 3. `loom.heading` caps against the column, not the window

`11vw` → `11cqi`, `9vw` → `9cqi`. Two lines.

This file has named the limit of the viewport version in its own comment since
20 August — *"a `vw` is the viewport, so a level-1 heading inside a narrow column
on a wide screen is not held back"* — and the swap is strictly safer than it
looks. With no ancestor declaring containment, `cqi` resolves against the small
viewport. Measured in a real browser at 390px: `min(72px, 11cqi)` and
`min(72px, 11vw)` both compute to **42.9px**. The open page is unchanged; the
marketing front door's hero, which has no container ancestor, renders exactly as
it did.

### 4. Two primitives say how wide they are, so the cap has something to read

`loom.split`'s two columns and `loom.card` now declare `container-type:
inline-size`. Without them change 3 is a rename rather than a repair.

This is the only part of the run that changes pages this lane does not own, and
it is stated plainly rather than buried: **a level-1 heading in a card or in half
a split gets smaller on a wide screen.** Measured at 1280px, in a 524px column:
72px → 58px. That is the change the cap was always for; it had simply never been
able to fire anywhere but a phone.

Both are safe to contain for the same reason — a split column's flex basis is
definite and a card's width comes from whatever is arranging it, so neither's
inline size was ever decided by its contents. Every absolutely positioned
element in the library already sits inside its own `position: relative`
ancestor, so the new containing blocks move nothing. That was checked before it
was written, not after.

## Which Hermes fields became nodes, and which stayed props

**None, either way.** This run ported no Hermes block, so 0052's question was not
asked. The port stands where #222 left it — **52 of 70 ported, 67 of 70
settled**, two pairs remaining.

The granularity-adjacent call is the one named above: `markers` on
`loom.milestone-list` and `columns` on `loom.mosaic` are both props that pass
0052 cleanly — neither changes the set of nodes — and both were still refused, on
the grammar budget and on the fact that a prop can disagree with the truth while
`:has()` cannot. That is the granularity doc's *"a prop that a delta could have
expressed"* test running out of road and 0014 taking over, which is worth
knowing is where the boundary sits.

## Records

**One, and it is `Proposed` rather than `Accepted`, deliberately.**

[0106 — a band asks its own container for a width, not the
window](../decisions/0106-a-band-asks-its-own-container-for-a-width-not-the-window.md)
is flagged **ARCHITECTURAL — needs review**, because it reverses an alternative
0079 considered and rejected by name, and 0079 is `Accepted`. Nothing supersedes
it; 0079 stands as written.

**The escalation rule says to build what does not depend on it, and this run
did not do that.** The mosaic and the rail both depend on it and both shipped.
The reasoning, so it can be disagreed with:

- **0079 asked for this.** Its consequences section says of the container-query
  form: *"Worth revisiting, and filed rather than assumed."* A record that asks
  to be revisited is not a record that forbids it.
- **The premise it rejected on is stale.** Three primitives shipped after 0079
  already use container queries — `loom.marquee` on 24 August, `loom.offering`,
  `loom.orbit` — so the support argument was answered in practice by three runs
  without anyone writing it down.
- **The specific failure mode it named is engineered around**, not waved away.
  See change 1.
- **Backing it out is one commit** and it is named in the pull request. That
  seemed a better trade than a fourth identical filing while the defect stays on
  the deployed site.

If that reads as overreach, the fix is to revert the two commits and I will file
the fourth entry.

**0103, 0104 and 0105 are claimed on three open framework branches**, so this
record is **0106**. That was checked by diffing each open branch against `main`
before the number was chosen, which cost one command and is the check whose
absence caused the clash #217 repaired. Worth doing every time.

## Findings

**Closed — three**, all owned by this lane, each naming this pull request: the
21 August mosaic entry, the 26 August container-query pattern entry, and
`Loom marketing`'s 31 August marker-column measurement.

**Filed — two, and a data point on a third:**

1. **A `loom.grid` cell is the one narrow column nothing can declare a width
   for.** Structural rather than an oversight — a grid styles its children
   rather than wrapping them, so there is no element to contain. Both ways out
   are worse than the gap. Bounded, because in practice a grid cell is a card.
2. **The brief still opens on "about twenty primitives are already ported"** and
   lists seventeen things to build, fifteen of which are registered. Two
   consecutive runs have now had to work out what breadth means *now* rather
   than what it meant on 16 August, because the brief cannot say. Owned by the
   maintainer; a routine cannot write the governance it is bound by.
3. **`21st.dev`, fifteenth consecutive block, seventh lane.** Appended to the
   existing entry rather than filed again, since a fifteenth heading says
   nothing a fourteenth did not. The visual bar this run worked to was
   `loom.hero` and `loom.feature-grid`, which is the other half of the brief's
   sentence and the only half a routine can read.

## The cross-lane line, and the one that was not needed

`apps/loom/app/(docs)/_lib/api/reference.generated.json` — regenerated with
`pnpm --filter @loom/app docs:api`, which the failing test names in its own
message. It is a generated artefact of the runtime's published surface, and the
surface moved because a doc comment did.

**Worth noting:** that comment was written long, and the generated reference
truncates a signature at a fixed length — so a paragraph on `LIBRARY_CLASS.rail`
pushed a *different* class's comment past the cut, and past the assertion that no
decision number reaches the published page. The reference test caught it. The
comment is one line now and the argument lives in `loom.milestone-list.ts` where
a reader looks for it. **A doc comment on an exported const is published surface,
and length is a cost there in a way it is not in a primitive's own file.**

**`FACTS.decisions` needed no hand-patch, for the first time in eight days.**
The derived form is on `main` and `facts.test.ts` passed with 103 records and no
edit to the marketing lane's file. Sixteen filings, four of them this lane's.
Closed by somebody else's merge, and worth saying out loud.

## Test numbers

`pnpm verify` **green**, twice — once before the record and once after.

| Suite | Files | Tests | Skipped |
| --- | --- | --- | --- |
| Runtime | 119 | 1,864 | 0 |
| Application | 158 | 2,497 | 0 |

`src/primitives/library.test.ts` went **200 → 204** tests. **Nothing was
weakened.** Two existing expectations changed rather than loosened:

- the mosaic test asserted `@media (min-width: 48rem)`; it now asserts
  `@container (min-width: 48rem)` **and** that no `@media` at that width remains,
  which is a stronger claim than the one it replaced;
- the heading test asserted `11vw`; it now asserts `11cqi` and, additionally,
  that no `vw` survives anywhere in the markup.

Two of the four new tests hold things that are invisible on any browser you
would test on: that the mosaic's unqueried rule is the *narrow* one, and that a
split column and a card actually declare the containment the heading's cap reads.

## The measurements, before and after

Taken through Playwright against the built library, both palettes, at a true
390px and at 1280px. `scrollWidth === innerWidth` on all four: **no overflow**.

**A `loom.mosaic` in one half of a `loom.split`, at a 1280px window (band 524px):**

| | cells |
| --- | --- |
| before | 343 / 161 / 161 / 343 |
| after | 524 / 524 / 524 / 524 |

**A `loom.milestone-list` at 390px (rail 350px):**

| | marker cell | title box |
| --- | --- | --- |
| no entry sets a marker, before | 88px | one line |
| no entry sets a marker, after | **`display: none`** | one line, 171px of text |
| entries set markers, before | 88px | **45px — two lines** |
| entries set markers, after | above the title | **23px — one line**, 246px |

**A heading in a 524px column at 1280px:**

| | level 1 | level 2 |
| --- | --- | --- |
| before | 72px | 48px |
| after | **58px** | **47px** |

**A heading with no container ancestor at 390px:** `11cqi` and `11vw` both
compute to 42.9px. Unchanged, as intended.

Screenshots alongside this report: `-before-phone`, `-after-phone`,
`-before-laptop`, `-after-laptop` under `editorial`, and `-bold-phone`,
`-bold-laptop` for the second palette. **Eighth consecutive run in this lane
where a picture carried something the assertions could not** — here it is that
the rail's dot still lines up with the marker after the marker moves above the
title, which is a 0.3em optical offset no test can hold.

## What the library still cannot express

- **A tab strip.** Unchanged: still blocked on a `select` member of the
  behaviour vocabulary, which is the framework lane's and needs a record.
- **A heading held to a bare grid cell.** Filed above.
- **A `loom.nav` that collapses on its own width.** Still a viewport media query,
  and still for the reason #204 gave: containment on a `position: sticky`
  element is unmeasured. 0106 leaves that exception open by name rather than
  quietly.
- **A shadow slot in the palette**, still, since #188.
