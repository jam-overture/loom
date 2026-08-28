# 2026-08-28 — "Who has been trying to get in"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-15-who-has-been-trying-to-get-in` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a
signed-in browser:

| | |
| --- | --- |
| [Nobody has knocked, which is the state a healthy deployment sits in](2026-08-28-portal-who-has-been-trying-to-get-in-quiet.png) | 1280px |
| [Somebody is locked out — the state with no button, and the reason](2026-08-28-portal-who-has-been-trying-to-get-in.png) | 1280px |
| [the same screen with every disclosure opened](2026-08-28-portal-who-has-been-trying-to-get-in-open.png) | 1280px |
| [a phone](2026-08-28-portal-who-has-been-trying-to-get-in-phone.png) | 390px |

**How honest these are, stated plainly.** Everything in the pictures is real,
and this is the first portal screen in five runs where that needed no
qualification. The numbers were produced by **typing wrong keys into the real
sign-in form** in a second browser context — no `ANTHROPIC_API_KEY`, no seeded
log, no temporary patch to revert. The 25 and 26 August runs both had to
hand-roll throwaway scaffolding to photograph a screen; this one did not, because
this is the one portal surface a person can populate through the front door.

That is worth a sentence beyond the disclosure it makes: **the screens that are
hard to photograph are hard for the same reason they are valuable** — they show
things only Loom's own pipeline produces. Sign-ins is the exception that proves
it, and its data is correspondingly the least exclusive thing in the portal. See
*What this tells a developer* below, which is the weakest answer this lane has
given and is honest about being so.

---

## What was asked

