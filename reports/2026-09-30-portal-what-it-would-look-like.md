# 2026-09-30 — "What would this look like?"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` phase 3, the second
half: the third of its three questions.**

**Branch:** `portal-42-what-it-would-look-like` (→ `main`), cut from `main` at
`f4eca0d`. Not stacked. `main` was not pushed to.

**No open pull request of this lane's** when this was cut — the only one open in
the repository is `Loom lessons`' #456 — so `docs/routines.md` step 3's *push
onto the branch you already have open* did not apply. **No maintainer comments to
address**, on any pull request.

It is the unit the 29 September report recommended, in that report's words:
*"phase 3's other half next — what it would look like with this proposal applied,
on the review queue."*

---

## What shipped

A screen for **one held change**, at `/portal/pages/[treeId]/proposed/[proposalId]`,
headed *What would this look like?*

It draws the page twice — as it is now, and as it would be if the reviewer said
yes — and outlines, on both, the parts the change is about. Underneath it is the
queue card that was already there, unchanged, with its two buttons.

| | |
| --- | --- |
| `_lib/proposed-view.ts` | new — the page the change would produce, the marks, the key, and the sentence about what cannot be marked |
| `proposed/[proposalId]/page.tsx` | new — the screen, and its four states |
| `…/_components/marked-page.tsx` | new — puts the outlines on a drawn page, the way selection already does |
| `…/_components/drawn-page.tsx` | new — one picture, under a line saying which of the two it is |
| `…/_components/mark-legend.tsx` | new — what each colour means, counted from the change |
| `_components/held-proposal.tsx` | an optional link to the pictures, between what the change does and the buttons |
| `_components/waiting-card.tsx` | the front door's queue now leads here, with the page kept beside it |
| `_lib/waiting.ts` | a second address per row: the page, and this change |
| `globals.css` | three tokens and four rules, all of them the disposition inks already in the file |

---

## Visuals

**These are photographs of the application, signed in, with changes that were
really asked for.** A production build (the one `pnpm verify` produced), served
by `next start`, driven by a browser through the portal's own screens. Nothing
was seeded, no fixture was rendered, and no component was drawn outside Next —
which is the difference between this report and the last one, and the reason is
the first finding below.

