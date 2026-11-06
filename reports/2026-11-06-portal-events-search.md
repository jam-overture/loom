# Events can be searched by part and page

**Lane:** `Loom portal` · **Date:** 6 November 2026 ·
**Branch:** `claude/project-thread-ss8uey` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8a ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *1 · Signals*, *Events*

## Why this, and why now

No portal pull request was open. The first row of the agreed order that is not
done is still 8a. Its range picker, hourly chart and range figures wait on the
`Loom signals` finding filed this morning (page views counted by hour); unit 8
still waits on the maintainer's call on how Loom reaches a site's repository.
The previous run named the next unblocked pieces as the *Live* toggle and the
search over part and page. The search is the one the wireframe puts in the
facets the screen already has, so this run built it.

## What shipped

- **A *Find* box on *Signals · Events*,** in the same form as the page picker,
  kept in the address as `?q=`. It keeps the events whose part or page mentions
  every word typed, in any order and any case: the page's published name or
  tree id, the part's name, node id or kind (*button*, *heading*). Ids are
  findable because an id is what a person pastes from a log line; the
  placeholder speaks in plain words only, as `every-screen.test.ts` requires.
- **The search travels with the rest of the filter:** every kind chip, the
  page picker, *Newest* and *Older* keep it. A line under the facets says what
  is being searched for, with *Clear the search*. *Events from this view*
  drops it, because that link asks for one whole page view.
- **The same budget as the other filters.** The search is matched on the
  deliveries already read (`matchesFilter` now takes the site's naming), so a
  narrow search over a busy window says how far back it looked and *Older*
  carries on, exactly as a narrow kind or page does. No new read, nothing in
  `src/`, no table, no environment variable, no `db:push`.
- The typed text is tidied (spacing collapsed, cut at 80 characters); an empty
  box searches for nothing.

## Decisions taken

- **Every word must match, anywhere in the part or page.** *sign up welcome*
  finds the *Sign up* button on *Welcome to Loom*. The alternative, the whole
  phrase as one string, would miss that, because the page and the part are
  separate names.
- **No decision record.** The search reads nothing new and changes no rule;
  it is a filter over what the screen already shows.

## Tests

- `pnpm verify` exit 0: framework 6,278 passed (2 skipped), app 6,716 passed
  across 413 files.
- New: `searchOf` tidying, matching by page name and id, part name, id and
  kind, every word in any order, an unpublished page found by ids alone
  (`events.test.ts`); a search narrowing a walk through the journal
  (`events-reading.test.ts`); the box sitting in the page picker's form, the
  *Clear the search* link, kind chips keeping `q` (`events.test.tsx`).

## Screenshot

`2026-11-06-portal-events-search-wide.webp`: a local deployment with two
published pages and 24 seeded deliveries, searched for *sign up welcome*:
sixteen presses of *the button “Sign up”* on *Welcome to Loom*, nothing from
*Pricing*.

## Still missing from *1 · Signals*

The range picker, the hourly chart and the range figures (waiting on the
`Loom signals` finding), the *Live* toggle, and on *By page* the bars for a
range and each goal's trend.
