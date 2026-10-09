# 2026-10-09 — The second look

**Course machinery, not a lesson, and the alternation decides it rather than a
preference.** 8 October was lesson 35 and that run's *What is next* said
machinery, unambiguously. No open lessons pull request, no reader feedback since
#522, nothing `Superseded` that makes an existing lesson wrong.

**What it is not.** The machinery item 8 October named was per-row reveal for
lesson 35's exercise C, and that run declined to start it because it is a change
to how the course reveals things — written up as question 2 of *Needs your
input* on #552, where it is still unanswered. It stays unbuilt. Starting it
would be answering a question I asked on the maintainer's behalf, which is
worse than leaving it open.

**Landed:** the second look — calibration over the questions that came back,
kept as its own population. `secondLookOf` in `calibration.ts`, a panel on the
review queue and on the corrections page, one figure added to the record
summary, and the shared question label the two panels now print.

## What was missing, which was not a feature

Every correction in the reader's record carries **a confidence rated before the
reveal and a grade recorded after**. That pair is the only thing calibration is
made of, it is the one measurement `lessons/README.md` says paper cannot make at
all, and nothing read it. `Your calibration` folds `progress.sets` and stops.
Its own sentence says so without meaning to — *across every set you have done* —
and a reader who worked the corrections queue honestly for a month generated the
rarest ratings in the course and was shown none of them.

So this is not a new thing to measure. It is a measurement the surface has been
taking and discarding since corrections shipped, which is a worse kind of gap
than a missing feature and a quieter one: nothing is wrong on the page, the
panel is correct about what it counts, and what it counts is not what the
sentence above it claims.

## Why it is a second reading and not a bigger first one

The obvious change is to add corrections into `bands` and raise the denominator.
It is wrong, and lesson 35 is the reason — which is a satisfying thing to find
one run after writing that lesson, because the fault is in this lane's own
machinery and I did not go looking for it there.

A first attempt is rated **cold**. A correction is rated **after the reader has
looked the specific point up**, because that is `review-schedule.md`'s
instruction after a miss and the only thing it says to do. Those are two
populations and the second is easier by construction. Pooling them produces a
figure assembled from both with nothing in the figure saying so — lesson 35's
subject exactly — and the direction it moves in is the one that matters: a
reader who does the hardest thing this course asks would watch their calibration
improve for a reason that has nothing to do with their calibration. One number
is the flattering one. Two labelled numbers are the honest shape.

Which reframes what the second table is for, and the panel says it in two
sentences rather than keeping it for a report: **it is not measuring whether you
knew it — you had just read it. It is measuring whether the reading took, and
whether you could tell.**

The test that holds this is `leaves the first reading exactly as it was`:
`calibrationOf(progress)` must equal `calibrationOf` of the same record with
every correction removed. One `concat` away is the version of this panel that
would be a lie, so the assertion is about the absence rather than the feature.

## Sure again and wrong

The headline the second reading buys is a question the course has never been
able to ask: **rated 4 or 5 on the way back, and still not got.** And within it,
the ones whose original miss was *also* confident.

That second count is the rarest thing a record will ever hold, and the
corrections queue has always handled it correctly in silence — a miss at any
point resets the streak, so the ladder already treats it as the serious case.
What nothing did was say so. Being sure, being wrong, going and reading the
answer, coming back a day later still sure and still being wrong is not a gap in
what the reader knows. A gap gets fixed on contact and this one has had contact.
It is a model of the system that is actively wrong and has already shrugged off
the evidence once.

The threshold is `CONFIDENT`, the same one `comesBack` and `wasConfident`
already use, for the reason that function gives: two different answers to
*confident* across one surface would be worse than either. And the exclusion
matters as much as the inclusion — a reader who was unsure, missed, read it,
came back unsure and missed again has done nothing wrong, and is not counted.
There is a test for that one, because it is the easy thing to get wrong when the
feature you are building is about relapse.

The ordering is the one deliberate departure from `confidentAndWrong`, which
sorts by date alone because everything in it is the same kind of event. These
are not: a relapse whose first miss was confident goes above one the reader was
unsure about the first time, because date order would bury the rarer event under
whatever happened yesterday.

## One limit, stated in the field rather than discovered

`sureBefore` is read off whatever attempt the record now holds. A later go at a
whole set **replaces** an attempt (`withAttempt`, and that rule is right), so a
correction can outlive the miss it answers, and the field then describes the
newer sitting. Nothing better is available: a correction carries no pointer to
the attempt that produced it, and inventing one would mean changing the stored
shape of every reader's record to improve a secondary count. The `Relapse` doc
comment says which sitting it read, which is the honest version of a field that
is occasionally about the wrong one.

## What building it found

**A fixture that could not tell a leak from a sentence.** The panel has a test
that no word the reader wrote appears in it, and it failed on the first run.
Nothing had leaked: the fixture's answers were *still sure* and *still not
sure*, and the panel's own closing paragraph contains *came back to a day later
still sure of*. The answers in that test are now nonsense strings, and the
reason is in a comment above it — a fixture whose answer is a phrase the surface
might plausibly write is a test that cannot fail for the right reason.

**`LESSON-04-SELF-CHECK q2`.** The calibration list formatted a question's
address with `set.replace("set-", "set ").toUpperCase()`, written when a review
set was the only kind of slug there was. It has been able to receive a lesson's
own question since the lessons' sections started being graded, and would have
printed that. Rather than writing a second one-liner for the new panel, the
label moved into `slugs.ts` — which is the file whose whole argument is that one
place decides what a slug means — and both panels print it. Its doc comment
states the one thing that makes naming the source safe here and nowhere else on
this surface: these are questions already answered and graded, so there is
nothing left to give away, and a *sitting* still refuses to say where a question
came from until it has been attempted.

