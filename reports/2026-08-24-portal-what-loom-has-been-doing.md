# 2026-08-24 — "What Loom has been doing"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-11-what-loom-has-been-doing` (→ `main`).

Visuals — all four are **the real screen against real data**, from a production
build of this commit, with a signed-in browser driving the actual pipeline
against a live model:

| | |
| --- | --- |
| [the screen as it arrives](2026-08-24-portal-what-loom-has-been-doing.png) | live |
| [the same screen with every disclosure opened](2026-08-24-portal-what-loom-has-been-doing-open.png) | live |
| [a fresh deployment, before anyone has asked for anything](2026-08-24-portal-what-loom-has-been-doing-empty.png) | live |
| [a phone](2026-08-24-portal-what-loom-has-been-doing-phone.png) | live |

**Nothing was staged and no fixture was substituted.** The two episodes in the
pictures are two real asks typed into the real prompt box on `/portal/pages/t_seed1`,
interpreted by a live model, judged by the real Gate. One was applied; the other
the model declined to interpret, and its reasons — visible in the opened
disclosure — are its own words about the actual seeded tree. Four previous
findings in this repository say a portal surface cannot be photographed against
real data. This one can, and this run is the first time an *episode* has been
photographed rather than an empty journal.

---

## What was asked

**No maintainer comment is open on any portal pull request**, and there are no
open portal pull requests — #145 merged and the queue is clear. The only open
pull request in the repository is #151, which belongs to `Loom lessons`.

So this run is the next item on the rename queue, which my own 23 August finding
named:

> **Still in the runtime's voice:** `/portal/activity` and `/portal/history`.
> `episode` and `in-flight` on Activity, the revision rows on History.

Activity first, because it is the busier of the two, because it is where a
refusal is read back, and because — unlike History — it had **no component tests
at all**.

## What shipped

**The screen speaks a person's words, and every runtime word it used to print is
still there, one click down.** The route keeps its name: `activity` is already
something a person says. What it printed was not.

### The heading, and what this screen is for

`activity`, lowercase, named the route rather than the thing. It is **Activity**
now, over the sentence that says why anybody would open it:

> *Everything anyone has asked Loom to change, newest first — including the
> changes it wasn't allowed to make and the requests it didn't understand. Those
> leave no other trace anywhere.*

That last clause is the whole value proposition of the screen and it had never
been said on it.

### The tally answered a question nobody was asking

Four monospace pairs — `asks`, `proposals`, `held`, `repairs` — over chips
labelled with the runtime's resolution kinds. Somebody who has not read 0002
could not have told you which of those four numbers meant *something needs you*.

It leads with a sentence now:

> **2 asks on this page of the record. Nothing here is waiting on you.**

"Nothing is waiting on you" is **said out loud rather than left as an absence**,
for the same reason the tally has always rendered its zeroes: a reassurance
nobody printed is not a reassurance. All four counts are still there, under *The
counts as the journal keeps them*, with a sentence explaining what `held` and
`repairs` actually count — which the page never said even when it showed them.

### The proposal line was the densest jargon left in the portal

Five monospace pairs, and then — only if the Gate had said anything —
`requires-confirmation` printed as a hyphenated compound beside the policy's own
`reason.detail`, which is a sentence about *thresholds* rather than about this
change. **The rule the Gate actually cited was never named in words at all**, on
the one screen where somebody is reading back a refusal to find out why it
happened.

The order is the review queue's now, and for its reason: what the AI wanted, how
sure it was and what it would have cost to be wrong, what Loom decided and which
rule decided it, who answered. `ruleSentence` already existed — the review queue
has used it since 20 August — and this screen simply had never called it.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `h1` `activity` | `Activity` + *Everything anyone has asked Loom to change…* |
| `asks` / `proposals` / `held` / `repairs`, unexplained | **`2 asks on this page of the record. Nothing here is waiting on you.`** |
| chip `applied` | `Done` |
| chip `refused` | `Not allowed` |
| chip `waiting on you` | `Waiting on you` (unchanged — it was already right) |
| chip `discarded` | `You said no` |
| chip `not interpreted` | `Not understood` |
| chip `not written` | `Not saved` |
| chip `failed` | `Something broke` |
| chip `unfinished` | `No ending recorded` |
| `the Gate would not apply it, and no repair replaced it` | `A rule in this project's settings blocked it, so the page was left as it was.` |
| `held for a human, and no answer has been recorded` | `Loom wrote the change but will not apply it until somebody says yes.` |
| `commit: the base revision moved` | `This stopped while the change was being written down. The change was good and the record of it did not save. Nothing was lost.` |
| `ana@loom.local · user-instruction · the whole tree · revision 3 · 24 characters` | `ana@loom.local asked for this. It was aimed at the whole page. It was written against revision 3.` |
| `system-signal ·` (origin as the fallback subject) | `Your site asked for this by itself.` |
| `this page opened after the ask was recorded` | `This started further back than this page reaches, so Loom can't say who asked.` |
| `confidence 0.82` | `The AI says it is fairly sure` |
| `stakes high` · `reversible no` | `High risk · this one can't be undone` |
| `requires-confirmation — reversibility below the policy floor (default@2)` | **`Loom stopped and asked first.`** + *It could not be cleanly undone, so a person decides — however small it is.* |
| `answered — confirm by ana@loom.local` | `ana@loom.local said yes.` |
| `answered — confirm by nobody recorded` | `Somebody said yes, but the record doesn't say who.` |
| `a repair of p_0` | `This was a second attempt, written after Loom refused the one before it.` |
| `2026-07-31T09:04:00.000Z` | `31 July 2026 at 09:04 UTC` |
| `No change was proposed for this ask.` | `The AI never got as far as writing a change.` |
| `4 records on this page belong to an ask that began before it…` | `4 entries here belong to asks that started further back than this page reaches…` |
| `The journal could not be read.` | `We couldn't read the record.` + *nothing has been lost and nothing has changed* |
| `Nothing has been recorded here.` | `Nothing has been asked for yet.` + *Open one of your pages →* |
| `Set DATABASE_URL to make it durable.` | a sentence about what this deployment is doing, with the variable under *How to make it permanent* |
| `← older` · `newest →` | `← Show older` · `Back to newest →` |