| | |
| --- | --- |
| [**the screen**, wide](2026-09-30-portal-what-it-would-look-like-wide.png) | `1280×900@2x`, full page, `scrollWidth 1280 / innerWidth 1280` |
| [**the screen**, on a phone](2026-09-30-portal-what-it-would-look-like-phone.png) | `390×844@2x`, full page, `scrollWidth 390 / innerWidth 390` |
| [**a change to the page's words**](2026-09-30-portal-what-it-would-look-like-words-wide.png) | the case where there is nothing to outline, and the screen says so |
| [**the queue card**, on the page screen](2026-09-30-portal-what-it-would-look-like-queue-wide.png) | *See what it would look like →*, between the account and the buttons |
| [**the front door**](2026-09-30-portal-what-it-would-look-like-front-door-wide.png) | the waiting queue, now leading here |

The change in the first two is a real one: somebody typed *"the bottom of the
page feels like it's missing something — add whatever you think belongs there, I
don't really mind what"*, the model wrote a card, the Gate held it because the
model was not sure enough, and the second picture is that card on the page with a
green ring round it.

The third is the one worth looking at second. It is a change to a sentence, the
key says *taken away · one part* and *new · one part*, and **nothing on either
picture is outlined** — because the writing inside a part has no element of its
own to put a ring on. The line under the key says exactly that. Without it the
key would be a promise the picture does not keep.

---

## The decisions worth reading

### It applies the whole change or draws nothing

`applyDelta` refuses a change whose base version is not the page's, and refuses
one whose steps do not all land. Both refusals are kept exactly as they arrive,
and this is the load-bearing decision: `applyOperation` is published too, so the
page *could* have been built by walking the steps that work and skipping the rest.

It must not be. A change is applied whole or not at all (0001), so a page
assembled that way is one nobody will ever be served under either answer — the
same thing the progression is forbidden from drawing between two versions, for
the same reason. A change that would be refused gets **no second picture**, and
the screen says why in the words `plainObstacle` already gives the queue card.

### The marks are `addressNode`'s answer, not this module's

What a reviewer needs after two pictures is *where to look*. A page has forty
parts and a change touches two, and no eye finds two changed words in a
paragraph — which is the failure this whole screen is about, arriving one floor
down.

A mark is one attribute beside the `data-loom-node` the runtime already put on
the element (0010: edit mode decorates and never invents DOM), set by the same
clear-then-set effect `preview-surface.tsx` uses for selection. What decides
whether it can be set at all is `addressNode`, with this deployment's own audit of
its primitives — the published function that already answers *can a click land
here*. Two kinds of part reach the page with no element: the writing inside one,
and a primitive that ignores `loom.editable` (0012). Only the host's registry
knows about the second, which is why the lookup is handed in rather than assumed.

**`delegated` is refused along with `unaddressable`, and that is the half worth
arguing.** `addressNode` will offer the nearest decorated ancestor, which is
exactly right for a click — a reader pointing at a word means the paragraph. It
is exactly wrong for a mark: ringing the card because its heading's words are
changing says *the card is changing*. A ring in the wrong place is worse than no
ring, because it is believed.

### The key counts the change, and says what it cannot show

Each row of the key says how many parts wear that colour, counted from the
change's own steps rather than from what got outlined. Counting the marks that
landed would produce a key that quietly agrees with whatever the picture managed,
which is the one thing a key must not do.

Which is why the sentence beside it exists. It was found by looking at a
screenshot — a key reading *taken away · one part* over a picture with nothing on
it — and it is not an edge case: a change to a page's words is the commonest
change there is.

### Stacked, not side by side

A before and an after want to be two columns, and here they must not be.
`page-thumbnail.tsx` settled why one floor down: the primitives are responsive
(0106 — a band asks its own container how wide it is), so a page drawn into half
a pane draws the **narrow** layout. Two columns would put a reviewer's tablet
layout beside their tablet layout and label the pair *your page*, on the one
screen in the portal where somebody approves a change to it by eye. The
thumbnail's way out — draw at 1280 and scale — is right for a card in a grid and
wrong here, because this picture is the evidence and shrinking evidence to 45% is
how a changed heading becomes four grey pixels.

What makes stacking affordable is the marks. The reason a before and an after
want to be adjacent is that the reader has to find the difference themselves;
when the difference is ringed on both, the eye goes to it directly.

### The buttons are on this screen, and that reverses an argument on purpose

`waiting-card.tsx` says, correctly, that a card which cannot show you the change
should hand you somewhere that can rather than carry the answer itself — *"answering
a change from a screen that cannot show you the change is exactly the sort of
quick approval this whole surface exists to prevent"* (0019).

That argument inverts here. This is the one screen in the portal that **can** show
a reviewer the change, so it is the one screen where pressing yes is an informed
act, and sending them back to a third screen to press it would mean the decision
is always made somewhere other than where the evidence was. It is the existing
card that carries them — same component, same two server actions, same
re-judgement on confirm (0021) — so nothing about answering a proposal is
reimplemented. What this screen adds is above it.

### Both pictures are drawn with one set of options

The page screen renders with a resolver and a validator and nothing else — no
data sources, no themes, no frame origins — so a band that reads a data source
draws empty there. The second picture takes the same object, and a reading-order
test pins that there is only one of it: two call sites with their own options is
how a before and an after come to differ for a reason that has nothing to do with
the change being reviewed.

---

## Plain language: what was named, and what moved behind a disclosure

The high-schooler test, applied to this screen: *what happened* — somebody asked
for something, Loom was not sure, and here is your page with and without it.
*What do I do next* — look at the two pictures, then press one of the two buttons
underneath.

| named | rather than |
| --- | --- |
| **What would this look like?** (route `…/proposed/…`) | anything with *preview*, *diff* or *apply* in it |
| *Your page now* · *If you say yes* | before / after |
| *Exactly what your readers are being served at this moment.* | head |
| *Nobody has been served this. It exists only because you are looking at it.* | a projected tree |
| *What to look for* | a legend |
| *Taken away* · *New* · *Changed* · *Moved* | `remove` · `insert` · `configure` · `move` |
| *one part* · *4 parts* | a node count |
| *One of these is writing inside a part rather than a part of its own* | a text node is unaddressable |
| *This one has already been answered.* | a 404 |

Behind a disclosure, and nothing dropped: which of the four operations each
colour stands for, with its count (`remove ×1`); the runtime's own account of why
a change cannot be drawn; and everything the queue card already kept there — the
policy, the rule code, the confidence as a number, the change record step by step.

---

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What their page would look like if they said yes — which does not exist
anywhere, even in principle.**

The page as it looked three changes ago at least *happened*; nobody could look at
it, but it was real. This one has never happened and only will if the person
reading the screen presses a button. There is no branch of it, no build of it, no
preview deployment, no file to check out. The only account of it in existence is a
held change's forward steps, and the only way to see it is to apply them to the
page and draw the result.

And the sharper half: **a sentence and a picture are not the same evidence.**
*"Deletes the card “Prices” n_h, and the 12 pieces inside it"* is exactly true and
cannot tell a reviewer that the band above it then has a heading and nothing under
it. Every review tool in existence can show a diff of what an AI wrote. None of
them can show the page.

---

## Tests

`pnpm verify` **green, exit 0**, read from a file written by the last command on
its own line, on a `dist` and a `.next` deleted first — `docs/routines.md`'s rule,
and the compound-command trap it names is why nothing follows the gate on that
line.

| | `main` at `f4eca0d` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 169 files / 3,327 tests | **169 / 3,327** — untouched |
| `@loom/app` | 339 / 5,879 | **344 / 5,936** |
| findings ledger | 898 entries, 0 malformed | **900**, 0 malformed |
| prerender | not measured | **119 pages, 1,385 junctions**, 0 run together; 3 metadata conventions, 0 unserved |

**+57 tests in five new files and four existing ones, none weakened, skipped or
deleted.** `git diff origin/main -- src/ tools/` is empty, so the framework figure
is `main`'s by construction. The `main` app figure was measured on this branch
before any test file existed and matches the arithmetic.

The new route is under the portal's `force-dynamic` segment, so it is served per
request and contributes no prerendered page — which the count is consistent with
and does not prove.

Where they went:

- `_lib/proposed-view.test.ts` — **27, new.** The page the change produces,
  asserted as *a different page* rather than as a field on an object; a mark per
  kind on the right side of the pair; the strongest mark winning when one change
  does two things to one part; **a change with one bad step never coming back as a
  page with the good step applied**, measured by looking at the tree rather than at
  the tag; no ring on writing; no ring on a part this deployment draws nothing to
  point at; and no ring moved up to the containing part.
- `…/_components/marked-page.test.tsx` — **6, new.** Including the one a test
  written after the fact can see and a smoke test cannot: a reviewer walking from
  one change to the next re-renders rather than remounts, so a mark has to come
  *off* a part the next change is not about.
- `…/_components/mark-legend.test.tsx` — **7, new.** The swatch proved to be drawn
  by the declaration it is a key to, rather than by a colour picked in the
  component — a hand-picked border would go on saying green after the rule had
  changed, which is a key contradicting a picture on the same screen.
- `…/_components/drawn-page.test.tsx` — **3, new.**
- `…/reading-order.test.ts` — **8, new.** Look, then read, then decide, as
  positions: the key before the pictures, now before yes, both pictures before the
  buttons, and no link offered to the screen the reader is on.
- `_lib/waiting.test.ts` **+1**, `_components/waiting-card.test.tsx` **+2**,
  `…/_components/held-proposal.test.tsx` **+2**, `_lib/proposed-view` covering
  `proposedHref`.

### `pnpm verify` was red once, on typecheck, and the exit file is why I know

`EXIT=2` in the file, from one `TS2375` in a test file: `apps/loom` typechecks
with `exactOptionalPropertyTypes`, under which *absent* and *present and
undefined* are different types — and `pictureHref` carries exactly that
distinction, so the helper had to spread the prop the way a caller does rather
than pass `undefined`. Fixed and re-run from a deleted `dist` and `.next`; the
numbers above are that second run. The earlier targeted `tsc --noEmit` had passed
because the test file did not exist yet, which is the same order of events the
29 September report recorded.

---

## How the pictures were taken, which is itself a result

The 29 September report filed that **the deployed portal has nothing to show**:
one page, no history, no waiting change, so six of seven screens are empty by
construction. It recommended a one-off pass through the real write path, and
nobody had tried it.

This run tried it, locally, because otherwise this screen could not be
photographed at all. A production build, served; a browser signing in as a
reviewer and typing sentences into the box that is already on the page screen.
Five sentences: one change applied on its own, **two held**, two declined
outright. Nine minutes, five model calls, and every field a reviewer is taught to
rely on is true of all three, because all three really happened.

The full measurement is the first finding. The short version: the 29 September
recommendation works, and it costs about a cup of coffee's worth of tokens.

**One thing about it has to be said rather than buried.** The sentences were
deliberately vague — *"maybe it should feel warmer, or maybe shorter"* — and that
is the mechanism, not a trick. This deployment lets a `user-instruction` apply on
its own up to `medium` stakes and nothing in the seed page can reach `high`, so
the only lever that produces a **held** change is the model's own confidence
falling under 0.7. Asking for something a person would genuinely be unsure about
is the honest way to lower it.

---

## Findings

**Filed two, closed none.**

1. **The portal's record screens can be filled with a record that is entirely
   true**, and it took nine minutes and five model calls to prove it. It does not
   close 29 September's entry — that one is about the *deployment* — but it
   removes the uncertainty from its recommendation, with the numbers.
2. **A change weighed against an older version cannot be drawn at all, and the
   version it was weighed against is sitting in the record.** `progression.ts`
   already folds a page to any version its record can reach. The unbuilt screen is
   three pictures — *what it would have done to version 3, and your page now at
   version 5* — and it is filed rather than built because it is a decision about
   what a picture is allowed to claim: a stale change is going to be turned down,
   and a picture answering *what would this have done* looks exactly like an
   answer to *what would this do*.

---

## What I did not do

**No decision record.** `docs/portal.md` phase 3 is approved and nothing here
contradicts an `Accepted` record. Nothing on this screen is a lever, nothing
measures anything, and nothing moves a part by hand — so 0199 and 0200, both
`Proposed`, are untouched and unneeded.

**I did not touch `src/`**, and found no framework gap. `applyDelta`,
`renderLoomTree`, `addressNode` and `LOOM_NODE_ATTRIBUTE` were all already
published on entry points a host may reach (0018), which is the fourth
consecutive phase of this plan where the answer was assembly.

**I did not edit another surface's route group.** Nothing outside
`apps/loom/app/(portal)/`, `FINDINGS.md` and `reports/` is in the diff.

**I did not widen the portal into a design tool** (0019). This screen has no way
to ask for anything and its reading-order test pins that: no prompt box, no
outline, no picked parts. It shows one change and answers it.

**I did not add it to the strip** of views every scoped screen carries. The strip
is a set of questions about a *page*; this is a question about one change, and
there is no address for it without a change to name.

**I did not leave the scripts** that drove the browser. They were in the scratch
directory; `git status` is clean of them.

**Nothing is scheduled and no pull request is subscribed to.**

---

## Recommendations

1. **The deployment's record, for real.** Finding 1 makes 29 September's option 2
   a measured cost rather than a guess. It is still yours — it is a write to
   production data — but it is now a nine-minute job, and it is the difference
   between a portal whose best screens can be seen and one whose best screens are
   described.
2. **Phase 4 next for this lane** — analytics surfaced, which is the last approved
   phase that does not wait on `Loom daily build`.
3. **`completed`, for `Loom daily build`** — signals step 2, approved 13
   September, still unbuilt, still the difference between measuring attention and
   measuring outcome. Fifth report in a row to say so.
