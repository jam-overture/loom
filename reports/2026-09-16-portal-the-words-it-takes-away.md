# 2026-09-16 — "The words it takes away"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-28-the-words-it-takes-away` (→ `main`), cut from `main` at
`d5b1eb2`. Not stacked on anything; there were **no open pull requests at all**
in the repository when this run started, so there were no maintainer comments to
address and nothing of this lane's to push onto.

Visuals — a production build of this commit, in a signed-in browser at
`/portal/pages/t_seed1`, with three held proposals on the hold store's own
carrier:

| | |
| --- | --- |
| [The review queue, with three changes waiting](2026-09-16-portal-the-words-it-takes-away-wide.png) | 1280px — **the change**, all three readings on one screen |
| [The caveat card, every disclosure open](2026-09-16-portal-the-words-it-takes-away-card.png) | the new sentence, and the record under it |
| [The same screen, every disclosure open](2026-09-16-portal-the-words-it-takes-away-open.png) | 1280px — nothing was removed to make the first one readable |
| [a phone](2026-09-16-portal-the-words-it-takes-away-phone.png) | 390px |

**How the populated pictures were taken, stated plainly.** No proposal in them
was made by a model. The server was started with a preload that builds a
`memoryHoldStore()`, `hold`s three `HeldProposal`s into it and assigns it to
`globalThis[Symbol.for("loom.portal.holds")]` before the application's own
module memoises one — the recipe this lane filed on 15 September, which
predicted it would generalise. **No markup was staged and no component was
rendered out of context**: the shipped page code ran its real read, its real
reading against the served tree, the real Next render, shell and stylesheet. The
one fiction beyond *who proposed these* is named in **What is fictional in
picture three** below, because it matters.

---

## What was asked

Nothing in the findings queue outranked the plan and no maintainer comment
existed to address, so this came off the queue: two open findings owned by this
lane, both about the same function, one filed by `Loom demo` on 1 September and
one by `Loom daily build` on 10 September when the framework landed the thing
that answers them.

The 15 September report recommended `/portal/trees` next. **That recommendation
was stale when it was written**: `/portal/trees` → `/portal/pages` had already
landed, and the redirect and the rail label are both on `main` — the rename
`/portal/audit` → `/portal/checkup` describes itself as *"the third rename to
take this shape, after `/portal/trees` → `/portal/pages`"*. Every route in this
portal is now named after what a person wants. So the queue took its place.

## What shipped

**The review queue's account of a change reads the words a part holds in its
settings, and says so when nobody has told it which those are.**

| | |
| --- | --- |
| `_lib/proposal-effect.ts` | `textIn` → `wordsIn`, on the runtime's `copyIn`; `textTotal` and `unreadable` on `OperationEffect` |
| `_lib/effect-view.ts` | the preview cut said out loud, and `unreadableSentence` |
| `_components/proposal-effect.tsx` | the caveat on the surface, the types that said nothing one click down |
| `_lib/primitives/*.ts` | `copy: []` on all four, which is true of all four |
| `_lib/registry.test.ts` | a fifth primitive registered without a declaration now fails |
| `portal/pages/[treeId]/page.tsx` | the registry threaded into the reading |

### The defect, which was a truth problem and not a wording one

