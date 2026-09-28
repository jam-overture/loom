# The portal — the approved plan

**Status: approved by the maintainer, 27 September 2026.** Written by the portal
routine at his instruction in an interactive session, which is the same route by
which [`routines.md`](routines.md) and [`signals.md`](signals.md) came to exist —
a routine cannot write the plan it is meant to find its position in, on its own
initiative.

It does not supersede `docs/rollout.md`, which places §5 among the surfaces. It
says what §5 does next.

## Why now

The framework is published, and the marketing and documentation sites are good.
The maintainer's verdict on the portal, in his words:

> *"Overall, I like the individual components of the portal, but I think the
> portal fails overall in one major regard; what am I supposed to do here? I
> don't think we tell the user what that is and how to do it, and how to do it in
> a way that truly delivers value to them."*

**The defect is not any screen. It is that there is no front door.** `/portal` is
a queue — its two sections are *Waiting on you* and *Changed without asking you*.
It answers *what needs me* and never *what is my site, how is it doing, what do I
do next*. A person arriving with nothing waiting meets an empty queue.

Everything below follows from that, and the second half of it is discovery:
several of the things the maintainer could not find **already exist** and are
reachable only by knowing the noun they were filed under.

## What already exists, and is under-used

Checked against the code on 27 September, before any of this was planned. It
matters because it changes the order of the work: a good deal of phase 1–3 is
assembly.

| | where |
| --- | --- |
| **Rendering one node on its own, in the tree's theme** | `renderLoomExcerpt`, published on `@jam-overture/loom/react`. Its docstring: *"A preview, an inspector and a side-by-side are all the same shape."* **The portal has never called it.** |
| **Folding a tree to any revision** | `replayTree` and `store.revisions()`, published on `@jam-overture/loom/store`. No framework gap. |
| **Per-node, per-revision reader counters** | `/portal/readers`, including *"What the last change did to your readers"* — a before-and-after across a change. |
| **The live preview, the outline and selection** | `/portal/pages/[treeId]`, three panes, exactly as 0019 specified. |

Two things are genuinely absent: **A/B serving**, and the `completed` signal kind
(step 2 of `signals.md`, approved and unbuilt) without which the portal can
measure attention and **not conversion**.

**One thing stopped being absent overnight.** This lane filed on 27 September that
a refusal read back out of the record can name the rule and never the reason,
because the stake factors were not stored;
[0198](../decisions/0198-a-refusal-records-which-rules-it-broke-and-the-rules-names-are-a-closed-vocabulary.md)
and #428 landed `stakeFactorCodes` on `AssessmentSummary` the same night. So
**explaining a refusal you come back to tomorrow is now a portal unit**, not a
framework gap — `cannotBeDrawn` tests a set of codes, and the codes now cross.
It is not in the phases below because it belongs to whichever of them touches
the review queue first, and it is worth doing before phase 7 rather than after:
a lever beside the evidence is worth less when the evidence cannot say why.

## The two records this plan rests on

Both written 27 September, both `Proposed`, both the maintainer's to accept.

- **[0200](../decisions/0200-the-portal-may-place-a-lever-beside-the-evidence-and-a-model-may-never-pull-one.md)**
  — the portal may put a control next to the measurement that argues for it; a
  person always pulls it; **no measurement in this system may write a policy, a
  delta or an intent.** It also records that the portal routine's first reading
  of 0031 was wrong: 0031 refuses a *runtime* control loop and explicitly asks
  for a human to be able to act.
- **[0199](../decisions/0199-the-outline-may-render-what-it-addresses-and-a-hand-may-yet-move-a-node.md)**
  — rendering the selection in isolation is inside 0019 and buildable now;
  **moving a node by hand is not, and is recorded as an open question** with the
  maintainer's own framing of it kept verbatim.

Nothing in phases 1–4 depends on either being accepted. Phases 5–7 do.

## The plan, in order

Each phase is one or more pull requests, each reviewable on its own. **Do not
start a phase whose input is not on `main`.**

### 1. The front door · `Loom portal` · **approved, first**

`/portal` becomes a landing page. What a person sees before they know anything:

- **Their pages**, each with a rendered thumbnail, its name, when it last
  changed, and whether anything is waiting on it. This is the Vercel project
  list and it is the single largest change in this document.
- **What needs them**, which is today's queue, kept and demoted to a section.
- **What changed lately**, and what readers did about it.
- **One obvious next action**, which on an empty deployment is not "you have no
  pages" but the thing that creates one.

**The expensive choice, named once.** A thumbnail is a render of a page. Rendering
every page on every dashboard load is the one real cost in this phase, and the
answer is to cache per `treeId` + `revision` — which is sound because a revision
is immutable by construction (0016). A thumbnail that could go stale would be a
dashboard lying about what is being served.

