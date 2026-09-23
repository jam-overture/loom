# 2026-09-23 — "What it actually objected to"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-35-what-it-objected-to` (→ `main`), cut from `main` at
`b2a5176`. Not stacked. **There were no open pull requests in the repository
when this run started**, so there were no maintainer comments on this lane's
work to address and nothing of this lane's to push onto.

Visuals — a production build of this commit, in a signed-in browser, taken with
**`pnpm shoot`** rather than with a private script, for the first time in this
lane's history. The links are relative and resolve in the repository; the pull
request links to the same files on `github.com` rather than embedding them, for
the reason the 22 September finding gives.

| | |
| --- | --- |
| [Loom couldn't build that](2026-09-23-portal-what-it-objected-to-undo-refused-wide.png) | 1280px — an undo the Gate refused, and the two things it objected to |
| [The same refusal, one click down](2026-09-23-portal-what-it-objected-to-undo-refused-opened.png) | 1280px — both disclosures open: the rule code, and the runtime's own sentence per objection |
| [The same screen on a phone](2026-09-23-portal-what-it-objected-to-undo-refused-phone.png) | 390px |
| [Every rule a change here is judged by](2026-09-23-portal-what-it-objected-to-rules-wide.png) | 1280px, full page — including the two that were missing from it |

**How the pictures were taken, and what is staged.** `pnpm shoot` signs in
through a `before` — `#key`, the press, and a trailing `waitFor` on a rail link,
because this portal has no `data-signed-in` marker. That half is now the
harness's and is in `docs/routines.md`. What is still this lane's is that
`pnpm shoot` does not start your application: a screen whose content is a stored
log needs the log put there first. So a preload on `NODE_OPTIONS --import` builds
a `memoryTreeStore()`, **appends two revisions through the store's own
`append`**, and puts it on `globalThis[Symbol.for("loom.portal.store")]` before
the route modules evaluate:

- **revision 1** — an `app.gallery` was added, back when this deployment declared
  no registered types and the Gate had nothing to object with
- **revision 2** — somebody took it out again

Undoing revision 2 puts the `app.gallery` back, and this deployment now has no
way to draw one. **Everything below the staging is real**: the undo goes through
`revertRevision`, the Gate weighs it, the refusal is the Gate's, and the words on
screen are the ones this branch ships. The preload was deleted before this report
was written and nothing from it is in the diff. It is filed as a finding, with
the recommendation that it become a committed script rather than a recipe the
next run rebuilds from a report.

---

## What was asked

`FINDINGS.md` had an entry filed **against this lane by `Loom marketing`** on 22
September, and the findings queue outranks the plan. It said that nothing in this
repository wired a props vocabulary and that 0173's registered-types list was
unset on all four surfaces; marketing had closed its own row and left the
portal's.

Taking it turned out to be two units wearing one, and both are here because
shipping the first without the second would have been worse than shipping
neither.

## The defect, in two halves

### Half one: this portal was committing changes it could not draw

Two floors exist in the runtime and both are **opt-in**, for a good reason:
a host that has declared nothing has not said *I can draw nothing*, and a default
reading the other way would refuse every insert on every deployment in existence.
So the field defaults to empty, the check never fires, and this portal had it
that way for a month.

What that meant, concretely. A proposal naming `app.gallery` was weighed on its
shape, found unremarkable, **committed**, and drew a hole on the page — for every
reader, not for the one who asked. A value outside a part's own list did the
same. Neither leaves an error, an exception or a log line anywhere.

### Half two: and when it started refusing them, it said the wrong thing

Wiring the floors is four lines. What makes it a unit is what a person is then
told, because a refusal reached them as two strings:

> **Not allowed** — A rule in this project's settings blocked it, so nothing
> changed.

Both are true of *every* refusal this deployment can produce, which is another
way of saying neither is about the change in front of you. And for the two new
floors it is **actively misleading**: the sentence sends somebody to
`/portal/rules` to loosen a rule which, loosened, would go back to committing
broken pages.

A refusal has three answers stacked inside it. The portal was showing the first
and the third.

| | | where it came from |
| --- | --- | --- |
| what happened | *Not allowed* | `CHANGE_STATES` — already plain |
| **why** | *it asks for a kind of part this site has nothing to draw it with* | **nowhere. Not shown at all.** |
| which rule decided | *This project does not allow changes this risky at all* | `RULE_SENTENCES` — shown on a hold, not on a refusal |

The middle row is the one a person acts on. It existed only inside
`describeWriteOutcome`, behind a disclosure, as

```
refused: adds a node no primitive is registered for, so it draws nothing:
  app.gallery at n_7
```

— and on `/portal/history`'s undo button it was not behind a disclosure at all.
It was the whole body of the notice, at body weight. Every other outcome panel in
this portal was rewritten by 16 September; that one was missed because it is
three lines long and looks like a button rather than like a screen.

## What shipped

| | |
| --- | --- |
| `_lib/policy.ts` | both floors, derived from the registry the renderer resolves against |
| `_lib/write.ts` | the event sink tees `change-assessed`, so a screen can read the Gate's own factors |
| `_lib/vocabulary.ts` | `STAKE_FACTORS` — a clause for each of the thirteen things the Gate weighs; `WEIGHING`; `CANNOT_BE_DRAWN` |
| `_lib/refusal.ts` | new — objections, worst-first, and the one predicate that tells the two refusals apart |
| `_lib/outcome.ts` | a write's report carries *why*, keyed by the proposal the outcome names |
| `_components/change-reasoning.tsx` | new — clauses on the surface, the record one click down |
| `_lib/rules-view.ts`, `portal/rules/page.tsx` | the two floors named on the screen that claims to name every rule |
| `prompt-box.tsx`, `undo-button.tsx` | both outcome panels, in the same three layers |

### The distinction the whole unit turns on

> **Eleven of the thirteen factors describe a change that *could* be made and
> that this project has decided not to make without asking. Two describe a change
> that cannot be made at all.**

They arrive under the same reason code (`stakes-at-refusal-floor`, because both
reach `critical`), so a screen reading the code cannot tell them apart. That is
what `cannotBeDrawn` is for, and what it buys is a different sentence:

> **Loom couldn't build that** — This change needs a kind of part this site has
> no way to draw, so nothing was changed. Loosening a rule would not help — there
> would still be nothing to draw it with. Either ask for something built from the
> parts your site already has, or add the missing one to your site's code.

It is its own plain state rather than a ninth entry in `CHANGE_STATES`, on the
precedent `CANNOT_UNDO` already set: that table is keyed by what a write *ended
as*, and a kind cannot tell these two refusals apart. Only the factors can, which
is a fact about *why* rather than about *what*. The tone stays red — nothing
about this is gentler, and a fourth colour for a fourth shade of no would teach a
reader a palette instead of an answer.

### The clauses are clauses

Each of the thirteen completes *"Loom would not do this because …"*. Several
appear under one change — the refusal in the screenshot raises two — and written
as whole sentences they read as unrelated verdicts on unrelated changes. Written
as clauses they read as one reason with two parts, which is what they are. The
tense is conditional throughout, including for a change that was applied, because
a factor is what the Gate weighed *before* deciding.

That last point is the reading this portal has never offered anywhere: the same
list under an **applied** change is *what Loom noticed and went ahead with
anyway*, which on a healthy deployment is the more interesting of the two.

### The Gate's reasoning had to be fetched rather than read

A `WriteOutcome` carries the Gate's **verdict** and not its **reasoning**.
`disposition.reason` is a code and one prose string — every factor's `detail`,
joined with semicolons — so a screen wanting to say *which* of thirteen things
was wrong had two options: parse that string, or ask the runtime.

It asks the runtime. `change-assessed` carries the whole assessment because it is
the runtime narrating itself within one request (0023), so `beginWrite` wraps the
journal's sink with one that keeps `stakes.factors`, **keyed by proposal**. The
keying is not incidental: a refusal handed to a repairer produces two assessments
in one write, and the reviewer is being told about the one that was refused, not
the smaller one offered instead.

The recording happens *before* the delegation, which is the only safe ordering. A
`Map.set` cannot throw; a journal write can, and `narrator` contains whatever
`emit` throws (0042) — so delegating first would let a failed record take the
reasoning down with it, and a reviewer would be told a refusal had no reasons
rather than that the record could not be written.

### And `/portal/rules` had to change, or its own claim would be false

That screen exists to say what is allowed on your pages *before anybody asks for
anything*, and its whole value is that it is checkable. Wiring a rule and not
naming it there is the sort of half-work that produces next week's finding. Two
rows now, under *how risk is measured*:

> **Pieces this site can draw** — `loom.page`, `loom.card`, `loom.heading`,
> `loom.prose` — a change that adds anything else goes straight to the top of the
> scale, so the first rule on this page turns it down
>
> **Settings a piece refuses** — checked against each piece's own description
> before the change is written, and a change carrying one it refuses goes
> straight to the top of the scale

Both say the opposite when the check is off, because *unset* is the state every
deployment starts in and a row reading "none" where the honest answer is "this
check is off and a change may commit a page with a hole in it" is the screen
lying by omission.

They are rows and not two more cards for an arithmetic reason: `recordFor`
attributes a count to a rule by the reason code the Gate recorded, both of these
are recorded as `stakes-at-refusal-floor`, and a second card carrying that code
would print one count twice as though two rules had each fired that often.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**That a change an AI proposed was refused, which of thirteen things was wrong
with it, and whether that is something they can do anything about.**

- **The repository does not contain the change.** A refused proposal is never
  written. There is no commit, no file, no diff — the only artefacts it leaves
  are a disposition and an assessment, and one of those does not survive the
  request.
- **`git log` holds what was applied.** By construction it is the complement of
  this: everything the Gate said yes to. A refusal is precisely the thing it
  cannot contain.
- **Nothing logs it and nothing throws.** A refused change is the system working.
  There is no error, no alert and no stack trace, which is why the only place
  this can ever appear is a screen built to show it.
- **The distinction is the part no other tool has a concept of.** Every code
  assistant can tell you it could not do something. What this says is *why, in
  terms of your own project's rules*, and specifically whether the answer is
  **you drew a line here** or **your site cannot draw that at all** — two
  sentences that look identical and have opposite next moves. The second is a
  fact about the registry this deployment loaded, checked against the change
  before it was written, by the same object the renderer resolves against.

And the half that was not there yesterday: **this portal was not refusing either
of those changes.** It was committing them. So the honest answer to the value
question includes the measurement — `_lib/floors.test.ts` puts both changes to
the policy this deployment ran a week ago and watches both **apply**.

## The high-schooler test

Applied to the refusal panel in both its states, to the undo button's panel, and
to `/portal/rules`.

- **"Loom couldn't build that."** Passes. Four words, no jargon, and it says the
  thing a reader needs first — which is not *no* but *no, and not because of you*.
- **"This change needs a kind of part this site has no way to draw."** Passes.
- **"Loosening a rule would not help — there would still be nothing to draw it
  with."** Passes, and it is the sentence doing the most work: it pre-empts the
  wrong move with a reason rather than with an instruction.
- **"it asks for a kind of part this site has nothing to draw it with"** and
  **"it rearranges the shape of the page rather than changing the words inside
  it"**. Both pass, and a bright high schooler reading the pair can say which
  matters more — which is why they are ordered worst first.
- **"Pieces this site can draw: loom.page, loom.card, loom.heading,
  loom.prose."** Passes. The type names are names and stay on the surface by the
  22 August rule; everything around them is ordinary English.
- **The disclosures** are the one place the runtime appears:
  `stakes-at-refusal-floor`, `unknown-primitive · critical`, and *adds a node no
  primitive is registered for, so it draws nothing: app.gallery at n_gal1*.
  Exactly one click, never further, and the second screenshot is the proof.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| a refusal read *"Not allowed — a rule in this project's settings blocked it"*, whatever was wrong with it | the state, then **why** as one clause per thing the Gate weighed, then the rule |
| a refusal because the change cannot be drawn read the same as one because it was risky | **"Loom couldn't build that"**, with a next move that is not *go and loosen a setting* |
| the undo button's whole body was `describeRevertOutcome` — error codes, node ids, at body weight | the plain sentence, the clauses, and that string one click down |
| the rule that decided was shown on a hold and not on a refusal | shown on all three verdicts, worded for each |
| `/portal/rules` described nine rules and judged changes by eleven | the two floors named, both ways, with `registeredPrimitiveTypes` and `propsVocabulary` in the record |

**What moved behind a disclosure:** nothing that was on a surface. What moved
*onto* a surface is the middle layer, which had been inside the runtime's own
sentence. The reason code and each factor's own account — with its type names,
its node ids, and the value a schema rejected quoted rather than reworded — are
where they always belonged.

**What I deliberately did not rename.** *Not allowed* stays the ordinary
refusal's headline. It was right on 16 September and is still right for the
eleven factors that describe a line somebody drew.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **159 files, 2,999 tests, all passed** |
| Application suite | **303 files, 5,475 tests, all passed** |
| Findings | 771 findings, 0 malformed |
| Prerender check | 109 pages, 957 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on every wide shot, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

**80 tests are new** — the portal's own suite goes from 1,800 to 1,880 over three
new files and four extended ones: 14 measuring the floors, 22 on the refusal
reading, 11 added to the outcome suite, 10 on the component, 9 on the vocabulary
tables, 4 on the write path's tee, and 6 on the rules view.
`_lib/outcome.test.ts` is an addition to an existing file — 214 lines added, one
import line changed, nothing removed.

What each group would catch:

- **The floors, measured on both sides.** Every case is put twice — once to this
  deployment's real policy and vocabulary, once to `defaultGatePolicy` with
  neither wired. The second half is the one worth keeping: *this change is
  refused now* is a fact about a policy; **this exact change was committed a week
  ago** is the fact that says why the policy needed changing. It also asserts
  what the floors deliberately do *not* refuse, because a floor that refused
  ordinary edits would be worse than no floor.
- **The clause table, over the union rather than over a list.** Every factor has
  a clause; none of them says it in the runtime's vocabulary; none of them
  contains its own code; all thirteen are different; and each is a clause rather
  than a sentence, asserted as lower-case-in, no-full-stop-out. A fourteenth
  factor arriving in the runtime fails here, which is the moment somebody still
  has the stake rule in front of them and can write the words.
- **The distinction, asserted as a pair.** The two refusals have different words
  and the same colour. Both halves matter: a future edit that makes them read
  alike passes every other test in the file.
- **The ordering**, including that it is stable within a level and that it covers
  every level the runtime has — a fifth would fail rather than sort as zero.
- **The keying.** A lookup that answers for a *different* proposal returns no
  objections, which is the repair case: the person is told about the change that
  was refused.
- **The endings that never reached the Gate**, all four, asserted as having no
  reasoning rather than empty reasoning. `not-applicable` is the one worth the
  test: it names a proposal, so a lookup answers for it, and it still has no
  disposition because a delta that would not apply was never judged.
- **The altitude, as a property of the DOM.** Every clause is outside the
  `<details>` and every one of the runtime's sentences is inside it — asserted as
  a pair, because either alone is satisfiable by a component that shows nothing
  or by one that shows everything at once.
- **The sink's ordering**, with the journal made to refuse the same event, so a
  future edit that delegates before recording fails rather than quietly losing a
  refusal's reasons whenever the record is unavailable.

**One defect was caught by a screenshot and by nothing else**, and it is the one
worth naming. `CANNOT_BE_DRAWN` first read *"The AI asked for something this site
has no way to draw"*. The first refusal this lane has ever photographed is an
**undo** — where the delta is computed from the record and no model is involved
at all (0007, 0031) — so the sentence credited a model with a request it never
made, on the screen where a reader is least able to check. Twelve lines below it
in the same file, `NO_CONFIDENCE_TO_JUDGE` exists to prevent exactly that
attribution. Every test passed. The photograph did not. There is a test for it
now, and the finding says so.

## Findings

**Filed five. Closed two.**

1. **Closed:** `Loom marketing`'s 23 September entry, portal row — both floors
   are wired and `/portal/rules` names them.
2. **Closed:** the private-screenshot-script finding, after seven consecutive
   runs of this lane filing it. `pnpm shoot` signed this routine into the portal
   first time. The selector is `#key` and the thing to wait for afterwards is a
   rail link, because this portal has no `data-signed-in` marker.
3. **Filed, for `Loom daily build`:** the props floor is **not in the policy
   fingerprint**, because it is a function on the runtime rather than a field on
   the policy. Two deployments whose fingerprints match can disagree about
   whether a part's settings are checked, and nothing in the record can tell
   them apart. The portal's workaround — a derived boolean, and a row on its own
   rules screen — tells a reader of that screen and not a reader of a stored
   disposition.
4. **Filed, for `Loom daily build`:** `summariseAssessment` drops the factor
   codes, so the journal cannot distinguish a change refused because it was
   undrawable from one refused because it was large. `/portal/rules` and
   `/portal/trust` both count them as one row. The recommendation is concrete:
   the codes are a closed union of thirteen strings carrying no content, which is
   exactly the argument `removedPrimitiveTypes` already makes for itself.
5. **Filed, unassigned:** two surfaces now hold a plain-language table for
   `StakeFactorCode` and the lane boundary is why. Filed as *the boundary working*
   rather than as a duplication to remove — the registers genuinely differ — with
   the failure mode to watch named.
6. **Filed, this lane's own:** the refusal a person *types* their way into cannot
   be reached or photographed without a model, so eleven of the thirteen factors
   and one of the two floors have no model-free path to a picture. The
   recommendation is a labelled preview on `/portal/rules` built from the same
   module, which is a product decision above this lane's line.
7. **Filed, this lane's own:** the staging half of the screenshot problem, with
   the recipe and the recommendation that it become a committed script under
   `apps/loom/scripts/` rather than a recipe the next run rebuilds from a report.
   That is a unit of work and this lane will take it.

## What I did not do

**I did not add a fourteenth state for a change refused on both floors at once.**
`cannotBeDrawn` is a predicate over the list, so a change that is both undrawable
*and* carrying a refused setting reads as one *Loom couldn't build that* with two
clauses under it — which is right, and is the shape the screenshot happens to
show with a different second factor.

**I did not touch `/portal/activity` or `/portal/trust`**, both of which show
refusals read back out of the journal and both of which would say more if the
factor codes survived into it. That is finding 4 and it is not this lane's to
fix; doing half of it here by re-deriving the factors from a stored delta would
be this portal computing a judgement rather than reading one.

**I did not build the preview screen** in finding 6, for the reason given there.

**I did not weaken the props floor to spare the undo.** A refused undo is a
surprising thing for a reviewer to meet, and it is the correct answer: the
primitive has to come back before the page can. `stakes.ts` says so in as many
words, and the screen now says it in words a person can act on.

**Nothing is scheduled and no pull request is subscribed to.**