The one sentence on this card that had never been rewritten was the one that was
wrong. `its words` walked text children and kept only those, and
[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
keeps a fixed field as a setting — so a `loom.stat` holds its figure, its label
and its caption as props and **has no text children at all**. A proposal to
delete a band of headline figures was described to a reviewer as taking away
three pieces and nothing to read.

`copyIn` has three answers where a text walk had two, and the third is the one
that did not exist before: a part whose author has never said which of its
settings a reader reads. It is neither words nor the absence of words, and the
old reading rounded it to the second. Rounding *I cannot tell you* down to
*there are none* is wrong in exactly the direction nobody checks.

So three sentences come out of it:

| | |
| --- | --- |
| the words | now including the ones held in settings their author declared |
| **and 1 word more** | the preview cut said rather than made silently — three of nine printed as all of them is an account with six words missing and no way to tell |
| **Loom can't list the words in 3 parts of this: nobody has said which of their settings a reader reads.** | the third answer, said instead of swallowed |

All three are in the first screenshot, one per card.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**What pressing *apply* would take off the page, in the words that are printed
on it — and, when it cannot tell them, that it cannot.**

The first half was already this screen's claim and it was partly false. The
second half is the part worth defending as an answer to the question this brief
asks every run:

- **The repo does not hold the page.** A Loom page is authored by accepted
  proposals into a store; there is no file whose diff is the change being
  weighed here.
- **The log does not hold it either**, because a held proposal is precisely the
  change that has not been logged.
- **The store holds the page as it is now**, and says nothing about a change
  that has not happened.
- **Nothing outside the component can tell a word from a flag.** `loom.stat`'s
  `value` and `loom.hero`'s `align` are both strings in the same shape of JSON.
  A reviewer is the last person who should have that ambiguity resolved for them
  by a guess, and this is the only screen in the ecosystem that has to make the
  choice at all.

## The high-schooler test

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

Applied to the three cards in the first screenshot, which are the three readings.

- **"Deletes the card “Every change is a delta” n_seed9, and the 4 pieces inside
  it. / The words it takes away: “Every change is a delta” · “Nothing here was
  written as markup. A proposal produced it.”"** Passes. What goes, and what is
  written on it.
- **"Adds the card “Opening hours” n_shot5 at the end of the page. It brings 8
  more pieces with it. / The words it adds: “Opening hours” · “Monday to Friday,
  8am until 6pm.” · “Saturday, 9am until 1pm.” and 1 word more"** Passes, and
  the last clause is the one a high schooler would otherwise have had no way to
  know about.
- **"Loom can't list the words in 3 parts of this: nobody has said which of
  their settings a reader reads."** This is the one I rewrote three times.
  *"3 of the parts in this haven't said…"* made a part sound like a person
  refusing to answer. *"…so this may take away words Loom cannot show you"* was
  accurate and alarming — it is a missing label on a component, not a risk to
  the page. What it says now is what Loom can and cannot do, and the only action
  it implies is the right one: go and look at the page. Passes, and a reader who
  wants to know *which* parts clicks once.

The thing a high schooler still cannot do from this card is tell whether those
three parts hold any words at all. That is not a wording problem and the screen
does not claim to answer it — nothing in Loom can, until a primitive's author
says.

## What I renamed, and what moved behind a disclosure

Nothing was deleted.

| The runtime's word | What the screen says |
| --- | --- |
| a subtree with no text children, reported as no words | *Loom can’t list the words in 3 parts of this* |
| `props` | **settings** — which is the word this file already used for the same thing in *"Takes away the width of the heading"* |
| `unread` / `copy` / `copyFor` | nothing on the surface; the sentence is about what Loom was told |
| a silently truncated list of three | *and 1 word more* |
| — | `no copy declared: acme.stat ×3 — value, label, caption, tone`, in the disclosure |

**The one decision that looks like it breaks this lane's rule and does not.**
The caveat is on the surface, not one click down. The rule is that the
*technical record* goes one click down, and a caveat is not the record: a
reviewer who reads *"Deletes the stat grid, and the 3 pieces inside it"* as a
complete account has been misled by the plain half, and the plain half is the
one half that is never allowed to mislead. The names of the types that said
nothing are the record, and those are one click down — addressed to whoever
maintains the primitives rather than to whoever is pressing the button.

## Two rules this took from what the lane already settled

- **One sentence for both directions**, which is the opposite of the choice
  `wordsSentence` makes for words that *are* known — and deliberately so. The
  direction of known words is the news (*adds* and *takes away* are opposite);
  the direction of an absence is not, because both prompt the same single
  action.
- **`copy` is the deployment's answer, not the portal's.** The registry is a
  third argument to `describeProposalEffect` rather than a module import, for
  the same reason the tree and the delta are arguments: a portal that reached
  for its own registry would be answering for every deployment out of the four
  primitives it happens to register (0018). Anything with a `copyFor` satisfies
  it, which is what lets a test state its declarations in two lines.

## What is fictional in picture three

The caveat fires on a part whose author has not declared its copy. **Every
primitive this portal registers has declared** — that is the other half of this
diff — so to photograph the sentence the fixture's proposal *adds* a piece of a
type this deployment does not register.

That reaches `copyFor` by exactly the path an undeclared registered primitive
reaches it by: the sentence is about the declaration, not about the
registration, and the reading is identical. It is said here rather than left for
somebody to notice because the sentence's real subject is the starter library,
where all ninety-six primitives are undeclared — filed as a finding, and
measured rather than estimated.

## The cross-lane diff, and why

Two files under `(demo)` are in this diff, and `docs/routines.md` asks for a
line saying which and why.

`(demo)` consumes `(portal)/_components/proposal-effect` and
`(portal)/_lib/proposal-effect` deliberately and says so in its own comments —
the demo's record card *is* this component. Changing the shared function's
signature therefore forced:

- **`(demo)/demo/page.tsx`** — one argument, `demoRegistry`, which was already
  in hand three lines away.
- **`(demo)/demo/_components/record-card.test.tsx`** — two fields on a fixture,
  and a comment that had become false. It said the empty `text` was *"the
  fixture being accurate"* because the portal's reading walked text nodes; that
  reason no longer exists, and the accurate value of the new field is three
  unread `loom.stat`s. Leaving a fixture in another lane's test asserting
  something untrue would have been worse than the edit.

Nothing else outside `(portal)` was touched, and **nothing in `src/`**.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green**, exit 0 |
| Framework suite | **153 files, 2,697 tests, all passed** |
| Application suite | **263 files, 4,671 tests, all passed** |
| Findings | 657 findings, 0 malformed |
| Prerender check | 106 pages, 834 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on both wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

19 tests are new — 7 on the reading, 8 on the sentences, 2 on the rendered card,
2 on the registry. What each group would catch:

- **The reading** — words held in settings are found; the total is counted
  before the preview cut, asserted on a fixture where the two differ (6 against
  3); a part nobody declared is reported as unreadable rather than as no words,
  which is the defect stated as the test that would have caught it; the parts
  are grouped by type and counted; `copy: []` is believed and does **not** raise
  the caveat, which is what stops every arrangement in a library raising it; an
  arriving part's words are read out of the proposal because there is no node on
  the page yet; a move reports nothing either way.
- **The sentences** — the cut is said with the right plural; nothing extra is
  said when the preview is all of them; the caveat agrees with itself about one
  part (*its* settings, not *their*); it reads identically for an insert and a
  remove, asserted as an equality rather than twice; it is absent on the
  ordinary step; the record names each type once with its count and settings.
- **The plain-language rule** — the caveat contains no word from
  `RUNTIME_WORDS`, checked for both the singular and plural wordings, because it
  is a sentence a reviewer reads unasked.
- **The rendered card** — the caveat is on the surface (measured with every
  `<details>` removed) and `loom.stat` is **not**; the type names are inside a
  disclosure (measured with only them); neither appears on an ordinary step.
- **The registry** — every primitive the portal registers has declared,
  enumerated from the registry rather than from a list so a fifth fails here;
  and a guard on that guard, because a `copyFor` that answered `[]` for a type
  it had never heard of would let the rule pass over nothing.

## Findings

**Closed two**, both about `textIn` by name:

1. `Loom demo`, 1 September — *`OperationEffect.text` finds no words on a
   primitive that carries its content in props*.
2. `Loom daily build`, 10 September — *`textIn` has something to ask now, and
   the queue is still reading text children*. Its prediction held exactly: what
   this gains immediately is **knowing that the list exists**.

**Filed three:**

1. **Ninety-six primitives are registered and none has declared.** Owned by
   `Loom primitives`, measured against `dist/`. `loom.code` is the near miss and
   is named so nobody greps for `copy:` and stops — its match is `text: { copy:
   "Copy" }`, a button's string. The cost is concrete and on a surface a
   stranger sees first: the demo's *Take the numbers off* now carries the caveat
   where it used to carry a silence, verified by a real `copyIn` against
   `demoRegistry` rather than predicted.
2. **The review queue has been photographed populated** — the first of the three
   screens the 13 September standing finding named. The recipe, including the
   two things `pnpm shoot` still cannot do (seed the hold carrier, sign in) and
   the trap in signing in: wait on leaving `/portal/sign-in`, never on the
   network and never on `document.cookie`.
3. **`docs/routines.md` gives the opposite instruction about a commit author
   twice.** *"Author every commit as jonathanbravecredit"* in one section, *"Do
   not set a commit author"* in another. Owned by `Loom daily build`, which owns
   the file. This run followed the later, dated section — set nothing — which is
   what every run with a preview has done.

## What I did not do

- **No declarations on the starter library.** `src/primitives/` is
  `Loom primitives`' lane, and the portal cannot answer for a component it did
  not write (0018). Filed, with the ask spelled out per primitive.
- **No guess at which settings are words.** `Loom demo` offered its own
  heuristic — exclude a closed choice, exclude an address, one string per part —
  and said itself it was tuned for a stranger rather than a reviewer. For
  somebody deciding whether to delete a band it is the wrong trade: the
  framework's own note is that *a missing word is a gap; a wrong one is a lie*.
- **No change to the reconfigure reading.** A reconfigure that writes over a
  word *is* a change of words, and `changes` is already the sharper account of
  it — it shows the old value beside the new one, which a list of words cannot.
- **Nothing in `src/`**, and no screen outside `(portal)` other than the forced
  two files above.

## The run itself

- **The screenshot recipe worked** and gained two steps, both filed rather than
  left in a scratch directory. `.shot/` was removed before the commit; it is not
  part of the portal.
- **`pkill -f "next start"` killed this run's own shell**, exactly as this lane's
  10 September finding says it does. The port survived because the process was
  killed by pid instead. The finding stands and needs no new entry.
- **The unit was committed before the screenshots were taken**, which is the
  procedure `Loom daily build` filed this morning after a `git checkout` cost it
  a factor and a rung.
- **Nothing is scheduled and no pull request is subscribed to.**
  `docs/routines.md` and the brief both forbid a follow-up by name.

## Recommendations

1. **`copy` on the starter library, in `Loom primitives`.** It is the only thing
   between the caveat and the words themselves, it is a line per primitive, and
   it is currently visible on the demo's payoff. Start with the ones that carry
   content: `loom.stat`, `loom.quote`, `loom.faq`, `loom.credential`.
2. **The ingestion endpoint and the rollup runner in `Loom daily build`**, which
   the 15 September report already recommended and which is still the whole
   distance between `/portal/readers` and the reason `docs/signals.md` says a
   developer opens the portal daily.
3. **In this lane: the front door's own queue.** `/portal` shows the same held
   proposals through `answerOutcomes` and does not show what they would do to
   the page. Now that the reading tells the truth about words, the argument for
   putting it on the one screen a reviewer opens first is stronger than it was.
