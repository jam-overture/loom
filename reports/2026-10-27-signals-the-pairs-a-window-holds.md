# Reader signals — the pairs a window holds

**27 October 2026 (morning)** · `Loom signals` · branch
`signals-57-the-pairs-a-window-holds` · §57 of
[`docs/signals.md`](../docs/signals.md) · record
[0318](../decisions/0318-a-windows-before-and-after-pairs-are-one-per-form-and-they-are-its-latest-two-revisions.md)

## Before anything was built

**Two open pull requests, both this lane's, and no maintainer comment anywhere.**
Every comment on both is this lane's own, which is not input, so nothing
outranked the queue.

- **#714** — §56, record `0317`, *one window, read where the other settings
  are*. Last night's run. It touches
  `apps/loom/app/_lib/reader-signals/{settings,receive,notice,chain}`,
  `apps/loom/scripts/signals-collect.ts`, `docs/signals.md` and `FINDINGS.md`.
- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists.

This branch is cut from `origin/main` at `a3600f1`. **Nothing on it goes near a
file either open branch touches**, which is why it is §57 and leaves §56 to
#714. `Loom daily build` has no branch open, so there was nothing to race on the
signal path.

**One thing for the merge routine.** #714 and this branch both insert a plan
section immediately above `## Still not in scope` in `docs/signals.md`. If that
conflicts, the resolution is to keep both sections in numeric order — §56 then
§57 — and nothing else in the file is touched by either.

Six open findings owned by this lane were read first. One of them turned out to
be the work, in a way I did not expect, and the rest is below.

## What I set out to do, and the ten-day-old entry that was already closed

The oldest actionable finding this lane owned was the 17 October entry *the
comparison layer still does not check that its two sides are of one form, and
the loud half and the quiet half want one decision*: nine comparison functions,
none of them looking at the audience, one guard to add in nine places.

**It was stale, and checking it was the whole of the first hour.** Function by
function on `main`: the five page-scale comparisons all call `crossesAudiences`
and all carry `audiences: ComparedAudiences`, which is both shapes the entry
recommended — taken as **0294** eight days ago. The four library comparisons
carry `audiences: ComparedPopulations`, which is a census rather than a guard,
and `audiences.ts` carries the argument for why under its own heading:
*Comparing two **windows** is a fourth question, and it refuses nothing.*

So nothing was owed. **What kept the entry open is worth naming**, because it
cost a run's reading: its title says *of one form* and its body argues about the
audience, and its two halves were then closed by two different records eight
days apart (0294 for the guard, 0295/0297 for the census), neither of which
quotes it. It is closed now with that reading filed beside it, so the next run
does not start the work again.

What I did instead is the gap I found while reading for it.

## What I completed

**§57 / 0318 — `windowPairsOf`, the second step of the §51 rung.**

§51 (`0309`) made every reading that is a function of one `PageReading`
reachable from a store. **Nine of them are functions of two** —
`readingChangeOf`, `copyChangeOf`, `paceChangeOf`, `actionChangeOf`,
`funnelChangeOf` and the four library comparisons — and nothing turned a window
into a pair, although a window usually holds both sides: one page's revision 5
and its revision 9 are two readings in the same list.

`deploymentChangeOf` has said so in its own docblock since §35:

> Takes the comparisons rather than the counters … **A caller with two windows of
> counters reads each page's parts, then its progress, then its comparison, then
> this.**

That sentence names a step with no owner. The comparison half of this subsystem
— the half the product's argument rests on, that a change can be inspected and
attributed — was reachable only by a caller that wrote the pairing itself, and
**0293 exists because four functions in this directory wrote the pairing
themselves and all four got it wrong.** A caller writing it is a caller writing
0293 again, in a file nobody reviews for it.

After this the deployment-wide change order is three lines:

```ts
const { pages } = windowReadingsOf(window, treesIn(trees), registry)
const { pairs } = windowPairsOf(pages)
const order = deploymentChangeOf(
  pairs.map(({ was, now }) => readingChangeOf(was, now)),
  window.pageViews
)
```

### The clause that is load-bearing rather than tidy

**One pair per form, and it is the latest two revisions.** A form with revisions
3, 5 and 9 in the window has two consecutive pairs in it and this produces 5
against 9.

The obvious answer is both pairs, and it breaks the only consumer there is.
`deploymentChangeOf` gates a form handed two different revision pairs as
`ambiguous` and drops it — rightly, because *which page did the change hurt
most* cannot be answered about a form that changed twice. So a rung publishing
every consecutive pair would take **every page a deployment published three
times inside one window** out of the order that exists to rank it, and a shorter
order looks like a calmer week (0158).

That is asserted in both directions rather than argued: over the same three
readings, these pairs give `ambiguous: []` and `compared: 1`, and every
consecutive pair gives `ambiguous: [TREE]` and `compared: 0`.

