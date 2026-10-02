# Reader signals — what *on screen* means, published, and the hidden tab nothing was holding

**Routine:** `Loom signals` · **Date:** 2 October 2026 · **Branch:**
`signals-04-what-on-screen-means` · **Pull request:** #486

**Preview:** https://loom-git-signals-04-what-on-c93b9e-jpizzolato36-6341s-projects.vercel.app
— **not visited from this session** (`*.vercel.app` is denied by this
environment's egress policy), and nothing in this change has a surface anyway: it
publishes two constants, adds tests, and writes three paragraphs of
documentation.

## What I completed

**All three findings this lane owned**, which the brief puts ahead of the plan.
They turned out to be one class: *a fact about what a reader counter means,
stated nowhere anything could check it.* Nothing in the plan's seven steps is
waiting on this lane — 1, 2, 3, 6 and 7 are done and 4 and 5 belong to other
lanes — so a run of findings is the whole of what was owed.

| the finding | filed by | what closed it |
| --- | --- | --- |
| *"on screen" is two numbers inside an unexported function* | `Loom docs`, 2 Oct | `READABLE_VISIBLE_FRACTION` and `READABLE_VIEWPORT_FRACTION`, published, plus the first test in `src/` to drive the real observer |
| *a node that leaves while the tab is in the background is credited with the whole hidden time* | `Loom docs`, 2 Oct | two cases, one at the broadcaster, and an exhaustive sweep — and one correction to the finding |
| *a page cannot report that every part went unread* | `Loom portal`, 2 Oct (on #483) | the sentence in `PartStanding`, and two tests holding it |

**No counting code changed.** Both defects were latent: the ledger on `main` is
correct, and what was missing was anything that would notice if it stopped being.

### What `viewed` and `dwelled` mean is now quotable

The rule is one line and the whole of what those two kinds say: at least half of
the element is showing, **or** it fills at least three tenths of the window. The
second clause is not a softening — an element taller than the window can never
reach one half, so a long section judged by the first alone would never be viewed
at all.

`Loom docs` hit it writing the page that explains the vocabulary to a host. The
numbers were literals inside an unexported function, so the page said *"enough of
the element was on screen"* — true, vaguer than the code, and deliberately not
*"half of it, or a third of the window"*, because that is two hand-typed numbers
standing beside the noun they count.

**The decision the finding did not anticipate is where to publish them from, and
it is measurable.**

| | minified | gzipped |
| --- | --- | --- |
| before | 6,477 | 2,944 |
| the two names exported from `broadcast.ts` | **6,554** (+77) | **2,986** (+42) |
| the same two numbers imported into it from `readable.ts` | **6,477** (+0) | 2,945 (+1) |

A name a browser entry point **exports** survives minification — a bundler cannot
know nothing outside will ask for it. A name it **imports and uses** is a local,
mangled to a letter, with the value inlined. The two spellings are
indistinguishable in a diff and 77 bytes apart on every page of every deployment
that broadcasts, for ever, to serve a sentence on a documentation site. So the
constants live in `src/signals/readable.ts`, `broadcast.ts` imports them, and
`@jam-overture/loom/signals` publishes them. [0215](../decisions/0215-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)
carries it as the general rule for any constant that is both applied in a browser
and quoted elsewhere.

**They are not configuration**, and that is the other half of the record. A
rollup cannot record the threshold the browser applied, so a deployment that
could choose its own would have counters whose meaning differed from every other
deployment's while the column names stayed identical — and the number would be
unknowable for every row already stored. 0146 made the retention *window*
configuration on purpose, because a window is a policy about keeping data; a
threshold is the definition of the datum.

**The rule itself stays unexported**, and is now tested through the observer the
broadcaster builds for itself, with the browser's half doubled. Nothing in `src/`
had ever reached `isReadable`: every other test here injects an
`observeVisibility` that reports a boolean, which is the right seam for
everything above the rule and leaves the rule unexercised. The one test that did
reach it is the marketing lane's, reporting a ratio of 1 — which satisfies both
clauses and so distinguishes neither.

### The hidden tab, and the guard that was called redundant

`left` is called by the visibility observer and by the removal half of the
arrivals observer, **and both fire in a background tab**: a client navigation, a
list that empties, a boundary that swaps. Every hidden-tab case in the ledger's
suite closed its stretch with `hid` or `drain`, so the one line that makes this
right could be deleted with the whole suite green — `Loom docs` measured
**11 seconds credited for 3 seconds of reading**, because `accrue` never advances
`since`, so the hidden stretch is counted *and* the stretch before it is counted
twice.

What is there now: the case the finding asked for, the same case at the
broadcaster (hide, then remove the node five minutes later, then flush), and a
sweep.

**One correction to the finding, against its own reading and in the lane's
favour: `drain`'s `if (!hidden)` is not redundant.** The finding called the two
guards each other's backstop with neither tested alone. In fact removing drain's
is not an equivalent mutation — `drain` while hidden sets `since = now` on every
entry `hid` had closed, so the next `left` in that hidden tab accrues from the
delivery. It was *unfalsifiable* rather than redundant, for exactly the reason
the finding named: nothing closed a stretch from the hidden direction. And it is
load-bearing on **every** tab-hide in the real broadcaster, which calls
`ledger.hid(now)` and then `flush()` (`broadcast.ts:601`).

### The sweep, which is the part I would keep

The two cases above are the ones somebody thought of. The sweep is the other
kind of guard: **every ordering of the ledger's whole surface up to five events**
— enter a, leave a, enter b, leave b, hide, show, drain — which is 16,807
sequences, each held to two facts that must be true of all of them:

- time credited is time the node was on screen in a tab somebody was looking at,
  and never a millisecond more;
- a node is viewed once, at a moment it was on screen and the page visible, or
  not at all.

The model it is compared against is a **timeline, not a second ledger**: events
land a second apart, and the second between two of them is credited if the node
was on screen and the page visible across it and a drain came at or after its
end. Nothing after the last drain is reported, because what a drain has not taken
is still inside the ledger. Sharing no code with the thing it checks is the
point — a second implementation of the same reasoning reproduces the same
mistakes.

It runs in **101 ms** across its four tests, and two of those four are guards on
the sweep itself so that it cannot pass by agreeing with itself: one asserts the
alphabet is complete, the other that at least a tenth of the sequences credit any
time at all.

### The sentence `Loom portal` asked for

`PartStanding` now says why one combination of its three answers cannot arise:
`skipped` means no row names this part and `PageReading.views` is the largest
`views` any one row reports, **both read off the same rows** — so every part
being skipped needs a window with no row for any part of the page, which makes
`views` zero, which makes every part `unknown`. The one input that does produce
it is a row naming a node the revision does not have, which is `orphaned`, and
is the state a consumer should refuse to draw. The reachable neighbour, which is
the one worth a screen, is *rows exist and not one reports reach*.

Two tests hold it, which the finding did not ask for: the floor case, and the
orphaned row that produces the impossible reading together with `orphaned`
naming it. The portal lane found this by building a state and discovering it was
unreachable; a future change that made it reachable now goes red here rather than
on their screen.

## Decisions I took that were not specified

**1. The constants are published from their own module, not from the
broadcaster.** The finding asked for "two named exports" and the obvious reading
costs 77 bytes a reader. In 0215 with the measurement, as the general rule.

**2. They are not configuration, and changing either is a record.** Nobody asked
for a setting; I am writing down that there will not be one, because *threshold
as a knob* is what a reasonable engineer reaches for next and it quietly destroys
the comparability of every stored counter.

**3. `isReadable` stays unexported.** Rejected exporting it even though that
would have been the shortest route to a test. Driving a doubled observer tests
the thresholds, the fallback to the window's own height, the zero-height guard
**and** that the observer is asked to report the fraction it judges by — four
things a direct call would not reach. A host that wants to know what a reader saw
reads the counters.

**4. The portal's finding is answered by an appended entry, not by a status on
theirs.** Their entry is on `portal-45-what-did-people-skip` and has not reached
`main`; editing it from here would be two lanes writing one line, which is the
0212 collision in a different costume.

**5. I moved one number in another lane's test.** The broadcaster's import walk
now reaches ten files rather than nine, so `(docs)/_lib/api/extract.test.ts`
asserted 9 against a generated reference that says 10. Moved, nothing else
touched, and the one piece of prose in that directory that mentions nine files
(`requires.ts`) is a generic illustration rather than a claim about the
broadcaster, so I left it alone. Reach is not bytes: the ten files minify to the
same 6,477.

## Records added

[0215](../decisions/0215-what-a-counter-means-is-published-and-the-browser-pays-for-the-number-and-not-its-name.md)
— *What a counter means is published, and the browser pays for the number and not
its name.* Accepted; it contradicts nothing and supersedes nothing. Four
alternatives recorded with why they lost, including the two that look free
(exporting from `broadcast.ts`, making the thresholds configuration).

`docs/signals.md` gained a row in *what is already built* and **a limit found in
rule 4**, which is the one the brief asks to write down: an exported name in the
browser entry survives minification, so a value the browser applies and a page
quotes lives in its own module.

## Findings closed and filed

- **Closed:** the `isReadable` thresholds (with the entry point, the two names
  and the byte measurement, since importing from `/signals/broadcast` would be
  the wrong door).
- **Closed:** the hidden-tab ledger case, with the correction about `drain`'s
  guard.
- **Filed, informational, for `Loom portal`:** the sentence is in `parts.ts` and
  two tests hold the arithmetic.
- **Left open:** the `fetch` hole in `completed`, which is a question for the
  maintainer and is below.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read from a file rather than
from a pipe.

| | this branch | `main` |
| --- | --- | --- |
| Runtime suite | **174 files, 3,578 tests, 0 failed** | 173 files, 3,560 — measured, not derived |
| Application suite | **359 files, 6,322 tests, 0 failed** | 359 files, 6,322 |
| `findings:check` | 950 findings, 0 malformed | 949 — one entry appended |
| `prerender:check` | 124 pages, 1,461 junctions, 0 run together | unchanged |

**18 tests added. Nothing skipped, nothing weakened, no existing assertion
relaxed.** One existing assertion changed and it is a count, not a meaning:
`files: 9` → `files: 10` in the docs lane's reference test, because the
broadcaster's import walk reaches one more module.

The gate failed once on the way, exactly as it should have: the published surface
moved, so `app/(docs)/_lib/api` refused the stale reference until
`pnpm --filter @loom/app docs:api` was run. The six names published are the two
constants and nothing else.

**Browser cost, measured rather than estimated** — `esbuild --bundle --minify`
over `src/signals/broadcast.ts`: **6,477 → 6,477 bytes minified**, 2,944 → 2,945
gzipped. Zero, which is the whole of 0215. The rejected spelling of the same
change was 6,554. `browser-weight.test.ts` still reports the broadcaster reaching
no package; `readable.ts` imports nothing.

**Sweep cost:** 16,807 sequences, two invariants and two guards on itself —
**101 ms**, inside a 15-test file that runs in about 180 ms.

## Defects planted, and what caught them

Each restored in turn, the suite run, and the file put back with
`git checkout`/a kept copy between rows. **Every row is caught, and seven of the
nine were caught by nothing yesterday.**

| # | the defect | caught by |
| --- | --- | --- |
| 1 | `hid` no longer nulls `since` — the finding's own mutation | **4** tests: both new ledger cases, the sweep, and the broadcaster case |
| 2 | `drain` loses its `if (!hidden)` | **2**: the second ledger case and the sweep |
| 3 | the viewport clause dropped from `isReadable` | 2 readable cases — the tall element and the window fallback |
| 4 | `viewport > 0 &&` dropped, so a zero-height window divides by zero and `Infinity >= 0.3` | *counts nothing when the window has no height to fill* |
| 5 | `>=` becomes `>` on the visible fraction | *counts an element the moment the visible fraction is reached* |
| 6 | the `isIntersecting` guard dropped | *counts nothing for an element the window says is not intersecting* |
| 7 | the fallback to `globalThis.innerHeight` dropped | *falls back to the window's own height* |
| 8 | the judged fraction removed from the observer's `threshold` list, so the boundary is a crossing it is never woken for | *asks the browser to report the fraction it judges by* |
| 9 | `READABLE_VISIBLE_FRACTION` quietly moved to 0.4 | the one deliberately tautological test, which is where a silent edit to a published promise stops |

Rows 1 and 2 are the measurement that justifies the sweep: against yesterday's
suite both were **equivalent mutations** — every test green, a reader credited
with 11 seconds of a 3-second visit — and row 2 was believed to be equivalent
*by design*.

## Open questions

**1. The `fetch` hole in `completed`, unanswered for two days and still the one
that needs you.** A host's form that posts with `fetch` calls `preventDefault`,
so the broadcaster sees a cancelled submit and reports no completion: a
deployment can have conversions and see zero, indistinguishable from nobody
converting. The only honest fix is a function the host calls — `completed(node)`
on the broadcast handle — because only the page knows its own submission
succeeded. Rule 3 refuses measurement as a *prop in the tree* so that a proposal
cannot switch it on; a host's own code is not a proposal.
**Recommendation: allow it, and let me write that distinction into a record that
amends nothing.** The finding stays open until you say.

**2. What is next in this lane, since the plan is done.** Step 7 left one thing
named and unbuilt: the opening marker would give a rollup an **exact count of
page views begun in a window**, which is 0147's over-count solved rather than
bounded — every `views` figure in the portal today is a distinct count summed
across rollup windows. It is a column, a counter and a contract case in both
stores. **Recommendation: that, next run**, unless you would rather have the
`completed` answer built first.

**3. The floor at 25, and `docs/deployment.md`.** Both from yesterday, both still
one line of your reading. Neither blocks anything.

## Also worth knowing

**Nothing in this change moves the parked door.** Per-reader identity is no
cheaper and no dearer for it: two published fractions say nothing about a person,
and the sweep is about a tab rather than a reader.

**No framework gap.** Everything this needed was in this lane, and the only file
outside it that moved is a generated reference and one integer in the test that
reads it.

**The lanes did not collide.** `Loom daily build` has no branch open touching the
signal path; the three open pull requests are #463 and #483 (portal) and #484
(demo). #483 reads `pageReadingOf`, which this change documents and does not
alter.