**A list that stopped at six and did not say so.** The calibration panel names
the first six confident misses and truncates in silence. The new panel started
out copying that, which on a surface whose whole argument is that an empty
answer has to say which empty it is would have been the same fault one size
down. It names six — a list is not the point, the count above it is — and says
*and N more*. The panel above is left as it is: changing it is a change to a
sentence a reader may have been reading for weeks, and it belongs in a run that
is looking at that panel rather than this one.

**Four stale counts in this lane's own comments.** `review/page.tsx` opened with
*The queue: twenty-three sets*; `queue.ts` said a page listing twenty-three of
them ships twenty-three headings; `syllabus.ts` said *five of the thirty-eight
sets*; `corrections/page.tsx` said twenty-two sets and nearly seventy sources.
The schedule has had considerably more than any of those for some time and
nothing went red, because a count in a comment has no second copy anywhere —
which is the fault lesson 35 is about, in the directory of the lane that wrote
it, found one run later.

**The repair is to stop stating the number, not to correct it.** None of the
four figures was load-bearing: each sentence is about a *trade* — questions stay
on the server, a heading is cheap, five sets are anchored to a part — and the
number was decoration that could rot. Writing a corrected one would only restart
the clock. The two counts in `schedule.ts` and `slugs.ts` are untouched and
should be: *twenty-six sets is the whole of `A`–`Z`* is a fact about the
alphabet and cannot go stale.

## Gate

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

Run twice. The first was the branch as written; `main` then moved four pull
requests (#553–#556) ahead of it, so the base was merged in and the gate re-run.
**The figures below are the second run**, which is the one that counts.

| | this branch |
| --- | --- |
| `@jam-overture/loom` | 197 files / 4,396 tests — `src/` was not opened on this branch; the change is #553–#556 |
| `@loom/app` | 415 files / 7,442 tests |
| findings ledger | 1,080 entries, 0 malformed — none of them this lane's |
| `prerender:check` | 128 pages, 1,586 text junctions, 0 run together; 3 metadata conventions, 0 unserved |

**Nothing of this lane's moved across that merge, and one of the four had a real
chance of moving it.** #556 added `src/runtime/checks.ts` and changed
`gate.ts`, `assessment.ts`, `disposition.ts` and `pipeline.ts` — which is the
code lessons 07 to 10 are about, and lesson 09's registered claim counts the
Gate's rules. `transcripts.test.ts`, `claims.test.ts` and `declarations.test.ts`
are all green on the merged tree, so no exercise, count or printed type drifted.
That is the merge being checked rather than my having read the diff.

**No test weakened, skipped or deleted, and no pin moved** — no lesson landed, so
`RECOGNISED_TRANSCRIPTS`, the marked-fence census, `REVIEW_SETS` and the
unscheduled queue are all where lesson 35 left them, and there is no new review
set. Nineteen tests added across three files — eight on the fold, eight on the
panel, three on the label. Before the base merge the app suite read 413 files
and 7,404 tests against the 412 and 7,385 of the tree #552 merged, which is
where those nineteen are.

Two existing assertions changed, both of them an expected string rather than a
threshold: `queue.test.tsx` expects `Set A q1` where it expected `SET A q1`, and
`record.test.ts`'s `toEqual` on the record summary gains
`sureAgainAndWrong: 0` — which it is, because that fixture's one correction is
rated 2 and got.

No decision record: course machinery is not a decision, and nothing about the
runtime, the tree schema or an `Accepted` record is touched.

Scope is `lessons/README.md`, `lessons/review-schedule.md`, this report, and
fifteen files under `apps/loom/app/(lessons)/` — two of them new,
`_components/second-look.tsx` and its test. `src/`, `tools/`, `decisions/` and
every other route group are untouched.

## Found while teaching

**Nothing for another lane this run**, and the ledger is unchanged at 1,074 —
said explicitly because an absence here should be a statement rather than a
silence. This run read no `src/` behaviour it had not already read for lesson
35; the three things it found are all in this lane's own files and are fixed
above rather than filed, per the boundary.

One of them is worth keeping for its shape rather than its size. **The stale
counts and `LESSON-04-SELF-CHECK` are both this lane doing what lesson 35 is
about** — and in the second case the pressure came from the same direction the
lesson describes. The one-liner was correct when it was written, a new kind of
slug arrived, nothing went red, and the cheapest correct-looking move when I
needed a label for a new panel was to write a second copy of the one-liner in my
own new file. I nearly did. What stopped it was that the new panel had to format
a lesson slug on purpose, so the old one's output was in front of me.

## What is next

**A lesson, by the alternation**, and the queue is unchanged from 8 October: a
composition's stated `max` against the magnitudes inside it, which lesson 27
already holds the argument for and which has been carried forward in every
report since 5 October; and the behaviour-placement case that turned out to be
the surface of lesson 35 and is still unwritten as its own seam.

For machinery after that, two things rather than one. Per-row reveal for
exercise C is still the open design question and still the maintainer's. The
second is new and smaller: the second look has no `Quiet`. A reader with no
re-answers gets no panel, which is the first panel's rule and is right for the
review queue — but on the **corrections page**, where somebody has gone looking,
*nothing has come back yet* and *everything that came back, you got* are the
same blank, and that is the distinction lesson 24 is about and this surface has
already drawn seven times for the queue next to it.
