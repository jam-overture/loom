# 0314 — A batch delivered twice is folded once, and the window is how wide that promise is

**Status:** Accepted
**Date:** 2026-10-25
**Section:** §4c (reader signals)

## Context

[0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
made counting a window and forgetting it one operation, and named why: a rollup
reports *what this window added*, so **a batch counted twice is counted twice
forever**. The defence it chose was to make the set of batches rolled up and the
set forgotten the same set, which closes the case of two *runs* over one window.

It does not close the case of two *batches*. Nothing in the subsystem has ever
asked whether two batches in one window are the same batch, and three things in
the design invite exactly that:

- `MAX_BATCHES_PER_DELIVERY` is 50, and its own documentation says why —
  *"anything above a handful is a retry queue draining after an outage, and that
  is worth allowing"*. A retry queue is a thing that re-sends what it already
  sent; nothing tells it which deliveries landed, because
  [`deliver.ts`](../src/signals/deliver.ts) reads no response and says so.
- The buffer's primary key is a surrogate `seq`, and
  [`journal.ts`](../src/signals/journal.ts) states as a property that there is
  *"no conflict — receiving a batch cannot collide with another batch"*. Two
  deliveries of one batch are two rows.
- An edge network that replays a `POST` is nobody's bug and nobody's code.

**What a repeat costs is asymmetric, which is why nothing has noticed.** Of the
nine counters a tally carries, `views`, `reached` and `engaged` are sets of view
keys, and so are `appearances` and both ends of every funnel: a repeat adds the
key the set already holds and **moves nothing**. The other five — `dwellMs`,
`activations`, `opens`, `closes`, `completions` — are occurrences, and they
**double**.

Every rate this subsystem publishes divides the second kind by the first. So a
repeat does not show up as a number out of range or a total that looks wrong. It
shows up as a reader who was twice as interested as they were, on the figure a
deployment makes decisions with, permanently, with the buffer that could prove
otherwise already dropped.

The door is partly covered already and by accident: `openingsOf` collects view
keys into a `Set`, so a repeated opening batch inside **one delivery** counts one
arrival and one region. Across two deliveries it does not, and that half is filed
rather than fixed — see *Consequences*.

## Decision

**A batch identical to one already folded in the same window is folded once, and
the repeats are reported as `Rollup.redelivered` and `CollectionSummary.redelivered`.**

**Derived, not collected.** Nothing is added to the wire, the browser, a column,
a store or the vocabulary. The identity is built at the fold from what a batch
already carries: its tree, revision, view key, `sentAt`, audience, whether it is
the opening delivery, and every field of every signal in it. A sequence number
per page view would make the test exact, and it would cost every reader bytes on
every delivery for ever to buy what the fold can already work out — the trade
0167 made when it refused ancestry on the high-volume kinds. It is filed with its
measured wire cost rather than built.

**`sentAt` is the field that does the work, and the contents are what make it
safe.** Within one page view the broadcaster flushes what the ledger holds and
clears it, so a second delivery of the same contents at the same stamp is
something no page produces: a real second flush carries a later stamp, different
contents, or both. Including the contents means the fold can only ever call two
batches the same one when they are, field for field, the same batch.

**It is a key and not a digest.** A 32-bit hash of the same tuple would collide
somewhere in a few million windows and **lose a real batch** when it did, which
is a worse failure than the one being prevented. A window of 5,000 batches holds
a few hundred kilobytes of keys, against the per-node view sets a 6,000-node page
already puts beside them; the lookup is one per batch, so the fold stays linear
in the signals it was handed.

**Only where the batch carries a view key.** Without one, two identical batches
are as likely to be two readers in the same millisecond as one batch arriving
twice — a batch with no view key has nothing in it that is unique to its sender.
Dropping a reader to avoid a repeat is the worse of the two mistakes, so an
uncorrelated batch is folded as it arrives and `uncorrelated` goes on saying how
many could not be judged.

**The promise is exactly as wide as the window, and is stated rather than
implied.** Two deliveries of one batch that land either side of a collection
boundary are two windows' input and are counted twice, bounded by *(retry delay ÷
window length)* — the same shape of bound 0147 states for the page views that
straddle one, shrinking with the same setting. 0158 is untouched: applying one
window's rollup twice still doubles it, because that is two runs and not two
batches, and nothing in a pure fold can see the other run.

**Reported rather than silent.** The number is a fact about a deployment's
senders and not about its readers, and a window with repeats in it every run is a
retry loop somebody should go and find. It lands on the run's outcome and on the
operator's line rather than in a stored row, because a fold's own numbers are not
durable — only the counters it produced are.