### What grouping by the published rule buys, which is the point of the rung

The grouping is `formKeyOf` (0293) and nothing else, so **both sides of every
pair are of one tree and one audience by construction.** Three of the four
states `readingChangeOf` refuses are therefore unreachable from a pair this
makes: `different-trees` needs two trees, `different-audiences` needs two named
audiences that differ, and `audiences-mixed` needs a side holding two forms and
naming none — which is a reading `windowReadingsOf` does not produce, because it
splits a revision serving two forms into one reading each.

What is left is `nothing-measured`. **A silence off this path is a fact about a
deployment's readers and never a mistake in its asking**, and that is the
division the rung is for. It is also the quiet collapse the 17 October entry was
filed about: one form's earlier window against another form's later one, every
figure produced, no silence anywhere. A caller reading its window through the
rung can no longer construct it.

### The rest of it

- **`superseded`** lists the revisions of that form below the earlier side, so a
  surface says *and one earlier revision in this window* and a caller wanting
  that older pair has two readings and one call. The widest pair (3 against 9)
  is deliberately unavailable: it is two changes added together and labelled as
  one.
- **A form with one revision is reported, not dropped.** `unpaired` carries it
  with its reading, for the reason `UnjoinedRevision` is published: a page
  published inside the window, a page nobody has changed since it began, and
  both sides of a deployment that upgraded across 0284 all land there, and a
  screen that left them out would show a deployment fewer pages than it has.
- **A reading handed in twice under one `readingKeyOf` is dropped and counted**,
  first-wins as in `treesIn`. It is nought for anything the join produced; it is
  not nought for a caller that concatenated two reads, and that caller is who
  the clause is for — a form whose latest revision arrived twice would otherwise
  pair that revision with itself and publish *nothing changed* about a change
  that was made.
- **It adds no figure of its own**, which is §51's rule kept for the second
  step.

## Decisions I took that were not specified

**The pair spanning the 0284 upgrade is not produced, and this is the one place
the unit says no.** A deployment whose older revisions' rows never carried the
audience column has those revisions in a form naming none and its newer ones in
a form naming one, and those are two forms under the pairing rule.
`crossesAudiences` deliberately *allows* that comparison — unprovable rather
than proven two populations — and I kept the distinction between allowing it and
asserting it: nothing in the rows says the two are one population, and a rung
that paired them would be a tenth spelling of the pairing rule inside the module
written to stop there being a second. Both sides are in `unpaired`, and the
caller that knows its own publishing history makes the comparison in one call,
where `ComparedAudiences` on the result says what it was read across. There is a
test that walks exactly that path.

**No option argument choosing the pairing rule.** A
`{ pairing: "latest" | "every" | "widest" }` was the first thing I costed, and I
rejected it because what makes `every` unsound is what the *consumer* does with
it. A rung whose correct argument depends on something the caller cannot see is
an argument that will be set wrong — the same reasoning the `loom.code` overflow
finding used against a prop whose right value depends on the viewport.

**It returns pairs and not comparisons.** `changes: readonly ReadingChange[]`
beside them was tempting and would have made the example two lines. Rejected for
0309's reason: it privileges one of nine comparisons, makes this a thirty-ninth
reading, and derives a figure in a second place.

**It lives in `window.ts` rather than a file of its own.** It is the second step
of the rung 0309 built, it is a function of `WindowReadings.pages`, and it reuses
that module's revision ordering. A second file would be a second place to look
for one answer.

**One rename that was not forced and is an improvement.** `window.ts` held a
private `inFormOrder(one: AudienceId | null, other: AudienceId | null)` which
orders **audiences** and takes no tree, while the published `inFormOrder` in
`audiences.ts` orders **forms**. The pairs need the published one, so the two
would have collided. The private one is `inAudienceOrder` now, which is what it
does — two rules cannot carry one name in a subsystem whose findings are mostly
about exactly that.

## Records added

- **0318** — *A window's before-and-after pairs are one per form, and they are
  its latest two revisions.* **Accepted.** It contradicts no accepted record:
  0293 keeps the pairing rule and this imports it, 0294's guard is untouched and
  still there for a hand-built pair, and 0309's *adds no figure of its own* is
  carried forward. Six alternatives recorded with what each costs.

0318 was the next number free on `main`, which holds up to 0316; 0317 is claimed
by #714 and 0308 by #706, and neither claims 0318. Nothing on this branch is
`Proposed`, so there is nothing for `Loom merge` to skip.

## Findings filed and closed

1. **Closed:** *the comparison layer still does not check that its two sides are
   of one form* (17 October). Stale — both recommended shapes exist, taken as
   0294 and 0295/0297. Closed with a filed reading that says so function by
   function, including the table of all nine, so the entry's own confusion of
   *form* with *audience* does not cost another run its reading.
