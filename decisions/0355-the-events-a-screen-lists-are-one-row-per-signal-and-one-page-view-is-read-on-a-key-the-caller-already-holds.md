# 0355 — The events a screen lists are one row per signal, and one page view is read on a key the caller already holds

**Status:** Accepted — partially supersedes [0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)

**Date:** 5 November 2026

**Section:** §4c (reader signals), §5 (portal)

> **What is overturned, and by whom.** 0146 decided that nothing in the portal
> reads the `view` key and nothing joins on it. A drawer showing *the rest of
> this page view* reads it and joins on it, so that clause does not survive this
> unit. **It does not survive because
> [0349](0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)
> does not leave it standing** — the maintainer's own decision of 5 November,
> taken so that the *Events* tab with that exact drawer becomes buildable, with
> the wireframe for it approved in `docs/portal-wireframes.md`. The shape below
> is this lane's; the direction is not, and it is called out in the report and on
> the pull request for that reason. *What of 0146 this overturns* sets out the
> one clause and the four that stand.

## Context

Two decisions on 5 November left the *Events* tab one module short. 0349 settled
that individual reader events are **kept for thirty days** by default, with the
tallies staying the durable record.
[0351](0351-a-counted-delivery-is-kept-for-a-stated-window-rather-than-deleted-by-the-fold.md)
built it: a counted delivery is marked rather than deleted, and a second sweep
on a second window deletes it.

The rows are therefore there, and nothing could read them. `ReaderSignalJournal.read`
is the store's own handle — it pages by an opaque cursor, it filters by tree, and
since 0351 it tells counted rows from uncounted ones — but it is not scoped to an
application the way `readingsFor(applicationId)` is, it hands back a
`ReceivedBatch`, and a portal calling it would be reaching the table. 0351 said
so in its own consequences and filed it.

Three questions had to be answered to build it, and only the first is obvious.

**What is a row?** A delivery carries one to hundreds of signals. The screen's
columns are *time, kind, page, part, version* — one row per signal — so the
handle has to flatten, and then a page of fifty rows is not a page of fifty
anything the store pages by.

**What is a page?** The store pages deliveries and hands out a cursor at a page
boundary. Fifty events can end in the middle of a delivery that carried sixty,
and no `ReaderSignalPage` names a position inside one.

**What may the drawer correlate?** *The rest of this page view* is the panel the
wireframe draws, and the `view` key is the only thing that could answer it —
which is the value 0146 wrote down with its bounds precisely so that widening it
had to be a record.

## Decision

**One row per signal, carrying its delivery's facts.** `ReaderEvent` is the
signal itself — the closed five-kind union, whole — beside the delivery's `seq`
and place as an opaque id, the instant the intake stamped, what the page said the
time was, the tree, the revision, the audience it was filed under, the page view
it belonged to, and when a fold counted it. The signal is carried rather than
spread into columns because a parallel shape would be a second vocabulary to keep
in step, and the first thing it would lose is that a `dwelled` has **no instant
of its own** and a `viewed` does.

**The list is in arrival order, and the reader's clock is shown and never sorted
by.** A browser's clock is attacker-controlled; `receivedAt` is the only instant
this subsystem vouches for. *Happened* against *Received* is a sentence an
operator can read, and a list a page could reorder is a list a page could hide a
row at the bottom of.

**A delivery's own signals keep the order it sent them in.** Deliveries are
newest first; inside one, the sender's array order stands. That order is the only
account of their sequence anybody has, so reversing it to make the whole list
monotonic would be the handle asserting a sequence the sender never claimed.

**A page holds exactly the limit, and the cursor is the store's cursor plus what
has been shown.** `[cursor, skip]`, base64url, opaque to the caller: *resume this
chunk of deliveries and skip the events already drawn*. A chunk is `limit`
deliveries, every delivery carries at least one signal, so **a page costs at most
two reads** — one when a chunk is whole, two when a resumed chunk leaves it
short — and that cost does not grow with how deep the reader has paged.

**One page view is read on a key the caller already holds.** The store's read
request gains `view`, served by a partial index on the column, and the handle
exposes it as `pageView(key)`. There is nothing that enumerates keys and nothing
that takes a row and asks *what else shares this one's key*: one key in, one page
view out. The panel is bounded rather than paged and says when there is more.

**It counts nothing, and it names nothing.** No total over the list, no facet
count, no figure of any kind: 0349's second clause is that nothing said over all
time comes out of these rows, and the tallies already hold exactly those counts
and go on answering after a row is swept. Page headings and part labels are the
portal's join from what the site published (0312), as *By page* already does.

**It says nothing about which delivery opened a page view.** The wire carries
that marker and both journals drop it at the door (0219). It is not an omission
to fix: a row saying *this page view began at this instant* is the step toward a
profile that §7 of `docs/signals.md` refused, and a window of thirty days makes
that argument stronger rather than weaker.

**Every read is bounded in the handle**, not at the call site. The *Signals*
screen bounds the journal where it reads it, because the door **writes** through
the same handle and a write cut off by a screen's budget would lose a reader's
batch. This handle only reads, so the budget belongs where a screen cannot
forget it (0262).

