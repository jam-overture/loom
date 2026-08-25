# 2026-08-25 — "What undoing this would put back"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-12-what-undoing-would-put-back` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a
signed-in browser:

| | |
| --- | --- |
| [History as it arrives](2026-08-25-portal-what-undoing-would-put-back.png) | 1280px |
| [the same screen with every disclosure opened](2026-08-25-portal-what-undoing-would-put-back-open.png) | 1280px |
| [a phone](2026-08-25-portal-what-undoing-would-put-back-phone.png) | 390px |
| [the chooser, which is where the nav lands you](2026-08-25-portal-what-undoing-would-put-back-chooser.png) | 1280px |
| [a revision that is not on the page](2026-08-25-portal-what-undoing-would-put-back-miss.png) | 1280px |

**How honest these are, stated plainly.** The screen, the store, the read path
and the components are all real. The three revisions in the pictures were
**appended through the store's own `append` contract by a temporary,
uncommitted patch to `ensureSeeded`**, not composed by a model — there is no
`ANTHROPIC_API_KEY` in this run's environment, so the prompt box cannot produce a
change and `/portal/history` cannot be populated through the UI. The patch was
reverted before committing and `store.ts` is untouched in this diff. That is
weaker than 24 August, where a live model drove the pipeline, and stronger than a
component rendered against a fixture: every sentence in the pictures was produced
by the real page reading the real log.

---

## What was asked

**No maintainer comment is open on any portal pull request, and there are no open
portal pull requests.** #152 merged. The five open pull requests in the repository
belong to `Loom lessons`, `Loom docs` (two), `Loom primitives` and the framework.

So this run is the last item on the rename queue, which my own 24 August finding
named:

> **Still in the runtime's voice: `/portal/history`, and it is the last one.** The
> revision rows, `since:`, and the inverse.

**The rename queue is now empty.** Every screen in the portal leads in a person's
words, and every runtime word it used to print is one click down.

## What shipped

`/portal/history` keeps its route name — "history" is already what a person says.
What it printed was not.

### The screen now says what it is for, and it is the strongest claim in the portal

The heading was `history`, lowercase, naming the route. It is **History** over
the sentence that says why anybody would open it:

> *Every change that has actually been made to this page, newest first — and, for
> each one, what undoing it would put back. The page as it stands keeps no record
> of what it replaced; this does.*

That last clause is this screen's whole reason to exist and it had never been said
on it.

### The revision row led with five field names

`revision 4` in monospace, a raw `2026-08-09T12:00:00.000Z`, then the operations
as `reconfigure n_head title, width (cleared)`, then five monospace pairs headed
`asked by`, `allowed by`, `interpreted by`, `confidence` and `proposal`. A reader
met `interpreted by scripted` before they met the change itself.

The order is now: **what changed**, **who asked and who let it through**, **what
undoing it would put back**, the button, and then the record. All five pairs are
still on the row, behind *What the record says* — with three more beside them
(`origin`, `authored by`, `applied`) that used to be dropped, plus the delta's own
operations and the inverse the undo would apply.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `h1` `history` | `History` + *Every change that has actually been made to this page…* |
| `revision 4` + `2026-08-09T12:00:00.000Z` | `Revision 4` + `9 August 2026 at 12:00 UTC` (ISO kept in `dateTime` and in the record) |
| `delete n_gone and everything under it` | `Deleted n_gone and everything inside it.` |
| `add n_new loom.heading into n_root at 2` | `Added n_new, a loom.heading, inside n_root.` |
| `move n_a into n_b at 1` | `Moved n_a inside n_b.` |
| `reconfigure n_head title, width (cleared)` | `Changed n_head's title, and cleared its width.` |
| `asked by ana@loom.local` (a `dl` pair) | `ana@loom.local asked for this.` |
| `asked by system-signal` (origin as the fallback value) | `Your site asked for this by itself.` |
| `allowed by bob` | `bob said yes to it.` |
| `confidence 0.82` | `The AI says it is fairly sure.` |
| `confidence 1.00` on a runtime-authored delta | `Loom worked this change out from the record rather than asking a model, so there is no confidence to judge.` |
| `undoing this would` (uppercase label) | `If you undo this, Loom puts back:` |
| `restores n_card variant to “outlined”` | `Puts n_card's variant back to “outlined”.` |
| `removes n_new what this change added, and anything under it` | `Takes n_new back out again, along with anything now inside it.` |
| `moves back n_a into n_b at 1` | `Moves n_a back inside n_b, where it was.` |
| `restore nothing — this change moved nothing and set no props.` | `Nothing — this change moved nothing and set no settings, so undoing it leaves the page exactly as it is now.` |
| `It writes over what revisions 4, 6 did to nodes it touches, so a person has to confirm it.` | `Somebody will have to say yes to this one. Undoing it now would wipe out what revisions 4, 6 did to the same parts of the page, so Loom will not do it on your say-so alone.` |
| `This host cannot replay the log back to revision 2 — it reaches revision 5 at the earliest…` | `This deployment's copy of the record only goes back as far as revision 5, so it can't work out what undoing revision 2 would put back.` (code kept in the record) |
| `This change cannot be inverted (node-not-found), so it cannot be undone.` | `This one can't be undone. Loom has no way to work out what the page looked like before it.` + `uninvertible: node-not-found` one click down |
| `undo this change` | `Undo this change` |
| `go to revision` / `go`, hint `sr-only` | `Jump to revision` / `Go`, hint **visible** |
| `This tree has never been changed. It is at revision 0 — the shape it was created with…` | `Nothing has been changed on this page yet.` + *Open this page →* |
| raw `describeStoreError` under a heading | `We couldn't read this page's history.` + *nothing has been lost*, error under *What went wrong* |
| `A log is the truth and the tree is a view of it (0016)…` | `There is nothing to switch on. A page's history starts the moment the page does…` |
| `3 accepted changes` | `3 changes so far` (and `No changes yet` at zero) |
| `A log belongs to a tree. Pick one to read what has been accepted into it.` | `Each page keeps its own history. Pick one to read what has been changed on it.` |
| `Nothing on this page is revision 900 — this log reaches revision 12.` | `Revision 900 isn't among the changes shown here — this page has only got as far as revision 12.` |
| `← earlier` / `later →` / `latest →` / `another tree` | `← Show earlier changes` / `Show later changes →` / `Jump to the newest →` / `← Pick a different page` |
| `Set DATABASE_URL to make it durable.` | a sentence about what this deployment is doing, variable under *How to make it permanent* |

