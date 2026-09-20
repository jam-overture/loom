# 0175 — A listing skips the row it cannot read and fails the one it cannot place, and a store that did not answer is a different word from a row that did not parse

**Status:** Accepted
**Date:** 2026-09-20
**Section:** §5 — the hold store, reaching §2 and the portal's front door

## Context

Two findings from `Loom portal`, filed on 18 September, one directly above the
other. They look like a naming question and a policy question. They are one
fault seen from two sides, and neither can be closed without the other.

**The first.** `HoldError` had one code for every reason a read fails:
`unavailable`, carrying a free-text `detail`. Two failures arrive through it
that want **opposite next moves** from the person reading the screen —

| what happened | what the reader should do |
| --- | --- |
| the database did not answer | wait, and try again in a moment |
| a stored hold did not parse | go and look; waiting will not fix it |

The portal could not tell them apart, so `/portal` said neither. Its sentence
for a page whose queue would not read was written to cover both, and the note
above it said so: *"the honest sentence is the one that does not guess."* That
is a screen doing the right thing with a type that will not let it do better.

**The second.** `postgresHoldStore.parseAll` failed the whole listing on the
first row that did not parse, and its comment gave the reason:

> *"One unreadable row fails the whole listing rather than being skipped. A
> queue that quietly omits a change nobody can parse is a queue that says
> nothing is waiting when something is — and the reviewer has no way to find
> out otherwise."*

That argument was right about the queue it was written for, which could not
report what it had dropped. The consequence it buys is now visible: **one hold
written by a runtime this deployment is older than takes that page's entire
queue off the front door**, and every other change waiting on that page goes
unmentioned with it. A new `DispositionReasonCode`, a new field on a judgment, a
schema widened in either direction — any of those makes a deployment mid-rollout
stop listing some of its own pages. `Loom portal` filed it rather than arguing
it, because the sweep that makes skipping *readable* is one lane's screen and
the store answers callers that are not a screen.

**The premise that changed.** 0138 already decided this exact question one level
up, for a different list: `markHoldsFromStore` returns `{ marked, unreadable }`
and never fails, because *"a queue over every page of a deployment spans many
trees, and one tree being unavailable is not a reason for a reviewer to see
nothing."* The hold store is the same list one layer down, and it was answering
the opposite way.

## Decision

**1. `HoldError` gains `unreadable`, distinct from `unavailable`.**
`unavailable` means the store did not answer and the same call may well succeed
in a minute. `unreadable` means the store answered and something it returned is
not a hold this build can read — a fact, not a blip. `parseHeldProposal` returns
`unreadable`; every `catch` in `postgresHoldStore` still returns `unavailable`.
A caller keyed over `HoldError["code"]` fails to compile until it says which it
means, which is how the portal's `unreadableQueue` found out.

**2. Both listings return `HoldListing`, not an array.** `{ held, unreadable }`,
where an `UnreadableHold` is a `HoldPosition` and a reason — the row's primary
key, the instant beside it, and which field disagreed. It sorts in
`compareHolds` order alongside the holds that parsed, for 0138's reason: a
caller that must render every row wants them in one answer, in one order.
`HoldPage` is that shape plus its cursor. `memoryHoldStore` answers
`unreadable: []` always, because it holds parsed values rather than rows.

**3. A row the listing can *place* is skipped and named. A row it cannot place
fails the listing.** The split is the two columns the index orders by. A row
whose `(heldAt, proposalId)` parses can always be named and always be paged
past, so skipping it costs one change and saves the rest of the queue. A row
whose position does not parse cannot be stepped over: the cursor past it would
not be a position, the next request would fail to read it and start again at the
beginning, and the caller would page forever. There is no honest way to skip it,
so the listing says so once.

**4. A page resumes from the last row of its window, not the last hold that
parsed.** This is the part that makes 3 safe, and getting it wrong would have
been worse than the behaviour being replaced: a page whose final rows were
unreadable would resume in front of them and report them again forever, and a
page whose rows were *all* unreadable would have no last hold at all — cursor
`null`, and every hold after them silently off the queue. That is the original
fault moved one page along. `pageEnd` takes the position from the window's last
row, readable or not.

## Consequences

- **A queue mid-rollout stays answerable.** The changes a deployment can read
  are listed and can be answered; the one it cannot is named where it sat.
- **`unreadable` will appear on a healthy deployment mid-rollout**, which is the
  intended reading, and is why it is a listed row rather than an error.
- **Every caller of `forTree` changed shape**, from an array to `.held`. Eight
  call sites across the portal, the docs, the demo and one docs code fence —
  each a compile error, each mechanical. That is the seam working: a caller that
  silently kept reading an array would be a caller that never learned a row had
  been skipped.
- **A surface can now be wrong in a new way**: reading `held` and ignoring
  `unreadable` renders a queue that is quietly short. The type makes it visible,
  not impossible. Filed for `Loom portal`, which already counts what it could
  not read and now has something to say about it.
- **`describeHoldError`'s test is keyed over the union** rather than listing
  three members, because the list it replaced could not tell covering the union
  from containing three distinct things — and a fourth code was added without it
  noticing.

## Alternatives considered

**Keep failing the whole listing, and let the portal explain it.** Rejected: it
is what the tree is doing, and the sentence available to the portal is *"one
page couldn't be checked"* over a page with four answerable changes on it. The
store is the only party that knows the other three were fine.

**Skip every unreadable row, including ones that cannot be placed.** The
simpler rule, and it pages forever. Considered and rejected on the specific
mechanism in decision 3; the test *fails a listing holding a row it cannot place
at all* is what holds it.

**A `detail` string that says which of the two happened, leaving one code.**
Rejected as the thing the finding was about: a free string is a sentence for a
log and not a value a screen can switch on, and the portal's map is keyed over
codes precisely so that a new one fails the build rather than reaching a reader
as a silence.

**Report the skipped rows out of band** — a counter, or a callback the host
wires. Rejected for 0138's reason, stated there about `staleHolds`: a caller
that must render every row should not have to re-join two lists by id and be
given a second chance to get the join wrong.

**Widen `HoldError` with a structured `unavailable`** — `{ code: "unavailable",
kind: "transport" | "parse" }`. Rejected: it puts the distinction one level
deeper than every caller already switches, and a `Record` over `code` — the
shape the portal had already built — would go on reading as total while
covering half of it.
