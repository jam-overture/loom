# 2026-10-11 — The sentence that moved an instrument

**Neither a new lesson nor machinery, and the alternation did not decide it.**
Rule 5 did: lesson 35 was wrong on `main`, in three of the three facts its last
section states, and two of them had been wrong since 9 October. Fixing that
outranks both candidates on the queue and outranked them without my having to
weigh anything.

**Landed:** lesson 35's ending, re-taught, with a seventh exercise; and the
footnote in lesson 29 that said *the teaching above it is unrevised — filed*,
discharged into teaching. Lesson 35 is now roughly 85–100 minutes to work
through with the predictions written, up from 70–85: one more exercise, three
more Self-check questions, and a section that was three paragraphs and is now
nine.

No new lesson. Part V still has nineteen seams and the twentieth still needs a
survey of `src/` that is not this lane's to run.

## What was wrong, and since when

The section is called *What the repository looks like today, which is the honest
end of the lesson*. It stated three facts. On the day I read it:

| the lesson said | true? |
| --- | --- |
| the mechanism "is never pointed at a real primitive"; `audit.test.ts` is "the only caller in the repository that passes `answers`"; "every audit of a registry of **real** primitives takes one argument" | **false since 9 October** — `library.test.ts` passes `BOUND_ANSWERS` on three calls |
| "the library still reads as though the limit held"; `loom.feed`'s header "is the original"; `loom.plate` "states the rule again as a flat fact about the present" | **false since 9 October** — 0246 rewrote both headers the same day, each now quoting its old sentence with a date on it |
| 0185's deferred alternative has had its condition met and is still deferred | true, and 0253 looked at it on 10 October and left it there |

And the lesson's **Come back to this** said the force "is still moving one, two
weeks after the reason stopped existing", which had stopped being true twice
over; Self-check 8 asked the reader to say "why nothing in this repository fails
today because of it" about a caller that now exists; and `lessons/README.md`
carried the same two sentences in its syllabus row and in its Part V prose.

**The lesson was not stale by neglect.** #571 landed on 10 October and *did*
re-teach the paragraph under exercise E, which is where 9 October's finding
pointed. What it did not do is read two screens up, where the same facts are
stated as the lesson's closing argument. That is the gap the `moves:` marks
exist for, found one level above where they reach: a mark covers the prose under
its fence, and these sentences were prose about the same lines in a different
section.

Every check in this course was green throughout, and each had a reason. The
sentences count nothing — *the only caller*, *the original*, *still moving one* —
so `claims.test.ts` has nothing to derive; the transcripts were all correct,
because exercise E really does call `auditRegistry` with one argument and really
does print four dropped regions. **The lesson's exercises and the lesson's
argument had come apart, and only the exercises were checked.** This is lesson
05's seven weeks and lesson 32's two days, third instance, and the first one
where the drifted prose is the *conclusion* rather than a line under a
transcript.

## What I emphasised, and why the correction is better than the lesson was

I did not date-stamp the three facts and move on. The section is now two
sections: *What the repository looked like when this lesson shipped*, in the past
tense throughout, and *What happened next, which is the honest end of the
lesson*. The sequence is the content, for three reasons.

**The lesson's third property held exactly as stated, and the inference everybody
draws from it does not follow.** *Nothing goes red when the reason stops being
true* was true on every day of this: 9 October green, 10 October green, 11
October green. What the lesson implied — therefore nothing happens — is what
turned out to be wrong, and it is the more interesting half.

**What moved it was a sentence in `FINDINGS.md`.** 0253's Context quotes it as
the whole argument for its own existence: *"what changed in September was a
permission, and a permission is the one kind of change a suite cannot notice."*
I have written that up as the section's finding rather than as a happy ending,
because it is uncomfortable: the remedy that worked needs a reader, has no
guarantee attached, and was the only thing available — there is no program that
can tell a primitive declaring fewer regions than it may from one declaring all
it has.

**And the library moved twice, in opposite directions, for the same reason.** It
was both times the party holding the red suite and the party owning the file.
Being right about which way to push does not move where the pressure lands, and
that is the half of the general shape that survives somebody paying attention. I
put that before the good news deliberately.

**The best thing in the correction is that `notAnswered` is the lesson's own
sentence with one clause removed.** The lesson's general shape, written on 8
October, is *a correct answer to a narrower question, **with nothing in the
answer saying it was narrower**, is a force acting on whatever is cheapest to
move.* 0253's field is that clause closed, and its doc comment says the part the
lesson spends four sections arriving at: *"Unlike every other list, an entry is
not a claim about the component. It is a claim about this call."* Nobody wrote
either sentence with the other in view. I did not manufacture the connection and
I say so in the lesson.

**The interleaving I added is with lesson 24 and it is derived rather than
decorative.** 0253 had a choice between one list with a two-member `reason` and
two lists, and lesson 24's rule settles it: one field per thing a caller would
*do* differently, not per failure that sounds different. Both causes have the
same remedy, so they are one list. That is lesson 24's rule being applied
correctly by somebody in another lane, in a record, three weeks after the lesson
that states it — which is the best evidence this course has yet produced that it
is teaching something.

