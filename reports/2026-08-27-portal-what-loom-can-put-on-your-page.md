# 2026-08-27 — "What Loom can put on your page"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-14-what-loom-can-put-on-your-page` (→ `main`).

Visuals, all from a clean local production build of this commit, in a signed-in
browser:

| | |
| --- | --- |
| [the page as it arrives](2026-08-27-portal-what-loom-can-put-on-your-page.png) | 1280px |
| [every disclosure opened, which is the same page with nothing hidden](2026-08-27-portal-what-loom-can-put-on-your-page-open.png) | 1280px |
| [a phone](2026-08-27-portal-what-loom-can-put-on-your-page-phone.png) | 390px |
| [the empty state, which is what a project that has registered nothing sees](2026-08-27-portal-what-loom-can-put-on-your-page-empty.png) | 1280px |

**How honest these are, stated plainly.** The first three are the real screen
reading the real registry — nothing is scripted, because this page has no data
source other than what the deployment registered, and the deployment registered
it in this commit. The fourth needed a catalogue with nothing in it, which the
portal's registry cannot produce, so it was taken against a one-expression
uncommitted patch (`catalogueOf(portalRegistry).slice(0, 0)`), reverted before
committing and re-verified absent. Everything else in that picture — the notice,
the wording, the action, the layout — is the committed code.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #169 is open and
its only two comments are Vercel's deployment table and this lane's own report
comment. So the plan decided this run rather than a review.

Two things came ahead of it and both are done:

### `main` was red, for all four lanes

`pnpm verify` fails on `origin/main` at `3a57feb`:

```
app/(marketing)/_lib/facts.test.ts
  Expected: "95"   ← decisions/ on disk
  Received: "94"   ← FACTS.decisions
```

[0095](../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md)
landed in #165 without the marketing lane's fact count moving with it. That test
is doing exactly its job — the number on the front page is a fact about the
repository rather than something someone typed — and the consequence is that the
merge gate every lane has to pass was red on the branch every lane is told to cut
from. It is one line, `"94"` → `"95"`, in
`app/(marketing)/_lib/copy.ts`, and it is the third instance of the shape the
21 August entry already recorded: *every decision record any routine writes now
edits a marketing file.* Filed against the marketing lane, with a recommendation
(derive the count at build time from the directory the test already reads, and
the class of failure stops existing).

It is on **both** branches — #169's and this one's — because neither can go green
without it and they are identical, so whichever merges second is a no-op.

### #169 had a merge conflict and now does not

`FINDINGS.md`, the usual one: two branches appending to the end of one file. Both
sides kept, `pnpm verify` green on the merge, pushed. #169 is mergeable again.

## What shipped

**`/portal/primitives` is `/portal/pieces`.** It is the fourth route rename of
this shape and the one the 25 August "the rename queue is empty" entry missed —
the queue tracked the six screens that print the runtime's *states*, and this is a
screen that prints the runtime's *vocabulary*, which is a different kind of jargon
and was never on the list. *Primitive* is in the marketing lane's own
`RESERVED_VOCABULARY`, the list of words a visitor has never heard.

*Piece* is not a new coinage. It is what the rest of the portal has called one
since 19 August, in the middle of sentences a reviewer reads before they ever
open this page — *"it brings 3 more pieces with it"*, *"the 4 pieces inside
it"*. A reviewer moving from a change's plain reading to this screen should not
have to learn a second word for the thing they just read about.

`/portal/primitives` answers permanently with a 308, path carried through, the
same shape `/portal/trees`, `/portal/calibration` and `/portal/audit` all got.

### What the screen says now

The old page, in full: a lower-case `h1` reading **`primitives`**, the line
*"4 registered. This is exactly what a model is told it may build."*, and four
cards each carrying a monospace type, a monospace `slots: header, footer` where
there were any, the author's description, and a row of monospace chips reading
`variant?` — where a trailing `?` was the only thing on the screen saying whether
a setting had to be given, and nothing said that it was. The two other states
were `No props.` and `Props cannot be enumerated from this schema.`

That second sentence is the most valuable claim in the portal and it was written
for the runtime. It is now the heading and the lead:

> **What Loom can put on your page**
>
> *Your project is set up with 4 kinds of piece. The AI is handed this exact list
> every time you ask for a change — anything that is not on it has nothing to
> draw it, so it would never appear on your page.*

And there is a primary action, which this screen never had: **Ask for a change
→**, to `/portal/pages`. The old page answered "what do I do now?" with nothing
at all.

### The disclosure that makes the claim checkable

