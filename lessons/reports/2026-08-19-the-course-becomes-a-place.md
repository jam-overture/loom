# 2026-08-19 — Course machinery: the review queue, and answers before reveals

**Landed:** `apps/loom/app/(lessons)/` — the lesson index, the review queue, and
one page per review set that runs it a question at a time. Plus a pointer in
`lessons/README.md` and one in `lessons/review-schedule.md` to the surface that
now keeps their tracking table.

**No lesson this run, and no lesson text changed.** The next lesson in the
syllabus is 12, Projection.

## Why machinery rather than lesson 12

The brief allows alternating once `(lessons)/` exists, and it started existing
yesterday — #98 scaffolded the route group with a single page saying the course
was being built there. Two things made this the run to spend on it.

**The ask is fifteen days old.** The maintainer asked on 4 August for the lessons
to be hosted and interactive, because *"markdown files are not the most
interesting"*. Eleven lessons have been written since and none of them is on a
screen. 0067 names this explicitly in its consequences: *the lessons course stops
being markdown files… a route group is what makes it possible.*

**Lesson 12 is not urgent and this was.** Projection is settled enough to teach
and will still be settled next run. A scaffold with nothing in it, on the other
hand, is the state where another routine reasonably wonders whether the lane is
being used.

## What was built, and the one thing it is for

The priority list in the brief is in order of how much the method loses on paper,
and the first three are one thing: **the honour system is where retrieval
practice dies.** So the build is a queue and a control, not a reader.

### The control: rate, write, check, grade

`_components/answer.tsx` enforces a sequence a page cannot:

1. **Confidence first**, 1–5, before there is anywhere to type. A rating given
   after you have seen how it went is a memory of a rating.
2. **Then the answer box.** Submit is disabled on an empty answer; the only way
   past without writing is a button that says "I can't retrieve this" and records
   a real attempt with an empty answer.
3. **Then where to check** — the lesson this set follows, plus every lesson the
   question is marked as reaching into. **Not the answer.** The review sets have
   no printed answers, which turned out to be a gift rather than a gap: what
   unlocks is a pointer, and going to get the answer is another retrieval.
4. **Then the self-grade**, which paired with step 1 is the only way calibration
   is measurable at all.

Seven tests in `answer.test.tsx`, and almost all of them assert that something is
*not* on screen yet. That is the whole value of the control over paper.

### The queue: what is due, from what was actually done

`_lib/schedule.ts` parses `review-schedule.md` into fourteen sets — anchor,
delay, questions, and the `*(04)*` markers as data rather than punctuation.
`_lib/queue.ts` turns a set of completion dates into a due date per set. The
clock is a parameter and not a call, which is lesson 05's argument used rather
than described, and it is why the schedule can be tested at all: a spacing test
against the real clock passes tomorrow for a different reason.

The one thing the machine cannot derive is **when a lesson was worked through**,
so the index asks, and allows backdating — a reader logging eleven lessons today
would otherwise be told all fourteen sets are due at once.

**One sitting is offered at a time.** With eleven lessons logged the queue really
does compute thirteen overdue sets, and a page that offers thirteen sets as an
afternoon's work has handed the reader massed practice dressed up as catching up.
Today's sitting is one set; the rest are listed second, under a sentence saying
why doing six of them now is worth less than one a day for six days.

### Composed, not marked up

Per 0067 the prose goes through the registry: every question, heading and note on
these pages is a `loom.prose` or `loom.heading` in a small tree, rendered by
`renderLoomTree` against `createStarterPrimitiveRegistry()`. The furniture — the
answer box, the confidence buttons, the queue — is application furniture as the
brief allows, and it still names no colour: it styles itself from the same
`--loom-*` variables the theme mounts, so a re-theme moves the buttons with the
paragraphs.

`renderFragment` **throws on any render diagnostic**. A node whose props the
registry refuses takes its subtree with it, which would show up as an empty card
asking the reader to answer nothing. Failing the build of all four surfaces is
the better failure, and it caught its own first bug: `gap: "small"` is not a gap
name, and the first render of every question was silently empty.

## Executed, not assumed

The parsers run against the real files rather than fixtures, so a set the parser
cannot read fails `pnpm verify` rather than rendering as a blank page. 31 node
tests and 22 DOM tests, all executed; the built application was started and
driven through a real sitting in a browser — rate 4, write an answer, submit,
check, grade — with screenshots at each step. Two things only that pass showed:
the queue's date arithmetic is right across a month boundary, and the "13 sets
due at once" problem above, which was a design fault visible only once real dates
were in it.

`pnpm install && pnpm verify` green. `src/scratch.test.ts` was not needed this
run — there is no lesson snippet to execute — and does not exist.

## Found while teaching

Three, all filed in `FINDINGS.md`, none fixed here.

1. **No primitive can express inline code or emphasis inside a paragraph**
   (`Loom primitives`). A Loom text node is a string, so `` `ChangeInterpreter` ``
   in a question renders in the same face as the sentence around it. The course's
   own questions are the evidence: Set N alone names six symbols.
2. **`sequentialIdFactory` accepts a namespace that cannot produce a valid id**
   (`Loom primitives` / framework). `sequentialIdFactory("set-n-q1")` is accepted
   and then throws a bare Zod regex error inside whichever `buildText` runs
   first, naming neither the namespace nor the factory.
3. **`review-schedule.md`'s tracking table is now two things** (`Loom lessons`,
   mine). The table is still in the file and the queue now keeps it. A pointer
   was added rather than deleting the table; if the surface is where reviews
   actually happen, the table should go, and that is a call to make once the
   maintainer has used the page.

## Needs the maintainer

Whether the *lessons themselves* should render on this surface next, or whether
the next run should go back to lesson 12. My inclination is 12, then the lesson
reader: the machinery is worth more with a Predict gate in front of a real
lesson, but a course that stops producing lessons to build its own website has
lost the plot.
