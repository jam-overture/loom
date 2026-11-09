# The portal — concept wireframes

**Written 5 November 2026.** The maintainer, on the wireframes drawn that day:

> *"This is a great start… this should be the starting point goal to work
> towards."*

This file is those wireframes as a specification a run can build from. The
drawings themselves are a design canvas, one board per screen:
[Portal concept wireframes](https://claude.ai/artifact/Mmkpd18zTT89jAfW8A7DKL)
(private to the maintainer; a run that cannot open it builds from this file,
which says everything the boards do).

**What it is:** the target shape for the portal, in build order. **What it is
not:** a licence to skip the rules in [`portal.md`](portal.md). Every screen
below still needs its data before it ships (rule 2), a line in the units table
(rule 4), and no invented data outside `portal/preview/` (rule 1). The sample
figures quoted here are the boards' sample data, there to show shape and never
to be copied into a screen.

---

## The loop the portal exists for

Every screen is one step of one loop. A run should be able to say which step
its unit serves.

| # | Step | Screen | Today |
| --- | --- | --- | --- |
| 1 | Readers act: views, dwells, presses, opens, completions arrive with the project key | Signals | built (tallies, buffer, by page) |
| 2 | A goal says which signals count | Goals | built (goals kept and measured, 0350; proposals aim at them, 0352) |
| 3 | Loom proposes one change toward a goal | For review | partly (each proposal names its goal, 0352; the goal picker, the drawer with before and after, *Turned down recently* and the next time Loom looks are built; no predicted effect yet) |
| 4 | A person accepts or turns it down | For review | partly (the queue exists, as *Waiting*) |
| 5 | An accepted change goes live on the site, with no pull request (0358) | Unit 8 | built (read door, replay, whether the site pulls, *Accepted* and the timeline from *Accept*; the goal chip on it still owed) |
| 6 | The next version is measured against the last, on its goal | Pages · History | new |

## The chrome

The preview route's shape (`portal/preview/_components/shell.tsx`), in the
portal's own palette (`(portal)/globals.css`: white surfaces, borders that
carry structure, green as a tinted mark, one black filled action per screen).

- **Top bar:** `loom / <workspace> / <project>` breadcrumb, search, avatar.
- **One labelled left rail**, replacing today's tab row
  (`_lib/project-tabs.ts`). Words at rest, never icons that need a hover.
  In order: **Signals · For review** (with a count of what waits) **· Pages ·
  Goals · Segments** (marked *later* until built), then a divider, then
  **Connect your site · Settings**. A rail item is drawn only for a screen that
  is built, as the tabs are today.
- Each item answers one question:

| Item | The question it answers |
| --- | --- |
| Signals | Is anything arriving, and what did readers do? |
| For review | What does Loom want to change, and do I agree? |
| Pages | What is live, and did each change help? |
| Goals | What are we trying to get readers to do? |
| Segments | Later: which readers behave differently? |
| Connect your site | Key, snippet, publish key, repository |
| Settings | Name, address, model key, closing |

## Patterns every screen shares

- **The right drawer.** One component. Opens from any row, about 440px wide,
  sits beside the list on a wide screen and below it on a narrow one. Its
  subject is in the URL (`?event=`, `?page=`, `?change=`) so a link reopens it,
  as the preview's logs screen already does with `?log=`.
- **Pagination.** Cursor based, newest first, 50 rows a page, *Newer* and
  *Older*, and a line saying which rows and which stretch of time the page
  covers (`1–50 of 4,812 · 05:41 to 06:12 today`).
- **The goal chip.** Wherever a change or a result appears, the goal it serves
  is named beside it in a green tinted chip.
- **Plain verdicts.** A measured change is *Helped*, *No clear change*, *Hurt*
  or *Too early*. Never a bare p-value. The words go in `_lib/vocabulary.ts`.

---

## 1 · Signals

**Answers:** is anything arriving, and what exactly did readers do?

**Header:** title, a range picker (last 24 hours, 7 days, 30 days) and a *Live*
toggle.

**Four figures:** page views in the range (with the change on the period
before), the share of readers who reached the primary goal (needs Goals; shown
only once one exists), when the last delivery arrived and from which site, and
how many were turned away (the 0311 counts, linking to the reasons).

**A bar chart** of page views by hour across the range.

**Two tabs.**

### Events

