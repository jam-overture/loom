# 2026-09-08 — The answer was in the page the whole time

**Landed:** `_lib/held.ts`, `_lib/held-render.ts`, `_lib/parts.ts`,
`_components/held.tsx`, a static route handler at
`/lessons/[lesson]/held/[part]`, the reader and the lesson page rewired onto
them, three new test files' worth of assertions, the `/lessons` section of
`lessons/README.md` rewritten to say what is now true, and this report.

`pnpm install && pnpm verify` **green in full** — 1860 runtime tests across 119
files, 2578 app tests across 165 files, `next build` prerendering **122 pages**,
up from 84. The 38 new ones are the held addresses.

**Machinery, not a lesson.** Yesterday's run said it would rather write
machinery this time than go looking for a lesson to justify Part V, and this is
that. It is also the machinery that was most worth writing, because the surface
was making a claim it could not keep.

## The defect

Every gate on a lesson page decided what to **render**. The content was rendered
on the server, handed to a client component as props, and the component drew
some of it and not the rest.

Content handed to a client component is in the page. Not in the markup — the
reader draws nothing until it has read `localStorage`, so the HTML a browser
receives says "Reading what you have done so far…" and no more. It is in the
flight payload inlined into the same file, escaped, one `Ctrl-U` away and
searchable. Built from yesterday's tip and grepped:

```
$ grep -c "linter reads source text" .next/server/app/lessons/01.{html,rsc}
.next/server/app/lessons/01.html:1
.next/server/app/lessons/01.rsc:1
```

That string is the first printed answer of lesson 01, which the page says is
locked until the Self-check questions above it have been attempted. It was in
the page, on every visit, before a single question was answered. So were the
other twenty in lesson 10, and every transcript in Try it.

The reason nobody noticed is the part I would keep if I could keep one thing
from this run. `lesson-reader.test.tsx` opens with:

> Every test here checks that something is *not* on the screen … Those absences
> are the entire argument for this surface existing.

Six tests, all passing, all asserting the wrong absence. *Not on the screen* was
true and was never the claim worth making; the honour system already governs
what a reader looks at. The claim worth making is *not in the document*, and no
test in this directory could have failed on it, because the component under test
is handed the answer either way.

## What replaced it

A held fragment is not rendered at all until it is earned. It is built at its
own address, served as **the tree it is**, and fetched by the reader at the
moment the gate opens. What the page carries meanwhile is a URL and a slot name.

- `_lib/held.ts` — the vocabulary: three held parts (`transcripts`,
  `exercise-answers`, `self-check-answers`), one address each, and the argument
  for why this is the right standard, next to the parts it names.
- `_lib/parts.ts` — the cut, moved out of the page because the page and the
  route handler now have to agree exactly about what is in each part. It returns
  `{ parts, held }`: what the reader is given, and what the reader is not.
- The route handler — static, prerendered, one per held part per lesson. It
  renders each tree once and throws it away, because `renderTree` throws on a
  diagnostic and that guarantee was free while every fragment was rendered on
  the way to the reader. A fragment that leaves as data would otherwise fail in
  the browser, in front of the one person this course is for.
- `_components/held.tsx` — the fetch, deduplicated per address so six
  transcripts unlocking together cost one request, and the renderer loaded by a
  dynamic `import()` so a reader who has unlocked nothing never pays for the
  starter primitive library.

**Served as trees rather than as markup**, which was not a stylistic choice.
`parseTree` is the runtime's boundary parse and this is exactly the moment it
exists for: content this code did not build, arriving from the network, about to
be walked. It also means an answer that arrives late is composed through the
same registry as the paragraph above it, with no second and laxer path into the
surface for HTML to come in by.

## What I am claiming, and what I am not

This is not secrecy and cannot be. The addresses are guessable, and every answer
in this course is in `lessons/NN-*.md`, which the reader owns. The standard a
static surface can actually meet is the one the review sets have met since they
were built, and `README.md` had already written the sentence for it: *going to
get an answer is another retrieval.* Nothing you have not earned is in the
document you are reading.

One gate is still a slice rather than an absence, and I have said so in the
README rather than quietly leaving it: the lesson body under Predict is still
shipped with the page and held back. An explanation is not an answer, and it is
a scroll away in the markdown either way. Moving it would take a second address
per lesson and would buy the reader nothing they cannot already have by opening
the file.

## Found while teaching — and this one is mine

Reading `## Try it` closely enough to hold its transcripts turned up something
worse than the payload leak, in my own lane, put there by earlier runs of this
routine.

