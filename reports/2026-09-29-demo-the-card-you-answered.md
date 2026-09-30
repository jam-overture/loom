# The card you answered

**Routine:** `Loom demo` · **Branch:** `demo-33-room-that-outlives-the-question` ·
**29 September 2026**

The thirty-fourth run of this lane, with no open pull request of its own — the
only branch open this morning was `Loom portal`'s #449. So: a fresh branch off
`main` at `8db2cfb`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900 and
390 × 844 with reduced motion. The `before` pair is the same harness run against
`main` at `8db2cfb`, built separately (`built 2026-09-29T20:04:03.423Z` against
this branch's `built 2026-09-29T19:55:13.027Z`). **The preview deployment is not
photographed and has never been by this lane**: the URL is on the pull request
and Vercel reports it Ready, and `*.vercel.app` is denied by the environment's
egress policy (`Loom portal`, 27 September).

---

## What a stranger could not understand before this run

**Which card they were looking at.**

The demo's one invited sequence is two presses: *Take the numbers off*, then
*Apply this change*. The second press is the whole argument — the page moves,
the badge turns to **Applied**, and the card grows the account of what happened,
the band the record is still holding, and the offer to put it back.

And on `main` that press opened the rail **mid-sentence**, on the words
*"undoes it."* The **Applied** badge was gone off the top, and so was the thing
the badge is about: the visitor's own sentence, in quotation marks, which is the
only line on the card that says *this is the change you asked for*.

It was not a layout that decided that. The rail keeps the scroll `AnswerInView`
took to put the **question** at its top, nothing re-takes it, and answering the
question takes the caution out of the panel and puts the green button back — so
everything above the card ends up shorter than it was when that scroll was
taken, and the card slides up under the fold by the difference. The difference
is not a designed number. It is a subtraction.

**And the other half was worse, because it was invisible.** The room the rail
needs to put a card at its own top (`roomToLand`, `lg:pb-[70vh]`) was given
*while a question was open* and taken back the moment it was answered. With it
gone the rail may no longer be able to reach the card's top at all: at 606px of
card the furthest the rail can scroll is 623 against a card top of 740, so the
browser clamps and the card lands *low* instead of high. **So what a stranger
saw of the demo's payoff was decided by whether the card happened to be taller
or shorter than the rail** — filed with the numbers on 28 September, by this
lane, as the thing to fix next.

## What a stranger can understand now

**That this card is the answer to the question they were just asked** — because
it opens where a card opens.

| | before (`main` at `8db2cfb`) | after |
| --- | --- | --- |
| the payoff frame, wide | `reports/2026-09-29-demo-the-card-you-answered-before-wide.png` | `reports/2026-09-29-demo-the-card-you-answered-after-wide.png` |
| the question, wide — **unchanged** | `reports/2026-09-29-demo-the-card-you-answered-question-unchanged.png` | same file, byte for byte |
| the same sequence on a phone — **unchanged** | `reports/2026-09-29-demo-the-card-you-answered-phone-unchanged.png` | same file, byte for byte |

The `before` frame's first line of rail is *"undoes it."* The `after` frame's
first line is **Applied**, and under it *"Take the numbers band off the page."*,
the plain sentence, *asked by a demo visitor*, the whole of **what Loom
weighed** in the Gate's own two questions, the rule that fired under which
policy, **You said yes**, and the band the record is holding with 3,400 and 24
and 92% in it.

**Two of the three pictures are one file listed twice, and that is the
strongest result in this report.** The phone pair and the wide question pair
came back with identical `md5`s across two separately built commits — so the
stacked layout and the first press are provably untouched, rather than argued to
be.

### What it costs, said plainly

**`Put it back` moves below the fold.** The applied card is 976px and the rail's
viewport at 1280 × 900 is 857px, so the card is taller than the frame and **one
end of it is always off screen**. On `main` the end that was off was the top;
here it is the bottom, and the button and the line under it are about 120px
down.

That is a trade rather than a win, and it is the trade this run chose:

- A card whose first line is *"undoes it."* cannot be identified at all. A card
  whose last line is off the bottom can be read from its beginning and scrolled.
- **One rule, two moments.** The question lands at the top of the rail; the
  answer to it lands at the top of the rail. The alternative — questions at the
  top, answers at the bottom — is two rules, and the second one exists only to
  rescue a button from an arithmetic nobody controls.
- The inverse is still **shown** on the frame, which is last week's unit: the
  band that came off the page is on screen with the sentence saying the record
  is holding it. What is one scroll away is the button, not the claim.

If the maintainer's eye disagrees, the change is one constant —
`ANSWER_ARRIVES` in `arrival.ts` — and it is deliberately the only place either
landing reads.

## The change

Three source files edited, one new, and five test files beside them.

### `_lib/landed.ts` — new, and it is the unit

`landedOnYourAnswer(records, revision)`: the record whose `answeredBy` is set
**and** whose `revision.produced` is the revision the page is at.

Both halves are load-bearing and the defect matrix priced each. `answeredBy`
alone names a card the visitor answered four presses ago and goes on naming it.
The revision alone names every change that ever landed, including the ones that
applied on their own — which are exactly the case `answer-in-view.tsx` argues
the rail must **not** move for, because the page moving is its own
announcement.

**It is not "the newest record", and that is the third thing it is not.** A
visitor can leave one question open, ask for something that lands on its own,
and answer the first question afterwards; answering folds onto the record that
was waiting (`session.ts`) rather than minting a new one, so the answered card
is not at the head of the list in that order. There is a test for that ordering
and it is the one a simpler predicate fails.

And it is a *reading* rather than a state: nothing is set and nothing has to be
cleared, because the revision it compares against is the page's. The moment
anything else lands it goes quiet on its own.

### `arrival.ts` — the room outlives the question by one press

`roomToLand` is given for the landing as well as for the question. Same
`lg:pb-[70vh]`, same reason, one more moment — and it costs the same band of
empty rail below the footer for one press longer.

**It is handed the rail rather than a boolean**, which is the small correction
attached to it. `page.tsx` is an `async` Server Component no `vitest` run can
mount, so `roomToLand(rail.waiting !== undefined || rail.landing !== undefined)`
would have been a condition nothing can check — the exact defect class `rail.ts`
was extracted to end, which turned up five readings unwired by deleting one
argument with the whole suite green. Asking for the two fields moves the *when*
into `arrival.test.ts` beside the *what*.

### `answer-in-view.tsx` — one more moment, and the rule that keeps it to one scroller

`onlyWhereTheRailScrolls`, set for the re-landing and never for the question.

**The design question the finding left open was how to be wide-only**, and the
answer is that wide is not the fact. The fact is *the rail is a scroller of its
own*: on a stacked layout the two panes share the document's scroller,
`SpotlightScroll` is already carrying the visitor down to the mark the change
left on the page — measured at `scrollY` 4,685, with the card 3,863px above them
— and a second component hauling that scroller back up to the card is two
opinions settled by whichever effect ran last.

A viewport width is a proxy for that, and the cheap way to read one is the way
`globals.css` argues against by name: *a media query is right between a resize
and a re-render and a mount-time read is not*. So the component walks up from
the card to the first ancestor whose `overflow-y` scrolls. It is read at the
moment the scroll would happen, it needs no listener, it is correct at any
width, and it names no breakpoint — so it survives the layout changing one.
`answer-in-view.test.tsx` holds the row that proves it is the scroller and not
the width: a **wide** viewport whose rail does not scroll gets nothing.

### `rail.ts`, `the-record.tsx`, `page.tsx` — the wiring, and one precedence

The reading is computed once, in the file every other reading on this surface is
computed in, and both halves read the same value — the room and the scroll
cannot be given to two different cards.

**One scroll at a time, and a waiting question wins.** A visitor may leave one
question open and answer another, and the two `AnswerInView`s would then be two
components hauling one scroller to two cards. A question the demo cannot proceed
without outranks a card that has already landed, and it is a ternary in the
markup rather than two conditions that can both be true.

## What it cost, measured

Read off the production builds' own screenshots, which are the element and the
frame rather than an estimate:

| | before (`main`) | after |
| --- | --- | --- |
| the payoff frame's first line of rail | *"undoes it."* | **Applied** |
| the applied card | 976px | 976px — untouched |
| the rail's viewport at 1280 × 900 | 857px | 857px |
| `scrollWidth` vs `innerWidth`, wide | 1280 / 1280 | 1280 / 1280 |
| `scrollWidth` vs `innerWidth`, phone | 390 / 390 | 390 / 390 |
| the first press, wide | — | **identical `md5`** |
| the whole sequence, phone | — | **identical `md5`** |

## Decisions taken that were not specified

- **Shape (2) of the finding was taken, and it was not sufficient alone.** The
  finding recommended keeping the room first. Keeping it makes the landing
  *reachable*; it does not put the card back, because the drift is the panel
  above it getting shorter rather than the scroll being clamped. Both halves
  shipped, and the matrix prices them separately.
- **Shape (1) was taken in substance and not in mechanism.** The finding called
  the re-landing "wide only, and wide-only in this lane means a `matchMedia`
  read at mount". It does not: the scroller is the fact and a width is the
  proxy, so there is no media query and no resize listener in this diff.
- **The declined answer gets nothing.** *No thanks* sets `answeredBy` too, but
  it produces no revision — so the reading cannot see it, by construction rather
  than by a filter. A declined change moved nothing and the visitor's next move
  is the panel, which is where they already are.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `src/` was not opened at all —
  `git diff origin/main -- src/ tools/` is empty.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, written to a file as the last
thing on its own line and read in a separate command (`EXIT=0`).

| suite | `main` at `8db2cfb` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 167 files / 3,280 | 167 / 3,280 — untouched |
| `@loom/app` (`apps/loom/`) | 328 / 5,684 | 329 / **5,704** |

`main`'s side of that was measured rather than quoted: `origin/main` checked out
and the app suite run against it on the same machine, `EXIT=0`.

**885 findings, 0 malformed · 118 prerendered pages, 1,304 text junctions, 0 run
together; 3 metadata conventions, 0 unserved ·** `pnpm shoot`: 1280 vs 1280
wide, 390 vs 390 phone, exit 0, no overflow at either size, on both builds.

The demo lane's own suite goes **666 → 686: twenty added, none weakened, none
skipped.**

### The defect matrix

Each defect restored in turn against this commit, the whole lane run against it,
and the lane restored with `git checkout` between rows. Baseline **686 passed**.

| defect restored | caught |
| --- | --- |
| the room is given for the question only, as it was | **1 test** |
| the re-landing stops yielding the shared scroller | **3 tests** |
| the list mounts the re-landing without the scroller rule | **1 test** |
| both scrolls are mounted at once, with no precedence | **1 test** |
| the reading drops the revision and keeps `answeredBy` | **2 tests** |
| the reading drops `answeredBy` and keeps the revision | **4 tests** |
| `rail.ts` computes the reading and never returns it | **1 test** |

Seven rows, seven caught, first pass.

**And one row is honest about being thin.** The last one is held by a single
assertion, and it is the positive one: the other three rail tests assert
`view.landing` is *undefined*, which a field that is never returned satisfies.
That is not a gap in the suite — the three refusals are the reading's and
`landed.test.ts` owns them — but it is worth saying which assertion is the
wire.

## Findings

**Closed one, filed one.**

- **Closed:** `Loom demo`, 28 September — *the rail keeps the scroll it took for
  the question after the question is answered, and what a visitor sees of the
  payoff card is decided by where the browser clamps it.* Both halves, plus the
  design question it left open.
- **Filed:** `Loom demo` — *`TheRecord` is handed four readings one prop at a
  time from a file no test can mount, and the spread that hands one over is the
  last unwirable line in this lane.* Pre-existing, not caused here, and the
  shape of the fix is named.

- **Appended**, to the 28 September entry on mangled links, as its eighth data
  point: this pull request's body was written three times and read back each
  time. A commit-SHA ref did not protect markdown images (4 of 4 broke), the
  raw host did not either (4 of 4), and `<img>` tags broke 2 of 4 — the last
  two, identical in form to the first two. The two clean ones are the
  before/after pair; the other two are in the pull-request comment. No mechanism
  offered.

**Re-verified, not re-filed:**

- `21st.dev` `EGRESS_BLOCKED`, a **thirty-first** consecutive run, one call.
- `*.vercel.app` denied from the sandbox (`Loom portal`, 27 September). This
  report and the pull request both say the pictures are from a local production
  build.

## Open questions

One, and it is the trade above.

- **`Put it back` is below the fold on the payoff frame**, because the card is
  976px in an 857px rail and one end is always off. This run put the top on
  screen and said why. If the maintainer's eye wants the bottom instead, it is
  `ANSWER_ARRIVES` in `arrival.ts` and nothing else — both landings read it, so
  the question's landing would move with it, which is itself an argument for
  leaving it where it is.
