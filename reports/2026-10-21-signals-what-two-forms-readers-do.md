# 21 October 2026 (evening) — what two forms' readers *do*, and the pairing rule both comparisons now share

**Routine:** `Loom signals` · **Branch:**
`signals-46-what-readers-do-inside-a-page-form-by-form` · **Section:** §4c

## Before anything was built

**No open pull requests at all.** `gh pr list --state open` came back empty, so
there were no maintainer comments to address, no review comments of any kind,
and nothing from `Loom daily build` or any other lane in or near the signal
path to race. `main` is at `2f3723a`, which carries this morning's #687 — the
first time in three days that this lane's predecessor was already landed. So
this is a fresh branch off `main` rather than a push onto an open one.

With no comment outranking it, the queue decided the work: **an open finding
owned by this lane, filed this morning by the previous run**, which is ahead of
the plan by the brief's own ordering.

## The plain version

This morning's unit let a deployment serving two audiences ask *do the riders
read this page the way the skiers do* — part by part, on whether each form's
readers **got there**. It also named, and deliberately did not build, the two
questions the same join answers next: what each form's readers **did** once they
got there, and what each form's page **says**.

This run takes the first of those two.

> three in ten skiers do something on this page and one in ten riders do;
> half the skiers who reach the pricing band act in it, against a tenth of the
> riders

The counters for it have existed since the counters existed. Nothing was
collected, nothing was sent, nothing was stored.

## What I completed

**One unit, in two halves that only make sense together.**

**The first half is a move, and it is the half the finding actually asked for.**
The five states in which two readings are *not* two forms of one page —
different pages, a window holding two forms with neither asked for, a side that
names no audience, one audience handed in twice, two revisions — plus the rule
that decides which of the two sides is `one`, are now `FormPairRefusal` and
`formPairOf` in `src/signals/audiences.ts`. `forms.ts` imports them;
`FormComparisonSilence` is now `FormPairRefusal | "nothing-measured"`.

The argument for moving them is that **every clause 0302 argued for is about the
pair and not about the counter**. One page, one revision, two provable
populations, and no fact about which of the two comes first: a second comparison
of two forms restates none of it. A copy is cheaper to write than an import,
which is exactly why it needed a record — the first copy to disagree with the
original is a reading that refuses a pair the other one compares, with nothing
failing to compile. `formComparisonOf` is the same function from its caller's
side, and its own suite passing unchanged is what asserts that.

**The second half is the new reading**, `formActionComparisonOf` in
`src/signals/form-action.ts`: two page readings in, `pageActionOf` derived on
each side, and each shared part's `within ÷ reached` (0242, 0265) held against
the other form's. Both terms are distinct page-view counts off one row, so the
straddle over-count divides out before the two populations meet — the same
cancellation 0221 gives a fall and 0302 gives a reach share. Measured: a form
with ten times the readers behaving identically comes back as a gap of
**nought**, where a comparison of counts would have called it ten times better.

The direction is a **name** and never a sign, and `gap` is an absolute distance,
both carried over from 0302 for its reason: there is no earlier side.

## Decisions I took that the finding did not specify

**Four, and three of them only became visible once a second reading existed.**

**1. This reading has an honest page-level figure, where its sibling refuses
one.** 0302 clause 5 refuses a page total for two reasons — a mean over parts
counts one reader once per part they got through, and two forms do not have the
same parts, so two such means have two denominators that are not the same page.
**Neither reason reaches the root.** Every action anywhere on a page is strictly
inside the root (0242), so the root's own row is the distinct page views in which
a reader did anything at all: one row, one division, no addition anywhere.
`whole` is that row held against itself across the two forms, and it is the only
page-level claim either form comparison makes. It is kept out of `sharpest`
because the page contains everything it would outrank, and kept inside `counted`
because a census that leaves a part out does not account for the page.

**2. An unwalked side withholds every gap here, where a before-and-after only
names the state.** `PageAction.unwalked` is a window that holds uses and credits
no reader with acting inside anything — a sender whose delegated signals carry no
`within` (0167). Every share on such a side is a **nought that is a filing
artefact**. In `actionChangeOf` the two sides are two windows of one readership,
so naming the state and leaving the ratios is defensible. Here the two sides are
two **populations**, and the spurious nought reads as *this audience does nothing
on your page* — the most confident wrong sentence this reading could print. So
every gap is withheld while either side is unwalked, the parts fall into
`unknown`, and the census of what each form has still answers.

**3. `unwalked` is checked before `nothing-measured`, and the fixture that
reaches both was written before the sentence that ranks them.** This lane wrote
a rule down on 20 October after two guard orderings in two days turned out not
to be decisions at all: *an ordering is a decision only if a single input can
reach both guards.* A side with no page views and presses filed against its
parts reaches both, so the ordering here is real, and the test asserting it uses
exactly that window.

**4. `insideDisagreed`.** A share is withheld on a part with no element parts
under it for a structural reason. Two forms need not give a node the same
inside, so a band the deltas filled for one audience and left bare for the other
lands in `unknown` with nothing saying why. Those nodes are named, beside
`disagreed` for the nodes the two forms give different types. Both are facts
about the deltas rather than about either readership.

## Records added

**[0303](../decisions/0303-what-two-forms-readers-do-is-the-same-pair-at-a-different-counter-and-the-page-has-one-honest-figure.md)**,
Accepted — the pairing rule's move, the figure, the two states it cannot
survive, the page-level figure, and the five alternatives rejected. Nothing here
contradicts an accepted record, touches the tree schema or touches the delta
model, so none of it is architectural and nothing was left out on that account.

