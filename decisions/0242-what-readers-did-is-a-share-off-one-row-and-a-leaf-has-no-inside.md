# 0242 — What readers did is a share off one row, and a leaf has no inside

**Status:** Accepted
**Date:** 2026-10-08
**Section:** §4c (reader signals)

## Context

Every reading this subsystem has is about **attention**. `pageReadingOf` answers
which parts came into view
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)),
`readingProgressOf` where the reading stops
([0221](0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md)),
`readingPaceOf` whether readers had time to take a part in
([0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md)),
`copyReadingOf` how many of the page's words got reached
([0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md)).

A tally has carried `engaged`, `activations`, `opens`, `closes` and
`completions` since the counters existed, and **nothing interpreted any of
them.** 0212 summed four of them into a role row and said why the fifth could
not be summed, and that is the whole of it: a deployment could see that a band
was read and had no way to ask whether anybody *did* anything in it. The one
question of that shape that was answerable was a `FunnelPair`
([0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)),
which a deployment has to name a pair for, node by node — so the unnamed
question, *of the readers who got to this ask, how many opened it*, had no answer
for any part of any page.

[`docs/signals.md`](../docs/signals.md) §4 names what the portal view is for and
two of the five clauses are this: *which asks they open, which they complete*.

**Three things stood in the way of the obvious implementation, and all three are
about what a counter is a count of.**

**`engaged` is structurally zero on a part with no element children, and
dividing that nought by `reached` prints a finding about readers that is really a
filing rule.** A press is filed against the control, and `engaged` counts the
page views whose reader did something *strictly inside* a node
([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)).
A leaf has no inside. So a heading, a paragraph **and a button** alike report
`engaged: 0` for ever — the button because the press is its own `activations`,
the heading because there was never anything to press. A page-wide
`engaged ÷ reached` therefore reads *0% of readers acted here* against every
text node and every control on the page, and the one part of a page where the
figure means something is the band.

**An occurrence is not a reader.** `activations`, `opens`, `closes` and
`completions` count things that happened, so a reader who presses twice is two
of them and one person. `activations ÷ reached` looks exactly like a press rate,
can exceed 1, and is not a share of anything. 0212 already wrote this down one
level up, for a role row; the per-part reading meets it in a sharper form,
because a *control's* share of readers who pressed it is not available from any
counter the vocabulary has.

**There is no page-wide total of readers who acted, for 0147's and 0167's
reasons together.** Summing `within` across parts charges one reader once per
level of the tree they acted inside: ten readers pressing once each come to
twenty over a band and its root, and to more on a deeper page.

## Decision

`pageActionOf(reading)` in [`src/signals/action.ts`](../src/signals/action.ts),
off the `PageReading` of 0212 and nothing else. **Nothing is added to a payload,
a browser, a column, a store or the vocabulary.** It is the tenth thing taken
out of the server-side join rather than collected, and the second thing in this
subsystem that tells a model something to act on rather than telling a person
something true — *readers reach this band and touch nothing* is a sentence a
proposal can be written from.

**A share of readers is `engaged ÷ reached`, off one row, and it is withheld on
a leaf.** Both terms are distinct page view counts written by the same rollups
against the same node, so the straddle over-count of 0147 is common to the
numerator and the denominator and very nearly divides out — 0221's cancellation
at one part rather than between two siblings. Where the part bears no element
parts the share is **`undefined`**, not 0: the nought is 0167's filing rule and
not a measurement. The structural fact is published beside it as
`PartAction.bearsParts`, taken off the tree the reading was built from, so it is
a property of the page and not of the window.

**It is not divided by the page views counted at the door.** `opened` and
`engaged` are written in different places and their ratio can honestly exceed 1,
which is 0221's refusal of that denominator and it still stands here.

