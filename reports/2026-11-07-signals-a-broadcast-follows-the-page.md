# A broadcast follows the page, and a client-side navigation is a new page view

**Lane:** `Loom signals` · **Date:** 7 November 2026 (morning run) ·
**Branch:** `signals-78-a-broadcast-follows-the-page` ·
**Record:** [0361](../decisions/0361-a-broadcast-handed-a-document-follows-the-page-and-a-client-side-navigation-is-a-new-page-view.md) ·
**Plan:** [§78](../docs/signals.md)

## What I completed

`broadcastReaderSignals` now takes an `Element` **or** a `Document`. Handed an
element it is byte-for-byte what it always was. Handed a document it finds the
addressed page itself and **follows it**, so a client-side navigation ends one
page view and opens another.

This closes two findings addressed to this lane — `Loom marketing`'s of
4 November, re-addressed here by `Loom daily build` the same evening, and
`Loom framework`'s offer of 5 November. Both framed it as a host losing one
conditional. **It is more than that, and the gap between the two framings is the
substance of this run.**

### The defect behind the ergonomics

The module has carried this sentence since §1:

> **A new root, or a new revision in the same root, is a new broadcast** —
> `stop()` the old one and start another, or a client-side navigation files its
> signals under the revision it left.

That asks a host to notice a client-side navigation and do something about it.
**A host that does not does not get less data — it gets wrong data.** A reader
moves from the pricing page to the sign-up page; the broadcaster is still
holding the pricing page's detached root; every signal after the navigation is
filed against the pricing page's nodes under the pricing page's revision.
Nothing says so at either end. The node ids are real, the batch parses, the
intake accepts it, the fold counts it, and the portal draws it on the wrong
page.

It is also an undercount in the one marker the newest readings are built on. One
batch of a page view carries `first`, which is how an arrival is counted exactly
once (0214), so a reader who reads four pages without the broadcast restarting
**arrives once**. Page views by the hour they began in (0356, yesterday
morning), the region map, and every figure taken at the door's scale read that
marker.

### What it follows, which is the counting rule

The page's **identity** — its tree and its revision — and not the element
carrying it. Three clauses:

- **A re-render is not a navigation.** Nodes arriving, leaving and changing under
  the root leave the page view alone, so every band a proposal rewrites is still
  one page view.
- **A new identity is a new page view.** A root replaced by a different tree's,
  or the same root re-rendered at a new revision, stops the old broadcast —
  which delivers what it gathered **under the revision it gathered it on** — and
  begins a fresh page view with its own key and its own opening.
- **The same identity rendered again is the same page view.** A host that
  unmounts the element it rendered into and renders the same revision again has
  sent the reader nowhere, so the second broadcast is handed the page view the
  first was observing: same key, no second opening, no second arrival.

**Rule 2 holds and is not stretched.** Two pages one reader saw are two keys,
random per page view, derived from nothing about the reader, never persisted and
never returned to a browser. Nothing anywhere can tell that one reader saw both.

## Decisions I took that were not specified

- **One door rather than two.** A separate entry point would have let hosts who
  pass an element pay none of the 1,030 bytes, which is rule 4 exactly. I
  rejected it: it asks every host to choose between two doors where one of them
  silently misattributes on the routing model most of them use. The record's
  alternatives carry the argument, and it is the first *Needs your input*
  question below because it is the one I would most want overruled on if the
  maintainer weighs bytes differently.
- **The page view became a value rather than a broadcast's own state.** This is
  what makes the third clause true instead of argued. The simpler design —
  re-root whenever the element is replaced — counts one reader twice on a
  remount, in a counter that is permanent (0158). The alternative that suppresses
  only the arrival moves the double count rather than removing it, because
  `views`, `reached` and `engaged` count distinct page views by key. Neither is
  exported: a host has nothing to do with a page view, so it is private to the
  entry point rather than added to `view.ts`, which `@jam-overture/loom/signals`
  re-exports whole.
- **A weighed ceiling in `browser-weight.test.ts`.** Not asked for, and it is
  the second half of a rule that had never been enforced: the size was a
  sentence in the plan and a figure in each report, and on 2 November that figure
  was found to be a third out of date. The bundle is now built and gzipped in the
  test and held to 8,000 bytes minified and 3,600 gzipped. I added it in the
  unit that spends 1,030 bytes on purpose, because a guard written by the run
  that needed the headroom is the only one whose number means anything.
- **I edited one assertion outside my lane**, and say so here as the
  5 November precedent did: `app/(docs)/_lib/api/extract.test.ts` asserts that
  the broadcast door loads 10 files and it now loads 11, because it reads
  `addressedRootIn`. One number and a comment naming the record; nothing else in
  `(docs)` was touched.

## What a browser pays, measured