**One stated loss, pinned by a test rather than argued away.** With a clock that
does not advance at all, a page that records the same press on the same node
twice with a flush between them and its opening delivery already spent sends two
batches a fold cannot tell apart, and one press is lost. It needs two flushes and
a repeated identical event inside one millisecond, which no reader produces and a
script dispatching synthetic events can. `broadcast.test.ts` drives the real
broadcaster to both results — three distinguishable batches where the clock
moves, an indistinguishable pair where it is frozen — so the limit is a checked
fact and not a claim.

**A separator is spelled as an escape and never written into the file.**
`rollup.ts` keyed its tallies with template literals holding a literal `NUL`
byte. The value is right and the spelling made the busiest module in the
directory **binary to every content search there is**: `grep` and `ripgrep`
report `binary file matches` and print no lines. Four of them were in it, and the
search that found them was looking for something else. They are one `SEP`
constant now, `"\u0000"`, and `src/signals/source-text.test.ts` fails on a
control byte anywhere in this lane's source.

## Consequences

- **Five counters stop doubling on a repeat**, and the three that could not
  double are provably untouched: `rollup.test.ts` folds a window with and
  without the repeat and asserts `views`, `appearances`, the funnel answers and
  `reached` are equal. Refusing a repeat cannot move a figure a set of view keys
  was already protecting, which is what makes this safe to add to figures that
  are already published.
- **A deployment can see its own senders retrying.** `redelivered` on the run's
  summary and in `describeCollection`'s line, said only when it is non-zero.
- **The door's counters are still exposed across deliveries, and it is filed
  rather than fixed here.** A repeated opening batch in a *later* delivery adds
  a second arrival and a second region count, because `openingsOf` dedupes
  within the call it is given and the door keeps nothing between requests. It
  cannot be closed the same way: the remedy is for the door to remember the view
  keys it has seen, and 0146's own words make that the one value nothing is
  allowed to keep — which is why `first` exists at all. **It also touches the
  region floor**, which is the part worth a maintainer's eye: a bucket is kept
  once enough views are in it, and arrivals counted twice reach that floor on
  fewer readers than it was set for.
- **A page a script drives can lose one occurrence**, under the frozen-clock
  conditions above. Weighed against doubling every occurrence counter
  permanently on any retry, and recorded here so the trade is a decision rather
  than a surprise.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** `broadcast.ts` is byte-identical.
- **One module in another lane still carries the byte.**
  `src/runtime/repointing.ts` has one, and the check here is scoped to
  `src/signals/` because that file is `Loom daily build`'s. Filed with the
  remedy; widening the check is a one-line change once it is closed.

## Alternatives considered

- **A sequence number per page view on the batch** — `n: 0, 1, 2, …`, minted by
  the broadcaster. It makes the test exact and loses nothing, including under a
  frozen clock. It costs **7 bytes of wire per delivery** at two digits
  (`"n":12,`), on every batch of every page view of every customer's site, for
  ever, to buy what the fold already derives for nothing — plus a broadcaster
  change, which rule 4 says is measured before it is proposed. Filed for the
  maintainer with that number rather than taken.
- **A unique id per batch, minted by the sender.** The same cost an order of
  magnitude larger, and worse: a fresh opaque identifier on every delivery is a
  field whose shape invites being made stable later, which is the one direction
  0146 forecloses. Refused outright rather than filed.
- **Refusing the repeat at the door instead of at the fold.** It is the earlier
  and therefore better place, and it needs durable bookkeeping the door does not
  have: the buffer's key is a surrogate, and a unique constraint on the envelope
  would reject a batch the buffer *should* take whenever two senders collide on
  an uncorrelated envelope. The fold already holds the whole window in memory and
  already decides what one page view is, so it is where the judgement is free.
- **Deduplicating uncorrelated batches too.** Rejected: without a view key there
  is nothing in a batch unique to its sender, so two readers reaching the same
  band in the same millisecond are byte-identical, and the subsystem would quietly
  undercount readers in order to avoid over-counting occurrences. `uncorrelated`
  already exists to say how many batches could not be judged.
- **Hashing the identity to save memory.** Rejected above: a collision loses a
  real batch, and the memory is of the same order as what the fold already holds.
- **Leaving it and filing it.** The reason not to is that the damage is permanent
  and invisible: the buffer that could prove a repeat happened is dropped by the
  same operation that counted it, so a deployment that discovers this later has
  no way to tell which of its figures are wrong.
