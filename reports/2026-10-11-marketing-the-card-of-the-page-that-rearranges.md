# The card of the page that rearranges

**Lane:** `Loom marketing` · `apps/loom/app/(marketing)/` · **Branch:**
`marketing-66-the-card-of-the-page-that-rearranges` · **Section:** §4d

**Preview:** on the pull request. Not opened from this run — `*.vercel.app` is
denied by the environment's network policy, filed on 27 September. Everything
below was measured on a production build served locally, `.next` built
2026-10-11T11:58 by `pnpm verify`.

## What this run did

**A link to this site now unfurls as the verdict the rules reached, on the page
that actually reaches one.** It did not, and it had the two halves the wrong way
round:

| address | the card before today | the card now |
| --- | --- | --- |
| `/?ask=shorter&approve=1` | *"I am in a hurry. Cut this down to the essentials."* | the published front door |
| `/how-it-works?ask=drop-pitch` | *How it works — Loom* | **Refused**, with the rule that refused it |
| `/how-it-works?…&back=1` | *How it works — Loom* | **Waiting for you**, on the putting-back |

The front door announced a request it does not act on. The one page on this site
that rearranges in front of a visitor announced itself as a brochure. Both were
correct on 30 September and wrong from 1 October, when the maintainer moved the
band: *"Remove the see it happen section from the main landing page and only let
it exist in the How it works section."*

## The picture, which is the point of the run

| | file |
| --- | --- |
| **the undo the rules are holding** | `2026-10-11-marketing-card-held-undo.png` |
| the same card on `bold` | `2026-10-11-marketing-card-held-undo-bold.png` |
| a refusal | `2026-10-11-marketing-card-refused.png` |
| the published page | `2026-10-11-marketing-card-published.png` |
| `/?ask=shorter&approve=1`, which no longer claims a rearrangement | `2026-10-11-marketing-card-front-door.png` |
| the page that card opens, so the two can be read together | `2026-10-11-marketing-held-undo-panel.png` |

The first one is a 1200×630 card reading **Waiting for you** / *"Put it back."* /
*"This weighs more than your rules let a request through on its own, so it waits
for a person to say yes."* That is a product declining to undo its own change
until a person says yes, in a channel, before anybody has opened the page. No
competitor can post that card, and until today no address of this site could
produce it.

The last file is the band the card is of, clipped out of the same build. Two
records, the second waiting. The card's three lines are that second record's
three fields, which is asserted rather than described.

**Both palettes, no hard-coded colour**, and the pill tracks the action rather
than the sentiment: the refusal wears the neutral grey, the two that hand the
visitor a decision wear the accent. That rule was already `toneFor`'s and the
card asks the same function.

## Why the card was wrong, and why nothing was red

*Which page runs a request* was written out at four points of use rather than
decided once:

| | said |
| --- | --- |
| `render.ts`, three times | `HOW_IT_WORKS` |
| `site.ts`, twice | `HOW_IT_WORKS` |
| `share.ts`, twice | `route.path === HOME.path` |
| `share-image.ts`, once | `route.path === HOME.path` |

So moving the band meant finding every file that had quietly decided it already,
and two of the four were missed. **A comparison spelled out at the point of use
is a decision nobody can grep for.** It is the same shape as the 9 October
finding, where the reading of an address was copied into each route by hand and
two of four parameters were left behind when the band moved.

There is one name now — `ASKED_ROUTE` in `site.ts` — and the renderer, the
address writer, the words a link unfurls with and the picture it unfurls as all
read it. Planting `ASKED_ROUTE = HOME` turns **155 assertions red**, which is the
measurement of how load-bearing it is.

It is deliberately not a field on `SiteRoute`. `inMenu` is a choice each route
makes and three routes answer differently; this is a fact about the site of which
there is exactly one, and a boolean on every route would invite a second page to
set it.

## The exception is gone rather than moved

The front door kept a `generateMetadata` of its own and the other pages took
`routeMetadata`. The obvious fix was to move the hand-written one to
`/how-it-works`. That would have been the same arrangement pointed at a different
page, and the next time the band moves it would go wrong the same way.

`routeMetadata` reads the **whole address** through `askedFor` — the one reader
every page reads its own address with — and `pageMetadata` drops what the route
cannot use. Both pages are now one line. `announced.test.ts`'s block *"Why the
front door is the one page that may not take the shared factory"* is replaced by
*"every page takes the one factory"*, swept across six addresses rather than
asserted on one.