- **Facets above the table**, not in a side column, so the drawer has room:
  kind chips (*All kinds, viewed, dwelled, activated, disclosed, completed*),
  a page picker, and a search over part and page.
- **Columns:** time, kind, page (by its published name), part (its label and
  type, with dwell time for `dwelled`), version.
- **The drawer for one event:** a sentence saying what happened in words
  (*A reader pressed Get started on Home*); a goal chip when the event counts
  toward one; then *Happened* (reader's clock), *Received*, *Page* (name and
  tree id), *Version*, *Part* (type and node id), *Page view* (the `view` key),
  *Audience*. Below that, **the rest of this page view**: the other signals
  that carried the same `view` key, in time order. Actions: *Open the page*,
  *Events from this view*, *Raw signal*.
- Nothing in the drawer identifies a person or stitches page views together.
  The `view` key is the only correlation, as `docs/signals.md` rule 2 allows.

**New data this needs, and it comes first:** today the portal reads tallies and
the short-lived buffer, so individual events are gone once collection runs. A
paginated event list needs events kept for a window. **Settled by the
maintainer on 5 November: individual events are kept for 30 days**, then
deleted; the tallies stay as they are. It is a retention setting and a table,
it belongs with `docs/signals.md` rule 5 (retention is per-deployment
configuration, so 30 days is the default, not a constant), and the record that
writes it down cites this decision. The By page tab does not wait on it.

### By page

- **Columns:** page (published name, tree id beneath), live version, page
  views, primary goal rate, the part pressed most, and a *N waiting* badge when
  changes wait for that page.
- **The drawer for one page:** a bar per signal kind for the range (what
  readers did on it), the goals measured on it with their rate and trend, the
  three parts pressed most, a band linking to its waiting changes, and
  *Page history* and *Events on this page*.
- Built from data kept today (tallies by page and version). The goal columns
  wait for Goals.

## 2 · For review

**Answers:** what does Loom want to change, why, and what do I say?

