# The third design

**Routine:** `Loom primitives` · **Date:** 2026-10-10 ·
**Branch:** `primitives-57-the-third-design`

Twelve of the catalogue's twenty-two parts had exactly two designs. Two designs
is a choice between two drawings; it is not a vocabulary. This run gave four of
those twelve a third, and in each case the third is not a third taste — it is a
region the part could not occupy at all.

## What shipped

**Four bands**, taking the catalogue from **59 to 63**, and four parts from two
designs to three.

| band | part | the region neither other design occupies |
| --- | --- | --- |
| `faq-aside` | faq | **a way out.** Both other designs end on the last answer, so a reader whose question is not there meets the closing call to action having just failed to get one |
| `integrations-marquee` | integrations | **a list longer than the band.** A ring and a grid are closed lists drawn at full extent; neither can say *there are more of these* |
| `contact-split` | contact | **both kinds of reader at once.** `contact` assumes they will fill a form in; `contact-details` assumes they will not. Which one a visitor is is not knowable from the page |
| `footer-status` | footer | **the state of the product now.** Both other footers are archives of what the site contains; neither can say whether it is up |

**Four claim guards**, one per band, in a new `what the third designs claim`
block — and each was **mutation-tested red before being kept**: hard edges on
the ribbon, a question moved into the FAQ's aside, a second group in the
compact footer, a duplicated reply promise in the contact band. All four went
red; all four were reverted.

**Two findings filed**, one of which answers an open entry owned by this lane.

## Why these four, and not four more primitives

The brief's headline is breadth in `src/primitives/`, and the honest reading of
the instruments is that **the vocabulary is not where breadth is missing any
more.**

- **107 primitives** against the gap inventory's own target of 110–120.
- **Reach is at its ceiling: 97 of 107.** Of the ten unreached, **seven are one
  blocker** — an image source, which `mediaUrlSchema` refuses as `data:` and
  which a `/path` cannot supply, and which the 6 October entry establishes is
  the framework's to answer and not this lane's. `loom.waiting-state` is
  unreachable on purpose (resolution happens before the walk), `loom.page` is
  the render root, and `loom.link-trail` wants the interior document that #548
  is parked on.
- The gap inventory's standing recommendation, written against the grammar
  budget, is explicit: **"hold the vocabulary near 110 and spend the week on
  compositions."** Every primitive costs ~170 characters on *every*
  interpretation request a deployment sends; a band costs nothing per request.

So the axis still moving is the catalogue, and within it the sharpest reading
was not the primitive count but this, measured on `main` this morning:

> **48 of 107 primitives are reached by exactly one band.**

A primitive one band deep is one edit away from being unreviewable. Two of the
four bands here are a second path for a primitive that had one:
`integrations-marquee` for `loom.marquee` (previously `testimonials-wall`
alone) and `faq-aside` for `loom.faq-list` and `loom.faq` (previously `faq`
alone). `contact-split` is a second path for `loom.form`, `loom.field` and
`loom.button` in a marketing band.

Within the twelve two-design parts, these four are the ones a marketing page
actually stands on. A third `specs` or a third `credentials` would have been
four thinner things.

### Two candidates dropped after measuring, which is the part worth recording

**`steps-timeline` — a vertical journey on the how-it-works part.** The brief
names *timeline* in its band list and it looked like the obvious gap.
`changelog` already builds `loom.milestone-list` over `loom.milestone` and its
own rationale says so in as many words: *"takes the same children as the
how-it-works row and runs them down instead of across."* A steps design with
that node set is the same subtree on a different part, which is 0052's
shades-of-one with the serial numbers filed off. Dropped before a line was
written.

**`comparison-against` — an *us vs them* two-column band.** It is the classic
21st.dev comparison block and it is **already built**: `comparison-ways` is a
`loom.split` of two `loom.perk-list` columns whose rows carry opposite
`loom.perk` states, with a test named *marks every row of the two-ways band
against the column it is in*. Dropped on reading the guard.

Both were caught by reading the catalogue rather than by a test, which is the
argument for the reach and usage measurements being cheap to re-take.

## Which Hermes fields became nodes, and which stayed props

None of these is a Hermes port — Hermes' seventy are ported and the content
models are already in the library. The equivalent call, which for a band is
*what is a node and what is a prop on the primitives it assembles*:

| the thing | node or prop | why |
| --- | --- | --- |
| the FAQ aside's offer (heading, sentence, control) | **three nodes** | it is three things, so by 0052 it is structure. A `helpHref` prop on `loom.faq-list` would have made *change the offer* a code change in this library |
| whether a question starts open | **prop** | it changes what is visible and no node. The granularity doc's own case |
| the ribbon's way out (`See every connector`) | **node** | a deployment with no integrations page removes it; one with a directory re-points it with a `configure`. A `seeAllHref` prop would have made both a code change |
| `edges: "faded"`, `density: "loose"` | **props** | no operation reorders glyphs, and neither changes the set of nodes |
| the number of logos on the ribbon | **nodes** | `insert`/`remove`, exactly as 0052 says |
| the footer's status claim | **a `loom.badge` node** | an incident is one `configure` on a text child. A `statusLabel` prop on `loom.footer` was the alternative and is the near-miss |
| the link backing that claim | **a second node** | `loom.badge` has no `href` and must not get one — a badge that navigated is a control drawn as a label |
| the contact band's team-size select | **removed**, which is a node difference | it is the field that exists for the seller, not the sender, and a reader beside an email address will not answer it |
| `columns` on footer, `ratio` on split | **props** | floors and arrangements, never counts |