**One plant did not go red and it is worth saying so plainly.** Giving the front
door back a hand-written `generateMetadata` that reads the ask passes every
assertion in this branch. That is correct rather than a gap: `pageMetadata` is
the gate, so such a page is behaviourally identical to the factory and the suite
is asserting equivalence rather than spelling. It fails `tsc` on an unused
import and nothing else. A lane that wants the *spelling* held would have to
assert on the module's source, which is worth less than what is asserted here.

## What the card was missing: two of the four parameters

`ShareContext` carried `ask` and `approve` and not `back` or `back-yes`, and
`shareImageFor` read the query with four `params.get` calls of its own. So the
picture's own address could not carry an undo, and an address that reached one
drew the change going through — **the state before the thing the link is of**.

It reads the address through `askedFor` now, which is one line of glue
(`Object.fromEntries`) and the only honest place for it: the parameters a crawler
sends are the parameters a visitor sends. The card is `run.undone ?? run.record`,
the last verdict the address reaches.

**The title did not move and that is deliberate.** What a link is *about* is what
somebody asked for; what happened to it is the card's half to report. One title
covers all four states of an address, which was already true of `approve` before
today.

## Measured, through the route modules

Read off the running production build, every string the card's own:

| address | pill | headline | footnote |
| --- | --- | --- | --- |
| `/how-it-works` | — | How it works | — |
| `?ask=drop-pitch` | Refused | *"Hide the menu. I want to read this without distractions."* | 12 pieces taken away, in 1 step. |
| `?ask=unstick-menu` | Waiting for you | *"The menu follows me down the page…"* | 1 setting changed on 1 piece, in 1 step. |
| `…&approve=1` | You said yes | *"The menu follows me down the page…"* | 1 setting changed on 1 piece, in 1 step. |
| `…&approve=1&back=1` | **Waiting for you** | *"Put it back."* | 1 setting changed on 1 piece, in 1 step. |
| `…&back-yes=1` | You said yes | *"Put it back."* | 1 setting changed on 1 piece, in 1 step. |

The two measurements either side of the undo are identical because the change
that reverses a setting change is another setting change on the same piece. That
is what "held on the same grounds" means and it is why `unstick-menu` is the
request this is demonstrated with.

## Three stale things corrected in passing

All three are in files this branch already changed.

1. **`SITE_ROUTES`' doc comment argued the order of a ten-page site**, seven of
   whose pages were retired on 26 September. Fifty lines of real argument about
   adjacencies that no longer exist, in the one file that defines what this site
   is. Rewritten rather than deleted, as the finding asked, with a quoted note
   naming the seven that went. Closes the 7 October entry.
2. **`AskedFor`'s header said *the front door* and gave `/?ask=costs`** as the
   example address.
3. **Three sentences in `render.ts` explained a run made against the front
   door.** The run moved on 1 October; the explanation did not.

## Tests

`pnpm install && pnpm verify` — **exit 0**, read out of a file written as the
last thing on its line.

| | |
| --- | --- |
| `@jam-overture/loom` | 201 files, **4,537** passed, 0 skipped |
| `@loom/app` | 421 files, **7,851** passed, 0 skipped |
| of those, `app/(marketing)` | 46 files, **1,385** passed |
| the same, on `origin/main` | 46 files, **1,346** passed |
| findings | **1,113**, 0 malformed |
| `prerender:check` | 132 pages, 1,755 junctions, 0 run together |

**+39 assertions**, measured by running `origin/main`'s own marketing suite in a
worktree rather than subtracting from memory. Each new one was checked by
planting the defect it is supposed to catch and watching it go red; the plants
were reverted before the gate was run.

| planted | what went red |
| --- | --- |
| `ASKED_ROUTE = HOME` | **155** |
| the factory reads the palette and no request, as `/how-it-works` had it | 7 |
| the picture's address drops `back` and `back-yes`, as `ShareContext` had it | 3 |
| the card reports the change rather than the undo | 3 |
| the front door regrows a hand-written reader of the ask | **0** — see above |

The last row is reported because it is the one that did not behave, not in spite
of it.

## What was not done

- **`askHref` and `mechanismHref` are now the same function under two names.**
  They were two destinations in September and became one when the band moved.
  19 invocations across 8 files choose between them by name, 18 of them
  `askHref`. Filed rather than collapsed: a rename across nine files would drown
  the change it arrived in, and which name survives is a real question. The
  recommendation is in the entry.
- **The hero on a phone**, filed 28 September and owned by `Loom primitives`, is
  thirteen days open. Nothing in this branch touches it.
- **`floors.ts`**, filed yesterday by this lane: three comments argue from a file
  that is not in the tree. Still a second subject.
