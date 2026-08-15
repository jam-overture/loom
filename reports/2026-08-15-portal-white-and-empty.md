# 2026-08-15 — the portal is white, and it says what it means when it has nothing to say

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-01-white-and-empty` (→ `main`).

Visuals: [the white](2026-08-15-portal-white-and-empty-white.png) ·
[empty vs failed](2026-08-15-portal-white-and-empty-states.png) ·
[keyboard](2026-08-15-portal-white-and-empty-keyboard.png).

---

## Where this run started

`main` at `7f7b615`, **no open pull requests**, so there was no review feedback
outstanding to act on. I checked before branching.

Three of the five files the brief names as *read first, every run* are not in the
repository: **`docs/routines.md`**, **`docs/rollout.md`** and **`FINDINGS.md`**.
`docs/` contains one file, `deployment.md`. `FINDINGS.md` exists nowhere in the
tree. I read what does exist — `decisions/0018`, `decisions/0019`, the day-44
portal report and the day-51 demo report — and proceeded. Both are filed below
and in FINDINGS, which this run creates.

The brief also says §4b's demo does not exist yet and that the portal's
highest-value work is therefore blocked. **The demo landed in #71**, merged as
`c603c8e` on 12 August — `apps/portal/app/demo` and `apps/portal/lib/demo` are
on `main` now, and `/demo` renders a real tree with a real record beside it. I
did not act on that this run, because the maintainer's first task was explicit
and ordered before anything else, and because re-planning the value work off a
stale premise is a decision for the next run with the brief re-read. It is the
first item under *Needs your input*.

## The maintainer's task, first

**The gradient is gone and the portal is white.**

In `app/globals.css`:

- `--surface-wash` — the token and its only use, both removed.
- `--surface-page` — `#f2f6f8` → `#ffffff`.
- the `body` rule — `background-image` and `background-repeat` removed with the
  token.

One thing beyond the letter of the instruction, and it is the "any other
decorative tint" the brief asked me to look for. **`--surface-preview` was
`#fbfcfd`** — a bluish off-white, with a comment saying the preview pane "reads
as a document, not a panel, so it sits on a flatter surface than the chrome
around it". Against a tinted page that claim held: the preview was *lighter*
than its surroundings. Against a white page the same token reads as a panel
*darker* than everything else, which is the opposite of what it was for. It is
now `#ffffff` and the border around it carries the distinction, which is the
rule the rest of the sheet now follows.

I stopped there. `--surface-hover` (`#eceef2`) and `--surface-active` /
`--nav-active-bg` (`#e3e6ee`) are cool greys and did arrive with the same design
system, but they are *interaction* colours — they mark a thing that changed
under a pointer or a selection — and they need to be visible against white,
which they are. Changing them was not asked for and would have cost the rail its
active state. Say the word and they go too.

Checked, not assumed: the pages where the page background showed through are
`/trees`, `/activity`, `/calibration`, `/history`, `/audit`, `/sign-ins`, the
tree review page and `/demo` — every one is in the screenshots, rendered from a
production build. `grep` over `app/` and `lib/` finds **no raw hex, no `rgba(`,
no `gradient` and no `shadow` in any component**: the tokens really are the only
source, so there is no second copy of the tint hiding in a component.

There is now a test that says so — `app/globals.test.ts` asserts the wash is
gone, that no `gradient` appears anywhere in the stylesheet, that every resting
surface is `#ffffff`, and that the body carries no background image. A
stylesheet is the one part of this app nothing else checks: the type checker
does not read it, no component imports it by name, and a token that comes back
comes back on every page at once. That is exactly how this tint arrived.

## What else shipped, and why this and not something else

The brief's order after the gradient is visual and interaction quality, then
rendering tests as I touch components, then empty and error states. Those are
one unit, not three, because the states *are* the visual work on a portal with
no interesting tree yet: an empty page is most of what this portal currently
renders, and it is the part nobody had designed.

### An empty store and a failed read were the same grey sentence

This is the defect worth naming plainly. Six places rendered both of these as
`<p className="text-ink-muted text-sm">{...}</p>`:

- "No trees stored." — the store is empty.
- `describeStoreError(page.error)` — the store did not answer.

Same element, same colour, same position on the page. The only way to tell which
one you were looking at was to read it carefully. **A reader who mistakes the
second for the first concludes the portal is working and their data is gone.**