Each card carries **the line the model is actually given**, verbatim:

```
- loom.card — A block of related content, optionally outlined. props: variant?
```

It is produced by `renderCatalogue`, the runtime's own formatter — the same
function that builds the catalogue block of every proposal request — called over
a one-element catalogue. There is no second formatter in the portal to keep in
step, which is the whole point: a page that *described* the prompt would agree on
the day it was written and drift silently afterwards. A test asserts
`catalogueLineFor(p) === renderCatalogue([p])`, and a second asserts every line is
a substring of the block the deployment would really send.

A page-level disclosure carries the whole block, and says where new pieces come
from — a code change, with a link into the docs.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `/portal/primitives` | `/portal/pieces` (308 from the old path) |
| nav `Primitives` | nav `Pieces` |
| `h1` `primitives` | `What Loom can put on your page` |
| `4 registered. This is exactly what a model is told it may build.` | `Your project is set up with 4 kinds of piece. The AI is handed this exact list every time you ask for a change…` |
| `loom.card` as the card's title | **Card**, with `loom.card` beside it in monospace |
| `variant?` | `variant` `optional` — and `needed` for a required one |
| `No props.` | `Nothing to set. It holds whatever you put inside it.` |
| `Props cannot be enumerated from this schema.` | `Loom cannot list what you can set on this one. That is not the same as nothing.` |
| `slots: header, footer` | `It keeps named spaces — footer and header — that each hold their own content.` |
| — (there was no empty state) | `There is nothing here for the AI to build with.` + how to add the first one |

**Nothing was deleted.** `props:`, `slots:`, the `?` notation and the exact type
are all still rendered; a test reads the surface and the record separately and
asserts each word is on the side it belongs to. The record is *strictly larger*
than it was: the catalogue line and the whole block are both new, and neither the
old page nor anything else in the portal showed them.

**The plain name is derived, not tabled.** `loom.card` → *Card*,
`acme.pricing-table` → *Pricing table*: last segment, separators to spaces,
capitalised. A lookup table would have to be maintained beside a registry it
cannot see, and the first primitive a host of their own registers would arrive
with no name — on the one page whose content *is* whatever the deployment
registered.

**The type stays on the surface.** That is deliberate and it is the 22 August
judgement holding: `loom.card` is the string this reader meets on every other
screen in the portal, so replacing it with the friendly name would break the
connection rather than simplify anything. It sits beside the plain name, smaller,
in monospace.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** What this is: the list of things Loom can put on your page, and there
are four of them. What each one is: a card is a block of related content; you can
set `variant` on it or leave it alone. What to do next: ask for a change. And the
thing a bright reader would actually want to know — *can it add something that
isn't here?* — is answered in the lead and provable one click down.

Where it stops, and this is worth naming: **`variant`, `level` and `tone` are
still developers' words**, and they are on the surface. They stay because they
are the words that appear in the change record, in the plain reading of a
proposal, and in the line the model is given — a reader who learns *variant* here
recognises it there. What would be better is an example of what to *say* to get
one changed, and that cannot be derived from the catalogue: it would be
hand-written copy maintained beside a registry it cannot see, which is the exact
thing this page's own doc comment says it must not become. Left undone
deliberately, recorded rather than fudged.

## What this tells a developer that they could not get elsewhere

**The honest answer is weaker than calibration's and stronger than it looks.**

A developer can read their own `registry.ts`, so the *list* is not news to the
person who wrote it. Two things are:

- **The exact block the model receives, from the deployment that receives it.**
  Reading the registry tells you which primitives exist. It does not tell you what
  the interpreter is handed — the rendering, the `?` notation, the ordering, the
  descriptions with the runtime's full stops appended — and nothing in a repository
  puts those side by side with the guarantee that they cannot disagree. This page
  is that, by construction rather than by discipline.
- **The bound, stated as a fact a reviewer can check.** *This list is the complete
  set of things an AI can do to your pages* is the sentence that makes the rest of
  the portal's story safe to believe, and the portal's reader is frequently not the
  person who wrote the registry — it is whoever has to answer for what the AI did.
  For them there was previously nowhere at all to see it.

The empty state is the same claim from the other end, and it is the one screen in
the portal where the bargain is unmistakable: *what you register is the complete
list of what an AI can do to your site.*

## Three defects a screenshot found and 31 tests did not

The count for this lane, counting #169's two, now stands at **fourteen across
eight runs**. All three of this run's were caught in the picture, none by a test,
and two of them are the same shape as the ones before.

