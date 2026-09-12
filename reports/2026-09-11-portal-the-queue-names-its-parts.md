# 2026-09-11 — "The queue names its parts"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-24-the-queue-names-its-parts` (→ `main`).

**This lane has no open pull request.** #245 merged, and with it #219, #227, #234
and #240 — the ten-unit branch this lane carried since 28 August. So this is the
first run in a fortnight that branches off `main` with nothing of its own open,
and it is one unit rather than a tenth.

Visuals — **real screens from a production build of this commit, in a signed-in
browser, with a live model behind the prompt box and a real held proposal on the
screen.** Every sentence quoted in this report is in one of them.

| | |
| --- | --- |
| [The review queue](2026-09-11-portal-the-queue-names-its-parts-queue.png) | 1280px — the held proposal, in a person's words |
| [The same screen with every disclosure open](2026-09-11-portal-the-queue-names-its-parts-record.png) | 1280px — **nothing removed** |
| [The front door](2026-09-11-portal-the-queue-names-its-parts-front-door.png) | 1280px |
| [a phone](2026-09-11-portal-the-queue-names-its-parts-phone.png) | 390px, `scrollWidth 390 / innerWidth 390` |

**The 4 September hang did not reproduce.** The last run could photograph
nothing, because a request typed into the real prompt box never returned. Today
the same recipe worked twice — one ask applied, one held — with nothing changed
about the environment and `NODE_USE_ENV_PROXY` unset. A plain `fetch` to the
model from Node answered `200` in 736ms before the server was started, which is
the cheap probe worth running first. Filed both ways: what happened, and that
two sightings and one non-sighting is not a pattern anybody can act on yet.

---

## What was asked

**No maintainer comment is open on any portal pull request**, because this lane
has none open. So the plan decides, and the plan's redirection is the
highest-priority thread: *plain language is the default, the technical record is
one click away, nothing is ever removed.*

## The defect

The redirection has been worked through the portal one screen at a time since
18 August. `/portal/history` — what already happened — has read *"Deleted the
card “Autumn arrivals” `n_seed9` and everything inside it."* since 10 September.

**The review queue had not been reached.** On `/portal/pages/[treeId]`, the one
screen in this portal that asks somebody to *decide* something, the held
proposal read:

> Deletes the **loom.band**, and the 4 pieces inside it.
> Adds a **loom.card** inside **loom.band**, just before **loom.heading**.
> Changes the **loom.heading**'s title and width.
> Inside `loom.page › loom.card`

So two screens of one portal named the same part two different ways, and **the
worse of the two was the screen with the buttons on it.** A reviewer pressing
*Apply this change* on the strength of "Deletes the loom.band" is approving
something they cannot check against the page in front of them.

The same screen now reads, verbatim from the screenshot:

> Deletes the prose “This page is a stored tree, rendered thr…” `n_seed4`, and the one piece inside it.
> Deletes the card “Starter Free for personal projects. One…” `n_z7zleqx1zfracjrmp0kz`, and the 4 pieces inside it.
> Inside the page

## The rule this took, and it is one rule with two halves

> **The subject of a sentence is named by what it says. A place is named by what
> it is.**

`part-name.ts` already had the first half — `partNameOf` reads a part's own words
and its type's noun, and pairs them with the id. This run added the second:
`placeNameOf`, which gives *the band*, *the page*, *the body space* and carries
no quotation and no id.

**That split is not tidiness, and the test that pins it is the argument.**
`saidBy` walks the subtree, which is exactly what lets a card be named by the
heading inside it — and exactly what makes the page a change lands in *the page
“Autumn arrivals Free returns”*. **A container's words are its contents' words**,
so quoting a place names the contents while claiming to name the place. The noun
on its own is the part of that reading which is true at every depth.

The id half follows from the same idea. A sentence names *what changed*; where it
sits is an address. One identifier per row is the one the reader needs; one on
every noun is three. This settles, in the direction of "it should stay an
address", the question the 10 September report left open about the parent id on
`/portal/history` — though it does not yet *change* that sentence, which is a
different file and is noted below.

## What an insert can say that nothing else can

