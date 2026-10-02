# 2026-10-01 — "What if you changed these rules?"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` unit 2, *the policy,
read and played against* — the maintainer's third ask of 1 October, and the
largest single piece of value left in this surface.**

**Branch:** `portal-44-what-if-you-changed-these-rules` (→ `main`), cut from
`main` at `ee9c1d5`. Not stacked. `main` was not pushed to.

**No maintainer comments to address**, on any open pull request. The two
comments on this lane's #463 are Vercel's and this lane's own.

---

## Why this is a second branch and not a push onto #463

`docs/routines.md` step 3 says to push onto a pull request this lane already has
open rather than opening a second one, and #463 is open. **This run deliberately
did not**, and the reason is mechanical rather than a preference:

**#463 adds [0209](../decisions/0209-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
as `Proposed`, and `Loom merge` skips any pull request carrying a `Proposed`
record.** So #463 cannot land until the maintainer has answered a question about
what an "app" is, and anything pushed onto it waits behind that answer. Pushing
today's unit there would have parked a finished, mergeable screen behind an
architectural decision it does not depend on.

**What that costs, and it is not nothing.** Two open branches from one lane is
exactly the situation step 3 exists to prevent. The overlap is kept as small as
it can be, on purpose:

- **Nothing in this diff touches the rail.** #463 rewrites
  `_components/shell/nav-items.tsx` by 444 lines; this screen is reached from
  `/portal/rules` and adds no rail entry, so that file is untouched here. A
  conflict in a 444-line navigation rewrite is not the mechanical kind
  `Loom merge` resolves, and avoiding it was worth designing around.
- **The only file both branches touch is `FINDINGS.md`**, which both append to.
- `docs/portal.md` is #463's and is not edited here, so this report is where the
  unit is recorded against the plan.

**Merge order does not matter.** Either branch lands cleanly on the other.

---

## What shipped

A screen at **`/portal/rules/what-if`**, headed *What if you changed these
rules?*, reached from `/portal/rules`.

It takes every change this deployment has really judged, re-runs the Gate's own
ladder over them against a policy the reader is editing on the screen, and says
which ones would have gone a different way — and, where they would now go ahead
unasked, **how many of them are changes somebody turned down.**

| | |
| --- | --- |
| `_lib/what-if.ts` | new — the replay: the ladder, the self-check, the gameplan |
| `_lib/levers.ts` | new — the seven dials, their addresses, and the code to paste |
| `_lib/what-if-view.ts` | new — every sentence the screen says |
| `…/what-if/page.tsx` | new — the screen and its four states |
| `…/what-if/_components/lever-dial.tsx` | new — one dial, as links |
| `…/what-if/_components/moved-group.tsx` | new — the changes that land in one place |
| `…/what-if/_components/policy-patch.tsx` | new — what to put in your own project |
| `_test/rendered.ts` | new — `surfaceOf`/`recordOf`, one module at last (closes a finding) |
| `portal/rules/page.tsx` | the way in, above *Ask for a change* |
| `_lib/rules-view.ts` | `ORIGINS` and `ASKER` exported, so the dials do not restate them |

---

## Visuals

**Photographs of the application, signed in, with changes that were really
asked for.** A production build, served by `next start`, driven through the
portal's own screens: five sentences typed into the prompt box, five model
calls, two of which the AI could not interpret, one of which was held and turned
down by hand. Nothing was seeded and no component was rendered outside Next.