## Exercise G, and the line I wanted predicted

Seven exercises now. All seven executed; `src/scratch.test.ts` deleted.

Exercise G asks the audit the same question three ways — one argument, answers
under the declared names, answers under one name none of them reads — and prints
`unplacedSlots`, `notAnswered`, and **the field 0253 rejected**, reimplemented in
five lines so the two can be read side by side. That last line is the one the
prose tells the reader to commit to hardest, and here is why:

```
  called with answers under one name none of them reads
    unplacedSlots: loom.trend: unavailable; loom.voices: unavailable; loom.feed: unavailable; loom.plate: unavailable
    notAnswered: loom.trend: names-not-answered; …
    the rejected one-cause field would say: (none)
```

The rejected field — *bound primitives probed with no answer*, which is what the
9 October filing literally asked for — reports **clean** on a call that produced
the identical wrong picture as the unanswered one. A host told to empty that list
can satisfy it by handing five answers keyed wrong. That is 0253's second cause
executed rather than described, and it is lesson 30's shape arriving again: a
plain list of names, silent on the broken page and loud on the working one.

**`loom.tally` is the line in the first block that says what kind of field this
is.** It is a leaf. It has no region, so it can never appear in `unplacedSlots`
and nothing about it looks wrong from outside. It is in `notAnswered` because
this call was handed no answer for it, which is a fact about the call and is as
true of a leaf as of a container. That observation is what produced the finding
below, and I would not have had it without writing the exercise out.

## Lesson 29, and a footnote that had been asking

Lesson 29's exercise C carried a blockquote written by `Loom primitives` on 9
October to keep its transcript true, ending *"The teaching above it is unrevised
and the move deserves better than a footnote — filed."* That filing was this
lane's and it is discharged here, in the way the field made cheap: exercise C
now prints one more line — `bound primitives this call was handed no answer for:
5` — and the footnote's three new paragraphs say why the 5 is larger than the 4
above it, which is `loom.tally` again.

It also earns lesson 29 a sentence it could not have had: that lesson names three
remedies for a fact nothing checks — reach further, manufacture a second copy,
instrument a place — and `notAnswered` is a fourth. *Have the answer say which
question it answered.* The lesson points at 35 for the story rather than telling
it twice.

**Lesson 33 I checked and left alone**, against the previous run's suggestion.
Its exercise G reads the starter registry, but for `unshown` declarations rather
than for audit verdicts; `notAnswered` is not a field it prints and nothing in it
is falsified. Adding the field there would have been a lesson improved because a
mechanism was new rather than because the lesson needed it.

## The marks, the claim, and the one thing the new mark declines to cover

Lesson 35 now has two marked fences, which makes it the second lesson with two
after 36 got the first pair yesterday. Same mechanical reason: a mark governs one
fence, and E and G are two readings of the same library at two sizes.

Exercise E's mark now names `notAnswered` as a second covered line and — this is
the change I care about — the paragraphs under it **name their lines instead of
counting them**. The sentence that used to open *Three of the four verdict
lists* is gone, replaced by one that lists the three empty ones by name. That is
deliberate and it is the README's own advice: a count is the cheapest second copy
a sentence can carry, and declining to carry one is the better fix where it reads
naturally. A sixth bound primitive now moves a transcript and no sentence.

Exercise G's mark covers all nine of its lines and states the one case it does
**not**: the third block's `notAnswered` reading `no-answers` rather than
`names-not-answered` would mean a bound primitive had started reading a binding
called `rows`, which makes the paragraph about that call wrong rather than stale.
The repair there is to pick another unread name and re-run, not to paste the new
line in.

Its registered claim in `claims.test.ts` is *All **five** are reported on the
first call*, counted off the first of the fence's three `notAnswered` lines —
which needed a new helper, because the entries are semicolon-separated and the
file only knew how to split on commas.

**And the trap the README warns about caught me once.** My first draft of lesson
29's mark quoted the sentence it was telling a later lane to read — *the two
zeros are the control* — so the occurrence pin went from 1 to 2 and
`claims.test.ts` failed. That is the same fault the README has a paragraph about
and lesson 09 has a story about. The remedy is the one both took: paraphrase. It
cost one test run, which is what a pin is for.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 201 files / 4,537 tests — `src/` was not opened by this lane |
| `@loom/app` | 421 files / 7,813 tests |
| findings ledger | 1,113 entries, 0 malformed — one of them this run's |
| `prerender:check` | 132 pages, 1,755 text junctions, 0 run together; 3 metadata conventions, 0 unserved |

**Two throwaway edits to `src/primitives/library.test.ts`, both reverted before
anything was committed**, and they are the evidence for the finding below rather
than a change to another lane's file. `git status` shows six modified files and
none of them is in `src/`. The experiments were: a stale key in `BOUND_ANSWERS`
for an unregistered type (**1 failed, 360 passed**) and `loom.tally`'s answers
rekeyed to a name it does not read (**361 passed, green**). A finding that says
*this check cannot see that* is worth more run than reasoned, and this one was
cheap to run.

