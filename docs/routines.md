# Routines

Loom is built by scheduled cloud agents. This file is the governance: how many
there are, what each owns, what may change one, and how they learn from each
other.

## The rules

**One routine, one objective.** A routine's prompt is the objective. Widening it
dilutes the thing it was created for, and a routine asked to do two jobs does
the easier one.

**A new parallel effort is a new routine — never an addition to an existing
one.** If the objective genuinely changes direction, that is when an existing
routine's prompt is edited.

**Confirm with the maintainer before either.** Creating a routine and
redirecting one are both decisions, not housekeeping.

**When a routine's objective is met, pause it.** A routine with nothing left to
do will find something, and what it finds will be worth less than what it was
created for. Paused routines keep their configuration; re-enabling is one call.

## Token discipline

Routine runs are metered against the maintainer's subscription. The budget is
**the number of enabled routines multiplied by their cadence**, and it is the
first constraint, ahead of speed.

**Never arm a recurring self-check-in.** On 2026-08-09 four self-armed
`send_later` chains — created by interactive sessions, not by cron — polled open
PRs roughly hourly and re-armed themselves, about **96 cloud sessions a day**
against the routines' 3. One PR was checked sixty-nine consecutive times over 72
hours with nothing changing. That single pattern consumed a week's allowance
while the maintainer was away.

The rules that follow from it:

- A routine must not schedule its own follow-up. It runs, it reports, it exits.
- Nothing polls for review. The maintainer reviews when they review; a PR
  waiting is free, and a poller waiting is not.
- If a check genuinely must be scheduled, it is **one shot with a hard give-up**,
  never a chain that re-arms.
- The cost of a poller scales with how long review takes. The cost of a build
  routine does not. Only the first kind can surprise you.

**A routine that is blocked stays disabled.** Several routines below exist but
are switched off because their work cannot start yet. That is deliberate: an
enabled routine with nothing to do still spends a session discovering that.

## The routines

| Routine | Owns | Cadence | State |
| --- | --- | --- | --- |
| **Loom daily build** | `src/` — the framework, the primitive library, the demo | 09:07 and 21:07 UTC | Enabled |
| **Loom portal** | `apps/portal` | — | **Disabled** until the demo exists. Objective now settled: free. |
| **Loom marketing** | `apps/marketing` — §4d, built in Loom | — | **Disabled** until §4b's vocabulary lands |
| **Loom docs** | `apps/docs` — §4c | — | **Disabled** until §4b's vocabulary lands |
| **Loom lessons** | `lessons/` | — | **Paused** while the maintainer catches up |

[`rollout.md`](rollout.md) is the phased plan these routines serve, with the
conditions that would move each date.

Only the build routine is enabled, so the standing cost is **2 sessions a day** —
unchanged by the addition of the three new ones. Each disabled routine names its
unblock condition; enabling one is a deliberate act that raises the bill.

## How routines learn from each other

Routines share one repository and no memory. A finding in one — the marketing
routine discovering a primitive cannot express something, the docs routine
finding an example that will not render — must reach the routine that can act on
it, which is almost always the build routine.

The channel is [`FINDINGS.md`](../FINDINGS.md) at the repository root.

- **Every routine reads it at the start of a run**, before choosing work.
- **Any routine appends to it** when it hits something another routine owns.
  Consuming a framework gap while building a marketing page is exactly the case.
- **The build routine treats open findings as an input queue**, ahead of the
  plan but behind maintainer review comments.
- A finding is closed by the routine that fixes it, with the PR that fixed it
  named. Closed findings stay in the file; the trail is the artefact, as with
  decision records.

A finding is not a bug report. It is *"I could not do X, and here is what the
framework would need."* The routine that found it is the one that knows what it
was trying to do, so it writes that down rather than a diagnosis.

Anything architectural still goes through `decisions/`. `FINDINGS.md` is the
queue; a decision record is the resolution.
