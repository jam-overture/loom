# 2026-08-22 — "Does this page add up?"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-09-does-it-add-up` (→ `main`).

Visuals — and for the first time in four portal runs, **three of the four are the
real page against real data**, from a production build with a signed-in browser
against the seeded tree:

| | |
| --- | --- |
| [the result as it arrives](2026-08-22-portal-does-it-add-up.png) | live |
| [the same result with every disclosure opened](2026-08-22-portal-does-it-add-up-open.png) | live |
| [the chooser](2026-08-22-portal-does-it-add-up-chooser.png) | live |
| [the three verdicts a healthy deployment cannot produce](2026-08-22-portal-does-it-add-up-states.png) | fixture fold, real components |

---

## What was asked

No maintainer comment is open on any portal pull request — #127 carries two
comments and both are the deployment bot and my own. So this run is the next item
on the rename queue that report named explicitly: **`/portal/audit`**, *"a
compliance word for what a person calls history"*.

The page was worth the rename. It opened with a lower-case `h1` reading
**`audit`**, then a badge reading **`diverged`** beside *"The log no longer
produces the tree being served."* Every word of that is exactly right and none of
it is what somebody opens the page to find out.

## What shipped

**The route is `/portal/checkup`.** *Audit* is what a compliance function calls
it; what a person wants is to know whether their page is still what its own
history says it is. `/portal/audit` answers permanently with a 308 — the third
rename to take this shape after `/portal/trees` and `/portal/calibration`, and
for the same reason: a rename that breaks every bookmark is a rename that gets
reverted. The nav label moved with it, `Audit` → **Checkup**.

**The page leads with an answer and a next move.** One of three, in a
tone-coloured card:

| | |
| --- | --- |
| **Everything on this page adds up.** | *Loom replayed every change it has recorded for this page and got back exactly the page people are being served, so nothing on it is unexplained.* → Nothing to do. |
| **This page does not match its own history.** | *Replaying the changes Loom recorded produces a different page from the one people are being served. One of the two is wrong, and until you know which, the history cannot explain what is on screen.* → The parts listed below are where the two disagree. Start there. |
| **The history has a break in it, so nothing could be checked.** | *Loom could not replay this page's changes all the way through… That does not mean the page is wrong — it means its own history can no longer be used to check it.* → Open the change it stopped at, below. |

The third one is the distinction 0019 turns on, kept in the plain layer: **no
answer is not a bad answer.** A reader told the check failed must not come away
thinking the page was found wrong, and the old copy — `unreplayable`, in the same
badge that says `diverged` — gave them no way to tell.

**A verdict that is green cannot sit above a warning.** A tree can agree with its
own history and still have ids that name two nodes (0038) — the fold checks
whether the history *produces* the page, recycling is about whether the history
can be *read*. So `readCheckup` takes the whole report rather than the outcome:
when there is recycling, "Nothing to do." becomes *"One thing to look at: a name
below is used for more than one part of the page. What people see is
unaffected."* The tone stays green, because the fold really did agree.

**Nothing was deleted.** Every sentence that was on the surface is one click
down and all of it is still in the DOM, where browser find-in-page reaches it:

| Was on the surface | Is now |
| --- | --- |
| the `agrees` / `diverged` / `unreplayable` badge and `describeAudit`'s headline and detail | *The finding in the runtime's own words* |
| `in the served tree, but replaying the log does not produce it`, per difference | *The same list in the runtime's words* |
| the `recycled ids` badge and its paragraph about the log and the snapshot | *What this is called, and why it is not the verdict* |
| the store's own error string | inside the failure notice |
| the seed explanation, previously a bare grey paragraph | *Why a seed is needed and cannot be inferred* |

### What got renamed, in full

| Was | Is |
| --- | --- |
| `/portal/audit` | `/portal/checkup` (308 from the old path, query carried) |
| nav `Audit` | nav `Checkup` |
| `h1` `audit` | `Does your page add up?` / `Does this page add up?` |
| `The log produces the tree being served.` | `Everything on this page adds up.` |
| `The log no longer produces the tree being served.` | `This page does not match its own history.` |
| `The log cannot be replayed at all.` | `The history has a break in it, so nothing could be checked.` |
| `in the served tree, but replaying the log does not produce it` | `It is on the page people are being served, and nothing in the recorded history put it there.` |
| `produced by replaying the log, but absent from the served tree` | `The history says this should be on the page, and it is not.` |
| `differs between the two in its props, its text` | `The page and the history disagree about its settings, its words.` |
| `An id names more than one node.` | `One name is used for more than one part of this page.` |
| `fold 12 accepted changes →` | `12 changes to replay` · **Check this page →** |
| `Cannot be audited here: …` | `This one can't be checked here: this deployment doesn't know the shape the page started as…` |
| `what changed →` · `run it again →` · `another tree` | `See what changed →` · `Check again →` · `Check a different page` |
| `The store could not be listed.` | `We couldn't load your pages.` |
| `no seed` paragraph, unheaded | `This page can't be checked here.` |
| `25 further nodes differ` | `25 further parts differ` |

