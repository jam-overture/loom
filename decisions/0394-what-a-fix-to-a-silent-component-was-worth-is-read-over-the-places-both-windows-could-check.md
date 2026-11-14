# 0394. What a fix to a silent component was worth is read over the places both windows could check

**Status:** Accepted
**Date:** 2026-11-13
**Section:** §5 (reader signals), the readings

## Context

[0393](0393-a-silent-component-is-a-census-over-the-placements-the-defect-could-be-seen-on-and-the-share-is-bracketed.md)
gathered [0382](0382-a-part-that-reported-nothing-with-a-reader-below-it-is-an-eighth-collection-fault-and-it-reaches-both-ranking-keys.md)'s
defect by kind of part, so a deployment can say *`loom.accordion` is silent in
thirty-one of the thirty-four places it stands, across nineteen of your pages*.
That names the component to fix.

**The question it leaves is the one an author has the moment they have fixed
it**: did it work, and how much of the library did it recover? And its sharper
sibling, which nobody asks because nothing can see it: did this release *silence*
a component that was reporting last week? A census of the later window cannot
tell the two apart — it sees a component that is silent now, and says nothing
about whether it was silent before.

**Two censuses cannot be subtracted**, for the reason
[0266](0266-a-change-to-a-kind-of-part-is-read-over-the-places-both-windows-bore.md)
gives at the neighbouring unit: they are taken over **different sets of places**.
A page published between the windows adds placements, a page that expired takes
some away, and a share of places moves with both while no sender has changed. So
the places have to be paired before anything is read, which is what
`library-change.ts` does for a kind's reading and what nothing did for its
senders.

## Decision

**A twenty-fifth reading, `librarySendersChangeOf`,** derived from the
server-side join of 0212 — no payload field, no counter, no column, no table, no
byte on any wire and nothing in a reader's browser. A browser could not send this
if it wanted to: whether a part is silent is a statement about *what else was on
the page*, which only the tree and the registry know.

1. **The places are paired first**, by 0266's rule exactly and through its
   published helpers: windows keyed by page in its form (`pairedWindowOf`),
   placements paired by node (`partsByNodeIn`), a form held at two revisions in
   one window excluded and named, a reading handed in twice dropped and counted
   (0158). A place only one window bears is `gained` or `lost` and is in no
   figure.
2. **The population is the paired places something below reported reach at in
   *both* windows** — `checkable`. 0393 established the one-window version of
   this and its argument carries unchanged: a leaf can never be seen to be
   silent, and a place nobody has been under cannot be seen to be silent yet.
3. **Never the places checkable in the later window alone.** A place nobody was
   under before and is under now has no earlier state to have been silent in, so
   it would join the population at whatever it is today — and a window that
   merely got busier would publish a repair. This is the clause the reading
   exists to get right: it is the cheap denominator, it is invisible once
   shipped, and it turns *more readers* into *a fix worked*.
4. **`checkableWas` and `checkableNow` are published beside it.** How much of the
   library each window could speak for at all is a fact about readers, not about
   senders, and a surface must be able to see it move without reading it as a
   finding.
5. **An unclaimed side makes the transition unclaimable, not the share wider.**
   0393 brackets a witnessed placement whose standing is `unknown` between
   `share` and `atMost`. A comparison cannot: *indeterminate, then reporting* is
   not a repair that might be smaller than it looks, it is **no claim at all**
   about what moved, because the earlier side never said anything to move from.
   Such places are counted in `indeterminate`, kept out of `comparable`, and
   named by the silence `unclaimable` where there is nothing else left.
6. **The verdict is the sign of `repaired − wentSilent`**, a subtraction of two
   counts of places over one population with one denominator. No threshold, no
   share compared with a share, and no reader in it. `held` covers places trading
   places and publishes both counts; `still-silent` is kept apart from it because
   it is the one state here that is an instruction.
7. **Four silences, tried in order**: `unplaced` (nothing of this kind on either
   side), `unpaired` (no place in both), `uncheckable` (no paired place checkable
   in both), `unclaimable` (clause 5). *Come back with readers* and *the places
   moved* are opposite instructions and are never one word.
