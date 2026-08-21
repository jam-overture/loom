# The demo gets a public front door, and something to press

**Routine:** `Loom demo` · **Branch:** `demo-01-a-public-front-door` · **21 August 2026**

The first run of this routine. Two things were asked for, and both are done: the
demo is off `/portal/demo` and lives at `/demo` in `app/(demo)/`, and the worst
of what made it clunky is fixed.

---

## What a stranger could not understand before this run

I read the demo, then used it the way somebody who had never heard of Loom would.
Six things fail, and they compound:

**1. It never says what Loom is.** The rail's heading was *"ask this page to
change"*, lowercase, at 18px — set smaller than the specimen page's body copy.
The sentence under it was *"Nothing here is markup. The page is a tree of
registered primitives"*: three pieces of undefined vocabulary in the second
sentence a visitor reads.

**2. You could not tell the demo from the page it demonstrates.** Both halves
were white. The biggest words on the screen were the specimen page's own hero —
*"Your AI can change this page"* at 60px — and its primary button, filled and
blue, read **"Change this page"** and went to GitHub. A visitor doing the
obvious thing left the demonstration. The demo's actual control was a grey pill
six inches to the right, in 12px.

**3. Nothing had happened, and the empty state described a record instead of
being one.** Forty-five words naming eleven concepts — proposal, rationale,
provenance, stakes, reversibility, Gate, rule, policy, revision, undo, rewind —
before a single change had been made. Somebody who understood that sentence did
not need the demo; somebody who did not was told nothing.

**4. There was no first move.** Five identical grey pills, unranked, with no
indication of what any of them would do. Below them, the most prominent control
on the panel was a textarea that is *disabled* when no model key is configured,
over a "propose" button that was also disabled — on a deployment where every
other control worked.

**5. It wore the review tool's chrome.** A topbar reading **"loom portal ·
alpha"** and a skip link to a rail of six routes a signed-out visitor cannot
open, on the one page whose whole purpose is to be seen by somebody with no
account.

**6. On a phone it was unusable as a demo.** The stage stacked above the rail, so
a mobile visitor met a full-length marketing page, scrolled it to the end, and
never found out there was anything to press.

## What a stranger can understand now

They arrive at `/demo`, on a dark instrument beside a light page, and read:
**"Ask this page to change itself."** Under it, one sentence with no vocabulary
in it, then one green button — *Re-theme the whole page* — with the promise
underneath: *every colour and typeface on the page changes at once.* They press
it. The whole page turns over, the revision counter in the bar ticks to 1, and a
card appears saying **Applied — this change is live on the page beside you.
"Put it back" undoes it.**

If instead they press *Remove the stats*, they get the more interesting half:
**Waiting on you — Loom will not make this change until you say yes**, with the
rule's own sentence (*riskier than a request from here is allowed to be without
asking*), what it would change, and two buttons. Every one of those steps is on
one laptop screen, without scrolling.

Then *Show the full record* opens, and the whole account is there: the
interpreter, who authored it and how sure it was, the delta, both axes the Gate
weighed with their factors, the inverse operations, the decision, the rule code,
the policy and its fingerprint. **Nothing was removed to make the surface land.**

## The changes, in order of how much they move that

### The move, and what it cost

`app/(demo)/` is a route group with its own `layout.tsx` and `globals.css`. The
demo's own code moved wholesale with `git mv`, so every test came with it:
`_lib/demo/*` → `(demo)/_lib/`, the route and its components → `(demo)/demo/`.

`(portal)/portal/demo/page.tsx` is now a `permanentRedirect("/demo")` rather than
being deleted. Four portal links and `DEMO_PATH` in `_lib/auth/paths.ts` still
name the old path; those are the portal routine's files, so repointing them is a
finding rather than an edit, and the shim is what keeps them working meanwhile.
It renders nothing and reads nothing, so `guarded-pages.test.ts` keeps a file to
exempt and its exemption stays honest.

