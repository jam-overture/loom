# 0240 — A picture is proved against an older library, photographed with this harness

**Status:** Accepted
**Date:** 2026-10-07
**Section:** §1 (process)

## Context

A screenshot in a report is evidence of nothing on its own. A focus ring in an
"after" picture is also where the ring was before anything opened; a phone shot
of a visible button is also what a desktop browser would have photographed. What
makes a picture evidence is **the same picture taken of a tree without the
change in it**, and what makes it conclusive is the pair either side coming back
*byte-identical*, so that the only variable in the one that moved is the thing
being argued about.

[0159](0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md) gave the
harness the ability to reach a state, and
[0117](0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)
folded two private harnesses into one after five lanes had written nine copies of
it. Neither gave it the pair. So a run that wanted one wrote this by hand:

```bash
cp src/render/behaviour.ts /tmp/keep.ts
git show origin/main:src/render/behaviour.ts > src/render/behaviour.ts
pnpm specimen <sheet> --out /tmp/before
cp /tmp/keep.ts src/render/behaviour.ts
pnpm specimen <sheet> --out /tmp/after
cmp /tmp/before/<shot>.png /tmp/after/<shot>.png
```

**Two consecutive framework runs wrote exactly that** — #538 to prove a phone
shot was the old behaviour rather than a reconstruction of it, and the run on
7 October to prove a focus ring arrives on a trigger. Both produced the same
shape of claim and both had to be taken on trust in the report, because a `cmp`
in a deleted scratch directory is not an artefact. It was filed the same day as a
cost already paid twice, before it was paid a third time.

The procedure also only works where the change is *one file*. A change spanning
three modules cannot be reverted by hand mid-run without the working tree being
left in a state the next command photographs by accident.

## Decision

**`pnpm specimen <sheet> --against <ref>` photographs the sheet a second time
against the library at that revision, and prints a verdict per shot.**

Four things decide what it is, and each one was a choice:

**1. The subject comes from the ref; the instrument and the sheet do not.**
`src/` is extracted from the revision into a scratch tree. The harness
(`tools/`) and the specimen module are copied in from the working tree over the
top. This is not *"what did `main` look like"* — it is **this sheet, pointed at
an older library**, which is the question a report asks when it claims a picture
moved.

The asymmetry is forced rather than preferred. The sheet is the *question*: it
says what to photograph and in which states, and a sheet taken from the ref
would be a different question — or, for a sheet written that morning, no question
at all. The same holds for the harness: the `{ key }` step that made a keyboard
journey photographable did not exist the day before the change it was built to
photograph, so an instrument taken from the ref could not have taken the
*before* picture.

**2. It prints and never fails.** A moved picture is the commonest reason to have
run the harness at all, so a comparison that changed the exit code would make
every deliberate visual change a build failure. The verdict a run exits on is
still the overflow measurement alone, exactly as the clipping reading and the
`measure` reading already are. This is 0159's line applied to a reading taken
across two runs instead of inside one: the instrument reports, and which line is
a defect is the report's to say.

**3. A sheet that will not build at the ref is an answer, not an error.** A
specimen written for an API this branch adds has nothing to stand on at the
revision. That is reported as *the sheet does not build there*, with the sentence
the failure announced itself on, and the run's own pictures are still good. What
*does* fail is a revision `git rev-parse` cannot resolve — a question that could
not be asked, as against an answer nobody liked.

**4. The ref's pictures are kept, under the same names, in `<out>/against/`.** A
report's *before* is a file somebody has to find and commit. A verdict that threw
the evidence away would leave the same six commands worth writing. Not a suffix
on the file name: the harness already names a shot
`<specimen>-<theme>-<viewport>-<state>`, which clears 160 characters routinely
and sits the wrong side of the length at which GitHub mangles an image URL in a
pull request body (the 23 September finding, nine data points).

## Consequences

**The claim in a report stops being a sentence a reader takes on trust.** *Two of
the three came back byte-identical and the third is the whole claim* is printed
by the harness, with the ref it was taken against and the directory the other
half is in.

**It is validated against work already in the repository.** Run on the 7 October
focus-return change against the commit before it, the two pictures it produced
are **byte-identical to the two that run committed by hand** — the automated pair
is the hand-made pair, which is the strongest thing that could be said for it.

**A second `pnpm install` is not paid.** `node_modules` is symlinked from the
working tree into the scratch tree. The dependencies are the instrument's, and
the instrument is this branch's by construction, so installing the ref's would be
answering a question nobody asked — and would put a network and minutes inside a
flag people are meant to reach for casually.

**`git archive` rather than a worktree or a checkout.** Extracting a tarball
touches no repository state: no `.git/worktrees` entry to leak if the run is
killed, no index, no lock, and nothing that can be left behind to confuse the
next command. Pathspecs are filtered through `git ls-tree` first, because
`git archive` fails the whole extraction on a pathspec matching nothing and a
`tsconfig` that arrived after the ref is not a reason to refuse a comparison.
`reports/` is 600 MB of committed pictures and is deliberately not extracted.

**A shallow clone is the limit to know about.** A session clone holds fifty
commits, and a ref outside that depth comes back as *no such revision* — which is
true of the clone and misleading about the repository. Named here and in
`docs/routines.md` rather than worked around, because fetching more history
inside a flag would make a photograph depend on a network.

**One defect was found by using it and is pinned by a test.** A `ShotResult`
carries the *path* a shot was written to, and the two sides of a comparison write
into different directories by construction, so the first version keyed the
pairing on the path and matched nothing with anything — reading, convincingly, as
three shots only the ref had taken. The comparison is keyed on the name.

**What it does not do:** no committed baseline image per specimen, no tolerance,
no perceptual difference, no composite showing where two pictures differ. The
reading is `identical` or `differs` and the pictures are both on disk for a human
to look at.

## Alternatives considered

**A committed baseline image per specimen.** Rejected, and it is the obvious
cheaper answer. Every sheet in `reports/` is already a dated artefact nobody
updates, so a baseline would be a second copy of every picture going stale in
silence — and the first lane to change a palette would be asked to re-bless forty
files. It also answers a different question: a baseline says *has this moved
since somebody last blessed it*, and what a report needs is *has this moved
because of the change I am about to ask you to read*.

**Failing the run when a picture moves.** Rejected as the inversion of what the
flag is for. It is the behaviour a visual-regression suite wants and this is not
one: the harness is run *because* a picture is expected to move, and a gate that
went red on that would be disabled by the second lane to meet it.

**Building the ref's tree with the ref's own harness.** Rejected on evidence. It
is the more faithful reproduction of a past state, and it cannot photograph the
case the flag exists for: the instrument is routinely newer than the change, so
the ref's harness would either not understand the sheet or not be able to reach
the state. It also costs an install.

**A worktree, or `git checkout` into a scratch directory.** Rejected. Both
mutate repository state that outlives a killed run, and a stale `.git/worktrees`
entry is exactly the kind of debris a routine with no memory of the last run
cannot diagnose.

**Reverting named files in place, as the hand-written procedure did.** Rejected
outright. It leaves the working tree wrong between two commands, and anything
that reads the tree in that window — a parallel `vitest`, a watcher, a commit —
sees the revert. It is also unable to express a change that spans three modules,
which is most of them.

**A `--diff` composite image showing where two pictures differ.** Rejected for
now, as scope rather than as a bad idea: it needs a pixel library this repository
does not have, and the two files being on disk under the same name is enough for
a human to flick between. Worth a finding if a lane asks for it.
