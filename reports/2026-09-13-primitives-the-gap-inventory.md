# The gap inventory

**Routine:** `Loom primitives` · **Date:** 2026-09-13 · **Branch:**
`primitives-29-the-gap-inventory` · **Section:** §4b

## Why this run is a document

The maintainer set a target on 13 September — **250 primitives by 19
September**, from 92 — and added that *"if increasing the number of primitives is
producing a scaling issue with the framework itself, we will have to figure this
out."*

Before spending four days building toward a number, this run went and found out
what the number can honestly be. Three August runs had already read
`docs/hermes-port-map.md`'s empty tables as *the range is finished* and gone
hunting for a ninetieth content model; each came back with a definition list.
Two runs since found real gaps by other instruments, neither of which produces a
count. **Nobody in this repository knew what was actually missing**, and a week's
plan built on a guess would have been the fourth run to make the same mistake.

`docs/primitive-gap-inventory.md` is the count. Two findings came out of it, one
of them the maintainer's scaling question, measured.

## What is actually missing

**Tier A — buildable today, needs nothing from the framework: five primitives
and one enum widening.** A figure drawn from a series (the largest hole — nothing
in 92 plots anything), a stat that carries its trend, a paging control, an empty
state, a waiting state; and `checkbox`/`radio` as members of `FIELD_TYPES`, which
is two strings rather than two files.

**Tier B — nine, blocked together on the behaviour vocabulary.** Tabs, tooltip,
popover, dialog, dropdown, toast, lightbox, a pricing toggle, a segmented
control. They arrive together or not at all because they are one framework
decision, and the tab strip has been filed against it since 11 September.

**Tier C — twenty-two things that look missing and are not**, each with the
primitive that covers it named, so the next run does not re-propose them. A
general `loom.disclosure` and a general `loom.definition-list` were reconsidered
and rejected again; the second is exactly what the three August runs kept
returning with.

**So the honest ceiling on distinct primitives is about 110–120.** Not 250.

## The thing that makes 250 look reasonable

21st.dev advertises 1152 hero components, 216 pricing sections, 161 testimonials,
318 features. That is the number behind the target and it is not a count of
primitives — **it is a count of designs of one block**. Those 1152 heroes are one
thing drawn 1152 ways, because a registry whose unit is the *design* has to grow
without limit: a user picks one and pastes it.

Loom's unit is not the design. A hero here is `loom.hero` plus a composition plus
props plus a theme, and those axes produce the same range without a second
primitive. **The axis that matches 21st.dev's numbers is compositions × themes.**
There are nine compositions.

## The scaling question, measured

`measurePrompt` on `main`:

| block | characters per request | ceiling |
| --- | --- | --- |
| themes | 6,155 | **8,000, enforced** |
| primitives (92) | **15,685** | **none** |

~170 characters per entry, linear; about **42,600 characters — roughly 11k
tokens per request — at 250**.

**The asymmetry is the finding**: the smaller block is guarded and the larger one
is nearly twice its size with no test naming a limit. Nobody decided that. The
themes ceiling was written at 51 catalogue entries expecting to fire *"another
eighteen entries or so"* later; it never did, because the library grew on the
other axis.

**The framework already left the answer in a comment.** That ceiling's own
failure message says one possibility is *"the starter library has grown past what
one deployment should register all of"* — which is the designed answer: the
starter library is a set to **choose from**, not one every deployment ships. So
250 need not be a scaling problem at all, provided a deployment can take a
coherent slice. Today it cannot comfortably:
`createStarterPrimitiveRegistry(additional)` only *adds*, and a host wanting
sixty of ninety-two has nothing to filter on but type-string prefixes — the
pattern-match [0114](../decisions/0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md)
exists to end.

0114 closed its `role` vocabulary at one member and set the bar for a second:
*"a consumer that cannot answer its question from the registry, written down as
a finding."* The interpretation prompt is that consumer. Filed, with the shape
offered rather than decided, and with one steer: narrowing **per deployment** is
most of the benefit and has no failure mode, while narrowing **per request**
means choosing what to send before the model has chosen, whose failure is the
primitive that was right and was not sent. Prefer the boring one.

## The arithmetic

| | today | by 19 September |
| --- | --- | --- |
| primitives | 92 | **~110** |
| starting compositions | 9 | **~140** |
| **droppable things** | **101** | **250** |

250, on the nose, with every one of them real — provided the second row does the
work. Compositions add no entry to the prompt block, need no framework decision
to start, and are what 21st.dev's numbers actually count.

## Which Hermes fields became nodes

None; nothing was ported and no primitive was built. This run is a measurement.

## What the library still cannot express

Unchanged, plus the two tiers above now enumerated rather than sensed. The
honest new one: **nothing in 92 primitives plots a series.** A metrics band that
cannot show a trend is the one marketing claim this library cannot make, and it
is first in the queue.

## Findings filed

- **`Loom daily build`** — the primitives block has no ceiling, the themes block
  does, and a deployment cannot register a slice. Maintainer-raised; three
  pieces offered, smallest first.

## What is next

Tier A, batched, starting with the chart. Compositions in parallel from the run
after, unless the maintainer redirects on the 110-versus-250 framing this
document exists to put in front of them.