**Names stay on the surface.** `t_seed1`, `n_seed9`, `revision 3`,
`ana@loom.local` and `loom.prose` are all still in front of the reader, on the
22 August reasoning: a plain sentence describes a *class* of thing, and what tells
two rows apart is the name.

### A decision-record number was being printed at a reader

The chooser's empty state read *"A log is the truth and the tree is a view of it
(0016)"* — a citation, on the one screen whose entire test is whether somebody who
has read no decision record can follow it. **The fact survives and the citation
moved into a code comment.** This is the clearest single instance of the brief's
principle I have found in my own lane.

### Where the words live

`_lib/revision-view.ts` is new and is History's assembly module, the counterpart
to Activity's `episode-view.ts`. It decides nothing: every word comes from
`vocabulary` or `delta-summary`.

Three additions to `_lib/vocabulary.ts`, all of them shared:

- **`PlainLine` and `readingOf`** — a sentence with a name in the middle of it,
  named as three pieces rather than left implicit. See below; this is the 24
  August lesson turned into a type.
- **`partPhrase`** — one part of a page as a noun phrase with its article
  attached (`a loom.heading`, `the words`, `the body space`), so two callers
  cannot disagree about "a" versus "the".
- **`namedList`** — `title, width and gap`, because a delta's settings and an
  inverse's restorations are the same list read twice.

## The 24 August lesson, turned into a type

The rule taken from three defects last run was:

> **Where two independently-held strings are set side by side, assert the joined
> reading, not the parts.**

That was a rule a person had to remember. `PlainLine` makes the join a value —
`{ before, subject, after }` — and `readingOf` is the sentence a test asserts
whole. Every plain reading in this diff is one, and every test of one calls
`readingOf` and `toBe`, not `toContain` on a half.

`vocabulary.test.ts` pins the failure mode directly: a `before` that has lost its
trailing space still satisfies `toContain("Deleted")` and `toContain("n_gone")`,
and `readingOf` reports it as `Deletedn_gone and so on.`

## Three defects the screenshots found, and eighty tests did not

Consistent with every run since 20 August.

1. **`asked by system-signal` beside `origin system-signal`.** The `asked by` pair
   fell back to the origin when no actor was recorded, and the pair next to it
   prints the origin anyway — so a system-authored revision showed the same value
   twice under two labels that promise different things. `asked by` now renders
   only when there is somebody to name. Nothing is lost; the origin is still
   there, once.
2. **"Your site asked for this by itself. Loom worked this change out itself…"** —
   two *itselfs* in one line, which reads as a stutter. The runtime sentence now
   says *from the record*.
3. **The row header stacked inconsistently between rows on a phone.**
   `flex-wrap` put the date beside the heading on one row and under it on the next
   at the same width. It is `flex-col sm:flex-row` now — stacked until there is
   room, rather than wrapped.

None of the three is a bug a browser could not have shown in three seconds, and
the count is now **nine across six runs.** The 23 and 24 August recommendation —
that a screenshot at two widths belongs in `docs/routines.md` rather than in this
lane's habit — stands, unchanged and unrepeated further; it is the maintainer's
call and I have made it three times.

## One thing I deliberately did not make friendlier

A revision with no `answeredBy` says **nothing at all** about approval. It is
either a change nobody had to approve or one a host approved without naming the
approver, and the revision cannot tell those apart — only the journal can (0029).

`Allowed by nobody` was the old sin. The interesting part is that **a
plain-language pass is exactly when the same sin comes back in friendlier
words**: "nobody had to approve this" is warmer, reads better, and is a claim the
record does not support. It is a test now, and the test asserts the *absence* of
the word "nobody" rather than the presence of a sentence.

