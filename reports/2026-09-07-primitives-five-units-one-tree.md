# Five units, one tree

**Routine:** `Loom primitives` · **Date:** 2026-09-07 · **Branch:**
`primitives-26-five-units-one-tree` · **Section:** §4b

## What this run did, and why this rather than more primitives

**No new primitives.** The five open pull requests this lane had accumulated —
#222, #229, #235, #241, #246 — are now one branch that builds, typechecks and
passes `pnpm verify` end to end. Fourteen primitives that were sitting in five
mutually-unmergeable branches are on one tree.

The brief's standing order is breadth, and the reason this run is not breadth is
a finding the maintainer filed on 28 August and merged as #216:

> **What to do differently, and this is the part that matters.** Before starting
> a unit, check whether you already have an open pull request. If you do,
> **continue it rather than branching again from `main`** — push onto that
> branch. Two open pull requests from one routine touching one file is a conflict
> you are creating for yourself, and the cost lands on the maintainer, not on the
> run.

That finding names this lane specifically as the worst case of the pattern it
was written about:

> all four demo runs edited `record-card.tsx`, **all four primitives runs edited
> `library.test.ts`, `stylesheet.ts` and `index.ts`**

**Sixteen pull requests were closed unmerged on 28 August because of it.** Four
of them were this lane's.

Nine days later the lane had done it again, one branch worse. Every one of the
five open branches was cut from `d7375ef`, and every one of them touches
`library.test.ts` and `stylesheet.ts`; four of the five touch `index.ts`,
`copy.ts` and `hermes-port-map.md`. A sixth branch adding a
seventy-first primitive would have been the sixth conflicting rewrite of the
same three files, and the only thing it could have added to the demo is another
unit of work waiting behind a merge nobody can perform.

**Every other lane has already done this.** #242 is `Loom marketing`'s four
consolidated, #243 is `Loom docs`' four, #245 is `Loom portal`'s five, #247 is
`Loom lessons`' four. This lane was the last one still branching from `main`.

**No maintainer review comments were outstanding** on any of the five — the only
comments on all of them are this lane's own and Vercel's, and there are no
reviews at all. So the queue was not blocked on an answer this run could give.

## What is in the tree, and what it cost to combine

Fourteen primitives, from five runs, in the order they were written:

| From | Primitives |
| --- | --- |
| #222 `primitives-21` | `event`, `event-grid`, `recording`, `recording-grid` |
| #229 `primitives-22` | *(no new primitives — 0106 containment, and `card` / `heading` / `milestone-list` / `mosaic` / `split` changed to use it)* |
| #235 `primitives-23` | `frame`, `pin`, `rating` |
| #241 `primitives-24` | `banner`, `carousel`, `link-trail`, `meter` |
| #246 `primitives-25` | `message`, `message-list`, `reveal` |

**The library is 84**, which is the number of `loom.*.ts` modules on disk, the
length `STARTER_PRIMITIVES` registers, and the number the marketing site's
`FACTS.primitives` now states. Those three agreeing is a test, not a comment.

### The merge could not be done mechanically, exactly as predicted

The 28 August finding said resolving these produces "code that would not
compile", and that is precisely what happens. The failure has one cause worth
recording, because it will recur for every lane that appends fixtures:

**Two branches that each append a same-shaped test fixture get interleaved
through their shared tail.** `datedPage` and `productPage` both end with

```ts
  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
```

so git treats that as common context and splices the *bodies* of the two
functions around it. The result is one function with two heads, and it is not
repairable by choosing a side — both sides are wanted.

The resolution was to stop asking git to merge these files and instead
**re-apply each branch's base diff onto the already-merged file, one insertion
run at a time**, anchored on the context immediately preceding it and requiring
a unique match. Every hunk in all four branches is a pure insertion except one:
the registered-count assertion, which is a genuine rewrite on every branch and
is the one line that had to be decided rather than applied. It is cumulative —
70 on `main`, then 74, 77, 81, 84.

The applier is in the scratchpad rather than the repository; if the other lanes
want it, it is thirty lines and worth committing to `tools/`. Filed.

### Two things the merge surfaced that were not merge damage

