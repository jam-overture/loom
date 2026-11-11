# 0378. A fix-list's row carries the place its page's reading stopped, and the fourth reading cannot take a row away

**Status:** Accepted
**Date:** 2026-11-10
**Section:** §5 (reader signals), the counters

## Context

[0377](0377-a-deployments-unread-places-are-a-fourth-order-ranked-on-what-one-fix-recovers.md)
built a fourth order over a deployment's pages: each page ranked by the parts
behind its single costliest **place the reading stopped** — not by its whole
unread count, which is the figure
[0374](0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md)
was written to replace. It stands beside the fix-list, and the record closed
with the question it deliberately left open: whether the fix-list itself should
know about it.

**The gap this closes is the one filed the same evening.** `AgendaRow` carries a
page as three readings have it and the instruction *rewrite the page*. **It
names no part of the page.** An operator reads *rewrite this page* and opens it
with no idea where to start, while the figure that says where was one join away
and keyed on the same trio.

Two locations were available on or beside the row, and they are **different
questions** — which is why this is a record rather than a field somebody adds.

| | the sentence | where it was |
| --- | --- | --- |
| `row.order.at` | *a third of the readers who got this far stopped between these two parts* | on the row already, from `RankedPage` (0250) |
| `PageUnread.at` | *the reading goes no further than here, and nineteen parts are behind it* | `unread.ranked`, keyed on the same trio (0377) |

A fall needs **both** ends to have reported and is a ratio of two reach counts.
A place the reading stopped is the other end of the same page, where there is no
ratio to take: nothing beyond it reported anything at all. A row that printed
one under a heading that reads like the other would be the plainest kind of
wrong, which is why `progress.ts` owns the word *stop* and nothing in
`frontier.ts` or `unread.ts` uses it.

**And the fourth reading can be short.** The three readings `deploymentAgendaOf`
already takes are each required, and a row exists only where all three name the
page — a caller holding two windows gets a join of the intersection, counted in
`DeploymentAgenda.unpaired`. Applying that rule to a fourth reading would mean a
places reading of the wrong window could **delete rows from the fix-list**,
which is the worst failure available to this join: the fix-list is the artefact
that says there is work at all.

## Decision

**A fifth required argument to `deploymentAgendaOf`, read onto the rows, which
cannot change anything else about the list.**

**The place rides on the row.** `AgendaRow.unread` is the page as the order of
places has it — `PageUnread`, carried whole and unchanged, the same object that
order published. `windowAgendaOf` hands its own `WindowAgenda.unread` in, so a
screen drawing the fourth order and the fix-list over it holds **one** answer
about one page, which is the guarantee the conversion row beside it is carried
under (0265's rule applied to a join).

**Required rather than optional**, on the terms the schedule and the refusal
rows above it are required (0322, 0343): an argument a caller may omit is a
fix-list that type-checks, runs, and goes on saying *rewrite this page* without
saying where — which is the state this record exists to end.

**A short fourth reading costs a row its place and nothing else.** A page the
places reading does not name keeps its row, with `null` where the place would
be. This is a deliberate asymmetry with the three readings above, and it is the
whole of the design: the three decide *whether there is a row*, and this decides
*whether that row knows where to go*. Pages the places order named that no row
carries are counted in `unpaired.unread`, which is the same claim the other
three make and the only direction that number can take — the other direction is
the `null` on the rows, where a caller can count it.

**Nothing else moves, and that is asserted rather than argued.**
`DeploymentAgenda.first`, `work`, `page`, `converting`, `collection`,
`contested`, `subject` and `trees` are what they were. A test builds the same
join twice — once with the places and once with a places reading of nothing —
and holds every published field but the place on a row and `unpaired.unread`
identical.

**`AgendaWork` does not gain a member.** The vocabulary answers *whose hand*,
and an unread band is the page writer's work exactly as a fall is. `agenda.ts`
already states this about a leak and the same paragraph covers this.

**`first` stays the three orders' answer.** Whether *go and look at this band*
may ever be the one thing to do first is a judgement about a screen; 0377 left
it open with the figures on the table and this record leaves it there. The key
is parts of a page and the three orders are readers, so there is nothing to
compare (0327).

**No figure is summed.** `DeploymentUnread` already publishes the deployment's
places and parts. A total here would be a second answer to one question, which
is the refusal 0327 makes and the rule this file already keeps about every
reader figure on a row. The published keys of `DeploymentAgenda` are asserted as
a set, because the way such a figure arrives is somebody adding one field.

## Consequences

**A fix-list row says which page to rewrite and where on it.** *Rewrite this
page* arrives with *and here is where*, out of counters that already existed, at
the cost of one argument on one call.

**The two locations on one row stay two sentences.** `row.order.at` is a fall
between two parts that both reported; `row.unread.at` is where the reading ends.
Both are published, neither is derived from the other, and the member comments
on each say what a surface may print it under.

**A page can be in the fix-list with no place and no fault.** Its reading was
`whole`, or nobody opened it, or the window was read as neither form — the
standing on the carried row says which, and `null` on the row means only that
the fourth reading did not name the page.

**One published type gains one member and one gains a nested count.**
`AgendaRow.unread` and `DeploymentAgenda.unpaired.unread`. Additive, so nothing
that reads them breaks, and **no new name is published on
`@jam-overture/loom/signals`** — `PageUnread` has been exported since 0377.
That is worth stating in this record rather than in a report, because the docs
search index was 148 bytes under its 40,000-byte cap on `main` this morning and
the pull request before this one from this lane is held on exactly that line.

**Nothing reaches a reader's browser, and nothing is added to any payload or
table.** `broadcast.ts` and its import graph are untouched. The bundle measures
7,543 bytes minified and 3,350 gzipped, which is what it measures on `main`.

**Nothing here is a step toward per-reader identity and nothing here makes it
more expensive to add.** The field is a reading of a tree joined to a reading of
a tree. No key, no region, no reader: the `view` key is not read, not stored and
not named by either module.

## Alternatives considered

**Requiring the fourth reading for a row, as the three above it are required.**
The consistent choice and the dangerous one. A caller holding a places reading
of another window would lose fix-list rows — the page it cannot say *where* about
would stop being a page it says *rewrite* about. Rejected: the place is an
addition to a row, not a condition of one, and the asymmetry is cheaper to
explain than a fix-list that shrinks.

**Leaving it optional.** It would have let every existing caller compile
untouched, which is exactly the hazard 0343 recorded: the reading lost by
omitting it is the one the finding was filed about, and an omitted argument is a
space in a diff rather than a word a reviewer can read.

**Putting the place in `DeploymentAgenda.first`'s ordering.** The question 0377
left open, and not a coding decision. A page high in the order of places and
absent from `page` is a real state, and whether an operator's first instruction
may be *go and look at this band* is a judgement about a screen. Left open a
second time, deliberately.

**A fifth list — `DeploymentAgenda.stopping` — beside the two page orders.** It
would be the fourth order re-published inside a reading whose every figure is a
count of pages, with a key in parts rather than readers, and a caller would then
hold two orders of places that could disagree. Rejected: the order is published
whole from `windowAgendaOf`, and what the fix-list needed was the place *on the
row it already had*.

**A fifth `AgendaWork` member for an unread band.** Eight combinations over a
flat set of four and a renamed `both`, which is a change to an accepted
vocabulary rather than an addition to it (0330, 0336). Rejected for the reason a
leak did not get one.
