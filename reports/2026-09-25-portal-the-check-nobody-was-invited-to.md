# 2026-09-25 — "The check nobody was invited to"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-35-the-check-nobody-was-invited-to` (→ `main`), cut from `main`
at `b2a5176`. Not stacked. **There were no open pull requests in the repository
when this run started**, so there were no maintainer comments on this lane's
work to address and nothing of this lane's to push onto. The last portal report
is 22 September; nothing was filed against this lane in the three days since.

Visuals — a production build of this commit, in a signed-in browser, against
three staged deployments. The links are relative and resolve in the repository;
the pull request links to the same files on `github.com` rather than embedding
them, for the reason in the 22 September finding (this repository is private, so
GitHub's anonymous image proxy returns 404 for everybody including the
maintainer).

| | |
| --- | --- |
| [The front door, with a third question on it](2026-09-25-portal-the-check-nobody-was-invited-to-wide.png) | 1280px — four pages, one of which a checkup can speak for |
| [The same screen on a phone](2026-09-25-portal-the-check-nobody-was-invited-to-phone.png) | 390px |
| [With the runtime's account open](2026-09-25-portal-the-check-nobody-was-invited-to-open.png) | 1280px — the seed, the fold, the snapshot and the summed revisions, one click down |
| [A deployment nothing has been accepted on](2026-09-25-portal-the-check-nobody-was-invited-to-fresh.png) | 1280px — one page, nothing to replay, and the check still worth running |
| [A deployment nothing can be checked on](2026-09-25-portal-the-check-nobody-was-invited-to-nothing.png) | 1280px — the arm that must not read as a milder version of the one above it |

**How the pictures were taken, and the standing finding this half-closes.**
Three memory stores built with the published builders onto
`globalThis[Symbol.for("loom.portal.store")]`, one page in each of them the
portal's own seed rebuilt from the same `sequentialIdFactory("seed")` so its id
and every node id match, and the accepted changes appended through the store's
own `append` — so `6 changes across 1 page` is the store's own count.

**The eighth consecutive run inherited a finding saying the screenshot harness
cannot sign in. It signs in now.** The portal's session is an HMAC-SHA256 over
`v1.<base64url actor>.<issuedAt>` (`_lib/auth/session.ts`), so a session is
minted in nine lines of Node against the same `LOOM_PORTAL_SESSION_SECRET` the
server is started with and handed to Playwright as a cookie. No form is driven,
no throttle is touched, and no sign-in attempt is recorded. The recipe is in the
finding below for whoever needs it next.

---

## What was asked

`docs/rollout.md` names the same exit condition it has named since August — *a
developer using Loom opens the portal daily, because it tells them something
they cannot get anywhere else.* The 22 September report named the next unit in
as many words, under **What I did not do**:

> *"I did not add the sweep to the front door. A line on `/portal` reading 'Does
> everything still add up?' is the obvious next move and is how this screen gets
> opened daily rather than found."*

This run took it. Nothing outranked it: no open pull request, no maintainer
comment, and nothing filed against this lane since.

## The defect

`/portal/checkup/everything` is the most Loom-specific screen in the portal. It
answers, over every page and in one press, whether the pages a deployment is
serving are the pages its own recorded history produces — and it is the one
question in this whole system with **no symptom at all**. A drifted page serves
every request correctly. Nothing throws, nothing is logged, and the broken
behaviour is indistinguishable from the correct one until something replays the
history and says which.

**Nothing on the screen a person opens every morning mentioned it.** You reached
it from the rail, under a noun, if you already knew it was there. A screen nobody
is invited to is a screen nobody opens, which is why the portal's most valuable
answer was also its least-read one.

## What shipped

**A third question on the front door, and an honest answer to it.**

| | |
| --- | --- |
| `_lib/checkup-reach.ts` | new — `PageReach`, `CheckupReach`, `checkupReach`, `ReachReading`, `reachReading`, `reachDetail`, `NOTHING_HAS_CHECKED` |
| `_components/checkup-invitation.tsx` | new — the section: the question, the answer, the reach, the gaps, the press, the account |
| `portal/page.tsx` | the join, from what the screen already holds, and the section last of the three |
| `portal/reading-order.test.ts` | six source guards, the strongest of which is that the fold does not happen here |

### Why it is an invitation and not a verdict

Vercel puts `Ready · 2m ago` on its front door because it stores the result of
every build. **Loom stores no checkup result**, deliberately: the check reads
and writes nothing, so there is no *last checked* and this screen must not invent
one. And it cannot simply run the check — a fold is a walk of a whole accepted
history, which is exactly the cost 0016 introduced the snapshot to keep off a
request path, and it grows for the life of the deployment. A front door that
folded would get slower every day, on the one screen opened every morning.

So the press stays a press, and what the screen carries instead is the **reach**:
what a press could speak for, and what it would cost. Both fall out of what the
screen is already holding — the listing, and the heads it already reads for the
names and the queue. **No read is added**, and `reading-order.test.ts` asserts
there is still exactly one `list` and one `headsOf` on the file.

### The rule the module is mostly made of

> **A page a checkup cannot speak for is never counted among the pages it can.**

The same rule `checkup-sweep.ts` is mostly made of, one step earlier: there it
keeps a check that did not happen out of the green count; here it keeps a page
that cannot be checked out of the promise. Three states, not two, because the
reasons have different remedies and only one of them is about the page:

| | |
| --- | --- |
| `can-be-checked` | the starting shape is on record and the page answered; its accepted changes are what a press would replay |
| `nothing-to-check-against` | this deployment cannot reproduce the shape the page was created with (0028) — a permanent condition |
| `could-not-be-read` | the page would not answer this second — a transient one |

The three counts partition the listing, and that is **asserted** rather than
trusted: it is the test that fails if a fourth reason a page cannot be checked is
added and quietly lands in an existing bucket.

### The fact that is worth the module

**A page whose starting shape this deployment has no record of is silently absent
from every verdict the portal can give.** It passes nothing. It fails nothing.
Nothing anywhere says so — not a log line, not an exception, not a row on any
screen. Until this run the only way to find out was to press the sweep and read
its tally, and you would only press the sweep if you already suspected.

It is also a *configuration* fact and not a page fact, which is what makes it
belong on a front door: the repository holds the builders and cannot know which
stored pages came from them, so the join only exists at runtime. On the
deployment in the screenshots it is three pages out of four.

The sentence says the part a reader would otherwise fill in themselves:

> *3 of your pages have no starting shape on record, so a checkup can't speak for
> them either way. **They are neither passing nor failing — they are simply left
> out.***

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which of the pages they are serving Loom is able to vouch for at all — and
that the answer is not "all of them".**

- **The repository cannot answer it.** It holds the builders that produce a
  starting shape and has never seen the store. Which *stored* pages a host can
  reproduce revision 0 for is a join of code against a live store, and it exists
  nowhere but at runtime.
- **`git log` cannot answer it.** It holds what was applied. A page created by a
  host calling `create` leaves no commit, and it is exactly those pages that have
  nothing to check against.
- **Nothing logs it and nothing throws.** This is the claim worth defending. A
  page with no starting shape is not an error state — every read succeeds, every
  render is correct, and the page is simply missing from a verdict nobody ran. No
  tool goes looking for a fact with no symptom.
- **It is not in Loom either.** The runtime refuses to audit such a tree, which
  is the right behaviour and is a refusal per call. Nothing counts the refusals
  across a deployment, and nothing but this screen says so before you ask.

The secondary fact — the number of accepted changes a press would replay — is
free here and is the first honest answer this portal has given about what a
checkup costs. The checkup screen's own promise was *"it takes a moment"*, and a
moment is not a unit.

## The high-schooler test

Applied to `/portal`'s third section in all three arms shipped.

- **"Is everything still accounted for?"** Passes. Five ordinary words, and it is
  the question rather than the mechanism — `Checkup` is what the rail calls the
  place, which is a noun for a place and not a question a person has.
- **"Nothing here has checked. A checkup runs when you ask for one and Loom keeps
  no answer between times, so this is always a fresh look rather than a result on
  file."** Passes, and it is the sentence a screenshot made necessary — see below.
- **"Loom can check 1 of your 4 pages."** Passes.
- **"A checkup replays everything Loom has recorded about a page and compares the
  result with what people are being served. If the two have drifted apart,
  nothing anywhere fails and nothing is written down — this is what finds it."**
  Passes, and it is the sentence that does the work: it names the two things, says
  they can disagree, and says why nothing else will tell you — without naming
  either of them as a snapshot or a log.
- **"They are neither passing nor failing — they are simply left out."** Passes,
  and it is the clause a reader most needs and would least expect.
- **"It replays 6 changes across 1 page, so it takes a moment."** Passes, and it
  is the answer to *what will this cost me*, which is the question a press raises.
- **"Loom can't check any of your 3 pages yet."** Passes. A bright high schooler
  reads this and does **not** conclude their site is fine, which is the whole
  point of the arm.
- **What do I do now?** *Check every page →*, in every state including the one
  where nothing can be checked — because the sweep is the only screen that names
  *which* pages it cannot speak for, and the sentence says so rather than leaving
  a button with no promise on it.
- **The disclosure** is the one place the runtime appears: the seed,
  `auditSnapshot`, the fold, the snapshot, the summed head revisions, 0016 and
  0028. Exactly one click, never further.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| a front door with two questions — what needs me, what happened without me | three: **and can I trust what I am looking at** |
| the deployment-wide checkup, reachable only from a rail entry reading `Checkup` | a section on the screen a person arrives at, with the press on it |
| (nothing — which pages a checkup cannot speak for had no home outside the sweep's own tally) | on the front door, above the press, as a caveat on the offer |
| *"it takes a moment"*, the checkup screen's whole account of its own cost | the number of accepted changes a press would replay |

**What moved behind a disclosure:** the runtime's account of the same join — that
a page is checkable because a seed for it is registered in this deployment's
source, that `auditSnapshot` folds from it rather than from the page's own
snapshot because comparing a snapshot with itself agrees every time (0028), that
the summed head revisions are the accepted deltas a press would replay, and that
the snapshot is a materialised view of the log (0016) so the cost belongs to the
log rather than to the page. All of it new; nothing was demoted from a surface to
get there.

**What I deliberately did not rename.** `Checkup`, in the rail and the route.
Both are already a person's word for the thing — renamed from `Audit` on
13 September — and this is a third screen under the same noun rather than a new
subject.

## Tests

All numbers are real runs of this commit, from a `pnpm verify` redirected to a
file with its exit code read (the 12 September finding).

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **159 files, 2,999 tests, all passed** |
| Application suite | **302 files, 5,443 tests, all passed** |
| Findings | 766 findings, 0 malformed |
| Prerender check | 109 pages, 957 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on every wide shot, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

**49 tests are new** — 32 on the reading, 11 on the component, and 6 source
guards on the front door (measured as 19 → 25 there).

What each group would catch:

- **The join.** That a page with no starting shape is never counted as checkable,
  and that **its accepted changes are not in the sum either** — a page with forty
  changes and no seed would otherwise make the press promise work it is not going
  to do. That the three counts sum to the listing. That a head missing from the
  map is a read that failed rather than a page with nothing in it.
- **The arms.** Each as its own case, with `checkable === 0` asserted apart from
  the partial arm — the one a later edit collapses, because "some pages can't be
  checked" is true of both. *"Loom can check"* is asserted **absent** from it.
- **Every sentence shown unasked**, through `runtimeWordsIn`, over the whole
  surface of eight readings rather than over a headline — because the sentence
  *under* a headline is where a rewrite leaves a runtime word behind.
- **Both ends of the rule on one render:** the unasked half of the component is
  free of the runtime's vocabulary and the disclosure beside it is full of it.
  That pair is what makes "nothing is ever removed" a property rather than a
  claim.
- **That the check is not run here.** No `auditSnapshot`, no `sweepReading`, no
  `standingOf` on the front door; exactly one `list` and one `headsOf`. This is
  the guard with the most riding on it, because the version of this section a
  later edit reaches for is the one that shows a verdict.
- **That nothing claims to have checked.** The component is asserted free of
  *ago*, *just now*, *Last checked* and *up to date*, and the constant that
  answers the heading is asserted to contain no digit — a version of it that
  varied with the counts would be a freshness by another name.
- **Verb agreement on both sides of one**, on every clause that carries a number,
  on the surface and in the disclosure.

## Three defects a screenshot found, and none of them had a failing test

The fourth consecutive run in which looking at the screen found what the suite
could not. All three are a **pair** of things each correct alone, which is the
only shape this lane keeps finding by eye.

1. **The heading asked a question and the line under it was not the answer.**
   *"Is everything still accounted for?"* over *"Loom can check 1 of your 4
   pages."* The reach was right and the heading was right; what was wrong was the
   position. The two sections above this one each put what they *found* under
   their heading, so that slot is where a reader has been taught to read a result
   — and a reader who reads it as one concludes something has looked. Nothing has.
   `NOTHING_HAS_CHECKED` is there now and the reach leads the card, where it reads
   as the size of the question rather than as its answer.
2. **`"1 of them have a seed registered"`.** A count and a verb disagreeing,
   behind a disclosure, which does not excuse it — the same class of defect the
   sweep's own tests caught twice before it shipped. Every clause in the
   disclosure that carries a number is now pinned on both sides of one.
3. **The no-pages-checkable arm said the same fact twice.** Its own sentence
   already reads *"this deployment doesn't have that on record for any of
   them"*, and the gap below it said so again four lines later. That is this
   screen's own recorded defect — `Nothing is waiting for you.` three lines above
   `You're all caught up.` A gap is a caveat on an offer, so it is now withheld
   from the arm that has no offer and whose own sentence carries it.

## Findings

**Filed one. Half-closed one, the eighth-oldest open item in this lane.**

1. **Half-closed: the screenshot harness can sign in.** The 14, 19, 20, 21 and
   22 September entries each re-filed *"the harness cannot sign in"*. It can: the
   session is an HMAC over a payload the portal composes in the open, so it can be
   minted rather than obtained. Recipe in `FINDINGS.md`. **What stays open is the
   other half and it is unchanged:** the red checkup verdict is still unreachable
   by any sequence of clicks in a deployed portal, which is a product decision
   above this lane's line.
2. **Filed, this lane's own:** `/portal` and `/portal/checkup` now count the same
   pages under two different rules. The front door's reach is over one listing
   page and treats a failed head read as its own state; the chooser on
   `/portal/checkup` lists whatever the store returned in store order and the
   sweep sorts worst-first. Three lists of the same pages, three rules. Filed
   rather than fixed for the same reason the 22 September entry gives about two
   of them: a list of *offers*, a list of *actions* and a list of *results* may
   honestly want different orders, and the argument belongs to the run that takes
   it — but three is enough that it should now be taken rather than noted again.

## What I did not do

**I did not touch `/portal/checkup` or the sweep.** The reach is a new reading in
`_lib` and a new component; neither screen's files are in the diff. A front door
that invites you somewhere should not also rewrite the place it invites you to,
in one branch.

**I did not store a checkup result.** It is the obvious way to put `Ready · 2m
ago` on this screen and it is a change to what a checkup *is* — the check reads
and writes nothing today, and a stored verdict is a new thing in the store with
its own staleness, its own invalidation and its own argument about whether a
portal may write. Worth raising; not worth taking quietly inside a unit about a
front door.

**I did not add a fourth reason a page cannot be checked.** A page the store
lists whose tree has since gone reads as `could-not-be-read` here, which is true
and is the safest of the three — the 22 September report left the same sentence
about the same gap in the sweep, and it is the same argument.

**Nothing is scheduled and no pull request is subscribed to.** The harness
subscribes a session automatically when a pull request is opened; it was
unsubscribed, for the reason the 22 September report gives — three of the first
five events it delivered last time were the Vercel bot editing its own comment,
and a wake per bot edit is exactly the cost that scales with how long the
maintainer is away.

**The staging is gone.** `apps/loom/node_modules/.shot/` held the preload, which
had to sit inside the application for `@loom/runtime` to resolve; it and the
Playwright script were deleted before the gate was re-run, and nothing from
either is in the diff. The recipe is in *How the pictures were taken* above and
in `FINDINGS.md`, for the run that has to build it again.

## Recommendations

1. **One order for one set of pages.** Finding 2 above. Three screens now count
   or list the same pages under three different rules and it is visible to anyone
   who opens two of them.
2. **The sweep's own front-door state, once somebody presses it.** The invitation
   is the reach; the verdict is a screen away. If a checkup result is ever worth
   storing — see *What I did not do* — that is the change that turns this section
   into `Ready · 2m ago`, and it is an escalation rather than a unit.
3. **`copy` on `loom.action`, `loom.button` and `loom.link`**, in
   `Loom primitives`. Carried from the 19 September report, still unfiled against
   that lane by this one and still the cheapest thing on this list.
