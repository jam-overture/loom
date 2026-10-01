# 2026-09-22 — The empty queue that meant seven things

**Landed:** course machinery, not a lesson. The corrections queue now reports
*which* empty queue it is —
[`_lib/corrections.ts`](../../apps/loom/app/(lessons)/_lib/corrections.ts) gains
`everyMiss` and `whyNothingIsDue`, the sitting and the review-queue panel render
it, sixteen tests, one existing test rewritten because it asserted the bug, and
one paragraph in [`lessons/README.md`](../README.md). Five screenshots beside
this report.

`pnpm install && pnpm verify`: **green, exit 0**, read from a file rather than
through a pipe, and run again after rebasing onto `17c5996` rather than trusted
from the older base. Runtime **2,911** tests across 157 files — `src/` was not
opened. Application **5,138** across 289 files on this branch. The delta was measured
rather than inferred, on the base this work was written against: `dac370b` ran
**5,106** and the same tree with this change ran **5,122**, both from a clean
`dist/`. **+16, and no test file was added**, which is the shape a machinery run
has: ten in `_lib/corrections.test.ts` and six in
`_components/corrections.test.tsx`. **109 prerendered pages**, unchanged — this
run adds no route.

## Machinery rather than a lesson, which was decided for me

The 20 September report named this and said it plainly: *it should be the whole
of the next run rather than the second half of one, and the next run should not
open Part V's eleventh seam before it is done.* It had been carried since
16 September and deferred four times. Section 6 of the brief permits alternating
and this is the alternation; there was no judgement left to make, only the work.

## What was wrong

The 17 September run fixed a sentence on the review queue and the index: *no set
is due today* was true of a reader with nothing until Thursday and of a reader
who had never marked a lesson, and the page said the same thing to both. It
fixed those two pages. One page along, the corrections queue said

> Nothing has come back. Either you have not missed anything yet, or everything
> you missed has been got three times running — which is the only other way out
> of this queue.

to **seven** different readers, and the sentence is worth reading closely
because it is not a lazy one. It is careful, it offers a disjunction, and the
disjunction is the tell: the page is listing what it *could* be, in a document
whose whole subject is that it already knows. Both halves of that sentence are
computable from the record it is holding while it prints them.

The seven, and what each one actually is:

| The reader | What the page said |
| --- | --- |
| has never answered anything here | *nothing has come back* — true, and the only one of the seven it was right about |
| has answered and missed nothing | the same sentence |
| missed things and retired every one of them, three clean retrievals across a month | the same sentence |
| missed only predictions they rated 1–3, which is the Predict section working | the same sentence |
| has misses waiting, none due today | *nothing is due today*, which was already told apart |
| has misses waiting on questions the course no longer contains | *nothing has come back* — and they were dropped in silence |
| has a record in this browser that nothing could read | *nothing has come back*, about `EMPTY_PROGRESS` |

The last is the one the brief's own lesson 24 is about, and the sixth is worse
than a wrong sentence.

## What I built, and the rule I built it to

`whyNothingIsDue` returns one of seven readings or `undefined`, and `undefined`
is the interesting return: it means something *is* due, so no caller can draw a
consolation paragraph over a queue that has work in it. The test that asserts it
is the first one in the new describe block.

The rule for what counts as a separate reading is
[0169](../../decisions/0169-a-declaration-is-what-makes-a-value-a-missing-word.md)'s,
which lesson 24 got its second half from in this lane on 19 September: **one
reading per thing the reader would do differently about it**, not per thing that
sounds different. That is the whole design, and it is what stopped three of them
being folded together. `retired`, `by-design` and `no-misses` are all *a reader
with an empty queue who did nothing wrong* — three sentences if you are counting
sentences, and three readings because the next move differs: a month of evidence
that the ladder worked; the Predict section doing its job; and a clean sheet
which is either the course landing or the grading being kind, and which this
page says out loud that it cannot tell apart. The last of those is the one I
would defend hardest. A surface built entirely on a grade the reader gives
themselves should say so once, in the place where a run of clean sheets shows up.

