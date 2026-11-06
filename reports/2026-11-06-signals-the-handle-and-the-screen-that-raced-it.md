# Reader signals — the handle, the screen that raced it, and a 400-delivery sample

**Run:** `Loom signals`, 6 November 2026 — a short follow-up woken by activity on
#780, not a scheduled pass
**Branch:** `signals-76-the-handle-and-the-screen-that-raced-it`
**Records:** none new; [0355](../decisions/0355-the-events-a-screen-lists-are-one-row-per-signal-and-one-page-view-is-read-on-a-key-the-caller-already-holds.md)
is annotated with the maintainer's ratification

**No code changed.** Three documents did: a record, the plan, and `FINDINGS.md`.

## Why this run exists

#780 merged and the maintainer answered the three questions on it with *"okay,
go with your recommendations."* All three recommendations were *keep as built*,
so there was nothing to change in code — but the answer had to get into the
repository, because a routine reads open pull requests, `FINDINGS.md`, the plan
and the recent reports, and **not the comments on a merged pull request**. Left
where it was, the next run would have found three questions presented as open
and reversible, and might have spent a cycle re-opening a supersession the
maintainer had already agreed to.

So: 0355 carries the ratification, and §75 of `docs/signals.md` says it in one
sentence.

## What the same read turned up, which is the substance of this report

Reading `main` to branch from it, this lane found that **the *Events* screen
shipped before the handle it was waiting for.** `Loom portal` built it on 5 and
6 November (#782, #784, #785) against `readingsFor(application).journal`
directly, having read §74's finding as saying the journal already *was* the
scoped handle it asked for. #780 landed the handle this lane meant a few hours
later. Both lanes solved the same morning's problem on the same morning, and
neither was idle or wrong: the finding could be read either way, and a routine
with a morning's budget and a screen to ship read it the cheaper way.

**The screen is correct about everything it says.** The part worth acting on is
one capability that arrived too late to be used, and it is a real limit rather
than a tidiness point.

`readOpenedEvent` finds *the rest of this page view* by reading the **200
deliveries either side** of the event and keeping those whose key matches,
reporting `whole: false` where there were more; `?view=` filters the same capped
scan. Against a journal that can only be walked, that is exactly right. What it
means in production is that **the drawer's panel is a sample of a window of time
rather than a page view**: with ten readers on a site, a page view's own
deliveries are interleaved with hundreds of others, each of which spends one of
the 400 places. *Events from this view* can quietly omit for the same reason.

`read({ view })`, which #780 added for precisely that panel, is exact, is one
indexed read on a partial index, cannot overrun a window of time, and is bounded
as a page like every other read. One field.

That is filed for `Loom portal` as the single recommendation to take now:
point the panel and `?view=` at the narrowing, leave the rest of the screen
alone. `readerEventsFor(application).pageView(key, limit?)` wraps it, or the
journal can be called directly — the narrowing is the part that matters.

## What this run deliberately did not do

- **It did not touch `apps/loom/app/(portal)/`.** That is another lane's, so the
  change is filed rather than made, even though it is one line.
- **It did not delete its own now-uncalled module.** `main` holds two readings
  of these rows — the portal's, which the screen uses and which has the filters,
  the naming and the goal chips, and this lane's, which nothing calls. Neither
  is simply better: the portal's buys the kind chips and the search by scanning
  and filtering in memory; this one pages exactly at no more than two reads and
  never mints a store cursor from `seq`, which the portal's does. Deleting
  either on one lane's initiative would throw away a half before anybody
  compared them, and **where the surviving one lives is a question about the
  lane boundary** rather than about code. It is in the finding, addressed to the
  maintainer, with the undertaking that the losing module goes in one commit
  once he says which way it falls.
- **It did not start the next unit, and was right not to.** `Loom portal` filed
  a well-specified finding this morning — *page views counted by hour*, for the
  range picker, the hourly chart and the range figures, through a scoped handle
  — and starting a table-and-migration unit from a notification wake is the
  shape this lane is told not to take. **It shipped while this branch was
  open**, as §76 and
  [0356](../decisions/0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md)
  (#786), a sixth counter written at the door rather than a read of the
  deliveries — so the restraint cost nothing and a scheduled pass did the work
  this wake would have duplicated. It also means **two things are called
  *Signals 76***: that unit, which is the plan's §76, and this branch, which
  adds no step and whose number is dropped from its title rather than
  renumbered.

## Test numbers, as they ran

| | |
| --- | --- |
| `pnpm verify` | **green** |
| Package suite | **6,292 passed, 261 files**, 0 failed, 0 skipped |
| App suite | **6,748 passed, 415 files**, 0 failed, 0 skipped |
| `pnpm findings:check` | 1,441 findings, 0 malformed |

No test was added, because no behaviour changed. Nothing was skipped.

## Browser cost

**Nothing was added that runs in a reader's browser**, and nothing in `src/` or
the app changed at all. `broadcast.ts` is untouched; the bundle stands at the
**6,513 bytes minified, 2,993 gzipped** measured on #780.

## Open questions

One, and it is in the finding rather than invented here: **which of the two
event readings survives, and therefore where the boundary between the intake and
the portal sits for these rows.** This lane's recommendation is one reading with
the portal's capabilities and this one's cursor discipline; it has no preference
about which side of the boundary it lives on, and will delete its own module the
day the answer is *the portal's*.
