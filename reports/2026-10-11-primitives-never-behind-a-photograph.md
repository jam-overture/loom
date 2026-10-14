# Never behind a photograph

**Routine:** `Loom primitives` · **Date:** 2026-10-11 ·
**Branch:** `primitives-58-never-behind-a-photograph`

Seven primitives had been filed as *blocked on an image source* in four
consecutive reports. **Five of them carry no image prop at all.** This run read
the schemas instead of the descriptions, closed three of the five with bands,
and recorded the rule that would have prevented the mistake.

## What shipped

**Three bands**, taking the catalogue from **63 to 66**, and **reach from 97 of
107 to 100 of 107** — the largest single movement in reach since September, and
it cost no new primitive and no framework change.

| band | part | the primitive it reached | the region no other design of the part occupies |
| --- | --- | --- | --- |
| `comparison-wipe` | comparison | **`loom.before-after`** | **the same measure in two states, in one box.** `comparison` and `comparison-ways` both lay *rivals* side by side and permanently; neither can compare a thing with itself |
| `testimonials-carousel` | testimonials | **`loom.carousel`** | **a list longer than the band that the reader controls.** The grid is closed at full extent, the marquee moves whether or not anybody asked |
| `cta-overlay` | cta | **`loom.overlay`** | **a bounded painted plate** with the page showing around it, rather than a full-bleed band |

**Two defects fixed in `loom.before-after` itself**, both found by the first
content that was not a photograph — see *What a photograph found* below.

**One decision record**, [0255](../decisions/0255-a-primitive-is-blocked-by-what-its-schema-requires-and-not-by-what-its-description-pictures.md),
and **four new tests**, every one mutation-tested red before being kept.

## The measurement, and why it was wrong for five weeks

The standing classification, repeated in four reports:

> `loom.media`, `loom.embed`, `loom.lightbox`, `loom.carousel`,
> `loom.before-after`, `loom.overlay`, `loom.pin` → **an image source**

Reading the seven props schemas takes about two minutes:

| primitive | what its schema requires | blocked? |
| --- | --- | --- |
| `loom.media` | `src: mediaUrlSchema` — **required** | **yes** |
| `loom.embed` | `src: mediaUrlSchema` — **required** | **yes** |
| `loom.carousel` | nothing. `slots: []`, children are the band's | no |
| `loom.overlay` | nothing. `slots: ["ground"]` | no |
| `loom.before-after` | nothing. `slots: ["before", "after"]` | no |
| `loom.lightbox` | nothing. `slots: ["preview", "full"]` | no |
| `loom.pin` | a surface whose height is known — corrected 23 Sept | no |

**Two of the five say so in their own files.** `loom.carousel`'s header names its
children as *"a card, a quote, a shot, a tier"*. `loom.overlay`'s `scrim` prop
documents exactly which grounds are safe without a wash: *"an overlay over a
palette-derived ground — a painted backdrop, a card, a flat surface — genuinely
wants no wash and is safe."* The information was not missing. It was in the
field nobody was reading.

**`loom.pin` is the tell, and this is the second time.** On 21 September it was
recorded that `pin` had been filed under *genuinely missing* with a parenthetical
saying it belonged in the image row, **and then left in the first row anyway**.
One row was corrected by hand on 23 September and the method that produced the
error was left in place, so it produced four more reports of it. That is why
0255 is a record rather than a corrected table: *a primitive's reach blocker is
read off its props schema and its slots, never off its description.*

**The asset seam is still real and still not this lane's.** `loom.media` and
`loom.embed` require a URL no composition may ship, and the binding seam (0058)
is still the recommended shape. What changed is that it blocks **two**
primitives rather than seven — a different size of question, and one this lane
stopped being able to point at as its largest gap.

## Which fields became nodes, and which stayed props

None of these is a Hermes port; the equivalent call for a band is what is a node
and what is a prop on the primitives it assembles.

