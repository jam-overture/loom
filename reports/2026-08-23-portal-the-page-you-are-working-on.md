# 2026-08-23 — "The page you're working on"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-10-the-page-you-are-working-on` (→ `main`).

Visuals — all four are **the real page against real data**, from a production
build of this commit with a signed-in browser against the seeded tree:

| | |
| --- | --- |
| [the screen as it arrives](2026-08-23-portal-the-page-you-are-working-on.png) | live |
| [a part picked that the page cannot be clicked to reach](2026-08-23-portal-the-page-you-are-working-on-picked.png) | live |
| [the same screen with every disclosure opened](2026-08-23-portal-the-page-you-are-working-on-open.png) | live |
| [a phone](2026-08-23-portal-the-page-you-are-working-on-phone.png) | live |

Nothing was staged and no fixture was substituted. A checkup needs a store and a
seed; this screen needs neither, so it photographs directly.

---

## What was asked

**No maintainer comment is open on any portal pull request.** There are no open
pull requests at all — #143 merged and the queue is clear. So this run is the
next item on the rename queue, which my own 22 August finding named explicitly:

> **`/portal/pages/[treeId]` is the biggest remaining piece and the least
> route-shaped.** It still says `node` on the surface and it is the screen a
> developer actually spends time on. Worth a run of its own.

It is the screen where somebody looks at their page, points at a part of it, and
asks for a change — which is the whole product, on one page. It needed no route
rename. It needed its vocabulary taken off the surface.

## What shipped

**The screen speaks a person's words, and every runtime word it used to print is
still there, one click down.** Ten of them, in order of how early a reader met
them: `preview`, `outline`, `N nodes`, `node`, `kind`, `addresses`, `nothing`,
`scoped to`, `propose`, `composed on the server, gated, then written`.

### The four panes

**The header led with `preview`** — the name of the pane, not of the thing in it.
A person who has opened one of their own pages knows they are looking at a
preview. What they did not know is that the page is *clickable*, which is the one
thing this screen can do that a screenshot cannot. So the page's own name leads,
and the sentence under it says what clicking is for.

**The outline was headed `outline` over `10 nodes`** — a data structure and its
cardinality. It is *Parts of this page* over `10 parts` now. The three markers
`◆ ◇ ·` are kept, because a symbol is faster to scan than a word once you know
it, and **what they mean is now under the list rather than in nobody's head.**
The same legend carries `↑`, which was the worst of them: an unexplained arrow on
a row that will not respond reads as a broken row.

**The selection pane was the densest jargon anywhere in the portal.** Three
monospace pairs headed `node`, `kind` and `addresses`, with `nothing` a
legitimate value of the third, and under them, when the news was bad:

> `this primitive does not spread loom.editable, so selection falls back to n_card1`

Every word of that is true. None of it answers the question the reader has, which
is **whether they can change the thing they just clicked.** They almost always
can, and the pane never said so.

**The prompt box had no obvious primary action**, which is the test Vercel and
Supabase pass on every screen. `propose` is the name of the object being created
rather than of the thing the person is doing; it is **Ask Loom** now, in the
affirm colour, and the caption says what pressing it will do before it is
pressed.

Its unconfigured state was a wall. With no API key the textarea was simply
disabled behind a placeholder reading `Set LOOM_ANTHROPIC_API_KEY to compose
changes.` — an instruction addressed to whoever deployed this, printed at whoever
opened it, in a box they cannot type in. It is a notice now, and it says the
thing that was never there: **what still works without it.**

### The sentence that is new rather than translated

Everything above moves a string. This one did not exist:

> **A part you cannot click is still a part you can change.**

Pointing is about the DOM. Scoping a request is about the tree — `PromptBox`
posts the *requested* node, never the addressed one — so it was always true and
the screen never said it. 0019 requires the fallback to be *stated*; it does not
require the reassurance, and the reassurance is what decides whether a reader
gives up on a row.

