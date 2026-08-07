# 2026-08-07 (day 40) — a revision is somewhere you can go

**Build order section:** §5 — Loom Portal, reaching into §1's store contract. The
item day 39 named as the next one, and the last piece of §5's attribution work.

**Branch:** `day-40-revision-anchor`, off `day-39-sink-containment`.
**PR:** against `day-39-sink-containment`, so the diff is this unit alone.

This is the **second run of 7 August**. Day 39 ran this morning at 09:33 UTC.

---

## Where this run started

Seven PRs open, all mine, **none with maintainer feedback**. Every human-looking
comment on #49–#55 is one of my own report comments or Vercel's deploy bot. The
only genuine human comment in recent history remains *"tell me more about item
number 2"* on #45, answered in full on 4 August, and the fork it opened is still
yours.

So nothing to act on before continuing. Day 39 closed §2's gap and its report
pointed at §5: **attribution is on the tree page but not on `/history`.** This is
that unit.

## What was built

### The gap, stated exactly

0041 made attribution real. A reviewer points at a node and is told which
revision placed it, who asked, who wrote it, and who allowed it. It stops one
step short of the question that always comes next — *what did that revision
actually do* — which `/history` already answers in full, with the delta, the
confidence and an undo button.

Nothing joined them. A credit said "added at revision 4"; a reviewer who wanted
revision 4 opened `/history`, landed on the newest page, and clicked "← earlier"
until it appeared.

### Why the obvious fix was not available

The link needs `/history` to open at a revision, and `revisions` could not be
asked for one. 0026 gave the log two positions to read from, both of them ends,
and one way to resume: an **opaque cursor**, meaningful only because a page
handed it back. A caller holding a revision number and no cursor had nowhere to
start.

Both in-repo implementations happen to encode a cursor as the revision it names,
so `cursor: String(4)` would have worked today. That is exactly the shape to
refuse — a consumer reading an encoding it was explicitly not promised, which
breaks in production the first time a cursor becomes a compound key or a page
token, while every in-repo suite stays green.

### The contract grows a position, and it is not a cursor

```ts
type RevisionStart =
  | { cursor?: string; at?: never }
  | { at?: number; cursor?: never }
```

`at` is **inclusive** — a reader sent to revision 4 is there to read revision 4 —
where a cursor is exclusive. Nothing else about the read changes: same clamped
limit, same two-ended page, same applied order.

A revision is legitimately a position. It is dense, consecutive from 1, unique
per tree, already the entry's identity, and already the key every implementation
orders by. 0026 said as much when it rejected paging by proposal id.

**The two are mutually exclusive in the type, not by a precedence rule.** A
request carrying both does not typecheck. The alternative is a documented rule
about which wins, and that is a read quietly ignoring half of what it was asked.

**An anchored page has to establish its far end rather than assume it.** A
cursor's page names both ends for free — a cursor came from a page, so entries
exist at the position it names. An anchor sits *inside* its own page, so the same
reasoning would claim a newer page exists whenever anyone opened at the newest
revision. `anchorResumes` checks the head revision instead, which is a row the
store already read to tell "no tree" from "a tree with no changes", so it costs
no query. There is a contract test for exactly the newest-entry case.

### The portal

`/history?tree=…&at=N` opens the page holding N and **marks that row**, with the
id the link's fragment points at. `revisionHref` builds both halves in one place,
so a fragment cannot stop matching an id.

Every revision a credit names is now a link — the placement and each of the
touches under "since". That meant `NodeCredit` stops being sentences and becomes
phrases with the revisions kept as numbers, since a reader cannot click a
substring. The words are still assembled and still tested in
`attribution-view.ts`; what JSX joins is punctuation.

A revision the log does not hold is a stale link rather than an error. The store
answers with the entries on that side; the page says plainly that nothing on it
is the revision that was asked for, rather than showing a different page and
letting it look like an ordinary visit.

### Verified against the running portal, not only the suite

I signed into a dev instance, made three real changes through the prompt box
(live API, `claude-opus-5`, all three applied), then:

- selected a node and followed its credit link — `/history?tree=t_seed1&at=2#revision-2`,
  which opened with revision 2 at the top of the page and marked;
- opened `?at=99` on a three-entry log and got the newest page with the stale
  line above it.

Screenshots are alongside this report: `-credit.png`, `-history.png`, `-stale.png`.

## Decisions I made that were not specified

**The anchor becomes an exclusive bound rather than a second query path.**
`anchorBound(at, direction)` is `at ± 1`, which is exact because revisions are
dense — the property 0026 already asserts. Both backends keep one filter and one
query; only `resumed` learns which kind of start it had.

**`older` wins over `at` in the portal, and the anchor stays as the mark.** A
link sent the reader somewhere; paging is a later instruction. The store cannot
be handed both, so the resolution lives in `historyStart` — one tested function
rather than a branch inside a Server Component.

