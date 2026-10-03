# The portal — the approved plan

**Status: redirected by the maintainer, 1 October 2026.** This supersedes the
27 September plan's *framing* and keeps everything it got right. The earlier
version is in the history of this file; what it planned as phases 1–3 is built
and on `main`, and what it planned as phases 4–7 is still here, re-sequenced
under the model below.

It does not supersede `docs/rollout.md`, which places §5 among the surfaces. It
says what §5 does next.

## Why this was rewritten

The 27 September plan opened on the maintainer's verdict that the portal did not
say *what am I supposed to do here*. It fixed that one page at a time, and on
1 October the verdict was sharper and about the whole surface:

> *"The portal is a disorganized mess. I don't know what I should be looking for.
> I don't know what I should be looking at. I don't know what I am looking at.
> Loom framework is a governance model. As such the portal should reflect that."*

**The defect is not any screen. It is that the portal was a flat list of nouns.**
Fourteen screens, each individually defensible, with nothing saying how they
relate — so a person arriving had to already know the model in order to find the
screens that describe it.

## The model, which is now the information architecture

Loom is a governance framework, and a governance framework has four parts. Every
screen in this portal belongs to exactly one of them:

| | the question | the screens |
| --- | --- | --- |
| **Your app** | what is governed, what it may be built from, what it may do | Your app · Pages · Pieces · Rules · Demo |
| **Changes** | what was asked, what was allowed, what landed | the queue · What's been asked · What's changed |
| **Evidence** | what came of it | Readers · Trust · Checkup |
| **This portal** | the tool itself, which is a different subject | Sign-ins |

The rail carries those four names. The first group leads, and its first entry is
**Your app** — the screen the portal did not have, and the absence that made the
rest read as a heap. A tool whose first screen is a queue assumes you already
know what you have.

## What the maintainer asked for, in his words

1. **"Be able to know which apps I have registered with Loom."**
2. **"Within each app, which components are registered as primitives"** — *"as the
   literal tree they are constructed as. First as a base tree for my app"*, later
   drillable by persona — and *"select one or many primitives and see how they are
   rendered."*
3. **"See my policy easily and gameplan out changes to my gate policy to generate
   better outcomes."**
4. **"Manage tracked events by primitive and have a better way to do this (maybe
   policy level) than going one by one."**

And one more, coming:

> *"We are going to have to create a layer / view where we can hook up the app
> events from Loom into our AI model and see them feed in."*

## The thing (1) runs into, which is architectural

**Loom has no concept of an app.** A deployment is one registry, one policy source
and one store, wired at a composition root; `PolicySource` can vary a *policy* per
tree and per ask (0033), and nothing above a tree groups anything else.

So *which apps have I registered* has nothing behind it, and a portal that drew a
list of one would be inventing a data model the framework does not have — in the
one place where inventing one is most expensive, because every page, hold and
signal is addressed under it.

