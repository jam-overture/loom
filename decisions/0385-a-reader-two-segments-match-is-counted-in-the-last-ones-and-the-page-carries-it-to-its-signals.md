# 0385. A reader two segments match is counted in the last one's, and the page carries it to its signals

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §2 — Composition Runtime; the reasoning plane (signals)

> **Accepted on 12 November 2026.** The maintainer, on the choice that a reader
> two segments match is counted in the last one's: *"Okay, sounds good."*

## Context

[0371](0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)
clause 7 builds segments in four pieces. Pieces 1 to 3 are on `main`: the
portal writes each page's ordered rule list through 0376's store, the read door
answers those lists beside the live pages (#866), and *Signals*, *By page* and
*Goals* can be narrowed to one segment (#868). Every segment still says *None
yet*, because the pull client a site runs (`src/live/`) read `{ pages }` and
dropped `rules`. `FINDINGS.md` (11 November, *segments are written in the
portal now, and no site sorts its readers by them*) asks the client to do four
things: take the rules from the same pull, sort each request in the host's
process, name the segment on the signals, and keep the last rules with the last
pages through a failed pull.

Two of those had no answer anywhere, and building them needed one:

1. **A reader two rules match.** 0359 clause 3 lets a reader be in more than
   one audience and earn every matching audience's delta, applied in rule
   order. But a batch names **one** audience (0284: `audience` on the batch,
   optional, absent meaning `aud_everyone`). So a reader in two segments has to
   be counted in one of them, or the batch has to be sent more than once.
2. **How the segment reaches the signals.** The server sorts the reader (0263
   clause 4, 0371 clause 2); the signals are gathered in the reader's browser by
   `broadcastReaderSignals`, which knows only what the page's markup says. The
   broadcaster already reads the tree and revision off the root's
   `data-loom-tree` and `data-loom-revision`, and nothing else connects the two
   halves.

## Decision

1. **The pull holds the rules beside the pages, and they move together.**
   `LivePages` gains `rules`, each page's list by its id. A fresh pull replaces
   both; a failed pull keeps both (0358 clause 4). A list that cannot be read,
   a list for a page the answer does not hold, and two lists for one page each
   refuse the whole answer, exactly as an unreadable page does: dropping one
   page's rules would file its segments as everybody's. An answer with no
   `rules` at all (a door from before 0371) is pages with none.
2. **`segmentOf(held, page, context)` sorts one reader, in the site's process.**
   It answers the segment of **the last rule that matches**, or `undefined` for
   none (`aud_everyone`). The context is the host's, and none of it leaves the
   function (0262).
3. **The last rule, because it is the specific one and the one a reader will be
   served.** The portal orders rules general to specific (0371 clause 3), and
   the last matching rule wins a contested part of the page (0359 clause 3). A
   reader counted in that segment is counted in the form they will see once
   piece 4 gives segments forms of their own.
4. **The page carries its segment to its signals.** `RenderOptions.audience`
   (and `RenderRequest.audience`) writes `data-loom-audience` on the root of an
   addressed page, beside its tree and revision; `aud_everyone` writes nothing.
   The broadcaster reads it and puts `audience` on every batch. A value that is
   not an `aud_` id refuses the broadcast with `unaddressed`, rather than
   filing the page's readers as everybody's. A root whose segment changes is a
   new page view, as a new revision is.
5. **A segment changes what is counted, not what is served, until piece 4.**
   The door answers no segment's form of a page yet, so `composeTreeForContext`
   is not called: a reader sorted into a segment gets the live page as every
   reader does. When piece 4 sends forms, the composed tree and this segment
   are the same claim, because both come from the same ordered rules.

## Consequences

- Once a site wires it (three lines, shown in `src/live/index.ts`), every
  segment the portal shows starts counting, and the picker 0371 piece 3 built
  has something to narrow to.
- **No figure double counts.** A page view is filed under exactly one
  audience, so a read that adds audiences together (every read that names none,
  0284) still counts each page view once.
- **A reader in two segments is missing from the earlier one's figures.** The
  portal's *Segments* screen should say so where the order is set: *a reader
  two rules match is counted in the lower one*. That is a sentence for the
  portal's lane, not a change here.
- Nothing about a reader reaches Loom that did not before: the batch gains a
  segment's name, which 0284 already carries and 0371 clause 2 already allows.
- loomjs.org does not sort its readers until its own render passes a context
  and an audience. That is the marketing site's change, and its build reads
  this package from the workspace, so no release is needed for it. Another
  site needs a release past 0.2.0, which does not have `@jam-overture/loom/live`
  at all.

## Alternatives considered

**Count the reader in every segment that matches, one batch each.** Each
segment's figures would then be complete, which is what a person reading one
segment's Signals expects. Rejected because every read that names no audience
adds audiences together (0284), and the portal's *everyone* figures are such a
read: a reader in two segments would be two page views, two arrivals and two
of every action in the figures the whole project is judged on. It also sends
the same signals more than once from a reader's browser, which is more traffic
for the same facts, and turns a mistake in rule order into inflated numbers
rather than missing ones.

**Count the reader in the first matching segment.** `audiencesFor` already
answers audiences in rule order, so the first is one line away. Rejected
because the first match is the most general rule in the order the portal
teaches, and it is the one that loses a contested part of the page: a reader
counted in it would be counted in a segment whose form they do not see, which
is the measurement 0263 clause 5 says is worthless.

**A batch that names a list of audiences.** The honest answer to *a reader in
two segments*, and it changes the batch schema, the intake and all five reader
tables' keys (0284 put one audience in each counter's identity), for a case the
portal can avoid by ordering rules. Left for the day a deployment shows it
needs it.

**Give the broadcaster the segment as an option instead of reading it off the
page.** The broadcaster runs in the browser and the sorting runs on the server,
so the host would have to carry the segment across itself, in a script tag or
a prop, on every page. The root already carries the page's identity for the
same reason, and a segment is part of which form of the page this is.
