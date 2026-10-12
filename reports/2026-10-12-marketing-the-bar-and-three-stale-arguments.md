# The bar, and three arguments from a site that no longer exists

**Build order section:** §4d — the marketing site. Navigation, which the brief
puts in this lane: *"the path from there into the docs and into the portal …
That navigation is part of your job, not an afterthought."*

**Branch:** `marketing-02-the-bar-and-three-stale-arguments` (→ `main`), cut
from `origin/main` at `03ce8ba`. Pull request
[#601](https://github.com/jam-overture/loom/pull/601).

**No maintainer comment was outstanding.** This lane had no open pull request
at the start of the run, and the comments on #596, #597 and #599 are the
routines' own.

---

## What changed

`/what-you-run` is in the bar across the top. One link, and the reason it was
not there is the actual subject of the run.

![the front door, with the page one click away](2026-10-12-marketing-bar-minimal-wide.webp)

| | before | after |
| --- | --- | --- |
| the bar | How it works · Demo · Docs · **Sign in** | How it works · **What you run** · Demo · Docs · **Sign in** |

The page was kept off the bar on grounds written into `site.ts`:

> *"It is `inMenu: false`, and that is now true of two pages. The bar is the
> eight items the maintainer asked about on #166; a sixth page is not worth a
> ninth."*

Both numbers were true when they were written. The site was cut from six pages
to three on 26 September and the bar has carried four things since, so the
sentence was protecting a reader from a ninth item on a bar that has five. A
page answering *what would I be installing* — which is what a developer asks
before they are willing to read an installation guide — was reachable only from
the footer's map and from links inside two other pages. A visitor who wanted it
had to already know it was there.

Measured by the harness at 1280 and at 390, all three palettes: `scrollWidth`
equals `innerWidth` on every shot, the bar is 1080px holding six pressable
things that end at x 1148, and the phone still folds the menu into its
disclosure.

![bold](2026-10-12-marketing-bar-bold-wide.webp)

---

## The part worth keeping: a number instead of eight paragraphs

`inMenu` is a good flag and it cannot answer the question #166 actually asked,
which is *how many*. Eight flags set one page at a time are eight paragraphs
each arguing that this page is worth its slot, every one of them true, and the
ninth arrives in a run that has read none of the eight. That is not
hypothetical: the surfaces answered #166 and **the bar was back to eight items
within a week**, and then a count nobody re-read kept a page off it for a
fortnight after the count stopped being true. A number nobody re-reads goes
wrong in both directions.

So `BAR_CEILING` is eight, in `chrome.ts`, because eight is the number the
maintainer looked at and called too many. `bar.test.ts` is what makes it a rule:

| it asserts | what fails if it goes |
| --- | --- |
| the bar's pressable things are the flags plus one action | an item arrives some way the flags do not see |
| the count is at or under the ceiling | the ninth item |
| the ceiling is reachable — 3 pages + 4 surfaces + 1 action is exactly 8 | a ceiling no site could hit, which is decoration |
| no destination appears twice, the wordmark's included | the front door flagged back into the bar beside the wordmark that already goes there, which is the 12 September decision |
| every item goes somewhere this product serves | a hand-written link to a path nobody serves |

**It counts off the rendered tree, not off the flags.** A count of `inMenu`
would be a count of the input to the thing being measured, and the growth worth
catching includes a link somebody writes into the header directly.

---

## Three arguments from a site that has changed underneath them

Each was filed by this lane and deferred as a second subject. They are one
subject with the bar: a sentence that was true about a different site, left in
place long enough to make a decision for somebody.

| | what it argued from | what is true |
| --- | --- | --- |
| `mechanismHref` | two destinations, the front door and `/how-it-works` | one page since 1 October, so two names for one body and 19 call sites choosing between them |
| `plannedInterpreter` / `PlannedChange` | `floors.ts` needing the same machinery | there is no `floors.ts`: one caller, and an `interpreter` parameter with one value |
| `RAISED_BY`'s export | a band of floor probes printing the same clauses | no second reader, so an export is a door held open for nobody |

All three are collapsed rather than re-explained, and the reason is in
`asks.ts`: a comment that argues from a file nobody can open sends the next run
looking for it, while a type with one shape reads as a seam somebody is using.
Both are wrong and only the first announces itself. The seam is a `git revert`
away on the day a second kind of request exists, and on that day it will be
extracted against something real.

Also nine signatures spelling `(ids: IdFactory, )`, left behind by a parameter
removed in this morning's change.

---

## What this branch accidentally is: an experiment about the deployment

This morning's change made the three pages **rows in the app's store** (0259
condition 1, #596). Seeding is `create` and never overwrites, which is right —
a page that exists has a history, and a deploy that wrote over it would discard
every change somebody accepted in the portal. Read forward one day it says
something this lane has to plan around:

> **Merging a marketing pull request no longer changes the marketing site.**

`idFor` reads the id off the builder, so an edited builder looks for the same
`t_home1`, finds it, and leaves it alone. The authored page stays in the
repository, is still built in tests and still photographed locally, and is no
longer what a reader is served.

This branch changes all three page trees in a way anybody can see in a second,
so the preview settles a question nobody has asked out loud:

| the preview's bar | what it means |
| --- | --- |
| How it works · **What you run** · Demo · Docs | previews build a store of their own, and only production is frozen |
| How it works · Demo · Docs | preview and production share the database, and no marketing change has reached a reader since 12 October |

**This lane cannot run the experiment itself.** `*.vercel.app` is in neither
allowlist in `.claude/settings.json`, so neither `curl` nor the screenshot
harness nor `WebFetch` can reach the deployment every brief asks us to put in
the pull request. Every preview screenshot in this repository is a local
`--serve` of the same commit, which was the same page until today. Filed, with
two ways out, the cheaper of which is a sentence in `docs/routines.md`.

Both halves are findings rather than fixes. Making seeding overwrite would hand
every deploy the power to discard a governed page, which is exactly the trade
0259 took; [#600](https://github.com/jam-overture/loom/pull/600) looks like the
operation that answers it, and what this lane needs on top of the operation is
one decision about **who presses it**. The recommendation is in the finding and
in the pull request comment.

---

## Tests

`pnpm install && pnpm verify` — **exit 0**, read out of a file written as the
last thing on its line, per `docs/routines.md`.

| | |
| --- | --- |
| `@jam-overture/loom` | 206 files, **4,666** passed, 0 skipped |
| `@loom/app` | 430 files, **8,137** passed, 0 skipped |
| of those, `app/(marketing)` | 49 files, **1,417** passed |
| findings | **1,150**, 0 malformed |
| `prerender:check` | 133 pages, 1,803 junctions, 0 run together |

**+5 assertions**, all in `bar.test.ts`. Each was checked by planting the
defect it is for and watching it go red, and the plants were reverted before
the gate was run:

| planted | what went red |
| --- | --- |
| the front door flagged into the bar | *offers no destination twice* |
| five links written into the header by hand | the count, the ceiling and the destinations test |

No test was weakened and nothing was skipped. The 1,417 figure includes the
five; the route group had 1,412 before.

---

## Findings

**Closed**

- `askHref` / `mechanismHref`, filed 11 October — collapsed here, `askHref`
  surviving, which was the entry's own recommendation.
- The `floors.ts` dead generality, filed 10 October.
- **The gitignored artefact that made `main` red**, filed this morning by
  `Loom portal` and owned by this lane — already fixed by #593. Verified on
  `origin/main` at `03ce8ba` in this container, which has never run
  `pnpm package:primitives`: the gate is green on a fresh clone.

**Filed**

- The page in the repository is no longer the page anybody is served, for
  `Loom framework`, with the *who presses reseed* question.
- `*.vercel.app` is in neither allowlist, for the maintainer.

---

## Two things a next run should know

- **A remote branch could not be deleted from this container.** The first push
  went to `marketing-02-green-on-a-fresh-clone`, named before the work was
  chosen; the branch was renamed and re-pushed, and
  `git push origin --delete` failed twice with `the remote end hung up`. Both
  names point at the same commits and the pull request is on the right one, so
  the stale branch is litter rather than a problem.
- **Nothing is scheduled.** This lane does not watch its own pull request:
  `docs/routines.md` is explicit that a run ends by reporting and exiting.
