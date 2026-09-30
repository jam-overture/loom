# 2026-09-29 — "How did it get here?"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` phase 3, the first
half: versions, and the progression.**

**Branch:** `portal-41-how-it-got-here` (→ `main`), cut from `main` at `8db2cfb`.
Not stacked. `main` was not pushed to.

**No open pull request of this lane's** when this was cut — `gh pr list` is
empty for the whole repository — so `docs/routines.md` step 3's *push onto the
branch you already have open* did not apply. **No maintainer comments to
address**, on any pull request.

---

## What shipped

A seventh view of one page, in the strip every scoped screen already carries:
**`/portal/pages/[treeId]/versions`**, labelled *How did it get here?*

It draws the page **at every version it has ever been**, from the day it was
created to now — and plays it. One button, *Watch it change*, jumps to the
oldest version the screen holds and runs forward to the newest, one version per
frame.

| | |
| --- | --- |
| `_lib/progression.ts` | new — folds the record into one tree per version, keeps the newest window of them, and stops rather than stepping over a gap |
| `versions/page.tsx` | new — the screen, and its four states |
| `versions/_components/version-player.tsx` | new — the stage, the scrubber and the one obvious action |
| `versions/_components/version-note.tsx` | new — what made this version, in sentences, with the operations one click down |
| `_lib/page-views.ts` | a seventh view, and a `scoped` address for the two views that name their page in the path |

---

## Visuals

Two kinds, and the difference between them is a finding rather than a detail.

### The deployment, photographed for real

A production build, photographed by a server the harness started
(`built 2026-09-29T17:58:36.140Z`), in a signed-in browser.