**A node is "a part of the page" throughout.** Not in the difference rows' own
identity line, which is the thing the next section is about.

## The defect a screenshot found and eleven tests did not

The first build put the plain sentence on the surface and the part's name and id
behind a per-row disclosure. Four `missing` differences then rendered **four
identical sentences**, with the only thing telling them apart one click down,
four times over.

Eleven tests passed. Every one asserted a *single* difference, where the layout
is correct.

The rule that came out of it, and the reason it is a finding rather than a fix:

> **Identity is not technical detail.** A plain sentence describes a class of
> problem, so it is the same sentence for every member of that class. What tells
> two rows apart is the name of the thing, and it belongs on the surface even
> when it looks like a runtime word — `loom.prose n_shot2` is a name, the way a
> filename is.

So each row leads with the name, the plain sentence sits under it, and the
runtime's phrasing of **every** row is under one disclosure that reads on its
own — one for the list, never one per row. The test written from the failure
renders four differences and asserts each id survives on the surface with the
disclosure's own text subtracted out.

This is the third defect in four runs across this repository that was invisible
to every test and obvious in a picture. The docs lane reported two of them.

## Two findings closed while in the neighbourhood

Both were open against this lane, both one-line, and both are in files this
change already had open.

**Four portal links still named `/portal/demo`** (filed by `Loom demo`,
21 August). The rail, the sign-in page's *See the live demo*, the empty state's
*Try the demo*, and a test fixture now name `/demo`. `DEMO_PATH` deliberately
stays `/portal/demo`: it is the address of the 308, and the exemption is what
makes an old link reach a signed-out visitor instead of bouncing them to sign in.

That one had a consequence the finding did not anticipate. `nav-items.test.ts`
resolved every rail href under `app/(portal)/`, so the moment the rail pointed at
another surface's route group it called a working link broken — and the tempting
fix for that failure is to point the rail back at the redirect. It now searches
every route group, with a test asserting it finds `/demo` there.

**`addressing.ts` said the audit calls each component once** (filed by
`Loom daily build`, 20 August). 0075 made it once per shape its schema closes
over. The comment now says so, and carries the conclusion the filing lane drew:
doing it at module scope is worth *more* now, not less.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes, on both screens.** On the chooser: here are your pages, press one to check
it, and this one can't be checked because this deployment doesn't know the shape
it started as. On a result: everything adds up and there is nothing to do — or
the page and its history disagree, and here are the four parts where.

Where it stops, and correctly: `loom.prose`, `n_shot2`, `revision 11` and
`t_seed1` are all on the surface. They are names, and a reviewer who cannot see
which part is affected cannot go and look at it. `agrees`, `the snapshot`, `the
fold` and `0038` are all still on the page and all behind a disclosure.

## What this tells a developer that they could not get elsewhere

Their repository knows what the code says. `git log` knows what changed. Neither
knows **whether the record of how a page got here still produces the page being
served.** That question only exists because 0016 made the log the truth and the
snapshot a view of it, and it is answerable only by folding one against the
other from a seed the host can independently reproduce (0028).

In one sentence: *your page has four parts on it that nothing in its recorded
history put there.* No linter, diff or build output produces that, because none
of them has two independent accounts of the same page to compare.

The honest weakness is the same as last run's strength: on a healthy deployment
the answer is always *yes, it adds up*, and a page that only ever says yes is a
page nobody opens daily. What makes it worth opening is that it is the one screen
that can say **no** — and this run is the first time saying no is readable.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, `next build`
across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 101 | 1504 (untouched by this diff) |
| `@loom/app` | 95 | 1165, up from 1125 |

**40 net new tests** (41 added, 1 replaced):

- `_lib/audit-view.test.ts` — 15 new (22 → 37). `readCheckup` in its three
  states; the recycling case that must not say "nothing to do"; the restoration
  that must not turn a clean verdict into homework; **tone agreement with
  `toneOfAudit` across all three outcomes**; and the no-jargon property, with a
  guard asserting the technical reading really does trip the regex the plain one
  is held against. Plus `explainDifference` and a test that no facet comes out
  the same in both tables, which is what catches somebody copying a row.
