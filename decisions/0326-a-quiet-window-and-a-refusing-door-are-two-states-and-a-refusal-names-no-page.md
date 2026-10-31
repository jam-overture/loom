# 0326 — A quiet window and a refusing door are two states, and a refusal names no page

**Status:** Accepted

**Date:** 31 October 2026

**Section:** §4c (reader signals)

## Context

Every reading in this subsystem is a reading of rows that arrived.

That sentence is so obviously true that nothing had ever been written down about
what it costs. Forty-one readings, nine comparisons, a window rung, a deployment
context, a census over the silences — all of them computed from four counter
tables, and a counter that was never written is indistinguishable from a counter
written with a nought. A part nobody reached, a window with no page views, a
funnel nobody entered and a page the door cannot scale are all states this
subsystem names carefully; **a page that posted and was refused at the door is
not one of them.** It reads as every one of the others at once.

And it is not a rare case. It is the commonest failure a new deployment has: a
snippet copied onto `https://loomjs.org` by a project whose settings name
`www.loomjs.org`, a snippet left on a site after its project was closed, a
snippet from an older release the door cannot parse. In all three the browser
does its job, the page posts on every view, the door turns every delivery away
before it reads which tree it was about, and **the operator opens a screen that
says nobody read anything.** The remedy is one line in a settings field and the
evidence points the other way.

**The evidence that it is wrong has existed since
[0311](0311-a-refusal-whose-key-was-right-is-counted-against-its-project-and-one-without-one-is-not.md).**
The door counts what it refused, one row per application and reason, with the
count, the newest instant and the newest origin — and 0311's own context names
this exact question as the reason it was built:

> the one question a person setting up their site most needs answered — *is my
> page posting and being turned away, or not posting at all?*

**Nothing joined the two.** The portal's *Signals* screen prints the refusal
lines in one box (`turnedAwayOf`) and the pages in another, and a person reading
both can draw the conclusion themselves. No reading drew it, so there is no
verdict, no standing, no fault and no sentence anywhere in `src/signals/` that
can tell the two silences apart — which means no host other than this one gets
the answer at all, and no surface can be held to giving it.

### Why it is not an eighth collection fault

The shape that first suggests itself is a member of `CollectionFault`, beside
the seven `collectionHealthOf` already publishes. It does not fit, and the
reason is the one 0240 settled: **every one of those seven is about one revision
of one page**, because every one is derived from that revision's own rows. A
refusal is about no page at all. A delivery turned away for naming the wrong
site was turned away *before* anything read its body, and reading the body to
find out which tree it named would spend the deployment's database on exactly
the sender the gate exists to stop (0311). The subject differs, so the reading
differs.

### The two numbers it is a join of, and the one that is wrong

The obvious pair is *refusals against arrivals*, where `arrivals` is
`CollectionHealth.arrivals` — page views counted at the door, added. That pair
has a false positive that would have made the reading worse than nothing: a
deployment whose senders never mark an opening has counters, funnels and region
rows and **no door rows at all**, which is the `door-unscaled` fault, and its
`arrivals` is nought while its collection is plainly working. Judged on
arrivals, that deployment reads as *turned away* and an operator is sent after a
gate that is letting everything through.

So the honest left-hand number is *was anything collected about anything* —
`CollectionHealth.pages.length`, a revision standing there if the window held
one counter, one funnel answer, one door row or one region bucket for it.
`arrivals` travels beside it as the headcount.

## Decision

**`arrivalStandingOf`** in [`src/signals/arriving.ts`](../src/signals/arriving.ts),
a reading beside collection health rather than inside it, over the `Pick` of a
health reading and the deployment's own refusal tallies.

### A closed set of five, two dimensions crossed and one refusal

| | nothing turned away | deliveries turned away |
| --- | --- | --- |
| **nothing collected** | `silent` | `turned-away` |
| **something collected** | `collecting` | `mixed` |

