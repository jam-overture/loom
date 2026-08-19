# 2026-08-18 — what a change replaced

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-04-what-undoing-restores` (→ `main`).

Visual: [three history rows carrying what their inverse would restore](2026-08-18-portal-what-a-change-replaced.svg)
([png](2026-08-18-portal-what-a-change-replaced.png)). The copy is the exact text
the components emit; the ids and timestamps are illustrative, because the durable
store on the preview holds no revisions yet (see recommendations).

---

## Where this run started

`main` at `6b129ab`. **No open pull request of mine** — #88, #89 and #90 are the
framework and lessons routines' and none touches `apps/portal`. I read the
comments on #87, my last merged PR: Vercel's bot and my own. **No maintainer
comment was outstanding on my lane**, so the findings queue and the plan decided
the work.

Branched with `git fetch origin main && git checkout -b … origin/main`, which is
the finding I filed on 16 August rather than the procedure's wording. It mattered
again: the local `main` ref was four merges stale for the third run running.

This is the unit the previous two runs pointed at. #80's comment asked for
"calibration, then history"; the 17 August calibration run ended *"Next from me,
unless you redirect me: history … the one I would build against is what a
revision's inverse would undo, which is a fact the log holds and never shows."*
The corrected brief names it directly: *"History — what a revision replaced, what
its inverse would undo."*

## What I found before building, which shaped the unit

**`/history` already exists and is good.** It reads the log directly, pages from
the newest end, anchors a named revision, reads both ways, and offers undo on
every revision — an ordinary held-or-refused proposal (0032), with a box, a tree
chooser, and an explained empty state.

So the honest question was the calibration run's question turned on a different
page: **what does a revision row still not tell anyone?** The row lists the
*forward* delta — "reconfigure `n_c4`: variant", "delete `n_c4` and everything
under it", "move `n_w` into `n_p` at 2". Every one of those drops the same thing:

- a `configure` records the value it **set**, never the one it **wrote over**;
- a `remove` records the **id** it deleted, never the **subtree** that went with it;
- a `move` records the **destination**, never the **origin**.

That "before" side is gone from the tree as it stands now. Unlike a diff in
`git log`, which carries both sides of every change, Loom's delta model stores
only the new one — deliberately (0016). The old value is recoverable **nowhere
but the log, read backwards and inverted**. That is exactly the fact the brief's
bar asks for, and it was being thrown away on every history render.

## What shipped

**Each revision row now carries what its inverse would restore, and what undoing
it would cost — read before anyone presses undo.**

`lib/reversal.ts` turns a revert plan into the reading a reviewer needs. The
inverse is **not recomputed**: `planRevert` already reads the log forward from a
seed, inverts the target against the tree it observed, and reports what later
work an undo would write over (0035). The portal **consumes** that plan rather
than repeating its walk (0018) — the same plan the undo button applies, read as a
preview instead of a click.

### What a restoration says

`describeRestoration` reads each inverse operation as what undoing does, pulling
the displaced content onto the line — which is the whole reason to show the
inverse rather than the delta already above it:

| the row shows (forward) | the reversal now adds (inverse) |
| --- | --- |
| `reconfigure n_c4: variant` | `restores n_c4 — variant to “outlined”` |
| `delete n_c4 and everything under it` | `restores n_c4 — loom.card, with the 4 nodes it held, back into n_page` |
| `move n_w into n_p at 2` | `moves back n_w — into n_q at 5` |

The reconfigure line names the value that no longer exists in the tree; the
removal line names the type and size of the subtree that was destroyed. Neither
is in the delta the row already shows. Both are read straight off the inverse the
runtime computed.

### What undoing would cost, before the click

A revertable plan carries the revisions a contested undo would write over (0035).
The note states it in the reviewer's words — *"It writes over what revisions 9,
11 did to nodes it touches, so a person has to confirm it"* — because finding
that out **after** the click is finding it out too late. A change that cannot be
undone at all (a seed this host cannot reach back to, a log that no longer
replays, a delta that will not invert) shows its reason and **the row hides the
undo button** rather than leaving it to fail on a press (0019). Where no reversal
could be read — no seed, or the log itself unreadable — the row falls back to
exactly what it did before: offer undo, answer on the click.

## Tests

**24 new tests. The portal was at 522 and is at 546** across 52 files.
Runtime: **1247 passing, 1 skipped** across 89 files, untouched by this diff.
`pnpm install && pnpm verify` green — typecheck, both suites, `next build`.
Nothing weakened or skipped.

| file | what it pins |
| --- | --- |
| `lib/reversal.test.ts` (16) | each inverse op read as a restoration — the subtree a removal brings back and how much came with it, the prior value a reconfigure restores, the origin a move returns to, a container value previewed by size; the three blocked outcomes each saying which; and **end to end against a real seed, store and inverted log**: a reconfigure restoring the seed's own `"outlined"`, a removal restoring the card and its four nodes, a contested undo naming the later revision, and a revision past head reading as out of range |
| `app/history/_components/reversal-note.test.tsx` (5) | the restore lines in the plan's order; the contest warning naming the revisions and asking for confirmation, and staying absent for a clean undo; an empty restore reading as "restore nothing"; a blocked reason shown with no list |
| `app/history/_components/revision-row.test.tsx` (+3) | a revertable reversal shows the preview and keeps the button; a blocked one hides the button and shows the reason; no reversal falls back to the button alone |

The end-to-end tests are the ones worth reading twice: they build real revisions
through the store's append path and assert the reversal describes what actually
happened, so a wrong seam or a mis-inverted delta fails them rather than passing a
fixture that agreed with itself.

## What this tells a developer that they could not get elsewhere

The bar, answered for this unit:

- **The value a change replaced.** **Yes, and it exists nowhere else.** The tree
  holds the new value; `git log` and a build log never saw the tree at all; the
  old value lives only in the log, inverted. A reviewer deciding whether to undo a
  reconfigure could not, before this, see what undoing it would set the prop back
  to. Now the row says it.
- **What a removal destroyed.** **Yes.** "delete `n_c4` and everything under it"
  is all the delta keeps; the subtree is gone. The inverse carries it, so the row
  can say it was a `loom.card` with four nodes under it — the thing undo would
  bring back.
- **Whether undoing is clean, contested, or impossible — before acting.** **Yes.**
  The undo button already answered this on the click; a reviewer needs it *before*
  the click, because writing over later work (0035) is precisely the case where
  the click is the mistake.
- **The forward delta, the ids, the paging.** Craft, and already there. Not
  claimed as new.

## What I did not do

- **The `data-unavailable` diagnostic** the framework routine's data-seam finding
  offers the portal. Still open, still unurgent, not this unit.
- **A demo-fed journal**, the finding I filed on 17 August that would make
  `/history` (and the telemetry pages) demonstrable to a signed-out visitor.
  Deliberately not folded in — it is its own unit and this run was already one.
  It is the reason the visual is a faithful render rather than a live screenshot;
  see recommendations.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. 0018 holds — `planRevert`, `invertOperations` and the
  tree helpers all came from `@loom/runtime` and `@loom/runtime/store` root entry
  points, no deep import was wanted, `src/` is untouched. 0019 holds — this makes
  a change more reviewable and adds no way to author one. 0016 and 0035 are what
  it reads.

## Recommendations

1. **`/history` cannot be looked at with real data on the preview, and it is the
   same wall calibration hit.** The page requires an actor, the seeded tree starts
   at revision 0 with an empty log, and the demo does not feed the durable store —
   so there is no path by which you or a PR reviewer can open a populated
   `/history`. The 17 August finding I own (*let the demo keep a journal*) would
   close this for the telemetry pages; a sibling of it — **letting a signed-out
   visitor write to a demo-scoped durable tree** — would make this page
   demonstrable too. I would build that next unless you redirect me, because three
   of the portal's best pages now share one reason nobody outside this repo has
   seen them work.
2. **Nothing blocking.** The reversal reads one revert plan per shown row — one
   bounded read each, on a review page, which is the trade 0041 already made for
   attribution. On a host whose log grows long, that per-row cost is the case for
   a batched plan; filed as a finding rather than worked around, because
   reimplementing `planRevert`'s walk in the portal is the insider move 0018
   forbids.
3. **The two open findings I own from earlier runs** (the stale-`main` branching
   wording, the private-repository image problem) are yours and unchanged. The
   visual here is an SVG for the second reason.