**No test weakened, skipped or deleted.** Pins moved:
`RECOGNISED_TRANSCRIPTS` 167 → 168 (exercise G is one whole transcript; the
lines added to exercise E and to lesson 29's exercise C went into existing
fences), the marked-fence census to `[24, 29, 32, 33, 35, 35, 36, 36]`, and one
claim added to `TRANSCRIPT_CLAIMS`. `LESSONS_WITH_A_DERIVATION` and the
41-set queue are unchanged, because no lesson and no set arrived.

**The review schedule gained a question rather than a set.** No new lesson means
no new set, and the brief's instruction to interleave a new one was not the thing
to do here: what needed doing was Set AN, lesson 35's own set, which is now
eleven questions. The eleventh is the only question in that set about something
that did not exist when the lesson shipped, and it asks the reader to work out
how a host could satisfy the cheap version of `notAnswered` without supplying a
usable answer. I put it last and said in the set's notes why it is last.

No decision record: a lesson is not a decision, and nothing about the runtime,
the tree schema or an `Accepted` record is touched.

Scope is `lessons/35-instruments.md`, `lessons/29-readership.md`,
`lessons/README.md`, `lessons/review-schedule.md`, `FINDINGS.md`, this report,
and two test files under `apps/loom/app/(lessons)/_lib/`. `src/`, `tools/`,
`decisions/`, `reports/`, the root `README.md` and every other route group are
untouched.

**Preview**, on the pull request:
`https://loom-git-lessons-35-notanswered-jpizzolato36-6341s-projects.vercel.app`
— the lesson at `/lessons/35`, exercise G's transcripts rendered from that
build's own run, and the amended set at `/lessons/review/set-an`. I could not
open either from this container: the environment's network policy denies that
host, so the evidence that it renders is Vercel's own check plus
`prerender:check`'s 132 pages locally, which include both routes. That note is
now on three consecutive reports — 8, 10 and 11 October — and it is a setting on
the environment rather than anything in a branch.

## Found while teaching

**One, filed for `Loom primitives`, not fixed, and executed rather than
reasoned.** 0253 leaves one call to that lane in as many words: whether to let
`library.test.ts`'s hand-written *probes every bound primitive with an answer*
assertion go, now that the audit can say it. The answer is **keep it and add one
line**, because neither check subsumes the other, and the obvious reading of that
sentence is *replace it*.

The key comparison catches a missing or stale key and cannot see every answer
being filed under a name the primitive does not read. `notAnswered` catches the
second and is silent on a stale key. Both rows were run. The part that makes it
worth filing rather than mentioning is the leaf: for the four region-shaped bound
primitives a misnamed answer is caught incidentally, by the converse assertion
going quiet, and for `loom.tally` — the primitive the fixture's own header says
it is there for — it is caught by nothing, which is why the file stayed green at
361 passed with its answer keyed under `amount`.

**Nothing else for another lane.** The three things this run found in its own
files — two falsified facts, a footnote that had been asking for the teaching it
got, and a Self-check question about a caller that now exists — are fixed above
rather than filed, per the boundary.

**And one thing for this lane's own machinery, which I am recording rather than
building.** The three sentences that were wrong were prose carrying no count, in
a section two screens from the fence whose numbers they are about. No mark
reaches them, because a mark covers the prose *under* its fence, and nothing
would have reached them with one. I am not proposing a mechanism: what would be
needed is a way to say *this paragraph depends on these lines* across a document,
which is lesson 28's manufactured second copy with the bill going to every
future author in this directory. The honest statement of the limit is the one
lesson 32 already makes — most of what a lesson says carries no second copy, and
if you find one wrong it will be by reading. This run is that, and the reading
took three days to happen.

## Needs your input

**1. Three days is the number to react to, not the fault.** Lesson 35 shipped on
8 October with an ending about the repository, and the repository answered it on
the 9th and the 10th. That is the course working — a lesson named a shape, two
lanes acted on it, and 0253's Context quotes the filing. It also means a lesson
whose ending is *what the repository looks like today* has a shelf life measured
in days. Do you want Part V's lessons to keep ending that way, with this lane
re-reading the last section of the previous lesson every run as a standing cost?
The alternative is to end on the general shape and put the state of play in the
report, which is cheaper and weaker: the dated specifics are most of why these
lessons land.

**2. Per-row reveal for lesson 35's exercise C** is still the open design
question and still yours — question 2 of *Needs your input* on #552, unanswered
since 8 October. Exercise G has made it slightly more pressing: its fence is
three blocks of three lines, and the third block is only a surprise if the first
two have not given it away.

**3. Two `moves:` marks in one lesson** was question 3 on #571 and is now the
case in two lessons rather than one. I have taken the silence as *fine* and
written the convention down in `transcripts.test.ts`; say if you would rather one
mark per lesson and I will split the fences differently instead.
