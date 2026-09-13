# Four bands the page sequence was missing

**Routine:** `Loom primitives` · **Date:** 2026-09-13 · **Branch:**
`primitives-30-the-phrasebook` · **Section:** §4b

## Why compositions, and why now

`docs/primitive-gap-inventory.md` (#289, the same day) measured the library
against a maintainer target of 250 by 19 September and found the honest ceiling
on distinct primitives is about 110. The rest of the target is **compositions**,
for a reason the inventory argues at length: 21st.dev's 1152 heroes are not 1152
components, they are one block drawn 1152 ways, and Loom's matching axis is
compositions × themes rather than the primitive count.

There were **nine**. There are now **thirteen**, and this run is the measured
rate rather than another estimate.

## What was built, and why these four

The nine were chosen as *the argument a landing page makes* — open, prove, show,
count, price, quote, answer, ask, close. Read as a sequence they are a page, and
that is the property the catalogue's own doc comment claims for them.

**Each of these four closes a gap in that sequence rather than offering a second
way to do something already in it.** A page could not:

| | band | what it could not do |
| --- | --- | --- |
| `nav` | a sticky bar, wordmark, four links, one action | **open.** `footer` shipped from the start; its opposite never did |
| `steps` | three numbered moves on a rail | say **what happens next** — the band a convinced visitor actually reads |
| `comparison` | five rows against two alternatives | argue against **the thing the reader already uses** |
| `team` | four people, roles, a line each | say **who is behind it** |

So the catalogue is still one page in order, now thirteen bands long. That
matters more than the count: the doc comment's claim is the sequence, not the
number.

## The defect a screenshot caught and every test passed

`comparison-band` put its three subjects directly into the table's `columns`
slot. The correct shape wraps them in a `loom.comparison-row` *inside* the slot,
which is what puts them in the same columns the body rows use.

Without it: **every mark sat one column right of its heading**, the steered tint
landed on the first competitor instead of the subject, and the third mark of
each row hung off the end of the header rule. The band registered, rendered,
declared its types correctly, minted fresh ids and read every colour from the
palette — it passed all five generic assertions in `compositions.test.ts`,
because none of them can see that a table means something different from what it
says. Only the picture could.

It is written into the band's own comment rather than only fixed, because the
next composition to use a two-dimensional band will reach for the same shape.

## What the run says about the rate

Four bands, at the doc density the catalogue already had, in one run — plus the
specimen and the fix above. The nine that came before averaged 95 lines each
including their reasoning; these four average about the same.

**Extrapolating honestly: four to eight a run.** The inventory's arithmetic put
~140 compositions at Friday. At this rate that is not reachable, and saying so
now is worth more than discovering it on Thursday. What *is* reachable is
somewhere between 30 and 50 — which, with ~110 primitives, is a catalogue of
140–160 droppable things rather than 250.

The lever that would change the rate is variants rather than new kinds: a second
hero or a two-tier pricing band re-uses an argument already made, so it costs a
build function and a short comment rather than a full one. That is also the
point at which this list stops being a page — which the index's doc comment now
names as the thing to watch, with what to do about it.

## Which Hermes fields became nodes

None; nothing was ported. Every band builds from primitives already registered,
which `compositions.test.ts` asserts.

## What the library still cannot express

Unchanged. One added by this run, and it is a property rather than a gap:
**nothing numbers a sequence.** `steps` carries `marker: "01"` on each milestone
because a render is a total pure projection of one node, so no child can know it
is the second of three. Inserting a step between the first and second leaves the
markers wrong, and that is two `configure` operations. It is the cost of the
ordering being *in the content* rather than implied by position, and it is the
same trade a numbered list in prose makes — worth knowing before somebody files
it as a bug.

## Findings filed

None. The two filed earlier today (#289) still stand.