[0216](../decisions/0216-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
is `Proposed`: it writes down what an app already *is* in Loom's terms, and what
would have to change for there to be several. **The portal builds the single-app
answer honestly and says it is one.** Accepting or refusing 0216 is the
maintainer's, and §1's to build if it is accepted.

## What already exists, and is under-used

Checked against the code on 1 October. It matters because it changes the order of
the work: most of what is left is assembly.

| | where |
| --- | --- |
| **Every registered piece, with its declaration** | `registry.primitives` — type, description, slots, declared props, role, behaviours, what it frames, what it submits, what it reads |
| **What the library ships** | `STARTER_PRIMITIVES` on `@jam-overture/loom/primitives`, which is how a portal can say *what this app has not turned on* |
| **Whether a piece leaves a handle in the page** | `auditRegistry` + `decorationFromAudit`, already run once at module scope |
| **Rendering one part on its own, in the tree's theme** | `renderLoomExcerpt` |
| **Every rule the Gate consults** | `GatePolicy`, with `POLICY_FIELDS` derived from the schema so a field cannot be added without the rules screen hearing about it |
| **Judging without writing** | `composeChange` stops at the verdict (0021) — which is what makes a policy gameplan a read |
| **What the Gate actually decided, kept** | the telemetry journal: every episode, its disposition, its stake factors (0198) and its policy fingerprint |
| **Reader signals, per node per revision** | `@jam-overture/loom/signals` — four kinds, folded and rolled up |

Two things are genuinely absent: **A/B serving**, and the `completed` signal kind
(step 2 of [`signals.md`](signals.md), approved and unbuilt) without which the
portal can measure attention and **not conversion**.

## The records this plan rests on

- **[0200](../decisions/0200-the-portal-may-place-a-lever-beside-the-evidence-and-a-model-may-never-pull-one.md)**
  — the portal may put a control next to the measurement that argues for it; a
  person always pulls it; **no measurement in this system may write a policy, a
  delta or an intent.** `Proposed`. The policy gameplan below is built strictly
  inside it: a simulation is a read, and the change itself is a button.
- **[0199](../decisions/0199-the-outline-may-render-what-it-addresses-and-a-hand-may-yet-move-a-node.md)**
  — rendering the selection in isolation is inside 0019 and buildable now;
  **moving a node by hand is not.** `Proposed`.
- **[0216](../decisions/0216-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)**
  — what an app is, and why there is one. `Proposed`.

**0019's title is now narrower than the surface.** *The portal is a review queue,
not a design tool* was right about the second half and has stopped being the whole
of the first: the review queue is one of four parts of a governance portal. The
refusal it exists for — no canvas, no property inspector, no moving a node by hand
— is untouched and is restated under *Still not in scope*.

## The plan, in order

Each unit is one pull request, reviewable on its own. **Do not start a unit whose
input is not on `main`.**

### 1. Your app · `Loom portal` · **built, 1 October**

The screen the portal did not have. What this deployment governs: its pages and
the pieces they are built from, **as one tree** — the app at the root, each page a
branch, each part a leaf named by the piece it is — with any part selectable and
drawn on its own through `renderLoomExcerpt`.

Beside it, the two governance facts no repository has:

- **which registered pieces nothing uses** — a piece the AI is offered every time
  it is asked for a change and has never once reached for;
- **which of the library's pieces this app has not turned on** — a registry is a
  decision, and the decision is invisible from inside the deployment.

The rail is regrouped and its groups are named. Answers (1), honestly and
singular, and (2) except for personas.

### 2. The policy, read and played against · `Loom portal` · **approved, next**

Answers (3), and it is the largest single piece of value left in this surface.

`/portal/rules` lists what the Gate consults. What it cannot do is the half the
maintainer asked for: **what a different policy would have decided.**

The mechanism exists and is a read. `composeChange` stops at the verdict without
writing (0021), and the telemetry journal holds every change this deployment has
ever judged — the intent, the proposal, the disposition and the stake factors
(0198). So a gameplan is: take the episodes already on the record, re-judge them
under a policy the reader is editing on the screen, and show what would have moved.

> *Lower the confidence floor to 0.6 and 4 of your last 30 changes stop waiting for
> you. Two of those four are the ones you turned down.*

Three rules it is built under, and none is negotiable:

- **It is a simulation, and the policy is not written by it.** 0200 clause 4. The
  screen ends in a button a person presses, and what that button does is a change
  recorded like any other change.
- **It replays what happened, and never invents a change to judge.** A gameplan
  over fabricated proposals is a demo, not evidence.
- **It says what it cannot know.** A re-judgement cannot tell you whether the
  model would have proposed the same thing under a different policy, because the
  policy is resolved before interpretation (`PolicySource` cannot see the
  proposal, deliberately). Say so on the screen.

**Needs:** nothing new from the framework. A **policy history** does — the record
of what a policy *was* when a change was judged — and 0200 already files it. A
fingerprint is on each episode, so the gameplan can say *these were judged under a
policy that is not the one you have now* without it.

### 3. What is tracked, managed by the piece · `Loom portal` · **approved, after 2**

Answers (4). Today a reader signal is declared per node, and the maintainer's
words are that doing it *"one by one"* is the wrong altitude — *"maybe policy
level."*

He is right, and the shape follows from where the declaration already lives: what
a page emits is a property of the **piece**, not of the node, because the
primitive is what renders the element a signal is filed against. So the screen is
a matrix — every registered piece against the four signal kinds — and a rule set
at the piece level applies to every node of that type on every page.

**This one has a framework half and the boundary has to be drawn before it is
built.** What is per-piece and what is per-deployment, where the rule is stored,
and whether it belongs on the policy or beside it, is `Loom daily build`'s to
answer. The portal's half is the screen and the vocabulary; a finding goes to
them first.

### 4. The front door, folded in · `Loom portal` · **approved, after 1**

`/portal` is still a second home: it opens on the queue and on what changed
without asking. With *Your app* built, the two overlap at the top and differ
below.

The merge is: **one landing**, which answers *what do I have* and *what needs me*
in that order, with the queue intact and the recent record under it. It is small,
it is mostly deletion, and it is after (1) because it cannot be done until the
screen it folds into exists.

### 5. The feed into the model · `Loom portal` + `Loom daily build` · **shape only**

The maintainer, 1 October:

> *"We are going to have to create a layer / view where we can hook up the app
> events from Loom into our AI model and see them feed in. We are going to start
> building this soon, so start thinking about how to represent it in the dashboard
> now."*

Nothing is built for this yet and nothing should be until the framework half has a
shape. What the portal can already say about how it would be represented, so that
the screen is not invented twice:

- **It is a fourth group, not a fifth screen.** The feed is evidence becoming an
  ask: signals in, an adaptation proposed, the Gate judging it like anything else.
  Every one of those already has a screen — Readers, What's been asked, the queue
  — and the loop is what joins them. The representation is a **path**, drawn once,
  with each hop linking to the screen that already holds that half.
- **`scheduled-adaptation` is already a first-class origin.** `autoApplyCeiling`
  gives it `low` by default, so an adaptation the model proposes on its own is
  held for a person at anything above trivial stakes. That is the governance story
  and it is already true — the portal's job is to show it, not to build it.
- **The thing a person will actually want is the refusal rate.** *The model
  proposed 14 adaptations from what readers did; 9 were held, 3 refused, you said
  yes to 6.* That is a funnel over data this portal already reads, and it is the
  one screen in the ecosystem that could show a model's own suggestions being
  governed.
- **It must not become a control loop.** 0031 refuses a runtime one and 0200
  clause 4 forbids a measurement writing anything. A signal becomes an *intent* a
  person can answer, never a change.

**Open, and the maintainer's or §1's:** what triggers an adaptation, what the model
is handed (a rollup? a page and its counters?), and whether an adaptation is an
`EditIntent` like any other. The portal assumes the last is yes, because every
screen it already has depends on it.

### 6. Analytics, surfaced · `Loom portal` · **approved, after 4**

Step 4 of [`signals.md`](signals.md), half-built as `/portal/readers`. Reachability
is most of it: per page and per piece, tied to the selection the app screen already
has, and *before and after a change*, which exists and is the strongest thing on
the screen. **It cannot report conversion until `completed`** — say that on the
screen rather than showing engagement under a word that implies outcome.

### 7. `completed` · `Loom daily build` · **approved** (unchanged from `signals.md` step 2)

The signal kind that closes a funnel. Unbuilt since 13 September. It is the
difference between *they looked at the pricing band* and *they bought*.

### 8. A/B — serving · `Loom daily build` · **needs a record first**

Two revisions of one page served concurrently, readers split between them. Framework
work: it touches how a tree is chosen for a request. The measuring half is nearly
free — signals are already filed per node **per revision**.

**Open questions for that record:** how a reader is assigned without acquiring an
identity (0146 refuses a visitor id, and a split that persists across visits is
exactly one); whether a variant is a revision or something else; what happens to a
variant when the Gate accepts a change underneath it.

### 9. Results, and the levers · `Loom portal` · **after 8, under 0200**

Read a test's results, and — beside them — the controls that act on what they say.
The person pulls the lever, the result never does, and the portal says which of the
two happened.

## Still not in scope

- **A measurement writing anything.** 0200 clause 4. A signal does not become an
  intent, a gap does not move a floor, an A/B result does not promote a variant.
  Every one of those is a button.
- **Moving a node by hand.** 0199 clause 4 — an open question with the maintainer's
  argument for it recorded, deliberately not built.
- **A property inspector.** Typing a value into a field is the canvas 0019 refused.
- **A multi-app data model.** 0216 is `Proposed` and is §1's if it is accepted. The
  portal says there is one app rather than pretending to a list.
- **Account tiers, gates or paywalls.** The portal is free and the bar does not
  change if that ever stops being true.

## The test that applies to all of it

Unchanged since 18 August:

> Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?

And its commercial twin, from `rollout.md`:

> A developer using Loom opens the portal daily, because it tells them something
> they cannot get anywhere else.
