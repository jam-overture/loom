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
| **The first connection** | A pull request against the customer's repository |
| **Roles** | An acceptance ceiling on the Gate's own stake scale, not a second permission system |
| **Primitives** | Read-only. The portal shows the registry and cannot change it |
| **Personas** | Audience-scoped deltas (0263), which is the same object as a variant |

---

## The model

Settled with the maintainer on 13 October, after he asked how a platform that
hooks up other people's Loom pages should be organised.

### A connection is a pair of adapters

The one question everything else hangs off: **where the tree of record lives,
and how an accepted change gets back to it.** Registration is not an account
form; it is establishing a **read path** and a **write-back path** ([0275](../decisions/0275-a-connection-is-a-read-path-and-a-write-back-path-and-loom-never-writes-into-the-customers-store.md)).

| Connection | Loom reads state by | An accepted change returns by | Loom holds |
| --- | --- | --- | --- |
| A project on a machine | `loom push` from that machine | `loom pull` writes files; the developer commits | a key, nothing more |
| **A project in a repository** | a GitHub App reading the tree, or CI uploading a snapshot | **a pull request against their repo** | a repo-scoped token |
| An app serving from its own store | their app ships a snapshot | their app **pulls** accepted deltas and applies them | nothing into their database |

**Write-back is taken, never pushed.** Loom holds no write credential into a
customer's database and never calls their running app. That is what keeps an
outage here out of their failure domain, and it is 0262 clause 2 made
operational.

**The repository connection is first**, because it is the most common one and
because a pull request needs no runtime trust at all.

Above the pair, every plane below is identical in all three shapes. That is what
makes this one product rather than three integrations.

### Six planes

| Plane | Owns |
| --- | --- |
| **Identity** | accounts, projects, roles, keys |
| **Connection** | the adapter pair, its credentials, its health |
| **Observation** | signal ingest → tallies → readings |
| **Governance** | the tree, revisions, policy, holds, proposals, the record |
| **Reasoning** | model credentials, briefs, the pipeline from readings to proposals |
| **Library** | what an app can be built from — read-only, synced from its registry |

Three of these were screen families in the old portal and are not capabilities
at all:

- **There is no primitive management.** A primitive is a component in the
  customer's repository. The portal shows the registry as synced data; *which*
  of it the AI may use is a policy field.
- **There is no tree editing.** Governance means reviewing the revisions that
  are waiting on a person: what a proposal would change, accept, refuse, revert.
  A hand edit, if ever offered, is a proposal with origin `human` through the
  same Gate.
- **There is no second logging story.** Everything that happens to a project is
  one event stream — batch received, proposal raised, held, accepted, refused,
  reverted, sync opened, key rotated. `Activity`, `History`, `Readers`, `Trust`
  and `Checkup` were five views of that one table.

### Roles are acceptance ceilings

The only authority question Loom actually has is **who may release a held
change**, and the Gate already carries the scale: four stake levels, and
`autoApplyCeiling` as a per-origin ceiling over them. A role is the same shape
with an actor where the origin is, so there is one vocabulary of authority
rather than two that can disagree.

| Role | May accept up to | Also |
| --- | --- | --- |
| Viewer | — | reads the record |
| Approver | `medium` | |
| Owner | `critical` | policy, credentials, creating and deleting projects |

A held change above an actor's ceiling says **who can release it**, which is
what the difference between *waiting on you* and *waiting on an owner* is made
of on the workspace screen.

### Three surfaces

- **Workspace** — the projects, each saying whether it is receiving, how much,
  how much went wrong, and what is waiting on you.
- **Project** — connection, what is waiting, what happened. Tabs: Pages (trees
  and audiences) · Pieces (the synced catalogue) · Rules (policy) · Logs (the
  stream) · Settings (connection, keys, people).
- **Sign-in.**

This is approximately the prototype, which is the reason it reads better than
what it replaces: it is the first version organised by plane rather than by
concept. Every screen in the old portal was a noun somebody needed a page for.

### Refused up front

A write credential into a customer's store · a page builder · per-user trees ·
a screen per concept · a second notion of *app* beside the project (0220).

---

## Unit 0 · The demolition — **done 13 October**

**One pull request, and it landed with three amendments to the manifest below.**
Measured after: the route group is **13,213 lines of source and 12,454 of
tests across 140 files, with 11 routes** — down from 39,610 / 40,768 / 379 / 31.
~56,600 lines deleted.

