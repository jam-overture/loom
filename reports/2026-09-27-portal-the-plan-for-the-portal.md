# 2026-09-27 — "The plan for the portal"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-38-the-plan-for-the-portal` (→ `main`), cut from `main` at
`c265328`. Not stacked, and `main` was not pushed to.

**This is a planning unit, not a build unit**, and it exists because the
maintainer asked for one in an interactive session on 27 September:

> *"Can we gameplan all of this out? … I think since the framework is being
> published and the marketing and docs sites are all pretty good, it is time to
> focus back on the portal."*

The deliverable is [`docs/portal.md`](../docs/portal.md) and two `Proposed`
records. **This report does not restate them** — it records what was decided
about the decisions, what was checked before planning, and what I got wrong.

**No visual.** Nothing renders differently; `git diff origin/main -- 'apps/**'`
is empty.

**No open pull request of this lane's, and no deviation to explain.** #420 —
this morning's *which page the AI was wrong about* — **was squash-merged to `main`
as `c265328`**, which is the commit this branch is cut from. So `docs/routines.md`'s
rule about pushing onto an open branch does not apply: there is nothing open to
push onto, and this branch already contains that work as history.

---

## What the maintainer said, and what he corrected

He named one defect and four gaps. The defect, in his words:

> *"I like the individual components of the portal, but I think the portal fails
> overall in one major regard; what am I supposed to do here?"*

He is right and the sharper statement is in the plan: **`/portal` is a queue, not
a front door.** Its two sections are *Waiting on you* and *Changed without asking
you*. It answers *what needs me* and never *what is my site, how is it doing,
what do I do next*.

**He corrected me on two things and both corrections are in the records.**

### 1. I over-read 0031, and said so

I told him *"A/B results feeding into my models"* collides with
[0031](../decisions/0031-calibration-is-a-reader-not-a-controller.md). He
disagreed:

> *"we need to give the user some ways to move levers and controls to fine tune
> what they are delivering … use existing methods to set up test cases/runs to
> then analyze results to determine modifications."*

He is right on the text. 0031's subject is what **the runtime** consumes — *"it
returns a report. Nothing consumes it."* — and its consequences say the opposite
of what I took it to forbid:

> Moving a gate floor on the strength of what is here is a decision for a human
> with this page in front of them.

`/portal/trust`'s own module comment has been quoting that correctly the whole
time. A screen that shows the evidence and makes a reader go and find the control
is honouring half of 0031 and failing the half it asked for. The ambiguity is in
one phrase — *results feeding into decisions* — which reads two ways, one of
which 0031 refuses:

| | who decides | 0031 |
| --- | --- | --- |
| a person reads a rate and moves a floor | a person | **what 0031 asks for** |
| a rate moves a floor | the runtime | **what 0031 refuses** |

0200 draws that line (written as 0198 and renumbered — see below), and its fourth clause is the one to quote at anything that
later looks like automation: **no measurement in this system may write a policy, a
delta or an intent.** A signal does not become an intent; a gap does not move a
floor; an A/B result does not promote a variant. Every one of those is a button.

I filed the mistake inside the record rather than only here, because the same
misreading is available to every future run.

### 2. The canvas argument is better than the one I attributed to him

I framed his node-selection ask as *tweaking*, which is what 0019 refused. He
rejected the framing:

> *"I don't agree with your assumption that a user will be tweaking. I think we
> will eventually have direct integration with a users linked AI model … It is a
> manual prompt to initiate an event that might otherwise be automated. It puts
> the human back in the loop but in a limited way."*

That is not the inversion 0019 feared. 0019's fear is the canvas becoming the
main path with the model as a novelty attached; a person reaching in to trigger,
by hand, the thing the model would otherwise have done unwatched is the opposite
motion. His sentence is kept verbatim in 0199 because it is the argument, and
*"people still like graphical editors"* is not.

He also accepted the sequencing — *"your approach to get to 90% is sufficient for
now with a note about future work"* — so 0199 splits it: the inspector is inside
0019 and buildable now, the hand is clause 4 and is not built.

### 3. Two refinements taken as asked

- **The inspector takes a set, not a node.** *"The user should be able to click 1
  or more nodes."* Several excerpts, **document order** — a set of parts has no
  arrangement of its own, and inventing one is how a canvas arrives sideways.
- **The progression is playable.** *"almost like I am watching a movie of it
  changing and morphing would be cool."* A scrubber across revisions, with two
  constraints the plan states: it must not tween between revisions (a state that
  never existed), and it must not silently skip a revision that cannot be
  replayed.

## What I checked before planning, and why it changed the order

A plan built on wrong premises wastes his time, so the code was read first. Four
things he could not find **already exist**:

| | |
| --- | --- |
| `renderLoomExcerpt` | published on `@jam-overture/loom/react`; its own docstring says *"a preview, an inspector and a side-by-side are all the same shape"*. **The portal has never called it.** |
| `replayTree` + `store.revisions()` | published on `@jam-overture/loom/store`. Folding to any revision is in-lane; **no framework gap.** |
| `/portal/readers` | per-node-per-revision counters, including *"What the last change did to your readers"*. |
| the preview, outline and selection panes | `/portal/pages/[treeId]`, as 0019 specified. |

**So phases 1–3 are largely assembly, and phase 4 is mostly discovery** — step 4
of `docs/signals.md` was already approved and already this lane's, and the reason
he could not find it is that it is called `Readers` in a rail below `Trust`.

Two things are genuinely absent: **A/B serving**, and **`completed`** (signals
step 2, approved 13 September, unbuilt) without which the portal can measure
attention and not conversion. The plan says that on the screen rather than
showing engagement under a word implying outcome.

## What the plan does not do

**It does not decide A/B's hard question**, and it says so. It files it instead —
an A/B split conventionally needs a reader to stay in one arm across visits, and
0146 refuses by name every ordinary mechanism for remembering which arm. A cookie
is a small change and would be the first thing here to breach 0146, quietly. Three
directions are offered and none chosen, because that is the maintainer's call and
should not be reached by accident.

**It does not authorise a property inspector.** Typing a value into a field is
the canvas 0019 refused and nothing in the 27 September direction asked for it.

**It does not gate anything.** The portal is free and the bar does not change.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Nothing — and that is the honest answer for a planning unit.** The value
question in the brief is a test for screens, and this ships none. What the plan is
*for* is phase 1, whose answer is the one the portal has never had: *what is my
site, and what state is it in.* A thumbnail of a page that was never written as
markup, beside what readers did with it and what is waiting on it, is available
from no repository, no build log and no `git log` — the tree lives in a store and
the name is derived from the page's own leading heading.

## Tests

`pnpm verify` green, exit 0, read from a file written by the last command on its
own line, on a `.next` deleted first.

| | `main` at `c265328` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 165 files / 3,216 | **165 / 3,216** |
| `@loom/app` | 315 / 5,490 | **315 / 5,490** |
| findings | 854, 0 malformed | **856**, 0 malformed |
| prerender | 114 pages, 1,304 junctions | **114 / 1,304**, 0 unserved |
| decisions index | — | regenerated, both records listed `Proposed` |

**No tests added and none changed**, which is correct for a unit that ships no
code — and worth stating rather than leaving as an absence a reviewer has to
notice. `git diff origin/main -- src/ 'apps/**'` is empty.

`pnpm decisions:index` **failed twice before passing**, both times correctly: a
record with no `## Alternatives considered` section is refused. That check is the
reason both records now say what was rejected, including the two alternatives I
would not otherwise have written down — letting the loop close behind a default
switch, and arranging several excerpts in their page positions.

## Findings

**Filed two, closed none.** Both are framework gaps this plan *creates* rather
than discovers, which is the honest description: neither existed as a problem
until the plan committed to something that needs them.

1. **A policy can be changed and there is nowhere to record it.** 0200 requires a
   policy change to carry who, when and what it was before. `policyFingerprint`
   proves two judgments used different rules and cannot say how they differed — a
   hash is not a history. Blocking phase 7 entirely, blocking nothing before it.
   `Loom daily build`'s; the portal can build the screen and cannot invent the log.
2. **An A/B split needs a reader assigned to an arm, and 0146 refuses every
   mechanism for remembering which.** Filed before the work rather than during it,
   with three directions and none chosen.

## What I did not do

**I did not supersede 0019 or 0031.** Both records are `Proposed`, both are the
maintainer's to accept, and 0199 states explicitly that 0019's three panes and
five legible outcomes stand exactly as written.

**I did not start phase 1.** He said *"write these up so we can begin building
it"*, and the write-up is the unit — a plan and its first phase in one branch
would be a plan nobody reviewed.

**I did not touch `src/` or any route group.**

**Nothing is scheduled and no pull request is subscribed to.**

## Recommendations

1. **Accept or amend 0200 and 0199.** Phases 1–4 need neither; phases 5–7 need
   both. Nothing is blocked today.
2. **Phase 1 next, as one pull request.** It is the thing he actually complained
   about, and until there is a front door every screen this lane has built is
   something a person has to already know to go looking for.
3. **`completed`, for `Loom daily build`** — signals step 2, approved on
   13 September, fourteen days unbuilt, and the difference between measuring
   attention and measuring outcome.