**The standing has three members: `acted`, `untouched`, `unknown`.** `untouched`
is the only claim this reading makes about an absence and it is said of nothing
but a part that bears element parts, that a row named, and that readers reached.
`unknown` covers a part with no row, a part whose `reached` is 0 while the window
held views (0221's unanchorable case) and **every leaf** — so a withheld share
and a standing of `unknown` are the same fact said twice and can never disagree.
Three members rather than two for 0212's reason: a two-valued reading has to
call a part nobody could have acted on a part nobody acted on.

**Occurrences are published as themselves and as an intensity, never as a rate.**
`uses` is the four occurrence counters added, `counts` keeps them apart, and
`usesPerReader` is `uses ÷ reached` — named for what it is, uncapped, and
withheld where nothing was used rather than printed as the nought that is every
heading's ordinary state. `shutAgain` is `closes ÷ opens`, two occurrence counts
off one row, which answers *readers open this ask and shut it again nine times in
ten*; it is **uncapped**, because above 1 it diagnoses a disclosure a revision
renders already open, and a clause nothing can falsify is not a safeguard
(0231).

**The root is the one page-wide headcount, and it is a row rather than an
addition.** Every action anywhere on the page is strictly inside the root, and
the root is an addressed node reached by every view that renders, so its
`within` is the distinct page views in which a reader did anything at all. It is
published as `whole` and kept out of the ranking, which is 0230's treatment of
the root for the same reason: the page contains every part it would outrank.
There is no sum of `within` anywhere in the module.

**`unwalked` names a sender that does not walk.** True where some part reports
an occurrence and no part reports a reader inside one. A batch whose delegated
signals carry no `within` — synthesised on a server, replayed from a fixture, or
with the walk turned off — adds occurrences and no `engaged` at all, and the
symptom is otherwise *a page readers act on and nothing can say where*: every
share a nought, every band `untouched`, and the counters looking healthy. It is
0229's `unopened` diagnosis one counter across.

**The ranking is by headcount.** `mostIgnored` is the `untouched` part the most
readers reached, then the first in reading order, which is 0221's rule: a band
two readers out of three ignored is a worse ratio and a smaller problem than one
four hundred of them did.

## Consequences

- **An action share is a band's measurement and not a control's.** This is the
  honest statement of what the vocabulary can support, and it is also a limit:
  *what share of the readers who saw this button pressed it* is unanswerable from
  any counter Loom keeps, and the nearest available question is the band the
  button is inside. A deployment that wants the narrower figure names a
  `FunnelPair` (0231), which is exactly what pairs are for.
- **A leaf readers reached with nothing against it is a button nobody pressed or
  a heading nobody could press, and nothing in the tree says which.** `role`
  declares one member and it is not *a control*
  ([0238](0238-a-funnel-end-the-revision-no-longer-has-is-a-standing-and-what-is-withheld-is-per-figure.md)),
  so the finding of 6 October — *nothing lets a primitive say what it can
  report* — shows up in a second place and with a second consumer. It is why a
  leaf is `unknown` here rather than `untouched`, and the day a primitive can
  declare that it is a control, every counter already stored reinterprets, which
  is 0212's read-time join paying out again.
- **`leaves` is published, so a reading accounts for every part.** On an
  ordinary page most parts are leaves and most shares are therefore withheld,
  and a caller that did not know why would read the gap as a defect. 0214's rule
  that what is withheld is still reported as a total.
- **Nothing here is comparable across two revisions as a count, and the shares
  are.** The before-and-after reading of this is the obvious next question and is
  not built: it is 0224's shape over a different figure, and it would be the
  third comparison in this subsystem rather than a paragraph inside this one.
- **No new silence vocabulary.** The three standings carry every reason a figure
  is missing, so this adds nothing to the five sets the open work on silences is
  about — a withheld figure here is answered by the standing beside it, which is
  the shape 0212 chose and the reason it needed no silences of its own either.

## Alternatives considered

**A share of readers per part, leaves included, with 0 where nothing happened.**
Rejected: it is the figure this record exists to refuse. Every heading and every
control on every page would read *no reader acted here*, which is 0167's filing
rule printed as a measurement, and a screen built on it would rank the parts of
a page by how little they are a container.

**`activations ÷ reached` as a press rate.** Rejected. It is an occurrence over a
distinct view count, so it may exceed 1 and a reader who pressed twice is in it
twice. Published as `usesPerReader` with the word *rate* deliberately absent,
because the mistake is not the arithmetic but the sentence somebody would write
under it.

**A page total of readers who acted, summed across parts.** Rejected for 0147's
and 0167's reasons at once: it charges one reader once per level they acted
inside. The root's own row answers the same question exactly, off one row, so
there was no need to approximate it badly.

**`leftOpen` as `opens − closes`.** Considered and dropped. It is negative on a
disclosure a revision renders already open — the reader shuts something this page
never opened — and clamping it at zero would hide the one state the figure can
diagnose. `shutAgain` above 1 says the same thing without a floor to argue about.

**Deriving *could this part be acted on* from the subtree's counters.**
Rejected as circular: a button nobody has ever pressed reports nothing, so a
reading that inferred actionability from action would call it unactionable and
then never ask about it again. The declaration is the only thing that can answer
it and it is another lane's (0238's finding).

**A fourth standing for *the part cannot be acted on*.** Rejected for 0238's
reason, in the same shape: it is the case nothing in the tree can speak to
today, so a member for it would be a member nothing could ever set.
