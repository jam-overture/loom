# Where a reading of a page stopped

**`Loom signals`, 9 November 2026, morning run.**
Branch `signals-80-where-a-reading-of-a-page-stopped`. Record
[0374](../decisions/0374-a-pages-unread-parts-are-reported-as-the-places-its-reading-stopped-and-each-is-behind-exactly-one.md),
`Accepted`. `pnpm verify` **EXIT=0**. Pull request
[#837](https://github.com/jam-overture/loom/pull/837); preview
<https://loom-git-signals-80-where-a-265bf1-jpizzolato36-6341s-projects.vercel.app>,
which Vercel reports `Ready` — this session's network policy does not reach
`*.vercel.app`, so the deployment's own status is the evidence rather than a
fetch of the page.

## What this run completed

**Forty skipped parts are usually one skipped part.**

Since 0212 this subsystem has been able to say *which parts of a page are read
and which are scrolled past*, and it says it the only way counters allow: a
counter can report what happened, the tree is the universe that makes silence a
measurement, and so every addressed node of a revision gets a standing — `read`,
`skipped`, `unknown`.

**Part by part is not how that answer is true.** A page whose pricing band never
came into anybody's viewport has the band, the rows inside it, the cells inside
those, and every heading and price among them all reporting `skipped`. That is
one fact about one band restated once per node underneath it.
`PageReading.standings` counts forty, and a screen drawn on that number says
*forty parts of this page go unread* about a page with **one** place a reader
stopped.

It is the plausible-false-number failure in its worst direction, because every
property you would check holds: the figure is the right shape, it is defensible
from the rows, it moves when the page changes, and it is forty times the size of
the thing to fix. `agenda.ts` already carries a paragraph about this count
manufacturing the steepest fall in a deployment — it guards the *orphaned* case,
where a wrong tree-and-window pair reads mostly `skipped`. What it had no guard
for, and no better figure to use, was the ordinary case: two pages with one
unread band each, ordered by how deeply each band happens to nest.

`src/signals/frontier.ts` is the figure that is not. `pageFrontierOf` is a pure
function of a `PageReading` — no tree, no registry, no store, no clock — and
returns **the frontier**: every part that reported nothing whose containing part
did not, which is every place the reading of the page actually stopped. Each one
carries what it plays (0114), the part it sits inside, how much of the page is
behind it, and the words nobody reached there (0122), plus two page-level lists
and two questions a caller can phrase:

| | |
| --- | --- |
| `frontier` | the places the reading stopped, in reading order |
| `unseen`, per place | the unread parts **behind that one place** — one band, not forty |
| `passedOver` | parts a reader had on screen and went past the whole of |
| `notReporting` | parts that said nothing with a reader demonstrably below them |
| `largestUnreachedIn` | the places ordered by what each costs the page |
| `unreachedWordsIn` | the words nobody reached, in reading order |

**Every unread part is behind exactly one place, and that is the property that
makes the arithmetic publishable.** The partition is on the *nearest* place, so
the `unseen` figures add to `standings.skipped` in every window without a caller
checking anything — asserted over six windows of one fixture page rather than
argued. *This is the one place to fix and it costs you nineteen parts of the
page* is arithmetic.

**Nothing was added to any payload, any table or any browser.** The containment
comes from the tree the counters already name. A browser could not answer this at
any payload, because it does not know which of the nodes it reports on contains
which others, and teaching it is what 0167 refused for exactly the kinds this
reads.

### The second thing in the branch, and it had to land first

`PartReading.parentId` is the **tree** parent. A slot is a node with children and
is never a part — only an element carries the identity attributes a broadcaster
reads — so an element handed into a slot has a slot's id as its `parentId`, an id
that appears nowhere in `PageReading.parts`. This lane filed that on 8 November
and said the fix was small and what it needed was to be the unit.

It is the first half of this one, because the frontier groups a page's parts by
what contains them and is precisely the reading the defect would have made
wrong. `withinId` is a second field now — the nearest **addressed** ancestor, the
same field by the same rule and now from the same shape of pass as
`InsidePart.withinId` (0368) — and `parentId` keeps its meaning, with its
documentation saying plainly that the answer can be a node this list has no row
for.

## Decisions I took that were not specified

**A second field rather than correcting `parentId`.** This was the
recommendation in the 8 November report and I did not revisit it: `parentId` is
published, three readings and the generated reference carry it, and it is the
right answer to the question it asks. A silent change of meaning is what 0097
exists to stop.

**Taking the partition on the nearest place and not the outermost.** The
outermost is simpler to say — everything beneath a place belongs to it — and it
double-counts in the one case the frontier nests, *silently*, because both
figures still look plausible. The nearest rule makes the sum equal `skipped` in
every window, which is a property a test can hold rather than a claim a reader
has to trust.

**Publishing the nesting defect rather than absorbing it.** A part that reported
nothing while a part inside it reported reach was demonstrably on a reader's
screen: that is a primitive not spreading its identity attributes, which
`sdk/conformance.ts` exists to catch. `notReporting` and `reportedBelow` name it,
which also tells a caller that a particular place's `unseen` is not the whole
truth about what went unseen there.

**Withholding `passedOver` where anything inside a part is `unknown`.** *A reader
had this on screen and went past the whole of it* is the one statement in this
reading about a reader's behaviour rather than about an absence from a table, so
it is the one that must not be guessed. A part nothing can be spoken for is not
*every part of it*.

**Ordering `largestUnreachedIn` by `unseen` and never by `beneath`.** A place's
`beneath` is how much is inside it whether or not this reading lost any of it. A
test holds the two apart, because they order a real page differently and the
first version of the test did not distinguish them — see the mutations.

**Not calling anything here a stop.** `progress.ts` owns that word for a *fall*
between two parts of one run, which is a ratio of two `reached` counts and needs
both ends to have reported. This is the other end of the same page, where there
is no ratio to take. One word for two figures in one subsystem is how a screen
comes to draw the wrong one, so the types are `UnreachedPart` and `PageFrontier`.

**Not changing `agenda.ts`.** The fix-list's ordering is a judgement about a
screen and it is filed rather than done: a run whose unit is a new reading should
not also re-order the thing an operator is handed.

## Records added

**0374**, `Accepted` — *a page's unread parts are reported as the places its
reading stopped, and each is behind exactly one*. It contradicts no accepted
record and touches neither the tree schema nor the delta model, so it is not
architectural. Seven clauses and five rejected alternatives, including the two
worth reading: correcting `parentId` in place, and a sixth signal kind for *a
reader scrolled past this* — refused under rule 6 and also the wrong instrument,
because a browser cannot tell *scrolled past* from *never rendered* and a server
holding the tree can.

**Written as 0372 rather than 0371, and renumbered 0374 at merge.** 0370 was
the highest on `main` when this ran, and both 0370 and 0371 were claimed by open
branches — #829 wrote 0370, which `main` already had, and #834 wrote 0371. 0372
was then the next number free on `main` and on every open branch, which is the
precedent 0368 set a day earlier. #829 afterwards renumbered its own record 0370
→ 0372 and merged first, so `Loom merge` renumbered this one to 0374 — the next
number free on `main` and on every open branch — with a dated note under its
header. Nothing it decides changed.

## Real test numbers

`pnpm install && pnpm verify` — **EXIT=0**, read out of a log file rather than
from a notice, after the API reference was regenerated.

| | files | tests |
| --- | --- | --- |
| framework and tools | 275 | **6,730** |
| application | 464 | **7,437** |

**14,167 pass. Nothing failed, nothing was skipped, no test was weakened, and no
existing assertion changed its claim in this lane or any other.**

- **+28 tests, +1 file.** Measured against `main` over the same scope
  (`vitest run src/`): 247 files and 6,081 tests become **248 and 6,109**.
- **25 of them are the new `src/signals/frontier.test.ts`**, and **3 are in
  `src/signals/parts.test.ts`** for the containment: the slot passed through,
  every `withinId` being an id the parts list has a row for while a `parentId` on
  the same page is not, and the two fields agreeing on a page with no slot in it.

**Two reds on the way, both of them gates doing their job.**

1. `(docs)`' *never makes a decision-record number part of a published sentence*
   failed on the new `withinId` comment, which read *"as `InsidePart.withinId`
   (0368 clause 4)"*. The rule is that a number must be a citation a reader can
   lift out and still have a sentence; `(0368 clause 4)` is not one. It is
   `(0368)` now.
2. Two of my own expectations in `frontier.test.ts` were wrong before the code
   was: in a window where only the root and one deep row reported, `hero` and
   `about` are unread too, and I had written the frontier list without them.
   The implementation was right and the test was arithmetic I had done in my
   head.

### Mutations

**18 run, 17 killed, 1 discarded as unable to fail.** Each was applied to
`src/signals/frontier.ts` alone and judged against `frontier.test.ts`. Three
survived the first pass; two were real gaps in the tests and are closed, and the
tests below are the second run's numbers.

| | mutation | tests failed |
| --- | --- | --- |
| 1 | an unread part inside an unread part is a place of its own | 7 |
| 2 | the partition is taken on the outermost place rather than the nearest | **0 — discarded** |
| 3 | a place accounts for everything in its subtree rather than what is behind it | 3 |
| 4 | the subtree's end is inclusive | 3 |
| 5 | the stack pops only on a strictly shallower part | 6 |
| 6 | the containing part is the one before it in reading order | 8 |
| 7 | a part nothing can be said about is a place the reading stopped | 5 |
| 8 | the page's count of unread parts is the number of places | 2 |
| 9 | passed over is claimed where a part inside cannot be spoken for | 2 |
| 10 | passed over includes a leaf, which holds nothing to pass over | 1 |
| 11 | a part that reported nothing with a reader below it is not named | 2 |
| 12 | the place's own words are left out of what nobody reached | 4 |
| 13 | the largest place is ordered least first | 2 |
| 14 | the largest place is ordered by what is inside it | **1 — was 0** |
| 15 | what the reading had reached before it stopped is always a read part | 1 |
| 16 | the orphaned count is dropped | 1 |
| 17 | the containment is the tree parent rather than the containing part | **1 — was 0** |
| 18 | a window of no views is read as a page stopped at the top | 5 |

**14 and 17 were the two real gaps, and both are the same mistake:** a fixture
where the right answer and the wrong one coincide.

- **14** ordered three places whose `unseen` and `beneath` happened to rank them
  identically. The test now uses the window where a reader reported reach *inside*
  an unreported band: the pricing band holds three parts and has lost one of
  them, the about band holds one and has lost both, so `unseen` and `beneath`
  order them opposite ways and only one of those orders is what a fix-list wants.
- **17** asserted `withinId` on places that were none of them directly inside a
  slot, so reading `parentId` instead gave the same answer. The test now reaches
  the pricing band so that the **row behind the slot** is the place the reading
  stopped — the one node on the fixture page where the containing part and the
  tree parent differ, which is the defect this branch closes, now asserted from
  the reading that would have been wrong.

**2 is discarded rather than counted as a survivor, and the reason is in the
source now.** Widening *is the container unread* to *is the container not read*
cannot change any output: a container that cannot be spoken for has no accounting
place of its own, so the `?? at` fallback lands the part on itself, which is the
same answer the narrow condition gives. The two guards say the same thing twice
on purpose — either alone is correct, neither alone says why — and the comment
says so, so that a future run reads the fallback as load-bearing rather than as
dead.

## What a browser pays

**Nothing.** `src/signals/frontier.ts` is pure, server-side and imported by
nothing a browser loads; `broadcast.ts` and its import graph hold no file this
branch touches. Measured through the gate's own bundler and `gzipSync`:
**7,543 bytes minified, 3,350 gzipped**, which is what `main` measures.

**One correction to the plan's own table while I was there.** It read 3,361
gzipped, measured 7 November. Nothing grew — `broadcast.ts` has not changed since
§78 — and the two numbers are one bundle measured two ways: `gzip -9` on a named
file writes that name into the gzip header and `gzipSync` does not, which is worth
exactly the eleven bytes between them. I checked that rather than assuming it:
a 7,543-byte blob through `gzip -9 -c <file>` and through `gzip -9 -c < file`
differ by the length of the name plus its terminator. The table now carries the
gate's figure, because it is the one that can fail.

## Findings

**Filed three, closed one.**

1. **Closed** — this lane's own 8 November entry, *`PartReading.parentId` can
   name a node that is in no part's list*. `withinId` is the second field it
   recommended, and the closing entry is appended rather than editing the
   original, because `FINDINGS.md` is union-merged.
2. **The fix-list orders by a count that is forty times the size of the thing to
   fix** (this lane, `agenda.ts`). Not urgent and nothing is broken; the entry
   carries three things a future run should hold, the first being *order by
   `unseen`, never by the number of places* — a page with forty unread leaves at
   the top level has forty places and forty unread parts, a page with one unread
   band has one of the first and forty of the second, and the second is the page
   to go and look at.
3. **The *By page* drawer's skipped count is a page's markup depth as much as its
   readers** (`Loom portal`). One call on a reading the drawer already holds, with
   the table of what it gives. The cost is one sentence of copy: *where readers
   stopped* is not *parts nobody read*, and a box labelled the second showing the
   first would be the plainest kind of wrong.
4. **Five new names on `@jam-overture/loom/signals` and no prose** (`Loom docs`).
   The sentence worth writing is in the entry. It is the same page the 8 November
   entry asks for seven names on, so one paragraph answers both.

**And one of mine was closed by somebody else.** Yesterday I filed that
`outlineTree` is quadratic in depth and throws above about two thousand, which
bounds both readings in this lane and could not be fixed from inside it. #829,
*a tree's depth no longer bounds a read of it*, is open on `main` and does
exactly that — an explicit stack, same pre-order, same output. Nothing in this
branch depends on it and nothing in it conflicts.

## The branches beside this one

**None of the four open pull requests touches the signal path, and this lane has
none of its own open.** #802 and #808 both landed. Specifically:

- **#829** (`Loom daily build`) rewrites `src/tree/outline.ts`, which both
  `parts.ts` and `inside.ts` call, and leaves its output identical — same
  pre-order, same entries. I read the diff rather than assuming: nothing in
  `src/signals/` is in it. It claims **0370**, which `main` already has, so its
  record is renumbered at merge whatever happens here.
- **#834** (`Loom portal`) is a record and a plan file, and claims **0371**.
- **#825** and **#778** are portal and docs surfaces.

The only files this branch shares with any of them are `decisions/README.md`,
which is generated and regenerated rather than resolved, and `FINDINGS.md`, which
is union-merged and appended to.

## Open questions

Three, all recommended, none blocking. They are in the pull request comment.

1. Whether `agenda.ts` should order the fix-list by what a place costs
   (finding 2). **Recommend yes, as its own unit** — the figure is right and the
   ordering of what an operator is handed is not a corner of somebody else's run.
2. Whether the *By page* drawer should print places rather than parts (finding
   3). **Recommend yes, in the portal's own time**, and with the label changed in
   the same commit as the number.
3. Whether `notReporting` wants a member in the fault vocabulary. **Recommend
   waiting for one real instance** — it is a primitive to fix rather than a page
   to rewrite, and a fault nobody has seen is a name invented ahead of its
   reader, which is the trap `role`'s one-member vocabulary was written to avoid.

## On the parked door

Nothing here makes per-reader identity more expensive to add later, and nothing
here is a step toward it. The reading is a tree, a set of standings and a
partition over them: no key, no region, no reader, nothing per person, and no
join that would need one. The `view` key is not read, not stored by anything this
branch touches, and appears in neither module.

Worth saying in the other direction, because it is the kind of thing that gets
mistaken for a step toward identity: *the words nobody reached* is a list of words
off a revision of a page, derived from counters that name nodes. It is a fact
about the page at a floor of a whole window, and it is the same list for every
reader who stopped in the same place.