**`parseRevisionParam` refuses `0`, negatives, fractions and overflow.** Revision
0 is the shape a tree was created with and no entry produces it. Those are
somebody's mistake, and the honest place to refuse them is the URL, not the
store — a store that refused would make every consumer handle a fourth error for
a link that has simply aged.

**The `since` touches link too, not only the placement.** Half-navigable
attribution would be the odd thing to ship, and the restructuring was the same
either way.

**The anchored page runs `older` from the anchor**, so the revision asked for is
at the top and its predecessors below. What came *after* it is reachable by
"latest →" and not by a "later" link — see the open questions.

**A `@ts-expect-error` test for the mutual exclusion.** No precedent in the repo,
but `tsc --noEmit` runs over the suite in `verify`, so it is the only way to fail
the build the day both positions become assignable at once.

## Decision records

Added **0043 — A revision is a position a caller may name** (§5 → §1). Nothing
superseded. It does not contradict 0026: that record's subject is that every read
is *bounded*, which is untouched — the page is still clamped, still keyset, still
two-ended. It extends where a bounded read may begin.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 974 tests / 78 files**, all passing, **nothing skipped** — up from
  954 / 77. Twenty new tests, one new file (`store/anchor.test.ts`).
- **Portal: 296 tests / 28 files**, up from 286 / 27. One new file
  (`lib/history-link.test.ts`).
- **Both live API tests ran and passed** against `claude-opus-5` — the interpreter
  smoke test and the one asserting a rejected key reads as a misconfiguration
  rather than an outage. No model id changed; nothing in this unit calls a model.
  (Day 35's 529s have not recurred; nothing skipped on that path this run or
  last.)

What they hold down:

- **The helpers:** an anchor lands inside its own page on the side the read runs
  from; a fraction rounds outwards rather than dropping the entry beside it; the
  far end is claimed only when the log has actually gone past the anchor, and
  never at the head or before the first revision.
- **The contract, run by both implementations:** the anchored revision is in the
  page, at the newest end reading older and the oldest end reading forward; the
  page names the end the anchor leaves entries on; **opening at the newest entry
  claims no newer end** — the case that distinguishes an anchor from a cursor;
  an anchor beyond the head gives the newest page and an anchor before the start
  gives an empty one; and an anchor agrees with the cursor naming the same
  position.
- **The type:** a request carrying both a cursor and a revision fails the build.
- **The link:** the href names the tree, the revision and the row; its fragment
  is the id the row will carry; a tree id is escaped rather than pasted.
- **The parse:** `0`, `-2`, `3.5`, `four` and `1e400` are all no anchor at all.
- **The resolution:** an anchor alone opens at it, nothing opens at the newest
  page, and a cursor beside an anchor wins.
- **The credit:** the revision stays out of the words so it can be linked; who
  asked, who wrote it and who allowed it are separated from the phrase; touches
  come back as text and revision, newest kept, the rest counted.

**Nothing weakened. Nothing skipped.**

## Open questions and blockers for the next session

1. **`/history` still has no forward paging.** An anchored page runs older from
   the revision, so what came after it is reachable only by "latest →". The store
   has named its `newer` end honestly since 0025 and nothing reads it.
   **Recommendation: a "later →" link, next §5 unit** — it is small now that the
   anchor exists, and it is the natural complement.
2. **`/audit` and `/activity` name revisions and still do not link them.** Both
   become linkable with no further contract work now that `revisionHref` exists.
   **Recommendation: fold into the same §5 unit as (1).**
3. **Still nothing scheduled** — the telemetry prune (day 34) and the snapshot
   audit (day 28). **Recommendation: one nightly Vercel cron covering both**,
   once you are happy with the 90-day default. Longest-carried item, now
   unanswered across six runs.
4. **Seven PRs are open** — #49, #50 → #51 → #53 → #54 → this one, #52 → #55.
   The build stack is now five deep. **Recommendation: land #49 and #50 when you
   get a chance**; they are independent of the rest, and #50 is the bottom of the
   stack, so landing it shortens everything above it.
5. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; it is a governance call about retaining failed
   attempts against a public form.
6. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
7. **Carried, unchanged:** a contained emit failure is invisible by design (day
   39); a sink can still block (day 39); telemetry written before day 37 keeps
   `interpreter-unavailable` on failures that were really rejections; RLS fails
   closed for a non-owner role (day 34, by design); the portal has no component
   test harness (day 26) — this run's UI was verified by driving the real portal
   in a browser instead, which is evidence rather than a harness; a missed
   `db:push` is still a sign-in outage (day 32); `policyId` is a name rather than
   a fingerprint (day 31); calibration does not segment by policy (day 31); and
   the reply schema sits near its 3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