**One line outside my lane had to change**, and I want it visible rather than
buried: `(portal)/_lib/vocabulary.ts` imports `RecordOutcome` from what used to
be `./demo/record`. Type-only, and it is the one edit a move of this shape cannot
avoid. It is filed for the portal routine with the reasoning.

The half of the move a type checker cannot see is the **cookie path**.
`visitor.ts` scoped the visitor cookie to `/portal/demo`; a cookie still scoped
there is sent on no request the demo makes, so every visitor would be minted a
fresh session on every action and no change would ever appear to stick. It is
now `DEMO_PATH`, declared once and read by the cookie, by every
`revalidatePath`, and by the redirect.

### Dark rail, light stage

The layout decision, and it is load bearing rather than taste. `(demo)/globals.css`
defines the **same semantic token names** the portal uses — `surface-base`,
`ink-muted`, `affirm`, the five outcome tints — with dark values, so the two
components the demo borrows from the portal invert cleanly with no edit. The
stage keeps `--surface-stage: #ffffff` and its own stacking context, because the
tree carries its own theme on its root node (0050) and a visitor can re-theme it
with one click.

`globals.test.ts` pins what can be pinned to the registry — the stage's white is
`minimal`'s `bg-canvas`, the accent is its `brand-secondary`, the ink on a filled
button is its `fg-default` — and computes **WCAG contrast** for every ink against
both grounds and for all five outcome tints. That check is new: the portal never
needed it, because black on white passes whatever you do to it, and a dark
palette compressed into the bottom third of the range is exactly where "it looked
fine on my screen" is least trustworthy.

### One primary action, and what it will do

`AskPanel` replaces `AskBox`. One green button for the re-theme — chosen because
it is the only preset visible everywhere at once, so it answers *did something
happen?* from across a room. The other four are secondary, each carrying a new
`promise` field from `presets.ts`: one clause about what the visitor will see.

The promises are deliberately about **the page and never the verdict**. Whether
the Gate applies or holds is computed from the tree at assessment time, so a
label saying "this one will be held" would be a surface predicting a decision it
does not make, and would be wrong the first time the policy or the page moved.

Free text is now behind a disclosure. Two reasons, and the second decided it: it
is the only control a deployment can fail to provide, so it must never be what a
visitor tries first — and open, it costs about 140 vertical pixels, which is the
difference between the first record card landing on a laptop screen and landing
below the fold.

### The sequence, instead of the vocabulary list

`WhatHappens` is three numbered steps in the order a visitor is about to live
them: *you ask · Loom decides · the record appears.* It replaces the forty-five
words above, and it stays after the first change rather than disappearing,
because it is the frame the cards are read through.

Its test is the interesting one. It sweeps the rendered text for nine terms —
*proposal, provenance, rationale, delta, revision, policy, primitive, tree,
gate* — and fails if any appears. It failed three times while I was writing the
copy, on my own sentences, which is the point: none of those words is wrong, and
every one of them still appears on the surface, on a card where a change has
happened and the word has something to attach to. What must not come back is
meeting them first.

### The specimen stops competing

`page-tree.ts` is the demo's, so the hero's primary action is no longer
**"Change this page"** pointing at GitHub. It reads *Read the source*. The
specimen still needs a plausible pair of calls to action — it has to stand as a
landing page, since §4d builds the real site from the same vocabulary — they
just must not be the same call the rail is making.

### Saying one thing once

Moving the record up under the controls that produced it exposed a duplication
the old layout had hidden: the panel printed its own report, and the card printed
the same sentence, forty pixels apart. `WriteReport` gained a `recorded` flag —
about *where the answer already is*, not about success — and both banners now
show only what has no card of its own: a form the server could not parse, an
unknown preset, free text with no model or no allowance left. A hold somebody had
already answered narrates nothing to fold, so that one still has to be said by
the control the visitor used.

The same pass moved two hand-written sentences in `actions.ts` onto the shared
table via a new `stateReport`. "You said no" was being maintained in two files
that had no way of knowing about each other.

### Phone