The *Waiting* tab renamed (PR #767), oldest first, with the next time Loom
looks at the pages under the title.

- **Filters:** a goal picker, and standing chips: *All · Fits the live page ·
  Stale · Conflicts*, each with its count (0340's standings).
- **A card per change**, leading with its goal chip and how long it has
  waited, then the change in one line, then page · standing · stake.
- **The drawer for one change:**
  - The goal it serves, its standing, the change as a heading, and
    *page · proposed for vN · live is vM · when*.
  - A notice band when it matters: amber for *stale* (and for *a similar change
    was turned down on <date>: "<reason>"*, from 0341), red for *conflicts*.
  - **Before and after side by side**: two small outlines of the page, the
    moved or added part outlined green in *after*, the part going or moving
    outlined red and dashed in *before*. Not a diff of tree JSON.
  - *Why Loom proposes it* (the figure behind it, with the page views it rests
    on), *What it expects* (a predicted range on its goal and how long it will
    be measured for), *At stake* (the stake in words, and which roles can
    accept it).
  - A reason box for turning down (optional, remembered per 0341), then
    **Accept** (the one black button, absent when the change conflicts; it
    makes the change live on the site's next pull) and *Turn down*, with one line saying what accepting
    does next.
  - Below the list: *Turned down recently: N · see them*.

**New:** the goal on a proposal (with Goals), and a predicted effect.

## 3 · Goals

**Answers:** what are we trying to get readers to do?

- **A goal** is one outcome per project, built only from signals already
  collected: a kind (*presses* = activated, *finishes* = completed, *opens* =
  disclosed, *stays on* = dwelled past a threshold) on a part, on all pages or
  on chosen ones.
- **One goal is primary.** Loom proposes toward it unless a page has its own.
  A page with no goal on it gets no proposals.
- **Rate** = readers who did it, out of page views on the pages it covers.
- **The list:** goal (with a *primary* mark and since when), what counts, where,
  the 7-day rate with its trend, and changes for it (*2 waiting · 3 shipped*).
- **New goal** opens in the drawer: name; *counts when a reader* + *the part*;
  **or pick the part on the page** (a small outline of the page, the picked
  part outlined green); all pages or only some; a green band previewing what
  it would have counted over the last 7 days; *Make this the primary goal*;
  *Save goal*.
- Every proposal names one goal (screen 2) and every result is measured on one
  (screen 5).

**New data:** a goals table, the proposer reading goals, and a decision record.

## 4 · Unit 8 · An accepted change goes live

> **Changed on 6 November 2026** ([0358](../decisions/0358-an-accepted-change-goes-live-from-the-portal-and-the-site-pulls-it-with-no-pull-request.md)).
> The board drew a pull request. The maintainer chose that the review stays in
> the portal and *Accept* makes the change live, with no pull request and no
> third party. The section below is the board as amended.

**Answers:** where is the change I accepted?

Reached from *Accept* and from the change itself afterwards. Breadcrumb
*For review / Accepted*, the change as a heading with its goal chip, and
*page · accepted by <who> on <date> · stake*.

- **A timeline**, each step with its time: *Accepted* (the Gate ran again and
  applied it to Loom's copy) → *Live* (the site's next pull took it; until
  then, *Waiting for the site to pull*, or *Your site is not pulling yet* with
  the way to connect it) → *Measuring* (the agreed window on the new version
  against the same on the old, on its goal) → *Result* (a plain verdict, also
  on the page's history). Done steps green, the current one ringed, the rest
  grey.
- If the site later publishes a newer version and the change no longer fits
  it, the timeline ends at *No longer fits the site's newer version*, and the
  change is listed on the page's history; Loom may propose it again.
- **And the site's connection** (it lives on *Connect your site*): whether the
  site pulls, when it last did, and the snippet that makes it pull.

**Needs:** a read door that hands a project's live pages to its key, the pull
in the customer's app (framework code), and the replay of accepted changes
onto a newer snapshot (0358).

## 5 · Pages · History

**Answers:** did the changes we shipped work?

A page's screen gets tabs: *The page · History · For review (N)*, and a
*Measured on* goal picker.

- **A chart** of the goal's daily rate over the last 8 weeks, bars coloured by
  where the version came from (green after a Loom change, grey after the site's
  own edit), with version labels along the bottom at each boundary.
- **One card per version, newest first:** the version and its date; what
  changed; where it came from (*Loom change, accepted by <who>*, or *the
  site's own edit*); before → after on the goal with the window and the page
  views each side rests on; a verdict; *Compare* and, for Loom changes,
  *Propose reverting*. An accepted change the site has not pulled yet sits on
  top as a dashed card, *Not live yet*, linking to its timeline.
- Loom does not judge changes it did not make: a site edit shows its before and
  after for context and says *Not a Loom change*.

**Settled by the maintainer on 5 November:**

- **The window is 14 days each side**: the last 14 days on the old version
  against the first 14 days on the new one, counted from when the snapshot with
  the new version arrives. When the old version was live for less than 14 days,
  the before side is however long it was live, and the card says so.
- **Each side needs at least 1,000 page views** of the page before Loom gives
  any verdict but *Too early*. Below that on either side, the card shows the
  figures and says *Too early*, with how many more page views it needs.
- *Helped* and *Hurt* also need the difference to hold up statistically (a
  two-proportion test at 95%); otherwise the verdict is *No clear change*. The
  test stays behind a disclosure, never in the verdict.

## 6 · Segments (later, rough)

**Not designed.** On the canvas only so the other screens leave room for it.

A segment is a group of readers who behave differently (new or returning, from
search, on a phone), and it is an audience (0263), so a change for one segment
is an audience-scoped delta. It would show as a segment filter on Signals, a
split of before and after on History, and *only for: <segment>* on a proposed
change. It is defined only from what a batch already says, never from anything
personal (`docs/signals.md` rule 1, and the deferral of per-reader identity).
It needs its own decision record before any of it is built.

---

## Build order

| # | Screen | What changes | Needs first |
| --- | --- | --- | --- |
| 1 | Signals | Figures, chart, Events and By page tabs, the drawer | A table keeping events 30 days (settled), for Events only |
| 2 | For review | Rename, goal-led cards, before and after in the drawer | #767; the goal field arrives with 3 |
| 3 | Goals | Define goals, one primary; proposals name one | A goals table and a record |
| 4 | Unit 8 | Accept goes live; the timeline follows it | A read door, the site's pull (framework), the replay (0358) |
| 5 | Pages · History | Versions on a timeline with before and after | Goals |
| 6 | Segments | Rough concept only | Its own record, on 0263 |

The chrome (the rail) can land with whichever unit touches the frame first.