| What changed from the manifest | Why |
| --- | --- |
| **`/portal/new` is kept** | It landed on `main` after the audit and is a real, store-backed registration screen — it creates projects and applications through `@jam-overture/loom/store`. It is unit 4's subject, so deleting it would have meant rebuilding it |
| **Sixteen readings are kept, not six** | `waiting`, `proposed-view`, `undoing`, `reversal`, `revision-view`, `delta-summary`, `effect-view`, `waiting-effect`, `unreadable-change`, `proposal-effect`, `part-name`, `piece-view`, `episode-view`, `outcome`, `refusal`, `signin-view` — the dependency closure of the keep-set, measured rather than guessed, and all of it the holds-and-undo family that units 6 and 7 are defined around |
| **`_components/` was cut, not kept** | 2,736 lines of it was furniture for the deleted screens. What survives is what the surviving pages import: `form`, `screen`, `state-notice`, `technical-detail`, `under-construction`, and the shell's `topbar` and `signed-in-as`. The rails went with the screens they pointed at |

**The audit was wrong about one number and it is corrected here.** It said one
screen read a store. Ten screen directories read real data through `_lib` view
models; what was invented was the prototype, not the portal. The verdict that
drove this cut was never *it is fake* — it was *I cannot make heads or tails of
what I should be looking at* — and twenty cross-linked screens over four
vocabularies is that, whether the data behind them is real or not.

`(preview)` — a separate route group holding one page,
`/portal/pages/[treeId]/surface` — was not touched. It draws a governed tree out
of the store with the portal's own registry, which makes it the only place in
the repository where a stored tree is actually rendered.

### The manifest, as approved

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

| # | Unit | Plane | Blocked on |
| --- | --- | --- | --- |
| 1 | ~~**The signal tables take the application and the audience.**~~ **Done, in two migrations rather than one.** The dimension is the *application*, not the project (0269): the finer grain, matching `loom_trees`, with the project as the grouping above it. `application_id` landed on all five reader tables with 0273, and `audience_id` with [0283](../decisions/0283-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md) once 0263 was accepted | observation | — |
| 2 | **Accounts and roles.** The environment roster goes; the actor comes from the session, the scope from the route (0027), and a role is a ceiling on the stake scale | identity | unit 0 |
| 3 | **The workspace.** The prototype's project list, wired: create, delete, switch | identity | units 1, 2 |
| 4 | **Registration and the key.** Project id, ingest key, a snippet to paste, and `/api/reader-signals` authenticating it. **It authenticates nobody today** | connection | unit 3 |
| 5 | **Arrival.** The prototype's logs screen against the project's own signals | observation | unit 4 |

**That is the one job.** What follows it is already decided in shape and is not
started until the five above are on `main`:

| # | Unit | Plane | Blocked on |
| --- | --- | --- | --- |
| 6 | **The read path.** A repository hands Loom its current tree — snapshot artifact or evaluated module, shape still owed (0275) | connection | unit 5, **0275** |
| 7 | **The queue.** Revisions waiting on a person: what the proposal would change, accept, refuse, revert, and who may release it | governance | unit 6 |
| 8 | **The pull request.** An accepted revision becomes a PR against their repository. The loop closes here | connection | unit 7 |
| 9 | **Audiences, then the model seam** | governance, reasoning | unit 8 |

**Units 1–5 and unit 6 are independent of each other**, so the read path may run
in parallel with the signal work if seeing a real tree sooner is worth more than
finishing one thread.

The pages inspector, the rules screen, trust, checkup and readers are not in
either table. They were the portal; they are now things to re-earn one at a
time, each behind a unit in this file.

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

1. ~~**Accept or refuse 0260, 0261, 0262, 0263, 0275 — and 0220.**~~ **Settled on
   13 October.** 0260, 0261, 0262, 0263 and 0275 are `Accepted`; **0220 is
   `Refused`**, which is the first refusal in the repository and is what deletes
   `/portal/app` rather than rebuilding it. 0260's clause 4 was corrected on the
   way in: nothing authenticates the signal intake today, which this plan said
   and that record denied. Units 1 and 6 are unblocked.
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
- **A second app per deployment.** 0220 is refused; a project is the unit.
- Everything under *Refused up front* in the model above.