## What a photograph found that no test could

**Two redundant labels, in two different bands, from one shot.** `loom.link-list`
draws its `label` as small uppercase above its links. In `contact-split` that
put `DIRECT WAYS IN` three lines under a `loom.heading` reading *Or reach us
directly*; in `footer-status` it put `OVERTURE` an inch to the right of the
`Overture` wordmark. Both render perfectly, both pass every structural check,
and both are the same region named twice in two registers — which is the
two-figure failure the portal lane has now recorded twice in its own surfaces,
arriving here as furniture rather than as arithmetic.

Both labels are gone. It costs each landmark its accessible name, which is a
real loss and is why it is written into both bands rather than quietly done:
`footer`'s legal row has made the same trade since it was written, and a list
directly under a heading is named by that heading for a reader going through
the document. The alternative is a visible duplicate for everybody.

**A near-miss on a shared vocabulary, backed out.** `footer-status` wants one
group of links across the full width, and `loom.footer`'s `columns` vocabulary
is `auto`, `two`, `three`, `four` with no `one`. Adding a fifth member was one
line — and `COLUMN_NAMES` is read by four primitives, and `one` is the worst
possible member for an enum whose entire documented point is that these are
**floors and never counts**. It was unnecessary: `auto-fit` collapses the
tracks nothing lands in, so a single group under `columns: "auto"` is one track
at `1fr`. Filed, because the next person to want a `one` will be looking at
`loom.grid`.

## What the sheet cannot show, said plainly

`pnpm specimen` shoots with `reducedMotion: "reduce"`, deliberately — an
animation that starts at zero opacity would otherwise photograph blank. So
`integrations-marquee` is photographed in its **reduced-motion** rendering,
where the track becomes a block and the run wraps. The four shots show a
two-row logo cloud, not a travelling ribbon.

That is the honest picture of what a reader who has asked for reduced motion
sees, and it degrades well. It is also an admission: **the band's central claim
— the fade that says *this continues* — is the one thing in this run that no
picture in this repository can prove.** `testimonials-wall` has had the same
property since it shipped and nobody had written it down. Not filed as a defect
because the harness's choice is the right one; recorded so the next run reading
these shots does not think the ribbon is broken.

A second consequence worth naming: under reduced motion, this band and `proof`'s
`loom.logo-cloud` draw nearly the same thing. That is inherent to `loom.marquee`
rather than to this band.

## Decisions

**None, deliberately.** Every call here is made under records already Accepted —
0052 and `docs/primitive-granularity.md` on what is a node, 0162 on what earns a
second design of a part, 0171 on what earns a part, 0054 on container naming,
0057 on a composition being a deterministic interpreter. Nothing in this run
changes a rule, so nothing here is a record.

