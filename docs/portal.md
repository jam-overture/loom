# The portal — the fresh start

**Written 13 October 2026**, the day the maintainer paused `Loom portal`:

> *"I am just absolutely disgusted with the portal. I thought we were moving in
> the right direction, but it is just a big mess of shit. I am pausing the
> current Loom portal routine, because we need a fresh start… This means we
> likely have to scrap the whole thing."*

This replaces the plan of 12 October. That one answered the same verdict —
*"I can't even make heads or tails of what I should be looking at"* — with an
audit, three records and a nine-unit build order, and **subtracted nothing**.
Every screen behind the verdict is still served, with seven invented ones on
top of them. That is the failure this document is built to stop, and it is the
reason the first unit here is a deletion rather than a design.

---

## What is actually there

Measured on `main`, 13 October:

| | |
| --- | --- |
| Source | 39,610 lines in 379 files |
| Tests | 40,768 lines |
| Routes | 31 — 20 screens, 7 prototype screens on invented data, 4 redirect shims |
| Screens that read a store | **one**, `/portal/[application]` |
| Modules that open a database | **two**, `_lib/waiting.ts` and `_lib/write.ts` |
| Worth keeping | **~9,700 lines**, listed under unit 0 |

Four renames in six weeks — `trees → pages`, `calibration → trust`,
`audit → checkup`, `primitives → pieces`. Each was careful, each kept a
permanent redirect so no link broke, and together they are the symptom: what
the portal *is* was never settled, so the thinking went into screens because
screens were what a run could produce.

**Nothing in the model is accepted.** 0220, 0260, 0261, 0262 and 0263 are all
`Proposed` today. The 12 October plan records 0260 and 0261 as *merged*, which
was true of the pull requests and not of the records. Five open proposals under
six weeks of building is the structural reason careful work did not add up, and
it is why **no unit below may start while the record it rests on is proposed.**

The audit, with all fourteen screens photographed signed in, is
[`reports/2026-10-12-portal-the-audit-before-the-overhaul.md`](../reports/2026-10-12-portal-the-audit-before-the-overhaul.md).
Its findings stand: eight screens exactly one viewport tall with nothing below
the fold, one 13,298px and unscrollable to its end, 32 interactive controls in
35,438 lines.

## The decision, 13 October

| | |
| --- | --- |
| **Depth of the cut** | Delete the screens, keep the seams |
| **The one job** | Register an app and get signals flowing |
| **The prototype** | Still the target shape, and it may not ship on invented data |

---

## Unit 0 · The demolition

**One pull request. Nothing else starts until it is on `main`.**

### What dies — ~29,400 lines of source, ~38,000 of tests

| Screen | source | tests |
| --- | --- | --- |
| `/portal/pages` and its inspector, versions, proposals | 3,435 | 2,687 |
| `/portal/readers` | 2,896 | 2,952 |
| `/portal/trust` | 1,358 | 1,356 |
| `/portal/history` | 1,104 | 706 |
| `/portal/checkup` and `/checkup/everything` | 1,075 | 1,087 |
| `/portal/pieces` | 901 | 841 |
| `/portal/rules` and `/rules/what-if` | 843 | 663 |
| `/portal/[application]` | 807 | — |
| `/portal/activity` | 685 | 913 |
| `/portal/app` | 614 | 406 |
| `/portal` front door | 196 | — |
| the four redirect shims | 165 | 134 |
| the view models under `_lib/` that serve them | ~15,300 | ~27,000 |

`/portal/app` is deleted rather than replaced: it is 0220's screen, and 0220 is
refused. The shims go with their targets — the portal is invitation-only and has
no public bookmark to keep.

### What stays — ~9,700 lines

| | lines | why |
| --- | --- | --- |
| `_lib/auth/` | 1,763 | Sign-in, session, actor. Works, and the one job needs it |
| `_lib/store.ts`, `write.ts`, `waiting.ts`, `database.ts`, `scoped.ts` | 782 | The only code in the route group that reads and writes anything |
| `_lib/policy.ts`, `interpreter.ts`, `registry.ts`, `reader-signals.ts`, `telemetry.ts`, `addressing.ts` | 373 | The seams to the framework |
| `_lib/vocabulary.ts` | 1,335 | One word per state. The best thing in here |
| `_lib/screen-names.ts` | 212 | One name per screen, and the defect it closed is real |
| `_lib/nav.ts`, `version.ts` | 92 | |
| `_components/` | 2,736 | The shell |
| `portal/preview/` | 1,916 | The target shape, behind its banner |
| `portal/sign-in/`, `portal/sign-ins/` | 452 | The way in |

