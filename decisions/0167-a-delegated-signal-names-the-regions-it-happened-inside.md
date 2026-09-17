# 0167 — A delegated signal names the regions it happened inside, and a region is counted in views rather than in presses

**Status:** Accepted
**Date:** 2026-09-17
**Section:** §6 — Reader signals

## Context

`Loom marketing` filed it on 17 September, after wiring the front door up to
broadcast for real and asking the resulting batch what it had said. A press on a
`loom.action` inside a band came back as:

```
signals: [{ kind: "activated", type: "loom.action", nodeId: "<the button>" }]
```

The band is not in it and could not be. `broadcastReaderSignals` files a signal
against the **nearest addressed element** to what a reader aimed at, and every
control in the starter library is an addressed node of its own — so the answer
is always the button or the link, never the section it sits in. Narrowing
`types.activated` to band types does not walk further up either: the nearest
addressed element fails the filter and the signal is dropped, so asking for
band-level activations produces *none* rather than band-level ones.

Two things `/what-readers-do` prints are band-level activation claims, and both
were computed over scripted visits that mint `activated` against band ids —
something no browser will ever send:

| what the page prints | what it read |
| --- | --- |
| *157 seconds on screen, 5 used something in it*, per band | `ReaderTally.activations` for the band |
| *Of the 10 readers who got as far as "…", 5 used something in it* | a `FunnelPair` whose second leg is an activation |

On real signals both figures are zero for every band, forever, and the page
would not notice: the arithmetic is right and the input is empty.

The fact is unrecoverable downstream. Which region a node sat in is a property
of the page **at the moment of the press**; a rollup reading the batch an hour
later has the node id and the revision, and the tree that would answer it may
have been changed by a proposal since. Only the browser that saw the press can
say.

Three other surfaces are about to copy the marketing lane's fourteen-line
broadcast recipe, which is why this was settled now rather than after they had.

## Decision

**A signal of a delegated kind carries the addressed nodes it happened inside.**

`DELEGATED_READER_SIGNAL_KINDS` is `activated` and `disclosed` — the two kinds
whose node is not the thing a reader aimed at. Each may carry `within`, the
addressed ancestors of the node it names, nearest first, up to and including the
root when the root is addressed. `viewed` and `dwelled` do not and will not: they
are observed on the addressed element itself, there is no gap between the node
and what happened, and they are the high-volume kinds — an ancestry on every
`dwelled` of every node of a 6,000-node page is the payload multiplied by the
page's depth to buy nothing.

The vocabulary stays four kinds. This is not a fifth kind and not a second
address on the signal; it is the context of one.

**Absent is not empty.** `within: []` is a claim — *this node has no addressed
ancestor* — and a sender that was told not to walk has made no claim. The field
is therefore optional and omitted rather than emptied, and every consumer reads
absence as *nobody looked*.

**A region is reported by a view count, not by a press count.** `ReaderTally`
gains `engaged`: distinct page views in which a reader used something strictly
inside this node, at any depth. The live fold gains the occurrence analogue,
`engagements`, because a fold is one page view and distinctness there means
nothing.

**A funnel end stays the node a signal names.** A pair asking for `activated` on
a band still answers zero, and that is correct — a band is not pressed. The
question *of the views that reached this band, how many used something in it* is
`reached` and `engaged` on one tally row, which needs no pair to have been
configured before the batches arrived.

## Consequences

- A deployment can report per-region engagement from real browser signals for
  the first time. `/what-readers-do` can stop minting activations against band
  ids, and the two claims it makes become one tally row each.
- `loom_reader_tallies` gains one column. It is additive and defaulted, and the
  migration carries an `ADD COLUMN IF NOT EXISTS` for a deployment whose table
  predates it, whose existing rows then read as *nobody was measured doing
  anything in here* — which is what was true of them.
- A batch carrying ancestry is larger by the page's addressed depth, on the two
  rare kinds only. A host that reports on controls alone sets `within: false` and
  pays nothing.
- `engaged` is lossy across rollup windows in exactly the way 0147 already
  describes for `views` and `reached`: distinctness cannot be added up, the error
  is bounded by how many views straddle a boundary, and it is always an
  over-count.
- A region that nothing else reports on now gets a tally row with `engaged` set
  and `views` zero. That is deliberate and it is two different facts: somebody
  used something in it, and nothing measured whether it was ever on screen.
- The signal still carries no content and nothing identifying a reader. An
  ancestry is node ids and primitive types, which the tree at that revision
  already holds, so 0146 is untouched.

## Alternatives considered

**`rollUp` is given the tree and attributes a control's signal to its nearest
band.** Rejected. The counters would then depend on a tree the collector happens
to be holding, and a batch filed under revision 4 read against revision 9 would
credit presses to bands that have moved — which is precisely the error that
makes *before versus after a change* unreadable, and the reason the revision is
on every batch at all (0136).

**Nothing changes, and the marketing page stops promising it.** Rejected, though
it was acceptable. *Which button did people press* is a good report; it is a
strictly smaller one, and it would have meant rewriting a funnel question to be
about controls in order to keep a defect.

**A `within` scope on `FunnelEnd`**, so a pair could ask for *activated inside
this node*. Rejected for now. It answers nothing the tally does not, and it puts
two more columns inside `loom_reader_funnels`' primary key — a key rebuild on a
table that is already keyed by six columns, bought for a question that has one
row waiting to answer it.

**Ancestry on all four kinds, for a uniform shape.** Rejected. `viewed` and
`dwelled` are emitted per node per window; the cost scales with the page and the
information is already there, because a band's own `viewed` is the band. A
uniform shape that is dead weight on the two hot kinds is not symmetry worth
buying.

**`activationsWithin` and `opensWithin` as occurrence counters on the tally.**
Rejected in favour of one view counter. Both the questions the finding named are
about readers — *five used something in it* — and an occurrence total is the
number that makes one enthusiastic reader look like five.