and `unasked` where nothing offered a count, which wins over all four.

- **`silent`** — no page is posting to this deployment at all. The strongest of
  the quiet answers, because the door is the one place a delivery cannot arrive
  without being seen, and it saw none.
- **`turned-away`** — **the state this reading exists for.** A page is posting
  and this door is refusing it, while every other reading reports that nobody
  read anything.
- **`mixed`** — both are true and neither is the picture: a second sender with a
  stale key, one page of several carrying the wrong snippet, or a
  misconfiguration since fixed.
- **`unasked`** — the refusal rather than the gap, on 0240's rule that an absent
  store is not an empty map. A window with nothing in it and no counter beside
  it is *two* states, and calling it `silent` publishes the more comforting one.

**`refused` is `number | null`** on the same rule: `null` is *nobody counted*
and `0` is *the counter was read and holds none*.

### The reasons stay the deployment's, through a type parameter

Why a host turned a sender away is the host's business — which is why the
counter is the deployment's table and not the runtime's — so the reading is
**generic in the reason and never names one.** A host hands in its own closed
set and gets it back on `newest`, where its own sentence and its own remedy are
chosen from it by its own exhaustive switch. `describeArrivalStanding` prints
the reason as the deployment spelled it and translates nothing: a framework that
worded `wrong-site` would be wording a vocabulary it does not define.

This is what keeps the unit from being a boundary change. Nothing moves out of
`apps/loom/app/_lib/reader-signals/refusals.ts`, no type crosses from the app
into `src/`, and the three reasons this deployment happens to count stay three
facts about this deployment.

### A delivery was turned away if any reason reports a positive count

One rule, and the standing and `newest` are both found by it — so a standing
that names a refusal always carries the refusal it named, and that identity is a
test rather than a sentence. A reason reporting a nought is a row saying nothing
was turned away for it, so it cannot be the newest thing that was. Ties keep the
earlier row, so two reasons counted at one instant do not reorder on a refresh.

### The instant is optional and no verdict turns on age

A cumulative counter cannot say whether its own figure is current: a deployment
misconfigured a month ago and fixed the same afternoon still holds every refusal
it ever counted. `newest.sinceMs` is the one number that tells a live fault from
a fixed one, and it is **published rather than judged** — a caller that hands in
an instant gets the age, one that does not gets every other figure and `null`,
which is the shape a collection schedule already takes (0274). Nothing here
reads a clock.

**No horizon, and no standing that depends on one.** How recent counts as
current is the deployment's to say, and a framework that guessed would call a
fault fixed in April a fault forever. What makes this safe is that
**`turned-away` is the one standing no amount of age can weaken**: whenever
those refusals happened, nothing has ever been collected, so there is no window
in which this deployment was working. `mixed` is the standing that needs the
age, and it says in as many words that it is not judging.

### The health is taken whole, not as two loose numbers

`Pick<CollectionHealth, "pages" | "arrivals">`, which is the shape
`retentionPromiseOf` takes the retention in (0321): what is judged here is what
that reading published, by construction rather than by a reviewer. They are also
the two a caller could most plausibly get wrong by hand — a view floor is not an
arrival count (0212), and a count of readers is not a count of pages.

**Taking a `ReaderWindow` instead was the other candidate**, and it is the more
reachable one: `revisionsIn` and a sum over the door rows need no trees and no
declarations. It was rejected because the sum is `collectionHealthOf`'s
`arrivals` written a second time, and two spellings of one rule that agree today
is what this subsystem has been bitten by twice (0265, 0229). The cost is
small in the state that matters: a deployment nothing has been collected about
has no trees to join, so its health reading is `collectionHealthOf([], [])`.

### A reason handed in twice is folded once

The tallies are deduplicated by reason, the first row kept, and the rest counted
in `duplicated`. Nought from every store in this repository, because each keys
its rows by the reason — it is counted because the one lie a sum can be told is
a row handed in twice, and a count that has been added cannot be unadded (0158).
A caller concatenating two reads would otherwise publish twice the refusals with
nothing saying so.