| | |
| --- | --- |
| [**the empty state**, wide](2026-09-29-portal-how-it-got-here-empty-wide.png) | `1280×900@2x`, `scrollWidth 1280 / innerWidth 1280` |
| [**the empty state**, on a phone](2026-09-29-portal-how-it-got-here-empty-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

This is the real screen on the real deployment, and **the empty state is all it
can show**, because the seeded page has never been changed. The brief singles
out the empty state as where a new person actually starts, so it is worth
looking at on its own terms: it says what the screen is, says plainly that
there is nothing to play, and gives the one thing that would put something
here.

### The player, with a record to play

**These are not screenshots of the deployment and must not be read as ones.**
They are the screen's own components — `VersionPlayer`, `VersionNote`,
`PageViews`, `ScopedLead`, the real `pageViewLabel` — rendered outside Next
against a fixture record, wearing the deployment's own built stylesheet and its
own font, and served from the same origin so both resolve. The trees are folded
by the real `foldVersions` from the deployment's real starting shape.

| | |
| --- | --- |
| [**version 0** — where the page started](2026-09-29-portal-how-it-got-here-v0-wide.png) | the headline reads *Loom*; the notice says nothing had happened to it yet |
| [**version 2**](2026-09-29-portal-how-it-got-here-v2-wide.png) | the same page, now headed *Autumn arrivals*, with a line under it that did not exist two versions ago |
| [**version 4** — the newest](2026-09-29-portal-how-it-got-here-v4-wide.png) | the card added, the original line gone, and *This is the newest one.* |
| [**version 2**, on a phone](2026-09-29-portal-how-it-got-here-v2-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

Why it had to be done this way is the second finding below, in full: **no page
on this deployment has a second version**, and the honest ways to give one all
belong to the maintainer rather than to this run. The alternative was shipping a
progression with no picture of a progression, which fails the one thing this
surface's brief asks — that it be judged by eye.

The generator that wrote those three pages was a temporary file in this lane and
**is not in the diff.** `git status` is clean of it and of the `public/`
directory it wrote into.

---

## The decisions worth reading

### It folds with `applyDelta`, not with `replayTree`

`replayTree` is the published fold and the obvious call. It returns two things:
the tree, **and an id history derived from a seed the caller has promised is
revision 0** (0028, 0038). A progression needs a tree per step, which means
handing it a tree from the middle of the record — and the second half of its
answer would then be a claim that is not true: ids that arrived with a later
change would be reported as original.

Passing a function a wrong premise and ignoring half of what it says back is
worse than using the smaller published function underneath. `applyDelta` is one
change onto one tree, which is exactly what a step of a progression is, and it
is on the package's own entry point — 0018 satisfied where a host reaches.

The consecutiveness check `replayTree` performs is kept, because it is what
separates *a page with a gap in its record* from *a page*. It is one comparison,
not a reimplemented fold. **This is not an auditor**: whether the record still
produces what is being served is `auditSnapshot`'s verdict and
`/portal/checkup`'s screen, and when the fold will not go further this screen
stops, says where, and sends the reader there.

### The window is contiguous, at the newest end, and says so

Every version is a whole tree in the payload, which is what makes it playable —
the same decision `picked-parts.tsx` argues at length, and the only one that can
be played at all: a round trip per frame is a slideshow that buffers.

That puts a ceiling on it (24), and the ceiling is a **window**, not a sample. A
sample has holes, and a hole is indistinguishable from a page that jumped —
which is the one thing `docs/portal.md` phase 3 forbids by name. The window says
how large a life it is a window into, so nobody is shown eight versions of a
page that has had ninety and left to assume that is all of them.

`newest` is read from the record's last entry rather than from the fold, and the
difference is the whole reason it is a separate number: **a fold that stopped
holds everything before where it stopped**, so the newest picture is not the
page's newest version, and a screen that took the last drawing for the page
would be the quietest possible lie about it.

### It says "the newest one", never "what is being served"

The obvious caption under the last frame is *this is your page as it is being
served*. It is the same thing on a page whose record adds up, and it is **not
the same claim** — every picture here is folded from the record, and whether the
record still produces what is actually being served is the question
`/portal/checkup` exists to answer. Asserting it would be this screen telling a
reader the one thing it cannot check.

### Names come off both sides of the change, which only this screen can do

`/portal/history` names the parts in a sentence from the page **as it stands**,
and recovers a part a change *deleted* by inverting the record, because that is
all it has. Here the version before the change and the version after it are both
in hand, so a deleted part is named from the version that still had it — no
inverse, no second walk. The order matters: the tree the change produced comes
first, so a part it renamed is called what it was renamed **to**.

### It must not smooth, and that is pinned rather than reviewed

A version is a discrete state and anything between two of them is a picture of
something that never existed. So there is no transition, no cross-fade, no tween
anywhere near the stage — and `version-player.test.tsx` asserts that over the
component's own source, because a cross-fade is the first thing anybody would
reach for to make this feel finished.

### It is a screen, not a control on the page screen

`/portal/pages/[treeId]` is where a reader asks for a change, and everything on
it — the outline, the parts you picked, the box you type in — addresses into the
page **as it stands**. A version selector there would make every one of those
ambiguous, and the first person to pick a part at version 3 and ask for a change
would be asking about a page nobody is being served. So this screen has no way
to ask for anything, and its reading-order test pins that.

### The one obvious action

It opens on the **newest** version, because that is the page a reader
recognises. So the primary action is not *play* in the middle of a timeline — it
is *Watch it change*, which goes back to the beginning first. A button that ran
from wherever the slider happened to be would do nothing at all on the version
the screen opens on, which is every reader's first press. One button through all
three of its states, where the reader last pressed.

---

## Plain language: what was named, and what moved behind a disclosure

The high-schooler test, applied to this screen: *what happened* — my page used
to look like this, and here is each step. *What do I do next* — press the button
and watch it, or drag the slider; and if nothing has happened to the page yet,
open it and ask for a change.

| named | rather than |
| --- | --- |
| **How did it get here?** (route `…/versions`) | anything with *replay*, *revision* or *snapshot* in it |
| *Every version of X, drawn as it actually looked* | a description of a fold |
| *Version 3* · *The newest one is 4.* | `revision 3 of 4` |
| *This is where the page started. Nothing had happened to it yet.* | `revision 0` |
| *This is as far back as this screen goes.* | a window boundary stated as a number |
| *We can't rebuild the earlier versions of this page.* | `no seed — cannot replay` |
| *We can't rebuild this page past this point.* | `revision-gap: expected 2, found 3` |

Behind a disclosure, and nothing dropped: the runtime's own name for the version
(`revision 4`), **the delta's operations themselves**, and the exact reason a
fold stopped. The operations are on no other screen in this portal — the history
screen carries the inverse, and this carries the forward operations beside the
picture they produced.

A `PlainLine` reaching a reader through `PlainSentence` and no other way is
enforced lane-wide already; this screen adds no exception. One weakness in that
vocabulary was found by looking at this screen and is filed rather than fixed —
see findings.

---

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What their page looked like before, which exists nowhere else at all.**

A page in Loom was never written as markup. There is no file to check out at an
older commit, `git log` has never seen this page, and the build log has exactly
one version of it. The states only exist as a record of changes, and the only
way to look at one is to fold the record and draw the result — which is what
this does.

And the sharper half: **the page becoming itself, played.** *What did my
headline used to say, what did this card replace, when did that paragraph
appear* are questions every deployment has and no repository can answer for a
page nobody wrote. A diff of a delta can tell you a heading's text changed; only
this can show you that the page then had two headings in a row.

---

## Tests

`pnpm verify` **green, exit 0**, read from a file written by the last command on
its own line, on a `.next` and a `dist` deleted first — `docs/routines.md`'s
rule, and the compound-command trap it names is the reason nothing follows the
gate on that line.

| | `main` at `8db2cfb` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 167 files / 3,280 | **167 / 3,280** — untouched |
| `@loom/app` | 328 / 5,719 | **332 / 5,758** |
| findings | 884, 0 malformed | **886**, 0 malformed |
| prerender | not measured | **118 pages, 1,304 junctions**, 0 run together; 3 metadata conventions, 0 unserved |

**39 tests added, none weakened, none skipped.** `git diff origin/main -- src/ tools/`
is empty, so the framework figure is `main`'s by construction.

The `main` app figure is this branch's measurement less the four files and 39
tests this diff adds — **arithmetic rather than a second reading, and said so
rather than presented as one.** It happens to be arithmetic that was also
measured: a full app run taken earlier on this branch, with the strip's edits in
and the four new files not yet written, read exactly `328 / 5,719`.

The prerender figure was **not** taken on `main`, and is stated as this branch's
alone rather than implied to be a comparison. The new route is under the portal's
`force-dynamic` segment, so it is served per request and contributes no
prerendered page — which the count is consistent with and does not prove.

### `pnpm verify` was red once, on typecheck, and the exit file is why I know

The first full run came back **`EXIT=2`** in the file, while the harness's own
notification for the same command said exit code 0 — the compound-command trap
`docs/routines.md` names, in its third spelling, arriving on a run that had read
the rule that morning. The file was written by the last command on its own line,
the file was read, and the two disagreed.

What was red: four `TS6133`/`TS2352` errors in the new test files — two unused
type imports, one unused `screen`, and an operation array cast rather than
parsed. `apps/loom` typechecks with settings the root does not, and the earlier
targeted `tsc --noEmit` I had run passed because the files did not exist yet.
Fixed and re-run from a deleted `.next` and `dist`; the numbers above are that
second run.

Where they went:

- `_lib/progression.test.ts` — **14, new.** The fold, over the deployment's real
  starting shape rather than a hand-written tree: a page with no changes is one
  version and not zero; each version is a *different* tree; a gap stops it; a
  change that will not apply stops it; the window keeps the newest run and drops
  from the oldest end; a record longer than one page is followed to its end.
- `versions/_components/version-player.test.tsx` — **13, new.** Every assertion
  about the picture compares **what the page says** at two versions rather than
  probing an attribute, because a player that drew the same frame twice is
  exactly what a smoke test cannot see. Plus the playback, the stop, and the
  no-tween sweep over the component's own source.
- `versions/_components/version-note.test.tsx` — **7, new.** The provenance join
  asserted as one sentence rather than as three clauses, because the failure it
  guards is a dropped clause; and the record proved to be behind the disclosure
  by stripping every `<details>` and re-running the lane's own plain-language
  check over what is left.
- `versions/reading-order.test.ts` — **5, new.** Including this screen's own
  addition to the lane's rule: **a qualification comes after the thing it
  qualifies** — *these are the most recent twelve of ninety* and *we can't
  rebuild it past here* are both only true of the pictures above them.
- `_lib/page-views.test.ts` **+3**, `_components/page-views.test.tsx` — updated
  for a seventh view, and its `routeExists` helper taught that a scoped page
  link may have a segment after the id. Bounded so it cannot turn `/portal/pages`
  itself into a dynamic segment, with both the new route and a route that does
  not exist asserted.

One existing test caught a real mistake rather than needing a change: *hand-builds
no scoped link to another view of the same page* failed on the first draft, which
had written `/portal/checkup?tree=…` by hand in an action link. It goes through
`pageViewHref` and carries `pageViewLabel`'s words now — which is better than
what it replaced, and is the guard doing exactly its job.

---

## Findings

**Filed two, closed none.**

1. **A sentence about a change can name one part and the second is always a bare
   id**, because `PlainLine` has one subject by construction. Found by
   photographing this screen; it is the same sentence `/portal/history` has drawn
   for weeks. The parent's name is already in hand on both screens and neither
   can use it. Two honest shapes are written down and one is recommended; filed
   rather than fixed because it widens a type six components render through,
   which is a unit of its own.
2. **The deployed portal has no page with a history**, so six of its seven
   screens are empty by construction and this one cannot be photographed at all.
   Why this run did **not** simply seed one is the load-bearing half: a revision
   carries provenance — who asked, how sure, who said yes — and none of it would
   be true, which is the fabricated-record class `Loom marketing` caught in
   structured data on 27 September, in the fields a reviewer is being taught to
   rely on. It would also be a second caller of `portalStore.append`, in the
   module whose whole job is that there is one. Three ways out, one recommended,
   all of them the maintainer's call.

---

## What I did not do

**No decision record.** `docs/portal.md` phase 3 is approved and nothing here
contradicts an `Accepted` record. The two records this phase touches — 0199 and
0200 — are `Proposed` and neither is needed by this: nothing on this screen is a
lever, nothing measures anything, and nothing moves a node by hand.

**Not the third question.** Phase 3 asks three — *what it looks like*, *what it
looked like*, *what it would look like* — and this is the second. **What a held
proposal would do to the page** is the review queue's most-asked question and it
belongs beside the queue rather than beside the history: it is the same mechanism
and a different screen, and putting both in one pull request would have made
neither reviewable. It is the recommendation below.

**I did not touch `src/`**, and found no framework gap — `applyDelta`,
`renderLoomTree` and the store's forward read were all already published, which
is the third consecutive phase of this plan where the answer was assembly.

**I did not edit another surface's route group.** Nothing outside
`apps/loom/app/(portal)/`, `FINDINGS.md` and `reports/` is in the diff.

**I did not seed a history**, for the reason in finding 2, and I did not leave
the generator that produced the fixture pictures in the repository.

**Nothing is scheduled and no pull request is subscribed to.**

---

## Recommendations

1. **Phase 3's other half next** — *what it would look like with this proposal
   applied*, on the review queue. The mechanism is the one this change just
   built: a tree the record produced rather than the head, drawn. It is the
   queue's most-asked question and has never been answerable by eye.
2. **Finding 2 is a decision, and it is yours.** Every record screen in the
   portal is empty on the preview you open, and the one that is least
   defensible is the one this run just built. My recommendation is a one-off
   script you run through the real write path against a real `DATABASE_URL`:
   the record is then true because the changes really were proposed, judged and
   accepted, and it costs a few model calls once.
3. **`completed`, for `Loom daily build`** — signals step 2, approved 13
   September, still unbuilt, still the difference between measuring attention and
   measuring outcome. Fourth report in a row to say so.
