# 2026-08-26 — "What this would do to your page"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-13-what-this-would-do` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a
signed-in browser:

| | |
| --- | --- |
| [The review queue as a reviewer meets it](2026-08-26-portal-what-this-would-do.png) | 1280px |
| [the same screen with every disclosure opened](2026-08-26-portal-what-this-would-do-open.png) | 1280px |
| [a phone](2026-08-26-portal-what-this-would-do-phone.png) | 390px |
| [the pages screen, and its durability notice](2026-08-26-portal-what-this-would-do-pages.png) | 1280px |

**How honest these are, stated plainly.** The screen, the store, the hold store,
the read path and the components are all real. There is **no `ANTHROPIC_API_KEY`
in this run's environment**, so no change can be composed, so no proposal can be
held, so the review queue cannot be populated through the user interface at all.
The two holds and the one applied revision in the pictures were put there by a
**temporary, uncommitted module** that called `portalStore.append` and
`portalHolds.hold` — the store's and the hold store's own contracts, the same two
the write path uses — behind an env var. It was deleted and the one line calling
it reverted before committing; `git status` on this branch shows neither. That is
the same workaround as 25 August, and it is the second consecutive run to need
it. It is filed again, with a sharper recommendation.

---

## What was asked

**No maintainer comment is open on any portal pull request, and there are no open
portal pull requests.** #152 and #161 merged. The five open pull requests belong
to `Loom lessons`, `Loom docs`, `Loom marketing`, `Loom primitives` and the
framework.

The 25 August finding closed the rename queue and said what it did not buy:

> The queue being empty is not the same as the job being done.

It was righter than it knew. **The review queue's middle was still entirely in
the runtime's voice**, and the review queue is the brief's first-named value
item. And beneath that, something worse: **on the deployment the maintainer
actually looks at, the review queue is empty by construction.**

So this run is one unit with two halves: make the queue exist, and make it
readable.

## What shipped

### 1. A held change now survives the request that made it

`portalHolds` was `memoryHoldStore()` — a `Map` in process memory. That keeps its
promise under `pnpm dev` and cannot keep it anywhere else. On a serverless host
the instance that judged a change is usually gone before the reviewer opens the
queue: the confirmation arrives at an instance that has never heard of the
proposal and comes back as `not-held`, whose own comment admits it means "never
held, already answered, **or expired**" and has no fourth reading for *the
machine that was holding this went away* — which is the true one.

`portalHolds` is now `postgresHoldStore(portalDatabase)` when a database is
configured, and memory when not. Two lines. It closes the framework routine's
**23 August finding**, which filed it here because choosing a store is a
deployment decision the surface owns (0088), and no schema step was needed
because `db:push` already creates `loom_holds`.

**The shape was already in the file next door.** `telemetry.ts` chooses on the
same handle with the same ternary and says so in its comment; `store.ts` does
the same. The hold store was the one of the three that did not, and nothing on
screen would ever have said so.

Two consequences, written on purpose rather than discovered:

- **`release` is a take**, and with Postgres behind it that is now enforced by
  the statement rather than by the process happening to be single-threaded. Two
  reviewers pressing *Apply this change* at the same moment produce exactly one
  success and one `not-held`. The loser is **correct, not faulty**, which is why
  the card already says *"Somebody has answered this one"* rather than reporting
  an error — that wording was written before it could happen and is right now
  that it can.
- **The durability notice on `/portal/pages` was about accepted changes only.**
  It now names the half that is worse and that nothing on screen gives away: with
  no database, *a change waiting for your answer can disappear before you get to
  it.*

### 2. The review queue's middle, in a person's words

`ProposalEffectView` is the section on the hold card that answers the only
question a reviewer actually has — **what would this do to my page?** The card
around it was rewritten on 21 August. Its middle was not, and it was the delta
talking throughout.