1. **The notation was explained on a card that had none.** Every disclosure ended
   *"A trailing ? marks a setting that can be left out"* — including `loom.page`,
   whose line reads `props: none` and contains no `?` at all. A sentence about a
   mark that is not there is how a screen teaches a reader to distrust it. The
   clause is now conditional on there being an optional setting, with a test for
   each of the three cases.
2. **The empty lead said what the notice under it said.** *"…so the AI has nothing
   it can build with"* sat directly above a notice headed *"There is nothing here
   for the AI to build with."* — the same fact twice, one line apart, from two
   places in one component. This is the fourth instance of that shape in this
   lane, and the first where both halves were in the same file, which is worth
   knowing: proximity does not prevent it. The lead now says what the list *is*;
   the notice says what state it is in and what to do.
3. **Three of the four descriptions were sentence fragments.** *"The root of a
   page; stacks its children vertically"*, no full stop, one line above the record
   showing *"…vertically."* with one. The runtime appends a terminal stop before
   handing a description to the model — `renderCataloguedDescription`, added
   because sixty-one library lines were reading `…in one column..` — so the two
   readings differed by exactly the punctuation the runtime supplies. Fixed where
   the sentence is written, in this lane's own four primitives, which leaves the
   model's line byte-identical; the component appending punctuation would have been
   a second formatter disagreeing with the runtime's. A test now asserts every
   description this deployment registers is a whole sentence.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, `next build`
across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 (untouched by this diff) |
| `@loom/app` | 137 | 1997 |

**34 net new**, in three files, two of them new:

- **`_lib/piece-view.test.ts` — 19, new file.** The derived name over four shapes
  including a host's own type and a type with nothing after the namespace; the
  three settings claims kept three (`undefined` is *cannot say*, `[]` is *none*);
  each of the four readings asserted whole rather than in halves; two properties —
  every reading ends in a full stop, and no reading contains a word from the
  registry's vocabulary; the catalogue line asserted equal to the runtime's own
  rendering and to a substring of the real block; and the two that came out of
  looking at the page — every registered description is a whole sentence, and the
  record is unchanged by that.
- **`portal/pieces/_components/piece-card.test.tsx` — 12, new file.** Surface and
  record read *separately*, since a closed `<details>` is still in the DOM: the
  plain name leads and the type stays beside it, `needed`/`optional` replaces the
  `?` on the surface while `props: variant?` stays in the record, the `?` is
  explained only where there is one, and the disclosure is named and closed.
- **`portal/primitives/[[...rest]]/redirect.test.ts` — 3, new file.** The 308's
  own `Location`, including that it encodes what it carries.
- **`guarded-pages.test.ts` — 0 net.** The exemption list grew by the new
  redirect and the assertion naming it grew with it, which is that test working.

## What I did not do

- **`src/` is untouched.** Everything used is public: `catalogueOf`,
  `renderCatalogue`, `CataloguedPrimitive`, `CataloguedProp`, `primitiveTypeSchema`,
  `slotNameSchema`. `renderCatalogue` being exported from the root entry point is
  what makes the checkable-claim disclosure possible at all; if it were internal,
  this page could only have paraphrased the prompt.
- **No decision record.** Renaming a route and choosing the words on a screen are
  portal decisions; nothing here touches the tree schema, the delta model or an
  Accepted record.
- **The `agrees` wording finding (25 August, filed by `Loom lessons`) stays
  open.** It is a defensible one-paragraph fix on `/portal/checkup` and it is a
  different screen; folding it in would have widened this unit. It is the smallest
  open item this lane owns and a good next run's opener.
- **No example of what to say.** See the high-schooler section — it would be
  hand-maintained copy beside a registry it cannot see.
- **The four cards are the portal's own primitives, not the library's sixty-eight.**
  #169 filed that as a question and this run changed nothing about it; what this
  run adds is that the gap is now *visible* rather than incidental, because the
  screen's heading claims to say what Loom can put on your page. Filed again with
  that weight.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **`LOOM_SEED_LOG`, or its equivalent, is now three runs overdue.** This run did
   not need it for the three real screenshots — this page has no data source but
   the registry — but it did need a throwaway one-expression patch for the empty
   state, which is the fourth run in a row to hand-roll scaffolding and delete it.
   The recommendation on #169 stands unchanged and unanswered.
2. **Answer the registry question on #169.** It now decides what a heading reading
   *"What Loom can put on your page"* is telling the truth about: four pieces on a
   deployment whose library ships sixty-eight.
3. **The marketing fact count should derive itself.** See the finding; it cost
   `main` a red day and it will do it again on the next record any lane writes.
