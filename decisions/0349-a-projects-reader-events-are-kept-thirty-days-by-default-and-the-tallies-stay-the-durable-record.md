# 0349. A project's reader events are kept thirty days by default, and the tallies stay the durable record

**Status:** Accepted
**Date:** 2026-11-05
**Section:** §5 (portal), the observation plane

## Context

The *Signals* screen of the concept wireframes ([`docs/portal-wireframes.md`](../docs/portal-wireframes.md),
unit 8a of [`docs/portal.md`](../docs/portal.md)) has two tabs. *By page* reads
the tallies this deployment already keeps. *Events* is a paginated list of
individual reader events, newest first, with a drawer for one event and the
rest of its page view beside it. Nothing can draw that list today: a delivery
waits in the buffer until collection folds it into the tallies, and then it is
deleted ([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
`docs/signals.md` rule 5 says the aggregates are the durable artefact and that
retention is per-deployment configuration with a short default, never a
constant.

The wireframe spec put the window to the maintainer as an open question, with
30 days as the recommendation. On 5 November 2026 he took it; the spec records
it as:

> **Settled by the maintainer on 5 November: individual events are kept for 30
> days**, then deleted; the tallies stay as they are.

and the portal routine he resumed that day carries his framing of the whole
target: *"This should be the starting point goal to work towards."*

## Decision

1. **Individual reader events are kept for 30 days by default**, then deleted.
   Thirty days is the default of a per-deployment setting, not a constant, as
   rule 5 requires: a deployment may state a shorter or a longer window.
2. **The tallies stay the durable record.** Nothing the portal says about a
   page over all time is read from the kept events; *By page*, proposals and
   the results of 8c read the counters, exactly as before. The kept events
   serve the *Events* tab and the drawer's *rest of this page view*, and only
   for the window.
3. **Nothing kept identifies a person.** The events are the signals as they
   arrived, with the `view` key as their only correlation (`docs/signals.md`
   rule 2). Keeping them longer does not license stitching page views together.
4. **Where they are kept is the signal intake's to build**, not the portal's
   (`src/signals/`, `apps/loom/app/api/reader-signals/`, the `Loom signals`
   lane). The portal files the need as a finding and builds *By page* in the
   meantime. The *Events* tab is not drawn until the events exist (rule 2 of
   `docs/portal.md`: no screen before its data).
5. **The reader-facing notice says so.** A deployment publishes to its readers
   when a delivery is gone ([0313](0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md),
   [0320](0320-a-notice-publishes-when-a-delivery-goes-and-the-deployment-states-the-sweep-that-takes-it.md)).
   Once events are kept for a window, that notice has to state the window, or
   it promises readers something the deployment no longer does. This is part
   of the same finding.

## Consequences

- The *Events* tab, its kind and page facets, and the event drawer become
  buildable as soon as the intake keeps events; until then *Signals* shows
  *By page* alone, and says nothing about a tab it cannot fill.
- Storage grows with traffic for 30 days rather than for one collection
  interval. A deployment with heavy traffic can state a shorter window.
- Selling a longer window stays a number per deployment, which is why rule 5
  made retention configuration in the first place.
- The collection notice and the retention check of 0320 change with the
  window: the ceiling a reader is told becomes the kept window, not the
  buffer's sweep.

## Alternatives considered

**Keep nothing and build *Events* from the buffer alone.** The buffer already
holds individual deliveries, so a list could be drawn from it with no new
retention at all. It was rejected because the buffer is emptied by every
collection: the list would show the last few minutes on a busy site and
nothing at all on a quiet one an hour later, and a person opening a link to an
event would find it gone. That is a screen whose contents depend on when
collection last ran, which is exactly the kind of answer the portal's rules
forbid.

**Seven days.** Shorter keeps less and costs less, and most debugging of a new
snippet happens within a day. It was the other option weighed. It loses the
14-day windows of 8c, whose before side reaches back two weeks, and it means a
change measured over a fortnight cannot be inspected event by event at all.

**Ninety days or longer.** More history for the *Events* tab and nothing new
for the counters, which already keep everything. It multiplies storage by three
for a list people rarely page that far into, and it moves a reader-facing
promise further from the short default rule 5 asks for.

**Keep events forever and drop the tallies.** One store instead of two, with
every count a query. Rejected because it reverses rule 5 outright, makes every
screen's cost grow with all-time traffic, and keeps more about readers than any
screen needs.
