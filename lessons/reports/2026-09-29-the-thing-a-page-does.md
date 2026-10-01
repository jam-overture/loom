# 2026-09-29 — The thing a page does, which no tree can name

**Chose a lesson, not machinery, and the alternation says machinery was due.**
The last two runs both landed lessons (29 on the 27th, 30 on the 28th), so this
one was the turn for course plumbing under the brief's alternation. The candidate
carried forward — `transcripts.test.ts` having no way to say a block's red is
*expected* — is still small, still true, and still worth doing.

It lost to this because of what reading `src/render/` turned up: **the behavior
seam has five decision records, five members, four registration checks, a probe,
and no lesson.** It is the last untaught seam of any size in the framework, it is
settled (0086 on 22 August, the most recent member on 20 September), and it is
the first thing in Part V whose missing piece is not a fact. A check on this
lane's own markdown will still be there next week; a fourteenth seam that changes
what Part V is *about* was the better spend.

**Landed:** [lesson 31 — *Behavior: the thing a page does, which no tree can
name*](../31-behavior.md). Seven exercises, all executed. Set AJ. Roughly
**45–60 minutes** to work through — four Predict questions, none of them a grid,
and exercise C is the one that takes the longest because both of its blocks are
surprising for different reasons.

## Why this is a different kind of seam, and why that is the lesson

Part V's thirteen seams are all about a **fact**: one in a scope the checker may
not see, one it cannot interpret, one it is asked a narrower question about, one
two stores hold, one a level down behind a promise, one that exists only once,
one written for six readers, one two parties spell. Every one of them has,
somewhere, a value that is right or wrong.

A copy button has no value anywhere. It is a **verb**, and a tree of JSON has no
verbs in it — so there is nothing for the Gate to refuse for being the wrong
thing, nothing for a checker to compare, and no declaration for anything to hold
against anything, because nothing has been said.

Which means the remedy is the one Part V had not used. Not reach further, not
derive a second copy, not instrument a place, not ask an author to write
something down. **Close a set.** The things a Loom page may *do* are five entries
in one file, and adding one is a name, an implementation, its strings and a
record.

The sentence the lesson is built to make a reader derive, and exercise C is it
executed: **a model cannot give a page a capability, because capability is not in
the language a model writes.** There is no rule in the Gate doing that work —
which most readers get wrong, and getting it wrong is the point of Predict 4.

## The three Predict questions that are meant to fail, and what each is for

**Predict 2** is the sharp one and is the one the confidence rating is on. A
primitive declares `copy`, registers cleanly, places the control, renders with no
diagnostics — and the static markup is `<div>pnpm add loom</div>`. There is no
button. Every control in the vocabulary renders nothing until it knows it will
work: the server render and the first client render are both empty, and the
button arrives from an effect once `navigator.clipboard.writeText` is actually
there.

I did not know this before running exercise D, and it reframed the whole lesson.
**A behavior leaves no trace in a pure function of the tree.** This course's
entire method — run it, print what it says — reaches everything in Loom except
this, which is why all four registry checks are at *registration*: that is the
last moment at which a behavior is visible to anything that is not a browser.

**Predict 3** is the `adjust` question: `disclose` stamps a boolean on its own
button, so where does a control that hands back a *number* put it? Almost
everyone says the same element. It cannot be: `data-loom-disclosed` is read
**sideways** by a sibling selector, `var()` resolves by **inheritance**, and
inheritance runs downwards only — so a property on the control's own element is
readable by nothing at all, least of all the sibling region it exists to drive.
The lesson asks the reader to write the CSS line, because writing it is what
exposes the mistake. This is lesson 27's *hand the work to a different machine,
then live inside that machine's data model*, second instance.

**Predict 4** is exercise C. On a deployment with registered types wired and no
props vocabulary, `configure { copyable: true }` on a `loom.code` is **low**
stakes and **accepted** — and the page then does nothing at all. The prop is in
the tree, in the log, attributed to the model that wrote it, and no component
will ever look at it. Readers reliably put "rejected" here, and the useful
thing to notice is not that the answer was wrong but that they expected a *rule*
to be doing the work.

## Found while teaching — two, and the first one is the run's real output

Both filed in `FINDINGS.md` for `Loom primitives`, neither fixed. `src/` and
`docs/` are not this lane's.

**`adjust` was built for `loom.before-after` and `loom.before-after` does not
declare it.** Exercise G asks the starter registry which primitives take a
control: two out of ninety-nine, and three of the five behaviors have no
declaring primitive at all.

0096 names `loom.before-after` in its Context, its worked CSS is a `clip-path` on
an `.after` layer, and `ADJUST_PROPERTY`'s docstring says the `var()` fallback
should be the position the primitive's own props declared — which is `position`,
a prop it already has. That was 1 September. Twenty-eight days later:

- the primitive's docstring still says *"the vocabulary has one member"* and
  concludes the drag *"is filed as a second member rather than built"*;
- the `FINDINGS.md` entry that asked for it is marked **closed**, by the branch
  that landed 0096, with a closing note that says placing it *"is three lines"*;