## Consequences

- **The subsystem's largest false negative has a name.** A deployment can now be
  told that its door is refusing what its pages are posting, by one call over
  two counters that both already existed.
- **Nothing is collected, nothing is sent and nothing changes in a browser.**
  `broadcast.ts` is byte-identical, no payload field, no column, no migration, no
  store method and no new kind. The whole unit is a join over rows in hand,
  which is this lane's first question about any new capability.
- **It adds a closed set and a line for an operator**, both additions to
  published vocabulary rather than changes to one.
- **It is not a member of `windowAssemblyOf`**, and for a reason the three
  readings filed under that pattern do not share: an assembly is of a window's
  rows, and a refusal is not in a window. It is also not a member of
  `collectionHealthOf`, per the context above. Filed.
- **Nothing draws it**, like everything else in this lane. What is different is
  that the screen that would is already built and already reads *one* of the two
  inputs: the portal's *Signals* page reads this application's door rows and its
  refusal tallies and prints them in two boxes, so the standing is a health
  reading away rather than a store read away. Filed for `Loom portal`.
- **No silence vocabulary.** The reading withholds a figure in exactly one state
  and names it on the standing, the way `retentionPromiseOf` does (0321), so
  `silences.ts` is untouched and its twenty sets stay twenty.
- **Nothing here makes per-reader identity cheaper or dearer to add later.** Its
  finest grain is a deployment, and the only identity-shaped value anywhere near
  it is an `Origin` header that `keptOrigin` already reduced to a site before the
  counter saw it.

## Alternatives considered

- **An eighth `CollectionFault`, judged per page.** Rejected: a refusal names no
   page, so every page in the window would carry a fault about something none of
   their rows can see, and `readersAffected` — a count of readers behind faulted
   pages — would be nought for the one fault that means *there are no readers
   here at all*. The subject differs (0240).
- **A fourth argument to `collectionHealthOf`.** Rejected: the schedule is
   already the one argument there that is not a row, the lane filed on
   29 October that a context plus an instant is two arguments, and this would
   have made it four plus a second instant. A reading beside it costs a caller
   one line and keeps `CollectionHealth` a function of a window.
- **Judging the standing on `arrivals` rather than on `pages`.** Rejected, and
   it is the mistake worth recording: it calls a deployment whose senders never
   mark an opening `turned-away`, which is a confident wrong answer pointing at
   the wrong subsystem. Both figures are published; only one is the question.
- **A horizon, so a stale counter stops reading as a live fault.** Rejected for
   now: how recent counts as current is the deployment's, it would double the
   state set, and `turned-away` — the state the unit exists for — cannot be
   weakened by age at all. `sinceMs` is published for the state that can be.
- **Moving `RefusalReason` and `RefusalTally` into `src/signals/`.** Rejected:
   the three reasons this deployment counts are facts about this deployment's
   door, and the framework naming them would make a host's gate the runtime's.
   A type parameter costs one line and keeps the remedy where the vocabulary is.
- **A remedy per reason, as `remedyOf` does for a fault.** Rejected for the
   same reason: the framework cannot word a remedy for a reason it does not
   define. The portal already has one sentence per reason and they are good; a
   second set written here would be the near-duplicate this subsystem has been
   bitten by twice.
- **A twenty-first silence vocabulary, so a census could count this.** Rejected
   as premature and as the wrong unit: a silence is a reason *a reading* went
   dark, and this reading does not go dark — it answers. The day a deployment's
   readings are presented beside this standing, a condition for *the door
   refused what this page posted* is the natural shape, and
   [0324](0324-what-a-window-could-not-answer-is-a-census-over-its-silences-and-a-page-is-counted-once.md)'s
   census takes a twenty-first set without changing.
