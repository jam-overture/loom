# The reason it gave

**Routine:** `Loom demo` · **Branch:** `demo-26-the-reason-it-gave` ·
**23 September 2026**

**Pull request:** [#377](https://github.com/jam-overture/loom/pull/377) ·
**Deployed preview:**
https://loom-git-demo-26-the-reason-it-gave-jpizzolato36-6341s-projects.vercel.app

(Published unverified against the deployment: `*.vercel.app` is off this
sandbox's egress allowlist, the standing 19 August limit. Everything below was
driven against local `next build` outputs instead — `main`'s for the before,
this branch's for the after — with `pnpm shoot` against a `next start` of each.)

The twenty-sixth run of this lane, and the first one to find a sentence on this
surface that was not true of the thing it was about.

---

## What a stranger could not understand before this run

**Why nothing had happened — because the card told them a reason that had not
happened.**

I did what the brief asks and used the demo as a stranger would, against a real
`next build` of `main`, at 1280 × 900, 390 × 844 and at 520 wide where the whole
rail fits in one frame. The loop itself is sound and I could not fault it: the
green button is the one press the Gate holds, the stage scrolls to the band and
rings it, the card answers the two questions in the words it asked them, **Apply
this change** is the only green on screen, the applied card says *how the whole
page looks changed — not a word on it changed*, and **Put it back** is a real
change weighed like any other. That is twenty-five runs' work and it holds.

What it does not hold for is the path `moved.ts` exists for, and it is the path
a stranger with five buttons and no instruction to answer one at a time takes:
**press the green button, then press another ask before answering it.**

Here is what they got. Press *Take the numbers off* — held, waiting on you.
Press *Re-theme the whole page* — applied. The first question is now dead: the
Gate weighed it against revision 0 and the page is at revision 1, and a verdict
is not carried onto a tree it never saw. The card said so like this:

> **Nothing changed**
> *“Take the numbers band off the page.”*
> **The change no longer fits this page — something it referred to has moved or
> gone.**

**Nothing it referred to had moved or gone.** The numbers band was still on the
stage three inches to the left, exactly where it had always been, and the
visitor had just watched it stay there while the colours changed around it. The
one thing on this surface whose entire job is to be an accurate account of what
happened was, at that moment, wrong about it.

That sentence is the shared vocabulary's `no-change`
(`(portal)/_lib/vocabulary.ts`), and in the review queue it is exactly right: a
delta replayed against a tree whose anchors are gone has genuinely lost what it
referred to. The demo reaches the same state by a different road and inherited
the wrong cause with the right state name.

And the **true** sentence was on the card the whole time. `movedOn` wrote it,
placed it and tested it:

> *You changed the page after asking for this. Loom weighed it against the page
> as it was then, and won’t apply a decision to a page it hasn’t seen.*

It was four blocks further down, at `text-xs`, under a `text-sm` sentence
contradicting it. `moved.ts`'s own module comment says this is *“one sentence,
whichever way a visitor reaches it.”* The card was printing two, and a stranger
read the false one first because it was larger and higher.

[Before and after, the whole rail in one frame.](2026-09-23-demo-the-reason-it-gave-before.png)
· [after](2026-09-23-demo-the-reason-it-gave-after.png)

## What a stranger can understand now

**The most interesting property this surface has, at the moment it bites.**

A verdict in Loom belongs to *one version of the page*. That is not a footnote —
it is the same guarantee `0028` protects for undo, and it is the reason the
record is worth anything: a decision that could be replayed onto a page nobody
weighed it against would be a decision about nothing. The demo can now say it,
in the loud position, in words a stranger reads in one pass:

> **Nothing changed**
> *“Take the numbers band off the page.”*
> **You changed the page after asking for this. Loom weighed it against the page
> as it was then, and won’t apply a decision to a page it hasn’t seen.**

[The two cards in the two-pane layout.](2026-09-23-demo-the-reason-it-gave-wide.png)
· [the same on a phone](2026-09-23-demo-the-reason-it-gave-phone.png)

## The change

Three files, and the unit is one claim: **the card's account of itself is read
off what happened.**

### `_lib/report.ts` — a second override, and it is a different kind of wrong

`DEMO_MEANINGS` has had one entry since it was written. `applied` is a *true*
sentence pointing at the wrong place — it sends a reader to `/portal/history`,
which a demo visitor cannot open — and the file argues at length that the two
surfaces must agree on what a state is **called** and cannot agree on where to
go next.

`no-change` is the second, and it is worse in kind: it does not point somewhere
this surface lacks, it **names a cause this surface cannot have**. So the
override says only what the demo can always vouch for:

> *Loom did not write this one, so nothing on the page changed because of it.*

No cause, deliberately. `did-not-apply` is every write failure the demo can
record and their causes are not one thing; a second sentence guessing at one
would be the first defect again with different words. The cause is `moved.ts`'s
to give when the demo knows it.

### `record-card.tsx` — the true sentence takes the loud slot

The card's header carries exactly one `text-sm` line under the quote: the state
in a sentence. When there is a moved note, it is that note. Everything else
about the card is unchanged.

### `page-moved-on.tsx` — sheds its copy, and stops outlining nothing

It kept the half that was only ever its own: **the way out**, a fresh ask posted
against the revision the page is actually at. With the sentence gone, an ask that
named no preset — free text, or an undo with its own control on the card above —
had nothing left inside a block still drawn with a grey left rule. A marked,
empty outline is a promise of a control that is not coming, so it renders
nothing instead.

### What was not removed

Nothing. The two revisions behind the sentence (`revision 0, and the page is at
1`) are one click down where they were, with the whole weighing, the rule, the
stake factors and the runtime's own account. The maintainer's direction holds in
both halves: the plain language got *more* accurate, and the technical record is
exactly as complete as it was.

## Decisions taken that were not specified

- **The override says no cause at all**, rather than a second demo-shaped cause
  for the late path (a second tab, where `record.ts` clears custody and there is
  no note to read). A sentence that guessed would repeat this run's defect.
- **The sentence moved up rather than the false one moving down.** Folding the
  shared sentence under a disclosure would have kept a false claim in the record,
  and *nothing is ever removed* is not a reason to keep something untrue — it is
  a rule about the account being complete, not about it being wrong.
- **The badge is untouched.** "Nothing changed" is the shared table's label and
  it is accurate here; `report.test.ts` still asserts every label, tone and
  technical name matches the portal's exactly. What forked is one sentence.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.
  `(portal)/_lib/vocabulary.ts` was **read and not touched** — the wrong sentence
  is correct in the portal and stays there.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off a
pipe (`VERIFY_EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 159 | 2,999 |
| `@loom/app` | 300 | 5,398 |

The demo lane's own suite goes from **550** to **556** — **six added, none
weakened, none skipped, none rewritten.** Two existing tests
(`says why, in the sentence rather than in a code` and `still says what happened
when there is no suggestion to repeat`) assert the sentence is on the card and
pass unchanged, which is the point: presence was never the defect.

### The defect matrix

Each defect restored in turn against the commit, both files run, the tree
returned between rows. Baseline **76 passed** across the two.

| defect restored | caught |
| --- | --- |
| the header goes back to the shared sentence | **4 tests** |
| the block prints the sentence again, so the card says it twice | **1 test** |
| the `no-change` override is dropped | **2 tests** |
| the empty-block guard is dropped | **2 tests** |

Four rows, four caught. The first is worth reading: it fails *`says why, in the
sentence rather than in a code`*, a test written a week ago that passed against
the defect this run found — because it asked whether the sentence was on the
card, and it was. The new one asks **which line the card's account is read
from**, and that is the assertion the old one could not make.

**The one thing this suite still cannot do**, and it is honest rather than
hedged: it asserts the element tree. It cannot tell you that the header line is
larger than the block below it, which is *why* a stranger read the wrong one
first. What it can and does hold is that there is one sentence and that it is in
the header.

## Findings

**Filed two.**

- `Loom demo` — **the late path still gets the generic sentence**, because
  custody is cleared before the surface can compute the two revisions. The
  shape that would close it, and why it is small.
- `Loom portal` — **a shared vocabulary of five states, two of which the demo
  now overrides**, with the distinction that matters: `applied` is a signpost in
  the wrong place, `no-change` is a cause. Not a request to change either
  sentence — both are right in the portal.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-fifth**
consecutive run. The cost this run was nil and the reason is worth naming: this
unit moved no pixel and added no visual idea. What decided it was reading a
sentence beside the thing it described, which is a method no reference gallery
supplies.

## Open questions

Nothing blocking.

- **The demo's loop I still could not fault**, two runs running, and that is a
  report rather than a boast. This run found its defect by pressing two buttons
  in the order the lane's own findings predict a stranger presses them, and then
  reading the card against the page — not by looking for something clunky. If
  the maintainer's *clunky and not very good* still holds against what is
  deployed today, **the specific screen would be worth more to this lane than
  any diagnosis I can produce from inside it.**
- **The automatic re-ask** (16 September) is still the largest thing open on
  this surface and still recommends being designed before it is built. This run
  touched the card it is about and deliberately did not start it.

**To see it yourself:** open the preview's `/demo`, press **Take the numbers
off**, then press **Re-theme the whole page** without answering it. The second
card down is the one this run is about.
