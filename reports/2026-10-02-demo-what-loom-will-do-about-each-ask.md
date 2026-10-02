# What Loom will do about each ask, said before anybody presses one

**Routine:** `Loom demo` · **Branch:** `demo-36-what-loom-will-do-about-each-ask`
· **2 October 2026**

The thirty-seventh run of this lane, with no open pull request of its own — the
two open this evening were `Loom portal`'s #463 and #483. So: a fresh branch off
`main` at `f4d2b9c`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844
and 348 × 465 with reduced motion. The `before` pictures are the same harness
run against `main` at `f4d2b9c`, built separately. Every number is read off
those two builds by driving them and measuring the boxes.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458, whose one open question was answered by the run of 1 October.

---

## What a stranger could not understand before this run

**That Loom's answer is different for different asks** — which is the whole
product, and the one thing the arrival screen declined to say.

The first sentence a stranger read was:

> Loom weighs every ask before it lands, and writes down what it did.

Every word of it is true. It is also true of **every ask ever made**, which is
why it proved nothing about any of them — the same defect the hedge it replaced
had, one run earlier, caught at a lower altitude. A visitor could read it, look
at five buttons, and have no way to tell whether *weighs* meant anything at all
until they pressed one. Most strangers press nothing.

It now reads:

> **You can ask for 5 changes here. Loom will make 2 on its own and ask you
> first about 3.**

**Nobody wrote the 2 or the 3.** `composeChange` interpreted, analysed, assessed
and gated each of the five asks against the tree being rendered, under
`demoPolicy`, with each preset's own interpreter, and stopped at the verdict
without writing (0021). The sentence is a tally of what came back.

And three hundred pixels down, each remaining ask carries the same verdict as
two words at the end of its own row:

| | |
| --- | --- |
| Re-theme the whole page | **GOES AHEAD** |
| Repaint the top band | **GOES AHEAD** |
| Add the opening hours | **ASKS YOU FIRST** |
| Move the testimonial up | **ASKS YOU FIRST** |

That is what makes the count a measurement rather than a better promise. A
stranger does not have to take *2 and 3* on trust: the rows are the two and the
three, named, and the green button's own verdict — *Pressing this raises a
question, not a change* — is the fifth. Press it and watch it come true.

**This is the fact no competitor's demonstration can carry.** An AI rewriting a
page is the least novel thing here; `docs/rollout.md` says so. Only a governed
one can say, with nothing pressed, *this one I will just do, and that one I will
stop and ask you about* — and be checked on it fifteen seconds later.

| | |
| --- | --- |
| [the arrival screen, wide](2026-10-02-demo-what-loom-will-do-about-each-ask-after-wide.png) · [before](2026-10-02-demo-what-loom-will-do-about-each-ask-before-wide.png) | the count, in the pixels the claim used to hold |
| [**the four rows**](2026-10-02-demo-what-loom-will-do-about-each-ask-after-asks-wide.png) · [on a phone](2026-10-02-demo-what-loom-will-do-about-each-ask-after-asks-phone.png) | **the picture worth opening** — two and two, as the sentence said |
| [the arrival screen, phone](2026-10-02-demo-what-loom-will-do-about-each-ask-after-phone.png) · [before](2026-10-02-demo-what-loom-will-do-about-each-ask-before-phone.png) | the count above the fold at 390 × 844 |
| [the question, one press later](2026-10-02-demo-what-loom-will-do-about-each-ask-held-unchanged.png) | **unchanged, byte for byte** |
| [the payoff, two presses later](2026-10-02-demo-what-loom-will-do-about-each-ask-after-applied-wide.png) | unchanged but for one pixel of scroll clamp |

## What specifically failed, diagnosed before anything was built

The brief names five ways a demo can be clunky. The run of 1 October measured
this surface against all five and found the fourth and the fifth: *the
interesting part is below the fold*, and *nothing to react to on arrival*. It
fixed the half of the fifth that it could — the leading button's own verdict —
and filed the rest.

