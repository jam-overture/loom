# 2026-08-06 (day 38) — who put this node here

**Build order section:** §1 — Tree schema, surfaced in §5. The oldest open gap on
the list, carried in the report tail since day 26 as "there is no node-level
provenance".

**Branch:** `day-38-node-attribution`, off `day-37-model-failure-classes` at
`5cf247a`. PR opens against that branch, so the diff shows only this run's work.

This is the **second run of 6 August**. Day 37 ran this morning at 09:41 UTC.

---

## Where this run started

Four PRs open, all mine, **none with maintainer feedback**: #52 and #49 (lessons),
#50 (§5, sign-in pressure, day 36) and #51 (§2, model failure classes, day 37).
Every human-looking comment on them is this routine's own report comment. The
only genuine human comment anywhere in recent history remains *"tell me more
about item number 2"* on #45, answered in full on 4 August.

So there was nothing to act on before continuing. Day 37 closed the §2 gap it was
carrying, which put the build order back on **§1** — and §1's one remaining
actionable item is the one every report since day 26 has listed and none has
built. The other §1 item, whether a tree should carry its retired ids, is an
escalation still sitting with you and is deliberately untouched.

## What was built

### The gap, stated exactly

Loom's claim is that AI-authored change is "inspectable, gateable, attributable,
and reversible". Three of those were real. **Attribution was real only in the
aggregate.**

The log carries provenance on every entry, so "who asked for revision 12, who
wrote it, who allowed it" was always answerable. Nothing joined that to a node. A
reviewer looking at the rendered tree and pointing at a heading — the moment
attribution is actually wanted, and the one the portal puts in front of them —
could not ask who put it there without reading the whole log by eye and mentally
replaying it.

### The walk goes backwards, and stops

`attributeTree(reader, tree)` returns, for every node in the tree, the log entry
that placed it and the entries that have touched it since.

The property that makes this cheap: **for a node in the tree now, the first
insert carrying it that a backwards walk meets is the one that put it there.**
Anything that removed it afterwards would need a later insert to bring it back,
and that later insert is the one the walk meets first. So the walk stops at the
placement instead of folding the log, and a recently placed node is answered by
one page.

A `remove` therefore contributes nothing and that is not an omission — a removal
of a live node is always older than the insert that brought it back, and is never
reached. A node the log removed for good is not in the tree being attributed.

### Nothing is stored

A node carries no authorship field. The tree schema is untouched: no
`TREE_SCHEMA_VERSION` bump, no column, no migration, nothing written twice. This
is the same choice 0038 made for id history, and it is the whole reason this unit
did not become another escalation.

It also means **every tree ever written is attributable retroactively.** A stored
field would have been null on all of them.

### Three outcomes, because a bounded read must be able to say so

`placed` (the walk found the insert), `seeded` (the walk reached the start of the
log and found none), `undetermined` (the walk ran out of budget first). Collapsing
the last two would credit the seed with work somebody did, on the grounds that we
stopped looking.

### The portal says it in a sentence

The tree page's selection pane gains a credit line under the addressing it
already showed:

> added at revision 4 — alice asked, the model wrote it, allowed by bob
> since: configured by bob at revision 6, moved by carol at revision 9

An insert brings a whole subtree, so a node that was carried in reads *"brought
in as part of a larger change"* rather than *"added"* — "the model added a card"
and "the model added the heading inside a card it added" are different sentences
and a reviewer deserves the true one.

## Decisions I made that were not specified

**Attribution takes a `LoomTree`, not a `TreeId`, and ignores entries newer than
its revision.** A page that rendered revision 5 and attributed against a head
that had moved to 7 would credit nodes with placements nothing on screen
reflects. There is a test for exactly that race.

**The whole tree is attributed at page load, not one node per click.** Per-node
reads were the first shape tried. The backwards walk that resolves one node has
already passed every entry that resolves the others, so sharing it is strictly
cheaper — and it keeps selection a click rather than a round trip to the log.

**A move of an ancestor is not a touch on its descendants.** A node whose
grandparent moved did not change. Recording it would put a line under every node
in a subtree every time the subtree moved and bury the touches that were about
the node itself.

**`since` is typed so it cannot hold a placement.** `NodeTouch` is generic over
its effect and `since` is `NodeTouch<NodeChange>[]`. The walk stops at the
placement, so this was already true; typing it removed an unreachable branch from
the portal's verb switch rather than leaving a case that could never fire.

**Five pages of budget, and the touch list caps at 3 with the remainder counted.**
The cap follows the rule `audit-view.ts` already sets: never truncate silently. A
node reconfigured forty times is one fact about the node, not forty.