**Precedence is by what is owed, not by what is impressive.** `unreadable` goes
first, because every reading below it would otherwise be a claim about
`EMPTY_PROGRESS` — the empty record and the unreadable one are identical values
and the two readings furthest apart in meaning, and there is a test that pins
exactly that pair. `lost` goes above `retired`, so a reader with both is told
about the fault rather than congratulated on the achievement.

**The one that is a fault gets a second home.** `knownOnly` has always dropped a
miss whose question the course no longer contains — a set reworded or renumbered
since the sitting leaves a key pointing at nothing, and a record in a browser
has no way of hearing about it. Dropping it is right. Reporting it as a clean
sheet is not, and the review-queue panel `return undefined`-ed on it too, so it
was invisible on both pages at once. The panel now speaks for that one reading
and stays silent for the other six, because a reader who has missed nothing does
not need a box telling them so every time they open the queue, and a fault has
to appear on the page the reader is already on.

**One line about storage, on the sitting itself.** A browser that will not keep
the record already gets the notice in the layout. What that notice cannot say is
this page's specific version of the loss: a question retires on three clean
retrievals across a month, and in a browser that stores nothing **none of the
three can be written down**. The retrieval is still worth doing; the ladder will
not move. That sentence is four lines of JSX and is the only thing on the page
that tells a reader the difference.

## What the exercises revealed

No lesson, so no fences and no transcripts — the thing that plays their part
here is that every state was photographed running, and two of the five pictures
changed the code.

**The retired sentence was ungrammatical for the commonest case.** *1 question
you missed **has each** been got three times running.* Written as the plural and
made singular with a conditional that stopped one word short. Nothing caught it:
the component test asserts `"got three times running"`, which is the half of the
string that was right. A screenshot caught it in about a second, which is the
argument for taking them.

**The upcoming line had the same shape of fault.** *The next of your 1 comes
back in 1 day.* Now *the one you have in hand*, which is the same fix and was
found the same way.

**And the picture that was not of what I thought.** The sixth shot was meant to
be the blank-slate reading and came out as *your record could not be read* —
because my harness passed `undefined` through Playwright's argument
serialisation, which makes it `null`, which stored the string `"null"`, which is
JSON and is not a record. The surface was right about every step of that. The
harness had lied to me about what it had arranged, which is exactly the failure
the brief's *run every exercise* rule is written against, arriving through a
screenshot instead of a fence.

## Found while teaching

**No new findings, and one existing one hit again.**

The 17 September finding — *a shot list can click and wait, and cannot
photograph a state that lives in the browser before the page loads* — is still
open, and every state in this run is one of those. All five pictures were taken
by a scratch Playwright script with `context.addInitScript`, in a scratch
directory, with `playwright-core` installed outside the repository, which is the
arrangement
[0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
exists to stop being normal. Three other lanes have since filed neighbouring
gaps — a shot list cannot reach inside a frame (18 September), cannot type into
a box (19 September), cannot sign in (19 September). Four lanes wanting four
different steps is no longer four requests; it is one, and `tools/` is not this
lane's to answer it in. Filed there already, not filed again here.

**Nothing in `src/`.** This run read `apps/loom/app/(lessons)/` and the course
markdown and nothing else, so the usual crop of framework findings is not here
to be had.

## What is next

**Part V's eleventh seam, and the question lesson 27 left for it** is now
unblocked, and it is the better of the two candidates: *a decision record argues
for a behavior in the present tense, in an `Accepted` record, and a schema three
files away quietly disagrees with it — and nothing in this repository compares a
record's argument to the code that is supposed to implement it.* That is where
the next lesson should start.

**One machinery thing is worth carrying, and it is small.** The calibration
panel on the review queue is still the last place on this surface that computes
a number out of a record without saying what the record was. It shows nothing at
all when `attempts` is 0, which is correct for six of the seven readings above
and is the seventh reader — the one whose record could not be read — being told
nothing rather than being told why. Half a run, and it can ride alongside a
lesson rather than displacing one.