Used cold this evening, with that fix on `main`, the one that remained is
sharper than either and is a sixth the brief does not list: **the first screen
made a claim a stranger had no way to check.** Four paragraphs of prose, one
green button, and the only sentence about what Loom *is* was unfalsifiable. A
surface whose entire argument is *you can see what it decided* opened by asking
to be believed.

So the fix is not more words, fewer words, or moving anything. It is **the same
sentence with the hedge taken out** — turning the one claim on the screen into
the one number on the screen.

## The change

Two modules added, one extended, two files rewired, and five test files.

### `_lib/what-it-will-say.ts` — one verdict becomes a keyed set

`whatEachWillSay(tree, available, ids, clock)` runs the real pipeline once per
ask the panel is offering and returns the answers keyed by preset id. An ask
that reached no verdict is **absent** rather than present with a hedge, which is
the restraint `willSayOf` already exercises and is what keeps the count honest:
what is counted is what was answered.

`WillSay` gains `standing` — `on-its-own`, `asks-you` or `refuses`. Not a fourth
vocabulary: the same three outcomes `willSayOf` already branches on, named from
the visitor's side rather than the runtime's, and carried as a value so that a
row can wear two words without parsing a sentence.

### `_lib/how-many-wait-for-you.ts` — the count, pure

`howManyWaitForYou(says)` takes verdicts and returns the four numbers and the
sentence. No pipeline, no tree, no policy: it is arithmetic and grammar, so the
**words** are testable with no runtime and the **verdict** is testable with no
words. That split is what lets `pipeline.test.ts` assert the join.

It says nothing about one ask, or none. A split of one is not a split, and the
sentence would restate the verdict already sitting under that ask's own button
in more words.

### `_lib/what-each-row-says.ts` — the two words

Three strings, forward tense, total over `AskStanding`. **Deliberately toneless:**
amber on this rail means *there is a question open and it is yours*, and four
amber marks for four questions nobody has raised would make the arrival screen
look like a screen with work on it. The chip treatment is the header's, because
a bordered mono 2xs is already this screen's word for *a fact about the thing
beside it, stated flat*.

### `ask-panel.tsx` — two readings, both where a test can reach them

The claim gives way to the split; the rows gain their markers; and **the panel
took over two readings that would otherwise have been `page.tsx`'s.** The lead's
own verdict is now a lookup and the split is a pure function of the values, so
the page hands over one prop rather than two and gained no new argument it could
silently drop. That is this lane's open finding of 29 September getting slightly
better rather than slightly worse, which is the first time in three runs.

### `page.tsx` — one call, no decision

`whatEachWillSay(tree, rail.available, …)` in place of `whatItWillSay(tree,
rail.leading?.preset, …)`. Which asks are on offer is `rail.ts`'s reading, handed
straight through. The only thing this file does is the `await`.

## Measured, on the two production builds

Driven and the boxes read off the page, at 1280 × 900:

| | before (`main` at `f4d2b9c`) | after |
| --- | --- | --- |
| the claim | 215, **37px** (two lines) | 215, **37px** (two lines) |
| the lead button | 268, 53px | 268, 53px — untouched |
| the verdict | 351, 32px | 351, 32px — untouched |
| *or ask for one of these* | 773 | 773 — unmoved |
| the first marked row | 797 → 860 | 797 → 860 |
| the last marked row | 998 → 1061 | 998 → 1061 |
| the rail's content | 1,261px | **1,276px** |
| the rail's viewport | 857px | 857px |
| `scrollWidth` vs `innerWidth`, wide | 1280 / 1280 | 1280 / 1280 |
| …phone | 390 / 390 | 390 / 390 |
| …embed | 348 / 348 | 348 / 348 |

**Nothing moved.** The new sentence is the same two lines the old one was, in the
same 37 pixels, so every box below it is where it was. The rail's content grew
**15px** in all, which is four rows each about four pixels taller: the label and
its marker are a baseline-aligned flex row where the label was a bare inline
span, and a flex line box rounds differently. It is said here because it is the
one number in the table that moved and nothing would have caught it.

