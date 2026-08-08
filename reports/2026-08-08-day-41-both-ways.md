# 2026-08-08 (day 41) — the log reads both ways, and every revision it names is a link

**Build order section:** §5 — Loom Portal. The unit day 40 named as next, and the
last piece of the navigation work 0043 started.

**Branch:** `day-41-both-ways`, off `day-40-revision-anchor`.
**PR:** against `day-40-revision-anchor`, so the diff is this unit alone.

---

## Where this run started

Eight PRs open, all mine, **none with maintainer feedback**. Every human-looking
comment on #49–#56 is one of my own report comments or Vercel's deploy bot. The
only genuine human comment in recent history is still *"tell me more about item
number 2"* on #45, answered in full on 4 August; that fork is still yours.

So nothing to act on before continuing. Day 40's report named two items as the
next §5 unit and recommended folding them together — forward paging on
`/history`, and linking the revisions `/audit` and `/activity` already name. This
is that unit, and they are the same unit for a reason worth stating: both are the
gap between *naming* a position in the log and *being able to reach it*.

## What was built

### The gap, stated exactly

0043 made a revision a position a caller may name, and `/history?at=N` opens at
it. That fixed one journey — a node's credit to the change that placed it — and
left the shape of the problem everywhere else.

Two halves.

**The log only descended.** `/history` read `direction: "older"` and rendered one
link, "← earlier". A reader who followed a credit to revision 5 could see 4 and 3
below it, and reaching 6 meant going back to "latest →" and starting the descent
again. The store has reported its `newer` end honestly since 0025 and **nothing
had ever read it** — the contract was complete and the consumer was half-built.

**Two pages named revisions and reached none of them.** `/audit` says an id "was
a `loom.card` until revision 1, and a text from revision 9". `/activity` says an
ask was applied as "revision 7", and was written against revision 3. Every one of
those is an entry in the log, and every one of them was text — a number a
reviewer reads, remembers, and retypes. That is the exact journey 0043 existed to
delete, still being made on three pages out of four.

### Reading forward

`/history` gains `?newer=`, and the resolution of what a URL asked for moves into
one tested function:

```ts
historyRead({ older, newer, at })   // → RevisionReadRequest
```

A cursor carries its direction with it, because a cursor is only meaningful in
the direction the page that issued it was read. So `newer` reads forward,
`older` reads back, and an anchor with neither opens at the revision named. A
cursor still wins over an anchor — a step the reader took is a later instruction
than the link that brought them — and now says which way they stepped.

Both cursors at once cannot come from anything the page renders, so a URL
carrying them is hand-made and one of them has to lose. It picks `newer` and
sends the store exactly one position. What must never happen is both reaching the
store, and the contract's own type is shaped to prevent it (0043).

"later →" appears whenever the page reports a newer end — which, on an anchored
page, is precisely when the log has gone past the anchor. "latest →" stays
alongside it rather than being implied by it: a reader deep in a long log wants
the end, not thirty steps toward it.

### A stale link now says which way it went

The wording moved into `describeStaleAnchor` and grew a third case. Three
different facts wore the same appearance — the page does not hold the revision
you asked for — and a reader can act on only one of them. A log that never
reached it is a link that has aged. A reader who paged away has left it behind,
and *which way they went* is the difference between "it is ahead of you" and "it
is behind you". One sentence for both would send half of them the wrong way.

### Every revision the portal names is now a link

One `RevisionLink`, lifted out of the node credit into `app/_components`, used by
all four pages. Three components building the same href would be three places for
a fragment to stop matching a row id.

Reaching it meant the same restructuring 0043 did to `NodeCredit` — the revision
has to survive as a number, because a reader cannot click a substring:

- **`/activity`** — `EpisodeView` gains `revision`, and `describeIntent` returns
  `{ before, revision, after }`. Both revisions an episode names are links: the
  one the ask was written against, and the one it became. This page says what the
  runtime was *asked* to do and `/history` says what the tree did about it; they
  were two halves of one question with nothing joining them.
- **`/audit`** — `describeRecycling` returns its two revisions as numbers. These
  are the two changes that made an id ambiguous, and a finding that named them
  and left the reviewer to retype both was the odd thing to ship.
- **`/audit`, unreplayable** — a new `stoppedAt` names the revision the fold
  stopped at, which is the one place that verdict can send anybody. Everything
  else it says is about what could *not* be established.

### The contract tests the forward walk now that something walks it

`newer` was reported by both stores and read by nobody, and the shared contract
reflected that: it had **one** test stepping back a single page, and none at all
walking forward. That is not enough for a feature where a reader clicks "later →"
repeatedly — a single step exercises the only case that is easy to get right.

Three contract tests added, run by both backends:

- a whole log walked **forwards** and reassembled, with the head claiming no
  newer end;
- a resumed forwards page naming its **older** end, so a reader who steps forward
  and changes their mind is not stranded;
- a step forward **from an anchored page** — the actual journey, since an anchor
  sits inside its own page and has entries on both sides.

All three pass on `memoryTreeStore` and on Postgres unchanged. No implementation
needed changing, which is the outcome worth reporting: the promise was already
kept, and now it is checked.

## Decisions I made that were not specified

