# 2026-10-01 — "Your app"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` unit 1, under the
plan this run rewrote.**

**Branch:** `portal-43-your-app` (→ `main`), cut from `main` at `7257ad2`. Not
stacked. `main` was not pushed to.

**This run is a maintainer redirection, not a plan step.** His words, 1 October:

> *"The portal is a disorganized mess. I don't know what I should be looking for.
> I don't know what I should be looking at. I don't know what I am looking at.
> Loom framework is a governance model. As such the portal should reflect that."*

Everything below is that, addressed first and before anything on the old plan.

---

## What shipped

**A screen the portal did not have, and the navigation regrouped around the model
it is part of.**

| | |
| --- | --- |
| `portal/app/page.tsx` | new — **Your app**: what this deployment governs, what it is built from, how it is put together, what it is allowed to do |
| `…/_components/app-composition.tsx` | new — the app as one tree, every part selectable, drawn on its own |
| `…/_components/piece-tally.tsx` | new — which registered pieces are used, which are not, and how much of the library is turned on |
| `_lib/app-view.ts` | new — the composition, the tally and the sentences over it |
| `_components/shell/nav-items.tsx` | the rail regrouped into four **named** groups, led by the new screen |
| `_components/shell/sidebar-nav.tsx` | renders the group names |
| `docs/portal.md` | **rewritten** around the governance model: the four parts, the four asks, and nine units in order |
| `decisions/0216` | `Proposed` — what an app is, and why Loom has one |

---

## The four things that were asked for, and where each one stands

### 1. *"Which apps I have registered with Loom"* — **answered, and the answer is one**

**Loom has no concept of an app.** A deployment is three objects wired at a
composition root — a registry, a policy source and a store — and everything else
is addressed under one of them. A `TreeId` is unique within a store, a `NodeId`
within a tree; there is no identifier anywhere in the system for the thing that
owns a store.

