# 2026-08-22 — Machinery: the lesson becomes a page

**Landed:** the lesson reader — `apps/loom/app/(lessons)/lessons/[lesson]/`,
`_lib/markdown.ts`, `_lib/lesson.ts`, `_lib/blocks.ts`,
`_components/lesson-reader.tsx` — plus the answer control's second mode, a
prediction record in `_lib/progress.ts`, a corrected `_lib/text.ts`, and the
`/lessons` section of `lessons/README.md`. All thirteen lessons now render at
`/lessons/01` … `/lessons/13`.

`pnpm verify` **green**: 1504 runtime tests across 101 files, 1162 app tests
across 95. Thirty of those are new here; nothing was skipped or weakened.

No new lesson this run, and no new review set. This is the machinery half of the
alternation, and it is the piece the last two reports named.

## Machinery rather than lesson 14, as promised twice

The 08-20 report said "machinery next run" and the 08-21 report chose lesson 13
over it, for a reason that expired the moment 13 landed: Set Q was owed with the
end of Part III. That debt is paid, so this is the run the alternation says is
machinery's, and the 08-21 report named the exact piece:

> `_lib/links.ts` says it plainly in a doc comment: *"Where a lesson's text is,
> which is not here yet"* — `lessonPointer` returns a GitHub blob URL, so every
> reference the surface makes to a lesson leaves the surface.

It is worse than "leaves the surface". The place it left to is the one place the
printed answers are visible with no machinery around them: a raw markdown file
where `## Answers` is a scroll below `## Self-check`. The queue would send a
reader who had just rated their confidence and written an answer to a page that
shows them six other answers on the way to theirs.

`lessonPointer` now returns `/lessons/07`. Nothing on this surface points out of
it any more.

## Reader feedback: nothing to address this run

Four pull requests are open — #132 (`Loom primitives`), #133 (`Loom framework`),
#134 (`Loom marketing`), #135 (`Loom docs`). None is this lane. No open lessons
PR, and no maintainer comment on anything this lane has landed. That is the same
nothing the 08-20 and 08-21 reports found, checked the same way.

## What the surface adds, and what it refuses to add

The brief's ordering was the design brief: *write your answer before revealing*
first, *confidence before reveal* second. Both already existed for review sets.
Neither existed for a lesson, which is where a reader spends the other ninety
percent of their time.

**1. The lesson does not exist until the predictions are written.**

Everything below `## Predict` is the answer to Predict — that is what
"generation before instruction" means, and on paper the answer is the next
paragraph. Here the page ends at Predict until every prompt has a confidence
rating and something written under it, one prompt at a time so question 3 cannot
tell you what question 1 was fishing for.

This is the one place the surface is *stricter* than the markdown rather than
more convenient than it, and it is worth being clear-eyed that it is a real cost:
a reader who wants to skim lesson 09 to remember one thing cannot, on this
surface. They can open the file. The markdown is still the source and still
readable by anyone, and the honour system is what reading it costs — the same
trade the review sets already make by having no printed answers.

**2. The printed answers moved, and they lock.**

Lessons 01–11 end with `## Answers`, which answers two different sets at two
different moments: `**Q1**`… belongs to Try it, `**1**`… belongs to Self-check.
A reader checking an exercise prediction has to scroll past the Self-check
questions to reach it, reading them on the way — the interleaving is gone and
nobody chose that.

So the section is cut in two and each half now stands under the questions it
answers. The Self-check half opens when every Self-check question has an attempt
recorded. The exercise half opens when the reader has written down what they
predicted the exercises would print — an answer box, not a checkbox, because
"did you predict?" answered by a click is a question nobody has ever answered
honestly.

The cut is made after the *last* `**Qn**` entry rather than before the first
numbered one. Lesson 08's Q1 answer contains the words `**medium**` and
`**high**` in bold, which are indistinguishable from an entry label; working
from the end puts the noise in the half it was written in. There is a test with
that exact shape in it.

**3. The predictions come back at Reflect, carrying their original rating.**

This is the piece I care most about and it is the one that is impossible on
paper. A prediction is stored with the confidence rated *before* the lesson, and
it is not an attempt — it has no grade, because the thing that would grade it has
not been read yet. At Reflect the reader is shown what they wrote, verbatim,
beside the number they gave it, and grades it. That pair — high confidence, wrong
— is what the course keeps calling the real study plan, and until now the course
could only ask the reader to remember a rating they gave twenty minutes and four
thousand words ago.

`Progress` gained a `predictions` record for it, separate from `sets`, because
an attempt and a prediction differ in a field that cannot be faked: whether
anyone knows yet how it went.

**What I did not build, deliberately.** `Explain it back` still renders as
prose. It is two elaboration prompts with no answers anywhere, so nothing is
being revealed early and a box there buys only bookkeeping. It is worth having
eventually, for the same reason the prediction box is: writing is the retrieval.
It was not worth having before the two gates above.

## The markdown had to be parsed, and that is the risky part

There is a block parser here (`_lib/markdown.ts`) covering exactly what the
lessons use: headings, paragraphs, ordered and unordered lists, fenced code,
blockquotes, pipe tables, rules. It is not a markdown implementation and the doc
comment says so. Blocks become Loom nodes in `_lib/blocks.ts`, composed from
registered primitives — `loom.prose`, `loom.code`, `loom.card`, `loom.heading`,
`loom.divider`, `loom.link` — with nothing invented.

