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
| **A named objective** | Per deployment. The next section argues for a shape |
| **An allocator** | Smallest piece here. Thompson or epsilon-greedy over revisions |
| **Promotion and guardrails** | Minimum exposure, an early stop for a clear loser, and a person in the loop while traffic is small |
| **Derivation from counters** | A sentence a person could argue with, computed from tallies — the step the ski prototype proved |

## The objective

A landing page has one ask — a form, a sign-up, a *request access* — and the
honest decision metric is **of the readers who reached the ask, how many
completed it**, which is exactly a funnel pair.

**But that is not what to optimise for, and the reason is causal.** A structural
change moves furniture: it reorders bands, lifts the ask, shortens the path. What
that can actually change is **how many readers get to the ask at all**. Whether
somebody who is looking at the form fills it in is mostly about the offer, not
the layout.

So:

| | Metric | Why |
| --- | --- | --- |
| **Optimise** | `reached` on the ask band ÷ `views` | What a structural change can move, and it fires for every reader who scrolls — ten to fifty times the events of a completion |
| **Guard** | `converted` ÷ `reached` on the funnel pair | Stops a variant winning by dragging uninterested readers to the form. If reach goes up and this goes down, the variant is not an improvement |
| **Describe** | `dwellMs` and `engaged` per band | Where readers stop, which is worth having on day one whether or not anything is ever optimised |

Both numbers already exist per revision. Neither needs a new kind, a new field,
or anything on the wire.

## What your traffic means, stated plainly

A LinkedIn post is a burst of a few hundred views at best, and then quiet.

Rough sample sizes, for 80% power at the usual threshold:

| To detect | Per variant |
| --- | --- |
| reach 30% → 40% | **~350 views** |
| completion 5% → 7.5% | **~1,500 views** |

So reach is **four times cheaper** to learn about than completion, and even reach
will not resolve from one post. Three consequences, and they are design
requirements rather than disappointments:

1. **A person promotes, not the bandit.** Below a floor the deployment sets, the
   allocator may *recommend* and may not promote. This is not a workaround: it is
   what the Gate already does — a structural `system-signal` change is above the
   `low` ceiling, so it is held for a human by default. The loop ends at *here is
   the change, here is why, and here is the evidence* until there is enough
   evidence to end it anywhere else.
2. **"No winner" is a first-class outcome** and must be reported as confidently
   as a winner. The failure mode of every experimentation tool is that it never
   says this.
3. **Assign per view, randomly, and never by time.** One burst of traffic and one
   quiet week are different populations; a variant that ran on Tuesday is not
   comparable to one that ran on Friday. Randomised per view, the burst is one
   cohort and both arms are inside it.

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

## The game plan

Seven milestones. **Each is worth having if the next never happens** — that is
the test every one of them had to pass to be on this list, because an adaptation
loop is exactly the kind of project that is abandoned four fifths of the way
through and leaves nothing behind.

Status is kept here. A run that finishes one marks it, and a run that learns the
plan was wrong says so here rather than in a report nobody reads again.

| # | Milestone | Owner | Done looks like | Status |
| --- | --- | --- | --- | --- |
| 1 | **A page with an ask, addressed and broadcasting** | maintainer session | Signals arriving at an intake, filed under one tree and revision. No model, no variants | **blocked** — needs the page, and which node is the ask |
| 2 | **Serve a revision, and attribute to it** | maintainer session | Two revisions served, assignment randomised per view, tallies accumulating separately under each. The page can answer *where do readers stop*, per revision | not started |
| 3 | **Derivation from tallies** | maintainer session | Counters → one sentence a person could argue with, deterministic, with the numbers that produced it carried alongside. Tested against a case where it should say nothing | not started |
| 4 | **The model seam, with a small local model** | maintainer session | Sentence → operations → the Gate → held for a person, and the record reads correctly: rationale, origin `system-signal`, inverse | not started |
| 5 | **The allocator** | undecided | Recommends an arm, reports *no winner* when there is none, and cannot promote below the evidence floor | not started |
| 6 | **Promotion and guardrails** | undecided | Promotion goes through the Gate like any change and is revertible; the guard metric stops a variant that wins reach and loses conversion | not started |
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

1. **The page, and which node is the ask.** Milestone 1 cannot start without it,
   and it is a page-design decision rather than an engineering one.
2. **Confirming the objective** above — reach as the target, conversion rate as
   the guard — or naming a different one.
3. **The evidence floor**: how many views per arm before anything may be promoted
   without a person. The arithmetic above says a few hundred for reach; the number
   is a judgement about how much being wrong costs.

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

## Open questions

1. **What is the ask?** The objective above is a shape; it needs one named node to
   point at. Choosing it is a page-design decision and comes first.
2. **Where does the loop live** once it is proven — a lane of its own, the signals
   lane, or the framework's? Step 7, deliberately last.
3. **How many arms?** Two is the honest answer at this traffic; the design should
   not foreclose more.
4. **Does a held proposal expire?** A structural change recommended on Monday's
   evidence, answered on Friday, was judged against a tree and a readership that
   have both moved.
