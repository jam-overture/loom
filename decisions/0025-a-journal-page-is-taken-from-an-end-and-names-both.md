# 0025 — A journal page is taken from an end, and names both of its ends

**Status:** Accepted
**Date:** 2026-07-31
**Section:** §6

## Context

0023 gave the runtime a journal, and it paged one way: forward from a cursor,
oldest first, with a single `cursor` naming the next page. That is the shape
0020 set for the store's tree listing, and it was copied without much thought
because at the time nothing read the journal.

The first reader made the problem obvious. A journal is append-only and only
grows, and the question asked of it is almost always *what happened recently* —
the last few asks, the refusals from this afternoon, whether the change someone
just made went through. Forward-only paging answers that question by reading
every record ever written first. On a journal with a month of alpha traffic
behind it, the newest page costs a full scan; the cost grows with age, and it
grows fastest exactly when the journal is most worth reading.

A listing of trees does not have this problem, which is why the shape was
wrong to copy. Trees are a set someone browses; journal records are a timeline
someone reads from the end.

There is a second, subtler problem. Reading backwards naturally produces records
in descending order, and `episodesOf` folds a stream in arrival order — it walks
records forward, building proposals as it sees them proposed. A page that
sometimes arrived reversed would make every consumer responsible for knowing
which, and silently wrong on the occasions it guessed. The fold does not fail on
a reversed page; it produces plausible episodes with the wrong resolutions.

## Decision

**A read names the end it starts from, and a page always comes back in arrival
order.**

`TelemetryReadRequest` gains `direction: "newer" | "older"`, defaulting to
`"newer"` — the existing behaviour, unchanged for anyone already calling it.
`"older"` with no cursor is the newest page.

`TelemetryPage` drops its single `cursor` and reports both ends instead:

```ts
{
  records: readonly RecordedTelemetry[]  // always ascending by seq
  older: string | null                   // pass back with direction: "older"
  newer: string | null                   // pass back with direction: "newer"
}
```

`records` is ascending whichever end the page was taken from. The direction is a
property of *which* records a page contains, never of the order they arrive in.
An implementation that scans descending — as the Postgres one does, so the newest
page is one index seek — reverses before returning.

A cursor is `null` when the page reaches that end: `older: null` means these are
the oldest records, `newer: null` means these were the newest *at the time of the
read*. The second is deliberately weaker than the first, because a journal that
is still being written to will have more a moment later, and a page cannot
promise otherwise.

Deciding which ends a page names is one shared function, `pageCursors`, rather
than logic each implementation repeats. It is the part most likely to drift
between two backends and the least likely to be noticed when it does.

## Consequences

- The newest page is one index seek on the `(tree_id, seq)` index rather than a
  scan, and stays that way as the journal grows.
- `episodesOf` is unchanged, and stays unchanged: it never learns that a page had
  a direction, because a page's order does not depend on one.
- `TelemetryPage.cursor` is gone. This is a breaking change to a contract
  introduced yesterday with no external consumers; the portal is the first reader
  and was written against the new shape.
- The contract suite grew a `paging backwards` block that both implementations
  run, including a walk that pages back through a whole journal and asserts it
  reassembles exactly what a forward read returns.
- A caller that invents a cursor rather than using one a page handed it may be
  told there is a page on the far side when there is not — the far end is
  inferred from the fact that a cursor was given, rather than probed. The cost is
  one click to an empty page; the alternative is a second query on every read to
  answer a question no real flow asks.

## Alternatives considered

**Leave it forward-only and have the reader page to the end.** Correct and
simple, and it makes the most common read the most expensive thing the portal
does. It also degrades with age rather than with the size of the answer, which is
the wrong direction for something built to be read months later.

**A separate `readLatest()` operation.** Keeps `read` untouched and adds a second
entry point. Rejected because it splits one concept into two contracts every
implementation must satisfy consistently, and the second one still needs paging
the moment anyone wants the page before the latest — at which point it is `read`
with a direction, spelled differently.

**Return backwards pages in descending order.** The natural output of the query,
and it saves a reverse. Rejected because it makes the order of a page a function
of how it was requested, which pushes the responsibility onto every consumer and
onto the fold in particular — where getting it wrong produces confident, wrong
episodes rather than an error.

**Order by `occurredAt` instead of `seq`, so paging is by time.** Rejected for
the reason 0023 already gave for `seq` existing: two serverless instances
disagree about the clock by more than the gap between two events in one request,
so a timestamp cursor skips or repeats rows. Arrival order is the only order that
pages correctly.

**Probe both ends on every read** so `older` and `newer` are exact. Rejected as
a second query per read to make a case exact that only arises when a caller
fabricates a cursor. The contract documents what the inference is instead.
