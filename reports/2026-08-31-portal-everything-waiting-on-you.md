# 2026-08-31 — "Everything waiting on you"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-18-everything-waiting-on-you` (→ `main`).

Visuals — the real screen, from a production build of this commit, in a signed-in
browser:

| | |
| --- | --- |
| [The front door, with two changes waiting](2026-08-31-portal-everything-waiting-on-you.png) | 1280px |
| [the same screen with every disclosure opened](2026-08-31-portal-everything-waiting-on-you-open.png) | 1280px |
| [a phone](2026-08-31-portal-everything-waiting-on-you-phone.png) | 390px |
| [nothing waiting, which is what most days look like](2026-08-31-portal-everything-waiting-on-you-caught-up.png) | 1280px |
| [the page screen, where the change is actually answered](2026-08-31-portal-everything-waiting-on-you-answer.png) | 1280px |

**How honest these are, stated plainly.** The screen, the stores, the read path
and the components are all real, and the sign-in is the real sign-in. The two
held changes in the pictures were **put into the hold store through its own
public `hold` contract by a temporary, env-gated patch to `_lib/write.ts`**,
because there is no `ANTHROPIC_API_KEY` in this run's environment and a queue
cannot be populated through the UI without one. The patch was reverted before
committing and `write.ts`'s committed diff is the two-line store branch and
nothing else. This is the same workaround as 25 and 30 August, described for the
third time, which is itself the argument for `LOOM_SEED_LOG`.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #185, #193 and #201
carry only the Vercel bot and my own comments. So this run is chosen from the
plan and from the findings queue.

**Three portal pull requests are open and unmerged, and `main` has not moved
since #167 on 27 August.** That is the fourth consecutive unit built on a `main`
that cannot see the previous ones, and it decided *what* this unit is: I picked
work whose files no open portal branch touches. The one exception is
`FINDINGS.md`, which every branch appends to.

## What shipped

### The portal had no front door

`/portal` was seven lines:

```tsx
const Home = () => { redirect("/portal/pages") }
```

So a reviewer signing in was answered with a **list of the places a change might
be waiting**, and finding out whether anything needed them meant opening every
page in turn and scrolling past a preview and a prompt box to reach the queue
inside it. The review queue has existed since day one and has always been a
section of a page screen — the right place to *answer* a change and the wrong
place to *find* one.

`/portal` is now a screen whose subject is the one thing in Loom that is
genuinely urgent: **every change waiting for an answer, on whichever page it is
waiting.** Oldest first, because a queue is ordered by how long something has
waited and not by which page it happens to sit on. `DEFAULT_LANDING` is
`/portal`, and the rail leads with **Waiting on you** — the only nav label that
is a sentence about the reader rather than a name for a thing.

### The two sentences the portal had never said

The brief's first value item is *"the review queue — what is waiting, why, and
**what accepting or refusing it would do**"*. The card had the first two and had
never had the third. It described the *change* and never the *answer*, and those
are different questions: `ProposalEffectView` says what would happen to the page,
and a person hovering over two buttons wants to know what they are about to set
in motion.

Both cards now carry, above the buttons:

> **If you say yes** — Loom checks its rules once more, then makes the change and
> writes it into the page's history — where you can undo it.
>
> **If you say no** — The change is thrown away and the page is left exactly as
> it is. What was asked for stays in Activity, so nothing is lost.

Three things make those true rather than merely reassuring, and all three are
properties of the runtime:

- **Yes is permission, not an override.** `confirmHeld` re-runs the Gate against
  the tree as it is at that moment, so a change can still be refused after
  somebody says yes. *"Checks its rules once more"* is the accurate description
  of that, not a hedge.
- **Yes is undoable exactly when the Gate said it was.** Where `reversible` is
  false the sentence reads *"This one can't be undone afterwards."* That is the
  most consequential fact on the card and it was a `reversible no` pair one click
  down.
- **No keeps the record.** A discarded hold leaves the ask in the journal (0023),
  so "nothing is lost" is a claim about the record.

They come from `answerOutcomes` in `_lib/waiting.ts` and are rendered from there
by both screens, so the queue and the card cannot describe the same two buttons
differently. The test on the page card asserts against `answerOutcomes(…)` rather
than against a copy of the wording — a test that pinned the string would have let
the two screens drift while both stayed green.

### A waiting change could not survive a restart, on any deployment

This is the half of the unit that is a defect rather than a screen, and it is the
framework routine's 23 August finding taken exactly as written.

`_lib/write.ts` built `memoryHoldStore()` **unconditionally**. `postgresHoldStore`
has existed since 0088, `scripts/db-push.ts` has been creating `loom_holds` on
every deployment all along, and the write path simply never asked for it. So a
deployment with `DATABASE_URL` set had a durable log and a queue in process
memory — and on a serverless host that is not a restart, it is the next request.

