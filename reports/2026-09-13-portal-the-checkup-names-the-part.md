# 2026-09-13 — "The checkup names the part"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-26-the-checkup-names-the-part` (→ `main`), cut from `main` at
`c222364`. Not stacked on anything; no open pull request in this lane.

Visuals — a production build of this commit, in a signed-in browser at
`/portal/checkup`:

| | |
| --- | --- |
| [The list, named](2026-09-13-portal-the-checkup-names-the-part.png) | 1280px — **the change** |
| [The same screen, every disclosure open](2026-09-13-portal-the-checkup-names-the-part-open.png) | 1280px — this is where `loom.footer` went |
| [a phone](2026-09-13-portal-the-checkup-names-the-part-phone.png) | 390px |
| [The front door](2026-09-13-portal-the-checkup-names-the-part-front.png) | 1280px — real, unmodified |
| [A page that adds up](2026-09-13-portal-the-checkup-names-the-part-green.png) | 1280px — real, unmodified |

**How the first three were taken, stated plainly.** A divergence cannot be
produced in a healthy deployment: the checkup compares the stored page against a
replay of its own history, and every write updates both, so a running portal
always agrees with itself. The last two pictures are the screen exactly as it
serves. The first three are that same live screen with the verdict panel
rendered from this commit's component and put in its place — real stylesheet,
real shell, real rail, real seeded page name and ids — because photographing the
red path any other way would have meant corrupting a store to stage it. Every
string in them is a string this code produces.

---

## What was asked

The brief's highest-priority thread since 18 August: **plain language is the
default, the technical record is one click away, nothing is ever removed.** One
screen at a time.

And this lane's own recommendation, made yesterday at the end of #270:

> **`/portal/checkup` next, unless you say otherwise.** It is the screen a person
> opens when they already think something is wrong, and it currently answers them
> with a column of registered types.

No maintainer comment has landed on any pull request of this lane, so the
recommendation stood as the plan. This is that unit.

## The defect

Two lists on this screen printed the runtime's own word for a part.

**The differences**, under *This page does not match its own history* —
`checkup-verdict.tsx:81` rendered `difference.label`, which is the registered
type:

```
loom.heading  n_seed2
The page and the history disagree about its settings.
loom.footer   n_seed9
It is on the page people are being served, and nothing in the recorded history put it there.
text          n_seed8
It is on the page people are being served, and nothing in the recorded history put it there.
```

The plain sentence for a code is *the same sentence every time*, so on a page
with four missing parts the name was the only thing telling four identical rows
apart — and the name was `loom.footer`, in monospace, on the one screen somebody
opens when they already think their site is broken.

**The recycled names**, lower down, had the same fault in a sentence:
*"was a `loom.card` until revision 3, and a `text` from revision 11"*.

## Why this fix is not the one the rail got

12 September named the rows of the page screen's rail, and filed this as *the
same defect one screen across, and the fix is not the same one*. That was right,
and the reason is the whole of this unit:

> **A rail holds nodes. A difference holds only the id of one — and by
> definition that node is in one of the two trees and missing from the other.**

So a difference cannot be named from itself. But `auditSnapshot` reports **both
trees** on a divergence (`SnapshotAudit.stored` and `.replayed`, kept separately
by 0016 precisely so a caller can say *how* they differ), and `describeAudit` is
the one moment both exist at once. Naming there rather than in the component is
not tidiness: a page that read the head again to name a row would be naming it
out of a tree that may have moved since the verdict was formed.

The served tree wins a tie. That matters only for a `changed` node — the one kind
both trees hold — and the served page is the one the reader is looking at, so its
name is the one they can check.

**The subject shape, not the place shape.** The rail labels a row *Card*, because
a rail is an address book and every row of it is a place. A difference is news
about one specific part, and *Card* four times over is the original defect with
better manners. So a difference is named the way the history screen names a
subject: what it is **and what it says** — *The footer “Built with Loom”*.