It is asserted for all six unclickable cases in `pointingWords`, because it is
exactly the sort of sentence a later rewording drops for being wordy.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `h1` `preview` | the page's own name, `t_seed1` |
| — | *This is your page as people are being served it right now. Click anything on it to point at that part…* |
| `revision 0 — 0 changes have been applied to this page.` | `Nothing has been changed here yet. · revision 0` |
| a bare monospace list of render diagnostics | `One part of this page didn't draw.` + *the rest of the page is fine* |
| `outline` | `Parts of this page` |
| `10 nodes` | `10 parts` |
| `◆ ◇ · ↑`, unexplained | the same four, under *What the marks mean* |
| row title `this primitive does not spread loom.editable, so selection falls back to n_card1` | `Words — clicking the page picks the part around it` |
| `Select a node — in the outline, or by clicking the preview — to see what it addresses.` | `Nothing picked yet.` + *Click any part of the page above, or choose one from the list* |
| `node` / `kind` / `addresses` / `nothing` | `PICKED`, the part's name, `Words`, and a plain sentence |
| `element` / `slot` / `text` | `A piece of the page` / `A space inside a piece` / `Words` |
| `this node renders without an element of its own` | `Words and named spaces have no box of their own on the page, so there is nothing there to click.` |
| `this primitive does not spread loom.editable` | `Whatever draws this doesn't mark itself as clickable, so Loom can't find it on the page.` |
| `since:` | `Since then:` |
| `part of the tree from the start — no revision placed it` | `here from the start — no change put it here` |
| `placed further back than this page looked` | `put here further back than this page looked` |
| — | `WHERE IT CAME FROM`, over a credit that had no label at all |
| `ask for a change` | `Ask for a change` |
| `scoped to n_seed1` | `Just this part: n_seed1` |
| `whole tree` | `Anywhere on this page` |
| `propose` · `composing…` | **`Ask Loom`** · `Working on it…` |
| `composed on the server, gated, then written` | *Loom writes the change, checks it against your rules, then applies it — or stops and asks you first.* |
| `Set LOOM_ANTHROPIC_API_KEY to compose changes.` (a disabled placeholder) | `Asking for changes isn't switched on here.` + what still works |
| `could not render` + a bare error code | `We couldn't draw this page.` + *nothing has been lost or changed* |
| `Everything asked of this page →` | `Everything ever asked of this page →` |

**A name stays on the surface.** `t_seed1`, `n_seed1`, `loom.card`, `revision 0`
are all still in front of the reader. The 22 August layout defect settled that
and it has not changed: a plain sentence describes a *class* of thing, so it is
the same sentence for every member of it, and what tells two rows apart is the
name. A filename is a name even when it looks like a runtime word.

### Where it lives

`_lib/vocabulary.ts` gained `PART_KINDS` and `pointingWords` beside
`CHANGE_STATES`, `STAKES` and `ruleSentence`. That is the brief's *"in one place,
not per component"* holding for a second **kind** of word — what a thing *is*,
not only what became of it. `PlainState` split into `PlainWord` plus a tone to
make room, since a part of a page has no outcome and so no tone.

`pointingWords` switches on `Addressing`'s own shape and on
`UnaddressableReason`, both public. The tempting alternative was to switch on
`describeAddressing`'s output *string*, which would have been the portal parsing
the runtime's prose — and it is why each of the three reasons gets its own
sentence rather than one sentence for all three.

## Two defects a screenshot found and forty-six tests did not

Both were found after the component tests were written and green.

**The phone read the wrong way round.** The two columns used
`lg:flex-row-reverse`, which puts the outline first in the source so it lands on
the right of a wide screen. On a narrow screen the row is not a row, so the
source order *is* the reading order — and a visitor met `loom.page`,
`loom.heading`, `loom.card` and "Nothing picked yet" before they met their own
page, its name, or anything they could do. The `h1` was about 700 pixels down.
The same reversal ran tab order right-column-first at *every* width.