A removal's only surviving account is its inverse — that was 10 September's
finding and it is what lets History name a deleted card.

**An insert is the mirror, and the review queue is where it matters.** The node a
proposal would add is not on the page; that is the whole of what an insert
proposes. No walk of the tree can say what is arriving, so the name comes from
the delta the proposal carries. Between the two, there is no moment in a change's
life the portal cannot name:

| | named from |
| --- | --- |
| a part on the page | the tree |
| a part a proposal would add | the **delta**, before anything happens |
| a part a change removed | the **inverse**, after everything has |

The test for it inserts an `acme.price-tag` — a type this deployment registers
nowhere — and gets *the price tag “£42”*. The noun is read from the type, never
looked up, which is the rule `part-name.ts` was written under and the reason a
host's own primitives are spoken about as plainly as Loom's.

## What moved behind a disclosure, and what did not

| | Was | Is |
| --- | --- | --- |
| the sentence | `Deletes the loom.band, …` | `Deletes the band “Prices” n_band, …` |
| the breadcrumb | `Inside loom.page › loom.card`, in monospace | `Inside the page › the card`, in prose |
| **the record** | `delete loom.band — and 4 nodes under it` | unchanged, **plus the labelled path**, which the surface no longer shows |

The second screenshot is that column, open. It reads:

```
delete loom.prose — and 1 node under it
loom.page
delete loom.heading — and 1 node under it
loom.page
delete loom.card — and 4 nodes under it
loom.page
…
judged against revision 2 · this page is at revision 2
```

**Nothing left a screen.** `OperationEffect` carries `label` beside `subject` and
`place` beside `placeNames` precisely so that it could not: the plain reading and
the runtime's are two fields, so a rewrite that dropped one has to delete a
field to do it.

It also caught a defect before it shipped. `technical` was composed as
`` `${verb} ${subject} — ${detail}` ``, and a subject that had become an object
would have printed **`delete [object Object] — and 4 nodes under it`** in the one
place that exists to be exact.

## One sentence turned around rather than reworded

`"Changes the loom.heading's title and width."` hangs a possessive on the
subject. A named part ends in its id, so the same shape gives *"the heading
“Prices” `n_h`'s title"* — which reads as though the identifier owns the setting.

> **Changes the title and width of the heading “Prices” `n_h`.**

The settings come first and the part ends the clause, where a name can be quoted
without tripping over an apostrophe. Same facts, same order of importance, and
`PlainLine` already allowed it — `before`, `subject`, `after` never required the
subject to be near the front.

## The plain-language rule, in one place at last

This lane filed on 2 September that the guard which makes the redirection a
property rather than a taste — *no sentence shown unasked contains a runtime
word, and the technical reading does* — existed in **two** copies. It had reached
**three** by today, the third being a hand-rolled word list in
`effect-view.test.ts` using `toContain` rather than a bounded match, which would
have accused a sentence saying *proposal* of saying `prop`.

`app/(portal)/_test/plain-language.ts` is now the list, read by all three.

- **`_test/` rather than `_lib/`** — a screen must not be able to import the list
  of words it is being judged against and route around it.
- **inside the route group rather than `apps/loom/test/`** — which is what the
  original recommendation said, and would have six other lanes importing a file
  this lane owns.
- **`runtimeWordsIn(sentence)` rather than a regex**, because the failure message
  is the point: `expect(runtimeWordsIn(s)).toEqual([])` names the word that broke
  the rule, where `not.toMatch` only says that something did.
- **`except` is a per-assertion argument, not a second list.** `/portal/history`
  numbers its rows *revision 4*; an exemption that has to be written at the point
  of use is one a reviewer sees.

And it has a test of its own, which is the half that matters: a detector that has
quietly stopped matching passes for ever and reports nothing. Seven assertions,
including that `proposal` and `treatment` are not `prop` and `tree`, and that an
emptied list would be noticed.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to `/portal/pages/[treeId]`, from the screenshot, unaided:

> *Loom wants to delete five things from my page — the intro paragraph, the
> Pricing heading, and all three pricing cards, with everything inside them. It
> stopped and asked me because a change this big isn't something it does on its
> own. It's fairly sure it understood me and says I could undo it. If I say yes
> it makes the change and puts it in the history; if I say no the page stays
> exactly as it is and the request is still in What's been asked.*

Every clause of that is read off the screen. Before this unit, the middle of it
said *"Deletes the loom.prose, and the one piece inside it"*, which answers none
of it.

**Where it correctly stops**, and this is what the screenshot also found: the
rail on the right still reads `loom.page`, `loom.heading`, `loom.card`. One
screen, two names for one part — the sentences are a person's and the index of
the page is not. Filed, with the reasoning for why it is a unit rather than a
rename.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**What a change would do to your page, before it happens, in words you can check
against the page.**

`git log` sees a proposal never. A Loom tree does not live in the repository, and
a *held* proposal is by definition the change that has not been written to the
log either — so it is absent from the diff, the build log, the deploy and the
page as it stands. It exists in exactly one place, which is the queue in front of
the person being asked.

What the portal can assemble there, and nothing else can: the delta carries the
forward side of the change, the tree carries what is there now, and the answer
exists nowhere until the two are read side by side. Today that answer also has
the right nouns in it. **"Deletes the card that says *Starter*, and the 4 pieces
inside it"** is a sentence a person can check by looking at their own page.
`delete loom.card — and 4 nodes under it` is a sentence they can only check by
opening the tree.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — build, typecheck, both suites,
and `next build` across all five route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 124 | 2052 (untouched by this diff) |
| `@loom/app` | 233 | 3874 |

**18 net new tests in 1 new file**, plus additions to four existing ones and a
rewrite of the expectations in three:

- **`_test/plain-language.test.ts` — 7, new file.** The detector against a
  sentence it must catch, one it must not, a capitalised word, punctuation on
  both sides, the `except` path, and that an emptied list would be noticed.
- **`_lib/part-name.test.ts` — +5.** `placeNameOf` over each node kind, and the
  defect it exists for asserted with both readings side by side —
  `partNameOf(page).name` is *the page “Autumn arrivals Free returns”* and
  `placeNameOf(page)` is *the page*.
- **`_lib/proposal-effect.test.ts` — +4.** An insert named from the delta for a
  type registered nowhere; a place named by what it is rather than what is inside
  it; both readings of the path; and the bare-id fallback, unchanged.
- **`_lib/effect-view.test.ts` — +1 net, 15 expectations rewritten.** Every
  sentence asserted whole through `readingOf` and `toBe`, plus a new one pinning
  that the record still says it in the runtime's words.
- **`_components/proposal-effect.test.tsx` — +2 assertions on the breadcrumb**:
  it says *the page › the card* on the surface **and** `loom.page › loom.card`
  inside the disclosure, with `loom.page` absent from the surface entirely.

Three test files were rewired onto the shared list rather than gaining tests:
`audit-view.test.ts`, `checkup-basis.test.ts`, `effect-view.test.ts`.

## Every sentence, before and after

| | |
| --- | --- |
| **was** | `Adds a loom.card inside loom.band, just before loom.heading.` |
| **is** | `Adds the card “Autumn arrivals” n_new inside the band, just before the heading.` |
| **was** | `Adds a loom.card at the end of loom.band. It brings 3 more pieces with it.` |
| **is** | `Adds the card “Autumn arrivals” n_new at the end of the band. It brings 3 more pieces with it.` |
| **was** | `Deletes the loom.band, and the 4 pieces inside it.` |
| **is** | `Deletes the band “Prices” n_band, and the 4 pieces inside it.` |
| **was** | `Deletes the loom.heading, which has nothing inside it.` |
| **is** | `Deletes the heading “Ship faster” n_h1, which has nothing inside it.` |
| **was** | `Moves the loom.card out of loom.band and into loom.grid.` |
| **is** | `Moves the card “Autumn arrivals” n_new out of the band and into the grid.` |
| **was** | `Moves the loom.card to a different place inside loom.band.` |
| **is** | `Moves the card “Autumn arrivals” n_new to a different place inside the band.` |
| **was** | `Changes the loom.heading's title and width.` |
| **is** | `Changes the title and width of the heading “Ship faster” n_h1.` |
| **was** | `Takes away the loom.heading's gap.` |
| **is** | `Takes away the gap of the heading “Ship faster” n_h1.` |
| **was** | `Changes nothing about the loom.heading — it lists no settings.` |
| **is** | `Changes nothing about the heading “Ship faster” n_h1 — it lists no settings.` |
| **was, and still is** | `Would delete n_gone, but that part isn't on this page any more.` — no name could be found, so the sentence is untouched |

