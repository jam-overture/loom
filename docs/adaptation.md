# The loop that closes

**Draft for the maintainer to mark up, 5 October 2026.** Not approved, not owned
by a lane. It describes the end-to-end flow the product has always argued for and
has never run once: **a page reports how it is read, something proposes a change
from that, the Gate decides, and the result is measured against what came
before.**

Everything in it is buildable today except two pieces, and neither is the hard
part.

## What this completes

`docs/signals.md` ends at counters and says so: *signal-to-intent derivation — a
signal automatically becoming a `system-signal` proposal — is the next question
after this plan, not part of it.* The runtime has gated `system-signal` since §2,
with a deliberately lower ceiling than a person's instruction, and nothing has
ever sent one.

This is that wiring, plus the half nobody has written down: **how you know the
change was an improvement.**

## What exists

| | |
| --- | --- |
| Measurement | five kinds, intake, buffer, rollup, retention |
| Counters | `views`, `reached`, `engaged`, `dwellMs`, `activations`, `opens`, `closes`, `completions` — **per node, per revision** |
| Funnels | `reached` → `converted` for a pair of node addresses a deployment names, per revision |
| The model seam | `modelInterpreter({ client })` takes anything with `complete`; a small local model is a client like any other |
| The gate | `origin: "system-signal"`, capped at `low` by default, so a structural change is held for a person and a small one is not |
| The record | rationale, provenance, disposition, inverse — on every change, whoever asked |

**The counters are already per revision.** That is the whole reason this is
tractable: reward attribution, the part that is usually hard, is a column that
already exists.

## What is missing

| | Where it goes |
| --- | --- |
| **Serving a chosen revision to a reader** | The host's `TreeSource` decides what a request renders. Nothing selects today |
| **Assignment** — which reader sees which revision | Per *page view*, because there is no cross-visit identity and there deliberately will not be (0146) |
| **A named objective** | Per deployment. Named on 11 October — adoption, as the next section states it — and still to be written into a deployment's configuration |
| **An allocator** | Smallest piece here. Thompson or epsilon-greedy over revisions |
| **Promotion and the floor** | Minimum exposure, an early stop for a clear loser, and a person in the loop — which, at the traffic this page has and the objective it was given, means every time |
| **Derivation from counters** | A sentence a person could argue with, computed from tallies — the step the ski prototype proved |

## The objective

**Adoption: readers who go and install the framework.** That is what this work
was asked for in the first place — *turn visitors into people who go to download
and install the loom framework* — and the maintainer restated it on 11 October:
whatever gets the most of that is what to build.

**This section used to name reach as the thing to optimise, and that was a
mistake of filing rather than of arithmetic.** Reach is a *proxy*: it resolves
four times faster at this traffic, which is a real argument and is still true
below. Writing it under the heading **the objective** made a statistical
convenience look like a decision about what the project wants, and it is not one.
The goal has not moved. Reach goes back to being what explains a result.

### What an install is, on the page as it stands

The front door has carried the ask since 11 October, and it is one band holding
two controls:

| | Node | What a press means |
| --- | --- | --- |
| **The command** | the `loom.code` panel | The strongest thing this site can observe: the install line went to a clipboard |
| **The guide** | the `loom.action` into `/docs` | A reader going to find out how. Weaker, and still adoption-shaped |

Either press is the objective. Nothing else is inside that band, so **a use
anywhere inside the install band is an install intent** — which matters because
it is already a number this subsystem produces.

### The figure, and it needs no new counter

| | Figure | Where it comes from |
| --- | --- | --- |
| **Optimise** | distinct page views with a use inside the install band ÷ page views | `PartAction.within` (0167) over `pageViewsFor` |
| **Explain** | `reached` on the install band ÷ page views, and `within ÷ reached` | `reach.ts` and `PartAction.share` as they stand |
| **Describe** | `dwellMs` and `engaged` per band | Where readers stop, worth having whether or not anything is optimised |

Two things were checked in the code rather than assumed, because the objective
rests on both:

- **A press on *Copy* names the band.** `ancestryOf` in `broadcast.ts` walks
  every addressed ancestor of the pressed element, and the per-kind `types`
  filter applies only to the target's own type — so narrowing what this site
  asks about does not clip the chain, and the `activated` signal from the panel
  carries the install section in its `within`.
