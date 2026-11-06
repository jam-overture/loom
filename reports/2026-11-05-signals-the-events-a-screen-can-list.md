# Reader signals — the events a screen can list

**Run:** `Loom signals`, 5 November 2026 (evening)
**Branch:** `signals-75-the-events-a-screen-can-list`
**Step:** §75 of [`docs/signals.md`](../docs/signals.md)
**Record:** [0355](../decisions/0355-the-events-a-screen-lists-are-one-row-per-signal-and-one-page-view-is-read-on-a-key-the-caller-already-holds.md)

## The one thing to read first

**This unit makes the portal read the `view` key, and one clause of
[0146](../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)
said nothing in the portal would.** 0146 is the privacy record — it is where
rules 1 and 2 of the plan come from — so this is said at the top rather than
buried in a consequence.

The clause that goes is exactly this one: *"Nothing in the portal reads it;
nothing joins on it."* The drawer in `docs/portal-wireframes.md` shows the key
and lists *the rest of this page view*, so a handle that can draw it reads the
key and joins on it, once.

**It goes because
[0349](../decisions/0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)
does not leave it standing, not because this lane reweighed 0146.** The
maintainer settled on 5 November that deliveries are kept for thirty days *so
that an operator can look at the ones their totals were made from*, and took it
for that exact tab with that exact drawer, with the wireframe approved. 0355
says which clause it overturns and which four stand, and the four that stand
are the ones carrying the argument — anonymity, correlation scoped to one page
view, a funnel as a question about the tree, retention as configuration.

**What is actually new is narrower than the clause makes it sound**, and it is
the half worth checking: the correlation is now enforced by a signature instead
of by a convention. `pageView(key)` takes one key the caller already holds, off
a row it could already see. There is nothing that lists keys, and nothing that
takes a row and asks *what else shares this one's key*. Those are the two
shapes that would make stitching cheap, and neither is reachable.

**If you would rather the drawer did not show it at all**, the panel is one
method on one handle and the list does not depend on it. That is in *Needs your
input* on the pull request.

## What was completed

§74 left one thing and this is it: the **scoped reading handle** over the kept
deliveries, which is the fourth of the four things `Loom portal` asked the
intake for this morning and the only one that did not land.

- **`apps/loom/app/_lib/reader-signals/events.ts`** — `readerEventsFor(applicationId)`,
  scoped the way `readingsFor` is, with every read bounded **inside the handle**
  rather than at the call site. The *Signals* screen bounds the journal where it
  reads it, because the door *writes* through that same handle and a write cut
  off by a screen's budget would lose a reader's batch; this handle only reads,
  so the budget belongs where a screen cannot forget it.
- **A row is a signal, not a delivery.** A delivery carries one signal to
  hundreds, and the screen's columns are *time, kind, page, part, version*. The
  signal is carried **whole** — `event.signal` is the closed five-kind union, so
  `ms`, `open` and `within` stay typed per kind — beside the delivery's facts:
  an opaque `id` for `?event=`, `receivedAt`, `sentAt`, `treeId`, `revision`,
  `audienceId`, `view`, `countedAt`.
- **`ReaderSignalReadRequest.view`** — one filter on the store's read request,
  in both implementations, with a sixth contract suite over it and a second
  partial index in `migrate.ts`.
