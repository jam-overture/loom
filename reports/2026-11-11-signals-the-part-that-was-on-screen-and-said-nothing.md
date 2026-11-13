# §85: the part that was on a reader's screen and said nothing

**Lane:** `Loom signals` · **Date:** 11 November 2026 (evening) ·
**Branch:** `signals-85-the-part-that-was-on-screen-and-said-nothing` ·
**Records:** [0382](../decisions/0382-a-part-that-reported-nothing-with-a-reader-below-it-is-an-eighth-collection-fault-and-it-reaches-both-ranking-keys.md)
(Accepted) ·
**Plan:** [`docs/signals.md`](../docs/signals.md) §85

## Why this, and why now

No maintainer comment was outstanding on any open pull request. Two of this
lane's are open and neither is waiting on this run: **#851** (§82) is held on the
documentation names cap, which is `Loom docs`' and now has a remedy open as
**#859**; **#856** (§84, this morning) is waiting for review. `Loom daily build`
has nothing open that touches the signal path — its 0380 merged this afternoon as
#857 and is in `src/tree/`, `src/runtime/`, `src/interpretation/` and
`src/render/`. Nothing raced.

The work was picked off the open findings this lane owns rather than off the
plan, which is the order the brief sets. The 9 November entry on the fix-list's
ordering asked a future run to hold three things. Two of them were met by §81's
fourth order — it ranks on `unseen` and never on the count of frontier parts, and
it carries `orphaned` through and checks it. **The third was still open:**

> `notReporting` is a different list and wants a different sentence. A part that
> said nothing with a reader demonstrably below it is a primitive to fix in the
> library, not a page to rewrite — the fault vocabulary has no member for it and
> the fix-list would be the place to say so.