The card leads plainly, the delta's own account is one click down under **What
the change record says**, and — as everywhere in this lane — **nothing was
deleted to get there**. The record is strictly larger than it was: it now carries
the composed detail, the path, the runtime's obstacle sentence *and* both
revision numbers, where before the obstacle was dropped for stale proposals and
the revision pair was only printed when it was the problem.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `what this would change` | **What this would do to your page** |
| `reconfigure` `loom.heading` (a mono chip and a name) | `Changes the loom.heading's title.` |
| `reconfigure` with a cleared key | `Takes away the loom.heading's gap.` |
| `reconfigure` doing both | `Changes the loom.heading's title, and takes away its gap.` |
| `reconfigure` with an empty `set` | `Changes nothing about the loom.heading — it lists no settings.` |
| `add loom.card` · `into loom.band, before loom.heading, bringing 4 nodes` | `Adds a loom.card inside loom.band, just before loom.heading. It brings 3 more pieces with it.` |
| `add loom.card` · `at the end of loom.page` | `Adds a loom.card at the end of loom.page.` |
| `delete loom.band` · `and 4 nodes under it` | `Deletes the loom.band, and the 4 pieces inside it.` |
| `delete loom.heading` · `a single node, with nothing under it` | `Deletes the loom.heading, which has nothing inside it.` |
| `move loom.card` · `out of loom.band and into loom.grid, at position 1` | `Moves the loom.card out of loom.band and into loom.grid.` |
| `move loom.card` · `within loom.band, position 0 → 2` | `Moves the loom.card to a different place inside loom.band.` |
| `into a node this tree does not have (n_x)` | `Would add a loom.card, but the part it would go inside isn't on this page any more.` |
| `delete n_gone` · `this tree has no such node` | `Would delete n_gone, but that part isn't on this page any more.` |
| `not in this tree` (a badge, alone) | `Not on this page` + *This change names a part of the page that isn't there any more, so Loom cannot carry it out.* |
| `changes nothing` (a badge, alone) | `No change` + *This step writes what is already there, so that part of the page would stay as it is.* |
| `loom.page › loom.card` (a bare breadcrumb) | `Inside loom.page › loom.card` |
| `its words: “…”` | `The words it adds: “…”` / `The words it takes away: “…”` |
| **`The tree has moved on: judged against revision 4, now at 7.`** | **`This was worked out on an older version of this page.`** + *The page has been changed 3 times since Loom weighed this up, so it will not be applied as it stands. Turn it down and ask again.* |
| `This would not apply.` + the runtime's error verbatim | `This would not work on the page as it stands.` + *Something the change refers to has moved or gone since it was written. Turn it down and ask again.* (error kept in the record) |
| `not set` / `cleared` | `nothing set` / `taken away` |
| `Every operation writes what is already there — applying this leaves the page as it is.` | `Every part of this writes what is already there — saying yes would leave the page exactly as it is.` |
| `1 of 2 operations write what is already there.` | `1 of these 2 steps writes what is already there.` |
| *(nothing)* | `judged against revision 6 · this page is at revision 6`, in the record, whether or not it is the problem |
| `Changes here won't be kept.` — about accepted changes | the same, `— and a change waiting for your answer can disappear before you get to it.` |

**Names stay on the surface.** `loom.card`, `n_gone`, `loom.band`, `revision 4`
are all still in front of the reader, on the 22 August reasoning: a plain
sentence describes a *class* of thing, and what tells two steps apart is the
name.

### Where the words live

`_lib/effect-view.ts` is new and is the review queue's assembly module, the
counterpart to History's `revision-view` and Activity's `episode-view`. It
decides nothing and computes nothing: every fact comes from `ProposalEffect`,
and the technical reading it replaces travels on the same object so the
disclosure shows it unaltered.

`_lib/proposal-effect.ts` gained four fields and no behaviour. `into`, `before`
and `from` are the pieces its own `detail` string composes — a plain sentence
cannot be built from `into loom.band, before loom.heading` without parsing it
back apart, so the pieces are named and `detail` stays exactly as it was for the
record. `op` carries the delta model's own name beside the display verb, because
**a plain reading has to be chosen by what an operation is**, and switching on
the display verb would make rewording that verb silently change the sentence.

Every reading is a `PlainLine` and every test of one calls `readingOf` and
`toBe` — the 24 August lesson, applied rather than restated.

## Two defects the screenshots found, and fifty-six tests did not

Consistent with every run since 20 August; the count is now **eleven across seven
runs**.

1. **`the change was judged against revision 0; this page is at revision 1`
   printed directly above `judged against revision 0 · this page is at revision
   1`.** One fact, twice, in two near-identical sentences — the sin the surface
   is tested against, reappearing inside the disclosure where no test was
   looking. Worse than duplication: to make room for the restatement, the
   obstacle's technical half had **replaced** `describeTreeError`'s own sentence,
   so for a stale proposal the one string a disclosure exists to carry was the
   one string it dropped. The runtime's sentence is now the technical half in
   both cases, and the portal's revision pair is printed once, beneath it.
   Only visible with every disclosure open, which is why that screenshot is taken.
2. **`and the 1 piece inside it` / `It brings 1 more piece with it` /
   `1 of these 2 steps write`.** Correct, and all three read as a machine filling
   a slot. One is spelled out where it falls mid-clause, and the verb agrees.

Neither was findable by a test that renders a component, and both are wording
rather than logic — which is precisely the class this lane keeps shipping and
photographing.

## What the screenshot found that was not mine

The scaffolding's first appended revision set `tone: "default"` on a
`loom.prose`, and the preview said *"One part of this page didn't draw."* The
renderer's own sentence, one click down, was:

> `node n_seed4 does not satisfy the props declared by "loom.prose" … tone: Invalid enum value. Expected 'normal' | 'muted', received 'default'`

`src/primitives/loom.prose.ts` declares `default | muted`. The portal declares
`normal | muted` — because **the portal registers four local primitives of its
own** (`loom.page`, `loom.card`, `loom.heading`, `loom.prose`) and not the
starter library. That is deliberate and long-standing (0018: the portal registers
through the public SDK like any host), so it is **not a defect and I changed
nothing**. It is filed as a question, because what it means is that the surface
where changes are reviewed previews pages built from four primitives while the
library the product ships has sixty.

