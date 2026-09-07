# 2026-09-07 — "What Loom did without you"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`), which is
[#245](https://github.com/jam-overture/loom/pull/245). This is its **sixth
unit**, pushed onto the open pull request rather than opened as a seventh from
this lane — the 28 August instruction, followed for the third consecutive run.

Visuals — the real screen, from a production build of this commit, in a signed-in
browser, against a page **a live model changed five times during this run**:

| | |
| --- | --- |
| [Both halves, populated — one change waiting, four made without asking](2026-09-07-portal-what-loom-did-without-you.png) | 1280px |
| [Caught up, and still with something to read](2026-09-07-portal-what-loom-did-without-you-caught-up.png) | 1280px |
| [The record, one click down](2026-09-07-portal-what-loom-did-without-you-record.png) | 1280px |
| [a phone](2026-09-07-portal-what-loom-did-without-you-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing was staged. Five requests were typed into the real
prompt box against the seeded tree — *"Change the heading at the top of the page
to say Autumn arrivals"*, *"Make the intro paragraph warmer and mention free
returns"*, *"Change the heading to say Autumn arrivals are here"*, *"Delete the
whole card and everything inside it"*, *"Remove the second section of the page
entirely"*. The Gate applied four of them on its own and held the fifth. Every
sentence in every screenshot is what the portal wrote about what actually
happened.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227, #234,
#240 and #245 carry only the deployment bot's comments and my own. So the plan
decides, and the standing ask on #245 is unchanged and stated again below.

## The finding this unit is a fix for

The front door had one subject: **what is waiting for an answer.** That is the
one genuinely urgent thing in Loom, and it is the right thing to lead with.

It is also, on a deployment that is working, **empty most mornings** — and the
caught-up state had been naming the reader's actual next question for a
fortnight without answering it. Its own comment, in the source:

> *"When nothing needs answering, the standing question is whether the changes
> Loom made **without** asking were sound."*

It sent them to `/portal/trust`, which says whether the model's self-graded
confidence has held up and never says **what it did**. And nothing else in the
portal said either:

| Screen | What it lists | Why it does not answer this |
| --- | --- | --- |
| `/portal/activity` | every ask | attended and unattended together, indistinguishable |
| `/portal/history` | every accepted change | says nothing about who approved it — **deliberately** |
| `/portal/trust` | how the self-grade has held up | a property of the model, not a list of changes |

History's silence is the interesting one and it is correct. A revision carries
`answeredBy`, and `undefined` there means *either* nobody had to approve it *or*
a host approved it without naming the approver. The log cannot tell those apart
(0029), so `revision-view.ts` says nothing rather than guessing — and a plain
language pass is exactly the moment that guess returns in friendlier words.

**The journal can tell them apart.** `ProposalEpisode.held` is the Gate having
stopped *and custody having succeeded*, so a human was asked. `held === false` on
a committed proposal is unambiguous. That is the whole reason this reads the
record rather than the log, and it is why the answer had to be built rather than
looked up.

## What shipped

**The front door has two halves now: what needs you, and what happened without
you.**

| | |
| --- | --- |
| `<h1>` | `Waiting on you` → **`What Loom has been doing`** |
| `<h2>` | **`Waiting on you`** — unchanged in every other respect |
| `<h2>` | **`Changed without asking you`** — new |

The heading moved because a heading that names one of two sections is worse than
a wrong one: a reader who takes `Waiting on you` at face value reads the second
section as more of the first, and *"changed without asking you"* read as
*"waiting on you"* invites somebody to answer a change that is already settled.

### `_lib/unattended.ts` — the derivation

One pure function over a fold's episodes. For every committed episode it finds
the proposal that produced it and keeps the ones where **`held` is false and
`answeredBy` is absent** — either one settles it, and either one alone would be
enough to be wrong about.

Each change carries what a person triaging one asks, in the same order the
waiting card asks its four:

1. **What did it do?** One plain sentence per operation, from `plainOperation` —
   the same sentences `/portal/history` writes about a revision.
2. **Who set it off, and on which page.**
3. **Why was I not asked?** The Gate's own reason, `within-policy`, which
   `vocabulary.ts` has read *"Nothing this project watches for was involved, so
   it went ahead on its own."* since August and which nothing has ever rendered.
4. **What can I do about it?** The revision it became, linked as
   `/portal/history?tree=…&at=…` — where the inverse is spelled out.

### The card is not an alarm, and that is the one visual decision that matters

`bg-applied`, the same green the portal uses for a change that went through —
not the refusal colour and not the awaiting amber. **The Gate applying a change
it was allowed to apply is the runtime working.** A portal that dresses that as a
warning teaches a reader that its colours mean nothing, and then the one that is
a warning does not land. What these are is *news*, and news with something to do
about it.

### Two things counted rather than assumed

- **`unclear`.** A window that opened after a proposal was proposed sees the
  commit and not the proposal. That change is neither attended nor unattended as
  far as this fold can tell, and it is counted and said in the summary sentence —
  not put in the list on the strength of a record that was not read, and not
  quietly left out either.
- **The window itself.** `RECENT_RECORDS = 120`, and **the cap is on the read,
  never on what came back.** A screen that reads a hundred changes and renders
  five has hidden ninety-five and said nothing; a screen with a smaller window
  has a window, and the sentence above the list says so. There is a test for the
  difference, because it is invisible on screen and total to a reader deciding
  whether they have seen everything.

### A failed record does not take the queue down with it

The two halves come from two sources — the hold store per page, the journal in
one read. There is no early return on a journal that will not read: the second
section says it did not load, in the failure tone, and the queue above is
untouched and still true. *"This screen cannot tell you whether Loom has changed
anything on its own. That is not the same as it having changed nothing."*

## Two defects a screenshot found and the tests did not

Consistent with every run since 20 August; **twenty-two across thirteen runs** in
this lane's own count.

1. **The screen said the queue was empty twice.** `Nothing is waiting for you.`
   sat three lines above a green box headed `You're all caught up.` — one fact,
   said twice, and the second one says it with a shape as well as with words. It
   had been there since the `settled` tone shipped on 5 September and only read
   as a stutter once the section got a heading of its own. The summary now
   renders only when there is a count to give; nothing is lost, because the
   caveats it carries when a sweep is partial are the short version of the notice
   directly below it, which renders either way.
2. **`you could undo it` in grey beside a button**, reading as a caption somebody
   forgot to finish. The clause is written to follow a stakes label and does that
   correctly everywhere else. `asSentence` in `vocabulary.ts` shapes it —
   capitalised and stopped — rather than a second string saying the same thing,
   which is the drift that module exists to prevent.

Neither is a bug a browser could not have shown in three seconds. The
recommendation from 23, 24, 25 and 29 August — that a screenshot at two widths
belongs in `docs/routines.md` rather than in this lane's habit — stands.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 176 | 2818 |

**38 net new tests** (2780 → 2818), in three files, two of them new — plus one
that nobody wrote: `every-screen.test.ts` enumerates the lane from the filesystem,
so the new component picked up the universal rules by existing.

- **`_lib/unattended.test.ts` — 22, new file.** The claim and the two ways of
  getting it wrong: a held proposal and an answered one are both left out, a
  committed change whose proposal the window never saw is counted rather than
  claimed either way, and nothing that was not committed appears at all. Then
  what one change says — the sentences, the href holding the revision, the
  settle time rather than the propose time, the origin when there is no actor,
  and two absences: no words in a model's mouth about a delta the runtime wrote,
  and no invented judgment for a record that does not carry one. The
  no-judgment case asserts the fixture *had* a judgment first, so it cannot pass
  vacuously.
- **`_components/unattended-card.test.tsx` — 7, new file.** Reading order
  measured over the rendered text, the inverse offered as a link rather than an
  undo button, the record present and not led with, and the colour: `bg-applied`,
  never `bg-rejected` or `bg-awaiting`.
- **`portal/reading-order.test.ts` — 8 new (8 → 16).** Urgency before news, the
  heading true of both halves, the count before the cards, the cap on the read
  rather than on a slice, no early return on a failed record, a failed read told
  apart from a quiet one, and the two screenshot defects above pinned so they
  cannot come back.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to `/portal`, this run's only screen. From the first screenshot,
unaided: *Loom has been busy. One change is waiting for me — somebody asked to
remove the second section, and Loom was sure enough to suggest it but not sure
enough to do it, so it stopped. Underneath, four changes it already made on its
own, newest first. The first one deleted a whole part of the page and everything
inside it, and Loom didn't ask me because nothing this project watches for was
involved. I could undo it, and there's a link that shows me exactly what undoing
it would put back.*

Where it stops, correctly: `n_seed9`, `t_seed1`, `p_pn6ebqk7d1wpwemz0lw7` —
names.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What the AI changed on their site while nobody was watching.**

This is the sharpest instance of the question the whole surface exists to
answer, and it is not close. A Loom tree does not live in the repository: it
lives in a store, and a change the Gate applies on its own touches no file, no
branch and no build. `git log` cannot see it. The deploy log cannot see it —
nothing deployed. The application log records a request, not a decision. **The
only record that a change was made, that it was made by a model, and that no
human was asked, is Loom's own journal** — and until this run nothing read it
for that.

The screenshot is the argument. *"Deleted `n_seed9` and everything inside it"*,
applied without asking, because the policy this deployment runs did not require
asking. That is a fact about somebody's live page that no other tool in the
ecosystem can produce, and it is the reason to open the portal on a morning when
nothing is waiting.

## What I did not do

- **`src/` is untouched.** Every export used is public: `episodesOf` and
  `describeTelemetryError` from `@loom/runtime/telemetry`, the id schemas and
  `TreeDelta` from `@loom/runtime`.
- **No decision record.** What the front door shows is a portal decision;
  nothing here touches the tree schema, the delta model, or an Accepted record.
- **No undo button.** The portal is a review queue rather than a design tool
  (0019), and undoing a change from a screen that cannot show you the page is
  exactly the unlooked-at write this surface exists to prevent. The link leads to
  the inverse, spelled out.
- **Nothing scoped to one page.** `/portal/pages/[treeId]`'s five-view strip
  could carry a sixth — *"what changed without you, on this page"* — and it is
  the obvious next unit. It is not this one because the strip is a considered set
  of five and widening it is a change to every scoped screen at once.
- **No filter, no paging.** The window is the window and the sentence says so.
  Paging the journal for this one question would be a second Activity.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #245, then close #219, #227, #234 and #240.** Unchanged and now six
   units deep. Nothing in this lane has merged since 25 August. I have not closed
   them myself.
2. **Nothing blocking.**
