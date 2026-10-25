# Reader signals — where a window's readers were

**25 October 2026 (evening)** · `Loom signals` · branch
`signals-54-a-window-answers-where-its-readers-were` · §54 of
[`docs/signals.md`](../docs/signals.md)

## What I set out to do

There is one open pull request in the repository — #706, which carries `0308` as
a `Proposed` record and is waiting on the maintainer to read one clause. Nothing
else of this lane's is unmerged, so `main` carries everything through §53 and I
could branch off it cleanly without racing anybody. `Loom daily build` has
nothing open touching the signal path.

With no maintainer review comments to address, I took the open finding this
lane filed against itself yesterday: **the region map is the one reading the
new rung leaves a caller to assemble.** It is the gap §51 named at the moment it
created it, and it had two costed shapes with a recommendation already attached.

## What I completed

**§54 /
[0315](../decisions/0315-a-window-answers-where-its-readers-were-at-a-floor-it-is-handed-and-the-readership-is-published-beside-the-forms.md)
— `windowReadingsOf` joins the region rows too.**

Every reading in this subsystem follows from a `PageReading` or a list of them,
so §51's rung made all thirty-eight of them one call from a store. The region
map did not follow: the rows were carried on the window, counted in the form
census so a form named only by a bucket still got a page reading, and joined
into nothing. The reason was real — `regionReadingOf` takes a **floor**, the
floor is per-deployment configuration (§7), and a rung that read configuration
would be a reading path depending on a configuration store.

It still reads none. The floor is `WindowReadingOptions`, one argument on the
call. The rung holds configuration it was **handed** rather than configuration
it went looking for, which is the line §7 already draws, and `regionFloorOf`
underneath stays raise-only, so this cannot be used to read a map below the
floor. What it closes is the half that was quietly wrong and that nothing in
the types said: **a caller who passed no floor got the default of 25 rather than
the deployment's**, so a deployment that had raised its floor to 100 would have
had its map drawn at 25 by any screen that forgot.

## Decisions I took that were not specified

**Both answers, not one.** The finding argued for a map per form, and that is
right — a readership is of one readership (§38) and two forms of a page are two
populations (0290). But a map per form **withholds more than a whole map does**,
because the floor bites harder the narrower the group: fifteen views of France
under one form and fourteen under the other are a readership of twenty-nine that
the whole map names and that both split maps suppress. Publishing only the split
would have answered the maintainer's own question — *where are my readers* —
worse than the two calls it replaces, which is the opposite of what a rung is
for. So `regions.readership` is published beside `regions.maps`. Summing two
forms' arrivals is right here and wrong on the node counters, and that asymmetry
is 0297's: a person who arrived arrived once, whichever form they were served.

**A map is not held to a tree.** A region map is of arrivals, not of nodes, so
it needs no tree to be read against. A revision whose tree has been pruned is
`unjoined` for its counters and still has its readers counted. Dropping those
would have under-reported a deployment by exactly the readers it has least other
record of, and it would have made the two answers disagree.

**The groups are the region rows' own audience column**, rather than the forms
the other row sets name. Every row is then in exactly one map by construction,
which is what makes the maps and the readership add to the same number of views;
grouping by a form named elsewhere would leave a row naming none in no map at
all.

**The window had no repeat guard, and now has one.** This was not in the
finding and it is the part I would least like to have shipped without.
`regionReadingFor` keeps the first row per region and audience **within one
revision**; nothing did it across a window. A caller concatenating two reads —
the store's counts are running totals, not a window's — would have added a
bucket to itself, which is 0158's one permanent error, and it would have
inflated the floor's own protection along with the figure. The dedupe is on
tree, revision, form and region, the key the store keeps one row per, and it is
applied **once** before both answers so they drop the same rows.
`regions.duplicated` reports the count.

## Records added

- **0315** — *A window answers where its readers were, at a floor it is handed,
  and the readership is published beside the forms it splits into.* `Accepted`.
  It extends 0309 clause 8 rather than reversing it: that clause says the rung
  adds no figure **of its own**, and `regionReadingOf` is a published reading
  composed exactly as `pageReadingOf` is, at a floor handed in rather than
  invented. Nothing here is architectural and nothing is superseded.

## Findings filed or closed

- **Closed**: *the region map is the one reading the new rung leaves a caller to
  assemble* (24 October, this lane's own), with the three things the taking
  turned up that the costing did not have.
- **Filed, for `Loom portal`**: a screen can now draw a region map in one call,
  and **the deployment's floor is the one argument nothing will remind it to
  pass.** The entry carries the two lines that read it —
  `readRegionFloor(process.env[REGION_FLOOR_KEY]).floor`, from
  `apps/loom/app/_lib/reader-signals/settings.ts` — and the reminder that
  `undefined` regions and `[]` regions are two different sentences.

## Open questions

**Nothing blocking.** Two things of this lane's are still the maintainer's and
neither is new tonight: `0308` on #706, which needs one reading; and the door's
repeated *opening* batch, filed yesterday, whose only real fix is for the door
to remember view keys and whose second half touches the region floor — the same
floor this unit now carries end to end.

Worth one sentence, because the brief asks for it: **nothing here makes
per-reader identity more expensive to add later.** The maps group rows by a
column the host wrote and keep nothing per reader; an identified window, if that
work ever came back, would be grouped by the same key.

## Test numbers, measured

- `pnpm verify` is **green**. Root suite: **5,761 tests in 240 files, all
  passing**. Application suite: **6,481 tests in 365 files, all passing**.
  `findings:check` reads 1,320 findings with 0 malformed; `prerender:check`
  reads 137 pages with 0 run-together junctions.
- `src/signals/window.test.ts` goes from 46 tests to **59**. The thirteen new
  ones are the three the join is the only place to get wrong — the floor it was
  handed reaching every map, the maps and the readership being the same rows
  read twice, and a bucket handed in twice not being added to itself — plus the
  pairing key, the pruned tree, the two silences and the stable order.
- **The double-count case is asserted both ways.** A window of six buckets over
  three revisions, two forms and two trees, handed in **twice**, has
  `duplicated: 6`, a readership and maps identical to the same window handed in
  once, and per-form views summing to the readership's **260** exactly.
- **Two failures on the way, both mine and both fixed before the commit.** The
  published-sentence rule in `src/documentation.test.ts` caught three doc
  comments where a record number was part of the grammar rather than a
  parenthetical a reader can lift out; and the generated API reference had
  moved, which `pnpm --filter @loom/app docs:api` regenerated. Nothing was
  skipped and no test was weakened.

## Browser cost

**Zero bytes.** Nothing in this unit runs in a reader's browser.
`src/signals/broadcast.ts` is byte-identical to `main` (`git diff` over it is
empty) and `browser-weight.test.ts` passes unchanged — the broadcaster is still
the ~4.8 KB it was. No payload field, no column, no store method, no new kind,
and no member of any closed set reachable from a batch.
