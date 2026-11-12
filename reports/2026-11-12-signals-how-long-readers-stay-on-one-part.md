# How long readers stay on one part

**12 November 2026 · `Loom signals` · branch `signals-86-how-long-readers-stay-on-one-part`**

## What I did

The *Goals* screen in the portal has carried one sentence since 8 November:
*Stays on it waits on time on a part being counted per reader.* `docs/portal.md`
records it twice, and the portal lane's report of this morning lists it as one
of three things blocking every buildable piece it had.

**It was waiting on nothing that had to be collected.** A tally has carried
`dwellMs` beside `reached` for every part of every revision since the counters
existed, and 0230 has divided the two for a part of **one** page since it
landed. What was unaskable is the same question of a goal's part — which is one
node id standing on nine pages, with nine rows, nine word counts and nine doors,
and nothing adding them up.

So this run built that join: `partPaceOf`, in `src/signals/part-pace.ts`, with
`PartPace.spentMs` as the figure — *the time the typical reader who reached this
part had there*, pooled across every page it stands on. It is the twenty-third
reading taken out of the server-side join of 0212 rather than collected: **no
payload field, no counter, no column, no table, no byte on any wire and nothing
in a reader's browser.**

## The figure that mattered was the one nobody should take

A part on two pages has two paces, and the obvious figure is their mean. It is
the wrong one, and the test that kills it is the second in the file: four
hundred readers get a quarter of the time a hundred-word band takes, one reader
gets four times what a four-word note takes. **The mean of 0.25 and 4 is above
two and reads `lingered`. The pooled quotient is 0.25 and reads `skimmed`**,
which is what readers of that part actually met. So the numerator is `dwellMs`
added as the rows hold it and the denominator is `readers × wordsWithin ×
msPerWord` added per page — a mean of the per-page paces weighted by the words
each page put in front of readers, which is 0325's rule for a kind of part
arrived at again rather than assumed.

Two things follow that a screen could not have got right by dividing two
columns. **Each page's own words**, because the same node can say more on one
page than another; and **each page's own door**, because nine straddle rates are
not one scalar — so `partPaceOf` has no `inflation` argument, exactly as
`libraryPaceOf` has none (0250).

The other rule is the withholding. `spentMs` is `null` under a silence and never
nought: *nobody was seen on it* and *they had no time on it* are different
answers, and the four silences each have a sentence of their own.

## Decisions I took that were not specified

- **Reusing `KindPaceSilence` rather than publishing a vocabulary of its own.**
  The four states of a part's pace are the four states of a kind's — it stands
  nowhere, nowhere it stands was read, its words could not be counted, it says
  nothing that takes time. A `PartPaceSilence` would have needed a closed set, a
  twenty-third `meaningOf` and a twenty-third entry in `SILENCE_VOCABULARIES`:
  three more places for two names of one state to drift apart, and about 57
  bytes of a names index with 148 to spare. Only the sentence is part-shaped,
  in `describePartPaceSilence`.
- **Which pages is the caller's answer.** A goal naming pages hands in those
  pages' readings; a goal naming none hands in every page it can read, and a
  reading with no row for the node costs nothing but a count. Narrowing inside
  would have put the goal vocabulary (0350) into `src/signals/`, which is the
  portal's and not this subsystem's.
- **A node standing as two primitives on two pages is reported, not resolved.**
  `typeDisagreed` names the later types and the first page's answer stands, in
  the shape `LibraryPace.roleDisagreed` already uses.
- **No per-page breakdown.** The rows exist inside the loop and are summed away.
  *Which page is this part skimmed on* is a second question whose ordering is
  the whole decision, and publishing rows whose order a screen invents is worse
  than publishing none. Filed.

## Records

- **0381, Accepted** — *A part's pace across pages is one pooled quotient, and a
  goal's part is a reading of its own.* The index was regenerated.

Nothing here contradicts an accepted record and nothing touches the tree schema
or the delta model, so no `Proposed` record was needed.

## Findings

**Filed (three):**

