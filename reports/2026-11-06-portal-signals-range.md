# Signals reads over a range, with page views by hour

**Lane:** `Loom portal` · **Date:** 6 November 2026 ·
**Branch:** `claude/project-thread-0mthi0` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8a ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *1 · Signals*, header, figures and chart

## Why this, and why now

No portal pull request was open. The first row of the agreed order that is not
done is still 8a, and its range picker, hourly chart and range figures had
waited on the `Loom signals` finding for page views counted by hour. That
landed today as #786 (0356), with `readReaderArrivals` reading a range and the
period before it in one call through the tally store the portal already holds.
So the input is on `main`, and this run built on it. Unit 8 (0358, merged
today) is next in the order.

## What shipped

- **A range picker above both *Signals* tabs:** *Last 24 hours · Last 7 days ·
  Last 30 days*, in the address as `?range=` and the last 24 hours when none is
  named (the address stays as it was for the default). Every link and form on
  *Events* and *By page* carries it, as do the two tabs, so the range survives
  filtering, paging, the *Live* switch and moving between tabs.
- **The first figure is page views in the range**, with the change on the
  period of the same length before: *Down 2% on the 24 hours before (1,095)*;
  *None in the 24 hours before* where that period was counted and empty;
  *Nothing to compare with: the 30 days before were not counted* where it was
  not. The total since counting began stays, beneath it.
- **A bar chart of page views by hour** under the figures: one bar an hour
  (24, 168 or 720), drawn on the server as one stretched SVG with no script or
  library, the hour in progress lighter so the right edge does not read as a
  drop, each bar saying its hour and count when pointed at, and one sentence for
  a screen reader. Where counting by hour began inside the range, the chart
  starts there and says so; where nothing has been counted by hour, it says so.
- **It degrades.** If the hourly table cannot be read (a production database
  where `pnpm db:push` for #786 has not run), the figure is the total, as
  before, saying the hours could not be read, and no chart is drawn. This run
  adds no table, so it needs no `db:push` of its own.
- The `Loom signals` finding is closed with what closed it, and a new one is
  filed for the last of 8a: a goal's figure for a range and *By page*'s bars
  for one need what readers did on a part counted by hour, and only page views
  are.

## Decisions taken

- **The last 24 hours by default.** The wireframe lists it first, and the
  screen is where a person looks to see whether anything is arriving. One line
  to change in `_lib/signals-range.ts`.
- **The range does not filter the *Events* list.** The list is already newest
  first and paginated through the kept window; the range is what the figures
  and chart read over. Filtering the list by range would add a second cursor
  rule for no question the wireframe asks.
- **No decision record.** It reads what 0356 publishes and changes no rule.

## Tests

- `pnpm verify` exit 0 on this branch: framework 6,434 passed (2 skipped), app
  6,808 passed across 418 files, prerender check clean.
- New: `_lib/signals-range.test.ts` (range parsing and addresses, whole-hour
  ranges, the three comparison sentences and no change, the fallback figure,
  the chart's bars, heights, partial hour, titles, ends, the clipped and empty
  notes, day labels for a week); `signals-frame.test.tsx` (figure and chart
  from one reading, the picker's addresses and current choice, the range kept
  on the tabs, the fallback with no chart); `events.test.ts` (range parsed, a
  bad one falling back, carried by `eventsHref` with and without a cursor).

## Screenshots

A local deployment with nine days of seeded hourly counts on one page:

- `2026-11-06-portal-signals-range-24h.webp`: *Events*, last 24 hours, with the
  comparison and the hour in progress lighter.
- `2026-11-06-portal-signals-range-7d.webp`: *By page*, last 7 days.
- `2026-11-06-portal-signals-range-30d.webp`: last 30 days on a deployment that
  has counted for nine, saying where the chart starts and that the period
  before was not counted.

## Still missing from *1 · Signals*

The primary goal's figure for the range, and on *By page* the bars for a range
and each goal's trend, all waiting on the new `Loom signals` finding.
