# 2026-09-15 — "What did people do on your pages?"

**Build order section:** §5 — Loom Portal. Step 4 of [`docs/signals.md`](../docs/signals.md).

**Branch:** `portal-27-what-readers-did` (→ `main`), cut from `main` at `546b434`.
Not stacked on anything; no open pull request in this lane.

Visuals — a production build of this commit, in a signed-in browser at
`/portal/readers`:

| | |
| --- | --- |
| [The screen, with something to say](2026-09-15-portal-what-readers-did-wide.png) | 1280px — **the change** |
| [The same screen, every disclosure open](2026-09-15-portal-what-readers-did-open.png) | 1280px — nothing was removed to make the first one readable |
| [a phone](2026-09-15-portal-what-readers-did-phone.png) | 390px |
| [The empty state](2026-09-15-portal-what-readers-did-empty-wide.png) · [on a phone](2026-09-15-portal-what-readers-did-empty-phone.png) | 1280px / 390px — real, unmodified, and what every deployment shows today |

**How the populated pictures were taken, stated plainly.** No counter in them was
put there by a reader, because nothing in this deployment can receive one yet —
see the finding below. The server was started with a preload that builds a
`memoryReaderTallyStore()`, applies a rollup to it, and assigns it to
`globalThis[Symbol.for("loom.portal.readerTallies")]` before the app's own module
memoises one. **No markup was staged and no component was rendered out of
context**: the shipped page code ran its real read, its real grouping, its real
naming out of the served tree, through the real Next render, shell and
stylesheet. The only fiction is who wrote the counters. The empty pictures are
the screen exactly as it serves, with nothing done to it.

---

## What was asked

`docs/signals.md` step 4, *The portal view* — **approved, after 3**:

> App by app: which bands readers reach, how long they stay, which asks they
> open, which they complete, and the funnel pairs the deployment named. Before
> and after a change, because step 1 makes that honest.
>
> **Do not start before step 3 is on `main`.**

