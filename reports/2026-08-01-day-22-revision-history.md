# 2026-08-01 (day 22) — §5 gets its log back

**Build order section:** §5 — the Portal. Also §5's store contract.

**Branch:** `day-22-revision-history`, off `main` at `4165fe2`

---

## Where this run started

No open PR — #29 merged. The maintainer replied on it: **"All the recommendations
sound good."** That answers the three questions day 21 asked, and this run treats
them as settled:

1. **`/history` next, and don't leave links that 404.** Built, and the two
   remaining dead links are gone from the nav. Details below.
2. **`Provenance.actor` stays an opaque string.** Accepted; no change was needed
   to make it so, since that is what it already is. Portal auth is now unblocked
   and is the obvious next unit — see the open questions.
3. **Retention: still leave it.** Nothing done, still no TTL.

---

## What was built

**`/history` — what was actually accepted into a tree, in the order it was
applied.**

One card per revision: the operations it performed, named by node and by where
each one landed, and the provenance that put it there — who asked, what
interpreted it, how sure that interpreter was, and which proposal it came from.

The pairing with `/activity` is the point. Activity answers *what the runtime was
asked to do*; history answers *what became of the tree*. A refused proposal
appears in the first and never in the second, and a page that blurred the two
would make it impossible to tell a change that was rejected from one that was
never proposed. Each page links to the other, scoped to the same tree.

`/history` with no `?tree=` asks which tree, because a log belongs to one and the
store holds no ordering across several (0020). The screenshot alongside this
report is a real run against the real model: two asks, two accepted revisions.

---

## The log could not be read a page at a time, so now it can

`TreeStore.history(treeId)` returned the whole log. Every delta ever accepted
into a tree, in one array, with no limit the caller could name and none the store
imposed.

That was survivable while `auditSnapshot` was its only consumer — an audit really
does need all of it — and while nothing rendered it. Putting a page in front of it
made it the same mistake 0025 found in the telemetry journal one day earlier: an
append-only sequence, never compacted, whose most common question is *what
changed lately*, answered by first loading everything that ever changed.

It also left exactly one unbounded read in a contract whose every other read is
bounded. 0020 clamps a tree listing because "a caller can ask a store for
everything it holds by omitting the limit" is worth preventing; `history` let a
caller do precisely that, for the largest thing the store holds.

So `history` is now `revisions`, and it is 0025's shape deliberately — same
direction values, same defaults, same two-ended cursors, same promise that a page
comes back in applied order whichever end it was taken from:

```
revisions(treeId, { direction: "older" })  →  { revisions, older, newer }
```

`auditSnapshot` is the one caller that legitimately needs the whole log, and it
now walks it: follow `newer` until it is `null`, folding each page into the tree
the previous one produced. A page boundary is not a semantic boundary — it is
where the read stopped. The convenience is built on the primitive rather than
being a second primitive.

Recorded as **0026**. This is a breaking change to `TreeStore`, so: it does not
touch the tree schema or the delta model, contradicts no Accepted record,
migrates nothing that is stored, and both implementations plus all three
consumers were updated in the same commit. Nothing outside the repo implements
`TreeStore` yet — which is why it was worth doing now, before §4's SDK invites
anyone else to.

---

## Decisions I made that weren't specified

1. **Paging moved out of telemetry and into `paging.ts`.** `pageEnds` and
   `cursorPosition` now sit beside `clampLimit` and both logs call them. Which
   ends a page names is a property of keyset paging, not of what is being paged —
   and it is the part most likely to drift across four implementations and least
   likely to be noticed when it does. `TelemetryDirection` is gone in favour of
   the shared `PageDirection`; the journal's behaviour is unchanged.

2. **Writing that shared function found a small bug.** `Number("")` is `0`, so an
   empty cursor used to be read as *position zero* rather than as no cursor —
   which made a page claim an `older` end that led nowhere. `cursorPosition`
   treats a blank cursor as absent. The journal inherits the fix.

3. **The default direction is `"newer"`, not `"older"`.** A reader wants the
   newest page and has to ask for it, which is one more thing to remember. But the
   correctness-critical caller is the fold, and a default that quietly handed a
   fold the newest page would produce a `revision-gap` at best and a silently
   partial audit at worst. The default should be the one that is safe when
   somebody forgets to think about it.

4. **Page limits: 100 default, 500 max.** Larger than a tree listing's 50/200
   because a revision is one complete thing to read, and smaller than the
   journal's 200/1000 because that one is sized so a page rarely splits an episode
   mid-fold. A revision has no equivalent of that problem.

5. **`primitives` and `audit` are out of the nav.** The recommendation the
   maintainer approved was "build `/history`, and if that isn't next, drop the
   other two". `/history` was next, so the clause did not strictly fire — but the
   complaint behind it was links that 404, and two of them still did. A nav is a
   claim about what a thing can do. They come back the day their pages do; the
   icons are one `git show` away.

