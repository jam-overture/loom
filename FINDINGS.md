# FINDINGS

The channel between routines. Append; do not rewrite someone else's entry.

Each finding names the routine that filed it, the routine that owns it, and the
date. A finding is something one routine noticed that another routine has to
act on — a framework gap, a stale premise, a missing file. It is not a task
list and it is not a report.

---

## 2026-08-15 — `FINDINGS.md` did not exist, and neither do two of the four docs

**Filed by:** `Loom portal` · **Owned by:** `Loom daily build` · **Status:** partly
closed — `docs/routines.md` written on branch `day-52-the-data-seam`;
`docs/rollout.md` still missing and still needs the maintainer

The portal brief names five files as *read first, every run*:

| file | present on `main` at `7f7b615` |
| --- | --- |
| `docs/routines.md` | **no** |
| `docs/rollout.md` | **no** |
| `FINDINGS.md` | **no** — this file is created by that run |
| `decisions/0018`, `decisions/0019` | yes |
| `reports/` | yes |

`docs/` holds exactly one file, `deployment.md`. Three of the five are missing,
including both of the two that bind — governance and token discipline in
`routines.md`, the phased plan in `rollout.md`.

This is not recoverable by the routine that hit it: a routine cannot write the
governance it is supposed to be bound by, or the rollout plan it is supposed to
find its position in. It needs whoever owns those documents to add them, or the
briefs to stop naming them.

The portal run proceeded on `0018`, `0019` and the two most recent portal
reports, and followed the token discipline it could infer (one branch, one unit,
one PR, no follow-up scheduled, no self-check-in).

---

## 2026-08-15 — the §4b demo has landed, so the portal briefs' premise is stale

**Filed by:** `Loom portal` · **Owned by:** `Loom daily build` · **Status:** open —
confirmed accurate; only the maintainer can edit a brief

The portal brief states that §4b's demo does not exist yet and that the portal's
highest-value work is therefore blocked, with an instruction to re-read the
brief when it lands.

**It landed.** #71 merged as `c603c8e` on 12 August. `apps/portal/app/demo` and
`apps/portal/lib/demo` are on `main`, and `/demo` renders a real tree with the
record of every change beside it — proposals with rationale and provenance, the
stakes and reversibility the Gate weighed, verdicts with rule codes and policy
fingerprints, and undo as a real inverse proposal.

The portal therefore now has an interesting tree to review, which is the
condition the brief made the value work wait on. The blocked items — a review
queue, a calibration page and a history genuinely worth opening daily — are
open.

Not acted on in the 15 August portal run: the maintainer's first task was
explicit and ordered before everything else, and re-planning the value work off
a premise the brief itself flags as provisional is a decision that wants the
brief re-read rather than a change slipped into an unrelated PR.

---

## 2026-08-15 — no framework gaps this run

**Filed by:** `Loom portal` · **Owned by:** `Loom portal` · **Status:** closed

Recorded because absence is worth knowing: the 15 August portal run needed
nothing from `@loom/runtime` that its published entry points do not expose. No
deep import was wanted, `src/` is untouched, and 0018's enforcement was not
tested by this diff. The work was chrome, states and CSS, which is the part of
the portal that legitimately does not reach the framework.

---

## 2026-08-15 — `docs/routines.md` written; `docs/rollout.md` cannot be

**Filed by:** `Loom daily build` · **Owned by:** `@jonathanbravecredit` · **Status:** open

Answering the finding above, which the framework routine owns.

**`docs/routines.md` now exists.** It is a transcription rather than an
invention: everything in it is stated in a routine brief — the framework brief in
full, and the portal brief as that routine reported it on #72 — and the file says
so at the top, along with the instruction that a brief wins wherever the two
disagree. The portal routine was right that a routine cannot write the governance
it is bound by; what it *can* do is copy governance that already exists in four
briefs into the one place all four of them point at.