**No decision record this run, and that is deliberate.** Every criterion in
`decisions/README.md` is a miss: no schema or delta change, no new obligation on
an implementer, nothing about what AI may do, nothing a reasonable engineer would
otherwise reach for. Forward paging is a consumer finally reading an end 0025
defined; the links are 0043 applied where it already applied. Writing a record
for this would dilute the index with implementation detail, which is the thing
the README says not to do.

**The URL's precedence rule is a rule, and the store's exclusivity is a type.**
Those are different layers doing different jobs. A request object can be made
impossible to construct wrongly; a query string cannot — anyone can type one. So
the URL resolves, in one tested function, and hands the store a single position.

**`historyPageHref` writes every link out of the page**, so the parameter names
cannot drift from the ones `historyRead` reads back. There is a test that the two
agree, which is the failure this prevents: paging that silently goes nowhere.

**A gap's *expected* revision is not linked.** `stoppedAt` returns the revision
the fold *found*, never the one it expected — by definition no entry holds the
expected one, so it is a description of absence. Linking it would offer a
reviewer a door into the hole in the log.

**The committed episode's `detail` is now empty rather than duplicating the
revision.** The badge reads `applied — revision 7`, with the number as a link, so
a sentence saying the same thing beside it would be the number twice.

**The anchor still quietly expires when a reader pages away.** Unchanged from day
40, and now more visible because they can page in both directions. It stays as
the mark, comes to nothing once they have moved past it, and the stale line says
so when it matters.

## Decision records

**None added, none superseded.** Reasoning above.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 980 tests / 78 files**, all passing, **nothing skipped** — up from
  974 / 78. Six new tests: three contract cases, each run by both backends.
- **Portal: 313 tests / 28 files**, up from 296 / 28. Seventeen new tests, no new
  file — the work landed in modules that already had suites.
- **Both live API tests ran and passed** against `claude-opus-5` — the interpreter
  smoke test, and the one asserting a rejected key reads as a misconfiguration
  rather than an outage. No model id changed; nothing in this unit calls a model,
  since paging and linking are entirely deterministic.

What they hold down:

- **The read:** an anchor opens at itself; nothing opens at the newest page; a
  cursor beats an anchor; a `newer` cursor runs forward; a reader who stepped
  forward leaves the anchor behind; and a hand-made URL carrying both cursors
  sends the store exactly one position.
- **The links out:** each end writes the parameter the read resolves; a cursor is
  escaped rather than pasted into a query string; the newest page names the tree
  alone.
- **The stale line:** three cases, three sentences, and the revision named in all
  of them.
- **The store, run by both backends:** a whole log walked forward and
  reassembled; the head claims no newer end; a resumed forward page names its
  older end and paging back returns the entries it came from; and a forward step
  from an anchored page lands on the entries after the anchor.
- **The episode:** a committed resolution hands over its revision as a number
  with the sentence emptied; every other outcome names none; the intent line
  splits around its revision and reads as one line when the parts are rejoined.
- **The audit:** a recycling hands over both revisions as numbers with neither in
  the words; the round trip still reads correctly once rejoined; the fold's
  stopping point is the revision found rather than the one expected; and it is
  null on every verdict where the fold did not stop.

**Nothing weakened. Nothing skipped.**

### Not verified in a browser this run

Day 40 drove a real instance and attached screenshots. This run did not: it is a
second run of the day against a portal whose UI change is three links and a
sentence, and the pure functions behind all of them are covered directly. The
honest statement is that the suite covers this and a human has not looked at it —
the Vercel preview on the PR is the fastest way for you to, and it is one click
from `/history?tree=t_seed1&at=2`.

## Open questions and blockers for the next session

1. **`/history` has no way to jump to a revision by typing one.** Now that the
   log reads both ways, the remaining gap is arriving without a link — a reviewer
   with a revision number from outside the portal still edits the URL.
   **Recommendation: a revision box on `/history`, next §5 unit.** It is small,
   `parseRevisionParam` already refuses everything it should, and it is the last
   piece of "a revision is a place".
2. **Still nothing scheduled** — the telemetry prune (day 34) and the snapshot
   audit (day 28). **Recommendation: one nightly Vercel cron covering both**,
   once you are happy with the 90-day default. Longest-carried item, now
   unanswered across seven runs.
3. **Eight PRs are open** — #49, #50 → #51 → #53 → #54 → #56 → this one, #52 →
   #55. The build stack is now six deep. **Recommendation: land #50** — it is the
   bottom of the stack, so landing it shortens everything above it. #49 is
   independent and also ready.
4. **Merge order between #52 and #54 still matters** and is unchanged: #54 fixes
   the behaviour lesson 05's exercise D documents. Landing them together would
   ship lesson 05 already wrong. Detail is on #52.
5. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; it is a governance call about retaining failed
   attempts against a public form.
6. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged. **Recommendation: not yet.**
7. **Carried, unchanged:** a contained emit failure is invisible by design (day
   39); a sink can still block (day 39); telemetry written before day 37 keeps
   `interpreter-unavailable` on failures that were really rejections; RLS fails
   closed for a non-owner role (day 34, by design); **the portal still has no
   component test harness** (day 26) — which is why the note above about browser
   verification exists, and it is the reason it keeps existing; a missed
   `db:push` is still a sign-in outage (day 32); `policyId` is a name rather than
   a fingerprint (day 31); calibration does not segment by policy (day 31); and
   the reply schema sits near its 3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
