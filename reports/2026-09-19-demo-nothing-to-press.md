# Nothing to press on the first screen

**Routine:** `Loom demo` · **Branch:** `demo-22-nothing-to-press-on-the-first-screen` ·
**19 September 2026**

**Deployed preview:** added to the pull request when Vercel reports it. Open
**`/demo`** and make the window narrow — under 1024px the layout stacks, and
that is the whole of what this run changed. Better still, open **`/`** on a
phone and look at the demonstration in the band under **Your turn**. (Not opened
from this environment — `vercel.app` is not on the sandbox's egress allowlist;
the standing 19 August finding.)

The twenty-second run of this lane, and the first one in four that is about the
arrival screen rather than about a control on it.

---

## What a stranger could not understand before this run

**That there was anything to press.**

The front door stopped pointing at the demonstration and started *containing* it
on 18 September ([0056](../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md),
§4d). So the likeliest first encounter with Loom is no longer `/demo` on a
laptop — it is a box on the landing page, and on a phone that box is **348 × 465**.

Measured in Chromium against a real `next build` of `main`, at exactly that size:

| what a visitor met, in order | pixels |
| --- | --- |
| the bar — wrapped to **three** rows, the mark alone on one and `revision 0` alone on another | 108 |
| the heading and **three** paragraphs | 156 |
| a fourth paragraph — *Loom weighs every ask…* | 74 |
| **the first control** | **at 398** |

The box is 465 tall. What a stranger saw was a wall of prose and **67px of the
top of a green button**, with the page every word of it is about 1,360px below.
Four of the five things Loom had to say were said before there was anything to
do, and 23% of the box went on chrome before the demonstration said anything at
all.

That is four of the five clunks this lane was created to remove, on one screen:
too many steps before anything happens, no obvious first action, the interesting
part below the fold, nothing to react to on arrival.

## What a stranger can understand now

The same screen, on this branch, at the same size: **whose page this is, what it
is, a button, what the button does, and what Loom does with every ask** — all of
it above the fold, in that order, with *or ask for one of these* showing just
below to say there is more.

| | `main` | this branch |
| --- | --- | --- |
| the bar | 108px, three rows | **82px, two rows** |
| the rail's header | 156px | **140px** |
| **the first control, at 348 × 465** | **398** | **266** |
| in view inside the box | its top 67px | **the button, its promise and the frame sentence** |
| **the first control, at 390 × 844** | **347** | **233** |
| the wide arrival, 1280 × 900 | — | **`md5`-identical to `main`** |
| horizontal overflow, 1280 / 390 / 348 | none | none |

The wide `md5` is `41955176…`, which is the same hash the 17 and 18 September
reports quoted. It is the cheapest available proof that the layout this surface
is normally judged on did not move by one pixel: **everything below is
narrow-only.**

## The change

### `demo-bar.tsx` — three things on two rows instead of three

At 348 the bar wrapped once per child, so a two-word instrument reading
`revision 0` had a line to itself under a sentence that had a line to itself
under the mark. The disclosure is the only one of the three that wraps, so it is
the one given its own row (`basis-full`) and it takes the second (`order-last`);
the mark and the instrument share the first, which is where they are at every
other width.

**Order and not markup.** The document still reads mark, disclosure, instrument,
so what a screen reader meets is unchanged and *"a physiotherapy clinic that
doesn't exist"* still comes before the numbers rather than after them. A test
asserts that, beside the one asserting the classes — because the classes are
what a refactor drops and the reading order is what a refactor would not notice
it had inverted.

26px.

### `rail-header.tsx` — the referent stays, the instruction goes

The narrow-only line read *"It's the page below. Press something, then look for
the mark Loom leaves on it."* The first half is load-bearing: *"Ask **that**
page"* is only pointing at something when the page is beside you, and stacked it
is underneath. The second half told a stranger to go hunting on a 6,380px
document for something **the surface brings them to on its own.**

Measured by driving the stacked layout at 390 × 844 on `main`:

```
arrival        scrollY 0
press the lead scrollY 727   ← the card, which renders the part of the page
                               in question inside itself (part-in-question.tsx)
press Apply    scrollY 4,920 ← the mark on the page, with BackToTheRecord
                               pinned under it: "Loom wrote down what it just did"
```

Nothing was hunted for and no hand touched the scrollbar. The same walk on this
branch is 0 → 684 → 4,878; the difference is the two lines the sentence stopped
spending.

16px, and one instruction that was not true.

### `ask-panel.tsx` — the opening block is read in one order and laid out in two

The frame sentence — *"Loom weighs every ask before it lands: some changes it
makes on its own, some it won't make without asking you first. Either way, it
writes down what it did."* — was placed above the primary button on 17
September, for a reason that is still right: the lead is a change the Gate
**holds**, so the first press moves nothing, and a stranger who was not told that
has pressed the one thing this surface invited them to press and watched it do
nothing.

**What that reasoning is actually about is that the sentence is met before the
press, and this branch does not change it.** `flex-col-reverse lg:flex-col`
moves boxes and not the document: the sentence still precedes the form in the
markup, so a screen reader, a crawler and `ask-panel.test.tsx`'s existing *says
some asks will wait for you, before offering anything to press* all meet it
exactly where they did. What changes is where a sighted visitor's eye lands
below `lg` — on the button, with the promise and then the sentence directly
under it, all three inside the fold together, which is more than was true of any
of them before.

**This is a revision of another run's placement decision and it is narrow-only.**
At `lg` and above the order is what it was. It is written down here rather than
implied because reversing a reasoned decision on a subset of viewports is the
kind of thing that reads as an accident in a diff.

90px, and it is the change worth an eye on the preview.

### `rail-header.tsx`, the other half — out of the file a test cannot reach

The four opening lines were markup inside `page.tsx`. Nothing in them reads the
tree, the store or the revision, so there was never a reason for the surface's
`h1` to live in the one file in this lane a `vitest` run cannot cross — and
three runs of copy decisions about that header have shipped with nothing able to
assert one of them. It is a component now, with five tests, including the one
that keeps the withdrawn instruction withdrawn.

It is the **cheap half** of the 17 September finding's recommendation and it is
not a substitute for it. See the finding below: extracting the component
sharpened that finding rather than softening it.

## Decisions taken that were not specified

- **Narrow-only, and proven so.** Every change here is behind `lg:`, and the
  proof is the wide arrival's `md5` rather than a claim. This surface is judged
  on the laptop layout and a run that improves a phone by moving a laptop is not
  a run that improved anything.
- **Order utilities rather than a second copy of any string.** Both reversals
  could have been done by rendering two variants behind `lg:hidden` /
  `hidden lg:block`. Two copies of one sentence is the drift defect this lane has
  filed about twice; one copy in one place, laid out twice, cannot drift.
- **The instruction was withdrawn rather than reworded**, because what was wrong
  with it was not the words. It described work the visitor does not do.
- **The frame sentence was not shortened.** The obvious alternative to reversing
  the order was cutting it from four lines to two, which would have bought half
  as much and cost the sentence its two halves — what Loom does on its own, and
  what it writes down. The second half is the demo's entire argument.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all, and neither was
  the marketing route group whose band raised the measurement this run is about.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0, first time**, read off the run
rather than off a pipe:

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 154 | 2,807 |
| `@loom/app` | 281 | 4,913 |

703 findings, 0 malformed. 107 prerendered pages, 858 text junctions, 0 run
together.

The demo lane's own suite goes from **35 files / 454 tests** to **36 files / 463
tests** — **nine added, none weakened, none skipped** — counted per file against
a real run:

| file | `main` | branch |
| --- | --- | --- |
| `_components/rail-header.test.tsx` | — | 5 |
| `_components/demo-bar.test.tsx` | 3 | 5 |
| `_components/ask-panel.test.tsx` | 18 | 20 |

### The defect matrix

Run against the commit, not a working tree; each defect restored in turn and the
tree returned to `HEAD` between rows.