**Nine lessons print their own exercise output as prose.** From lesson 12
onward, every exercise is written as: the `ts` fence, then *"Predict, before
running: how much of the original prompt appears again?"*, then **"The
output:"**, then an untagged fence containing the answer. Fifty-odd of them.

On paper that is the only thing paper can do, and the instruction to predict
first is the honour system working as designed. On the page it was an answer
rendered as ordinary content, a line under its own question, behind no gate at
all — while the machinery three lines above it carefully held back the
*runner's* copy of the same output. The surface was holding a duplicate of
something it was printing in full.

It is fixed here rather than filed, for two reasons. It is this lane's own
defect, so there is nobody to file it to. And a pull request claiming the
answers are no longer in the page, while nine lessons print their answers in the
page, would be the overclaim this course cannot afford: a lesson that lies about
what the code does is worse than no lesson, and so is a surface that lies about
what it is holding.

The fix uses the same mechanism and no markdown changed. An untagged fence
inside Try it is the printed output — that is true of every one of them today,
and of nothing else in the section — so it becomes a slot in the same held
document, opens under the same gate as the transcripts, and appears exactly
where the author put it. Before it opens, the page says what is missing and why,
so "The output:" is not followed by silence.

## Evidence

The change is invisible in a screenshot by construction: the screen looked
right before, and looking right was the bug. What it can be shown by is the
build. Yesterday's tip and this branch, both built, both grepped:

| Lesson | What | Before | After |
| --- | --- | ---: | ---: |
| 01, 03 | first printed answer | 1 | 0 |
| 04 | first printed answer | 2 | 0 |
| 05–09, 11 | first printed answer | 4 | 0 |
| 10 | first printed answer | 20 | 0 |
| 12, 15, 16, 19 | first printed output fence | 4 | 0 |
| 20 | a transcript line (`is not a framable origin`) | 2 | 0 |

Lesson 02 and several output fences are absent from the table rather than clean:
the sentence I sampled contains a quote or an entity that the payload escapes
differently, so the grep reads 0 in both builds and says nothing either way. I
have left them out rather than counting them as a pass.

The control matters as much as the counts: a sentence from lesson 01's **The
idea** is still 1 and 1, so the grep does find payload text — it is escaped
inside `self.__next_f.push`, and the answers used to be sitting beside it.

Lesson 20's two occurrences going to zero is the pair of leaks in one number:
one was the runner's transcript in the payload, one was the lesson's own printed
copy in the rendered content.

## Three tests that could have failed before, and now can

- `_lib/parts.test.ts` — the answer text is searched for in
  `JSON.stringify(parts)`, which is the closest thing a test has to the flight
  payload. This is the assertion the directory did not have.
- `lesson-reader.test.tsx` — `expect(fetching).not.toHaveBeenCalled()` before
  each gate. Not having asked for something yet is a claim that cannot be true
  of content the page is carrying, which is what makes it the right assertion.
- `_lib/held-render.test.tsx` — every fixture goes through
  `JSON.parse(JSON.stringify(...))`, because a tree that renders in the process
  that built it and not in the one that fetched it is the failure this split
  could introduce.

One thing I changed my mind about while writing them. I first mocked
`held-render` in the reader tests, to keep them about the reader. The mock was
applied in one test and bypassed in another in the same file — I did not chase
down why, because the right answer was to stop mocking: the fixtures are now
real trees, serialised and parsed by the real boundary parse, and a fixture the
real renderer would refuse can no longer pass.

## One thing in the runtime path

`runExercises` now memoises by program text. Two callers ask for the same output
— the page, which counts the fences that print so it knows how many predictions
it is owed, and the held address that serves what they printed — and running
twice would be waste that could disagree with itself. A program printing from a
different set of fences on the second run would leave the reader predicting
against a slot that arrives empty.

## Where to look

The preview is
`https://loom-git-lessons-29-the-answ-d136eb-jpizzolato36-6341s-projects.vercel.app`.
`/lessons/20` is the lesson to open — commit the two predictions and scroll to
Try it. `/lessons/01/held/self-check-answers` and `/lessons/20/held/transcripts`
are the held documents themselves, which are worth opening directly: they are
guessable and readable without answering anything, which is the limit this run
is claiming and not overclaiming.

## Conflicts

This branch is cut from `lessons-28-origin` (#249), which is cut from #247,
which carried #226, #233, #239 and #244. **`main` has not moved since
1 September.** Seven units of this lane are now in one tree, and that is three
consecutive runs of stacking. #249 asked whether to stop and build on `main`
instead; nothing was said, and the honest reading of silence is that the stack
is what there is. I have said it again in the pull request, more plainly: this
is the last run where I will assume it.
