# 2026-07-31 (day 21) — §6 gets a reader

**Build order section:** §6 — the telemetry pipeline. Second unit.

**Branch:** `day-21-activity-view`, off `main` at `742ea40`

---

## Where this run started

No open PR — #28 merged. The maintainer's reply on it was "All that sounds fine.
Just talk me through the portal auth", and the auth walkthrough was posted there
before the merge. Taking "all that sounds fine" at face value against the three
questions it answered:

1. **Next unit: episodes view before §7** — accepted, and it is this run.
2. **Retention: leave it alone** — accepted, nothing done, still no TTL.
3. **Portal auth** — answered at length on #28, and it ends on a question I have
   not had an answer to yet (opaque `actor` vs structured identity). It is
   repeated below rather than assumed, and no auth code was written.

So this run built the thing yesterday's report recommended: **something that
reads the journal**. Nothing did, and a narrowing nobody reads is a narrowing
nobody can tell is wrong.

---

## What was built

**`/activity` — what the runtime has been asked to do, and what became of it.**

The page reads the journal through `TelemetryJournal`, folds it with
`episodesOf`, and renders one card per ask: the resolution, the shape of the
request, and every proposal it produced — rationale, delta, confidence, stakes,
reversibility, and the Gate's reason. `?tree=` scopes it, and the tree page links
through to its own slice.

It reads the framework the way anyone else would. 0018 says the portal is a
consumer rather than an insider, and a view that reached past the fold into rows
would be the first place that stopped being true — so it does not.

The screenshot alongside this report is a real run against the real model, not a
fixture: two asks, one applied at revision 1, one held for confirmation.

---

## Finding the journal could not answer its own main question

Building the reader immediately found the thing yesterday predicted it would.

0023's journal paged one way — forward from a cursor, oldest first, one `cursor`
naming the next page. That shape was copied from 0020's tree listing without much
thought, because at the time nothing read the journal.

A journal is a timeline read from the end. The question is almost always *what
happened recently*, and forward-only paging answers it by reading every record
ever written first. The cost grows with the journal's age, fastest exactly when
the journal is most worth reading. A listing of trees does not have this problem,
which is why it was the wrong shape to copy.

So the contract changed. **A read names the end it starts from, and a page always
comes back in arrival order.**

```
read({ direction: "older" })  →  { records, older, newer }
```

`direction` defaults to `"newer"` — the existing behaviour, unchanged for anyone
already calling it. `"older"` with no cursor is the newest page, one index seek
on `(tree_id, seq)`.

The part worth the care was the ordering. Reading backwards naturally produces
descending rows, and `episodesOf` folds in arrival order — it builds a proposal
when it sees it proposed. A reversed page does not make the fold *fail*; it makes
it produce plausible episodes with the wrong resolutions. So a page is ascending
whichever end it came from, and the Postgres implementation reverses before
returning. The direction is a property of which records a page contains, never of
the order they arrive in.

Recorded as **0025**.

---

## Decisions I made that weren't specified

1. **`pageCursors` is shared, not reimplemented per backend.** Deciding which
   ends a page names is the part most likely to drift between memory and
   Postgres and the least likely to be noticed when it does. One function, both
   implementations, and the contract suite walks a whole journal backwards and
   asserts it reassembles exactly what a forward read returns.

2. **The far end of a page is inferred, not probed.** `older`/`newer` are `null`
   when the page reaches that end; the paged-toward side comes from the limit+1
   probe, and the side you came from is non-null because the cursor you passed
   is a position records exist at. A caller that *invents* a cursor can be told
   there is a page on the far side when there is not. The cost is one click to
   an empty page; exactness costs a second query on every read to fix a case no
   real flow produces.

3. **`newer: null` is documented as weaker than `older: null`.** The oldest
   record is a fact; the newest is only true at the time of the read, because
   the journal is still being written to. Saying so beats a cursor that quietly
   means two different things.

4. **`tallyEpisodes` is a second fold, not a stored total.** Same relationship
   0016 set between the log and the snapshot: a kept count is a count that can
   disagree with the records it came from.

5. **The tally names every resolution, including the ones at zero.** "Refused: 0"
   and no refused count at all are different claims. `EPISODE_RESOLUTION_KINDS`
   is exported so the view iterates the runtime's list rather than keeping its
   own that can fall behind.