## One thing the plain-language pass caught in the data

An undo is a delta the **runtime** computed, and only a model grades itself
(0007) — which is why calibration reads `authoredBy` rather than recognising an
interpreter name (0031). `confidence: 1.00` on an undo was being printed at the
same altitude as a model's self-grade, and the plain wording would have read
*"The AI says it is very sure"* over a change no AI had an opinion about.

**This screen is the only one that could have made that mistake**, because an undo
appears here and never on Activity. The number is still in the record; the
sentence says what it actually is.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** From the first screenshot, unaided: *Three things have been changed on
this page. The most recent one my site did on its own — it changed a card's look
— and I can undo it. The one before that added a paragraph. The oldest one ana
asked for and dana approved, and if I undo that one it will wipe out what the
newest change did, so Loom won't let me do it alone.*

Where it stops, correctly: `n_seed9`, `t_seed1`, `loom.prose`, `revision 3` —
names.

## What this tells a developer that they could not get elsewhere

**What a change replaced.** It is the strongest answer this lane has, and it is
structural rather than incidental.

A repository keeps both sides of every change for free — a diff is the before and
the after. Loom's delta model deliberately keeps only the forward side (0016): a
`configure` carries the value it *set* and not the one it wrote over, a `remove`
carries the id it deleted and not the subtree that went with it. So "what did this
replace" is a question that **can only be answered by replaying the log and
inverting it**, and this screen is the only place that happens.

Off the screenshot: *undoing revision 1 puts `n_seed9`'s variant back to
"outlined"* — a value that exists nowhere in the tree as it stands, in no commit,
in no build output. And beside it: *undoing it now would wipe out what revision 3
did*, which is a fact about the **relationship between two changes** that neither
change records.

The honest weakness, unchanged: on a fresh deployment this screen is empty, and
its empty state is now an invitation rather than a sentence about revision 0.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 106 | 1647 (untouched by this diff) |
| `@loom/app` | 125 | 1820 |

**40 net new tests**, in nine files, two of them new. Each count below is the
file's own, measured against `origin/main`:

- `_lib/revision-view.test.ts` — **13, new file.** Every origin worded, the full
  stop every reading ends in, the runtime-authored case, the empty delta, the
  paragraph the three sentences make when joined, and **the cross-screen
  agreement with Activity about who asked**.
- `_lib/vocabulary.test.ts` — **7 new (50 → 57).** `readingOf` including **the
  failure mode asserted as a broken sentence**, `namedList` at one, two, three and
  zero, and `partPhrase` over all three node kinds.
- `_lib/delta-summary.test.ts` — **8 new (8 → 16).** Every operation as a joined
  sentence, the two reconfigure edge cases, and the property that no plain reading
  contains a word from the delta model.
- `portal/history/reading-order.test.ts` — **6, new file.** The third guard of
  this shape: the screen says what it is before it lists a revision, the empty
  state keeps an action, the row puts what changed above who asked above the
  record, and the reversal arrives before the button.
- `_components/revision-row.test.tsx` — **3 new (13 → 16)**, including the
  origin-printed-twice defect and the paragraph asserted whole.
- `_components/reversal-note.test.tsx` — **2 new (5 → 7)**, including
  `revision`/`revisions` asserted with the space intact.
- `_lib/history-link.test.ts` — **1 new (34 → 35)**, a guard that no anchor-miss
  sentence says "log" or opens with `Nothing on this page`.
- `_lib/reversal.test.ts` — **rewritten, 16 either side.** Every restoration is
  now a joined reading, and the blocked outcomes assert the plain reason *and* the
  technical string separately, which is the pair the disclosure renders.
- `_components/revision-box.test.tsx` — **rewritten, 6 either side**, gaining the
  assertion that the hint is not `sr-only` — the one that would catch somebody
  hiding it again.

The ones that earn their place are `readingOf`'s failure-mode test, the
cross-screen agreement between History and Activity about who asked, and the
"nobody" guard — the last of which is a test that a sentence is *absent*.

## What I did not do

- **`src/` is untouched** and nothing was wanted from it. `authoredBy` is public,
  and it turned out to be the field that prevented a wrong sentence.
- **No decision record.** Nothing here touches the tree schema, the delta model or
  an Accepted record. How a portal screen words itself is a portal decision.
- **The revision box still has no way to say "that revision was refused" beyond a
  sentence.** It is the right shape; noted, not filed.
- **The chooser's card does not look like a link until you hover it.** That is the
  25 August finding filed by another lane against `loom.card`; the portal's card
  here is app-level (0067's stated exception) and has the same defect. Not filed
  again.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **`PlainLine` should probably spread to Activity.** `episode-view.ts` still
   composes sentences from strings a component sets side by side, which is the
   shape that produced three defects. It works today and every join is tested, so
   this is a tidying rather than a fix — **my recommendation: leave it until
   Activity is touched for another reason.**
2. **A model-authored screen cannot be photographed without a key.** This run
   worked around it honestly and said so; the workaround is not repeatable
   discipline. Filed as a finding with a recommendation.
3. **Nothing blocking.**
