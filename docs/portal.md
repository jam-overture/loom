# The portal — what we are building

**Rewritten on 12 October.** The previous version was the approved plan of 1
October and it assumed one app per deployment throughout, which
[0260](../decisions/0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md)
refuses. It also described screens the maintainer has since read and rejected:

> *"The whole portal is geared toward one app… when I can have many."*
> *"I can't even make heads or tails of what I should be looking at and
> therefore can't give you any real direction."*

That verdict was checked rather than taken on faith. All fourteen screens were
photographed signed in: eight were exactly one viewport tall with nothing below
the fold, three could not be scrolled to the bottom (`Your app` at 13,298px),
and the whole route group held 32 interactive controls in 35,438 lines. The
measurements are in
[`reports/2026-10-12-portal-the-audit-before-the-overhaul.md`](../reports/2026-10-12-portal-the-audit-before-the-overhaul.md).

**This document is the direction.** It is written so that work can stop at any
point and resume without re-deciding anything.

---

## The model

Loom splits along the line between **governing** a page and **serving** it
([0262](../decisions/0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)).

| | runs where | an outage costs |
| --- | --- | --- |
| **Control plane** — portal, signal intake, governance record, policy, every model call | Loom's machines, or the customer's if they self-host | governance; **no page stops** |
| **Data plane** — resolve a request to a tree, draw it | always the customer's app | their site |

The property that makes this safe already exists and is already tested:
`pageTreeFor` is `(await storedPageFor(route)) ?? treeFor(route, context)`, so
an unreachable control plane degrades to the authored page rather than to an
error.

**Self-hosting is the same portal against the customer's own database.** One
codebase, two operators.

## What a page is

One **base tree**, plus **deltas that apply when an audience matches**
([0263](../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)).

- An audience is a predicate over the opaque render context — site, region,
  locale, cohort, flag. Loom never learns what the values mean.
- A variant is a delta, so it is held, judged, logged and inverted by the
  machinery that already does that. A fix to the base reaches every audience.
- Per-user means *rules mapping context to deltas*, not a tree per user.
- Composition happens in the customer's process, per request, with nothing
  about the reader leaving it.

## The flow we are building toward

The maintainer's own sequence, 12 October:

1. The customer **registers their app** → project id and an ingest key.
2. Loom **reads its current state** → the governed copy of their trees.
3. **Signals ingest** → what readers did, per page, per audience.
4. A **link to their AI service**, for prompting from inside the portal.
5. A **link to their model** to read signals and propose how the app evolves.
6. **Responses are written back** to the tree and sync down to their app.

Steps 4 and 5 run in the control plane. **Nothing that calls a model is in the
render path.** Holding the customer's model credential is accepted; the runtime's
existing in-app model adapter stays supported and may be deprecated later in
favour of the portal rather than removed.

---

## Build order

Each unit is one pull request. **Do not start a unit whose input is not on
`main`.**

### 0 · The records · **three proposed, awaiting acceptance**

| | what it settles | status |
| --- | --- | --- |
| 0260 | a project is the unit Loom stores under | **merged** |
| 0261 | a portal screen shows state, not explanation | **merged** |
| 0262 | the control plane is hosted; the render path is theirs | proposed |
| 0263 | a page is a base tree plus audience-scoped deltas | proposed |

### 1 · Project identity through the schema · **partly done**

