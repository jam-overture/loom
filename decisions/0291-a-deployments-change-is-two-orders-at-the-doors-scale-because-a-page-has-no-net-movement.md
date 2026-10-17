# 0291 — A deployment's change is two orders at the door's scale, because a page has no net movement

**Status:** Accepted

**Date:** 16 October 2026

**Section:** §4c (reader signals)

> **Renumbered on 2026-10-17**, from 0289, when `Loom merge` landed this branch.
> `main` had meanwhile accepted a different 0289 — *a project is closed rather
> than deleted*, #658 — and two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).
> 0290 was already claimed by #661, so this took the next number free on `main`
> and on the open branches. Nothing in this record changed but its number;
> the references to it on this branch were updated with it.

## Context

A deployment ships a change and then has forty pages and one question: *where
did it land?*

Every comparison this subsystem publishes answers that about **one page**. A
before-and-after reading of where reading stops
([0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)),
of how much of a page gets read
([0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)),
of whether its readers had room
([0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)),
of what readers did inside its parts
([0251](0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)),
of who its readers were
([0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md))
and of its funnels
([0288](0288-a-change-to-a-funnel-is-two-shares-that-factor-and-a-difference-of-two-floors-is-a-bracket.md)):
one page each, every one of them. Four comparisons read a deployment's
**library** across its pages, and a library is a census by kind rather than an
order over pages.

So a deployment has had an order over its pages since
[0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md),
and it is an order over **one window**. *Which page is worst* could be asked.
*Which page got worse* could not — and that is the question a change creates,
which is the question this product exists to answer.

The arithmetic looks like sorting the comparisons a deployment already holds,
and there are two reasons it is not.

### The ranking key a comparison publishes is not comparable across two pages

A comparison compares **shares** and never counts, for the reason 0224 gives:
two windows of two trees have two sets of readers and nothing divides out. Its
share movement is sound, and so is the figure it ranks one page's own stops by —
`improvement × now.reached`, the movement at the volume the page has now.

That figure has a straddle in it. A distinct view count is generous by every
page view that spanned two rollup windows
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)),
and the rate is each page's own: a page readers linger on for twenty minutes
against a rollup window of five has its counts inflated roughly fourfold, and a
page read in ninety seconds does not. 0250 found this of a single window's
losses. It is worse here, because it is **invisible in the arithmetic**: the
share movement each side of the division is honest, both straddles having
divided out, and then the honest movement is multiplied by a count that carries
one. The straddle walks back in at the last step of a figure that looks like it
has been corrected.