**Done looks like:** a bright high schooler opens `/portal`, can say what their
site is and what state it is in, and has one thing to press. The empty state is
the same test with nothing in the store.

### 2. The inspector · `Loom portal` · **approved, after 1**

Click one or more nodes in the outline; see exactly those rendered, on their own,
in the page's own theme, through `renderLoomExcerpt`.

- **One or more.** The maintainer asked for a set, not a node. Several selected
  nodes render as several excerpts **in document order** — a set of parts has no
  arrangement of its own, and inventing one is how a canvas arrives through the
  side door (0199).
- **Beside the page, not instead of it.** 0019's three panes stand.
- **The way to change what is selected is still to ask** — `scopeNodeId`, which
  0019 already specified and which the prompt box already sends. A multi-node
  selection scopes to the nearest common ancestor, **stated rather than performed
  silently**, which is the rule the one-node fallback already keeps.

### 3. Versions, and the progression · `Loom portal` · **approved, after 2**

Three questions, one mechanism — an excerpt or a page rendered from a tree the
log produced rather than from the head:

- **What it looks like** — head, which is phase 1's thumbnail at full size.
- **What it looked like** — any revision, replayed.
- **What it would look like** — head with a held proposal's delta applied, which
  is the review queue's most-asked question and has never been answerable by
  eye.

**And the progression.** The maintainer:

> *"seeing a progression of the history, almost like I am watching a movie of it
> changing and morphing would be cool."*

A scrubber across the revisions of a page, rendering each as you move. Playable.
It is one component over the thing phase 3 already builds, and it is the clearest
demonstration Loom has of its own premise: **a page that was never written, seen
becoming itself.** Worth building for the marketing site to point at, and worth
building well.

Two things it must not do. It must not smooth: a revision is a discrete state and
a tween between two of them is a picture of something that never existed. And it
must not silently skip a revision that cannot be replayed — an unreplayable log
is exactly what `/portal/checkup` exists to report, and the progression says so
in place rather than jumping the gap.

### 4. Analytics, surfaced · `Loom portal` · **approved, after 1**

Step 4 of [`signals.md`](signals.md) — already approved, already this lane's, and
half-built as `/portal/readers`. What this phase adds is not mostly new screens:

- **Reachability.** It is surfaced from the dashboard, under a name someone would
  look for. `Readers` in a rail below `Trust` is why the maintainer could not find
  it.
- **Per page and per node**, tied to the inspector: select a band, see what
  readers did with *that band*, across revisions.
- **Before and after a change**, which exists and is the strongest thing on the
  screen.

**It cannot report conversion until phase 5.** Say that on the screen rather than
showing engagement under a word that implies outcome.

### 5. `completed` · `Loom daily build` · **approved** (unchanged from `signals.md` step 2)

The signal kind that closes a funnel. Unbuilt since 13 September. It is the
difference between *they looked at the pricing band* and *they bought*, and every
A/B result is worth less without it.

### 6. A/B — serving · `Loom daily build` · **needs a record first**

Two revisions of one page served concurrently, readers split between them. This
does not exist in any form and is **framework work, not the portal's**: it
touches how a tree is chosen for a request, which is §1's business.

What makes it tractable is that the measuring half is nearly free — signals are
already filed per node **per revision**, so *revision 4's hero against revision
5's* is close to a query against counters that already exist.

**Open questions for that record**, not answered here: how a reader is assigned
without acquiring an identity ([0146](../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)
refuses a visitor id, and a split that persists across visits is exactly one);
whether a variant is a revision or something else; what happens to a variant when
the Gate accepts a change underneath it.

### 7. Results, and the levers · `Loom portal` · **after 6, under 0200**

Read a test's results, and — beside them — the controls that act on what they
say. Under 0200: the person pulls the lever, the result never does, and the
portal says which of the two happened. A policy change is recorded like any other
change, which needs a **policy history the framework does not have** — filed.

## Still not in scope

- **A measurement writing anything.** 0200 clause 4. A signal does not become an
  intent, a gap does not move a floor, an A/B result does not promote a variant.
  Every one of those is a button.
- **Moving a node by hand.** 0199 clause 4 — an open question with the
  maintainer's argument for it recorded, deliberately not built.
- **A property inspector.** Typing a value into a field is the canvas 0019
  refused, and nothing in the 27 September direction asked for it.
- **Account tiers, gates or paywalls.** The portal is free and the bar does not
  change if that ever stops being true.

## The test that applies to all of it

Unchanged since 18 August, and it is the one the front door currently fails:

> Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?

And its commercial twin, from `rollout.md`:

> A developer using Loom opens the portal daily, because it tells them something
> they cannot get anywhere else.