- *Stays on it is answerable now, since counting began, and the range version is
  the one that costs rows* — for `Loom portal`, with what the row says that a
  screen should not re-derive, and why the figure is since counting began rather
  than over a range (a stated limit of 0362, not an omission).
- *One part on nine pages has nine verdicts, and which page it is skimmed on is
  a second reading* — this lane's own, with the test to write first if it is
  built.
- *This branch spends 50 of the names index's 148 bytes, and leaves 98* — for
  `Loom docs` and the maintainer, narrowing the two entries of 10 November
  rather than closing them.

**Closed: none.** I read every open finding owned by this lane before choosing
work. The hourly rate's rolling denominator is being built on #856 and I did not
race it; the dense-fill note and the document-form entry both say *leave it* and
their own recommendation stands; the `parentId` entry was closed on 9 November;
and what is left of the fix-list ordering entry is a judgement about a screen.

## Test numbers, measured

`pnpm install && pnpm verify` — **EXIT=0** on the committed tree.

| | files | tests |
| --- | --- | --- |
| framework, `main` at `a080722` | 283 | 6,850 |
| framework, this branch | **284** | **6,878** |
| application, both | 483 | 7,850 |

**+1 file and +28 tests**, all of them `src/signals/part-pace.test.ts`. The
application suite is untouched. Nothing was skipped and nothing failed.

**Six mutations, run against the new suite.** Five were caught on the first
pass; the sixth was not, and a test was written for it:

| mutation | tests failed |
| --- | --- |
| `needMs` not weighted by readers | 6 |
| a duplicate reading let through | 1 |
| no straddle correction | 1 |
| the word floor ignored in the verdict | 1 |
| `spentMs` divided by placements instead of readers | 3 |
| the silence order swapped (`wordless` before `unreadable`) | **0 → 1** |

The last one survived because every fixture that reached the silence order had
only one of the two reasons in it. The test that kills it now holds one page
that owes words nobody counted beside one that says nothing at all, and asserts
the floor wins.

## Bytes

**Nothing new runs in a browser.** `broadcast.ts` and its import graph are
untouched; `src/signals/browser-weight.test.ts` passes, and the bundle measures
what it measures on `main`.

**The docs names index did move**, and it is the one number on this branch worth
reading twice:

| | spent | cap | room |
| --- | --- | --- | --- |
| published names, raw, `main` | 39,852 | 40,000 | 148 |
| published names, raw, this branch | **39,902** | 40,000 | **98** |
| per name | 19.037 | 24 | — |

Three names — `partPaceOf`, `PartPace`, `describePartPaceSilence` — at **50
bytes**. The unit was shaped around that number: reusing the silence vocabulary
saved three more names and about 57 bytes. **98 bytes is about five names**, and
#851 is still held on this cap with sixteen.

## Open questions

1. **Is since-counting-began the right scale for *Stays on it*?** It is what the
   counters can answer honestly. Over a range it needs a part-grained hourly
   dwell counter — about 6,000 rows an hour for a 6,000-node page, per revision,
   in a table nothing sweeps. My recommendation is to ship the screen on the
   figure that exists and buy the rows only if somebody asks the range question
   out loud.
2. **Should the per-page breakdown be published, and ordered how?** By the
   reading time missing, as a deployment's falls are ordered (0221), is my
   recommendation; by the pace would let a page one reader hurried past head the
   list.

## Working beside the other lanes

`git fetch` before branching, off `main` at `a080722`, and no branch is stacked.
**#870 touches `src/signals/broadcast.ts`** — it is an interactive session's
branch, it sorts a site's readers into segments and carries the segment to its
signals, and it is the only open branch in the signal path this one could have
raced. Nothing here goes near that file. #856 owns `acted.ts` and #865 owns
`health.ts` on open branches; this unit touches neither, and the only shared
files it changes are the ledger (appended, never reflowed) and the two generated
files (regenerated).

Decision **0381** is the next number free on `main` after re-reading
`decisions/README.md`. Four open pull requests claim 0380 through 0386 and will
be renumbered when they merge; 0380 is already on `main`.