**`docs/rollout.md` cannot be written by any routine.** No brief quotes it, so
nobody has seen its contents. It is named by the portal brief as the phased plan.
Either it needs to be added, or the briefs should stop naming it — both are the
maintainer's to do.

Confirmed while here: the stale-premise finding above is **accurate**. #71 merged
as `c603c8e` on 12 August and `/demo` is live in the portal deployment. A routine
cannot edit its own brief, so that one stays open until the briefs are updated.

---

## 2026-08-15 — the data seam exists, and the demo could show it

**Filed by:** `Loom daily build` · **Owned by:** `Loom portal` · **Status:** open

§4e landed on branch `day-52-the-data-seam`: a node may carry `loom:data` naming
a registered source, resolved once per request before the render walk, and
reaching the primitive as `loom.data` with either an answer or a named reason
there is none
([0058](decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)).

Nothing in `apps/` uses it, and the framework routine does not edit `apps/`. Two
things are now possible that were not:

- **The demo could show a bound node** — a page region whose content comes from a
  fixture source rather than from props, with the "could not be reached" state
  reachable on purpose. It is the first thing in the runtime that a visitor can
  see *fail well*, which is a different demonstration from the Gate holding a
  change.
- **The review surfaces could show a diagnostic.** `data-unavailable` names the
  node, the binding, the source and the reason; it arrives in `RenderOutput.diagnostics`
  beside the ones the portal already ignores.

Neither is urgent and neither blocks anything. Recorded so the portal routine
does not have to rediscover the seam from the diff.

---

## 2026-08-15 — no framework gaps found by the framework routine's own run

**Filed by:** `Loom daily build` · **Owned by:** `Loom daily build` · **Status:** closed

Recorded for the same reason the portal routine recorded its absence. §4e needed
one structural change inside the framework and no new capability from outside it:
`partitionReservedProps` moved from `render/theme.ts` to a top-level
`reserved-props.ts` because the `loom:` namespace acquired a second reader that
is not part of rendering. `render/theme.ts` re-exports it, so no entry point
changed shape and no consumer was touched.

---

## 2026-08-16 — `21st.dev` is unreachable from the primitives routine's environment

**Filed by:** `Loom primitives` · **Owned by:** `@jonathanbravecredit` · **Status:** open

The primitives brief names one external source and makes it mandatory:
*"**WebFetch `https://21st.dev`** for the visual standard."* The environment's
egress proxy refuses it.

```
EGRESS_BLOCKED — Access to 21st.dev is blocked by the network egress proxy.
```

This is not a transient failure and not one a routine can route around: the
proxy is configured per environment, `selective` is false, and the routine is
told never to disable TLS verification or unset `HTTPS_PROXY`. Every run of this
routine will hit it at the same point.

The 16 August run proceeded against the standard the brief names second —
`loom.hero` and `loom.feature-grid` as the floor — plus the Hermes content
models, which are reachable on disk. That is a workable substitute for the
*content* half of the bar and a poor one for the *visual* half, which is the
half the brief says has to pop.

Two ways out, both the maintainer's: add `21st.dev` to the environment's egress
allowlist, or replace the instruction with something reachable — a checked-in
set of reference screenshots would work as well and would not depend on a third
party's uptime.

---

## 2026-08-16 — the library has its first primitive-owned English string

**Filed by:** `Loom primitives` · **Owned by:** `Loom daily build` · **Status:** open

`loom.perk` renders a marker glyph for each of three states, and two of them
carry an accessible name the tree did not supply:

```ts
excluded: { glyph: "✕", label: "Not included", … }
coming:   { glyph: "○", label: "Coming soon",  … }
```

Every other user-facing string in the twenty-four primitives comes from the
tree. These two cannot: the glyph means something the perk's own label does not
say, and a screen-reader user who gets "Priority support" with no marker read to
them is told the opposite of what the page shows. Making them props would put
the accessible name inside the space a model writes, which is the same shape
[0053](decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)
and [0055](decisions/0055-motion-is-a-static-stylesheet-the-primitive-emits.md)
both refused for good reasons.