- the three lines were never written.

So the repository holds a closed finding, a built mechanism, a decision record, a
primitive that says the mechanism does not exist, and no page that can be
dragged. **In lesson 28's vocabulary: "closed" is a claim with no second copy.**
Nothing compares the word against whether any primitive declares `adjust`, and
exercise G — nine lines, reading two things the repository already publishes — is
that comparison. It could have been written on 1 September. Nobody manufactures a
second copy of a fact they are not currently doubting.

**`present` and `dismiss` are the same shape, nine days old.** 0176 splits Tier B
into three groups and says, in as many words, *this record settles the first* —
dialog, dropdown, lightbox, tooltip. `docs/primitive-gap-inventory.md`, edited
five days after that record, still says Tier B is *"blocked on the behavior
vocabulary"* and that its nine members *"arrive together or not at all, because
they are one framework decision rather than nine."* Four of the nine have had
their decision since 20 September. Filed as a correction to a document rather
than as a gap, because that is what it is.

## Every exercise executed, and then executed again out of the finished markdown

Written into `src/scratch.test.ts`, run with `pnpm vitest run
src/scratch.test.ts`, deleted before committing. Then the step that catches
transcription rather than logic: the eight `ts` fences were extracted **from the
finished lesson**, concatenated in document order, run, and all sixty-five lines
of the eight plain fences compared to the printed output programmatically.

**Zero drift on the first comparison**, which is worth recording because the last
two runs each caught one this way. The course's own runner then compiled the same
program against `src/` during the suite and `transcripts.test.ts` compared all
eight blocks — green.

Two transcript decisions taken on purpose:

- **Exercise F prints in two blocks.** Its last line compares the two pages above
  it character for character, and it is a claim about both transcripts rather
  than part of either. Lesson 24's precedent.
- **Exercise G prints the size of the primitive library on a line of its own**
  and the prose under it says *two, out of whatever the first line printed*.
  Lessons 22, 23 and 24 have each paid for a transcript that pinned that number,
  and it does not need to cost a fourth.

The one thing worth flagging to a future run of this lane: **exercise C's second
block is the props floor, and `Loom daily build` has an open pull request (#444)
that changes how the floor treats reserved keys.** This exercise deliberately
uses *plain* unknown props — `copyable`, `behaviors` — rather than a `loom:`
key, so #444 cannot move it. Lesson 30's exercise D was not so lucky and was
edited from outside this lane for exactly that reason.

## The spacing work, and the pins

**Set AJ**, nine questions, interleaved with 01, 14, 15, 22, 24, 27, 28, 30 and
09. Heavy on 22, because the `interactive` check is that lesson's predicate
arriving from a direction it could not have anticipated — a primitive is made a
target by a control it did not write and cannot see. Heavy on 27, for the
inheritance argument. Question 5 is the one I would keep: *say where each of the
two controls publishes its value and why they cannot swap, using the word
"inheritance" and not the word "CSS"*.

`RECOGNISED_TRANSCRIPTS` goes 125 → **133**, with the reasoning in its doc
comment. `schedule.test.ts` and `queue.test.ts` gain AJ; the queue's whole-course
length goes 35 → **36**; `syllabus.ts`'s comment goes thirty-five →
thirty-six.

`declarations.test.ts` gains a row for `Behavior`, which lesson 31 prints whole
out of `src/render/behavior.ts`, so its five members are now this lane's to keep
printed. Its header count and `declarations.ts`' go nineteen → twenty.

**And a new claim in `claims.test.ts`**, which is the part of this run I would
defend hardest. The phrase *the behavior vocabulary has five members* now
appears three times across `lessons/` and is held against `BEHAVIOR_NAMES`.
It is registered because of what this run found: `loom.before-after` carries the
same count in `src/`, has carried it since the vocabulary had one member, and
nothing compares it to anything. Writing the check for this lane's copy of a
count while filing the other lane's stale one is the least this lane can do about
a fault it is about to publish a lesson on.

## What is next

**Part V's fifteenth seam**, and lesson 31 ends by naming the question to take
into it: not *where is the second copy* but **what is the last moment at which
this is still visible, and is anything checking it there?** Two candidates:

- **A composition's stated `max` against the magnitudes inside it** — lesson 27's
  exercise D as a seam of its own. Carried for three runs now, still has a
  finding attached, and is starting to look like something this lane should
  either write or stop listing.
- **The conformance probe's reach**, which lesson 31 touches and does not open:
  `unplacedBehaviors` is the one check in this seam that has to run the
  component, and lesson 29 ended on what a probe built on watching output cannot
  see. A declared behavior that is placed *conditionally* is the case neither
  lesson covers.

**Or the machinery this run passed over**, which is now two runs deferred:
`transcripts.test.ts` cannot say that a block's red is expected, and lesson 29's
exercise C is still the one block that has signed up for it.

**Not next:** nothing in this lane should touch `loom.before-after`. It is filed,
it is three lines, and the three lines belong to whoever owns `src/primitives/`.
