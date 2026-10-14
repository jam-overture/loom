# The screen that lists what you have

**Date:** 2026-10-12
**Section:** §3 (portal)
**Branch:** `portal-the-workspace`

## What was asked

To migrate the portal to the new version, now that
[0269](../decisions/0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)
has made the hierarchy real. This is the first screen of it.

## What the promotion turned out to be

Smaller than feared, because of something found by reading rather than
assuming: **`/portal` and `/portal/pages` overlapped.** The front door was named
*What Loom has been doing* — one of the maintainer's eight complaints by name —
and led with a section called *Your pages*, which is the whole of what
`/portal/pages` is.

So the 798-line front door did not need rewriting. It needed **moving one level
down**, to the application it was always about, and a new screen above it.

| | before | after |
|---|---|---|
| `/portal` | *What Loom has been doing* — your pages, waiting on you, changed without asking | **Your applications**, grouped under their project |
| `/portal/[application]` | — | **What needs you** — the old front door, scoped |
| `/portal/pages` | *Your pages* | unchanged |

## Why the project is a heading and not a screen

The literal reading of account > project > application gives a project its own
screen with the applications inside it. That is right for somebody with forty
applications and wrong for everybody else: **a project owns nothing yet**, so
its screen would carry a name and a count, and a deployment with one project and
one application would walk through two near-empty screens to reach anything.

So the grouping is a heading here. Nothing forecloses the other: when a project
owns members or inherited policy it has something to put on a screen and earns
one, and `/portal/[project]` can be added **beside** these routes rather than
instead of them — a project id cannot collide with a static segment, because it
wears `prj_`.

That reversal was itself a correction. An earlier version of this plan told the
maintainer a flag day was unavoidable because `/portal/[project]` would collide
with `/portal/pages`. It would not, for the prefix reason above, and saying so
cost nothing except the credibility of the first answer.

## What a row says

Name, where it lives, how many pages, and **what is waiting on you** — which
leads the sort as well as the row. A screen whose question is *what do I do now*
should put the thing needing an answer at the top, and alphabetical order is the
arrangement that most reliably buries it.

`workspaceOf` is a pure function from what the stores returned to what the screen
draws, which is what let the cases below be tested without a database:

- a project with no applications is **kept**, not hidden
- an application whose project is missing is shown under *Not in a project*,
  rather than silently dropped — a screen that dropped it would stop showing you
  an application because a row somewhere else is missing
- waiting leads; the name breaks the tie

## Three things the gate caught

1. **`toSorted` is not in the application's TypeScript lib.** The root typecheck
   accepts it and `next build` does not, so it passed everything until the
   production build. Replaced with a copy-then-sort that says why in a comment —
   `sort` is in place and the array is the caller's.
2. **27 tests of the moved screen.** `reading-order.test.ts` reads the front
   door's source by path, `every-page-list.test.ts` sweeps for page lists, and
   `screen-names.test.ts` counts the record group. All three follow the file.
3. **The page-list sweep sorts its expectations**, and `[` sorts before letters,
   so `portal/[application]/page.tsx` belongs at the top of the `portal/` entries
   rather than where `portal/page.tsx` was.

## Tests

`pnpm verify` green: **217 files / 4856** framework tests, **437 files / 8342**
application tests (+20), 133 prerendered pages 0 run together.

`workspace.test.ts` is 8 tests of the grouping, including the three cases above.
Nothing skipped, nothing weakened.

**No screenshot.** Photographing the portal needs a database this container
cannot reach, and the one thing this change most deserves is a picture. The
maintainer's preview URL is where it can be seen; that is a real gap in the
evidence and is stated rather than papered over.

## What is next

- **The application screen still reads unscoped.** One application means one
  listing is every page there is, so it is correct today and will not stay
  correct. The seam is `StoreScope` and it exists; the day there are two
  applications, `summaryFor` and the `[application]` screen take a scoped handle.
- The rest of the preview — logs, rules, credentials — on real data.
- Registering an application, which is the portal's primary purpose by the
  maintainer's own account and still has no screen.

## Open questions

- **Does the workspace earn its place with one application?** It is one row
  under one heading. The argument for it is that the row carries the numbers the
  old front door buried, and that the second application is what the whole
  rebuild is for. Worth looking at before the rest is built on top.