The failure mode of a parser like this is not an exception. It is a page that
renders and is quietly wrong, and I hit exactly that:

**Predict rendered "Question 1 of 1" on lesson 13, which has three.** The list
parser ended a list at the first blank line, so questions 2 and 3 became a second
list block that `promptSet` never looked at. The page looked deliberate. The gate
was satisfied by one prediction. Every Predict section in the course separates
its questions with a blank line, so this was wrong on all thirteen lessons at
once and looked fine on all thirteen.

Two things now guard it: a parser that looks *past* a blank run for another item,
and a sweep test that parses every real lesson and asserts each question section
contains exactly one numbered list. The second is the one that would have caught
it. Any lesson written in a shape this parser does not understand fails the build
of all four surfaces rather than rendering short.

**A second wrong thing, found the same way.** `referencedLessons` reads the
`*(06, 11)*` markers that say which lessons a question reaches back into, and it
returned only the first number. Seven questions in `review-schedule.md` name two
or three lessons; every one of them has been offering the reader one place to
check. An interleaved question with a single pointer reads as an ordinary one,
which is the opposite of what those sets are for. Fixed here, in this lane's own
`_lib/text.ts`, with the multi-number case in the tests — not filed, because it
is mine and it is four lines.

## Executed, not assumed

No lesson exercises this run, so no `src/scratch.test.ts` — but the same rule
applied to the machinery, and it caught both bugs above. Everything below was
run, not reasoned about:

- **The build renders all thirteen lessons.** `renderFragment` throws on any
  render diagnostic, so a primitive refusing one prop anywhere in eleven thousand
  lines of lesson markdown fails `next build`. All thirteen prerender.
- **A browser walked lesson 13 end to end** — five warm-up questions, three
  predictions, the body unlocking, six Self-check questions, the predictions
  returning at Reflect with their ratings, the worked-through date. And lesson 11
  for the tables, the seven-exercise Try it, and both locked answer halves
  opening in the right order.
- **Thirty tests**, of which the ones that matter assert absences: the
  explanation is not on the page, the printed answer is not on the page, the grade
  buttons are not on the page.

## Found while teaching

**Two findings, both for `Loom primitives`, both filed in `FINDINGS.md`.**

**There is no list primitive and no table primitive.** The starter library has
seven list-shaped primitives and every one is a list *of something* — links,
perks, milestones, FAQs. An ordinary numbered list of prose, which is what every
Warm-up and Self-check section is, has nowhere to go: it is currently a column of
`loom.prose` with the number concatenated into the text, which means the number
is content and a delta that reorders two questions leaves both numbers where they
were. Tables are the same gap: `loom.tier-table` is a pricing band by its own
admission, so a three-column table becomes one card per row with each cell
labelled. Both render acceptably. Both are the places a reader can tell the
library was designed for landing pages first, and three of the four surfaces are
documents now.

**An internal link still cannot be expressed in a tree.** Already filed on
19 August and still open; restated because this is a second surface hitting it
without the first one's workaround. Every lesson opens with a prerequisites line
of twelve links to other lessons, all of which are pages in this same
application, and `loom.link` requires an absolute URL. They render as bare
numbers. Marketing resolves an origin per request and lives with it; a statically
exported course has no origin to resolve. A course whose entire structure is "you
need 04 before you read 09" cannot say so in a way the reader can click.

**One thing I noticed and did not file**, because it is a judgement rather than a
defect: the lesson title renders as a `loom.heading` at level 1, which under
`minimal`/`precise` takes four lines and most of the first screen for a title
like 13's. It is a legitimate editorial look and shrinking it would mean this
lane naming a font size, which 0067 forbids. If it reads as too much, the fix
belongs in the theme.

## A limit worth stating plainly

The gates are client-side. The locked text is in the page's data before it is on
the screen, so a reader with developer tools can read an answer without writing
one. I have not built a server round-trip to prevent that and I do not think it
is worth building: a reader who opens devtools has made a decision, and the
course cannot help someone who wants to cheat themselves. A reader who *scrolls*
has made no decision at all, and that is the one this fixes.

## Needs your input

**Nothing blocking.** One question and one offer.

**Is the whole-body gate too much?** Reading a lesson on this surface now
requires writing every prediction first, with no skim path. I believe that is
right — it is the difference between a course and a document, and generation
before instruction is the principle the syllabus is built on — but you are the
reader, and if you want to reread lesson 09 to check one thing you currently
cannot. The escape hatch that exists today is the markdown file. If you want one
on the surface, the honest version is a link that says what it costs, not a
button that quietly turns the course off.

**The `configure` rendering asymmetry from 08-21 is still open**, and still
one sentence from you either way: `renderDelta` prints a `configure`'s prop keys
without values and an inserted node's props in full. It sits in lesson 13 as a
judgement call for the reader rather than as a finding.

## Next

**Lesson 14 — Rendering**, which opens Part IV, with a new interleaved set to go
with it. The material is reachable and settled: `src/render/`, 0008 (the
renderer is a total pure projection), 0050 (namespaced props, the root mounts the
theme), 0051 (a slot is a region the primitive places).

It is also the lesson this run makes easier to write honestly. Everything above
is a projection of a lesson built for one consumer's job — a reader who must not
see an answer yet — and 14 is about the projection whose consumer is a person.
The course now contains a worked example of its own subject.
