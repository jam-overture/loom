# 2026-09-09 — "The record is quieter than the sentence, and the page in it has a name"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`), which is
[#245](https://github.com/jam-overture/loom/pull/245). These are its **eighth and
ninth units**, pushed onto the open pull request rather than opened as a ninth
from this lane — the 28 August instruction, followed for the fifth consecutive
run.

Visuals — a production build of this commit, in a signed-in browser, against a
page a live model changed three times during the run:

| | |
| --- | --- |
| [**What's been asked** — three real asks, one the AI could not interpret](2026-09-09-portal-the-record-is-quieter-asked.png) | 1280px |
| [**What's changed, before**](2026-09-09-portal-the-record-is-quieter-changed-before.png) · [**after**](2026-09-09-portal-the-record-is-quieter-changed.png) | 1280px |
| [**Sign-ins, before**](2026-09-09-portal-the-record-is-quieter-sign-ins-before.png) · [**after**](2026-09-09-portal-the-record-is-quieter-sign-ins.png) | 1280px |
| [What Loom can put on your page](2026-09-09-portal-the-record-is-quieter-pieces.png) | 1280px |
| [Can you trust the AI?](2026-09-09-portal-the-record-is-quieter-trust.png) | 1280px |
| [a phone](2026-09-09-portal-the-record-is-quieter-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing is staged. Three requests were typed into the real
prompt box against the seeded tree — *"Change the heading at the top of the page
to say Autumn arrivals"*, *"Turn the page background bright pink"*, *"Add a
short closing note about free returns at the end of the page"*. The Gate applied
two on its own and the AI could not interpret the third. Every sentence in every
screenshot is what the portal wrote about what actually happened.

**The before/after pair is a real before.** The component's one class was
reverted, the app rebuilt, and the same two screens photographed against the
same code otherwise. The store is in memory, so the before pair holds one
revision where the after holds two — the colour is the comparison, not the rows.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227, #234,
#240 and #245 carry only the deployment bot's comments and my own, and #245 has
no review threads. So the findings queue decides, and the standing ask on #245 is
unchanged and repeated at the foot of this report.

Both units below close findings this lane filed and deliberately did not take at
the time.

---

# Unit 8 — the record is never louder than the sentence it sits under

## The finding

Filed 3 September, on `/portal/sign-ins`, and left open on purpose:

> `TechnicalDetail` sets no text colour of its own. Its body inherits whatever it
> is mounted inside … The plain sentence a person is meant to read first rendered
> in `text-ink-muted`; the technical record one click below it rendered in the
> body ink — **darker and more prominent than the thing it is a footnote to.**
>
> Fixed here by muting the four places this screen puts inside a disclosure.
> **That is the smaller half of the fix and deliberately so** — the real one is a
> default colour on `TechnicalDetail` itself, and that is ten screens wide. It
> wants the run that can screenshot the portal end to end.

This is that run.

## What the sweep found, which is worse than the finding said

The component had no altitude, so **every disclosure in the portal had picked its
own**, and the same class meant opposite things depending on where it was
mounted:

| Where a disclosure sits | What its body inherited | What `text-ink-secondary` inside it did |
| --- | --- | --- |
| inside a `StateNotice` | `text-ink-muted` | made a line **louder** than the notice |
| inside a card, or at page level | the body ink | made a line **quieter** than the card |

Nine screens wrote `text-ink-secondary` inside a disclosure. Two `<pre>` blocks
on `/portal/pieces` — the exact line the AI is handed — were set to `text-ink`,
the altitude of a plain sentence, **inside the record**. And one screen,
`/portal/sign-ins`, muted its own contents by hand, which is a fix that works on
one screen and teaches the next twenty nothing.

## What shipped

**`TechnicalDetail` sets `text-ink-muted` on its body.** One invariant, holding
in both places a disclosure is mounted:

> **The record is never louder than the sentence it sits under.**

Muted rather than `text-ink-secondary`, which was the tempting choice and is
wrong in exactly one context: a disclosure inside a `StateNotice` would then be a
step *louder* than the notice's own prose — the same defect moved rather than
fixed. Muted is quieter than a card's sentence and equal to a notice's, never
above either.

**The two `<pre>` blocks keep the record's own emphasis step** —
`text-ink-secondary` — rather than the body ink. The box, its border and its
background are what mark the payload out as the thing the model is handed; none
of them costs volume the disclosure is not entitled to.

**`/portal/sign-ins` stops compensating.** Its hand-muting and the comment
explaining why it had to exist are gone.

**A guard over every disclosure in the lane**, in `every-screen.test.ts`: the
bare `text-ink` utility never appears inside a `<TechnicalDetail>` block, bounded
so that `text-ink-muted`, `-secondary` and `-placeholder` — the record's own
steps, every one of them quieter than a sentence — are untouched. It fails on
`pieces/page.tsx` without this change; that was checked by reverting the fix and
watching it go red, not assumed.

And two tests on the component itself, because the sweep cannot see the thing
that was actually missing: **the body names its own altitude**, and it is never
the body ink.

## What is left, and deliberately

**80 `text-ink-muted` classes inside disclosures, in 19 files, are now
redundant.** They were written when the body was the body ink, and they set what
the component already sets. Stripping them is mechanical, changes nothing on
screen, and is a nineteen-file diff nobody can review sitting on top of a
one-class fix — so they stay, and this paragraph is the record of why. They are
harmless: the rule they restate is the rule that now holds.

---

# Unit 9 — the page in the sentence has a name

## The finding

Filed yesterday, by the unit that gave a page its name and did not finish the
job:

> `_lib/page-views.ts`'s `SCOPED_LEADS` was not reached. So on the screenshots
> taken today, the front door calls a page **Autumn arrivals** and
> `/portal/history?tree=t_seed1`, two clicks away, calls the same page `t_seed1`
> in the sentence directly under its heading … It is small and it is not this
> unit — today's is about what a **screen** is called and this is about what a
> **page** is called, and mixing them would make one diff answer two questions.

Four sentences, one module, all four scoped screens at once — and the id was in
the one place on each screen where a person is being told, in words, what they
are looking at.

## What shipped

`scopedLead` takes a `PageName` rather than a `TreeId`, and **`<ScopedLead>`**
renders it — the words a person recognises, the id still beside them in
monospace, exactly as every other place in the portal that names a page has done
since 6 September:

> *"Every change that has actually been made to **Autumn arrivals** `t_seed1`,
> newest first — and, for each one, exactly what undoing it would put back."*

It takes the view and the page rather than a line and a page. The line is derived
from the two, which is what makes it impossible to render one page's name inside
another page's sentence — a failure a component taking both a `PlainLine` and a
`PageName` would allow, and that no test written about either one would see.

**`nameFor`** is the one-page shape of `namesOf`, and `namesOf` is written in
terms of it now. Each scoped screen makes one bounded head read; a failed read
costs the name and nothing else, and the sentence still says which page, by id.
A page that never said what it is called reads *"Untitled page t_seed1"* — the
subject is never lost.

**The id never leaves.** Two of the new tests are about that rather than about
the name: it is what a reader pastes into a URL, quotes in a support thread and
matches against a log line, and 22 August settled that identity is not technical
detail.

---

## What this tells a developer that they could not get elsewhere

The brief's question, answered for this run honestly: **unit 9 adds an answer;
unit 8 makes an answer readable.**

The name in these sentences is not a label somebody typed into a settings screen.
It is what the page currently calls itself at its head revision — so *"every
change that has actually been made to **Autumn arrivals**"* is a sentence that
changes when the AI rewrites the heading, and the page it names is the page a
visitor is being served right now. `git log` cannot produce it: the tree lives in
a store and the heading was never written as markup.

Unit 8 adds nothing to that. What it does is stop the portal shouting the
`p_5uy7wv9d5qqlmaj3yx8u` at a reader as loudly as it says *"Loom made this change
on its own"* — and the whole redirection turns on that distinction. The middle
picture in this report is a screen where three quiet grey blocks sit under three
plain sentences, and the loudest line on the "Not understood" card is *"The AI
could not turn this request into a change it knew how to make."*, with the
runtime's own paragraph about `loom.page` declaring no props one click down and
several shades quieter. Both halves are on the page. Only one of them meets you.

## What was renamed or moved behind a disclosure

**Nothing was removed and nothing new was hidden.** Unit 8 moves no content — it
changes the volume of content that was already behind a disclosure. Unit 9
renames nothing; it adds the words in front of an identifier that stays exactly
where it was.

## The high-schooler test

Applied to the six screens in the pictures — `/portal/history`,
`/portal/activity`, `/portal/trust`, `/portal/pieces`, `/portal/sign-ins` and the
390px history. On each, the loudest text is now a sentence in ordinary English
that says what happened, and every one of them says which page it is about by
name. The one that most obviously passes now and did not before is
`/portal/pieces`: the thing a reader met first inside each card was a monospace
catalogue line in full body ink, and it is a quiet code block under
*"A block of related content, optionally outlined."*

## Tests

`pnpm install && pnpm verify` — **green, exit 0**. Nothing weakened, nothing
skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched) |
| `@loom/app` | 179 | 2916 |

Yesterday's tree was 178 files / 2842 tests. These two units add **1 file and 74
tests**: the portal-wide disclosure sweep (one case per disclosure in the lane),
two on `TechnicalDetail`, four on `nameFor` and `nameReading`, two on
`scopedLead`'s new shape, and seven in the new `scoped-lead.test.tsx`.

## Findings

**Closed:** the 3 September disclosure-altitude finding, and the 8 September
`SCOPED_LEADS` finding — both by this branch, both named in `FINDINGS.md`.

**Filed:** one, about the screenshot script rather than the portal — a full-page
capture stitches, and a sticky topbar is painted a second time in the middle of
the picture. It cost two retakes this run.

## Needs your input

- **Merge #245, then close #219, #227, #234 and #240.** Unchanged ask and now
  nine units deep. Nothing in this lane has merged since 25 August, and all four
  conflict pairwise on `nav-items.tsx` if any of them lands first. I have not
  closed them myself.
- **Nothing else blocking.**
