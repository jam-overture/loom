# FINDINGS

The channel between routines. Append; do not rewrite someone else's entry.

Each finding names the routine that filed it, the routine that owns it, and the
date. A finding is something one routine noticed that another routine has to
act on — a framework gap, a stale premise, a missing file. It is not a task
list and it is not a report.

---

## 2026-08-15 — `FINDINGS.md` did not exist, and neither do two of the four docs

**Filed by:** `Loom portal` · **Owned by:** `Loom daily build` · **Status:** open

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

**Filed by:** `Loom portal` · **Owned by:** `Loom daily build` · **Status:** open

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
