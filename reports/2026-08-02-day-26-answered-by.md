# 2026-08-02 (day 26) — the log can now say who allowed it

**Build order section:** §5 — the Portal and the store behind it. Touches §6 only
by leaving it alone.

**Branch:** `day-26-answered-by`, off `main` at `e308111`

**Second run of the day.** Day 25's `/audit` shipped as #34 and was merged; this
is the unit the maintainer unblocked in the same breath.

---

## Where this run started

The maintainer replied on #34: **"Okay let's just keep going with your
suggestions. Just to confirm do I need to run db:push"** — and merged it.

Two things followed from that.

**The question got an answer on the PR.** Nothing in #34 changed the schema, so
#34 itself needs no `db:push`. But `loom_telemetry` has been in the code since
day 20 and has never been created on the deployed database, so if it has not been
run since then, it should be — the command is idempotent — followed by
`ALTER TABLE loom_telemetry ENABLE ROW LEVEL SECURITY`, which is the step that is
easy to miss because a new table is exposed to PostgREST the moment it exists.

**"Keep going with your suggestions" is the answer to the escalation.** It replied
to a comment whose first item was 0029, flagged ARCHITECTURAL, with an explicit
recommendation to accept. That is the decision the escalation was waiting for, so
0029 is now Accepted and built. Items 2 and 3 were left as recommended: the
scheduled audit waits, and keeping revision 0 in the store is not started.

---

## What was built

**A confirmed change now records who allowed it, on the revision itself.**

Since 0027 the answer to "who approved this revision" needed the log *and* the
journal, and a deployment that lost its journal kept the change and lost the
approver. 0027 recorded that as a known cost and named the fix it was deferring.

- **`StoredRevision.answeredBy`** — optional, set only by the confirmation path.
  `AppendRequest` carries it, `confirmHeld` passes the `ProposalAnswer`'s actor
  into the append it already performed.
- **`loom_revisions.answered_by`** — a nullable column, in both store
  implementations, held to the same rule by the shared contract suite.
- **The journal keeps its `hold-confirmed` event.** This is one field duplicated
  deliberately, not moved. 0023 says telemetry narrows the event stream and never
  copies the log; this is the log recording a fact about its own entry that it
  happens to share with an event.
- **`/history` shows the approver beside the asker**, which it previously could
  not.

Recorded as **0029**, and 0027 is marked partially superseded.

---

## The migration is the part that can bite

`CREATE TABLE IF NOT EXISTS` leaves an existing table alone — columns and all. A
column added after a deployment exists therefore reaches a real database only
through an `ALTER TABLE … ADD COLUMN IF NOT EXISTS` beside it, and a fresh
database passes either way, so the test that matters starts from the *old* table
shape and proves the ALTER does the work.

There are three: the column is added to a pre-0029 table and a confirmation
writes to it; rows written before the column existed read back unattributed
rather than failing to parse; and running the whole DDL twice is a no-op, so a
redeploy does not have to know whether it already ran.

**A deployed database needs `db:push` re-run before this ships.** Skipping it does
not break the app — it breaks every confirmation of a held proposal, which is a
quieter failure and a worse one. `docs/deployment.md` now says so at the step
where somebody would look.

---

## Decisions I made that weren't specified

1. **0027 is `Accepted — partially superseded by 0029`, not `Superseded by`.**
   0027 answered three questions and only one of them is replaced; its identity
   decisions are untouched and still in force. Retiring the whole record would
   lose more than it clarified. That status string is a fourth value the format
   did not have, so `decisions/README.md` now documents it rather than leaving
   the index contradicting the rules above it.

2. **An absent `answeredBy` is left ambiguous rather than resolved.** It means
   either a change nobody had to approve or one approved by a host that named
   nobody, and the revision cannot tell those apart — only the journal can. So
   `/history` shows an approver when there is one and says nothing when there is
   not. "Allowed by nobody" would assert one of the two as fact.