| the thing | node or prop | why |
| --- | --- | --- |
| each of the twelve months across the wipe's two charts | **nodes** | a quarter is dropped with a `remove` whose inverse restores that month rather than the series (0052) |
| the wipe's `position` | **prop** | it moves the edge and adds no node — the granularity doc's sharper question |
| `beforeLabel` / `afterLabel` | **props** | 0052's fixed-field clause: exactly one of each, each names its region rather than being its content |
| the panel's painted ground | **a `loom.backdrop` node** | the near-miss was a `paint` prop on `loom.overlay`. As a node, a host flattens the panel to a surface or removes it and keeps the words — both would have been code changes here |
| the panel's heading, sentence and two controls | **nodes** | four nodes rather than four props, so a button moves above the sentence without anyone predicting it |
| `scrim`, `align`, `justify`, `corners`, `padding` | **props** | none changes the set of nodes, and no operation reorders glyphs |
| each quote in the carousel | **nodes** | `insert` / `remove`, exactly as 0052 says |
| `item` on the carousel | **prop** | a **floor for each card's width, never a count**. Nothing truncates the row — `wide` on a laptop is the same six quotes as `narrow` on a phone |

## What a photograph found that no test could

**This is the part of the run worth reading.** Every band rendered clean, under
both palettes, with no diagnostic, on the first try. The suite was green. Then
the sheet came back with **four defects in it**, and three of them were in the
primitives rather than in the bands.

**1. The wipe drew six months in a tenth of the band.** `loom.before-after` laid
its regions out as flex containers. A photograph has an intrinsic width; a
`loom.stat-chart` is `display: grid` with none, so as a flex item it was
`flex: 0 1 auto` and shrank to min-content — bars crammed against the left edge
with the labels piled on top of each other. **Fixed in the primitive**: each
region is now one stretched grid column, which hands any child the region's
width and changes nothing for a picture.

**2. Both series were visible at once.** The before layer is clipped over the
after layer, and a chart does not paint its own background, so the after layer
showed straight through it: April's bar over April's bar, May's two numbers
superimposed. A photograph is opaque by construction and nothing had ever
needed to say so. **Fixed in the primitive**: each layer now carries the root's
own `bg-surface-muted` ground.

**3. The carousel looked like a grid of three.** At `item: "medium"` the cards
are 22rem; three of them plus two `snug` gaps is 1080 pixels against a `wide`
band's 1077, so the third card ended flush with the right margin and the fourth
began exactly off the edge. The row scrolled and nothing said *there is more* —
which is the band's entire claim. `loom.carousel`'s 82% rule binds at the narrow
end and never on a laptop. **Fixed in the band**: `item: "wide"`.

**4. A month broke over three lines on the phone.** Six bars in 390 pixels is
about fifty pixels a column, and *September* came back as *Sept emb er*. Both
layers wrapped identically so the two heights still agreed and nothing could see
it. **Fixed in the band**: three-letter months, which is the ordinary convention
for a month on an axis.

A fifth, found the same way and **worked around rather than fixed**: the corner
chips are anchored to the *bottom* corners, which is right for a photograph and
collides exactly with a bar chart, whose labels live along its own bottom edge.
*By hand* sat on top of April. Each chart now goes on a padded `loom.card`.
Moving the chips is a change to a primitive with one caller and is not worth
taking on one data point; it is filed.

The generalisation, filed back to the lessons lane whose 10 October entry asked
the question in the other direction: **the facts a suite checks are the ones
somebody could imagine going wrong, and a picture is how the rest get found.**

## Decisions

**One.** [0255](../decisions/0255-a-primitive-is-blocked-by-what-its-schema-requires-and-not-by-what-its-description-pictures.md)
— *A primitive is blocked by what its schema requires, not by what its
description pictures.* **Accepted**: it adds a rule for this lane's own
instruments, supersedes nothing, and touches no tree schema, delta model or
Accepted record.