- **Exact pages, with a cursor the store could not hand out.** Fifty events can
  end inside a delivery of sixty, and no `ReaderSignalPage` names a position
  inside one. The handle's cursor is `[the store's cursor, events already
  shown]`: *resume this chunk and skip what has been drawn*.

## Decisions taken that the step did not specify

**A page costs at most two reads, and that is why the cursor has this shape.**
The alternative designs each failed on one number. Paging by delivery and
letting a page hold however many events that is would mean a dwell-heavy
delivery — one signal per node on screen — turning a page of fifty into two
thousand rows; the *variance* is the problem, because a list whose page length
swings like that cannot print *1–50 of* anything. Re-reading from the newest end
every time would make page seven cost seven pages. Minting a store cursor from
`seq` would be two lines and would be the only place in the repository where a
caller depends on the encoding of a value every contract calls opaque. The
chunk-and-skip cursor needs nothing from the store but the cursor the store
handed out, and the two-read bound is a property rather than luck: a chunk is
`limit` deliveries, every delivery carries at least one signal, so a chunk that
is not the last always holds enough to fill what a resumed one left short.

**The reader's clock is shown and never sorted by.** A browser's clock is
attacker-controlled, so the list is in arrival order by the instant the intake
stamped. *Happened* against *Received* is a sentence an operator can read; a
list a page could reorder is a list a page could hide a row at the bottom of.

**Inside one delivery, the sender's own array order stands.** Deliveries are
newest first, but a delivery's signals are not reversed. That order is the only
account of their sequence anybody has — a `dwelled` carries no clock at all — so
reversing it to make the whole list descend would assert a sequence the sender
never claimed. It is the one choice here a screen might want differently, and it
is a one-line change if so.

**It counts nothing and names nothing.** No list total, no facet count: 0349's
second clause is that nothing read over all time comes out of these rows, and
the tallies hold those counts already. Page headings and part labels are the
portal's join from what the site published, as *By page* already does.

**A field the tests refuse.** There is no *this is where the page view began* —
and the first draft had one, with `arrival: boolean` on every event, until the
test asserting it came back `false`. Both journals **drop** the opening marker
at the door, because a row saying *this page view began at this instant* is the
step toward a profile §7 refused, and thirty days makes that stronger rather
than weaker. The field is gone and there is now a test that fails if it
reappears. The oldest kept delivery of a page view is not evidence either, since
the sweep takes the oldest first.

## Records

- **0355** — *The events a screen lists are one row per signal, and one page
  view is read on a key the caller already holds.* **Accepted — partially
  supersedes 0146** on the one clause above. 0146 is marked at its own end, as
  0158 was by 0351.

Nothing else was superseded and nothing is `Proposed`.

## Findings

**Closed:** this lane's 5 November (morning) entry — *the Events tab's store
landed and its reading handle did not, so the portal is one module away rather
than a subsystem away*. The module is this one, and all three of the shape notes
that entry left for a future run were followed: the panel is a second read on
one key rather than a join, the handle reads the kept rows and never the
counters, and the facets stay off these rows.

**Filed:**

1. **For `Loom portal`** — what the handle gives the *Events* tab, and the two
   limits that want a sentence on the screen rather than a change here: the kind
   chips are not a filter it has (recommendation: read them off the tallies,
   where the facet counts must come from anyway), and the drawer's panel shows
   the **start** of a page view with `more` where there is more, so an event late
   in a long page view is not inside its own panel. Plus the refusal above, with
   a request not to add the field back.
2. **For this lane** — the cursor shape, as the thing to copy rather than tidy,
   with the two ways a future run would be tempted to break it.

## Test numbers, as they ran

| | |
| --- | --- |
| `pnpm verify` | **green**, after two red runs fixed on this branch |
| Package suite | **6,292 passed, 261 files**, 0 failed, 0 skipped |
| App suite | **6,637 passed, 410 files**, 0 failed, 0 skipped |
| New tests | 21 in `events.test.ts`, 6 in the `correlated` contract suite × 2 implementations |
| `pnpm findings:check` | 1,439 findings, 0 malformed |
| `pnpm prerender:check` | 138 pages, 2,067 junctions, 0 run together |

**The two red runs, said plainly.** `src/documentation.test.ts` failed first:
the new doc comment on `ReaderSignalReadRequest.view` had *"The one correlation
0146 allows"*, and a record number may only ever be a parenthetical in a
published comment — the sentence was rewritten, not the rule. Then
`extract.test.ts` failed on a stale `reference.generated.json`, which
`pnpm --filter @loom/app docs:api` regenerated; the generator reports **no name
is new**, so the published-name counts this morning's run had to argue about are
untouched.

**Nothing was skipped and no test was weakened.** The `arrival` field was
deleted because a passing test would have required storing something 0219
refuses to store.

## Browser cost

**Nothing was added that runs in a reader's browser.** `src/signals/broadcast.ts`
is byte-identical on this branch — `git diff` is empty — and the bundle measures
**6,513 bytes minified, 2,993 gzipped** (esbuild, bundled, minified, measured on
this branch), which is the same figure 0351 reported this morning. No payload
field, no new kind, and the one new index is on a table no browser can see.

## Open questions

They are on the pull request under *Needs your input*, each with a
recommendation. In short: whether the drawer should show the `view` key at all
(this lane's recommendation: yes, as the wireframe has it, and the panel is one
method to drop if not); whether a delivery's signals should keep the sender's
order or be reversed with the list (recommendation: keep, and let the screen
group them); and whether the drawer's panel should gain a cursor
(recommendation: not yet, and let the screen's own shape ask for it).

## Lane notes

`Loom daily build` has nothing open that touches the signal path — the only open
pull request at the start of this run was #778, `Loom docs`' *the site has room
for 331 more words*, which does not. Decision number **0355** was taken as the
next free one on `main` after 0354, with 0353 claimed by #778.
