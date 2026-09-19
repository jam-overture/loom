# 2026-09-18 — "The pages it could not ask"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-30-the-pages-it-could-not-ask` (→ `main`), cut from `main` at
`ee9cb30`. Not stacked. The only open pull request in the repository when this
run started was `lessons-37`, which is not this lane's, so **there were no
maintainer comments of mine to address** and nothing to push onto.

Visuals — a production build of this commit, in a signed-in browser at
`/portal`, against a deployment of three pages where two of them will not say
what is waiting on them:

| | |
| --- | --- |
| [The front door, two pages that would not answer](2026-09-18-portal-the-pages-it-could-not-ask-wide.png) | 1280px — **the change**: the warning names them |
| [The same screen, every disclosure open](2026-09-18-portal-the-pages-it-could-not-ask-open.png) | 1280px — nothing was removed to make the first one readable |
| [a phone](2026-09-18-portal-the-pages-it-could-not-ask-phone.png) | 390px |

**How the populated pictures were taken.** The recipe this lane filed on 15, 16
and 17 September, with one addition: **both** carriers are filled by the
`--import` preload, not only the hold store. A `memoryTreeStore()` is built with
three pages and assigned to `globalThis[Symbol.for("loom.portal.store")]`, and a
`memoryHoldStore()` with one `HeldProposal` in it — wrapped so that `forTree`
answers `{ code: "unavailable" }` for two of the three ids — is assigned to
`globalThis[Symbol.for("loom.portal.holds")]`. **No markup was staged and no
component was rendered out of context**: the shipped page code ran its real
listing, its real per-page fan-out, the real pairing, the real Next render.

---

## What was asked

Nothing in `FINDINGS.md` outranked the plan and no maintainer comment existed.
The 17 September report's third recommendation was `/portal/checkup`; this run
did not take it, and the reason is in **What I did not do**.

What decided this instead was reading `_lib/waiting.ts` against its own screen:

> ```ts
> readonly unreadable: number
> ```

## What shipped

**The front door names the pages it could not ask, instead of counting them.**

| | |
| --- | --- |
| `_lib/vocabulary.ts` | `unreadableQueue` — a plain sentence per hold-store error code, total over the record |
| `_lib/waiting.ts` | `UnreadablePage`, `unreadablePage`, `unreadableIn`; `Sweep.unreadable` is the pages rather than how many |
| `_components/unreadable-pages.tsx` | new — the named rows, their links, and the store's account under one disclosure |
| `portal/page.tsx` | the two gaps said separately; the pairing called rather than written inline |

### The defect, which is one word long

`/portal`'s queue is one hold read per listed page, because a `HoldStore` offers
no deployment-wide listing. A page that answers an error has always been
*counted* rather than folded into the total — that part was right and is the
thing this screen's whole claim rests on. What it did with everything else about
that page was drop it:

```ts
unreadable: perPage.filter((holds) => !holds.ok).length,
```

`perPage` is `trees.map`, so at the moment that `.length` is taken, **the
failure and the page it happened to are side by side**. The screen then drew a
warning whose one piece of advice is:

> *"if a page you are expecting is missing here, open it from your pages and
> look at it directly rather than taking this screen's word for it"*

— to a reader who had just been told *"One page couldn't be checked."* and had
no way to know which page that was. The advice was impossible to follow, and the
screen had the answer in a local variable one line above.

This is the misreading the brief names by name, in its purest available form:
**information the screen already had, removed to make the screen simpler.**
Naming the pages costs no read that was not already made.

### What a reader gets now

The first screenshot, in full:

> **Waiting on you** — 1 change is waiting for your answer. 2 pages couldn't be
> checked, and they are named below.
>
> **This screen hasn't checked everything.**
> What is listed below really is waiting for you. What is *not* listed is not a
> promise that nothing else is.
> Some of your pages couldn't tell this screen what's waiting on them. They are
> named below — open one and look at it directly rather than taking this
> screen's word for it.
>
> > **Opening hours** `t_hours1`
> > Loom couldn't read what's waiting on this page. Nothing has been lost and
> > nothing has been decided — asking a page what is waiting on it only reads it.
> > *Open this page →*
> >
> > **Pricing** `t_pricing1`
> > … *Open this page →*

### Two gaps that were one sentence