## The one line outside the review queue

`app/(portal)/layout.tsx` — the portal's `<meta name="description">`, which is
what a browser tab, a bookmark and a search result show, and the last
unqualified piece of runtime vocabulary the portal said to a person **before**
they had opened anything:

> was: *Inspect, propose and gate changes to a stored Loom tree*
> is: *Review the changes an AI proposes to your pages, before any of them go live*

Included rather than filed because there is no disclosure to move it behind and
nothing to weigh: it is one string, in this lane, and it is the brief's own
example class of defect. Flagged here because it is not the review queue.

## The cross-lane line

`app/(demo)/demo/_components/record-card.test.tsx` is in the diff, and it is the
demo lane's file. The demo embeds the portal's `ProposalEffectView` (deliberately
— the two surfaces must not end up with two answers to "what would this
replace"), so its `ProposalEffect` fixture stopped compiling the moment
`OperationEffect` gained `label` and `placeNames`, and one assertion looked for
an element whose whole text is `loom.stat-grid`, which the review queue no longer
renders. Both are mechanical. The assertion's *intent* — the runtime's word is
behind the click and not in front of it — is unchanged and is now read off the
disclosure's own text, which is the stronger form of it. `pnpm verify` is the
merge gate for four surfaces, so leaving it red was not an option.

## What I did not do

- **`src/` is untouched.** `nodeLabel` is the framework's word for a node and it
  is right for what it is for; the portal's noun is a portal reading of the same
  value.
- **No decision record.** How a portal sentence names a part is a portal
  decision. Nothing here touches the tree schema, the delta model, or an
  Accepted record — **giving a node a name field would**, which is why the name
  is derived and the record is unwritten. Still architectural, still not taken.
- **The outline rail is unchanged**, and the screenshot shows it. Filed with the
  argument for why it is a unit rather than a rename: it is a list of kinds, not
  a sentence, and `PART_KINDS` rather than `placeNameOf` is probably its answer.
- **`/portal/history`'s parent id is still an id.** *"…inside `n_seed2`"*. This
  run settled the *rule* — a place is an address — but applying it there is
  `delta-summary.ts` and a second file's worth of expectations, and one diff
  answering two questions is what makes a diff unreviewable.
- **`/portal/activity` is still unnamed**, for the reason 10 September gave: it
  reads proposals rather than revisions and would need its own head read per row.
- **The container-name crowding is filed, not fixed.** *the card “Starter Free
  for personal projects. One…”* spends its 40 characters on the body and buries
  the heading. The fix is probably "a container is named by its first run", and
  the candidate rules disagree on a card holding two paragraphs, so it wants
  thinking rather than a patch.
- **No screenshot script is committed.** `tools/specimen/` landed (#250) and is
  the right home for a picture of a *tree*; it says itself that it does not
  photograph a running application, and a signed-in portal screen with a live
  held proposal is exactly that. Today's pictures were driven from the scratchpad
  with the recipe in `FINDINGS.md`, and **the repository's lockfile is
  untouched.**
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Nothing blocking.** One unit, off `main`, green, with real screens.
2. **The outline rail is the next thing I would take on that screen** — it is the
   last half of `/portal/pages/[treeId]` still speaking the runtime's vocabulary
   unasked, and the screenshot in this report is the argument for it.
3. **The model was reachable from `next start` today.** If that holds, this lane
   can photograph a real held proposal every run, which is the difference between
   this report and the last one. Worth the 736ms `fetch` probe at the top of any
   run that plans to look at a screen.
