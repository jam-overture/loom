# Reader signals — which page a change helped, and which it hurt

**Routine:** `Loom signals` · **Date:** 2026-10-16 (evening run) · **Branch:**
`signals-35-what-a-change-did-across-the-deployment` · **Section:** §35 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The comparison that is about a **deployment** rather than a page:
[0291](../decisions/0291-a-deployments-change-is-two-orders-at-the-doors-scale-because-a-page-has-no-net-movement.md),
`deploymentChangeOf(changes, rows)` in
[`src/signals/deployment-change.ts`](../src/signals/deployment-change.ts).

A deployment has had an order over its pages since 9 October — *where is the
problem* — and it is an order over **one window**. Every comparison this
subsystem publishes is of one page: where its reading stops, how much of it gets
read, whether its readers had room, what they did inside its parts, who they
were, and since this morning its funnels. Four more compare a library, which is
a census by kind rather than an order over pages.

So *which page is worst* could be asked and **which page got worse could not** —
and that is the question a change creates, which is the question the product
exists to answer. A deployment that shipped a change across forty pages had two
screens and a subtraction done by eye, forty times.

It is the **twenty-fifth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds.**

### The two things that decided the shape

**The ranking figure a comparison already publishes is not comparable across two
pages, and this is the sharpest case of 9 October's rule rather than another
instance of it.** A before-and-after reading compares shares and never counts,
and the share movement it publishes has no straddle in it: both sides are falls
off their own rows, so each window's inflation divided out before the two met.
Then the honest movement is multiplied by the readers that reached the stop in
the later window — a distinct view count, generous by every page view that
spanned two rollup windows, at a rate that is each page's own. **The straddle
walks back in at the last step of a figure that looks corrected**, and nothing
in the arithmetic shows it. So the key here is that figure put on the scale the
door counts in, with each revision's own rate out of its own row.

Only the **later** window's rows are asked for, which is the one part of the
signature somebody will want to change. The figure being scaled is the later
window's own — a share movement at the volume the page has now — so the earlier
window's row would be scaling a number it is not the denominator of.

**A page has no net movement, so there are two orders and not one.** Adding a
page's stops counts one reader once per stop they walked past, which is the
refusal every reading here makes of a page-level total. What makes it decisive
rather than pedantic is the shape of a real change: the band an author rewrote
reads better and the band it pushed below the fold reads worse, so *both*
directions are the ordinary case. One signed figure per page would net them
against each other and report a page where nothing happened. A page therefore
stands in both orders where it earned both places, is counted **once** in the
standings, and nothing anywhere is summed, netted or subtracted across the two.

### What else is in it

- **A page nothing moved is an answer and not a silence.** The gate into either
  order is the comparison's own one-reader test, which is what keeps a page
  three people have read off the top of a deployment's screen the morning after
  a change. Each window's view floor travels with the row, so a steady page can
  be told from a quiet one.
- **A page handed in with two different comparisons is in no order, no standing
  and no total, and is named.** A tree live at two revisions is two live versions
  of one page and the one-window order deliberately keeps both; a comparison
  pairs by page, so such a tree has two movements and none that is the page's.
  A repeated comparison of the *same* two revisions is a different thing — a
  caller's two reads — and the first stands.
- **The seventeenth silence vocabulary brought no new condition and no new
  subject, and the one combination of them this table had not held.** Its
  reading is of a deployment and every reason it gives is about a *comparison*,
  which is the 7 October claim at one more remove: an order is silent about its
  members, and here a member is itself a pair of windows. `mispaired` is also
  the second name for the state a before-and-after reading calls
  `different-trees`, and the suite asserts the mapping calls them one state.

## Decisions I took that were not specified

**1. Two orders rather than one signed one.** The alternative is in the record
with its reason, because it is the shape anybody would reach for first and the
one a card will be tempted to draw.

**2. `ambiguous` is a list of pages and not a standing.** The 12 October reading
of a library refused the same state the same way, so this is that refusal at
another unit rather than a new vocabulary member — and it keeps the silence set
free of a condition about what a caller handed in.

**3. The magnitude carries the direction in the field name, not in the sign.**
`worsened` and `improved` each publish a positive share and a positive scaled
figure. The reading this is built on warns, in writing, that a screen which
subtracts the other way round has one figure pointing the wrong way and that it
is the defect a reviewer cannot see; two signed fields on one row, one of which
is always negative, is that defect waiting to happen.

**4. `Accepted` rather than `Proposed`, and nothing superseded.** Nothing here
contradicts an accepted record. It is the 9 October order's rule applied to the
4 October comparison, and both of them are cited for the claims they already
make. The one refusal in the neighbourhood that *is* accepted — no ranking
across a page's funnel pairs, because the pair that loses most readers is
whichever end sits deepest — is about pairs within a page and is untouched: this
orders pages, by a figure each page's own comparison already ranks its own stops
by.

## Records added