`sweepIsPartial` is true for two different reasons and the notice's lead
paragraph could only be written about the vaguer of them. A page that could not
be read is a **specific page this screen is holding**; a page beyond the
listing's bound is a page nobody here can name. Merged into one sentence, the
first one lost its name.

They are now two paragraphs, each rendered only when it is true. The unnamed one
keeps its "no link out of this paragraph" argument — there is nothing to link
*to* but the list of every page, which is already in the strip at the foot of
the screen.

### Why the pairing is a function

`unreadableIn(trees, perPage)` is in `_lib` rather than inline, and that is not
tidiness. This lane filed a finding on 17 September saying `page.tsx` is a file
no test can reach — it is an `async` Server Component that reads cookies and a
store, so every reading it computes is tested as a function and never as a
*wiring*, and a defect restored by deleting one argument in it leaves the suite
green.

A zip written in that file would be one more of those, and it is the half of
this unit most likely to go wrong quietly: **an index that slips by one names
the wrong page in a warning**, which is worse than the count it replaced and
which nothing on the drawn screen could tell apart from the truth. Five tests
call the same function the screen calls.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which of their pages the portal cannot see the review queue for.**

- **A hold is not in the repository.** It exists in the runtime's hold store and
  nowhere else — no file, no commit, no build output has ever held one.
- **The log does not hold it**, because a held change is precisely the change
  that has not been logged.
- **And this is not the hold.** It is the *absence* of one: the fact that this
  deployment asked a page what was waiting on it and did not get an answer.
  Nothing else in the ecosystem makes that read, so nothing else can report it
  failing. `git log` cannot tell you that your review queue is lying by
  omission; this screen now tells you exactly where.

That last point is the one worth defending. The value is not the error message —
it is that a queue claiming to be complete now says precisely how much of it is
not, **by name**, on the one screen whose whole claim is *this is where you find
out whether anything needs you*.

## The high-schooler test

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

Applied to the two rows in the first screenshot.

- **What happened:** *"Loom couldn't read what's waiting on this page."* Passes —
  no runtime word, and the reassurance a person actually needs is in the same
  sentence (*nothing has been lost and nothing has been decided*).
- **Which page:** *"Opening hours"*, with `t_hours1` under it. Passes, and this
  is the whole unit.
- **What to do now:** *"Open this page →"*, which is a link. Passes.

**The one thing it deliberately does not say** is what went wrong, and that is
the finding below rather than a gap in the wording.

## What I renamed, and what moved behind a disclosure

Nothing was renamed — no route, no heading, no label. Nothing was removed.

| What the screen said | What it says now |
| --- | --- |
| `One page couldn't be checked.` | *One page couldn't be checked, and it is named below.* |
| (nothing — the page was not named) | **Opening hours** `t_hours1`, with a sentence and a link |
| *"a page whose read fails is **counted** rather than skipped"* | *"…is **named** rather than skipped"* |

**What moved behind a disclosure:** the store's own account of each row —
`the holding store is unavailable: connection terminated unexpectedly` — under
one `<TechnicalDetail>` for the list rather than one per row, for the reason the
checkup's difference list gives: the plain sentence is the same sentence on
every row, so a per-row disclosure would hide the only thing telling two rows
apart behind as many clicks as there are rows.

**What went on the surface that could have hidden:** the page's id, beside its
name, by the 22 August rule. Which page is identity, not technical detail.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **153 files, 2,761 tests, all passed** |
| Application suite | **277 files, 4,858 tests, all passed** |
| Findings | 684 findings, 0 malformed |
| Prerender check | 107 pages, 853 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on both wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

19 tests are new — 5 on the pairing, 5 on the row, 9 on the component — and one
existing guard was rewritten rather than deleted. What each group would catch:

- **The pairing (`unreadableIn`)** — a failure names the page at its own
  position rather than the first that failed; every failure is kept rather than
  the first; each row carries its own error rather than one of them twice; an
  answer with no page beside it is dropped rather than named wrongly; an
  all-clear sweep is empty.
- **The row (`unreadablePage`)** — the id and the link; the plain sentence, whole
  and checked against `RUNTIME_WORDS`; the store's account beside rather than
  instead of it; and every one of the three hold-store error codes has a
  sentence, so a silence is impossible by construction rather than by review.