The prototype imports `_lib/auth` and its own `_lib/fixtures` and **nothing
else** from the dying 19,853 lines, which is what makes this cut clean rather
than a rewrite.

### The rules of the demolition

1. **At the end of it the portal signs in and serves the prototype.** Nothing
   half-deleted, nothing behind a flag.
2. **`/portal` becomes the prototype's workspace**, banner and all, so the front
   door is the shape being built instead of a screen being deleted.
3. **A view model dies with its screen.** Where one is wanted again it is
   rewritten against real data, never revived.
4. **One commit a reviewer can read as one act**, and `pnpm verify` green.

---

## The one job

**A person registers an app and watches its readers arrive.** End to end:

1. Sign in as an account that exists in a table, not in an environment variable.
2. Create a project. It gets an id and an ingest key.
3. Copy a snippet into an app. The marketing site is the first customer.
4. Readers of that app produce signals. The intake authenticates the key, checks
   the origin, and files them under the project.
5. One screen shows them arriving: how many, when the last one came, how many
   were refused.

**Done is a demonstration, not a screenshot:** a signal sent from a second
machine appears under its project within a minute; the same signal without a key
is refused; a second project's signals are never visible from the first.

### The units, in order

Each is one pull request, and **do not start a unit whose input is not on
`main`.**

| # | Unit | Blocked on |
| --- | --- | --- |
| 1 | **The signal tables take project and audience.** One migration over `loom_reader_signals`, `_tallies`, `_funnels`, `_regions`, `_page_views`, plus `project_id` on `loom_holds`, `loom_policy_revisions`, `loom_telemetry` | **0263 being accepted or refused** |
| 2 | **Accounts.** The environment roster goes; the actor comes from the session and the scope from the route (0027) | unit 0 |
| 3 | **The workspace.** The prototype's project list, wired: create, delete, switch | units 1, 2 |
| 4 | **Registration and the key.** Project id, ingest key, a snippet to paste, and `/api/reader-signals` authenticating it. **It authenticates nobody today** | unit 3 |
| 5 | **Arrival.** The prototype's logs screen against the project's own signals | unit 4 |

**Then stop and look at it.** The pages inspector, the rules screen, trust,
checkup and readers are not in this sequence. They were the portal; they are now
things to re-earn one at a time, each behind its own unit in this file.

> **Standing constraint until unit 1 is on `main`: the portal must not offer a
> second project.** A create button over a ledger that cannot tell two apps
> apart mixes two customers' readers on the first day, and the rows cannot be
> separated afterwards.

---

## The rules, with teeth

Prose did not hold the line for six weeks. These are tests, and they go in with
unit 0.

1. **No screen renders invented data.** Nothing outside `portal/preview/` may
   import a fixture module; a test sweeps the route group for it.
2. **No screen exists before its data.** The route list is held against the list
   of store-backed readings. A screen with neither a reading nor a unit in this
   file fails the sweep.
3. **One name per screen, one word per state.** `screen-names.ts` and
   `vocabulary.ts` stay, and they are the only two registries in the route group.
4. **No surface without a unit.** A new route needs a line in the table above
   first.
5. **A run that cannot finish its unit files a finding and ships nothing.** It
   may not invent a screen in order to have something to show. This is the rule
   the last six weeks needed.

---

## Blocked on the maintainer

1. **Accept or refuse 0260, 0261, 0262, 0263 — and 0220.** The whole model is
   proposed. Unit 1 cannot start without 0263, and this plan deletes `Your app`
   on the strength of 0220 staying refused.
2. **Go-ahead for unit 0.** The manifest above is exact; the deletion is one
   verified pass and is ready to run.
3. **When `Loom portal` resumes, and under what charter.** `docs/routines.md`
   now records it as paused.

## Not in scope, and one of them deserves naming

- **The proposal queue — a person deciding what the AI asked for.** This is the
  thesis of the whole project and it is *deferred, not dropped*: the job after
  this one. Said plainly here because a portal that registers apps and shows
  arrivals is infrastructure, and the queue is the reason any of it exists.
- **Governing the marketing site or the documentation.** 0259 settles both.
- **A second app per deployment.** 0220 stays refused; a project is the unit.