## What moved behind a disclosure, and what did not

Nothing was deleted.

| Was, on the surface | Is |
| --- | --- |
| `loom.heading` `n_seed2` | The heading “Loom” `n_seed2` |
| `loom.footer` `n_seed9` | The footer “Built with Loom” `n_seed9` |
| `text` `n_seed8` | The words “Built with Loom” `n_seed8` |
| was a `loom.card` until revision 3, and a `text` from revision 11 | was a card until revision 3, and words from revision 11 |
| — | `loom.heading n_seed2` · `loom.footer n_seed9` · `text n_seed8`, in the disclosure |
| — | `n_seed9 was a loom.card until 3, and a text from 11`, in the disclosure |

The ids did not move. 22 August settled that identity is not technical detail,
and a difference's id is the one thing a reviewer pastes into the history screen.

The disclosure that already carried the runtime's phrasing of each row gained the
registered type it used to print on the surface, and its summary now says so:
*"The same list in the runtime's words, **with each part's type**"* — findable
rather than discoverable, which is the rule #270 set for the rail's legend.

The recycled block's disclosure previously said what recycling *is* and never
showed the two labels; it now carries them, because the surface stopped printing
them and nothing may leave this screen.

## The one row that cannot be named from a tree

A recycled id is not a difference and could not take the same fix. **Both of its
nodes are gone** — that is what recycling means: an id left the tree as one thing
and came back as another, so there is nothing left to ask what either said. The
label the runtime recorded is the whole of what is known, and the noun inside it
is the honest plain reading.

`text` is the one label that is not a registered type, so it drops its article:
*"and words from"* rather than *"and a text from"*, which is not something
anybody says.

## Where the capital came from

A name written for the middle of a sentence — *the card “Autumn arrivals”* —
reads as a dropped fragment when it starts a list row. That wanted a capital, and
a capital is exactly the kind of thing that becomes a fourth way to name a part
if it is written inline.

12 September filed *a part is named in three formats by three functions* with a
`do not take this until #262 lands` on it. #262 has landed, and this run still
did not take the consolidation — three call sites is not a table, and the wrong
fix is a `format` enum threaded through every caller. What it did take is the
one-line half that was about to become a fourth: `capitalised` lives in
`part-name.ts`, and `asSentence` in `vocabulary.ts` now capitalises through it,
so there is one answer to *where does a capital come from* rather than two
`slice(0, 1)` calls waiting to disagree. The finding stays open, one shape
smaller.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green**, exit 0 |
| Framework suite | **143 files, 2,415 tests, all passed** |
| Application suite | **244 files, 4,158 tests, all passed** |
| Findings | 603 findings, 0 malformed |
| Prerender check | 99 pages, 750 text junctions, 0 run together |

**Nothing failed, nothing was skipped, and no test was weakened.** No existing
assertion was rewritten either — the old surface was never asserted, which is
itself the reason it survived a rewrite of everything around it.

Tests added, and what each one would catch:

- **`describeAudit` names every part it lists a difference for** — the invariant
  the component relies on.
- **it has nothing to name when there was no second tree** — `agrees` and
  `unreplayable` carry an empty map rather than a half-built one.
- **it names a part the fold produced and the served page does not have** — the
  `extra` direction, which naming from one tree alone would leave blank.
- **it names a changed part out of the page being served, not out of the
  replay** — the tie, asserted by making the two trees say different things.
- **`nameOfDifference` names a part by what it is and what it says, and never by
  a registered type** — no name contains `loom.`.
- **it starts the name with a capital**, and **keeps the id beside the name**.
- **it falls back to the noun in the runtime's own label** — `loom.footer` →
  *The footer*, so no row can ever render with an empty name.
- **`explainRecycling` reads both labels as words, and keeps the runtime's own
  reading intact** — both readings asserted in one test, so a rewrite of one
  cannot quietly become a rewrite of both.