- **The component** — each page is named; the id is kept beside the name; every
  row has somewhere to go; a page with no readable name still gets one; the
  plain sentence is on the surface with every `<details>` removed; the account
  is **not** on the surface, measured by removing the disclosures; the record
  opens once rather than once per row; and the disclosure says what the account
  does not distinguish.
- **The rewritten guard.** `reading-order.test.ts` asserted this screen's source
  contains `!holds.ok` — the failure being noticed, inline. It is not noticed
  there any more, so the guard now asserts the wiring a source read can actually
  see: `unreadableIn(trees, perPage)` and `<UnreadablePages`. Deleting it would
  have been the disarmed-guard failure this lane filed on 8 September.

## Findings

**Filed two. Corrected one that was mine and wrong.**

1. **`HoldError` cannot tell "the store did not answer" from "this deployment
   cannot read a stored hold".** Both arrive as `unavailable`, and they want
   opposite next moves from a reader — wait and retry, or go and investigate.
   The portal now says on screen that it cannot tell them apart, which is the
   honest thing available to it and not a fix. **Framework finding; not mine to
   fix** (0018).
2. **A single unparseable hold fails a page's entire queue read**, by design
   (`parseAll`: "one unreadable row fails the whole listing rather than being
   skipped"). The reasoning is sound and the consequence is now visible rather
   than counted — but it means one hold written by a newer runtime removes a
   whole page from this deployment's queue. Framework's to weigh.
3. **Correction to this lane's own 17 September finding.** It said an unknown
   `disposition.reason.code` reaches `ruleSentence` and draws a headed, empty
   box "across a `DATABASE_URL` written by an older runtime". **That path does
   not exist.** `postgresHoldStore.toHeld` runs `parseHeldProposal`, which is a
   Zod parse including `dispositionSchema`, so an unknown code fails parsing and
   never reaches the lookup. The finding is marked corrected in place rather
   than deleted, because what it *found* — the screen going quiet exactly when
   something is wrong — was real and is what this unit is about. It arrives one
   layer up.

## What I did not do

- **Not `/portal/checkup`**, which was the last report's recommendation. It is
  still the right next unit and the reason for deferring it is that it wants a
  seeded, drifted tree — a fixture of its own — where this one was a defect
  sitting in a file I was already reading, on the screen a developer opens
  first. It is recommended again below, unchanged.
- **No fallback added to `ruleSentence`.** The finding that asked for one was
  wrong about the path (above), and adding a fallback for a case the type system
  and a Zod parse both prevent would be a sentence no reader can reach. If
  finding 2 is answered by skipping unreadable rows rather than failing the
  listing, it becomes reachable and the fallback becomes right — noted there.
- **No change to `/portal/pages`**, which has no such sweep.
- **Nothing in `src/`**, and no file outside `(portal)`.

## The run itself

- **The unit was committed before the screenshots were taken**, per the
  procedure `Loom daily build` filed on 16 September.
- **The screenshot caught a defect in the fixture that no test could have**, for
  the third run running. The first shot read *"Would change `undefined`, but
  that part isn't on this page any more"* — a `LoomNode`'s id field is `id` and
  the preload reached for `nodeId`, so the delta pointed at a node spelled
  `undefined` and the card correctly reported a change that would not apply.
  Fixture's fault; the screen was right.
- **`pkill -f "next start"` was not used** — it kills this run's own shell, as
  this lane's 11 September finding says. `setsid` on the server, and a kill by
  pid from `ps`, is what worked again.
- `/tmp/shot/` is outside the repository; the preload was copied to
  `apps/loom/node_modules/.shot/` only so that `@loom/runtime` resolves, and that
  directory was **deleted before the commit**. Nothing from either is in the
  diff.
- **Nothing is scheduled and no pull request is subscribed to.**

## Recommendations

1. **`/portal/checkup`, and the 13 September standing finding.** Unchanged from
   yesterday and now the only one of the three screens nobody has photographed.
   Its red verdict is unreachable by any sequence of clicks, and it is a screen
   whose entire value is in the bad news.
2. **The ingestion endpoint and the rollup runner in `Loom daily build`**, still
   the whole distance between `/portal/readers` and the reason `docs/signals.md`
   says a developer opens the portal daily. Recommended by the last four reports.
3. **`copy` on the starter library, in `Loom primitives`.** Unchanged from the
   last two reports.
