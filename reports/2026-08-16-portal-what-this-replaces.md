# 2026-08-16 — a held proposal says what it would replace

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-02-what-this-replaces` (→ `main`).

Visuals: [the page and the record](2026-08-16-portal-what-this-replaces-page.png) ·
[an insert, placed by its neighbour](2026-08-16-portal-what-this-replaces-insert.png) ·
[a removal, and what goes with it](2026-08-16-portal-what-this-replaces-removal.png) ·
[a hold the tree has moved past](2026-08-16-portal-what-this-replaces-stale.png).

---

## Where this run started

`main` at `3a1e419`. **No open pull request of mine** — #76 and #77 are the
framework and lessons routines' and neither touches `apps/portal` — so there was
no maintainer comment outstanding on my lane. I checked before branching.

**The maintainer's gradient task is done and merged.** `--surface-wash` is gone,
`--surface-page` is `#ffffff`, and `app/globals.test.ts` pins it; that was #72 on
15 August. Nothing was left of it to do, and this run did not reopen it.

**The demo has landed, so the brief's blocked half is open**, which is what this
run is. The brief says the portal's highest-value work waits on §4b and to
re-read the brief when it arrives; #71 merged on 12 August, the previous portal
report and two `FINDINGS.md` entries all say so, and the previous run's third
recommendation named where to start: *the review queue over the demo's tree*.
That is what I built.

## The trap this run fell into first, and it is worth everyone's attention