6. **The chooser is its own async server component**, not a branch inside the
   page. The page decides which of two things it is showing; neither of them has
   to know how the other fetches.

7. **A not-found tree is a 404, not an error panel.** `describeStoreError` would
   have rendered "no tree stored under t_typo" inside a working page, which reads
   as a broken store rather than a wrong URL. Every other store failure still
   renders in place.

8. **`describeOperation` names the node and where it went**, where the activity
   view's `summariseOperations` only names verbs. A revision log is read to answer
   "what changed", and the delta is the only record of that — the snapshot shows
   the result and cannot say which part of it is new. Both live in
   `lib/delta-summary.ts` so the verbs stay identical across the two views.

9. **A removal is described as "and everything under it".** The operation names
   one node; it takes the subtree. That is the part a reader misjudges.

10. **`delta-summary`'s tests moved into their own file.** They were living in
    `episode-view.test.ts` because that is where the module was extracted from.

---

## Decision records

| #    | Title                                                     | Status   |
| ---- | --------------------------------------------------------- | -------- |
| 0026 | The revision log is read a page at a time, from either end | Accepted |

Nothing superseded. **No ARCHITECTURAL escalation:** 0026 changes the store's
read contract, not the tree schema or the delta model. Nothing already stored
changes shape — this is how stored entries are read. It contradicts no Accepted
record; 0016 (the log is the truth) is what it serves, and 0020 governs the tree
*listing*, which is untouched.

---

## Test coverage / status

```
@loom/runtime   63 files, 630 tests   green   (was 62 / 602)
@loom/portal     8 files,  48 tests   green + build   (was 7 / 42)
```

`pnpm verify` green across the workspace, offline, with no database and no API
key required.

The 28 new runtime tests are:

- **`paging.test.ts` (11, new file)** — `clampLimit`, `pageEnds` and
  `cursorPosition` stated once in terms of positions rather than of whatever is
  being paged. This module had no tests of its own before; it now has two
  consumers, so it has its own.
- **The store contract's `revisions` block (8, run twice** — once against memory,
  once against PGlite, so 16 test runs). Forward by default; the newest page on
  request; a backwards page arriving in applied order; both ends named and only
  the ends that exist; a walk that pages back through a whole log and reassembles
  it; a resumed page naming the end it came from and leading back to the page it
  came from; the limit clamped; one tree's log kept out of another's.
- **`replay.test.ts` (1)** — an audit driven through a reader that serves one
  entry per page, asserting it follows the log across pages and asks for exactly
  the cursors it should. A fold that stopped at the first page would report
  agreement on a tree it had only half replayed, which is the one wrong answer an
  audit must never give.

The 6 new portal tests are `describeOperation` across all four operation kinds
plus the two empty cases (a configure that sets nothing, an inserted text node
that has no primitive type).

The model is unchanged from previous runs — `DEFAULT_INTERPRETER_MODEL` is
`claude-opus-5`, chosen on day 3 and not revisited. The screenshot run used it
through `LOOM_ANTHROPIC_API_KEY`; no test requires a key.

Nothing skipped, nothing weakened, no test disabled.

---

## Open questions for the next session

1. **Portal auth is now the obvious next unit, and it is unblocked.** The
   walkthrough is on #28 and the last open call — opaque `actor` — was answered
   with the rest. **Recommend** building it next: every write already goes through
   one server-side path (0017), so the work is identifying the caller and
   recording it in `Provenance.actor`, not restructuring anything.

2. **`/primitives` is the smallest §4 page left**, and now that it is out of the
   nav it is invisible rather than broken. The registry is generated (0015) and
   `auditRegistry` already probes conformance (0012), so the page is mostly a
   read. **Recommend** it after auth, and put the nav entry back in the same
   commit.

3. **`auditSnapshot` still has no schedule** (carried), and it now costs several
   round trips on a long log instead of one big read. That is the right trade for
   a scheduled job, but it makes the missing schedule slightly more pointed:
   nothing is currently checking that any snapshot still agrees with its log.
   **Recommend** a `/audit` page that runs it on demand for one tree — which also
   restores the third nav entry — before anything cron-shaped.

4. **Nothing has read a *stored* log or journal yet.** Both Postgres
   implementations pass their contract suites under PGlite, so the risk is
   deployment rather than logic — `loom_telemetry` still needs `db:push` and RLS
   before the next deploy. (Carried from day 20, still not done.)

5. **No retention policy.** (Carried, deliberately unchanged.)

6. **The compile step**, and **the schema at 3381 of a 3500 guard**. (Both
   carried, both unchanged by this run.)

7. **Node-level provenance.** (Carried from day 1.) Still unforced — and
   `/history` is the first page where its absence is visible: the log says which
   node changed and who asked, but a node cannot say who put it there without
   reading the whole log back.
