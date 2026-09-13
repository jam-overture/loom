# 2026-09-10 — "The part in the sentence has a name"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`) — a **tenth unit** on the
branch that already carries #219, #227, #234 and #240, rather than a sixth open
pull request from this lane. That is the maintainer's 28 August instruction,
sixth run running.

Visuals — real screens from a production build of this commit, in a signed-in
browser:

| | |
| --- | --- |
| [The page](2026-09-10-portal-the-part-has-a-name-page.png) | 1280px |
| [What's been asked](2026-09-10-portal-the-part-has-a-name-asked.png) | 1280px |
| [What's changed](2026-09-10-portal-the-part-has-a-name-changed.png) | 1280px |
| [The front door](2026-09-10-portal-the-part-has-a-name-front-door.png) | 1280px |
| [a phone](2026-09-10-portal-the-part-has-a-name-phone.png) | 390px |

### How honest these are, stated plainly, and this run is the weakest in a month

**No change could be made during this run, so the screens are empty and none of
them shows the sentence this unit rewrites.** `LOOM_ANTHROPIC_API_KEY` is present
and the interpreter is live, but a request typed into the real prompt box **never
returns**: the server action hangs and the ask never reaches the journal, which is
why *What's been asked* reads "Nothing has been asked for yet." That is the
2026-09-04 finding — *a Node server in this sandbox cannot reach the model, and
the failure is a hang* — recurring with `NODE_USE_ENV_PROXY=1` set, which was the
fix that finding named. Four runs of the harness went into establishing that,
and two of them were lost to traps of my own (below) rather than to the model.

So the pictures show the portal as it stands, correctly, and they show it with
nothing in it. **The sentences themselves are in this report and in the pull
request as text, and they are asserted whole by 36 tests** — `readingOf` with
`toBe`, never `toContain` on a half. That is a worse deliverable than a screenshot
of the real thing and I would rather say so than dress it up: this lane has
counted twenty-seven defects found by looking at a screen, and today I could not
look at the one I changed.

**Two of the four attempts were lost to traps this lane has already filed**, which
is its own finding:

1. **`form button[type="submit"]` first-in-DOM is the topbar's *sign out*.** Trap
   number two, reached by a third road — I had avoided it on the sign-in form and
   walked into it on the prompt box. The run signed itself out, then photographed
   an empty Activity believing the ask had failed. The button is `Ask Loom` and
   should be clicked by its name.
2. **A script that throws before its cleanup leaves the server holding the port**,
   so the *next* run's readiness probe succeeds against the **old** server — with
   the old reviewer key — and the sign-in fails in a way that reads exactly like a
   wrong password. This is the other half of trap four and is filed today.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #245 carries the
deployment bot and five of my own comments; #227, #234 and #240 carry the same
shape. So the plan decides, and the plan's redirection is the highest-priority
thread: *plain language is the default, the technical record is one click away,
nothing is ever removed.*

The work was named by this lane's own last comment, which said what it would
look at next and did not take:

> **The reader-facing sentences are still full of node ids** — *"Deleted
> `n_seed3` and everything inside it."* is the plain half of every revision row,
> and it is the same class of problem the page name closed one level up. A node
> has no name either, and unlike a page it does not carry a heading to derive one
> from.

That reservation was half right, and finding out which half is this unit.

## The defect

`page-name.ts` (6 September) rewrote the portal's **headings**: `/portal/pages/
[treeId]` said `t_seed1` and now says what the page calls itself. The 9 September
unit carried the same name into the **lead sentence** under those headings.

Neither reached the sentences *inside* the screens — which are the ones a reader
came for. On `/portal/history`, the two lines that are the whole point of the
screen read:

> **Deleted `n_seed9` and everything inside it.**
> *If you undo this, Loom puts back:* **`n_seed9`, a loom.card, with the 3 things
> that were inside it, back inside `n_seed2`.**

**Five identifiers in two sentences**, in the one place the portal claims to say
what happened to your page in a person's words. A reader who has never opened the
tree cannot tell from either line whether what went missing was the page's
headline or a spacer.

## Where a name comes from, given a part has none

A node carries no name, exactly as a tree carries none, and adding one is a
schema change — **still architectural, still not taken.** So the name is derived
from what is already there, which is the move 0041 made for authorship and
`page-name.ts` made for a page. `_lib/part-name.ts`:

| From | Gives |
| --- | --- |
| **What it is** — the type's own local name, namespace dropped | `loom.card` → *the card* |
| **What it says** — its own text, where it has any | *the heading “Autumn arrivals”* |
| a slot | *the body space* — the one node kind that already has a name |
| text | *the words “Free returns”* — it **is** its words |

**The noun is read, not translated.** `nounOf` takes the last dot-separated
segment and turns hyphens into spaces, so a host's `acme.buy-button` is *the buy
button* without anybody adding a row to a table. This is deliberately not a
lookup: `page-name.ts` had to hard-code `TITLE_TYPES = ["loom.heading"]` and filed
a finding saying every host deriving a page name writes that array again. A
portal that could only speak plainly about its own four primitives would be
speaking plainly by coincidence.

### The half that was worth doing this here rather than anywhere else

**A deleted part's name survives only in the inverse.**

Once a removal is applied the node is gone from the tree, and the forward delta
records the id it deleted and nothing else (0016). Its type, its words, what was
inside it — recoverable only by replaying the log backwards, which is exactly
what `/portal/history` already does for every row to say what undoing would put
back. So the row reads its own inverse for the name as well as the restoration:

```
firstNamed(standing, namesInOperations(reversal.inverse))
```

Merged in that order on purpose. **A part that still exists is named as it is
today**, so a reader comparing a row against the page in front of them sees the
same words; **a part that does not is named as the inverse remembers it**,
because that is the only account of it left.

### What it never does, and why nothing reads worse

**The id never leaves.** `PartName` is the component that makes that structural
rather than remembered — the words, then the id in monospace — and it is the
same pairing `PageName` makes one level up, for the reason 22 August settled:
identity is not technical detail and does not go behind a disclosure.

And where no name could be found, **the subject is the bare id, exactly as it
always was** — not a phrase standing in for it. *"this part `n_seed3`"* spends a
reader's attention on a word that adds nothing and hands them the identifier
anyway. That is why this change cannot read worse on any screen: a sentence that
cannot name its subject is the sentence the portal has always shown.

## What moved behind a disclosure, and what did not

The plain sentences carried the exact type as an apposition — `, a loom.card,` —
because that was the only place on the row it appeared. Saying *the card* instead
reads better and says less, so `loom.card` **moved down rather than off**:

| Screen | Was | Is |
| --- | --- | --- |
| `/portal/history` row | the type in the plain sentence; the inverse summarised to `insert` in the record | the type in the record, and **the inverse operations spelled out in full** — new |
| `/portal` unattended card | the type in the plain sentence; the record held the Gate's reasoning and never the delta | the type in the record, and **the delta's operations** — new |

Both disclosures gained something they did not have. Nothing left a screen.

## The union that found three components

`PlainLine["subject"]` was `string`. It is `string | PartName` now, and that is
doing work beyond politeness.

A named part is *words and an id*, and setting the whole of it in monospace would
undo the naming — a reader skims monospace as machinery and skips it, which is
the whole reason an identifier is in it. **Three components were still spreading
a `PlainLine` by hand**, a fortnight after `PlainSentence` was written on
29 August to stop exactly that, each with its own `<span className="font-mono">`
around the subject:

- `portal/history/_components/revision-row.tsx`
- `portal/history/_components/reversal-note.tsx`
- `_components/proposal-effect.tsx`

Every one would have set the words in monospace along with the id. **Widening the
type broke all three at compile time**, and they go through `PlainSentence` now.

It caught a fourth thing that was not a rendering at all. `unattended.ts` read
`operations.map(plainOperation)` — and `map` hands its callback the **index**,
which now lands where a map of names belongs. A type error today; a silent one had
the parameter been anything looser.

## The defect a test found that no reading would have

`textOf` **concatenates**. That is right for what it is for — the exact
characters under a node, with nothing invented between them — and wrong for a
name. A card holding a heading *"Every change is a delta"* and a paragraph
*"Nothing here was written by hand"* has no whitespace between the two runs in the
tree, because the gap between them is a box in the layout rather than a character
in the content. So the first version of this module named the seeded card

> the card “Every change is a deltaNothing here was…”

which reads as a typo. `saidBy` joins runs with a space instead. Nothing else in
the portal had ever asked a **container** what it says: the page name reads a
heading, which is a single run and never shows this.

## The guard

`every-screen.test.ts` gains: **no component in the lane renders a `PlainLine` by
hand.** Three did; a type broke those three; this is for the fourth, written by
hand, that happens to get it right on the day it is written.

The check is on the *shape* — the sentence's opening followed by its subject in a
span of the component's own making — rather than on the field name, because
`before` and `after` are not `PlainLine`'s alone: `ValueChange` on `/portal/pages`
uses the same two words for the value a change wrote over and the one it wrote,
and a field-name rule flagged it wrongly on the first run.

**And the detector is proved before it is trusted.** Two tests run the pattern
against a line written the old way and against the `ValueChange` markup it must
not match. A guard that has quietly stopped matching passes for ever and reports
nothing, which is worse than one that fails — this lane disarmed a demo guard
exactly that way on 8 September by renaming the thing it looked for.

`ScopedLead` is the one exception, named in the test with its reason: its subject
is a *page* rather than a part of one, and it already renders both halves through
`PageName`, which carries the same rule one level up.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — build, typecheck, both suites,
and `next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 181 | 2952 |

**36 net new tests in 2 new files**, plus additions to three existing ones:

- **`_lib/part-name.test.ts` — 22, new file.** `nounOf` over a Loom type, a
  hyphenated host type, a deeper namespace and an unnamespaced one; `saidBy`
  including the run-together defect asserted both ways (`toBe` the joined string
  **and** `not.toContain("arrivalsFree")`); every node kind named; the merge
  order; and the rule the module is written under, asserted rather than assumed —
  **no name ever contains the id it is paired with.**
- **`_components/part-name.test.tsx` — 6, new file.** Including that the rendered
  pair reads exactly `partReading`, and that **only the id is monospace** — the
  assertion is the whole list of `.font-mono` contents, not a substring, so a
  span added around the words fails it.
- **`plain-sentence.test.tsx` — +3.** The named-subject branch, read whole.
- **`delta-summary.test.ts` — +2 net.** Including a removal named from the map
  **and** the same removal with the id absent from it, asserting the sentence
  falls back to exactly what it always said.
- **`every-screen.test.ts` — +3.** The guard and its two self-checks.

## The sentences, before and after

Since no screenshot could carry them this run, they are here in full. Each is
`readingOf(line)` — the joined sentence, which is what the tests assert.

| | |
| --- | --- |
| **was** | `Deleted n_seed9 and everything inside it.` |
| **is** | `Deleted the card “Autumn arrivals” n_seed9 and everything inside it.` |
| **was** | `Added n_new, a loom.heading, inside n_root.` |
| **is** | `Added the heading “Autumn arrivals” n_new inside n_root.` |
| **was** | `Added n_t, the words, inside n_head.` |
| **is** | `Added the words “Welcome” n_t inside n_head.` |
| **was** | `Puts n_card, a loom.card with the 2 things that were inside it, back inside n_page.` |
| **is** | `Puts the card “Hi” n_card, with the 2 things that were inside it, back inside n_page.` |
| **was** | `Puts n_t, the words, back inside n_page.` |
| **is** | `Puts the words “Welcome” n_t, back inside n_page.` |
| **was, and still is** | `Deleted n_gone and everything inside it.` — no name could be found, so the sentence is untouched |

In the rendering, only the id half of each name is monospace. That is asserted as
**the whole list** of `.font-mono` contents rather than by substring, so a span
added around the words fails the test.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to `/portal/history` and to the front door's unattended half. From a
revision row, unaided:

> *Loom deleted the card that said “Autumn arrivals” from my page, and everything
> that was inside it. If I undo that, it puts the card back where it was along
> with the three things that were in it. Nothing later depends on it, so undoing
> is safe.*

Where it correctly stops: `n_seed9`, `loom.card`, `revision 4` — names, and all
of them still on screen.

The sentence a reader met before this unit was *"Deleted `n_seed9` and everything
inside it."*, which answers none of that.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What the thing you deleted was.**

This is the sharpest version of the value answer this lane has been able to give.
A Loom tree does not live in the repository, so no diff has ever seen it — and
once a removal is applied the node is gone from the tree as well. **The only
surviving account of what it was is the inverse of the change that removed it**,
which exists nowhere but in Loom's log, and which the portal was already
computing and reading for a different purpose.

`git log` can tell you a file changed. It cannot tell you that at 14:32 the AI
deleted the card that said *“Autumn arrivals”*, that putting it back would restore
the three things that were inside it, and that nothing since depends on it.
Neither can a build log, a deploy, or the page as it stands.

## What I did not do

- **`src/` is untouched.** `nodeLabel` is the framework's word for a node
  (`loom.card`, the slot's name, `text`) and it is right for what it is for; the
  portal's noun is a portal reading of the same value, and asking the framework
  for it would be asking it to decide how a person talks.
- **No decision record.** How a portal sentence names a part is a portal
  decision. Nothing here touches the tree schema, the delta model, or an Accepted
  record — and **giving a node a name field would**, which is why the name is
  derived and the record is unwritten.
- **The parent id in `after` is still an id.** *"…inside `n_seed2`"*. A
  `PlainLine` holds one subject, so naming the parent means a second name in the
  line and a different shape. There is also an argument it should stay: **the
  sentence names what changed; where it sits is an address.** I am not sure
  enough of that to build on it, so it is in `FINDINGS.md` as a question rather
  than a defect.
- **`/portal/activity` is not named.** It reads proposals rather than revisions,
  has no inverse to read, and would need its own head read per row. One diff
  answering two questions is what makes a diff unreviewable. Filed.
- **A screenshot script is not committed.** I wrote one from the five traps this
  lane has filed and then **took it back out of the repository**:
  [#250](https://github.com/jam-overture/loom/pull/250) is the framework lane
  building `tools/specimen/`, which is the repository's harness and the right
  home. Committing a second one — and a Playwright dependency in a shared
  `package.json` — would be this lane taking a file it has said four times is not
  obviously its own. Today's pictures were taken with it from the scratchpad
  instead, and **the repository's lockfile is untouched.**
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #245, then close #219, #227, #234 and #240.** Unchanged ask and now
   ten units deep. Nothing in this lane has merged since 25 August.
2. **Merge #250**, so no lane writes the screenshot script a sixth time. Today is
   the strongest case yet: two of four attempts were lost to traps already filed,
   and the pictures are still empty.
3. **The model being unreachable from `next start` in this sandbox is now the
   thing that most limits what this lane can show you.** It is the framework
   lane's finding and `NODE_USE_ENV_PROXY=1` did not fix it here. Every run since
   26 August has been able to photograph a real change; this one could not, and
   the screens a reader meets first are exactly the ones that need a populated
   store to be worth looking at. Worth a look before the next portal run.
4. **Nothing else blocking.**