One: **0291** (renumbered from 0289 at merge). `pnpm decisions:index` regenerated; `0151`–`0154` and `0278`
still print as holes — `0278` is held by #647, which is `Loom daily build`'s and
open, and the older gaps are the ones the numbering record allows.

## Findings

**Filed:** one, owned by `Loom portal` — the morning-after screen, with the four
refusals it must not undo (no net movement per page; the scaled figure is not
people; `unmoved` is an answer and the five silences are not; an `ambiguous`
page is not a page with no movement) and the one state worth a design decision
rather than a rule, which is the `inconsistent` row that publishes its shares
and withholds its scaled figures.

**Closed:** none. The three open findings this lane owns are unchanged by this
unit: the `fetch`-submitted form that no conversion counter sees, which is a
question for the maintainer before it is work, and the two limits-in-a-record
entries that ask nothing of anybody.

## Test numbers

`pnpm verify` **green, exit 0**, on the tree this pull request carries. Nothing
failed at the end, nothing was skipped, and no test was given a longer budget or
weakened to get there.

- **5,255 runtime tests across 231 files**, and **5,926 app tests across 335
  files**. `findings:check` reads 1,229 entries with none malformed;
  `reports:check` 1,869 visuals at 131.4MB with none over budget;
  `prerender:check` 133 pages and 1,842 text junctions, none run together.
- `src/signals` alone: **1,174 tests across 41 files**, all passing.
- The unit itself is **25 tests** in a new file; `silences.test.ts` is 50, one
  more than it was.

**The first full verify went red, and on something this lane will hit again.**
Two app tests failed, both about the published surface rather than the
arithmetic: the generated API reference no longer matched the package, and five
new exports were reported as *published and mentioned on no page on this site*.
Both are one command — `pnpm --filter @loom/app docs:api` — which rebuilds the
package, regenerates `reference.generated.json`, and thereby gives the five
names the page that makes them findable. Worth writing down because the failure
reads like a documentation gap in another lane and is not one: the reference is
generated, so a new export in `src/signals/index.ts` is incomplete until it has
been run.

**Six planted mutations, each caught:**

| mutation | tests that failed |
| --- | --- |
| the order ranks on the comparison's own figure instead of the scaled one | 2 |
| both orders are keyed on the same direction | 1 |
| an ambiguous page is read as a duplicate instead of refused | 1 |
| the arrivals are added once per row instead of once per revision | 1 |
| the alarm compares a stop's readers against the openings, not the appearances | 1 |
| a page nothing moved is ranked rather than reported unmoved | 3 |

Two of those survived the first suite I wrote and are the reason the numbers
above include seven tests I did not plan. The keyed-direction one survived
because nothing in the first suite ordered **two** helped pages; the alarm one
survived because every fixture happened to keep a stop's readers under the
openings, when the whole point of the scale is that a long-dwell page's counters
exceed them legitimately. There is now a test for each, and the second of them
asserts something worth asserting on its own: a page whose counters are above
its openings and below its appearances is ranked, because that is a measurement
and not a disagreement.

**The double-count guard this lane owes every counting unit.** An order cannot
double-count by adding, because nothing in it is added; the only lie available
to it is one page standing in it twice. The suite builds the caller that
concatenated two reads of one window and asserts the two orders, their scaled
figures, the head of each, and the whole standings table are identical to the
honest reading's, with `duplicated` reporting what it dropped and `arrivals`
unchanged at 200.

## Browser cost

**Nothing new runs in a browser.** Measured both sides from a clean
`git archive` of `origin/main` and of this branch, bundled and minified with the
repository's own esbuild: the broadcaster is **6,477 bytes minified and 2,955
gzipped** on both, and `cmp` reports the two bundles byte-identical.
`browser-weight.test.ts` still finds no package at all in its import graph.
`deployment-change.ts` is server-side arithmetic over readings that already
exist, and no browser bundle reaches it.

## Open questions

Nothing blocking. Three with a recommendation each are in the pull request
comment: the two orders against one signed order, the later window's door as the
only scale, and whether `ambiguous` belongs in the standings after all.

## Beside the framework lane

**#647 is `Loom daily build`'s** and holds 0278. It does not touch
`src/signals/`, so nothing was raced. No other pull request was open when this
run started, and the two this lane had open this morning — #649 and #654 — have
both landed; `main` was fetched and this branch cut from it at `c99285e`.

The three files that always collide are the three that collided: `docs/signals.md`
(one section appended), `decisions/README.md` (generated — regenerate rather
than resolve) and `FINDINGS.md` (union-merged, so both appends survive).
`apps/loom/app/(docs)/_lib/api/reference.generated.json` is a fourth and is also
generated: regenerate it, never hand-resolve.

## The door this lane is keeping cheap

Nothing here touches it. Per-reader identity stays deferred, and nothing in 0291
makes it dearer to add later: every figure in both orders is built out of
counters that are already stored and already anonymous, and an identified batch
would arrive with the same stops, the same share movements and the same door to
scale them by.