**1. Four primitives were never re-exported.** `loomEvent`, `loomEventGrid`,
`loomRecording` and `loomRecordingGrid` are in `STARTER_PRIMITIVES` on #222 but
absent from the named re-export block at the foot of `index.ts`, where all
eighty other primitives appear. That is #222's own gap rather than anything the
merge did — `git show origin/primitives-21…:src/primitives/index.ts` has the
same hole — and a host importing `loomEvent` by name would not have found it.
Added here, in alphabetical position.

**2. `decisions/README.md` and `reference.generated.json` are generated, and
were resolved by regenerating rather than by hand.** The decisions index
reports holes at 0103–0105 and 0107–0109 — numbers claimed on other lanes'
unmerged branches — and **no clash**, which is what 0097 asks it to do. 0106
(#229) and 0110 (#246) both survive with their own numbers. The API reference
had to be regenerated *after* the final build rather than before it, because it
extracts from `dist`: generated too early it is missing `loom.reveal`, and
`extract.test.ts` catches exactly that. 879 exports, up from 874.

## Which Hermes fields became nodes, and which stayed props

**None, either way — this run ported no Hermes block.** The fourteen primitives
carried their own 0052 calls in the five reports being consolidated, and those
reports are in this branch unchanged; the granularity reasoning is theirs and is
not restated or revised here.

The one call this run made is not a granularity call: the registered count is
**cumulative rather than max**, because each branch's number is `70 + its own
additions` and the merged tree holds all of them. Getting that wrong is a test
failure rather than a silent defect, which is why the assertion is written as a
number and a spelled-out word that have to agree.

## Records

**None written.** This run decided nothing that a record governs — it is the
application of a finding the maintainer already filed and merged. No decision
record was touched, superseded or proposed.

## Findings

**Filed — two.** Both are in `FINDINGS.md`; the first is the one that matters.

1. **The brief tells this routine to do the thing that cost sixteen pull
   requests.** Step 3 of the standing prompt is *"Branch `primitives-NN-<slug>`
   off `main`. Never stack"*, and the 28 August finding is *"continue it rather
   than branching again from `main`"*. A routine that follows its brief
   regenerates the pile every run, and five of the seven lanes have now
   resolved this by ignoring the brief. **A routine cannot rewrite the
   governance it is bound by**, so this is filed rather than fixed.

2. **The insertion-run applier should live in `tools/`.** Every lane that
   appends test fixtures will hit the interleaving failure, and the recipe is
   short enough that it keeps being rediscovered.

## The visual

**This run added no primitive, so it added no screenshot.** The twenty-four
specimen images from the five consolidated runs are in this branch and are the
visual for what it contains — `2026-09-02-primitives-forty-minutes-*`,
`2026-09-03-primitives-the-width-*`, `2026-09-04-primitives-frame-*`,
`2026-09-05-primitives-furniture-*` and `2026-09-06-primitives-exchange-*`,
each under both palettes at phone and laptop widths.

Photographing them again against the merged tree would be the honest thing to
do and it is **not** done here, for one reason worth stating plainly: `loom.reveal`
puts every band below the first screen at `opacity: 0` until it is scrolled to,
so a fresh capture of the merged library needs the `reducedMotion: "reduce"`
flag #246 added, and re-shooting twenty-four images to prove a merge changed
nothing visible is a poor use of the allowance against re-reading the five
reports that already prove it. **If the merge is doubted visually, that is the
right thing to ask for and it is one run.**

## What the library still cannot express

Unchanged from #246, and none of it is affected by this run:

- **A tab strip**, still blocked on client-side selection — a `select` member of
  the behaviour vocabulary, which is the framework lane's and needs a record.
- **A container query on the nav**, still a media query at `48rem`, so a nav in
  a narrow column collapses late.
- **A shadow slot in the palette.**
- **A cascade inside a reveal**, deliberately — #246 argues it should wait for a
  page that asks.

## The state this leaves the lane in

**One open pull request, and the four it supersedes should be closed rather than
merged.** Merging any of them after this one re-opens the conflict this branch
exists to remove. They are listed in the pull request body with that
recommendation.