`app/_components/state-notice.tsx` makes the tone a prop, and the tone changes
the shape rather than only the wording:

| tone      | what it is                    | how it reads                                        |
| --------- | ----------------------------- | --------------------------------------------------- |
| `empty`   | nothing here *yet*            | dashed edge — a space something goes in              |
| `failure` | the read did not happen       | solid, refusal-coloured, and announced via `role="status"` |
| `notice`  | worth knowing, not a failure  | quiet fill; must not compete with the page           |

`failure` is the only one announced to a screen reader. An empty list is already
described by the heading above it, and a live region firing on every navigation
to a page that happens to be empty is noise. A read that failed is the one a
reader has to be *told* about, precisely because it looks like success.

Applied at: `/trees` (empty + failed), `/activity` (empty + failed),
`/calibration` (empty + failed), `/history`'s chooser, `/audit`'s chooser,
`/sign-ins` (failed), the review queue on a tree, and the four "no `DATABASE_URL`"
asides.

Every `empty` says **what would put something there**, which is the part these
states usually omit — `/trees` with nothing in it now points at `/demo`, which
needs neither a store nor an account.

### `/calibration` drew a table of dashes on a fresh install

Worth separating out, because it was not a wording problem. With no settled
claims the page still rendered the summary, the policy breakdown and ten bucket
rows with an em dash in every cell. A new user's first calibration page was a
grid of dashes, which reads as a broken table rather than as an honest "not
yet".

It now shows the table only once something has been judged, and the empty state
distinguishes the two cases that were previously identical: **nothing has
happened**, versus **things are in flight** — in which case it names how many are
held awaiting an answer, how many failed and how many are unsettled. It also
says why a window of nothing but undos stays empty here: a revert is proposed
with a confidence of 1 by an interpreter that cannot be wrong (0032), so it is
never scored.

### A 404 and a thrown page had no design at all

`app/not-found.tsx` and `app/error.tsx` did not exist, so both fell through to
Next's own fallbacks — outside the design system and outside the portal's
vocabulary. That is bad in any app and worse here: the portal's whole claim is
that a change is reviewable, and a surface that drops out of its own language
the moment something goes wrong is asking to be trusted exactly when it has
stopped explaining itself.

The 404 explains the *deliberate* case, which is the one that will actually be
hit: `/activity`, `/audit`, `/calibration` and `/history` call `notFound()` when
`tree=` is not a well-formed `TreeId` — a refusal to guess at an identifier, not
a missing route.

The error boundary shows the **digest and never the message**. Next replaces a
server error's message with an opaque digest before it reaches the browser so an
internal failure cannot leak through a UI; printing `error.message` would
reintroduce that on the client-thrown path. The digest is what a reader can
quote into a bug report. `reset()` is offered first because most of what throws
here is a read.

### Keyboard

There was **no focus style in this portal at all** — no `:focus-visible` rule
anywhere in `globals.css`. Three things now:

- **A ring**, tokenised (`--focus-ring`, width, offset) and applied at
  `:focus-visible` on the universal selector. Universal because the alternative
  is remembering it on each of forty-one components, and the one that gets
  forgotten is the one a keyboard user needs. `:focus-visible` rather than
  `:focus`, so clicking a button does not ring it. The rail gets an inset offset
  because it clips its own overflow to animate its width, and a ring drawn
  outside a nav item was cut off at the left edge.
- **A skip link.** Every page carries a fixed topbar and a rail of eight routes,
  so a keyboard user was tabbing past the same nine stops on every navigation.
- **The rail opens on focus, not only on hover.** This was a real defect: the
  labels were revealed by `group-hover` alone, so tabbing the rail moved focus
  across eight *unlabelled glyphs*. Navigable and unreadable at the same time is
  worse than either. `focus-within` on the aside and `group-focus-within` on each
  label. The third panel of the keyboard screenshot is the rail opened by
  keyboard alone, with the mouse parked in the far corner.

`<main>` is the skip target with `tabIndex={-1}` so focus really moves rather
than only scrolling — a screen reader that was not moved is still reading the
rail. Its own ring is suppressed, deliberately and in a comment: it is the whole
viewport, so an outline around it is noise rather than "you are here". Everything
inside it still rings.

## Tests

**Day 44 left 38 of 41 components untested. This run covers the components it
touched, which is the brief's instruction — not a sweep.**