`npx esbuild src/signals/broadcast.ts --bundle --minify --format=esm`

| | minified | gzipped |
| --- | --- | --- |
| `main` | 6,513 | 2,986 |
| this branch | **7,543** | **3,361** |
| | +1,030 (+15.8%) | +375 (+12.6%) |

Paid by every page that asks for signals, whichever argument it passes. The
import graph is unchanged and still reaches no package — `addressedRootIn` lives
on the light side of the split (0354), which is the whole reason this was cheap
to build at all. This is the largest single step this entry point has taken since
0136 split it out at 4.8 KB.

The follower's own cost at runtime: one `MutationObserver` on the document,
watching children and the two attributes that spell a page's identity. Its
callback compares three values it already holds and returns, so a churning page
costs three reads per batch of mutations; the one `querySelector` it can run
happens only when the page it was observing is no longer the page in the
document. A test asserts that — `does not search the document while the page it
is observing is still the page` spies on `document.querySelector` across a band
being appended and a subtree being removed.

## Real test numbers

`pnpm install && pnpm verify` — **exit 0**, run twice (the first found the
`(docs)` assertion above, which is the only red there was).

- framework **6,447 passed**, 265 files
- app **6,864 passed**, 424 files
- prerender 138 pages, 2,073 text junctions, 0 run together, 0 unserved
- new: **10 tests** in `broadcast.test.ts` under *handed the document*, and
  **1** in `browser-weight.test.ts` (the ceiling)

Nothing was skipped, weakened or marked as expected-to-fail. The two tests I
would hold this unit to are the double-count ones, because both failures would be
permanent and invisible:

- *reads a page that re-renders as one page view, however much of it is
  replaced* — appends a band, removes a subtree, appends a child, then asserts
  one view key and exactly one `first` across two batches;
- *continues the page view when the same revision is rendered again into a new
  element* — asserts the second broadcast's batch carries the first's key and
  **no** `first`.

## Records added

- **0361** — accepted. It contradicts no accepted record and touches neither the
  tree schema nor the delta model, so it is not architectural. It is numbered
  0361 rather than 0360 because 0360 is claimed by two open branches — #794
  (this lane's own, from last night) and #793 — so `Loom merge` renumbers one
  record rather than two.

## Findings filed and closed

**Closed:** `Loom framework`'s *a broadcast could find its own root now*
(5 November) and `Loom daily build`'s re-addressing of `Loom marketing`'s entry
to this lane (4 November evening). Both carry the original status beneath the
closure.

**Filed:**

- **`Loom portal` — `snippetFor`**, the lines a *customer* pastes. Seven lines
  become three and the null guard goes with them, because the document form
  refuses a document holding no addressed page with the same `unaddressed` code.
  This is the highest-leverage adoption on `main`: every customer who pastes
  today's snippet into an application that routes on the client gets signals
  filed against the page the reader left.
- **`Loom docs` and `Loom marketing` — the three client components** in this
  repository that start a broadcast on an element. All three are **right to**:
  each renders a tree into a frame on a page holding other things, which is what
  the element form is for. It is filed for the prose rather than the call — what
  those panels *show* a reader is the shape to copy onto their own site.
- **This lane — a deployment's figures move when a host adopts the document
  form**, because what the page sends changed rather than how it is counted. No
  silence or fault member names that and none should: nothing in a batch says
  which argument the host passed. Recommendation recorded as *leave it*.
- **This lane — the ceiling is now the only place the byte budget is written
  down**, with what a future run should not do to it.

## Open questions

All three are in the pull request comment with a recommendation each. The one
that matters is the first: whether 1,030 bytes on every page is the right price
for one door, or whether the following belongs behind a second entry point so
only hosts who use it pay. My recommendation is the one door, and it is the
decision I am least certain of in this unit.

## Working beside the other lanes

**#794 is this lane's own, open since last night** — §77, what readers did by the
hour they did it in. This branch is cut from `main` and touches none of its
files: §77 adds a counter table, a fold pass and a reading, and §78 touches
`broadcast.ts`, its two test files and the plan. Neither stacks on the other and
either can land first; the only shared file is `docs/signals.md`, where §77 and
§78 append adjacent sections, and `FINDINGS.md`, which is union-merged.

**#793 is the framework lane's** and is the other claimant of 0360. It makes two
prose conventions fail on the branch that breaks them, which is the same instinct
as this unit's byte ceiling, arrived at independently on the same night.

Nothing else open touches the signal path.

## On keeping the deferred door cheap

Per the standing instruction: **this unit does not make per-reader identity any
more expensive to add later.** It adds no store, no column and no payload field,
and it mints one more key per navigation rather than one fewer. A session is
still not a thing any part of this subsystem can name, and the gate-and-record
shape the maintainer agreed for identity would sit above all of this unchanged.
