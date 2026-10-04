# Reader signals — where in a page reading stops, and the upsert that refused to touch one row twice

**Routine:** `Loom signals` · **Date:** 3 October 2026 · **Branch:**
`signals-06-where-reading-stops`

## What I completed

Two things, in the order the brief puts them: **the open finding I owned**, then
the capability my predecessor recommended and nobody had answered.

**1. The fold is now in front of the driver for all four counters.** The open
finding of this morning — `ON CONFLICT … DO UPDATE` refuses to affect one row
twice in a single command, guarded on one of four counter tables — is closed.

**2. `readingProgressOf`, which says where in a page reading stops.** *Readers
get through the first four bands and the fifth is where they leave*, derived from
counters that already existed. No kind added to the vocabulary, no byte on the
wire, no attribute in the render, no column in a store, and **no change to the
broadcaster** — the third thing taken out of the server-side join rather than
collected (§6, §7 and §8 being the others). §9 of
[`docs/signals.md`](../docs/signals.md), recorded in
[0221](../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md).

### Why it is not the obvious thing

The obvious reading is a page-wide curve of `reached` in document order, and
**it is not a curve.** A part deep inside the first band comes before the second
band in reading order and is reached by fewer readers than either, so the
sequence does not descend and a fall in it is not a reader leaving — drawn as a
curve it would show a page losing and regaining readers several times per band,
every movement an artefact of nesting. It is the one defect most likely to look
right on a screen, so it is one of the ten planted below — grouping the parts by
depth instead of by parent turns three cases red.

The unit is a **run** instead: one parent's element children, in the order a
reader meets them. Siblings are comparable, cousins are not, and every part is a
step in at most one run — so no reader's progress is counted at two depths.

And the figure is `lost ÷ reached`, **both numbers off the same rows**. That is
what makes it showable at all. `reached` is a summed distinct count, generous by
every page view that straddled a rollup window (0147, measurable per revision
since 0219) — but a reader who straddled a window straddled it for the whole
page, so the inflation is very nearly common to numerator and denominator and
divides out. *Four in ten readers stopped here* survives an over-count that
*four hundred readers* does not.

## Decisions I took that were not specified

**1. I did not use the exact denominator I shipped yesterday, and it was the
tempting mistake.** §8 added `opened` — page views counted once at the door —
precisely so that rates have a true denominator, so re-basing every fall on it
looks like the obvious improvement. It is wrong: `opened` counts arrivals once
and `reached` is a sum of distinct counts, written by different code in different
places, so the ratio can honestly exceed 1. A figure that is sometimes 112% is a
figure a screen cannot show, and the robustness argument runs the other way
round — the straddle cancels between two `reached` counts and does not cancel
against `opened`. `opened` stays the right denominator for the rates §8 filed
about; it is the wrong one for a fall. Both halves are in the record and in the
finding for the portal, because this is the thing a screen will get wrong.

**2. A part that reported something other than a view cannot anchor a stop.**
Its standing is `unknown`, its `reached` is 0, and the truth is *not zero,
unknown* — a press was delegated to a band that no `viewed` ever named, so a
reader plainly had it in front of them. Treating it as the end of a run reports a
cliff nobody fell off, which is the lie in the direction nobody checks. So a stop
names the two nearest parts that can anchor one, and the parts passed over are
counted in `unanchored`. That turned out to be **a diagnosis nobody had**: a
sender or primitive delegating presses to regions no `viewed` names previously
looked exactly like a page nobody read.

**3. The page's headline figure is ranked by readers lost, not by share.** A band
two readers out of three abandoned is a worse rate and a smaller problem than one
four hundred out of a thousand did. Ranking by share would put the smallest band
on the page at the top of every screen for ever.

**4. A rise is counted and never reported as a negative fall.** More readers on a
later part than an earlier one is something scrolling cannot do — an anchored
link, a restored scroll position, a footer a short page never pushes down. It is
a different sentence, so it is a different field rather than a stop with a minus
sign.