The second reason to pick it is the names cap. `main` has **148 bytes** of
headroom under the 40,000-byte published-names budget, which is about seven
names, and it has already cost this lane a unit (#851). This unit publishes
**none**: the generator's own words after regeneration were *"no name is new"*,
and the figure on this branch is `main`'s exactly.

## What shipped

**An eighth member of `CollectionFault`: `parts-unreporting`**, raised in
`healthOf` off `pageFrontierOf(reading).notReporting.length` — exactly as
`actions-uncredited` is raised off `pageActionOf(reading).unwalked` (0242), so
the sentence is owned by one file. Remedy `senders`, published beside
`actions-uncredited` as the two faults the join to the tree reveals and the same
hand answers for.

**`PageHealth.unreporting`**, the count of parts that said nothing with a reader
below them, beside `orphaned` and `doubled`. A count of parts of a tree and never
of readers, so nothing ranks on it.

**`spoilsTheLoss` and `spoilsTheConversion` are both `true`**, which is the half
of this that is a decision rather than a definition. A ranked page with a silent
part therefore leaves both orders of readers and arrives in the fix-list as
`contested` collection work, carrying the rank it was taken out of.

Nothing was added to a payload, a table, a column or a browser, and nothing new
is published on `@jam-overture/loom/signals`.

## The decision I took that was not specified, and why

**That the fault reaches both ranking keys.** The finding asked for a sentence in
the fix-list; it did not say whether the page should leave the orders. Both
answers were defensible and the easy one was `false` on both, which would have
cost no fixture.

A fall is between two siblings on `reached`. A part that never reports has a
`reached` of nought **while readers were demonstrably below it**, so the fall into
it is total — and a total fall is the sharpest fall a page can have. The order of
falls ranks on the deployment's sharpest fall, so one silent part is enough to put
a page readers were perfectly happy with at the head of the fix-list. That is
`rows-mishandled`'s failure mode (0212) arrived at from the other direction.
Saying `false` would have been saying the ranking key survives a counter that is
wrong, which is not true.

The conversion half is argued separately in the record rather than transferred,
because a fault vocabulary written by analogy comes out right in one of its two
places and wrong in the other (0336). It is weaker there and is `true` on the
wider claim rather than on the mechanism: a funnel's ends are usually controls
with nothing inside them, and a control with nothing inside it is never a part
this fault can name.

**That neither `parts-unreporting` nor `rows-mishandled` suppresses the other.** A
tree and a window that do not belong together can manufacture this fault as
readily as they manufacture a fall. Both are published, in the vocabulary's own
order — which is what a fault costs and whose hand it falls to (0271), not which
caused which — so the silence is read *before* the mishandled row that may have
produced it. That is a wart and it is written down as one. Suppressing either
would mean this reading guessing, and hiding a real sender defect behind a
caller's mistake is the worse error.

## The finding inside the unit

`parts-unreporting` was written, the suite was run, and **57 of the 125 tests in
three files went red at once.** Five of them are the vocabulary tests that a new
member of a closed set legitimately moves. **The other 52 are fixtures**, and none
of them is about the new fault.

One line, repeated in four fixtures across `agenda.test.ts`, `health.test.ts` and
`window-agenda.test.ts`: each builds a page as a stack of bands, gives every band
readers reached a counter row, and gives **the stack itself none**. A stack with
reported bands inside it and no row of its own is the exact shape of the defect.
**Every page every one of those files has ever tested against had a sender defect
on it**, and nothing in the repository could see it.

The fixtures report the page now, which is what a sender does, and all 52 went
green with **one published figure changed and no assertion weakened**. The one
figure is in `window-agenda.test.ts`, whose `PAGE` gained a part inside its first
band so that one stop can still cost more of the page than another once the root
reports; its two `costs` assertions are the same two numbers, 2 and 1.

Filed as an open finding for the half this run did not do: nothing says how many
*other* fixtures in this repository are shaped the same way, this lane fixed the
three it broke, and sweeping the rest crosses into `Loom daily build`'s files.
The cheapest honest version is a test rather than a sweep — a helper in
`src/testing/` that refuses a page reading whose root has no row.

## Tests

Seven new tests and five rewritten, no new file.

**Five on the fault** (`health.test.ts`): the defect itself, with the count and
the remedy; **a silent leaf says nothing**, because a part with nothing reported
inside it is indistinguishable from a part nobody reached and this reading must
not guess; a page no window holds a view of raises nothing, since every part is
`unknown` rather than skipped and that is the state the fault would be loudest
and most wrong in; the co-occurrence with `rows-mishandled`, asserted in the
published order; and **the double-count case** — one page handed in twice is one
row, one `unreporting` figure and `duplicated` 1 (0158).

**One on the fix-list** (`agenda.test.ts`): a ranked page with a silent part is
out of the `page` order, is `collection` work, is `contested`, and carries the
rank it was taken from.

**Five on the vocabulary** (`health.test.ts`), updated rather than added: eight
members, both `spoils` tables stated member by member, three faults to the
senders' hand, and a new adjacency test holding `parts-unreporting` next to
`actions-uncredited` with the reason `openings-unmarked` is *not* beside them.

## Numbers

`pnpm verify` **EXIT=0** on the committed tree — the figure is read out of
`verify.exit` in its own command, per `docs/routines.md`.

| | |
| --- | --- |
| framework package | **283 files / 6,857 tests**, all passing |
| application | **476 files / 7,712 tests**, all passing |
| over `main`, same scope | **+7 tests, no new file** — the three files this run touched hold 132 tests against `main`'s 125 |
| broadcaster bundle | **7,543 bytes minified, 3,350 gzipped** — `main`'s figure exactly |
| published names index | **2,093 entries, 39,852 of 40,000 bytes, 148 of headroom** — `main`'s figure exactly, byte for byte |
| new names on `@jam-overture/loom/signals` | **none** — the generator's own line was *"no name is new"* |

**Nothing failed and nothing was skipped.** Five tests were rewritten rather
than added — the vocabulary tables, which state the answer for every member and
so must move when there is a new one — and no assertion in any of them was
loosened.

**Nothing reaches a reader's browser.** `broadcast.ts` and its import graph are
untouched; the only runtime file changed is `src/signals/health.ts`, which is a
server-side read.

**The one cost that is not nought:** `healthOf` now runs `pageFrontierOf` once per
page, which is a second linear pass over the page's parts beside the one
`pageActionOf` already does. Linear, which is the bound rule 4 holds every reading
here to.

## Open questions

**Nothing blocking.** Three, all of which can wait.

1. **The library half of the finding is still open, and it is the better
   screen.** This fault is per page: a deployment with forty pages built out of
   one silent `loom.accordion` gets forty faulted pages and has to open each to
   notice they are all the same component. *Which of your components are silent*
   — silent placements gathered by `KindKey`, as `libraryReadingOf` gathers
   everything else — is a unit of its own and this lane's. **I would not start it
   until the names cap is answered**, because it publishes three or four names
   onto an index with 148 bytes left.
2. **This fault is the one most likely to be common on first adoption**, which is
   information rather than noise, and it is the reason the member says plainly
   what it can and cannot see. A deployment whose containers do not report has a
   fix-list built on `reached` counts it should not act on, and being told so is
   the point. But it is also the first fault here that could plausibly fire on
   most pages of a healthy-looking deployment, and if that turns out to be the
   case the answer is a conformance check at build time rather than a quieter
   verdict at read time.
3. **The names cap, which is not mine to close and is what holds #851.** `main`
   has 148 bytes, about seven names, and the next pull request from any lane that
   publishes a handful takes the merge gate red for four surfaces that published
   nothing. #859 is open against exactly this and front-codes the file from
   39,852 to 27,046 bytes, which is the remedy the test's own docblock
   prescribes. I picked this unit partly because it spends none of the margin,
   and that is a workaround one lane can apply twice rather than an answer.

## Nothing self-scheduled

No check-in, no poll, no wake armed, and nothing subscribed beyond the pull
request this run opens.