**A read failure costs the credits and nothing else.** If the log read fails the
page renders with no credit lines. A reviewer who cannot be told who placed a node
can still see the node.

## Decision records

Added **0041 — Authorship is derived from the log, not carried on a node**
(§1 → §5). Index rebuilt with `pnpm decisions:index`.

Nothing superseded and nothing contradicted. It extends 0016's "the log is the
truth" to a fourth derived reading, and follows 0038's precedent of deriving
rather than storing. Its Alternatives section argues at length with the obvious
approach — a `provenance` field on `LoomNode` — because that is the one a future
reader will reach for again.

Also updated the README's layout tree, which the last several reports listed as
stale. It stops at `store/` no longer.

## Test coverage and status

`pnpm verify` green end to end: build, typecheck, both suites, portal build.

- **Runtime: 938 tests / 76 files**, all passing, **nothing skipped** — up from
  926 / 75. Twelve new tests, one new file (`store/attribution.test.ts`).
- **Portal: 286 tests / 27 files**, up from 273 / 26. Thirteen new tests, one new
  file (`lib/attribution-view.test.ts`).
- **Both live API tests ran and passed** against `claude-opus-5`. No model id
  changed and nothing in this unit calls a model — attribution is entirely
  deterministic.

What they hold down:

- **The credit:** a node is credited to the revision that inserted it and to who
  asked; a seed node is credited to no revision; the approver is carried through
  separately from the asker, and is absent when nobody had to allow it.
- **The subtree distinction:** an insert's root reads as named, its descendants
  as carried, and both are credited to the same revision.
- **The tenancy:** a node that left and came back is credited to the revision
  that brought it back, not the one that first placed it; and a configure from
  before that removal does not appear in `since`.
- **The ordering:** touches come back oldest first, with the verb and the actor.
- **The bound:** a walk that runs out of budget reports `undetermined` rather
  than `seeded`, still credits what it did reach, and reports how far back it
  looked; a walk that resolves everything stops early instead of spending the
  budget.
- **The race:** revisions newer than the tree handed in are ignored.
- **The failure:** a store that cannot be read produces an error, not an empty
  attribution.
- **The wording:** every sentence the pane can produce, including the runtime-as-
  author case, the unrecorded-actor case, and the cap with its remainder count.
- **The wire:** credits survive a JSON round trip, which is what a Client
  Component requires.

**Nothing weakened. Nothing skipped.**

## Open questions and blockers for the next session

1. **Attribution is not on `/history`, only on the tree page.** A reviewer
   reading a revision sees which nodes it touched; they cannot yet go the other
   way from a node to its revision. The credit carries the revision number
   precisely so it can become a link. **Recommendation: yes, next §5 unit** —
   it is small now that the join exists.
2. **The tree page now does a bounded log read it did not do before.** One page
   for a young tree, capped at five for an old one, on a review page rather than
   a render path. **Recommendation: leave it**; revisit if a portal tree ever
   gets large enough to notice.
3. **Carried, still yours — sign-in lockout history** (option B, #45/#50).
   **Recommendation: not yet**; it is a governance call about retaining failed
   attempts against a public form, not an engineering one.
4. **Still nothing scheduled** — the telemetry prune (day 34) and the snapshot
   audit (day 28). **Recommendation: one nightly cron covering both**, once you
   are happy with the 90-day default. This is now the longest-carried item on the
   list, unanswered across four runs.
5. **ARCHITECTURAL, from day 35, still yours: should a tree carry the ids it has
   retired?** Unchanged, and unchanged in my recommendation: **not yet**. Worth
   noting that 0041 is the second unit in a row to answer a question by deriving
   from the log rather than extending the tree — the pattern is holding, which is
   mild evidence for leaving that one alone too.
6. **Telemetry written before day 37 keeps `interpreter-unavailable` on failures
   that were really rejections** (day 37). **Recommendation: leave it.**
7. **Carried, unchanged:** RLS fails closed for a non-owner role (day 34, by
   design); the portal has no component test harness (day 26) — the reason this
   unit's UI is tested through a pure view module rather than through the
   component; a missed `db:push` is still a sign-in outage (day 32); `policyId` is
   a name rather than a fingerprint (day 31); calibration does not segment by
   policy (day 31); and the reply schema sits near its 3500-byte guard.

**§7 — Marketplace — remains the only section I will not start without you saying
so.** Sections 1–6 are functional end to end; what is left in each is the list
above.