Five new files, 20 new tests, `455 passing` overall (was 435):

| file | what it pins |
| --- | --- |
| `app/globals.test.ts` | the wash is gone, the page is white, the ring exists, no bare `:focus` |
| `app/_components/state-notice.test.tsx` | tone reaches the DOM; failure is styled *and* announced differently from empty |
| `app/error.test.tsx` | digest shown, message never shown, retry wired, nothing half-written |
| `app/not-found.test.tsx` | the malformed-`tree` case is explained; there is a way out |
| `app/_components/shell/sidebar-nav.test.tsx` | labels follow focus as well as hover; `aria-current` on exactly one route |
| `app/trees/[treeId]/_components/review-queue.test.tsx` | an empty queue reads as decided, not as stalled |

Two of these are weaker than I would like and are marked as such in the files.
`sidebar-nav.test.tsx` asserts a *class name*, because jsdom computes no layout
and cannot tell me the label is legible; it is the line that gets deleted by
accident, so it is worth pinning even at that strength. `globals.test.ts` reads
the stylesheet as text for the same reason.

Nothing was weakened to get green. `pnpm verify` (typecheck, 455 tests,
`next build`) passes.

## What this tells a developer that they could not get elsewhere

The bar the brief sets, answered honestly for each unit:

- **The white, the ring, the skip link, the rail.** *Nothing they could not get
  from the repo.* This is craft, not information. It is worth shipping because
  the maintainer asked for the first part and because a surface nobody can
  navigate by keyboard is not one you open daily — but I am not going to claim
  it as insight.
- **`empty` vs `failure`.** **Yes, and it is the real one.** "Is this journal
  quiet, or did the read fail?" is a question `git log` cannot answer, the repo
  cannot answer, and the logs answer only if you are already logged into the
  right instance holding the right query. Before this change the portal answered
  it *wrongly* — it rendered "the store did not answer" in the same grey as "the
  store is empty", so the surface's own answer was misleading. `/sign-ins` is
  the sharpest case: an unreadable attempt log now says *unknown* instead of
  reading as *quiet*, and "nobody is trying keys against my deployment" is
  exactly the false conclusion a security page must never invite.
- **The calibration empty state.** **Yes.** "No claim has been settled yet, but
  four are held awaiting your answer" is Loom's own data about its own
  in-flight state, projected from the journal. It is not in the repo and not in
  `git log`. Ten rows of em dashes said the opposite.
- **The error boundary.** Partly. The digest is a real handle on a real failure
  and nothing else surfaces it. The rest is manners.

So: one unit clears the bar squarely, two clear it, and the visual work does not
and is not claimed to. **None of this is the daily-open value** — that is the
review queue, the calibration page and the history over a real tree, which the
demo landing has now unblocked.

## What I did not do

- **No value work on the review queue, calibration or history.** The brief
  ordered it behind the gradient and behind the states, and told me to re-read
  the brief when the demo lands. It has landed; that is the next run's decision,
  not a thing to slip into this PR.
- **No framework gaps found.** Nothing this run needed from `@loom/runtime` that
  its public entry points do not expose. `src/` is untouched.
- **No `Proposed` decision record.** Nothing here touches the tree schema, the
  delta model, or an Accepted record. 0018 and 0019 both constrain this diff and
  neither is strained by it: the chrome stayed ordinary React, and an empty
  review queue that explains itself is a review queue, not a design tool.
- **`--surface-hover` and `--surface-active` were left alone.** Reasoning above.

## Recommendations

1. **The three missing files.** `docs/routines.md`, `docs/rollout.md` and
   `FINDINGS.md` are named as required reading and are not in the repo. Every
   routine that reads this brief will hit the same wall. I have created
   `FINDINGS.md`; the other two I cannot write, because I do not know what the
   governance and the phased plan say.
2. **The brief's premise about the demo is stale** and it is the item that
   changes what gets built next. #71 landed it three days ago. If the intent is
   still "when the demo lands, re-read this brief", then this is that moment.
3. **Where to point the value work first,** if you want a steer: the review
   queue over the demo's tree. 0019 calls `awaiting-confirmation` the portal's
   reason to exist, and the demo now produces held proposals with real stakes
   factors, real verdicts and real inverses behind them. That is the page that
   tells a developer something no other tool can.
