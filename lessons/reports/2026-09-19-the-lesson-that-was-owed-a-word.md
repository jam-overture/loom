# 2026-09-19 — Lesson 24 gains its third answer: the word the seam was told to say and could not

**Landed:** three new sections in [`24-silence.md`](../24-silence.md), a rewritten
exercise C (four readings now, one of them new), new transcripts for every
exercise that prints a reading, an added Predict clause, an added Explain-it-back
prompt, a rewritten Self-check 4 and a new Self-check 8, a new Reflect bullet;
question 9 in Set AC in [`review-schedule.md`](../review-schedule.md); two
paragraphs and an amended syllabus row in [`lessons/README.md`](../README.md);
and one finding filed.

**No new lesson this run, and it is the second run in a row without one.** That
is a real cost and it was still the right call: `Loom daily build` filed on
18 September that this lesson teaches a seam with two answers and the seam has
three, and the brief puts a lesson that is now wrong above a lesson that does not
exist yet. Section 5 of the brief names a `Superseded` record; this is the same
situation arriving through an `Accepted` one
([0169](../../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)),
and the failure mode it protects against — *a lesson that lies about what the
code does is worse than no lesson* — is identical.

`pnpm install && pnpm verify`: **green, exit 0.** Runtime 2,761 tests across 153
files; application 4,837 tests across 276 files; 683 findings, 0 malformed; 107
prerendered pages, 853 text junctions, 0 run together. The diff is `lessons/` and
`FINDINGS.md`. **No test in any lane was changed**, including
`transcripts.test.ts`, whose `RECOGNISED_TRANSCRIPTS` is unchanged at 95: every
transcript in the lesson was rewritten, and the number of plain fences was not.

## What was wrong, and what it was wrong about

The lesson's subject is that a reading which cannot answer has to be able to say
so. It teaches `copyIn`, whose return shape — `words` beside `unread` — exists for
that and nothing else.

Exercise C, written on 13 September, printed the one case where that shape failed
to do it. A declared copy prop holding a number is skipped rather than coerced
(right: the component owns the separator), and `unread` carries only types that
declared nothing (right: a declaration is believed about its exclusions). Composed
on one node, the figure left `words` and arrived nowhere, under an `unread: none`
that positively claims there is nothing more to say.

The lesson filed that and said, in the exercise, *this is filed rather than
fixed*. 0169 closed it on 18 September with a third field, `unspoken`, and
rejected the one-line version — naming the prop in `unread` — on the grounds the
lesson spends four sections building. Which left the lesson three places short:
the `// →` comment, the file table, and the sentence telling a reader that
`copyIn` has two branches worth stopping on.

Patching those three would have been about twenty minutes and would have thrown
away the reason the finding happened.

## What I emphasised, and why

**The lesson gained a second act rather than a corrected table**, the same shape
lesson 25 took on 18 September and for a better reason: here the lesson is not
catching up with a change somebody else made, it is *finishing the thing it
started*. Three new sections in The idea:

- **Three ways to have no word, and only one of them is a gap.** The composition
  of two correct rules, printed as it used to print; then the three cases on the
  declared side, and the field.
- **Why a third field rather than a third meaning.** The section I would keep if I
  could keep one. The one-line fix is not rejected for being small — it is
  rejected because `unread` is remedied **per type** (declare `copy`) and the new
  case is remedied **per node** (format the figure), so a caller does a different
  thing about each. Generalised: *a reading needs one field per distinct thing it
  can fail at, and "distinct" is decided by whether the caller would do something
  different about it, not by whether the two failures feel alike.*
- **The same value, on the other side, is not a missing word.** The asymmetry that
  survived: `weight: 2` on an undeclared divider is a setting, not a gap, because
  that node is already named in `unread` and this one appeared nowhere.

**Predict 2 now asks for the rule rather than the shape.** It already asked for
the type `copyIn` returns. It now also asks, kept separate, *what rule did you use
to decide how many fields* — a question with a real answer, which the reader
writes before meeting a seam whose author got the count wrong. Reflect brings it
back and names the two wrong answers most people write (one field per failure; one
field with a reason on each entry) so a reader who wrote one can see which.