8. **The ranking is by the count of places gone silent**, then the higher silent
   share now, then by name — and `mostSilenced` is a type and never a role,
   because a type is the thing an author replaces. Silenced before repaired, by
   0221's rule at this unit: a component that has just stopped reporting is the
   thing to act on, and a repair is the thing to read.
9. **No deployment-wide share**, as the census has none (0257): a figure over
   every kind at once counts a page once per element node, so it measures how
   finely the pages were written as much as how they report themselves. The
   totals are counts.
10. **`viewsWas`, `viewsNow` and `republished` travel on the reading.** A
    quieter window checks fewer places with no sender behaving differently, and
    a fix reaches a page by republishing it — so a repair with `republished` at
    nought is a repair nothing in the library can explain.
11. **0382's rule has one spelling.** The five states a placement can be in
    (`leaf`, `unwitnessed`, `reporting`, `silent`, `indeterminate`) move to
    `subtrees.ts` as `senderStatesOf`, and the census takes them from there. A
    census and a comparison disagreeing about which placements were silent is a
    failure a surface could not notice.

## Consequences

- **A deployment can say what a fix was worth**, in the unit the fix was done in:
  *that release recovered `loom.accordion` in twenty-nine of the thirty-one
  places it was silent, across seventeen of your pages.* `repairedTrees` is the
  figure a page-by-page reading cannot give, one window on from 0393's
  `silentTrees`.
- **A release that silences a component is visible for the first time.** It was
  invisible to every reading in this subsystem: the census sees only that it is
  silent now, and the per-page fault fires on pages that were already faulted.
- **`mostRepaired` and `mostSilenced` are counts of places, so neither moves
  when a window's traffic does** — the denominator has no reader in it once the
  places are held still.
- **Nine names reach `@jam-overture/loom/signals`**, measured on the front-coded
  index: `librarySendersChangeOf`, `LibrarySendersChange`, `KindSenderChange`,
  `SenderMovement`, `SENDER_MOVEMENTS`, `describeSenderMovement`,
  `SenderFixSilence`, `SENDER_FIX_SILENCES`, `describeSenderFixSilence` and
  `SILENCED_EXAMPLES`.
- **The reading is still a floor on what is wrong**, because 0393's is: three
  populations are outside it on each side, and a surface that printed *this is
  everything the fix touched* would be printing something the reading did not
  say.
- **Nothing reaches a reader's browser.** `broadcast.ts` and its import graph are
  untouched.

## Alternatives considered

- **Divide by every paired place.** Rejected: 0393's argument unchanged. The
  figure falls as a library gains leaves and as either window loses readers — it
  moves when nothing about a sender has.
- **Divide by the places checkable now.** Rejected, and it is clause 3: it
  publishes a repair for a week that merely got busier. The reason it is written
  into the record rather than left to the code is that it is undetectable
  afterwards — there is no number on the row that would look wrong.
- **Bracket the share, as the census does.** Rejected, clause 5. A bracket says
  *the truth is between these two*; here the truth is that nothing was claimed,
  and a bracket would put a manufactured repair at one end of it.
- **Subtract two `LibrarySenders`.** Rejected: it is the subtraction this module
  exists to refuse, and it would have been one line in a portal.
- **A reader-weighted repair figure** — *of the readers who met your accordion,
  the share that was measured has gone from four in ten to seven*. Not refused,
  not built: it needs the door on both sides and is a weighted mean whose weights
  move when traffic does, which is 0256's own refusal at this unit. Filed.
- **Publish the repaired nodes as a list.** Rejected: the errand is the
  primitive, which is the whole of why 0393 exists. The newly **silent** nodes
  are capped examples because a surface naming a regression should be able to
  show one; nobody opens a page to look at something that is working.
- **One `SenderState` per side on the row, nine transitions.** Rejected: three
  states on each side is nine cells, seven of which a surface would have to add
  together to ask anything. The four transitions are the question; the rest is
  `indeterminate` with a silence that says so.