**Names stay on the surface**, on the reasoning the 22 August layout defect
settled: `t_seed1`, `revision 1` and `ana@loom.local` are all still in front of
the reader, because a plain sentence describes a *class* of thing and what tells
two rows apart is the name.

### Where it lives

`_lib/vocabulary.ts` gained five tables — `ASK_OUTCOMES`, `ASK_ORIGINS`,
`FAILURE_STAGES`, `GATE_VERDICTS`, `ANSWERS` — and `reversibilityWord`, beside
`CHANGE_STATES`, `STAKES`, `PART_KINDS` and `pointingWords`. `_lib/episode-view.ts`
kept its own `HEADLINES` and `detailOf` before this run, which made it a **second
vocabulary**, and the two disagreed — see below. It assembles now and decides
nothing.

`_lib/when.ts` is new and small: an ISO instant as something you read. It is
deliberately not `toLocaleString`, because these are Server Components and a
locale- or timezone-dependent format renders differently on the server and in the
browser — a hydration mismatch that shows up as a flicker nobody can reproduce.
The format is fixed, the zone is named rather than converted, and the ISO string
stays in `dateTime` where a machine reads it.

## The disagreement that writing them down together caught

A change somebody turned down was **`discarded`, grey** on Activity and **"You
said no", red** on the review queue. The same fact, in two words and two colours,
on two screens a reviewer moves between — and a reader would be right to think
the difference meant something.

Neither screen was wrong on its own terms. They were wrong *together*, and
nothing could see it while each held its own words. They agree now, and a test
asserts the overlap rather than trusting it. **This is the argument for the
single vocabulary module stated as a defect it actually caught**, rather than as
a principle.

## Three defects a screenshot found, and they are one defect

Eighty-one assertions passed against all three of these:

1. `ana@loom.local asked for this It was aimed at the whole page.`
2. `Loom made this change on its own Nothing this project watches for was involved`
3. `Set DATABASE_URLin this deployment's environment`

Every one is **a missing space or full stop where two strings meet**, and every
one reads as a dropped word rather than as a punctuation slip. The cause is the
same and it is structural: plain language means composing sentences from strings
held in different places, a label in a table is not a sentence, and **nothing
owns the join, so nothing tests it.** `toContain("asked for this")` is true of the
broken line and the fixed one.

The rule, which is the part worth keeping:

> **Where two independently-held strings are set side by side, assert the joined
> reading, not the parts.**

Each now has a test that reads the whole line. The third earned a narrower one:
**the space was in the source and did not survive the build** — an identical
construction three files away rendered correctly — so the fix is to stop relying
on the mechanism and write an explicit `{" "}`.

A fourth, in the same picture and not a spacing bug: the failure card said *"It
never got as far as proposing anything"* and *"The AI never got as far as writing
a change"* one line apart. Two components, neither able to see the other, saying
the same thing. The more specific sentence survives.

That is **six defects across five runs** that a picture caught and no test could.
The 23 August recommendation — that a screenshot at two widths belongs in
`docs/routines.md` rather than in this lane's habit — is repeated, and this is
the strongest evidence for it yet, because this time the picture was the only
thing in the process capable of catching any of them.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** From the screenshot, unaided: *Two things have been asked for on this
page. Nothing needs me. One of them Loom just did on its own — it changed the
heading, it was low risk, and I could undo it. The other one the AI didn't
understand, so nothing happened to my page at all.*