Every one of the forty-six new component tests passed against that, because every
one of them renders a component rather than the page. The guard written from it
reads the route's source and asserts the page precedes the list of its parts and
that no row is reversed — crude, and the only check that catches it without a
browser at two widths. The rule it pins:

> **A reversed flex row is a promise that the screen will never be one column.**
> Every responsive layout breaks that promise at some width, and the reading
> order it was hiding is the one a phone gets.

**`revision 0 — 0 changes have been applied to this page.`** The revision link
led and the sentence followed, so at revision 0 the line printed the same number
twice behind the runtime's handle — on exactly the page a new person opens first,
since a freshly seeded deployment *is* at revision 0.

**And a third I reported and was wrong about.** Reading the re-shot arrival
screenshot I took the separator line for `…here yet.· revision 0` — a lost space
— and changed `{…}{" "}` + a newline-led `·` to an explicit `{" · "}`, describing
it in a commit message as a third screenshot-found defect.

It was not one. JSX trims the newline and indent before a literal `·`, so the
original already rendered `yet. · revision 0`; the re-shot PNG is **byte-identical
to the one committed before the change**, which is proof the output never moved,
and a probe against the running server confirms the spacing directly. What I
actually caught was a thin space at small scale in an image I was reading by eye.

The change stays, because `{" · "}` says what it means where the original relied
on a JSX whitespace rule, and so does the test — a separator's spacing is worth
pinning whether or not it was ever broken. But it is a readability change, not a
fix, and the claim that a third defect existed was false. Recorded rather than
quietly dropped, because a report that inflates what a screenshot caught is worse
than one that catches less.

So: **two** defects this run that no test saw and a picture did — not three. That
still makes this the fourth run in five across the repository to turn one up, and
both of these are mine.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** *This is my page. I can click bits of it. I've clicked the words
"Loom" — they're words, and clicking the page picks the heading around them,
but a change I ask for still applies to the words. Nothing's waiting on me. I
type what I want and press Ask Loom, and Loom will either do it or stop and ask.*

Where it stops, and correctly: `t_seed1`, `n_seed1`, `loom.card`, `revision 0`.
Names, and a reviewer who cannot see which part is affected cannot go and look at
it. `element`, `slot`, `text`, `addresses`, `loom.editable`, `delegates to an
ancestor`, `composed on the server, gated, then written` are all still on the
page and all behind a disclosure.

## What this tells a developer that they could not get elsewhere

Their editor knows what the code says. `git log` knows what changed. Neither can
answer **"if I point at this and ask for a change, what will actually happen?"**
— because that answer depends on three things that exist only inside Loom: which
part of the tree the request will be scoped to, whether the Gate will apply it or
stop and ask, and who put that part there in the first place.

In one sentence, off this screen: *this text was here from the start, nothing on
the page can be clicked to reach it, and a change asked for here will still
reach it.* Nothing in a repository, a log or a build output has the two
independent accounts — the DOM and the tree — that the sentence needs.

The honest weakness is unchanged from the last two runs: on a fresh deployment
this screen says nothing is waiting and nothing has changed. What makes it worth
opening daily is that it is where a hold arrives, and this run is the first time
the surroundings of that hold are readable by somebody who has not read 0019.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, `next build`
across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 103 | 1578 (untouched by this diff) |
| `@loom/app` | 114 | 1641, up from 1578 across 109 files |

**63 net new tests**, in six files — five of them new:

- `_lib/vocabulary.test.ts` — 11 new (21 → 32), the only existing file touched. `PART_KINDS` over every
  `NodeKind`; `pointingWords` over all seven shapes `Addressing` can take, with
  **the no-jargon property and a guard asserting the technical reading really
  does trip the regex the plain one is held against** — the pattern
  `audit-view.test.ts` set; each reason getting its own sentence; and the
  reassurance sentence asserted for all six unclickable cases.