The nineteenth silence set is registered and **brings no condition of its own** —
the first since the fourth not to. Seven states, every one already in 0240's
table: five from the pairing rule, `no-action-credited` from the action
comparison, and the door's `no-view-reported`. That second arrival is itself the
evidence that `no-action-credited` was about the **sender** rather than about the
comparison that declared it.

## Findings

**Two filed, one of them half-closed on filing.**

- **the action half is built, the words half is still a mirror**, owned by this
  lane. This morning's finding named two readings; this run takes one. The words
  comparison is now cheaper than it was — it costs its figure over
  `PartReading.copy` and its own silences, because the pair's clauses are
  imported rather than restated — and it carries a warning: it will **not**
  inherit this reading's page-level figure, because words partition a page and
  readers do not, so its page total is a different argument again.
- **`actionChangeOf` publishes a share ratio of nought across an unwalked later
  window**, owned by this lane, open. Found while building the reading that
  withholds it. `ratioOf` returns `null` when the earlier term is nought and
  **`0`** when the later one is, so an unwalked *earlier* window is covered by
  accident and an unwalked *later* window publishes *every band on this page
  collapsed to nothing*, with `mostAbandoned` populated to match. Filed rather
  than fixed: the argument for withholding there is about two windows of one
  readership and is a different argument, and taking it inside a unit about a
  different comparison would have been two decisions in one record.

## Test numbers

`pnpm install` clean. `pnpm verify` **green**, read from a file rather than from
a pipe.

- `src/signals/form-action.test.ts` — **24 tests, all passing**, new.
- `src/signals/audiences.test.ts` — **53 tests**, 9 of them new, for
  `formPairOf` on the least a side can be.
- `src/signals/forms.test.ts` — **25 tests**, **unchanged**, which is
  what asserts the move did not change the reading it moved out of.
- `src/signals/silences.test.ts` — **55 tests**, two lines changed: the
  nineteenth vocabulary in the arrival table with an empty declaration, and one
  more `comparison` in the subject vector.
- Whole suite: **5,580 passing in 235 files** for the library, **6,197 passing
  in 349 files** for the application. **Zero failures, zero skipped.**

Nothing was skipped, nothing was weakened, and no test was marked pending. One
expectation was corrected while writing it — the double-count guard asserted a
sum of 22 and the real figure is 17 — and the correction made the test say more
rather than less: 17 against the root's own 10 is the double-count it was written
to catch, so the assertion now states both numbers and the inequality between
them.

## The one red, and it was mine to clear

The first full run came back **red on two tests in `(docs)`** — *the generated
reference is what the generator produces right now*, and *every published door
hands back exactly what its page says it does*. Both are the generated API
reference drifting: it is read from `dist/*.d.ts`, so a new export under
`src/signals/` fails them until `pnpm docs:api` is run. The library suite was
green at the time, which is the shape `docs/routines.md` already records — *two
failures in `(docs)` about `src/signals/` exports that no page mentions*, in a
route group that names neither the change nor the file.

**Regenerated rather than hand-resolved**, as the rule says, in its own commit:
140 lines added and 21 removed in `reference.generated.json`, 1,779 exports
across 17 entry points. The second full run is the green one above. The gate was
read from a file in both runs and never from a pipe.

## Browser cost

**None.** `broadcast.ts` was not touched: it is byte-identical to `main`'s
(`md5 0361f957…` on both), so the measurement is this run's confirmation of an
unchanged file rather than a new number — **6,513 bytes minified, 2,982
gzipped**, measured here with esbuild. Earlier reports quote 6,477 for the same
file under a different invocation; the figure that matters is that the file did
not change.

Nothing was added to a payload, a column, a store or the vocabulary of kinds.
This is the thirty-fourth thing taken out of the server-side join rather than
collected.

## On the door the maintainer parked

Nothing in this unit makes per-reader identity more expensive to add later.
Both figures are distinct-page-view counts filed against a node, with no visitor
id, no stitching and no persistence anywhere near them; an opt-in identified
window, if it ever came back, would be read by this same function without a
change to it. Said here because the brief asks for it, not because anything was
built toward it.

## Another lane's work in the signal path

None this run. No open pull requests, and `main`'s last five commits touch
`src/render/`, the portal shell, the marketing surface and the docs lane. Worth
carrying forward from this morning's report: **#686 and #688 landed inside this
lane's files** — `broadcast.ts`, `deliver.ts`, `intake.ts` and
`apps/loom/app/_lib/reader-signals/keys.ts` — as the maintainer's own project-key
work, so `broadcast.ts` is no longer only this lane's to measure.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment.

## What the merge has to deal with

One branch off `main` at `2f3723a`, no merge of anything into it, and no
conflicts to resolve. `decisions/README.md` was regenerated with
`pnpm decisions:index` rather than hand-written. `FINDINGS.md` was appended to
and never reflowed. `docs/signals.md` gained §46 at the one anchor and one row in
the summary table.

Preview:
<https://loom-git-signals-46-what-rea-f741f4-jpizzolato36-6341s-projects.vercel.app>
— taken from Vercel's own comment on #693 rather than guessed, and not opened
from here, because this session's egress policy refuses that host. Nothing in
this unit draws a screen, so it is the branch deployed rather than something to
look at.