- **The rate has a home already.** Dividing a part's distinct-view count by the
  page views counted at the door is exactly the join `reach.ts` makes, with its
  ceiling and its over-count stated (0147, 0219). The objective wants that join
  with `within` where `reached` is. One reading of an existing shape; no new
  counter, no new kind, nothing on the wire.

**There is no guard metric now, and that is a simplification rather than an
omission.** The guard existed because the target was a proxy: reach could be won
by dragging uninterested readers at the ask. A target that *is* the terminal
event cannot be gamed by its own proxy. What replaces it is the decomposition —
`installs ÷ views` = `reached ÷ views` × `within ÷ reached` — which says whether
a variant won by getting more readers to the band or by making the band work
harder, and that is the sentence a person needs in order to agree with it.

## What your traffic means, stated plainly

A LinkedIn post is a burst of a few hundred views at best, and then quiet.

Rough sample sizes, per arm, for 80% power at the usual threshold:

| To detect | Per arm | Two arms |
| --- | --- | --- |
| reach 30% → 40% | ~350 views | ~700 |
| **installs 2% → 4%** (a doubling) | **~1,150 views** | **~2,300** |
| installs 2% → 3% | ~3,800 views | ~7,600 |

**The objective is the expensive one, and it was chosen anyway.** That is the
right call — a cheap answer to the wrong question is worth nothing — but the
consequences are design requirements and not disappointments:

1. **A person promotes, not the bandit**, and for a long while that is the only
   mode. Below a floor the deployment sets, the allocator may *recommend* and may
   not promote. This is what the Gate already does: a structural `system-signal`
   change is above the `low` ceiling and is held for a human by default. The loop
   ends at *here is the change, here is why, here is the evidence*.
2. **Only large moves are worth proposing.** At this traffic nothing under a
   doubling will resolve, so the loop should argue about where the ask *is* —
   above the fold, in the closing band, in the menu — and never about wording a
   button. A proposal whose honest expected effect is a few percent is a proposal
   that cannot be judged, and the brief should say so rather than make it.
3. **"No winner" is a first-class outcome**, reported as confidently as a winner.
   The failure mode of every experimentation tool is that it never says this.
4. **Assign per view, randomly, and never by time.** One burst and one quiet week
   are different populations; randomised per view, the burst is one cohort and
   both arms are inside it.
5. **Reach is the leading indicator and is read first.** It moves before the
   objective does and resolves four times sooner, so a variant that is winning
   reach and flat on installs at 300 views is the ordinary early state and not a
   result. It is a reason to keep a variant running, never a reason to promote
   one.

**The first milestone is description, not decision.** With two hundred views you
can see where readers stop, which question they open, and whether anyone reaches
the ask — and that is worth more to a page nobody has read yet than any
significance test.

## The loop, in order

```
tallies (per revision)
   │  deterministic
   ▼
a sentence a person could argue with        ← derivation
   │
   ▼
EditIntent { origin: "system-signal" }
   │
   ▼
a small model turns the sentence into operations   ← the model seam
   │
   ▼
the Gate: applied, held, or refused
   │
   ▼
a new revision, served to a share of views  ← assignment
   │
   ▼
tallies (per revision) …
```

**The derivation is deterministic and the model only writes operations.** Two
steps, not one, and the ski prototype is why: *readers spend 73% of their time on
goggles* can be checked against the counters, and *move goggles up* cannot. The
sentence is what a reviewer reads six months later, so the sentence must be
computed from numbers rather than composed by a model that also chose the change.

A small model is enough for the second step precisely because the vocabulary is
closed, the reply is schema-constrained, and the Gate catches what gets through.

## The rules this would be built under

1. **The bandit is not the Gate.** The Gate asks *may this change apply* —
   reversibility, stakes, ceilings. A bandit asks *which is better*. Collapsing
   them gives you a safe change that loses and a winning change that is unsafe.
   The repository already holds this line: calibration is a reader, not a
   controller (0031).
2. **Every candidate passes the Gate**, as an ordinary `system-signal` change. An
   experiment is not an exemption.
3. **Assignment is per page view.** No cross-visit identity, no cookie, nothing
   that would make a reader followable (0146). The cost is honest and worth
   stating: return-visit effects are unmeasurable, and that is a consequence of a
   decision taken deliberately.