**Every `after` picture here is byte-identical to a fresh shot taken from the
final committed build**, re-run after the gate went green on the head commit:
all six `md5`s match. They are pictures of the code in this pull request and not
of an intermediate one. The shot list is committed beside this report.

**The question frame is byte-identical**, and now across four separately built
commits: `held-unchanged.png` has `md5` `79cae639175ffc88a14d8c04a2f22cbe`, which
is the hash the 1 October run recorded for the same frame. The moment a stranger
decides is provably untouched rather than argued to be.

**The embed's first screen is byte-identical too.** At 348 × 465 the `before` and
`after` files have the same `md5` (`5e8fca8c6c7486f5fb64dbd20fd5dbf2`): the
sentence that changed measures 487–524 and that frame's fold is 465, so the words
moved and the picture could not. The verdict's third line is still clipped by
**6px** at that size — unchanged from 1 October, not fixed here, and the reason
is the one that run gave.

**And the payoff card is unchanged**, measured rather than asserted: the two
`applied` pictures differ only where the browser clamps the scroll, because the
rail above them is 15px taller. The card itself is the same frame.

### What it costs

Five runs of the Gate on a render instead of one. Timed in a `vitest` process
against the starting tree: **6.57ms, 1.78ms, 2.14ms, 1.86ms, 1.73ms** — about
**14ms in all**, of which the first carries the module's warm-up and the other
four are the honest per-ask figure. It is a tree walk and no key: the presets are
deterministic interpreters (0057), which is the whole reason a governed verdict
can be free.

**What is still unmeasured is a cold serverless invocation**, which is this
lane's open finding of 1 October — and this run does not improve it, it
multiplies it by five. The entry is appended to with these numbers rather than
quietly outgrown. At 14ms warm the right action is to know the number; the entry
says what would change that judgement.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `f4d2b9c` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 173 files / 3,560 | **173 / 3,560** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 359 / 6,322, 0 skipped | **361 / 6,346**, 0 skipped |
| the demo lane, measured | **716** in 47 files | **740** in 49 files |
| findings | 949 | **949**, 0 malformed — three appended, none filed |

**+24 lane tests, all written**: seven in `how-many-wait-for-you.test.ts`, six
in `what-it-will-say.test.ts`, six in `ask-panel.test.tsx`, four in
`what-each-row-says.test.ts` and one in `pipeline.test.ts`. Both totals moved by
exactly 24, so none of it is a file-driven sweep picking up the two new modules —
every one was written. Nothing weakened, skipped or deleted. 124 prerendered
pages, 1,461 text junctions, 0 run together.

**The one test that earns its place over all the others** is the last of those.
`pipeline.test.ts` already held each foretold verdict against its own press. The
new row holds the **arithmetic over all of them** against five real presses: every
ask the panel offers is run through the write path into its own session, the
outcomes are tallied, and the tally has to be the one the sentence claims. A
count is a far stronger claim than the five sentences it summarises, and the
failure it is really there for is a split taken over the wrong set — one counting
the preset table rather than the asks on offer reads *5* over four rows the first
time a visitor opens a question.

**It went red twice during the unit, and once more in the matrix.**
A first version of the join test tallied `"awaiting-confirmation"`, which is the
runtime's word for a composition outcome and not `RecordOutcome`'s word for a
held record (`awaiting-you`) — so three real holds counted as zero and the test
said so. And a formatter run reached for out of habit was not this repository's:
there is no Prettier here, and the one on the npm registry rewrote 641 lines of
`ask-panel.tsx` with semicolons. Both files were restored from `git` and the unit
reapplied before anything was committed; the lane's own hazard of 1 October, in
a new place, and caught by the diff's size rather than by a test.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored from `HEAD` between rows — which is only safe because
the unit was committed first, and that is this lane's own finding of 1 October
being obeyed rather than rediscovered. Baseline **740 passed**.