That is also the prudent answer on numbering: `main` holds to **0249**, and
**0250 is claimed by two open pull requests** (#565 and #566) — the lane
collision this lane filed on 9 October. A record written here would have been
the third claim on a number in two days to settle a question nobody asked.

`pnpm decisions:index` was run; the index is unchanged, which is the correct
outcome for a branch that adds no record.

## Findings

**Answered** (owned by this lane, from `Loom daily build`, 9 October)

*A primitive may read a region it never declared, and the probe that checks the
other direction cannot see it.* The entry put a choice to this lane: build a
marker-based probe, or let it stay a review rule. **The answer is the review
rule**, and the decisive reason is not the measured zero instances — it is that
**the proposed probe cannot catch the defect the entry describes.** A marker
under an undeclared name is rendered only by a component reading an *arbitrary*
key; a component with `loom.slots["aside"]` written in it reads `aside` and the
marker never reaches it. It would buy a green test for the shape nobody writes
while the shape the entry is about stays invisible.

The harm the entry actually names is a **misleading diagnostic**, and that has a
one-string fix in the lane that owns it: `slot-unplaced` knows both facts and
says only one. Filed back to `Loom daily build` — smaller than the instrument
that was offered.

**Filed**

- *the probe cannot catch the defect, and the cheaper remedy is a sentence in a
  diagnostic* → `Loom daily build`.
- *`loom.footer` has no `one` and does not need one, because `auto-fit`
  collapses empty tracks* → this lane, as a near-miss on a shared vocabulary.

## Open pull request

**#548 is untouched and stays untouched.** It carries 0245 as
`Proposed — ARCHITECTURAL, needs review`, and the question under it — *is the
phrasebook one list, or one per page kind?* — is the maintainer's. A record a
routine has marked as needing review is one this lane leaves alone. It was
mergeable and green when last pushed on 9 October; it has not been re-merged
from `main` on a timer, for the reason `docs/routines.md` records.

This branch is independent of it: four bands in `STARTER_COMPOSITIONS`, which
#548 does not touch.

## Environment

**`https://21st.dev` does not resolve from this container** — the environment's
network policy denied the host, so the brief's instruction to fetch it for the
visual standard could not be carried out this run. The standard was taken from
`loom.hero`, `loom.feature-grid` and the existing bands instead, which is the
floor the brief also names. Nothing was faked and no band was built against a
remembered screenshot.

## Test numbers

`pnpm install && pnpm verify` — **green**. Nothing skipped, no test weakened.

```
Test Files  419 passed (419)      Tests  7636 passed (7636)    [workspace]
```

Four tests added, all four verified red against a deliberate mutation and
reverted.

**Three failures were hit on the way and all three were fixed rather than
worked around.** They are listed because two of them are the kind a run can
only find by actually running `verify` to the end, and one of them is a trap
this lane has now hit twice.

1. **Typecheck.** The questions array needed an explicit `Question` type: `as
   const` on a list where only the first member carries `open` gives a union
   with no `open` on the rest. `faq-band.ts` had already solved it the same
   way.
2. **`reference.generated.json` was stale** — four new exports, so the docs
   site's *every published door* assertion went red. This is exactly the trap
   `primitives-55` recorded on #548: the reference is read from `dist/*.d.ts`,
   so it has to be regenerated **after** `pnpm build`, never before. Rebuilt
   and regenerated: **1,460 → 1,464 exports**, which is the four bands.
3. **The documentation site spells the band count in prose**, and its own test
   asserts the spelling. See *Cross-lane edits* below.

## Cross-lane edits

**One, in `apps/`, forced and declared rather than quiet.**

| file | edit | forced by |
| --- | --- | --- |
| `apps/loom/app/(docs)/_lib/counts.test.ts` | `starter-bands: fifty-nine` → `sixty-three` | the assertion became false |

The brief for this lane says `src/primitives/` only and not to edit `apps/`.
This is the exception that rule has to have, and it is worth saying why rather
than just doing it: the **value** is derived — `SITE_COUNTS` reads
`STARTER_COMPOSITIONS.length` and the page renders it through `<BandCount>` —
so the documentation site's prose updated itself and nothing there is stale.
What is hardcoded is one string in the test that checks the *spelling*, and it
is hardcoded on purpose, so that a number the site states cannot move without
somebody seeing it move.

Somebody is this run. It is one word, it keeps an assertion true rather than
weakening one, and the alternative — leaving `verify` red — is the thing the
brief forbids outright. `reference.generated.json` is the same shape: a
committed generated file whose diff is the point.

Checked for others: `fifty-nine` appears nowhere else in `apps/`, `docs/` or
`lessons/` as a band count. The one hit in `lessons/21-appearance.md` is a
different fifty-nine.

## Pictures

`the-third-design.specimen.ts` — the four bands on one page, in page order,
nothing else and nothing styled by hand.

| | |
| --- | --- |
| `the-third-design-editorial-wide.png` | editorial, 1280 |
| `the-third-design-bold-wide.png` | bold, 1280 |
| `the-third-design-editorial-phone.png` | editorial, 390 |
| `the-third-design-bold-phone.png` | bold, 390 |

**No overflow on any shot** (`scrollWidth 1280 / innerWidth 1280`;
`390 / 390`). No literal colour anywhere — asserted page-wide by
`reads every colour from the palette and names none of its own`.

The four on **one** sheet rather than four sheets is deliberate. Three of the
four put two unequal things side by side at `loom.split`'s widest asymmetric
ratio, and one sheet each would have shown two asides that each look slightly
roomy. Together they show the same aside at the same width twice, which turns a
taste into a measurement — see below.

The phone shot is the one that earns its place: all three splits stack, and the
order they stack in is a consequence of source order rather than of a prop.
`contact-split` puts the form first and the addresses under it, which is the
right order and the kind of thing that changes silently when somebody reorders
two slots.

## What the library still cannot express

- **`loom.split` has no ratio past 62/38.** `even`, `start-wide`, `end-wide`,
  and both new split bands want nearer 70/30 — as did `primitives-55`'s
  contents rail, which is where this was first filed. It now has three callers.
  Still one line, and still a question about whether the fourth member is named
  for a role (`sidebar`) or a proportion (`three-quarters`), because those
  generalise very differently. Not taken: it is a prop on a primitive the whole
  catalogue reads, and the naming is the part that is hard to reverse.
- **A marquee's central claim cannot be photographed by this repository's own
  harness**, per above.
- **Seven primitives remain unreachable on one blocker**, unchanged and not this
  lane's: an asset the catalogue may name, or a binding that supplies one.
- **A `loom.badge` cannot say *when*.** The status badge reads *All systems
  normal* and a reader's next question is *as of when*. The honest answer is a
  timestamp, which is data rather than content — the binding seam (0058) is the
  right shape for it and `loom.badge` declares no `reads`. Not taken this run:
  a bound twin of a badge does not pass 0233's first clause, and the alternative
  is a sentence in the band, which is one `insert`.
