# The last two pairs

**Routine:** `Loom primitives` · **Date:** 2026-09-08 · **Branch:**
`primitives-26-five-units-one-tree` (continuing #248) · **Section:** §4b

## What shipped

Five primitives. **`docs/hermes-port-map.md`'s *pairs to build* table is now
empty, and so is every other table in that ledger that names something to
build.**

| | |
| --- | --- |
| `loom.book-grid` / `loom.book` | `book-list` + `currently-reading` |
| `loom.listing-grid` / `loom.listing` / `loom.spec` | `property-listings` |

The library is **89**. The port is **55 of 70 blocks ported, 13 needing no
primitive, 2 blocked on seams** — 68 of 70 settled, and the two that remain
(`tabs`, `feed`) want a state seam and a binding rather than a primitive.

## Why this rather than more breadth

The brief's standing order is breadth, and this is the reading of it that had a
finish line attached. Three arguments, in the order they decided it:

**1. Nothing was ahead of it.** `FINDINGS.md`'s open entries owned by this lane
are four, and all four are *limits recorded so they are not rediscovered as
bugs* — the ragged queue row, the un-containable grid cell, the reveal cascade,
the screenshot harness. None is a defect waiting on a fix. The 1 September run
went to the findings queue instead of breadth because three of its entries were
**a capability arrived, here is where it goes**; none of today's are that. So
the queue was genuinely empty and the plan was the top of the stack.

**2. No maintainer comments were outstanding** on #248 or on any of the five
pull requests it consolidates. The only comments on all six are this lane's own
and Vercel's.

**3. A table that has been open since the port started is worth closing.** "70
Hermes blocks" has been the shape of this job for a month, and three of them
were left. Three is a run. Leaving three is how a ledger stays open for another
month while each run picks the more interesting gap — and the port map itself
says the most valuable primitives of the last four runs were all *outside* the
ledger, which is an argument for finishing it rather than for continuing to
mine it.

The honest cost, stated plainly: **a bookshelf and a property listing are not
what the Loom demo stands on.** The brief says to prefer the primitives the demo
and the marketing site will actually stand on, and by that test alone these are
not first. They are first by a different test — the range mandate has a
measurable end and this reaches it — and one of the five, `loom.spec`, is a leaf
a software marketing page uses constantly (`4 vCPU · 8 GB RAM · 100 GB SSD`) and
the library did not have.

## Which Hermes fields became nodes, and which stayed props

**This is the run where 0052 landed on opposite sides of one question, in two
cards written the same afternoon.**

### `loom.listing` — three props became a list

Hermes' `PropertyListing`:

| Field | Verdict | Why |
| --- | --- | --- |
| `beds`, `baths`, `sqft` | **nodes** — `loom.spec` children | one shape, three times |
| `status` | **nodes** — `loom.badge` in a `flags` slot | never exactly one: *For sale* **and** *Price reduced* **and** *Open Sunday* |
| `link` | prop + a real `loom.action` in a slot | 0066: a listing is acted on, so the control is the target |
| `address`, `price`, `image` | props | one of each, and a `configure` changes them |

The first row is the whole run's argument and it took a second reading to see.
0052 says *a field that holds one value of which there is exactly one stays a
prop*, and every one of `beds`, `baths` and `sqft` passes that test
individually. They fail it **as a set**: they are not three properties of a
listing, they are one property — *a measured fact about the thing* — occurring
three times, with the field names carrying the units. As props, a listing for a
plot of land can never say `0.4 acres`, and the fourth fact is not expensive but
**unreachable**.

This is the same shape the port map already noticed twice without naming:
`hours-of-operation`'s seven weekday fields, and the `hotspots[]` array
`loom.pin` refused. **[0115](../decisions/0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md)
is the rule those three were instances of** — written `Proposed`, see *Records*.

### `loom.book` — five fields stayed props, and two blocks became one card

| `BookItem` | `ReadingItem` | here |
| --- | --- | --- |
| `title` | `title` | `title` — prop |
| `author` | `author` | `author` — prop, **required** |
| `image` | `cover` | `cover` — prop |
| `description` | `note` | `note` — prop, one sentence about one book (0059) |
| `year` | `status` | `marker` — prop, free text, never parsed |

Hermes' own comment insists `ReadingItem` is *"distinct from BookItem"*. Read
the fields rather than the comment and the only difference is that `"2019"` and
`"Halfway through"` are both **a short label saying where this book stands**,
which is the collapse `loom.article` made across five blocks and
`loom.milestone` across seven.

**Nothing here became a node**, and that is the correct answer for the same
reason the listing's answer was the other one: a book has exactly one author and
exactly one note, and a fourth author is not a thing anyone wants. The two
verdicts are not inconsistent; they are the *fourth-one question* asked twice and
answered honestly.

### The two blocks the pair produces are one card, not a prop

`book-list` is a wall of covers; `currently-reading` is a short list of rows,
cover beside text. That is not two primitives and it is not a `variant` — it is
**a question about how much room the card was given**, which `loom.offering`
opened and this is the third caller of. `loom.book` declares
`container-type: inline-size` and one `@container` rule flips its frame past
32rem; `loom.book-grid`'s `columns: "one"` is what gives it the width. Nothing
in the tree says which.

## Two names changed, and both changes are a record being applied

**`loom.book-shelf` → `loom.book-grid`.** The port map proposed *shelf* and said
to read the name as a prediction. 0054 says a container is its child's name plus
**the arrangement**, and *shelf* is a metaphor for books rather than a word for
what the element does with its children — which is `repeat(auto-fit, minmax(…))`,
the same thing seven other containers do under `-grid`. A reader who has met
`loom.article-grid` can predict `loom.book-grid`; nobody can predict `-shelf`
without already knowing it is about books. Fifth proposed name to change this
way, and getting it right before it ships is 0054's whole consequence.

**`loom.listing` survived its noun test.** The map flagged it as a
`property-listings` word — the test that renamed `loom.episode` to
`loom.recording` — and it holds: *property* is the narrow word, *listing* is the
general one. A rental, a vehicle and a plot of land are all this card. What the
noun names is **a thing at a location, priced, and measured**, which is what
separates it from `loom.product` (no place, no measurements) and `loom.offering`
(somebody's time rather than a thing).

## What the pictures found that the assertions could not

**Seventh consecutive run in this lane where a screenshot found what no test
did.** Three defects, all shipped-and-fixed within the run:

**1. A shelf on a phone was one enormous cover per screen.** A 12rem column
floor is an entirely ordinary card minimum, and against a 2:3 cover on a 390px
screen it produces a 585px-tall book and a four-thousand-pixel scroll. Every
column value was valid CSS and the band had no overflow at any of them, so
nothing in the suite could see it. The floors are now sized against the phone
first — `auto` at 9rem, `four` at 10rem, which is where 350px of usable width
fits two columns and a gap. **This is the only grid in the library sized that
way round, and books are why: a cover stays legible at a thumbnail's size.**

**2. A coverless book was nearly invisible on the dark palette.** The panel is
`bg-surface-muted`, which is a step off the page under `editorial` and very
nearly the page itself under `bold` — the standing finding that a surface-toned
band disappears on the darker palettes, met by a primitive rather than by the
theme. It now carries a four-sided `border-subtle` **and** the heavier leading
spine, so the panel is a drawn object under both.

**3. A wrapped specs row began a line with a floating middot.** Written the
obvious way — `.loom-spec + .loom-spec::before` — the separator belongs to the
second of each pair, which is right until the strip wraps. It is now
`:not(:last-child)::after`, so a wrapped line *ends* with the middot, which is
how a typesetter breaks a run and reads as continuation rather than as a bullet.

**And one deliberate call that answers an open finding from the other side.**
The 2 September entry — *a queue row whose child has no artwork cannot line up
with the ones that do* — lists **always draw the panel** as one of three answers
and declines it for `loom.recording`, because a track with no artwork is a title
and a runtime and nothing is missing. **A book is the case where the same choice
is right**: a book is a physical object with a shape, so a blank 2:3 panel with a
spine reads as *this edition's cover is not to hand* rather than as an empty
rectangle. Both cards in this run draw their frame unconditionally, and the
listing has a second reason — the flags live inside it, so a listing with a
state and no photograph would otherwise have nowhere to wear it.

## Records

**One, [0115](../decisions/0115-three-fields-of-one-shape-are-a-list-wearing-three-names.md)
— `Proposed`, `ARCHITECTURAL — needs review`.** It refines 0052, which is
`Accepted`, so the brief makes it an escalation: it is written as `Proposed`,
0052 is neither superseded nor amended, and **nothing in this branch waits on
it.** `loom.spec` and `loom.listing` stand on precedent already on `main` —
`loom.pin` shipped on this exact reasoning on 4 September, and the port map
reaches the same answer for `hours-of-operation`'s seven weekdays. The record
writes down the rule those two were instances of; it does not introduce it.

**It skips four numbers deliberately.** `0111`–`0114` are a hole, which 0097
permits in as many words. The highest record on `main` is `0110`, thirty pull
requests have been open since 1 September, and `0096` was claimed by ten
branches at once — a clash is fatal to every lane's `pnpm verify` and a hole
costs one line in the index.

## The port map

Rewritten where this run changed it, and **its header was wrong before this run
and is corrected**: it read *"Done — 47 blocks, 73 primitives"* against a summary
table that said 52 ported, where `73` was the size of the whole library rather
than of the port. It now reads 55 blocks and 46 primitives, with a note saying
which is which. **Third time this document has disagreed with itself about its
own count and the third time it has been fixed by hand.** The small tool it keeps
asking for — deriving the figure from the ledger's own rows — is still unwritten.

## Findings

**Filed — three.** No finding closed: the four open entries owned by this lane
are recorded limits rather than defects, and this run did not reach any of them.

## Test numbers

`pnpm verify` **green**, end to end. **Nothing was weakened.**

| Suite | Files | Tests |
| --- | --- | --- |
| Runtime | 119 | 1,913 |
| Application | 158 | 2,497 |

Ten tests added to `src/primitives/library.test.ts`. Three existing tests changed
their expectation rather than their strength — the registry count (84 → 89), the
leaf list (two entries, each with the reason it is there), and the every-primitive
coverage set, which now includes this run's fixture.

Every screenshot is at a **true 390px or 1280px viewport** at
`deviceScaleFactor: 2`, each with a `scrollWidth === innerWidth` measurement
beside it: **four of four, no overflow**, both palettes, both widths. The
placeholder covers and photographs are served over local HTTP rather than
inlined, because `mediaUrlSchema` refuses `data:` deliberately and weakening it
to take a picture would be the wrong trade.

## The cross-lane line

`apps/loom/app/(marketing)/_lib/copy.ts` — `FACTS.primitives` `"84"` → `"89"`.
One constant in the marketing lane's file, and it is a **derived count that this
lane's work necessarily moves**, so it is unavoidable rather than a choice.
Seventeenth occurrence of the general problem; `FACTS.decisions` is no longer one
of them, because it is now a floor rather than a count, which is the fix the
sixteen previous entries were asking for.

## What the library still cannot express

- **A tab strip**, still. `disclose` proved the behaviour vocabulary's shape and
  a `select` member is a smaller question than it was, but it is the framework
  lane's and it needs a record.
- **A shadow slot in the palette.** Unchanged since #188, and it cost something
  concrete this run: `loom.book`'s spine is a border rather than the box-shadow a
  book actually casts, because a shadow would have to be a literal colour.
- **A listing's flags have no scrim.** They sit over a photograph and rely on
  `loom.badge`'s own `tone` for contrast, which is opaque for `accent` and
  `neutral` and is the author's risk for `outline`. `bg-overlay` is a palette
  slot every palette declares and nothing paints — the 4 September finding —
  and this is now its second would-be consumer.
- **A container query on a grid cell.** A `loom.book` in a `loom.grid` cell
  cannot ask its cell for a width, because a grid styles its children rather
  than wrapping them. Filed 3 September; it bites here only in the case where a
  book is placed in a general grid rather than in its own.