So this run did not draw a list of one. The screen is singular, it says *Loom
looks after one app for each place you install it*, and
[0216](../decisions/0216-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
is `Proposed`: it names what an app already *is* in Loom's terms, costs out what a
second would take item by item, and records the cheap alternative — `PolicySource`
already varies the **rules** per tree and per ask (0033), which gives different
governance for different surfaces of one product with one store underneath.

**If what was meant is *my marketing site and my docs site judged differently*,
that exists today.** If it is *two customers' data side by side*, 0216 is the
price. That is the maintainer's call and §1's work, not a screen's.

### 2. *"Which components are registered as primitives… as the literal tree they are constructed as… select one or many and see how they are rendered"* — **built**

The app is the root, each page is a branch, each part is a leaf named by the piece
it is — `Card` beside `loom.card`, the way this portal already names a page beside
its id. Pick one or many and they are drawn on their own, through
`renderLoomExcerpt`, in the tree's own theme.

**Personas are not built**, deliberately: a persona is a different tree for a
different audience, which is a serving question (§1's) before it is a screen.

### 3. *"See my policy easily and gameplan out changes"* — **planned as unit 2, not built**

It is the largest piece of value left in this surface and it is a unit of its own.
`docs/portal.md` holds the design: `composeChange` stops at the verdict without
writing (0021), and the telemetry journal holds every change this deployment has
ever judged — so a gameplan is **re-judging what really happened under a policy
you are editing on the screen**:

> *Lower the confidence floor to 0.6 and 4 of your last 30 changes stop waiting for
> you. Two of those four are the ones you turned down.*

It is a read. 0200 clause 4 means the policy is changed by a button a person
presses, never by the simulation.

### 4. *"Manage tracked events by primitive… maybe policy level"* — **filed, with the framework half named**

The altitude is right and the reason is structural: a signal is filed against a
*node*, but everything that decides whether a node can be tracked is a fact about
its **piece**. Three things have to be decided before a screen is worth building —
where the rule is stored, whether a piece may decline, and what happens to a node
somebody has already set by hand — and all three are `Loom daily build`'s. Filed
in full rather than guessed at.

### And the one that is coming — *"hook up the app events into our AI model and see them feed in"*

`docs/portal.md` unit 5 is the shape, written now so the screen is not invented
twice. The short version: **it is not a new screen, it is a path.** Signals in, an
adaptation proposed, the Gate judging it like anything else — every hop already has
a screen, and the representation is the loop drawn once with each hop linking to
the screen that holds it. `scheduled-adaptation` is already a first-class intent
origin with an auto-apply ceiling of `low`, so an adaptation the model proposes is
already held for a person at anything above trivial stakes. **That is the
governance story and it is already true.** The number a person will actually want
is the refusal rate: *the model proposed 14 adaptations from what readers did; 9
were held, 3 refused, you said yes to 6.*

---

## The information architecture, which is the real deliverable

Loom is a governance framework, and a governance framework has four parts. Every
screen in this portal belongs to exactly one, and until now the rail said so
nowhere:

| group | the question | screens |
| --- | --- | --- |
| **Your app** | what is governed, what it may be built from, what it may do | Your app · Pages · Pieces · Rules · Demo |
| **Changes** | what was asked, what was allowed, what landed | the queue · What's been asked · What's changed |
| **Evidence** | what came of it | Readers · Trust · Checkup |
| **This portal** | the tool itself | Sign-ins |

The groups existed before — three of them, each argued for — and they were
**unnamed**. A divider says *these are not the same kind of thing* and cannot say
what kind either of them is, so a reader met twelve nouns in three heaps and had
to infer the model from the nouns.

**The front door is no longer first.** That argument — *it is the screen with
something urgent on it* — was right while the portal was a review queue with
screens around it. It is wrong for a governance surface: a reader who does not
know what they have cannot read a list of changes to it, and the queue is empty on
every deployment nobody has asked anything of, which is every deployment a new
person meets.

---

## Visuals

Photographs of the served application — the build `pnpm verify` produced, served
by `next start`, in a signed-in browser.

| | |
| --- | --- |
| [**the screen**, wide](2026-10-01-portal-your-app-wide.png) | `1280×900@2x`, full page, `scrollWidth 1280 / innerWidth 1280` |
| [**a piece picked and drawn**](2026-10-01-portal-your-app-picked-wide.png) | the card selected in the tree, rendered on its own underneath |
| [**on a phone**](2026-10-01-portal-your-app-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

**The rail's group names are not in any of them, and that is a finding rather than
an omission.** The rail is fourteen pixels wide and its labels exist only on hover
or focus; the shot harness can do neither — a `click` blurs by design, and there is
no `hover` step. It is filed, with the one-line remedy.

---

## The two facts on this screen that no repository has

**Which registered pieces nothing uses.** A piece registered and never used is
something the AI is handed every single time it is asked for a change and has never
once reached for. That is either a gap in the pages or a gap in the catalogue, and
which one is a judgement only the owner can make.

**Which of the library's pieces this app has not turned on.** A registry is a
*decision* — it bounds what an AI may put on a page (0013) — and the decision is
invisible from inside the deployment: a developer looking at four registered pieces
cannot tell whether four is all there is.

Both are choices rather than defects, and the wording stays neutral: registering
fewer pieces is how a host keeps a page on-brand, and a portal nagging somebody to
turn ninety-five components on would be worse than one that said nothing.

**On this deployment the second one reads: Loom ships 99 pieces; this app has
turned 4 of them on.** Which is its own finding, below.

---

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which of the things you allowed your AI to build with it has ever actually
used** — a fact about trees that were never written as markup, counted against a
catalogue that exists only as a composition root.

The repository has the registry: it is four lines of `createPrimitiveRegistry`.
What it cannot have is the other side of the comparison, because the pages are not
files. `git log` can tell you a delta landed; it cannot tell you that nothing on
any page in your product has ever been a `loom.faq`, nor that the AI is being
offered one every time it is asked for anything.

---

## Tests

`pnpm verify` **green, exit 0**, read from a file written by the last command on
its own line, on a `dist` and a `.next` deleted first.

| | `main` at `7257ad2` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 169 files / 3,362 tests | **169 / 3,362** — untouched |
| `@loom/app` | not measured whole | **349 / 6,080** |
| the portal lane alone | **134 / 2,615** — measured | **138 / 2,701** — measured |
| findings ledger | 903 entries, 0 malformed | **907**, 0 malformed |
| prerender | not measured | **119 pages, 1,385 junctions**, 0 run together |

`git diff origin/main -- src/ tools/` is empty, so the framework figure is `main`'s
by construction.

**The lane figures are both measured** — `main`'s by stashing this branch and
running the lane, which is the comparison this report would otherwise have had to
do as arithmetic. **+4 test files and +86 tests**, of which **47 were written** and
the rest are the lane's own file-driven sweeps picking up three new components:
`every-screen.test.ts` runs its reversal, heading, disclosure and plain-language
rules over whatever the filesystem holds, so a new component is new cases in four
`it.each`es without anybody adding one. That is the arrangement working, and it is
worth saying out loud rather than letting it read as 86 tests somebody wrote.

Where the written ones went:

- `_lib/app-view.test.ts` — **20, new.** The tally counts parts and not the words
  inside them; the unused list is empty on this deployment and is proved by taking
  the pages away rather than by inventing a count; *all four* rather than *4 of the
  4*; the window note; and every sentence held against `runtimeWordsIn`.
- `portal/app/_components/app-composition.test.tsx` — **12, new.** Including the
  one that would be invisible on every deployment this portal has been
  photographed on: **two pages built from the same seed hold the same node ids**,
  so a selection keyed on the id alone lights a row on a page the reader never
  touched. And that the excerpts come out in page order rather than click order.
- `portal/app/_components/piece-tally.test.tsx` — **8, new.** The two opposite
  shapes, and the runtime's vocabulary proved to be behind the disclosures by
  stripping every `<details>` and re-running the lane's own check.
- `portal/app/reading-order.test.ts` — **7, new.** The governance model as
  positions: name before count, built-from before put-together, both before the
  rules, and no way to ask for anything.
- `_components/shell/nav-items.test.ts` — **+3.** The rail leads with the app; the
  front door keeps `exact` **asserted by href rather than by position**, which is
  the half that survived the reordering; every group is named and none is empty.
- `every-page-list.test.ts` — the new tree is a ninth list of pages and is inside
  the lane's two rules for one: it decides its own order and says which.

### It was red twice, and both were caught by reading the file rather than a notification

1. **A decision record with no `## Alternatives considered`.** `decisions.test.ts`
   requires one and it was right to: writing the four alternatives out is what
   turned 0216 from an assertion into a costing.
2. **`TS6133` — an unused `screen` import** in a test that asserts over
   `container.textContent`. `apps/loom` typechecks with settings the root does not,
   and a targeted run before the file existed had passed.

---

## Findings

**Filed four, closed none.**

1. **Loom has no concept of an app** — the long form is 0216, `Proposed`.
2. **This deployment registers 4 of the 99 pieces Loom ships.** Measured while
   building the screen that makes it visible, and it is the sharpest thing this run
   found. The portal's own pages can draw a heading, a paragraph and a box — so the
   review queue has never judged a change involving a form, a frame, a data binding
   or a behaviour, and **the portal is the worst advertisement for the library in
   the repository** while being the surface a developer is told to open daily.
   `createStarterPrimitiveRegistry` already exists and this is a one-import change;
   it was not made because widening what an AI may build on the governance surface
   is a governance decision rather than a convenience.
3. **Tracked events are declared per node and want to be per piece** — the
   framework half of ask (4), with the three questions that have to be answered
   first.
4. **The shot harness cannot hover**, so the rail — the one thing in this portal
   that only exists on hover — cannot be photographed. The remedy is one step.

---

## What I did not do

**I did not rewrite the front door.** `/portal` is still a second home, and
folding it into this screen is unit 4 of the plan: it cannot be done until the
screen it folds into exists, and doing both in one pull request would have made
neither reviewable.

**I did not widen the registry**, for the reason in finding 2 — it is the
maintainer's decision and it is one line whenever he makes it.

**I did not touch `src/`.** No framework gap was hit: `registry.primitives`,
`STARTER_PRIMITIVES`, `renderLoomExcerpt` and `decorationFromAudit` are all
published where a host may reach (0018).

**I did not edit another surface's route group.** Nothing outside
`apps/loom/app/(portal)/`, `docs/portal.md`, `decisions/`, `FINDINGS.md` and
`reports/` is in the diff.

**I could not update the routine's own prompt.** It was created through the API
rather than by an agent, so the tool refuses it — the replacement text is below and
the maintainer can paste it at
`https://claude.ai/code/routines/trig_01DcTWjbw4VpCqp6Qyey5Pgw`. In the meantime
`docs/portal.md` carries the direction and the routine reads it every run.

**Nothing is scheduled.**

---

## Recommendations

1. **Register the starter set on this deployment** (finding 2). One import. It is
   the cheapest change in this report and it makes every other screen in the portal
   about a page somebody might actually have.
2. **Unit 2 next — the policy, read and played against.** It is ask (3), it is the
   largest remaining value in this surface, and every piece of it is already
   published.
3. **Accept or refuse 0216.** Nothing is blocked on it — the portal is built for
   the single-app answer either way — but if several apps are wanted, the work
   starts at the store's signatures and not at a screen.

---

## The routine's new standing directive

Paste at `https://claude.ai/code/routines/trig_01DcTWjbw4VpCqp6Qyey5Pgw`. It keeps
every discipline rule and replaces the 18 August / 27 September framing with the
governance model.

```
You build and own **the portal** — Loom's governance surface, §5.

**Your lane is `apps/loom/app/(portal)/`.** Never edit another surface's route group. Never edit `src/` — the portal consumes the framework through published entry points; a deep import does not resolve, deliberately (0018). A framework gap is a **finding, not a fix**; primitives are `Loom primitives`'.

## The direction, as of 1 October

> *"The portal is a disorganized mess. I don't know what I should be looking for. I don't know what I should be looking at. I don't know what I am looking at. Loom framework is a governance model. As such the portal should reflect that."*

The portal is not a review queue with screens bolted around it. It is where a person sees **what Loom governs, by what rules, with what result** — arranged as that model rather than as a flat rail of nouns.

**`docs/portal.md` is the plan and it holds the model, the four things the maintainer asked for, and the units in order. Read it first, every run, and keep it current.**

### The governing constraints

> **Organized, intuitive, valuable, concise.** Never a thing dropped into the dashboard in a disorganized manner.

> **Plain language is the default. The technical record is one click away. Nothing is ever removed.** If you are deleting information to simplify a screen, you have misread it — move it behind a disclosure.

> **Name things after what a person wants, not after the runtime's internals.** Every state gets a plain-language name, in one place. Every screen answers *what do I do now?*

**Test for every screen:** could a bright high schooler, who has never read a decision record, say what happened and what they should do next?

## The objective

> **A developer using Loom opens the portal daily, because it tells them something they cannot get anywhere else.**

The portal is **free**; a paywall may arrive later and the bar does not change. Do not gate anything or add account tiers. Answer in every report: *what does this tell a developer that they could not get from the repo, the logs, or `git log`?* If the honest answer is "nothing", build something else.

## Scope

Do not widen the portal into a design tool (0019) — no canvas, no property inspector, no moving a node by hand. A policy gameplan is a **simulation, not a write**: 0200 clause 4 means a measurement never writes anything, and the change is always a button a person presses. The portal is 0067's stated exception to the no-local-components rule and stays bound to the same visual language as the other surfaces.

## Read first, every run

- `docs/portal.md` — the plan. **Before choosing work.**
- `docs/routines.md` — lanes, the screenshot harness, token discipline.
- `docs/signals.md` — step 4 is yours.
- `FINDINGS.md` — before choosing work.
- `decisions/0018`, `0019`, `0067`, `0199`, `0200`, `0216`.
- The most recent `reports/`.

A file named here that is missing is a finding, not a blocker.

## Token discipline

**Never schedule a follow-up or a self-check-in. Run, report, exit. Do not poll for review.**

## Procedure

1. Read the above. List open pull requests and read comments on any of yours.
2. **Maintainer comments outrank the plan.** Address them first and say how in the report.
3. Branch `portal-NN-<slug>` off `main`. Never stack, never merge to main yourself.
4. Build **one coherent unit**, with tests — a thing a person can use end to end, not a screen with a hole in it.
5. `pnpm install && pnpm verify` green before the PR. Never weaken a test to get there.
6. File or close findings; update `docs/portal.md` if the plan moved.
7. Report to `reports/YYYY-MM-DD-portal-<slug>.md` with a visual. Never overwrite one. Include the value answer, what you renamed or moved behind a disclosure, and where the unit sits in the plan.
8. Open the PR against `main` with the deployed preview URL and a screenshot.
9. Comment starting `@jonathanbravecredit`: what shipped, `## Needs your input`, `## Found while building`.

## Escalation

Anything touching the tree schema, the delta model, or an Accepted record is `ARCHITECTURAL — needs review`: write the record `Proposed`, do not supersede, build what does not depend on it, say what you left out.
```