Where it stops, and correctly: `t_seed1`, `revision 1`, `ana@loom.local` —
names. And **one place where it stops and I am not sure it is correct**: the
model's own rationale, printed verbatim, which on this very screenshot reads *"the
level-1 heading's text leaf is replaced… a text node's value is not a prop"*.
Every word this lane has spent four runs removing, in the one string it must not
touch. Filed as a finding with two options, neither taken, because rewording the
model's own account of its change would be the portal putting words in its
mouth.

## What this tells a developer that they could not get elsewhere

The strongest answer this lane has had, and the screenshot is the evidence.

`git log` knows the heading changed. The repository knows what it says now.
**Neither knows that somebody asked for something else and the AI declined,
because that changed nothing** — no commit, no diff, no build output, no line in
any log. It exists in exactly one place, and this screen is it.

In one sentence off the picture: *ana asked for the heading to be calmer and the
second card removed; Loom did not do it, because there is only one card and
"calmer" has no determinate reading, and it says which node it would have needed
named.* That is a record of a request that **produced no change**, with the
model's reasoning attached, joined to the rule that judged the request beside it
which **did**. Nothing in a repository has the two.

The honest weakness is unchanged and now narrower: on a fresh deployment this
screen is empty, and its empty state is the fourth picture above. What makes it
worth opening daily is that refusals accumulate there and nowhere else.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites,
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 106 | 1641 (untouched by this diff) |
| `@loom/app` | 122 | 1768, up from 1693 across 117 files |

**75 net new tests**, in seven files — five of them new:

- `_lib/episode-view.test.ts` — 17 new (15 → 32). Every resolution labelled and
  toned; the no-jargon property with **a guard asserting the technical reading
  really trips the regex the plain one is held against**, narrowed to the four
  hyphenated kinds because `refused` and `failed` are ordinary English as well as
  runtime identifiers; every origin; both `tallySummary` numbers; and the
  terminal-stop property, written from defect (1).
- `_lib/vocabulary.test.ts` — 18 new (32 → 50). The five new tables over every
  member of their key type, **including the cross-table agreement** that caught
  the `discarded` disagreement.
- `_lib/when.test.ts` — 6, new file. Including the branch that hands back
  anything it cannot parse, which should be unreachable and is exactly why it is
  pinned.
- `_components/…/episode-card.test.tsx` — 12, new file. The badge for all five
  interesting resolutions, both revision links, who-asked as sentences, the
  disclosure holding the ask id and the resolution kind, and the de-duplication
  written from defect (4).
- `_components/…/proposal-line.test.tsx` — 13, new file. Confidence as a word
  with the number below, the Gate's verdict and rule in words, **the joined
  verdict line asserted whole** — written from defect (2) — and every technical
  pair proven present and closed.
- `_components/…/tally-bar.test.tsx` — 6, new file. The summary leading, a chip
  per resolution including zeroes, and the four raw counts present but not met
  unasked.
- `activity/reading-order.test.ts` — 3, new file. The summary before the list,
  the empty state keeping an action, no reversed row. The pattern the page
  screen's guard set on 23 August, applied to a second screen.

The ones that earn their place are the three written from real failures and the
cross-table agreement test, which is the only one that could have caught a
defect neither screen could see alone.

## How the screenshots were taken

A production build of this commit, `next start` on a local port with a generated
`LOOM_PORTAL_SESSION_SECRET` and a one-entry roster, Playwright signing in with
that key. Then **two real asks typed into the real prompt box**, interpreted by a
live model through `portalInterpreter`, judged by the real Gate, written to the
real journal. The screenshots are of what came back.

Playwright is not a dependency of this repository and was installed into a
scratch directory rather than added to the lockfile; the pre-installed Chromium
at `/opt/pw-browsers/chromium` was used by explicit path, because the bundled
browser revision does not match the current library.

## What I did not do

- **`/portal/history` is untouched**, and it is now the last screen in the
  runtime's voice. The pattern that fits it is this one, and it is worth a run of
  its own.
- **The model rationale was left verbatim.** Filed, with two options and a
  recommendation to weigh the first.
- **`src/` is untouched** and nothing was wanted from it. `FailureStage` and
  `IntentOrigin` are both public and both turned out to be load-bearing.
- **`held-proposal.tsx` was touched, one line**, to call `reversibilityWord`
  rather than keep its own copy of the same two clauses. Same lane, same output,
  and the point of a single vocabulary module.
- **The empty review queue still leaves vertical space on a wide screen.** Real,
  cosmetic, unchanged assessment, not filed.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. How a portal screen words itself is a portal decision.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **`Done` for a committed ask** is the one word here I would most like
   overruled if it reads wrong. `Applied` is what the review queue says about a
   *change*; this is about an *ask*, and "Done" is what a person says about a
   thing they asked for. The two tables agree everywhere it matters and differ
   here on purpose. **My recommendation: keep it**, and tell me if it reads as
   inconsistent rather than as precise.
2. **A screenshot at two widths belongs in `docs/routines.md`.** Repeated from 23
   August; six defects across five runs now, three of them this run, none
   findable by a test that checks a part.
3. **Nothing blocking.**