The preview's failure sentence, incidentally, did its job perfectly: it named the
node, the primitive, the prop and the two values, and the page around it still
drew. That is the behaviour 0028's reasoning asks for and it is worth recording
that it held.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** From the first screenshot, unaided: *Two changes are waiting for me. The
first adds a line of text at the end of the card and also sets the card's outline
to what it already is, so that half does nothing — Loom stopped because the AI
wasn't sure enough. The second deletes the standfirst and shrinks the title, but
it was worked out on an older version of this page, so it won't go through as it
stands and I should turn it down and ask again.*

Where it stops, correctly: `loom.card`, `loom.prose`, `t_seed1` — names.

## What this tells a developer that they could not get elsewhere

**That a change is waiting for them, what it would replace, and whether the page
has moved underneath it since.**

A held proposal is the one artefact in this system that **exists nowhere else by
construction**. It is not in the repository, because the change has not happened.
It is not in the log, because 0016 makes the log the record of what was
*accepted* and a hold is precisely what was not. It is not in the build output
and `git log` has never seen one. It lives in the hold store and this screen is
the only thing that reads it.

And the *"what would it replace"* half is only answerable here: a delta carries
the forward side of a change and the tree carries what is there now, so
`variant: "outlined" → "outlined", already this` is a fact that neither the delta
nor the page contains, and that only the two read side by side produce.

**Which is exactly why the first half of this run matters more than its size.**
All of that was true of a queue that, on the maintainer's own deployment, could
never contain anything. The best answer this lane has to *what does the portal
tell you that nothing else can* was, in production, structurally empty.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 108 | 1695 (untouched by this diff) |
| `@loom/app` | 133 | 1937 |

**56 net new tests**, in five files, one of them new. Each count is the file's
own, measured against `origin/main`:

- `_lib/effect-view.test.ts` — **40, new file.** Every operation as a joined
  reading, both ends of a move, a reorder that is not a move, a missing
  destination told apart from a missing part, clearing given its own verb, the
  stale count and the fallback when the runtime named no obstacle, and two
  properties: **every reading ends in a full stop**, and **no reading contains a
  word from the delta model**.
- `_lib/proposal-effect.test.ts` — **6 new (18 → 24).** The structured pieces a
  sentence is built from, asserted against a real tree rather than a fixture that
  could agree with the view module and disagree with the page.
- `_components/proposal-effect.test.tsx` — **5 new (11 → 16), rewritten.** Every
  assertion about the plain-language rule now reads the surface and the record
  **separately** — a closed `<details>` is still in the DOM, deliberately, so
  `textContent` cannot tell "unasked" from "one click down" and every previous
  assertion of this kind was weaker than it looked.
- `_lib/write.test.ts` — **3 new (2 → 5).** Which store holds a hold, stubbing
  both Postgres constructors rather than spying — a spy is taken on one module
  instance and `resetModules` hands the next import a different one, so the spy
  watches a copy nobody calls and the test passes for the wrong reason.
- `portal/pages/[treeId]/_components/held-proposal.test.tsx` — **2 new (7 → 9).**
  The effect arrives before the two buttons; both disclosures are named and
  neither is open.

The ones that earn their place are the surface-versus-record split, the
no-delta-words property, and the hold-store stub.

## What I did not do

- **`src/` is untouched.** Everything used is public: `postgresHoldStore`,
  `HoldStore`, `applyDelta`, `nodeLabel`, `describeTreeError`.
- **No decision record.** Choosing a backend is a deployment decision the surface
  owns and 0088 says so; how a portal screen words itself is a portal decision.
- **`HoldStore` has no listing across trees**, only `forTree`. `/portal/pages`
  therefore reads holds once per listed page. That is a bounded read on a bounded
  list and it is the same trade 0041 made for attribution — noted, not filed.
- **A hold that has gone stale is still offered with live buttons.** The card
  says so plainly now and re-runs the Gate server-side, which is 0019's shape.
  Marking a stale hold in the *queue heading* would be a better screen; it is
  next, not this.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **`LOOM_SEED_LOG`, or its equivalent, is now two runs overdue.** I declined it
   on 25 August because "the screenshots are easier" is a weak reason to add a
   code path a user never asks for. Two consecutive runs have now hand-rolled the
   same scaffolding and deleted it, and this one nearly shipped an invalid prop
   into a picture. **My recommendation has changed: build it**, as a documented,
   tested, committed capability behind a flag, serving the demo and marketing
   lanes too. One word on this pull request and the next run writes it.
2. **The portal previews with four primitives and the product ships sixty.**
   Filed as a question rather than a defect. It is deliberate under 0018 and it
   may simply be right for an alpha; it is worth knowing that a reviewer's
   preview is not the deployment's renderer.
3. **Nothing blocking.**