**The finding is taught as an event, not as a footnote.** The seam had been wrong
since the day it shipped; its suite was green; the test for this exact case
asserted `words` and nothing else, so the silence was pinned in rather than
overlooked; and what caught it was writing a worked example and reading what it
printed. That is the strongest argument this course has for its own method, and it
is now in the lesson, in Self-check 4, and in Set AC's new question 9.

## What the exercises revealed

**Every transcript in the lesson changed, because `report` had to.** The fixture's
printing helper showed `words` and `unread` and stopped. Leaving it there would
have been this lesson's own failure committed inside this lesson's own fixture —
and invisible, because what it hides is exactly the thing that prints nothing. It
now prints all three fields always, including empty, and the preamble says why.
Five transcripts were re-run and rewritten from real output.

**Exercise C gained a fourth reading, and it is the one that earns the design.**
A declared stat holding `3400`, over a child whose type has said nothing:

```
  one declared figure it cannot say, over one type nobody spoke for
    words:    ["appointments"]
    unread:   n_1 (demo.quiet-stat) ["value","label"]
    unspoken: n_2 (demo.stat) ["value"]
```

Three words missing from one small page by two different routes, both lists
populated, naming different nodes, with different remedies — and `words` holding
one entry out of four. The argument from The idea arriving as output. The ids are
a third sighting of children being minted before their parents.

**And the sentence I was about to write turned out to be false.** Stating what a
caller may conclude from `unread: none` is the whole point of the section, so I
ran it rather than quoting it. 0169 says an empty `unread` is *"a positive claim
that every type under this node declared"*. It is not: a divider carrying
`weight: 2` from a type that declared nothing comes back with an empty `unread`
too. The claim that holds is narrower — *no node under here was left holding a
word this reading could not classify* — and it is the better one, because it is
exactly `words` is complete, exactly what a caller needs, and exactly what the bug
falsified. The lesson states the narrow claim and names the divider.

## Found while teaching

**One finding, for `Loom daily build`, and it changes no behavior.** Three
sentences are one clause too strong, and one of them is the sentence 0169 uses to
explain why the bug it closed was a bug.

1. The 0169 claim above, falsified by a divider.
2. The same record argues its decision 3 with *"on the undeclared side the node
   is already named"*. True of a divider holding `weight: 2` **and** a string;
   false of one holding `weight: 2` and nothing else, which is in no list — and
   the divider is the record's own example. The conclusion survives; the argument
   needs the second case, which the lesson now works through.
3. `UnreadCopy.props` is documented as *"Its string-valued props"*, and
   `stringProps` filters with `isWord` — so a prop holding `"   "` is a
   string-valued prop that is not named. Verified: `{ value: "3,400",
   label: "   ", weight: 2, flag: true }` with nobody declaring reports
   `["value"]`.

The behavior is right in all three cases and should not change. The reason it is worth
two words is decision 3 of that record, which turns on what the two sides do
differently: as documented they differ in two places, blanks and non-strings, and
only one of those differences is intended. *Non-blank string-valued* makes it one
rule with one deliberate asymmetry, which is the form the record's own title
already takes.

Filed rather than fixed: `src/sdk/copy.ts` is the framework lane's, and a lessons
branch that edits it is a lessons branch nobody can review.

## Two things left undone, deliberately

**The alternation is now three runs overdue.** The machinery candidate named on
16 September and again on 18 September — the corrections queue reporting *nothing
has come back today* identically to a reader whose record is on another machine,
when the reading that distinguishes them is already in the store — is still not
built. It is half a run and it pairs with a lesson. It did not go in this one
because a run carrying a rewritten lesson and a surface change is a run nobody can
review in one sitting.

**Lesson 27 is not started.** Part V's eighth seam is still open, and the question
lesson 24 now ends on is sharper than the one it ended on yesterday: not only
*what does a system return when it cannot answer*, but *who would notice if it
started returning that when it could* — to which this lesson's own answer is
**nobody did, for three weeks, with a green suite**.
