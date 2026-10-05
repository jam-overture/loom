# 2026-10-04 — where people stop reading

**Build order section:** §5 — Loom Portal. The reader screen, and the question it
has been one comparison short of asking since it was built.

**Branch:** `portal-51-where-people-stop-reading` (→ `main`), cut from `main` at
`f79e1d9`. Not stacked — #512 is open and this touches none of its files.

---

## What this closes

Two entries in `FINDINGS.md` name `app/(portal)/` as their owner and
`readingProgressOf` as the thing to draw. Both are from `Loom signals`:

| filed | the ask |
| --- | --- |
| 3 October | *where a page loses its readers is now a reading, and it is a shape to draw rather than one more row* |
| 1 October | the version gap underneath it, which is why the **other** reading in that entry's family is not in this branch |

`readingProgressOf(pageReadingOf(tree, tallies, registry))` answers *people get
through the first four bands and the fifth is where they leave*
([0221](../decisions/0221-where-reading-stops-is-a-fall-between-two-siblings-and-a-ratio-of-two-counts-off-one-row-set.md),
§9 of [`docs/signals.md`](../docs/signals.md)). It needed no counter, no byte on
any wire and no second read of anything: it is the second thing taken off a join
the screen was already making.

| | |
| --- | --- |
| `_lib/stopping.ts` | the reading, `FallLine`, `plainShare`, the four summary answers |
| `portal/readers/_components/where-they-stop.tsx` | the section, the run the fall happened in, the whole record behind one disclosure |
| `_lib/skipped.ts` | `skippingFrom` — the join split from the derivation, so one join serves both readings |
| `portal/readers/page.tsx` | one `pageReadingOf` per page, two readings off it |
| `portal/readers/_components/page-reading.tsx` | one unsound sentence removed, and the fact it was drawn from kept |

**+39 tests in the files this branch touches. Nothing weakened, nothing
skipped.**

---

## The screen could not ask the question, and was answering it anyway

`/portal/readers` has said *which parts did nobody get to* since 3 October. That
is a question about each part on its own: a standing each, in reading order.

The question underneath it is about **two** parts, and the card was making a
claim about it in its very first line:

> *Of the parts people reported on, fewest got as far as **the footer** — 3 of
> the 40 visits. **If anything on this page is worth moving up, it is what sits
> above that.***

The first sentence is a minimum over every part of the page and is exactly true.
The second is a claim about **reading order** drawn from it, and 0221 is explicit
that a minimum does not support one:

> *A part deep inside the first band comes before the second band in reading
> order and is reached by fewer readers than either, so a page-wide sequence of
> `reached` is not descending and a fall in it is not a stop.*

So the part with the smallest reach is routinely a part nothing stopped at — and
on the card's own fixture it is the footer, which is the *last* part of the page.
There is nothing below it for anybody to have failed to reach. The advice was
pointing at the bottom of the page and calling it a drop-off.

**The fact stays and the inference is gone.** The number is still the first half
of that very sentence; what left is a conclusion drawn from it that the reading
underneath can now draw properly, between two children of one parent.

---

## What a person reads now

Directly under *which parts did people get to*, on the same card:

> ### Where do people stop reading?
>
> A different question from the one above: that one is about the **parts** —
> whether anybody at all got to each of them — and this one is about the
> **people**, and how far down each of them got.
>
> There are 2 places on this page where people stop going, and this is the
> biggest.
>
> **5 in 10 of the people who got as far as the prose “This page is a stored
> tree, rendered thr…” `n_seed4` never went on to the card “Every change is a
> delta” `n_seed9`.**
>
> If one thing on this page is worth changing, it is the prose “This page is a
> stored tree, rendered thr…” `n_seed4` — it is the last thing people saw before
> they left.

and then the run it happened in, in the page's own order, with the figure sitting
on the **gap** rather than on either part:

```
inside the page “Loom” n_seed10
  the heading “Loom” n_seed2          100 of 100 visits
    ↓ 1 in 10 of the people who got this far stopped here
  the prose “This page is a stored…”  88 of 100 visits
    ↓ 5 in 10 of the people who got this far stopped here
  the card “Every change is a delta”  41 of 100 visits
```

