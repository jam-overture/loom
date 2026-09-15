# Which nothing it is

**Routine:** `Loom primitives` · **Date:** 2026-09-14 · **Branch:**
`primitives-34-which-nothing-it-is` · **Section:** §4b

## What this run built

One prop. `cause` on `loom.empty-state`, and the `role="status"` that follows
from it. The library is **96**, unchanged.

## Why it is one prop and not the primitive this session started building

This session built `loom.placeholder` — an empty state with two states — and
opened #300 for it. **A scheduled run of this same routine was building Tier A
at the same time**, finished first, and landed `loom.empty-state`,
`loom.waiting-state` and `loom.link-pager` on #294 while #300 was in review.

Two runs of one routine, working from the same inventory, on the same afternoon.
Not a lane violation — `src/primitives/` is this lane either way — but a genuine
collision, and the merged work is the one that stands. **#300 is withdrawn.**

The right question after that is not *whose was better* but **what does main
still not do**, and the answer is narrow and real.

## What #294 covers, and the one thing it does not

`loom.empty-state` is a shell: `outline`, `align`, `stature`, with the words as
children. It is a good primitive and this run kept every line of it.

Its own opening quotes the half of 0058 that motivated it — *a source with
nothing to report answers `ready` with an empty list* — and **that sentence ends
"rather than failing"**. 0058 is explicit that these are two different answers
and that *"collapsing those two is the mistake"*.

`loom.empty-state` renders them identically. `outline: "solid"` lets a page
*look* like it is reporting a failure; nothing lets it **say so**. A reader who
is not looking at that region — using a screen reader, or looking elsewhere on
the page — was told nothing either way.

So the library collapsed 0058's distinction at the last step, which is the one
place the record cannot reach.

| | `empty` | `unavailable` |
| --- | --- | --- |
| what happened | the source answered, with nothing | the source could not answer |
| is it an event? | no — the page is finished | yes — it may be different in a minute |
| announced | no | `role="status"`, politely |

`status` rather than `alert` on purpose: a region that failed to load is worth
knowing about and is not worth cutting across a sentence being read.

## Why an enum and not a boolean

`failed: boolean` would have done today's job. It is an enum because a third
answer is already thinkable — **a region a viewer is not permitted to see** is
neither empty nor broken, and a page that says "nothing here" to somebody who
simply lacks access has told them something false. A boolean cannot hold that;
this enum can grow to it without a rename.

## What this run did not do

**It did not touch the shape, the spacing or the outline.** The visual channel
is `outline`'s and it already works; adding a second way to say the same thing
would be two props disagreeing about one fact. `cause` is semantics only, and
that is the whole of it — three lines of component and a schema member.

**It did not re-add a `waiting` state.** This session argued on #300 that a
waiting state is unreachable, because a binding is answered before the walk.
`loom.waiting-state` shipped on #294 and the argument there is better: a host
that renders twice has a first render with an honest answer, and #300's own
comment conceded exactly that in passing. **The refusal was too strong and the
merged primitive is right.**

## What the collision says, kept because it will happen again

Two runs of one routine spent an afternoon on the same six items of one
inventory. The inventory is what made that possible — it is a plan any run can
read — and nothing in the repository records that a run is *working on* an item,
only that one is done.

Not filed as a finding, because the fix is not obvious and the cost was one
primitive's worth of duplicated work against a document that has otherwise
directed three runs correctly. Worth knowing before the next multi-item plan.

## Findings filed

None. `docs/primitive-gap-inventory.md` needed no correction this time: #294
closed Tier A and recorded the radio-group problem independently, reaching the
same conclusion as this session did by a better route — React context is
unavailable because these are Server Components.
