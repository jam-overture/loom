# 2026-09-08 — "One screen, one name"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`), which is
[#245](https://github.com/jam-overture/loom/pull/245). This is its **seventh
unit**, pushed onto the open pull request rather than opened as an eighth from
this lane — the 28 August instruction, followed for the fourth consecutive run.

Visuals — the real screens, from a production build of this commit, in a signed-in
browser, against a page **a live model changed four times during this run**:

| | |
| --- | --- |
| [The front door, and what it says it is not](2026-09-08-portal-one-screen-one-name.png) | 1280px |
| [**The rail, open** — the three renamed entries](2026-09-08-portal-one-screen-one-name-rail.png) | 1280px |
| [What's been asked](2026-09-08-portal-one-screen-one-name-asked.png) | 1280px |
| [What's changed — the tab you clicked is the heading you land on](2026-09-08-portal-one-screen-one-name-changed.png) | 1280px |
| [a phone](2026-09-08-portal-one-screen-one-name-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing was staged. Five requests were typed into the real
prompt box against the seeded tree — *"Change the heading at the top of the page
to say Autumn arrivals"*, *"Make the intro paragraph warmer and mention free
returns"*, *"Delete the whole card and everything inside it"*, *"Remove the
second section of the page entirely"*, *"Turn the page background bright pink"*.
The Gate applied three, held one, and the AI did not understand one. Every
sentence in every screenshot is what the portal wrote about what actually
happened.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227, #234,
#240 and #245 carry only the deployment bot's comments and my own. So the plan
decides, and the standing ask on #245 is unchanged and repeated at the foot of
this report.

## The finding this unit is a fix for

`_lib/vocabulary.ts` made it impossible for a *state* to be called two things on
two screens. Nothing did the same for a **screen** — and by yesterday
`/portal/activity` was being called four different things by four different
parts of this portal:

| Where | What it called the screen |
| --- | --- |
| the rail | `Activity` |
| its own heading | `Activity` |
| the strip on every scoped screen | *What's been asked* |
| the link at the foot of the front door | *Everything anyone has asked for →* |

`/portal/history` had three of its own. And when I went looking with a test
rather than by eye, there were **four more**, all of them user-facing prose:

- **`_lib/waiting.ts`** — *"The change is thrown away… What was asked for stays
  in **Activity**, so nothing is lost."* Printed at the exact moment a person
  decides whether to throw a change away. "Nothing is lost" only reassures if
  the reader can find the place it is not lost in.
- **`_lib/vocabulary.ts`** — *"This change is live on the page. You can undo it
  from **History**."* The sentence under **every applied change in the portal**,
  so the widest-read copy of the wrong name.
- **`not-found.tsx`** — the 404's second way out, labelled `Activity →`. One of
  the two screens the brief names as what a new person meets first.
- **`(demo)/_lib/report.test.ts`** — a guard listing the portal screens the demo
  must never send a visitor to, by hand, as `/history/i`.

Eight names for two screens.

### The front door's was worse than a synonym

Its rail entry said `Waiting on you` and its heading said `What Loom has been
doing`. Those are not two words for one subject; they are two subjects. The
heading is the right one — yesterday's unit gave that screen a second half — and
the comment that run left above it argues the case exactly:

> *"A heading that names one of two sections is worse than either a wrong
> heading or a missing one: a reader who takes it at face value reads the second
> section as more of the first."*

**The rail entry it did not touch was still doing that, one file over, and the
rail is what a reader meets first.** `Waiting on you` also names two other
things on this surface — the front door's first section, and the state of a
change on every badge in the portal — so a person meeting it in the rail had no
way to know which of the three they were being offered.

### And `Activity` and `History` are synonyms

That is the half no amount of consistency fixes. In ordinary English the two
words mean the same thing; in Loom the two screens are nearly opposites. One is
every request **including the ones that changed nothing** — a refusal, or an ask
the AI never understood. The other is only what was actually accepted. A reader
cannot guess that from either name, at any length, and it is the single most
valuable thing on either screen.

## What shipped

### 1. `_lib/screen-names.ts` — a screen is named once

`route → { name, elsewhere, formerly }`. The rail, the heading, the strip and
every link that leads there all read the name from here.

| Screen | Rail before | Heading before | Both, now |
| --- | --- | --- | --- |
| `/portal` | `Waiting on you` | What Loom has been doing | **What Loom has been doing** |
| `/portal/activity` | `Activity` | `Activity` | **What's been asked** |
| `/portal/history` | `History` | `History` | **What's changed** |

The two new names are **not invented here**. They are the words the strip has
used for these two destinations since 29 August, promoted from the one place
that had them right to the place everything else reads.

**The routes do not move.** A route is an address rather than a label;
`/portal/activity` is already a person's word, and renaming it would cost every
link ever written to it for the sake of a string no reader is shown.

**Only three screens are declared, deliberately.** `Pages`, `Pieces`, `Rules`,
`Trust`, `Checkup` and `Sign-ins` are each a short form of their own heading
rather than a different subject, and none of them is interchangeable with the
one beside it. The brief is explicit that a giant rename PR is unreviewable, and
this lane's own discipline is that a name moves on the run that rewrites its
screen. A future run adds its screen to the module.

### 2. Every screen says what it is *not*

One line under the heading, on all three, naming its neighbour and the
difference. The clause ends where the link begins, so it reads as one sentence
whose last words are the name the reader will meet in the rail:

> *"Asking for a change is not making one. Only the changes that actually went
> through are in **What's changed →**"*

> *"A change Loom turned down, or never understood, changed nothing — so it is
> not here. Every request, including those, is in **What's been asked →**"*

> *"This is what has happened lately. Every request anyone has ever made —
> including the ones that changed nothing — is in **What's been asked →**"*

It carries the page the reader is on: from one page's history to **that page's**
requests. The front door reads no `tree`, so a scope offered to it is dropped
rather than appended as a parameter nothing reads.

### 3. The four buried copies, fixed

All four above now read the name from the module. The 404 and the undo sentence
are the two that matter most, because they are the two most people meet.

### 4. A guard, from both ends

In `every-screen.test.ts`, over every `.ts` and `.tsx` in the route group,
comments stripped:

- **A declared name may not appear as a literal.** Writing a second copy is a
  failing test.
- **A name a screen used to have may not appear as a standalone word.** Bounded
  by letters on both sides, so `ActivityPage` and `/portal/activity` are
  untouched — a symbol is a symbol and a route is an address, and neither is
  something a reader is shown.

`.ts` files are swept as well as `.tsx`, which is what catches the case that
actually happened: the strip's labels lived in `_lib/page-views.ts` and nothing
rendered them from a component.

**This guard found three of the four buried copies.** I wrote four tests about
naming before it, and all four passed while `waiting.ts` still said `Activity`.

## The one thing I carried across a lane boundary

**`apps/loom/app/(demo)/_lib/report.test.ts` and `report.ts`** — two lines and a
comment.

The demo borrows the portal's vocabulary table, and its own guard listed the
portal screens a visitor must never be sent to **as hand-written regexes**,
including `/history/i`. Renaming the screen disarmed that guard silently: it
went on passing while no longer matching the one sentence it was written for.
The list now reads `screenName("/portal/history")`, so it cannot go blind the
next time this lane renames something.

I fixed it rather than filing it because **my change is what broke it**, and
`pnpm verify` is the merge gate for four surfaces. The deeper question — whether
the demo's `applied` override should be derived rather than a second literal —
is filed for `Loom demo` rather than answered here.

## Tests

`pnpm verify` — **green, exit 0.**

- **Framework:** 119 files / 1860 tests.
- **Application:** 178 files / 2842 tests, up from 176 / 2818 at the branch head.
  **24 new, in 5 files.**

Nothing was skipped, and no test was weakened. The three assertions that had to
change all changed because the thing they asserted moved:

- **`_lib/screen-names.test.ts` — 10, new file.** Including that no two names are
  confusable once case and punctuation are normalised, that no screen points at
  itself, and that a clause never ends on a full stop — because the link has to
  follow it.
- **`_components/elsewhere-note.test.tsx` — 5, new file.** Including that the
  whole thing reads exactly `clause + name + →`, asserted against the module at
  both ends rather than against a literal.
- **`every-screen.test.ts` — 6 new.** The two rules above, plus two
  guards-the-guard: one string that is definitely in the lane has to be found by
  the same search, or an empty sweep passes as clean.
- **`shell/nav-items.test.ts` — 2 new, 1 rewritten.** The rewritten one no longer
  carries its own copy of the label; it asserts against `screenName`, which is
  the point. The new one is that no two rail entries normalise to the same
  string — `Activity` and `History` were exactly that pair for a fortnight.
- **`portal/reading-order.test.ts` — 2 changed.** The front door's way-out strip
  is one link rather than two, and its heading is now an interpolation.
- **`_lib/waiting.test.ts`, `_components/page-views.test.tsx`,
  `(demo)/_lib/report.test.ts` — assertions repointed at the module.**

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to the rail and to all three record screens. From the rail screenshot,
unaided: *There are two lists of what has happened — one of everything people
asked for, one of what actually changed. Those are different, and the screens
say which is which.* That sentence was not available yesterday at any width.

From the "What's been asked" screenshot: *Five things were asked for. Three got
done, one is waiting for me to say yes or no, and two the AI couldn't make sense
of. If I only want the ones that actually happened, that's the other screen.*

Where it stops, correctly: `t_seed1`, `n_seed9`, `revision 2` — names.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**That a request happened at all when nothing came of it.**

This is the same claim the portal has been making since the activity screen
existed, and until today it was made in a vocabulary that hid it. A refusal
changes no file, so it is in no diff, no build log and no `git log`; an ask the
AI could not interpret is the same. Two of the five asks in these screenshots
are in that class — a third of everything that happened during this run leaves
**no trace anywhere outside Loom**.

A reader can only get that if they can tell the screen that has it from the
screen that does not, and `Activity` beside `History` gave them no way to. What
shipped today is not a new fact; it is the difference between the fact being on
a screen and the fact being findable, which for a person who has never read a
decision record is the whole difference.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it.
- **No decision record.** What a portal screen is called is a portal decision;
  nothing here touches the tree schema, the delta model, or an Accepted record.
- **Six screens not renamed.** `Pages`, `Pieces`, `Rules`, `Trust`, `Checkup`,
  `Sign-ins` — reasoning above. Each is a short form of its own heading, not a
  different subject.
- **The rail's noun rule, partly reversed, and said out loud rather than
  quietly.** `_lib/page-views.ts` argued on 29 August that *"a rail is a list of
  places and a noun is what names a place"*, which is why `Activity` and
  `History` stayed nouns while the strip got the better words. That rule is
  still right for six of the nine entries and it loses to rule 1 of the brief
  where a noun cannot tell two places apart. The comment that made the argument
  has been rewritten rather than deleted, so the next run meets the reasoning
  and not just the outcome.
- **A scoped lead still names the page by id.** `/portal/history?tree=t_seed1`
  reads *"Every change that has actually been made to `t_seed1`"* while the
  front door two clicks away calls the same page *Autumn arrivals*. Yesterday's
  unit gave a page its name in headings, lists and choosers and did not reach
  `scopedLead`. Filed, not taken — it is four sentences in one module and it
  belongs to the run that next touches the scoped screens.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #245, then close #219, #227, #234 and #240.** Unchanged and now seven
   units deep. Nothing in this lane has merged since 25 August, and all four
   conflict pairwise on `nav-items.tsx` if any of them lands first. I have not
   closed them myself.
2. **Nothing blocking.**