I branched with `git checkout -b portal-02-… main` — the procedure's own words —
and got a tree **four merges old**. The container had cloned at a detached
`3a1e419` while the local `main` ref still pointed at `7f7b615`, four merges
behind (#72, #73, #74, #75 all missing). Nothing warned me.

What that looked like from inside was alarming and wrong: `globals.css` had the
gradient back, `globals.test.ts` did not exist, and the honest reading of the
evidence was *the maintainer's first task had been reverted on main*. I was one
step from filing that as a finding. `git fetch origin main` and
`git log --oneline -3 origin/main` settled it in a minute.

It is filed below, because a routine that builds against a stale `main` produces
a diff that conflicts with work it never saw, and the failure is completely
silent. **`git fetch origin main` before branching, and branch off
`origin/main`.**

## What shipped

**A held proposal now shows what it would replace, against the tree in front of
the reviewer.**

Before this, the review queue showed a hold's rationale, its stakes, its
confidence, its policy, the Gate's reason — and, for the change itself,
`changes: reconfigure, add`. That is the delta's *shape*. A reviewer being asked
to approve a change could not see:

- what value is there now, only what would be written over it,
- how much a `remove` actually takes — it names one id and destroys a subtree,
- where an `insert` lands, beyond an integer index into a child list nobody has
  in front of them,
- whether the proposal would still apply at all.

The tree holds the other half of every one of those sentences, and the portal is
the only place both halves are in hand. `lib/proposal-effect.ts` puts them
together.

### Per operation

| operation | what it now says |
| --- | --- |
| `configure` | each key as `before → after`, with **not set** and **cleared** rendered as different things from `""` |
| `remove` | the node's label, its place, how many nodes go with it, and the words it takes off the page |
| `insert` | what lands, how many nodes it brings, and *before which sibling* — a place rather than a coordinate |
| `move` | out of where, into where, and at which position |

Every node is named by its label and its path (`loom.page › loom.card`), never by
the minted id the delta carries. An id addresses a node; it does not tell anyone
where the node is.

### Three things it says that nothing else on the card does

**"This would not apply."** Read from `applyDelta` rather than re-derived, so the
portal cannot disagree with the runtime about applicability. A hold answered
against a tree that has moved is refused, and a queue that only says so *after*
the click has spent the reviewer's decision on nothing. The stale case names the
distance: *judged against revision 0, now at 1* — the screenshot is a real hold
that a later auto-applied change moved out from under.

**"Changes nothing."** An operation that writes the value already there, or a
move that puts a node back where it is, looks exactly like a change on every
other field of the card. `inert` is computed per key and rolled up: *every
operation writes what is already there — applying this leaves the page as it is*.

**Which operation is the problem.** The walk keeps describing after an operation
that cannot be applied, marking that one `not in this tree`, because the
operations after it are what the change was *for*.

### Two decisions inside it worth naming

**The verdict and the description are produced by different means, deliberately.**
The verdict — would this still apply — is `applyDelta`'s. The description walks
the operations one at a time with `applyOperation`, so each is described against
the tree the ones before it left, which is how a delta is applied (0001). A test
pins that: a delta that inserts a node and then configures the node it just
inserted describes the second operation correctly.

**The buttons stay live when the effect says it would not apply.** This page is a
snapshot too, and confirming re-runs the Gate server-side against the tree as it
is at that moment. Disabling the button on the strength of a read that may be a
minute old would make the portal the authority on applicability, which 0018 says
it is not. The reviewer is told, and decides.

### Where it renders

Both surfaces where a proposal is answered, from one component:

- **the review queue** on `/trees/[treeId]` — the pane 0019 calls the portal's
  reason to exist. The effect is computed on the server against the tree that
  page rendered, not a fresh read: a "before" the reviewer is not looking at is
  worse than none.
- **the demo's record card**, for held records only. An applied change has
  already moved the tree, so describing it against the current one would report
  it as having no effect — true, and the opposite of useful. History is where an
  applied change is read, against the revision it was applied to.

**The screenshots are of `/demo`**, and that is not a convenience: with no
`DATABASE_URL` and no model key, the demo's presets are the only way to reach a
real hold, which is exactly the situation a visitor to the deployment is in. The
component in the shot is the same one the review queue renders.

## Tests

Two new files, **29 new tests** — the portal was at 455 and is at **484 passing**
across 48 files.
Runtime: **1187 passing** across 87 files. `pnpm install && pnpm verify` green —
typecheck, both suites, `next build`. Nothing was weakened or skipped.

| file | what it pins |
| --- | --- |
| `lib/proposal-effect.test.ts` (18) | before/after per key; not-set vs cleared; inert configure and inert move; what a removal carries; an insert placed by its neighbour and at the end; staleness; the obstacle in the runtime's words; each operation read against the tree the last one left; the walk surviving a failure |
| `app/_components/proposal-effect.test.tsx` (11) | the before side reaches the DOM; absence is named, not blank; the refusal is announced and precedes the operations; the tree-moved sentence is said once rather than once per vocabulary; inert wholly vs partly; row order |

`review-queue.test.tsx` was updated for the prop change (`held` → `changes`,
which now pairs each hold with its effect). Its four assertions are unchanged.

## What this tells a developer that they could not get elsewhere

The bar, answered for the one unit this run shipped:

- **The before side of a change that has not happened.** **Yes, and it exists
  nowhere else.** Not in the repository — there is no commit, and there never
  will be if the reviewer discards it. Not in `git log`. Not in the logs, because
  a held proposal is precisely the change the log does not have: it is in custody
  on the server, waiting for a person, and the tree it would rewrite is in the
  store. Loom is the only system holding both.
- **"This would not apply", before the click.** **Yes.** Staleness is a fact
  about a proposal's base revision against the tree's current one. No other tool
  is tracking either number.
- **"Changes nothing".** **Yes**, and it is the one a reviewer cannot get by
  reading carefully — a delta that writes the value already present is
  indistinguishable from a real change in every other field on the card.
- **The labels and the paths.** Craft, not information. They make the rest
  legible and I am not claiming them as insight.

## What I did not do

- **The calibration page and the history**, the other two the brief names. This
  run is the review queue; those are their own units.
- **The render diagnostics** the framework routine's `data seam` finding offers
  the portal (`data-unavailable` in `RenderOutput.diagnostics`). Still open, still
  unurgent, and not this unit.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. 0018 holds — the portal reached only published entry
  points. 0019 holds — this makes a proposal more reviewable, which is the record's
  own definition of the portal's job, and adds no way to author a change.
- **`src/` is untouched.**

## Recommendations

1. **Fix the branching instruction in `docs/routines.md`.** "Branch off `main`"
   is not safe in a container whose `main` ref is a stale clone artefact. It
   should say `git fetch origin main` first and branch off `origin/main`. Cost of
   the current wording: I nearly filed a false report that the maintainer's own
   task had been reverted.
2. **`docs/rollout.md` is still missing**, and is still named by my brief as
   read-first. Three routines have now reported it.
3. **Next from me, unless you say otherwise: the calibration page over real
   judgements**, then history. Calibration is where Loom's data is least
   substitutable — a self-graded confidence against the actual approve/refuse
   rate is not in any repository — and the demo now produces graded proposals to
   populate it.
