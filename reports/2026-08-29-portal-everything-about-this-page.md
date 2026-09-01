# 2026-08-29 — "Everything about this one page"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-16-everything-about-this-page` (→ `main`).

Visuals — the real screens, from a production build of this commit, in a
signed-in browser, against a page **a live model actually changed three times
during this run**:

| | |
| --- | --- |
| [The page, with the strip under its name](2026-08-29-portal-everything-about-this-page.png) | 1280px |
| [What's been asked, scoped to one page](2026-08-29-portal-everything-about-this-page-asked.png) | 1280px |
| [What's changed, scoped to one page](2026-08-29-portal-everything-about-this-page-changed.png) | 1280px |
| [**Can you trust it?** — the view nothing had ever linked to](2026-08-29-portal-everything-about-this-page-trust.png) | 1280px |
| [Does it add up?](2026-08-29-portal-everything-about-this-page-checkup.png) | 1280px |
| [a phone](2026-08-29-portal-everything-about-this-page-phone.png) | 390px |

**How honest these are, stated plainly, and this run is the strongest yet.**
`LOOM_ANTHROPIC_API_KEY` is present in this environment, so nothing was staged.
Three requests were typed into the real prompt box against the seeded tree —
*"Change the heading to say Autumn arrivals"*, *"Make the intro paragraph warmer
and mention free returns"*, *"Delete the card and everything in it"* — and every
sentence in every screenshot is what the portal wrote about what actually
happened to them. Two were applied by the Gate on its own; one was held and is
sitting in the review queue in the first picture. The calibration verdict in the
trust screenshot is a real verdict over those three asks.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #169, #177 and #185
carry only the deployment bot's comments and my own. So the plan decides, and the
plan's list of where the value is names *"the review queue"*, *"calibration"* and
*"history"* — all of which exist, and two of which #169 and #177 have already
rewritten.

What this run found is not another screen in the runtime's voice. It is that
**the portal is organised by screen, which is how it is built rather than how
anybody uses it.**

## The finding this unit is a fix for

A person does not think *"I will visit the Trust route and add a tree
parameter."* They think *"this page — what has been asked of it, what has changed
on it, can I believe what the AI says about it, does it still add up."*

All five of those answers already existed. **Four of them could only be reached
by editing a URL.** The sharpest case:

> **`/portal/trust?tree=…` has read a `tree` parameter since the day it was
> written, scopes its entire fold to it, and nothing in the portal has ever
> linked to it.**

A working view nobody can reach is indistinguishable from one that does not
exist — and it was the one view answering the question no other tool can:
whether the AI's confidence has held up **on this page**, rather than across
everything the deployment has ever done.

And a second defect underneath it, on all four scoped screens:

> **They narrowed everything they showed to one page and said so nowhere.**
> `/portal/activity?tree=t_seed1` was headed `Activity` over *"Everything anyone
> has asked Loom to change"* — the deployment's claim, printed over a filtered
> list. The only thing on screen that hinted at the filter was a "Show every page
> →" link in the corner, which a reader can only read as a clue *after* they have
> been misled. A list that hides rows without saying so is worse than one that
> shows none.

## What shipped

**One strip, on all five screens, naming the five things the portal can tell you
about one page.** It sits under the heading and its sentence, never above them:
reading order is *what am I looking at* → *what else can I look at* → the thing
itself.

| | |
| --- | --- |
| **The page** | `/portal/pages/t_seed1` |
| **What's been asked** | `/portal/activity?tree=t_seed1` |
| **What's changed** | `/portal/history?tree=t_seed1` |
| **Can you trust it?** | `/portal/trust?tree=t_seed1` — **reachable for the first time** |
| **Does it add up?** | `/portal/checkup?tree=t_seed1` |

### Why the labels are questions and the rail's are not

The rail's labels stay nouns — `Activity`, `History`, `Trust`, `Checkup` — because
a rail is a list of places and a noun is what names a place. A strip scoped to one
page is not a list of places; it is a list of things you might want to know about
the page in front of you. So each label is the question its screen answers, and
two of them are word-for-word the heading a reader lands on. A link that says what
you will get is the whole of why somebody clicks it.

### Every scoped screen now says which page it is showing

| Screen | Was | Is |
| --- | --- | --- |
| `/portal/activity?tree=` | `Activity` · "Everything anyone has asked Loom to change, newest first…" | "Everything anyone has asked Loom to change on `t_seed1`, newest first…" |
| `/portal/history?tree=` | `History` · "…made to **this page**", with the id in the corner as a link | "Every change that has actually been made to `t_seed1`…" |
| `/portal/trust?tree=` | `Can you trust the AI?` · the deployment-wide sentence, unchanged when scoped | "…how those claims have held up on `t_seed1` **alone**, rather than across everything this deployment has ever done." |
| `/portal/checkup?tree=` | `Does this page add up?` with a bare monospace id in the corner doing double duty as a link | "Whether `t_seed1` is still exactly the page its own history says it should be." |

### Five wordings for one idea became one

Each scoped screen had its own way out of the scope and no two agreed: **"Show
every page →"**, **"All pages →"**, **"← Pick a different page"**, **"Check a
different page"**, and on the page screen, **"Everything ever asked of this page
→"** for a destination another screen called **"What was asked for →"**.

It is **"Every page →"** everywhere, and it resolves against *the view being
left* rather than always to the page list — which is what makes the phrase true.
A reader leaving one page's history wants every page's history; sending them to a
list of pages answers a question they did not ask.

### Where the words live

- **`_lib/page-views.ts`** — the five views, their labels, their hrefs, the way
  out, and the four scoped lead sentences. It decides nothing about layout.
- **`_components/page-views.tsx`** — the strip.
- **`_components/plain-sentence.tsx`** — a `PlainLine` rendered. Small, and it
  closes a real hole: `PlainLine` named the three pieces and `readingOf` made the
  join assertable, but every component that met one still spread it by hand. A
  line can be perfectly assembled and the component can still drop `after`, and
  nothing fails. It has a test that asserts what it renders reads exactly
  `readingOf(line)` — the same sentence, checked at the other end.

## Two defects a screenshot found and the tests did not

Consistent with every run since 20 August; **twelve across seven runs** in this
lane's own count.

1. **The page's name was printed four times on a scoped Activity** — once in the
   lead sentence, once on the strip's "The page", and again in the corner of
   every card. On the unscoped screen that corner link is what tells one row from
   the next; on a scoped one it is the same id, five times, none of the printings
   telling a reader anything the one above it did not. `EpisodeCard` takes
   `scoped` now. **Only the repeat goes** — the id is still in the card's own
   technical record, and the page is still one click away on the tab whose whole
   job is being that click.
2. **The way out came loose on a phone.** `ml-auto` at every width put "Every page
   →" alone on a line of its own, at the far right, reading as something that had
   fallen off the strip rather than as its last item. `sm:ml-auto` — below `sm` it
   simply follows the tabs.

Neither is a bug a browser could not have shown in three seconds. The 23, 24 and
25 August recommendation — that a screenshot at two widths belongs in
`docs/routines.md` rather than in this lane's habit — stands, and I am not
restating the argument a fifth time.

## Tests

`pnpm install && pnpm verify` **green** — typecheck, both suites, and `next
build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 (untouched by this diff) |
| `@loom/app` | 137 | 1991 |

**28 net new tests**, in four files, three of them new:

- **`_lib/page-views.test.ts` — 17, new file.** The hrefs, the order, exactly one
  view marked current from every starting point, and a label check that fails on
  `tree`, `audit`, `calibration`, `revision` or `delta`. Then three groups that
  earn their place:
  - **Every view points at a route that exists**, checked against the filesystem
    the way `nav-items.test.ts` checks the rail — with the dynamic segment mapped,
    since `/portal/pages/t_seed1` is served by `[treeId]`. The rail got that test
    after three of its four items were found pointing at 404s.
  - **The scoped leads read as one sentence.** `readingOf` and `toBe`, never
    `toContain` on a half — a `before` that has lost its trailing space still
    satisfies every `toContain` anybody would write and renders `…to change
    ont_seed1`.
  - **The check the wiring cannot forget.** Five screens have to render the strip,
    each has to claim a different one of the five views, none may hand-build a
    scoped link to another view, and the strip must come after the heading. None
    of that is visible from any one screen's own tests, and it is exactly the
    failure that left `/portal/trust?tree=` unreachable for as long as the screen
    has existed.
- **`_components/page-views.test.tsx` — 5, new file.** Including the labels
  asserted as a whole list rather than by substring, and that the current view
  stays a link — a tab that becomes dead text on arrival cannot be re-followed,
  which is how somebody reloads a screen after answering a change on it.
- **`_components/plain-sentence.test.tsx` — 3, new file.**
- **`episode-card.test.tsx` — 3 new (12 → 15)**, the defect above, asserted
  through the file's own `unasked` helper so that "stopped repeating it" cannot be
  satisfied by removing it from the record too.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to all five screens this run, since the strip is on all five. From the
first screenshot, unaided: *This is my page t_seed1. Two changes have been made to
it. One more is waiting for me — the AI rewrote the intro to mention free returns,
it says it isn't certain, and it stopped to ask because it was sure enough to
suggest and not sure enough to do on its own. I can apply it or say no thanks. And
along the top I can see what's been asked, what's changed, whether I can trust it,
and whether it adds up — all about this page.*

From the trust screenshot: *The AI has been harder on itself than it needed to be.
Changes went through more often than it predicted, so I'm probably being asked
about changes that didn't need me, and it's worth loosening a rule.*

Where it stops, correctly: `t_seed1`, `n_seed9`, `loom.card`, `revision 2` —
names.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which of your pages the AI is worst at.**

Calibration across a deployment is a number about the model. Calibration scoped to
one page is a number about *that page* — and the two come apart for a reason
nothing outside Loom can see: a page whose primitives are unusual, or whose
policy floors are tight, produces a different confidence distribution from the one
next to it. The portal has been able to compute that since `/portal/trust` was
written, and today is the first day anybody can get to it.

The rest of the strip is the same argument at lower intensity. `git log` can tell
you a file changed; it cannot tell you that on **this** page, three requests were
made, two went through unattended, one is waiting on you, the AI's confidence has
been running low, and the history still folds to the page being served. Every one
of those five facts is about the same object, and until this run the portal made
you assemble them by hand from five screens that did not know about each other.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it.
- **No decision record.** How a portal screen navigates itself is a portal
  decision; nothing here touches the tree schema, the delta model, or an Accepted
  record.
- **No count on "The page" tab.** A badge saying how many changes are waiting is
  the obvious next thing and it is deliberately absent: holds live in a `Map` on
  `main`, so on a serverless deployment the count would be `0` on every tab on
  every screen. **#169 is the fix and it is unmerged.** A count that is always
  zero is worse than no count. Worth adding the day #169 lands.
- **Nothing on `/portal/pages` (the list).** The rows could carry the five views
  each; they would be twenty-five links on one screen. The list's job is picking a
  page.
- **No follow-up scheduled.** Token discipline.

## One thing I carried across a lane boundary, again

`apps/loom/app/(marketing)/_lib/copy.ts` says `decisions: "94"`; `decisions/`
holds 95. **`pnpm verify` — the merge gate for four surfaces — has failed on
`main` since #165 merged on 27 August**, so this branch carries the same one-line
bump #169 and #177 already carry. It is in its own commit, and
[#174](https://github.com/jam-overture/loom/pull/174) deletes the literal outright
and is the better answer: take its side of that file wholesale if it merges first
and drop the commit.

## Recommendations

1. **Merge #174.** It ends a finding filed six times and unblocks four surfaces.
2. **The queue is the problem now, not any pull request in it.** Nothing has
   merged since #167 on 25 August and there are twenty-five open. Every lane is
   cutting from a `main` four days stale, this branch is the fourth consecutive
   portal unit that cannot see the previous three, and the no-stacking rule turns
   that into certain conflicts rather than possible ones. Filed in `FINDINGS.md`
   with the arithmetic.
3. **Nothing blocking.**
