# The button that asked the question again, and the count that noticed

**Routine:** `Loom demo` · **Branch:** `demo-20-already-asked` · **17 September 2026**

**Deployed preview:** on the pull request — public, no sign-in, at `/demo`.
Press **Take the numbers off**, then look at the list of asks under the caution.

The twentieth run of this lane. It takes the finding the nineteenth filed and
recommended, and takes the shape the finding recommended.

---

## What a stranger could not understand before this run

**Why the rail said there were two questions when the page was carrying one.**

Press the big green *Take the numbers off*. The Gate holds it, the stat band is
ringed amber and labelled **This would be removed**, and a caution pins itself to
the top of the rail: *“One question is still waiting on you.”* That is the
demo's best moment and it is working.

Now press *Take the numbers off* again — which is two clicks from the demo's own
leading button, because `demo-19` demoted the lead into the list rather than
withdrawing it. Driven against a real `next build` at 1280×900:

| | the rail | the page |
| --- | --- | --- |
| one press | `Waiting on you` · *“Take the numbers band off the page.”* | **one** amber ring |
| two presses | **“2 questions are still waiting on you”** · two `Waiting on you` cards, word for word identical, each with its own **Apply this change** | **one** amber ring |

Two cards about the same four nodes. Answering either applies the removal and
moves the revision, which kills the other where it stands — so the second press
bought the visitor a duplicate question and a guaranteed `Nothing changed` card.

**The count is what made it a stranger's problem rather than a spare card.** The
demo's whole argument is that the page and the record say the same thing. Here
the record said *two* and the page said *one*, on the first screen after the
first press, in the demo's own voice.

**Nothing in the chain was wrong**, which is why it took a count to surface it.
`availablePresets` asks each preset whether it has anything to do, and `trim.plan`
looks for a `loom.stat-grid` on the tree. A held proposal is neither applied nor
refused — it is *offered*, and it lives beside the tree rather than in it
([0021](../decisions/0021-a-held-proposal-stays-server-side-and-answers-are-by-id.md))
— so while the removal is only held the grid is still there and the preset can
still plan. The panel honoured `available` exactly as it should.

## What a stranger can understand now

The same presses, same viewport, same script, against two real builds:

|  | `main` | this branch |
| --- | --- | --- |
| press **Take the numbers off**, then look for it in the list | still there, at its table position | **gone**, while its question is open |
| the four asks that were already in the list | one of them **pushed down** by the lead dropping back in | **exactly where they were** |
| asks a second press can duplicate | 5 | **0** |
| the caution's count, against the marks on the page | **2 questions · 1 ring** | **1 question · 1 ring** |
| the plural, when two *different* asks are held | 2 questions, 2 rings | **2 questions, 2 rings** — unchanged |
| asks still offered while a question is open | 5 | **4** |
| horizontal overflow, 1280 / 390 | 1280 / 390 | **1280 / 390** |

**The first screen is byte-for-byte what it was.** `md5` of the arrival shot is
`41955176…` on both, because a visitor who has asked for nothing has no question
open and none of this renders. The sixty seconds that start the demo were not
touched.

**And the list a visitor sees after the press is the list they pressed from.**
That is the part worth a second look. `demo-19` demoted the lead into the list
*"at the position the table gives it, so the four asks already there do not move
under the visitor's cursor"* — but the table gives `trim` position four, so
dropping it back in pushed *Move the testimonial up* down one. Withdrawing it
instead leaves `[palette, backdrop, band, promote]`, which is precisely the list
that was on screen before the press. Nothing moves at all now.

## The change

### `_lib/already-asked.ts` — new, and one function

`stillToAsk(available, records, answerable)` → the asks worth offering: the ones
this tree can honour, less the ones already waiting on an answer.

**Two filters, two different questions, and neither can do the other's job.**
`availablePresets` asks the **tree** whether a preset has anything to do.
`stillToAsk` asks the **store** whether the visitor is already waiting on an
answer to that same ask. The tree cannot know the second — a held proposal has
changed nothing — and that is the whole of why two presses were offered.

It is the same rule `availablePresets` already follows, said about the other half
of the state: *never offer a press whose only outcome is nothing.*

**Keyed on the store, not on the record**, which is `set-aside.ts`'s decision
reused rather than re-argued. A record keeps the `heldProposalId` it was written
with; whether that question is still live is a fact about the store and the
revision together. `page.tsx` already computes exactly that list — `answerable` —
for the readings it resolves against the tree, and now hands the same one here.
The safe direction is asserted: a stale `presetId` cannot withdraw an ask whose
question is not there, and the ask comes back the moment its question does not.

The join runs through `ChangeRecord.presetId`, which `askedWith` stamps for
exactly this kind of use and `record.ts` describes as *"the surface's own
knowledge about its own request"* — the runtime is handed `preset.utterance` and
has no idea a button produced it. A record with no `presetId` (free text, an
undo) is a question the panel has no button for, so there is nothing to withdraw.

### `demo/page.tsx` — one set, computed once, feeding both readings

`openQuestions` is now built once and handed to `setAside` and to `stillToAsk`.
That is not tidying. The caution counts open questions and the filter withdraws
the buttons that make them; computed separately they could disagree, and the way
they would disagree is exactly the defect this unit is about.

### `demo/_components/ask-panel.tsx` — a comment corrected, and no behaviour

The panel's contract is unchanged: it renders what it is handed and disables
none of it. What changed is the docblock, which had claimed *"the preset is not
withdrawn — it drops into the list below"*. It is withdrawn now, by the page, and
a comment describing the opposite of what ships is worse than none.

