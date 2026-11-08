# 0366. A broadcast handed a document follows the page, and a client-side navigation is a new page view

**Status:** Accepted
**Date:** 2026-11-07
**Section:** §4c (reader signals)

> **Renumbered from `0361` on 2026-11-08 by `Loom merge`.** This record was
> written as `0361` on 7 November, deliberately stepping over `0360` because two
> open branches claimed that number. `0361` was meanwhile taken on `main` by a
> different record — *the site pulls into its own process, and a host wires the
> live page in two calls* (#798) — which keeps the number as the one already
> there, and `0366` is the next number free on `main` and on every open branch.
> Only the number changed: nothing this record decides is different (0097).
>
> The note this replaced recorded the original choice: `0360` was claimed by
> both `signals-77-what-readers-did-by-hour` (#794, this lane's own) and
> `framework-86-what-a-lane-may-not-do` (#793), and `0361` was taken so that one
> record rather than two would need renumbering.

## Context

`broadcastReaderSignals` has taken the root `Element` of a rendered page since
[0136](0136-a-published-page-broadcasts-reader-signals-when-its-host-asks.md).
It reads the tree id and the revision off that element once, when it is called,
and files every batch under them. Nodes arriving and leaving underneath are
followed — that is §1 of [`docs/signals.md`](../docs/signals.md) and
[0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)'s
walk — but the page's identity is not, and the documented remedy has been *stop
the old broadcast and start another*:

> **A new root, or a new revision in the same root, is a new broadcast** —
> `stop()` the old one and start another, or a client-side navigation files its
> signals under the revision it left.

**That sentence asks the host to notice a client-side navigation and do
something about it, and a host that does not get missing data — it gets wrong
data.** A reader moves from the pricing page to the sign-up page in an
application that routes on the client; the broadcaster is still holding the
pricing page's detached root, and every signal after the navigation is filed
against the pricing page's revision. Nothing says so at either end. The node ids
are real, the batch parses, the intake accepts it, the fold counts it, and the
portal draws it on the wrong page.

It is also an undercount at the door, in the counter the newest readings are
built on. One batch of a page view carries `first`, which is how an arrival is
counted exactly once
([0214](0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)),
so a reader who visits four pages without the broadcast restarting arrives
**once**. Page views by the hour they began in
([0356](0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md)),
the region map (0214), and every figure taken at the door's scale (0250, 0346)
read that marker.

Two things made now the moment. `addressedRootIn` was published on the light
side of the split on 5 November
([0354](0354-the-names-a-render-writes-on-a-published-page-are-published-on-the-light-side-of-the-split.md)),
so finding a page costs a browser one function rather than the render seam. And
the shape was filed twice as an offer this lane had not taken: `Loom marketing`
on 4 November and `Loom framework` on 5 November, the second saying plainly that
*whether the overload is worth an argument that can be two things is this lane's
call.*

## Decision

**`broadcastReaderSignals` takes an `Element` or a `Document`.**

Handed an **element**, it behaves exactly as it did: that element is the root,
its tree and revision are read once, and a page that becomes a different page
needs another call. Nothing about an existing caller changes.

Handed a **document**, it finds the addressed page with `addressedRootIn` and
then **follows the page's identity** — its tree and its revision — through a
`MutationObserver` on the document watching children and the two attributes that
spell that identity. Three clauses, and together they are the counting rule:

1. **A re-render is not a navigation.** Nodes arriving, leaving and changing
   under the root leave the page view alone. A page a proposal has just
   rewritten is one page view, as it was before.
2. **A new identity is a new page view.** A root replaced by a different tree's,
   or the same root re-rendered at a new revision, ends the page view — the old
   broadcast is stopped, which delivers what it gathered **under the revision it
   gathered it on** — and a fresh page view begins, with its own view key and
   its own opening delivery. Nothing correlates the two.
3. **The same identity rendered again is the same page view.** A host that
   unmounts the element it rendered into and renders the same revision again has
   sent the reader nowhere, so the second broadcast is handed the page view the
   first was observing: same key, no second opening, no second arrival.

To make clause 3 true rather than argued, **the page view is lifted out of the
broadcast that observes it**: a key and an `opened` flag, created per page view
and passed to each broadcast that observes it. It is not exported — from this
entry point or from `view.ts`, which `@jam-overture/loom/signals` re-exports
whole — because a host has nothing to do with it.

An unaddressed document is refused with the `unaddressed` code an unaddressed
element already returns. A page that *becomes* unaddressed is not a failure: the
broadcast is stopped, what it gathered is delivered, and the page view is held in
case the same revision comes back.

**Rule 2 of `docs/signals.md` holds, and is not stretched.** A page view is
still one page view of one page: the key is still random per page view, still
derived from nothing about the reader, still never persisted and never returned
to a browser. Two pages a reader saw in one session are two keys, and nothing
anywhere can tell that one reader saw both — which is the same guarantee as
before, now with the arrivals counted.

**Rule 4 is traded against, in the open, and is now enforced rather than
asserted.** The browser bundle goes from **6,513 bytes minified / 2,986 gzipped
to 7,543 / 3,361** — 1,030 bytes, 15.8%, paid by every page that asks for
signals whichever argument it passes. That is the largest single step this entry
point has taken since it was split out, and it buys correct attribution by
default for the routing model nearly every host uses. The import graph is
unchanged and still reaches no package. The same unit adds a **weighed ceiling**
to `browser-weight.test.ts` — 8,000 bytes minified and 3,600 gzipped, built and
gzipped in the test — so the second half of rule 4 stops being a sentence
somebody remembers to re-measure.

## Consequences

- **The one-line snippet a customer pastes gets shorter and starts being
  right.** `snippetFor` in the portal generates a `querySelector`, a null guard
  and a call; it becomes a call. Filed for `Loom portal` rather than changed.
- **Five callers in this repository keep working unchanged** and keep today's
  behaviour, which is now the narrower of the two. Adopting the document form is
  a one-line change each and is each lane's.
- **The arrivals counter and everything at the door's scale get more honest on
  applications that route on the client** — and the figures move when a host
  adopts the new argument, which is a change in what was collected rather than
  in how it is counted. A deployment comparing a window before adoption with one
  after is comparing two collections; the fault vocabulary has no member for
  that and this does not add one.
- **The `MutationObserver` cost is stated and bounded.** Its callback compares
  three values it already holds and returns, so a churning page costs three
  reads per batch of mutations. The one `querySelector` it can run happens only
  when the page it was observing is no longer the page in the document.
- **A per-reader identity stays exactly as expensive to add as it was.** This
  adds no store, no column and no field, and it mints one more key per
  navigation rather than one fewer — a session is still not a thing any part of
  this subsystem can name.

## Alternatives considered

- **Leave it, and keep telling hosts to restart the broadcast.** Rejected: the
  instruction is in a doc comment and the failure is silent, which is the
  combination this subsystem has twice written records about. A host who gets it
  wrong does not get less data, they get data about the wrong page, and nothing
  downstream can tell.
- **A second entry point, so only hosts who follow a page pay the 1,030
  bytes.** Rejected, and it was close. It would hold rule 4 exactly, but it asks
  every host to choose between two doors where one of them silently misattributes
  on the routing model most of them use. One door that does the right thing with
  the argument most hosts have in hand is better than two doors and a paragraph
  explaining which is safe.
- **Follow the element rather than the identity** — re-root whenever the root
  element is replaced. Rejected: a host that re-mounts the same revision would
  count one reader twice, in a counter that is permanent (0158), and this lane's
  rule is that anything that counts is tested against the case that would
  double-count.
- **Re-root but suppress only the arrival, with a fresh view key.** Rejected: it
  moves the double count rather than removing it. `views`, `reached` and
  `engaged` count distinct page views by key, so a continuation under a new key
  inflates all three for exactly the page it was trying to protect.
- **Check the document on the flush tick instead of observing it.** Rejected:
  it saves the observer and spends up to five seconds of every navigation filing
  signals under the page the reader left, which is the fault being fixed.
- **Accept any `ParentNode`, so a host can pass a container.** Rejected for now:
  an `Element` already means *this is the root*, and an element that merely
  contains a root would make one argument mean two things. A host with a
  container calls `addressedRootIn` and passes what it returns, which is what
  that function is for.