4. **The objective is named by the deployment**, in its configuration, and
   recorded alongside the result. An experiment whose objective can be chosen
   after the numbers are in has proved nothing.
5. **Promotion is a change like any other** — it goes through the Gate, lands in
   the log, and is revertible by the ordinary inverse.
6. **Every arm is attributable.** A reading that cannot name the revision it
   belongs to is dropped rather than pooled.

## The page this runs on

**The marketing site, and only it.** Chosen 11 October. The docs are not built in
Loom — they are MDX — so they cannot be addressed, cannot broadcast, and are not
part of this. 0259 refuses the same thing from the portal's side: prose is not
brought under governance by rewriting it as a tree.

The funnel therefore **ends at the click out of marketing**. The true conversion,
an actual `npm install`, happens somewhere this deployment cannot see; npm's
download API is an honest north star and can never be attributed to a variant.

### What the site can and cannot see today

| | |
| --- | --- |
| Measured | bands (`viewed`, `dwelled`), and `loom.action`, `loom.card`, `loom.code`, `loom.link`, `loom.brand` (`activated`), FAQs (`disclosed`) |
| **The ask** | An install band on `/` since 11 October: the command in a panel a reader can copy, and one control into `/docs`. A press on either names the band in its `within` |
| **No conversion event** | `COMPLETION_TYPES` is empty. There is no form, so nothing can `complete` — and with the objective ending at a press rather than a submission, nothing needs one |
| **The hand-typed install is invisible** | A reader who selects the line and copies it with the keyboard, or types it, is an adoption this site will never hear about. The figure is a floor and every report should say so |

So the funnel this loop exists to improve **exists as of 11 October**, and the
rows above are the whole of what a model pointed at this page can be told.

**The before-and-after is the band itself.** The site counted *clicked through
toward the docs* before the band existed, through the header's `loom.link` per
surface; it now counts the band's own presses as well. The first thing the
tallies can answer is whether naming the ask changed anything, which is a
question about this change rather than about a variant of it.

### The dependency 0259 names, arrived at twice

A variant is a revision, and revisions live in the store. The marketing routes
build their pages per request, so today there is **no revision to serve, none to
attribute a reading to, and nothing a proposal could change about what a visitor
is given**.

