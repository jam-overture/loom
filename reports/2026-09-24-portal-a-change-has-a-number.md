# 2026-09-24 — "A change has a number, and the number has a name"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-36-a-change-has-a-number` (→ `main`), cut from `main` at
`5899324`. Not stacked. The only open pull request in the repository when this
run started was **#380**, which is `Loom daily build`'s, so there were no
maintainer comments on this lane's work to address and nothing of this lane's to
push onto.

Visuals — a production build of this commit, in a signed-in browser, taken with
**`pnpm shoot`**. The links are relative and resolve in the repository; the pull
request links to the same files on `github.com` rather than embedding them, for
the reason the 22 September finding gives.

| | |
| --- | --- |
| [What's changed, with three changes in it](2026-09-24-portal-a-change-has-a-number-history-wide.png) | 1280px, full page — *Version 3*, *Version 2*, *Version 1* |
| [The same rows, one click down](2026-09-24-portal-a-change-has-a-number-record-open.png) | 1280px — the record open, reading `in the record  revision 3` |
| [The same screen on a phone](2026-09-24-portal-a-change-has-a-number-history-phone.png) | 390px |
| [A number this page has not reached](2026-09-24-portal-a-change-has-a-number-missed-wide.png) | 1280px — *"Version 900 isn't among the changes shown here"* |

**What is staged, and what is real.** `pnpm shoot` does not start your
application, and a healthy deployment of this portal is seeded with one page at
version 0 — so the screen this run is about is empty on every fresh boot. A
preload on `NODE_OPTIONS --import` builds a `memoryTreeStore()`, appends three
revisions through the store's own `append`, and puts it on
`globalThis[Symbol.for("loom.portal.store")]` before the route modules evaluate.
**Everything above the staging is real**: the rows, the plain sentences, the
undo plans and the record behind each disclosure are what this branch ships,
rendered by a production `next build` of this commit. The preload was deleted
before this report was written and nothing from it is in the diff. This is the
**seventh** consecutive run to rebuild it from a report; see *Findings*.

---

## What was asked

`FINDINGS.md` held nothing owned by this lane that outranked the standing
redirection, so this run took the redirection itself — the 18 August one, whose
rule 2 is the part that had never been done properly:

> **Every state gets a plain-language name** … Make that translation the
> default everywhere, **in one place, not per component.**

The portal has had a plain-language rule since 11 September. What it has not had
is a *default*. On `main` this morning it was **45 assertions across 16 test
files**, each one written by somebody who remembered to write it.

## The defect

### `revision` was the runtime's word, and it was the heading of every row

`_test/plain-language.ts` lists the runtime vocabulary a screen must not use
unasked. `revision` is on that list. It was also:

- the `<h3>` of **every row** on `/portal/history` — `Revision 4`, in monospace,
  above the plain sentences rather than below them;
- the text of **every `RevisionLink`**, which four screens use — the page
  preview, a node's attribution, `/portal/activity` and `/portal/checkup`;
- the label on the box you type a number into — *Jump to revision*;
- four sentences on `/portal/readers`, two more in `reversal.ts` and
  `reversal-note.tsx`, and the empty state on `/portal/history` itself.

So the rule had to be **suspended wherever it was actually tested**. Two test
files carried `runtimeWordsIn(said, ["revision"])`, and the comment on one of
them said out loud why:

> *`revision` is exempted at the point of use rather than removed from the list.
> It is the portal's own word on every other screen … a blanket ban would have
> this rule enforcing an inconsistency.*

That is right about the inconsistency and wrong about which side to resolve it
on, and the evidence was one screen away.

### The portal had already chosen a plain word, and was using it a screen away

`plainObstacle` tells a reviewer **"This was worked out on an older version of
this page"**. `standingNote`'s own commentary calls the number *"the version"*
four times in the paragraph directly above the line that printed `revision` at
the reader. The word existed, it was right, and nothing had adopted it.

## What shipped

| | |
| --- | --- |
| `_lib/version.ts` | **new** — `versionMention`, `versionHeading`, `versionOnTheRecord`. One place, three forms |
| `_lib/version.test.ts` | **new** — both surface forms read plainly, the third deliberately does not |
| `revision-row.tsx` | the heading is `Version 4`; `in the record  revision 4` joins the disclosure |
| `revision-link.tsx` | `version 12`. The href, the fragment and the row it lands on are untouched |
| `revision-box.tsx` | *Jump to a version* |
| `history/page.tsx` | the empty state says *version 0* |
| `_lib/history-link.ts` | all four anchor-miss sentences |
| `_lib/reading-view.ts` | the four `/portal/readers` sentences |
| `_lib/reversal.ts`, `reversal-note.tsx` | *"only goes back as far as version 5"*, *"wipe out what version 4 did"* |
| `since-the-change.tsx`, `page-reading.tsx` | three comparison leads, and one *folded* that was ordinary English and still on the list |
| `trust/page.tsx` | *"reads the log"* → *"reads the record of everything the AI has proposed"* |
| `_test/surface-text.ts` | **new** — what a screen shows unasked, pulled out with the TypeScript parser |
| `every-screen.test.ts` | **the governing principle, over the whole lane** |
| `_test/plain-language.ts`, two test files | the `revision` exemption is **deleted**, both copies |

### The number never left the surface

A version number is **identity**, not technical detail — the 22 August rule —
and it travels: it is in a URL, in a node's attribution, in a report, in a
message from whoever asked for the change. Somebody holding one has to be able
to match it against what a screen shows them. What changed is the word in front
of it, and nothing else: `/portal/history?tree=t_seed1&at=4#revision-4` is
byte-for-byte the link it was yesterday, so every link anyone has ever been sent
still lands on the row it always did.

And `revision 4` is still on that row. It is in the disclosure, under
**`in the record`**, beside the four other things a reader checking the portal's
wording against the log needs — which is the second screenshot, and is the whole
of what *"the technical record is one click away"* means.

## The half that makes it a unit: the rule is mechanical now

`every-screen.test.ts` exists because *a guard somebody has to remember to write
guards the screens somebody remembered*. It already enforces one name per screen,
reading order and disclosure altitude over the whole lane. It did **not** enforce
the governing principle, which is the rule the other three are downstream of.

It does now, and it earned its place immediately: **four leaks in files nobody
had written a plain-language test for.** `reversal-note.tsx` said *"wipe out what
revision 4 did"*; `reversal.ts` said *"only goes back as far as revision 5"*; the
history empty state said *revision 0*; `/portal/trust`'s failure notice said it
*"reads the log"*. Then, once it ran, **four more** this run's own hand-written
sweeps had missed — three on `/portal/readers` and a *folded away* on
`page-reading.tsx`.

### Why it parses instead of grepping, measured in both directions

The obvious version of this guard is a regex over the file. This run wrote that
first and it fails at both ends:

- **It reports leaks that are not there.** `>([^<>{}]+)<` matches the inside of
  `ReadonlyMap<string, number>` and every `=>`, so `readonly revisions:
  ReadonlyMap` came back as a sentence a reader is shown.
- **It misses leaks that are.** A sentence broken across an expression —
  `wipe out what revision{n === 1 ? " " : "s "}` — is not one text run.
  `reversal-note.tsx` had been saying *revision* on the surface through every
  sweep ever run over this lane, including the two this run wrote before it gave
  up and reached for a parser.

A `JsxText` node is a text node whatever an expression does on either side of
it, and a type argument is not one. `_test/surface-text.ts` walks the TypeScript
AST, skips the whole `<TechnicalDetail>` subtree — the record is *supposed* to
say `revision` and `delta` and `fold` — and reads the four attributes that carry
prose. It is guarded from both ends: the sweep has to find more than 200
sentences, has to contain *Jump to a version*, and has to **not** contain *What
the record says*.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

Unchanged from what `/portal/history` has always been for, and this run is about
whether a person can read it:

- **What a change replaced, and exactly what undoing it would put back.** The
  page as it stands keeps no record of what it was; `git log` holds the source
  that produced the deployment and has never seen a delta the model proposed at
  runtime. The inverse is computed from the log and shown before you press
  anything — *"Puts the prose … back inside n_seed10"* — and nothing else in the
  ecosystem has a concept of it.
- **Who asked, how sure the AI was, and which of those two facts the record can
  honestly carry.** `dana asked for this. The AI says it is fairly sure.`
  is on the surface; `confidence 0.78`, the interpreter and the proposal id are
  one click down.
- **And now: without having read a decision record first.** That is this run's
  contribution and it is not a small one. A record nobody can read is not an
  advantage over `git log`; it is `git log` with extra steps.

## The high-schooler test

Applied to `/portal/history` in three states — populated, empty, and asked for a
number it does not hold — and to every screen the link appears on.

- **"Version 3 · Deleted the prose "This page is a stored tree…" · dana asked
  for this · Undo this change."** Passes. A bright high schooler can say what
  happened, who did it, and what the button does.
- **"Version 900 isn't among the changes shown here — this page has only got as
  far as version 3."** Passes, and it is the sentence doing the most work: it
  says what went wrong *and* the fact that answers it.
- **"Jump to a version. A whole number from 1 up. Leave it empty for the newest
  changes."** Passes.
- **"It is exactly as it was created — version 0."** Passes.
- **The disclosure** is the one place the runtime appears: `in the record
  revision 3`, `operations delete`, `delete n_seed4 and everything under it`.
  Exactly one click, never further.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| `Revision 4` — the heading of every row on `/portal/history` | **`Version 4`**, with `in the record  revision 4` added to the disclosure beneath it |
| `revision 12` — every cross-screen link, on four screens | **`version 12`**. Same href, same fragment, same row |
| `Jump to revision` | **`Jump to a version`** |
| `Revision 900 isn't among the changes shown here` | **`Version 900 …`**, and the three sentences beside it |
| `nothing has been counted for revision 3 yet` (`/portal/readers`) | **`… for version 3 yet`**, and three more on that screen |
| `Revision 2 against revision 1, part by part` | **`Version 2 against version 1, part by part`** |
| `wipe out what revision 4 did` | **`wipe out what version 4 did`** |
| `only goes back as far as revision 5` | **`… as far as version 5`** |
| `Something people want is folded away in there` | **`… tucked away in there`** — ordinary English, and still a word on the list |
| `this reads the log of what the AI has proposed` (`/portal/trust`) | **`this reads the record of everything the AI has proposed`** |

## Decisions taken that were not specified

- **`version`, not `change`.** Both are true — a revision *is* one accepted
  change, and it is also the state that change produced. `change` lost because
  the portal already uses it for a proposal (*Undo this change*, *a change this
  risky*), so `Change 4` would have been two things at once; and because
  *"this page is at change 12"* is not a sentence anybody says. `version` won
  because the portal had already picked it, in `plainObstacle`, without being
  asked.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. `revision` is unchanged in the runtime, in every URL,
  in every stored field and in every API; this is a word on a screen.
- **`except` stays on `runtimeWordsIn`.** One exemption is left — `id`, on the
  unreadable-change card, where the id is what tells two otherwise identical
  sentences apart. Removing the parameter to make a point would have cost that
  screen its identity rule.

## The gate

| | |
| --- | --- |
| `pnpm verify` | **green, exit 0** |
| runtime | **3,029 passed** in 159 files |
| application | **5,849 passed** in 306 files |
| portal route group | **2,200 passed** in 113 files |
| `every-screen.test.ts` | **520 passed, up from 208** — 312 new, one case per sentence the lane shows unasked |
| `pnpm shoot` | 4 shots, exit 0, no overflow at 1280 or at 390 |

Nothing skipped, nothing weakened, nothing failed. Seventeen existing tests
asserted the old wording and were updated to the new; every one of them was a
test that had been doing its job.

## Open questions

Two, both in the pull request comment, neither blocking.