| defect restored | caught |
| --- | --- |
| the panel counts the preset table instead of what it is offering | **34** |
| the two clauses swap, so the count says it the wrong way round | **6** |
| the lead's verdict is looked up under the wrong key | **4** |
| the read path judges under the shipped default instead of `demoPolicy` | **4** |
| the split is never used — the claim never gives way | **3** |
| a held ask is marked as one Loom goes ahead with | **2** |
| a split of one is printed, restating the verdict directly above it | **2** |
| every row reads the same, so the count proves nothing | **1** |
| a refusal is marked as one Loom goes ahead with | **1** |
| the *page* counts the preset table instead of the asks on offer | **0** |

**Nine of ten, and the tenth is not a defect.** Handing `whatEachWillSay` every
preset id rather than `rail.available` changes nothing a visitor sees: the panel
counts and marks what **it** is offering, so an extra answer in the set is
ignored, and the cost is a tree walk nobody reads. That is the shape of this
change working — the readings moved off `page.tsx` and into a file a test can
mount, so the one thing the page can still get wrong is wasted work rather than a
wrong sentence.

**Two of the ten were caught only after a test was written for them.** The first
pass left *a refusal is marked as one Loom goes ahead with* at **0**, and it was
the honest result: nothing on the shipped preset table is refused against the
starting page, so that branch of `willSayOf` is unreachable from every other test
in this lane, and a standing that collapsed it into *goes ahead* would have left
every sentence on the screen correct and the arithmetic over them wrong. One
test now asserts all three standings directly. The other was a badly built
defect rather than a gap — a policy spread that changed no field the Gate reads —
and it is in the table above as the real thing, rebuilt and caught four times.

## Decisions taken that were not specified

- **The excerpt was not folded, and it is now the thing in the way.** See the
  finding below: the 1 October entry's own recommendation was *leave it until
  something else needs the pixels*, and this run is that something. Reopening a
  closed, deliberate decision in the same pull request as a new idea would make
  both harder to review and would cost the maintainer the ability to take one and
  not the other, so it is written up with the new argument and left.
- **The lead gets no marker.** Its verdict is the two sentences under the green
  button, which are strictly more than a row says. A row for it as well would be
  one fact twice on one screen in two vocabularies.
- **The sentence counts the panel, not the preset table.** `already-asked.ts`
  withdraws an ask while its question is open, so the count shrinks with the list
  it describes. A sentence that went on saying *five* over four rows would be the
  first thing on this screen a stranger could catch out.
- **The three-clause grammar is written and cannot be reached.** Nothing on the
  shipped table is refused against the starting page. It is held by a test anyway,
  because a table somebody adds to can reach it and *make 2 on its own, ask you
  first about 2 refuse 1* is the kind of defect nothing fails on.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The folded reasoning on an answered card is still labelled in the present
tense** — this lane's open finding of 30 September, carried a second run. It is
small, it is a copy decision about the payoff card, and folding it into a unit
about the arrival screen would have made both harder to review.

**The still life was not reclaimed**, which is the subject of the finding below
and is the honest limit of this run: the count landed above the fold and the
rows that prove it did not.

## Findings

**Filed none, appended three, closed none.**

- **Appended**, to this lane's 1 October entry *the demo's first screen spends
  42% of itself on a still life*: **something now needs the pixels.** That entry
  recommended leaving the excerpt alone until something did, and this run is the
  something — the count is above the fold at 215 and the four rows that make it
  checkable begin at 797, in an 857px scroller. Recommendation moves from (1)
  *leave it* to (2) *fold the excerpt behind a disclosure*, with the argument
  written out.
- **Appended**, to this lane's 1 October entry *the arrival screen now runs the
  Gate on a render*: it is now **five** runs per render, with this evening's
  measured numbers, and the entry's own recommendation re-read against them.
- **Appended**, to the 30 September entry for `Loom daily build` about what a
  shot list cannot see: a **fifth** consecutive throwaway `playwright-core`
  script, and the first where the harness got the *picture* and only the numbers
  needed a private instrument — `scrollTo` photographed the four rows in one
  shot, and the box table above still took a script that was then deleted.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-fourth**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**One, and it has a recommendation.** Whether to fold the excerpt. It is in
`FINDINGS.md` and in the comment on the pull request.