**No maintainer comment is open on any portal pull request.** Two portal pull
requests are open — [#169](https://github.com/jam-overture/loom/pull/169) and
[#177](https://github.com/jam-overture/loom/pull/177) — and every comment on both
is my own. The other seven open pull requests belong to the five other lanes.

So this run is the finding [#177](https://github.com/jam-overture/loom/pull/177)
filed against itself, which named a whole unit and refused to fold it in:

> A rename queue kept as a list of screens is a list somebody has to remember to
> add to. […] A sweep asserting no reserved word reaches a portal surface unasked
> would have found this route the day that list was written. **It is this lane's
> to build and it is a whole unit — not folded into this one.**

## What shipped

Two halves of one thing: **the check, and the screen it found.**

### The check

`_lib/plain-language.ts` and `plain-language.test.ts`. It parses every `.tsx` in
the route group and refuses three things anywhere a reader meets them unasked:

- a word from `RUNTIME_VOCABULARY` — the runtime's own vocabulary, seeded from
  the marketing lane's `RESERVED_VOCABULARY` and extended with the portal's own
  machinery (`throttle`, `survey`, `digest`, `cursor`), which no other surface
  could have leaked;
- a **decision-record citation** — `(0034)` on a screen is a reference to a
  document the reader has not read;
- a **lower-case `<h1>`**, which is the tell every screen on the rename queue
  turned out to share: `trees`, `calibration`, `primitives`, `sign-ins`.

*Unasked* is the hard half and it is where every earlier guard in this lane was
weaker than it looked. A `<TechnicalDetail>` renders a closed `<details>`, whose
children stay mounted **on purpose** so that browser find-in-page reaches a node
id behind a disclosure — which is what makes "nothing is ever removed" literally
true rather than a claim about intent. The cost is that `textContent` returns the
disclosed and the undisclosed as one string, so a test asserting "the word
`disposition` is not on this screen" fails when the record is doing its job and
passes when the record has been deleted. `surfaceText` walks the rendered tree,
takes a shut disclosure's `<summary>` and stops.

**The two halves cover different holes and neither is enough alone.** Source sees
every string a component was *written* with, including the ones no test renders;
it cannot see a sentence assembled at runtime. That is exactly where the leak
was — *"Every failure the throttle remembers…"* is built in `signin-view.ts` from
numbers and is invisible to any check that reads `.tsx`. The DOM tests do that
half.

### The screen

`/portal/sign-ins`, which is the screen the queue forgot. It answers a question
nothing else in a deployment answers: *is somebody trying keys against my portal
right now?*

**What got renamed, in full:**

| Was | Is |
| --- | --- |
| `<h1>sign-ins</h1>` | `Sign-ins` + *Whether anybody has been trying keys against your portal…* |
| `Failed sign-ins the throttle is still holding against somebody.` | *Loom counts failed sign-ins and makes a caller wait when there have been too many, and this is what that count looks like from the inside.* |
| `Every row behind this page is a keyed digest of an address and nothing else… That is a property of the table rather than of this page.` | *It can say how many people have failed and how recently. It can never say who they are, or where they were.* — behind **What this page can and cannot tell you** |
| `Sign-in itself fails closed on the same error rather than letting attempts through uncounted (0034).` | *Nothing is wrong with sign-in itself and nothing has been let through uncounted — if the count cannot be read, sign-in refuses rather than guessing.* (the citation is a code comment) |
| `{survey.error.detail}` in monospace, on the surface | the same bytes, behind **What went wrong** |
| `The attempt log could not be read.` | `We couldn't tell you who has been knocking.` |
| `callers counted` / `failures held` / `locked now` / `longest wait` / `most recent` / `oldest held` | `Different callers` / `Failed attempts` / `Locked out now` / `Longest wait left` / `Most recent failure` / `Oldest one still counted` |
| `Every failure the throttle remembers has been forgiven or has aged out…` | `Every failed sign-in Loom was still counting has either been forgiven or has aged out…` |
| `The throttle is doing its job: …` | `Loom is doing exactly what it is meant to: …` |
| `5 failures within 60 minutes locks a caller out for 1 minute… A correct key clears the count.` | `5 failed sign-ins within 60 minutes lock somebody out for 1 minute… Getting the key right clears the count.` |
| *(nothing)* | **`Nothing to do.` / `If the person locked out is you, wait it out… there is deliberately nothing to press here.`** |
| `Set DATABASE_URL to count once.` on the surface | `These numbers only cover one server.` + the variable behind **How to make it count once** |

And on `error.tsx`, which the sweep caught in the same pass:

| Was | Is |
| --- | --- |
| `<h1>something here failed</h1>` | `Something here failed` |
| `try again` | `Try again` |
| `Every write in this portal goes through one server-side path (0017)` | `Every change in this portal is made in one place on the server` (the citation is a code comment) |

**Nothing was deleted and the record is larger than it was.** Two fields the old
table dropped — `counted`, and whether the locked-out figure is a total or a
floor — are in the new disclosure, with a sentence saying which. That is asserted
in the same test file as the surface being plain, deliberately: passing by
deletion has to be as hard as passing by rewriting.

## The answer that was already in the file, in a comment

The best sentence on this screen had been written a month ago and addressed to
the wrong person. Above the page component:

> *There is nothing here to act on and nothing to click, deliberately. Unlocking
> a caller would mean a way to clear a count from a browser, which is a way to
> defeat the throttle from a browser.*

An operator reading *"2 of 3 callers are locked out right now"* with nothing
under it sees a page that forgot to have a button, and spends their next ten
minutes looking for one. **The paragraph that would have saved them was four
lines above the code.**

This is a shape rather than an incident, and it is filed as one: a design
decision that has to be explained to the next programmer usually has to be
explained to the reader too, and the second explanation is the one nobody writes.
It is worth a pass on any screen whose comments are better than its copy — this
lane's are, everywhere, by construction.

## The first draft of the sweep was wrong seven times out of eight

Written as a regular expression over the source — *the characters between a `>`
and the next `<`* — it reported eight leaks and **seven were code**:
`disposition` destructured from a proposal, `cursor` passed back through a URL,
`@loom/runtime/telemetry` in an import.

One character explains all seven. `=>` ends in a `>`, so every arrow function in
the route group looked like the start of a text node.

That is not fixable by adding exceptions, and the reason is about people rather
than about regular expressions: **a check that cries wolf seven times out of
eight does not get obeyed, it gets deleted** — and the run that deletes it will
be right to, because at that ratio it costs more attention than it saves. The
rewrite asks the TypeScript compiler which characters are JSX text and which are
program. `typescript` is already a dev dependency, `ts.createSourceFile` needs no
program and no config, and the sweep runs in 350ms across 42 files with **zero**
false positives.

## What the sweep found on its first run, and what happened to each

| Finding | Outcome |
| --- | --- |
| `sign-ins/page.tsx`: `throttle`, `digest`, `(0034)`, lower-case `<h1>` | rewritten, this run |
| `error.tsx`: `(0017)` | rewritten, this run |
| `primitives/page.tsx`: `primitive`, lower-case `<h1>` | minimal fix — **#177 deletes this file** |
| `primitives/_components/primitive-card.tsx`: `schema` | minimal fix — **#177 deletes this file** |

The last two are the interesting ones and are covered under *One thing worth
knowing before merging* below.

## A screenshot found a defect that the plain language itself caused

Ninth run running, and this one is instructive rather than embarrassing.

The six numbers sat in a `flex flex-wrap` of label-value pairs, and that layout
worked for as long as the labels were terse and lower-case: `locked now 0` looks
like a field. The moment they became questions a person would ask, the same
layout ran them together into

> `Different callers 1 Failed attempts 5 Locked out now 0 Longest wait left —`

which parses as a sentence rather than as six facts. **Plain language changed
what the layout had to carry, and nothing in the change said so.** It is now a
grid with each number under its own label, and there is a test pinning the
property rather than the class list.

Worth naming because it is the first defect in this lane's count that was
*created* by a plain-language pass rather than merely surviving one. The count is
ten across seven runs. The 23, 24 and 25 August recommendation — that a
screenshot at two widths belongs in `docs/routines.md` — is not repeated; it has
been made three times and it is the maintainer's call.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** From the locked screenshot, unaided: *Somebody has been getting my sign-in
key wrong — seven tries from one caller, the most recent under a minute ago, and
they're currently locked out with a wait still to run. Loom did that by itself.
If it's me, I wait. If it isn't, there's no button here on purpose, and blocking
them properly is something I'd do in front of this app rather than in it.*

Where it stops, correctly: nowhere. This is the first portal screen with no names
on it at all — there are none to print, by design.

## What this tells a developer that they could not get elsewhere

**Honestly: less than any other screen in this lane, and this is the run to say
so plainly rather than to make a case.**

The narrow answer is real. A lockout is *computed* at the moment somebody knocks
and recorded nowhere, so "is anybody being locked out at all" was previously
answerable only by opening a psql session while it was still happening. The rows
exist; nothing aggregated them. `git log` cannot answer it and neither can the
application logs unless somebody instrumented them.

But a hosting platform's dashboard answers roughly this question too, and
answers it about the whole deployment rather than one form. This screen is not
Loom's advantage — the review queue, the calibration miss and the inverse are.

**What earns it a place in the portal is a different property: it is the screen
that says the portal is protecting itself.** The other six screens ask a reviewer
to trust the portal with the power to change a live site. This is the one that
reports what stands between that power and whoever wants it. That is worth being
readable even though it is not exclusive — and it was the least readable screen
in the route group.

I would rather record that than inflate it. If the maintainer's answer is that
this screen should not have been the run's subject, the mechanism half stands on
its own and the screen was the thing it found.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 (untouched by this diff) |
| `@loom/app` | 138 | 1997 |

**34 net new tests and four new test files**, measured against `origin/main`,
which stands at 134 files and 1963 tests:

- `plain-language.test.ts` — **5, new file.** The sweep itself: reserved words in
  JSX text, in props, citations, lower-case headings, and a guard that the sweep
  is still finding files to sweep at all.
- `_lib/plain-language.test.tsx` — **12, new file.** Including the two that decide
  whether the check survives its first month: a word *inside* a longer word is
  not that word (`deltaic`, `schematic`), and a shut disclosure's contents are
  not surface while its summary is.
- `_components/pressure-summary.test.tsx` — **9, new file.** The DOM half — the
  surface asserted plain and the record asserted present in the same file — plus
  the run-on-line defect pinned as a property.
- `portal/sign-ins/reading-order.test.ts` — **3, new file.** The fourth guard of
  this shape: the screen says what it is before it reports a number, and the
  store's own error is behind the disclosure rather than beside the explanation.
- `_lib/signin-view.test.ts` — **5 new (15 → 20).** The "what do I do now"
  sentence in every state, swept, so a fourth tone cannot ship without one.
- `error.test.tsx` — **1 new (5 → 6)**, that the reassurance survives without the
  citation.

The ones that earn their place are the whole-word test — because a check that
flagged "anode" would be deleted rather than obeyed — and the pairing in
`pressure-summary.test.tsx` that asserts the surface plain and the record
complete in the same breath.

## One thing worth knowing before merging

`plain-language.test.ts` is a repository-wide invariant added on a branch cut
from `main`, and **#177 is open and rewrites two of the five files it flagged.**
Two failure modes follow from the lane's own rules, and neither is anybody's
mistake: the check lands and the other branch violates it, or the other branch
gets fixed twice.

**This run checked rather than assumed.** #177's head was fetched into a scratch
worktree, the sweep was run against it, and its `/portal/pieces` **passes clean** —
no reserved word, no citation, a sentence-case heading. So the two are compatible
in either merge order.

What remains is one delete/modify conflict, on
`portal/primitives/page.tsx` and `primitive-card.tsx`, which this branch edits
minimally and #177 deletes. **Resolve by taking #177's side wholesale**; this
branch wants nothing from those two files. The heading this branch gives the old
screen is deliberately the same sentence #177's replacement leads with, so the
two do not disagree in the window where both exist.

The general lesson is filed: *when you add a repository-wide check, run it
against every open branch before opening the pull request.* It cost one
`git worktree add`.

## What I did not do

- **`src/` is untouched**, and nothing was wanted from it.
- **No decision record.** How a portal screen words itself is a portal decision,
  and the sweep is a test.
- **One lane crossing**, the same one #169 and #177 already carry:
  `(marketing)/_lib/copy.ts` says `decisions: "94"` and there are 95 records, so
  `main` is red for all four surfaces. The one-character bump is on this branch
  because a branch cannot be opened on red. #174 deletes that literal outright
  and is the better answer; on conflict, take #174.
- **`/portal/primitives` was not rewritten**, only made to pass. #177 does that
  properly.
- **The `RUNTIME_VOCABULARY` list is a copy**, not an import of the marketing
  lane's. A lane may not reach into another's route group, and the two lists
  should be free to diverge — a visitor to the front door has no context, and
  somebody signed in to the portal has some.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **The sweep should probably grow to the other three surfaces**, and it is not
   this lane's to put there. `(docs)` is allowed to say `delta` and should; the
   interesting cases are `(demo)` and `(lessons)`, where a visitor with no
   context meets the runtime's words. The mechanism is 180 lines and lane-neutral.
   **My recommendation: leave it here until a second lane wants it**, and move it
   to shared ground when one does, rather than guessing at the shape now.
2. **Nothing blocking.**