**What is still not withdrawn is everything else.** The other four asks stay
live while a question is open, because a stranger who wants to watch the page
move twice should be allowed to. `set-aside.ts` argued against disabling the
panel and that argument still stands — this takes away one button whose question
is on screen forty pixels below with **Apply this change** under it, and the
caution pinned above the list is the sentence that says so.

## Decisions taken that were not specified

- **Shape (1) of the two the finding listed, as recommended, and not (2).**
  Folding a second ask onto the first is honest about what the runtime does —
  two intents, two proposals — only if the card says so, and with the press gone
  there is nothing to fold. Not filed again.
- **Silent withdrawal rather than a disabled button or an explanatory line.**
  `availablePresets` already withdraws an ask with nothing to do without a word,
  so this is the surface's established idiom rather than a new one; and the
  caution pinned directly above the list already says a question is open and
  points at it.
- **The free-text path is out of reach and said so.** Two identical sentences
  typed into the box would still hold twice, because typed asks carry no
  `presetId`. That needs the box, a model key and two deliberate presses, which
  is not the two-clicks-from-the-lead path this was filed for. Recorded in the
  closing note rather than left implied.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run rather than
off a pipe:

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 153 | 2,721 |
| `@loom/app` | 272 | 4,767 |

669 findings, 0 malformed. 107 prerendered pages, 850 text junctions, 0 run
together.

The demo lane's own suite goes from **32 files / 429 tests** to **33 files / 440
tests** — **eleven added, none weakened** — counted per file against a real run:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/already-asked.test.ts` | — | 10 |
| `_components/ask-panel.test.tsx` | 17 | 18 |

Nothing was skipped and no test was weakened. `pnpm verify` was green first time.

### The defect matrix, and the one it did not catch

Run against a commit, not a working tree — the lesson two reports ago.

| defect restored | what fails |
| --- | --- |
| `stillToAsk` never withdraws anything | 6 tests |
| it ignores whether the question can still be answered | 1 test |
| it stops preserving the table's order | 7 tests |
| the panel withdraws asks on its own rather than rendering what it is handed | 4 tests |
| the hold check is dropped from the join | **the compiler** — `TS2345`; `heldProposalId` is optional, so this is type-enforced rather than test-enforced |
| **`page.tsx` stops applying the filter at all** | **nothing — 440 passed** |

The last row is the honest one and it is filed. Unwiring the page is one edit,
the whole suite stays green, and the only complaint is `TS6133` for an unused
import — which is a stray line noticing itself, and it goes away the moment
whoever made the edit also deletes the import. It is the same shape as the
14 September finding about `actions.ts`, now with a second file in it, and the
fix for both is the same: move the arithmetic out of the file a `vitest` run
cannot cross.

## Findings

**Closed:** the 16 September entry this unit answers, naming the branch, saying
shape (1) is taken and (2) is not, and naming the one path it does not close.

**Filed one:** `Loom demo` — **`page.tsx` is the second file in this lane a test
cannot reach**, with the matrix above as evidence and a proposed shape
(`whatTheRailShows`) that would let the suite call the function the page calls
rather than a copy of it. Recommended as its own unit, before the next reading
lands in that file.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **nineteenth**
consecutive run. The cost was nil again: what decided this unit was a count
disagreeing with a ring, and no reference gallery answers that.

**Carried, not closed.** The 16 September finding on the **automatic re-ask**
is untouched by this unit and still the largest thing open on this surface —
and it is now a smaller question than it was, because the duplicate it would have
multiplied cannot be created from a button any more. The two 14 September
findings — a `configure` never saying which way it went, and `actions.ts` — are
also untouched and still open.

## Open questions

Nothing blocking.

- **The automatic re-ask** remains a design question before it is a build, and
  the design question is unchanged: what a record says about an ask nobody made.
- **`page.tsx` and `actions.ts` are untested wirings**, and that is now two files
  and six readings. Recommended as the next unit of this lane unless a maintainer
  comment outranks it.
- **“Ask about just this”** — the scope control reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.

## The visuals

All four are driven against real `next build` outputs — `main`'s for the before,
this branch's for the rest — so the only difference in a pair is the change.

| | |
| --- | --- |
| [before](2026-09-17-demo-already-asked-before.png) | `main`, two presses of one button: **“2 questions are still waiting on you”** over a page carrying one ring, and *Take the numbers off* still sitting in the list ready to make a third |
| [after](2026-09-17-demo-already-asked-after.png) | this branch, one press: the ask is gone from the list, the four that remain are where they were, and the count matches the page |
| [two questions](2026-09-17-demo-already-asked-two-questions.png) | the genuine plural — *Take the numbers off* then *Add the opening hours*: **2 questions**, **two** differently-worded marks on the page, two different cards. The plural is kept; only the copy of one question is gone |
| [phone](2026-09-17-demo-already-asked-phone.png) | 390×844 after the press. `scrollWidth` 390 against `innerWidth` 390 — no horizontal overflow |
| [arrival](2026-09-17-demo-already-asked-arrival.png) | the first screen, unchanged: `md5` identical to `main`'s |

Not the preview deployment, which this environment cannot open (`vercel.app` is
not on the sandbox's egress allowlist; the standing 19 August finding).

**To see it yourself:** open `/demo` and press **Take the numbers off** twice. On
`main` you get two identical questions and a rail that says there are two of
them over a page marked once. Here the second press is not on offer — the ask is
out of the list while its question is open, the four asks left are exactly where
they were before you pressed anything, and the caution's count and the page's
marks agree.