**5. No spine heuristic.** I considered descending through single-child wrappers
and calling those children *the bands*, which is what the sentence in the brief
describes. Rejected: it is a guess about markup in a subsystem whose whole value
is that its figures can be defended. Every run is reported; a consumer that wants
the top-level one takes the shallowest.

**6. The counter keys moved to a module both stores import.** The finding asked
for *the same fold with three more key functions*. The fold alone would have left
two hand-written spellings of each key, one per store — and what the finding
actually wants guaranteed is that the two implementations agree about what one row
is. `src/signals/counters.ts` holds the four keys and the four additions, both
stores import them, and it is deliberately **not** re-exported from
`@jam-overture/loom/signals`: it exists so the implementations cannot drift, not
because a deployment has a question it answers.

## Records

- [0221 — Where reading stops is a fall between two siblings, and a ratio of two
  counts off one row
  set](../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md),
  **Accepted**. It contradicts nothing: 0212 anticipated this shape and said why
  the join is at read time, 0147's bound and 0219's measurement are both used as
  they stand, and nothing on the wire or in the browser moved. 0221 was the next
  number free on `main` and on the one open branch (#499, which claims none).

## Findings

**Closed, both mine:**

- **the upsert that refuses to touch one row twice** (filed this morning) — the
  fold is in front of the driver for all four counters with a contract case each,
  and the keys are shared rather than duplicated.
- **a page cannot report that every one of its parts went unread** (filed by
  `Loom portal`, 2 October) — the sentence it asked for is already in
  `PartStanding`'s doc comment on `main`, landed by #486. Verified rather than
  re-written; the entry was open only because nothing went back to flip it.

**Filed:**

- **`Loom portal`** — the reader screen has a shape to draw rather than one more
  row, with the call, the three fields worth leading on, and the four things to
  be careful of: *do not re-base `share` on `opened`*, `unanchored` is a
  diagnosis and not a reader figure, `gained` is not an error, and `views: 0`
  means nothing was measured rather than nobody read it.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, written to a file and read in a
separate command.

| | this branch | `main` |
| --- | --- | --- |
| Runtime suite | **178 files, 3,728 tests, 0 failed** | 177 files, 3,699 |
| Application suite | **374 files, 6,662 tests, 0 failed** | 374 files, 6,662 |
| `findings:check` | 979 findings, 0 malformed | 978 |
| `prerender:check` | 124 pages, 1,470 junctions, 0 run together | unchanged |

**29 tests added, nothing skipped, nothing weakened.** 21 of them are the new
module's; 8 are the four contract cases, each of which runs against both stores.
The application suite is unchanged in count because nothing in `apps/` was
touched but a generated file. `main`'s runtime figures are the re-verified
numbers from #489's merged head, which is this branch's base for the runtime
suite.

### The ten planted defects, and the ten that went red

| the mutation | what went red |
| --- | --- |
| a part that reported no view anchors a stop anyway | *passes over a part that reported something other than a view* |
| the empty window is read as a page everybody abandoned | *answers nothing about a revision no view reported*, and the foreign-revision case |
| a run of one child is kept | *leaves out a run of one, and keeps the runs that have a pair* |
| an equal fall displaces the one already standing | *keeps the first in reading order when two falls are identical* |
| the steepest is ranked by share rather than by readers lost | *prefers the fall that lost more readers over the one that lost a larger share* |
| a rise is reported as a fall with a negative loss | both rise cases |
| the share is divided by the part they did **not** reach | six cases, including the headline one |
| the furthest part is the first reached rather than the last | *says how far down the page any reader got*, and the sparse-page case |
| parts are grouped by depth, so cousins are compared | *compares a part against its siblings and never against its cousins*, and two more |
| a step reports the views that said anything rather than the views that reached it | *passes over a part that reported something other than a view* |

**And four on the store fold**, run against PGlite: dropping the fold from the
tallies, the funnels and the regions turned exactly the four new contract cases
red — *adds up two tallies of the same node in one call*, *takes the last type
given for a node named twice in one call*, *adds up two answers about the same
pair in one call*, and *adds up two counts of the same bucket in one call* —
and all four pass with it. The last of those is the sharpest, because it is the
one that runs at the door: a refused write there is a bucket that silently did
not move, reported in a delivery's outcome and nowhere else.

### The double-count case this lane requires

*Compares a part against its siblings and never against its cousins.* A part
deep inside the first band is reached by fewer readers than the second band and
comes before it in reading order, so a page-wide comparison reads it as a fall
and then as a rise and counts one reader's progress at two depths. There is also
*makes every part a step in at most one run*, which asserts the property
directly rather than by example.

## Browser cost

**Zero bytes added.** `src/signals/broadcast.ts` and every module it reaches are
untouched — the diff for that file is empty — and `browser-weight.test.ts` passes
unchanged. Measured on this branch for the record: the broadcaster bundles to
**6,477 bytes minified and 2,941 gzipped** (esbuild, ESM, bundled from
`broadcast.ts`), which is the same figure `main` produces.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated with the
  repository's own `pnpm --filter @loom/app docs:api`, which the gate insists on.
  The published surface moved: four new types and one new function, which is
  1,221 exported names to 1,226 — the rest of the diff is those counts. The gate caught it before I did.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints the
  usual notes for the holes at 0149–0154 and passes.

Everything else is `src/signals/`, `src/testing/reader-signal-contract.ts`,
`docs/signals.md`, `FINDINGS.md` and the record. No lane's branch is open on the
signal path: #499 is the demo lane's and touches none of it.

## The parked door

**Per-reader identity is no cheaper and no dearer for this change, and it is
worth saying why rather than asserting it.** Everything here is a ratio between
two nodes of one revision inside one window. There is no key in it, nothing to
join it to, and no row it writes — it writes nothing at all. The one thing a
future identity feature would want from this question is *which reader stopped
where*, which is a per-view breakdown, and the reason this reading cannot be bent
into one is the reason it is honest: it is built on counters that have already
been collapsed from view keys to counts, and the view keys are gone by then by
rule 2's design.

The store fold is the same answer for a duller reason: it changes when an
addition happens, not what is stored.

## Open questions

**1. The `fetch` hole in `completed` — four days open, and still the only thing
in this lane actually blocked.** A host's form that posts with `fetch` calls
`preventDefault`, so the broadcaster sees a cancelled submit and reports no
completion: a deployment can have conversions and read zero, with nothing
distinguishing that from nobody converting. The only honest fix is a function the
host's own code calls — `completed(node)` on the broadcast handle — because only
the page knows its submission succeeded. Rule 3 refuses measurement as a *prop in
the tree* so a proposal cannot switch it on; a host's own code is not a proposal,
but that distinction should be written down before anything relies on it.
**Recommendation: allow it, and let me write the distinction into a record that
amends nothing.** One run's work once you say.

It is now the more valuable of the two things I would do next, because of what
landed today: a conversion rate is the one figure on the reader screen that a
fall can be read *into* — *the pricing band is where readers leave, and of the
ones who stay, this many buy* — and it is the figure with a known hole in it.

**2. What I would do next if you say nothing.** The reading now says *where*
readers stop and not *what kind of part* they stop at, because nothing in
`src/primitives/` declares a role (0114) — the thinness 0212 filed for
`Loom primitives` and that this adds a second consumer to. I would not work
around it from this lane: inventing a role from a primitive's type is the kind of
guess the sibling-run decision above exists to avoid. So the honest next step in
my own lane is **the before-and-after reading** — two revisions' progress
compared, which is the measurement the whole product is for and which §1 made
honest — unless you would rather have `completed` closed first.

**3. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number. Whether the reader-signal half of `docs/deployment.md` is this
lane's is still one line of your reading; `docs/signals.md` carries the
environment variables meanwhile, and this step added none.