- `portal/checkup/_components/checkup-verdict.test.tsx` — 11, new file. The
  verdict on the surface, `describeAudit`'s three sentences present and closed,
  the four-difference layout defect above, exactly two disclosures rather than
  one per row, the recycling warning, and the linked revision an unreplayable
  verdict stops at.
- `portal/checkup/_components/checkup-choices.test.tsx` — 7, new file. The
  chooser was split so its states could be rendered at all: the empty state and
  its way out, a checkable row's link and singular, **a page that cannot be
  checked being listed rather than hidden**, a mixed deployment, and id encoding.
- `portal/audit/[[...rest]]/redirect.test.ts` — 8, new file. Same shape as the
  calibration redirect's, plus one that is new: three renames now have a
  `targetOf` of the same shape in the same kind of file, so it asserts this one
  never lands on another rename's destination.
- `_components/shell/nav-items.test.ts` — 1 new. A rail item served by another
  surface's route group.
- `guarded-pages.test.ts` — the new redirect joins the exemption list, which is
  now five redirects and the sign-in page. It renders nothing and reads nothing.

The two that earn their place are the four-difference layout test, which is
written from a real failure, and the tone-agreement test, which is what stops a
verdict saying the page is fine above a technical reading that says it diverged.

A local runtime rebuild (`pnpm --filter '@loom/runtime' build`) was needed once
before the app suite would resolve `@loom/runtime/write` — the same stale-`dist/`
symptom the last three portal reports flagged, same fix. `pnpm verify` also
failed once on a stale `.next/types/validator.ts` still importing the temporary
screenshot route after it was deleted; `rm -rf apps/loom/.next` cleared it.

**The first push produced no preview at all**, and the cause was outside the
code. I committed under an explicit `user.email`, which resolves to a GitHub
account that is not on the Vercel team, so the deployment came back **Blocked**
rather than Ready and there was no URL to put in the pull request. The
environment's default identity — `Claude <noreply@anthropic.com>`, which every
other lane uses — is the one that deploys. Amended and force-pushed before any
review; filed, because a routine that overrides the identity to be helpfully
descriptive silently loses the one artefact the maintainer judges by.

## How the screenshots were taken

Worth stating because four findings in this repository say a portal surface
cannot be photographed, and **that is not true of this one.**

A checkup needs a store and a seed, both of which exist on any deployment once
`ensureSeeded` runs. So three of the four visuals are a production build of this
commit, a real session against a real roster, and `auditSnapshot` actually
folding the seeded tree's log. The old `/portal/audit?tree=…` was followed
through its 308 in the same browser and came back 200 on the new path.

The fourth could not be real and no deployment could make it so: `diverged` and
`unreplayable` mean the log and the snapshot have come apart, which is not a
state anything can be asked to enter. Those three panels are the real components
over a fixture fold, rendered by a temporary route that was deleted before this
branch was pushed — the same substitute the last three runs used, said plainly
here as they said it.

## What I did not do

- **`/portal/activity` and `/portal/history` still use the runtime's in-page
  vocabulary.** Their route names are already a person's words, so what is left
  is `episode`, `in-flight` and `did-not-apply` rather than a rename — and
  neither has a verdict-shaped answer, so the pattern that fits them is the
  review queue's rather than this one's.
- **`/portal/pages/[treeId]` still says `node` on the surface.** It is the
  biggest remaining piece of the redirection and the screen a developer actually
  spends time on. Worth a run of its own; filed.
- **`_lib/audit-view.ts` and `isAuditable` keep their names.** Same reasoning as
  last run: they map a runtime type and a runtime capability, and renaming them
  churns a diff without changing a word anybody reads. The functions that
  *produce* what a person reads are named for the surface.
- **`src/` is untouched** and nothing was wanted from it.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an Accepted record. A portal route rename is a portal surface decision.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **The demo-scoped journal, still — but it is four pages, not five.** This run
   corrects my own three previous entries: it closes `/portal/trust`,
   `/portal/activity`, `/portal/history` and `/portal/sign-ins`, and it was never
   needed for this page. It remains the change I would make next and it is in my
   lane.
2. **`Checkup` as the nav label** is my call, the way `Trust` was, and the one
   word here I would most like overruled if it reads wrong. `Health` and `Verify`
   were the alternatives; both describe the machinery rather than what a person
   is doing when they press it. **My recommendation: keep it.**
3. **Nothing blocking.**