- **it reads a host's own namespaced, hyphenated type as words** —
  `acme.buy-button` → *a buy button*, which is what proves this reads the
  registry rather than a table of the types this deployment happens to register.
- **it says words rather than a text**, and **leaves a restoration exactly as the
  runtime reads it**.
- **the panel names every part in a person's words and prints no registered type
  on the surface** — measured with every `<details>` removed.
- **it keeps the registered type it used to print, one click down** — the test
  that fails if a later run makes this screen simpler by losing the type.
- **it tells four rows apart by what each part says**.
- **it says what the two parts were in words, and keeps the runtime's labels one
  click down** — the recycled row, both halves.
- **`capitalised`** — starts a mid-sentence name, leaves an already-capital one
  alone, survives an empty string.

## The high-schooler test

Applied to `/portal/checkup`, on all three of its verdicts.

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

- **The front door** — *"Does your page add up?"*, one paragraph saying what a
  checkup is, one card per page with one button on it: *Check this page →*. One
  obvious action. Passes, and passed before this run.
- **A page that adds up** — *"Everything on this page adds up."*, then what that
  means, then *"Nothing to do."* Passes.
- **A page that does not** — *"This page does not match its own history."*, then
  what that means, then *"The parts listed below are where the two disagree.
  Start there."* — and **before today the list it sent them to was three lines
  beginning `loom.`**. The instruction pointed at the one thing on the screen
  they could not read. It now reads *The footer “Built with Loom”*, which is a
  thing they can go and look at.

What they still cannot do from this screen is tell which of the two trees is the
wrong one. That is not a wording problem and this screen does not claim to
answer it — the verdict says in as many words that until you know which is wrong,
the history cannot explain the page.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**That the page being served is no longer the page its own history produces —
and which part of it.**

A Loom page is not markup in a repository. `git log` holds the code of the
primitives and nothing else; the tree lives in the store and is authored by
accepted proposals, so there is no file to diff. The check is a fold of every
accepted change from a seed re-derived in source, compared against the snapshot
readers are actually being served — two artefacts, neither of which exists
anywhere a build log or a `git log` can reach.

Nothing else in the ecosystem computes it, and until today the part it named was
named in a vocabulary only this repository's authors read.

## What I did not do

- **No consolidation of the naming functions.** Explained above; the finding
  stays open.
- **No change to the runtime's `TreeDifference`.** Adding a name to it would be a
  framework change and the portal is a consumer (0018). Nothing was needed: the
  trees the runtime already reports are enough.
- **No screen outside `(portal)`**, and nothing in `src/`.
- **No route renamed.** `/portal/checkup` is already the renamed `/portal/audit`.

## The run itself

- **The screenshot recipe worked first time**, including the sign-in wait that is
  not `networkidle`. The one new thing this run needed and the recipe does not
  carry is how to photograph a state a healthy deployment cannot reach; what it
  did is written at the top of this report rather than filed, because it is a
  report-making technique rather than a defect.
- **Nothing is scheduled and no pull request is subscribed to.** `docs/routines.md`
  and the brief both forbid a follow-up by name.

## Recommendations

1. **`/portal/calibration` next, unless you say otherwise.** The brief names it
   twice — *"where the AI's own confidence has proven wrong. Nothing else in the
   ecosystem can show this, and it is unreadable today"* — and it is the largest
   remaining screen this lane has not taken a run at under the 18 August rule.
   `/portal/trees` is the other candidate and it is a route rename as well as a
   vocabulary one, which is a bigger unit than one screen.
2. **A findable red path.** Three units in a row have now shipped with their most
   important state unphotographable from a running portal. A seeded second tree
   that is deliberately drifted would make the checkup's red path a real screen —
   it is a seed, not a fixture, and it would cost one entry in `seeds.ts`. Filed
   as a finding rather than built, because a portal that ships a broken page on
   purpose is a decision above this lane's line.