**On the number.** `main` holds to `0253`. `0254` is claimed by **two** open
pull requests (#575, #576) — the third consecutive number this has happened to,
which is this lane's own 9 October filing — and `0245` by #548. `0255` was and
is free on `main` and on every open branch. `pnpm decisions:index` was run; the
index carries the new row, and the holes it reports (0123–0154, 0245, 0252,
0254) are all pre-existing.

## Findings

**Closed**

- *the two checks about one pair of nodes are eleven lines apart in your file*
  (`Loom lessons`, 10 Oct) — **ask 1 only**. The ceiling check is in and
  mutation-tested. **Ask 2, the declaration, is deliberately not taken**:
  0185's cost-of-a-wrong-declaration argument comes first and a band does not
  settle it. It now has a caller that needs it, and a second fact of the same
  shape beside it.

**Filed**

- *a wipe written for photographs has two assumptions in it* → this lane,
  **closed by this branch**, recorded because the class will recur.
- *`loom.lightbox` is reachable, unbuilt, and the only one of the five whose
  claim this harness cannot photograph* → this lane, with the design sketched.
- *the ceiling check is in, and the declaration has a first caller* → this lane.

**Corrected**

- The 5 October *seven of eleven are one blocker* entry has a dated note
  appended rather than a rewrite: the row is the evidence for 0255.

## Open pull request

**#548 is untouched and stays untouched.** It carries 0245 as
`Proposed — ARCHITECTURAL, needs review`, and the question under it — *is the
phrasebook one list, or one per page kind?* — is the maintainer's.

This is the **second** run to open a second branch while that one is parked, for
the reason the 9 October governance entry gives and under the brief's own
escalation rule (*build what does not depend on it*), which `docs/routines.md`
says wins where it and step 3 disagree. This branch is independent of #548:
three bands in `STARTER_COMPOSITIONS`, which #548 does not touch. The collision
remains three shared files, two of which resolve themselves under 0139.

## Environment

**`https://21st.dev` does not resolve from this container** — the network policy
denies the host, so the brief's instruction to fetch it for the visual standard
could not be carried out, for the fourth consecutive run. The standard was taken
from `loom.hero`, `loom.feature-grid` and the existing bands. Nothing was faked
and no band was built against a remembered screenshot.

## Test numbers

`pnpm install && pnpm verify` — **green**. Nothing skipped, no test weakened.

```
Test Files  421 passed (421)      Tests  7812 passed (7812)    [workspace]
   root suite alone:  201 files, 4544 tests
```

**The gate went red on the first run and this is what it caught**, recorded
because the failure is the interesting part. One test:
`app/(lessons)/_lib/transcripts.test.ts > is what lesson 36 actually prints`.
`comparison-wipe` puts **two** authored `loom.stat-chart` nodes in one band, so
lesson 36's exercise B went from *1 authored plot / 6 figures* to *3 / 18*. The
fence's own `moves:` mark covers exactly that and says to re-run and paste.
Measured, pasted, and **both zeros still zero** — which the same mark asks to be
read rather than pasted, because a non-zero fourth line would have been news.
See *Cross-lane edits*.

**A second trap, and it nearly shipped a false claim in this report.** The
background runner's completion notice for that red gate said **exit code 0**,
because the command ends `…; echo "EXIT=$?" > verify.exit` and a compound
command's status is the last command's. `docs/routines.md` records this exact
failure twice — *"a rule naming one spelling of an act is a rule that stops
working the moment somebody reaches for the other one"* — and this is its
fourth instance. It cost nothing only because the file was read as well as the
notice and the two disagreed. **`verify.exit` said `EXIT=1`.**

**Four tests added**, all four mutation-tested red and reverted:

| test | the mutation that failed it |
| --- | --- |
| plots no figure above the ceiling of the chart it is in | `CEILING` 100 → 50 |
| draws both sides of the wipe to one ceiling | before chart's `max` → 60 |
| puts more quotes in the pushable row than the grid beside it draws | six voices → three |
| grounds the painted panel in the palette and leaves it unwashed | `scrim` → `veil`; `paint` → `grid` |

**The build order trap was hit as expected and handled.**
`reference.generated.json` is read from `dist/*.d.ts`, so `pnpm build` ran
before `pnpm docs:api`: **1,489 → 1,492 exports**, which is the three bands.
This is the third consecutive report to record it.

## Cross-lane edits

**One, in `apps/`, forced and declared.**

| file | edit | forced by |
| --- | --- | --- |
| `apps/loom/app/(docs)/_lib/counts.test.ts` | `starter-bands: sixty-three` → `sixty-six` | the assertion became false |
| `lessons/36-vantage.md` | exercise B's fence: `1` → `3` plots, `6` → `18` figures | the fence's own `moves:` mark, which says to re-run and paste |
| `lessons/36-vantage.md` | the sentence *"One authored plot"* → *"Three authored plots"* | the same mark names this sentence by its opening words |
| `lessons/36-vantage.md` | **the paragraph about the two zeros** | **not covered by the mark — see below** |
| `apps/loom/app/(lessons)/_lib/claims.test.ts` | `phrase` pluralised; `matters` updated | three plots cannot be written in the singular the regex required |

The same exception the 10 October report established and for the same reason:
the **value** is derived — `SITE_COUNTS` reads `STARTER_COMPOSITIONS.length` —
so the documentation site's prose updated itself. What is hardcoded is one
string asserting the *spelling*, hardcoded on purpose so a number the site
states cannot move without somebody seeing it move. Somebody is this run.
Checked: `sixty-three` appears nowhere else in `apps/`, `docs/` or `lessons/`
as a band count.

`reference.generated.json` is the same shape: a committed generated file whose
diff is the point.

**The paragraph is the one to look at, and it is flagged rather than buried.**
Lesson 36's best sentence was *"The fourth line is zero and **nothing is holding
it**"* — and this run made that false by writing the check, which is what the
lesson's own finding asked for. The `moves:` mark covers the numbers and the
sentence above them; it does not cover the paragraph. Leaving it would have
shipped a teaching claim this repository knows to be false, and the 2 October
entry on lesson 32 records *"the four numbers under it were updated from outside
the lane while the paragraph was left alone"* as precisely the failure to avoid.
So the sentence is in the past tense now with a dated block under it, the
teaching point is kept rather than replaced, and it is filed for `Loom lessons`
to overrule if they would have written it differently.

## Pictures

`never-behind-a-photograph.specimen.ts` — the three bands on one page, in page
order, nothing else and nothing styled by hand.

| | |
| --- | --- |
| `never-behind-a-photograph-editorial-wide.webp` | editorial, 1280 |
| `never-behind-a-photograph-bold-wide.webp` | bold, 1280 |
| `never-behind-a-photograph-editorial-phone.webp` | editorial, 390 |
| `never-behind-a-photograph-bold-phone.webp` | bold, 390 |

**No overflow on any shot** (`scrollWidth 1280 / innerWidth 1280`; `390 / 390`).
No literal colour anywhere — asserted page-wide by *reads every colour from the
palette and names none of its own*.

The sheet went through **four rounds**. That is unusual enough to record: the
first three rounds each fixed something the previous picture showed and no test
could, and the bands only stopped changing when the pictures did.

## What the library still cannot express

- **An image, for two primitives.** `loom.media` and `loom.embed` require a
  `src` no composition may ship. Unchanged, not this lane's, and five sizes
  smaller than it has been reported as.
- **A lightbox's open state cannot be photographed by `pnpm specimen`**, which
  renders and shoots without pressing. The band is designed and queued; its
  picture needs `pnpm shoot` and a page to serve.
- **`loom.before-after`'s corner chips cannot move off the bottom edge**, so any
  band whose content has a bottom-anchored baseline works around it with
  padding.
- **`loom.split` still has no ratio past 62/38**, with three callers and
  counting. Deliberately **not taken this run**: none of these three bands needs
  it, and taking it would have made this diff two unrelated things. The naming
  question — a role (`sidebar`) or a proportion (`three-quarters`) — is the part
  that is hard to reverse and it is still the reason to decide it rather than
  ship it.
- **A marquee's central claim still cannot be photographed**, unchanged. The
  carousel is the design of that part whose claim *can* be, which is most of why
  it is worth having.
