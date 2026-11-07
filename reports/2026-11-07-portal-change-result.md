# An accepted change's result: before and after on its goal, and a plain verdict

**Lane:** `Loom portal` · **Date:** 7 November 2026 ·
**Branch:** `claude/project-thread-nl4e84` ·
**Records:** none new ·
**Plan:** [`docs/portal.md`](../docs/portal.md) row 8c ·
**Target:** [`docs/portal-wireframes.md`](../docs/portal-wireframes.md) *5 · Pages ·
History* (the verdict and its rules) and the *Result* step of section *4*

## Why this, and why now

No portal pull request was open and no `portal-*` branch had been pushed in the
last three hours. Unit 8 is done in the portal (#800), so the first unfinished
row is 8c, page history. Its input is on `main`: the goal each change served
is kept by its proposal (#800), when each change went live is read from the
site's pulls (#796, #797), and what readers did on a part is now counted by the
hour (#794, `Loom signals`). The verdict is the heart of 8c and the timeline's
*Result* step was waiting for it, so it comes first; the *History* tab then
draws the same verdict per version.

## What shipped

- **_Result_ gives the verdict** once the 14 days after a change went live end:
  *Result: Helped*, *Hurt*, *No clear change* or *Too early*, a sentence saying
  what that means, and the two sides it rests on, each with its dates, its
  length and the goal's own figure (*Before (24 October 2026 to 7 November
  2026, 14 days): 100 presses in 4,000 page views, 2.5 per 100.*). The test is
  one click away under *How the verdict was reached* (z, p, and the bar it had
  to clear), never in the verdict.
- **The maintainer's rules, as he settled them on 5 November**: 14 days each
  side from when the change went live (0358 clause 7); *Too early* below 1,000
  page views on either side, with how many the thinner side was short;
  *Helped* or *Hurt* only where a pooled two-proportion test holds at 95%,
  otherwise *No clear change*.
- **Each version is measured on its own.** The hour the change went live in is
  on neither side (its page views are partly of each version, and an hourly
  counter cannot split them). A side ends early where the page changed again,
  another accepted change going live or the site's newer version starting a new
  copy, and the before side starts no earlier than counting began. The result
  says when a side is shorter than 14 days.
- **_Measuring_ says the figures so far** while the window runs, without a
  verdict.
- **Where nothing can be said, it says so**: a change with no goal recorded
  (made before goals were kept, or from a proposal that named none) shows *Not
  measured*; counters that do not answer leave the timeline standing and say
  the figures could not be read.

Pure logic in `(portal)/_lib/measuring.ts` (`windowsOf`, `sideOf`, `testOf`,
`verdictOf`, `measurementOf` and the sentences); the timeline's steps in
`going-live.ts` (`liveAtOf`, `boundsOf`, and `measuringSteps` now reading a
`Measurement`); the one read in `review/accepted/_lib/measurement.ts`, against
the project's own hourly counters through the bounded store.

## Decisions taken

- **The figure is the goal's own (0350 clause 4)**: what readers did to the
  goal's part on the page over the page views that began on it, from
  `acted.ts`'s and `arrivals.ts`'s hourly counters. Both sides come from one
  read of each counter over the widest span, narrowed in pure code, so a side
  cannot be read over a different stretch than it is reported over.
- **Counting begins with the later of the two counters.** Page views were
  counted by the hour before what readers did was (#794 landed today), so a
  before side reaching back past that would have page views and no presses,
  which would read as a rise that never happened. The before side starts when
  the project first counted anything readers did, on any part.
- **Where readers did it more times than there were page views**, the figure is
  not a share of page views and a two-proportion test does not apply. The
  verdict is *No clear change* and says why. This can only happen for a goal a
  reader can do several times in one visit (opens of a disclosure most likely).
  See *Needs your input*.
- **A goal is always something more of is better** (presses, sends, opens of a
  part, 0350), so a rise that holds up is *Helped* and a fall is *Hurt*.

## Needs your input

- **Goals a reader can do several times a visit.** The test you chose treats
  each page view as one try, which fits *did this visit press Start*. Where
  readers press more often than they visit, Loom says *No clear change* and why
  rather than forcing the numbers through. If that turns out to happen, the fix
  is a test made for counts (comparing two rates), and I'd recommend it then;
  until then, nothing blocking.

## Tests

- 15 new in `measuring.test.ts`: the windows (14 days each side, the live hour
  left out, the previous change, counting starting, the next change, no
  inverted side), `sideOf` adding only the hours inside, the test (z and p
  against a hand-worked case, not a share, no variation), the verdict (too
  early with how many short, helped and hurt only past 95%, no clear change
  where untestable), `measurementOf` starting with the later counter, and the
  sentences.
- `going-live.test.ts` rewritten for the new steps: *So far* while measuring,
  the verdict with both sides and the test, a short side said, *Not measured*,
  figures unreadable, and `liveAtOf`/`boundsOf` (its own change aside, previous
  and next from changes and copies).
- `pnpm verify`: see the pull request; the numbers are in its description.

## Where this leaves section 5 of the wireframes

- Done: the verdict and its rules, on the change's timeline.
- Still missing: the page's own *History* tab (*The page · History · For
  review (N)* and a *Measured on* picker), the 8-week chart of the goal's daily
  rate coloured by where each version came from, one card per version with
  before → after and the same verdict, the site's own edits shown as *Not a
  Loom change*, *Compare*, *Propose reverting*, and the dashed *Not live yet*
  card.

## Also open for this lane

`FINDINGS.md`, 2026-11-07, *a site pulling a tree its installed Loom cannot
read is indistinguishable on the portal from one that is up to date*, filed by
`Loom daily build`. Its route 1 (the site's `If-None-Match` stops following the
newest tag) is one reading over `loom_site_pulls` and one sentence on *Connect
your site*. Nothing is broken; it is a good next piece for a run.