```ts
portalDatabase === undefined ? memoryHoldStore() : postgresHoldStore(portalDatabase)
```

**Why it stayed invisible is the part worth keeping.** Every other
absent-configuration fallback in this portal degrades into something
recoverable — no model means the prompt box says so, no database means the log
lives in the process. A held change is the only object in Loom with **no second
copy**: it has been accepted into nothing, which is what a hold *is*. The
fallback being identical in shape to the safe ones is exactly what hid it. And
nothing on any screen said it, because until this run there was no screen whose
subject was the queue for the sentence to be wrong on.

`holdsAreDurable` is a separate export from `storeIsDurable`. They have the same
value today and they are not the same claim, and `/portal` says which of the two
stores this deployment is running.

### What got renamed, in full

| Was | Is |
| --- | --- |
| `/portal` → `redirect("/portal/pages")` | **Waiting on you**, a screen |
| `DEFAULT_LANDING = "/portal/pages"` | `DEFAULT_LANDING = "/portal"` |
| (no nav entry) | `Waiting on you`, first in the rail, `exact` |
| (nothing) | `2 changes are waiting for your answer, across 2 pages.` |
| (nothing) | `If you say yes` / `If you say no`, on both cards |
| `reversible no`, a monospace pair one click down | `This one can't be undone afterwards.`, above the button |
| `Changes here won't be kept · Set DATABASE_URL to make writes durable` | `Changes waiting here won't survive a restart.` + *Why a waiting change is the most fragile thing in Loom* |
| (a hold's `utterance`, unshown) | the sentence somebody typed, leading each row |
| (a hold's `heldAt`, unshown) | `waiting since 30 August 2026 at 14:12 UTC` |

**Names stay on the surface.** `t_seed1`, `p_seed1`, `confidence-below-minimum`
and `user-instruction` are all still in front of a reader who opens *How Loom
decided this* — nothing was dropped to make the screen simpler, and the
disclosure says so.

## Two defects a screenshot found, and eighty tests did not

Consistent with every run since 20 August. The count is **fourteen across nine
runs**.

1. **Two black buttons on a screen where nothing affirms anything.** The first
   draft used `bg-affirm` for *Look at it on the page →*, copied from the page
   list's *Try the demo*. The portal's palette says in a comment that the single
   filled black shape on a screen **is** the affirmative action — so the screen
   had two of them, on cards whose other reading is "Apply this change", on the
   one surface whose entire purpose is that nobody approves a change without
   looking at it. It is the outlined `neutral` action now. **No assertion could
   have caught this**: every test of that link passed, and what was wrong was
   what the colour promised.
2. **"Your pages →" twice, six lines apart.** On the caught-up state the empty
   state's action and the strip below it were the same link. Each half was
   correct on its own; the pair was not, and only the whole screen has a pair.
   The caught-up action is now *Has the AI been getting it right? →*, which is
   the genuine next question when nothing needs answering, and the strip is
   withheld entirely when there are no pages, because both its links then lead to
   empty screens.

**The second one is now a test**, and it is the more interesting of the two
because it is checkable. `reading-order.test.ts` extracts the hrefs of each
mutually-exclusive empty-state branch, adds the strip's, and refuses a repeat. I
reintroduced the defect to confirm the guard fails on it, and it does.

## One thing I deliberately did not build

**The queue does not let you answer a change from it.** No Apply button, no No
thanks — the card's one action is a link to the page.

That is not a limitation worked around. The `/portal` screen is assembled from a
list of holds across every page and has read no trees, so it cannot say what any
of these proposals would *replace*; the page screen can, because it rendered the
tree and the reader is looking at it. A "before" that is not on the reader's
screen is worse than no before. Answering a change from a screen that cannot show
you the change is exactly the quick approval 0019 exists to prevent, so the front
door does triage — what was asked, why it stopped, what either answer would do —
and hands the reader to the one place the question can be answered properly.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

**Yes.** From the first screenshot, unaided: *Two changes are waiting for me. Ana
asked for one of them yesterday — the AI wasn't sure enough to just do it — and
if I say yes I can undo it afterwards. The other one my site asked for by itself
this morning, and that one can't be undone once it's done, so I should look at
that page before I agree to it.*

Where it stops, correctly: `t_seed1` — a name.

## What this tells a developer that they could not get elsewhere

**How much is waiting on them, and what each answer would set in motion.**

A hold exists because the Gate declined to decide alone. It has not been accepted
into a log, it is not in the repository, it is not in a build output, and `git
log` has never seen one — it lives in the runtime's hold store and nowhere else.
It is the only thing on a Loom deployment that is waiting on a human being, and
until this run there was no screen that could tell you how many there were
without visiting every page.

The second half is sharper and is the one I would defend hardest: *"if you say
yes, this can't be undone afterwards"* is a fact about a **specific proposal**
computed by the Gate at the moment it judged it, and there is nowhere else it
exists. A repository can tell you what a change did after the fact. Nothing else
can tell you, before you press anything, that this particular one is a door that
only opens one way.

The honest weakness: on a fresh deployment this screen says *"You're all caught
up"*, which is true and is what most days look like. That is the right thing for
it to say, and it means the screen is at its most valuable on the days it is
least pretty.

## Tests

`pnpm install && pnpm verify` **green** — build, typecheck, both suites, and
`next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 111 | 1741 (untouched by this diff) |
| `@loom/app` | 137 | 2001 |

**38 net new tests**, in eight files, three of them new. Each count below is the
file's own, measured against `origin/main`:

- `_lib/waiting.test.ts` — **16, new file.** Both answer sentences including the
  irreversible branch, the reading of the moment rather than the timestamp, the
  origin/actor split, oldest-first ordering, that ordering does not mutate its
  input, and the summary asserted **as a whole sentence** rather than as two
  halves — the 24 August lesson, applied to a string built from three pieces.
- `_components/waiting-card.test.tsx` — **6, new file**, including the one that
  says the card offers no button and only a link, and the one that removes the
  `<details>` and asserts no rule code survives in front of the reader.
- `portal/reading-order.test.ts` — **7, new file.** The fourth guard of this
  shape. Includes the two that earn their place: that neither empty state is a
  dead end, and the duplicate-destination check described above, which I
  falsified deliberately before keeping.
- `guarded-pages.test.ts` — **1 new (5 → 6)**, and a list one entry shorter. See
  below.
- `held-proposal.test.tsx` — **3 new (7 → 10)**, including the assertion against
  `answerOutcomes` rather than against the wording.
- `nav.test.ts` (**1 new, 6 → 7**) and `nav-items.test.ts` (**2 new, 4 → 6**),
  covering `exact` and the property that produced it: any nav href that is a
  prefix of another must declare itself exact, or it lights up on every screen
  below it.
- `_lib/auth/paths.test.ts` — **2 new (10 → 12)**, pinning where a fresh sign-in
  lands and that it is not a public path.

### The test that found something on its own

`/portal` was on `guarded-pages.test.ts`'s `UNGUARDED_BY_DESIGN` list with a
correct reason — it was a redirect, it rendered nothing, and `requireActor` would
have gated a page with no content to protect. **Turning it into a screen made
that reason false, and the exemption had no way to notice.** What noticed was the
assertion beside it, which says an exempt page may not import the store, the
write path, the journal or the database: it failed on the first run and named the
file.

The lesson is not "remember to update the list". It is that an exemption should
carry an assertion of the property it was granted for, so the day the property
stops holding is the day the suite goes red. There is one more of those now:
every remaining exemption is checked to contain `permanentRedirect(`.

## What I did not do

- **`src/` is untouched.** Everything this run needed was already exported —
  `postgresHoldStore` had been reachable from this lane since 0088.
- **No decision record.** Choosing a store implementation at a seam the runtime
  built for it, and deciding what a portal screen says, are both portal
  decisions. Nothing here touches the tree schema, the delta model or an
  Accepted record.
- **Hold expiry.** Now that holds are rows, a proposal nobody returns to waits
  indefinitely — the framework routine's 23 August entry, owned by the
  maintainer, and a policy question rather than a portal one. Nothing has
  accumulated, because until this commit holds died with the process.
- **A count badge on the rail's new entry.** It would need a store read in the
  layout, on every screen. Noted, not built.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge something.** Thirty-three open across seven lanes when this run
   started; nothing merged since #167 on 27 August. This is the fourth
   consecutive portal unit that cannot see the previous three, and the effect on
   the work is no longer hypothetical — I chose this unit partly because its
   files are untouched by #185, #193 and #201, which is a worse basis for
   choosing than the plan. **My recommendation is unchanged: one per lane, oldest
   first.** I have filed the arithmetic and will not restate it.
2. **`main` was red again on `FACTS.decisions`** — seventh occurrence, fifth
   consecutive portal run carrying the same one line across a lane boundary. Own
   commit, droppable. Filed with one new detail worth reading: this run initially
   *misread* `main` as green, because `pnpm verify | tail -60` reports `tail`'s
   exit status and not the build's. Every routine reads that number to decide
   whether it may open a pull request.
3. **`LOOM_SEED_LOG` is seven runs overdue** and is still one word from you. This
   report has now described the temporary-patch workaround for the third time.
4. **Nothing blocking.**