The measured correction already exists per page and is published beside the
counter it is about — `drift ÷ opened` off that revision's own door row, with the
row-matching rule written once
([0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).

### A page has no net movement, and a single order would imply one

An order wants one number per page. A page does not have one. **There is no
page-level total of readers a change moved**, and the absence is 0224's:
a reader who got past the second band and then the third is in both stops'
figures, so adding them counts one reader twice — the trap written down for
views (0147) and for presses
([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)).

And the shape of a real change makes this the normal case rather than an edge:
the band an author rewrote reads better and the band it pushed below the fold
reads worse. One signed figure per page would net those against each other and
report a page where nothing happened.

## Decision

**`deploymentChangeOf(changes, rows)` in `src/signals/deployment-change.ts`
orders a deployment's pages twice over: by the readers each page's sharpest
worsened stop costs, and by the readers its sharpest improved stop keeps.** It
takes the `ReadingChange` of each page and the **later** window of page-view
rows, and picks each page's own row out of them with the published rule rather
than another hand-written copy of it.

**Both keys are the movement put on the scale the door counts in:**
`readers ÷ (1 + inflation)`, the inflation being that revision's own straddle
rate in the later window. The figure is a magnitude and not a count of people,
and it is deliberately not rounded into one. The share it was taken from travels
beside it, unscaled, because a share is sound on its own.

**Only the later window's rows are asked for.** The figure being scaled is the
later window's own — a share movement at the volume the page has now — so the
earlier window's row would be scaling a number it is not the denominator of.
A caller holding both windows hands over the later one.

**A page stands in both orders when it earned both places, and is counted once
in the standings.** The two orders are the artefact; nothing is summed, netted
or subtracted across them, and a page the change both helped and hurt is one
page.

**The gate into either order is the comparison's own.** A stop enters only if its
movement is worth at least one reader on the coarser side, which is what keeps a
page three people have read off the top of a deployment's screen the morning
after a change. A page with no stop past that gate is `unmoved`, which is an
answer and not a silence — the cheerful one and the thin-window one both, with
each window's view floor on the row to tell them apart.

**A page the door cannot scale is reported out of the orders rather than in
them**, with a standing saying why, which is 0250's refusal unchanged: there is
no safe direction to guess in, a long-dwell page being over-ranked and a quick
one under-ranked. The five reasons are published as a closed set, mapped into the
silence table as its seventeenth vocabulary with no new condition: `unread` and
`mispaired` carry a comparison's own two silences through, and `unscaled`,
`unopened` and `inconsistent` are the door's states and the alarm 0250 already
names.

**A page handed in with two different comparisons is in no order and no
standing, and is named.** A tree live at two revisions is two live versions of
one page and both belong in an order over one window (0250); a comparison pairs
by page, so such a tree has two movements and none that is the page's. Picking
either would publish a number nobody could account for, which is the refusal
[0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)
makes of the same state at another unit. A repeated comparison of the *same* two
revisions is a caller's two reads: the first stands and the rest are counted, and
one page twice in an order is the only lie an order has available to it
([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).

**Nothing was added to a payload, a browser, a column, a store or the vocabulary
of kinds.** This is the twenty-fifth reading taken out of the server-side join
rather than collected, and the broadcaster was not touched.

## Consequences

- **A deployment can ask what a change did to it, not just what one page looks
  like now.** Two orders off comparisons it already holds.
- **The two screens agree.** An order over one window ranks by readers lost at
  the door's scale and this ranks by readers moved at the door's scale, so
  *where is the problem* and *what got worse* are the same kind of figure and can
  sit on one page.
- **A portal cannot draw a net movement per page**, because none is published.
  That is deliberate and it is the second decision above.
- **A deployment that shortened its rollup window between the two readings is
  not misled by this order**, because each page's key is scaled by the later
  window's own rate. It can still be misled about *how big* a movement is, for
  the reason 0288 gives of the funnel's rate, and no figure here is a difference
  of two floors: both sides of every share movement are inside one window.
- **A thin later window produces an order with few pages in it rather than a
  noisy one.** The one-reader gate is the comparison's and this inherits it.

## Alternatives considered

**One signed order, most harm at the top and most help at the bottom.** Rejected
above: it implies a net per page, and a page has none. It is also the shape that
would have been easiest to draw, which is why it is written down rather than
left out.

**Rank on the comparison's own `readersKept` and leave the scale to the
caller.** Rejected. It is the mistake 0250 exists to prevent, it reads as
plausible — the pages that rise to the top of it are the pages readers spend
longest on — and a caller doing it by hand would be writing the row-matching
rule a fourth time.

**Take both windows' rows and scale each side by its own door.** Rejected as an
invented correction. There is one figure being ranked and it belongs to the
later window; scaling it by an average of two windows' straddles, or by the
earlier one, puts three decimal places on a number that is not a measurement of
anything.

**Sum the harm across a page's stops to get one number per page.** Rejected for
0224's reason, which is arithmetic rather than taste: one reader is in every stop
they walked past.

**Rank by the share movement and leave the readers out.** Rejected. It is the
order 0250 explicitly refused at one window, and for the same reason: a stop two
readers out of three left is a worse rate and a smaller problem than one four
hundred out of a thousand left. The share is published beside the key for a
surface that wants to show both.

**Drop a mispaired comparison, or a page with two of them, instead of naming
it.** Rejected. An order that silently sheds a page answers *your deployment has
thirty-nine pages*, which is the one error a count that has been dropped cannot
be recovered from by looking at the screen.

**A sixth standing for a page whose later revision is new enough that its
counters are still filling.** Not refused, and unreachable from here: nothing in
a reading says when a revision was published, and the states that would stand in
for it — a quiet window, a pending fold — are already published by the readings
this is made of
([0274](0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md)).
