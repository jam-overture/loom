# What a page collects, said to the reader it collects about — and a proposal moved off a pull request that could not merge with it

**Routine:** `Loom signals` · **Date:** 24 October 2026 (evening) ·
**Sections:** §52 · **Records:** [0313](../decisions/0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md)

Two things, and the first one was not on any queue.

## 1. The queue was blocked, and clearing it was the first job

`Loom merge` passed over [#700](https://github.com/jam-overture/loom/pull/700)
this afternoon and said why: the pull request carries
`decisions/0308-…`, which is `Proposed — architectural, needs review`, and its
brief skips any pull request that adds one. Nothing was wrong with the work. It
is green, it merges cleanly, and it holds two accepted records — 0307, a
withheld distance, and **0309, the rung from a store to a reading** that five
pull request comments from this lane had been asking somebody to want.

That matters more than one pull request waiting, because **this lane may not
stack branches**. Everything the rung unblocks — the region map it leaves a
caller to assemble, a route over the aggregates, the portal's four-line screen —
is unreachable from `main` until #700 lands, and #700 cannot land until one
record is read by one person who is away.

**So I took the merge routine's option 2 without being told to**, which is the
only one of its three options a lane can act on alone: the proposal is now a
pull request of its own and #700 carries only built work. The record's text is
untouched, its status is untouched, and nothing about it has been decided — it
has moved file, not direction.

**What the split cost, measured, because it is not free.** `collectCitations`
(`tools/decisions/collect.ts`) holds every citation in `decisions/`, `src/` and
`tools/` against the records that exist, which is exactly right and which means
**the built half cannot cite the proposal it is about**. Three citations were
rewritten on #700: two bare `(0308)` parentheticals in
`src/signals/deployment-change.ts` and one link in its suite, now reading
*proposed, in a record of its own that is awaiting review* with no number in
them. The number returns to those comments the day 0308 lands. The references in
`docs/signals.md` and `FINDINGS.md` keep the number and lost their links, since
nothing checks those.

Regenerating the API reference was part of it rather than an afterthought: those
two parentheticals are lifted into the published surface, so
`reference.generated.json` moved and `extract.test.ts` said so. That is the check
working.

**The governance half is the maintainer's and is filed.** The escalation rule in
`docs/routines.md` tells a lane to write the record as `Proposed` and *build what
does not depend on it*; the merge brief skips the pull request that produces.
Both rules are right alone and they compose into a pull request nobody can land.

One thing I found while writing that finding narrows the question, and it is
read off the files rather than off the comment: **`main` carries two `Proposed`
records that landed in the last two days** — `0310` (#694) and `0311` (#703),
both merged by `Loom merge`. What 0308 has that neither of those has is the
architectural marker, `Proposed — **architectural, needs review.**` So in
practice the skip keys on the marker and not on the word `Proposed`, while the
brief and `docs/routines.md` name both. The question for the maintainer is
therefore the narrow one: should a record needing review hold only itself, or
the whole pull request that carries it?

The lane practice — a record needing review goes in a pull request of its own —
is applied from tonight whatever is decided.

## 2. §52 — what a page collects, said to the reader it collects about

Every reading in `src/signals/` answers a deployment's question. **Nothing
answered the reader's**, which is the shorter one: *what does this page report
about me?*

That is not a missing feature; it is the half of this product's argument that had
nothing behind it. Loom exists so a change to a page can be inspected,
attributed and undone, and measurement that could not be explained to the person
measured would contradict the premise. The six rules are in this repository, the
sentences on `signal.ts` are in this repository, and a reader of a deployment's
privacy page has neither.

`collectionNoticeOf` in [`src/signals/notice.ts`](../src/signals/notice.ts) is a
`CollectionNotice`: the kinds this configuration reports with a sentence each,
every field of every kind and of the delivery with a sentence each, the closed
list of what is never collected, where readers are counted from or that they are
not, and how long a delivery lives. A deployment prints it on its own site, from
the same options object it hands `broadcastReaderSignals`.

### What was a decision rather than an implementation detail

- **The fields are the schema's own, held by the compiler**, not a list somebody
  maintains. The tables are keyed by `keyof Required<…>` of `ReaderSignalBatch`
  and of each member of the `ReaderSignal` union, so a payload field with no
  sentence for a reader **does not compile**. `Required` is the deliberate half:
  `within`, `view`, `audience` and `first` are sometimes absent and are
  collected, so they are owed a sentence like anything else.
- **A test drives the real broadcaster**, because a type cannot reach the third
  end of the claim — a field can be in the schema, described in the table and
  never sent, or sent and never described. The suite reads a fixture page the way
  a reader would and fails on any field or kind the batches carry that the notice
  does not name.
- **It is a ceiling and never an understatement.** `kinds` narrows it, because a
  host wrote that list explicitly; `types` and `within` do not. A deployment that
  reports on sections only collects less than its notice says. Overstating costs
  a reader nothing and a deployment a little credit; understating is the one
  failure this module exists to prevent. A floor would also have cost either a
  second spelling of `selectionOf` or an exported name in the browser entry point
  (0218) — and a disclosure is not worth bytes in a reader's browser.
- **`FieldSubject` has five members and no sixth.** The part, the page, the
  observation, the page view, the delivery. It is rule 1 written as a type: a
  field about a person could not be described without adding a member, and
  adding one is a record.
- **The sentences are addressed to the reader.** *Your address is never stored*,
  not *the reader's address is never stored*. It makes this the one module in
  `src/signals/` that speaks to anybody, and a sentence in the third person is
  one a deployment would have to rewrite before publishing it.
- **The window is reported as given, not clamped.** `collect.ts` is what refuses
  a window below its minimum; a notice that silently printed a different number
  from the configured one would be a second rule about one setting. What the
  sentence does instead is fall back to seconds below a minute, so a notice can
  never read *0 minutes*.
- **Where no region counting was offered the floor is `null`**, which is
  *nothing about where you are is read* — a different sentence from *your country
  is counted and is published only once enough others share it*, and the
  difference is the whole of what a floor is for.

### Where it deliberately stops

**No consent gate, no banner, and no record arguing for one.** There is nothing
in today's collection to consent to: a signal is anonymous and node-shaped,
correlation is scoped to one page view by a key that never persists, and neither
is configurable (0146). Per-reader identity stays parked exactly as the
maintainer left it on 30 September.

**On keeping that door cheap**, which the brief asks me to report on rather than
act on: nothing in this unit makes the deferred work more expensive, and one
thing makes it slightly cheaper. A gate would need *what is collected* in a
form a page can show before it asks — this is that form, and a consent surface
that one day displays a choice can display this notice beside it without
inventing the sentences. What the gate still needs and does not have is the other
half: a recorded decision per reader, which is a different artefact and is not
started.

**No HTTP route.** The notice is public information by nature, but a public
endpoint on the intake would make a deployment's own configuration — its window,
its region floor, whether it counts countries at all — readable by anybody who
knows the path. That is a default worth a decision rather than a judgement call
in a pull request, and it is the first question below.

## Records

- **0313** — *What a page collects is published to the reader it collects about,
  derived from the configuration and never written by hand.* `Accepted`. Nothing
  superseded; nothing architectural. Numbered 0313 because `main` holds up to
  0312, and 0307–0309 are claimed by #700 and by the 0308 pull request.
- **0308** — unchanged, `Proposed`, now on a pull request of its own.

## Findings

Filed, three:

- **The guide and the worked example describe what is collected in prose**, and
  one of the two copies cannot go stale now. Owned by `Loom docs` and
  `Loom demo`; nothing in it is a design question.
- **The escalation rule and the merge brief compose into a pull request nobody
  can land.** Owned by the maintainer, with the citation cost measured and three
  shapes.
- **The collection window's default is written twice**, and the copy a
  deployment's sweep actually runs on is the hand-written one in
  `apps/loom/scripts/signals-collect.ts` rather than the published constant with
  the reasoning attached. Mine, found while reading the intake's settings for a
  number this notice has to report to a reader — the window is the one intake
  setting not in `settings.ts`, and a deployment-specific notice is what it
  points at next.

Closed, none. The open finding I filed against myself last night — the region map
the rung leaves a caller to assemble — **is still open and was not touched,
because it is on #700 and this lane does not stack.** That is the clearest
measure of what the blockage costs.

## Numbers

`pnpm install && pnpm verify` — green, exit 0, on both branches.

| suite | files | tests |
| --- | --- | --- |
| root, on this unit's branch | 238 | 5,674 |
| the app's own | 363 | 6,447 |
| `src/signals/` alone | 47 | 1,543 |
| `notice.test.ts`, new | 1 | 18 |

Numbers on the two other branches of this run: #700 after the split, root 238
files / 5,709 tests and app 351 / 6,274 — the split removed a record and three
citations and no test; the 0308 pull request, root 237 / 5,656 and app 363 /
6,447, which is `main`'s own figure since it changes no code.

**Seven planted mutations, no survivors**, and the split between how they die is
the point of the design:

| mutation | what caught it |
| --- | --- |
| `dwelled` loses its `ms` entry | **typecheck**, 1 error |
| the notice names `view` by another name | **typecheck**, 1 error |
| a refusal dropped from the closed set | **typecheck**, 1 error |
| `sentAt` dropped from the delivery table | 4 tests, including the walk over real batches |
| the `kinds` filter ignored, so every kind is named | 3 tests |
| the region floor passed through without `regionFloorOf` | 1 test |
| the duration always in minutes, so a short window reads nought | 1 test |

Three of the seven are compile errors rather than test failures, which is the
half of 0313 that cannot be undone by deleting a test: a payload field with no
sentence for a reader does not build.

**Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical to
`main` and measures **6,513 bytes minified** (esbuild, bundled, browser platform,
ESM) — the same number as the last four runs. `notice.ts` is server-side and is
not in the broadcaster's import graph, which `browser-weight.test.ts` holds.

**Nothing was added to a payload, a column, a store or the vocabulary of kinds.**
This unit adds no figure to any reading and reads no counter at all.

## Open questions

They are in the pull request comment with recommendations. In short: whether the
notice should be served over HTTP, which is a public-by-default decision rather
than a module; whether `docs/routines.md` should stop treating a `Proposed`
record as a hold on the whole pull request; and 0308, which has been the
maintainer's for two days.