- `_components/preview-frame.test.tsx` — 12, new file. The page's name as the
  `h1`, both revision wordings and their order, the singular, and a diagnostic
  reading as degradation with every `describeRenderDiagnostic` line closed
  beneath it. Plus the separator's spacing — kept, though the defect I wrote it for turned out not to exist.
- `_components/tree-outline.test.tsx` — 10, new file. The heading and the count,
  every part listed *including* the ones a click cannot reach, the legend
  covering all four marks, and the row titles held against the jargon regex.
- `_components/selected-node.test.tsx` — 14, new file. Driven **through the
  outline** rather than by handing it a selection, because selection is genuinely
  shared state and a test that set it directly would not exercise what breaks.
  Covers the empty state, the name surviving on the surface with the
  disclosure's own text subtracted out, all three pointing outcomes, and the
  three pairs still present and closed.
- `_components/prompt-box.test.tsx` — 13, new file. The primary action's name,
  the scope label and the hidden field agreeing, no `delta` field (0017), and the
  unconfigured state as a notice with the variable one click down and *nowhere a
  reader meets it unasked*.
- `reading-order.test.ts` — 3, new file. Written from the phone screenshot,
  above.

The one that earns its place is `reading-order.test.ts`, the only one written
from a real failure, and the reassurance-sentence test, which pins the
one sentence here that is new rather than translated.

A local runtime rebuild was needed once before the app suite would resolve
`@loom/runtime/react` — the same stale-`dist/` symptom the last four portal
reports flagged, same fix.

## How the screenshots were taken

A production build of this commit, `next start` on a local port with a generated
`LOOM_PORTAL_SESSION_SECRET` and a one-entry roster, Playwright signing in with
that key and driving the real screen. The "picked" shot clicks a row the script
selects **by its own title**, so the row it lands on is genuinely one the page
cannot be clicked to reach rather than one I chose.

Two things worth stating, because four findings in this repository say a portal
surface cannot be photographed and this one can. First, it needs no store state
beyond `ensureSeeded`. Second, the seeded tree is at revision 0 with no holds, so
**the review queue and the diagnostics band are photographed in their empty and
absent states, which is the honest healthy deployment.** Their populated states
are covered by tests, not by these pictures.

## What I did not do

- **`/portal/activity` and `/portal/history` still use the runtime's in-page
  vocabulary** — `episode`, `in-flight`, and the revision rows. Unchanged
  assessment from 22 August: their route names are already a person's words and
  neither has a verdict-shaped answer, so the pattern that fits them is the
  review queue's. They are the last two items on the rename queue.
- **`HeldProposalCard` was not touched.** It was done on 20 August and it is the
  pattern the rest of this screen was brought up to.
- **The empty review queue leaves a lot of vertical space on a wide screen.**
  Real, cosmetic, and not worth a change that would move a section a reader has
  learned the position of. Not filed.
- **Module names were left alone again**, on the reasoning of the last two
  reports. `outline.ts`, `OutlineRow` and `addressing.ts` map runtime types;
  `pointingWords` and `PART_KINDS` — the functions producing what a person reads
  — are named for the surface.
- **`src/` is untouched** and nothing was wanted from it.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. How a portal screen words itself is a portal decision.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **`Ask Loom` as the button** is my call, the way `Checkup` and `Trust` were,
   and the one word here I would most like overruled if it reads wrong.
   `Propose`, `Request` and `Make this change` were the alternatives — the first
   names the object, the second is a form, and the third promises an outcome the
   Gate may not deliver. **My recommendation: keep it.**
2. **A screenshot at two widths belongs in every visual routine's procedure, not
   in mine by habit.** Four of the last five cross-repository defects invisible to
   tests were found in a picture, and this run found two more — one of which only
   existed below the `lg` breakpoint. That is a `docs/routines.md` change and so
   not mine to make; recommending it rather than filing it against another lane.
3. **Nothing blocking.**