6. **Episodes render newest-first, and the page does not sort them.**
   `episodesOf` returns them in first-seen order because that is what a fold
   over an ordered stream produces; reversing for display is the view's business,
   and a fold that sorted for a UI's benefit would be a fold with a UI in it.

7. **The delta is shown for every proposal, not only applied ones.** This is the
   payoff of 0023 keeping it: for a refused or discarded change the revision log
   holds nothing, so this line is the only surviving account of what the model
   wanted to do.

8. **`summariseOperations` was extracted to `lib/delta-summary.ts`.** The review
   queue had its own copy of the operation-verb map inline. A change described as
   "add" in one place and "insert" in another reads as two different things
   having happened.

9. **`toneOfResolution`/`headlineOfResolution` are keyed by kind alone**, so the
   tally can label a count without fabricating a resolution to ask about — the
   alternative was a cast, which is a `no` under this repo's rules.

10. **An unparseable `?tree=` is a 404, not a silent unfiltered page.** Showing
    every tree's activity under a URL that asked for one tree's is the wrong kind
    of helpful.

---

## Decision records

| #    | Title                                                           | Status   |
| ---- | --------------------------------------------------------------- | -------- |
| 0025 | A journal page is taken from an end, and names both of its ends | Accepted |

Nothing superseded. **No ARCHITECTURAL escalation:** 0025 changes §6's own
journal contract, introduced yesterday, whose only consumer is the portal written
against the new shape in the same commit. It does not touch the tree schema or
the delta model, contradicts no Accepted record, and migrates no already-built
code. 0020 governs the *store's* listing and is untouched — the two paging shapes
now differ on purpose, and 0025 says why.

---

## Test coverage / status

```
@loom/runtime   62 files, 602 tests   green   (was 62 / 587)
@loom/portal     7 files,  42 tests   green + build   (was 6 / 33)
```

`pnpm verify` green across the workspace, offline, with no database and no API
key required.

The 15 new runtime tests are: directional paging in the shared journal contract
(5, run twice — once against memory, once against PGlite) and `tallyEpisodes`
(5). The portal's 9 are `episode-view` and the extracted delta summary.

What the new contract tests assert: an `older` read with no cursor returns
exactly the tail of a forward read; a backwards page comes back ascending;
paging back two at a time reassembles the whole journal and then reports
`older: null`; a resumed backwards page names its newer end, and following it
lands back on the page you came from; and the tree filter holds in both
directions.

The model is unchanged from previous runs — `DEFAULT_INTERPRETER_MODEL` is
`claude-opus-5`, chosen on day 3 and not revisited. The live screenshot run used
it through `LOOM_ANTHROPIC_API_KEY`; no test requires a key.

Nothing skipped, nothing weakened, no test disabled.

---

## Open questions for the next session

1. **Three nav links go to 404s.** `history`, `audit` and `primitives` have been
   in the sidebar since day 10 and none has a route. `activity` is the first of
   that group to get one. The nav's own comment claims nothing in it is
   aspirational, which is currently false. **Recommend** building `/history`
   (the revision log per 0016) as the next §5 unit — it is the smallest of the
   three and the data is already there — and, if that is not next, removing the
   other two from the nav until they are built rather than leaving links that
   404. Either is cheap; leaving it as-is is the only bad option.

2. **Portal auth — still waiting on one call.** The walkthrough is on #28. The
   only thing blocking a start is whether `Provenance.actor` stays an opaque
   string. **Recommend** opaque. Everything else about that unit is decided.

3. **Nothing has read a *stored* journal yet.** `/activity` has only been
   exercised against the in-memory journal, because this environment has no
   `DATABASE_URL`. The Postgres implementation passes the same contract suite
   under PGlite, so the risk is deployment rather than logic —
   `loom_telemetry` still needs `db:push` and RLS before the next deploy.
   (Carried from day 20, still not done.)

4. **No retention policy.** (Carried, deliberately unchanged per the maintainer's
   reply on #28.) Worth revisiting now that something reads the journal.

5. **`auditSnapshot` still has no schedule.** (Carried.)

6. **The compile step**, and **the schema at 3381 of a 3500 guard**. (Both
   carried, both unchanged by this run.)

7. **Node-level provenance.** (Carried from day 1.) Still unforced.