2. **Filed, closed on filing:** *the comparison layer's audience guard was
   already built in both of its two shapes, and the entry asking for it stayed
   open for ten days.* The reading above, filed as an entry so it is searchable
   from outside `decisions/`.
3. **Filed, open, owned by this lane:** *the pairing rung does not assemble the
   two windows the four library comparisons take, because a form with one
   revision cannot be put on a side.* Named at the moment it was created, with
   the broken one-liner that composes and is wrong written out, three shapes
   costed and a recommendation. It is the candidate for the next step.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0** — read from `verify.exit`, which
the gate wrote as a separate command, per `docs/routines.md`.

**It took two runs and the first was red.** Reported rather than smoothed,
because the failure is the gate doing its job: four new published exports moved
the runtime's published surface, so
`app/(docs)/_lib/api/reference.generated.json` no longer matched what the
generator produces, and two tests in `(docs)` said so — one comparing the
reference against the generator, one comparing the reference against the
modules themselves. Regenerated with `pnpm --filter @loom/app docs:api`, never
hand-resolved, per `docs/routines.md`. The diff is exactly the four names and
nothing else: `WindowPair`, `UnpairedForm`, `WindowPairs` and `windowPairsOf`.

| | |
| --- | --- |
| Root suite | 240 files, **5,791 tests**, all passing |
| App suite | 367 files, **6,618 tests**, all passing |
| `src/signals/` | 49 files, **1,660 tests** |
| `src/signals/window.test.ts` | 59 → **71** |
| New cases | **12** |
| Findings ledger | 1,330 entries, 0 malformed |

**Nothing failed and nothing was skipped.** No existing test was changed or
weakened; `window.test.ts` gained twelve cases and lost none. One existing
fixture list grew by two entries — the `treesIn` double in the new describe
block holds trees at revisions 9 and 10 as well, which the numeric-ordering case
needs.

**Ten mutations planted, ten dead** — but two of them only after a test was
written for them, which is the half worth reporting.

| planted | what died |
| --- | --- |
| `superseded` sliced one short | 2 cases |
| the earliest pair rather than the latest | 4 cases |
| the widest pair (first against last) | 5 cases |
| grouped by tree rather than by form | 3 cases |
| the duplicate counted and still paired | 2 cases |
| last of two readings of one key wins | 2 cases |
| a single-revision form dropped rather than reported | 3 cases |
| `pairs` left in arrival order | **nothing, first time round** |
| `unpaired` left in arrival order | 1 case, after the above was fixed |
| revisions sorted as text rather than as numbers | **nothing, first time round** |

**The two first-round survivors are why the suite has twelve cases and not ten.**

The order mutation survived because `windowReadingsOf` already returns its pages
in a stable order, so every test fed it sorted input and the sort was
unfalsifiable (0231). The case added for it hands the same readings in forward
and reverse order and asserts both answers are the published form order.

The text-sort mutation survived because every fixture used revisions 1, 2 and 3,
which sort identically as text and as numbers. **As text, revision 10 sorts
below revision 2** — so a deployment on its tenth revision of a page would have
been handed revision 2 as its *latest* side and the real change reported
backwards. The case added for it pairs revisions 2, 9 and 10 and asserts the
pair is 9 against 10 with 2 superseded. Nothing was wrong in the code; the test
that would have caught it being wrong did not exist.

**Browser cost: nothing.** `broadcast.ts` is byte-identical — `git diff` on it
is empty — and the bundle measures **6,513 bytes** minified, the same number as
the last three runs. `browser-weight.test.ts` still reports no package in the
broadcaster's import graph. `window.ts` is server-only and reaches no browser.
**No payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Three things, each with a recommendation, and two of them
are not new.

1. **The library windows** the rung does not assemble (filed today).
   Recommendation: take the placing as an argument, the shape §54 used for the
   region floor — hold configuration you were handed rather than configuration
   you went looking for. It defines what a library window is, so it wants a
   record, which is why it is filed rather than taken in the same run.
2. **The door's repeated *opening* batch** and the region floor its remedy
   reaches, which is the maintainer's and is unchanged.
3. **`0308`** on #706, unchanged: one reading of one clause, three days old now,
   and still the cheapest it will ever be.

And the standing one, now ten runs old: **nothing draws any of this.**
`Loom portal` is paused. Today's work is the last rung between a store and the
comparison layer — the five page-scale comparisons are one call from a window
now, and nothing calls any of them.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and
nothing was built toward it.** The pairing is over forms, which are a column the
host wrote, and over revisions, which are a page's own history; neither reaches
a reader. A pair carries two readings and no person. If identity ever returns as
an opt-in, a consent decision would be a third thing beside a form rather than
something this pairing would have to be unpicked from.
