# 2026-09-06 — "Your page has a name"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`), continued rather than
branched again. See *Why this is not a new branch* below.

Visuals — the real screens, from a production build of this commit, in a
signed-in browser, against a page **a live model changed during this run**:

| | |
| --- | --- |
| [The page — headed by its own name, with the id under it](2026-09-06-portal-your-page-has-a-name.png) | 1280px |
| [Your pages — a row a person can recognise](2026-09-06-portal-your-page-has-a-name-list.png) | 1280px |
| [The front door — which page a waiting change is waiting on](2026-09-06-portal-your-page-has-a-name-front-door.png) | 1280px |
| [Does it add up? — the chooser](2026-09-06-portal-your-page-has-a-name-checkup.png) | 1280px |
| [History — the chooser, on a fresh deployment](2026-09-06-portal-your-page-has-a-name-history.png) | 1280px |
| [a phone](2026-09-06-portal-your-page-has-a-name-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing was staged. Two requests were typed into the real prompt
box against the seeded tree — *"Change the heading at the top of the page to say
Autumn arrivals"* and *"Make the intro paragraph warmer and mention free
returns"*. The Gate applied the first on its own and held the second, and every
name in every screenshot is what the portal derived from what actually happened.
The history screenshot is a fresh server, so it shows the seed at revision 0 and
its original name — which is why the two disagree, and it is the point.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227, #234,
#240 and #245 carry only the deployment bot's comments and this lane's own. So
the plan decides, and the plan is the 18 August redirection: *name things after
what a person wants, not after the runtime's internals.*

The specific work was named by my own last run, as a finding it deliberately did
not act on:

> **The portal's most-read heading is a machine identifier.**
> `/portal/pages/[treeId]` renders `<h1>{treeId}</h1>` — `t_seed1`, the largest
> text on the busiest screen. Every other heading in the portal has been
> rewritten into a person's words; this one cannot be, because **a tree has no
> name**. Vercel puts the project's name there and Loom has nothing to put.
> There is a cheap half a portal run can take — say what the reader is looking
> at with the id beside it rather than instead of it — and it belongs to the run
> that rewrites that screen.

This run is that half, and it turned out to be more than the finding expected.

## The idea

A tree has no name **field**, and adding one is a tree-schema change — so that
half is still architectural and still not taken. But a page already says what it
is called: **its own leading heading.** Reading that is a derivation over
content the portal has already read, which is exactly the move
[0041](../decisions/0041-authorship-is-derived-from-the-log-not-carried-on-a-node.md)
made for authorship — derived from what is there rather than carried on a node.

So `_lib/page-name.ts` answers one question: *what is this page called?*

- The first `loom.heading` in document order, its text joined, whitespace
  collapsed, cut at 60 characters. **First**, not highest level: a page whose
  opening heading is a level 3 is a page whose author put that text at the top,
  and a visitor meets reading order rather than heading levels.
- No heading, or an empty one → **"Untitled page"**. Not the id, and not blank.
- A page the store could not read → the same, with its id. **A row is never
  dropped for want of a name**: a row that vanished on a transient store error
  is indistinguishable from a page that is gone.

### The rule the whole unit is built on

> **The name never replaces the id.**

The portal printed only the id for a fortnight. The failure mode of the fix is
printing only the name, and it is the worse of the two — an id a reader cannot
see is an id they cannot paste into a URL, quote in a support thread, or match
against a log line. 22 August settled that identity is not technical detail, so
it does not go behind a disclosure either.

`_components/page-name.tsx` is what makes that mechanical: one component, both
halves, in a fixed order — the words first, the identifier under or after them,
quieter and in monospace. Every screen renders it rather than spreading two
values by hand, so "we dropped the id on this one screen" is not a thing a
future edit can do by accident.

## What changed on screen

| Screen | Was | Is |
| --- | --- | --- |
| `/portal/pages/[treeId]` | `t_seed1`, 24px monospace, the largest text on the screen | **Autumn arrivals**, with `t_seed1` under it |
| `/portal/pages` | rows led by `t_seed1` | rows led by the page's name, id under it |
| `/portal` (front door) | *"ana@loom.local asked for this · `t_seed1` · waiting since…"* | *"…· Autumn arrivals `t_seed1` · waiting since…"* |
| `/portal/history` chooser | rows led by `t_seed1` | name, id under it |
| `/portal/checkup` chooser | rows led by `t_seed1`, checkable and not | name, id under it, both kinds |
| `/portal/pages/[treeId]`, render failed | `<h1>t_seed1</h1>` over a notice headed *"We couldn't draw this page."* | `<h1>We couldn't draw this page.</h1>`, id under it |

That last row is the one exception and it is deliberate. Everywhere else a page
is headed by what it is called; a page that would not draw **has not told us what
it is called**, and heading it with an id was the portal's largest text saying
the least it could. What a reader needs first there is what went wrong.

### A guard, so this cannot come back

`every-screen.test.ts` already checked that no heading in the lane is written in
lower case, and it *skipped* headings whose text is an interpolation — filing
the skip as a finding, because "a heading that is only a name" is a different
problem from "a heading in the wrong case". That finding is closed by a second
rule over the same enumeration: **an `<h1>` may not interpolate anything whose
name says it is a tree id.**

The check is on the expression rather than on what it evaluates to, which is all
a source read can see — and that is precisely why `PageName` has two fields. The
words a person reads are `name` and the identifier is `treeId`, so a screen
cannot reach for the wrong one by accident, and a rewrite that puts the id back
into a heading has to type the word `treeId` to do it.

## Why this is not a new branch

The 28 August closure finding carries a maintainer instruction:

> Before starting a unit, check whether you already have an open pull request.
> If you do, **continue it rather than branching again from `main`**.

This lane has five open pull requests and #245 supersedes the other four. A
sixth branch cut from `main` would have been a sixth. So this unit is two
commits on `portal-23-four-units-one-tree`, and #245's description now covers
both halves. Nothing was rewritten and nothing was rebased.

`main` has not moved since #217 on 5 September, so the branch is current with it.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — build, typecheck, both suites,
and `next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 174 | 2780 |

**33 net new tests across 6 files**, two of them new. The counts below are
measured, before and after, on each file:

- **`_lib/page-name.test.ts` — 16, new file.** The derivation: the seed's own
  heading, the first heading rather than the highest level, a heading nested
  inside a card, a heading split across two text nodes (which is how the
  renderer joins them), collapsed whitespace, truncation that does not leave a
  space before the ellipsis, and the three ways a page can have no name. Then
  `namesOf` against a real `memoryTreeStore`: every id asked about is in the map,
  and **a page that could not be read is named rather than left out** — the
  assertion the whole failure story rests on.
- **`_components/page-name.test.tsx` — 7, new file.** Both halves present in
  both layouts, in order; the exact string in the inline one, because a lost
  space between two spans satisfies every `toContain` anybody would write;
  neither half inside a `<details>`; exactly one monospace span, and it is the
  id.
- **`preview-frame.test.tsx` — 2 new (12 → 14).** The heading is the name and
  does not contain the id; the id is still in the DOM and not in a disclosure;
  an untitled page is headed "Untitled page" and still shows its id.
- **`checkup-choices.test.tsx` — 2 new (7 → 9).** A row leads with the name and
  keeps the id under it; a page the chooser could not name still lists, still
  links, and still shows its id.
- **`waiting-card.test.tsx` — 2 new (6 → 8).** Name before id on the meta line;
  an unnamed page still identified.
- **`every-screen.test.ts` — 100 → 103.** Two of those are the lane-wide rule
  above and the guard that its enumeration found something to check; the rest of
  the movement is the enumeration itself, which grows a row per source file in
  the lane — this run added one.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to five screens this run. From the front-door screenshot, unaided:
*Someone asked Loom to make the intro warmer and mention free returns, on my
Autumn arrivals page. It wrote the change but stopped to ask me, because it was
sure enough to suggest and not sure enough to do on its own. If I say yes it
makes the change and I can undo it; if I say no it's thrown away. I should open
the page and look.*

The sentence that changed is the third one. It used to say "on `t_seed1`".

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What the page you are being served currently calls itself — and that it
changed when the AI changed it.**

This is not a label somebody typed into a settings screen; there is no such
screen and no such field. It is derived from the tree at its head revision, so
it is the name a visitor is reading right now. In the screenshots above it moves
from *Loom* to *Autumn arrivals* because a model rewrote the heading and the
Gate applied it — one request, one revision, one new name, none of it in any
file in the repository. `git log` cannot tell you a page's current title when
the title was never written as markup.

The honest smaller half: the name is not new *information* — it is on the page,
and the page is on the screen right below it. What it changes is whether the
facts that **are** unique to Loom — which change is waiting, which rule refused
one, where confidence has been miscalibrated — are attached to something a
person recognises. A refusal nobody can read is not an advantage, and neither is
a queue of changes waiting on `t_seed1`.

## What I looked at and left alone

The page screen now prints "Autumn arrivals" twice within 180 pixels: once as
the portal's heading, once as the first line of the page itself, directly below.
On 29 August I removed a repetition exactly like this one. This one stays, and
the difference is worth stating: those four printings were **four copies of an
id**, none of which told a reader anything the one above it did not. These are
two different objects — the portal saying which page you are on, and the page
itself. That they read the same is the derivation working, and it is what Vercel
does with a project name above a preview. If the page's heading changes, the top
line changes with it, which is the behaviour.

## What I did not do

- **`src/` is untouched.** The one thing I wanted from it is a finding, not a
  fix: a primitive cannot declare that it carries a page's title, so
  `TITLE_TYPES` in `page-name.ts` is a hard-coded `["loom.heading"]` and every
  host deriving a page name will write that array again. Filed.
- **No decision record.** Deriving a display name from content changes nothing
  about the tree schema, the delta model, or any Accepted record. **Naming a
  tree properly still does**, and that stays where my last run left it:
  architectural, unwritten, not started.
- **The four scoped screens still name the page by its id in their lead
  sentence** — *"Everything anyone has asked Loom to change on `t_seed1`"*.
  `scopedLead` builds a `PlainLine` whose subject is the id, and giving those
  four the name means a store read on each. It is the obvious next unit and it
  is deliberately not bundled into this one.
- **No count, no badge, no new screen.** The unit is one question answered
  everywhere it is asked.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #245.** It is now five units, green, and the queue behind it has not
   moved since 5 September. Close #219, #227, #234 and #240 in its favour.
2. **Nothing blocking.**