**Done** (#598): `loom_trees` and `loom_revisions` carry `project_id`, keys
widened, isolation proved against PGlite, migration applied to production.

**Remaining — seven tables, and they split in two:**

| table | needs | may start |
| --- | --- | --- |
| `loom_holds` | project | **now** |
| `loom_policy_revisions` | project | **now** |
| `loom_telemetry` | project | **now** |
| `loom_reader_signals` | project **and** audience | after 0263 |
| `loom_reader_tallies` | project **and** audience | after 0263 |
| `loom_reader_funnels` | project **and** audience | after 0263 |
| `loom_reader_regions` | project **and** audience | after 0263 |
| `loom_reader_page_views` | project **and** audience | after 0263 |

**The signal tables should take both dimensions in one migration.** 0263
clause 5: a signal that does not name its audience cannot be compared with the
variant it was serving against, and two variants folded into one tally cannot
be separated afterwards. Doing project now and audience later means migrating
the same five tables twice and leaving a window where the data is already
ambiguous.

> **Standing constraint until this unit is finished: the portal must not offer
> a second project.** A screen that lets somebody create one, over a signal
> ledger that cannot tell two apart, mixes two customers' readers on the first
> day, and the mixing is not recoverable from the rows.

### 2 · The audience dimension · **after 0263**

Base tree plus audience-scoped deltas in the store; a composing `TreeSource`
beside `treeSourceFromStore`, which stays for deployments that want one tree per
id.

### 3 · Accounts, workspace, projects

Accounts replacing the environment-variable roster. A workspace listing
projects, with create and delete. A project switcher in the top bar. 0027's
second half: **the actor comes from the session, the scope comes from the
route.**

### 4 · Registration, credentials, ingest authentication · *the stated purpose*

Create a project → project id, ingest key, copy-paste snippet.
`/api/reader-signals` learns to authenticate that key, check the origin, and
file signals under the project and audience. **It authenticates nobody today** —
one environment switch and nothing else — and the whole stated purpose rests on
it.

### 5 · The sync

How an accepted change reaches the customer's app, and how the app's current
state reaches the portal. Push, pull on an interval, or at build time. 0262
names this as owed and deliberately does not design it; all three satisfy the
degrade-to-authored property.

### 6 · The AI links

Their service, for prompting from the portal. Their model, for reading signals
and proposing an evolution. Credentials held encrypted in the control plane.

### 7 · Logs and signals

Filter rail, timeline, dense table, right-hand detail pane. `Activity`,
`History` and `Readers` fold into it. Per audience, once 0263 lands.

### 8 · Policy as configuration

What-if becomes the Rules screen. Each rule is a control with its current value;
the prose moves behind an info affordance beside the setting it explains.

---

## Promoting the prototype

The maintainer approved the prototype on 12 October — *"I like the preview, so
let's move that in as the actual portal"* — so its layout is the target shape
rather than a proposal. It is at `/portal/preview` with invented data, and
**promotion is a sequence, not a move**: a screen graduates when it is wired to
something real, and the screen it replaces is deleted in the same change.

| prototype screen | real when | replaces |
| --- | --- | --- |
| Pages, inspector, Pieces | **now** — the store, the outline and the registry all exist | `/portal/pages`, `/portal/pages/[treeId]`, `/portal/pieces` |
| Rules | unit 8 — needs policy writes | `/portal/rules`, `/portal/rules/what-if` |
| Logs | unit 7 | `/portal/activity`, `/portal/history`, `/portal/readers`, `/portal/trust`, `/portal/checkup` |
| Project overview | unit 3 | `/portal` front door |
| Workspace | unit 3 | nothing — no such screen exists |
| Credentials | unit 4 | nothing |

`/portal/app` — `Your app` — is deleted rather than replaced. It is 0220's
screen and 0220 is refused.

**A prototype screen may not ship on invented data.** Until its unit lands it
stays under `/portal/preview`, behind the banner that says every number on it
is made up.

---

## Settled

- Hosted control plane, local render path, self-hosting as the same codebase.
- Base tree plus audience-scoped deltas; per-user is rules, not trees.
- Loom holds the customer's model credential.
- The runtime's in-app model adapter stays.
- The prototype's layout is the portal's layout.
- The plain-language brief is scoped out of `(portal)` and *nothing is ever
  removed* is withdrawn as a screen rule (0261).

## Open

- **The sync mechanism** (unit 5) — push, pull, or build-time.
- **What an audience predicate looks like on the wire** — the shape a host
  writes and the portal reads.
- **Whether the portal becomes the only place a model is called**, or the
  in-app adapter stays indefinitely.

## Not in scope

- Rewriting the marketing site. Under 0262 its claims stay true as written.
- Governing the documentation. It is MDX; 0259 refuses prose as a tree.