[0259](../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
reached the same requirement from the portal's side — *a surface is governed when
the portal's store is where its pages come from* — and filed the work for
`Loom marketing`. One change unlocks both, and it is the gate on milestone 2.

**What it makes possible is worth saying out loud:** once the page comes from the
store, *adding the install ask* is itself a proposal through the Gate — held for
a person, recorded, revertible, and measurable against the revision before it.
The site's first adaptive change would be the one that gives the loop something
to optimise.

## The game plan

Seven milestones. **Each is worth having if the next never happens** — that is
the test every one of them had to pass to be on this list, because an adaptation
loop is exactly the kind of project that is abandoned four fifths of the way
through and leaves nothing behind.

Status is kept here. A run that finishes one marks it, and a run that learns the
plan was wrong says so here rather than in a report nobody reads again.

| # | Milestone | Owner | Done looks like | Status |
| --- | --- | --- | --- | --- |
| 1 | **A page with an ask, addressed and broadcasting** | maintainer session | Signals arriving at an intake, filed under one tree and revision. No model, no variants | **the ask exists.** 11 October: an install band on the front door, a `loom.code` panel printing the two package names, its presses asked about in `readers/asked.ts`. What is left is the intake |
| 2 | **Serve a revision, and attribute to it** | `Loom marketing`, then maintainer session | Two revisions served, assignment randomised per view, tallies accumulating separately under each. The page can answer *where do readers stop*, per revision | **unblocked.** [0259](../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md) was accepted on 11 October, so the store-backed render is `Loom marketing`'s to do |
| 3 | **Derivation from tallies** | maintainer session | Counters → one sentence a person could argue with, deterministic, with the numbers that produced it carried alongside. Tested against a case where it should say nothing | not started |
| 4 | **The model seam, with a small local model** | maintainer session | Sentence → operations → the Gate → held for a person, and the record reads correctly: rationale, origin `system-signal`, inverse | not started |
| 5 | **The allocator** | undecided | Recommends an arm, reports *no winner* when there is none, and cannot promote below the evidence floor | not started |
| 6 | **Promotion and the floor** | undecided | Promotion goes through the Gate like any change and is revertible; nothing is promoted below the evidence floor, and the decomposition is reported beside every result so a person can see whether the variant won at the band or on the way to it | not started |
| 7 | **Harden what proved stable into `src/`** | a lane, decided then | The parts that stopped changing move out of the prototype. This is when the lane question gets answered rather than guessed | not started |

**Milestones 1 to 4 are a maintainer session's**, in the open, on a prototype —
the ski page is the precedent and `prototypes/` belongs to no lane. Nothing here
is a routine's until step 7, and making it one earlier would hand a nightly agent
a design that has never run.

### If this stalls, milestone 2 is the one to finish

A page that can say *readers get this far and stop*, per revision, pays for
itself with no model, no allocator and no statistics. Everything after it is
optimisation; it is description, and description is what nobody has today.

### What is blocked on the maintainer

1. ~~**Which node is the ask.**~~ **Answered on 11 October.** The front door
   carries an install band: a heading, the two package names in a panel a reader
   can copy, and one control into the docs. `loom.code` is in `CONTROL_TYPES`, so
   the copy is a press this site asks to be told about. The ask is the `loom.code`
   node of the install band on `/`; everything downstream points at it.
2. ~~**Accepting or refusing [0259](../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md).**~~
   **Accepted on 11 October.** Milestone 2 is unblocked, and the marketing
   surface earns portal governance by rendering from the store rather than by
   being wired to it.
3. ~~**Confirming the objective.**~~ **Answered on 11 October: adoption.**
   *"The objective is to get people to click to install the Loom library from
   NPM. Whatever gets us the most of that is what we need."* The target is the
   install band's own number — `within ÷ page views` — and reach is demoted to
   the thing that explains it. The section above is rewritten to say so.
4. **The evidence floor**: how many views per arm before anything may be promoted
   without a person. **A recommendation, since the objective is now the expensive
   one:** 1,000 views per arm, which is just under the ~1,150 a doubling needs, so
   the floor is never the thing that lets a weak result through — the test is.
   At the traffic described above that means *a person decides, every time*, for
   the foreseeable future, and the honest thing is to build the loop that way
   rather than to pick a floor low enough to make it feel automatic. The number
   is still a judgement about how much being wrong costs, and it is the
   maintainer's.

### Where this is written down

- **This file** is the plan and the status. It is the only place either lives.
- `docs/signals.md` ends where this begins and points here.
- `docs/rollout.md` carries it as a phase, so it is visible from the plan that
  tracks launch.

## Still not in scope

- **Cross-visit identity**, in any form. Parked 30 September and nothing here
  needs it.
- **Multi-page journeys.** One page, one view, one objective, until that works.
- **Automatic promotion below the evidence floor.** The allocator may recommend.

## The first variants, when there are any

Named here so the loop is not handed a blank page, and because at this traffic
only large moves resolve (above). None of these is decided; each is a proposal
the Gate would hold for a person.

1. **Where the band sits.** It is after the questions today. Above the fold, or
   repeated in the closing band, are the two moves with an effect large enough to
   be seen.
2. **A third control: the package on npm.** The objective is phrased as clicking
   through to install, and the page offers a command and a guide but no link to
   the package itself. Adding one is a page-design decision for the maintainer,
   not a proposal the loop should make on its own — it is a new control rather
   than a rearrangement, and the Gate's vocabulary for the loop is
   insert/remove/move/configure over what the registry already has.
3. **What the band says.** The weakest of the three, and the one to leave until
   the traffic can support it.

## Open questions

1. ~~**What is the ask?**~~ Answered 11 October: the install panel on the front
   door. What is still open is whether it is in the right *place* — it sits after
   the questions band, which is a judgement nobody has evidence for yet, and is
   exactly the first thing the loop should be allowed to argue about.
2. **Where does the loop live** once it is proven — a lane of its own, the signals
   lane, or the framework's? Step 7, deliberately last.
3. **How many arms?** Two is the honest answer at this traffic; the design should
   not foreclose more.
4. **Does a held proposal expire?** A structural change recommended on Monday's
   evidence, answered on Friday, was judged against a tree and a readership that
   have both moved.