3. **A null column and an absent key read back identically.** Postgres parses the
   column then drops it when null, so a revision nobody approved is the same
   object from either store. Without that the contract suite would be measuring
   the backing store rather than the behaviour, and `toStrictEqual` between the
   two would fail on a difference that means nothing.

4. **`persist` takes a `Commit` object rather than a seventh positional
   argument.** Same reasoning 0027 gave for `ProposalAnswer`: an approver that can
   be left off the end of a parameter list is one that will be.

5. **The approver is set in exactly one place** — the `applied` branch of
   `confirmHeld` — from the same `ProposalAnswer` the `hold-confirmed` event
   uses. Two writes, one source, so the log and the journal cannot disagree about
   who allowed a change. There is a test that asserts the two match rather than
   asserting each separately.

6. **Nothing is back-filled.** Every revision written before today stays
   unattributed. The log is append-only (0016) and an approver nobody observed is
   not a fact.

---

## Decision records

| #    | Title                                                          | Status                                   |
| ---- | -------------------------------------------------------------- | ---------------------------------------- |
| 0029 | The approval belongs on the revision, not only in the journal    | Accepted — partially supersedes 0027     |
| 0027 | Identity is server-derived, and its absence fails closed         | Accepted — **partially superseded by 0029** |

0027's text is unchanged. Only its status line moved, which is what the format
prescribes for a change of direction.

---

## Test coverage / status

```
@loom/runtime   64 files, 665 tests   green   (was 64 / 656)
@loom/portal    17 files, 128 tests   green + build   (unchanged)
```

`pnpm verify` green across the workspace, offline, with no database and no API
key. Nothing skipped, nothing weakened.

The 9 new runtime tests: the approver landing on the revision and not only in the
journal; the revision and the event carrying the same actor; the revision left
unattributed when the host names nobody; no approver at all on a change the Gate
accepted outright; one in the shared store contract, so **both** implementations
are held to the value *and* to the shape of its absence; and the three migration
tests above, which start from the pre-0029 table.

**The portal side of this ships without a test, and that is a real gap.** The
change is one conditional in `RevisionRow`, and the portal has no component test
harness — no RTL, no renderer in the test setup — so no component in this app has
ever been unit-tested. It is covered by types and by the runtime tests that put
`answeredBy` on the revision, and not by anything that renders it.

Nor could it be checked by eye this run: producing a held proposal needs the
interpreter, and no `ANTHROPIC_API_KEY` was present in this session's
environment. So the row has been reasoned about and not seen. Recommended below.

---

## Open questions for the next session

1. **`db:push` must be re-run against the deployed database before or with this
   deploy**, or every confirmation of a held proposal fails. Flagged on the PR
   and written into `docs/deployment.md`. Nothing else in this branch needs
   operator action.

2. **The portal has no component test harness.** Every page and component in the
   app is verified by build, by eye, or not at all — which was tolerable while
   components were pure layout and is less so now that one renders a fact about
   accountability. **Recommend** adding Vitest + React Testing Library to
   `@loom/portal` as its own small unit, and starting with `RevisionRow`, before
   the next page lands.

3. **A scheduled audit** (carried from day 25, now unblocked since 0029 is
   settled). Still needs a decision about where its result goes — the journal
   (0023) or something new — and that is worth settling before the cron is
   written.

4. **Keeping revision 0 in the store**, so a tree is auditable by any host rather
   than only one that can reproduce its seed (0028's leading alternative).
   **Still no action recommended**; it is the same contract this run just changed,
   and one schema change per direction is enough.

5. **`loom_telemetry` still needs its RLS statement** even once `db:push` has
   created it. (Carried from day 20 — and it is now the answer to a question the
   maintainer actually asked, so it is no longer hypothetical.)

6. **No retention policy**, **the compile step**, **the schema at 3381 of a 3500
   guard**, and **node-level provenance** — all carried, all unchanged.