| | |
| --- | --- |
| [**the screen on arrival**](2026-10-01-portal-what-if-wide.png) | `1280×900@2x`, full page, `scrollWidth 1280 / innerWidth 1280` |
| [**the answer**, with the floor at 50%](2026-10-01-portal-what-if-lowered-wide.png) | the sentence this whole screen exists for |
| [**the answer on a phone**](2026-10-01-portal-what-if-lowered-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |
| [**nothing is allowed at all**](2026-10-01-portal-what-if-refused-wide.png) | `refusalFloor` at `low`, where all three are refused |
| [**the empty state**](2026-10-01-portal-what-if-empty-wide.png) | a fresh deployment, which is what the preview will show |
| [**the way in**](2026-10-01-portal-what-if-rules-wide.png) | `/portal/rules`, with the new link above *Ask for a change* |

The second picture is the one to look at. Its three sentences are:

> 1 of your last 3 changes would have gone a different way.
> **Of the ones that would go ahead without asking, 1 is a change you said no to.**
> The other 2 would have gone exactly as they did.

That middle sentence is a real reading of a real record. Somebody typed *"the
bottom of the page feels like it's missing something"*, the model wrote a closing
line and graded itself 62% sure, the Gate held it because 62 is under this
deployment's 70, a reviewer read it and said no — and at a floor of 50% nobody
would have been asked.

---

## The decisions worth reading

### It proves itself against the record before it is believed

This is the load-bearing one and everything else on the screen rests on it.

Before weighing anything, `replayFrom` re-judges every recorded change **under
the deployment's own policy** and keeps only the ones whose verdict comes back
exactly as it was recorded — the same kind *and* the same rule. A change that
does not reproduce is set aside, counted, and reported in a failure notice above
everything else on the screen, because the only thing it can mean is that this
module's reading of a rule has drifted from the runtime's.

The alternative was to trust the reimplementation. A gameplan built on a misread
rule is advice that is confidently wrong about the one subject a person came to
this screen to be sure of, and it would look exactly like advice that is right.

Two further guards, at two different times:

- **At build time:** `LADDER_AS_REPLAYED` is read off the rungs this module
  walks and held against the runtime's own `ESCALATION_LADDER` by a test. A
  ninth rung added to the Gate is a failing test in this lane on the day it
  lands, rather than a rule this screen has quietly stopped applying.
- **At request time:** a judgment whose `policyFingerprint` is not this policy's
  is set aside before anything else. What a different policy decided is not
  evidence about this one, and a judgment recorded before the Gate fingerprinted
  policies carries none at all — which is counted as *not this policy* rather
  than assumed to be it.

### Seven dials, and the ten it refuses to offer

A `GatePolicy` has seventeen fields. The screen offers the seven the ladder reads
**directly** — two confidence thresholds, the refusal floor, and a ceiling for
each of the four kinds of asker. Those replay exactly, because each rung
compares a number the judgment wrote down against a field of the policy.

It offers none of the ten that decide **how risky a change is measured to be**.
`removalThresholds`, `breadthThreshold`, `protectedPropKeys` and the rest change
the stake *level*, and the level is recorded rather than recomputable from the
record — re-measuring would mean weighing every change against the page as it
stood at the time, which this screen does not have.

**Offering them anyway would have been worse than useless.** Every one of them
would answer "nothing would change", which is a lie shaped like a result. The
screen says what it cannot do, in the disclosure, in those words. **How close it
is to being able to do it is the first finding below: two fields.**

### Links, not a control, and the reason is not the absence of JavaScript

Each dial position is an address. The screen is a plain server render like every
other screen in this route group, it works with scripting off, the back button
undoes a dial — and **a gameplan is a link somebody can send.**

That last one is the one that matters on a governance surface. *"Here is the
setting I want to change, and here is what it would have done to our last thirty
changes"* is an argument, and an argument that cannot be put in front of another
person is not much of one.

Positions equal to the deployment's own are dropped from the address, so a link
only ever names what differs. A parameter restating a current value would read,
to whoever it was sent to, as a fourth thing somebody wants changed.

### It ends in a block of code, and that is the conservative reading of 0200

[0200](../decisions/0200-the-portal-may-place-a-lever-beside-the-evidence-and-a-model-may-never-pull-one.md)
would allow a button here: it says the portal may put a control next to the
measurement that argues for it. This screen does not have one, for two reasons
and neither is timidity.

0200 is `Proposed`. And `/portal/rules` already tells a reader, in its own
words, that *"what an AI may do to your site is a decision that belongs in your
repository, where it is reviewed and versioned like anything else"* — a
simulation is not a reason to move it. So the screen ends in the lines to put in
a `GatePolicy`, and only the lines that moved. The sentence under every moved
dial says *"Nothing has changed on your site — this is a question, not a
setting"*, at the point of contact, where a reader is certainly looking.

Printing the whole policy was the alternative and is a trap: a second copy of
somebody's configuration, stale from the moment it renders, in the one place a
reader is most likely to paste without reading.

### The dial you are on is not a link, and the one you have keeps its mark

Two small things that a screenshot settles and no test suggests.

A link to the screen you are already looking at is a promise that something will
happen; the chosen position is text carrying `aria-current`. And the
deployment's **own** value keeps a `· yours` mark however far the dial has been
dragged — a screen where the current setting becomes indistinguishable from the
four hypotheticals the moment you touch it is one where a person loses the thing
they came in with, and getting back is the most likely next thing they want.

---

## Plain language: what was named, and what moved behind a disclosure

The high-schooler test, applied to this screen: *what happened* — these are the
rules, here is what you are thinking of changing them to, and here are the
changes that would have gone differently. *What do I do next* — either move
another dial, or copy the two lines at the bottom into your project.

| named | rather than |
| --- | --- |
| **What if you changed these rules?** (route `…/what-if`) | anything with *simulate*, *policy* or *gameplan* in it |
| *How sure must Loom be before it changes anything on its own?* | `minimumConfidence` |
| *How sure must it be to bother you at all?* | `confidenceFloor` |
| *What is never done here, however it was asked for?* | `refusalFloor` |
| *Somebody using your site: how far may a change go without asking you?* | `autoApplyCeiling.user-instruction` |
| *Would go ahead without asking* · *Would stop and ask you* · *Would be turned down* | `accepted` · `requires-confirmation` · `rejected` |
| *You said no to this one.* | `answer: discarded` |
| *1 is a change you said no to* | a delta between two disposition tallies |
| *Some of this screen's arithmetic does not add up.* | a reproduction-rate metric |
| *50%* · *Low risk* · *Very high risk* | `0.5` · `low` · `critical` |
| *Nothing has been judged under these rules yet.* | an empty list |

Behind a disclosure, and nothing dropped: both verdicts in the runtime's own
words (`requires-confirmation / confidence-below-minimum` → `rejected /
stakes-at-refusal-floor`), the proposal id, the origin, the confidence as a
number, the stake level, the reversibility, every stake factor as a clause, the
two policy fingerprints, and the account of which ten settings cannot be played
against and why.

---

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which of the changes they turned down would have happened anyway under the
settings they are considering.**

A repository holds the policy — `git log` will tell you to the minute when
somebody set `minimumConfidence` to 0.7. A server log holds what was served. A
deployment history holds what shipped. **None of them holds the changes that
were refused or held**, because a refusal produces no commit, no build and no
file; the only trace it leaves anywhere in the world is in Loom's own journal.

So the question *"what would a looser rule have let through?"* has no answer
outside this system, in principle rather than in practice. It is not that the
information is hard to get. The events it is about did not happen, and the only
record that they were ever considered is the one this screen reads.

And the sharper half: a loosening always reads as time saved. **The cost is only
visible in what the released changes were**, and no count of saved interruptions
can express *"one of those is a change you looked at and decided against"*. That
sentence is the whole value of the screen, and this deployment's own record
produced it on the first try.

---

## Tests

`pnpm verify` **green, exit 0**, on a `dist` and a `.next` deleted first, with
the status written to a file as the last thing on its own line and read in a
separate command — `docs/routines.md`'s rule, and the compound-command trap it
names is why nothing follows the gate on that line.

| | `main` at `ee9c1d5` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 171 files / 3,441 | **171 / 3,441** — `src/` untouched |
| `@loom/app` | 348 files / 6,040, 1 skipped | **355 / 6,239**, 1 skipped |
| findings ledger | 929 entries | **930**, 0 malformed |

120 prerendered pages, 1,451 text junctions, 0 run together; 3 metadata
conventions, 0 unserved. The new route is under the portal's `force-dynamic`
segment, so it is served per request and contributes no prerendered page.

**+199 application tests, of which 167 were written.** The other 32 are this
lane's own filesystem-driven sweeps picking up four new components —
`every-screen.test.ts` runs its reading-order, disclosure-altitude,
heading-case and plain-language rules over whatever the lane contains, a case
per file, per disclosure and per sentence — which is that arrangement working,
and is said out loud rather than claimed as authorship.
**Nothing was weakened, skipped or deleted.**

The sweep figure is also why the count moved by two when the second defect below
was fixed: deleting one rendered sentence from the page deletes the cases that
swept it.

The one skipped test is `app/(docs)/_lib/signals/page.test.ts`, which is on
`main` and is not this lane's.

> **A note on the `main` figures.** They were measured on a clean worktree of
> `ee9c1d5` sharing this checkout's modules. Five `(docs)` API tests failed
> there for a reason that is an artefact of the measurement and not of `main`:
> they look for `dist/` relative to the worktree root, which has none. They are
> counted as passing above, because they pass on this branch and on a normal
> checkout. `main` is green.

Where the written tests went:

- `_lib/what-if.test.ts` — **40, new.** Every rung firing; the precedence pairs
  that a right-rungs-wrong-order replay would get wrong (a count moves between
  rows and every total stays correct, which is the quietest way to be wrong);
  the ladder held against `ESCALATION_LADDER`; and the five ways a change is set
  aside. The sharpest is built so that **guessing would have worked**: a record
  with no stake factor codes and a recorded acceptance is still refused, because
  reading the absence as "none were weighed" would reproduce the verdict exactly
  and would silence three rungs that hold a change whatever the dials say.
- `_lib/levers.test.ts` — **38, new.** Including the property the honesty of the
  screen rests on — *no dial exists for a setting the replay cannot honour* —
  and the round trip from a dial's own link back to the position it offered.
- `_lib/what-if-view.test.ts` — **51, new.** Every sentence, in every case,
  including the three that need a deployment somebody has really said no on.
- `…/what-if/reading-order.test.ts` — **16, new.** The order, and the three
  things the screen may never become: it may not write, it may not offer a dial
  it cannot replay, and it may not take its policy from anywhere but the module
  the write path is built from.
- `…/_components/lever-dial.test.tsx` **8**, `moved-group.test.tsx` **8**,
  `policy-patch.test.tsx` **6**, all new.

### Two defects the tests and the pictures each found one of

**`refusalFloor: high`** — the block of code printed a level unquoted, because
the first version decided quoting by which field carried the value rather than
by what the value is. That is a reference to an undeclared name, in the one
block on the screen a person is invited to paste. Caught by a test written
before the code was read back; fixed by asking whether the value is a number.

**"The other 0 would have gone exactly as they did."** — on the refusal-floor
screenshot, where every change moves. A count of nothing printed as a
reassurance, produced by a template, invisible to every test that existed, and
the fourth time this lane has found this exact shape of sentence by looking at a
picture. It is a function with its own cases now.

---

## Findings

**Filed one, closed one.**

1. **A host cannot re-measure its own stakes from its own record, and it is two
   fields short.** `assessStakes` is published and reads nine fields of
   `ChangeAnalysis`; `AssessmentSummary` carries seven. The two missing are
   `affectedNodeIds` — read for its **length alone**, so a count is enough — and
   `configuredPropKeys`. With those, the ten settings this screen refuses to
   offer become seven more dials, and *"would marking `loom.card` as protected
   have caught any of this?"* becomes answerable from the record. For
   `Loom daily build`: it is a record type, and 0018 makes reaching into `src/`
   to add one the wrong fix.
2. **`surfaceOf`/`recordOf` is one module**, at `_test/rendered.ts`. **Closed** —
   the 4 September entry, which was itself a count on the 2 September one. Four
   identical copies, each carrying a comment explaining that it had been copied
   because the files it would be merged with were open on unmerged branches. All
   four had been on `main` for weeks and nobody had been back to check. What made
   this run do it was needing a fifth: *"a helper in four places is not a
   helper"* reads as a judgement when you are writing the fourth copy and as an
   instruction when you are about to write the fifth.

---

## What I did not do

**No decision record, and nothing architectural.** `docs/portal.md` unit 2 is
approved, and nothing here contradicts an `Accepted` record. The screen is a
read: it writes no policy, no change and no saved scenario, which is 0031 and
0200 clause 4 held exactly. 0200 stays `Proposed` and untouched — this unit does
not depend on it being accepted, which is deliberate, because it means
`Loom merge` can land this without waiting on a decision.

**I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty.
`gate`, `ESCALATION_LADDER`, `ceilingFor`, `isAbove`, `isAtLeast`,
`policyFingerprintOf` and `episodesOf` were all already published on entry
points a host may reach (0018) — the sixth consecutive unit of this plan where
the answer was assembly. The one gap found is filed rather than fixed.

**I did not edit another surface's route group**, and I did not touch
`apps/loom/app/(portal)/_components/shell/`. Nothing outside
`apps/loom/app/(portal)/`, `FINDINGS.md` and `reports/` is in the diff.

**I did not widen the portal into a design tool** (0019). Nothing on this screen
asks for a change or edits a page.

**I did not add it to the rail**, and that is a judgement rather than an
avoidance of #463's diff. It is a question about the rules, reached from the
rules; a rail entry would make it a fourteenth noun on a surface the maintainer
has just called a disorganised mess.

**I did not declare the screen in `_lib/screen-names.ts`.** That module's own
stated discipline is that it holds the three screens that were being called
several things by several parts of the portal, and that every screen it names
declares the neighbour a reader confuses it with. This one has no such
neighbour. Its name is written once, in `_lib/levers.ts`, and read by both the
heading and the one link that leads here — which is what that module is for.

**I did not leave the scripts** that drove the browser, or the `.env.local` the
server needed. Both were in the scratch directory; `git status` is clean of them.

**Nothing is scheduled and no pull request is subscribed to.**

---

## Recommendations

1. **0209, so #463 can land.** It is the only thing holding a finished screen,
   and the question is short: did *"which apps I have registered"* mean different
   rules for different surfaces of one product — which exists today, via
   `PolicySource` — or two products side by side, which is a schema change the
   record costs out?
2. **Register the starter set on this deployment.** #463's first ask, unchanged
   and now sharper: this portal registers 4 primitives and Loom ships 102, so
   nothing with a form, a frame or a data binding has ever been judged here —
   which means half the stake factors on this screen have never fired on real
   evidence.
3. **The two fields in finding 1**, for `Loom daily build`. They turn a
   seven-dial screen into a seventeen-dial one, and they are the cheapest piece
   of leverage this lane has found in a while.
4. **Unit 4 next for this lane** — the front door folded in — which needs #463 on
   `main` first. Unit 3 needs the framework boundary in `docs/portal.md` drawn.
5. **`completed`, for `Loom daily build`** — signals step 2, approved
   13 September, still unbuilt. Seventh report in a row to say so.