| defect restored | what fails |
| --- | --- |
| the bar's disclosure loses its own row | 1 test |
| the header's instruction comes back | 1 test |
| the opening block stops reversing below `lg` | 1 test |
| the primary button's promise leaves its form | 1 test |
| **`page.tsx` stops rendering `<RailHeader />` at all** | **nothing — 463 passed** |

**The fifth row is the standing finding and it got sharper today, not softer.**
Before this run, unwiring a reading from `page.tsx` left a `TS6133` for an
unused import — a stray line noticing itself, but a red build. A component is
unwired by deleting the element *and* the import, which is the edit anyone would
actually make, and then nothing is left to complain: the demonstration renders
with no heading, no `h1`, no *Live demo* and no claim, and `pnpm verify` is
green. Filed.

## Findings

**Filed two:**

- `Loom demo` — **the whole heading of the demonstration can be deleted and the
  suite stays green at 463.** The fourth data point on the 17 September
  `page.tsx` entry, and the first taken after moving something *out* of that
  file. Moving markup out buys assertions about what a component says and
  nothing about whether the page says it; only the second half is hard, and it
  is still `whatTheRailShows`.
- `Loom primitives` — **`adaptive`'s narrow ratio is no longer taking the
  demonstration's first control off screen.** Their 18 September entry measured
  the control 313px below the fold of the box and reasoned from it toward a
  taller narrow end. 132px of that came out of the demonstration today, so the
  concrete harm is gone and the default should not move on that number. The
  better idea in that entry — a narrow end that is a *height* rather than a
  ratio — is untouched by this.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-first**
consecutive run. The standing entry says everything a new one would. The cost
was nil again, and for the same reason as the last four runs: what decided this
unit was a ruler held against this repository's own pages in a real browser, and
no reference gallery has an opinion about how many pixels of chrome a 465px box
can afford.

**Carried, not closed.** The 16 September finding on the **automatic re-ask** is
untouched and still the largest thing open on this surface; it recommends being
designed before it is built and that is still the right order. The two 14
September findings — a `configure` never saying which way it went, and
`actions.ts` — are also untouched and still open.

## Open questions

Nothing blocking.

- **The reversal below `lg` is the judgement worth an eye.** A sighted visitor
  on a narrow screen now reads the button before the sentence that explains why
  the first press may not move the page. The sentence is on the same screen,
  directly under the button's own promise, which it was not before — but if the
  maintainer would rather a stranger read it above the button at every width,
  the change is one class and the arrival goes back to 356px of preamble in a
  465px box.
- **`page.tsx` is eight readings and four data points.** Recommended as this
  lane's next unit, unless a maintainer comment outranks it.
- **"Ask about just this"** — the scope control reasoned out in this lane's 22
  August finding, still the largest unbuilt idea here.

## The visuals

All five are driven against real `next build` outputs — `main`'s for the two
befores, this branch's for the rest — at 2× device scale with reduced motion, on
a first arrival with no session.

| | |
| --- | --- |
| [the embed, before](2026-09-19-demo-nothing-to-press-embed-before.png) | `main` at **348 × 465**, the size of this demonstration inside the front door on a phone: a three-row bar, a heading, three paragraphs, and the top 67px of a button |
| [the embed, after](2026-09-19-demo-nothing-to-press-embed-after.png) | the same box on this branch: whose page, what it is, the button, what it does, and what Loom does with every ask — and *or ask for one of these* peeking under it |
| [the phone, before](2026-09-19-demo-nothing-to-press-phone-before.png) | `main` at 390 × 844 |
| [the phone, after](2026-09-19-demo-nothing-to-press-phone-after.png) | this branch: the same screen with the lead 114px higher. **A standalone phone was never the problem** — at 844 tall every control was already in view on `main`, which is exactly why the box on the landing page is where this run's measurements were taken |
| [the wide arrival](2026-09-19-demo-nothing-to-press-wide-unchanged.png) | 1280 × 900, **`md5`-identical on both builds** — the layout this surface is normally judged on, untouched |

**To see it yourself:** open the preview at `/demo` and drag the window narrower
than 1024px, or open `/` on a phone and look at the band under **Your turn**.
