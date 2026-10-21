# 21 October 2026 — two forms of one page side by side, and the three comparisons yesterday did not reach

**Routine:** `Loom signals` · **Branch:** `signals-43-a-page-read-as-neither-is-not-a-page-nobody-read`
(#687) · **Section:** §4c

## Before anything was built

Two pull requests open. **#687** is this lane's, from last night, carrying 0301;
no maintainer comment and no review comment of any kind, so there was nothing
outranking the plan to address. **#689** is `Loom portal`'s and touches nothing
in `src/signals/`.

#687 being **unmerged** has not happened to this lane before — every previous
run found its predecessor on `main` — and it decided both what was built and
where it was pushed. `docs/routines.md`'s procedure is explicit about the
second: *check whether you already have an open pull request; if you do, push
onto that branch rather than opening a second one — two open branches from one
lane touching one file is a conflict the lane created for itself, and the cost
lands on the maintainer at merge time rather than on the run.* So this work is
**on #687** and there is no second pull request.

That rule then paid for itself twice over, which is the part worth reading: the
unit I had written off as blocked is blocked **only** by something #687 carries,
so pushing onto #687 unblocked it. Both are here.

Sequence on the branch: `origin/main` at `300f48f` merged in (clean), then
today's work. One conflict in `docs/signals.md`, which was two sections
appending at one anchor and is resolved as §43 then §44.

## The plain version

A deployment serving two audiences serves two forms of one page: one tree, one
revision, two sets of counters, and two slightly different pages because each
audience earns its own deltas. Four weeks of this lane's work was about keeping
those two apart — not summed, not picked between by whichever row sorted first,
not compared as though one of them had changed.

**Nothing could hold them against each other on purpose.** Which is the question
a deployment that earned a second form actually has: *do the riders read this
page the way the skiers do, and does each of them get the same page at all?*

It can now.

> half the skiers who arrived reached the pricing band; one rider in ten did

Over one tree at one revision, so nothing about the page moved and the only
thing that differs is who was reading.

## The first unit — two forms of one page, side by side (§44)

`formComparisonOf` in `src/signals/forms.ts`, taken as
[0302](../decisions/0302-two-forms-of-one-page-are-compared-at-each-forms-own-share-and-neither-side-is-earlier.md),
and planned as §44 of `docs/signals.md`.

The plan named this reading on 17 October and deliberately left it, with one
instruction: **it must not borrow `changeOf`.** That instruction is the whole
design. There are ten comparisons in `src/signals/` and every one of them varies
the tree and holds the readership still. Hand `readingChangeOf` two forms of one
revision and it produces every stop, every share and every `improvement`, with
no `null` and no silence anywhere on it, labelled as *what your change did*
about a change that did not happen. 0294 refuses that pair — which is why there
was a gap to fill rather than a bug to fix, and why the reading that fills it is
the mirror of the one that refuses it rather than a relaxation of it.

Six things in it were decisions rather than implementation:

**1. It refuses two revisions.** Two forms of a page share a tree *and* a
revision, so a pair spanning two revisions varies the tree as well as the
readership and every figure on it carries both causes with nothing to separate
them. That is the one thing a before-and-after exists to avoid, and this reading
would otherwise have done it silently.

**2. Neither side is earlier, so the order of the arguments does not reach the
answer.** This is the one I would defend hardest. 0224's bargain is that
`readingChangeOf` does not check which reading is older: a caller holding them
backwards gets every sign reversed, and that is deliberate, because it makes
*this week against last week* come out of the same function. **Here the same
bargain would be a defect.** There is no fact of the matter about which of two
populations comes first, so two deployments asking one question would get two
answers and a screen built on one of them would read the sign of every figure
backwards with nothing saying so.

So the two sides are sorted by audience id before anything is read off either of
them, and the answer is identical whichever way round the question is asked —
asserted over a four-part fixture rather than described. The same fact decides
the per-part figure: the difference is **unsigned** (`gap`) and the direction is
a **name** (`favours`), because a sign is read against an order and the order
here is the alphabet of two names the host chose.

**3. The comparable figure is each form's share of its own arrivals.** A
`reached` count is not: two forms are served to two sets of people, so one form
reporting more readers is very often one form having more readers. Measured on
fixtures: a form with a thousand views reaching a band five hundred times and a
form with a hundred views reaching it fifty times come back as a gap of
**nought**, where a comparison of counts would have reported the busier form
reading it five times better.

**4. The content half is stated rather than estimated.** A difference between
two forms has two causes — the deltas changed the page and the people are
different — and nothing in the counters separates them. §20 exists so a
before-and-after can *report* when its readership moved; here that confounder is
permanently true and is not a fault to detect. So `onlyIn` names every part
exactly one form has, each entry naming its form, and `disagreed` names every
shared node the two forms give different primitive types. A part only one form
has is never compared: otherwise a band the other form does not contain reads as
a band that form's readers skipped, which is the most confident wrong sentence
this reading could produce.

**5. Nothing is added up across parts**, and the absence answers two questions
rather than one. A mean over parts counts one reader once per part they got
through, *and* the two forms do not have the same parts, so two such means have
two denominators that are not the same page. Either alone would be enough. What
is published instead is `counted` — *eleven parts read better by the skiers,
three by the riders, four alike, six beyond saying* — and `sharpest`.

**6. It is the eighteenth silence set and the first whose subject is the
readership**, so the first since the eighth to bring three conditions of its own:
`two-revisions` (the third side of what a comparison holds still),
`one-population` (**the only condition in the table about too few of
something** — `two-audiences` turned over), and `no-audience-named`. Three in
one set is unusual and I want to be clear it was not casual: each is a state
only a reading that holds the tree still and varies the audience can be in, and
each has a remedy the other two do not. The *Alternatives considered* section of
0302 argues each one against the condition it looks most like.

The sharpest difference between this reading and a before-and-after is in that
last member and is written down as a decision rather than left as a consequence.
0294 **compares** a pair with an unlabelled side and merely reports that it is
not provably of one readership, because there the audience is a confounder and
refusing it would withhold every comparison spanning the day a deployment
upgraded. Here the same side is **refused**, because the audience is the
subject. Two opposite treatments of one value, deliberately, with the reason on
both.

## Decisions I took that were not specified

- **`one-population` is a refusal and not an empty answer.** A caller handing in
  one audience twice is holding a before-and-after, and the condition says so
  rather than returning a comparison of a thing with itself.
- **A shared node whose type the two forms disagree on stays in the comparison**
  and is named in `disagreed`, which is how `LibraryReading.roleDisagreed`
  treats the same shape. The two reaches are each their own form's and stay
  comparable; what would otherwise be silent is that the two sides are not
  showing the same thing.
- **`nothing-measured` publishes the census.** It is the only member of this set
  that withholds half a reading rather than all of it, which is how
  `CopyChangeSilence` already spells the same state: what the two forms hold is
  a fact about the two composed trees and survives a window nobody read.
- **No top-level `treeId` or `revision` on the reading**, where every other
  reading in this subsystem has one. This is a reading of two sides, and the two
  refusals that matter most are exactly the two where picking one side's would
  be picking one of two different answers. Each side carries its own.
- **I numbered the record 0302 and not 0301.** It was written while #687 held
  0301 and `main` carried 0300, and two records sharing a number is fatal
  (0097). 0300 did the same thing eight days ago for the same reason. The two
  now sit on one branch, which the record's own opening note explains rather
  than hides; renumbering it back to 0301 was not an option and leaving the hole
  on `main` for a day is what 0097 is written for.
- **I appended one bullet to 0301 rather than writing a second record for §45.**
  The second unit is that record applied to three more readings of one shape, so
  a record of its own would have been a record about where the first one had not
  reached. Nothing in 0301 was reversed or reworded; one consequence was added,
  and the one genuinely new rule in §45 — the `unwalked` ordering — is in it, in
  the plan step, and in the module's own doc comment.

## The second unit — the three comparisons §43 did not reach (§45)

**0301 left three comparisons behind.** `copyChangeOf`, `paceChangeOf` and
`actionChangeOf` each take two page readings, each guards two pages and then two
audiences, and neither guard can see a side read as neither form. What they
published instead was `nothing-measured` — *one of the two windows held no page
views* — of a window that held plenty: it held two forms of them. A refused page
reading has a view floor of nought with full counters behind it, so the floor
alone cannot tell a window nobody **read** from a window nobody **split**, and
the two sentences send a deployment to opposite places.

Taken as 0301 applied rather than as a decision of its own: one guard beside the
two each already had, `audiences-mixed` on three more vocabularies, three cases
in `silences.ts` mapping to the existing `two-forms-unsplit`. All five
comparisons over two page readings now report it and the silence table gains no
condition. 0301's consequences gained a bullet saying so; nothing in it was
reversed.

**Why I had written this off, and why that was wrong.** `copy-change` is one of
the five silence sets that predate the arrival table in `silences.test.ts`, and
`pace-change` and `action-change` both arrive in that table *before*
`funnel-change`. So any of the three adopting `two-forms-unsplit` makes
`funnel-change`'s declaration of it stop being novel, and the provenance fold
reports that no set ever brought it — the exact deletion that test's own note
says it exists to prevent. **#687 fixes that generally rather than for its own
case**, so on this branch the unit needed *no* change to `silences.test.ts` at
all, which is what happened: it passed untouched on the first run.

I had reached the opposite conclusion earlier in the run, because I had read the
task prompt's *branch off `main`* without having read `docs/routines.md`'s
procedure, which is more specific about the case I was actually in. The finding
is filed with the original reasoning intact and its closure beside it, because
the useful part is the shape of the mistake: **a blocker that lives on your own
open branch is not a blocker.**

Three orderings, and all three are real — each fixture reaches both guards:

- **a page that says nothing** is reported before the unsplit window, because it
  survives the remedy, so reporting it first loses nothing;
- **the view floor** is reported after it, because the floor is the unsplit
  window's own symptom — 0301's argument;
- **`unwalked`** is reported after it, and this is the one ordering taken on a
  rule rather than on a cause. A mixed side and a sender whose delegated signals
  carry no `within` are reachable at once and neither causes the other. The rule:
  **the state whose remedy is a call wins, because taking it reveals the other
  and taking the other does not reveal it.** A deployment told `unwalked` first
  goes and fixes a sender, asks again, and is handed the same unsplit window with
  nothing saying so.

What survives the refusal in each is that reading's own **tree half**, exactly
as `nothing-measured` already leaves it standing: the words a change wrote, the
time the page asks for, and which parts it added and removed are facts about the
two trees and about no counter. Every figure about readers is withheld. I had
first written all three to refuse wholesale through their `refusing()` helpers
and corrected it, because `different-audiences` withholds the census for a
reason that does not hold here — there the two sides are two forms wearing one
tree id, so the census would report the other form's deltas as what the change
wrote, and here the two trees are two revisions of one page and the census is as
true as it ever was.

## Real test numbers

`pnpm install && pnpm verify` — **green**, on the whole branch with all three
units on it, exit code 0 through every stage: build, typecheck, the root suite,
`findings:check`, `reports:check`, the app's own verify and `prerender:check`.
Nothing skipped.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 234 | **5,547** |
| the app's own | 347 | **6,153** |
| `src/signals/` alone | 43 | **1,416** |

`forms.test.ts` is 25 of those. The three comparison test files gained 17 between
them — six, five and six — and `silences.test.ts` passed **untouched**, which is
the prediction the second unit rested on.

Three things failed on the way and all three were mine:

- `pnpm typecheck` rejected `readonly readonly [A, B][]` in `forms.test.ts`.
  Corrected to a readonly array of readonly tuples.
- the app's generated API reference drifted **twice**: first `offered.test.ts`
  found four exports no page mentions, and later `extract.test.ts` found the
  three closed silence sets had each gained a member since I last regenerated.
  `pnpm docs:api` both times. The rule I should have followed from the start:
  regenerate it **last**, after the final word of every doc comment, because the
  reference carries the prose as well as the signatures.
- `src/documentation.test.ts` failed **twice**, five sentences in all, and it is
  worth being specific because the rule is not obvious. An *indented* doc
  comment is published whole, where a left-margin one has only its first
  paragraph lifted — so a markdown link to a record inside an indented comment
  puts the number in a published sentence. The first two were links; the second
  three were a bare `0301` in a prose clause. The rule to carry: **inside an
  indented doc comment, cite as `(0301)` and never as a link or as the subject
  of a sentence.**

### The planted mutations

Nine, each reverted after measuring, because a test that cannot fail is
documentation. Five on the first unit:

| what I broke in `forms.ts` | tests that failed |
| --- | --- |
| dropped the canonical ordering of the two sides | **8** |
| swapped `unsplit` and `unattributed` | **5** |
| dropped `spokenFor` from the gap rule | **1** |
| moved the revision guard ahead of the population guards | **2** |
| let the second pass re-file parts both forms have | **4** |

The third is the one worth reporting. **It was a survivor until I added a test
for it.** The gap rule withholds a difference where either side held no views
*or* either side's standing is `unknown`, and every fixture I had written reached
the first clause only. The second needs a window that **held readers** and has a
row for the band whose reach is nought — a press delegated to a band no `viewed`
ever named, which is the 0282 state. Nobody writes that window by accident.

That is the third day running that what a mutation found was a test I had not
written rather than a line of code. Yesterday's note was *a guard ordering is a
decision only if a single input can reach both guards*; this adds **a
disjunction in a guard needs a fixture per branch, and the branch nobody writes
by hand is the one that will survive.**

Four on the second unit:

| what I broke | tests that failed |
| --- | --- |
| dropped the clause from `copyChangeOf` | **3** |
| put `paceChangeOf`'s clause after the view floor | **3** |
| put `actionChangeOf`'s clause after `unwalked` | **1** |
| made the guard look at the earlier side only | **1** |

All four bite, and the two orderings in rows two and three are the ones the
standards ask to be proved reachable rather than asserted. Rows four and five of
the first table, and row four here, are the double-counting and
one-side-only cases the standards ask for by name.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind.
`broadcast.ts` is **byte-identical** to `main` — its bundle and `main`'s compare
equal byte for byte — and measures **6,390 bytes minified** (esbuild, bundled,
browser platform). That is not the 6,477 of yesterday's report and nothing here
caused the difference: #686 landed a line in `broadcast.ts` and 35 in
`deliver.ts` since that measurement.

Rule 4's budget is untouched and `browser-weight.test.ts` passes. The
thirty-third thing taken out of what this subsystem already knows rather than
collected.

**Nothing here makes per-reader identity cheaper or dearer to add later.** Every
figure is a share of one audience's own arrivals over a window the store already
keeps per audience, and an `aud_` stays an opaque name for a predicate the host
wrote and Loom never sees. There is no reader in this reading at any point —
only two populations, each counted as a floor on page views.

## Another lane's branch in the signal path

**#689**, `Loom portal`'s, touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`, so there is nothing to race. Worth noting
for the next run that **#686 and #688 both landed inside this lane's files** —
`src/signals/broadcast.ts`, `deliver.ts`, `intake.ts` and
`apps/loom/app/_lib/reader-signals/keys.ts` — while this lane was asleep. That
is the project-key work and it is the maintainer's own; it is not a collision,
but it means `broadcast.ts` is no longer only this lane's to measure.

## Findings

Three filed, one of them closed on filing.

- **the three comparisons 0301 did not reach**, owned by this lane and **closed
  by §45 in this same unit**. It is filed with its original reasoning intact and
  its closure beside it, because the shape of the near-miss is the useful part:
  a blocker that lives on your own open branch is not a blocker.
- **the same form comparison of a part's words and of what readers did inside
  it**, owned by this lane. It is this join at a different counter and no
  decision at all: every clause of 0302 is about the pair rather than the
  counter and carries over unchanged. Filed rather than built because three
  readings of one shape in one unit is how a rule comes to be spelled three
  times and agreed with by two of them.
- **no screen reads a form comparison**, owned by `Loom portal`, with the three
  things on it a card has to decide about and the two that are traps: the
  direction is a name and not a sign, and `onlyIn` is not a skipped part.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment.

## What the merge has to deal with

One branch, which is the point of pushing onto it. `origin/main` at `300f48f`
was merged in before anything was written and the only conflict in the whole run
was `docs/signals.md` — two plan sections appending at one anchor — resolved as
§43 then §44, with §45 added after. `decisions/README.md` and the generated API
reference were regenerated rather than hand-resolved. `FINDINGS.md` was appended
to and never reflowed.

Had this opened a second pull request instead, the collision list would have
been `docs/signals.md`, `decisions/README.md`, the generated reference,
`FINDINGS.md`, `silences.ts` and `silences.test.ts` — and the last of those
would have been two branches rewriting one test's provenance fold for the same
reason. That is the cost the governance rule exists to avoid and it is the
concrete version of it, so it is written down here.

Preview:
<https://loom-git-signals-43-a-page-r-ce2aad-jpizzolato36-6341s-projects.vercel.app>
— the branch alias, which stays the same across pushes; Vercel's own comment on
#687 carries the per-deployment link. Nothing in either unit draws a screen, so
it is the branch deployed rather than something to look at. The egress policy
for this session refuses that host, so it is quoted from Vercel's comment rather
than checked from here.