Step 3 landed on `main` on 14 September (#295), so the block is lifted and this
is that unit. No maintainer comment has landed on any pull request of this lane,
so the plan stood.

The 13 September report recommended `/portal/calibration` next; that screen had
already become `/portal/trust` on 11 September (#245) and reads plainly today, so
the recommendation was stale and this took its place. The other standing
candidate, `/portal/trees`, remains a route rename as well as a vocabulary one.

## What shipped

A new screen, `/portal/readers`, and the six-part vocabulary and view model under
it.

| | |
| --- | --- |
| `_lib/reader-signals.ts` | the journal and the tally store, on the handle `database.ts` already shares |
| `_lib/reading-view.ts` | every sentence the screen says, as arithmetic a test can assert |
| `portal/readers/page.tsx` | the screen: two reads, three states |
| `portal/readers/_components/page-reading.tsx` | one page, four sentences |
| `portal/readers/_components/since-the-change.tsx` | before versus after a change |
| `portal/readers/_components/part-counters.tsx` | every counter, one click down |
| the rail, and the strip on every scoped screen | `Readers`, and *What did people do?* |

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which part of a page readers actually got to, and what the last change did to
that number.**

This is the sharpest answer this lane has been able to give to that question, and
it is worth being precise about why no other tool can produce it:

- **An analytics product measures a URL.** It has no idea a page is a tree, and
  no way to say *this part*. Loom pages are addressed per node, so reach is
  answerable per part rather than per page.
- **`git log` holds the primitives and not the page.** A Loom page is authored by
  accepted proposals into a store; there is no file whose diff is the change
  whose effect this screen measures.
- **The store holds the page as it is now** and keeps no record of what it did to
  anybody.
- **The counters are kept per revision, and refuse to be added together** — which
  is what makes *the card went from 91 of 412 visits to 201 of 288* a sentence
  rather than an average. The proposal that moved the page from one revision to
  the other is two clicks away in the same portal.

That last one is the whole product. *Before versus after a change* was named in
`docs/signals.md` as the measurement that justifies Loom existing, and it is on a
screen now.

**The honest qualifier**, which is the finding below: nothing in this deployment
can receive a reader's report yet, so today the answer this screen gives every
real deployment is its empty state. The empty state is good — it says what has to
be true and links to the guide — but it is an empty state.

## The high-schooler test

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

Applied to all three states of this screen.

- **Nothing reported yet** — *"No page has reported anything yet."*, then why
  (*measuring is off until you ask for it*), then one action: **How to let a page
  report back →**. Passes. This is the state a new person meets, and it is the
  one thing on the screen.
- **Something arrived and hasn't been counted** — a different title and a
  different sentence in the same box, because *nobody has visited* and *nothing
  has been rolled up yet* send a person to completely different places, and a
  screen that showed the same blank for both would have them hunting for a fault
  in a page that is working.
- **Something to say** — *"Fewest people got as far as the prose “Nothing here
  was written as markup…” — 193 of the 288 visits. If anything on this page is
  worth moving up, it is what sits above that."* A fact, a denominator, and what
  to do about it, in one sentence. Passes.

What a high schooler still cannot do from this screen is tell *why* a part moved.
That is not a wording problem and this screen does not claim to answer it — it
links to the page, whose history says what changed.

## What I renamed, and what moved behind a disclosure

Nothing was deleted.

| The runtime's word | What the screen says |
| --- | --- |
| reader signals | **Readers** in the rail; *What did people do on your pages?* as the heading |
| `viewed` | *got as far as* — with the count and its denominator |
| `dwelled`, in milliseconds | *stayed longest on … about 21 seconds each* |
| `activated` | *was clicked 63 times* |
| `disclosed` | *was opened 47 times* |
| `views` / `reached` per node | *N of the M visits* — never a bare percentage |
| `loom.card`, `loom.prose`, `acme.buy-button` | *the card “…”*, *the prose “…”*, *the buy button “…”* |
| — | the registered type, the exact rate, the raw milliseconds and every counter, in the disclosure |

Two rules this screen took from what the lane already settled, rather than
inventing:

- **A part is named from the page being served**, so it is named by what it
  *says* — the shape `/portal/checkup` settled on 13 September. A part whose node
  has since been removed is named from the noun inside its registered type, via
  `part-name.ts`'s own `nounOf`, so this is not a fourth function that reads a
  type into words.
- **An id stays on the surface beside the name.** 22 August settled that identity
  is not technical detail, and an id is the one thing a reviewer pastes into
  another screen.

And one rule this screen had to decide for itself: **a count on the surface
always carries its denominator, and a percentage never appears there.** Two of
two and two hundred of two hundred are the same rate and different news, and a
portal that printed "100%" for both would make the smallest sample in it look
like the strongest evidence. The rate is in the table, one click down, in the
column next to the denominator it is made of.

## The caveat this screen refuses to hide

`Loom daily build` filed on 13 September that a broadcaster reads the revision off
the root once and goes on filing under it, and named this screen: *"a portal
reading per-revision counters is exactly what would be misled."* It is open, and
it is the framework's — the portal consumes the runtime (0018).

What a consumer can do is refuse to hide it. The comparison block carries *When a
comparison can be wrong about which revision it is comparing*, one click down and
never further, and a test fails if that sentence leaves the component. A
comparison whose caveat is unfindable is a comparison that lies.

## Two defects the first screenshot found

Both were fixed before the pictures in this report were taken, and both have a
test now.

1. **`down 1 points`** — `plainShift` pluralised nothing. It is the sort of thing
   that survives every unit test written by the person who wrote the function and
   is the first thing a reader sees.
2. **The comparison rows had no column.** Name, reading and counts were one
   wrapping row, so the counts sat beside the name on a short row and under it on
   a long one, and the eye had to find the figure again on every line. Two lines
   per reading, always.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green**, exit 0 |
| Framework suite | **149 files, 2,571 tests, all passed** |
| Application suite | **251 files, 4,327 tests, all passed** |
| Findings | 626 findings, 0 malformed |
| Prerender check | 101 pages, 786 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 and 390 vs 390 on every shot |

**Nothing failed, nothing was skipped, and no test was weakened.**

63 tests are new. What each group would catch:

- **Grouping** — two revisions of one page are kept apart rather than added
  together; two pages are kept apart; the order is by reach and is stable across
  two reads of unchanged data, so a screenshot is evidence.
- **Naming** — a part still in the served page is named by what it says; a part
  that has gone is named from the noun in its registered type; a host's own
  `acme.buy-button` reads as *the buy button*, which is what proves this reads the
  registry rather than a table of the types this deployment happens to have; no
  name contains `loom.`.
- **The four sentences** — no laggard is named when every part was reached
  equally or when there is one part, because pointing at a part that is doing
  nothing wrong is worse than saying nothing; dwell is measured per person who
  got there rather than in total, which is asserted by a fixture where the two
  answers differ; nothing clicked is an answer and is absent from the highlights
  so the screen can say it in words.
- **Before and after** — only parts both revisions heard about are compared; both
  counts and both denominators survive to the component; a rise, a fall and a
  standstill each read correctly; `down 1 point`; a part with no views in one
  window is left out rather than shown as a collapse to nothing.
- **The rendered card** — every registered type is absent from the surface,
  measured with every `<details>` removed, and present inside one, measured with
  only them; the raw milliseconds the wording rounded are one click down; the
  revision caveat is one click down and never further; the comparison block lists
  only the compared parts, asserted against the counter table below it which
  legitimately lists them all.
- **The screen** — the runtime's word for a kind never reaches the surface,
  checked against `READER_SIGNAL_KINDS` read from the runtime rather than written
  out, so the approved fifth kind is inside the rule the day it exists; the empty
  state leads somewhere that would end it; the counter read fails the screen and
  the buffer read cannot; the heading comes before the strip and before any
  disclosure.
- **The strip** — the sixth view has a screen, that screen claims it, no two
  screens claim the same one, and the label names neither a route nor a runtime
  word.

## Findings filed

1. **The capture half has no mouth.** `ingestReaderSignals` is called by its own
   test and by nothing else in the repository; there is no route a published page
   can post a batch to, and nothing runs the rollup. The chain from a broadcast
   to a counter is broken in two places, both of them application shell or
   framework rather than portal. Owned by `Loom daily build`. **This is the one
   thing standing between this screen and the daily-open argument in
   `docs/signals.md`.**
2. **A populated portal screen can be photographed without staging markup**, by
   seeding the store's `Symbol.for` carrier from a `--import` preload. Recorded
   as a recipe against the standing 13 September finding, and explicitly not an
   answer to it: it photographs a state, it does not make one reachable.

Nothing was closed. The 13 September finding about unphotographable screens stays
open and now has a fourth screen under it.

## What I did not do

- **No ingestion endpoint and no rollup runner.** Filed rather than built: a
  public write path added from the lane that owns the read path is exactly the
  boundary 0018 draws, and the endpoint's shape is a security question (rate
  limit, size cap) rather than plumbing.
- **No funnels.** `FunnelAnswer` and `funnels()` are read-ready and the screen
  does not show them, because a funnel is *a pair somebody wrote down* and
  nothing in this deployment has a way to write one down yet. A funnel view built
  against no configured pairs would be a section that is empty for a second
  reason, and the plan's phrase — *"the funnel pairs the deployment named"* —
  needs a deployment that can name one.
- **No `completed` kind.** It is step 2, approved, and blocked on the docs lane's
  guide; when it lands, the screen gains a sentence and its guard already covers
  the vocabulary.
- **No change to `StateNotice`.** Its `action` renders after its children, so an
  empty state whose body carries a disclosure puts the primary action below it.
  It is arguable rather than wrong — the action is still last and plainly
  visible — and reordering a component 20-odd screens mount would be a sweeping
  diff, which the brief says not to make.
- **Nothing in `src/`**, and no screen outside `(portal)`.

## The run itself

- **The screenshot recipe worked**, with the one new thing written up above and
  filed rather than left in a scratch directory.
- **Nothing is scheduled and no pull request is subscribed to.**
  `docs/routines.md` and the brief both forbid a follow-up by name.

## Recommendations

1. **The endpoint and the rollup runner, next, in `Loom daily build`.** They are
   the whole distance between a finished screen and the reason `docs/signals.md`
   says a developer opens the portal daily. Everything else in step 4 is built.
2. **`/portal/trees` next in this lane, unless you say otherwise.** It is the
   last route still named after a data structure, and the brief names it first
   among the three. It is a rename as well as a rewrite, which is why it has
   waited; with `/portal/pages` already serving the same subject, most of the
   work is the redirect and the links.