The rail comes first in the document and moves to the right on a wide screen,
rather than the other way round — so reading order is *what this is, what to
press, the page it acts on*, which is what a screen reader wants too. A
`lg:hidden` line says **"It's the page below. Press something, then scroll
down."**, because "the page beside you" is only true on a laptop.

## Decisions taken that were not specified

- **No decision record this run.** The move is already recorded in
  `docs/routines.md`, and the dark-rail/light-stage split is a surface decision
  rather than one that would be expensive to reverse or that defines what Loom
  is. Nothing here touches the tree schema, the delta model or an Accepted
  record, so nothing was escalated and nothing was left out for review.
- **Import the portal's vocabulary rather than fork it**, and override exactly
  one sentence. Filed as a finding with three ways to settle it properly; I took
  the status quo silently because a routine choosing between the other two on its
  own is how two conventions get invented.
- **A redirect rather than a deletion** at `/portal/demo`, so no other lane has
  to be edited and nothing breaks while the portal repoints at its own pace.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 101 | 1489 |
| `@loom/app` | 90 | 1103 |

Nothing failed, nothing was skipped, and no test was weakened. The demo's own
share is **10 files, 82 tests**, of which these are new this run:

- `(demo)/globals.test.ts` — 18, including WCAG contrast for six ink/ground pairs
  and all five outcome tints
- `(demo)/_lib/report.test.ts` — 7, including the sweep that fails if any state's
  sentence names a place this surface does not have
- `(demo)/demo/_components/ask-panel.test.tsx` — 7
- `(demo)/demo/_components/what-happens.test.tsx` — 4, including the
  unearned-vocabulary sweep
- one added to `record-card.test.tsx`, asserting the plain sentence is in the
  light and the fingerprint is behind the disclosure — both, on the same card

The nine `_lib` suites that moved were preserved unedited apart from one import
path in `record-card.test.tsx` and one changed button label ("Undo this change" →
"Put it back").

## Findings

**Filed:**

- `Loom marketing` — the marketing site does not link to the demo *at all*; it
  is now at `/demo` and here is what it would want to know before linking.
- `Loom portal` — four links and `DEMO_PATH` still name `/portal/demo`; the shim
  keeps them working, and the one line of yours I had to change.
- `@jonathanbravecredit` — the demo reads three portal modules and one of them
  sends a visitor to a page they cannot open; three ways to settle where shared
  vocabulary lives.
- `@jonathanbravecredit` — `21st.dev` is still `EGRESS_BLOCKED`, and the brief
  and `docs/routines.md` both now say it is allowed, which is a different fact
  from "nobody has added it yet".
- `Loom demo` — no framework gaps; `src/` was not opened.

**Closed:** none. This routine had no queue on its first run.

## Open questions

Nothing blocking. Two worth a sentence when you next look at this:

- **Where shared vocabulary lives** is the finding above and it is genuinely
  yours to settle; the demo is running on the status quo and a test is guarding
  a portal file, which works and is the wrong shape.
- **Nothing points at what changed on the page.** After a change lands, the page
  re-renders and the visitor has to find the difference themselves. The record
  says what moved in words; the stage says nothing. That is the next unit I would
  build, and it is the last big thing between this and a demo that explains
  itself without being read.

## The visuals

| | |
| --- | --- |
| [before](2026-08-21-demo-a-public-front-door-before.png) | `/portal/demo` as it was: two white halves, portal chrome, five grey pills, the empty record's vocabulary list |
| [arrival](2026-08-21-demo-a-public-front-door-arrival.png) | `/demo`, first ten seconds — the claim, one button, what it will do |
| [held](2026-08-21-demo-a-public-front-door-held.png) | one click later: the Gate holding a change, in plain words, with both answers and what it would change — all above the fold |
| [record](2026-08-21-demo-a-public-front-door-record.png) | the disclosure open: the whole record, to the policy fingerprint |
| [phone](2026-08-21-demo-a-public-front-door-phone.png) | controls first, page below |

**To see it yourself:** open the preview at `/demo`, press the green button, then
press *Remove the stats* and read the card without opening anything.
