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
2. Create a project. It gets an id and an ingest key. *(The key names the
   application minted with it, which is the same thing under
   [0296](../decisions/0296-a-project-holds-exactly-one-application-and-the-portal-never-names-it.md)
   — this sentence was written when `prj_` still meant what is now an
   application, and it is true again rather than still true.)*
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
| 1 | ~~**The signal tables take the application and the audience.**~~ **Done, in two migrations rather than one.** The dimension is the *application*, not the project (0269): the finer grain, matching `loom_trees`, with the project as the grouping above it. `application_id` landed on all five reader tables with 0273, and `audience_id` with [0284](../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md) once 0263 was accepted | observation | — |
| 2 | ~~**Accounts and roles.**~~ **Done** ([0285](../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)). `LOOM_PORTAL_REVIEWERS` is gone; an account is a row with a key the portal mints, prints once and stores as a digest, and `viewer`/`approver`/`owner` are ceilings on the Gate's own stake scale rather than a second permission system. `currentActor` and `requireActor` kept their signatures, which is the seam `identity.ts` promised. **The portal now needs a database to admit anybody**, and the way in is `pnpm portal:account` rather than a variable | identity | — |
| 3 | ~~**The workspace.** …create, delete, switch~~ **Done, as create and close.** `/portal` lists the projects you hold a role in, and registering one makes you its owner — without which the screen is empty for everybody for ever. **Delete became closing** ([0289](../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md)): three stores refuse to delete, and *the project says it was closed* is what they name instead. ~~**Switch has no destination yet**~~ **Switch landed with units 4c and 5**: each card links to the project's *Signals* and *Connect your site* screens. No counts: pages and waiting need a store handle per application, and *signals in 24h* is not countable at all while the only table with time in it is the short-lived buffer | identity | — |
| 4 | **Registration and the key.** One act: the repository, the project it names, the application minted with it, the ingest key, a snippet to paste, and `/api/reader-signals` authenticating it. ~~**It authenticates nobody today**~~ **Done, in three pull requests.** 4a (#677) gave the project its repository and made registration one act. 4b ([0298](../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)) gave each application a key, and the door files a keyed delivery under the key's application and refuses everything else: no key, a replaced key, a closed project, a host the project does not name. The marketing site posts with its own project's key (`pnpm signals:key prj_default`). 4c made registration mint the key and land on `/portal/[project]/connect`, the first screen under a project that reads a real one: the snippet with the key in it, where deliveries are taken from, an owner's button to replace the key, and an owner's field to change or clear the site deliveries are taken from. A batch is now labelled `text/plain`, so the snippet reaches the door from a customer's own site without CORS. The order is [0292](../decisions/0292-a-project-holds-at-most-one-repository-and-a-repository-belongs-to-at-most-one-project.md)'s and the shape is [0296](../decisions/0296-a-project-holds-exactly-one-application-and-the-portal-never-names-it.md)'s: one project, one repository, one application, and no screen says *application*. **Three pull requests, not one** — the repository and the registration order; the key and the authenticated door; the snippet and the screen — so that the change which can mix two customers' readers is reviewable on its own | connection | unit 3 |
| 5 | **Arrival.** The prototype's logs screen against the project's own signals. **Done, without refusals.** A project's screens now share one frame: the way back to the workspace and the tabs *Signals*, *Connect your site* and *Settings* (name, site address, closing), and `/portal/[project]` forwards to *Signals*. `/portal/[project]/signals` reads the stores the door files the project's deliveries into: page views counted (exact, from the door's own rows), when the last one arrived (the buffer's receipt time, or *last counted* once collection has emptied it), the newest batches waiting to be added up, and page views by page and version. Workspace cards and the Connect screen link to it. ~~**Refusals are not counted anywhere**~~ **Refusals that name a project are counted** ([0311](../decisions/0311-a-refusal-whose-key-was-right-is-counted-against-its-project-and-one-without-one-is-not.md)): a wrong site (with the site it came from), a closed project, and a body the door could not read, one row per project and reason. *Signals* shows the total and one sentence per reason saying what to do, even before anything has arrived | observation | unit 4 |

**That is the one job.** What follows it is already decided in shape and is not
started until the five above are on `main`:

| # | Unit | Plane | Blocked on |
| --- | --- | --- | --- |
| 6 | **The read path.** A repository hands Loom its current tree — ~~snapshot artifact or evaluated module, shape still owed (0275)~~ **a snapshot** ([0312](../decisions/0312-a-site-hands-loom-a-snapshot-of-its-pages-with-a-secret-key-and-loom-never-runs-its-code.md)), the maintainer's choice. **6a done:** a site's build posts `{ "pages": [trees] }` to `/api/pages` with a secret publish key (`lp_…`, minted by an owner on *Connect your site*, shown once, kept as a digest). Every tree is parsed and one bad tree refuses the snapshot; 1 MB and 200 pages at most; a closed project takes none. Pages are kept in `loom_published_pages`, apart from the governed tree store, and a snapshot adds and replaces but never removes. A *Pages* tab lists them by the name their heading gives them. ~~**Still owed:** 6b, this deployment's own site publishing its pages; and *Signals* naming pages from what was published~~ **6b done:** `pnpm pages:publish <address>` hands a deployment this site's own pages with `LOOM_PUBLISH_KEY`, through the same door a customer's build uses, and a test keeps every page of the site within what the door accepts. *Signals* names each page by what the project published, with its id beneath, and by its id alone when nothing was published | connection | unit 5, **0275** |
| 7 | **The queue.** Revisions waiting on a person: what the proposal would change, accept, refuse, revert, and who may release it. **Done** ([0329](../decisions/0329-loom-proposes-changes-to-a-published-page-from-what-its-readers-did-on-a-copy-that-starts-as-that-page.md), [0332](../decisions/0332-every-model-call-for-a-project-is-paid-with-that-projects-own-key-kept-sealed.md)): Loom proposes changes itself. Once a day, and on *Look now* on a page, it reads what readers did on each published page and, with thirty page views or more, asks the project's model for one change and the figure behind it; the interpreter drafts it and the Gate applies, holds or refuses it. The change is made to the project's own copy of the page, which starts as the published tree exactly, and nothing more is proposed for a page while a change waits or the copy is ahead of the site. When the site publishes a newer version, a copy no accepted change has moved starts again from it, and each waiting change is checked against it: *stale* if it still fits, *conflicts* if not, which can only be turned down ([0340](../decisions/0340-a-pages-copy-starts-again-from-a-newer-published-version-and-a-waiting-change-is-checked-against-it.md)). A turned-down change is remembered with an optional reason, and the AI weighs every new proposal for the page against what was turned down ([0341](../decisions/0341-a-turned-down-change-is-remembered-and-the-ai-weighs-a-new-proposal-against-it.md)). Every model call is paid with the project's own Anthropic key, set by an owner on *Settings* and kept sealed. A *For review* tab (named *Waiting* until 5 November) lists held changes, oldest first, with *Accept* and *Turn down* for a role whose ceiling covers the change's stake; *Accept* runs the Gate again. | governance | unit 6 |
| 8a | **Signals you can open.** *Signals* is paginated, newest first, with a right drawer for one event or one page, and a *By page* tab ([wireframes](portal-wireframes.md)). *By page* reads the tallies already kept. *Events* needs individual events kept for a window: **30 days**, the maintainer's choice on 5 November ([0349](../decisions/0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)). **By page done:** one row per page across versions and audiences, newest first, 50 a page with the cursor in the URL (`from`), the part pressed most and a *N waiting* badge; `?page=` opens a drawer with a bar per kind of thing readers did, the three parts pressed most, the part kept on screen longest, and a link to what waits. Its figures are since counting began, because the tallies keep no time. ~~**Still owed:** *Events*, its facets and drawer~~ **Events done**, on the deliveries the intake now keeps for the window (0351, #775), read through the project's own journal handle: *Signals* opens on *Events* and *By page* moved to `/signals/pages`. One row per signal, newest first, fifty to a page with the last one shown in the address (`before`), so a page can end half way through a delivery; chips for each kind, a page picker (`on`), and `?view=` for one page view. A read looks through at most 2,000 deliveries and, where a narrow filter has not filled a page by then, says how far back it looked and *Older* carries on. `?event=` opens a drawer: the event in a sentence (*A reader pressed the button “Start” on Home*), a chip for each goal it counts toward, when it happened by the reader's clock and when it was received, the page, version, part, page view and audience, the rest of its page view in order (looked for among the 200 deliveries either side, and said so when there were more), *Open the page*, *Events from this view* and the raw signal. The *Newest arrivals* table went with it, because *Events* lists the same deliveries. **By page now measures goals** (6 November): a column for the primary goal's rate on each page it covers (*per 100 page views*, drawn only once a primary goal exists, *Not on this page* where it does not cover one), and in the drawer every goal covering the page with what it counted there, the primary marked, each as *Goals* measures it (0350) and since counting began. **Events has a search** (6 November): a *Find* box in the same form as the page picker (`?q=`) keeps the events whose part or page mentions every word typed, in any order and any case: the page's published name or id, the part's name, id or kind. It reads within the same 2,000-delivery budget and says how far back it looked, as the kind and page filters do. **Events has a *Live* switch** (6 November): `?live=on` draws the screen again every five seconds, the interval a page's broadcast sends at, while its tab is looked at, so new events appear at the top with the figures above them. It is the newest page only: an address with `before` is never live, and switching on from an older page goes to the newest and says so first. Every link on the screen and the filter form carry it. **The range picker, page views in the range and the hourly chart done** (6 November), on page views counted by the hour they began in ([0356](../decisions/0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md), #786): above both tabs, *Last 24 hours · Last 7 days · Last 30 days* (`?range=`, the last 24 hours when none is named), carried by every link and form on both tabs. The first figure is page views in the range with the change on the period of the same length before (*Up 25% on the 24 hours before (32)*; *None in…* where that period was counted and empty; *Nothing to compare with* where it was not counted), and the total since counting began beneath it. Under the figures, one bar an hour across the range, the hour in progress lighter, each bar saying its hour and count when pointed at; where counting by hour began inside the range the chart starts there and says so. Where the hours cannot be read (a database without the hourly table), the figure is the total as before and says the hours could not be read, and no chart is drawn. **The primary goal's figure for the range done** (8 November), on what readers did counted by hour ([0362](../decisions/0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md), which closed the `Loom signals` finding of 6 November): once a project has a primary goal, a figure beside page views in the range says its rate per 100 page views over the range on the pages it covers (*3 per 100*), the count and page views it rests on, and the change on the period of the same length before (*Up 50% on the 24 hours before (2 per 100)*; *None in…*, *No page views on its pages in…*, or *Nothing to compare with* where that period was not counted from its first hour). Counting begins with the later of page views and what readers did by hour, as a verdict's does; where that is inside the range the figure starts there and says so. A project without a goal draws three figures as before; goals or counters that do not answer say so in the figure and cost nothing else. **The *By page* drawer reads the range** (8 November), and with it 8a is done: the page's own hourly counters over the range and the period before are read once the drawer opens (0356, 0362). *What readers did* draws a bar per kind for the range (page views, presses, sections opened or closed, forms sent), from the later of the hour page views and what readers did began to be counted, and says so where that is inside the range; the bars since the page was first counted are one click away under it, and are what it draws, saying why, where the hours were not counted or did not answer. Time on a part is not counted by the hour and is said since the page was first counted. Under *Goals on this page*, each goal's rate on this page alone for the range, with its change on the period of the same length before in the words the primary goal's figure on *Signals* uses (*on this page* rather than *on the pages it covers*), and since counting began beneath it. *Events on this page* and *Close* carry the range. **The drawer leads to the page's own screens** (9 November): its *N changes for this page wait for review* band opens the page's own *For review (N)* tab rather than the whole project's list, and *Page history* sits beside *Open the page* and *Events on this page*, as the wireframe draws it. A page readers were counted on before its site published it has no screens under *Pages*, so its drawer says so in place of those two links rather than leading to a page that is not there. **The last arrival names its site and page** (9 November): the figure says the project's own address it came from, which is the only origin the door takes for a project that names one (0298), or *a site holding this project's key* for one that names none, since a delivery keeps no origin; then the page by its published name and id, with *Events on this page* to follow it. Once nothing that arrived is still kept, it says *Last counted* on the page whose row moved last and opens that page's drawer on *By page* instead. **The drawer says where readers stopped** (11 November, item 9 of *Blocked on the maintainer*): on the version the site last published, since it was first counted, how many places reading stopped and how many of the page's parts went unreached, the three places that cost the most by the parts each accounts for, and the words nobody reached one click away, all from `pageFrontierOf` (0374) over that one revision's window (`_lib/page-stops.ts`). It checks first that the counters and the version belong together and draws nothing where they do not; a page served in more than one form, one the site has not published, one nobody has opened and counters that do not answer each get a sentence instead. Parts that were on a reader's screen without saying so are named apart from the places readers stopped. No table, no `pnpm db:push`. | observation | unit 5 |
| 8b | **Goals.** One outcome per project, built from a signal kind on a part on some or all pages, one of them primary. Every proposal names the goal it serves, and *For review* leads with it. **Goals screen done** ([0350](../decisions/0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)): a *Goals* tab lists each goal (the primary first, with since when), what counts in words, where, and what it counted since counting began (*7 presses in 200 page views, 3.5 per 100*); an owner adds one in a `?goal=new` drawer (name, *presses / sends / opens* it, the part picked from what the site published, every page that has it or chosen pages, primary), moves the primary mark and removes goals. Kept in `loom_goals`, which needs `pnpm db:push`. *Stays on it* waits for the kept events. **The 7-day rate and its trend done** (8 November): each goal says its rate per 100 page views over the last 7 days on the pages it covers, with its change on the 7 days before in the words the primary goal's figure on *Signals* uses, from the hourly counters (0356, 0362) read once for every goal; what it counted since counting began stays beneath it, and counters that do not answer cost that figure alone. **Proposals serve a goal** ([0352](../decisions/0352-every-proposal-serves-one-goal-and-a-page-no-goal-is-on-gets-none.md)): the proposer aims at the page's own goal, else the primary, else the oldest on the page, and asks no model for a page no goal is on; the brief tells the model the goal; which goal each proposal serves is kept by its intent in `loom_proposal_goals` (needs `pnpm db:push`) before the change is made, and *For review* cards lead with a goal chip. ~~**Still owed:** the goal picker on *For review*, and *changes for it* on each goal~~ **Done, and with it 8b:** *For review* has a goal picker (every goal, primary first, one removed since by the name its changes recorded, and *No goal named*) and the standing chips *All · Fits the live page · Stale · Conflicts*, each choice with its count under the other filter, both in the address (`?goal=`, `?standing=`); *Goals* has *Changes for it*, the changes waiting for each goal, linked to that filter. ~~**Shipped** counts wait for unit 8~~ **Shipped counts done** (8 November, unit 8 having made *Accept* go live): *Changes for it* says *2 waiting · 3 shipped*, the shipped count being the changes accepted for the goal that went live (given to readers, at once on this deployment's own site and otherwise on the site's first pull after *Accept*), counted still if later undone or dropped by a newer version. Where the site's pulls or the goals changes served cannot be read it says so rather than a short count, and a site that does not pull yet is told so under the list. ~~**Still owed on *Goals*:** the *New goal* drawer's 7-day preview band and the outline of the page to pick the part on~~ **The 7-day preview band done** (8 November): under *Where*, the *New goal* drawer says what the goal being made would have counted over the last 7 days (*Over the last 7 days it would have counted 9 presses in 300 page views, 3 per 100*), green as the wireframe draws it, worked out in the browser as the kind, part and pages change, from the hourly counters (0356, 0362) the list's *Last 7 days* already reads, folded into a total per page and per part, and by the rule a saved goal is measured by, so the band and the goal's figure on the list agree once it is saved. Before a part is chosen it asks for one; it says where counting began inside the week, *No page views* rather than a nought, and when the counters did not answer. ~~**Still owed on *Goals*:** the outline of the page to pick the part on~~ **The outline done, and with it *Goals*** (8 November): under the list of parts, *Or pick the part on the page* draws one published page as a small outline, a box per part in the order the page reads, each nested as deep as it sits (a slot is not a part, so what it holds sits at its depth), by its name with its id beside it. Pressing a box picks that part, outlined green, and the list and the 7-day band follow; choosing a part from the list opens the outline on that part's page, and *Page* draws another. It reads what the site published, as the list does, and keeps no field of its own. ~~*Stays on it* still waits on time on a part being counted per reader.~~ **Time on a goal's part done** (12 November, [0381](../decisions/0381-a-parts-pace-across-pages-is-one-pooled-quotient-and-a-goals-part-is-a-reading-of-its-own.md)): under what each goal counts, *Readers who reached it kept it on screen for 4.5 seconds on average*, pooled across the pages it covers with each page's readers on its own door's scale (`partPaceOf`), with the plain verdict on that time against what the part's words take (*Too fast to have read it*, *There was time for it*, *Is this where people get stuck?*). It reads the version each page serves now, since that version was first counted, and a part nobody was seen on says why rather than reading nought. It is a figure beside the goal, **not** the *Stays on it* goal kind: counting readers who stayed past a threshold is still unoffered (0350), and needs a record of its own before any build. No table, no `pnpm db:push`. **The drawer for one change done** (8 November; [wireframes](portal-wireframes.md) *2 · For review*): the change itself, on a card on *For review* or on a page's own tab, opens a drawer beside the list (`?change=` and its proposal id, every filter kept). It leads with the goal chip and the change as its heading (the request read back into the change, the figure behind it and, for a change turned down before, why it is back), then the page and when it was proposed. A band where it matters: amber for a change proposed for an older version that still fits, and for one turned down before and proposed again, with the last change turned down on the page and its reason (0341); red for one that no longer fits. Then the page before and after as two small outlines, the same ones *Compare* draws: the copy as it stands, and the change's operations applied to it, re-addressed as accepting does (0340), so a change whose parts are gone says it is not drawn, and one that conflicts is not drawn against a page the site no longer serves. *Why Loom proposes it* is the figure the model gave; *What it expects* says Loom predicts no effect yet and how it will be measured on its goal once live (14 days a side, 1,000 page views a side); *At stake* the stake, why the Gate stopped and who may accept it; then *Accept* and *Turn down* with a line on what accepting does next. A change no longer waiting says so in the drawer's place. No table, no `pnpm db:push`. ~~**Still owed on *For review*:** a predicted effect (new data, and a choice of how to predict it), and *Turned down recently: N · see them* under the list~~ ***Turned down recently* done** (8 November): under the list, *Turned down recently: 3 · see them* counts the changes turned down on the project's pages in the last 30 days (the window events are kept for, 0349), *none* where there were none, and is left out where they could not be read. *see them* opens *Turned down* (`/review/turned-down`): newest first, fifty to a page with the last one shown in the address (`before`), each with its page, when and by whom, the change and the figure Loom gave for it, and the reason in the turner's words, or that none was given and Loom weighs it anyway (0341). It reads the turned-down changes already kept, so no table and no `pnpm db:push`. **Its goal chip done** (9 November; [wireframes](portal-wireframes.md) *The goal chip*): each change on *Turned down* leads with the goal it served, as every other list of changes does, or *No goal named* for one raised before proposals named their goal. Turning a change down now keeps the intent it was made from, in a new `intent_id` column on `loom_turned_down` (needs `pnpm db:push`), and the goal is read by that intent from `loom_proposal_goals`. A change turned down before the column names no goal rather than guess one; until the push, turning down still remembers the change for the AI to weigh, and the list says the goals cannot be read. ~~**Still owed on *For review*:** a predicted effect (new data, and a choice of how to predict it), and the next time Loom looks at the pages under the title~~ **The next look done** (9 November): under *For review*'s title, *Loom next looks at your pages on 9 November 2026 at 14:00 UTC, in about 13 hours*, the next start of the daily sweep `vercel.json` schedules (0329 clause 5), which a test pins to the time the screen says. Where Loom will not look it says why instead: the deployment has no scheduler secret (`CRON_SECRET`), the project has no model key (with the way to *Settings*), or its key can no longer be opened (0332). Where the key could not be read the line is left out. No table, no `pnpm db:push`. **Still owed on *For review*:** a predicted effect (new data, and a choice of how to predict it). ***What it expects* reads the goal's own figures** (12 November): the drawer says where the goal the change serves stands on its page over the last 14 days (*“Sign-ups” counted 70 presses in 2,000 page views, 3.5 per 100*, scaled to 14 days and said so where counting began inside them), and the band a result has to leave at that traffic: *the change reads Helped at 4.8 per 100 or more and Hurt at 2.4 per 100 or less over the 14 days after it goes live, and No clear change in between*. Both edges are found from `verdictOf` itself (`expectation.ts`), so the band cannot disagree with the result the change is later given; a page too quiet for 1,000 page views a side says it would read *Too early*, and a figure that is not a share of page views says the test cannot weigh it. It says plainly that Loom does not predict where in the band the change lands: **how to predict an effect is still the maintainer's choice**, and nothing invented is drawn meanwhile. A goal removed since, or counters that do not answer, cost those lines alone. No table, no `pnpm db:push`. | reasoning | unit 7 |
| 8 | ~~**The pull request.**~~ **Accept goes live** ([0358](../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md), the maintainer's call on 6 November: no pull request, not even as an option). The customer's server pulls the project's live pages from a read door with its public key, on a short interval and with no reader in the request; a failed pull keeps the last pages, or the built page. A snapshot of a newer version restarts the copy and re-applies the changes accepted since, dropping and listing any that no longer fit. The screen follows an accepted change from *Accept* to its result. The pull client is framework code, filed for `Loom daily build`. The loop closes here. **The replay done** (6 November, clauses 5 and 6): a copy is no longer left behind once a change is accepted on it, and proposing for the page goes on. When a snapshot arrives, a page whose copy is the site's version plus what was accepted on it (the site sent the same version again, or now publishes what the changes reached) keeps its copy; a newer version starts a new copy from it and applies each change accepted on the old copy again, oldest first, with its proposal, provenance and who allowed it, re-addressed. A change that no longer fits is dropped and stays only on the old copy's record, and an undo goes with the change it undid. The new copy is named the page's current one only once every change that fits is on it, and only then are waiting changes carried over (0340 clause 3). **The read door done** (7 November): `GET /api/pages/live` answers a project's key (the public `lk_…` its pages already post with, as a bearer) with `{ "pages": [...] }`, every page the site published as it is live: the copy, under the page's own id, while it stands on the version the site last published, and the published tree where nothing was accepted or where a newer version has not yet been followed, so an older copy is never served over the site's own change. A request carrying any query is refused, so a pull cannot name a reader or an audience (0262); every answer has an entity tag and `If-None-Match` answers `304`; a closed project gets 403, a store that cannot be read 503 and never a partial site. **The pull client's finding is filed** for `Loom daily build` (7 November) with what the door answers and what the client must do. **The door records each pull, and *Connect your site* says whether the site pulls** (7 November): every answer a site takes, `200` or `304`, is kept after it is answered, one row per entity tag with when it was first and last taken (`loom_site_pulls`, which needs `pnpm db:push`), so a pull never fails on its own record. *Connect your site* ends with whether the site pulls: *Your site is not pulling yet* (connected for observation only: an accepted change goes onto Loom's copy and no reader sees it), *Your site pulls its pages* with when it last and first pulled, *Your site has stopped pulling* after an hour without one, *Your site serves Loom's pages directly* for this deployment's own site (0259), and *could not be read* where the table is missing; the request the site's server makes is one click away. ~~**Still owed:** the screen from *Accept* to live, and the dropped changes listed~~ **The screen from *Accept* to live done** (7 November): *For review* links to *Accepted* (`/review/accepted`), every change accepted on the project's pages, newest first, fifty to a page (`before`), each with its page, when it was accepted, what it did in a sentence and where it has got to. Each opens its timeline (`/review/accepted/<change>`), which *Accept* also links to once a change is made: *Accepted* (who said yes, and when) → *Live* (the site's first pull of a new answer after it, read from the per-tag rows; at once for this deployment's own site; until then *Waiting for your site to pull*, or *Your site is not pulling yet* with the way to connect it) → *Measuring* (the 14 days from when it went live, on its goal) → *Result*. A change the site's newer version could not take ends at *No longer fits the site's newer version*, when that version's copy started, and an undone one at *Undone*; one that came off before any pull says it was never live. The change as Loom keeps it is one click away. *Pages* and the answer to *Accept* no longer say the site keeps serving what it published. ~~**Still owed:** the goal chip and the stake on the timeline~~ **The goal and the stake done** (7 November): when a change is made, by *Accept* or by the Gate outright, what the page's record does not keep of it (the intent it was made from, which names its goal by 0352, and the stake the Gate put on it) is kept by its proposal id (`loom_made_changes`, which needs `pnpm db:push`), after the change and never deciding it. The timeline leads with the goal chip, the line under its heading ends with the stake (*Low risk*), and *Measuring* names the goal it is measured on; *Accepted* leads each change with its goal. A change made before this says Loom has no record of its goal or risk, and a deployment without the table says its goal could not be read; the rest of both screens stands. **A site that pulls and does not keep its newest pages is said so** (7 November, the `Loom daily build` finding of that day, route 1): a site whose installed Loom cannot read an answer refuses it and goes on asking for the pages it held, so it pulls on schedule and looks up to date. The door now records, per answer, whether the site named it back as the pages it holds (`If-None-Match` matched, `304`; the `kept` column of `loom_site_pulls`, which needs `pnpm db:push`). Once a site that has named some answer back has been given the newest pages for ten minutes without naming them back, *Connect your site* says *Your site pulls, and is not keeping its newest pages*, since when, and that updating Loom on the site is the usual fix. A deployment without the column goes on recording every pull and says only that keeping could not be read. ~~The *Live* step of an accepted change's timeline still reads an answer given as an answer taken.~~ **The *Live* step reads only a kept answer as taken** (9 November): for a site that names back the pages it holds, a change is live from the first answer since *Accept* the site named back, not the first it was given, so a verdict's 14 days start when readers had it. Given and not yet named back, the step is *Given to your site*; given for ten minutes and never named back, it is *Your site is not keeping the page with this change*, with the usual fix and the way to *Connect your site*; a site gone quiet is told that first. An answer replaced before the site's next pull is never named back, so the moment can be one pull late, never early. A site that has never named any answer back, or a deployment without the `kept` column, reads as before (the first answer given is the one taken), so nothing waits on `pnpm db:push`. **Unit 8 is done in the portal**, short of the pull client (`Loom daily build`'s finding); the verdict under *Result* is 8c's, done the same day | connection | unit 7 |
| 8c | **Page history.** Versions on a timeline, each with before and after on its goal and a plain verdict, using the measuring window and minimum page views [`portal-wireframes.md`](portal-wireframes.md) records. **The verdict done, on an accepted change's timeline** (7 November): *Result* says *Helped*, *Hurt*, *No clear change* or *Too early* once the 14 days after the change went live end, with the before and after figures it rests on (the goal's count over the page views that began on the page, each side from the hourly counters, 0356 and `acted.ts`) and the test one click away. The hour it went live in is on neither side, a side ends early where the page changed again (another change going live, or a newer version of the site's page) and starts no earlier than counting began, and the result says when a side is short. Below 1,000 page views a side it is *Too early* with how many it was short; *Helped* or *Hurt* need a pooled two-proportion test at 95%; where readers did it more times than there were page views the test cannot be taken and it is *No clear change*, said so. While it is measuring, *Measuring* says the figures so far. A change with no goal recorded says it is not measured, and counters that do not answer leave the timeline standing with the result unread. ~~**Still owed:** the page's own *History* tab~~ **The page's history done** (7 November): a page has two tabs, *The page* and *Page history* (`/pages/<page>/history`; the wireframe's *History* alone is a former screen name `screen-names.ts` holds every screen against). One card per version, newest first: a change accepted on the page leads with its verdict (the same rules and figures as its timeline's *Result*, or *Measuring* with the figures so far, *Not measured* where no goal was recorded, or where it came off the page), its goal chip, *Version N* and what it did, who accepted it and when it went live, the test one click away, and a link to follow it from *Accept*. One accepted and not yet taken by the site sits on top, dashed, saying where it has got to. The site's newer version of the page (each time its copy started again) is *Not a Loom change*: no verdict, and its before and after on the goal on the page now, for context, each side ending where the page changed again. ~~**Still owed:** the 8-week chart of the goal's daily rate, and the *Measured on* goal picker~~ **The chart and *Measured on* done** (7 November): above the cards, a *Measured on* picker of every goal on the page (the primary first; `?on=`, and the goal a change to the page serves when none is named), and under it the picked goal's rate by UTC day over the last 8 weeks, from the same hourly counters a verdict reads: one bar a day, its count over that day's page views, green where the page was on a Loom change when the day ended and grey after the site's own edit or before any change Loom knows of, today lighter, each version named under the bar it started on, and each bar saying its day and figures when pointed at. The chart starts where counting began and says so, and counters that do not answer cost the chart alone. The picked goal is the one the site's own edits show their before and after on; a Loom change is always judged on the goal it served, and the screen says so. ~~**Still owed:** *Propose reverting* on a Loom change, and *Compare*~~ ***Propose reverting* done** (8 November): a Loom change still on the live page offers *Propose reverting* on its card, to a role that may propose a change. A revert is a change of its own (0032), raised by the person who pressed it (`user-instruction`), made of the inverse the runtime plans from the page's current copy (`planRevert`, replayed from the version the site published), and weighed by the Gate: within the project's rules it goes onto the live page and the site has it from its next pull (0358), and otherwise it waits under *For review*, as one that would write over a later change to the same part always does (0035). It serves the goal the change it undoes served, recorded under its intent before the write as every proposal's goal is (0352), so *For review* leads with that goal and the revert is measured on it. Where the site has published a newer version Loom has not followed yet, the card says to revert after Loom's next look rather than plan from the wrong start. The reverted change ends at *Undone*; the revert is its own version on the history, *Version N: reverted version M*, with what it put back under it, and offers no revert of its own (to have the change back, Loom proposes it again). No table, no `pnpm db:push`. ***Compare* done** (8 November): every Loom change on the history offers *Compare*, which opens a drawer on it beside the cards (`?compare=` and its proposal id, kept with *Measured on*): the page just before the change and just after it, side by side as two small outlines of its parts nested as the page nests them, never tree JSON. A part added or changed is outlined green on *After*, a part taken off red and dashed on *Before*, a part moved green where it went and red and dashed where it was (a part moved to the top marks that part alone, not every part it passed), with a sentence saying how many of each, and each part's id one point away. The two pages are rebuilt from the record of the page's current copy, folded from the version the site last published, and only while the copy stands on it, as *Propose reverting* plans. Loom keeps a copy's newest page and its changes, not the page it began as, so a change dropped by the site's newer version, and a version the site published that Loom has not followed yet, say why they are not drawn rather than drawing a guess; the site's own versions offer no *Compare*, since the version before them is not kept. No table, no `pnpm db:push`. **8c is done in the portal.** Keeping each version the site publishes would let *Compare* draw the site's own edits and dropped changes too; that is a new table and not taken here. **The page's own *For review (N)* tab done** (8 November): a page's third tab (`/pages/<page>/review`) counts the changes waiting for a person on it, whichever copy of the page they were made to, on every tab of the page (*For review (2)*; no count where the waiting changes cannot be read, never a nought for a list it could not read), and lists them with the same cards and answers as the project's *For review*, oldest first, read once for both (`_lib/review-reading.ts`); the project's list, which narrows by goal and standing, is linked under them. Every tab of a page leads with the same heading, and a page that named itself nothing is *Untitled page* on each. No table, no `pnpm db:push`. **The list of pages says each page's newest change** (9 November; [wireframes](portal-wireframes.md) *The chrome*, *Pages: what is live, and did each change help?*): *Pages* gains a *Newest change* column, the page's newest version as its *Page history* names it, linking there: a Loom change by its heading (*Version 3: Removes the banner*) under its verdict, worked out as its card works it out (*Helped*, *Measuring*, *Too early*, *Not measured*, *Undone*), one accepted and on its way to readers under where it has got to (*Waiting for your site to pull*), or the site's own version under *Not a Loom change*; a page nothing has happened to says *No change yet*. The verdict chip is one component now, shared with the history's cards. Where Loom's record of changes cannot be read the column is left out and a line under the list says so; counters that do not answer cost that page's verdict alone. No table, no `pnpm db:push` | observation | units 8b and 8 |
| 8d | **The chrome. **The goal chip on it done** (9 November; [wireframes](portal-wireframes.md) *The goal chip*): a Loom change's verdict there has the goal it served beside it, as its card on *Page history* names it (*No goal named* for one raised before proposals named their goal); the site's own version, and a change Loom has no record of the goal for, carry none. No table, no `pnpm db:push`.** ~~The tab row above a project's screens~~ **The labelled rail done** (8 November; [wireframes](portal-wireframes.md) *The chrome*): every screen of a project has one rail beside it, words at rest, in the wireframe's order, *Signals · For review · Pages · Goals*, a divider, then *Connect your site · Settings*; on a narrow screen it is a row above the screen. *For review* carries the count of the changes waiting for a person (those it lists and those it says could not be read), drawn only when something waits and never a nought for a list that could not be read. A layout is not drawn again when a person moves between the screens it wraps, so the rail asks for the count itself each time the address changes, from a read of its own (`/portal/<project>/review/waiting`) guarded as a screen is: a member of the project, one answer for *not yours* and *no such project*, never kept by a cache. *Segments* joined the rail after *Goals* when unit 9 built it (11 November). **The top bar's breadcrumb done** (9 November): after the wordmark, *Projects*, then the project the screen is about, by name, linking to its *Signals*; the way back to *Projects* that sat above the rail went with it. The top bar is drawn once for the whole portal and never sees a screen's project, so the name is asked for from a read of its own (`/portal/<project>/name`), each time the address changes, under the same guard as the count (one guard, `_lib/member-answer.ts`, now answers both). Nothing is drawn for the project while its name is asked, and its id, which the address already says, where the name could not be read. The portal has no workspace, so the wireframe's `<workspace>` crumb is the list of projects. **The top bar's search done** (11 November, item 8 of *Blocked on the maintainer*): a box between the breadcrumb and the person's address finds the portal's own screens and what they let a person do, by plain words (*api key* finds *Model key* on *Settings*, *snippet* finds *Paste this into your site*), from an index written by hand (`_lib/feature-search.ts`) and never a read: data stays with each screen's own *Find*, and a query that names none says so. Every word typed narrows, a word may be begun rather than finished, case, accents and a plural *s* do not count, and the words that only make it a question (*where do I*) are left out. Up to six answers, the best first; the arrow keys move through them, Enter opens one, Escape empties the box, `/` reaches it from anywhere a person is not typing. Outside a project, a project's features are counted (*3 more answers are inside a project*) rather than drawn as links with nowhere to go. A section it leads to has an anchor (`#snippet`, `#key`, `#publish` on *Connect your site*; `#model-key`, `#closing` on *Settings*), and a test holds every answer against a screen the portal serves and an anchor that exists. On a phone the box is the word *Search* until pressed and then lies over the top bar; the address beside it is cut short there, whole on a long press. No table, no `pnpm db:push`. **One pager under every list done** (9 November; wireframes *Patterns every screen shares*, *Pagination*): *Events*, *By page*, *Accepted* and *Turned down* end on the same foot (`_components/pager.tsx`), a line saying which rows the page shows and the stretch of time they cover (*1–50 of 312 · 05:41 to 06:12 UTC today*), then *Newer* and *Older*, a way that leads nowhere greyed rather than dropped. *Accepted* and *Turned down* gained *Newer*, a whole page back, where they had only *Newest*. *Events* says how many it shows (*50 events*) rather than its place in the list, because a cursor read past a filter cannot know it, ~~and keeps *Newest*~~. *Turned down* says *of 500 or more* where its read stopped at its limit. No table, no `pnpm db:push`. ***Events* has *Newer* too** (9 November): the journal reads either way, so `after=` in the address reads the fifty events just newer than the newest one shown, under the same filter and the same 2,000-delivery budget, and shows them newest first; where the budget runs out first it says how far up it looked and *Newer* carries on from there. Where nothing newer would fill a page, the newest page is the answer and the address loses its cursor (and so may be live again). Every list in the portal now ends on *Newer* and *Older*; *Newest* is gone | frame | — |
| 9 | **Audiences, then the model seam.** Segments are the audiences of 0263; a record before any build **The record is Accepted** (11 November, [0371](../decisions/0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)): a segment is an audience the site's server sorts its readers into by rules over its own render context (device, source, returning), edited and ordered in the portal and kept in 0376's store (one list per page, *copy to every page*), shipped through the read door, and only its `aud_` id reaches Loom; built in four pieces, *Segments* first, then the door answering the rules, then a segment picker on *Signals*, *By page* and *Goals*, then *only for: <segment>* on a change, which waits on its own record and the maintainer's answer on whether a segment's form is judged by the Gate. ~~Pieces 1 to 3 are free to build~~ **Piece 1 done** (11 November): *Segments* on the rail, after *Goals*. A segment is one word in the site's own terms and its audience is `aud_` and that word (0376's store keeps a rule's audience and conditions and nothing else, so a name kept apart from the id would have needed a table, which the acceptance ruled out). An owner makes one with its conditions, one a line (`device = phone`, `source = search, ads`: every line must hold, values on a line are alternatives), on every page or one; changes its conditions (it keeps its place in each page's order); takes it off one page or all; and moves it earlier or later on a page, each page's order said with who changed it last and the reminder that the later of two segments wins a part both change. Every write is `recordRules` against the revision read, a reorder against the revision on the screen, so an edit of a list somebody changed meanwhile is refused on that page and said; pages are written one at a time and a partial edit says which took it. At most ten segments a project (0371's default). Each segment's page views over the last 7 days come from the hourly counters by audience (0284, 0356), *None yet* while nothing was ever counted under it, which is every segment until a site sorts its readers: the screen says so, and the pull client's half is filed for `Loom daily build` (`FINDINGS.md`, 11 November evening). *What your site sends* lists the keys its server must set and the ids its signals carry. No table and no new `pnpm db:push`: 0376's two tables are already in `scripts/db-push.ts` (#850), and a deployment that has not pushed since says *Segments cannot be read here* and to run it. **Piece 2 done** (11 November): the read door answers `{ pages, rules }`, where `rules` has one entry, `{ treeId, rules }`, for each live page with a rule list, the list in its order as 0376's store keeps it (`liveRulesOf`, `_lib/pages/live.ts`). A page with no list, or one emptied, has no entry, since both mean the base for every reader. The rules are read from the store *Segments* writes, for exactly the pages answered and within the screens' budget, and a page whose rules cannot be read makes the whole pull a 503, as a page that cannot be read does: a site never holds rules from one pull beside pages from another (0358 clause 4). The tag covers both, so a change of rules alone answers a site again. The request still names no reader and no audience. The pull client in `src/live/` reads `{ pages }` and ignores the rest, so nothing a site serves changes until `Loom daily build` closes its half of the finding of 11 November evening, whose clause 1 now names this shape. No table, no `pnpm db:push`. **Piece 3 done** (12 November): a segment picker, *Segment*, under the range picker on *Signals* (both tabs) and above the list on *Goals*, in the address as `?segment=<word>` and kept by every link on those screens (the tabs, the range, the filters, the pager, the drawer). It offers *Everyone* and each segment the project's rules name, and is not drawn for a project with none; where the rules cannot be read it says so and offers only the segment shown. A segment narrows every counter read to its `aud_` id (0371 clause 6): on *Signals*, page views and their hours, the primary goal's figure and the last arrival (then the segment's own last counted page view, since the journal's newest delivery could be anyone's); *Events*, to the deliveries filed under it; *By page*, its rows, the drawer's range and where readers stopped; *Goals*, each goal's 7 days and what it counted since counting began. A word the rules no longer name still narrows to what was counted under it and is offered beside the others. A segment nothing was ever counted under shows *Nothing has been counted for <word> yet*, with the way to *Segments* and back to *Everyone*, in place of its figures (0371's *figures only once a segment has page views of its own*), which is every segment until a site sorts its readers. What the door turned away is never filed under an audience, so that figure stays every reader's and says so; the changes waiting and shipped stay the project's until piece 4; *New goal* reads every reader. No table, no `pnpm db:push`. **Next:** piece 4 waits on its own record and the maintainer's answer on whether a segment's form is judged by the Gate | governance, reasoning | unit 8 |

**The rows from 8a down are in the order the maintainer agreed on 5 November
2026.** The pull request and the audiences keep their numbers, 8 and 9, because
records and code cite them; the units added that day are lettered.

**The target shape for everything after unit 7** is
[`portal-wireframes.md`](portal-wireframes.md), the concept wireframes the
maintainer set as the goal on 5 November: Signals with paginated events and a
drawer, For review, Goals, unit 8's timeline from *Accept* to live, page history with
before and after, and Segments later. A screen from it still needs a line in
the table above before it is built.

**Units 1–5 and unit 6 are independent of each other**, so the read path may run
in parallel with the signal work if seeing a real tree sooner is worth more than
finishing one thread.

The pages inspector, the rules screen, trust, checkup and readers are not in
either table. They were the portal; they are now things to re-earn one at a
time, each behind a unit in this file.

> ~~**Standing constraint until unit 1 is on `main`: the portal must not offer a
> second project.**~~ **Lifted on 15 October**, when the five reader tables took
> `application_id` (0273) and then `audience_id` (0284). The constraint existed
> because a create button over a ledger that could not tell two apps apart
> mixes two customers' readers on the first day and the rows cannot be
> separated afterwards. The ledger tells them apart now, in both dimensions.
>
> ~~**What replaces it is narrower and still standing: the door cannot.**~~
> **Closed by 4b** ([0298](../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)).
> `/api/reader-signals` filed everything under `app_default`, so a second
> application's signals would have arrived under the first's name. A delivery
> is now filed under the application its key names, and one with no key is
> refused, this deployment's own pages included.

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
2. ~~**Go-ahead for unit 0.**~~ **Given, and done on 13 October** — the section
   above records what the deletion actually cost and the three amendments it
   landed with.
3. ~~**When `Loom portal` resumes, and under what charter.**~~ **Resumed on
   5 November**, several runs a day, building units 8a onward and merging its own
   pull request (`docs/routines.md`).
4. **Nothing else is waiting on a decision.** Units 1, 2 and 3 are on `main`,
   and the two questions they raised were answered rather than parked: delete
   versus close became [0289](../decisions/0289-a-project-is-closed-rather-than-deleted-and-closing-is-a-column-and-a-filter.md),
   and how many repositories a project may hold became
   [0292](../decisions/0292-a-project-holds-at-most-one-repository-and-a-repository-belongs-to-at-most-one-project.md).
   Units 4 and 5 are done, and unit 5 counts the refusals that name a project (0311).
5. **0298 is `Accepted`.** 4b had to choose what the key is. The maintainer
   settled both choices: on 19 October, that every delivery carries a key,
   the marketing site included; on 20 October, that the key is stored
   readable, because it is printed in every page that sends one.
6. ~~**How long individual reader events are kept.**~~ **30 days**, decided on
   5 November with how long a change is measured before a result is shown, and
   how many page views that needs: the recommendations in
   [`portal-wireframes.md`](portal-wireframes.md).
7. ~~**Segments.**~~ **0371 is `Accepted`** (11 November: *"Okay to accept."*),
   with its rules edited through 0376's store rather than portal tables, as the
   pull request recommended. Still open, and only for piece 4: whether a
   segment's form is judged by the Gate (`FINDINGS.md`, 10 November).
8. ~~**What the top bar's search finds.**~~ **Portal features, not data**, decided
   on 11 November: *"I would like it to be intuitive. I think largely it should
   be for searching for portal features. Not necessarily data."* It finds the
   portal's screens and what they do (*Goals*, *Connect your site*, the model
   key on *Settings*), by plain words a person would type. Looking through
   signals, pages or changes stays with each screen's own *Find*. **Built** on 11 November (row 8d).
9. ~~**"Where readers stopped" in the page drawer.**~~ **Yes**, decided on
   11 November (*"Sounds good."*), as recommended on #849: the *By page*
   drawer gains the places on the page where reading stopped, from
   `pageFrontierOf` (0374), with the words nobody reached and the three places
   that cost the most. `portal-wireframes.md` *By page* lists it. **Built** on 11 November (row 8a).

## Not in scope, and one of them deserves naming

- **The proposal queue — a person deciding what the AI asked for.** This is the
  thesis of the whole project and it is *deferred, not dropped*: the job after
  this one. Said plainly here because a portal that registers apps and shows
  arrivals is infrastructure, and the queue is the reason any of it exists.
- **Governing the marketing site or the documentation.** 0259 settles both.
- **A second app per deployment.** 0220 is refused; a project is the unit.
- Everything under *Refused up front* in the model above.
