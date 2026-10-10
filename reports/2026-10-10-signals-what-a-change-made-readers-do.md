# Reader signals — what a change made readers do

**Routine:** `Loom signals` · **Date:** 2026-10-10 · **Branch:**
`signals-17-which-page-to-fix-first` (pushed onto the existing pull request,
#565) · **Section:** §22 of [`docs/signals.md`](../docs/signals.md)

## What I completed

`actionChangeOf(was, now)` in
[`src/signals/action-change.ts`](../src/signals/action-change.ts): the
before-and-after reading of what readers **did**.

Four comparisons of two windows already existed — where reading stops (§10), the
words that get reached (§16), whether readers had time for them (§19), who the
readers were (§20) — and every one of them is about **attention**. §18 answers
*four in ten readers who got to the pricing band did something in it*, of one
window of one revision, and nothing held two of those against each other. So the
sentence a change to a band nobody uses is made for — *the band readers reached
and touched nothing is used now* — had no answer at all.

It is the thirteenth thing taken out of what this subsystem already knows rather
than collected. **Nothing was added to a payload, a browser, a column, a store or
the vocabulary of kinds**, and the broadcaster was not touched.

## The decision I took that the plan did not specify

The plan's §4 names *which asks they open, which they complete* as the portal's
subject and does not say how a comparison of them should be shaped. Everything
below was decided in the building and is recorded as
**[0251](../decisions/0251-a-change-to-what-readers-did-is-a-ratio-of-two-shares-and-an-inside-a-change-gave-a-part-is-not-a-reader.md)**
(Accepted, nothing superseded).

**The method §19 uses is not available here, and I built the wrong thing first.**
A pace is `spentMs ÷ needMs`, and 0244 separates the readers from the change with
a counterfactual: hold the words still, hold the time still, see which verdict
survives. That works because one side of the division is **exact and
reader-free** — the words a revision says are a property of the tree, costed
identically in any window.

A share of readers who acted is `within ÷ reached`, and has readers on **both**
sides. So I wrote the decomposition anybody would write — `now.within ÷
was.within` beside `now.reached ÷ was.reached` — and then could not defend it.
Each count is generous by its own window's straddle (0147); that inflation
divides out of a ratio taken *inside* one window and not out of one taken across
two. **A deployment that shortens its rollup window moves both of those ratios
and moves no reader.** It is §21's own fact one level across, and where §21 could
scale a count at the door, here there is nothing to scale to: a share already
*is* the scaled figure.

So `shareRatio` is the only ratio published, **no ratio or difference of two
windows' counts is published anywhere on the type**, and the published keys are
pinned by a test so that adding one later is a decision rather than an oversight.
The counts travel on the two sides' rows as the weight behind the share, which is
0247's rule for its two arrival totals.

The consequence is worth stating plainly because it will be asked for: *did more
readers act, or did fewer reach it* is **unanswerable and will not become
answerable by adding a field.** It needs a reader-free term in the division. A
deployment that wants the narrower question names a `FunnelPair`.

**The second decision turned out to be provable rather than a warning.** A share
is withheld on a part with no element children (0242), and whether a part has an
inside is a fact about the tree that a change may move: wrap a button in a band
and the band has a share where one was withheld. That reads exactly like success.
`InsideMovement` reports it on every compared part — and the two properties that
matter fall out of the definitions rather than out of guards:

- **A part the change gave an inside cannot be reported as `taken-up`**, because
  `untouched` on the earlier side requires that side to have borne parts. The
  movement vocabulary is immune to the shape change; only a bare share is
  exposed.
- **`shareRatio` is non-null only where the inside was `kept`**, because a side
  without one withheld its share.

Both are pinned by tests that walk every compared part of three comparisons
rather than asserting one case.

**`unwalked` is a silence over the reading, and the occurrence figures survive
it.** A window whose delegated signals carry no `within` credits nobody with
acting inside anything, so every band in it reads `untouched` with the counters
looking healthy — and a comparison between a walked window and an unwalked one
reports **the whole page as abandoned**, which is the most alarming sentence this
module can print and is about a sender configuration. I refused it once over the
reading rather than part by part: a per-part rule would be a second spelling of a
standing 0242 already publishes, and two spellings of one rule is the fault this
subsystem has been bitten by twice. `activations`, `opens`, `closes` and
`completions` are filed against the part a reader used and need no ancestry, so
`usesRatio` and the four counts stand in full under it.

## Records added

**0251** — *A change to what readers did is a ratio of two shares, and an inside
a change gave a part is not a reader.* Accepted. Nothing superseded.

## The limit I found in 0240, written down and not superseded

0240's evidence that its conditions are *states of the world* rather than a list
of names was that the sixth and seventh silence sets needed no new condition. The
eighth brought exactly one: `no-action-credited`.

**Every one of the nine earlier conditions is an absence** — no view reported, no
row at the door, no opening marked, no window folded, nothing said, nothing
carried — or an inconsistency. This one is neither. The counters are present and
the rows look healthy; what is wrong is that a **nought in them is a filing rule**
rather than a measurement. Nothing before a reading of what readers *did* could be
in that state, so the earlier evidence holds for what it covered and the claim is
narrowed rather than falsified.

The mapping test used to assert that every set after the fifth reuses an earlier
condition. The lazy remedy was to delete that assertion. Instead it now
**declares, per later set, which conditions that set brought** and fails in both
directions — a set that adds an undeclared condition, and a set that declares one
it does not add. Strictly stronger than what it replaced, and a ninth set adding
a condition silently is still exactly what it catches. 0240 is not edited and not
superseded; the module carries the corrected counts (ten conditions, thirty
members, eight sets).

## Findings filed

Three, all appended, nothing reflowed.

- **For `Loom portal`** — what the reading makes drawable, with `mostTakenUp` as
  the sentence to lead with and four things to be careful of: `inside: "gained"`
  as the page changing shape rather than readers changing behaviour, the
  cross-window count ratio that is unavailable rather than unwritten,
  `silence: "unwalked"` as the state to refuse to draw, and the control whose
  presses began reporting `unknown`.
- **For `Loom primitives`** — the missing *control* member of the role vocabulary
  now has a **third** consumer, and this is the first one where the cost is a
  whole sentence rather than a standing: *the button nobody pressed is being
  pressed* is one of the first things anybody wants the morning after a change
  and it cannot be said. Nothing here needs changing when it lands, because
  0212's join is at read time.
- **For this lane** — the 0240 narrowing above, as a stated limit.

## Findings closed

None. No open finding owned by this lane was addressable by this unit; the one
that is a question — *a readership cannot be asked this week against last week*,
filed 9 October — is owned by the maintainer and is untouched.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, end to end. Exit code written
to a file as its own last act and read in a separate command, never through a
pipe.

| | |
| --- | --- |
| `src/signals/action-change.test.ts` | **25 tests, 25 passed** (new) |
| `src/signals/silences.test.ts` | **34 passed** (1 test rewritten, none removed) |
| `src/signals/` | 30 files, **791 passed** |
| Root suite | 201 files, **4,512 passed** |
| `apps/loom` | 419 files, **7,636 passed** |
| `pnpm findings:check` | 1,099 findings, **0 malformed** |
| `pnpm prerender:check` | 129 pages, 1,644 junctions, **0 run together** |

**Nothing failed in the end and nothing was weakened.** Two red runs on the way,
both real and both fixed rather than worked around:

1. `src/documentation.test.ts` — *never makes a decision-record number part of a
   published sentence*. One doc comment on `shareRatio` read *"which is 0221's
   cancellation"*, and a possessive is grammar rather than a footnote, so the
   site would have withheld the whole summary. Rewritten as a parenthetical.
2. `app/(docs)/_lib/api/extract.test.ts` — the generated API reference had moved,
   as it must when a module is published. Regenerated with
   `pnpm --filter @loom/app docs:api` and committed.

**The double count, three shapes, all covered**, per this lane's standing rule
that anything which counts is tested against a case where it would double-count.
One reading handed in as both sides → every movement is *the standing did not
move*, `mostTakenUp` and `mostAbandoned` both `null`, `shareRatio` exactly 1 on
the root. A window of counters concatenated with itself → the reading drops every
row but the first and the comparison is `toEqual` the single-window one, where a
doubling would have halved every share. And the movement and shape censuses are
asserted to add to `compared.length` exactly, over a page with six compared
parts, so a part counted under two members cannot pass.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`broadcast.ts` bundled with esbuild (minified, ESM, browser) from a clean
`git archive` of `origin/main` and of this tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical.

**One note on the method, because it cost a minute and will cost the next run
one.** The first measurement reported 2,944 against 2,946 gzipped from two
byte-identical inputs. `gzip -c <file>` stores the **file name** in the header,
and `wmain.js` is two characters shorter than `wbranch.js`. Compare with
`gzip -9 -n -c < file`, which is what the numbers above are.

## Why this is on the existing branch rather than a new one

`docs/routines.md`' procedure step 3 says a lane with an open pull request pushes
onto that branch rather than opening a second one, because two open branches from
one lane touching one file is a conflict the lane creates for itself and the cost
lands on the maintainer at merge time. My brief's step 3 says *branch off `main`*
and does not address the case.

I followed `routines.md`, and here it is not a formality: this unit edits
`src/signals/silences.ts`, `src/signals/index.ts`, `docs/signals.md` and
`decisions/README.md`, and **#565 edits all four**. A second branch would have
produced a textual conflict in `silences.ts` — the one of the four that is not
union- or ours-merged — for no gain. #565 is `Accepted` and clean rather than
parked on a question, so nothing is being held behind a decision either.

The cost of the choice, stated plainly: #565 is now two units and its original
title undersells it. I have updated the title and the body to cover both.

## Open questions

Nothing blocking. Two things for the maintainer, both with a recommendation, in
the pull request comment.

## Not built, and deliberately

- **Signal-to-intent derivation** — still out of scope for everyone, and planned
  in `adaptation.md`.
- **Per-reader identity** — parked since 30 September, not built, and no record
  argues for it. Nothing in this unit makes it more expensive to add later: the
  comparison reads stored counters and holds no reader state of any kind, and a
  future identified batch would change what a rollup writes rather than anything
  here.
- **The attribution `pace-change.ts` publishes.** Refused with its reason in
  0251, rather than shipped with a caveat.
