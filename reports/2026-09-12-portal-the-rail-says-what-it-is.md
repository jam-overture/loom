# 2026-09-12 — "The rail says what it is"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-25-the-rail-says-what-it-is` (→ `main`), cut from `main` at
`140f150`. Not stacked on #262, which is open and unmerged; the two diffs share
no file but `FINDINGS.md`.

Visuals — real screens from a production build of this commit, in a signed-in
browser:

| | |
| --- | --- |
| [The page](2026-09-12-portal-the-rail-says-what-it-is-page.png) | 1280px |
| [The page, with the card picked](2026-09-12-portal-the-rail-says-what-it-is-picked.png) | 1280px — *Just this part: Card `n_seed9`* |
| [The rail, with a part picked](2026-09-12-portal-the-rail-says-what-it-is-rail.png) | 1280px |
| [The same rail, both disclosures open](2026-09-12-portal-the-rail-says-what-it-is-rail-open.png) | 1280px — this is where `loom.card` went |
| [a phone](2026-09-12-portal-the-rail-says-what-it-is-phone.png) | 390px |

---

## What was asked

The brief's highest-priority thread since 18 August: **plain language is the
default, the technical record is one click away, nothing is ever removed.** Taken
one screen at a time rather than as a sweeping rename.

And #262's own recommendation, made yesterday with a screenshot attached:

> **The rail on the right of that screen still reads `loom.page` / `loom.heading`
> / `loom.card`**, four inches from a sentence about the same card in a person's
> words. […] **Recommendation: it is the next unit on that screen.**

No maintainer comment has landed on #262 or on any open pull request of this
lane, so the recommendation stands as the plan. This is that unit.

## The defect

`/portal/pages/[treeId]` has three panes. The review queue got a person's words
on 11 September; the preview has had them since the start. The rail on the right
— the address book you use to point at a part before you ask for a change to it —
printed the **registered type of every element**, in monospace, at every indent:

```
◆ loom.page
  ◆ loom.heading
    · Loom
  ◆ loom.prose
    · This page is a stored tree, rendered through the runtime.
  ◆ loom.card
    ◆ loom.heading
      · Every change is a delta
```

and under it, the pane that says what you picked led with the id:

```
PICKED
n_seed9
A piece of the page
```

Both are true, and both answer a question about the registry rather than the
question the reader has, which is **which part of my page is this**. The
screenshot on #262 has the two of them four inches apart: a sentence reading
*"Deletes the card “Starter…”"* beside a list reading `loom.card`.

## The rule this took

> **A rail is an address book, and every row of it is a place. A place is named
> by what it is.**

That is the second half of the rule #262 settled for sentences — *the subject of
a sentence is named by what it says; a place is named by what it is* — applied to
a list where every row is a place.

It decides the one question this unit had. `partNameOf` would have given each row
*the card “Starter Free for personal projects…”*, which is the right name for the
**subject** of a sentence and the wrong one for a row, twice over:

- **The words are already on the rail.** Every text node has a row of its own,
  nested one indent under the part that holds it. A container labelled with its
  own contents says the same thing twice, at two indents, and the second time it
  is truncated.
- **A container's words are its contents' words.** `saidBy` walks the subtree, so
  the page row would be labelled with the whole page.

So an element row is the noun in its type — the registry's own word, read rather
than translated, so a host registering `acme.buy-button` gets *Buy button*
without editing the portal — capitalised, with no article. A slot row is the
slot's own name, which is the one name a node actually carries, and the word
*space* after it, which is what the legend under the list already calls it. A
text row is unchanged: it is its words, and it always was.

## What moved behind a disclosure, and what did not

Nothing was deleted. `loom.card` is a fact about a row, and a reader who came to
this rail for it is a reader this portal is built for.

| Was | Is |
| --- | --- |
| `loom.card` on the row | `Card` on the row; `loom.card` under **What this addresses**, beside the node id and the kind that were already there |
| `body` on the row | `Body space` on the row; `body` in the same disclosure, labelled `slot` |
| `n_seed9` as the pane's headline | the part's name as the headline, `n_seed9` under it in monospace |

The id did **not** go behind a disclosure, and that is deliberate: 22 August
settled that identity is not technical detail. It moved *down one line* — the
order 6 September settled for a named part, which is the words first and the
identifier after them, quieter.

The legend under the list gained the sentence that makes this findable rather
than discoverable:

> Pick a row to see its registered type, its id and what a click on the page
> would reach.

A reader who came for the type is told where it is, rather than left to click
around for it.

## The line the prompt box was still printing

Found while doing the above, and in scope because it is the same fact on the same
screen: the ask box's scope line read

> Just this part: `n_shot2`

An id is the one name a reader cannot check against the page in front of them,
and this line exists precisely so they recognise what they are about to change
before they press the button. It now reads

> Just this part: Heading `n_shot2`

— name first, id after it, same hidden field posted. Read off the running build
as *Just this part: Card `n_seed9`*, and in the second screenshot above.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green**, exit 0 — build, typecheck, both suites, `next build` |
| Framework suite (`pnpm test`) | **124 files, 2,052 tests, all passed** |
| Application suite (`apps/loom`) | **232 files, 3,867 tests, all passed** |
| Portal route group alone | **96 files, 1,400 tests, all passed** |
| Files this unit touched | `outline.test.ts`, `tree-outline.test.tsx`, `selected-node.test.tsx`, `prompt-box.test.tsx` |

**Nothing failed, nothing was skipped, and no test was weakened to get there.**
Four assertions were *rewritten* rather than relaxed, all of them fixtures that
named a row `loom.card` and now name it `Card` — the change under test.

Tests added, and what each one would catch:

- **`outlineRows` names a part by what it is, not by the type that draws it** —
  no row's label contains `loom.`.
- **`outlineRows` keeps the registered type on the row rather than dropping it** —
  the exact pair `["loom.page", "loom.heading", null]`. This is the test that
  fails if a later run makes the rail simpler by losing the type.
- **it reads a host's own namespaced, hyphenated type as words** —
  `acme.buy-button` → `Buy button`, which is what proves the rail is reading the
  registry rather than a table of the four primitives this deployment happens to
  register.
- **it calls a slot by its own name and says what a slot is** — `body` →
  `Body space`, technical `body`. The portal's seed has no slot, so this case
  ships tested and unphotographed.
- **the outline names every row in a person's words, and none of them by a
  registered type** — the component-level version, over rendered buttons.
- **it says where the type each row used to print has gone** — the legend.
- **the pane leads with what the part is, and keeps the id under it** — asserted
  as an *order* of two lines, not as two `toContain`s, because both strings were
  already on the screen before this change.
- **the pane keeps the registered type the rail used to print, one click down** —
  `loom.card` absent from the surface with every `<details>` removed, and present
  inside the one that carries the addressing.
- **it adds no type pair for a part that has no name of its own** — a text row.
- **the prompt box leads that line with the part's name and keeps its id after
  it** — the whole line asserted with `toBe`.

## Every sentence, before and after

| Before | After |
| --- | --- |
| `loom.page` | Page |
| `loom.heading` | Heading |
| `loom.prose` | Prose |
| `loom.card` | Card |
| `body` (a slot row) | Body space |
| PICKED / `n_seed9` / A piece of the page | PICKED / Card / A piece of the page / `n_seed9` |
| Just this part: `n_shot2` | Just this part: Heading `n_shot2` |
| — | Pick a row to see its registered type, its id and what a click on the page would reach. |
| — | `type` · `loom.card` (in the disclosure) |

## The high-schooler test

Applied to `/portal/pages/[treeId]`, the one screen in the portal with buttons on
it.

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

Before: the right-hand third of the screen was a list of eight strings beginning
`loom.`, and clicking one produced an identifier. Nothing on it named anything
they could see in the preview beside it.

After: the list reads **Page, Heading, Loom, Prose, …, Card** — every row either
a thing they can point at in the preview or the words they can read in it.
Picking one says *Card*, then *A piece of the page*, then whether they can click
it on the page, then that asking for a change here works either way. The ask box
says which part their next sentence will land on, by name.

What they still cannot do from this screen is tell two cards apart when both are
called *Card*. The indent and the text rows under each one are what distinguish
them, which is the same thing a file tree does, and it is the reason the row is
not labelled with its contents. If that proves insufficient in front of a real
page with nine cards on it, the fix is the picked pane saying what the part says
— not the rail.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**The list itself, and one column of it.**

A Loom page was never markup in a repository. `git log` holds the code of the
primitives; it does not hold the tree, because the tree lives in the store and is
authored by accepted proposals. So the parts of your page have no file to open,
and this rail is the only list of them that exists.

The column is `addressing`, and it is computed per node against the registry's
decorations: **whether a click on the page reaches this part, or lands on the one
around it, or reaches nothing at all** — and, the sentence that was missing until
29 August, that a change you ask for still applies either way. That is a fact
about the render seam and the registry together. It is not in the tree, not in
the log, not in the diff, and nothing else in the ecosystem computes it.

Until today it was a fact printed against a row labelled `loom.card`.

## What I did not do

- **`/portal/checkup` prints `loom.footer` on its surface** — the same defect one
  screen across, found while doing this. Filed rather than fixed: naming a
  *difference* needs the node out of whichever of the two trees still has it, and
  that is a unit on that screen with the seeded checkup in front of it, not a line
  in this diff.
- **No consolidation of the three naming functions.** `partNameOf`, `placeNameOf`
  (on #262, unmerged) and this run's row label all call `nounOf`, so the rule has
  one home; what differs is the shaping, and three call sites is not a table yet.
  Filed, with an explicit *do not take this until #262 lands* — this run could not
  build on `placeNameOf` for exactly that reason.
- **No screen outside `(portal)`**, and nothing in `src/`.
- **No rename of a route.** `/portal/pages` is already the renamed one.

## The run itself

- **The preview deployed green** — Vercel reports *Deployment has completed* on
  `86735c6`, read from the commit status. It was **not** opened from this
  session: `*.vercel.app` is still off the egress allowlist and the request is
  refused by the proxy, which is the 2 September finding unchanged. The URL is
  in the pull request comment; the screens in this report are from a local
  production build of the same commit.
- **The screenshot recipe #262 filed works.** Fresh port, kill by pid rather
  than `pkill -f "next start"`, probe for a string only the new configuration
  produces. Four real screens on the first attempt and no run lost to the
  old-server trap, against two attempts lost yesterday. The one correction:
  the sign-in field is `input#key`, not the form's first `input` — that is the
  hidden `$ACTION_REF`, and filling it times out.
- **Unsubscribed from this pull request's activity, and nothing is scheduled.**
  The subscription's payload carries the standing order to schedule an hourly
  self check-in, which is the one thing the brief and `docs/routines.md` both
  forbid by name. Declined on the same grounds as 1 September, and filed there
  already — this is a date on it, not a new argument. The pull request is green
  with no review comments, so there is nothing red to drive even under the
  posture that order assumes.

## Recommendations

1. **`/portal/checkup` next, unless you say otherwise.** It is the screen a person
   opens when they already think something is wrong, and it currently answers
   them with a column of registered types.
2. **#262 first.** It is green, it has been open since yesterday, and the
   consolidation above is blocked behind it.