> In one other group of parts on this page, everybody who saw the first of them
> saw the last.

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`.** A hundred visits were staged into a real
`memoryReaderTallyStore()` through the published `ReaderTallyStore.apply`, against
the seeded page at revision 0, and read back through the same
`portalReaderTallies.tallies()` the screen always calls. **The fiction is the
readers**; the page, the parts, the names and every number on the screen are the
deployment's own. The staging module was deleted before committing and the shot
list is beside this report.

| | |
| --- | --- |
| [**the reader screen**](2026-10-04-portal-stop-reading-wide.png) | `1680×1000@2x`, full page |
| [**the same, on a phone**](2026-10-04-portal-stop-reading-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

---

## The decisions worth reading

### The share leads and the counts are one click down, which is the reverse of this card

Every other section here leads with a count — *3 of the 40 visits*, *clicked 14
times*. This one leads with *5 in 10 of the people*, and the counts it was made of
are behind the disclosure. That is not a style choice.

A reach is a distinct-visit count **added across roll-up windows**, so it is
generous by every visit that straddled a boundary
([0147](../decisions/0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md),
measured since
[0219](../decisions/0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)).
Two parts of one page are inflated by the *same* straddling visits, so the
inflation very nearly divides out of a ratio between them. **The share survives
an over-count that the counts do not**, so the share is the figure a person may
quote and `38 of 94` is the one they may not — and putting the quotable figure
behind the click would be the screen getting that backwards.

The record says so in as many words, beside the numbers it is a caveat about.

### A sentence with two names in it

`PlainLine` carries one subject, because almost every sentence in this portal is
about one part. A fall is irreducibly about a pair, and a sentence naming only
the first is the half a person cannot act on — so `FallLine` is `PlainLine` with
two, and `FallSentence` is `PlainSentence`'s counterpart: the spread happens
once, and its own test asserts that what it renders reads exactly
`fallReading(line)`. The words stay body text and only the two identifiers are
monospace, which is the rule `PartName` has held since 6 September.

It stays in `_lib/stopping.ts` rather than joining `PlainLine` in
`vocabulary.ts`, under this lane's own rule: **a shape moves to the shared table
on the run a second screen needs it**, never in anticipation of one.

### Two phrasings, because *everybody … never went on* is not a sentence

A share of one is *nobody went on*, which is how English says it. One template
would have produced *Everybody who got as far as X never went on to Y*. The two
ends of the range are named rather than rounded into the middle — *fewer than
1 in 10* rather than a `0 in 10` that reads as nobody, *almost all* rather than a
`10 in 10` that reads as everybody. The exact share to three places is one click
down.

### The screen says what it is *not*, and a photograph is what found it

The first wide shot has these two things eleven lines apart, both exactly true:

> Nothing on this page is being scrolled past. Every part of it has been in front
> of somebody.

> 5 in 10 of the people who got this far stopped here.

One is about **parts** — did each reach anybody — and the other is about
**people** — how far did each get. A reader who takes the first as an answer to
the second meets the pair as a contradiction, and no rewording of either heading
fixes it, because the headings are not wrong.

So the section names the difference in one line under its own heading. That is
the move `_lib/screen-names.ts` already settled for `Activity` and `History`,
which are synonyms in English and nearly opposites here: **a screen carries one
line naming the neighbour it will be confused with, and the difference.** It is
the second instance of that rule and the first between two sections of one card.

**It is also the strongest case for the section existing.** A page whose every
part is read, with nothing trailing and that whole section green, can still lose
half the people who reach one gap — and before this branch there was nothing on
the screen that could say so.

### One join, two readings

`skippingOf(tree, tallies, registry)` built the join and derived from it in one
function. The second reading needed the other half of the same `PageReading`, so
the join is now `skippingFrom(reading, names)` and the screen makes it once.

The join is pure and linear in the parts, so calling it twice was not expensive —
it was **divergent**. Two `pageReadingOf` calls are two chances for a screen to
hand one of them a different window or a different registry, and a card whose two
sections disagreed about how many visits there were would be wrong in exactly the
way nobody checks. `reading-order.test.ts` now pins that there is one call and
that the version guard is still in front of it.

### What is counted together and what is not

There is a count of **places** where reading falls off and no count of people
across them, deliberately. One visit that got past two parts is in both pairs'
figures, so adding what was lost at each would double-count the same readers —
the most headline-shaped wrong number available on this surface. The record says
so where somebody tempted to add them would be looking.

Nothing is divided by the page's visit floor either. That is a different counter
written in a different place and a ratio across the two can honestly exceed 1;
every denominator here is the reach of the part immediately above the fall.

---

## What this tells a developer that they could not get elsewhere

**Which two parts of their page, by name and in order, the people reading it stop
between — and how many of the ones who got that far did.**

An analytics product measures a URL. It does not know a page is a tree, it has no
way to say *this part*, and it certainly cannot say *between this part and the
one after it, among the people who reached the first*. `git log` holds the
primitives and not the page. The store holds the page as it is now and no record
of what it did to anybody.

And the recommendation is the half that is new. *Fewest people got to the footer*
was already on this screen and is a fact about a part. **The last thing a person
saw before they left** is a fact about a position, it names the part to rewrite,
and it is produced by crossing two things only this deployment holds — its own
page, as a tree, and what the people reading it actually did.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, on a deleted `dist` and `.next`,
status written to a file as the last act of its own line and read separately.

| | `main` at `f79e1d9` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 | **180 / 3,803** — `src/` untouched |
| `@loom/app` | 378 / 6,776 | **380 / 6,830** |
| findings | 996 | **997**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,536 junctions, 0 run together |
| `pnpm shoot` | — | `1680 / 1680`, `390 / 390` — no overflow |

Both columns were measured on this machine rather than quoted. **The four files
this branch touches or adds declare 85 tests where `main`'s two declare 46**; the
whole-app delta is larger than that because several suites are parameterised over
the repository's own contents, and this branch adds a findings entry, a report and
three report assets.

`git diff origin/main -- src/ tools/` is empty.

The gate caught one thing a typecheck run before the tests existed did not, and
it is worth recording because the remedy is *run the gate, not a subset*: both
new fixtures took a registered type as `Partial<ReaderTally>`, which brands it, so
every `type: "loom.page"` in a row was a compile error. The tests passed under
vitest and failed under `tsc`.

No decision record. This consumes 0221 and adds no concept.

---

## Findings

**One filed**, and it is a correction rather than a gap:

> *the before-and-after reading is blocked on a store that can answer for an
> older version, and the two entries that say so were filed three days apart*

This morning's entry from `Loom signals` — `readingChangeOf(was, now)`, *the
sentence the reader screen should lead with* — is marked **nothing is blocked**
and owned by this lane. It is blocked, by the 1 October entry three days older
than it. `readingChangeOf` needs **a tree per side**, and a consumer holding a
`TreeReader` can obtain exactly one: `head` is the snapshot, `revisions` starts at
1, and nothing hands over the seed, so `replayTree` — which is published, and
would do it — cannot be given its first argument.

So this run shipped the reading that needs one tree and filed the reason the other
one waits. Either a seed a reader can ask for, or `at(treeId, revision)`,
unblocks three things at once.

## What I did not do

- **I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty, and
  the one gap this run met is filed rather than worked around.
- **I did not draw every run.** Runs with no fall in them get a sentence; every
  one of them, with every part's reach, its standing and whether it could anchor
  a fall, is in the disclosure at the foot of the section. A page whose every
  group is drawn is the table this surface refuses to be.
- **I did not take the `TITLE_BEARING` finding**, which is this lane's and still
  open: `page-name.ts` can drop its hard-coded `TITLE_TYPES` now that
  `registry.typesWithRole("heading")` answers, and the portal's own
  `loom.heading` needs the declaration before it can. One coherent unit per run,
  and it is not this one.
- **I did not add a before-and-after comparison.** Filed, above, with the reason.