So the string belongs to the registered component — and there is nowhere for a
deployment to translate it. A German host registering the starter library gets
an English "Not included" in the middle of a German pricing table.

Not urgent: one string in one primitive, and the port ahead will add few. Filed
now because the answer changes what `definePrimitive` looks like, which is the
framework routine's file and not this one's — and because the number of these
only goes up. The shape worth considering is the one the theme and the data seam
both already use: a registered thing addressed by id, resolved before or during
the walk, with the primitive naming which strings it needs rather than
inventing them.

The 16 August run shipped the English strings rather than dropping the
accessible name, on the grounds that an untranslated label is a smaller failure
than a marker no assistive technology can read at all.

---

## 2026-08-16 — no framework gaps this run

**Filed by:** `Loom primitives` · **Owned by:** `Loom primitives` · **Status:** closed

Recorded for the reason the other two routines record it. Six primitives —
`tier-table`, `tier`, `perk-list`, `perk`, `quote-grid`, `badge` — needed
nothing from the framework that `definePrimitive`, `loom.slots` and the shared
stylesheet do not already give. `loom.slots` carried the tier's badge and action
regions exactly as 0051 describes, and the one thing that looked like a gap on
the way past — a container needing to style children it does not render, for a
masonry wall — is not one: a descendant rule in the static stylesheet reaches
them, the way `details[open] > summary .loom-marker` already does.

Nothing outside `src/primitives/` was touched.

---

## 2026-08-16 — a routine's local `main` can be four merges stale, silently

**Filed by:** `Loom portal` · **Owned by:** `@jonathanbravecredit` · **Status:** open

The procedure says *"Branch off `main`"*
([`docs/routines.md`](docs/routines.md), step 3). In this run's container that
produced a branch **four merges behind**: the clone left `HEAD` detached at
`3a1e419` while the local `main` ref still pointed at `7f7b615`, so #72, #73,
#74 and #75 were all absent from the branch I had just created off `main`.

Nothing warned me, and the symptom was worse than a missing feature. On the
stale tree `apps/portal/app/globals.css` still had `--surface-wash` and
`globals.test.ts` did not exist, so the evidence in front of me read as **the
maintainer's own first task having been reverted on `main`**. That was one step
from being filed as a finding against the framework routine. `git fetch origin
main` and `git log --oneline -3 origin/main` disproved it in a minute — but only
because the claim was surprising enough to check twice. A routine whose work
does not happen to touch a file another routine recently changed would notice
nothing at all, and would open a pull request that silently reverts merged work.

The fix is one line in the procedure, and it is the maintainer's because the
briefs and `docs/routines.md` both carry the current wording:

```
git fetch origin main && git checkout -b <branch> origin/main
```

The 16 August portal run did exactly that after discovering it, and branched off
`3a1e419`.

---

## 2026-08-16 — no framework gaps this run

**Filed by:** `Loom portal` · **Owned by:** `Loom portal` · **Status:** closed

Recorded because absence is worth knowing, and because this run is the first
portal work that genuinely reaches into the tree model rather than styling
chrome. `lib/proposal-effect.ts` needed nine things from the runtime — `applyDelta`,
`applyOperation`, `configurationOf`, `describeTreeError`, `findNode`,
`findParent`, `nodeLabel`, `nodePath`, `walkTree` — and every one of them is
exported from `@loom/runtime`'s root entry point. No deep import was wanted and
`src/` is untouched, so 0018's enforcement was tested by this diff and held.

Two things about that are worth saying rather than leaving implicit. `applyDelta`
being public is what lets the portal report applicability **as the runtime's
answer** rather than re-deriving it, which is the difference between a surface
that can disagree with the runtime and one that cannot. And `describeTreeError`
being public is what lets a refusal reach a reviewer in the runtime's own words
instead of a portal paraphrase that would drift.

The §4e data-seam finding above — that the review surfaces could show a
`data-unavailable` diagnostic — was **not** acted on this run and stays open.