## What of 0146 this overturns

**Overturned, one clause:** *"Nothing in the portal reads it; nothing joins on
it."* The portal reads the `view` key — it is a field in the drawer — and joins
on it, once, to list the deliveries of the page view a row belongs to.

**Standing, and they are the four that carry the privacy argument:**

- *A reader signal remains anonymous and node-shaped.* Untouched. No column
  here could identify anybody, which is rule 1 as a schema.
- *Correlation is scoped to one page view.* This is the clause the narrowing
  **enforces** rather than relaxes. The key is still random per page view,
  derived from nothing about the reader, never returned to a browser, and
  correlates nothing across two page views — and now the only read that uses it
  takes one key and cannot be asked for two.
- *A funnel is a question about the tree, not about a person.* Untouched;
  funnels are still counters.
- *Retention is a per-deployment policy.* Untouched, and 0349 is that clause
  being exercised rather than broken.

**What changed under the clause**, and 0351 already wrote it down: the key lives
for as long as the kept window rather than for an hour, because 0349 says so. A
clause written when the key was gone within the hour cannot settle what a
thirty-day window is for, and the thing the window is *for* is an operator
looking at the deliveries their totals were made from.

## Consequences

- **The *Events* tab is buildable.** `readerEventsFor(application)` is the
  scoped handle, `list` is the table and `pageView` the drawer's panel. What is
  left is the screen, which is `Loom portal`'s, and it is filed.
- **A page is exact in events and the cursor is not the store's.** A caller
  passing a `ReaderEventPage.older` to `ReaderSignalJournal.read` gets nonsense
  rather than an error, which is the ordinary property of an opaque cursor and
  is why the two are different types in the same file.
- **The kind chips in the wireframe are not a filter this handle has.** Kind
  lives inside the delivery's JSON array; filtering on it means either a
  predicate over a thirty-day table or over-reading and discarding, which would
  break the exact page. It is filed with the recommendation that the chips read
  the tallies, as the facet counts already must.
- **The drawer's panel shows the start of a page view.** A reader who stayed an
  hour has more signals than a drawer can draw, so the panel is bounded and says
  `more`. An event late in a long page view will not be inside its own panel,
  which is a limit worth a sentence on the screen rather than a cursor here, and
  it is filed.
- **A second partial index on the deliveries table.** `(application_id, view)
  where view is not null`, because a delivery that names no page view is never
  looked up by one. It is created in `migrate.ts` beside the uncounted index,
  which is where the other partial index lives.
- **Per-reader identity is no nearer.** The narrowing added here takes a key and
  returns one page view; it cannot be asked which keys exist, and it cannot be
  asked what a row shares a key with. Those are the two shapes that would make
  stitching cheap, and neither is reachable from this surface. The gate the
  maintainer parked on 30 September is as expensive to open as it was yesterday.

## Alternatives considered

**Page by delivery and let a page hold however many events that is.** The
store's cursors pass straight through, there is no cursor of our own, and the
whole paging question disappears. Rejected: a dwell-heavy delivery carries a
signal per node on screen, so fifty deliveries can be two thousand rows, and the
screen asking for a page of fifty would get a page it cannot draw. The variance
is the problem rather than the size — a list whose page length swings between
fifty and two thousand cannot report *1–50 of* anything, which is the one line
the wireframe's pagination pattern requires.

**Mint a store cursor from the `seq` on the row.** Cursors in this repository are
`String(position)` and `seq` is a published field, so a cursor pointing inside a
chunk is two lines. Rejected: it makes a screen depend on the encoding of a value
every store contract calls opaque and passed back unread, and the day a store
pages by anything else — a timestamp, a composite — the screen breaks in a way no
contract suite would catch. The chunk-and-skip cursor needs nothing from the
store but the cursor the store handed out.

**Re-read from the first page every time.** A cursor of *skip N events* alone,
walking from the newest end. Simple, no chunk bookkeeping. Rejected on cost: the
seventh page would read six pages of deliveries to find its own, and the whole
point of a cursor is that page seven costs what page one did. This is the same
objection the facets have, one table down.

**A second method on the journal for one page view.** Rather than a filter on
the read request. Rejected: the paging rules — the clamp, the two ends, the
opaque cursor — are on the request, and a second method would either repeat them
or quietly not have them. A page view holds few deliveries, but *few* is a
sender's choice rather than a bound, so the read that serves a drawer should be a
page like every other read here.

**A `firstOfView` column, so the drawer can say where a page view began.**
Tempting, cheap, and one `UPDATE` away from existing. Rejected, and not as a
scoping call: 0219 refused to store the opening marker because a row that says
when a page view began is a row about a visit rather than about a node, and the
thirty-day window makes that worse rather than better. The door counts arrivals
and the row does not remember them.

**Facet counts and a list total off these rows.** A `GROUP BY` over the kept
window, which is what every analytics list has at the top of it. Rejected: it is
a cost that grows with a setting a deployment is invited to lengthen, on a screen
somebody leaves open, and the numbers already exist on the tallies — which is
0349's second clause working as intended.
